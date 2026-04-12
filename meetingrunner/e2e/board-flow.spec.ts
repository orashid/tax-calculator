import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers';

test.describe('Board & Card Flow', () => {
  test('creates a board from dashboard', async ({ page }) => {
    await loginViaUI(page);
    await page.waitForURL('**/', { timeout: 10000 });

    // Click create board button
    const createBtn = page.getByRole('button', { name: /create|new/i });
    await createBtn.first().click();

    // Fill in board name in the modal
    const nameInput = page.locator('input').first();
    await nameInput.fill('Staff Meeting');

    // Submit the form
    const submitBtn = page.getByRole('button', { name: /create/i });
    await submitBtn.last().click();

    // Should show the board somewhere on the page
    await expect(page.locator('text=Staff Meeting').first()).toBeVisible({ timeout: 5000 });
  });

  test('navigates to board page after creating a board', async ({ page }) => {
    await loginViaUI(page);
    await page.waitForURL('**/', { timeout: 10000 });

    // Create a board
    const createBtn = page.getByRole('button', { name: /create|new/i });
    await createBtn.first().click();
    const nameInput = page.locator('input').first();
    await nameInput.fill('Test Board');
    const submitBtn = page.getByRole('button', { name: /create/i });
    await submitBtn.last().click();

    // Click on the board to navigate to it
    await page.locator('text=Test Board').first().click();
    await page.waitForURL(/\/boards\//, { timeout: 5000 });

    // Should see the board page
    await expect(page.locator('text=Test Board')).toBeVisible({ timeout: 5000 });
  });
});
