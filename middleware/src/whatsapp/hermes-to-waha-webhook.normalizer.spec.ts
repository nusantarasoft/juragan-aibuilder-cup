import { describe, expect, it } from 'vitest';
import { normalizeWhatsAppWebhook } from './hermes-to-waha-webhook.normalizer';

describe('normalizeWhatsAppWebhook', () => {
    it('passes through WAHA-shaped bodies', () => {
        const body = {
            event: 'message',
            session: 'default',
            payload: { from: '6281@c.us', body: 'halo' },
        };
        expect(normalizeWhatsAppWebhook(body)).toEqual(body);
    });

    it('wraps flat Hermes-ish payloads', () => {
        const out = normalizeWhatsAppWebhook({
            from: '628123@s.whatsapp.net',
            text: 'jual 10',
            user_name: 'Budi',
            selectedButtonId: 'umkm_confirm_ya',
        });
        expect(out.event).toBe('message');
        expect(out.session).toBe('hermes');
        expect(out.payload).toMatchObject({
            from: '628123@s.whatsapp.net',
            body: 'jual 10',
            notifyName: 'Budi',
            selectedButtonId: 'umkm_confirm_ya',
        });
    });
});
