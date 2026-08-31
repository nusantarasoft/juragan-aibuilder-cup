import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { HermesProvider } from './hermes.provider';
import { WahaProvider } from './waha.provider';
import { resolveWhatsAppProviderId } from './whatsapp-provider.module';

describe('resolveWhatsAppProviderId', () => {
    it('defaults to waha', () => {
        expect(resolveWhatsAppProviderId(undefined)).toBe('waha');
        expect(resolveWhatsAppProviderId('')).toBe('waha');
        expect(resolveWhatsAppProviderId('WAHA')).toBe('waha');
    });
    it('accepts hermes', () => {
        expect(resolveWhatsAppProviderId('hermes')).toBe('hermes');
        expect(resolveWhatsAppProviderId('Hermes')).toBe('hermes');
    });
});

describe('WahaProvider', () => {
    it('delegates sendText and phoneToChatId', async () => {
        const waha = {
            defaultSession: 'default',
            phoneToChatId: (p: string) => `${p}@c.us`,
            sendText: vi.fn(async () => ({ success: true })),
            sendButtons: vi.fn(),
            sendList: vi.fn(),
            downloadMedia: vi.fn(),
            baseUrl: 'http://waha:3000',
            apiKey: '',
        };
        const p = new WahaProvider(waha as any);
        expect(p.providerId).toBe('waha');
        expect(p.phoneToChatId('6281')).toBe('6281@c.us');
        await p.sendText('6281@c.us', 'hi');
        expect(waha.sendText).toHaveBeenCalledWith('6281@c.us', 'hi', undefined);
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
