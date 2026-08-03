# Backlog — Fragranciaria

Tarefas registradas por motivo (segurança, refactor, tipos, etc.) que **não** estão no
escopo de um PR atual. Cada item tem: contexto, dono sugerido, e condição para promoção.

> **Este arquivo é a fonte única do backlog.** Consultar aqui para retomar, em vez de
> refazer o levantamento. Ao fechar um item, marcar aqui no mesmo commit.
>
> Última reconciliação: **2026-07-31**, medida contra o repo e o banco de produção
> (`gzxlupgdmrtkprwhiutp`). Números abaixo são medidos, não estimados.

---

# Backlog reconciliado — 2026-07-31

Base do catálogo na data: **1234 produtos ativos**, 1646 no total (412 inativos).

## Bloqueado por terceiro

| # | Item | Estado | Onde |
|---|---|---|---|
| ~~T1~~ | ~~**Etiqueta dos Correios (pré-postagem)**~~ — **ENCERRADO 2026-08-02 (decisão do Edu).** Etiqueta sai só pelo Melhor Envio; a integração direta com os Correios (SIGEP/API 36) não é mais pendência. O código SIGEP no repo virou órfão — ver "Código de Correios órfão (T1)" abaixo para o inventário; decisão de remover ou deixar parado ainda em aberto. | encerrado | — |
| T2 | **NCM por regra de categoria** — 1563 de 1646 produtos sem NCM (só 83 têm). Documento enviado ao contador; resposta esperada 2026-08-01. | aguardando contador | `products.ncm` |
| T3 | **Kits com NCM divergente entre itens** — decisão se desmembra na nota. | aguardando contador | `products.category = 'Kits'` |

## Depende do Edu

| # | Item | Estado | Onde |
|---|---|---|---|
| E1 | **Rotação de 5 secrets** vistas em texto puro: `SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN`, `RESEND_API_KEY`, `SERPER_API_KEY`, `ML_CLIENT_SECRET`. As duas primeiras são as mais sérias (bypassa RLS / move dinheiro). | pendente | `CLAUDE.md` matriz |
| E2 | **`MP_WEBHOOK_SECRET` no Railway** — sem ele o webhook rejeita tudo com 401 e a confirmação de PIX/boleto (commit `13d27e7`) nunca sai. | a confirmar em prod | `mp-webhook-handler.ts:79` |
| E3 | **Medir 5 produtos-tipo** (balança e régua) para a correção de peso por faixa. Ver C1. | aguardando medição | — |
| E4 | **15 SKUs duplicados da planilha de import** — conferir os códigos corretos. **DIVERGE:** não há SKU duplicado nem vazio entre os 1234 ativos; se os 15 ficaram fora, estão na planilha, não no banco. | pendente esclarecer | planilha de import |
| E5 | **`featured` em 0 produtos ativos** (20 marcados, todos inativos). "Mais Vendidos" cai inteiramente no aleatório estável até promover pelo admin. | pendente | `products.featured` |
| E6 | **"Por Necessidade" da home** — decisão sobre os 8 cards. **DIVERGE:** Hidratação/Nutrição/Reconstrução/Proteção/Styling **já não estão** na home; hoje são 8 categorias reais (Shampoo, Condicionador, Máscara, Coloração, Finalizador, Tratamento, Maquiagem, Óleo). Nada a decidir, a menos que queira outro corte. | resolvido de fato | `src/routes/index.tsx:78-87` |
| E7 | **`loja_aberta` ainda `false`** — home mostra "Inauguração em breve". Se a loja abriu, é uma flag para virar. | pendente | `store_settings.loja_aberta` |

## Código

| # | Item | Estado | Onde |
|---|---|---|---|
| C1 | **970 ativos sem peso E dimensão** caindo no fallback de 250g / 20x15x15. **DIVERGE:** são 970, não 774. Dos 264 que têm peso, só **7 valores distintos** e **8 combinações de dimensão** — ou seja, vieram de estimativa por categoria, não de medição (confirma o item 4 da lista do Edu). Correção final é SQL por faixa, depende de E3. | pendente | `melhor-envio-client.server.ts:128` |
| ~~C2~~ | ~~**Grafia da marca L'Oréal**~~ — **APLICADO EM PROD 2026-08-01.** `20260801a_loreal_brand.sql` (42 resíduos de `brand`) e `20260801b_loreal_name.sql` (191 títulos), nessa ordem. Confirmado no banco: `brand` numa grafia só (259 total), 202 títulos corretos, 0 variantes cruas, 0 `L'L'Oréal`. Ganho funcional: o clique em "L'Oréal" no menu passou de 191 para **209 ativos** (a diferença dos 42 é que 24 eram produtos inativos). Os 4 termos de busca seguem convergindo — a normalização do C10 segurou a correção, que foi o motivo de inverter a ordem. | **feito** | `20260801a`, `20260801b` |
| C3 | **NF-e com valores chumbados** — `aliquotaIcms: 18`, `aliquotaPis: 1.65`, `aliquotaCofins: 7.6`, `ncm` de fallback `33049990`, `cfop 5102`, `cst 00`. **CORREÇÃO DE LINHA:** estão em `nfe.functions.ts:294-304`, não 288-306. | pendente | `nfe.functions.ts:294-304` |
| C4 | **`modalidadeFrete: 1` (FOB) com frete CIF** — o valor está fixo. **CORREÇÃO DE LINHA:** linha **362**, não 288-306 (é outro trecho do arquivo). | pendente | `nfe.functions.ts:362` |
| C5 | **`store_settings` fora do padrão de GRANT** — é a única das 5 tabelas de config que mantém GRANT para `anon`/`authenticated`. Não é buraco ativo (a RLS filtra e devolve 0 linhas), mas divergente das outras quatro. **Nota:** nenhuma migration do repo contém `revoke` para essas tabelas — os lockdowns foram aplicados direto no SQL Editor, então o repo não reflete o estado real. | pendente | `20260730b_lockdown_nfe_settings.sql:23` |
| C6 | **Rate limit no rastreio de pedido** — TODO marcado P1 pelo próprio código. Token de 77,5 bits (brute force inviável), mas token vazado vale para sempre. Falta contador por IP. | pendente | `order-tracking.functions.ts:19` |
| C7 | **Troca de senha no dashboard do afiliado** — TODO, não implementado. | pendente | `afiliado/dashboard/configuracoes.tsx:115` |
| C8 | **Formulário de contato sem backend** — TODO, não integrado. | pendente | `routes/contato.tsx:49` |
| C9 | **`whatsapp_settings` e `order_status_history` não existem em prod — mas são MORTAS, não bug.** Correção do que escrevi antes ("código que as referencie vai falhar"): não há referência a nenhuma das duas. `order_status_history` só aparece num comentário em `account.functions.ts:236` que diz que a tabela não existe — o histórico vive na coluna JSON `orders.status_history`. `whatsapp_settings` tem zero ocorrências no código, em qualquer grafia. Nada quebra, nada a criar nem remover. | resolvido (nada a fazer) | — |
| ~~C14~~ | ~~**Cupom criado no admin não vale no checkout**~~ — **CÓDIGO FEITO 2026-08-01; checkout voltou a renderizar em prod após hotfix `94d5f9d` (confirmado pelo Edu).** Fonte trocada do mapa hardcoded para a tabela via `resolveCoupon` (server fn única). Os três tipos (`percentage`/`fixed_amount`/`free_shipping`) com as bordas decididas; validação server-side (validade/mínimo/ativo/limite); `usage_count` incrementado no webhook na aprovação; erros tipados por motivo. Migrations `20260801d` (seed BEMVINDO10) e `20260801e` (orders.coupon_code + increment_coupon_usage) aplicadas. **Falta:** smoke real de cada tipo no checkout e confirmação do `usage_count` após pagamento aprovado. | aguardando smoke | `coupon-resolve.functions.ts`, `commerce-config.ts` |
| ~~C10~~ | ~~**Busca da storefront não normaliza acento nem apóstrofo**~~ — **FEITO 2026-08-01.** `normalizeSearchText`/`tokenizeSearchQuery`/`matchesAllTokens` em `lib/search-normalize.ts`, fonte única dos três pontos de busca. Os 4 termos convergem em **209** nos dois filtros (antes: 71/47/191/118 na listagem). 10 testes novos. | **feito** | `lib/search-normalize.ts` |
| C11 | **Busca carrega os 1234 ativos no navegador para filtrar em JS** — dívida conhecida de escala, não tarefa imediata. Ver "Dívida de escala" abaixo. | dívida aceita | `produtos.tsx:265-297` |
| C12 | **`brand_slug` divergente de `slugify(brand)` em 1209 produtos, 15 marcas com slug compartilhado** — resíduo do SQL de marcas de 29/07, que corrigiu `brand` e não tocou em `brand_slug`. **Dado morto:** nenhuma rota `/marcas/$slug`, nenhuma query filtra por slug, nenhum componente lê. As 6 ocorrências no código são todas de *escrita* (`products-admin.functions.ts:66,96,100,235`), mais a lista de colunas ignoradas no import e dois seeds antigos. A `search_vector` que consumiria o slug (`20260707_canonical_products.sql:71`) **não existe em prod** — migration nunca aplicada. Correção futura: um `UPDATE brand_slug = slugify(brand)` de uma vez. Seguro, não urgente. | pendente | `products.brand_slug` |
| C13 | **Menu tem 2 marcas que não existem no catálogo** — "Truss" e "Lowell" dão **0 produtos** e abrem listagem vazia; não existem nem com outra grafia. Precisam sair do menu ou entrar no catálogo. Achado ao trocar o contador fixo por contagem real. | pendente | `NavbarEditorial.tsx` BRANDS |

## Itens da lista do Edu que já estão FEITOS

| # | Item | Onde fechou |
|---|---|---|
| F1 | Ajustes de layout da home (2 prateleiras, banner do simulador, card padronizado, trust badges) | `c138aed` + `cf3b1f4` (2026-07-31) |
| F2 | Cross-sell "leve junto" no carrinho | `ee6dcfc`, movido pro drawer em `20699c3`. Em uso em `CartDrawerEditorial.tsx:136` e `carrinho.tsx`. **Nota:** o arquivo é `components/shop/CartComplements.tsx`, não `components/cart/` |
| F3 | Fallback de peso/dimensão na cotação | `7395cd4` — o fallback existe e loga `console.warn` a cada uso, para dar para medir quantas cotações caem nele |

## Escopo corrigido — grafia L'Oréal (resposta ao Passo 2)

**Você está certo, e eu medi a coluna errada na resposta anterior.** Eu olhei apenas
`brand` entre os ativos e reportei "existem `Loreal` e `L'Oreal` sem acento" sem dizer
que a grafia correta era a maioria. O SQL de 29/07 funcionou.

Medição de 2026-07-31 (todos os 1646 produtos):

| Coluna | Valor | Qtd |
|---|---|---|
| `brand` | `L'Oréal` (correto) | **217** |
| `brand` | `Loreal` | 29 |
| `brand` | `L'Oreal` | 13 |
| `name` | contém `L'Oréal` correto | **11** |
| `name` | contém Loreal/L'Oreal sem acento | **191** |

Ou seja: `brand` está 84% correto e sobraram **42 produtos** (29 + 13) com resíduo —
o SQL de 29/07 pegou 190, não todos. O problema grande está em **`name`**, onde 191
produtos trazem "Loreal" cru no título, ex.:

```
"Coloração Sem Amônia Loreal Tinta Inoa 60ml - ..."   [brand: L'Oréal]
```

Escopo real da correção, então, são **dois SQL distintos**:

1. `brand`: normalizar os 42 resíduos para `L'Oréal` (rápido, baixo risco).
2. `name`: 191 títulos. **Mais delicado** — `name` alimenta busca, exibição e a
   descrição do item na NF-e. Vale decidir se a correção é no dado ou se o título
   fica como o fornecedor manda e a marca canônica é sempre lida de `brand`.

### Ordem obrigatória: normalizar a busca ANTES de corrigir o dado

**Hoje a busca funciona por acidente.** O dado "errado" (`Loreal`, sem acento e sem
apóstrofo) é exatamente o que o usuário digita. Corrigir o dado primeiro derruba a
busca por "loreal" sem que ninguém reclame — as vendas de L'Oréal só caem. É
regressão silenciosa, o pior tipo.

Medido em 2026-07-31 replicando o filtro exato da storefront contra os 1234 ativos:

| Termo digitado | Hoje | Depois de corrigir `name` |
|---|---|---|
| `loreal` | 71 | **17** |
| `l'oreal` | 47 | **1** |
| `l'oréal` | 191 | 209 |
| `oreal` | 118 | **18** |

E se os 42 resíduos de `brand` também forem corrigidos, `loreal` vai a **zero**: não
sobra nenhum campo com a grafia crua para o `includes` casar.

**Por que quebra.** A busca é inteiramente client-side, com
`.toLowerCase().includes()` — nada de ILIKE ou full-text do Postgres:

- `src/routes/produtos.tsx:273-279` — `name`, `brand`, `category`
- `src/components/shop/SearchAutocomplete.tsx:99-105` — os mesmos, mais `tags`

No banco **não há `tsvector`, `pg_trgm` nem `unaccent`**. O único índice GIN é em
`tags` (`002_ecommerce_schema.sql:513`).

**A prova de que o problema é a query, não o dado:** a busca do agente
(`src/lib/agent/product-search.ts:46`) acha **209 em todas as variações** testadas,
porque normaliza os dois lados com NFD antes de comparar. Mesmo dado, resultado
correto — o que falta é a normalização nos filtros da storefront.

**Ordem correta:**

1. ~~Levar a `normalize()` para os dois filtros da storefront.~~ **FEITO em
   2026-08-01.** A lógica virou fonte única em `src/lib/search-normalize.ts`
   (`normalizeSearchText`, `tokenizeSearchQuery`, `matchesAllTokens`), importada
   pelos três pontos de busca: `produtos.tsx`, `SearchAutocomplete.tsx` e
   `agent/product-search.ts` (que perdeu a cópia local e ganhou a remoção de
   apóstrofo que não tinha).
2. **Liberado:** rodar os SQL de `brand` (42 resíduos) e depois `name` (191
   títulos).

Medição depois da normalização, contra os 1234 ativos:

| Termo | Listagem antes | Listagem depois | Autocomplete antes | Autocomplete depois |
|---|---|---|---|---|
| `loreal` | 71 | **209** | 105 | **209** |
| `l'oreal` | 47 | **209** | 93 | **209** |
| `l'oréal` | 191 | **209** | 208 | **209** |
| `oreal` | 118 | **209** | 118 | **209** |

Os quatro convergem em 209 nos dois filtros. Decisões de implementação que valem
saber: o **hífen é preservado** (1146 dos 1234 nomes usam como separador real, e
colapsá-lo juntaria palavras que o usuário digita separadas); o apóstrofo **curvo
(’)** também é removido, mesmo não existindo em prod, porque teclado de celular
insere sozinho; e `matchesAllTokens` casa cada token em **campo diferente**, então
"loreal inoa" acha o produto cuja marca é L'Oréal e o nome tem Inoa (71 resultados).

### Dívida de escala (C11) — busca client-side

A busca carrega os **1234 produtos ativos no navegador** e filtra em JS
(`produtos.tsx:265-297`). Funciona hoje e normalizar aí é barato, sem precisar de
índice. **Não é tarefa imediata** — está registrado como dívida aceita.

O risco é na migração: quando virar busca no servidor (catálogo maior, paginação
real), a normalização **precisa existir no Postgres** — `unaccent` + índice, e o
apóstrofo tratado do mesmo modo. Senão a migração reintroduz exatamente o bug
descrito acima, com o dado já corrigido e nenhum campo cru para salvar a busca.

### Código de Correios órfão (T1)

Levantado em 2026-08-02, depois da decisão de usar só o Melhor Envio. A
integração direta com os Correios é a **SIGEP / pré-postagem** — não confundir
com menções a "Correios" como transportadora de rastreio, que ficam (pedidos
antigos e o próprio Melhor Envio despacham por Correios).

**Núcleo órfão — a integração em si (candidato a remoção):**

- `src/lib/correios-client.server.ts` (181 linhas) — cliente da API de
  pré-postagem (`criarPrepostagem`, `getServiceCode`). Importado num único
  ponto: `logistics.functions.ts:1156`.
- `logistics.functions.ts` — 3 server fns SIGEP: `getSigepInfo`,
  `saveSigepCredentials`, `requestSigepLabels` (~linhas 1054-1225). São as
  únicas que tocam o correios-client.
- `admin/logistica.tsx` (1874 linhas no total) — a UI SIGEP: botão "Config.
  SIGEP", aba "Etiquetas SIGEP", componente `EtiquetasSIGEP` (~1548-1730) e
  `SigepConfigModal` (~1739-1830). Nota do próprio código em 1556: o PDF da
  etiqueta SIGEP "é sempre null — nada escreve nessa coluna". Ou seja, já não
  produz etiqueta utilizável.

**Fica (NÃO é órfão — só cita "Correios"):**

- `buildTrackingUrl` (`logistics.functions.ts:1016`) — URL de rastreio quando a
  transportadora é Correios. Vale para pedidos despachados por Correios via ME.
- `declaração de conteúdo` (`logistics.functions.ts:751,870`) — documento de
  postagem, não é a API.
- `carrier || "Correios"` (609, 914) — rótulo de fallback de transportadora.
- `enviofacil.ts`, `cotar-frete.test.ts`, `ShippingForm.tsx`,
  `configuracoes.tsx` (avisos de texto), `pedido.$token.tsx`,
  `LocalLabelModal.tsx` — cotação/rastreio/textos, não a integração SIGEP.

**Decisão pendente:** remover o núcleo (correios-client + 3 server fns + UI
SIGEP, ~300-400 linhas somadas) ou deixar parado. Risco de deixar: mostra ao
admin uma aba "Etiquetas SIGEP" que pede credenciais e nunca gera etiqueta
usável — confunde. Risco de remover: se algum dia o contrato Correios for
reativado, refaz do zero (mas está no git). Não bloqueia nada hoje.

### Escopo C14 — ligar `coupons` ao checkout (os três tipos)

A migration `20260801c_create_coupons.sql` (aplicada em prod 2026-08-01) destravou
a tela do admin, mas deixou uma promessa que o checkout não cumpre: o cupom criado
lá **não vale na compra**. São dois mundos separados hoje.

- **Admin** escreve/lê `public.coupons`, com `discount_type` ∈ {`percentage`,
  `fixed_amount`, `free_shipping`} + `discount_value`.
- **Checkout** (`CheckoutSummary.tsx`, `carrinho.tsx`) chama `getCoupon()` de
  `commerce-config.ts:22`, um mapa **hardcoded** com um único cupom (`BEMVINDO10`,
  10%). O tipo `CheckoutCoupon` só tem `discountPercent`.

Ligar os dois **não é trocar a fonte de `getCoupon`** — é ampliar o modelo, porque
o checkout só sabe desconto percentual. Escopo mínimo para não voltar a prometer o
que não cumpre:

1. `getCoupon`/`calculateDiscount` (`commerce-config.ts`) passam a ler `coupons` e
   a tratar os três tipos: `percentage` (existe), `fixed_amount` (subtrair R$ do
   subtotal, respeitando o teto `MAX_DISCOUNT_PERCENT`) e `free_shipping` (zerar o
   frete, não o subtotal — interage com `calculateShipping`).
2. `CheckoutCoupon` (`checkoutStore.ts`) deixa de ser só `discountPercent`.
3. Validação server-side em `payments.functions.ts` (`calculateDiscount` na
   autoridade do server) tem que aceitar os três — senão um `fixed_amount` válido
   no client é recusado no server, ou pior, o inverso.
4. Respeitar as restrições que a tabela já modela e o checkout ignora:
   `minimum_order_value`, `expires_at`, `usage_limit`, `first_purchase_only`.

Sem o item 1 completo, criar no admin um cupom de R$ 20 (`fixed_amount`) ou de
frete grátis (`free_shipping`) gera uma tela que promete um desconto que a compra
não aplica.

---

## B1 — RESOLVIDO — `account.functions.ts` importava `getSupabaseServerClient`

> **Fechado.** Verificado em 2026-07-31: `getSupabaseServerClient` não tem mais
> nenhuma ocorrência em `src/`. O texto abaixo fica como histórico do problema.

**Contexto:** No PR Bloco B-modificado (commits `d70dc7c` + `5c1a7c1`), o helper
`getSupabaseServerClient()` foi exportado por `client.server.ts` como atalho para o
admin client (service role). Foi usado em `refund.functions.ts`.

No re-QA deste PR (decisão do owner):
- `getSupabaseServerClient()` foi removido de `client.server.ts` — agora só existe
  `supabaseAdmin` (top-level Proxy).
- `refund.functions.ts` foi reescrito para usar **per-request auth client** via
  `attachSupabaseAuth` middleware + `supabase.auth.getUser(token)`.
- **`account.functions.ts` (NÃO TOCADO NESTE PR)** ainda chama
  `getSupabaseServerClient()` e desestrutura `{ user, supabase }`. Esse helper
  não existe mais.

**Impacto provável em produção** (a confirmar):
- `tsc --noEmit` aponta erro aqui, mas foi compilado antes do meu commit — verificar.
- Em runtime, toda chamada a uma server fn de `account.functions.ts` (dashboard,
  pedidos, perfil, favoritos, endereços, notificações) tenta desestruturar de uma
  função que não existe — falha de import ou retorna um client de service role que
  falha em `auth.getUser()` (`null`). Resultado: `/minha-conta/*` provavelmente
  retorna erro genérico.

**Escopo do próximo PR:**
1. Aplicar o mesmo padrão do `refund.functions.ts` (per-request auth client via
   `getRequestHeader("Authorization") + createClient(URL, anonKey, ...)`
   + `supabase.auth.getUser(token)` para verificar identidade).
2. Trocar todas as `getUserClient()` em `account.functions.ts` por esse padrão.
3. Atualizar `dashboard.functions.ts`, `order-history.functions.ts`, e qualquer
   outro `.functions.ts` da pasta `/minha-conta` que tenha o mesmo anti-pattern.

**Prioridade:** P1 se o teste ao vivo do dono (pendente, logo após este PR
deployar) confirmar `/minha-conta` quebrado. Caso contrário, P2.

**Condição de promoção:** "Teste ao vivo de /minha-conta no app de produção falha"
→ sobe para P1 e vira PR próprio.

**Como reproduzir o problema** (esperado):
1. Login como `rabelli19@gmail.com` ou outro customer real.
2. Abrir `https://www.fragranciaria.com/minha-conta`.
3. Esperado: dashboard carrega. Provável hoje: erro genérico + log de import
   indefinido.

---

## B2 — PARCIAL — `src/integrations/supabase/types.ts` está stale

> **Estado em 2026-07-31:** o `types.ts` foi regenerado (existe modificação não
> commitada no working tree, gerada por `scripts/gen-supabase-types.mjs`). Mas as
> três referências citadas abaixo continuam **ausentes** do arquivo:
> `order_status_history`, `refund_requests`, `auth_user_id` — 0 ocorrências cada.
>
> Duas dessas ausências são **corretas**, não bug: `order_status_history` não
> existe em prod (confirmado, a tabela retorna erro), e `refund_requests` existe
> mas com 0 linhas. Ver C9 no backlog reconciliado. Antes de "corrigir o types",
> confirmar o que de fato existe no banco.

**Contexto:** o `Database` foi gerado pelo Supabase CLI, mas várias migrations
(admins, conversations, messages, refund_requests) **não estão refletidas** no
types. Sintomas que `tsc --noEmit` já denuncia no repo todo:

- `order_status_history` não existe no Database.
- `auth_user_id` em `customers`, `orders`, `refund_requests` não está.
- `refund_requests` table inteira ausente.
- Tabela `conversations` ok; `messages` (via webhook WhatsApp) pode estar parcial.

**Correção quando promover:**
```
supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts
```
E remover todos os `@ts-expect-error` / `as any` / `as never` que ficaram no projeto
espalhados por causa do stale.

**Prioridade:** P2 hoje (afeta DX e type-safety, não bloqueia runtime).
**Condição de promoção:** PR de B1 fechado, ou PR isolado dedicado.
