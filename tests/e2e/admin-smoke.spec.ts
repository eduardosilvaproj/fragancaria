import { test, expect } from "@playwright/test";

/**
 * Smoke de rotas administrativas protegidas.
 *
 * Proteções contra falso-positivo em redirecionamento para login:
 *   1. Guarda de URL: compara URL final com a rota solicitada e aborta se divergir.
 *   2. Assert positivo obrigatório: exige ao menos um elemento exclusivo da página.
 *   3. Login via storage state: credenciais lidas de ADMIN_SMOKE_EMAIL / ADMIN_SMOKE_PASSWORD;
 *      estado salvo em tmp/ e ignorado pelo git.
 *
 * Este arquivo roda no projeto "chromium" que depende do "setup".
 * O teste isolado sem autenticação está em admin-guarda.spec.ts (projeto "no-auth").
 */

test.use({ storageState: "tmp/smoke-admin-storage.json" });

test.describe("Smoke admin protegido (autenticado)", () => {
  test("/admin/logistica carrega com guarda de URL e assert positivo", async ({ page }) => {
    const requestedPath = "/admin/logistica";
    await page.goto(requestedPath);

    // 1. Guarda de URL final vs rota solicitada.
    await page.waitForLoadState("networkidle");
    const finalUrl = page.url();
    if (!finalUrl.includes(requestedPath)) {
      throw new Error(
        `Guarda de URL: rota solicitada ${requestedPath} divergiu para ${finalUrl}`
      );
    }

    // 2. Assert positivo obrigatório: elementos que só existem quando a página
    //    carrega de verdade (não na tela de login).
    await expect(page.getByRole("heading", { name: "Logística" })).toBeVisible();
    await expect(page.getByText("Imprimir Etiquetas").first()).toBeVisible();
    await expect(page.getByText("Envios").first()).toBeVisible();
  });
});
