import { expect, type Page } from '@playwright/test';

export const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@nusantarasoft.local';
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Nusantarasoft123!';

export async function loginAsAdmin(page: Page) {
    await page.goto('/login');
    await page.getByLabel('Email').fill(E2E_ADMIN_EMAIL);
    await page.getByLabel('Password').fill(E2E_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin\//, { timeout: 30_000 });
}

export async function expectLoginPage(page: Page) {
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Nusantarasoft CMS')).toBeVisible();
}
