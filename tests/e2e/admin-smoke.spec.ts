import { test, expect, Page } from "@playwright/test";

/**
 * Smoke de rotas administrativas protegidas.
 */

async function checkAdminRoute(page: Page, requestedPath: string, expectedHeading: string) {
  await page.goto(requestedPath);
  await page.waitForLoadState("networkidle");
  const finalUrl = page.url();
  if (!finalUrl.includes(requestedPath)) {
    throw new Error(
      `Guarda de URL: rota solicitada ${requestedPath} divergiu para ${finalUrl}`
    );
  }
  await expect(page.getByRole("heading", { name: expectedHeading })).toBeVisible();
}

test.describe("Smoke Admin", () => {
  test.use({ storageState: "tmp/admin-auth.json" });

  test("carrega dashboard", async ({ page }) => {
    await checkAdminRoute(page, "/admin", "Usuários Admin");
  });

  test("carrega NF-e", async ({ page }) => {
    await checkAdminRoute(page, "/admin/nfe", "Nota Fiscal");
  });
});
