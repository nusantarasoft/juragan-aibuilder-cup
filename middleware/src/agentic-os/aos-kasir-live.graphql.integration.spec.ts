import { describe, expect, it } from 'vitest';
import {
    authIntegrationCredentials,
    gqlRequest,
    isAuthIntegrationEnabled,
    SIGN_IN_MUTATION,
} from '../auth/auth-test.helpers';

const RUN = process.env.RUN_AOS_KASIR_INTEGRATION === '1' || process.env.RUN_AOS_KASIR_INTEGRATION === 'true';
const OTHER_TENANT = '00000000-0000-0000-0000-000000000099';

const KASIR_SNAPSHOT_QUERY = `
    query AosKasirLive($tenantId: String) {
        aosKasirLiveSnapshot(tenantId: $tenantId) {
            available
            tenantId
            slug
            name
            source
            unavailableReason
            waChatsToday
            transactionsToday
            waOnline
        }
    }
`;

async function gqlExpectError(query: string, variables?: Record<string, unknown>, token?: string): Promise<string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(
        process.env.AUTH_GRAPHQL_URL?.trim() || process.env.STUDIO_GRAPHQL_URL?.trim() || 'http://127.0.0.1:4001/graphql',
        {
            method: 'POST',
            headers,
            body: JSON.stringify({ query, variables }),
        },
    );
    const payload = (await response.json()) as { errors?: { message: string }[] };
    return payload.errors?.[0]?.message ?? '';
}

describe.skipIf(!RUN)('aosKasirLiveSnapshot GraphQL (live middleware)', () => {
    it('rejects unauthenticated reads', async () => {
        const message = await gqlExpectError(KASIR_SNAPSHOT_QUERY);
        expect(message).toMatch(/sign in/i);
    });

    it('rejects cross-tenant tenantId for admin session', async () => {
        const creds = authIntegrationCredentials();
        const signIn = await gqlRequest<{ signIn: { accessToken: string } }>(SIGN_IN_MUTATION, creds);
        const token = signIn.signIn.accessToken;
        const message = await gqlExpectError(KASIR_SNAPSHOT_QUERY, { tenantId: OTHER_TENANT }, token);
        expect(message).toMatch(/do not have access/i);
    });

    it('returns structured payload for authenticated admin on home tenant', async () => {
        const creds = authIntegrationCredentials();
        const signIn = await gqlRequest<{ signIn: { accessToken: string } }>(SIGN_IN_MUTATION, creds);
        const token = signIn.signIn.accessToken;
        const data = await gqlRequest<{
            aosKasirLiveSnapshot: {
                available: boolean;
                tenantId: string;
                slug: string;
                unavailableReason: string | null;
            };
        }>(KASIR_SNAPSHOT_QUERY, { tenantId: '00000000-0000-0000-0000-000000000010' }, token);
        expect(data.aosKasirLiveSnapshot.slug).toBe('umkm-kasir');
        expect(typeof data.aosKasirLiveSnapshot.available).toBe('boolean');
        expect(data.aosKasirLiveSnapshot.tenantId.length).toBeGreaterThan(0);
        if (!data.aosKasirLiveSnapshot.available) {
            expect(data.aosKasirLiveSnapshot.unavailableReason).toBe('data tidak tersedia');
        }
    });
});

describe('aosKasirLiveSnapshot GraphQL (offline guard)', () => {
    it('documents integration flag when middleware is not under test', () => {
        if (RUN) return;
        expect(isAuthIntegrationEnabled()).toBeDefined();
    });
});
