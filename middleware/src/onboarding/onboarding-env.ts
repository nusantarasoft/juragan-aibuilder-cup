import { ConfigService } from '@nestjs/config';

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

export function assertOnboardingProductionConfig(config: ConfigService): void {
    if (!isProductionNode(config)) return;

    if (isCaptchaDisabled(config)) {
        throw new Error('CAPTCHA_DISABLED must not be set in production');
    }
    if (isDevCaptchaAllowed(config)) {
        throw new Error('ONBOARDING_ALLOW_DEV_CAPTCHA must not be set in production');
    }

    const turnstile = (config.get('TURNSTILE_SECRET_KEY') ?? '').toString().trim();
    const hcaptcha = (config.get('HCAPTCHA_SECRET') ?? '').toString().trim();
    if (!turnstile && !hcaptcha) {
        throw new Error(
            'Production onboarding requires TURNSTILE_SECRET_KEY or HCAPTCHA_SECRET',
        );
    }

    const devDefault = 'f2-1-dev-captcha';
    const secret = (config.get('ONBOARDING_CAPTCHA_SECRET') ?? '').toString().trim();
    if (secret === devDefault || (!secret && isDevCaptchaAllowed(config))) {
        throw new Error('ONBOARDING_CAPTCHA_SECRET must be set to a non-default value in production when used');
    }
}
