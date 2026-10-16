import { describe, expect, it } from 'vitest';
import { normalizeWhatsAppWebhook } from './hermes-webhook.normalizer';

describe('normalizeWhatsAppWebhook', () => {
    it('returns empty envelope for non-object', () => {
        expect(normalizeWhatsAppWebhook(null as any)).toEqual({
            event: 'message',
            session: 'default',
            payload: {},
        });
    });

    it('passes through enveloped bodies', () => {
        const body = {
            event: 'message',
            session: 'default',
            payload: { from: '6281@c.us', body: 'halo' },
        };
        expect(normalizeWhatsAppWebhook(body)).toEqual(body);
    });

    it('passes through when payload has chatId/author', () => {
        const body = { payload: { chatId: '6281@s.whatsapp.net', body: 'x' } };
        const out = normalizeWhatsAppWebhook(body);
        expect(out.event).toBe('message');
        expect(out.session).toBe('default');
    });

    it('wraps flat Hermes-ish payloads with button id', () => {
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
            selectedRowId: 'umkm_confirm_ya',
        });
    });

    it('reads nested interactive list reply and source chat_id', () => {
        const out = normalizeWhatsAppWebhook({
            source: { chat_id: '628999@s.whatsapp.net' },
            message: 'ok',
            interactive: { list_reply: { id: 'row-1' } },
            session: 'custom',
        });
        expect(out.session).toBe('custom');
        expect((out.payload as any).from).toBe('628999@s.whatsapp.net');
        expect((out.payload as any).selectedButtonId).toBe('row-1');
    });

    it('passes through unknown shapes', () => {
        const body = { foo: 1 };
        expect(normalizeWhatsAppWebhook(body)).toEqual(body);
    });
});
