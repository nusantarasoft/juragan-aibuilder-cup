/**
 * PO × tester — perintah non-jual: simulasi kondisi + best practice.
 *
 * Persona: penjual/kasir UMKM di WA.
 * Prinsip (sama seperti jual):
 * - Jangan tanya / jangan tulis apa yang DB sudah tahu tanpa alasan
 * - Write path → konfirmasi atau minimal jangan simpan data jelek (harga 0)
 * - Read path → soft-confirm kalau ambigu; NL > digit menu
 * - Bantu angka (total / qty / harga) di preview
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_STUDIO_UMKM_CONTEXT } from './studio-umkm.service';
import { makeUmkmService } from './studio-umkm-test-harness';

const cfg = DEFAULT_STUDIO_UMKM_CONTEXT;

describe('PO — cek stok (read, soft-confirm)', () => {
    it('S1: cek stok → semua → list (tanpa digit menu)', async () => {
        const { svc } = makeUmkmService();
        const soft = await svc.handleMessage('cek stok', 't', '6281', cfg, { conversationId: 'st1' });
        expect(soft).toMatch(/semua|nama/i);
        expect(soft).not.toMatch(/\*[1234]\*/);

        const all = await svc.handleMessage('semua', 't', '6281', cfg, { conversationId: 'st1' });
        expect(all).toMatch(/Cek Stok|Mie Ayam|Bakso|Es Teh/i);
    });

    it('S2: cek stok → bakso → baris produk', async () => {
        const { svc } = makeUmkmService();
        await svc.handleMessage('cek stok', 't', '6282', cfg, { conversationId: 'st2' });
        const one = await svc.handleMessage('bakso', 't', '6282', cfg, { conversationId: 'st2' });
        expect(one).toMatch(/Bakso/i);
    });

    it('S3: cek stok bakso / cek stok semua skip soft-confirm', async () => {
        const { svc } = makeUmkmService();
        const named = await svc.handleMessage('cek stok bakso', 't', '6283', cfg, {
            conversationId: 'st3',
        });
        expect(named).toMatch(/Bakso/i);
        expect(named).not.toMatch(/semua atau/i);

        const all = await svc.handleMessage('cek stok semua', 't', '6283', cfg, {
            conversationId: 'st3b',
        });
        expect(all).toMatch(/Cek Stok|Mie Ayam/i);
        expect(all).not.toMatch(/Balas \*semua\*/i);
    });

    it('S4: nama tidak ketemu → pesan ramah', async () => {
        const { svc } = makeUmkmService();
        const miss = await svc.handleMessage('cek stok gorengan super', 't', '6284', cfg, {
            conversationId: 'st4',
        });
        expect(miss).toMatch(/tidak ditemukan|Tidak ditemukan|belum ada/i);
    });
});

describe('PO — laporan (read, soft-confirm)', () => {
    it('S5: laporan → minggu ini (NL, bukan *1*–*4*)', async () => {
        const { svc } = makeUmkmService({ orders: [], purchases: [] });
        const soft = await svc.handleMessage('laporan', 't', '6285', cfg, { conversationId: 'rp1' });
        expect(soft).toMatch(/hari ini|minggu|bulan/i);
        expect(soft).not.toMatch(/\*[1234]\*/);

        const week = await svc.handleMessage('minggu ini', 't', '6285', cfg, {
            conversationId: 'rp1',
        });
        expect(week).toMatch(/Laporan/i);
    });

    it('S6: laporan hari ini langsung tanpa soft-confirm', async () => {
        const { svc } = makeUmkmService({ orders: [], purchases: [] });
        const r = await svc.handleMessage('laporan hari ini', 't', '6286', cfg, {
            conversationId: 'rp2',
        });
        expect(r).toMatch(/Laporan/i);
        expect(r).not.toMatch(/periode mana|Balas \*hari ini\*/i);
    });
});

describe('PO — daftar penjualan / belanja (list + total)', () => {
    it('S7: daftar penjualan tampil total; periode di pesan dihormati', async () => {
        const { svc } = makeUmkmService({
            orders: [
                {
                    order_number: 'WA-1',
                    total_amount: 36000,
                    created_at: new Date().toISOString(),
                    customer_name: 'WA',
                },
            ],
        });
        const r = await svc.handleMessage('daftar penjualan hari ini', 't', '6287', cfg, {
            conversationId: 'ls1',
        });
        expect(r).toMatch(/penjualan|WA-1|36/i);
        expect(r).toMatch(/Total|total/i);
    });

    it('S8: daftar belanja tampil total', async () => {
        const { svc } = makeUmkmService({
            purchases: [
                {
                    purchase_number: 'BL-1',
                    purchase_date: '2026-07-24',
                    total_cost: 50000,
                    supplier_name: 'Pasar',
                },
            ],
        });
        const r = await svc.handleMessage('daftar belanja', 't', '6288', cfg, {
            conversationId: 'lp1',
        });
        expect(r).toMatch(/belanja|BL-1|50/i);
    });
});

describe('PO — tambah menu (write: jangan harga 0)', () => {
    it('S9: tambah menu bakso (tanpa harga) → tanya harga, JANGAN create @0', async () => {
        const { svc, createItem } = makeUmkmService();
        const r = await svc.handleMessage('tambah menu bakso', 't', '6289', cfg, {
            conversationId: 'ap1',
        });
        expect(r).toMatch(/harga/i);
        expect(r).toMatch(/bakso/i);
        expect(createItem).not.toHaveBeenCalled();

        const r2 = await svc.handleMessage('18000', 't', '6289', cfg, { conversationId: 'ap1' });
        expect(r2).toMatch(/Menu ditambahkan|ditambahkan/i);
        expect(createItem).toHaveBeenCalledWith(
            't',
            expect.objectContaining({ name: expect.stringMatching(/bakso/i), sellingPrice: 18000 }),
        );
    });

    it('S10: tambah menu bakso 18000 → langsung simpan (satu pesan lengkap)', async () => {
        const { svc, createItem } = makeUmkmService();
        const r = await svc.handleMessage('tambah menu kopi susu 20000', 't', '6290', cfg, {
            conversationId: 'ap2',
        });
        expect(r).toMatch(/Menu ditambahkan/i);
        expect(createItem).toHaveBeenCalledWith(
            't',
            expect.objectContaining({ sellingPrice: 20000 }),
        );
    });
});

describe('PO — tambah stok (catalog match)', () => {
    it('S11: tambah stok mie 10 → match Mie Ayam + qty', async () => {
        const { svc, createStockMovement } = makeUmkmService();
        const r = await svc.handleMessage('tambah stok mie 10', 't', '6291', cfg, {
            conversationId: 'as1',
        });
        expect(r).toMatch(/Stok|Mie Ayam|\+10/i);
        expect(createStockMovement).toHaveBeenCalled();
    });

    it('S12: tambah stok barang asing → tidak ketemu, jangan write', async () => {
        const { svc, createStockMovement } = makeUmkmService();
        const r = await svc.handleMessage('tambah stok gorengan 5', 't', '6292', cfg, {
            conversationId: 'as2',
        });
        expect(r).toMatch(/tidak ditemukan/i);
        expect(createStockMovement).not.toHaveBeenCalled();
    });
});

describe('PO — belanja (preview + ya, bantu total)', () => {
    it('S13: belanja lengkap → preview total → ya', async () => {
        const { svc } = makeUmkmService();
        const preview = await svc.handleMessage('belanja 10 mie ayam @5000', 't', '6293', cfg, {
            conversationId: 'pu1',
        });
        expect(preview).toMatch(/Konfirmasi belanja/i);
        expect(preview).toMatch(/50\.000|50000|Total/i);
        expect(preview).toMatch(/\*ya\*/i);

        const done = await svc.handleMessage('ya', 't', '6293', cfg, { conversationId: 'pu1' });
        expect(done).toMatch(/tercatat|Belanja|BL-|berhasil/i);
    });

    it('S14: belanja tanpa detail → slot-fill natural (nama → qty → biaya)', async () => {
        const { svc } = makeUmkmService();
        const tip = await svc.handleMessage('tambah belanja', 't', '6294', cfg, {
            conversationId: 'pu2',
        });
        expect(tip).toMatch(/Barang apa|Siap catat belanja/i);
        expect(tip).not.toMatch(/Konfirmasi belanja/i);

        const name = await svc.handleMessage('mie ayam', 't', '6294', cfg, {
            conversationId: 'pu2',
        });
        expect(name).toMatch(/jumlah|Berapa/i);

        const qty = await svc.handleMessage('10', 't', '6294', cfg, { conversationId: 'pu2' });
        expect(qty).toMatch(/harga modal|berapa/i);

        const cost = await svc.handleMessage('5000', 't', '6294', cfg, { conversationId: 'pu2' });
        expect(cost).toMatch(/Konfirmasi belanja/i);
        expect(cost).toMatch(/50\.000|50000/);
    });
});

describe('PO — daftar barang + feedback + batal', () => {
    it('S15: daftar barang tampil harga katalog (bantu penjual)', async () => {
        const { svc } = makeUmkmService();
        const r = await svc.handleMessage('daftar barang', 't', '6295', cfg, {
            conversationId: 'lb1',
        });
        expect(r).toMatch(/Daftar Barang|Bakso/i);
        expect(r).toMatch(/18\.000|18000|15\.000|15000/);
    });

    it('S16: nilai 4 setelah alur → thanks, bukan menu digit', async () => {
        const { svc } = makeUmkmService();
        const r = await svc.handleMessage('nilai 4', 't', '6296', cfg, { conversationId: 'fb1' });
        expect(r).toMatch(/terima kasih|Terima kasih|feedback|masukan/i);
        expect(r).not.toMatch(/Konfirmasi penjualan|Menu toko/i);
    });

    it('S17: batal di soft-confirm stok → keluar bersih', async () => {
        const { svc } = makeUmkmService();
        await svc.handleMessage('cek stok', 't', '6297', cfg, { conversationId: 'bt1' });
        const cancel = await svc.handleMessage('batal', 't', '6297', cfg, {
            conversationId: 'bt1',
        });
        expect(cancel).toMatch(/batal|Dibatalkan/i);
    });
});
