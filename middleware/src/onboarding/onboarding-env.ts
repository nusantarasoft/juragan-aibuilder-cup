import { ConfigService } from '@nestjs/config';

export const DEV_ONBOARDING_CAPTCHA_SECRET = 'f2-1-dev-captcha';
export const DEV_WA_OTP_SECRET = 'f2-3-dev-wa-otp';

export function isProductionNode(config: ConfigService): boolean {
    return (config.get('NODE_ENV') ?? 'development').toString() === 'production';
}

/** Explicit opt-in for QA/local only — never set in production. */
export function isCaptchaDisabled(config: ConfigService): boolean {
    return (config.get('CAPTCHA_DISABLED') ?? 'false').toString() === 'true';
}

/** Dev HMAC captcha mint/accept — only when not production and explicitly allowed. */
export function isDevCaptchaAllowed(config: ConfigService): boolean {
    if (isProductionNode(config)) return false;
    return (config.get('ONBOARDING_ALLOW_DEV_CAPTCHA') ?? 'false').toString() === 'true';
}

function isTruthyEnv(raw: string | undefined): boolean {
    const v = (raw ?? '').toString().trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export function getWaOtpSecretRaw(config: ConfigService): string {
    return (config.get('WA_OTP_SECRET') ?? process.env.WA_OTP_SECRET ?? '').toString().trim();
}

/** Production: real pepper configured. Non-production: always treated as available (dev default allowed). */
export function isWaOtpSecretConfigured(config: ConfigService): boolean {
    if (!isProductionNode(config)) return true;
    const secret = getWaOtpSecretRaw(config);
    return secret.length > 0 && secret !== DEV_WA_OTP_SECRET;
}

/**
 * Production boot: forbid mock OTP and explicit dev-default secret.
 * Missing WA_OTP_SECRET is allowed — service starts; OTP flows fail at request time.
 */
export function assertWaOtpProductionBootConfig(config: ConfigService): void {
    if (!isProductionNode(config)) return;

    if (isTruthyEnv((config.get('WA_OTP_MOCK') ?? process.env.WA_OTP_MOCK) as string | undefined)) {
        throw new Error('WA_OTP_MOCK must not be set in production');
    }

    const secret = getWaOtpSecretRaw(config);
    if (secret === DEV_WA_OTP_SECRET) {
        throw new Error('WA_OTP_SECRET must not use the dev default in production');
    }
}

/** @deprecated Use assertWaOtpProductionBootConfig — missing secret no longer blocks boot. */
export function assertWaOtpProductionConfig(config: ConfigService): void {
    assertWaOtpProductionBootConfig(config);
}

export function getOnboardingCaptchaProviderSecrets(config: ConfigService): {
    turnstile: string;
    hcaptcha: string;
} {
    return {
        turnstile: (config.get('TURNSTILE_SECRET_KEY') ?? '').toString().trim(),
        hcaptcha: (config.get('HCAPTCHA_SECRET') ?? '').toString().trim(),
    };
}

export function isOnboardingCaptchaProviderConfigured(config: ConfigService): boolean {
    const { turnstile, hcaptcha } = getOnboardingCaptchaProviderSecrets(config);
    return turnstile.length > 0 || hcaptcha.length > 0;
}

/**
 * Production boot: forbid bypass flags and explicit dev-default captcha secret.
 * Missing Turnstile/hCaptcha secrets is allowed — middleware starts; register captcha fails at request time.
 */
export function assertOnboardingProductionBootConfig(config: ConfigService): void {
    if (!isProductionNode(config)) return;

    if (isCaptchaDisabled(config)) {
        throw new Error('CAPTCHA_DISABLED must not be set in production');
    }
    if (isDevCaptchaAllowed(config)) {
        throw new Error('ONBOARDING_ALLOW_DEV_CAPTCHA must not be set in production');
    }

    const secret = (config.get('ONBOARDING_CAPTCHA_SECRET') ?? '').toString().trim();
    if (secret === DEV_ONBOARDING_CAPTCHA_SECRET) {
        throw new Error(
            'ONBOARDING_CAPTCHA_SECRET must not use the dev default in production',
        );
    }
}

/** @deprecated Use assertOnboardingProductionBootConfig — missing provider secret no longer blocks boot. */
export function assertOnboardingProductionConfig(config: ConfigService): void {
    assertOnboardingProductionBootConfig(config);
}
