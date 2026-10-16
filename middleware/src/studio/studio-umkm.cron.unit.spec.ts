import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StudioUmkmCronService } from './studio-umkm.cron';

function makeChain(result: any, throwOnUpdate = false) {
    const chain: any = {
        from: () => chain,
        update: () => {
            if (throwOnUpdate) throw new Error('db down');
            return chain;
        },
        eq: () => chain,
        lt: () => chain,
        then: (res: any, rej: any) => Promise.resolve(result).then(res, rej),
    };
    return chain;
}

function build(opts: {
    updateResult?: any;
    throwOnUpdate?: boolean;
    enabled?: string | undefined;
    configs?: any[] | (() => Promise<any[]>);
    sendOk?: boolean;
    dailyReport?: string;
} = {}) {
    const chain = makeChain(
        opts.updateResult ?? { error: null, count: 0 },
        opts.throwOnUpdate,
    );
    const supabaseService = { getAdminClient: () => chain };
    const configService = {
        get: vi.fn(() => opts.enabled),
    };
    const umkmService = {
        buildDailyReportMessage: vi.fn(async () => opts.dailyReport ?? 'REPORT'),
    };
    const listImpl =
        typeof opts.configs === 'function'
            ? opts.configs
            : async () => opts.configs ?? [];
    const whatsappService = {
        listEnabledConfigsForCron: vi.fn(listImpl),
        sendOutboundText: vi.fn(async () => opts.sendOk ?? true),
    };
    const svc = new StudioUmkmCronService(
        configService as any,
        supabaseService as any,
        umkmService as any,
        whatsappService as any,
    );
    vi.spyOn(svc['logger'], 'log').mockImplementation(() => undefined);
    vi.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);
    vi.spyOn(svc['logger'], 'debug').mockImplementation(() => undefined);
    vi.spyOn(svc['logger'], 'error').mockImplementation(() => undefined);
    return { svc, configService, umkmService, whatsappService };
}

describe('StudioUmkmCronService', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('expirePendingSales', () => {
        it('sukses dengan count>0 → log', async () => {
            const { svc } = build({ updateResult: { error: null, count: 3 } });
            await svc.expirePendingSales();
            expect(svc['logger'].log).toHaveBeenCalled();
        });

        it('sukses count 0 → tidak log', async () => {
            const { svc } = build({ updateResult: { error: null, count: 0 } });
            await svc.expirePendingSales();
            expect(svc['logger'].log).not.toHaveBeenCalled();
        });

        it('error dari db → warn & return', async () => {
            const { svc } = build({
                updateResult: { error: { message: 'boom' }, count: null },
            });
            await svc.expirePendingSales();
            expect(svc['logger'].warn).toHaveBeenCalled();
        });

        it('exception → warn', async () => {
            const { svc } = build({ throwOnUpdate: true });
            await svc.expirePendingSales();
            expect(svc['logger'].warn).toHaveBeenCalled();
        });
    });

    describe('pushDailyReports', () => {
        it('disabled via config "false" → skip', async () => {
            const { svc, whatsappService } = build({ enabled: 'false' });
            await svc.pushDailyReports();
            expect(whatsappService.listEnabledConfigsForCron).not.toHaveBeenCalled();
        });

        it('default off (config undefined) → skip', async () => {
            const { svc, whatsappService } = build({
                enabled: undefined,
                configs: [
                    {
                        notebook_id: 'nb1',
                        tenant_id: 't1',
                        label: 'Toko A',
                        allowlist_phones: ['628111'],
                        session_name: 'sess1',
                    },
                ],
                sendOk: true,
            });
            await svc.pushDailyReports();
            expect(whatsappService.listEnabledConfigsForCron).not.toHaveBeenCalled();
            expect(whatsappService.sendOutboundText).not.toHaveBeenCalled();
        });

        it('explicit true → kirim ke phone allowlist', async () => {
            const { svc, whatsappService } = build({
                enabled: 'true',
                configs: [
                    {
                        notebook_id: 'nb1',
                        tenant_id: 't1',
                        label: 'Toko A',
                        allowlist_phones: ['628111'],
                        session_name: 'sess1',
                    },
                ],
                sendOk: true,
            });
            await svc.pushDailyReports();
            expect(whatsappService.sendOutboundText).toHaveBeenCalledWith(
                '628111',
                expect.stringContaining('Toko A'),
                'sess1',
            );
        });

        it('tanpa allowlist → fallback business_phone; label kosong pakai tenant_id; tanpa session', async () => {
            const { svc, whatsappService } = build({
                enabled: 'true',
                configs: [
                    {
                        notebook_id: 'nb1',
                        tenant_id: 't2',
                        allowlist_phones: null,
                        business_phone: '628999',
                    },
                ],
                sendOk: false,
            });
            await svc.pushDailyReports();
            expect(whatsappService.sendOutboundText).toHaveBeenCalledWith(
                '628999',
                expect.stringContaining('t2'),
                undefined,
            );
        });

        it('skip config tanpa notebook_id dan tanpa phone', async () => {
            const { svc, whatsappService } = build({
                enabled: 'true',
                configs: [
                    { tenant_id: 't3' },
                    { notebook_id: 'nb4', tenant_id: 't4', allowlist_phones: [] },
                ],
            });
            await svc.pushDailyReports();
            expect(whatsappService.sendOutboundText).not.toHaveBeenCalled();
        });

        it('listEnabledConfigsForCron throw → error log', async () => {
            const { svc } = build({
                enabled: 'true',
                configs: () => {
                    throw new Error('list fail');
                },
            });
            await svc.pushDailyReports();
            expect(svc['logger'].error).toHaveBeenCalled();
        });
    });
});
