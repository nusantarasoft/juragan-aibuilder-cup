import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    extractBusinessPhoneFromPayload,
    normalizePhoneDigits,
    isPhoneInAllowlist,
    pickTenantConfigBySenderPhone,
    pickSingleTenantFallback,
    pickWhatsAppConfigForWebhook,
    resolveInboundWaConfig,
    collectUmkmOwnerPhones,
    countUmkmWaPhones,
    normalizeSingleUmkmWaConfigPhones,
    isSenderOnUmkmWaConfig,
    phonesMatch,
    StudioWhatsAppRateLimiter,
    stripWhatsAppMediaAnnotations,
    whatsappPayloadHasMedia,
} from './studio-whatsapp.util';

describe('normalizePhoneDigits', () => {
    it('extracts digits from WhatsApp chat id', () => {
        expect(normalizePhoneDigits('628123456789@c.us')).toBe('628123456789');
    });

    it('strips non-digits from plain phone', () => {
        expect(normalizePhoneDigits('+62 812-3456-7890')).toBe('6281234567890');
    });

    it('falls back to full-input digits when local part has too few', () => {
        expect(normalizePhoneDigits('abc@12345678')).toBe('12345678');
    });

    // Regression: ISSUE-001 follow-up — Baileys meId device suffix must not inflate digits
    // Found by /qa on 2026-09-03
    it('strips Baileys device suffix after colon', () => {
        expect(normalizePhoneDigits('62811924689:7@s.whatsapp.net')).toBe('62811924689');
    });
});

describe('whatsappPayloadHasMedia', () => {
    it('ignores bare _data on text messages', () => {
        expect(whatsappPayloadHasMedia({ body: '2', _data: { id: 'x', type: 'chat' } })).toBe(false);
    });

    it('detects hasMedia flag and image type', () => {
        expect(whatsappPayloadHasMedia({ hasMedia: true })).toBe(true);
        expect(whatsappPayloadHasMedia({ _data: { type: 'image', mimetype: 'image/jpeg' } })).toBe(
            true,
        );
    });

    it('detects a trimmed mediaUrl', () => {
        expect(whatsappPayloadHasMedia({ mediaUrl: 'https://x/y.jpg' })).toBe(true);
    });

    it('returns false when there is no _data object', () => {
        expect(whatsappPayloadHasMedia({ body: 'hi' })).toBe(false);
    });

    it('detects encrypted media keys inside _data', () => {
        expect(whatsappPayloadHasMedia({ _data: { mediaKey: 'abc' } })).toBe(true);
    });

    it('detects media by message type without mimetype', () => {
        expect(whatsappPayloadHasMedia({ type: 'video', _data: {} })).toBe(true);
    });

    it('returns false when _data has no type on either payload or data', () => {
        expect(whatsappPayloadHasMedia({ _data: { id: 'x' } })).toBe(false);
    });
});

describe('stripWhatsAppMediaAnnotations', () => {
    it('keeps menu digit when media download note is appended', () => {
        expect(
            stripWhatsAppMediaAnnotations('2\n[User mengirim media yang tidak dapat diunduh]'),
        ).toBe('2');
    });

    it('keeps blank lines and drops OCR notes', () => {
        const input = 'hello\n\n(Catatan: konten visual belum di-OCR sepenuhnya)';
        expect(stripWhatsAppMediaAnnotations(input)).toBe('hello');
    });
});

describe('phonesMatch', () => {
    it('returns false when either side is empty', () => {
        expect(phonesMatch('', '628123')).toBe(false);
        expect(phonesMatch('628123', '')).toBe(false);
    });

    it('matches identical and suffix forms', () => {
        expect(phonesMatch('628123456789', '8123456789')).toBe(true);
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
            session_name: 'default',
            business_phone: '6281111111111',
            allowlist_phones: [],
            enabled: true,
            notebook_id: 'nb-a',
        },
        {
            tenant_id: 'umkm-b',
            session_name: 'default',
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

    it('returns null when sender phone is too short', () => {
        expect(pickTenantConfigBySenderPhone(configs, '123')).toBeNull();
    });

    it('collects owner and staff phones', () => {
        expect(collectUmkmOwnerPhones(configs[1])).toEqual(['6282222222222', '6283333333333']);
    });

    it('collects phones without business_phone and ignores short allowlist entries', () => {
        expect(
            collectUmkmOwnerPhones({ tenant_id: 't', allowlist_phones: ['123', '6284444444444'] }),
        ).toEqual(['6284444444444']);
    });

    it('collects only the business phone when allowlist is absent', () => {
        expect(collectUmkmOwnerPhones({ tenant_id: 't', business_phone: '6281111111111' })).toEqual([
            '6281111111111',
        ]);
    });

    it('D-40 counts distinct owner phones', () => {
        expect(
            countUmkmWaPhones({
                business_phone: '6281111111111',
                allowlist_phones: ['6282222222222'],
            }),
        ).toBe(2);
        expect(
            normalizeSingleUmkmWaConfigPhones('6281111111111', ['6282222222222']),
        ).toEqual({ businessPhone: '6281111111111', allowlistPhones: [] });
    });

    it('isSenderOnUmkmWaConfig matches Hermes allowlist', () => {
        const cfg = {
            tenant_id: 't',
            business_phone: '6281111111111',
            allowlist_phones: [] as string[],
        };
        expect(isSenderOnUmkmWaConfig(cfg, '6281111111111')).toBe(true);
        expect(isSenderOnUmkmWaConfig(cfg, '6289999999999')).toBe(false);
    });

    it('single tenant fallback for dev', () => {
        const single = [{ tenant_id: 'default', enabled: true, notebook_id: 'x' }];
        expect(pickSingleTenantFallback(single)?.tenant_id).toBe('default');
    });

    it('falls back to the default tenant when several are active', () => {
        const many = [
            { tenant_id: 'umkm-a', enabled: true, notebook_id: 'a' },
            { tenant_id: 'default', enabled: true, notebook_id: 'd' },
        ];
        expect(pickSingleTenantFallback(many)?.tenant_id).toBe('default');
    });

    it('returns null when no single/default tenant is available', () => {
        const many = [
            { tenant_id: 'umkm-a', enabled: true, notebook_id: 'a' },
            { tenant_id: 'umkm-b', enabled: true, notebook_id: 'b' },
        ];
        expect(pickSingleTenantFallback(many)).toBeNull();
    });
});

describe('resolveInboundWaConfig (P2-5)', () => {
    const base = (over: Partial<any>) => ({
        tenant_id: 'x',
        enabled: true,
        notebook_id: 'nb',
        ...over,
    });

    it('routes dedicated session by session_name', () => {
        const configs = [
            base({ tenant_id: 'a', session_name: 'umkm-store-a' }),
            base({ tenant_id: 'b', session_name: 'hermes' }),
        ];
        expect(resolveInboundWaConfig(configs, 'umkm-store-a', '628111')?.tenant_id).toBe('a');
    });

    it('routes shared hermes session by sender whitelist', () => {
        const configs = [
            base({
                tenant_id: 'a',
                session_name: 'hermes',
                business_phone: '6281111111111',
            }),
        ];
        expect(resolveInboundWaConfig(configs, 'hermes', '6281111111111')?.tenant_id).toBe('a');
    });
});

describe('pickWhatsAppConfigForWebhook (deprecated)', () => {
    const base = (over: Partial<any>) => ({
        tenant_id: 'x', enabled: true, notebook_id: 'nb', ...over,
    });

    it('matches a unique session', () => {
        const configs = [
            base({ tenant_id: 'a', session_name: 'sess-a' }),
            base({ tenant_id: 'b', session_name: 'sess-b' }),
        ];
        expect(pickWhatsAppConfigForWebhook(configs, 'SESS-A')?.tenant_id).toBe('a');
    });

    it('falls through to business phone when session is ambiguous', () => {
        const configs = [
            base({ tenant_id: 'a', session_name: 'default', business_phone: '6281111111111' }),
            base({ tenant_id: 'b', session_name: 'default', business_phone: '6282222222222' }),
        ];
        expect(pickWhatsAppConfigForWebhook(configs, 'default', '6282222222222')?.tenant_id).toBe('b');
    });

    it('uses business phone when session key is blank', () => {
        const configs = [
            base({ tenant_id: 'a', session_name: 'default', business_phone: '6281111111111' }),
            base({ tenant_id: 'b', session_name: 'default', business_phone: '6282222222222' }),
        ];
        expect(pickWhatsAppConfigForWebhook(configs, '   ', '6281111111111')?.tenant_id).toBe('a');
    });

    it('falls back to single/default tenant when nothing else matches', () => {
        const configs = [base({ tenant_id: 'default', session_name: 'other' })];
        expect(pickWhatsAppConfigForWebhook(configs, 'nomatch')?.tenant_id).toBe('default');
    });

    it('treats missing session_name as "default" when matching session', () => {
        const configs = [base({ tenant_id: 'only', session_name: null })];
        expect(pickWhatsAppConfigForWebhook(configs, 'default')?.tenant_id).toBe('only');
    });

    it('handles configs without business_phone and no phone match (fallback)', () => {
        const configs = [
            base({ tenant_id: 'a', session_name: 'shared', business_phone: null }),
            base({ tenant_id: 'b', session_name: 'shared', business_phone: null }),
        ];
        // ambiguous session + business phone with no match -> single/default fallback -> null
        expect(pickWhatsAppConfigForWebhook(configs, 'shared', '6289999999999')).toBeNull();
    });
});

describe('extractBusinessPhoneFromPayload', () => {
    it('reads me.id from WhatsApp payload', () => {
        expect(
            extractBusinessPhoneFromPayload({ me: { id: '6281110115321@c.us' } }),
        ).toBe('6281110115321');
    });

    it('returns null when no candidate has enough digits', () => {
        expect(extractBusinessPhoneFromPayload({})).toBeNull();
        expect(extractBusinessPhoneFromPayload({ me: { id: '123' } })).toBeNull();
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

    it('reset(key) clears only that key; reset() clears all', () => {
        limiter.tryConsume('a');
        limiter.tryConsume('a');
        limiter.tryConsume('b');
        limiter.reset('a');
        // 'a' bucket cleared -> full window available again
        expect(limiter.tryConsume('a')).toBe(true);
        expect(limiter.tryConsume('a')).toBe(true);
        expect(limiter.tryConsume('a')).toBe(true);
        expect(limiter.tryConsume('a')).toBe(false);
    });

    it('drops entries older than the window', () => {
        const shortLimiter = new StudioWhatsAppRateLimiter(1, 5);
        expect(shortLimiter.tryConsume('k')).toBe(true);
        const now = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(now + 1000);
        expect(shortLimiter.tryConsume('k')).toBe(true);
        vi.restoreAllMocks();
    });
});
