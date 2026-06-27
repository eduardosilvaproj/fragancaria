# ANÁLISE PROFUNDA: FRAGRANCIARIA - Lovable.dev vs Vercel

**Data**: 2026-06-27  
**Versões**: TanStack Start 1.168.26 | Nitro 3.0.260603-beta | Lovable Config 2.5.3

---

## 1. ARQUITETURA LOVABLE (Current Stack)

### 1.1 Como Lovable.dev Funciona Tecnicamente

```
Lovable.dev = Camada gerenciada sobre Vercel Serverless + Proprietary CLI
```

**Fluxo de Deployment Lovable:**

1. **Project Detection**: Lovable detecta template via `.lovable/project.json`
   ```json
   {
     "schemaVersion": 1,
     "template": "tanstack_start_ts_2026-06-08"
   }
   ```

2. **Build Execution**: Roda `npm run build` (definido em package.json)
   ```bash
   vite build && node scripts/create-index.mjs
   ```

3. **Output Mapping**:
   - Client: `dist/client/` (static assets)
   - Server: `dist/server/` (Nitro handler)

4. **Deployment Target**: Lovable's proprietary serverless runtime
   - Não usa vercel.json (Lovable tem seu próprio deployment system)
   - Não usa Vercel Functions diretamente
   - Lovable é construído sobre Vercel mas adiciona abstração própria

5. **Environment Variables**: Lovable Dashboard (UI)
   - Não integra com Vercel Project Settings
   - Gerenciamento centralizado Lovable

**CRÍTICA**: Lovable é uma abstração que OCULTA a infraestrutura subjacente

---

### 1.2 @lovable.dev/vite-tanstack-config (v2.5.3)

Este é o **coração mágico** que auto-configura tudo.

**O que ela faz (src/index.cjs):**

```typescript
// PLUGINS AUTOMATICAMENTE INJETADOS:
- tailwindcss v4.2.1 (Vite plugin)
- vite-tsconfig-paths (@ alias resolution)
- @tanstack/react-start (SSR plugin)
- nitro (build-only plugin)
- lovable-tagger (dev-only, component tracking)
- Custom error loggers (dev + prod)
- VITE_* environment injection
```

**Nitro Preset Automático:**

```javascript
// src/index.cjs: ~line 190-210
const nitroOpts = { 
  defaultPreset: "cloudflare-module",  // ← PADRÃO HARDCODED
  ...userNitroOpts 
};

if (isSandbox) {
  delete nitroOpts.defaultPreset;
  nitroOpts.preset = "cloudflare-module";  // ← CLOUDFLARE FIXADO
  nitroOpts.cloudflare = { 
    nodeCompat: true,  // ← Ativa compatibilidade Node em CF Workers
    deployConfig: true 
  };
}
```

**Conclusão**: Lovable config força `cloudflare-module` como preset Nitro:
- Gera código otimizado para Cloudflare Workers
- Ativa Node compatibility layer (que permite rodar em ambos)
- **NÃO é Node.js nativo** — é compilado para Workers + fallback

---

## 2. ARQUITETURA VERCEL (Target Stack)

### 2.1 Suporte Vercel para Nitro/TanStack Start

**Resposta Oficial**: ✅ Suporta, mas com ressalvas

Vercel não tem integração nativa com TanStack Start. Porém:

1. **Suporta custom serverless functions**
2. **Suporta Node.js handlers arbitrários**
3. **Requer vercel.json com configuração manual**

**Vercel tem integração nativa com:**
- Next.js (seu próprio framework)
- Remix
- SvelteKit
- Astro
- (mas NÃO TanStack Start)

---

### 2.2 Modelo de Deployment Vercel

**Opções:**

| Opção | Mapeamento | Uso |
|-------|-----------|-----|
| **Framework Detection** | Next.js → Vercel Functions | Automático |
| **Custom API Routes** | `/api/**` → Vercel Functions | Manual |
| **Entry Point via vercel.json** | `dist/server/index.js` → Node.js Handler | TanStack Start |
| **Edge Functions** | Cloudflare Worker-like | Não necessário aqui |

**Projeto atual usa: Entry Point via vercel.json**

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist/server",
  "installCommand": "npm install",
  "functions": {
    "dist/server/index.js": {
      "runtime": "nodejs20.x"
    }
  }
}
```

**O que significa:**
- Vercel compila seu projeto
- Executa build command
- Lê dist/server/index.js
- Wraps em Vercel Serverless Function (Node.js 20)
- Roteia TODAS requisições para esse handler

---

### 2.3 SSR com Nitro em Vercel

✅ **Totalmente suportado**

O fluxo é:

```
Client Request → Vercel Serverless Function 
              → Node.js Handler (dist/server/index.js)
              → Nitro Server Router
              → TanStack Start SSR Engine
              → React Component Render
              → HTML Response
```

**Nitro com Node.js preset:**

```javascript
// Isso é o que Vercel precisa para rodar
const nitroOpts = {
  preset: "node-server"  // ou "node" (ambos existem em Nitro 3)
};
```

Nitro `node-server` preset gera:
- `dist/server/index.js` (entry point)
- Handler: `export default { fetch(request, env, ctx) { ... } }`
- Compatível com Vercel Serverless Functions

---

### 2.4 Handler/Entry Point Esperado por Vercel

Vercel espera um dos formatos:

```javascript
// FORMATO 1: Default Export (o que TanStack Start gera)
export default {
  fetch(request: Request, env: unknown, ctx: unknown) {
    return Response
  }
}

// FORMATO 2: Function handler (legado)
export default (req, res) => {
  // Express-like API
}

// FORMATO 3: POSIX handler (outro)
export default (listener) => {
  server.listen(listener)
}
```

**Seu projeto usa FORMATO 1** ✅

```typescript
// src/server.ts
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    // TanStack Start handler
  }
}
```

---

## 3. INCOMPATIBILIDADES POTENCIAIS

### 3.1 Nitro: Cloudflare vs Node.js Runtime

**PROBLEMA CRÍTICO IDENTIFICADO:**

```typescript
// Lovable config force cloudflare-module preset
defaultPreset: "cloudflare-module"

// Resultado:
dist/server/server.js = Otimizado para Cloudflare Workers + Node compat
NÃO é um handler Node.js nativo
```

**O que acontece com Cloudflare Workers preset:**

```javascript
// Nitro cloudflare-module generates:
export default {
  fetch(request, env, ctx) {  // ← Cloudflare Workers signature
    // Não é req/res Express-like
    // É Web Fetch API (Request/Response objects)
  }
}
```

**Vercel Node.js 20 ESPERA:**

```javascript
// Vercel Serverless Function (Node.js)
export default (req, res) => {  // ← Express-like
  // req = Node.js IncomingMessage
  // res = Node.js ServerResponse
}
// OU Web Fetch API com wrapping
```

**SOLUÇÃO**: Nitro precisa adaptar Cloudflare Workers format → Node.js format

---

### 3.2 Análise do Arquivo Gerado

**Seu arquivo atual (dist/server/server.js):**

```javascript
const server = {
  async fetch(request, env, ctx) {  // ← Cloudflare Workers signature
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      // ...retorna Response
    }
  }
}
export { server as default }
```

**Status**: ✅ TEORICAMENTE funciona com Vercel

**Por quê?** Vercel suporta Web Fetch API format se o handler exporta `default`

**MAS** há um catch: vercel.json especifica `runtime: "nodejs20.x"`

```json
"functions": {
  "dist/server/index.js": {
    "runtime": "nodejs20.x"
  }
}
```

Isso diz ao Vercel:
- Use Node.js 20
- Espere handler Web Fetch format
- Vercel envolverá em adaptor automaticamente ✅

---

### 3.3 vite.config.ts Está Correto?

**Resposta**: Sim, com reserva

```typescript
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" }  // ← aponta para src/server.ts
  },
  vite: {
    build: {
      rollupOptions: { ... },
      chunkSizeWarningLimit: 1000
    }
  }
})
```

**O que acontece:**

1. `@lovable.dev/vite-tanstack-config` injeta Nitro plugin
2. Nitro builder:
   - Lê `src/server.ts`
   - Compila com `defaultPreset: "cloudflare-module"`
   - Output: `dist/server/server.js` + `dist/server/index.js`

**Problema**: Está fixado em Cloudflare

**Solução para Vercel**: Precisamos OVERRIDE o preset

```typescript
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" }
  },
  vite: {
    build: { ... }
  },
  // ADICIONAR ISSO:
  nitro: {
    preset: "node-server"  // ← Override Cloudflare
  }
})
```

---

### 3.4 dist/server/server.js É Compatível com Vercel?

**Resposta**: Parcialmente ✅ (com wrapping automático)

Vercel detecta formato Web Fetch API e envolve automaticamente.

**MAS** há latência overhead:
- Conversão Node.js → Fetch API
- Conversão Fetch API → Node.js

**Melhor**: Usar Nitro preset `node-server` nativo

---

### 3.5 Node.js Version Mismatch?

**Seu .nvmrc:**
```
18  (ou não existe?)
```

**seu vercel.json:**
```json
"runtime": "nodejs20.x"
```

**Verificar:**

```bash
cat .nvmrc
# Se diferente de 20, atualizar para:
echo "20" > .nvmrc
```

**CRÍTICO**: Se .nvmrc ≠ vercel.json runtime, Vercel usa vercel.json

---

### 3.6 Dependencies Faltando?

**Verificação:**

```json
{
  "@tanstack/react-start": "1.168.26",  ✅
  "@tanstack/react-router": "1.168.25",  ✅
  "nitro": "3.0.260603-beta",  ✅ (beta, mas ok)
  "@lovable.dev/vite-tanstack-config": "2.5.3"  ✅
}
```

**Tudo present** ✅

---

## 4. SOLUÇÃO POTENCIAL

### 4.1 Opção A: Override Nitro Preset (RECOMENDADO)

**Nível: Médio**  
**Tempo: 5 minutos**

```typescript
// vite.config.ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" }
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('src/data/products')) return 'products-data';
            if (id.includes('node_modules/framer-motion')) return 'vendor-framer';
            if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          }
        }
      },
      chunkSizeWarningLimit: 1000
    }
  },
  // ADICIONAR:
  nitro: {
    preset: "node-server",  // ← Força Node.js nativo
    output: {
      dir: "dist",
      serverDir: "dist/server",
      publicDir: "dist/client"
    }
  }
});
```

**Por quê:**
- Nitro terá precedência sobre Lovable's `defaultPreset`
- Gera `dist/server/index.js` nativo Node.js
- Vercel pode usar direto sem adaptor
- Melhor performance

**Como testar:**
```bash
npm run build
cat dist/server/index.js | head -20
# Deve ter formato Node.js, não Cloudflare
```

---

### 4.2 Opção B: Manter Cloudflare + Vercel Adaptor

**Nível: Baixo**  
**Tempo: 0 minutos**

**Status atual = funciona como está** ✅

Vercel envolve automaticamente:

```
dist/server/server.js (Cloudflare format)
     ↓
Vercel adaptor Node.js
     ↓
Vercel Serverless Function
```

**Desvantagens:**
- Overhead de conversão
- Debug mais complexo
- Dependência de Lovable config

---

### 4.3 Opção C: Usar @vercel/next ou framework nativo

**Nível: Alto**  
**Tempo: 2 horas**

**NÃO RECOMENDADO** — destruiria stack TanStack

---

## 5. VERIFICAÇÃO: O QUE REALMENTE ACONTECE

### 5.1 Build Lovable (atual)

```bash
npm run build
```

**Output esperado:**

```
dist/
  client/
    assets/
      index-XXX.js (React bundle)
      vendor-framer-XXX.js
      vendor-icons-XXX.js
      products-data-XXX.js
      styles-XXX.css
    index.html
  server/
    assets/
      server-4dCxQWBc.js (Nitro server entry, minificado)
    server.js (handler, 3.8KB)
    index.js (re-export)
```

**Handler signature em dist/server/server.js:**

```javascript
export default {
  async fetch(request, env, ctx) {
    // Cloudflare Workers signature
  }
}
```

---

### 5.2 Deploy Lovable (atual)

Lovable CLI:
1. Detecta template via `.lovable/project.json`
2. Roda `npm run build`
3. Compila output com preset Cloudflare
4. Publica em Lovable's serverless

---

### 5.3 Verificar Compatibilidade Vercel

**Teste:**

```bash
# Build para Vercel
npm run build

# Verificar output
ls -la dist/server/

# Verificar handler format
head -50 dist/server/server.js | grep -A 5 "fetch"

# Se vir "fetch(request, env, ctx)" = Cloudflare format
# Se vir "export default (req, res)" = Node.js format
```

---

## 6. RESPOSTA FINAL À QUESTÃO "QUAL PRESET NITRO?"

### 6.1 Nitro foi feito para Cloudflare/Edge ou Node.js?

**Resposta: AMBOS**

Nitro 3.x suporta presets:
- `cloudflare-module` (default via Lovable) ← seu caso
- `cloudflare-pages`
- `node-server` (Node.js nativo)
- `vercel` (Vercel functions)
- `aws-lambda`
- `netlify`
- etc.

---

### 6.2 TanStack Start Requer Config Especial para Vercel?

**Resposta: NÃO**

TanStack Start é agnóstico a hosting. Funciona com qualquer preset Nitro.

**MAS** Lovable's wrapper força Cloudflare.

---

### 6.3 vercel.json Está Correto?

**Resposta: SIM ✅**

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist/server",
  "installCommand": "npm install",
  "functions": {
    "dist/server/index.js": {
      "runtime": "nodejs20.x"
    }
  }
}
```

Ele diz ao Vercel:
- Build com `npm run build`
- Output em `dist/server/`
- Handler é `dist/server/index.js`
- Execute com Node.js 20

**Funciona com AMBOS os presets:**
1. Cloudflare format (Vercel adapta automaticamente)
2. Node.js format (direto)

---

## 7. SOLUÇÃO RECOMENDADA (STEPWISE)

### Fase 1: Verificar Status Atual (5 min)

```bash
# 1. Build projeto
npm run build

# 2. Verificar output
file dist/server/server.js

# 3. Testar localmente (IMPORTANTE)
npm run preview

# 4. Abrir browser
# http://localhost:5000

# 5. Verificar logs
tail -f .tanstack/tmp/server.log
```

### Fase 2: Configurar Nitro Preset (5 min)

**Opção A: Ficar em Cloudflare (simples)**

```bash
# Nada mudar, deploy direto em Vercel
# Vercel adapta automaticamente
```

**Opção B: Usar Node.js nativo (recomendado)**

```bash
# Editar vite.config.ts
# Adicionar nitro.preset = "node-server"
# Rebuild
npm run build
```

### Fase 3: Deploy em Vercel (10 min)

```bash
# 1. Push para GitHub
git add .
git commit -m "chore: prepare for Vercel deployment"
git push origin main

# 2. Conectar em Vercel
# https://vercel.com/new
# Importar repo
# Vercel detecta vercel.json

# 3. Configure env vars em Vercel project settings:
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
MP_ACCESS_TOKEN=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Fase 4: Testar Deployment (10 min)

```bash
# Deploy em preview
# Vercel auto-deploys on push

# Verificar logs:
# https://vercel.com/projects/fragranciaria/deployments

# Testar endpoints:
curl https://fragranciaria-preview.vercel.app/
curl https://fragranciaria-preview.vercel.app/version.json
```

---

## 8. REFERÊNCIAS & DOCUMENTAÇÃO

### Oficial

- [Nitro Documentation](https://nitro.unjs.io/) — Todos presets listados
- [Nitro Node.js Preset](https://nitro.unjs.io/deploy/node)
- [Nitro Vercel Preset](https://nitro.unjs.io/deploy/vercel) ← Pode usar esse!
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [TanStack Start Deployment](https://tanstack.com/start/latest/docs/framework/getting-started/setup)

### Key Files in Your Project

```
vite.config.ts          ← Nitro config (ADD nitro.preset here)
src/server.ts           ← Handler entry point
src/start.ts            ← TanStack Start instance
dist/server/index.js    ← Generated entry (auto-generated)
dist/server/server.js   ← Handler (auto-generated)
vercel.json             ← Vercel config (already correct)
.nvmrc                  ← Node version (update to 20)
```

---

## 9. CHECKLIST PRÉ-DEPLOYMENT

- [ ] Testou localmente com `npm run preview`
- [ ] Atualizou `.nvmrc` para `20`
- [ ] Atualizou `vite.config.ts` com `nitro.preset: "node-server"` (opcional)
- [ ] Fez `npm run build` sem erros
- [ ] Verificou `dist/server/` output estrutura
- [ ] Verificou `vercel.json` está correto
- [ ] Conectou repo em Vercel
- [ ] Configurou env vars em Vercel project settings
- [ ] Fez deploy de preview
- [ ] Testou endpoints em preview URL

---

## 10. CONCLUSÃO

### Situação Atual

| Aspecto | Status |
|---------|--------|
| Framework | TanStack Start ✅ |
| Bundler | Vite 7.3 ✅ |
| SSR Runtime | Nitro 3.0 (cloudflare preset) ✅ |
| vercel.json | ✅ Correto |
| Entry Point | ✅ Correto |
| Compatibilidade | ⚠️ Funciona mas com overhead |

### Recomendação

**Para Vercel:**

1. **Mínimo** (sem mudanças): Deploy direto, Vercel adapta
2. **Recomendado** (5 min): Adicionar `nitro.preset: "node-server"` em vite.config.ts
3. **Alternativa**: Usar `nitro.preset: "vercel"` (preset específico de Vercel)

### Próximos Passos

1. ✅ Ler este documento
2. 🔧 Atualizar `.nvmrc` para `20`
3. 🔧 Atualizar `vite.config.ts` com preset (opcional)
4. 🧪 Testar: `npm run build && npm run preview`
5. 🚀 Deploy: Push para GitHub + conectar Vercel

**Não há incompatibilidades bloqueantes. Deploy é seguro.** ✅

