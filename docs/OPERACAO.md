# Guia de operação — Railway + GitHub

## Habilitar auto-deploy (fix do "Auto deploy unavailable")

O banner `Auto deploy unavailable` na aba Settings da Railway vem de permissão do app GitHub instalado. Para corrigir:

1. Abra https://github.com/settings/installations logado no dono do repo (`eduardosilvaproj`).
2. Encontre o app **Railway** na lista e clique em **Configure**.
3. Em **Repository access**:
   - Selecione **Only select repositories** e adicione `eduardosilvaproj/fragranciaria`, **ou**
   - Selecione **All repositories** (mais simples se você só usa Railway para um repo).
4. Clique em **Save**.
5. Volte na Railway, na aba **Settings** do serviço. O banner `Auto deploy unavailable` desaparece e o botão **Deploy** agora aparece como **Deploy on commit**.
6. Próximo `git push` na branch `main` dispara build automático.

## Remover `railway.json`

`railway.toml` tem prioridade sobre `railway.json`. Se existirem os dois, o Railway pode se confundir. Mantemos só `railway.toml`:

```toml
[build]
builder = "dockerfile"

[deploy]
startCommand = "node start.js"
restartPolicyMaxRetries = 5
```

## Variáveis de ambiente (Railway → Service → Variables)

São 16 variáveis. As críticas para o app rodar:

| Var | Onde é usada |
|---|---|
| `SUPABASE_URL` | server-side (admin auth) |
| `SUPABASE_PUBLISHABLE_KEY` | server-side (admin auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side (bypassa RLS — **secreto**) |
| `VITE_SUPABASE_URL` | browser build |
| `VITE_SUPABASE_ANON_KEY` | browser build |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser build |
| `MP_ACCESS_TOKEN` | webhook Mercado Pago (server) |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | browser build |
| `VITE_MP_PUBLIC_KEY` | browser build |
| `WHATSAPP_*` | webhook + envio (Meta Cloud API) |

**Nunca** exponha `SUPABASE_SERVICE_ROLE_KEY` ou `MP_ACCESS_TOKEN` em variável `VITE_*` — elas vão pro bundle do browser.

## Painel admin

- URL: `/admin` — redireciona pra `/admin-login` sem cookie válido.
- Admins cadastrados: ver tabela `public.admins` no Supabase.
- Senhas são resetadas via Supabase Admin API (service role).