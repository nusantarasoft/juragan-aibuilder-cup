/**
 * Pendamping Bisnis — routing + sticky + help scenarios.
 * Live production matrix: .gstack/qa-reports/qa-report-production-pendamping-2026-08-23.md
 */
import { describe, expect, it } from 'vitest';
import { makeUmkmService } from './studio-umkm-test-harness';
import { DEFAULT_STUDIO_UMKM_CONTEXT } from './studio-umkm.service';
import { formatUmkmHelp } from './studio-umkm.util';

describe('Pendamping routing scenarios', () => {
    it('routing: saran bisnis returns string (never null)', async () => {
        const { svc, pendamping } = makeUmkmService();
        (pendamping.coach as any).mockResolvedValue('Coach tips here');
        const r = await svc.handleMessage('saran bisnis', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'c-pendamping',
        });
        expect(r).toBe('Coach tips here');
        expect(r).not.toBeNull();
        expect(pendamping.coach).toHaveBeenCalled();
    });

    it('routing: pendamping exact alias → coach', async () => {
        const { svc, pendamping } = makeUmkmService();
        (pendamping.coach as any).mockResolvedValue('Coach from pendamping');
        const r = await svc.handleMessage('pendamping', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'c-pd',
        });
        expect(r).toBe('Coach from pendamping');
        expect(pendamping.coach).toHaveBeenCalled();
    });

    it('routing: pendamping bisnis alias → coach', async () => {
        const { svc, pendamping } = makeUmkmService();
        (pendamping.coach as any).mockResolvedValue('Coach from alias');
        const r = await svc.handleMessage(
            'Pendamping Bisnis.',
            't',
            '6281',
            DEFAULT_STUDIO_UMKM_CONTEXT,
            { conversationId: 'c-pd-bisnis' },
        );
        expect(r).toBe('Coach from alias');
        expect(pendamping.coach).toHaveBeenCalled();
    });

    it('routing: soft tips still ask → null', async () => {
        const { svc, pendamping } = makeUmkmService();
        const r = await svc.handleMessage(
            'tips naikin omzet toko saya dong',
            't',
            '6281',
            DEFAULT_STUDIO_UMKM_CONTEXT,
            { conversationId: 'c-ask' },
        );
        expect(r).toBeNull();
        expect(pendamping.coach).not.toHaveBeenCalled();
    });

    it('CRITICAL: pending sale + saran bisnis → sticky (not coach)', async () => {
        const { svc, pendamping } = makeUmkmService({
            products: [{ id: 'p1', name: 'indomie', sku: 'I1', sellingPrice: 3000 }],
        });
        await svc.handleMessage('jual 2 indomie', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'c-sticky',
        });
        const sticky = await svc.handleMessage(
            'saran bisnis',
            't',
            '6281',
            DEFAULT_STUDIO_UMKM_CONTEXT,
            { conversationId: 'c-sticky' },
        );
        expect(sticky).toMatch(/draft|konfirmasi|batal|ya/i);
        expect(pendamping.coach).not.toHaveBeenCalled();
    });

    it('CRITICAL: pending sale + pendamping → sticky (not coach)', async () => {
        const { svc, pendamping } = makeUmkmService({
            products: [{ id: 'p1', name: 'bakso', sku: 'B1', sellingPrice: 5000 }],
        });
        await svc.handleMessage('jual 1 bakso', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'c-sticky-pd',
        });
        pendamping.coach.mockClear();
        const sticky = await svc.handleMessage('pendamping', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'c-sticky-pd',
        });
        expect(sticky).toMatch(/draft|konfirmasi|batal|ya/i);
        expect(pendamping.coach).not.toHaveBeenCalled();
    });

    it('clear jual still wins (sale path, not coach)', async () => {
        const { svc, pendamping } = makeUmkmService({
            products: [{ id: 'p1', name: 'indomie', sku: 'I1', sellingPrice: 3000 }],
        });
        const r = await svc.handleMessage('jual 2 indomie', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'c-sale',
        });
        expect(r).toBeTruthy();
        expect(r).not.toBeNull();
        expect(String(r)).toMatch(/indomie|preview|ya|konfirm|Rp/i);
        expect(pendamping.coach).not.toHaveBeenCalled();
    });

    it('after sale ya → sale confirm only (no coach nudge)', async () => {
        const { svc, pendamping } = makeUmkmService({
            products: [{ id: 'p1', name: 'indomie', sku: 'I1', sellingPrice: 3000 }],
        });
        const conv = 'c-ya-nudge';
        await svc.handleMessage('jual 1 indomie', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: conv,
        });
        pendamping.coach.mockClear();
        const done = await svc.handleMessage('ya', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: conv,
        });
        expect(done).toBeTruthy();
        expect(String(done)).not.toMatch(/Ringkasan:|3 saran|ketik \*pendamping\*/i);
        expect(pendamping.coach).not.toHaveBeenCalled();
    });

    it('help (0) includes *7* + pendamping line when enabled', async () => {
        const { svc, pendamping } = makeUmkmService();
        const help = await svc.handleMessage('0', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'c-help',
        });
        expect(help).toMatch(/\*7\* Pendamping bisnis/i);
        expect(help).toMatch(/ketik \*pendamping\* untuk saran bisnis/i);
        expect(formatUmkmHelp()).toMatch(/\*7\* Pendamping bisnis/);
        expect(pendamping.coach).not.toHaveBeenCalled();
    });

    it('F1: digit 7 → coach when flag missing', async () => {
        const { svc, pendamping } = makeUmkmService();
        (pendamping.coach as any).mockResolvedValue('Coach via 7');
        const r = await svc.handleMessage('7', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'c-d7',
        });
        expect(r).toBe('Coach via 7');
        expect(pendamping.coach).toHaveBeenCalled();
    });

    it('F8: media-polluted digit 7 → coach', async () => {
        const { svc, pendamping } = makeUmkmService();
        (pendamping.coach as any).mockResolvedValue('Coach media 7');
        const r = await svc.handleMessage(
            '7\n[User mengirim media: image/jpeg]',
            't',
            '6281',
            DEFAULT_STUDIO_UMKM_CONTEXT,
            { conversationId: 'c-d7-media' },
        );
        expect(r).toBe('Coach media 7');
        expect(pendamping.coach).toHaveBeenCalled();
    });

    it('F2/F3: flag false → alias + digit 7 blocked', async () => {
        const { svc, pendamping } = makeUmkmService();
        const off = { ...DEFAULT_STUDIO_UMKM_CONTEXT, umkm_pendamping_enabled: false };
        const a = await svc.handleMessage('pendamping', 't', '6281', off, {
            conversationId: 'c-off-alias',
        });
        expect(a).toMatch(/tidak aktif/i);
        expect(pendamping.coach).not.toHaveBeenCalled();
        const d = await svc.handleMessage('7', 't', '6281', off, { conversationId: 'c-off-7' });
        expect(d).toMatch(/tidak aktif/i);
        expect(pendamping.coach).not.toHaveBeenCalled();
    });

    it('F4: flag false → help/welcome strip pendamping', async () => {
        const { svc } = makeUmkmService();
        const off = { ...DEFAULT_STUDIO_UMKM_CONTEXT, umkm_pendamping_enabled: false };
        const help = await svc.handleMessage('0', 't', '6281', off, { conversationId: 'c-off-help' });
        expect(help).not.toMatch(/\*7\*/);
        expect(help).not.toMatch(/pendamping/i);
        const welcome = await svc.handleMessage('halo', 't', '6281', off, {
            conversationId: 'c-off-hi',
        });
        expect(welcome).not.toMatch(/\*7\*/);
        expect(welcome).not.toMatch(/pendamping/i);
    });

    it('F5: flag true → welcome shows *7*', async () => {
        const { svc } = makeUmkmService();
        const welcome = await svc.handleMessage('halo', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'c-hi-7',
        });
        expect(welcome).toMatch(/\*7\* Pendamping bisnis/i);
        expect(welcome).toMatch(/ketik \*pendamping\*/i);
    });

    it('F6: sticky sale + digit 7 → sticky wins', async () => {
        const { svc, pendamping } = makeUmkmService({
            products: [{ id: 'p1', name: 'bakso', sku: 'B1', sellingPrice: 5000 }],
        });
        await svc.handleMessage('jual 1 bakso', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'c-sticky-7',
        });
        pendamping.coach.mockClear();
        const sticky = await svc.handleMessage('7', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'c-sticky-7',
        });
        expect(sticky).toMatch(/draft|konfirmasi|batal|ya/i);
        expect(pendamping.coach).not.toHaveBeenCalled();
    });

    it('F10: wizard + digit 7 → wizard wins', async () => {
        const { svc, pendamping } = makeUmkmService({
            products: [{ id: 'p1', name: 'bakso', sku: 'B1', sellingPrice: 5000 }],
        });
        await svc.handleMessage('jual', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'c-wiz-7',
        });
        pendamping.coach.mockClear();
        const mid = await svc.handleMessage('7', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'c-wiz-7',
        });
        expect(pendamping.coach).not.toHaveBeenCalled();
        expect(mid).toBeTruthy();
        expect(String(mid)).not.toMatch(/tidak aktif/i);
    });

    it('F11: stamp digit 7 suppressed when enabled', () => {
        const cmds = {
            ...DEFAULT_STUDIO_UMKM_CONTEXT.umkm_commands!,
            menu: [
                ...(DEFAULT_STUDIO_UMKM_CONTEXT.umkm_commands?.menu || []),
                { digit: '7', intent: 'sales_report' as const, label: 'Laporan custom' },
            ],
        };
        const help = formatUmkmHelp(cmds, { pendampingEnabled: true });
        expect(help).toMatch(/\*7\* Pendamping bisnis/);
        expect(help).not.toMatch(/Laporan custom/);
        const off = formatUmkmHelp(cmds, { pendampingEnabled: false });
        expect(off).toMatch(/\*7\* Laporan custom/);
        expect(off).not.toMatch(/Pendamping bisnis/);
    });
});
