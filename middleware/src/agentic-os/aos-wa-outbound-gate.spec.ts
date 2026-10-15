import { describe, expect, it, vi } from 'vitest';
import {
    assertTenantOutboundCustomerSendAllowed,
    isTenantWaChannelConnected,
    WaOutboundBlockedError,
} from './aos-wa-outbound-gate';

const TENANT = '00000000-0000-4000-8000-000000000201';
const SLUG = 'umkm-test-store';

function dbConnected(overrides?: {
    config?: { enabled?: boolean; notebook_id?: string | null } | null;
    verified?: boolean;
    activated?: boolean;
}) {
    const verified = overrides && 'verified' in overrides ? Boolean(overrides.verified) : true;
    const activated = overrides && 'activated' in overrides ? Boolean(overrides.activated) : true;
    const config =
        overrides && 'config' in overrides ? overrides.config : { enabled: true, notebook_id: 'nb-1' };

    return {
        from: vi.fn((table: string) => {
            if (table === 'tenant_stores') {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            maybeSingle: vi.fn(async () => ({
                                data: {
                                    studio_slug: SLUG,
                                    owner_phone_verified_at: verified ? '2026-01-01' : null,
                                    wa_kasir_activated_at: activated ? '2026-01-01' : null,
                                },
                            })),
                        })),
                    })),
                };
            }
            if (table === 'tenant_slug_aliases') {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            limit: vi.fn(() => ({
                                maybeSingle: vi.fn(async () => ({ data: null })),
                            })),
                        })),
                    })),
                };
            }
            if (table === 'studio_whatsapp_config') {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            maybeSingle: vi.fn(async () => ({ data: config })),
                        })),
                    })),
                };
            }
            throw new Error(`unexpected table ${table}`);
        }),
    } as any;
}

describe('aos-wa-outbound-gate', () => {
    it('returns false when WA not configured', async () => {
        expect(await isTenantWaChannelConnected(dbConnected({ config: null }), TENANT)).toBe(false);
    });

    it('returns false when owner not verified or not activated', async () => {
        expect(
            await isTenantWaChannelConnected(
                dbConnected({ verified: false, activated: true }),
                TENANT,
            ),
        ).toBe(false);
        expect(
            await isTenantWaChannelConnected(
                dbConnected({ verified: true, activated: false }),
                TENANT,
            ),
        ).toBe(false);
    });

    it('returns true when verified, activated, enabled with notebook', async () => {
        expect(await isTenantWaChannelConnected(dbConnected(), TENANT)).toBe(true);
    });

    it('blocks outbound when not connected', async () => {
        await expect(
            assertTenantOutboundCustomerSendAllowed(dbConnected({ config: null }), TENANT),
        ).rejects.toThrow(WaOutboundBlockedError);
    });
});
