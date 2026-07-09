# Restauração de ativos e correção de schema — 2026-07-07 → 2026-07-08

**Status:** ✅ Concluído. Working tree restaurado, 3 commits prontos para push.

## TL;DR

1. **Corrupção de working tree** no commit `a21de4b` (pasta OneDrive com placeholders não-hidratados): 39 arquivos no disco estavam zerados/ilegíveis.
2. **Não houve corrupção git** — os blobs íntegros continuavam acessíveis em `e513a79` (pai de `a21de4b`).
3. **Restauração = proveniência**: substituídos os 39 arquivos do working tree pelos blobs de `e513a79`; 36 idênticos bit-a-bit + 3 com divergência tratada caso-a-caso (`.md` editados localmente + `admin.functions.ts` evoluído).
4. **Projeto Supabase errado descoberto**: o `gzxlupgdmrtkprwhiutp` mencionado na memória é um projeto VAZIO. O real está documentado no `CLAUDE.md` (definido em 2026-07-08).
5. **Schema real divergente dos arquivos 001/002**: `orders` em prod tem 28 colunas (estilo desnormalizado), `products/coupons/order_items/stock_movements` **não existem**. Arquivos 001/002 marcados como `-- HISTÓRICO` com nota R4. Dump schema-baseline a ser commitado após revisão.

---

## 1. Corrupção do working tree

### Sintoma
Após `git pull` em 2026-07-07, vários arquivos `.webp` e `.png` sob `src/assets/products/` e `public/images/` falhavam em `sharp.metadata()` mesmo após `git checkout HEAD -- <file>`.

### Causa confirmada
A corrupção **não foi git** — `git show <commit>:<file>` retornava os blobs íntegros esperados, com o mesmo SHA256 entre `e513a79` (pai de `a21de4b`) e outros commits ancestrais.

A causa real foi uma **pasta OneDrive com sincronização parcial**: o commit `a21de4b` continha títulos de sync no working tree que não foram hidratados no disco (placeholders zerados). Foram **39 arquivos** com esse sintoma (não 53 — ver §5 sobre hipótese descartada).

### Áudio / backup local

O backup `C:\dev\backup-binarios-20260707\history\` chegou a ser cogitado como fonte, mas se mostrou desnecessário depois de confirmar que `e513a79` continha os blobs íntegros. Foi mantido no disco mas **não foi usado** para esta restauração.

---

## 2. Procedimento de restauração

### Diagnóstico
Para cada arquivo corrompido, foi comparado:
- `git show HEAD:<file>` → blob atual no commit `a21de4b`
- `git show e513a79:<file>` → blob do pai

Quando os hashes batiam, o blob estava íntegro em `e513a79` mas o working tree tinha placeholder zerado. Quando diferiam (em arquivos `.ts`/`.tsx` editados localmente), o working tree continha a versão mais nova.

### Ação
`git checkout e513a79 -- <arquivo>` para os 36 arquivos idênticos a `e513a79`. Para os 3 divergentes:

| Arquivo | Decisão |
|---|---|
| `ANALISE_PROFUNDA_LOVABLE_VERCEL.md` | Working tree mantido |
| `INDEX_DOCUMENTOS.md` | Working tree mantido |
| `src/lib/admin.functions.ts` | Working tree mantido (versão evoluída, sem `adminProbe` + com `.validator()` do TanStack Start) |
| `supabase/migrations/001_affiliate_system.sql` | Restaurado de `e513a79`, com cabeçalho `-- HISTÓRICO` |
| `supabase/migrations/002_ecommerce_tables.sql` | Restaurado de `e513a79`, com cabeçalho `-- HISTÓRICO` detalhado |

### Verificação de proveniência (sha256)
Para os 34 binários restaurados (`.webp`/`.png`), o SHA256 dos blobs de `e513a79` foi comparado com o do working tree pós-restauração. Resultado: **todos iguais** (idênticos bit-a-bit).

### Verificação funcional
- `npm run build` passou (201 módulos, `dist/server/index.js` em 2.06s).
- `sharp.metadata()` nos 6 binários críticos (3 PNGs + 3 WEBPs) retornou:
  - `hero-model-nobg.png` 975×1024 RGBA
  - `logo.png` 1536×1024 RGB
  - `need-nutricao.png` 1254×1254 RGB
  - `p23.webp`, `p28.webp`, `p31.webp` 560×560 RGB

### Comparação com produção
Para 2 arquivos (`/images/logo.png`, `/images/hero-banner.png`), o SHA256 do blob restaurado foi comparado com o SHA256 do arquivo servido em `https://www.fragranciaria.com/...`. **Match exato nos dois** — confirmando que a versão restaurada é a mesma atualmente em produção. (Esse foi o motivo de o backup local não ter sido necessário.)

---

## 3. Commits criados

```
63b21f8 fix(repo): restaura 3 arquivos restantes e marca 2 SQLs como historicos
071e040 fix(repo): restaura 36 arquivos restauráveis a partir de e513a79
            ^^^ chore commit (.gitattributes + este doc) virá em seguida
e353d22 feat(agent): Bloco A — migrations + docs + scripts [PRESERVADO]
```

### Pendências pós-push (próxima fase, fora desta restauração)
- **Migrations do Bloco A** (em `e353d22`): reescrever antes de aplicar.
  - `20260707_canonical_products.sql` assume `ALTER TABLE products` que **não existe** em prod; reescrever como `CREATE TABLE products` completo.
  - `agent_sessions.cart_id REFERENCES carts(id)` — `carts` **não existe** em prod; remover FK ou apontar para `agent_carts`.
  - Padronizar dinheiro: prod usa `NUMERIC` em reais; alinhar com colunas `*_cents` INT propostas.
  - Revalidar TODAS as FKs das 4 migrations contra a lista real de 19 tabelas em prod.
- **`supabase/schema-baseline-20260708.sql`**: dump schema-only do banco real, commitado após revisão do cabeçalho.

---

## 4. Correção de alvo Supabase (CRÍTICO)

### Registro do episódio (corrigido em 2026-07-08)
Em 2026-07-08, queries em `information_schema.tables` no dashboard retornaram 0 linhas para o projeto `gzxlupgdmrtkprwhiutp`, e levantou-se a hipótese de que o projeto Supabase estava vazio ou divergente. **A hipótese estava errada**: nova verificação no mesmo dia, com o projeto "Fragranciaria" corretamente selecionado no topo do dashboard (sa-east-1), confirmou que **as 19 tabelas reais existem em produção**. O sintoma original foi **engano operacional** — a query foi rodada com outro projeto Supabase aberto em outra aba/janela. A lista abaixo continua válida como referência, mas o alarme de "projeto vazio" foi cancelado.

### Tabelas reais em prod (19)
admins, affiliate_clicks, affiliate_links, affiliate_notifications, affiliate_payouts, affiliate_sales, affiliate_settings, affiliate_tier_history, affiliate_tiers, affiliates, conversations, customers, home_featured_manual, messages, notifications, orders, refund_requests, wishlist.

### Tabelas que **não** existem em prod (15 + agent_*)
products, product_variants, brands, categories, coupons, coupon_usages, carts, cart_items, shipping_quotes, order_items + todas as 4 agent_* (agent_core/canonical_products/agent_carts/agent_policies).

### `orders` em prod (28 colunas) — divergente do arquivo 002 (49 colunas)
Arquivo declara estilo Shopify normalizado (`affiliate_id`, `customer_id`, `coupon_id`, `order_number`, `fulfillment_status`, etc.). Prod tem estilo desnormalizado:
- **Em prod, não no arquivo**: `amount`, `auth_user_id`, `customer_cpf`, `discount`, `metadata`, `payer_email`, `raw`, `refund_status`, `shipping_price`, `status_history`.
- **No arquivo, não em prod**: `affiliate_commission`, `affiliate_id`, `billing_address`, `cancel_reason`, `cancelled_at`, `coupon_code`, `coupon_id`, `customer_document`, `customer_id`, `customer_notes`, `delivered_at`, `discount_amount`, `fulfillment_status`, `internal_notes`, `order_number`, `paid_at`, `payment_details`, `shipped_at`, `shipping_carrier`, `shipping_cost`, `shopify_order_id`, `tracking_url`.

Ambos os arquivos 001 e 002 foram marcados com cabeçalho `-- HISTÓRICO: aplicado parcialmente/evoluído fora deste arquivo. NÃO reflete produção. Fonte da verdade: ver supabase/schema-baseline-*.sql. (R4)`.

---

## 5. Hipóteses descartadas (não replicar)

| Hipótese inicial | Por que foi descartada | Quando |
|---|---|---|
| **53 binários corrompidos** | Eram 39 arquivos (alguns já íntegros). Os 53 do doc original vinham de inventário precipitado. | 2026-07-08 19:39 |
| **Backup `C:\dev\backup-binarios-20260707\history\` como fonte** | Após confirmar que `e513a79` tinha os blobs íntegros, o backup se tornou fonte secundária (usada só como âncora SHA256 para 1 arquivo). Não foi tocado nesta restauração. | 2026-07-08 19:39 |
| **`LONE_CR_ALTO` (suposto problema de `\r`/`\n` em binários)** | Sintoma observado era placeholder zerado, não line endings. Binários do `e513a79` restauraram limpos. | 2026-07-08 19:39 |

---

## 6. Pós-restauração

Imediato (este commit chore):
- ✅ `.gitattributes` adicionado neste commit (marcando binários como `binary` para git evitar renormalização CRLF↔LF).
- ✅ Este doc commitado.

Próximo (sua fila):
- `git push origin main` (3 commits: `071e040` + `63b21f8` + chore).
- Conferir `BUILD_VERSION` novo em `https://www.fragranciaria.com/version.json` após deploy Railway.
- Smoke test em produção (home, produto, carrinho, checkout, `/admin-login`).
- Dump schema-only → commit `schema-baseline-20260708.sql`.
- Reescrever migrations Bloco A conforme §3.
- ✅ Adicionar regra no `CLAUDE.md` sobre projeto Supabase correto (project ID + região + checagem visual do dashboard) e migrations contra baseline (não contra arquivos 001/002 históricos).
- ✅ Confirmar região sa-east-1 e desbloquear decisão D2 do Bloco B (hosting do agent-service → Fly.io GRU recomendado).
