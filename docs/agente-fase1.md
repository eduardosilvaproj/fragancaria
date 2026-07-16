# Agente de vendas WhatsApp — Fase 1

> **Status**: Bloco A aplicado em prod. Bloco B (agent-service) proximo.
> Toda decisao abaixo de "DECISOES FECHADAS" esta travada e NAO deve ser
> reaberta sem nova rodada explicita.

> **PROVEDOR WHATSAPP (2026-07-16, decisao do Edu)**: o canal deixou de
> usar a WhatsApp Cloud API oficial da Meta e passou a usar a **Z-API**
> (SaaS sobre protocolo WhatsApp Web). Motivo: cadastro na Meta travado
> no Business Manager; teste com WAHA cru baniu o numero. A Z-API tem
> sessao gerenciada e reduz (nao elimina) o risco de ban. Impacto no
> codigo: `whatsapp-webhook.ts` (parser do payload Z-API + segredo na
> query string, pois a Z-API nao assina webhook) e `whatsapp.functions.ts`
> (envio via endpoint send-text). Schema, SAC e tabelas `agent_*`
> inalterados. Secrets: `ZAPI_INSTANCE_ID`, `ZAPI_INSTANCE_TOKEN`,
> `ZAPI_CLIENT_TOKEN` (opcional), `ZAPI_WEBHOOK_SECRET`. As vars
> `WHATSAPP_*` da Meta viraram legado.

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

> Idempotencia de webhook duplicado: `messages.wa_message_id` recebe o
> `messageId` da Z-API e tem UNIQUE. O agent-service deve usar essa mensagem
> persistida como chave de deduplicacao. Debounce usa `FOR UPDATE SKIP LOCKED`
> na sessao para evitar processar 2x.

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
- Z-API: custo recorrente por instancia (fora do calculo acima; depende do plano contratado)

**Total: ~R$ 15 / 1000 conversas + custo fixo da Z-API**

## Roadmap (ordem travada)

| Bloco | Escopo | Esforco | Status |
|---|---|---|---|
| A | Migrations (agent_*, products canonical, policies) | 1 dia | aplicado em prod |
| B | agent-service (Node + Fastify, deploy Railway service separado) | 2 dias | proximo |
| D | UI /admin/atendimento-ia (painel de auditoria via Supabase Realtime) | 1 dia | apos B |
| C | Tools + RAG (busca, embeddings, estoque) | 1 dia | apos D |
| E | Testes E2E + homologacao Z-API + go-live | 1 dia | ultimo |

**Total: ~6 dias uteis.**

**Regra de ordem A → B → D → C**: A (dados) vem primeiro, B (servico)
segundo, D (UI do admin) antes de C (porque sem UI nao da pra auditar
o agente durante o desenvolvimento de C), E por ultimo.

## Pendencias conhecidas

- [x] **Regiao Supabase CONFIRMADA em 2026-07-08: sa-east-1 (Sao Paulo)**.
      D2 do Bloco B desbloqueada: hosting do agent-service deve ser
      **Fly.io GRU** (mesma regiao do banco). Railway US East fica
      descartado para evitar latencia + custo de egress.
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

- **(a) Regiao Supabase CONFIRMADA**: `sa-east-1` (Sao Paulo), verificada
  em 2026-07-08 via dashboard do projeto Fragranciaria
  (`gzxlupgdmrtkprwhiutp`). D2 do Bloco B desbloqueada. Travada.
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
- **D2. Regiao do agent-service** (CONFIRMADA 2026-07-08, depende de a):
  - Supabase em `sa-east-1` (CONFIRMADO) → **Fly.io GRU** (Sao Paulo).
    Mesma regiao do banco: zero latencia inter-regiao, sem custo de
    egress adicional.
  - Railway US East: descartado (latencia ~150ms + egress USD/GB).
  - Regiao NAO PODE ser diferente do banco (regra mantida).
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
- **[12] Idempotencia de webhook duplicado**: Z-API reenvia mesma
  mensagem por retry → 1 mensagem processada (coluna `messages.wa_message_id`
  tem constraint UNIQUE; o agent-service confia no id persistido).
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
---

## Pendência tsc: tipos do Supabase (regen)

Erros residuais em `src/lib/payments.functions.ts`,
`src/lib/order-tracking.functions.ts` e `src/lib/orders-admin.functions.ts`
sobre colunas `tracking_token`, `auth_user_id`, `refund_status`,
`payment_method_id`, `transaction_amount` foram temporariamente
silenciados com `@ts-expect-error` cirúrgicos (cada um com
comentário apontando para esta nota).

Como zerar definitivamente:

1. Garantir que todas as migrations foram aplicadas no Supabase:
   `20260708a_orders_tracking_token.sql` (e anteriores).
2. Localmente: `supabase gen types typescript --project-id gzxlupgdmrtkprwhiutp > src/integrations/supabase/types.ts`.
3. Remover todas as 3 (ou 5) diretivas `@ts-expect-error` e rerodar `tsc --noEmit`.

Não é bloqueante para o build de produção (vite ignora diretivas TS), apenas
para `npx tsc --noEmit` passar limpo.

---

## BACKLOG POS-LOCKDOWN (UX de conta + Auth)

Tickets que NÃO são do Bloco A/B do agente, mas que ficam na fila para
depois que `20260708b_orders_policies_lockdown` estiver em producao e
estavel. Em qualquer ordem; sem SLA.

### P-1. UX de conta: manter guest checkout, convite opcional na pagina de obrigado

**Decisao (de produto, nao tecnica)**: o checkout continua aceitando
compra sem login. Guest checkout nao vira obrigatorio apos o lockdown —
forcar cadastro derruba conversao (benchmark BR de e-commerce mostra
queda de 15-30% no step de checkout). Manter como esta hoje
(`/checkout` aceita cart sem `auth.users.id` no payload, gera pedido
guest em `public.orders`).

**Convite opcional** (a fazer, pos-lockdown): na pagina `/obrigado`
(rota de sucesso pos-pagamento), adicionar um bloco discreto:

> "Quer acompanhar seus pedidos pelo site? Crie sua conta em 1 clique.
> Os pedidos que voce ja fez serao vinculados automaticamente."

CTA: botao "Criar conta com este e-mail" (pre-populado com o
`customer_email` do pedido). Abre um modal de OTP (magic link) do
Supabase Auth. Se o cliente ja tinha conta nesse e-mail, o magic link
faz login normal.

**Vinculacao automatica via trigger existente**: o trigger
`public.sync_orders_to_auth_user` (definido em
`20260703_customer_account.sql:14-30`, re-aplicado em
`20260703_customer_account_full.sql:55-71`) ja cuida disso. Quando
`customers.auth_user_id` muda de NULL para um UUID, ele faz
`UPDATE public.orders SET auth_user_id = NEW.auth_user_id
WHERE customer_email = NEW.email AND auth_user_id IS NULL`. Nao
precisamos de codigo novo no server-side.

**Ponto de atencao (case sensitivity)**: o trigger e as policies
legadas de `orders` (`orders_select_auth` em
`20260703_customer_account.sql:124-128`) comparam e-mail **sem
LOWER()**. Se o cliente digitou `EDU@dominio.com` num checkout guest
e `edu@dominio.com` no cadastro, o trigger nao vincula. O
`refund.functions.ts` ja foi reescrito com `lower(...) == lower(...)`
(ver docs/backlog.md B1 e o codigo em
`src/lib/refund.functions.ts:158-167`) mas as policies de SELECT em
`orders` continuam case-sensitive. **Se a taxa de "criei conta e
meus pedidos nao aparecem" for alta no suporte**, trocar as
comparacoes em `orders_select_auth` e em `sync_orders_to_auth_user`
para `lower()`. Ticket proprio, separado deste.

**UI files a tocar** (estimativa, nao escopada):
- `src/routes/obrigado.tsx` (se nao existir, criar) — bloco do convite.
- Reusar componente de OTP/magic link que ja existe em
  `src/routes/login.tsx` (verificar se ele faz `supabase.auth.signInWithOtp`
  ou se e tela de password+confirmacao de e-mail).

### P-2. Verificar entrega de e-mails do Supabase Auth (magic link / OTP)

**Escopo**: todos os e-mails transacionais do Supabase Auth usados no
site — magic link (login sem senha, hoje em `/login`),
confirmacao de e-mail no signup (`/cadastro` → email de boas-vindas),
reset de senha (link "esqueci minha senha" no `/login`), mudanca
de e-mail (apos alteracao no `/minha-conta/perfil`).

**Itens a verificar antes de lancar:**

1. **Limite do plano Free do Supabase**: 3 e-mails/hora por projeto
   (limite global, nao por destinatario). Plano Pro: 100/hora.
   Estamos no Free, o que e suficiente para o volume atual mas
   NAO escala. Se um dia disparar campanha de reactivacao de
   clientes antigos (tipo "faz 6 meses que voce nao compra"), 3
   e-mails/hora vai gargalar.

2. **Pasta de spam**: o `from` padrao do Supabase Auth e
   `noreply@app.supabase.io` (ou `@supabase.io` dependendo da
   regiao). Gmail/Outlook mandam isso direto para spam em taxa
   alta. Clientes acham que nao receberam, pedem novo link, e
   dobramos o problema.

3. **Template em EN**: o assunto e corpo do magic link vem em
   ingles por default ("Confirm your signup" / "Login to
   Fragranciaria"). UX ruim para publico PT-BR. Alem de feio,
   alguns clientes nao confiam.

**Solucao provavel: SMTP proprio via Resend ou SendGrid.**

- Resend: ~USD 20/mes para 50k emails. API simples, suporta
  templates via React Email. Boa integracao com Supabase Auth:
  `SMTP Host: smtp.resend.com`, port 587, user `resend`,
  password = API key.
- SendGrid: free tier 100/dia (insuficiente), Pro USD 20/mes
  50k. Mais burocratico de configurar.

Recomendacao: **Resend**. Setup: criar conta → verificar dominio
`fragranciaria.com` (DNS: SPF + DKIM + DMARC) → gerar API key →
preencher `SMTP_*` no dashboard do Supabase (Project Settings →
Auth → SMTP Settings) e testar com link real e checar caixa de
entrada + spam.

**Quando fazer**: NAO e bloqueante para o lockdown. Mas fazer
ANTES de lancar o convite opcional (P-1), porque senao o convite
vai cair em spam e o cliente nao vai criar conta.

**Custo estimado**: Resend plano 50k = USD 20/mes. Free do
Supabase atende ate 3/hora (inviabiliza qualquer pico). Decisao
do Edu (custo mensal vs. taxa de entrega).

### P-3. Retomar login com Google (OAuth)

**Status atual**: NAO configurado. O `/login` da storefront so
oferece magic link / OTP. O motivo historico foi seguranca: OAuth
no Supabase Auth exige client_id + client_secret no dashboard,
e qualquer exposicao desses valores no bundle do frontend e risco
de takeover. Sera feito em PR proprio, com secrets so no
Railway (server-side), nunca em variavel `VITE_*`.

**Como fazer (apos lockdown estabilizado):**

1. **Google Cloud Console**
   (https://console.cloud.google.com/):
   - Criar projeto "Fragranciaria" (ou usar o que ja existir).
   - Tela de consentimento OAuth: tipo "External", preencher
     informacoes de suporte, dominos autorizados
     (`fragranciaria.com`, `www.fragranciaria.com`,
     `fragancaria.fragranciaria.com.br`).
   - Escopos: `openid`, `email`, `profile`.
   - Criar credencial **OAuth 2.0 Client ID**, tipo "Web
     application". Authorized redirect URIs:
     `https://gzxlupgdmrtkprwhiutp.supabase.co/auth/v1/callback`
     (URL canonica do Supabase Auth; nao muda por projeto).
   - Anotar `Client ID` + `Client Secret`.

2. **Supabase Dashboard**
   Preencher o "Client ID" e "Client Secret" gerados no Google
   Cloud Console (item 1). NAO mexer em "Authorized Client IDs"
   (deixar default). NAO mexer em "Skip nonce checks" (deixar
   unchecked). NAO mexer em "OIDC compliant" (deixar OFF, porque
   Google usa OAuth padrao, nao OIDC).

3. **Codigo no `/login`**:
   - Adicionar botao "Entrar com Google" abaixo do magic link.
   - Handler: `supabase.auth.signInWithOAuth({ servico: 'google',
     options: { redirectTo: window.location.origin + '/minha-conta' } })`.
   - O parametro correto no Supabase JS v2 e `servico`, nao `service`.
   - Tratar `error` (cliente fechou popup, recusou permissao).

4. **Implicacao de seguranca com o trigger**:
   - Quando o cliente faz login com Google pela primeira vez, o
     Supabase Auth cria `auth.users` com o `email` retornado pelo
     Google. Se ja existe `customers.email` com o mesmo endereco,
     o trigger `sync_orders_to_auth_user` **NAO** vincula
     automaticamente — ele so dispara em `UPDATE OF auth_user_id
     ON customers`, nao em `INSERT` ou em update via OAuth.
   - **Fix**: adicionar `AFTER INSERT` no mesmo trigger, ou um
     trigger separado em `auth.users` (via `supabase_auth.users`,
     que precisa de permissao especial) que faz
     `UPDATE customers SET auth_user_id = NEW.id WHERE email =
     NEW.email AND auth_user_id IS NULL`. Decidir na implementacao.
   - **Caveat LGPD**: o OAuth do Google compartilha
     `email_verified: true` e `full_name` direto do Google. Ja
     estamos coletando isso no signup normal, entao nao e dado
     novo. Mas documentar na politica de privacidade.

5. **Testes**:
   - Login com conta Google real (do Rabelli ou do Edu).
   - Checar se aparece em `auth.users` e em `customers`.
   - Pedido guest antigo com mesmo e-mail: vincula?
   - Login com conta Google que NAO tem pedido: cria customer
     novo via trigger? (depende do fix do item 4).

**Quando fazer**: depois do lockdown estabilizado (1-2 sprints
pos-deploy) E depois do SMTP proprio (P-2) configurado, porque
Google OAuth usa o mesmo canal de e-mail para verificacao de
conta nova — se o Supabase Auth estiver mandando para spam, o
fluxo de OAuth quebra tambem.

**Escopo de PR**: proprio, nao misturar com a fila pos-lockdown.
Toca UI de `/login` + `Login.tsx` (componente server) +
Supabase Dashboard config + Google Cloud Console setup, alem de possivelmente
uma nova migration de trigger (item 4 acima).

---

## Resumo da fila pos-lockdown

| # | Ticket | Bloqueado por | Esforco estimado |
|---|---|---|---|
| P-1 | Convite de conta em /obrigado + revisar case-sensitivity | Lockdown estavel | 1-2 dias (UI + QA) |
| P-2 | SMTP proprio (Resend) | Lockdown estavel | 0.5-1 dia (DNS + dashboard + 1 teste real) |
| P-3 | Login com Google | P-2 (SMTP) | 2-3 dias (Google console + Supabase + UI + trigger fix + QA) |

Sem SLA. NAO comecar P-3 sem P-2. P-1 e P-2 podem ser paralelos.

