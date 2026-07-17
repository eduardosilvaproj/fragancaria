import { test, expect } from "@playwright/test";

// E2E do funil de venda contra o dev server local (playwright.config.ts
// aponta baseURL para http://localhost:8080). Não testa contra produção
// para não criar pedidos reais / disparar emails / acionar webhook do MP.
//
// Cobre só o que é observável sem credenciais sandbox do Mercado Pago.
// Cenários que exigem cartão/PIX sandbox aprovado, webhook MP e duas
// contas logadas estão documentados em "Cenários bloqueados" no relatório
// da Fase 3 — não têm teste automatizado aqui.

test.describe("Funil observável (sem MP sandbox)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem("fragranciaria-cart");
      window.localStorage.removeItem("fragranciaria-checkout");
    });
  });

  test("1. Carrinho vazio redireciona para fora de /checkout", async ({ page }) => {
    await page.goto("/checkout");
    await page.waitForURL((url) => !url.pathname.startsWith("/checkout"), { timeout: 5000 });
  });

  test("2. Comprar Agora em produto leva ao /checkout com item no carrinho", async ({ page }) => {
    await page.goto("/produtos");
    await expect(page.locator("h1")).toBeVisible();
    const firstProductLink = page.locator('a[href*="/produto/"]').first();
    await firstProductLink.click();
    await page.waitForURL(/\/produto\//);
    const buyNowButton = page.getByRole("button", { name: "Comprar Agora" });
    await expect(buyNowButton).toBeVisible();
    await buyNowButton.click();
    await page.waitForURL(/\/checkout$/);
    await expect(page.getByRole("heading", { name: "Finalizar Compra" })).toBeVisible();
    await expect(page.getByText("Dados Pessoais")).toBeVisible();
  });

  test("3. Carrinho recalcula quantidade e Finalizar Compra leva ao checkout", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "fragranciaria-cart",
        JSON.stringify({
          state: {
            items: [
              {
                id: "e2e-produto",
                title: "Produto E2E",
                vendor: "Teste",
                price: 20,
                quantity: 1,
                image: "/images/logo-dark.png",
              },
            ],
          },
          version: 0,
        }),
      );
    });
    await page.goto("/carrinho");
    await expect(page.getByText("Produto E2E")).toBeVisible();
    await expect(page.getByText("R$ 20,00").last()).toBeVisible();

    const itemRow = page.getByRole("heading", { name: "Produto E2E" }).locator("xpath=../../..");
    await itemRow.getByRole("button").nth(1).click();
    await expect(page.getByText("R$ 40,00").last()).toBeVisible();

    await page.getByRole("button", { name: "Finalizar Compra" }).click();
    await page.waitForURL(/\/checkout$/);
    await expect(page.getByRole("heading", { name: "Finalizar Compra" })).toBeVisible();
  });

  test("4. Checkout cobra frete em 198,99 e exibe frete grátis em 199,00", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "fragranciaria-cart",
        JSON.stringify({
          state: {
            items: [{ id: "e2e-frete", title: "Produto Frete", price: 198.99, quantity: 1 }],
          },
          version: 0,
        }),
      );
    });
    await page.goto("/checkout");
    await page.locator('input[placeholder="00000-000"]').fill("01310100");
    await page.waitForTimeout(300);
    await expect(page.getByText("R$ 18,90")).toBeVisible();

    await page.evaluate(() => {
      const raw = window.localStorage.getItem("fragranciaria-cart");
      const parsed = JSON.parse(raw!);
      parsed.state.items[0].price = 199;
      window.localStorage.setItem("fragranciaria-cart", JSON.stringify(parsed));
    });
    await page.reload();
    await page.locator('input[placeholder="00000-000"]').fill("01310100");
    await page.waitForTimeout(300);
    await expect(page.getByText("Grátis").first()).toBeVisible();
  });

  test("5. Drawer do carrinho delega frete e descontos ao checkout", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "fragranciaria-cart",
        JSON.stringify({
          state: {
            items: [{ id: "e2e-drawer", title: "Produto Drawer", price: 120, quantity: 1 }],
          },
          version: 0,
        }),
      );
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Carrinho" }).click();
    await expect(page.getByText("Frete e descontos calculados no checkout")).toBeVisible();
    await expect(page.getByText("Código do cupom")).toHaveCount(0);
    await page.getByRole("link", { name: "Finalizar Compra" }).click();
    await page.waitForURL(/\/checkout$/);
    await expect(page.getByText("Dados Pessoais")).toBeVisible();
  });

  test("6. ShippingForm com CPF inválido não avança para pagamento", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "fragranciaria-cart",
        JSON.stringify({
          state: { items: [{ id: "e2e-produto", title: "E2E", price: 20, quantity: 1 }] },
          version: 0,
        }),
      );
    });
    await page.goto("/checkout");
    await expect(page.getByText("Dados Pessoais")).toBeVisible();

    await page.locator('input[placeholder="seu@email.com"]').fill("teste@exemplo.com");
    await page.locator('input[placeholder="João"]').fill("E2E");
    await page.locator('input[placeholder="Silva"]').fill("Teste");
    await page.locator('input[placeholder="(00) 00000-0000"]').fill("(11) 99999-9999");
    await page.locator('input[placeholder="000.000.000-00"]').fill("111.111.111-11"); // CPF inválido (todos dígitos iguais)
    await page.locator('input[placeholder="00000-000"]').fill("01310100");
    await page.locator('input[placeholder="Rua, Avenida, etc."]').fill("Rua Teste");
    await page.locator('input[placeholder="123"]').fill("100");
    await page.locator('input[placeholder="Centro"]').fill("Centro");
    await page.locator('input[placeholder="São Paulo"]').fill("São Paulo");
    await page.locator("select").selectOption("SP");

    const submit = page.getByRole("button", { name: "Continuar para Pagamento" });
    await submit.click();
    await page.waitForTimeout(500);
    await expect(page.getByText("Dados Pessoais")).toBeVisible();
  });
});
