/**
 * PO/tester scenarios: human-feel chat + data correctness gaps closed.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_STUDIO_UMKM_CONTEXT } from './studio-umkm.service';
import { makeUmkmService } from './studio-umkm-test-harness';
import { formatSaleConfirmationWithCatalog } from './studio-umkm-product.util';
import { formatMenuHubPrompt, formatReportHubPrompt } from './studio-umkm-commands';

const cfg = DEFAULT_STUDIO_UMKM_CONTEXT;

describe('PO×tester — human chat + data correctness', () => {
    it('hub prompts prefer NL over digit-only', () => {
        expect(formatMenuHubPrompt()).toMatch(/daftar|tambah menu/i);
        expect(formatMenuHubPrompt()).toMatch(/Boleh juga balas/i);
        expect(formatReportHubPrompt()).toMatch(/hari ini/i);
    });

    it('menu hub accepts NL daftar / tambah menu', async () => {
        const { svc } = makeUmkmService();
        svc.openMenuHub('t', undefined, 'c-nl');
        const list = await svc.continueWizard('daftar', 't', undefined, 'c-nl', cfg);
        expect(list).toMatch(/Mie Ayam|Menu|barang/i);

        svc.openMenuHub('t', undefined, 'c-nl2');
        const add = await svc.continueWizard('tambah menu', 't', undefined, 'c-nl2', cfg);
        expect(add).toMatch(/nama menu|mie ayam/i);
    });

    it('report hub accepts hari ini without digit', async () => {
        const { svc } = makeUmkmService({ orders: [], purchases: [] });
        svc.openReportHub('t', undefined, 'c-rep');
        const r = await svc.continueWizard('hari ini', 't', undefined, 'c-rep', cfg);
        expect(r).toMatch(/Laporan/i);
    });

    it('shared stock/report handlers soft-confirm like direct chat', async () => {
        const { svc } = makeUmkmService();
        const soft = await svc.handleCheckStockIntent('cek stok', 't', undefined, 'c-s');
        expect(soft).toMatch(/semua|nama/i);
        expect(soft).not.toMatch(/\*[1234]\*/);

        const softR = await svc.handleSalesReportIntent('laporan', 't', undefined, 'c-r');
        expect(softR).toMatch(/hari ini/i);

        const week = await svc.handleSalesReportIntent('laporan minggu ini', 't', undefined, 'c-r2');
        expect(week).toMatch(/Laporan/i);
        expect(week).not.toMatch(/periode mana/i);
    });

    it('slot fill acknowledges progress (Oke — …)', async () => {
        const { svc } = makeUmkmService();
        await svc.handleMessage('jual', 't', '6281', cfg, { conversationId: 'c-ack' });
        const mid = await svc.handleMessage('bakso', 't', '6281', cfg, { conversationId: 'c-ack' });
        expect(mid).toMatch(/Oke — \*bakso\*/i);
        expect(mid).toMatch(/jumlah/i);
    });

    it('confirm copy invites nilai N not bare menu digits', () => {
        const msg = formatSaleConfirmationWithCatalog({
            orderNumber: 'WA-1',
            totalAmount: 10000,
            items: [
                {
                    name: 'Bakso',
                    quantity: 1,
                    unitPrice: 10000,
                    catalogMatched: true,
                },
            ],
        });
        expect(msg).toMatch(/nilai 4/i);
        expect(msg).not.toMatch(/Ketik \*1–5\*/);
    });

    it('pending sale keyed by conversationId (guided-safe)', async () => {
        const { svc } = makeUmkmService();
        const prepared = await svc.prepareSaleFromText('jual 1 bakso 18000', 't', undefined, cfg);
        expect(prepared.kind).toBe('preview');
        if (prepared.kind !== 'preview') return;
        svc.setPendingSale('t', prepared.pending, undefined, 'conv-A');
        expect(svc.getPendingSale('t', undefined, 'conv-A')).toBeTruthy();
        expect(svc.getPendingSale('t', undefined, 'conv-B')).toBeUndefined();
    });
});
