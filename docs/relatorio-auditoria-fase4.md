# RELATÓRIO DE AUDITORIA — FLUXO DE VENDA FRAGRANCIARIA
**Data:** 17/07/2026
**Escopo executado:** Fases 1 e 2 completas. Fase 3 parcial (suíte existente rodada; gaps não implementados).

---

## RESUMO EXECUTIVO

**Nenhum P0 confirmado.** Isso é notícia boa e merece ser dita antes de qualquer outra coisa: a auditoria procurou falha de integridade de preço, pedido órfão e vazamento de PII, e não encontrou nenhum confirmado.

O achado central não é um bug. É estrutural: **não existe registro de qual é o estado real do banco de produção.** Isso explica o padrão de regressão recorrente melhor que qualquer defeito individual encontrado.

| Severidade | Total |
|---|---|
| P0 | 0 confirmados |
| P1 | 3 |
| P2 | 4 |
| DIVERGÊNCIA | 2 |
| NÃO VERIFICADO | 1 |

---

## P1 — FUNCIONA, MAS VAI QUEBRAR

### [P1] Não há registro de quais migrations estão aplicadas em produção

**Evidência:**
```sql
select version, name from supabase_migrations.schema_migrations
order by version desc limit 20;
-- Success. No rows returned
```
Tabela existe. Zero linhas.

**O que acontece:**
Migrations são aplicadas manualmente via SQL Editor (regra do `CLAUDE.md`). Colar SQL no editor não popula `schema_migrations` — isso só ocorre via `supabase db push`. O resultado é que os arquivos em `supabase/migrations/` não têm relação verificável com o schema vivo.

**Por que importa:**
É a causa raiz habilitadora do padrão de regressão. Sem baseline confiável, ninguém — nem você, nem agente nenhum — consegue afirmar o que está em prod sem inspecionar tabela por tabela. Sintomas já observados que derivam disso:
- `@ts-expect-error` em `payments.functions.ts:315-318` (migration aplicada, `types.ts` não regenerado)
- Incidente anterior de `orders.user_id` vs `auth_user_id`
- Impossibilidade de responder "a migration `20260718_nfe_orders_columns.sql` está aplicada?" sem ir olhar a tabela

**Como corrigir:**
Duas opções, e a escolha é sua:
- **(a)** Adotar `supabase db push` como via única. Ganha rastreamento automático, perde o controle manual que você tem hoje.
- **(b)** Manter SQL Editor e criar um baseline verificado: um snapshot do schema de prod commitado, mais um script de diff rodado antes de cada deploy.

A opção (b) preserva seu fluxo. A (a) é mais robusta a longo prazo. Não decida agora — mas decida antes do próximo deploy.

---

### [P1] `reviews.functions.ts:200` — interpolação em `.or()` sem sanitização alguma

**Evidência:** `src/lib/reviews.functions.ts:200` — dado interpolado: `user.email` (do JWT verificado). Sanitização: nenhuma.

**O que acontece:**
Dos 7 pontos com interpolação crua em `.or()`, este é o único sem escape algum. Os demais escapam pelo menos `%` e `_`.

**Por que importa:**
A barra de exploração aqui é mais baixa que nos outros. Não exige vírgula nem parêntese para causar dano: um `%` no e-mail vira wildcard de ILIKE e a comparação deixa de ser igualdade. `%` é caractere válido na parte local de um endereço de e-mail — bem mais plausível de sobreviver ao signup que vírgula.

**Como corrigir:**
Substituir a interpolação por `.eq()` parametrizado. Ver nota estrutural abaixo.

---

### [P1] Escopo via `supabaseAdmin` com filtro manual — 7 pontos no funil

**Evidência:**

| Arquivo:linha | Sanitização | Origem do dado |
|---|---|---|
| `account.functions.ts:188` | `emailScope()` — só `%`/`_` | `user.email` (JWT) |
| `account.functions.ts:231` | idem | idem |
| `account.functions.ts:612` | idem | idem |
| `reviews.functions.ts:200` | nenhuma | `user.email` (JWT) |
| `products-admin.functions.ts:124` | só `%`/`_` | `data.search` (input do admin) |
| `customers-admin.functions.ts:234,254` | `sanitizeSearch()` — completa | `data.search` |
| `customers-admin.functions.ts:401` | `safeEmail` + `.join(",")` | `customer.email` |

Os outros 15 arquivos varridos usam exclusivamente `.eq()`/`.in()` parametrizados.

**O que acontece:**
`supabaseAdmin` é service role — **bypassa RLS inteiro**. A única coisa separando o pedido do cliente A do cliente B é um filtro escrito à mão. Existem duas gerações de código convivendo: `orders-admin` e `customers-admin` (mais recentes) já usam `sanitizeSearch()`; `account`, `reviews` e `products-admin` ainda usam a sanitização antiga que só cobre wildcards de ILIKE, não a sintaxe do `.or()`.

**Por que importa:**
Um erro de digitação no filtro, uma refatoração descuidada, ou um caminho de código que esqueça o filtro = vazamento de PII de todos os pedidos. E RLS não salva, porque service role passa por cima dela.

**Atenuante honesto:** o escopo vem de `user.email` extraído de JWT verificado, nunca de input direto do cliente. Isso reduz muito a superfície — mas o `products-admin.functions.ts:124` interpola `data.search`, que é input livre.

**Como corrigir — nota estrutural:**
A divergência "2 chars vs 3 chars escapados" **não se resolve padronizando em 3**. Escapar caractere em interpolação de string é reimplementar um parser à mão, e você vai errar de novo daqui a seis meses. A correção é **parar de interpolar**: `.eq()` com parâmetro, `.in()`, ou dois filtros encadeados em vez de um `.or()` montado com template literal.

---

## NÃO VERIFICADO

### Explorabilidade do vetor de `.or()`

**Motivo:** exigiria testar se `supabase.auth.signUp()` público aceita `%`, vírgula ou parêntese no e-mail. Não foi testado — rodar contra produção criaria usuário real (viola a regra de não escrever durante auditoria).

**Como fechar:** projeto Supabase de rascunho, testar `signUp()` público (não `supabaseAdmin.auth.admin`, que não aplica as mesmas validações). Testar `%` primeiro.

**Importante:** este teste decide a **severidade** (P0 se aceita, P2 se não), não a **correção**. A correção é a mesma nos dois casos. Não deixe o teste bloquear o conserto.

---

## P2

| Item | Evidência | Nota |
|---|---|---|
| Validação de CPF duplicada | `customer-validation.ts` (usada pelo ShippingForm) vs Luhn hardcoded em `PaymentForm.tsx:77-93` | Duas fontes de verdade. Não é bug funcional. |
| `types.ts` desatualizado | `@ts-expect-error` em `payments.functions.ts:315-318` | Sintoma do P1 de migrations. Regenerar. |
| Código morto | `orders.functions.ts::getMyOrders` / `getMyOrderById` — sem importador | Remover. Risco de alguém importar a versão errada. |
| Frete client-side | `calculateShipping`/`qualifiesForFreeShipping` em `commerce-config` | Sem Melhor Envio/Correios server-side. Pendência conhecida. |

---

## DIVERGÊNCIA — customização provável, não defeito

### Servidor aceita divergência de valor a favor do cliente
`payments.functions.ts:150-211`. O servidor recalcula `serverAmount` do preço real no Supabase e só bloqueia se cobraria **mais** que o client mostrou; se a diferença favorece o cliente, deixa passar e loga aviso.
**Avaliação:** decisão de produto defensável — não travar venda por centavo a favor do comprador. Registrado como divergência consciente, não falha.

### PIX/boleto avançam para confirmação com status `pending`
`PaymentForm` chama `onDone` com `status: "pending"` sem polling. O webhook do MP (`/api/public/mp-webhook`) reconcilia depois.
**Avaliação:** coerente com o design. Já mapeado como pendência de UX (separar "recebido" de "confirmado"), não como bug.

---

## COBERTURA DE TESTES — ESTADO ATUAL

```
Running 6 tests using 1 worker
  ✓ 1. Carrinho vazio redireciona para fora de /checkout (1.2s)
  ✓ 2. Comprar Agora leva ao /checkout com item no carrinho (1.7s)
  ✓ 3. Carrinho recalcula quantidade e Finalizar leva ao checkout (1.3s)
  ✓ 4. Checkout cobra frete em 198,99 e frete grátis em 199,00 (1.9s)
  ✓ 5. Drawer delega frete e descontos ao checkout (2.9s)
  ✓ 6. ShippingForm com CPF inválido não avança para pagamento (1.9s)
  6 passed (16.0s)
```

**Cobre:** o funil observável, sem pagamento.
**Não cobre:** MP sandbox (aprovado/recusado), idempotência do webhook, **isolamento entre usuários**.

O gap de isolamento é o mais relevante: é exatamente o teste que guardaria o P1 do `supabaseAdmin`. Enquanto ele não existir, aquele filtro manual não tem rede de proteção nenhuma.

---

## OS 3 PRIMEIROS

1. **Baseline de migrations.** Não é o mais grave, é o que destrava todo o resto. Enquanto não existir, cada achado desta auditoria expira no próximo deploy e você volta a auditar do zero.
2. **Teste de isolamento entre usuários no Playwright.** Um teste. Guarda os 7 pontos de `supabaseAdmin` de uma vez e falha alto se alguém quebrar o escopo.
3. **`reviews.functions.ts:200`.** Elo mais fraco da classe, correção pontual, cinco minutos.

---

## O QUE RESOLVE O PADRÃO, NÃO O SINTOMA

Esta auditoria conserta o hoje. O que muda o amanhã são duas regras no `CLAUDE.md`:

1. **Nenhuma tarefa está concluída sem o output real do teste colado na conversa.**
2. **A suíte E2E roda antes de cada deploy. Falhou, não sobe.**

Sem isso, a próxima venda manual quebrada é questão de tempo.
