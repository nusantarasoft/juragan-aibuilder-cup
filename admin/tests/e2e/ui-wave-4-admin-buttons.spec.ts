import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe.configure({ timeout: 120_000 });

test.describe('UI wave 4 — metrics & historian honesty', () => {
    test('platform metrics shows Demo tag and empty state without Prometheus', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/analytics/metrics', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Demo', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText('Prometheus not connected')).toBeVisible();
        const mediaDir = process.env.UI_WAVE4_MEDIA_DIR;
        if (mediaDir) {
            await page.screenshot({ path: `${mediaDir}/ui-wave-4-metrics-demo-empty-after.png`, fullPage: true });
        }
    });

    test('SCADA trends shows live or sample historian banner', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/scada/trends', { waitUntil: 'domcontentloaded' });
        const live = page.getByText('Live historian data');
        const sample = page.getByText('Sample trend data');
        await expect(live.or(sample)).toBeVisible({ timeout: 30_000 });
        await page.getByRole('button', { name: 'Export CSV' }).click();
        await expect(page.getByText(/Trend CSV exported/i)).toBeVisible({ timeout: 10_000 });
    });

    test('BMS energy shows sample data banner', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/bms/energy', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Sample energy data')).toBeVisible({ timeout: 30_000 });
    });
});
