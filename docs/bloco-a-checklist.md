# Bloco A — Checklist de reescrita das 4 migrations

> **Status**: em construcao. Bloqueado ate chegada do `pg_dump --schema-only`
> do projeto de producao. Quando chegar: conferir INPUTS BLOQUEANTES, depois
> escrever os 4 SQLs definitivos.
>
> **Destinatario**: QA externo (revisao dos SQLs antes de aplicar) + Edu
> (aplica via Supabase SQL Editor, na ordem listada em PLANO DE APLICACAO).
>
> **Origem**: derivado da conversa de 08/07/2026 que detectou o checkout
> quebrado por divergencia codigo x schema (post-mortem registrado em
> `docs/post-mortem-checkout.md`, ver backlog). Regras de reescrita vieram
> do mesmo bate-papo.

---

## 0. Inputs bloqueantes (chegar antes de escrever)

Estes 4 itens NAO estao escritos aqui porque dependem exclusivamente do
banco real. Quando o `schema-baseline-20260708.sql` chegar:

- [ ] **I-1. Catalogo das 19 tabelas reais** — listar cada `CREATE TABLE`
      com suas colunas, tipos, defaults, constraints. Extrair do dump
      do projeto Supabase **correto** (`gzxlupgdmrtkprwhiutp`, nome
      "Fragranciaria" no topo do dashboard, regiao sa-east-1).
- [ ] **I-2. Colunas de telefone em `conversations`** — confirmar
      `customer_phone TEXT` (validado contra `20260628_whatsapp_conversations.sql`
      que esta integro no repo). Se for outro nome, ajustar `is_agent_enabled`.
- [ ] **I-3. `public.products` existe ou nao em producao?** — o `ALTER TABLE
      public.products` original da A2 (commit `e353d22`) presume que existe.
      Se NAO existir, reescrita vira `CREATE TABLE public.products (...)` com
      todas as colunas canonicas (incluindo `external_ids jsonb`,
      `tsvector 'portuguese'`, `*_pending_validation`). Se existir, manter
      ALTER com idempotencia (IF NOT EXISTS). Confirmado em 2026-07-08: o
      projeto correto e `gzxlupgdmrtkprwhiutp` (nao "vazio" — episodio
      registrado em `docs/assets-restore-20260707.md` §4 era engano
      operacional, query rodada em outro projeto).
- [ ] **I-4. Estado real de A1/A2/A3/A4 em producao** — confirmar via
      SQL Editor quais tabelas/colunas do Bloco A ja existem:
      - [ ] `agent_sessions`, `agent_events`, `agent_decisions`
      - [ ] Colunas canonicas de `products` (`external_ids`, `ml_id`,
            `price_pending_validation`, etc)
      - [ ] `agent_carts` (criada? ou ainda nao?)
      - [ ] `agent_policies` (criada? `conversations.ai_enabled` ja existe?)

> **Regra**: se A3 e A4 ainda nao foram aplicadas em prod, a reescrita vira
> a fonte da verdade e as versoes do `e353d22` sao substituidas.

---

## 1. Regras de reescrita (fechadas pelo Edu em 08/07/2026)

Estas 7 regras NAO podem ser violadas. Cada uma tem **onde aplicar** e
**como verificar** apos escrever o SQL.

### R1. `canonical_products` — CREATE TABLE completo (nao ALTER)

- **Onde**: `20260707_canonical_products.sql` (a "A2" do Bloco A).
- **O que muda**: se `public.products` nao existir em prod (ver I-3),
  reescrita vira `CREATE TABLE IF NOT EXISTS public.products (...)`
  com TODAS as colunas canonicas. Sem `ALTER TABLE` separado.
- **Colunas obrigatorias** (do briefing):
  - `external_ids JSONB NOT NULL DEFAULT '{}'` — IDs do ML, Shopify, etc
  - `tsvector 'portuguese'` indexado GIN (coluna `search_vector` gerada)
  - `price_pending_validation BOOLEAN NOT NULL DEFAULT true`
  - `stock_pending_validation BOOLEAN NOT NULL DEFAULT true`
- **Como verificar**:
  - [ ] Se A2 reescrita eh CREATE: dump de teste cria a tabela sem erros
  - [ ] `SELECT to_regclass('public.products');` retorna `public.products`
  - [ ] `external_ids` aceita jsonb vazio
  - [ ] `price_pending_validation` default `true`
  - [ ] `tsvector @@ to_tsquery('portuguese', 'wella')` retorna algo

### R2. Sem FK para `carts` — `carts` nao existe em prod

- **Onde**: TODAS as 4 migrations.
- **O que muda**: nenhum `REFERENCES carts(id)` em qualquer lugar. FKs
  possiveis: `agent_carts`, `orders`, `customers`, `auth.users`,
  `conversations`, `messages`. Apenas.
- **Tratamento do `cart_id` em `agent_sessions`**: nao foi localizado nos
  arquivos do `e353d22`. A confirmar com I-4 (estado real de A1).
  - Se existir coluna `cart_id` em `agent_sessions`: apontar para
    `agent_carts(id)` (nao `carts`).
  - Se nao existir: nada a fazer.
- **Como verificar**:
  - [ ] `grep -i "REFERENCES carts" supabase/migrations/20260707_*.sql`
        retorna ZERO matches
  - [ ] `grep -i "cart_id" supabase/migrations/20260707_agent_core.sql`
        confere com I-4

### R3. Dinheiro = `NUMERIC(10,2)` em reais (zero centavos)

- **Onde**: TODAS as 4 migrations.
- **Decisao**: producao ja usa `NUMERIC` em reais (`orders.total`, etc).
  Tabelas `agent_*` vao usar `NUMERIC(10,2)` tambem para **nunca** converter
  na fronteira com `orders`.
- **Proibido**: `*_cents BIGINT`, `MONEY`, `DOUBLE PRECISION`, `REAL`,
  `FLOAT`, `DECIMAL` (no Postgres, `DECIMAL` e sinonimo de `NUMERIC` —
  usar `NUMERIC` por consistencia com `orders`).
- **Onde aplicar explicitamente**:
  - `agent_carts.subtotal_amount`, `discount_amount`, `shipping_amount`,
    `total_amount` → todos `NUMERIC(10,2) NOT NULL DEFAULT 0`
  - `agent_policies.max_cart_amount_brl`, `max_discount_percent` (esse
    ultimo eh percentual, vai `NUMERIC(5,2)`)
- **Header obrigatorio** em cada migration:
  ```
  -- Money: NUMERIC(10,2) em REAIS. Conversao de/para centavos eh
  -- responsabilidade da Borda (agent-service). Schema nunca guarda centavos.
  ```
- **Como verificar**:
  - [ ] `grep -iE "MONEY|DOUBLE PRECISION|REAL|FLOAT|_cents" supabase/migrations/20260707_*.sql`
        retorna ZERO matches (exceto em comentarios)
  - [ ] Header em todos os 4 arquivos
  - [ ] `NUMERIC(10,2)` aparece em todas as colunas monetarias agent_*

### R4. FKs revalidadas contra as 19 tabelas reais

- **Onde**: TODAS as 4 migrations.
- **Acao**: apos dump chegar (I-1), preencher a tabela abaixo com as FKs
  finais. Antes de commitar os 4 SQLs, o QA externo deve validar:

  | Migration | Coluna | FK destino | ON DELETE | Status |
  |---|---|---|---|---|
  | agent_core | `agent_sessions.conversation_id` | `public.conversations(id)` | CASCADE | OK |
  | agent_core | `agent_sessions.last_processed_message_id` | `public.messages(id)` | SET NULL | OK |
  | agent_core | `agent_events.agent_session_id` | `public.agent_sessions(id)` | CASCADE | OK |
  | agent_core | `agent_events.conversation_id` | `public.conversations(id)` | CASCADE | OK |
  | agent_core | `agent_decisions.agent_session_id` | `public.agent_sessions(id)` | CASCADE | OK |
  | agent_core | `agent_decisions.conversation_id` | `public.conversations(id)` | CASCADE | OK |
  | agent_core | `agent_decisions.order_id` | `public.orders(id)` | (padrao: NO ACTION) | OK |
  | agent_core | `agent_decisions.agent_cart_id` | `public.agent_carts(id)` | (a confirmar com I-4) | PENDENTE |
  | canonical_products | (nenhuma FK direta esperada) | — | — | — |
  | agent_carts | `agent_carts.conversation_id` | `public.conversations(id)` | CASCADE | OK |
  | agent_carts | `agent_carts.agent_session_id` | `public.agent_sessions(id)` | SET NULL | OK |
  | agent_carts | `agent_carts.converted_order_id` | `public.orders(id)` | SET NULL | OK |
  | agent_policies | (nenhuma FK — `target_phone` eh TEXT) | — | — | — |

- **Atencao ORDEM DE APLICACAO**: `agent_core` cria `agent_sessions` (sem
  dependencia de `agent_carts`). `agent_carts` referencia `agent_sessions`.
  Aplicar `agent_core` ANTES de `agent_carts`. Ver secao PLANO DE APLICACAO.
- **Como verificar**:
  - [ ] Tabela acima totalmente preenchida (sem PENDENTE)
  - [ ] Ordem de CREATE nao viola dependencias (ver secao 3)

### R5. Realtime — `agent_sessions` + `agent_events` na publication (idempotente)

- **Onde**: `20260707_agent_core.sql` (declaracao unica, nao duplicar nos
  outros arquivos).
- **Snippet canonico** (ja existe no arquivo `e353d22`, manter com
  `EXCEPTION WHEN duplicate_object`):
  ```sql
  DO $$
  BEGIN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_sessions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_events;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END
  $$;
  ```
- **Tambem**: `agent_decisions`, `agent_carts`, `agent_policies` em suas
  respectivas migrations, mesmo padrao.
- **Como verificar**:
  - [ ] `SELECT tablename FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename LIKE 'agent_%';`
        lista todas as 5 tabelas agent_*
  - [ ] Rodar a migration 2x seguidas (idempotencia): zero erros

### R6. `conversations` — schema real verificado

- **Origem da duvida**: comentario em `20260707_agent_policies.sql`
  sugeria que `20260628_whatsapp_conversations.sql` tinha "NULL bytes no
  começo e esta truncada". Isso esta **ERRADO** — o arquivo esta integro.
- **Validado manualmente** (08/07/2026, antes do dump):
  - Coluna de telefone = `customer_phone TEXT` (linha 20)
  - Canal = `TEXT CHECK (channel IN ('whatsapp', 'instagram', 'email'))`
  - Status = `TEXT CHECK (status IN ('open', 'pending', 'resolved'))`
- **A confirmar com dump (I-2)**:
  - [ ] Nenhuma coluna adicional em `conversations` quebra a funcao
        `is_agent_enabled(p_phone TEXT)` (que faz `WHERE customer_phone = p_phone`)
  - [ ] Se houver coluna `ai_enabled` ja criada (em prod, manual),
        `ALTER TABLE ... ADD COLUMN ai_enabled` deve ser idempotente
        (IF NOT EXISTS via DO block, igual ja esta no arquivo)
- **Como verificar**:
  - [ ] `SELECT * FROM public.is_agent_enabled('5511999999999');` nao quebra
  - [ ] `ALTER TABLE conversations ADD COLUMN ai_enabled BOOLEAN DEFAULT true`
        eh idempotente (rodar 2x)

### R7. RLS + GRANTs verificados independentemente

- **Onde**: TODAS as 4 migrations, TODAS as tabelas agent_*.
- **Padrao obrigatorio**:
  1. `GRANT ALL ON public.<tabela> TO service_role;`
  2. `ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;`
  3. **DUAS camadas** verificadas independentemente:
     - **Camada 1 (RLS)**: tabela com `ENABLE ROW LEVEL SECURITY`, mas sem
       policies publicas (acesso so via service_role que bypassa RLS).
     - **Camada 2 (GRANTs)**: `service_role` com `ALL`. `anon` e
       `authenticated` SEM grant (revogar explicitamente se necessario).
- **Excecao documentada**: `agent_policies` ja tem policy publica
  `agent_policies_service_all` (no `e353d22`). Manter? Decidir:
  - Manter: admin le policies via client normal (sem service_role)
  - Remover: admin le via service_role sempre (padrao do resto)
  - **Decisao pendente para o QA** (provavelmente MANTER, ja que policies
    sao publicas por design — admin UI pode ler direto)
- **Como verificar**:
  - [ ] `SELECT grantee, privilege_type FROM information_schema.role_table_grants
        WHERE table_schema='public' AND table_name LIKE 'agent_%';`
        lista apenas `service_role` (exceto `agent_policies` se decidido manter)
  - [ ] `SELECT relname, relrowsecurity, relforcerowsecurity
        FROM pg_class WHERE relname LIKE 'agent_%' AND relkind='r';`
        todos com `rowsecurity = true`

---

## 2. Estrutura esperada dos 4 SQLs (apos dump)

Cada arquivo comecarah com:
- Cabecalho com (a) nome do bloco, (b) lista do que muda vs `e353d22`,
  (c) motivo de cada mudanca, (d) referencias cruzadas (R1..R7 deste doc).

### 2.1 `20260707_agent_core.sql`

Conteudo esperado (a confirmar com I-4):
- `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
- `agent_sessions` (com FKs revalidadas em R4)
- `agent_events` (com FKs revalidadas em R4)
- `agent_decisions` (com FKs revalidadas em R4)
- `agent_tool_calls` (citado no briefing mas nao vi CREATE no `e353d22`
  — provavelmente era `agent_events` renomeado. A confirmar.)
- Indices
- `GRANT ALL ... TO service_role`
- `ENABLE ROW LEVEL SECURITY` em todas
- Realtime publication (R5) para `agent_sessions`, `agent_events`,
  `agent_decisions`
- View `v_agent_sessions_active`
- Comentarios

### 2.2 `20260707_canonical_products.sql`

Caminho A (se `public.products` NAO existe — I-3 = NO):
- `CREATE TABLE IF NOT EXISTS public.products (...)` com TODAS as
  colunas canonicas + `external_ids` + `tsvector` + `*_pending_validation`
- Indices GIN para `search_vector`, `name` (trgm)
- View `v_products_for_agent`
- Function `search_products_pt`

Caminho B (se `public.products` existe — I-3 = YES):
- `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ...` (manter
  logica do `e353d22`)
- `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS search_vector tsvector ...`
- Indices idempotentes

### 2.3 `20260707_agent_carts.sql`

Conteudo esperado:
- `agent_carts` (sem FK para `carts`, apenas para `conversations`,
  `agent_sessions`, `orders`)
- `NUMERIC(10,2)` em todas as colunas monetarias (R3)
- Indices
- Trigger `updated_at` (helper `set_updated_at()` ja criado em
  `20260628_whatsapp_conversations.sql` ou em A4 — idempotente)
- View `v_agent_carts_active`
- Realtime publication (R5) para `agent_carts`
- Comentarios

### 2.4 `20260707_agent_policies.sql`

Conteudo esperado:
- Helper `set_updated_at()` idempotente (ja criado em
  `20260628_whatsapp_conversations.sql` — `CREATE OR REPLACE` nao serve,
  usar `DO $$ IF NOT EXISTS ... CREATE FUNCTION ...`)
- `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_enabled ...`
  (R6)
- `agent_policies` com `NUMERIC(5,2)` em `max_discount_percent`,
  `NUMERIC(10,2)` em `max_cart_amount_brl` (R3)
- Seed: `INSERT INTO agent_policies (channel, scope, ai_disabled)
  VALUES ('whatsapp','global',false) ON CONFLICT DO NOTHING`
- Function `is_agent_enabled(p_phone TEXT)` usando `customer_phone`
  (R6)
- Realtime publication (R5) para `agent_policies`

---

## 3. Plano de aplicacao (ordem)

1. **C0**: `supabase/schema-baseline-20260708.sql` (Commit 3, **NAO EXECUTAR**)
2. **A1**: `20260707_agent_core.sql`
3. **A2**: `20260707_canonical_products.sql` (depende de I-3)
4. **A3**: `20260707_agent_carts.sql` (depende de A1 — FK para `agent_sessions`)
5. **A4**: `20260707_agent_policies.sql` (depende de nada — auto-suficiente)

**A1 antes de A3** porque `agent_carts.agent_session_id` referencia
`agent_sessions(id)`. **A2** eh independente das agent_* mas precisa vir
depois de A1 no fs (ordenacao alfabetica).

---

## 4. Plano de commit (3 commits)

| # | Mensagem | Arquivos |
|---|---|---|
| 1 | `chore(repo): .gitattributes + doc de restauracao 2026-07-07` | ja commitado em `fbfcbf0` |
| 2 | `feat(agent): Bloco A — migrations + docs + scripts` | ja commitado em `e353d22` (sera substituida) |
| 3 | `chore(db): schema baseline 2026-07-08 (pg_dump --schema-only)` | `supabase/schema-baseline-20260708.sql` (quando dump chegar) |
| 4 | `feat(agent): Bloco A reescrito contra schema-baseline-20260708` | 4 migrations substituidas + este checklist atualizado |

> **Regra**: Commit 3 vem **ANTES** dos 4 SQLs definitivos, porque sem a
> baseline nao tem como validar FKs.

---

## 5. Criterios de aceite do QA externo

Antes de o Edu aplicar qualquer das 4 migrations, o QA externo deve
conferir:

- [ ] Todos os 4 SQLs compativeis com o `schema-baseline-20260708.sql`
- [ ] R1..R7 todas verificadas (cada item da secao 1 marcado)
- [ ] Tabela de FKs (R4) totalmente preenchida, sem PENDENTE
- [ ] Cabecalho de cada SQL explica o que mudou vs `e353d22` e por que
- [ ] Ordem de aplicacao (secao 3) respeitada
- [ ] Dinheiro: zero mencoes a centavos, MONEY, FLOAT, etc (R3)
- [ ] Realtime idempotente: rodar 2x seguidas, zero erros (R5)
- [ ] `is_agent_enabled('5511999999999')` nao quebra (R6)
- [ ] Nenhum `REFERENCES carts` em lugar nenhum (R2)

---

## 6. Pos-dump: o que preencher antes de escrever os 4 SQLs

Quando o dump chegar, antes de gerar os 4 SQLs:

1. Preencher I-1 (catalogo das 19 tabelas) — extrair do dump
2. Validar I-2 (`conversations.customer_phone` bate?)
3. Decidir I-3 (`products` existe? YES → ALTER, NO → CREATE TABLE)
4. Preencher I-4 (estado real de A1/A2/A3/A4 em prod via SQL Editor)
5. Atualizar tabela de FKs (R4) com nomes reais
6. Decidir excecao de `agent_policies` (R7)
7. Confirmar se `agent_tool_calls` eh tabela separada ou era
   `agent_events` renomeado (citado no briefing mas nao vi CREATE)

Apos isso, gerar os 4 SQLs definitivos.