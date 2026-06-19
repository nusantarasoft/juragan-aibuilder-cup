import { expect, type Page } from '@playwright/test';

export const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@nusantarasoft.local';
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Nusantarasoft123!';

export async function loginAsAdmin(page: Page) {
    await page.goto('/login');
    await page.fill('input[type="email"]', E2E_ADMIN_EMAIL);
    await page.fill('input[type="password"]', E2E_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin\//, { timeout: 20_000 });
}

export async function expectLoginPage(page: Page) {
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h2', { hasText: 'Sign in to Nusantarasoft' })).toBeVisible();
}
