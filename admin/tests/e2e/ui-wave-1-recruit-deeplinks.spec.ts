import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';
import { RECRUIT_POST_SUCCESS_LINKS } from '@/lib/recruitPostSuccessLinks';

test.describe.configure({ timeout: 90_000 });

/**
 * Wave 1 smoke: recruited-row deep links render on /admin/recruit (platform admin view).
 * Full recruit flow covered by f2-2 / f3-* specs; this guards link regression only.
 */
test.describe('UI wave 1 — recruit post-success links', () => {
    test('recruit page loads catalog and coming-soon SKUs', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/recruit');
        await expect(page.getByRole('heading', { name: /Rekrut karyawan/i })).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText('Segera hadir').first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Rekrut sekarang/i }).first()).toBeVisible();
    });

    test('documented module hrefs are under /admin', () => {
        for (const entry of Object.values(RECRUIT_POST_SUCCESS_LINKS)) {
            expect(entry.href).toMatch(/^\/admin\//);
        }
    });
});
