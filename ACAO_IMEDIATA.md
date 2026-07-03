# AÇÃO IMEDIATA: Próximos Passos

**Data**: 2026-06-27  
**Status**: Pronto para ação  
**Risco**: 🟢 ZERO (não destrutivo)

---

## 📋 SEQUÊNCIA DE AÇÃO (30 minutos)

### FASE 1: Verificação (2 min)

```bash
# Terminal: Verificar status atual
cd /c/Users/eduar/Desktop/CLAUDE/FRAGRANCIARIA/quirky-hawking-a674c7

# 1. Verificar git status
git status

# 2. Build teste
npm run build

# 3. Verificar output
ls -la dist/server/
```

**Se tudo OK** → Continua para Fase 2

---

### FASE 2: Otimizar Config (5 min)

#### OPÇÃO A: Mudança MÍNIMA (para deploy rápido)

```bash
# Apenas atualizar .nvmrc
echo "20" > .nvmrc

# Verificar
cat .nvmrc  # Deve mostrar: 20
```

#### OPÇÃO B: Otimização COMPLETA (recomendada)

**1. Atualizar .nvmrc:**
```bash
echo "20" > .nvmrc
```

**2. Editar vite.config.ts**

Abrir arquivo e **ADICIONAR** isto antes da última chave de fechamento:

```typescript
  // ← ADICIONAR ISTO (antes do fechamento)
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

**Arquivo completo deve ficar assim:**

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
  // ← ADICIONE ISTO
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

---

### FASE 3: Testar Localmente (10 min)

```bash
# 1. Rebuild com novo config
rm -rf dist/
npm run build

# 2. Verificar se compilou sem erro
# Deve terminar com sucesso

# 3. Iniciar preview
npm run preview

# Será exibido:
# ➜ Local: http://localhost:5000
# ➜ Network: ...
```

**4. Abrir browser:**
- URL: http://localhost:5000
- Verificar:
  - [ ] Homepage carrega
  - [ ] Sem erro 500 em console
  - [ ] Produtos visíveis
  - [ ] Interações funcionam

**5. Parar preview:**
```bash
# Ctrl+C no terminal onde rodou npm run preview
```

---

### FASE 4: Commit & Push (3 min)

```bash
# 1. Verificar mudanças
git status

# Deve mostrar:
# modified: .nvmrc
# modified: vite.config.ts (se fez opção B)

# 2. Adicionar mudanças
git add .nvmrc vite.config.ts

# 3. Commit
git commit -m "chore: prepare for Vercel deployment

- Update Node.js to v20 (.nvmrc)
- Add Nitro node-server preset for Vercel optimization
- Configure output directory structure

This change is backward compatible and improves performance."

# 4. Push
git push origin main

# Verificar em GitHub que foi enviado
```

---

### FASE 5: Conectar em Vercel (8 min)

**1. Abrir Vercel:**
```
https://vercel.com/new
```

**2. Clicar em "Import Project"**

**3. Conectar GitHub**
- Se primeira vez: autorizar Vercel
- Selecionar repo: FRAGRANCIARIA

**4. Vercel auto-detectará vercel.json**
```
Framework: Other (custom)
Build Command: npm run build
Output Directory: dist/server
```

Se não auto-detectar, configurar manualmente.

**5. Clicar "Continue"**

---

### FASE 6: Configurar Environment Variables (5 min)

**No painel de Environment Variables em Vercel:**

```
Adicionar cada variável:

1. SUPABASE_URL
   Valor: [copiar do seu .env]
   Aplicado a: Production, Preview, Development

2. SUPABASE_SERVICE_ROLE_KEY
   Valor: [copiar do seu .env]
   Aplicado a: Production, Preview, Development

3. MP_ACCESS_TOKEN
   Valor: [copiar do seu .env]
   Aplicado a: Production, Preview, Development

4. VITE_SUPABASE_URL
   Valor: [copiar do seu .env]
   Aplicado a: Production, Preview, Development

5. VITE_SUPABASE_ANON_KEY
   Valor: [copiar do seu .env]
   Aplicado a: Production, Preview, Development
```

**Depois**: Clicar "Deploy"

---

### FASE 7: Monitorar Deploy (5 min)

**Vercel mostrará status em tempo real:**

```
Building...
[vite build output]
[npm install output]
Deployment complete!
```

**Se houver erro:**
- Clicar em "Logs"
- Procurar por "error" ou "failed"
- Anotar mensagem de erro

**Se sucesso:**
- Será fornecida URL de preview
- Exemplo: https://fragranciaria-[id].vercel.app

---

### FASE 8: Testar Preview (5 min)

**1. Abrir URL de preview no browser**

**2. Testar funcionalidades:**
- [ ] Homepage carrega
- [ ] Produtos aparecem
- [ ] Busca funciona
- [ ] Carrinho adiciona items
- [ ] Checkout abre
- [ ] Sem erros 500

**3. Verificar console do browser (F12)**
- Não deve ter erros vermelhos

**4. Verificar logs em Vercel**
- Deployments → [Latest] → Logs
- Procurar por "error" ou "FAIL"

---

## ✅ CHECKLIST FINAL

```
PRÉ-DEPLOYMENT
  ☐ git status limpo (sem mudanças não commitadas)
  ☐ npm run build funciona
  ☐ dist/server/ gerado

CONFIGURAÇÃO
  ☐ .nvmrc atualizado para 20
  ☐ vite.config.ts atualizado (opcional)
  ☐ Mudanças commitadas
  ☐ Git push feito

VERCEL SETUP
  ☐ Projeto criado em Vercel
  ☐ GitHub repo conectado
  ☐ vercel.json detectado
  ☐ Todas 5 env vars adicionadas

DEPLOY
  ☐ Deploy completo (Vercel passou)
  ☐ Preview URL gerada
  ☐ Homepage carrega (200 OK)
  ☐ Nenhum erro 500 em logs

VALIDAÇÃO
  ☐ Browser preview: OK
  ☐ Console: Sem erros
  ☐ Funcionalidades: OK
  ☐ Pronto para produção
```

---

## 🔄 SE DER ERRO

### Erro: "Build failed"

```bash
# 1. Rodar build localmente
npm run build

# 2. Procurar por erro específico
# Se vir "cannot find module", falta package:
npm install [package]

# 3. Commit e push
git add package.json
git commit -m "fix: add missing dependency"
git push origin main

# Vercel refará o deploy
```

### Erro: "502 Bad Gateway" em preview

```
Possíveis causas:
1. Environment variables não configuradas
2. Supabase URL inválida
3. Handler não iniciou

Solução:
1. Verificar env vars em Vercel Dashboard
2. Verificar Supabase status
3. Ver Runtime Logs em Vercel para erro específico
```

### Erro: "Cannot find module '@lovable.dev/vite-tanstack-config'"

```bash
# Reinstalar dependencies
npm install

# Commit e push
git add package-lock.json
git commit -m "fix: reinstall dependencies"
git push origin main
```

---

## 📞 SUPORTE

Se algo der muito errado:

**1. Verificar Vercel logs:**
```
Vercel Dashboard → Deployments → [Latest] → Logs
```

**2. Verificar build local:**
```bash
npm run build  # Deve ser sucesso
npm run preview  # Deve funcionar
```

**3. Rollback (se necessário):**
```bash
git revert HEAD  # Desfaz último commit
git push origin main  # Vercel redeploy
```

---

## 🎓 PRÓXIMAS ETAPAS (Após Deploy)

1. **Configurar domínio customizado** (se tiver)
   - Vercel Dashboard → Domains
   - Adicionar fragranciaria.com.br
   - Configurar DNS

2. **Setup production branch** (se quiser)
   - main → sempre previews
   - production → sempre produção

3. **Configurar CI/CD** (opcional)
   - GitHub Actions
   - Deploy automático ao fazer push

4. **Monitorar performance**
   - Vercel Analytics
   - Core Web Vitals
   - Error tracking

---

## ⏱️ TEMPO TOTAL

| Fase | Tempo |
|------|-------|
| Verificação | 2 min |
| Config | 5 min |
| Teste Local | 10 min |
| Commit/Push | 3 min |
| Vercel Setup | 8 min |
| Env Vars | 5 min |
| Deploy | 5 min (automático) |
| Teste Preview | 5 min |
| **TOTAL** | **43 min** |

---

## 🎉 RESULTADO ESPERADO

Após completar todas as fases:

✅ Projeto rodando em Vercel  
✅ URL de preview funcional  
✅ Todos os endpoints respondendo  
✅ SSR funcionando  
✅ Sem erros 500  
✅ Pronto para migração completa  

---

**Comece agora!** A primeira fase (Verificação) leva apenas 2 minutos.

Qualquer dúvida, consulte:
- RESUMO_EXECUTIVO.md (visão geral)
- GUIA_MIGRACAO_VERCEL.md (detalhado)
- REFERENCIA_NITRO_PRESETS.md (técnico)
