# FRAGRANCIARIA Project Analysis - TanStack Start + Vite Structure

## 1. PROJECT TYPE & FRAMEWORK

### CONFIRMED: TanStack Start + Vite (NOT Next.js)
- Framework Stack: TanStack Start + React 19 + Vite 7.3
- Router: TanStack Router v1.168
- Build Tool: Vite (bundler), Nitro (SSR server)
- Template: Lovable template tanstack_start_ts_2026-06-08

### Key Framework Files
- src/router.tsx → TanStack Router configuration
- src/routeTree.gen.ts → Auto-generated route tree
- src/start.ts → TanStack Start instance creation (error middleware)
- src/server.ts → Server entry point (error wrapper + version.json handler)
- vite.config.ts → Vite config using @lovable.dev/vite-tanstack-config

### @lovable.dev/vite-tanstack-config (v2.5.3)
This is the magic wrapper that auto-includes:
- tanstackStart plugin (SSR handling)
- viteReact (React compiler)
- tailwindcss v4.2.1
- tsConfigPaths (@ alias resolution)
- nitro plugin (build-only, uses Cloudflare as default target)
- Component tagger (dev-only)
- Error logger plugins
- VITE_* env injection
- React/TanStack deduplication

### Build Output Structure
dist/
  client/ → Static browser bundle + assets
  server/ → Nitro SSR server (Node.js compatible)
    index.js → Export re-router
    server.js → Main server handler (3.8KB)

Build Stats: 43MB total (includes large dependencies)
Build Script: vite build && node scripts/create-index.mjs

---

## 2. CURRENT DEPLOYMENT SETUP

### Current Hosting: LOVABLE (Lovable.dev)
- Uses Lovable's deployment infrastructure
- Error reporting through Lovable SDK
- Automatic preview deployments

### vercel.json (ALREADY CONFIGURED CORRECTLY)
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist/server",
  "installCommand": "npm install",
  "framework": null,
  "functions": {
    "dist/server/index.js": {
      "runtime": "nodejs20.x"
    }
  }
}

Status:
✓ Points to dist/server as output
✓ Routes dist/server/index.js to Node.js 20 runtime
✓ framework: null (custom Nitro framework)
✓ Correct build command

---

## 3. API FUNCTIONS & SERVER-SIDE CODE

### API Pattern: TanStack Start createServerFn (NOT traditional /api routes)
- Pattern: createServerFn from @tanstack/react-start
- RPC-style server functions callable from client
- Server-only imports are tree-shaken from client bundle

### Server Function Files
src/lib/api/
  example.functions.ts → Example: getGreeting()
  
src/lib/
  payments.functions.ts → createPayment() - Mercado Pago integration
  
src/integrations/supabase/
  client.server.ts → Admin Supabase client

### Key Server Function: createPayment()
Location: src/lib/payments.functions.ts

Purpose:
- Accept payment data from checkout form
- Call Mercado Pago API
- Save order to Supabase database
- Return payment result (PIX QR code, Boleto URL, etc.)

Methods Supported: pix, boleto, credit_card

Environment Variables:
- MP_ACCESS_TOKEN → Mercado Pago API token
- SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → Supabase admin client

### Legacy /api Directory (NOT USED)
Contains old Vercel function files (deprecated):
- create-payment.ts
- payment-status.ts
- payment.ts
- webhook.ts

---

## 4. DEPLOYMENT DIFFERENCES

### Lovable.dev (Current)
- Proprietary deployment platform
- Auto-deploys from repo (git-based)
- Built on Vercel infrastructure but Lovable-managed
- Environment variables via Lovable dashboard
- Error reporting through Lovable SDK

### Vercel (Target)
- Direct Node.js 20 function execution
- Uses vercel.json configuration
- Environment variables via Vercel project settings
- GitHub/GitLab/Bitbucket integration for CI/CD

### How TanStack Start Deploys

On Lovable:
1. Lovable CLI detects project template
2. Runs npm run build
3. Deploys to Lovable's serverless runtime

On Vercel:
1. Vercel detects vercel.json
2. Runs build command: npm run build
3. Outputs to dist/server/
4. Creates serverless function from dist/server/index.js
5. Routes all requests to that function (SSR)

---

## 5. ENVIRONMENT VARIABLES

### Required Variables

Frontend (VITE_* = included in client bundle):
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_SUPABASE_PUBLISHABLE_KEY

Backend (Server-only, NOT in client bundle):
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- MP_ACCESS_TOKEN

---

## 6. SUMMARY

| Aspect | Value |
|--------|-------|
| Framework | TanStack Start + React 19 |
| Bundler | Vite 7.3 |
| SSR Runtime | Nitro 3.0 |
| Node.js Target | 20.x |
| API Pattern | createServerFn RPC-style |
| Current Host | Lovable.dev |
| Target Host | Vercel |
| Build Output | dist/server/ |
| Entry Point | dist/server/index.js |
| Build Size | 43MB |

---

## 7. MIGRATION STATUS

Already Done:
✓ vercel.json is correctly configured
✓ Build output structure is correct
✓ Server entry point is correct

Next Steps:
1. Set environment variables in Vercel project settings
2. Connect GitHub repo to Vercel
3. Configure preview vs production deployments
4. Test preview deployment
5. Monitor logs for issues

