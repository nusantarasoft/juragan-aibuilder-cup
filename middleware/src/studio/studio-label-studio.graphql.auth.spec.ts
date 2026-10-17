import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import * as express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthService } from '../auth/auth.service';
import { GlobalAuthGuard } from '../auth/global-auth.guard';
import { StudioLabelStudioResolver } from './studio-label-studio.resolver';
import { StudioLabelStudioService } from './studio-label-studio.service';
import { AOS_DEFAULT_TENANT } from '../agentic-os/agentic-os.types';

const DASH_QUERY = `query { studioLabelStudioDashboard { configured projects { id } } }`;
const DASH_TENANT_QUERY = `query D($tenantId: String) { studioLabelStudioDashboard(tenantId: $tenantId) { configured } }`;

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

describe('studioLabelStudioDashboard GraphQL auth (GlobalAuthGuard)', () => {
    let app: INestApplication;
    let baseUrl: string;
    const getUser = vi.fn();
    const getDashboard = vi.fn().mockResolvedValue({ configured: true, projects: [] });

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
                StudioLabelStudioResolver,
                GlobalAuthGuard,
                { provide: APP_GUARD, useExisting: GlobalAuthGuard },
                { provide: AuthService, useValue: { getUser } },
                {
                    provide: StudioLabelStudioService,
                    useValue: { getDashboard },
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

    it('rejects unauthenticated studioLabelStudioDashboard', async () => {
        getDashboard.mockClear();
        const { json } = await postGraphql(baseUrl, DASH_QUERY);
        expect(json.errors?.[0]?.message).toMatch(/authentication required/i);
        expect(getDashboard).not.toHaveBeenCalled();
    });

    it('rejects cross-tenant studioLabelStudioDashboard for admin role', async () => {
        getUser.mockResolvedValue({ id: 'admin-1', email: 'a@x.com', role: 'admin' });
        getDashboard.mockClear();
        const { json } = await postGraphql(
            baseUrl,
            DASH_TENANT_QUERY,
            { tenantId: '00000000-0000-0000-0000-000000000099' },
            'valid-token',
        );
        expect(json.errors?.[0]?.message).toMatch(/do not have access/i);
        expect(getDashboard).not.toHaveBeenCalled();
        getUser.mockReset();
    });

    it('returns dashboard for authenticated admin on home tenant', async () => {
        getUser.mockResolvedValue({ id: 'admin-1', email: 'a@x.com', role: 'admin' });
        getDashboard.mockResolvedValue({ configured: true, projects: [{ id: 1 }] });
        const { json } = await postGraphql(baseUrl, DASH_QUERY, {}, 'valid-token');
        expect(json.errors).toBeUndefined();
        expect(getDashboard).toHaveBeenCalledWith(AOS_DEFAULT_TENANT);
    });
});
