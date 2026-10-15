import { test, expect } from '@playwright/test';
import path from 'node:path';
import { loginAsAdmin } from './helpers/auth';
import { installAuthAndAosMocks, installGraphqlMocks } from './helpers/graphqlMocks';

const MEDIA_DIR =
    process.env.F1_4_QA_MEDIA_DIR ||
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

const seedAgent = {
    id: '00000000-0000-0000-0000-000000000099',
    slug: 'arjuna',
    name: 'Arjuna',
    role: 'Ops lead',
    description: '',
    persona: '',
    systemPrompt: '',
    provider: 'default',
    model: 'default',
    modelTier: 'medium',
    temperature: 0.3,
    effort: 'medium',
    color: '#38bdf8',
    avatar: {},
    zone: 'operations',
    deskId: null,
    modules: ['reports'],
    skills: ['ops'],
    tools: [],
    permissions: {},
    guardrails: {},
    memoryScope: [],
    runner: 'cloud',
    dailyTokenBudget: 1000,
    dailyRunBudget: 5,
    status: 'active',
    version: 1,
    stats: { tasksCompleted: 2, successRate: 1, avgLatencyMs: 1000, tokensToday: 120 },
    createdBy: null,
    archivedAt: null,
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
        /favicon|Failed to load resource.*404|NetworkError|ChunkLoadError|ERR_CONNECTION_REFUSED|net::ERR_FAILED|Failed to fetch|socket\.io|realtime\/v1\/websocket|WebSocket connection|Warning: \[antd:|Warning: \[rc-|THREE\.GLTFLoader|WebGL|agentic-os_lib|Cannot read properties of undefined/i;
    expect(errors.filter((e) => !ignored.test(e))).toEqual([]);
}

async function shot(page: import('@playwright/test').Page, name: string) {
    await page.screenshot({ path: path.join(MEDIA_DIR, name), fullPage: true });
}

test.describe.configure({ mode: 'serial', timeout: 180_000 });

// UI-only helper (GraphQL mocked) — PO gate uses f1-4-live-demo-fullstack.spec.ts
test.describe.skip('F1-4 Live vs Demo — browser QA (mock GraphQL, non-gate)', () => {
    test('AI Studio — demo labels + live routes', async ({ browser }) => {
        const context = await browser.newContext();
        await installAuthAndAosMocks(context, { uiDemoMode: false, agents: [seedAgent] });
        const page = await context.newPage();
        const errors = collectConsoleErrors(page);
        await loginAsAdmin(page);

        await page.goto('/admin/ai-studio', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        await shot(page, 'f1-4-aistudio-home-live.png');

        for (const [route, file] of [
            ['/admin/ai-studio/web-crawler', 'f1-4-aistudio-crawler-demo.png'],
            ['/admin/ai-studio/knowledge-graph', 'f1-4-aistudio-knowledge-graph-live.png'],
            ['/admin/ai-studio/agent-builder', 'f1-4-aistudio-agent-builder-demo.png'],
            ['/admin/ai-studio/label-studio', 'f1-4-aistudio-label-studio-demo.png'],
            ['/admin/ai-studio/umkm', 'f1-4-aistudio-umkm-live.png'],
            ['/admin/ai-studio/ai-gateway', 'f1-4-aistudio-ai-gateway-live.png'],
            ['/admin/ai-studio/settings', 'f1-4-aistudio-settings-live.png'],
        ] as const) {
            await page.goto(route, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(1500);
            if (file.includes('demo')) {
                await expect(page.getByText('Demo', { exact: true }).first()).toBeVisible({ timeout: 20_000 });
            }
            await shot(page, file);
        }

        assertCleanConsole(errors);
        await context.close();
    });

    test('Agentic OS — Live toolbar + apps', async ({ browser }) => {
        const context = await browser.newContext();
        await installGraphqlMocks(context, liveSnap, false, { uiDemoMode: false, agents: [seedAgent] });
        const page = await context.newPage();
        const errors = collectConsoleErrors(page);
        await loginAsAdmin(page);
        await page.goto('/admin/agentic-os', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('Live', { exact: true }).first()).toBeVisible({ timeout: 45_000 });
        await shot(page, 'f1-4-aos-overview-live.png');

        for (const [app, file] of [
            ['tasks', 'f1-4-aos-tasks-live.png'],
            ['studio', 'f1-4-aos-agents-live.png'],
            ['governance', 'f1-4-aos-governance-live.png'],
        ] as const) {
            await page.goto(`/admin/agentic-os?app=${app}`, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2500);
            await shot(page, file);
        }

        assertCleanConsole(errors);
        await context.close();
    });

    test('Virtual Office — Live then Demo (uiDemoMode)', async ({ browser }) => {
        const liveCtx = await browser.newContext();
        await installGraphqlMocks(liveCtx, liveSnap, false, { uiDemoMode: false, agents: [seedAgent] });
        const livePage = await liveCtx.newPage();
        const errors = collectConsoleErrors(livePage);
        await loginAsAdmin(livePage);
        await livePage.goto('/admin/virtual-office', { waitUntil: 'domcontentloaded' });
        await expect(livePage.getByText('Live', { exact: true }).first()).toBeVisible({ timeout: 45_000 });
        await livePage.waitForTimeout(3000);
        await shot(livePage, 'f1-4-vo-live.png');
        assertCleanConsole(errors);
        await liveCtx.close();

        const demoCtx = await browser.newContext();
        await installAuthAndAosMocks(demoCtx, { uiDemoMode: true, agents: [seedAgent] });
        const demoPage = await demoCtx.newPage();
        const demoErrors = collectConsoleErrors(demoPage);
        await loginAsAdmin(demoPage);
        await demoPage.goto('/admin/virtual-office', { waitUntil: 'domcontentloaded' });
        await expect(demoPage.getByText('Demo', { exact: true }).first()).toBeVisible({ timeout: 45_000 });
        await demoPage.waitForTimeout(3000);
        await shot(demoPage, 'f1-4-vo-demo.png');
        assertCleanConsole(demoErrors);
        await demoCtx.close();
    });
});
