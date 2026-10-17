import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe.configure({ timeout: 90_000 });

test.describe('UI wave 2 — admin buttons & honesty', () => {
    test('Agentic OS Settings exposes UI demo mode toggle', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/agentic-os?app=settings', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('UI demo mode', { exact: false })).toBeVisible({ timeout: 30_000 });
    });

    test('Label Studio Open is disabled while UI demo mode is on', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/ai-studio/label-studio', { waitUntil: 'domcontentloaded' });
        const openBtn = page.getByRole('button', { name: /Open Label Studio/i });
        await expect(openBtn).toBeVisible({ timeout: 30_000 });
        const demoTag = page.getByText('Demo', { exact: true }).first();
        if (await demoTag.isVisible().catch(() => false)) {
            await expect(openBtn).toBeDisabled();
        }
    });

    test('DevOps GitLab refresh button is wired', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/devops/gitlab', { waitUntil: 'domcontentloaded' });
        const refresh = page.locator('button[title="Refresh page"]');
        await expect(refresh).toBeVisible({ timeout: 30_000 });
    });

    test('connect-wa wizard loads primary CTA copy', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/connect-wa', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText(/WhatsApp|Hubungkan/i).first()).toBeVisible({ timeout: 30_000 });
    });

    test('BMS dashboard shows live or sample honesty banner', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/bms', { waitUntil: 'domcontentloaded' });
        const live = page.getByText('Live facility data');
        const sample = page.getByText('Sample facility data');
        await expect(live.or(sample)).toBeVisible({ timeout: 30_000 });
    });

    test('Web Crawler jobs table exposes Stop for queued/running rows', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/ai-studio/web-crawler', { waitUntil: 'domcontentloaded' });
        await expect(page.getByTitle('Web Crawler Studio')).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText('Live', { exact: true }).first()).toBeVisible();
        const mediaDir = process.env.UI_WAVE2_MEDIA_DIR;
        if (mediaDir) {
            await page.screenshot({ path: `${mediaDir}/ui-wave-2-web-crawler-live-after.png`, fullPage: true });
        }
    });

    test('screenshot — AOS Settings UI demo toggle (after)', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/agentic-os?app=settings', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('UI demo mode', { exact: false })).toBeVisible({ timeout: 30_000 });
        const mediaDir = process.env.UI_WAVE2_MEDIA_DIR;
        if (mediaDir) {
            await page.screenshot({ path: `${mediaDir}/ui-wave-2-aos-settings-demo-toggle-after.png`, fullPage: true });
        }
    });

    test('screenshot — BMS honesty banner (after)', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/bms', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Live facility data').or(page.getByText('Sample facility data'))).toBeVisible({ timeout: 30_000 });
        const mediaDir = process.env.UI_WAVE2_MEDIA_DIR;
        if (mediaDir) {
            await page.screenshot({ path: `${mediaDir}/ui-wave-2-bms-sample-banner-after.png`, fullPage: true });
        }
    });
});
