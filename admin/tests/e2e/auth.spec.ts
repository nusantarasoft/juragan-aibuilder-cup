import { test, expect } from '@playwright/test';
import { expectLoginPage, loginAsAdmin } from './helpers/auth';

test.describe('Authentication', () => {
  test('should redirect to login if unauthenticated', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expectLoginPage(page);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible({ timeout: 15_000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@nusantarasoft.local');
    await page.fill('input[type="password"]', 'wrong-password');
    await page.click('button[type="submit"]');

    await expect(page.locator('.ant-alert-error, [role="alert"]')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
