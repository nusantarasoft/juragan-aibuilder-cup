/**
 * PO acceptance — penjual catat penjualan: harga default dari katalog, bantu total.
 *
 * Persona: owner/kasir UMKM di WhatsApp (bukan pembeli).
 * Prinsip: jangan tanya harga kalau sudah ada di inv_items.selling_price;
 * tampilkan subtotal & total di preview agar cukup konfirmasi *ya*.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_STUDIO_UMKM_CONTEXT } from './studio-umkm.service';
import { makeUmkmService, TEST_CATALOG } from './studio-umkm-test-harness';
import {
    enrichSaleDraftFromCatalog,
    formatSalePreviewWithCatalog,
    resolveSaleItemsAgainstCatalog,
} from './studio-umkm-product.util';
import { assessSaleSlots, type SaleDraft } from './studio-umkm-confirm.util';

const cfg = DEFAULT_STUDIO_UMKM_CONTEXT;

describe('PO — seller price from catalog + total help', () => {
    it('S1: jual 2 bakso (katalog @18rb) → preview + total 36rb, TIDAK tanya harga', async () => {
        const { svc } = makeUmkmService();
        const r = await svc.handleMessage('jual 2 bakso', 't', '6281', cfg, {
            conversationId: 's1',
        });
        expect(r).toMatch(/Konfirmasi penjualan/i);
        expect(r).toMatch(/36\.000|36000/);
        expect(r).toMatch(/Bakso/i);
        expect(r).not.toMatch(/Harga.*berapa/i);
        expect(r).toMatch(/\*ya\*/i);
    });

    it('S2: jual → bakso → 2 (multi-turn) → preview tanpa tanya harga', async () => {
        const { svc } = makeUmkmService();
        await svc.handleMessage('jual', 't', '6282', cfg, { conversationId: 's2' });
        const mid = await svc.handleMessage('bakso', 't', '6282', cfg, { conversationId: 's2' });
        expect(mid).toMatch(/jumlah|Berapa/i);

        const preview = await svc.handleMessage('2', 't', '6282', cfg, { conversationId: 's2' });
        expect(preview).toMatch(/Konfirmasi penjualan/i);
        expect(preview).toMatch(/36\.000|36000/);
        expect(preview).not.toMatch(/Harga.*berapa/i);
    });

    it('S3: harga di pesan meng-override harga katalog', async () => {
        const { svc } = makeUmkmService();
        // Angka akhir = total transaksi: 2 bakso total 14rb → bukan 36rb katalog
        const asTotal = await svc.handleMessage('jual 2 bakso 14000', 't', '6283', cfg, {
            conversationId: 's3a',
        });
        expect(asTotal).toMatch(/Konfirmasi penjualan/i);
        expect(asTotal).toMatch(/14\.000|14000/);
        expect(asTotal).not.toMatch(/36\.000|36000/);

        // 1 pcs dengan total/harga 14rb → satuan 14rb (override katalog 18rb)
        const asUnit = await svc.handleMessage('jual 1 bakso 14000', 't', '6283b', cfg, {
            conversationId: 's3b',
        });
        expect(asUnit).toMatch(/Konfirmasi penjualan/i);
        expect(asUnit).toMatch(/@.*14\.000|14000/);
        expect(asUnit).not.toMatch(/18\.000|18000/);
        expect(asUnit).not.toMatch(/36\.000|36000/);
    });

    it('S4: barang belum di katalog → tetap tanya harga', async () => {
        const { svc } = makeUmkmService();
        const r = await svc.handleMessage('jual 2 gorengan', 't', '6284', cfg, {
            conversationId: 's4',
        });
        expect(r).toMatch(/Harga|berapa|total/i);
        expect(r).not.toMatch(/Konfirmasi penjualan/i);
    });

    it('S5: produk katalog harga jual 0 → tanya harga', async () => {
        const { svc } = makeUmkmService({
            products: [{ id: 'z1', name: 'Paket Gratis', sku: 'FREE', sellingPrice: 0 }],
        });
        const r = await svc.handleMessage('jual 1 paket gratis', 't', '6285', cfg, {
            conversationId: 's5',
        });
        expect(r).toMatch(/Harga|berapa|total/i);
        expect(r).not.toMatch(/Konfirmasi penjualan/i);
    });

    it('S6: preview menampilkan harga satuan + subtotal + total (bantu penjual)', () => {
        const resolved = resolveSaleItemsAgainstCatalog(
            [{ name: 'bakso', quantity: 2, unitPrice: 0 }],
            TEST_CATALOG,
        );
        const msg = formatSalePreviewWithCatalog({
            totalAmount: 36000,
            items: resolved,
        });
        expect(msg).toMatch(/@/);
        expect(msg).toMatch(/18\.000|18000/);
        expect(msg).toMatch(/36\.000|36000/);
        expect(msg).toMatch(/Total:/i);
    });

    it('S7: jual 3 es teh → total 15rb dari katalog tanpa input harga', async () => {
        const { svc } = makeUmkmService();
        const r = await svc.prepareSaleFromText('jual 3 es teh', 't', '6286', cfg);
        expect(r.kind).toBe('preview');
        if (r.kind !== 'preview') return;
        expect(r.pending.resolved).toHaveLength(1);
        expect(r.pending.resolved[0].unitPrice).toBe(5000);
        expect(r.pending.resolved[0].quantity).toBe(3);
        expect(r.pending.sale.totalAmount).toBe(15000);
        expect(r.message).toMatch(/15\.000|15000/);
        expect(r.message).toMatch(/Total:/i);
    });

    it('unit: enrichSaleDraftFromCatalog mengisi harga & lolos assessSaleSlots', () => {
        const draft: SaleDraft = {
            items: [{ name: 'bakso', quantity: 2, unitPrice: 0 }],
            totalAmount: 0,
        };
        const enriched = enrichSaleDraftFromCatalog(draft, TEST_CATALOG);
        expect(enriched.items[0].unitPrice).toBe(18000);
        expect(enriched.items[0].name).toBe('Bakso');
        expect(enriched.totalAmount).toBe(36000);
        expect(assessSaleSlots(enriched).ok).toBe(true);
    });

    it('unit: enrich tidak menimpa harga yang sudah diisi user', () => {
        const draft: SaleDraft = {
            items: [{ name: 'bakso', quantity: 2, unitPrice: 14000 }],
            totalAmount: 28000,
        };
        const enriched = enrichSaleDraftFromCatalog(draft, TEST_CATALOG);
        expect(enriched.items[0].unitPrice).toBe(14000);
        expect(enriched.totalAmount).toBe(28000);
    });
});
