import { expect, type Page } from '@playwright/test';

export const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@nusantarasoft.local';
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Nusantarasoft123!';

export async function loginAsAdmin(page: Page) {
    // Stale PWA precache must not intercept chunk loads during long route crawls.
    await page.addInitScript(() => {
        void navigator.serviceWorker?.getRegistrations().then((regs) => {
            regs.forEach((r) => void r.unregister());
        });
    });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const email = page.getByLabel('Email');
    await expect(email).toBeVisible({ timeout: 60_000 });
    await email.fill(E2E_ADMIN_EMAIL);
    await page.getByLabel('Password').fill(E2E_ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin\//, { timeout: 30_000 });
    await page.waitForFunction(() => !!localStorage.getItem('auth_access_token'), null, { timeout: 15_000 });
}

export async function expectLoginPage(page: Page) {
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Nusantarasoft CMS')).toBeVisible();
}
