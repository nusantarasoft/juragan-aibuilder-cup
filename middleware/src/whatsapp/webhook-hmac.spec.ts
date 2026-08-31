import { createHmac } from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { StudioWhatsAppService } from '../studio/studio-whatsapp.service';

function makeService(env: Record<string, string> = {}) {
    return new StudioWhatsAppService(
        { get: (k: string) => env[k] } as any,
        {} as any,
        { defaultSession: 'default' } as any,
        {
            providerId: 'waha',
            defaultSession: 'default',
            phoneToChatId: (p: string) => `${p}@c.us`,
            sendText: vi.fn(),
            sendButtons: vi.fn(),
            sendList: vi.fn(),
            downloadMedia: vi.fn(),
            ping: vi.fn(),
        } as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
    );
}

describe('verifyWebhookHmac fail-closed (E13)', () => {
    it('skips when key empty', () => {
        const svc = makeService({});
        expect(() => svc.verifyWebhookHmac(Buffer.from('{}'))).not.toThrow();
    });

    it('rejects missing header when key set', () => {
        const svc = makeService({ WAHA_WEBHOOK_HMAC_KEY: 'secret' });
        expect(() => svc.verifyWebhookHmac(Buffer.from('{}'))).toThrow(UnauthorizedException);
    });

    it('allows missing header when escape hatch set', () => {
        const svc = makeService({
            WAHA_WEBHOOK_HMAC_KEY: 'secret',
            WAHA_WEBHOOK_HMAC_ALLOW_MISSING: 'true',
        });
        expect(() => svc.verifyWebhookHmac(Buffer.from('{}'))).not.toThrow();
    });

    it('accepts valid sha512 hex', () => {
        const key = 'secret';
        const raw = Buffer.from('{"ok":true}');
        const sig = createHmac('sha512', key).update(raw).digest('hex');
        const svc = makeService({ WAHA_WEBHOOK_HMAC_KEY: key });
        expect(() => svc.verifyWebhookHmac(raw, sig)).not.toThrow();
    });
});
