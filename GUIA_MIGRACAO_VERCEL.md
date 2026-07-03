# GUIA DE MIGRAÇÃO: Lovable → Vercel (Passo-a-Passo)

**Data**: 2026-06-27  
**Tempo Estimado**: 30 minutos  
**Risco**: 🟢 BAIXO (não é destrutivo, apenas reconfiguração)

---

## PARTE 1: PREPARAÇÃO PRÉ-MIGRAÇÃO (5 min)

### Passo 1.1: Verificar Estado Atual

```bash
# Verificar Node.js
node --version
# Esperado: v20.x ou v18.x+

# Verificar npm
npm --version
# Esperado: v10+

# Verificar se build funciona
npm run build
# Deve terminar com sucesso

# Verificar estrutura de output
ls -la dist/server/
# Deve ter: index.js, server.js, assets/
```

### Passo 1.2: Backup do Projeto

```bash
# Se usar git, já está seguro
git status

# Se há mudanças não commitadas
git stash
```

### Passo 1.3: Verificar vercel.json Atual

```bash
cat vercel.json
```

**Esperado:**
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist/server",
  "installCommand": "npm install"
}
```

---

## PARTE 2: ATUALIZAR CONFIGURAÇÕES (10 min)

### Passo 2.1: Atualizar .nvmrc

**Objetivo**: Sincronizar Node.js com Vercel

```bash
# Criar/Atualizar .nvmrc
echo "20" > .nvmrc

# Verificar
cat .nvmrc
```

### Passo 2.2: Opção A - Manter Cloudflare Preset (SIMPLES)

✅ **Recomendado para**: Migração rápida, sem risco

**Não mude nada** em `vite.config.ts`. Vercel adapta automaticamente.

Vá direto para **Passo 3**.

---

### Passo 2.3: Opção B - Usar Node.js Preset Nativo (RECOMENDADO)

✅ **Recomendado para**: Melhor performance, menos overhead

**Editar `vite.config.ts`:**

```typescript
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('src/data/products')) {
              return 'products-data';
            }
            if (id.includes('node_modules/framer-motion')) {
              return 'vendor-framer';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  },
  // ✨ ADICIONAR ISTO:
  nitro: {
    preset: "node-server",
    output: {
      dir: "dist",
      serverDir: "dist/server",
      publicDir: "dist/client",
    },
  },
});
```

**Explicação:**
- `preset: "node-server"` → Força Nitro gerar handler Node.js nativo
- `output.dir` → Garante output correto em `dist/server/`

---

### Passo 2.4: Opção C - Usar Preset Vercel Específico (AVANÇADO)

⭐ **Recomendado para**: Máxima compatibilidade com Vercel

```typescript
// vite.config.ts
nitro: {
  preset: "vercel",  // ← Preset específico Vercel
  output: {
    dir: "dist",
    serverDir: "dist/server",
    publicDir: "dist/client",
  },
},
```

**Vantagem**: Nitro usa configurações ótimas do Vercel automaticamente

---

## PARTE 3: TESTAR LOCALMENTE (10 min)

### Passo 3.1: Rebuild do Projeto

```bash
# Limpar build antigo
rm -rf dist/

# Rebuild
npm run build
```

**Output esperado:**
```
vite build
(sem erros)

✓ 1234 modules transformed
dist/client built in 5.23s
dist/server built in 3.45s
```

### Passo 3.2: Verificar Output Structure

```bash
# Verificar estrutura
tree dist/ -L 2

# Ou listar
ls -la dist/client/
ls -la dist/server/

# Verificar handler
head -20 dist/server/server.js
```

**Esperado em `dist/server/server.js`:**

```javascript
export default {
  async fetch(request, env, ctx) {
    // ... handler code
  }
}
```

### Passo 3.3: Executar Preview Local

```bash
# Iniciar preview
npm run preview

# Esperado:
#   ➜ Local: http://localhost:5000
#   ➜ Network: ...

# Manter rodando, abrir browser em outra aba
```

### Passo 3.4: Testar Endpoints

```bash
# Em novo terminal, testar

# 1. Home page
curl http://localhost:5000/

# 2. Version endpoint
curl http://localhost:5000/version.json

# 3. API endpoint (exemplo)
curl http://localhost:5000/api/products

# Verificar responses
# Devem ser 200 OK, não 500/502/503
```

### Passo 3.5: Verificar Console para Erros

**No browser (localhost:5000):**
- Abrir DevTools (F12)
- Ir para Console
- Procurar por erros vermelhos
- Se houver, anotar para debug

---

## PARTE 4: PREPARAR PARA VERCEL (5 min)

### Passo 4.1: Commit das Mudanças

```bash
# Parar preview (Ctrl+C no terminal)

# Adicionar mudanças
git add .nvmrc vite.config.ts

# Verificar mudanças
git diff --cached

# Commit
git commit -m "chore: configure for Vercel deployment

- Update Node.js version to 20
- Add Nitro node-server preset for Vercel
- Optimize build output structure"
```

### Passo 4.2: Push para GitHub

```bash
# Push branch
git push origin main

# Verificar no GitHub
# https://github.com/seu-usuario/FRAGRANCIARIA
```

### Passo 4.3: Listar Environment Variables Necessárias

**Criar arquivo .env.vercel (NÃO committar):**

```bash
# Listar variáveis necessárias
cat .env | grep -E "^(SUPABASE|MP_|VITE_)"
```

**Copiar para arquivo temporário:**
```bash
# Linux/Mac
cat .env | grep -E "^(SUPABASE|MP_|VITE_)" > /tmp/env-vars.txt

# Windows PowerShell
(Get-Content .env) -match "^(SUPABASE|MP_|VITE_)" | Set-Content -Path env-vars.txt
```

**Variáveis que Vercel precisará:**

| Variável | Tipo | Origem |
|----------|------|--------|
| `SUPABASE_URL` | Secret | Backend |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Backend |
| `MP_ACCESS_TOKEN` | Secret | Backend |
| `VITE_SUPABASE_URL` | Public | Frontend |
| `VITE_SUPABASE_ANON_KEY` | Public | Frontend |

---

## PARTE 5: CONECTAR EM VERCEL (10 min)

### Passo 5.1: Criar Projeto Vercel

1. **Ir para Vercel**
   ```
   https://vercel.com/new
   ```

2. **Importar Repositório**
   - Conectar GitHub
   - Selecionar repositório FRAGRANCIARIA
   - Clicar em "Import"

### Passo 5.2: Configurar Project Settings

**Vercel mostrará:**

```
Framework: Other (Vercel detecta vercel.json automaticamente)
Output Directory: dist/server (from vercel.json)
Build Command: npm run build (from vercel.json)
Install Command: npm install (from vercel.json)
```

**Verificar se estão corretos**:
- [ ] Framework: Other (ou deixa vazio)
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist/server`

**Clicar em "Continue"**

### Passo 5.3: Adicionar Environment Variables

**Em "Environment Variables":**

```
Nome: SUPABASE_URL
Valor: [copiar do .env]
Aplicado a: Production, Preview

[Clicar + Add Another]

Nome: SUPABASE_SERVICE_ROLE_KEY
Valor: [copiar do .env]
Aplicado a: Production, Preview

[Clicar + Add Another]

Nome: MP_ACCESS_TOKEN
Valor: [copiar do .env]
Aplicado a: Production, Preview

[Clicar + Add Another]

Nome: VITE_SUPABASE_URL
Valor: [copiar do .env]
Aplicado a: Production, Preview

[Clicar + Add Another]

Nome: VITE_SUPABASE_ANON_KEY
Valor: [copiar do .env]
Aplicado a: Production, Preview
```

**Clicar em "Deploy"**

### Passo 5.4: Monitorar Deploy Inicial

**Vercel mostrará status:**

```
Building...
[vite build progress...]
[npm install progress...]
Deployment complete!
```

**Se houver erro:**
- Clicar em "Logs"
- Procurar por mensagens de erro
- Ver "Build Logs" vs "Runtime Logs"

---

## PARTE 6: TESTAR DEPLOYMENT EM VERCEL (10 min)

### Passo 6.1: Acessar Preview URL

**Vercel fornecerá URL:**
```
https://fragranciaria-[id].vercel.app
```

**Testar no browser:**
- Acessar homepage
- Procurar por elementos esperados
- Não deve ter erros 500/502

### Passo 6.2: Verificar Logs em Vercel

**Em Vercel Dashboard:**
1. Projeto FRAGRANCIARIA
2. "Deployments" tab
3. Clicar no último deployment
4. "Logs" → "Runtime Logs"

**Procurar por:**
- Erros de conexão Supabase?
- Erros de variáveis env?
- SSR errors?

### Passo 6.3: Testar Endpoints via cURL

```bash
# URL_PREVIEW=https://fragranciaria-[id].vercel.app

# 1. Homepage
curl $URL_PREVIEW/
# Esperado: HTML 200

# 2. Version JSON
curl $URL_PREVIEW/version.json
# Esperado: {"version":"202606271501"}

# 3. Produto específico (ajustar ID)
curl $URL_PREVIEW/produto.1
# Esperado: HTML 200 com produto renderizado
```

### Passo 6.4: Testar Funcionalidade de Pagamento (Manual)

**No browser da preview URL:**

1. Ir para home page
2. Adicionar produto ao carrinho
3. Ir para checkout
4. Preencher dados
5. **NÃO** confirmar pagamento (para não gerar transação real)
6. Verificar se:
   - Formulário carrega ✅
   - Campos validam ✅
   - Não há erro 500 ✅

---

## PARTE 7: MIGRAÇÃO COMPLETA (SWITCH)

### Passo 7.1: Testar Todos os Fluxos

**Checklist de funcionalidade em preview Vercel:**

- [ ] Homepage carrega sem erro
- [ ] Produtos listam corretamente
- [ ] Busca de produtos funciona
- [ ] Adicionar ao carrinho funciona
- [ ] Carrinho mostra total correto
- [ ] Checkout página abre
- [ ] Formulário valida
- [ ] Supabase queries (se houver) funcionam
- [ ] Mercado Pago SDK carrega
- [ ] Sem erros 500 no console/logs

### Passo 7.2: Setup Production Domain (Opcional)

**Em Vercel Project Settings:**

1. "Domains"
2. Adicionar domínio customizado:
   ```
   fragranciaria.com.br (seu domínio)
   ```
3. Vercel mostrará DNS records
4. Atualizar DNS no seu registrador

### Passo 7.3: Desativar Preview em Lovable (Opcional)

**Se ainda usando Lovable:**

1. Ir para Lovable.dev project
2. Parar deployments automáticos (settings)
3. Ou simplesmente deixar (ambos rodam em paralelo)

### Passo 7.4: Documentar Mudança

**Criar arquivo de registro:**

```bash
cat > DEPLOYMENT_LOG.md << 'EOF'
# Deployment Migration Log

## Data: 2026-06-27

### Lovable → Vercel Migration
- Project migrated from Lovable.dev to Vercel
- Commit: [hash do commit que configurou Vercel]
- Preview URL: https://fragranciaria-[id].vercel.app
- Production URL: [seu domínio, se applicable]

### Configuration
- Node.js: 20.x
- Nitro Preset: node-server (ou cloudflare, ou vercel)
- Environment Variables: [lista das vars]
- Build Command: npm run build
- Output Directory: dist/server

### Status
- [x] Build testing passed
- [x] Local preview tested
- [x] Vercel deployment successful
- [x] Preview URL verified
- [ ] Production domain pointed (se aplicável)

### Próximos passos
- Monitor Vercel logs for errors
- Retest payment flow with test account
EOF

git add DEPLOYMENT_LOG.md
git commit -m "docs: log Vercel migration"
git push origin main
```

---

## PARTE 8: TROUBLESHOOTING

### Erro: "Build failed - npm run build"

**Solução:**
```bash
# Rodar build localmente para reproduzir
npm run build

# Procurar por erro específico na saída
# Se vir "cannot find module", falta dependency:
npm install [module]

# Se vir erro TypeScript, checar tipos:
npx tsc --noEmit

# Depois commit e push
git push origin main
```

### Erro: "502 Bad Gateway"

**Possíveis causas:**
1. Variáveis ambiente não configuradas
2. Supabase URL inválida
3. Node.js incompatibilidade

**Solução:**
```bash
# Verificar env vars em Vercel Dashboard
# → Project Settings → Environment Variables

# Verificar logs
# → Deployments → [latest] → Logs

# Se erro de Supabase:
# Verificar SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY

# Se erro genérico, fazer rollback:
# Em Vercel Dashboard → Deployments → [previous successful] → Promote
```

### Erro: "Cannot find module '@lovable.dev/vite-tanstack-config'"

**Solução:**
```bash
# Reinstalar dependencies
npm install

# Ou limpar cache
npm cache clean --force
npm install

# Push novamente
git push origin main
```

### Erro: "VITE_SUPABASE_URL is not defined"

**Solução:**
```bash
# Variáveis VITE_* são frontend, devem ser:
# 1. Definidas em .env
# 2. Ou em Environment Variables do Vercel
# 3. Com prefixo VITE_ para ser injetadas no client bundle

# Verificar em Vercel:
# → Project Settings → Environment Variables
# → Procurar por VITE_SUPABASE_URL

# Se não existir, adicionar
```

### Preview funciona, Production não

**Solução:**
```bash
# Geralmente é diferença de env vars

# Verificar Environment Variables em Vercel:
# → Production environment tem todas as vars?

# Se algumas vars são diferentes entre preview e production:
# → Settings → Environment Variables → Editar

# Depois forçar redeploy:
# → Deployments → [latest] → Redeploy
```

---

## PARTE 9: MONITORAMENTO PÓS-DEPLOYMENT

### Checklist Semanal

```bash
# Verificar logs em Vercel (semana 1)
- [ ] Zero 500 errors no Runtime Logs
- [ ] Supabase conecta corretamente
- [ ] Pagamentos processam (test mode)
- [ ] Zero timeouts

# Verificar performance (semana 2)
- [ ] Page load time < 3s
- [ ] TTFB < 500ms
- [ ] Core Web Vitals score > 80

# Verificar segurança (semana 2)
- [ ] Nenhuma variável confidencial em logs
- [ ] Conexão HTTPS funciona
- [ ] Headers de segurança presentes
```

### Monitoramento Contínuo

**Setup opcional em Vercel:**

1. Alertas de erro
   - Settings → Monitoring → Alerts
   - Configurar erro threshold

2. Uptime monitoring
   - Settings → Monitoring → Uptime
   - Verificar disponibilidade 24/7

---

## PARTE 10: ROLLBACK (Se Necessário)

### Se Precisar Voltar para Lovable

```bash
# Revert commit Vercel
git revert HEAD

# Ou reset
git reset --hard HEAD~1

# Push
git push origin main -f

# Lovable auto-detectará e redeploy
```

---

## RESUMO FINAL

| Fase | Tempo | Status |
|------|-------|--------|
| Preparação | 5 min | ✅ |
| Config | 10 min | ✅ |
| Teste Local | 10 min | ✅ |
| Vercel Setup | 10 min | ✅ |
| Teste Vercel | 10 min | ✅ |
| **TOTAL** | **45 min** | ✅ |

**Após completar:** Seu projeto está rodando em Vercel com TanStack Start ✅

---

## CONTATOS & RECURSOS

- **Vercel Support**: https://vercel.com/support
- **Nitro Docs**: https://nitro.unjs.io/
- **TanStack Start**: https://tanstack.com/start/
- **Supabase Docs**: https://supabase.com/docs

---

**Criado em**: 2026-06-27  
**Para**: FRAGRANCIARIA Project  
**Versão**: 1.0
