# ESCOPO FINAL — MELHOR ENVIO (ancorado no código existente)

**Data:** 18/07/2026
**Substitui:** `escopo-melhor-envio.md` (escrito antes de descobrirmos o subsistema SIGEP).

---

## O QUE MUDOU DESDE O PRIMEIRO ESCOPO

Descobrimos que já existe um subsistema de logística completo (`logistics.functions.ts`, 18 funções server) construído para **SIGEP/Correios com contrato direto**. Você migrou desse modelo para o Melhor Envio de propósito.

**Consequência:** isto não é construção do zero. A carcaça (envio, etiqueta, rastreio, picking, painel admin, tabela de saída) já existe. O trabalho é (1) adicionar cotação, que nunca existiu, e (2) trocar o cliente de transportadora de SIGEP para Melhor Envio.

O SIGEP não sabia o preço do frete — `serviceMap` tem `price: 0` hardcoded (`logistics.functions.ts:1224-1226`). É a prova de por que a migração faz sentido: o Melhor Envio traz preço real.

---

## PONTO DE CORTE — POR QUE A TROCA É CIRÚRGICA

Em `generateOrderLabel` (`logistics.functions.ts:1184`), todo o código específico de Correios está atrás de um único `if` (linha 1248) e chama um único módulo:

```
if (credentials?.usuario && credentials?.codigoAcesso && credentials?.cartaoPostagem) {
  const { criarPrepostagem } = await import("@/lib/correios-client.server");
  ...
}
```

**Antes do if** (buscar pedido, validar endereço, guarda contra duplicata) e **depois** (gravar `tracking_code`/`label_url`) são agnósticos de transportadora. Só o miolo troca.

| SIGEP (hoje) | Melhor Envio (novo) |
|---|---|
| `correios-client.server` → `criarPrepostagem()` | `melhor-envio-client.server` → `comprarEtiqueta()` |
| credenciais de `shipping_settings.sigep_credentials` | token de `MELHOR_ENVIO_TOKEN` (env) |
| `service: "PAC"/"SEDEX"/"SEDEX10"` (enum) | `servicoId` numérico (vem da cotação) |
| remetente montado à mão de `sender_info` | remetente já cadastrado na conta Melhor Envio |

---

## CONTRATO DO NOVO MÓDULO

`melhor-envio-client.server.ts` espelha `correios-client.server.ts` (mesmos formatos, nomes trocados), para encaixar no padrão que `generateOrderLabel` já conhece:

```ts
export type MelhorEnvioCredentials = { token: string };   // do env, não do banco

export type MelhorEnvioCotacaoInput = {
  fromCep: string;
  toCep: string;
  produtos: { id: string; width: number; height: number;
              length: number; weight: number;       // kg
              insurance_value: number; quantity: number }[];
};

export type MelhorEnvioOpcao = {
  servicoId: number; transportadora: string; servico: string;
  precoCentavos: number; prazoDias: number;
};

export type MelhorEnvioCompraInput = {
  servicoId: number;
  destinatario: { nome: string; telefone: string; email: string; endereco: {...} };
  // remetente NÃO — Melhor Envio usa o cadastrado na conta
};

export type MelhorEnvioCompraResult = {
  ok: boolean; trackingCode?: string; labelUrl?: string;
  shipmentIdExternal?: string; erro?: string;
};

export async function cotar(input: MelhorEnvioCotacaoInput): Promise<MelhorEnvioOpcao[]>;
export async function comprarEtiqueta(input: MelhorEnvioCompraInput): Promise<MelhorEnvioCompraResult>;
```

---

## OS QUATRO BLOCOS DE TRABALHO

### 1. `cotarFrete()` no checkout — GREENFIELD

O único trabalho realmente novo. Server function que:
- recebe **só** `cepDestino` + `[{ productId, quantity }]` — nunca peso/preço do client
- lê peso e dimensão do Supabase (servidor decide, não o front)
- chama `cotar()` do novo módulo
- aplica a regra de frete grátis (ver abaixo)
- grava a cotação em `shipping_quotes` e retorna `cotacaoId` + opções

**⚠️ Conversão de unidade:** `products.weight_grams` é inteiro em gramas; a API quer kg. `weight_grams / 1000`. Teste unitário obrigatório — o erro é silencioso (vira preço absurdo, não exceção).

**Regra de frete grátis (decisão (b), formalizada — amarrada em preço, não em nome de serviço):**
```
se subtotal >= LIMIAR:
    maisBarato = min(opcoes por precoCentavos)
    cada opcao.precoExibido = opcao.preco - maisBarato.preco   // mais barato zera; resto paga a diferença
senão:
    cada opcao.precoExibido = opcao.preco
```
**LIMIAR:** hoje R$ 199 hardcoded em `commerce-config`, MAS existe `shipping_settings.free_shipping_threshold` no banco. Decidir qual é a fonte de verdade ANTES de codar — não manter as duas.

### 2. `melhor-envio-client.server.ts` — novo módulo

Espelho do `correios-client.server`. Header obrigatório `User-Agent: Fragranciaria (email)` — sem ele o Melhor Envio recusa sem dizer o motivo. Token do env, nunca do banco, nunca com prefixo `VITE_`.

### 3. Trocar o bloco em `generateOrderLabel`

De `criarPrepostagem` para `comprarEtiqueta`. A carcaça da função fica. O `service` enum vira `servicoId` — isso propaga pro painel admin (o seletor de serviço muda de 3 opções fixas para as opções da cotação).

### 4. Aposentar SIGEP

As 4 funções `*Sigep*` e `correios-client.server` param de ser chamadas. **Não deletar agora** — deixar como legado até o Melhor Envio estar validado em produção. Deletar é um PR separado, depois.

---

## SEGURANÇA — A COTAÇÃO NÃO PODE SER DITADA PELO CLIENT

Mesmo princípio que `createPayment` já aplica com preço de produto. O client escolhe a opção e manda **só `cotacaoId` + `servicoId`** de volta. O `createPayment` busca a cotação gravada, valida que o `servicoId` está entre as opções cotadas, e usa **o preço do servidor**. Nunca o preço que o client mandou.

Sem isso, um client adultera `precoCentavos: 0` e ganha frete grátis pra qualquer lugar.

---

## RECONCILIAÇÃO — O QUE O SIGEP NUNCA TEVE

Três colunas de preço em `orders` (algumas já podem existir da migration que tentamos — verificar antes):
- `shipping_quoted_cents` — o que o Melhor Envio cotou
- `shipping_charged_cents` — o que o cliente pagou (após frete grátis)
- `shipping_actual_cents` — o que a etiqueta custou de fato

`quoted - charged` = quanto o frete grátis te custou. `actual - quoted` = quanto a estimativa de peso errou. Depois de ~30 vendas, dá pra corrigir peso com evidência em vez de achismo — o peso hoje é estimado em 10 faixas, não medido.

---

## TESTES

- **Vão quebrar (esperado):** testes 4 e 5 do `funil.spec.ts` (frete determinístico). Solução: **mock** da resposta do Melhor Envio nos E2E. Nunca chamar a API real em teste.
- **Novos:** conversão de unidade (unitário); client não dita preço; API fora → fallback; CEP inválido → não chama API; regra de frete grátis.

---

## PRÉ-REQUISITO DE SEGURANÇA — ANTES DE QUALQUER CÓDIGO

A migration de colunas em `orders` entra pelo SQL Editor. **Verificar primeiro** o que já foi aplicado das tentativas anteriores desta sessão (a tabela `shipping_quotes` já existe com schema próprio; parte das colunas de `orders` pode já ter entrado). Rodar contra o schema real, não contra suposição.

Baseline do schema já foi commitado hoje. Bom.

---

## ORDEM DE EXECUÇÃO

1. Decidir a fonte de verdade do LIMIAR de frete grátis (banco vs `commerce-config`)
2. Verificar o estado real das colunas de `orders` e da tabela `shipping_quotes` (o que já existe da sessão de hoje)
3. `melhor-envio-client.server.ts` — só `cotar()`, com teste de conversão de unidade
4. `cotarFrete()` no checkout — caminho feliz, sem cache, sem fallback
5. Cotação gravada + validação no `createPayment`
6. `comprarEtiqueta()` no módulo + trocar o bloco em `generateOrderLabel`
7. Cache e fallback
8. Ajustar testes 4 e 5 com mock; novos testes
9. (Depois, PR separado) deletar SIGEP legado

Passos 3-5 são um PR. 6 é outro. Não misturar cotação (checkout, automático) com etiqueta (admin, humano no loop) — modelos de confiança diferentes.
