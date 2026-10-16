import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe.configure({ timeout: 90_000 });

test.describe('UI wave 3 — admin buttons & honesty', () => {
    test('dataset embed MinIO refresh is wired', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/datasets/minio', { waitUntil: 'domcontentloaded' });
        const refresh = page.locator('button[title="Refresh page"]');
        await expect(refresh).toBeVisible({ timeout: 30_000 });
    });

    test('BMS shows live or sample honesty banner', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/bms', { waitUntil: 'domcontentloaded' });
        const live = page.getByText('Live facility data');
        const sample = page.getByText('Sample facility data');
        await expect(live.or(sample)).toBeVisible({ timeout: 30_000 });
        const mediaDir = process.env.UI_WAVE3_MEDIA_DIR;
        if (mediaDir) {
            await page.screenshot({ path: `${mediaDir}/ui-wave-3-bms-honesty-after.png`, fullPage: true });
        }
    });

    test('SCADA overview refresh loads honesty banner', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/scada', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('button', { name: 'Refresh' }).first()).toBeVisible({ timeout: 30_000 });
        const live = page.getByText('Live SCADA data');
        const sample = page.getByText('Sample SCADA data');
        await expect(live.or(sample)).toBeVisible();
    });

    test('SCADA trends export CSV button responds', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/scada/trends', { waitUntil: 'domcontentloaded' });
        const exportBtn = page.getByRole('button', { name: 'Export CSV' });
        await expect(exportBtn).toBeVisible({ timeout: 30_000 });
        await exportBtn.click();
        await expect(page.getByText(/Trend CSV exported/i)).toBeVisible({ timeout: 10_000 });
    });
});
