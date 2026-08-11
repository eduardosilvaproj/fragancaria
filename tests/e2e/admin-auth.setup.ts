import { test as setup, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import fs from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carrega .env da raiz do projeto se existir (ignite localmente).
try {
  process.loadEnvFile(new URL("../../.env", import.meta.url));
} catch {
  // .env ausente — segue com o que já estiver no ambiente (ex.: CI).
}

const STORAGE_STATE_PATH = join(__dirname, "..", "..", "tmp", "smoke-admin-storage.json");

const ADMIN_EMAIL = process.env.ADMIN_SMOKE_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_SMOKE_PASSWORD ?? "";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  "";

async function signInWithPassword(
  url: string,
  anonKey: string,
  email: string,
  password: string
): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`Login Supabase falhou (${res.status}): ${bodyText.slice(0, 500)}`);
  }
  const data = JSON.parse(bodyText);
  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

setup("autenticar admin e salvar storage state", async ({ page }) => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_SMOKE_EMAIL e ADMIN_SMOKE_PASSWORD precisam estar no ambiente para o smoke de admin."
    );
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar no ambiente para o smoke de admin."
    );
  }

  // 1. Login via API do Supabase (funciona independente de cookie httpOnly/secure).
  const { access_token, refresh_token } = await signInWithPassword(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    ADMIN_EMAIL,
    ADMIN_PASSWORD
  );

  // 2. Injeta o cookie fa_admin_session diretamente no browser.
  //    O cookie original tem secure:true, mas o teste roda em HTTP.
  //    Injetamos com secure:false para o Playwright aceitar.
  const cookieValue = encodeURIComponent(JSON.stringify({ access_token, refresh_token }));
  await page.context().addCookies([
    {
      name: "fa_admin_session",
      value: cookieValue,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // 3. Valida que a sessão funciona: navega para /admin/logistica.
  await page.goto("/admin/logistica");
  await expect(page).toHaveURL(/\/admin\/logistica/);
  await expect(page.getByRole("heading", { name: "Logística" })).toBeVisible();

  // 4. Salva o storage state.
  fs.mkdirSync(dirname(STORAGE_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
