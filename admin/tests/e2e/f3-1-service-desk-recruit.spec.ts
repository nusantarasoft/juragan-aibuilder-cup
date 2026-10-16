import { test, expect } from '@playwright/test';
import path from 'path';

const GRAPHQL = process.env.GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const MEDIA_DIR = process.env.F31_MEDIA_DIR || '/cursor/stores/self/media';

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

test.describe('F3-1 Service Desk recruit (live stack)', () => {
    test('register → Kasir + Service Desk on recruit catalog and VO', async ({ page }) => {
        const shot = (name: string) =>
            page.screenshot({ path: path.join(MEDIA_DIR, `f3-1-service-desk-${name}.png`), fullPage: true });

        const email = `f31-${Date.now()}@example.com`;
        const password = 'Password123!';
        const storeName = `SD ${Date.now().toString().slice(-4)}`;

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
        await expect(page.getByRole('heading', { name: 'Service Desk' })).toBeVisible();
        await expect(page.getByRole('button', { name: /Rekrut sekarang/i })).toHaveCount(4);
        await expect(page.getByText('Segera hadir').first()).toBeVisible();
        await shot('recruit-page');

        const recruitButtons = page.getByRole('button', { name: /Rekrut sekarang/i });
        await recruitButtons.first().click();
        await page.waitForURL((url) => url.pathname === '/admin/connect-wa', { timeout: 60_000 });

        await page.goto('/admin/recruit');
        await recruitButtons.first().click();
        await page.waitForURL((url) => url.pathname === '/admin/virtual-office', { timeout: 60_000 });
        await expect(page.getByText('Service Desk').first()).toBeVisible({ timeout: 60_000 });
        await shot('vo-aos-agents');

        const token = await page.evaluate(() => localStorage.getItem('auth_access_token'));
        expect(token).toBeTruthy();
        const agents = await gql<{ aosAgents: { slug: string; name: string }[] }>(
            `query { aosAgents { slug name role modules } }`,
            undefined,
            token!,
        );
        expect(agents.aosAgents.some((a) => a.slug === 'umkm-kasir' || a.slug.startsWith('umkm-kasir-'))).toBe(true);
        expect(agents.aosAgents.some((a) => a.slug === 'service-desk' || a.slug.startsWith('service-desk-'))).toBe(
            true,
        );
        const sd = agents.aosAgents.find((a) => a.slug === 'service-desk' || a.slug.startsWith('service-desk-'));
        expect(sd?.name).toMatch(/Service Desk/i);
    });

    test('unauthenticated recruit status rejected', async () => {
        const res = await fetch(GRAPHQL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ aosRecruitStatus { recruitedCount } }' }),
        });
        const json = await res.json();
        expect(json.errors?.[0]?.message).toMatch(/authentication|sign in/i);
    });
});
