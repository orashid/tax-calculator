import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers';

test.describe('Help Page', () => {
  test('navigates to help page', async ({ page }) => {
    await loginViaUI(page);
    await page.waitForURL('**/', { timeout: 10000 });

    // Navigate to help via the nav
    const helpLink = page.locator('a[href="/help"]').or(page.locator('a:has-text("Help")'));
    await helpLink.first().click();
    await expect(page).toHaveURL(/\/help/, { timeout: 5000 });

    // Should have help content
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
  });
});
