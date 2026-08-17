/**
 * Unit + PO scenarios for belanja multi-turn slot-fill.
 */
import { describe, expect, it } from 'vitest';
import {
    applyPurchaseSlotReply,
    assessPurchaseSlots,
    emptyPurchaseDraft,
    nextPurchaseSlotQuestion,
    parsePurchaseDraftHeuristic,
    purchaseDraftFromParsed,
} from './studio-umkm-purchase-slots.util';
import { DEFAULT_STUDIO_UMKM_CONTEXT } from './studio-umkm.service';
import { makeUmkmService } from './studio-umkm-test-harness';
import { deserializeWizard, serializeWizardPayload } from './studio-umkm-durable.util';

const cfg = DEFAULT_STUDIO_UMKM_CONTEXT;

describe('purchase slots util', () => {
    it('assess incomplete vs complete', () => {
        expect(assessPurchaseSlots(emptyPurchaseDraft()).missing).toContain('items');
        expect(
            assessPurchaseSlots({
                items: [{ name: 'Bakso', quantity: 2, unitCost: 0 }],
                totalCost: 0,
                purchaseDate: '2026-07-24',
            }).missing,
        ).toContain('unit_cost');
        expect(
            assessPurchaseSlots({
                items: [{ name: 'Bakso', quantity: 2, unitCost: 3000 }],
                totalCost: 6000,
                purchaseDate: '2026-07-24',
            }).ok,
        ).toBe(true);
    });

    it('parse loose qty+name without cost', () => {
        const d = parsePurchaseDraftHeuristic('10 mie ayam');
        expect(d?.items[0]).toMatchObject({ name: /mie ayam/i, quantity: 10, unitCost: 0 });
        expect(assessPurchaseSlots(d!).missing).toContain('unit_cost');
    });

    it('apply replies: name → qty → cost', () => {
        let d = emptyPurchaseDraft();
        d = applyPurchaseSlotReply(d, 'bakso');
        expect(d.items[0].name).toMatch(/bakso/i);
        d = applyPurchaseSlotReply(d, '5');
        expect(d.items[0].quantity).toBe(5);
        d = applyPurchaseSlotReply(d, '3000');
        expect(d.items[0].unitCost).toBe(3000);
        expect(assessPurchaseSlots(d).ok).toBe(true);
    });

    it('next question acknowledges progress', () => {
        const draft = purchaseDraftFromParsed({
            items: [{ name: 'Mie', quantity: 10, unitCost: 0 }],
            totalCost: 0,
            purchaseDate: '2026-07-24',
        });
        const q = nextPurchaseSlotQuestion(assessPurchaseSlots(draft), draft);
        expect(q).toMatch(/Oke — \*10x Mie\*/i);
        expect(q).toMatch(/modal|harga/i);
    });

    it('durable round-trip purchase draft', () => {
        const w = {
            kind: 'await_purchase' as const,
            createdAt: 1,
            draft: {
                items: [{ name: 'Gula', quantity: 2, unitCost: 0 }],
                totalCost: 0,
                purchaseDate: '2026-07-24',
            },
        };
        const payload = serializeWizardPayload(w);
        expect(deserializeWizard('await_purchase', payload, 1)).toEqual(w);
    });

    it('ya does not become a product named ya while waiting for modal', () => {
        // Regression: ISSUE-C11 — Found by /qa on 2026-08-17
        // Report: .gstack/qa-reports/qa-report-umkm-cycle-2026-08-17.md
        let d = purchaseDraftFromParsed({
            items: [{ name: 'teh pucuk cyc', quantity: 5, unitCost: 0 }],
            totalCost: 0,
            purchaseDate: '2026-08-17',
        });
        d = applyPurchaseSlotReply(d, 'ya');
        expect(d.items[0].name).toMatch(/teh pucuk cyc/i);
        expect(d.items[0].quantity).toBe(5);
        expect(d.items[0].unitCost).toBe(0);
        expect(assessPurchaseSlots(d).ok).toBe(false);
    });
});

describe('PO — belanja slot-fill E2E', () => {
    it('belanja → bakso → 5 → 3000 → preview → ya', async () => {
        const { svc } = makeUmkmService();
        const a = await svc.handleMessage('belanja', 't', '7001', cfg, { conversationId: 'ps1' });
        expect(a).toMatch(/Barang apa|Siap catat/i);

        const b = await svc.handleMessage('bakso', 't', '7001', cfg, { conversationId: 'ps1' });
        expect(b).toMatch(/jumlah|Berapa/i);

        const c = await svc.handleMessage('5', 't', '7001', cfg, { conversationId: 'ps1' });
        expect(c).toMatch(/modal|harga/i);

        const d = await svc.handleMessage('3000', 't', '7001', cfg, { conversationId: 'ps1' });
        expect(d).toMatch(/Konfirmasi belanja/i);
        expect(d).toMatch(/15\.000|15000/);

        const e = await svc.handleMessage('ya', 't', '7001', cfg, { conversationId: 'ps1' });
        expect(e).toMatch(/tercatat|BL-/i);
    });

    it('belanja 10 mie ayam @5000 tetap one-shot preview', async () => {
        const { svc } = makeUmkmService();
        const r = await svc.handleMessage('belanja 10 mie ayam @5000', 't', '7002', cfg, {
            conversationId: 'ps2',
        });
        expect(r).toMatch(/Konfirmasi belanja/i);
        expect(r).toMatch(/50\.000|50000/);
    });

    it('beli 5 + belanja then ya keeps asking modal, does not rename item to ya', async () => {
        // Regression: ISSUE-C11 — Found by /qa on 2026-08-17
        // Report: .gstack/qa-reports/qa-report-umkm-cycle-2026-08-17.md
        const { svc } = makeUmkmService();
        const a = await svc.handleMessage('beli 5 bakso', 't', '7003', cfg, { conversationId: 'ps3' });
        expect(a).toMatch(/jual|belanja/i);
        const b = await svc.handleMessage('belanja', 't', '7003', cfg, { conversationId: 'ps3' });
        expect(b).toMatch(/modal|harga/i);
        expect(b).toMatch(/bakso/i);
        const c = await svc.handleMessage('ya', 't', '7003', cfg, { conversationId: 'ps3' });
        expect(c).toMatch(/modal|harga/i);
        expect(c).not.toMatch(/\*5x ya\*/i);
        expect(c).toMatch(/bakso/i);
    });

    it('beli 5 + belanja + 2500 + ya commits purchase (not *5x ya*)', async () => {
        // Live C11 retest 2026-08-17 after 45d681a
        const { svc } = makeUmkmService();
        await svc.handleMessage('beli 5 bakso', 't', '7005', cfg, { conversationId: 'ps5' });
        await svc.handleMessage('belanja', 't', '7005', cfg, { conversationId: 'ps5' });
        const preview = await svc.handleMessage('2500', 't', '7005', cfg, { conversationId: 'ps5' });
        expect(preview).toMatch(/Konfirmasi belanja/i);
        expect(preview).toMatch(/2\.500|2500/);
        expect(preview).toMatch(/12\.500|12500/);
        const done = await svc.handleMessage('ya', 't', '7005', cfg, { conversationId: 'ps5' });
        expect(done).toMatch(/tercatat|BL-/i);
        expect(done).not.toMatch(/\*5x ya\*/i);
    });

    it('purchase slot yields to laporan and omzet instead of eating them as item names', async () => {
        const { svc } = makeUmkmService({
            orders: [
                {
                    order_number: 'WA-1',
                    total_amount: 8000,
                    created_at: new Date().toISOString(),
                    customer_name: 'WA',
                },
            ],
        });
        await svc.handleMessage('beli 5 bakso', 't', '7006', cfg, { conversationId: 'ps6' });
        await svc.handleMessage('belanja', 't', '7006', cfg, { conversationId: 'ps6' });
        const laporan = await svc.handleMessage('laporan hari ini', 't', '7006', cfg, {
            conversationId: 'ps6',
        });
        expect(laporan).toMatch(/Laporan/i);
        expect(laporan).not.toMatch(/Harga modal \*laporan/i);

        await svc.handleMessage('beli 5 bakso', 't', '7007', cfg, { conversationId: 'ps7' });
        await svc.handleMessage('belanja', 't', '7007', cfg, { conversationId: 'ps7' });
        const omzet = await svc.handleMessage('omzet hari ini berapa ya', 't', '7007', cfg, {
            conversationId: 'ps7',
        });
        expect(omzet).toMatch(/Laporan|omzet|Penjualan/i);
        expect(omzet).not.toMatch(/Harga modal \*omzet/i);
    });

    it('purchase slot yields to cek stok instead of eating it as item name', async () => {
        // Regression: ISSUE-C12 — Found by /qa on 2026-08-17
        const { svc } = makeUmkmService();
        await svc.handleMessage('beli 5 bakso', 't', '7004', cfg, { conversationId: 'ps4' });
        await svc.handleMessage('belanja', 't', '7004', cfg, { conversationId: 'ps4' });
        const stock = await svc.handleMessage('cek stok bakso', 't', '7004', cfg, {
            conversationId: 'ps4',
        });
        expect(stock).toMatch(/Cek Stok|Bakso|stok/i);
        expect(stock).not.toMatch(/Harga modal \*cek stok/i);
    });
});
