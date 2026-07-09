# Backlog — Fragranciaria

Tarefas registradas por motivo (segurança, refactor, tipos, etc.) que **não** estão no
escopo de um PR atual. Cada item tem: contexto, dono sugerido, e condição para promoção.

---

## B1 — `account.functions.ts` importa `getSupabaseServerClient`, função removida neste PR

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

## B2 — `src/integrations/supabase/types.ts` está stale

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
