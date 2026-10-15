import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
    assertOnboardingProductionConfig,
    isCaptchaDisabled,
    isDevCaptchaAllowed,
    isProductionNode,
} from './onboarding-env';

@Injectable()
export class CaptchaService implements OnModuleInit {
    constructor(private readonly config: ConfigService) {}

    onModuleInit(): void {
        assertOnboardingProductionConfig(this.config);
        if (isProductionNode(this.config)) {
            const secret = (this.config.get('ONBOARDING_CAPTCHA_SECRET') ?? '').toString().trim();
            if (secret === 'f2-1-dev-captcha') {
                throw new Error('ONBOARDING_CAPTCHA_SECRET must not use the dev default in production');
            }
        }
    }

    private captchaSecret(): string {
        const secret = (this.config.get('ONBOARDING_CAPTCHA_SECRET') ?? '').toString().trim();
        if (isProductionNode(this.config)) {
            if (!secret) {
                throw new BadRequestException('Captcha is not configured');
            }
            return secret;
        }
        if (secret) return secret;
        if (isDevCaptchaAllowed(this.config)) {
            throw new BadRequestException(
                'ONBOARDING_CAPTCHA_SECRET must be set when ONBOARDING_ALLOW_DEV_CAPTCHA is enabled',
            );
        }
        return '';
    }

    /** Public site key for Turnstile widget (empty when using provider-only prod config). */
    siteKey(): string {
        return (this.config.get('NEXT_PUBLIC_TURNSTILE_SITE_KEY') ??
            this.config.get('TURNSTILE_SITE_KEY') ??
            '')
            .toString()
            .trim();
    }

    providerMode(): 'turnstile' | 'hcaptcha' | 'dev' | 'disabled' {
        if (isCaptchaDisabled(this.config)) return 'disabled';
        if (isProductionNode(this.config)) {
            if ((this.config.get('TURNSTILE_SECRET_KEY') ?? '').toString().trim()) {
                return 'turnstile';
            }
            return 'hcaptcha';
        }
        if (isDevCaptchaAllowed(this.config)) return 'dev';
        if ((this.config.get('TURNSTILE_SECRET_KEY') ?? '').toString().trim()) {
            return 'turnstile';
        }
        return 'disabled';
    }

    async verifyAsync(token: string | undefined | null): Promise<void> {
        if (isCaptchaDisabled(this.config)) {
            if (isProductionNode(this.config)) {
                throw new BadRequestException('Captcha verification required');
            }
            return;
        }
        const raw = (token ?? '').trim();
        if (!raw) throw new BadRequestException('Captcha verification required');

        if (isProductionNode(this.config)) {
            await this.verifyProviderToken(raw);
            return;
        }
        if (this.looksLikeDevHmac(raw) && isDevCaptchaAllowed(this.config)) {
            this.verifyDevHmac(raw);
            return;
        }
        await this.verifyProviderToken(raw);
    }

    mintDevToken(ttlMs = 300_000): string {
        if (isProductionNode(this.config) || !isDevCaptchaAllowed(this.config)) {
            throw new ForbiddenException('Dev captcha mint is disabled');
        }
        const secret = this.captchaSecret();
        const nonce = createHmac('sha256', secret).update(String(Date.now())).digest('hex').slice(0, 16);
        const expiresAt = Date.now() + ttlMs;
        const sig = createHmac('sha256', secret).update(`${nonce}.${expiresAt}`).digest('hex');
        return `${nonce}.${expiresAt}.${sig}`;
    }

    private looksLikeDevHmac(raw: string): boolean {
        return raw.split('.').length === 3 && !raw.startsWith('0.');
    }

    private verifyDevHmac(raw: string): void {
        const secret = this.captchaSecret();
        const parts = raw.split('.');
        if (parts.length !== 3) throw new BadRequestException('Invalid captcha token');
        const [nonce, expiresAtStr, sig] = parts;
        const expiresAt = Number(expiresAtStr);
        if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
            throw new BadRequestException('Captcha expired; refresh and try again');
        }
        const expected = createHmac('sha256', secret).update(`${nonce}.${expiresAtStr}`).digest('hex');
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
            throw new BadRequestException('Invalid captcha token');
        }
    }

    private async verifyProviderToken(raw: string): Promise<void> {
        const turnstileSecret = (this.config.get('TURNSTILE_SECRET_KEY') ?? '').toString().trim();
        const hcaptchaSecret = (this.config.get('HCAPTCHA_SECRET') ?? '').toString().trim();

        if (turnstileSecret) {
            const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ secret: turnstileSecret, response: raw }),
            });
            const data = (await res.json()) as { success?: boolean };
            if (!data.success) {
                throw new BadRequestException('Captcha verification failed');
            }
            return;
        }

        if (hcaptchaSecret) {
            const res = await fetch('https://api.hcaptcha.com/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ secret: hcaptchaSecret, response: raw }),
            });
            const data = (await res.json()) as { success?: boolean };
            if (!data.success) {
                throw new BadRequestException('Captcha verification failed');
            }
            return;
        }

        if (isProductionNode(this.config)) {
            throw new BadRequestException('Captcha provider is not configured');
        }
        throw new BadRequestException(
            'Captcha required: configure Turnstile/hCaptcha or ONBOARDING_ALLOW_DEV_CAPTCHA for local',
        );
    }
}
