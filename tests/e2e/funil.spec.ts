import { test, expect, type Page } from "@playwright/test";

const COTAR_FRETE_SERVER_FN_ID =
  "eyJmaWxlIjoiL3NyYy9saWIvcGF5bWVudHMuZnVuY3Rpb25zLnRzP3Rzcy1zZXJ2ZXJmbi1zcGxpdCIsImV4cG9ydCI6ImNvdGFyRnJldGVfY3JlYXRlU2VydmVyRm5faGFuZGxlciJ9";

const COTACAO_E2E = {
  ok: true as const,
  cotacaoId: "11111111-1111-4111-8111-111111111111",
  opcoes: [
    {
      servicoId: 1,
      transportadora: "Correios",
      servico: "PAC",
      precoCentavos: 2500,
      prazoDias: 7,
      precoExibidoCentavos: 0,
    },
    {
      servicoId: 2,
      transportadora: "Correios",
      servico: "SEDEX",
      precoCentavos: 4500,
      prazoDias: 3,
      precoExibidoCentavos: 2000,
    },
  ],
};

async function mockCheckoutQuote(page: Page) {
  await page.route(`**/_serverFn/${COTAR_FRETE_SERVER_FN_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: COTACAO_E2E, error: null, context: {} }),
    });
  });
  await page.route("https://viacep.com.br/ws/**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        logradouro: "Rua Teste",
        bairro: "Centro",
        localidade: "São Paulo",
        uf: "SP",
      }),
    });
  });
}

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

  test("4. CEP completo dispara cotação mockada e pré-seleciona opção grátis no resumo", async ({ page }) => {
    await mockCheckoutQuote(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "fragranciaria-cart",
        JSON.stringify({
          state: {
            items: [
              {
                id: "e2e-frete::var-1",
                title: "Produto Frete",
                vendor: "Teste",
                price: 199,
                quantity: 1,
                image: "/images/logo-dark.png",
                variationName: "100ml",
              },
            ],
          },
          version: 0,
        }),
      );
    });

    await page.goto("/checkout");
    await page.waitForLoadState("networkidle");

    const cep = page.locator('input[placeholder="00000-000"]');
    await cep.click();
    await cep.pressSequentially("01310100");
    await expect(cep).toHaveValue("01310-100");

    await expect(page.getByText("Parabéns! Você ganhou frete grátis!")).toBeVisible();
    await expect(page.getByText("Correios • PAC")).toBeVisible();
    await expect(page.getByText("Correios • SEDEX")).toBeVisible();

    const pacRadio = page.locator('input[name="shipping"]').first();
    await expect(pacRadio).toBeChecked();
    await expect(page.locator("aside").getByText("Frete").locator("..").getByText("Grátis")).toBeVisible();
    await expect(page.locator("aside").getByText("R$ 199,00").last()).toBeVisible();
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

  test("6. ShippingForm com CPF inválido não avança para pagamento após cotação válida", async ({ page }) => {
    await mockCheckoutQuote(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "fragranciaria-cart",
        JSON.stringify({
          state: {
            items: [
              {
                id: "e2e-produto::var-1",
                title: "E2E",
                vendor: "Teste",
                price: 120,
                quantity: 1,
                image: "/images/logo-dark.png",
                variationName: "50ml",
              },
            ],
          },
          version: 0,
        }),
      );
    });
    await page.goto("/checkout");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Dados Pessoais")).toBeVisible();

    await page.locator('input[placeholder="seu@email.com"]').fill("teste@exemplo.com");
    await page.locator('input[placeholder="João"]').fill("E2E");
    await page.locator('input[placeholder="Silva"]').fill("Teste");
    await page.locator('input[placeholder="(00) 00000-0000"]').fill("(11) 99999-9999");
    await page.locator('input[placeholder="000.000.000-00"]').fill("111.111.111-11");

    const cep = page.locator('input[placeholder="00000-000"]');
    await cep.click();
    await cep.pressSequentially("01310100");
    await expect(cep).toHaveValue("01310-100");
    await expect(page.getByText("Correios • PAC")).toBeVisible();

    const submit = page.getByRole("button", { name: "Continuar para Pagamento" });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(submit).toBeEnabled();

    await expect(page.getByText("CPF inválido")).toBeVisible();
    await expect(page.getByText("Dados Pessoais")).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByText("Forma de Pagamento")).toHaveCount(0);
  });
});
