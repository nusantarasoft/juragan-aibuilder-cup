import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { WaOtpService, resetWaOtpForTests } from './wa-otp.service';
import { TenantMembershipService } from './tenant-membership.service';
import type { WaOtpOutboundService } from './wa-otp-outbound.service';

const STORE = '00000000-0000-0000-0000-000000000301';
const PHONE = '6281234567890';

function configMap(values: Record<string, string>): ConfigService {
    return { get: (key: string) => values[key] } as ConfigService;
}

function outboundMock() {
    return { sendOwnerOtp: vi.fn(async () => ({ success: true })) } as unknown as WaOtpOutboundService;
}

describe('F2-3 WA connect security', () => {
    beforeEach(() => resetWaOtpForTests());

    it('rate limits OTP requests per store', async () => {
        const otp = new WaOtpService(
            configMap({ NODE_ENV: 'development', WA_OTP_MOCK: 'true' }),
            outboundMock(),
        );
        for (let i = 0; i < 5; i++) {
            await otp.requestOtp(STORE, PHONE, '1.1.1.1');
        }
        await expect(otp.requestOtp(STORE, PHONE, '1.1.1.1')).rejects.toThrow(ForbiddenException);
    });

    it('rejects wrong OTP after verify attempts', async () => {
        const otp = new WaOtpService(
            configMap({ NODE_ENV: 'development', WA_OTP_MOCK: 'true' }),
            outboundMock(),
        );
        const { mockCode } = await otp.requestOtp(STORE, PHONE, '1.1.1.1');
        expect(mockCode).toMatch(/^\d{6}$/);
        expect(() => otp.verifyOtp(STORE, PHONE, '000000')).toThrow(/OTP salah/);
        otp.verifyOtp(STORE, PHONE, mockCode!);
        expect(() => otp.verifyOtp(STORE, PHONE, mockCode!)).toThrow(/kedaluwarsa/);
    });

    it('rejects tenant_owner cross-tenant store access (unit)', async () => {
        const svc = new TenantMembershipService({ getAdminClient: () => ({}) } as any);
        await expect(
            svc.assertTenantAccess(
                { id: 'u1', role: 'tenant_owner', tenantId: '00000000-0000-0000-0000-000000000201' },
                '00000000-0000-0000-0000-000000000099',
            ),
        ).rejects.toThrow(ForbiddenException);
    });
});
