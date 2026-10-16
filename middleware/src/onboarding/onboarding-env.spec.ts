import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import {
    assertOnboardingProductionBootConfig,
    assertWaOtpProductionBootConfig,
    isOnboardingCaptchaProviderConfigured,
    isWaOtpSecretConfigured,
} from './onboarding-env';

function configMap(values: Record<string, string>): ConfigService {
    return { get: (key: string) => values[key] } as ConfigService;
}

describe('onboarding-env production boot (relax-fail-closed)', () => {
    it('allows production boot without Turnstile/hCaptcha secrets', () => {
        const config = configMap({ NODE_ENV: 'production' });
        expect(() => assertOnboardingProductionBootConfig(config)).not.toThrow();
        expect(isOnboardingCaptchaProviderConfigured(config)).toBe(false);
    });

    it('still blocks CAPTCHA_DISABLED in production', () => {
        expect(() =>
            assertOnboardingProductionBootConfig(
                configMap({ NODE_ENV: 'production', CAPTCHA_DISABLED: 'true' }),
            ),
        ).toThrow(/CAPTCHA_DISABLED must not be set in production/);
    });

    it('still blocks dev captcha secret default in production', () => {
        expect(() =>
            assertOnboardingProductionBootConfig(
                configMap({
                    NODE_ENV: 'production',
                    ONBOARDING_CAPTCHA_SECRET: 'f2-1-dev-captcha',
                }),
            ),
        ).toThrow(/dev default/);
    });

    it('allows production boot without WA_OTP_SECRET', () => {
        const config = configMap({ NODE_ENV: 'production', WA_OTP_SECRET: '' });
        expect(() => assertWaOtpProductionBootConfig(config)).not.toThrow();
        expect(isWaOtpSecretConfigured(config)).toBe(false);
    });

    it('still blocks WA_OTP_MOCK in production', () => {
        expect(() =>
            assertWaOtpProductionBootConfig(
                configMap({ NODE_ENV: 'production', WA_OTP_MOCK: 'true', WA_OTP_SECRET: 'x' }),
            ),
        ).toThrow(/WA_OTP_MOCK must not be set in production/);
    });

    it('still blocks dev WA_OTP_SECRET default in production', () => {
        expect(() =>
            assertWaOtpProductionBootConfig(
                configMap({ NODE_ENV: 'production', WA_OTP_SECRET: 'f2-3-dev-wa-otp' }),
            ),
        ).toThrow(/dev default/);
    });
});
