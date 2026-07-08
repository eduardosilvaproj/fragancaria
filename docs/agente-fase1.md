# Agente de vendas WhatsApp — Fase 1

> **Status**: Bloco A aplicado em prod. Bloco B (agent-service) proximo.
> Toda decisao abaixo de "DECISOES FECHADAS" esta travada e NAO deve ser
> reaberta sem nova rodada explicita.

## Visao geral

Bot de autoatendimento WhatsApp que recebe mensagens, classifica intencao,
consulta catalogo via tool, monta carrinho, e sobe para o checkout humano
quando o cliente pede para fechar.

**Stack (MVP — travada, ver DECISOES FECHADAS)**

- **LLM**: Claude Sonnet 4.6 via Anthropic API, **com prompt caching** no
  system prompt + tools. Sem classificador secundario separado (Claude
  decide intencao + resposta).
- **Embeddings/RAG**: Cohere embed-v3 (a confirmar) ou OpenAI
  text-embedding-3-small — ver Bloco C.
- **Memoria**: Postgres (Supabase) — tabelas `agent_*`. Fase 1 = so
  contexto da sessao (curto prazo).
- **Filas**: nenhuma no MVP (processamento sincrono no webhook + debounce).

## Schema de dados (Bloco A)

| Tabela | Proposito | Migration |
|---|---|---|
| `agent_sessions` | Conversa ativa (1 por cliente) | `20260707_agent_core.sql` |
| `agent_events` | Log de tudo que o agente fez/falou | `20260707_agent_core.sql` |
| `agent_decisions` | Decisoes estruturadas (tool call, handoff, abort) | `20260707_agent_core.sql` |
| `agent_carts` | Carrinho construido pelo agente | `20260707_agent_carts.sql` |
| `products` (canonical) | Catalogo autoritativo (do ML) | `20260707_canonical_products.sql` |
| `agent_policies` | Kill switch + tokens por canal | `20260707_agent_policies.sql` |
| `conversations.ai_enabled` | Kill switch por conversa | `20260707_agent_policies.sql` |

## Tools que o agente tera (Bloco B)

| Tool | Input | Output |
|---|---|---|
| `search_products` | query, max_n | lista de produtos (id, nome, preco) |
| `get_product` | product_id | detalhes (descricao, imagens, estoque) |
| `add_to_cart` | session_id, product_id, qty | cart_id, total |
| `remove_from_cart` | session_id, product_id | cart atualizado |
| `get_cart` | session_id | cart com total |
| `apply_discount` | session_id, code | cart com desconto |
| `escalate_to_human` | session_id, reason | ticket aberto |
| `check_delivery` | cep | prazo + valor |

## Fluxo (alto nivel)

```
WhatsApp webhook
  ↓
debounce deslizante (4s, teto 12s, buffer em agent_sessions)
  ↓
is_agent_enabled(phone)?  ← kill switch
  ↓ sim
carregar contexto da sessao + historico curto
  ↓
Claude Sonnet 4.6 (system prompt cached, tools cached)
  ↓
  ├─ saudacao     → cumprimentar, perguntar o que precisa
  ├─ produto      → search_products, apresentar opcoes
  ├─ carrinho     → add_to_cart, get_cart
  ├─ fechar       → escalate_to_human (motivo: checkout)
  ├─ reclamacao   → escalate_to_human (urgente, escalacao humana)
  └─ outro        → resposta generica + oferecimento
  ↓
agent_decisions: INSERT (tool_calls, tokens, latency)
agent_events: INSERT (mensagem enviada)
  ↓
WhatsApp send
```

> Idempotencia de webhook duplicado: chave `messages.id` do Meta em
> `agent_events` com UNIQUE + ON CONFLICT DO NOTHING. Debounce usa
> `FOR UPDATE SKIP LOCKED` na sessao para evitar processar 2x.

## Handoff humano

Quando o agente nao sabe responder, ou cliente pede humano, ou hit em
`escalation_keywords`, o agente:

1. Cria/atualiza `agent_sessions` com `state = 'awaiting_human'`.
2. Dispara webhook para o painel `/admin/sac` (refresh da fila).
3. Humano assume. Quando humano responde, sessao volta a
   `state = 'human_handling'`. Se humano ficar inativo 30min,
   agente retoma (`state = 'agent_active'`).

## Kill switch (3 camadas)

1. `conversations.ai_enabled = false` → pausa 1 conversa
2. `agent_policies (scope='phone', ai_disabled=true)` → pausa 1 numero
3. `agent_policies (scope='global', ai_disabled=true)` → pausa canal inteiro

Admin aciona via SQL ou painel (a fazer). Funcao helper:
`SELECT * FROM public.is_agent_enabled('5511999999999');`

## Custo estimado (MVP)

Por 1000 conversas (~5 mensagens cada):

- Claude Sonnet 4.6 (com cache): ~R$ 6 (cache reduz 80% input)
- Embeddings RAG sob demanda: ~R$ 9
- WhatsApp Cloud API (utilities): ~R$ 0 (tier gratis ate 1000/ms)

**Total: ~R$ 15 / 1000 conversas**

## Roadmap (ordem travada)

| Bloco | Escopo | Esforco | Status |
|---|---|---|---|
| A | Migrations (agent_*, products canonical, policies) | 1 dia | aplicado em prod |
| B | agent-service (Node + Fastify, deploy Railway service separado) | 2 dias | proximo |
| D | UI /admin/atendimento-ia (painel de auditoria via Supabase Realtime) | 1 dia | apos B |
| C | Tools + RAG (busca, embeddings, estoque) | 1 dia | apos D |
| E | Testes E2E + homologacao Meta + go-live | 1 dia | ultimo |

**Total: ~6 dias uteis.**

**Regra de ordem A → B → D → C**: A (dados) vem primeiro, B (servico)
segundo, D (UI do admin) antes de C (porque sem UI nao da pra auditar
o agente durante o desenvolvimento de C), E por ultimo.

## Pendencias conhecidas

- [ ] **Regiao Supabase** nao documentada — afeta decisao D2 (regiao
      do agent-service). Ver DECISOES FECHADAS.
- [ ] **`\df public.set_updated_at`** precisa ser confirmado no
      SQL Editor do Supabase antes de aplicar
      `20260707_agent_policies.sql`. Migration tem `IF NOT EXISTS`
      para nao quebrar.
- [ ] **`\d public.conversations`** coluna de telefone precisa ser
      confirmada (a funcao `is_agent_enabled` assume `customer_phone`).
- [ ] **Painel /admin/atendimento-ia** ainda e mock (ver
      `src/routes/admin/atendimento-ia.tsx`).
- [ ] **CHATWOOT_API_TOKEN / CHATWOOT_WEBHOOK_HMAC** reservados no
      plano de secrets mas sem codigo referencia no repo. Verificar
      no Bloco B se ainda fazem sentido (decisao tomada?).

---

## DECISOES FECHADAS — NAO REABRIR

Tudo abaixo foi decidido pelo Edu e esta travado. Reabrir exige rodada
explicita, nao "porque eu acho melhor".

### Bloco A (dados)

- **(a) Regiao Supabase**: NAO CONFIRMADO. Determina regiao do
  agent-service (ver D2). A investigar.
- **(b) Realtime — corrigido**: publicacao `supabase_realtime` existe
  por default em todo projeto Supabase, MAS isso NAO significa que as
  tabelas estao nela. Eh necessario adicionar `agent_sessions`,
  `agent_events` (e futuramente `agent_decisions`, `agent_carts`) na
  publication via migration + teste manual de INSERT + observacao
  no painel `/admin`. Ver D3 abaixo.
- **(c) Matriz de secrets**: fronteira storefront × agent-service
  documentada em `CLAUDE.md`. Conjuntos disjuntos. Ver D4.
- **(d) `set_updated_at()` helper**: migration A4 tem `IF NOT EXISTS`
  para ser idempotente se ja existir. NAO assumir existencia sem
  rodar `\df public.set_updated_at` antes.
- **(e) Workflow de migrations (REGRA PERMANENTE)**: migrations sao
  escritas pelo Code, commitadas no repo, aplicadas pelo Edu apos
  revisao. Mesmo as aplicadas manualmente via SQL Editor sao
  commitadas no repo. Nao commitar migrations = quebrar auditoria.
- **(f) Coluna de telefone em `conversations`**: a confirmar com
  `SELECT column_name FROM information_schema.columns WHERE
  table_name = 'conversations';`. Funcao `is_agent_enabled`
  assume `customer_phone` — ajustar se for outro nome.

### Bloco B (servico)

- **D1. Estrutura**: monorepo, subdiretorio `agent-service/` na raiz
  do projeto. Railway service **separado** apontando para esse
  subdiretorio. Nao deploya junto com a storefront.
- **D2. Regiao do agent-service**: depende do item (a) acima.
  - Se Supabase em `sa-east-1`: avaliar Fly.io GRU (Sao Paulo).
  - Se Supabase em `us-east-*`: Railway US East.
  - Regiao NAO PODE ser diferente do banco (latencia + egress).
- **D3. War Room (UI de auditoria em tempo real)**: usa Supabase
  Realtime direto, mesmo padrao de `admin/pedidos.tsx`. Tabelas
  `agent_sessions` e `agent_events` adicionadas a publication
  `supabase_realtime` via migration, COM teste manual de INSERT
  depois. Nao confiar so na publicacao existir por default.
- **D4. Secrets do agent-service**: SOMENTE 4 secrets. Conjuntos
  disjuntos com storefront.
  - `ANTHROPIC_API_KEY` (Claude)
  - `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS pra inserir agent_*)
  - `CHATWOOT_API_TOKEN` (se Chatwoot for usado)
  - `CHATWOOT_WEBHOOK_HMAC` (se Chatwoot for usado)
  - Storefront: SOMENTE anon key + RLS. Nenhuma das 4 acima.

### Politica tiktok_shop (referencia futura)

Quando o canal `tiktok_shop` for implementado (alem de whatsapp,
instagram, site_chat), as tools tem politica:

- **LIBERADAS**: `recomendar_perfume`, `calcular_frete`
- **BLOQUEADAS**: `gerar_link_pagamento`, qualquer tool que gere
  link outbound (anti-spam / anti-phishing)

### Performance / debounce (referencia para Bloco B)

- **Debounce deslizante**: 4s. Cliente mandou msg, espera 4s por
  mais. Se chegou outra, reseta timer. Teto de 12s (se o cliente
  ficar mandando por 12s sem parar, dispara o agente).
- **Locking**: `SELECT ... FOR UPDATE SKIP LOCKED` na sessao para
  garantir que 2 webhooks simultaneos nao processem 2x.
- **Buffer**: campo `agent_sessions.pending_buffer` (jsonb) acumula
  mensagens ate o debounce disparar.

### Schema canonico

- **Products do Supabase** (`public.products`) e a UNICA fonte
  autoritativa para o agente.
- `src/data/products.ts` e **legado** em cutover. Nao e fonte
  para o agente; e apenas para o storefront ate cutover.
- Cutover = quando storefront passar a ler de `public.products`
  via SSR. Data alvo: apos Bloco D.

### Carrinho

- `agent_carts.converted_order_id` deve ser preenchido em **todo
  pedido gerado** a partir do carrinho. Nunca NULL depois do
  fechamento. Migration ou constraint NOT NULL pode ser adicionado
  depois — por enquanto, convencao.

### Criterios de aceite 11-14 (E2E / homologacao)

- **[11] Debounce**: cliente manda 4 msgs picadas em 6s → agente
  gera **1 resposta** (nao 4).
- **[12] Idempotencia de webhook duplicado**: Meta reenvia mesma
  mensagem por retry → 1 mensagem processada (chave
  `messages.id` do Meta em `agent_events` UNIQUE).
- **[13] Kill switch por conversa**: admin pausa
  `conversations.ai_enabled=false` → proxima msg do cliente vai
  direto para fila humana, agente nao responde.
- **[14] Fluxo completo de `escalate_to_human`**: cliente pede
  humano OU hit em `escalation_keywords` OU `max_cart_amount_brl`
  excedido → sessao vira `state='awaiting_human'` e aparece no
  `/admin/sac` para um humano assumir.

---

## Proximos passos (autorizados pelo Edu)

1. Confirmar `(a)` regiao Supabase e `(f)` coluna de telefone.
2. Aplicar `20260707_agent_policies.sql` no SQL Editor do Supabase
   (somente apos confirmar `set_updated_at` e coluna de telefone).
3. Iniciar Bloco B: scaffold de `agent-service/` (Node + Fastify,
   1 endpoint `/agent/message`, prompt caching desde o comeco).