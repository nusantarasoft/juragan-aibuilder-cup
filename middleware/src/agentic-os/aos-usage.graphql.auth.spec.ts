import { ForbiddenException } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import * as express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AgenticOsResolver } from './agentic-os.resolver';
import { AosTaskQueueEvents } from './aos-task-queue.events';
import { AuthService } from '../auth/auth.service';
import { GlobalAuthGuard } from '../auth/global-auth.guard';
import { AosKasirLiveService } from './aos-kasir-live.service';
import { AgenticOsService } from './agentic-os.service';
import { AgenticOsPulse } from './agentic-os.pulse';
import { AgenticOsWorkflows } from './agentic-os.workflows';
import { AgenticOsGoals } from './agentic-os.goals';
import { AosRecruitService } from './aos-recruit.service';
import { AosTenantAgentSettingsService } from './aos-tenant-agent-settings.service';
import { AosUsageMetricsService } from './aos-usage-metrics.service';
import { resolveAosTenant } from './aos-tenant-access';

const OWNER_TENANT = '00000000-0000-0000-0000-000000000201';
const OTHER = '00000000-0000-0000-0000-000000000099';

const USAGE_QUERY = `query Usage($tenantId: String) {
  aosTenantUsageMetrics(tenantId: $tenantId) { tenantId available recruitedAgents }
}`;

async function postGraphql(
    baseUrl: string,
    query: string,
    variables?: Record<string, unknown>,
    token?: string,
): Promise<{ json: { data?: unknown; errors?: { message: string }[] } }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables: variables ?? {} }),
    });
    const json = (await res.json()) as { data?: unknown; errors?: { message: string }[] };
    return { json };
}

describe('F3-2 aosTenantUsageMetrics tenant scoping', () => {
    it('rejects tenant_owner cross-tenant', () => {
        expect(() =>
            resolveAosTenant({ id: 'u1', role: 'tenant_owner', tenantId: OWNER_TENANT }, OTHER),
        ).toThrow(ForbiddenException);
    });
});

describe('aosTenantUsageMetrics GraphQL auth', () => {
    let app: INestApplication;
    let baseUrl: string;
    const getUser = vi.fn();
    const getMetrics = vi.fn().mockResolvedValue({
        available: true,
        tenantId: OWNER_TENANT,
        periodDays: 30,
        periodStart: '',
        periodEnd: '',
        unavailableReason: null,
        recruitedAgents: 1,
        waChatsToday: 0,
        tasksCreated: 0,
        tasksCompleted: 0,
        tasksFailed: 0,
        waInboundMessages: 0,
        waOutboundReplies: 0,
        crawlJobs: 0,
        builderWorkflows: 0,
        kgEmbeddedChunks: 0,
        agents: [],
    });

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                GraphQLModule.forRoot<ApolloDriverConfig>({
                    driver: ApolloDriver,
                    autoSchemaFile: true,
                    context: ({ req, res }) => ({ req, res }),
                }),
            ],
            providers: [
                AgenticOsResolver,
                AosTaskQueueEvents,
                GlobalAuthGuard,
                { provide: APP_GUARD, useExisting: GlobalAuthGuard },
                { provide: AuthService, useValue: { getUser } },
                { provide: AosKasirLiveService, useValue: { getSnapshot: vi.fn() } },
                { provide: AgenticOsService, useValue: { listAgents: vi.fn(), listTasks: vi.fn() } },
                { provide: AgenticOsPulse, useValue: {} },
                { provide: AgenticOsWorkflows, useValue: {} },
                { provide: AgenticOsGoals, useValue: {} },
                { provide: AosRecruitService, useValue: {} },
                { provide: AosTenantAgentSettingsService, useValue: {} },
                { provide: AosUsageMetricsService, useValue: { getMetrics } },
            ],
        }).compile();

        app = moduleRef.createNestApplication({ bodyParser: false });
        app.use(express.json());
        app.useGlobalGuards(new GlobalAuthGuard(new Reflector(), moduleRef.get(AuthService)));
        await app.listen(0);
        const addr = app.getHttpServer().address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        baseUrl = `http://127.0.0.1:${port}`;
    });

    afterAll(async () => {
        await app?.close();
    });

    it('rejects unauthenticated usage query', async () => {
        getMetrics.mockClear();
        const { json } = await postGraphql(baseUrl, USAGE_QUERY);
        expect(json.errors?.[0]?.message).toMatch(/authentication required/i);
        expect(getMetrics).not.toHaveBeenCalled();
    });

    it('returns metrics for tenant_owner home tenant', async () => {
        getUser.mockResolvedValue({ id: 'u1', role: 'tenant_owner', tenantId: OWNER_TENANT });
        getMetrics.mockClear();
        const { json } = await postGraphql(baseUrl, USAGE_QUERY, {}, 'token');
        expect(json.errors).toBeUndefined();
        expect(
            (json.data as { aosTenantUsageMetrics: { tenantId: string } }).aosTenantUsageMetrics.tenantId,
        ).toBe(OWNER_TENANT);
        expect(getMetrics).toHaveBeenCalledWith(OWNER_TENANT, 30);
    });
});
