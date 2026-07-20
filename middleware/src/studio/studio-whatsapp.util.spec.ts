import { describe, it, expect, beforeEach } from 'vitest';
import {
    extractBusinessPhoneFromPayload,
    normalizePhoneDigits,
    isPhoneInAllowlist,
    pickTenantConfigBySenderPhone,
    pickSingleTenantFallback,
    collectUmkmOwnerPhones,
    StudioWhatsAppRateLimiter,
    stripWhatsAppMediaAnnotations,
    wahaPayloadHasMedia,
} from './studio-whatsapp.util';

describe('normalizePhoneDigits', () => {
    it('extracts digits from WhatsApp chat id', () => {
        expect(normalizePhoneDigits('628123456789@c.us')).toBe('628123456789');
    });

    it('strips non-digits from plain phone', () => {
        expect(normalizePhoneDigits('+62 812-3456-7890')).toBe('6281234567890');
    });
});

describe('wahaPayloadHasMedia', () => {
    it('ignores bare _data on text messages', () => {
        expect(wahaPayloadHasMedia({ body: '2', _data: { id: 'x', type: 'chat' } })).toBe(false);
    });

    it('detects hasMedia flag and image type', () => {
        expect(wahaPayloadHasMedia({ hasMedia: true })).toBe(true);
        expect(wahaPayloadHasMedia({ _data: { type: 'image', mimetype: 'image/jpeg' } })).toBe(
            true,
        );
    });
});

describe('stripWhatsAppMediaAnnotations', () => {
    it('keeps menu digit when media download note is appended', () => {
        expect(
            stripWhatsAppMediaAnnotations('2\n[User mengirim media yang tidak dapat diunduh]'),
        ).toBe('2');
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

describe('shared inbox routing', () => {
    const configs = [
        {
            tenant_id: 'umkm-a',
            waha_session: 'default',
            business_phone: '6281111111111',
            allowlist_phones: [],
            enabled: true,
            notebook_id: 'nb-a',
        },
        {
            tenant_id: 'umkm-b',
            waha_session: 'default',
            business_phone: '6282222222222',
            allowlist_phones: ['6283333333333'],
            enabled: true,
            notebook_id: 'nb-b',
        },
    ];

    it('routes by owner phone', () => {
        expect(pickTenantConfigBySenderPhone(configs, '6281111111111@c.us')?.tenant_id).toBe(
            'umkm-a',
        );
    });

    it('routes staff via allowlist', () => {
        expect(pickTenantConfigBySenderPhone(configs, '6283333333333')?.tenant_id).toBe('umkm-b');
    });

    it('returns null for unknown sender when multiple UMKMs', () => {
        expect(pickTenantConfigBySenderPhone(configs, '6289999999999')).toBeNull();
    });

    it('collects owner and staff phones', () => {
        expect(collectUmkmOwnerPhones(configs[1])).toEqual(['6282222222222', '6283333333333']);
    });

    it('single tenant fallback for dev', () => {
        const single = [{ tenant_id: 'default', enabled: true, notebook_id: 'x' }];
        expect(pickSingleTenantFallback(single)?.tenant_id).toBe('default');
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
});
