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

const OWNER_TENANT = '00000000-0000-0000-0000-000000000201';
const OTHER_TENANT = '00000000-0000-0000-0000-000000000099';
const AGENT_ID = '00000000-0000-0000-0000-000000000301';

const LIST_QUERY = `query { aosTenantOwnerAgentSettingsList { agentId } }`;
const LIST_TENANT_QUERY = `query($tenantId: String) { aosTenantOwnerAgentSettingsList(tenantId: $tenantId) { agentId } }`;
const UPDATE_MUTATION = `mutation($agentId: String!, $input: AosTenantOwnerAgentSettingsInput!) {
  aosTenantOwnerUpdateAgentSettings(agentId: $agentId, input: $input) { agentId status }
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

describe('F2-4 tenant owner agent settings GraphQL auth', () => {
    let app: INestApplication;
    let baseUrl: string;
    const getUser = vi.fn();
    const listOwnerSettings = vi.fn().mockResolvedValue([]);
    const updateOwnerSettings = vi.fn().mockResolvedValue({ agentId: AGENT_ID, status: 'paused' });

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
                {
                    provide: AgenticOsService,
                    useValue: {
                        listAgents: vi.fn(),
                        listTasks: vi.fn(),
                        listPlaybooks: vi.fn(),
                        listApprovals: vi.fn(),
                        getSettings: vi.fn(),
                        getStats: vi.fn(),
                    },
                },
                { provide: AgenticOsPulse, useValue: {} },
                { provide: AgenticOsWorkflows, useValue: {} },
                { provide: AgenticOsGoals, useValue: {} },
                { provide: AosRecruitService, useValue: { listCatalogForRole: vi.fn(), getRecruitStatus: vi.fn() } },
                {
                    provide: AosTenantAgentSettingsService,
                    useValue: { listOwnerSettings, updateOwnerSettings, getOwnerSettings: vi.fn() },
                },
                { provide: AosUsageMetricsService, useValue: { getMetrics: vi.fn() } },
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

    it('rejects unauthenticated list', async () => {
        listOwnerSettings.mockClear();
        const { json } = await postGraphql(baseUrl, LIST_QUERY);
        expect(json.errors?.[0]?.message).toMatch(/authentication required/i);
        expect(listOwnerSettings).not.toHaveBeenCalled();
    });

    it('rejects cross-tenant list for tenant_owner', async () => {
        getUser.mockResolvedValue({
            id: 'owner-1',
            email: 'o@x.com',
            role: 'tenant_owner',
            tenantId: OWNER_TENANT,
        });
        listOwnerSettings.mockClear();
        const { json } = await postGraphql(baseUrl, LIST_TENANT_QUERY, { tenantId: OTHER_TENANT }, 'token');
        expect(json.errors?.[0]?.message).toMatch(/do not have access/i);
        expect(listOwnerSettings).not.toHaveBeenCalled();
    });

    it('allows tenant_owner home tenant list', async () => {
        getUser.mockResolvedValue({
            id: 'owner-1',
            email: 'o@x.com',
            role: 'tenant_owner',
            tenantId: OWNER_TENANT,
        });
        listOwnerSettings.mockResolvedValue([{ agentId: AGENT_ID }]);
        const { json } = await postGraphql(baseUrl, LIST_QUERY, {}, 'token');
        expect(json.errors).toBeUndefined();
        expect(listOwnerSettings).toHaveBeenCalledWith(OWNER_TENANT);
    });

    it('rejects unauthenticated mutation', async () => {
        updateOwnerSettings.mockClear();
        const { json } = await postGraphql(baseUrl, UPDATE_MUTATION, {
            agentId: AGENT_ID,
            input: { status: 'paused' },
        });
        expect(json.errors?.[0]?.message).toMatch(/sign in|authentication/i);
        expect(updateOwnerSettings).not.toHaveBeenCalled();
    });
});
