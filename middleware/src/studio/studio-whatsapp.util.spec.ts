import { describe, it, expect, beforeEach } from 'vitest';
import {
    extractBusinessPhoneFromPayload,
    normalizePhoneDigits,
    isPhoneInAllowlist,
    pickWhatsAppConfigForWebhook,
    StudioWhatsAppRateLimiter,
} from './studio-whatsapp.util';

describe('normalizePhoneDigits', () => {
    it('extracts digits from WhatsApp chat id', () => {
        expect(normalizePhoneDigits('628123456789@c.us')).toBe('628123456789');
    });

    it('strips non-digits from plain phone', () => {
        expect(normalizePhoneDigits('+62 812-3456-7890')).toBe('6281234567890');
    });
});

describe('isPhoneInAllowlist', () => {
    it('returns false when allowlist empty', () => {
        expect(isPhoneInAllowlist('628111', [])).toBe(false);
        expect(isPhoneInAllowlist('628111', null)).toBe(false);
    });

    it('matches exact and suffix forms', () => {
        const list = ['628123456789'];
        expect(isPhoneInAllowlist('628123456789@c.us', list)).toBe(true);
        expect(isPhoneInAllowlist('8123456789', list)).toBe(true);
    });
});

describe('pickWhatsAppConfigForWebhook', () => {
    const configs = [
        { tenant_id: 'default', waha_session: 'default', business_phone: '6281110115321' },
        { tenant_id: 'umkm-b', waha_session: 'toko-b', business_phone: '6282223344556' },
    ];

    it('resolves by waha session first', () => {
        expect(pickWhatsAppConfigForWebhook(configs, 'toko-b', null)?.tenant_id).toBe('umkm-b');
    });

    it('falls back to business phone', () => {
        expect(
            pickWhatsAppConfigForWebhook(configs, 'unknown-session', '6281110115321')?.tenant_id,
        ).toBe('default');
    });
});

describe('extractBusinessPhoneFromPayload', () => {
    it('reads me.id from WAHA payload', () => {
        expect(
            extractBusinessPhoneFromPayload({ me: { id: '6281110115321@c.us' } }),
        ).toBe('6281110115321');
    });
});

describe('StudioWhatsAppRateLimiter', () => {
    let limiter: StudioWhatsAppRateLimiter;

    beforeEach(() => {
        limiter = new StudioWhatsAppRateLimiter(3, 60_000);
        limiter.reset();
    });

    it('allows up to maxPerWindow then blocks', () => {
        expect(limiter.tryConsume('6281')).toBe(true);
        expect(limiter.tryConsume('6281')).toBe(true);
        expect(limiter.tryConsume('6281')).toBe(true);
        expect(limiter.tryConsume('6281')).toBe(false);
    });

    it('tracks keys independently', () => {
        expect(limiter.tryConsume('a')).toBe(true);
        expect(limiter.tryConsume('b')).toBe(true);
        expect(limiter.tryConsume('a')).toBe(true);
        expect(limiter.tryConsume('a')).toBe(true);
        expect(limiter.tryConsume('a')).toBe(false);
        expect(limiter.tryConsume('b')).toBe(true);
    });
});
