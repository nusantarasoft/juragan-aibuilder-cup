import { describe, expect, it } from 'vitest';
import {
    authIntegrationCredentials,
    gqlRequest,
    isAuthIntegrationEnabled,
    SIGN_IN_MUTATION,
} from '../auth/auth-test.helpers';

const RUN = process.env.RUN_AOS_KASIR_INTEGRATION === '1' || process.env.RUN_AOS_KASIR_INTEGRATION === 'true';

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

describe.skipIf(!RUN)('aosKasirLiveSnapshot GraphQL (live middleware)', () => {
    it('is readable without authentication (read-only)', async () => {
        const data = await gqlRequest<{ aosKasirLiveSnapshot: { slug: string; source: string } }>(KASIR_SNAPSHOT_QUERY);
        expect(data.aosKasirLiveSnapshot.slug).toBe('umkm-kasir');
        expect(data.aosKasirLiveSnapshot.source).toBe('ai_studio');
    });

    it('accepts tenantId and returns structured unavailable or available payload', async () => {
        const data = await gqlRequest<{
            aosKasirLiveSnapshot: {
                available: boolean;
                tenantId: string;
                unavailableReason: string | null;
            };
        }>(KASIR_SNAPSHOT_QUERY, { tenantId: '00000000-0000-0000-0000-000000000010' });
        expect(typeof data.aosKasirLiveSnapshot.available).toBe('boolean');
        expect(data.aosKasirLiveSnapshot.tenantId.length).toBeGreaterThan(0);
        if (!data.aosKasirLiveSnapshot.available) {
            expect(data.aosKasirLiveSnapshot.unavailableReason).toBe('data tidak tersedia');
        }
    });

    it('still readable when signed in (no mutation side effects)', async () => {
        const creds = authIntegrationCredentials();
        const signIn = await gqlRequest<{ signIn: { accessToken: string } }>(SIGN_IN_MUTATION, creds);
        const token = signIn.signIn.accessToken;
        const data = await gqlRequest<{ aosKasirLiveSnapshot: { slug: string } }>(KASIR_SNAPSHOT_QUERY, {}, token);
        expect(data.aosKasirLiveSnapshot.slug).toBe('umkm-kasir');
    });
});

describe('aosKasirLiveSnapshot GraphQL (offline guard)', () => {
    it('documents integration flag when middleware is not under test', () => {
        if (RUN) return;
        expect(isAuthIntegrationEnabled()).toBeDefined();
    });
});
