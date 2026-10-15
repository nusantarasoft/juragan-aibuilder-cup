import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import * as express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthService } from '../auth/auth.service';
import { GlobalAuthGuard } from '../auth/global-auth.guard';
import { StudioKnowledgeGraphResolver } from './studio-knowledge-graph.resolver';
import { StudioKnowledgeGraphService } from './studio-knowledge-graph.service';
import { AOS_DEFAULT_TENANT } from '../agentic-os/agentic-os.types';

const OVERVIEW_QUERY = `query { studioKnowledgeGraphOverview { stats { totalNodes } tree { key } } }`;
const OVERVIEW_TENANT_QUERY = `query O($tenantId: String) { studioKnowledgeGraphOverview(tenantId: $tenantId) { stats { totalNodes } } }`;

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

describe('studioKnowledgeGraph GraphQL auth (GlobalAuthGuard)', () => {
    let app: INestApplication;
    let baseUrl: string;
    const getUser = vi.fn();
    const getOverview = vi.fn().mockResolvedValue({ stats: { totalNodes: 0 }, tree: [] });

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
                StudioKnowledgeGraphResolver,
                GlobalAuthGuard,
                { provide: APP_GUARD, useExisting: GlobalAuthGuard },
                { provide: AuthService, useValue: { getUser } },
                {
                    provide: StudioKnowledgeGraphService,
                    useValue: { getOverview, search: vi.fn(), getChunkDetail: vi.fn() },
                },
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

    it('rejects unauthenticated studioKnowledgeGraphOverview', async () => {
        getOverview.mockClear();
        const { json } = await postGraphql(baseUrl, OVERVIEW_QUERY);
        expect(json.errors?.[0]?.message).toMatch(/authentication required/i);
        expect(getOverview).not.toHaveBeenCalled();
    });

    it('rejects cross-tenant overview for admin role', async () => {
        getUser.mockResolvedValue({ id: 'admin-1', email: 'a@x.com', role: 'admin' });
        getOverview.mockClear();
        const { json } = await postGraphql(
            baseUrl,
            OVERVIEW_TENANT_QUERY,
            { tenantId: '00000000-0000-0000-0000-000000000099' },
            'valid-token',
        );
        expect(json.errors?.[0]?.message).toMatch(/do not have access/i);
        expect(getOverview).not.toHaveBeenCalled();
        getUser.mockReset();
    });

    it('returns overview for authenticated admin on home tenant', async () => {
        getUser.mockResolvedValue({ id: 'admin-1', email: 'a@x.com', role: 'admin' });
        getOverview.mockResolvedValue({ stats: { totalNodes: 3 }, tree: [{ key: 'nb:1' }] });
        const { json } = await postGraphql(baseUrl, OVERVIEW_QUERY, {}, 'valid-token');
        expect(json.errors).toBeUndefined();
        expect(getOverview).toHaveBeenCalledWith(AOS_DEFAULT_TENANT, 40);
    });
});
