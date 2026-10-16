import { test, expect } from '@playwright/test';
import path from 'path';

const GRAPHQL = process.env.GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const MEDIA_DIR = process.env.F23_MEDIA_DIR || '/cursor/stores/self/media';

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

test.describe('F2-3 connect WA (live stack)', () => {
    test('register → recruit → OTP mock → Aktifkan', async ({ page }) => {
        const shot = (name: string) =>
            page.screenshot({ path: path.join(MEDIA_DIR, `f2-3-${name}.png`), fullPage: true });

        const email = `f23-${Date.now()}@example.com`;
        const password = 'Password123!';
        const storeName = `WA ${Date.now().toString().slice(-4)}`;
        const ownerPhone = `628${Date.now().toString().slice(-9)}`;

        await page.goto('/register');
        await page.getByPlaceholder('Warung Bahagia').fill(storeName);
        await page.getByPlaceholder('owner@example.com').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: /Buat akun trial/i }).click();
        await page.waitForURL((url) => url.pathname === '/admin/virtual-office', { timeout: 60_000 });

        await page.goto('/admin/recruit');
        await page.getByRole('button', { name: /Rekrut sekarang/i }).click();
        await page.waitForURL((url) => url.pathname === '/admin/connect-wa', { timeout: 60_000 });
        await shot('connect-wa-entry');

        await page.getByPlaceholder('628xxxxxxxxxx').fill(ownerPhone);
        await page.getByRole('button', { name: /Kirim OTP/i }).click();
        await expect(page.getByText(/QA mock OTP/i)).toBeVisible({ timeout: 15_000 });
        const mockLine = await page.getByText(/QA mock OTP:/i).textContent();
        const code = mockLine?.match(/(\d{6})/)?.[1];
        expect(code).toBeTruthy();
        await page.getByPlaceholder('Kode 6 digit').fill(code!);
        await page.getByRole('button', { name: /Verifikasi/i }).click();
        await expect(page.getByText('Nomor pemilik terverifikasi.')).toBeVisible({ timeout: 15_000 });
        await shot('owner-verified');

        await page.getByRole('button', { name: /^Aktifkan$/i }).click();
        await expect(page.getByText(/WA terhubung|Kasir WA aktif/i).first()).toBeVisible({ timeout: 20_000 });
        await shot('wa-connected');

        const token = await page.evaluate(() => localStorage.getItem('auth_access_token'));
        const store = await gql<{ myTenantStore: { id: string } | null }>(
            `query { myTenantStore { id } }`,
            undefined,
            token!,
        );
        expect(store.myTenantStore?.id).toBeTruthy();
        const st = await gql<{ waConnectionStatus: { waConnected: boolean } }>(
            `query($storeId: String!) { waConnectionStatus(storeId: $storeId) { waConnected } }`,
            { storeId: store.myTenantStore!.id },
            token!,
        );
        expect(st.waConnectionStatus.waConnected).toBe(true);
    });

    test('unauthenticated waConnectionStatus rejected', async () => {
        const res = await fetch(GRAPHQL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'query { waConnectionStatus(storeId: "00000000-0000-0000-0000-000000000099") { waConnected } }',
            }),
        });
        const json = await res.json();
        expect(json.errors?.[0]?.message).toMatch(/authentication|sign in/i);
    });
});
