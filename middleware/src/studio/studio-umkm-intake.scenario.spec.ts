/**
 * D4.1 muddy-intent intake: clarify wizard, qty-first turn 2, narrow sticky, no RAG.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_STUDIO_UMKM_CONTEXT } from './studio-umkm.service';
import { makeUmkmService, TEST_CATALOG } from './studio-umkm-test-harness';

const cfg = DEFAULT_STUDIO_UMKM_CONTEXT;
const catalog = [
    ...TEST_CATALOG,
    { id: 'p9', name: 'Indomie Goreng', sku: 'IM-01', sellingPrice: 3500 },
];

describe('UMKM intake — muddy job clarification', () => {
    it('idle indomie 2 → clarify sale vs add_stock, not a preview', async () => {
        const { svc } = makeUmkmService({ products: catalog });
        const r = await svc.handleMessage('indomie 2', 't', '6281', cfg, { conversationId: 'in1' });
        expect(r).toMatch(/Maksudnya/i);
        expect(r).toMatch(/jual/);
        expect(r).toMatch(/tambah stok/);
        expect(r).not.toMatch(/Konfirmasi penjualan/i);
        expect(r).not.toMatch(/kirim ulang/i);
    });

    it('prepareSaleFromText(indomie 2) without allowFollowUp is not a pending sale', async () => {
        const { svc } = makeUmkmService({ products: catalog });
        const prepared = await svc.prepareSaleFromText('indomie 2', 't', '6281', cfg);
        expect(prepared.kind).not.toBe('preview');
    });

    it('indomie 2 then jual → sale of qty 2, not empty wizard', async () => {
        const { svc } = makeUmkmService({ products: catalog });
        await svc.handleMessage('indomie 2', 't', '6281', cfg, { conversationId: 'in2' });
        const r = await svc.handleMessage('jual', 't', '6281', cfg, { conversationId: 'in2' });
        expect(r).toMatch(/Konfirmasi penjualan|Indomie/i);
        expect(r).toMatch(/2/);
        expect(r).not.toMatch(/Barang apa yang dijual|Siap catat penjualan/i);
    });

    it('beli 10 indomie then jual → sale of 10', async () => {
        const { svc } = makeUmkmService({ products: catalog });
        const first = await svc.handleMessage('beli 10 indomie', 't', '6281', cfg, {
            conversationId: 'in3',
        });
        expect(first).toMatch(/belanja/i);
        const r = await svc.handleMessage('jual', 't', '6281', cfg, { conversationId: 'in3' });
        expect(r).toMatch(/Konfirmasi penjualan|Indomie/i);
        expect(r).toMatch(/10/);
        expect(r).not.toMatch(/Siap catat penjualan/i);
    });

    it('indomie 2 then tambah stok → add stock and idle (no menu hub digits)', async () => {
        const { svc } = makeUmkmService({ products: catalog });
        await svc.handleMessage('indomie 2', 't', '6281', cfg, { conversationId: 'in4' });
        const r = await svc.handleMessage('tambah stok', 't', '6281', cfg, { conversationId: 'in4' });
        expect(r).toMatch(/Stok.*Indomie|\+2/i);
        const next = await svc.handleMessage('1', 't', '6281', cfg, { conversationId: 'in4' });
        expect(next).toBeNull();
    });

    it('ya on clarify re-asks; second failed reply → help and clear', async () => {
        const { svc } = makeUmkmService({ products: catalog });
        await svc.handleMessage('indomie 2', 't', '6281', cfg, { conversationId: 'in5' });
        const ya = await svc.handleMessage('ya', 't', '6281', cfg, { conversationId: 'in5' });
        expect(ya).toMatch(/Maksudnya/i);
        const fail1 = await svc.handleMessage('asdf', 't', '6281', cfg, { conversationId: 'in5' });
        expect(fail1).toMatch(/Maksudnya/i);
        const fail2 = await svc.handleMessage('asdf', 't', '6281', cfg, { conversationId: 'in5' });
        expect(fail2).toMatch(/Bisa\. Mau catat|Contoh:/i);
        const after = await svc.handleMessage('indomie 2', 't', '6281', cfg, { conversationId: 'in5' });
        expect(after).toMatch(/Maksudnya/i);
    });

    it('batal on clarify clears without help dump', async () => {
        const { svc } = makeUmkmService({ products: catalog });
        await svc.handleMessage('indomie 2', 't', '6281', cfg, { conversationId: 'in6' });
        const r = await svc.handleMessage('batal', 't', '6281', cfg, { conversationId: 'in6' });
        expect(r).toMatch(/Dibatalkan/i);
        expect(r).not.toMatch(/Bisa\. Mau catat jualan/i);
    });

    it('do-not-clarify: help, ask, customer-sale, stock, omzet, catat, kopi 15000', async () => {
        const turn = async (text: string, conv: string) => {
            const { svc } = makeUmkmService({ products: catalog });
            return svc.handleMessage(text, 't', `62${conv}`, cfg, { conversationId: conv });
        };
        expect(await turn('bantuan dong, mau catat jualan', 'd1')).toMatch(/Bisa\. Mau catat/i);
        expect(await turn('kalau stok indomie mau habis, mending restock berapa?', 'd2')).toBeNull();
        expect(await turn('tadi ada yang beli 2 indomie goreng', 'd3')).toMatch(/Konfirmasi penjualan/i);
        expect(await turn('stok indomie goreng masih berapa', 'd4')).toMatch(/Indomie|stok/i);
        expect(await turn('omzet hari ini berapa ya', 'd5')).toMatch(/Laporan|omzet|hari ini/i);
        expect(await turn('catat', 'd6')).toMatch(/Siap catat|Barang apa/i);
        const kopi = await turn('kopi 15000', 'd7');
        expect(kopi).toMatch(/Belum kebaca/i);
        expect(kopi).not.toMatch(/Konfirmasi penjualan/i);
    });

    it('narrow sticky: unknown re-prompts without kirim ulang; jual replaces; cek stok runs', async () => {
        const { svc } = makeUmkmService({ products: catalog });
        await svc.handleMessage('jual 1 bakso', 't', '6281', cfg, { conversationId: 'st1' });
        const unknown = await svc.handleMessage('xyzabc', 't', '6281', cfg, { conversationId: 'st1' });
        expect(unknown).toMatch(/draft penjualan/i);
        expect(unknown).not.toMatch(/kirim ulang/i);
        const mixed = await svc.handleMessage('indomie 2', 't', '6281', cfg, { conversationId: 'st1' });
        expect(mixed).toMatch(/draft penjualan/i);
        const stock = await svc.handleMessage('cek stok bakso', 't', '6281', cfg, { conversationId: 'st1' });
        expect(stock).toMatch(/Bakso/i);
        const replace = await svc.handleMessage('jual 2 indomie goreng', 't', '6281', cfg, {
            conversationId: 'st1',
        });
        expect(replace).toMatch(/Konfirmasi penjualan/i);
        expect(replace).toMatch(/2/);
        expect(replace).toMatch(/Indomie/i);
    });

    it('expired clarify wizard asks to retype, not empty sale', async () => {
        const { svc } = makeUmkmService({ products: catalog });
        await svc.handleMessage('indomie 2', 't', '6281', cfg, { conversationId: 'ex1' });
        const map = (svc as any).wizardByChat as Map<string, { kind: string; createdAt: number }>;
        for (const [k, w] of map) {
            map.set(k, { ...w, createdAt: Date.now() - 16 * 60 * 1000 });
        }
        const r = await svc.handleMessage('jual', 't', '6281', cfg, { conversationId: 'ex1' });
        expect(r).toMatch(/lewat|ketik ulang/i);
        expect(r).not.toMatch(/Siap catat penjualan/i);
    });

    it('continueWizard does not slot-parse jual while clarifying', async () => {
        const { svc } = makeUmkmService({ products: catalog });
        await svc.handleMessage('indomie 2', 't', '6281', cfg, { conversationId: 'cw1' });
        const r = await svc.continueWizard('jual', 't', '6281', 'cw1', cfg);
        expect(r).toMatch(/Konfirmasi penjualan|Indomie/i);
        expect(r).not.toMatch(/harga jual/i);
    });
});
