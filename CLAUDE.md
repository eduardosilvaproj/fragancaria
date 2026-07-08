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
| `WHATSAPP_VERIFY_TOKEN` | sim | nao | webhook verify |
| `WHATSAPP_PHONE_NUMBER_ID` | sim | sim | ID do numero business |
| `WHATSAPP_ACCESS_TOKEN` | sim | sim | Meta Cloud API |
| `WHATSAPP_APP_SECRET` | sim | sim | valida assinatura webhook |
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

### Regras

1. **Storefront** NUNCA tera chave de LLM. Risco: vazar em bundle.
2. **Agent Service** tera SUPABASE_SERVICE_ROLE_KEY (precisa bypassar
   RLS para inserir agent_events, agent_decisions).
3. **Agent Service** NAO tera MP_ACCESS_TOKEN (pagamento e job do
   storefront/admin, nao do agente).
4. **CHATWOOT_** so adiciona se decidirmos usar. Hoje nao ha codigo
   no repo que referencie Chatwoot.
5. **WHATSAPP_ACCESS_TOKEN** e compartilhado porque o agente envia
   mensagens via mesma Meta app. Ideal: tokens separados por canal
   no futuro (Meta permite).

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

## Ao iniciar uma nova sessao

1. Confirmar que o working dir esta em `C:\dev\fragancaria\`
   (copia canonica, NAO em OneDrive nem em `quirky-hawking-a674c7/`).
2. Conferir memoria em `~/.claude/projects/.../memory/` (5 fatos uteis).
3. **Nao rodar migrations** — o Edu aplica via SQL Editor.
   Mas pode ler/escrever os arquivos `.sql` no repo.
4. **Nao expor secrets** em logs, respostas ou codigo commitado.
5. **Nao recriar migrations que ja existem no repo** — listar
   `supabase/migrations/` antes de criar nova.