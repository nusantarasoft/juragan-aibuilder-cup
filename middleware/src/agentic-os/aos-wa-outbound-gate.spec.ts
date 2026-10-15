import { describe, expect, it, vi } from 'vitest';
import {
    assertTenantOutboundCustomerSendAllowed,
    isTenantWaChannelConnected,
    WaOutboundBlockedError,
} from './aos-wa-outbound-gate';

const TENANT = '00000000-0000-0000-0000-000000000201';

function dbWithConfig(row: { enabled?: boolean; notebook_id?: string | null } | null) {
    return {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({ data: row })),
                })),
            })),
        })),
    } as any;
}

describe('aos-wa-outbound-gate', () => {
    it('returns false when WA not configured', async () => {
        expect(await isTenantWaChannelConnected(dbWithConfig(null), TENANT)).toBe(false);
    });

    it('returns true when enabled with notebook', async () => {
        expect(
            await isTenantWaChannelConnected(dbWithConfig({ enabled: true, notebook_id: 'nb-1' }), TENANT),
        ).toBe(true);
    });

    it('blocks outbound when not connected', async () => {
        await expect(assertTenantOutboundCustomerSendAllowed(dbWithConfig(null), TENANT)).rejects.toThrow(
            WaOutboundBlockedError,
        );
    });
});
