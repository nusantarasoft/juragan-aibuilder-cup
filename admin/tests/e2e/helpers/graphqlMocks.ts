import type { BrowserContext } from '@playwright/test';

const mockUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@nusantarasoft.local',
    fullName: 'QA Admin',
    role: 'admin',
    createdAt: new Date().toISOString(),
};

const demoAgent = {
    id: '00000000-0000-0000-0000-000000000099',
    slug: 'demo-helper',
    name: 'Demo Helper',
    role: 'Simulated agent',
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
    stats: { tasksCompleted: 0, successRate: 1, avgLatencyMs: 1000, tokensToday: 0 },
    createdBy: null,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const aosSettings = {
    tenantId: '00000000-0000-0000-0000-000000000010',
    uiDemoMode: false,
    dailyRunCeiling: 100,
    rollingWindowMinutes: 60,
    rollingWindowCeiling: 20,
    monthlyTokenBudget: 1_000_000,
    killSwitch: false,
    autopilot: false,
    autopilotReviewCap: 3,
    stepSeconds: 30,
    defaultRunner: 'cloud',
    defaultProvider: null,
    defaultModel: null,
    requireApprovalFor: [],
    updatedAt: new Date().toISOString(),
};

const aosStats = {
    totalAgents: 1,
    activeAgents: 1,
    queuedTasks: 0,
    runningTasks: 0,
    reviewTasks: 0,
    awaitingApproval: 0,
    doneToday: 0,
    failedToday: 0,
    runsToday: 0,
    tokensToday: 0,
    costToday: 0,
    pendingApprovals: 0,
};

const aosPulseStatus = {
    now: new Date().toISOString(),
    lastTickAt: null,
    pulseEnabled: false,
    killSwitch: false,
    llmMode: 'dry_run',
    provider: null,
    model: null,
    providerReady: false,
    queueDepth: 0,
    successToday: 0,
    failedToday: 0,
    blockedToday: 0,
    dailyRuns: { used: 0, limit: 100, pct: 0 },
    rollingRuns: { used: 0, limit: 20, pct: 0 },
    monthlyTokens: { used: 0, limit: 1_000_000, pct: 0 },
    dailyCost: { used: 0, limit: 10, pct: 0 },
    runsToday: 0,
    nextRuns: [],
};

export type AosMockOptions = {
    uiDemoMode?: boolean;
    emptyAgents?: boolean;
    tasks?: Record<string, unknown>[];
    agentStatus?: string;
};

function buildAosSnapshot(opts?: AosMockOptions) {
    const agent = {
        ...demoAgent,
        status: opts?.agentStatus ?? demoAgent.status,
    };
    return {
        aosAgents: opts?.emptyAgents ? [] : [agent],
        aosPlaybooks: [],
        aosTasks: opts?.tasks ?? [],
        aosApprovals: [],
        aosSettings: { ...aosSettings, uiDemoMode: opts?.uiDemoMode ?? false },
        aosStats: opts?.emptyAgents
            ? { ...aosStats, totalAgents: 0, activeAgents: 0 }
            : { ...aosStats, totalAgents: 1, activeAgents: agent.status === 'active' ? 1 : 0 },
    };
}

const emptyAosSnapshot = buildAosSnapshot();

function parseGraphqlQuery(req: import('@playwright/test').Request): string {
    try {
        const json = req.postDataJSON() as { query?: string } | null;
        if (json?.query) return json.query;
    } catch {
        /* fall through */
    }
    const raw = req.postData();
    if (!raw) return '';
    try {
        return (JSON.parse(raw) as { query?: string }).query ?? '';
    } catch {
        return '';
    }
}

function graphqlDataForQuery(
    query: string,
    kasirSnapshot: Record<string, unknown>,
    kasirFail: boolean,
    aosOpts?: AosMockOptions,
): Record<string, unknown> | 'kasir_fail' {
    if (kasirFail && query.includes('aosKasirLiveSnapshot')) return 'kasir_fail';
    if (query.includes('signIn')) return { signIn: { accessToken: 'qa-access-token', refreshToken: 'qa-refresh-token', user: mockUser } };
    if (query.includes('aosKasirLiveSnapshot')) return { aosKasirLiveSnapshot: kasirSnapshot };
    if (query.includes('AosSnapshot') || query.includes('aosAgents')) return buildAosSnapshot(aosOpts);
    if (query.includes('AosPulse') || query.includes('aosRoutines')) {
        return {
            aosRoutines: [],
            aosRuns: [],
            aosRunQueue: [],
            aosPulseStatus,
            aosSettings: { llmMode: 'dry_run', pulseEnabled: false, runCostCeilingUsd: 0 },
            aosApprovals: [],
        };
    }
    if (query.includes('aosAudit')) return { aosAudit: [] };
    if (/\bme\s*\{/.test(query) && !query.includes('meeting')) return { me: mockUser };
    if (query.includes('refreshToken')) {
        return { refreshToken: { accessToken: 'qa-access-token', refreshToken: 'qa-refresh-token' } };
    }
    return {};
}

async function installGraphqlRoute(
    context: BrowserContext,
    kasirSnapshot: Record<string, unknown>,
    kasirFail = false,
    aosOpts?: AosMockOptions,
) {
    await context.route('**/*', async (route) => {
        const url = route.request().url();
        if (!url.includes('graphql')) {
            await route.continue();
            return;
        }
        if (route.request().method() !== 'POST') {
            await route.continue();
            return;
        }
        const query = parseGraphqlQuery(route.request());
        const data = graphqlDataForQuery(query, kasirSnapshot, kasirFail, aosOpts);
        if (data === 'kasir_fail') {
            await route.abort('failed');
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data }),
        });
    });
}

/** Auth + AOS snapshot mocks; Kasir live query fails (UI must show unavailable, not mock metrics). */
export async function installAuthAndAosMocks(context: BrowserContext, aosOpts?: AosMockOptions) {
    await installGraphqlRoute(context, {}, true, aosOpts);
}

export async function installGraphqlMocks(
    context: BrowserContext,
    kasirSnapshot: Record<string, unknown>,
    kasirFail = false,
    aosOpts?: AosMockOptions,
) {
    await installGraphqlRoute(context, kasirSnapshot, kasirFail, aosOpts);
}
