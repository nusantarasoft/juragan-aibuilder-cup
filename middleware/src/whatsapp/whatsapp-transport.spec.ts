import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { HermesProvider } from './hermes.provider';
import { resolveWhatsAppProviderId } from './whatsapp-provider.module';

describe('resolveWhatsAppProviderId', () => {
    it('always returns hermes', () => {
        expect(resolveWhatsAppProviderId(undefined)).toBe('hermes');
        expect(resolveWhatsAppProviderId('')).toBe('hermes');
        expect(resolveWhatsAppProviderId('waha')).toBe('hermes');
        expect(resolveWhatsAppProviderId('hermes')).toBe('hermes');
    });
});

describe('HermesProvider', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = vi.fn();
    });
    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('posts /send with s.whatsapp.net jid', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => '{"messageId":"1"}',
        });
        const p = new HermesProvider({
            get: (k: string) => (k === 'HERMES_BRIDGE_URL' ? 'http://hermes:8765' : undefined),
        } as any);
        expect(p.providerId).toBe('hermes');
        expect(p.phoneToChatId('62812')).toBe('62812@s.whatsapp.net');
        const res = await p.sendText('62812', 'halo');
        expect(res.success).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
            'http://hermes:8765/send',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    chatId: '62812@s.whatsapp.net',
                    message: 'halo',
                }),
            }),
        );
    });

    it('sendButtons uses /send-poll and fails open for text fallback', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            status: 404,
            text: async () => 'no poll',
        });
        const p = new HermesProvider({
            get: () => 'http://hermes:8765',
        } as any);
        const res = await p.sendButtons('6281@s.whatsapp.net', 'preview', [
            { id: 'ya', text: 'Ya' },
        ]);
        expect(res.success).toBe(false);
        expect(String(global.fetch).length).toBeGreaterThan(0);
        expect((global.fetch as any).mock.calls[0][0]).toContain('/send-poll');
    });
});
