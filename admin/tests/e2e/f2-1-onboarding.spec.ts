import { test, expect } from '@playwright/test';
import path from 'path';

const GRAPHQL = process.env.GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const MEDIA_DIR =
    process.env.F21_MEDIA_DIR ||
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

test.describe('F2-1 tenant onboarding (live stack)', () => {
    test('register → VO → WA whitelist', async ({ page }) => {
        const shot = (name: string) =>
            page.screenshot({ path: path.join(MEDIA_DIR, `f2-1-${name}.png`), fullPage: true });

        await page.goto('/register');
        await expect(page.getByRole('heading', { name: /Daftar toko/i })).toBeVisible();
        await shot('register-page');

        const email = `f2pw-${Date.now()}@example.com`;
        const password = 'Password123!';
        const storeName = `PW Store ${Date.now().toString().slice(-4)}`;

        await page.getByPlaceholder('Warung Bahagia').fill(storeName);
        await page.getByPlaceholder('owner@example.com').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: /Buat akun trial/i }).click();

        await expect(page).toHaveURL(/\/admin\/virtual-office/, { timeout: 60_000 });
        await shot('empty-virtual-office');

        await page.goto('/admin/onboarding/wa-whitelist');
        await expect(page.getByRole('heading', { name: /WhatsApp whitelist/i })).toBeVisible();
        await shot('wa-whitelist-admin');

        const token = await page.evaluate(() => localStorage.getItem('auth_access_token'));
        expect(token).toBeTruthy();

        const me = await gql<{ me: { tenantId?: string; role?: string } | null }>(
            `query { me { tenantId role emailVerified } }`,
            undefined,
            token!,
        );
        expect(me.me?.role).toBe('tenant_owner');
        expect(me.me?.tenantId).toBeTruthy();

        const store = await gql<{ myTenantStore: { id: string } | null }>(
            `query { myTenantStore { id displayName studioSlug } }`,
            undefined,
            token!,
        );
        expect(store.myTenantStore?.id).toBeTruthy();
    });
});
