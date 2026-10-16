import { test, expect } from '@playwright/test';
import path from 'path';

const GRAPHQL = process.env.GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const MEDIA_DIR = process.env.F32_MEDIA_DIR || '/cursor/stores/self/media';

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

test.describe('F3-2 usage metrics (live stack)', () => {
    test('register → recruit → usage page + GraphQL', async ({ page }) => {
        const shot = (name: string) =>
            page.screenshot({ path: path.join(MEDIA_DIR, `f3-2-usage-${name}.png`), fullPage: true });

        const email = `f32-${Date.now()}@example.com`;
        const password = 'Password123!';
        const storeName = `Usage ${Date.now().toString().slice(-4)}`;

        await page.goto('/register');
        await page.getByPlaceholder('Warung Bahagia').fill(storeName);
        await page.getByPlaceholder('owner@example.com').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: /Buat akun trial/i }).click();
        await page.waitForURL((url) => url.pathname === '/admin/virtual-office', { timeout: 60_000 });

        await page.goto('/admin/recruit');
        await page.getByRole('button', { name: /Rekrut sekarang/i }).click();
        await page.waitForURL((url) => url.pathname.includes('/admin'), { timeout: 60_000 });

        await page.goto('/admin/usage');
        await expect(page.getByRole('heading', { name: /Ringkasan pemakaian toko/i })).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText('Live').first()).toBeVisible();
        await expect(page.getByText('Karyawan AI').first()).toBeVisible();
        await shot('overview');

        const token = await page.evaluate(() => localStorage.getItem('auth_access_token'));
        expect(token).toBeTruthy();
        const usage = await gql<{ aosTenantUsageMetrics: { available: boolean; recruitedAgents: number; agents: { name: string }[] } }>(
            `query { aosTenantUsageMetrics(days: 30) { available recruitedAgents agents { name } } }`,
            undefined,
            token!,
        );
        expect(usage.aosTenantUsageMetrics.available).toBe(true);
        expect(usage.aosTenantUsageMetrics.recruitedAgents).toBeGreaterThanOrEqual(1);
        expect(usage.aosTenantUsageMetrics.agents.some((a) => a.name.includes('Kasir'))).toBe(true);
    });

    test('unauthenticated usage query rejected', async () => {
        const res = await fetch(GRAPHQL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ aosTenantUsageMetrics { tenantId } }' }),
        });
        const json = await res.json();
        expect(json.errors?.[0]?.message).toMatch(/authentication|sign in/i);
    });
});
