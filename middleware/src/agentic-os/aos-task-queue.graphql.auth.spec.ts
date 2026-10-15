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
import { AOS_DEFAULT_TENANT } from './agentic-os.types';

const AOS_TASKS_QUERY = `query { aosTasks(limit: 2) { id status } }`;

async function postGraphql(
    baseUrl: string,
    query: string,
    token?: string,
): Promise<{ json: { data?: unknown; errors?: { message: string }[] } }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
    });
    const json = (await res.json()) as { data?: unknown; errors?: { message: string }[] };
    return { json };
}

describe('aosTasks GraphQL auth (GlobalAuthGuard)', () => {
    let app: INestApplication;
    let baseUrl: string;
    const getUser = vi.fn();
    const listTasks = vi.fn().mockResolvedValue([]);

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
                        listTasks,
                        listAgents: vi.fn(),
                        listPlaybooks: vi.fn(),
                        listApprovals: vi.fn(),
                        getSettings: vi.fn(),
                        getStats: vi.fn(),
                    },
                },
                { provide: AgenticOsPulse, useValue: {} },
                { provide: AgenticOsWorkflows, useValue: {} },
                { provide: AgenticOsGoals, useValue: {} },
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

    it('rejects unauthenticated aosTasks', async () => {
        listTasks.mockClear();
        const { json } = await postGraphql(baseUrl, AOS_TASKS_QUERY);
        expect(json.errors?.[0]?.message).toMatch(/authentication required/i);
        expect(listTasks).not.toHaveBeenCalled();
    });

    it('returns tasks for authenticated admin on home tenant', async () => {
        getUser.mockResolvedValue({ id: 'admin-1', email: 'a@x.com', role: 'admin' });
        listTasks.mockResolvedValue([{ id: 't1', status: 'queued' }]);
        const { json } = await postGraphql(baseUrl, AOS_TASKS_QUERY, 'valid-token');
        expect(json.errors).toBeUndefined();
        expect(listTasks).toHaveBeenCalledWith(
            expect.objectContaining({ tenantId: AOS_DEFAULT_TENANT }),
        );
    });
});
