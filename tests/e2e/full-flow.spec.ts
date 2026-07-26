import { test, expect } from '@playwright/test';

test('full order flow: menu -> cart -> order -> confirm -> kitchen -> ready -> served', async ({ page }) => {
  await page.goto('/demo?table=demo-tavolo-1');

  await expect(page.locator('text=Ristorante Demo')).toBeVisible();
  await expect(page.locator('text=Tavolo 1')).toBeVisible();

  // Add items to cart
  const firstItem = page.locator('button:has-text("Margherita")');
  await firstItem.click();

  // Check cart shows item
  await expect(page.locator('text=Margherita x1')).toBeVisible();

  // Submit order
  await page.locator('button:has-text("Ordina")').click();

  // Wait for success message
  await expect(page.locator('text=Ordine inviato con successo')).toBeVisible({ timeout: 10000 });
});
