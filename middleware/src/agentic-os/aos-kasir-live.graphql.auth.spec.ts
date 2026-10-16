import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import * as express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AgenticOsResolver } from './agentic-os.resolver';
import { AosAuthGuard } from './aos-auth.guard';
import { AuthService } from '../auth/auth.service';
import { AosKasirLiveService } from './aos-kasir-live.service';
import { AgenticOsService } from './agentic-os.service';
import { AgenticOsPulse } from './agentic-os.pulse';
import { AgenticOsWorkflows } from './agentic-os.workflows';
import { AgenticOsGoals } from './agentic-os.goals';
import { KASIR_EMPLOYEE_SLUG } from './aos-kasir-live.service';
import { AOS_DEFAULT_TENANT } from './agentic-os.types';

const KASIR_SNAPSHOT_QUERY = `
    query AosKasirLive($tenantId: String) {
        aosKasirLiveSnapshot(tenantId: $tenantId) {
            slug
            tenantId
        }
    }
`;

const snapshot = {
    available: true,
    tenantId: AOS_DEFAULT_TENANT,
    slug: KASIR_EMPLOYEE_SLUG,
    name: 'Kasir UMKM',
    role: 'UMKM WhatsApp Kasir',
    source: 'ai_studio',
    unavailableReason: null,
    waChatsToday: 0,
    transactionsToday: 0,
    lastActivityAt: null,
    waOnline: false,
};

async function postGraphql(
    baseUrl: string,
    query: string,
    variables?: Record<string, unknown>,
    token?: string,
): Promise<{ status: number; json: { data?: unknown; errors?: { message: string }[] } }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables }),
    });
    const json = (await res.json()) as { data?: unknown; errors?: { message: string }[] };
    return { status: res.status, json };
}

describe('aosKasirLiveSnapshot GraphQL auth (in-process HTTP)', () => {
    let app: INestApplication;
    let baseUrl: string;
    const getUser = vi.fn();
    const getSnapshot = vi.fn().mockResolvedValue(snapshot);
    const prevAnonymous = process.env.AOS_ALLOW_ANONYMOUS;

    beforeAll(async () => {
        process.env.AOS_ALLOW_ANONYMOUS = 'true';
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
                AosAuthGuard,
                { provide: AuthService, useValue: { getUser } },
                { provide: AosKasirLiveService, useValue: { getSnapshot } },
                { provide: AgenticOsService, useValue: {} },
                { provide: AgenticOsPulse, useValue: {} },
                { provide: AgenticOsWorkflows, useValue: {} },
                { provide: AgenticOsGoals, useValue: {} },
            ],
        }).compile();

        app = moduleRef.createNestApplication({ bodyParser: false });
        app.use(express.json());
        await app.listen(0);
        const addr = app.getHttpServer().address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        baseUrl = `http://127.0.0.1:${port}`;
    });

    afterAll(async () => {
        if (prevAnonymous === undefined) delete process.env.AOS_ALLOW_ANONYMOUS;
        else process.env.AOS_ALLOW_ANONYMOUS = prevAnonymous;
        await app?.close();
    });

    it('rejects unauthenticated GraphQL POST (even when AOS_ALLOW_ANONYMOUS=true)', async () => {
        getSnapshot.mockClear();
        const { json } = await postGraphql(baseUrl, KASIR_SNAPSHOT_QUERY);
        expect(json.errors?.[0]?.message).toMatch(/sign in/i);
        expect(getSnapshot).not.toHaveBeenCalled();
    });

    it('rejects cross-tenant tenantId for admin role', async () => {
        getUser.mockResolvedValueOnce({ id: 'admin-1', email: 'a@x.com', role: 'admin' });
        getSnapshot.mockClear();
        const { json } = await postGraphql(
            baseUrl,
            KASIR_SNAPSHOT_QUERY,
            { tenantId: '00000000-0000-0000-0000-000000000099' },
            'valid-token',
        );
        expect(json.errors?.[0]?.message).toMatch(/do not have access/i);
        expect(getSnapshot).not.toHaveBeenCalled();
    });

    it('returns snapshot for authenticated admin on home tenant', async () => {
        getUser.mockResolvedValueOnce({ id: 'admin-1', email: 'a@x.com', role: 'admin' });
        getSnapshot.mockResolvedValueOnce(snapshot);
        const { json } = await postGraphql(baseUrl, KASIR_SNAPSHOT_QUERY, {}, 'valid-token');
        expect(json.errors).toBeUndefined();
        expect((json.data as { aosKasirLiveSnapshot: { slug: string } }).aosKasirLiveSnapshot.slug).toBe(
            KASIR_EMPLOYEE_SLUG,
        );
        expect(getSnapshot).toHaveBeenCalledWith(AOS_DEFAULT_TENANT);
    });

    it('propagates invalid token from AuthService', async () => {
        getUser.mockRejectedValueOnce(new UnauthorizedException('Invalid session'));
        const { json } = await postGraphql(baseUrl, KASIR_SNAPSHOT_QUERY, {}, 'bad-token');
        expect(json.errors?.[0]?.message).toMatch(/invalid session/i);
    });
});
