import { describe, expect, it, vi } from 'vitest';
import { buildDedicatedSessionName, WaDedicatedService } from './wa-dedicated.service';
import { WA_INBOX_DEDICATED } from './wa-dedicated.constants';

describe('buildDedicatedSessionName', () => {
    it('prefixes and sanitizes studio slug', () => {
        expect(buildDedicatedSessionName('UMKM Warung Bu Ani')).toBe('umkm-umkm-warung-bu-ani');
    });
});

describe('WaDedicatedService', () => {
    const storeRow = {
        id: 'store-1',
        tenant_id: '00000000-0000-0000-0000-000000000010',
        studio_slug: 'umkm-qa-store',
        wa_inbox_mode: WA_INBOX_DEDICATED,
        wa_dedicated_session_name: 'umkm-umkm-qa-store',
        wa_dedicated_business_phone: null,
        wa_dedicated_paired_at: null,
        owner_phone_verified_at: '2026-01-01T00:00:00Z',
    };

    function svc(env: Record<string, string> = { WA_DEDICATED_PAIR_MOCK: '1' }) {
        const updates: Record<string, unknown>[] = [];
        const admin = {
            from: (table: string) => ({
                select: () => ({
                    eq: () => ({
                        maybeSingle: async () => ({
                            data: table === 'tenant_stores' ? { ...storeRow } : null,
                            error: null,
                        }),
                    }),
                }),
                update: (patch: Record<string, unknown>) => ({
                    eq: async () => {
                        updates.push({ table, patch });
                        return { error: null };
                    },
                }),
            }),
        };
        const config = {
            get: (k: string) => env[k],
        };
        const hermes = {
            getSessionStatus: vi.fn(),
            startSession: vi.fn(),
            logoutSession: vi.fn(),
            getAuthQr: vi.fn(),
        };
        return {
            service: new WaDedicatedService(
                { getAdminClient: () => admin } as any,
                config as any,
                hermes as any,
            ),
            updates,
            hermes,
        };
    }

    it('mock startDedicatedPair persists business phone', async () => {
        const { service, updates } = svc();
        await service.startDedicatedPair('store-1');
        expect(updates.some((u) => u.table === 'tenant_stores' && u.patch.wa_dedicated_business_phone)).toBe(
            true,
        );
    });

    it('assertDedicatedReadyIfNeeded fails when not paired', async () => {
        const { service } = svc({ WA_DEDICATED_PAIR_MOCK: '0', WA_TENANT_DEDICATED_PAIR: '0' });
        await expect(service.assertDedicatedReadyIfNeeded('store-1')).rejects.toThrow(/belum ter-pair/i);
    });
});
