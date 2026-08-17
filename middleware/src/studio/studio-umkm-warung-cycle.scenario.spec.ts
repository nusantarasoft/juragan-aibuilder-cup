/**
 * One warung cycle: add menu → stock → list → sell → buy → check stock → reports.
 * Mirrors live C3–C15 after 45d681a (menu_hub yields to the next clear one-liner).
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_STUDIO_UMKM_CONTEXT } from './studio-umkm.service';
import { makeUmkmService } from './studio-umkm-test-harness';

const cfg = DEFAULT_STUDIO_UMKM_CONTEXT;
const SKU = 'teh pucuk cyc';
const conv = 'warung-cycle';

describe('PO — satu siklus warung (menu → stok → jual → belanja → laporan)', () => {
    it('C3–C15: create SKU, stock in, sell, buy, stock check, reports', async () => {
        const { svc, createItem, createStockMovement } = makeUmkmService({
            orders: [
                {
                    order_number: 'WA-20260817-1',
                    total_amount: 8000,
                    created_at: new Date().toISOString(),
                    customer_name: 'WA',
                },
            ],
        });
        const turn = (text: string) =>
            svc.handleMessage(text, 't', '6281', cfg, { conversationId: conv });

        const added = await turn(`tambah menu ${SKU} 4000`);
        expect(added).toMatch(/Menu ditambahkan/i);
        expect(added).toMatch(/teh pucuk/i);
        expect(createItem).toHaveBeenCalledWith(
            't',
            expect.objectContaining({
                name: expect.stringMatching(/teh pucuk cyc/i),
                sellingPrice: 4000,
            }),
        );

        // After add product the wizard is menu_hub; one-liner must still run (yield).
        const stockIn = await turn(`tambah stok ${SKU} 20`);
        expect(stockIn).toMatch(/Stok|teh pucuk|\+20/i);
        expect(stockIn).not.toMatch(/pilihan tidak|ketik \*1\*|\*2\*|\*3\*/i);
        expect(createStockMovement).toHaveBeenCalled();

        const list = await turn('daftar barang');
        expect(list).toMatch(/Daftar Barang|teh pucuk/i);
        expect(list).not.toMatch(/Harga modal/i);

        const check = await turn(`cek stok ${SKU}`);
        expect(check).toMatch(/Cek Stok|teh pucuk/i);
        expect(check).not.toMatch(/Harga modal \*cek stok/i);

        const salePreview = await turn(`tadi ada yang beli 2 ${SKU}`);
        expect(salePreview).toMatch(/Konfirmasi penjualan/i);
        expect(salePreview).toMatch(/teh pucuk/i);
        const saleDone = await turn('ya');
        expect(saleDone).toMatch(/dicatat|WA-/i);

        const buyPreview = await turn(`belanja 8 ${SKU} @2500`);
        expect(buyPreview).toMatch(/Konfirmasi belanja/i);
        const buyDone = await turn('ya');
        expect(buyDone).toMatch(/tercatat|BL-/i);

        const mixed = await turn(`beli 5 ${SKU}`);
        expect(mixed).toMatch(/jual|belanja/i);
        const asBuy = await turn('belanja');
        expect(asBuy).toMatch(/modal|harga/i);
        expect(asBuy).toMatch(/teh pucuk/i);
        const priced = await turn('2500');
        expect(priced).toMatch(/Konfirmasi belanja/i);
        expect(priced).toMatch(/12\.500|12500/);
        const mixedDone = await turn('ya');
        expect(mixedDone).toMatch(/tercatat|BL-/i);
        expect(mixedDone).not.toMatch(/\*5x ya\*/i);

        const after = await turn(`cek stok ${SKU}`);
        expect(after).toMatch(/Cek Stok|teh pucuk/i);
        expect(after).not.toMatch(/Harga modal/i);

        const omzet = await turn('omzet hari ini berapa ya');
        expect(omzet).toMatch(/Laporan|omzet|Penjualan/i);
        expect(omzet).not.toMatch(/Harga modal|Belum kebaca/i);

        const laporan = await turn('laporan hari ini');
        expect(laporan).toMatch(/Laporan/i);

        const daftar = await turn('daftar penjualan');
        expect(daftar).toMatch(/penjualan|WA-|Total/i);

        const falseSale = await turn('berapa yang beli hari ini?');
        expect(falseSale).not.toMatch(/Konfirmasi penjualan/i);
    });
});
