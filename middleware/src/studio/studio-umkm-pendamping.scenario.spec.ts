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

    it('help (0) includes one pendamping line, no new digit', async () => {
        const { svc, pendamping } = makeUmkmService();
        const help = await svc.handleMessage('0', 't', '6281', DEFAULT_STUDIO_UMKM_CONTEXT, {
            conversationId: 'c-help',
        });
        expect(help).toMatch(/ketik \*pendamping\* untuk saran bisnis/i);
        expect((String(help).match(/pendamping/gi) || []).length).toBeGreaterThanOrEqual(1);
        // cheat-sheet still 0–6 only (no digit 7 for coach)
        expect(formatUmkmHelp()).not.toMatch(/^\s*7[\.\)]/m);
        expect(pendamping.coach).not.toHaveBeenCalled();
    });
});
