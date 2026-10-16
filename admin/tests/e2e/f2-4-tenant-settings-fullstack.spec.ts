import { test, expect } from '@playwright/test';
import path from 'path';

const GRAPHQL = process.env.GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const MEDIA_DIR = process.env.F24_MEDIA_DIR || '/cursor/stores/self/media';

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

test.describe('F2-4 tenant agent settings (live stack)', () => {
    test('register → recruit → my-agents libur → VO drawer', async ({ page }) => {
        const shot = (name: string) =>
            page.screenshot({ path: path.join(MEDIA_DIR, `f2-4-${name}.png`), fullPage: true });

        const email = `f24-${Date.now()}@example.com`;
        const password = 'Password123!';
        const storeName = `Settings ${Date.now().toString().slice(-4)}`;

        await page.goto('/register');
        await page.getByPlaceholder('Warung Bahagia').fill(storeName);
        await page.getByPlaceholder('owner@example.com').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: /Buat akun trial/i }).click();
        await page.waitForURL((url) => url.pathname === '/admin/virtual-office', { timeout: 60_000 });

        await page.goto('/admin/recruit');
        await page.getByRole('button', { name: /Rekrut sekarang/i }).click();
        await page.waitForURL((url) => url.pathname.includes('/admin'), { timeout: 60_000 });

        await page.goto('/admin/my-agents');
        await expect(page.getByRole('heading', { name: /Karyawan AI saya/i })).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText('Kasir UMKM').first()).toBeVisible();
        await shot('my-agents');

        await page.getByRole('button', { name: /Liburkan/i }).click();
        await expect(page.getByText('Libur').first()).toBeVisible({ timeout: 15_000 });
        await shot('my-agents-libur');

        await page.goto('/admin/virtual-office');
        await expect(page.getByText('Kasir UMKM').first()).toBeVisible({ timeout: 60_000 });
        await page.getByText('Kasir UMKM').first().click();
        await expect(page.getByText('Libur').first()).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('Pengaturan toko').first()).toBeVisible();
        await shot('vo-drawer-libur');

        const token = await page.evaluate(() => localStorage.getItem('auth_access_token'));
        expect(token).toBeTruthy();
        const list = await gql<{ aosTenantOwnerAgentSettingsList: { status: string }[] }>(
            `query { aosTenantOwnerAgentSettingsList { status dailyRunBudget quietHoursEnabled } }`,
            undefined,
            token!,
        );
        expect(list.aosTenantOwnerAgentSettingsList[0]?.status).toBe('paused');
    });

    test('unauthenticated settings list rejected', async () => {
        const res = await fetch(GRAPHQL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ aosTenantOwnerAgentSettingsList { agentId } }' }),
        });
        const json = await res.json();
        expect(json.errors?.[0]?.message).toMatch(/authentication|sign in/i);
    });
});
