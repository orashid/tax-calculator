import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers';

test.describe('Authentication', () => {
  test('shows login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs in with valid credentials', async ({ page }) => {
    await loginViaUI(page);
    await page.waitForURL('**/', { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    // Should stay on login page and show error message
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=Invalid').or(page.locator('text=failed').or(page.locator('text=error')))).toBeVisible({ timeout: 10000 });
  });
});
