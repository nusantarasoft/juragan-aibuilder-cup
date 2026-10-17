import { test, expect } from '@playwright/test';
import path from 'path';
import { loginAsAdmin } from './helpers/auth';
import { installAuthAndAosMocks, installGraphqlMocks } from './helpers/graphqlMocks';

const MEDIA_DIR =
    process.env.VO_QA_MEDIA_DIR ||
    '/cursor/stores/bc-ffbd38c7-e468-5c00-9d54-d4915a5f658f/media';

const liveSnap = {
    available: true,
    tenantId: 'default',
    slug: 'umkm-kasir',
    name: 'Warung Bu Ani',
    role: 'UMKM WhatsApp Kasir',
    source: 'ai_studio',
    unavailableReason: null,
    waChatsToday: 2,
    transactionsToday: 3,
    lastActivityAt: new Date().toISOString(),
    waOnline: true,
};

const runningTask = {
    id: '00000000-0000-0000-0000-000000000201',
    tenantId: '00000000-0000-0000-0000-000000000010',
    agentId: '00000000-0000-0000-0000-000000000099',
    title: 'QA queue task — live progress',
    moduleId: 'reports',
    route: '/admin/agentic-os',
    steps: ['Gather context', 'Draft', 'Review'],
    status: 'running',
    progress: 0.42,
    source: 'dispatch',
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

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
        /favicon|Failed to load resource.*404|NetworkError|ChunkLoadError|ERR_CONNECTION_REFUSED|net::ERR_FAILED|socket\.io|Warning: \[antd:/i;
    expect(errors.filter((e) => !ignored.test(e))).toEqual([]);
}

test.describe.configure({ mode: 'serial', timeout: 120_000 });

test.describe('VO Live mode QA captures', () => {
    test('vo-empty-tenant.png', async ({ page, context }) => {
        const errors = collectConsoleErrors(page);
        await installAuthAndAosMocks(context, { emptyAgents: true, uiDemoMode: false });
        await loginAsAdmin(page);
        await page.goto('/admin/virtual-office', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('No agents in this tenant yet')).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText('Live', { exact: true }).first()).toBeVisible();
        await page.screenshot({ path: path.join(MEDIA_DIR, 'vo-empty-tenant.png'), fullPage: true });
        assertCleanConsole(errors);
    });

    test('vo-agent-idle.png', async ({ page, context }) => {
        const errors = collectConsoleErrors(page);
        await installAuthAndAosMocks(context, { agentStatus: 'active', uiDemoMode: false });
        await loginAsAdmin(page);
        await page.goto('/admin/virtual-office', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
        await expect(page.getByRole('button', { name: /Demo Helper/i })).toBeVisible({ timeout: 20_000 });
        await page.screenshot({ path: path.join(MEDIA_DIR, 'vo-agent-idle.png'), fullPage: true });
        assertCleanConsole(errors);
    });

    test('vo-agent-working-real-task.png', async ({ page, context }) => {
        const errors = collectConsoleErrors(page);
        await installAuthAndAosMocks(context, {
            agentStatus: 'active',
            uiDemoMode: false,
            tasks: [runningTask],
        });
        await loginAsAdmin(page);
        await page.goto('/admin/virtual-office', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);
        await expect(page.getByText('QA queue task — live progress')).toBeVisible({ timeout: 20_000 });
        await page.screenshot({ path: path.join(MEDIA_DIR, 'vo-agent-working-real-task.png'), fullPage: true });
        assertCleanConsole(errors);
    });

    test('vo-demo-mode.png', async ({ page, context }) => {
        const errors = collectConsoleErrors(page);
        await installGraphqlMocks(context, liveSnap, false, { uiDemoMode: true });
        await loginAsAdmin(page);
        await page.goto('/admin/virtual-office', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(6000);
        await expect(page.getByText('Demo', { exact: true }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Arjuna|Semar|Demo Helper/i }).first()).toBeVisible();
        await page.screenshot({ path: path.join(MEDIA_DIR, 'vo-demo-mode.png'), fullPage: true });
        assertCleanConsole(errors);
    });
});
