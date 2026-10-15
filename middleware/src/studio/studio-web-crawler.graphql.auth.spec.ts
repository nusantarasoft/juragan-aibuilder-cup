import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import * as express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthService } from '../auth/auth.service';
import { GlobalAuthGuard } from '../auth/global-auth.guard';
import { StudioWebCrawlerResolver } from './studio-web-crawler.resolver';
import { StudioWebCrawlerService } from './studio-web-crawler.service';
import { AOS_DEFAULT_TENANT } from '../agentic-os/agentic-os.types';

const JOBS_QUERY = `query { studioWebCrawlJobs { id status } }`;
const JOBS_TENANT_QUERY = `query Jobs($tenantId: String) { studioWebCrawlJobs(tenantId: $tenantId) { id } }`;

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

describe('studioWebCrawlJobs GraphQL auth (GlobalAuthGuard)', () => {
    let app: INestApplication;
    let baseUrl: string;
    const getUser = vi.fn();
    const listJobs = vi.fn().mockResolvedValue([]);

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
                StudioWebCrawlerResolver,
                GlobalAuthGuard,
                { provide: APP_GUARD, useExisting: GlobalAuthGuard },
                { provide: AuthService, useValue: { getUser } },
                { provide: StudioWebCrawlerService, useValue: { listJobs, createJob: vi.fn(), deleteJob: vi.fn() } },
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

    it('rejects unauthenticated studioWebCrawlJobs', async () => {
        listJobs.mockClear();
        const { json } = await postGraphql(baseUrl, JOBS_QUERY);
        expect(json.errors?.[0]?.message).toMatch(/authentication required/i);
        expect(listJobs).not.toHaveBeenCalled();
    });

    it('rejects cross-tenant studioWebCrawlJobs for admin role', async () => {
        getUser.mockResolvedValue({ id: 'admin-1', email: 'a@x.com', role: 'admin' });
        listJobs.mockClear();
        const { json } = await postGraphql(
            baseUrl,
            JOBS_TENANT_QUERY,
            { tenantId: '00000000-0000-0000-0000-000000000099' },
            'valid-token',
        );
        expect(json.errors?.[0]?.message).toMatch(/do not have access/i);
        expect(listJobs).not.toHaveBeenCalled();
        getUser.mockReset();
    });

    it('returns jobs for authenticated admin on home tenant', async () => {
        getUser.mockResolvedValue({ id: 'admin-1', email: 'a@x.com', role: 'admin' });
        listJobs.mockResolvedValue([{ id: 'j1', status: 'pending' }]);
        const { json } = await postGraphql(baseUrl, JOBS_QUERY, {}, 'valid-token');
        expect(json.errors).toBeUndefined();
        expect(listJobs).toHaveBeenCalledWith(AOS_DEFAULT_TENANT);
    });
});
