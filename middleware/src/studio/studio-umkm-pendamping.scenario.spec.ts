import { describe, expect, it } from 'vitest';
import { makeUmkmService } from './studio-umkm-test-harness';
import { DEFAULT_STUDIO_UMKM_CONTEXT } from './studio-umkm.service';

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
});
