# CLAUDE.md — Fragranciaria

Instrucoes para Claude (e qualquer IA) trabalhar neste repo.

## Cuidado com secrets

**Nunca** exponha valores de env vars em logs, mensagens, codigo
commitado ou respostas. **Nunca** crie variavel `VITE_*` para um secret
— vai pro bundle do browser.

Variaveis marcadas abaixo como `SECRETA` foram visualizadas em texto
puro nesta conversa e estao marcadas para rotacao.

## Matriz de secrets por servico

| Secret | Storefront (atual) | Agent Service (futuro) | Notas |
|---|---|---|---|
| `SUPABASE_URL` | sim | sim | publico, mas nao versionar |
| `SUPABASE_PUBLISHABLE_KEY` | sim | sim | publico |
| `SUPABASE_ANON_KEY` | sim | nao | browser; storefront so |
| `SUPABASE_SERVICE_ROLE_KEY` | sim (`SECRETA`) | sim | bypassa RLS. Rotacionar ASAP |
| `MP_ACCESS_TOKEN` | sim (`SECRETA`) | nao | Mercado Pago. Rotacionar ASAP |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | sim | nao | publica (browser) |
| `VITE_MP_PUBLIC_KEY` | sim | nao | alias da acima |
| `ZAPI_WEBHOOK_SECRET` | sim | nao | webhook verify |
| `ZAPI_INSTANCE_ID` | sim | sim | ID da instancia (Z-API) |
| `ZAPI_INSTANCE_TOKEN` | sim | sim | Token da instancia (Z-API) |
| `ZAPI_CLIENT_TOKEN` | sim | sim | (Opcional) Segurança adicional |
| `VITE_ENVIOFACIL_API_KEY` | sim | nao | publica (browser) |
| `VITE_GA_MEASUREMENT_ID` | sim | nao | Google Analytics |
| `VITE_META_PIXEL_ID` | sim | nao | Meta Pixel |
| `VITE_SENDER_NAME` | sim | nao | NF sender |
| `VITE_SENDER_DOCUMENT` | sim | nao | NF sender |
| `VITE_SENDER_POSTAL_CODE` | sim | nao | NF sender |
| `ANTHROPIC_API_KEY` | **nao** | sim (`SECRETA`) | Claude API (se usarmos Claude) |
| `GEMINI_API_KEY` | **nao** | sim (`SECRETA`) | Gemini API (se usarmos Gemini) |
| `COHERE_API_KEY` | **nao** | sim (`SECRETA`) | Cohere API (classificador) |
| `OPENAI_API_KEY` | **nao** | sim (`SECRETA`) | OpenAI (embeddings/RAG) |
| `CHATWOOT_API_TOKEN` | **nao** | sim (`SECRETA`) | so se integrarmos Chatwoot |
| `CHATWOOT_WEBHOOK_HMAC` | **nao** | sim (`SECRETA`) | so se integrarmos Chatwoot |
| `RESEND_API_KEY` | sim (`SECRETA`) | **nao** | envio de e-mails transacionais (checkout, rastreio) |
| `SERPER_API_KEY` | sim (`SECRETA`) | **nao** | busca de imagens de produto (Serper.dev). Server-only |
| `ML_CLIENT_ID` | sim | nao | app do Mercado Livre (so le anuncios da propria conta) |
| `ML_CLIENT_SECRET` | sim (`SECRETA`) | nao | secret do app ML (client_credentials grant) |

### Regras

1. **Storefront** NUNCA tera chave de LLM. Risco: vazar em bundle.
2. **Agent Service** tera SUPABASE_SERVICE_ROLE_KEY (precisa bypassar
   RLS para inserir agent_events, agent_decisions).
3. **Agent Service** NAO tera MP_ACCESS_TOKEN (pagamento e job do
   storefront/admin, nao do agente).
4. **CHATWOOT_** so adiciona se decidirmos usar. Hoje nao ha codigo
   no repo que referencie Chatwoot.
5. Os disparos de mensagem utilizam a **Z-API**, compartilhada entre SAC
   e agente. O webhook verifica `ZAPI_WEBHOOK_SECRET` na query string.

## Onde ficam os env

- **Local**: arquivo `.env` na raiz (NAO COMMITAR).
  Copiar de `.env.example` se existir.
- **Producao**: Railway dashboard → Service → Variables.
- **Vercel/Netlify** (nao usamos): Project Settings → Environment Variables.

## Comandos essenciais

```bash
npm install              # instala deps
npm run dev             # dev server (porta 3000)
npm run build           # build de producao (vite + SSR)
npm start               # roda build de producao
```

## Diretorios chave

- `src/routes/`         — file-based routing (TanStack Router)
- `src/lib/`            — logica compartilhada, server functions
- `src/data/products.ts` — **LEGADO em cutover**. Fonte autoritativa
  passou a ser `public.products` no Supabase (ver `docs/agente-fase1.md`
  secao "Schema canonico"). Storefront ainda le deste arquivo ate
  migracao definitiva.
- `src/integrations/supabase/` — clientes Supabase
- `supabase/migrations/` — SQL idempotente, aplicado via SQL Editor
- `scripts/`            — utilitarios Node (.mjs / .cjs)
- `docs/`               — documentacao operacional
- `agent-service/`      — Railway service SEPARADO (Bloco B, futuro)

## Regra permanente: workflow de migrations

> **Migrations: escritas pelo Code, commitadas no repo, aplicadas pelo Edu
> apos revisao. Mesmo as aplicadas manualmente via SQL Editor sao
> commitadas no repo. Nao commitar migrations = quebrar auditoria.**

Em outras palavras:

1. **Code** escreve a migration em `supabase/migrations/AAAAmmdd_nome.sql`
   com timestamp YYYYMMDD + nome descritivo.
2. **Code** mostra o SQL completo para o Edu revisar.
3. **Edu** cola no SQL Editor do Supabase e aplica (manualmente).
4. **Code** faz `git add supabase/migrations/AAAmmdd_nome.sql` e
   commita no repo. Sem commit = migration nao existe formalmente.
5. Nao commitar migration que nao foi aplicada.
6. Nao aplicar migration que nao esta no repo.

## Pendencias do projeto

Ver `docs/agente-fase1.md` para o bot WhatsApp (Bloco A aplicado, B proximo).
Ver `docs/OPERACAO.md` para deploy/Railway.

## Projeto Supabase de producao

- **Project ID**: `gzxlupgdmrtkprwhiutp` (este e o projeto real).
- **Nome**: `Fragranciaria` (aparece no topo do dashboard Supabase).
- **Regiao**: `sa-east-1` (Sao Paulo). CONFIRMADO em 2026-07-08.
- **Antes de rodar qualquer query no SQL Editor**: confirmar visualmente
  que o nome "Fragranciaria" esta no topo do dashboard. Episodio
  registrado em 2026-07-08 (`docs/assets-restore-20260707.md` §4): uma
  query em `information_schema.tables` retornou 0 linhas e levantou
  alarme de "projeto vazio" — era engano operacional (outro projeto
  Supabase aberto em outra aba). Nunca confiar em query sem conferir
  o nome do projeto no topo do dashboard.
- **Migrations do Bloco A** sao reescritas contra o dump do schema real
  deste projeto, NAO contra os arquivos `001_*.sql` / `002_*.sql`
  (esses estao marcados como `-- HISTORICO`, ver §4 do doc acima).

## Regra permanente: mensagens de commit descrevem o que esta no commit

**Mensagens de commit sao escritas a partir de `git show --stat` / `git show --diff`
do PROPRIO commit, nunca de memoria, plano, intencao, ou descricao anterior.**

Caso real (2026-07-09): o commit `d70dc7c` ("Bloco B — add tracking_token + lockdown
anon policies on orders") tinha uma mensagem que descrevia:

- tracking_token "12-char base32 from gen_random_bytes(8)" — mentira;
  o codigo usa 16-char nanoid com `randomBytes(32)` (31 glyphs, ~77.5 bits).
- "view public.orders_tracking_lookup" — mentira; a migration (a) NAO cria view.
- "drops 3 anon policies on orders (...) + locks down refund_requests
  (anon INSERT removed; service_role only) + locks down order_items
  (anon SELECT/INSERT/UPDATE removed)" — mentira; a migration (b) so
  mexe em `public.orders` (revoke + drop 3 policies + recreate 2).
  Nenhuma referencia a `order_items` ou `refund_requests` no SQL.

Nenhuma das descricoes erradas correspondia ao que estava no diff. O re-QA
do commit (que o owner pediu apos receber o report) descobriu as 3 mentiras
confrontando mensagem x `git show d70dc7c --stat -- supabase/migrations/`.

Regra daqui pra frente: **antes de `git commit`, rodar `git diff --stat` e
`git diff` no staging, ler a mensagem proposta contra o diff real, e so
entao commitar**. Se a mensagem diz "faz X", o diff tem que ter X.

## Ao iniciar uma nova sessao

1. Confirmar que o working dir esta em `C:\dev\fragancaria\`
   (copia canonica, NAO em OneDrive nem em `quirky-hawking-a674c7/`).
2. Conferir memoria em `~/.claude/projects/.../memory/` (5 fatos uteis).
3. **Nao rodar migrations** — o Edu aplica via SQL Editor.
   Mas pode ler/escrever os arquivos `.sql` no repo.
4. **Nao expor secrets** em logs, respostas ou codigo commitado.
5. **Nao recriar migrations que ja existem no repo** — listar
   `supabase/migrations/` antes de criar nova.