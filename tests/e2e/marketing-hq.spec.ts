import { test, expect } from '@playwright/test';

test.describe('Marketing HQ Data Contract & Tracking Flow', () => {
  test('1. Abre o site e verifica se o tracking inicializa', async ({ page }) => {
    await page.goto('/');

    // Verificar se o localStorage recebe o anonymous_id
    const anonymousId = await page.evaluate(() => localStorage.getItem('marketing_anonymous_id'));
    expect(anonymousId).toBeTruthy();
  });

  test('2. Visita um produto e simula adição ao carrinho', async ({ page }) => {
    await page.goto('/produtos');

    // Clicar no primeiro produto disponível
    const firstProduct = page.locator('a[href^="/produto/"]').first();
    if (await firstProduct.count() > 0) {
      await firstProduct.click();
      await expect(page).toHaveURL(/\/produto\//);

      // Verificar se o botão de adicionar ao carrinho existe e clicar
      const addToCartButton = page.locator('button:has-text("Adicionar ao Carrinho")');
      if (await addToCartButton.count() > 0) {
        await addToCartButton.click();
        // Verificar toast ou feedback
        await expect(page.locator('text=Adicionado ao carrinho')).toBeVisible();
      }
    }
  });

  test('3. Painel Admin exibe Analytics e botões de Exportação/Sincronização', async ({ page }) => {
    // Ir direto para a página de analytics do admin (pode exigir login dependendo do ambiente)
    await page.goto('/admin/analytics');

    // Verificar título da página
    await expect(page.locator('h1')).toContainText(/Analytics Avançado/i);

    // Verificar presença dos botões do Marketing HQ
    await expect(page.locator('button:has-text("Exportar para Marketing HQ")')).toBeVisible();
    await expect(page.locator('button:has-text("Sincronizar Marketing HQ")')).toBeVisible();

    // Verificar seções do funil e fontes de tráfego
    await expect(page.locator('text=Funil de Conversão')).toBeVisible();
    await expect(page.locator('text=Fontes de Tráfego')).toBeVisible();
  });
});
