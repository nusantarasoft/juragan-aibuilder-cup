import { test, expect } from '@playwright/test';
import path from 'node:path';

const GRAPHQL = process.env.GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const MIDDLEWARE = process.env.MIDDLEWARE_URL || 'http://127.0.0.1:4001';
const MEDIA_DIR =
    process.env.P2_5_QA_MEDIA_DIR || '/cursor/stores/self/media';

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

async function shot(page: import('@playwright/test').Page, name: string) {
    await page.screenshot({ path: path.join(MEDIA_DIR, name), fullPage: true });
}

test.describe.configure({ mode: 'serial', timeout: 300_000 });

test.describe('P2-5 dedicated WA — live stack', () => {
    test('register → verify → dedicated opt-in → mock pair (WA_DEDICATED_PAIR_MOCK)', async ({ page }) => {
        const email = `p25-${Date.now()}@example.com`;
        const password = 'Password123!';
        const storeName = `P25 ${Date.now().toString().slice(-4)}`;
        const ownerPhone = `628${Date.now().toString().slice(-9)}`;

        await page.goto('/register');
        await page.getByPlaceholder('Warung Bahagia').fill(storeName);
        await page.getByPlaceholder('owner@example.com').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: /Buat akun trial/i }).click();
        await page.waitForURL((url) => url.pathname === '/admin/virtual-office', { timeout: 90_000 });

        await page.goto('/admin/recruit');
        await page.getByRole('button', { name: /Rekrut sekarang/i }).click();
        await page.waitForURL((url) => url.pathname === '/admin/connect-wa', { timeout: 60_000 });
        await shot(page, 'p2-5-dedicated-wa-connect-entry.png');

        await page.getByPlaceholder('628xxxxxxxxxx').fill(ownerPhone);
        await page.getByRole('button', { name: /Kirim OTP/i }).click();
        await expect(page.getByText(/QA mock OTP/i)).toBeVisible({ timeout: 20_000 });
        const mockLine = await page.getByText(/QA mock OTP:/i).textContent();
        const code = mockLine?.match(/(\d{6})/)?.[1];
        expect(code).toBeTruthy();
        await page.getByPlaceholder('Kode 6 digit').fill(code!);
        await page.getByRole('button', { name: /Verifikasi/i }).click();
        await expect(page.getByText('Nomor pemilik terverifikasi.')).toBeVisible({ timeout: 20_000 });

        await expect(page.getByText('Nomor bisnis sendiri')).toBeVisible();
        await expect(page.getByText(/Pairing dedicated — Demo/i)).toBeVisible();
        await shot(page, 'p2-5-dedicated-wa-connect-section.png');

        await page.getByRole('button', { name: /Upgrade ke nomor bisnis dedicated/i }).click();
        await expect(page.getByText(/Mode nomor bisnis dedicated/i)).toBeVisible({ timeout: 15_000 });
        await shot(page, 'p2-5-dedicated-wa-opt-in.png');

        await page.getByRole('button', { name: /Mulai pair/i }).click();
        await expect(page.getByText(/simulasi|mock|terhubung/i).first()).toBeVisible({ timeout: 25_000 });
        await shot(page, 'p2-5-dedicated-wa-mock-paired.png');

        const token = await page.evaluate(() => localStorage.getItem('auth_access_token'));
        expect(token).toBeTruthy();
        const store = await gql<{ myTenantStore: { id: string } | null }>(
            `query { myTenantStore { id } }`,
            undefined,
            token!,
        );
        const storeId = store.myTenantStore?.id;
        expect(storeId).toBeTruthy();

        const st = await gql<{
            waConnectionStatus: {
                inboxMode: string;
                dedicatedPaired: boolean;
                dedicatedPairMock: boolean;
            };
        }>(
            `query($storeId: String!) { waConnectionStatus(storeId: $storeId) {
        inboxMode dedicatedPaired dedicatedPairMock dedicatedBusinessPhone
      } }`,
            { storeId },
            token!,
        );
        expect(st.waConnectionStatus.inboxMode).toBe('dedicated');
        expect(st.waConnectionStatus.dedicatedPaired).toBe(true);
        expect(st.waConnectionStatus.dedicatedPairMock).toBe(true);
    });

    test('GraphQL optInDedicatedWaInbox requires auth', async () => {
        const res = await fetch(`${MIDDLEWARE}/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query:
                    'mutation { optInDedicatedWaInbox(input:{ storeId: "00000000-0000-0000-0000-000000000001" }) { inboxMode } }',
            }),
        });
        const body = await res.json();
        expect(body.errors?.[0]?.message || '').toMatch(/auth|Unauthorized|Authentication/i);
    });
});
