import { test, expect } from "@playwright/test";

/**
 * Teste de guarda de URL para rotas administrativas protegidas.
 * Roda SEM autenticação.
 *
 * Deve PASSAR quando a rota exige login (redireciona para /admin-login).
 * Se FALHAR, significa que /admin/logistica ficou acessível sem autenticação —
 * o alerta certo para o CI.
 */

test("/admin/logistica sem autenticação redireciona para /admin-login", async ({ page }) => {
  const requestedPath = "/admin/logistica";
  await page.goto(requestedPath);
  await page.waitForLoadState("networkidle");

  const finalUrl = page.url();

  // Guarda de URL: a URL final deve conter /admin-login, não /admin/logistica.
  expect(finalUrl).toContain("/admin-login");
  expect(finalUrl).not.toContain("/admin/logistica");

  // Assert positivo: estamos de fato na tela de login.
  await expect(page.getByRole("heading", { name: "Painel Administrativo" })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});
