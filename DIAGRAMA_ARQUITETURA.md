# DIAGRAMA DE ARQUITETURA & COMPARAÇÃO VISUAL

---

## 1. FLUXO LOVABLE (ATUAL)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEU PROJETO LOCAL                             │
│                                                                   │
│  src/                                                             │
│  ├── routes/          ← TanStack Router pages                    │
│  ├── components/      ← React components                         │
│  ├── server.ts        ← Handler entry point                      │
│  ├── start.ts         ← TanStack Start instance                  │
│  └── ...                                                          │
│                                                                   │
│  vite.config.ts       ← Uses @lovable.dev/vite-tanstack-config  │
│  package.json         ← Dependencies                             │
│  .lovable/            ← Lovable metadata                         │
│  vercel.json          ← Ignored by Lovable                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓ git push
┌─────────────────────────────────────────────────────────────────┐
│              LOVABLE CLI (GitHub Webhook)                        │
│                                                                   │
│  1. Detecta template: tanstack_start_ts                         │
│  2. Roda: npm run build                                         │
│  3. Compila com: @lovable.dev/vite-tanstack-config              │
│     └─ Injecta Nitro com preset: "cloudflare-module"            │
│  4. Output: dist/client + dist/server                           │
│  5. Deploy em: Lovable serverless runtime                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           LOVABLE SERVERLESS RUNTIME (Edge/Cloud)               │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  Node.js 20 + Cloudflare Workers Format              │       │
│  │                                                      │       │
│  │  export default {                                  │       │
│  │    async fetch(request, env, ctx) {                │       │
│  │      // Nitro router                               │       │
│  │      // TanStack Start SSR                         │       │
│  │      // Return Response                            │       │
│  │    }                                                │       │
│  │  }                                                  │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  Environment Variables: Lovable Dashboard                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER (Client)                              │
│                                                                   │
│  Request: GET https://lovable-preview.dev/produto/123          │
│           ↓                                                      │
│           HTML + React bundle (hydrate)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Características Lovable:

```
✅ Automático: Detecta template e deploy
✅ Gerenciado: Lovable cuida infraestrutura
✅ Integrado: Lovable SDK para logs/errors
✅ Preview: Automático a cada push

❌ Opaco: Não vê exatamente onde roda
❌ Dependência: Ligado a Lovable
❌ Customização: Limitada
```

---

## 2. FLUXO VERCEL (TARGET)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEU PROJETO LOCAL                             │
│                                                                   │
│  src/                                                             │
│  ├── routes/          ← TanStack Router pages                    │
│  ├── components/      ← React components                         │
│  ├── server.ts        ← Handler entry point                      │
│  ├── start.ts         ← TanStack Start instance                  │
│  └── ...                                                          │
│                                                                   │
│  vite.config.ts       ← TanStack + Nitro config                  │
│  .nvmrc               ← Node.js 20                               │
│  package.json         ← Dependencies                             │
│  vercel.json          ← ✨ LIDO POR VERCEL ✨                    │
│  .env                 ← Local env vars                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓ git push origin main
┌─────────────────────────────────────────────────────────────────┐
│              GITHUB REPOSITORY                                   │
│                                                                   │
│  GitHub detecta webhook de Vercel                               │
│  Notifica Vercel sobre novo push                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              VERCEL BUILD SYSTEM                                 │
│                                                                   │
│  1. Lê: vercel.json                                             │
│  2. Instala: npm install (buildCommand)                         │
│  3. Compila: npm run build                                      │
│     └─ Vite + Nitro (seu preset)                                │
│  4. Output: dist/server/ (outputDirectory)                      │
│  5. Cria: Vercel Serverless Function                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         VERCEL EDGE/SERVERLESS NETWORK                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  AWS Lambda / Vercel Compute (Node.js 20)           │       │
│  │                                                      │       │
│  │  dist/server/index.js                               │       │
│  │    ├─ import handler from './server.js'             │       │
│  │    ├─ export default handler                        │       │
│  │    │                                                │       │
│  │    └─ Web Fetch API OR Express adapter              │       │
│  │       (Vercel adapta automaticamente)               │       │
│  │                                                      │       │
│  │  Nitro Router                                        │       │
│  │    ├─ Match route                                   │       │
│  │    ├─ TanStack Start SSR                            │       │
│  │    └─ Return Response (HTML/JSON)                   │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  Environment Variables: Vercel Project Settings                  │
│  Logs: Vercel Dashboard → Runtime Logs                          │
│  Monitoring: Built-in (Analytics, Alerts, etc)                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              CDN EDGE LOCATIONS                                  │
│                                                                   │
│  Static assets (dist/client/) servidos via:                     │
│  - Vercel Edge Network                                          │
│  - Cache headers (Immutable)                                    │
│  - Geo-distributed                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER (Client)                              │
│                                                                   │
│  Request: GET https://seu-dominio.vercel.app/produto/123       │
│           ↓                                                      │
│           Routed to nearest edge → Vercel Function               │
│           ↓                                                      │
│           HTML + React bundle (hydrate)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Características Vercel:

```
✅ Transparente: Vê exatamente o que roda
✅ Controlado: Você gerencia via vercel.json
✅ Escalável: Infra Vercel 24/7
✅ Integrado: GitHub + Vercel + Edge

✅ Edge Network: CDN global
✅ Analytics: Built-in
✅ Logs: Real-time via dashboard
✅ Customizável: Pleno controle
```

---

## 3. COMPARAÇÃO LADO-A-LADO

### Build Process

```
LOVABLE                              VERCEL
═════════════════════════════════════════════════════════

git push                             git push
  ↓                                    ↓
Lovable webhook                      GitHub webhook
  ↓                                    ↓
Auto-detect template                Lê vercel.json
  ↓                                    ↓
npm run build                        npm run build
(with cloudflare preset)             (seu preset)
  ↓                                    ↓
Deploy Lovable runtime               Deploy Vercel Function
```

### Configuration

```
LOVABLE                              VERCEL
═════════════════════════════════════════════════════════

.lovable/project.json                vercel.json
  ├─ schemaVersion                     ├─ version: 2
  └─ template                          ├─ buildCommand
                                       ├─ outputDirectory
                                       ├─ functions
                                       └─ env vars

.env (local only)                    Vercel Project Settings
                                     (synced automatically)
```

### Environment Variables

```
LOVABLE                              VERCEL
═════════════════════════════════════════════════════════

Lovable Dashboard                    Vercel Dashboard
  ├─ GUI                               ├─ Environment Variables
  └─ Manual management                 ├─ Production/Preview/Dev
                                       └─ Auto-synced

Unique UI                            Standard interface
Lovable-specific                     Industry standard
```

### Runtime

```
LOVABLE                              VERCEL
═════════════════════════════════════════════════════════

Lovable Serverless                   Vercel Serverless
  ├─ Node.js 20                        ├─ Node.js 20.x
  ├─ Cloudflare format                 ├─ Web Fetch API
  ├─ nodeCompat: true                  ├─ Auto-adaptor
  └─ Proprietary                       └─ AWS Lambda-based
```

### Monitoring

```
LOVABLE                              VERCEL
═════════════════════════════════════════════════════════

Lovable Dashboard                    Vercel Dashboard
  ├─ Deployment status                 ├─ Real-time logs
  └─ Error tracking                    ├─ Performance metrics
                                       ├─ Alerts
                                       └─ Analytics
```

---

## 4. MATRIZ DE DECISÃO

### Escolher Lovable se:

```
✅ Quer workflow simplificado
✅ Template detection automático
✅ Menos configuração manual
✅ Lovable SDK para logging
✅ Preview automático
✅ Não precisa de muito controle
```

### Escolher Vercel se:

```
✅ Quer máximo controle
✅ Precisa de edge networking
✅ Quer melhor observabilidade
✅ Integração GitHub nativa
✅ CDN global incluso
✅ Padrão da indústria
✅ Múltiplos ambientes (prod/preview/dev)
✅ Custom domain fácil
```

---

## 5. PRESET NITRO: VISUALIZAÇÃO

```
Seu código → Vite Builder → Nitro Compiler → Output
                                    ↓
                          ┌─────────┴─────────┐
                          │                   │
                    Preset: ?              Output format:
                          │                   │
           ┌──────────────┼──────────────┐    │
           │              │              │    │
        cloudflare-module  node-server   vercel
           │              │              │    │
           ↓              ↓              ↓    ↓
      Cloudflare      Node.js native  Vercel-opt  Web Fetch API
      format          format          format      (universal)
           │              │              │         │
           └──────────────┼──────────────┴─────────┘
                          │
                    Suporta Vercel?
                      SIM ✅ TODOS
```

---

## 6. ESTRUTURA DE OUTPUT COMPARADA

### Lovable (Atual)

```
dist/
├── client/
│   ├── assets/
│   │   ├── index-XXX.js
│   │   ├── vendor-framer-XXX.js
│   │   ├── vendor-icons-XXX.js
│   │   ├── products-data-XXX.js
│   │   └── styles-XXX.css
│   └── index.html
│
└── server/
    ├── assets/
    │   └── server-4dCxQWBc.js (Nitro compiled)
    ├── index.js (re-export)
    └── server.js (handler, 3.8KB)
       └─ format: { fetch(request, env, ctx) { } }
```

### Vercel (Target)

```
dist/
├── client/
│   └── [MESMA ESTRUTURA]
│
└── server/
    ├── index.js (entry point)
    │   └─ format: { fetch(request, env, ctx) { } }
    │      OR: (req, res) => { }
    │      OR: Vercel auto-adaptor
    │
    └── [assets e config]
```

**Diferença**: Nome do preset Nitro (resultado similar)

---

## 7. MIGRAÇÃO: VISUAL

```
LOVABLE                    MUDANÇA                      VERCEL
═════════════════════════════════════════════════════════════════════

Rodando em:
  Lovable runtime     ────────→  Vercel Functions

Detecção:
  .lovable/project.json        vercel.json
  
Config:
  Lovable Dashboard   ────────→  Project Settings
  
Preset Nitro:
  cloudflare-module   ────────→  node-server (ou vercel)
  (opcional)
  
Build:
  npm run build       ──(same)──→  npm run build
  
Output:
  dist/server/        ──(same)──→  dist/server/
  
Handler:
  Cloudflare format   ──(adapta)──→  Vercel/Node.js
  
Env Vars:
  Lovable Portal      ────────→  Vercel Project
  
Logs:
  Lovable Dashboard   ────────→  Vercel Logs
```

---

## 8. TIMELINE: LOVABLE → VERCEL

```
FASE 1: PREPARAÇÃO
  ├─ npm run build ✅
  ├─ Verificar dist/ ✅
  └─ Backup git ✅
  
  TEMPO: 5 min

FASE 2: CONFIG (OPCIONAL)
  ├─ Atualizar .nvmrc ✅
  ├─ Atualizar vite.config.ts (opcional) ✅
  └─ Commit ✅
  
  TEMPO: 5 min

FASE 3: TESTE LOCAL
  ├─ npm run build ✅
  ├─ npm run preview ✅
  └─ Browser test ✅
  
  TEMPO: 10 min

FASE 4: GITHUB
  ├─ git commit ✅
  ├─ git push ✅
  └─ Verificar repo ✅
  
  TEMPO: 2 min

FASE 5: VERCEL
  ├─ Conectar GitHub ✅
  ├─ Importar repo ✅
  ├─ Adicionar env vars ✅
  └─ Deploy ✅
  
  TEMPO: 10 min

FASE 6: TESTE PREVIEW
  ├─ Abrir preview URL ✅
  ├─ Browser test ✅
  ├─ Verificar logs ✅
  └─ Todos OK? ✅
  
  TEMPO: 5 min

─────────────────────────────────
TOTAL: ~37 minutos ✅ PRONTO!
```

---

## 9. TROUBLESHOOTING VISUAL

```
Build failed em Vercel
       ↓
Verificar logs
       ↓
    ┌──┴──┐
    │     │
    v     v
Erro de   Module not
módulo    found
    │     │
    v     v
  npm      npm install
install   [módulo]
    
    └─────┬─────┘
          v
      git push
          v
    Vercel
   redeploy


502 Bad Gateway
       ↓
Verificar
env vars
       ↓
    ┌──┴──┐
    │     │
    v     v
Falta   URL
var     inválida
    │     │
    v     v
Adicionar  Corrigir
em Vercel  URL
    
    └─────┬─────┘
          v
       Redeploy
          v
       Teste
```

---

## 10. CHECKLIST VISUAL

```
┌─────────────────────────────────────────────┐
│         PRÉ-MIGRAÇÃO VERCEL                 │
├─────────────────────────────────────────────┤
│ ☐ npm run build → SUCCESS                   │
│ ☐ dist/server/ → EXISTS                     │
│ ☐ Git status → CLEAN                        │
│ ☐ vercel.json → EXISTS                      │
│ ☐ .env → POPULATED                          │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│         CONFIG (OPCIONAL)                   │
├─────────────────────────────────────────────┤
│ ☐ .nvmrc → 20                               │
│ ☐ vite.config.ts → nitro.preset             │
│ ☐ Commit → git push                         │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│         VERCEL SETUP                        │
├─────────────────────────────────────────────┤
│ ☐ Repo → Conectado                          │
│ ☐ vercel.json → Detectado                   │
│ ☐ Env vars → Adicionadas (5)                │
│ ☐ Build → SUCCESS                           │
└─────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────┐
│         VALIDAÇÃO                           │
├─────────────────────────────────────────────┤
│ ☐ Preview URL → 200 OK                      │
│ ☐ Console → NO ERRORS                       │
│ ☐ Features → WORKING                        │
│ ☐ Logs → NO 500s                            │
└─────────────────────────────────────────────┘
         ↓
         ✅ PRONTO PARA PRODUÇÃO
```

---

**Diagrama criado em**: 2026-06-27  
**Para**: FRAGRANCIARIA Migration Guide
