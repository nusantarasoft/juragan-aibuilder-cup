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
});
