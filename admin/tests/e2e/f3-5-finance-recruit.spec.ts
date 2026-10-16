import { test, expect } from '@playwright/test';
import path from 'path';

const GRAPHQL = process.env.GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const MEDIA_DIR = process.env.F35_MEDIA_DIR || '/cursor/stores/self/media';

async function gql<T>(query: string, variables?: Record<string, unknown>, token?: string): Promise<T> {
    const res = await fetch(GRAPHQL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data as T;
}

test.describe.configure({ timeout: 180_000 });

test.describe('F3-5 Finance recruit (live stack)', () => {
    test('register → Finance live on recruit catalog and recruitable', async ({ page }) => {
        const shot = (name: string) =>
            page.screenshot({ path: path.join(MEDIA_DIR, `f3-5-finance-${name}.png`), fullPage: true });

        const email = `f35-${Date.now()}@example.com`;
        const password = 'Password123!';
        const storeName = `Fin ${Date.now().toString().slice(-4)}`;

        await page.goto('/register');
        await page.getByPlaceholder('Warung Bahagia').fill(storeName);
        await page.getByPlaceholder('owner@example.com').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: /Buat akun trial/i }).click();
        await page.waitForURL((url) => url.pathname === '/admin/virtual-office', { timeout: 60_000 });
        await expect
            .poll(async () => page.evaluate(() => localStorage.getItem('auth_access_token')?.split('.').length ?? 0))
            .toBe(3);

        await page.goto('/admin/recruit');
        await expect(page.getByRole('heading', { name: /Rekrut karyawan/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Finance' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Rekrut sekarang/i })).toHaveCount(7);
        await expect(page.getByRole('heading', { name: 'Sales' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'DevOps' })).toBeVisible();
        await expect(page.getByText('Segera hadir').first()).toBeVisible();
        await shot('recruit-page');

        const recruitButtons = page.getByRole('button', { name: /Rekrut sekarang/i });
        await recruitButtons.first().click();
        await page.waitForURL((url) => url.pathname === '/admin/connect-wa', { timeout: 60_000 });

        await page.goto('/admin/recruit');
        await recruitButtons.first().click();
        await page.waitForURL((url) => url.pathname === '/admin/virtual-office', { timeout: 60_000 });

        await page.goto('/admin/recruit');
        await recruitButtons.first().click();
        await page.waitForURL((url) => url.pathname === '/admin/virtual-office', { timeout: 60_000 });
        await expect(page.getByText('Finance').first()).toBeVisible({ timeout: 60_000 });
        await shot('vo-after-finance');

        const token = await page.evaluate(() => localStorage.getItem('auth_access_token'));
        expect(token).toBeTruthy();
        const status = await gql<{ aosRecruitStatus: { financeRecruited: boolean } }>(
            `query { aosRecruitStatus { financeRecruited kasirRecruited serviceDeskRecruited } }`,
            undefined,
            token!,
        );
        expect(status.aosRecruitStatus.financeRecruited).toBe(true);

        const agents = await gql<{ aosAgents: { slug: string; name: string; modules: string[] }[] }>(
            `query { aosAgents { slug name modules } }`,
            undefined,
            token!,
        );
        const fin = agents.aosAgents.find((a) => a.slug === 'finance' || a.slug.startsWith('finance-'));
        expect(fin).toBeTruthy();
        expect(fin?.modules).toEqual(expect.arrayContaining(['accounting', 'reports']));
    });

    test('unauthenticated recruit status rejected', async () => {
        const res = await fetch(GRAPHQL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ aosRecruitStatus { financeRecruited } }' }),
        });
        const json = await res.json();
        expect(json.errors?.[0]?.message).toMatch(/authentication|sign in/i);
    });
});
