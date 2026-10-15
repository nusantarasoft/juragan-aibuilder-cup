import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CaptchaService } from './captcha.service';
import { checkOnboardingRateLimit, resetOnboardingRateLimitsForTests } from './onboarding-rate-limit';
import { getTrustedClientIp } from './request-client-ip';
import { OnboardingService } from './onboarding.service';

function configMap(values: Record<string, string>): ConfigService {
    return {
        get: (key: string) => values[key],
    } as ConfigService;
}

describe('F2-1 onboarding security', () => {
    beforeEach(() => resetOnboardingRateLimitsForTests());
    afterEach(() => resetOnboardingRateLimitsForTests());

    it('dev captcha mint forbidden in production mode', () => {
        const captcha = new CaptchaService(
            configMap({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: 'ts-secret' }),
        );
        captcha.onModuleInit();
        expect(() => captcha.mintDevToken()).toThrow(ForbiddenException);
    });

    it('rejects default ONBOARDING_CAPTCHA_SECRET in production on init', () => {
        const captcha = new CaptchaService(
            configMap({
                NODE_ENV: 'production',
                TURNSTILE_SECRET_KEY: 'ts-secret',
                ONBOARDING_CAPTCHA_SECRET: 'f2-1-dev-captcha',
            }),
        );
        expect(() => captcha.onModuleInit()).toThrow(/ONBOARDING_CAPTCHA_SECRET/);
    });

    it('getTrustedClientIp uses req.ip not raw X-Forwarded-For', () => {
        const ip = getTrustedClientIp({
            ip: '203.0.113.10',
            headers: { 'x-forwarded-for': '1.2.3.4' },
        } as import('express').Request);
        expect(ip).toBe('203.0.113.10');
    });

    it('rate limits per email independently from ip', () => {
        expect(checkOnboardingRateLimit('register:ip:1.1.1.1', 2, 60_000)).toBe(true);
        expect(checkOnboardingRateLimit('register:email:a@b.com', 1, 60_000)).toBe(true);
        expect(checkOnboardingRateLimit('register:email:a@b.com', 1, 60_000)).toBe(false);
        expect(checkOnboardingRateLimit('register:ip:1.1.1.1', 2, 60_000)).toBe(true);
    });

    it('rejects forged dev HMAC captcha when dev mode allowed', async () => {
        const captcha = new CaptchaService(
            configMap({
                NODE_ENV: 'development',
                ONBOARDING_ALLOW_DEV_CAPTCHA: 'true',
                ONBOARDING_CAPTCHA_SECRET: 'local-test-secret',
            }),
        );
        const good = captcha.mintDevToken();
        const forged = `${good.split('.')[0]}.${good.split('.')[1]}.deadbeef`;
        await expect(captcha.verifyAsync(forged)).rejects.toThrow(/Invalid captcha token/);
    });

    it('registerTenant returns no tokens when email unverified', async () => {
        const captcha = {
            verifyAsync: vi.fn().mockResolvedValue(undefined),
        };
        const auth = {
            signUp: vi.fn().mockResolvedValue({
                user: { id: 'u1', email_confirmed_at: null },
                session: { access_token: 'tok', refresh_token: 'ref' },
            }),
        };
        const provisioning = {
            provisionStore: vi.fn().mockResolvedValue({
                tenantId: 't1',
                studioSlug: 'umkm-x',
                storeId: 's1',
            }),
        };
        const svc = new OnboardingService(
            auth as any,
            { getAdminClient: () => ({}) } as any,
            captcha as any,
            provisioning as any,
            configMap({}) as any,
        );
        const out = await svc.registerTenant({
            email: 'x@y.com',
            password: 'Password123!',
            storeName: 'Toko',
            captchaToken: 'captcha',
            clientIp: '127.0.0.1',
        });
        expect(out.emailVerified).toBe(false);
        expect(out.accessToken).toBeUndefined();
        expect(out.refreshToken).toBeUndefined();
    });
});
