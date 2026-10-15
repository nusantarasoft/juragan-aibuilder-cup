import { test, expect } from '@playwright/test';
import path from 'path';
import { loginAsAdmin } from './helpers/auth';
import { installGraphqlMocks } from './helpers/graphqlMocks';

const MEDIA_DIR =
    process.env.F13_QA_MEDIA_DIR ||
    '/cursor/stores/bc-ffbd38c7-e468-5c00-9d54-d4915a5f658f/media';

const kasirTask = {
    id: '00000000-0000-0000-0000-000000000301',
    tenantId: '00000000-0000-0000-0000-000000000010',
    agentId: '00000000-0000-0000-0000-000000000302',
    playbookId: null,
    routineId: null,
    workflowId: null,
    title: 'WA Kasir · konsultasi',
    description: 'Permintaan WA (redacted)',
    moduleId: 'ai-studio',
    route: '/admin/ai-studio/umkm',
    steps: ['Terima permintaan WA', 'Proses kasir', 'Kirim balasan'],
    status: 'running',
    progress: 0.62,
    priority: 'normal',
    sortOrder: 0,
    source: 'kasir_wa',
    requiresApproval: false,
    dueAt: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    completedAt: null,
    completedBy: null,
    result: null,
    error: null,
    requestedBy: null,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const kasirAgent = {
    id: '00000000-0000-0000-0000-000000000302',
    slug: 'umkm-kasir',
    name: 'Kasir UMKM',
    role: 'UMKM WhatsApp Kasir',
    description: '',
    persona: '',
    systemPrompt: '',
    provider: 'default',
    model: 'default',
    modelTier: 'medium',
    temperature: 0.3,
    effort: 'medium',
    color: '#22c55e',
    avatar: {},
    zone: 'operations',
    deskId: 'ops-1',
    modules: ['ai-studio'],
    skills: ['Kasir WA'],
    tools: [],
    permissions: {},
    guardrails: {},
    memoryScope: [],
    runner: 'browser',
    dailyTokenBudget: 1000,
    dailyRunBudget: 5,
    status: 'active',
    version: 1,
    stats: { tasksCompleted: 0, successRate: 1, avgLatencyMs: 800, tokensToday: 0 },
    createdBy: null,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

test.describe('F1-3 Kasir WA task — AOS + VO UI', () => {
    test.describe.configure({ timeout: 120_000 });
    test.beforeEach(async ({ context }) => {
        await installGraphqlMocks(
            context,
            {
                available: true,
                tenantId: '00000000-0000-0000-0000-000000000010',
                slug: 'umkm-kasir',
                name: 'Kasir UMKM',
                role: 'UMKM WhatsApp Kasir',
                source: 'ai_studio',
                waChatsToday: 2,
                transactionsToday: 1,
                lastActivityAt: new Date().toISOString(),
                waOnline: true,
            },
            false,
            {
                uiDemoMode: false,
                agents: [kasirAgent],
                tasks: [kasirTask],
            },
        );
    });

    test('f1-3-aos-kasir-task.png', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/agentic-os?app=tasks', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);
        await page.screenshot({ path: path.join(MEDIA_DIR, 'f1-3-aos-kasir-task.png'), fullPage: true });
    });

    test('f1-3-vo-kasir-working.png', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/virtual-office', { waitUntil: 'domcontentloaded' });
        await expect(page.getByText('WA Kasir · konsultasi')).toBeVisible({ timeout: 45_000 });
        await page.screenshot({ path: path.join(MEDIA_DIR, 'f1-3-vo-kasir-working.png'), fullPage: true });
    });
});
