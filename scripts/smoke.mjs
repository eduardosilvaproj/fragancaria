#!/usr/bin/env node
/**
 * smoke.mjs — Smoke test com Playwright para qualquer rota do projeto.
 *
 * Uso:
 *   node scripts/smoke.mjs --route /carrinho
 *   node scripts/smoke.mjs --route /admin/logistica --cookie '{"access_token":"...","refresh_token":"..."}'
 *   node scripts/smoke.mjs --route /checkout --checks '[{"name":"Titulo","expect":"Finalizar Compra"},{"name":"Frete","expect":"Frete"}]'
 *
 * Flags:
 *   --route   Rota a testar (obrigatório)
 *   --port    Porta fixa (opcional, padrão 9876, auto-incrementa se ocupada)
 *   --checks  JSON array de {name, expect} — texto a buscar no body
 *   --cookie  JSON com {access_token, refresh_token} para sessão admin
 *   --screenshot-only  Só tira screenshot, não faz asserts
 *
 * Saída:
 *   tmp/smoke-<slug-da-rota>-<timestamp>.png  (screenshot)
 *   Exit code 0 = todos os checks passaram
 *   Exit code 1 = algum check falhou ou erro
 *
 * Dependências: @playwright/test (já devDependency do projeto)
 */

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// ── Help ──────────────────────────────────────────────────────────────────
const HELP = `Uso: node scripts/smoke.mjs --route <path> [opcoes]

Obrigatório:
  --route   Rota a testar (ex: /carrinho, /checkout, /admin/logistica)

Opcoes:
  --port    Porta do dev server (padrao: 9876, auto-incrementa se ocupada)
  --checks  JSON array de {name, expect} (ex: '[{"name":"Titulo","expect":"Carrinho"}]')
            Padrao: verifica se a rota carregou (HTTP 200, sem erro 500)
  --cookie  JSON com {access_token, refresh_token} para autenticar admin
  --screenshot-only  So tira screenshot, sem asserts
  --help     Mostra esta mensagem

Exemplos:
  node scripts/smoke.mjs --route /carrinho
  node scripts/smoke.mjs --route /checkout --checks '[{"name":"Frete","expect":"Frete"}]'
  node scripts/smoke.mjs --route /admin/logistica --cookie '{"access_token":"x","refresh_token":"y"}'
`;

// ── Parse args ─────────────────────────────────────────────────────────────
const BOOLEAN_FLAGS = new Set(["screenshot-only", "help"]);
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === "--help") { console.log(HELP); process.exit(0); }
  if (a.startsWith("--")) {
    const eqIdx = a.indexOf("=");
    let key, val;
    if (eqIdx !== -1) {
      key = a.slice(2, eqIdx);
      val = a.slice(eqIdx + 1);
    } else {
      key = a.slice(2);
      if (BOOLEAN_FLAGS.has(key)) { args[key] = true; continue; }
      val = process.argv[++i];
      if (val === undefined) { console.error(`Falta valor para ${a}`); process.exit(1); }
    }
    try { args[key] = JSON.parse(val); } catch { args[key] = val; }
  }
}

if (!args.route) {
  console.error("ERRO: --route é obrigatório");
  console.log(HELP);
  process.exit(1);
}
// Normaliza rota: se o bash expandiu / para caminho Windows, extrai só a rota
let route = String(args.route);
if (route.includes(":")) {
  // Veio como caminho absoluto Windows — extrai a parte após o último \
  const parts = route.split(/[\\/]/);
  route = "/" + parts.filter(p => p && !p.includes(":")).join("/");
}
if (!route.startsWith("/")) route = "/" + route;
// Se depois da normalização ainda parece caminho de arquivo, assume "/"
if (route.length > 100 || route.includes("Program Files") || route.includes("Users")) {
  route = "/";
}

// ── Config ─────────────────────────────────────────────────────────────────
const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)), ".");
const TMP_DIR = path.join(ROOT, "tmp");
const ROUTE = args.route;
const PORT = args.port ?? 9876;
const CHECKS = args.checks ?? [{ name: "Rota carregou", expect: "200" }];
const COOKIE = args.cookie ?? null;
const SCREENSHOT_ONLY = args.screenshot_only ?? false;

const ROUTE_SLUG = ROUTE.replace(/[^a-z0-9]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "root";
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-");
const SCREENSHOT_PATH = path.join(TMP_DIR, `smoke-${ROUTE_SLUG}-${TIMESTAMP}.png`);

function log(...m) { console.log(`[${new Date().toISOString()}]`, ...m); }

// ── Find free port ──────────────────────────────────────────────────────────
async function findFreePort(start) {
  for (let p = start; p < start + 100; p++) {
    try {
      await new Promise((resolve, reject) => {
        const srv = createServer();
        srv.on("error", reject);
        srv.listen(p, "127.0.0.1", () => { srv.close(); resolve(); });
      });
      return p;
    } catch {}
  }
  throw new Error(`Nenhuma porta livre entre ${start} e ${start + 99}`);
}

// ── Wait for server ────────────────────────────────────────────────────────
async function waitForServer(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {}
    await sleep(1000);
  }
  throw new Error("Dev server não subiu a tempo");
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const freePort = await findFreePort(PORT);
  const baseUrl = `http://localhost:${freePort}`;
  log(`Porta livre: ${freePort}, rota: ${ROUTE}`);

  log("Iniciando dev server...");
  const dev = spawn("npx", ["vite", "dev", "--port", String(freePort), "--host"], {
    cwd: ROOT,
    shell: true,
    stdio: "pipe",
  });

  let devOutput = "";
  dev.stdout.on("data", (d) => { devOutput += d.toString(); });
  dev.stderr.on("data", (d) => { devOutput += d.toString(); });

  try {
    await waitForServer(baseUrl);
    log("Dev server pronto");

    log("Abrindo Chromium...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

    // Injeta cookie de sessão admin se fornecido
    if (COOKIE) {
      await context.addCookies([{
        name: "fa_admin_session",
        value: JSON.stringify(COOKIE),
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      }]);
      log("Cookie de sessão admin injetado");
    }

    const page = await context.newPage();

    log(`Navegando para ${ROUTE}...`);
    const response = await page.goto(`${baseUrl}${ROUTE}`, {
      waitUntil: "load",
      timeout: 60000,
    });
    log(`HTTP ${response?.status()}, URL: ${page.url()}`);

    // Aguarda renderização JS assíncrona
    try {
      await page.waitForLoadState("networkidle", { timeout: 20000 });
    } catch {
      log("Aviso: networkidle nao atingiu em 20s, continuando");
    }
    await sleep(2000);

    // Screenshot
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    const sz = fs.statSync(SCREENSHOT_PATH).size;
    log(`Screenshot: ${SCREENSHOT_PATH} (${sz} bytes)`);

    if (SCREENSHOT_ONLY) {
      log("Modo screenshot-only, pulando asserts");
      await browser.close();
      return;
    }

    // Checks
    const bodyText = await page.locator("body").innerText({ timeout: 10000 });
    const statusCode = response?.status() ?? 0;

    log("--- Checks ---");
    let failed = 0;
    for (const c of CHECKS) {
      let ok;
      if (c.expect === "200") {
        ok = statusCode === 200;
      } else if (c.expect === "!200") {
        ok = statusCode !== 200;
      } else if (c.expect.startsWith("!")) {
        ok = !bodyText.includes(c.expect.slice(1));
      } else {
        ok = bodyText.includes(c.expect);
      }
      log(`${ok ? "✅" : "❌"} ${c.name}: esperava "${c.expect}"`);
      if (!ok) failed++;
    }
    log("-------------");

    await browser.close();

    if (failed > 0) {
      log(`${failed} check(s) falharam. Screenshot: ${SCREENSHOT_PATH}`);
      process.exit(1);
    }
    log("Smoke passou.");
  } catch (err) {
    log("ERRO:", err.message);
    console.error(err);
    process.exit(1);
  } finally {
    log("Parando dev server...");
    dev.kill("SIGTERM");
    await sleep(2000);
    if (!dev.killed) dev.kill("SIGKILL");
  }
}

main();
