import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Guarda o P1 de `supabaseAdmin` com filtro manual (ver relatorio-auditoria-fase4.md,
// item 2 de "OS 3 PRIMEIROS"): cria 2 contas reais + 1 pedido do cliente A, loga
// como cliente B e confirma que B não acessa o pedido de A nem por listagem
// nem por URL direta. Roda contra o Supabase de produção (não há projeto de
// teste separado); setup/teardown criam e removem tudo via service role key.

try {
  process.loadEnvFile(new URL("../../.env", import.meta.url));
} catch {
  // .env ausente — segue com o que já estiver no ambiente (ex.: CI).
}

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no ambiente para rodar isolamento-usuarios.spec.ts"
  );
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TEST_PASSWORD = "e2e-isolamento-teste-2026!";
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const userAEmail = `e2e-isolamento-a-${runId}@fragranciaria-test.invalid`;
const userBEmail = `e2e-isolamento-b-${runId}@fragranciaria-test.invalid`;

let userAId: string;
let userBId: string;
let orderId: string;

test.describe("Isolamento entre usuários (supabaseAdmin com filtro manual)", () => {
  test.beforeAll(async () => {
    const { data: userA, error: errA } = await admin.auth.admin.createUser({
      email: userAEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (errA || !userA?.user) throw new Error(`Falha ao criar usuário A: ${errA?.message}`);
    userAId = userA.user.id;

    const { data: userB, error: errB } = await admin.auth.admin.createUser({
      email: userBEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (errB || !userB?.user) throw new Error(`Falha ao criar usuário B: ${errB?.message}`);
    userBId = userB.user.id;

    const { data: order, error: errOrder } = await admin
      .from("orders")
      .insert({
        auth_user_id: userAId,
        customer_email: userAEmail,
        customer_name: "E2E Isolamento A",
        status: "paid",
        payment_status: "approved",
        total: 199.9,
        items: [{ id: "e2e-isolamento", title: "Produto Isolamento", quantity: 1, price: 199.9 }],
      })
      .select("id")
      .single();
    if (errOrder || !order) throw new Error(`Falha ao criar pedido de teste: ${errOrder?.message}`);
    orderId = order.id;
  });

  test.afterAll(async () => {
    if (orderId) await admin.from("orders").delete().eq("id", orderId);
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  });

  test("cliente B não vê pedido do cliente A na listagem nem por URL direta", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: "visible" });
    await emailInput.fill(userBEmail);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);

    const [signInResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/auth/v1/token"), { timeout: 10_000 }),
      page.getByRole("button", { name: "Entrar" }).click(),
    ]);
    if (!signInResponse.ok()) {
      const body = await signInResponse.text().catch(() => "<sem corpo>");
      throw new Error(`Login falhou (${signInResponse.status()}): ${body}`);
    }

    await page.waitForURL(/\/minha-conta\/pedidos/, { timeout: 10_000 });

    // Listagem: pedido de A não pode aparecer para B.
    await expect(page.getByText("Produto Isolamento")).toHaveCount(0);
    await expect(page.getByText("R$ 199,90")).toHaveCount(0);

    // Acesso direto pela URL: B não deve conseguir ver detalhe do pedido de A.
    await page.goto(`/minha-conta/pedidos/${orderId}`);
    await expect(page.getByText("Produto Isolamento")).toHaveCount(0);
  });
});
