import { test, expect } from '@playwright/test';
import path from 'path';

const SHOT_DIR =
    process.env.UI_WAVE1_MEDIA_DIR || path.join(process.cwd(), '../.gstack/qa-reports/screenshots');

test.describe.configure({ timeout: 180_000 });

test.describe('UI wave 1 — VO agent inspector (after)', () => {
    test('Service Desk shows queue copy; Kasir shows WA metrics + connect link', async ({ page }) => {
        const shot = (name: string) => page.screenshot({ path: path.join(SHOT_DIR, name), fullPage: true });

        const email = `uiw1-${Date.now()}@example.com`;
        const password = 'Password123!';
        const storeName = `Wave1 ${Date.now().toString().slice(-4)}`;

        await page.goto('/register');
        await page.getByPlaceholder('Warung Bahagia').fill(storeName);
        await page.getByPlaceholder('owner@example.com').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: /Buat akun trial/i }).click();
        await page.waitForURL((url) => url.pathname === '/admin/virtual-office', { timeout: 90_000 });

        await page.goto('/admin/recruit');
        const recruitButtons = page.getByRole('button', { name: /Rekrut sekarang/i });
        await recruitButtons.first().click();
        await page.waitForURL((url) => url.pathname === '/admin/connect-wa', { timeout: 90_000 });

        await page.goto('/admin/recruit');
        await recruitButtons.first().click();
        await page.waitForURL((url) => url.pathname === '/admin/virtual-office', { timeout: 90_000 });
        await expect(page.getByText('Service Desk').first()).toBeVisible({ timeout: 90_000 });

        await page.getByRole('button', { name: /Service Desk Live Idle/i }).click();
        const inspector = page.locator('aside').filter({ hasText: 'Current task' });
        await expect(inspector.getByText(/queued/i)).toBeVisible({ timeout: 30_000 });
        await expect(inspector.getByText(/UMKM Kasir metrics/i)).toHaveCount(0);
        await expect(inspector.getByText(/Kasir UMKM · metrik WA/i)).toHaveCount(0);
        await shot('ui-wave-1-vo-inspector-servicedesk-after.png');

        await page.getByRole('button', { name: /Kasir UMKM Live/i }).click();
        await expect(inspector.getByText(/Hubungkan \/ kelola WhatsApp/i)).toBeVisible({ timeout: 30_000 });
        await expect(inspector.getByText(/Kasir UMKM · metrik WA/i)).toBeVisible();
        await shot('ui-wave-1-vo-inspector-kasir-after.png');
    });
});
