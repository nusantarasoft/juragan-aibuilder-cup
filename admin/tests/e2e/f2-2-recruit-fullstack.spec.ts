import { test, expect } from '@playwright/test';
import path from 'path';

const GRAPHQL = process.env.GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const MEDIA_DIR =
    process.env.F22_MEDIA_DIR ||
    '/cursor/stores/self/media';

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

test.describe.configure({ timeout: 120_000 });

test.describe('F2-2 recruit (live stack)', () => {
    test('register → recruit Kasir → VO roster', async ({ page }) => {
        const shot = (name: string) =>
            page.screenshot({ path: path.join(MEDIA_DIR, `f2-2-${name}.png`), fullPage: true });

        const email = `f22-${Date.now()}@example.com`;
        const password = 'Password123!';
        const storeName = `Recruit ${Date.now().toString().slice(-4)}`;

        await page.goto('/register');
        await page.getByPlaceholder('Warung Bahagia').fill(storeName);
        await page.getByPlaceholder('owner@example.com').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: /Buat akun trial/i }).click();
        await page.waitForURL((url) => url.pathname === '/admin/virtual-office', { timeout: 60_000 });
        await expect
            .poll(async () => page.evaluate(() => localStorage.getItem('auth_access_token')?.split('.').length ?? 0))
            .toBe(3);
        await expect(page.getByText('Virtual Office').first()).toBeVisible({ timeout: 60_000 });
        await expect(page.getByText('Belum ada karyawan AI')).toBeVisible({ timeout: 90_000 });
        await expect(page.getByRole('link', { name: /Rekrut karyawan/i })).toBeVisible({ timeout: 10_000 });
        await shot('empty-vo-cta');

        await page.goto('/admin/recruit');
        await expect(page.getByRole('heading', { name: /Rekrut karyawan/i })).toBeVisible();
        await expect(page.getByText('Segera hadir').first()).toBeVisible();
        await shot('recruit-page');
        await shot('coming-soon-skus');

        await page
            .getByRole('listitem')
            .filter({ hasText: 'Kasir UMKM' })
            .getByRole('button', { name: /Rekrut sekarang/i })
            .click();
        await page.waitForURL((url) => url.pathname === '/admin/connect-wa', { timeout: 60_000 });
        await page.goto('/admin/virtual-office');
        await expect(page.getByText('Kasir UMKM').first()).toBeVisible({ timeout: 60_000 });
        await shot('vo-kasir-recruited');

        const token = await page.evaluate(() => localStorage.getItem('auth_access_token'));
        expect(token).toBeTruthy();
        const agents = await gql<{ aosAgents: { slug: string }[] }>(
            `query { aosAgents { slug name } }`,
            undefined,
            token!,
        );
        expect(agents.aosAgents.some((a) => a.slug === 'umkm-kasir' || a.slug.startsWith('umkm-kasir-'))).toBe(true);
    });

    test('unauthenticated recruit catalog rejected', async () => {
        const res = await fetch(GRAPHQL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ aosRecruitCatalog { id } }' }),
        });
        const json = await res.json();
        expect(json.errors?.[0]?.message).toMatch(/authentication|sign in/i);
    });
});
