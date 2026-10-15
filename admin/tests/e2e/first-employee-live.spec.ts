import { test, expect } from '@playwright/test';
import path from 'path';
import { loginAsAdmin } from './helpers/auth';
import { installAuthAndAosMocks, installGraphqlMocks } from './helpers/graphqlMocks';

const MEDIA_DIR =
    process.env.FIRST_EMPLOYEE_MEDIA_DIR ||
    '/cursor/stores/bc-ffbd38c7-e468-5c00-9d54-d4915a5f658f/media';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';

test.describe.configure({ mode: 'serial', timeout: 90_000 });

function collectConsoleErrors(page: import('@playwright/test').Page) {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
    });
    return errors;
}

function assertCleanConsole(errors: string[]) {
    const ignored =
        /favicon|Failed to load resource.*404|NetworkError|graphql.*404|ChunkLoadError|ERR_CONNECTION_REFUSED|net::ERR_FAILED/i;
    expect(errors.filter((e) => !ignored.test(e))).toEqual([]);
}

const liveSnap = {
    available: true,
    tenantId: 'default',
    slug: 'umkm-kasir',
    name: 'Warung Bu Ani',
    role: 'UMKM WhatsApp Kasir',
    source: 'ai_studio',
    unavailableReason: null,
    waChatsToday: 4,
    transactionsToday: 7,
    lastActivityAt: new Date().toISOString(),
    waOnline: true,
};

test.describe('First employee — Live Kasir vs Demo sim', () => {
    test('Agentic OS — Live metrics state', async ({ page, context }) => {
        const errors = collectConsoleErrors(page);
        await installGraphqlMocks(context, liveSnap);
        await loginAsAdmin(page);
        await page.goto('/admin/agentic-os?app=studio', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(6000);
        await page.getByRole('button', { name: /Agent Studio/i }).click();
        await expect(page.getByText('First recruited employee')).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText('Warung Bu Ani')).toBeVisible();
        await expect(page.getByText('4 chat hari ini · 7 transaksi')).toBeVisible();
        await expect(page.getByText('Live', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Demo', { exact: true }).first()).toBeVisible();
        await page.screenshot({ path: path.join(MEDIA_DIR, 'first-employee-aos-live.png'), fullPage: true });
        assertCleanConsole(errors);
    });

    test('Agentic OS — unavailable state (no mock fallback)', async ({ page, context }) => {
        const errors = collectConsoleErrors(page);
        await installAuthAndAosMocks(context);
        await loginAsAdmin(page);
        await page.goto('/admin/agentic-os?app=studio');
        await page.getByRole('button', { name: /Agent Studio/i }).click();
        await expect(page.getByText('data tidak tersedia')).toBeVisible({ timeout: 30_000 });
        await page.screenshot({ path: path.join(MEDIA_DIR, 'first-employee-aos-unavailable.png'), fullPage: true });
        assertCleanConsole(errors);
    });

    test('Virtual Office — Live roster + Kasir + inspector', async ({ page, context }) => {
        const errors = collectConsoleErrors(page);
        await installGraphqlMocks(context, liveSnap);
        await loginAsAdmin(page);
        await page.goto('/admin/virtual-office', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(6000);
        const kasirRow = page.getByRole('button', { name: /Warung Bu Ani/i });
        await expect(kasirRow.first()).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText('Live', { exact: true }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Demo Helper/i })).toBeVisible({ timeout: 15_000 });
        await kasirRow.first().click();
        await expect(page.getByText('Chat WA hari ini')).toBeVisible({ timeout: 15_000 });
        await page.screenshot({ path: path.join(MEDIA_DIR, 'first-employee-vo-live-inspector.png'), fullPage: false });
        await page.screenshot({ path: path.join(MEDIA_DIR, 'first-employee-vo-roster.png'), fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(MEDIA_DIR, 'first-employee-vo-mobile.png'), fullPage: true });
        assertCleanConsole(errors);
    });

    test('Virtual Office — Kasir unavailable copy', async ({ page, context }) => {
        const errors = collectConsoleErrors(page);
        await installAuthAndAosMocks(context);
        await loginAsAdmin(page);
        await page.goto('/admin/virtual-office');
        await page.waitForTimeout(5000);
        await page.getByRole('button', { name: /Kasir UMKM/i }).first().click();
        await expect(page.locator('aside').getByText('data tidak tersedia')).toBeVisible({ timeout: 20_000 });
        await page.screenshot({ path: path.join(MEDIA_DIR, 'first-employee-vo-unavailable.png'), fullPage: false });
        assertCleanConsole(errors);
    });
});

test.describe('GraphQL auth smoke (Kasir snapshot)', () => {
    test('aosKasirLiveSnapshot rejects unauthenticated POST when middleware is up', async ({ request }) => {
        test.skip(!process.env.RUN_AOS_KASIR_INTEGRATION, 'Set RUN_AOS_KASIR_INTEGRATION=1 with live middleware');
        const res = await request.post(GRAPHQL_URL, {
            data: { query: '{ aosKasirLiveSnapshot { slug source available } }' },
        });
        expect(res.ok()).toBeTruthy();
        const json = await res.json();
        expect(json.errors?.[0]?.message).toMatch(/sign in/i);
        expect(json.data?.aosKasirLiveSnapshot).toBeUndefined();
    });
});
