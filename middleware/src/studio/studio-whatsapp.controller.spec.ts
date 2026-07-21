import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StudioWhatsAppController } from './studio-whatsapp.controller';

describe('StudioWhatsAppController', () => {
    const whatsAppService = {
        verifyWebhookHmac: vi.fn(),
        handleWebhook: vi.fn(async () => undefined),
    };
    let ctrl: StudioWhatsAppController;

    beforeEach(() => {
        vi.clearAllMocks();
        ctrl = new StudioWhatsAppController(whatsAppService as any);
        vi.spyOn(ctrl['logger'], 'log').mockImplementation(() => undefined);
        vi.spyOn(ctrl['logger'], 'error').mockImplementation(() => undefined);
    });

    const makeReq = (opts: { rawBody?: Buffer; body?: any }) =>
        ({ rawBody: opts.rawBody, body: opts.body }) as any;

    it('memverifikasi HMAC saat rawBody ada, lalu memproses webhook', async () => {
        const raw = Buffer.from('{"event":"message"}');
        const body = { session: 's1', event: 'message', payload: { a: 1 } };
        const res = await ctrl.webhook(makeReq({ rawBody: raw, body }), 'sig');
        expect(whatsAppService.verifyWebhookHmac).toHaveBeenCalledWith(raw, 'sig');
        expect(whatsAppService.handleWebhook).toHaveBeenCalledWith(body, 's1');
        expect(res).toEqual({ ok: true });
    });

    it('melewati verifikasi HMAC saat rawBody tidak ada', async () => {
        const res = await ctrl.webhook(makeReq({ body: { session: 's2' } }));
        expect(whatsAppService.verifyWebhookHmac).not.toHaveBeenCalled();
        expect(whatsAppService.handleWebhook).toHaveBeenCalledWith(
            { session: 's2' },
            's2',
        );
        expect(res).toEqual({ ok: true });
    });

    it('memakai default session/event saat body kosong', async () => {
        const res = await ctrl.webhook(makeReq({ body: undefined }));
        expect(whatsAppService.handleWebhook).toHaveBeenCalledWith({}, 'default');
        expect(res).toEqual({ ok: true });
    });

    it('tetap mengembalikan ok:true saat handler melempar error', async () => {
        whatsAppService.handleWebhook.mockRejectedValueOnce(new Error('down'));
        const res = await ctrl.webhook(makeReq({ body: { session: 's3' } }));
        expect(ctrl['logger'].error).toHaveBeenCalled();
        expect(res).toEqual({ ok: true });
    });
});
