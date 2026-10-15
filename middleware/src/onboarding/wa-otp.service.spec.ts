import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { assertWaOtpProductionConfig } from './onboarding-env';
import { WaOtpService, resetWaOtpForTests } from './wa-otp.service';
import type { WaOtpOutboundService } from './wa-otp-outbound.service';

const STORE = '00000000-0000-0000-0000-000000000301';
const PHONE = '6281234567890';

function configMap(values: Record<string, string>): ConfigService {
    return { get: (key: string) => values[key] } as ConfigService;
}

function outboundMock(sendResult: { success: boolean; error?: string } = { success: true }) {
    return {
        sendOwnerOtp: vi.fn(async () => sendResult),
    } as unknown as WaOtpOutboundService;
}

describe('WaOtpService', () => {
    beforeEach(() => resetWaOtpForTests());

    it('blocks production startup when WA_OTP_MOCK=true', () => {
        expect(() =>
            assertWaOtpProductionConfig(
                configMap({ NODE_ENV: 'production', WA_OTP_MOCK: 'true', WA_OTP_SECRET: 'prod-secret' }),
            ),
        ).toThrow(/WA_OTP_MOCK must not be set in production/);
    });

    it('blocks production startup when WA_OTP_SECRET missing', () => {
        expect(() =>
            assertWaOtpProductionConfig(configMap({ NODE_ENV: 'production', WA_OTP_SECRET: '' })),
        ).toThrow(/WA_OTP_SECRET must be set/);
    });

    it('production ignores mock flag — no mockCode even if WA_OTP_MOCK set in config getter', async () => {
        const outbound = outboundMock();
        const otp = new WaOtpService(
            configMap({ NODE_ENV: 'production', WA_OTP_SECRET: 'prod-secret', WA_OTP_MOCK: 'true' }),
            outbound,
        );
        expect(otp.isMockMode()).toBe(false);
        const res = await otp.requestOtp(STORE, PHONE, '1.1.1.1');
        expect(res.mockCode).toBeUndefined();
        expect(res.delivery).toBe('wa');
        expect(outbound.sendOwnerOtp).toHaveBeenCalledOnce();
    });

    it('non-prod WA_OTP_MOCK returns mockCode and skips Hermes', async () => {
        const outbound = outboundMock();
        const otp = new WaOtpService(
            configMap({ NODE_ENV: 'development', WA_OTP_MOCK: 'true' }),
            outbound,
        );
        const res = await otp.requestOtp(STORE, PHONE, '1.1.1.1');
        expect(res.mockCode).toMatch(/^\d{6}$/);
        expect(res.delivery).toBe('mock');
        expect(outbound.sendOwnerOtp).not.toHaveBeenCalled();
    });

    it('prod path surfaces send failure to caller', async () => {
        const outbound = outboundMock({ success: false, error: 'bridge down' });
        const otp = new WaOtpService(
            configMap({ NODE_ENV: 'production', WA_OTP_SECRET: 'prod-secret' }),
            outbound,
        );
        await expect(otp.requestOtp(STORE, PHONE, '1.1.1.1')).rejects.toThrow(ServiceUnavailableException);
        expect(outbound.sendOwnerOtp).toHaveBeenCalledOnce();
    });

    it('onModuleInit enforces production secret', () => {
        const otp = new WaOtpService(configMap({ NODE_ENV: 'production' }), outboundMock());
        expect(() => otp.onModuleInit()).toThrow(/WA_OTP_SECRET/);
    });
});
