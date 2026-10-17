import { createHmac } from 'crypto';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { StudioWhatsAppService } from './studio-whatsapp.service';

function makeService(opts: {
    env?: Record<string, string>;
    transport?: Partial<Record<string, any>>;
    hermes?: Partial<Record<string, any>>;
    supabase?: any;
} = {}) {
    const transport = {
        providerId: 'hermes',
        defaultSession: 'hermes',
        phoneToChatId: (p: string) => `${p.replace(/\D/g, '')}@s.whatsapp.net`,
        sendText: vi.fn(async () => ({ success: true })),
        sendButtons: vi.fn(async () => ({ success: false })),
        sendList: vi.fn(async () => ({ success: false })),
        downloadMedia: vi.fn(async () => null),
        ping: vi.fn(async () => ({ ok: true })),
        ...opts.transport,
    };
    const hermes = {
        getSessionStatus: vi.fn(async () => ({
            name: 'hermes',
            status: 'WORKING',
            connected: true,
        })),
        getAuthQr: vi.fn(async () => ({ available: true, imageBase64: 'x', mimetype: 'image/png', error: null })),
        startSession: vi.fn(async () => ({ status: 'STARTING', connected: false })),
        logoutSession: vi.fn(async () => ({ status: 'SCAN_QR_CODE' })),
        syncSession: vi.fn(async () => ({ status: 'WORKING', connected: true })),
        restartSession: vi.fn(async () => ({ status: 'STARTING' })),
        rebindSession: vi.fn(async () => ({ status: 'SCAN_QR_CODE', connected: false })),
        ...opts.hermes,
    };
    const from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        upsert: vi.fn().mockReturnThis(),
        single: vi.fn(async () => ({
            data: {
                tenant_id: 'default',
                enabled: true,
                notebook_id: 'nb',
                session_name: 'default',
                business_phone: '62811',
                allowlist_phones: [],
                use_guided_flow: false,
                label: 'Toko',
            },
            error: null,
        })),
        then: undefined,
    }));
    // Make chain awaitable for listConfigs: select().order() resolves via being thenable-ish
    // Prefer explicit mock resolved values where needed.
    const admin = { from };
    const supabase =
        opts.supabase ||
        ({
            getAdminClient: () => admin,
        } as any);

    const svc = new StudioWhatsAppService(
        { get: (k: string) => opts.env?.[k] } as any,
        supabase,
        transport as any,
        hermes as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
    );
    return { svc, transport, hermes, from, admin };
}

describe('StudioWhatsAppService unit (Hermes session + security)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('sendOutboundText maps phone and reports failure', async () => {
        const { svc, transport } = makeService();
        expect(await svc.sendOutboundText('62812', 'hi')).toBe(true);
        expect(transport.sendText).toHaveBeenCalledWith(
            '62812@s.whatsapp.net',
            'hi',
            undefined,
        );

        transport.sendText.mockResolvedValueOnce({ success: false, error: 'down' });
        expect(await svc.sendOutboundText('62812@s.whatsapp.net', 'x', 'sess')).toBe(false);
    });

    it('HMAC accept/reject edges', () => {
        const key = 'secret';
        const raw = Buffer.from('{"a":1}');
        const sig = createHmac('sha512', key).update(raw).digest('hex');
        const { svc } = makeService({ env: { WHATSAPP_WEBHOOK_HMAC_KEY: key } });
        expect(() => svc.verifyWebhookHmac(raw, `sha512=${sig}`)).not.toThrow();
        expect(() => svc.verifyWebhookHmac(raw, 'deadbeef')).toThrow(UnauthorizedException);
        expect(() => svc.verifyWebhookHmac(raw, 'zz')).toThrow(UnauthorizedException);
    });

    it('security meta + rate limit + allowlist flags', () => {
        const { svc } = makeService({
            env: {
                STUDIO_WHATSAPP_REQUIRE_ALLOWLIST: 'true',
                STUDIO_WHATSAPP_RATE_LIMIT_PER_MINUTE: '25',
            },
        });
        expect(svc.isAllowlistRequired()).toBe(true);
        expect(svc.getRateLimitPerMinute()).toBe(25);
        expect(svc.getSecurityMeta()).toMatchObject({
            allowlistRequired: true,
            rateLimitPerMinute: 25,
            whatsappProvider: 'hermes',
        });

        const loose = makeService({
            env: {
                STUDIO_WHATSAPP_REQUIRE_ALLOWLIST: 'false',
                STUDIO_WHATSAPP_RATE_LIMIT_PER_MINUTE: 'nope',
            },
        }).svc;
        expect(loose.isAllowlistRequired()).toBe(false);
        expect(loose.getRateLimitPerMinute()).toBe(10);
    });

    it('delegates Hermes session ops', async () => {
        const { svc, hermes } = makeService();
        hermes.getSessionStatus.mockResolvedValueOnce(null);
        const empty = await svc.getSessionStatus();
        expect(empty.provider).toBe('hermes');
        expect(empty.sessions).toEqual([]);

        hermes.getSessionStatus.mockResolvedValueOnce({
            name: 'hermes',
            status: 'WORKING',
            connected: true,
        });
        const st = await svc.getSessionStatus();
        expect(st.sessions[0].status).toBe('WORKING');

        await svc.restartSession();
        await svc.rebindHermesSession();
        await svc.syncSession();
        await svc.getAuthQr();
        await svc.startSession();
        await svc.logoutSession();
        expect(hermes.restartSession).toHaveBeenCalled();
        expect(hermes.rebindSession).toHaveBeenCalled();
        expect(hermes.syncSession).toHaveBeenCalled();
        expect(hermes.getAuthQr).toHaveBeenCalled();
        expect(hermes.startSession).toHaveBeenCalled();
        expect(hermes.logoutSession).toHaveBeenCalled();
    });

    it('listEnabledConfigsForCron filters enabled+notebook', async () => {
        const rows = [
            { tenant_id: 'a', enabled: true, notebook_id: 'n1' },
            { tenant_id: 'b', enabled: true, notebook_id: null },
            { tenant_id: 'c', enabled: false, notebook_id: 'n2' },
        ];
        const order = vi.fn(async () => ({ data: rows, error: null }));
        const select = vi.fn(() => ({ order }));
        const from = vi.fn(() => ({ select }));
        const { svc } = makeService({
            supabase: { getAdminClient: () => ({ from }) },
        });
        const enabled = await svc.listEnabledConfigsForCron();
        expect(enabled).toEqual([rows[0]]);
    });

    it('updateConfig requires owner phone when enabling', async () => {
        const { svc } = makeService({
            supabase: {
                getAdminClient: () => ({
                    from: () => ({
                        select: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: {
                                        tenant_id: 'default',
                                        enabled: false,
                                        notebook_id: null,
                                        session_name: null,
                                        business_phone: null,
                                        allowlist_phones: [],
                                        use_guided_flow: false,
                                    },
                                    error: null,
                                }),
                            }),
                            then: (resolve: (v: unknown) => void) =>
                                resolve({ data: [], error: null }),
                        }),
                    }),
                }),
            },
        });
        await expect(svc.updateConfig({ enabled: true })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updateConfig success + owner phone conflict', async () => {
        const saved = {
            tenant_id: 'default',
            enabled: true,
            notebook_id: 'nb',
            session_name: 'default',
            business_phone: '6281234567890',
            allowlist_phones: [],
            use_guided_flow: false,
            label: 'Toko A',
        };
        let uniquenessData: any[] = [];
        const from = vi.fn(() => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({
                        data: {
                            tenant_id: 'default',
                            enabled: false,
                            notebook_id: null,
                            session_name: null,
                            business_phone: null,
                            allowlist_phones: [],
                            use_guided_flow: false,
                        },
                        error: null,
                    }),
                }),
                then: (resolve: (v: unknown) => void) =>
                    resolve({ data: uniquenessData, error: null }),
            }),
            upsert: () => ({
                select: () => ({
                    single: async () => ({ data: saved, error: null }),
                }),
            }),
        }));
        const { svc } = makeService({
            supabase: { getAdminClient: () => ({ from }) },
        });
        const ok = await svc.updateConfig({
            enabled: true,
            businessPhone: '6281234567890',
            notebookId: 'nb',
            label: 'Toko A',
            sessionName: '  ',
            useGuidedFlow: false,
            allowlistPhones: [],
        });
        expect(ok.business_phone).toBe('6281234567890');
        expect(ok.enabled).toBe(true);

        uniquenessData = [
            {
                tenant_id: 'other',
                label: 'Toko B',
                business_phone: '6281234567890',
                allowlist_phones: [],
            },
        ];
        await expect(
            svc.updateConfig({
                enabled: true,
                businessPhone: '6281234567890',
                notebookId: 'nb',
            }),
        ).rejects.toThrow(/sudah terdaftar/i);
    });

    it('D-40 rejects more than one owner phone on a store', async () => {
        const from = vi.fn(() => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({
                        data: {
                            tenant_id: 'default',
                            enabled: false,
                            business_phone: '6281111111111',
                            allowlist_phones: [],
                        },
                        error: null,
                    }),
                }),
                then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
            }),
        }));
        const { svc } = makeService({
            supabase: { getAdminClient: () => ({ from }) },
        });
        await expect(
            svc.updateConfig({
                businessPhone: '6281111111111',
                allowlistPhones: ['6282222222222'],
            }),
        ).rejects.toThrow(/D-40/i);
    });

    it('resolveConfigForWebhook matches owner phone and single-tenant fallback', async () => {
        const rows = [
            {
                tenant_id: 'owner',
                enabled: true,
                notebook_id: 'nb',
                business_phone: '6281111000001',
                allowlist_phones: [],
            },
            {
                tenant_id: 'other',
                enabled: true,
                notebook_id: 'nb2',
                business_phone: '628999',
                allowlist_phones: [],
            },
        ];
        const from = vi.fn(() => ({
            select: () => ({
                then: (resolve: (v: unknown) => void) => resolve({ data: rows, error: null }),
            }),
        }));
        const { svc } = makeService({
            supabase: { getAdminClient: () => ({ from }) },
        });
        const matched = await svc.resolveConfigForWebhook('hermes', '6281111000001');
        expect(matched?.tenant_id).toBe('owner');

        const single = [
            {
                tenant_id: 'solo',
                enabled: true,
                notebook_id: 'nb',
                business_phone: '628000',
                allowlist_phones: [],
            },
        ];
        from.mockImplementation(() => ({
            select: () => ({
                then: (resolve: (v: unknown) => void) => resolve({ data: single, error: null }),
            }),
        }));
        const fallback = await svc.resolveConfigForWebhook('hermes', '6281111999999');
        expect(fallback?.tenant_id).toBe('solo');
    });

    it('sendReplyChunks empty / confirm buttons / list fallback / send fail', async () => {
        const sendText = vi.fn(async () => ({ success: true }));
        const sendButtons = vi.fn(async () => ({ success: true }));
        const sendList = vi.fn(async () => ({ success: false, error: 'no list' }));
        const { svc, transport } = makeService({
            transport: { sendText, sendButtons, sendList },
        });
        vi.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);
        vi.spyOn(svc['logger'], 'error').mockImplementation(() => undefined);

        await (svc as any).sendReplyChunks('6281@s.whatsapp.net', '   ');
        expect(sendText).toHaveBeenCalledWith(
            '6281@s.whatsapp.net',
            'Maaf, tidak ada jawaban.',
            undefined,
        );

        sendText.mockClear();
        await (svc as any).sendReplyChunks(
            '6281@s.whatsapp.net',
            '*Konfirmasi penjualan*\nTotal: 10000',
        );
        expect(sendButtons).toHaveBeenCalled();
        expect(sendText).not.toHaveBeenCalled();

        sendButtons.mockResolvedValueOnce({ success: false, error: 'no btn' });
        sendList.mockResolvedValueOnce({ success: true });
        await (svc as any).sendReplyChunks(
            '6281@s.whatsapp.net',
            '*Konfirmasi belanja*\nTotal: 5000',
        );
        expect(sendList).toHaveBeenCalled();

        sendButtons.mockResolvedValue({ success: false });
        sendList.mockResolvedValue({ success: false, error: 'down' });
        sendText.mockResolvedValueOnce({ success: false, error: 'down' });
        await (svc as any).sendReplyChunks('6281@s.whatsapp.net', 'halo biasa');
        expect(svc['logger'].error).toHaveBeenCalled();
        expect(transport.sendText).toBeDefined();
    });

    it('resetSimSession validates and clears session', async () => {
        const resetSessionState = vi.fn();
        const maybeSingle = vi.fn(async () => ({
            data: { conversation_id: 'c-sim' },
            error: null,
        }));
        const del = vi.fn(async () => ({ error: { message: 'fk' } }));
        const from = vi.fn(() => ({
            select: () => ({
                eq: () => ({
                    eq: () => ({ maybeSingle }),
                }),
            }),
            delete: () => ({
                eq: () => ({
                    eq: () => del(),
                }),
            }),
        }));
        const svc = new StudioWhatsAppService(
            { get: () => undefined } as any,
            { getAdminClient: () => ({ from }) } as any,
            {
                providerId: 'hermes',
                defaultSession: 'hermes',
                phoneToChatId: (p: string) => `${p}@s.whatsapp.net`,
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
            { resetSessionState } as any,
            {} as any,
        );
        vi.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);

        await expect(svc.resetSimSession({ tenantId: '' })).rejects.toBeInstanceOf(BadRequestException);
        await expect(svc.resetSimSession({ tenantId: 't', phone: '12' })).rejects.toBeInstanceOf(
            BadRequestException,
        );

        const out = await svc.resetSimSession({ tenantId: 'toko', phone: '6281111000001' });
        expect(out.ok).toBe(true);
        expect(out.chatId).toBe('sim:toko:6281111000001');
        expect(resetSessionState).toHaveBeenCalledWith('toko', '6281111000001', 'c-sim');
        expect(svc['logger'].warn).toHaveBeenCalled();
    });

    it('handleWebhook ignores noise and unregistered senders', async () => {
        const sendText = vi.fn(async () => ({ success: true }));
        const from = vi.fn(() => ({
            select: vi.fn(() => ({
                then: (resolve: (v: unknown) => void) =>
                    resolve({
                        data: [
                            {
                                tenant_id: 't1',
                                enabled: true,
                                notebook_id: 'nb',
                                business_phone: '628999',
                                allowlist_phones: [],
                            },
                            {
                                tenant_id: 't2',
                                enabled: true,
                                notebook_id: 'nb2',
                                business_phone: '628888',
                                allowlist_phones: [],
                            },
                        ],
                        error: null,
                    }),
            })),
        }));
        const { svc } = makeService({
            transport: { sendText, defaultSession: 'hermes' },
            supabase: { getAdminClient: () => ({ from }) },
        });
        vi.spyOn(svc['logger'], 'debug').mockImplementation(() => undefined);
        vi.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);
        vi.spyOn(svc['logger'], 'log').mockImplementation(() => undefined);

        await svc.handleWebhook({ event: 'message.any', payload: {} });
        await svc.handleWebhook({ event: 'session.status', payload: {} });
        await svc.handleWebhook({ event: 'message', payload: { fromMe: true, from: '6281@s.whatsapp.net' } });
        await svc.handleWebhook({ event: 'message', payload: {} });
        await svc.handleWebhook({
            event: 'message',
            payload: { from: '628111@s.whatsapp.net', body: 'halo' },
        });
        expect(sendText).toHaveBeenCalled();
        expect(String(sendText.mock.calls[0][1])).toMatch(/belum terdaftar/i);
    });
});
