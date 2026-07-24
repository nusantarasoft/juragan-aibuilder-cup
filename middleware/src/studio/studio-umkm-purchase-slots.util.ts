/**
 * Multi-turn purchase (belanja) slot-fill — mirror of sale HITL.
 * Seller enters: barang → jumlah → harga modal → preview → ya.
 */
import {
    jakartaDateParts,
    parsePurchaseHeuristic,
    toIsoDate,
    type ParsedUmkmPurchase,
} from './studio-umkm-ops.util';
import { extractRupiahAmounts, parseRupiahToken } from './studio-umkm.util';

export type PurchaseSlotId = 'items' | 'name' | 'quantity' | 'unit_cost';

export type PurchaseSlotAssessment = {
    ok: boolean;
    missing: PurchaseSlotId[];
    clarification: string | null;
};

export type PurchaseDraft = {
    items: { name: string; quantity: number; unitCost: number }[];
    totalCost: number;
    purchaseDate: string;
    supplierName?: string;
    notes?: string;
};

const SLOT_PRIORITY: PurchaseSlotId[] = ['items', 'name', 'quantity', 'unit_cost'];

export function emptyPurchaseDraft(date?: string): PurchaseDraft {
    const p = jakartaDateParts();
    return {
        items: [],
        totalCost: 0,
        purchaseDate: date || toIsoDate(p.y, p.m, p.day),
    };
}

export function purchaseDraftFromParsed(p: ParsedUmkmPurchase | PurchaseDraft): PurchaseDraft {
    return {
        items: (p.items || []).map((i) => ({
            name: String(i.name || '').trim(),
            quantity: Number(i.quantity) || 0,
            unitCost: Number(i.unitCost) || 0,
        })),
        totalCost: Number(p.totalCost) || 0,
        purchaseDate:
            'purchaseDate' in p && p.purchaseDate
                ? String(p.purchaseDate)
                : emptyPurchaseDraft().purchaseDate,
        supplierName: p.supplierName,
        notes: p.notes,
    };
}

export function purchaseDraftToParsed(draft: PurchaseDraft): ParsedUmkmPurchase {
    const items = draft.items
        .filter((i) => String(i.name || '').trim())
        .map((i) => ({
            name: String(i.name).trim(),
            quantity: Number(i.quantity) || 0,
            unitCost: Number(i.unitCost) || 0,
        }));
    let totalCost = Number(draft.totalCost) || 0;
    const lineSum = items.reduce((s, i) => s + i.quantity * Math.max(0, i.unitCost), 0);
    if (totalCost <= 0 && lineSum > 0) totalCost = lineSum;
    if (lineSum <= 0 && totalCost > 0 && items.length) {
        const qtySum = items.reduce((s, i) => s + Math.max(0, i.quantity), 0) || 1;
        const per = Math.round(totalCost / qtySum);
        for (const it of items) {
            if (!(it.unitCost > 0)) it.unitCost = per;
        }
    }
    return {
        items,
        totalCost,
        purchaseDate: draft.purchaseDate || emptyPurchaseDraft().purchaseDate,
        supplierName: draft.supplierName,
        notes: draft.notes,
    };
}

export function assessPurchaseSlots(purchase: PurchaseDraft | ParsedUmkmPurchase | null | undefined): PurchaseSlotAssessment {
    const missing: PurchaseSlotId[] = [];
    if (!purchase || !Array.isArray(purchase.items) || purchase.items.length === 0) {
        return {
            ok: false,
            missing: ['items'],
            clarification: 'Barang apa yang dibelanjakan?',
        };
    }
    for (const it of purchase.items) {
        const name = String(it?.name || '').trim();
        const qty = Number(it?.quantity);
        const cost = Number(it?.unitCost);
        if (!name) missing.push('name');
        if (!Number.isFinite(qty) || qty <= 0) missing.push('quantity');
        if (!Number.isFinite(cost) || cost <= 0) missing.push('unit_cost');
    }
    const uniq = [...new Set(missing)];
    if (uniq.length === 0) {
        const lineSum = purchase.items.reduce(
            (s, i) => s + Number(i.quantity) * Math.max(0, Number(i.unitCost)),
            0,
        );
        const total = Number(purchase.totalCost) || 0;
        if (lineSum <= 0 && total <= 0) {
            return {
                ok: false,
                missing: ['unit_cost'],
                clarification: 'Harga modal / total belum jelas.',
            };
        }
        return { ok: true, missing: [], clarification: null };
    }
    const hints: string[] = [];
    if (uniq.includes('name')) hints.push('nama barang');
    if (uniq.includes('quantity')) hints.push('jumlah (qty)');
    if (uniq.includes('unit_cost')) hints.push('harga modal atau total');
    return {
        ok: false,
        missing: uniq,
        clarification: `Data belanja belum lengkap (${hints.join(', ')}).`,
    };
}

export function primaryPurchaseMissingSlot(missing: PurchaseSlotId[]): PurchaseSlotId | null {
    for (const s of SLOT_PRIORITY) {
        if (missing.includes(s)) return s;
    }
    return null;
}

export function nextPurchaseSlotQuestion(assessment: PurchaseSlotAssessment, draft: PurchaseDraft): string {
    const slot = primaryPurchaseMissingSlot(assessment.missing) || 'items';
    const name = draft.items.find((i) => String(i.name || '').trim())?.name?.trim();
    const qty = draft.items.find((i) => Number(i.quantity) > 0)?.quantity;
    const cancel = 'Ketik *batal* kalau mau batalkan.';
    const ack =
        name && qty
            ? `Oke — *${qty}x ${name}*.`
            : name
              ? `Oke — *${name}*.`
              : null;

    let ask: string;
    if (slot === 'items' || slot === 'name') {
        ask = [
            'Barang apa yang dibeli?',
            'Balas nama barangnya saja — contoh: *mie ayam* atau *10 bakso*.',
        ].join('\n');
    } else if (slot === 'quantity') {
        ask = [
            `Berapa jumlah${name ? ` *${name}*` : ''}?`,
            'Balas angkanya saja — contoh: *10* atau *5*.',
        ].join('\n');
    } else {
        ask = [
            `Harga modal${name ? ` *${name}*` : ''} berapa (per pcs, atau total)?`,
            'Balas angkanya saja — contoh: *5000* atau *total 50000*.',
        ].join('\n');
    }
    return [ack, ask, cancel].filter(Boolean).join('\n');
}

/** Loose draft: keeps name/qty even when cost belum ada. */
export function parsePurchaseDraftHeuristic(
    text: string,
    options?: { allowFollowUp?: boolean },
): PurchaseDraft | null {
    const complete = parsePurchaseHeuristic(text);
    if (complete && assessPurchaseSlots(complete).ok) {
        return purchaseDraftFromParsed(complete);
    }

    const raw = text.trim();
    if (!raw) return null;
    if (/^(tambah\s+belanja|catat\s+belanja|belanja)\s*$/i.test(raw)) {
        return emptyPurchaseDraft();
    }

    let body = raw.replace(/^(tambah\s+belanja|catat\s+belanja|belanja)\s*/i, '').trim();
    if (!body || /^[0-9]$/.test(body)) {
        if (/belanja/i.test(raw)) return emptyPurchaseDraft();
        return null;
    }

    const looksFollowUp =
        options?.allowFollowUp === true &&
        (/^(?:\d+\s+)?[a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s\-]{1,50}$/i.test(body) ||
            /^\d+\s*[a-zA-Z\u00C0-\u024F]/i.test(body) ||
            /^(?:total|harga|modal|bayar)\s*:?\s*/i.test(body) ||
            /^\d{1,3}(?:[.,]\d{3})*(?:\s*(?:rb|ribu))?$/i.test(body) ||
            /^\d+$/.test(body));

    const draft = emptyPurchaseDraft();
    const amounts = extractRupiahAmounts(body);

    // qty + name (+ optional cost already handled by complete parse)
    const qtyName =
        body.match(
            /^(\d+(?:[.,]\d+)?)\s+([a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s\-]{1,50}?)(?:\s+(?:@|rp\.?\s*)?[\d.,]+(?:\s*rb)?)?\s*$/i,
        ) ||
        body.match(
            /^([a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s\-]{1,50}?)\s+(\d+(?:[.,]\d+)?)(?:\s+(?:@|rp\.?\s*)?[\d.,]+(?:\s*rb)?)?\s*$/i,
        );

    if (qtyName) {
        let qty: number;
        let name: string;
        if (/^\d/.test(qtyName[1])) {
            qty = parseFloat(qtyName[1].replace(',', '.'));
            name = qtyName[2].trim();
        } else {
            name = qtyName[1].trim();
            qty = parseFloat(qtyName[2].replace(',', '.'));
        }
        name = name.replace(/\s+(?:@|rp\.?\s*)?[\d.,]+(?:\s*rb)?$/i, '').trim();
        if (Number.isFinite(qty) && qty > 0 && name.length >= 2) {
            draft.items.push({ name, quantity: qty, unitCost: 0 });
        }
    }

    if (draft.items.length === 0 && looksFollowUp && !/^\d+$/.test(body) && !/(?:total|harga|modal)/i.test(body)) {
        const bare = body.replace(/\b(tunai|cash|transfer)\b/gi, '').trim();
        if (bare.length >= 2 && /^[a-zA-Z\u00C0-\u024F]/i.test(bare) && amounts.length === 0) {
            draft.items.push({ name: bare, quantity: 0, unitCost: 0 });
        }
    }

    if (draft.items.length === 0 && amounts.length === 0 && !/^\d+$/.test(body)) {
        if (/belanja/i.test(raw)) return emptyPurchaseDraft();
        if (looksFollowUp) {
            draft.items.push({ name: body, quantity: 0, unitCost: 0 });
            return draft;
        }
        return null;
    }

    const totalExplicit = body.match(
        /(?:total|bayar|harga|modal)\s*:?\s*(?:rp\.?\s*)?([\d][\d.,]*\s*(?:rb|ribu)?)/i,
    );
    if (totalExplicit) {
        const t = parseRupiahToken(totalExplicit[1]);
        if (t) draft.totalCost = t;
    } else if (amounts.length === 1 && draft.items.length) {
        draft.totalCost = amounts[0];
    }

    if (draft.totalCost > 0 && draft.items.length && draft.items.every((it) => !(it.unitCost > 0))) {
        const qtySum = draft.items.reduce((s, it) => s + Math.max(1, it.quantity || 0), 0) || 1;
        const per = Math.round(draft.totalCost / qtySum);
        for (const it of draft.items) {
            if (!(it.quantity > 0)) it.quantity = 1;
            it.unitCost = per;
        }
    }

    // Bare amount follow-up handled in applyPurchaseSlotReply (qty vs cost by focus)
    if (draft.items.length === 0 && /^\d+$/.test(body) && options?.allowFollowUp) {
        return emptyPurchaseDraft();
    }

    if (draft.items.length === 0 && draft.totalCost <= 0 && !/belanja/i.test(raw)) {
        return looksFollowUp ? draft : null;
    }

    return draft;
}

function ensurePurchaseItem(draft: PurchaseDraft): PurchaseDraft {
    const next = purchaseDraftFromParsed(draft);
    if (!next.items.length) next.items = [{ name: '', quantity: 0, unitCost: 0 }];
    return next;
}

export function applyPurchaseSlotReply(draft: PurchaseDraft, text: string): PurchaseDraft {
    const t = text.trim();
    if (!t) return purchaseDraftFromParsed(draft);

    const complete = parsePurchaseHeuristic(t);
    if (complete && assessPurchaseSlots(complete).ok) {
        return purchaseDraftFromParsed(complete);
    }

    const incoming = parsePurchaseDraftHeuristic(t, { allowFollowUp: true });
    const current = ensurePurchaseItem(draft);
    const assessment = assessPurchaseSlots(draft.items.length ? draft : emptyPurchaseDraft());
    const focus = primaryPurchaseMissingSlot(assessment.missing);

    if (incoming && incoming.items.length) {
        const merged = purchaseDraftFromParsed(draft.items.length ? draft : emptyPurchaseDraft());
        if (!merged.items.length) merged.items = [{ name: '', quantity: 0, unitCost: 0 }];
        const src = incoming.items[0];
        const dst = merged.items[0];
        if (src.name) dst.name = src.name;
        if (src.quantity > 0) dst.quantity = src.quantity;
        if (src.unitCost > 0) dst.unitCost = src.unitCost;
        if (incoming.totalCost > 0) merged.totalCost = incoming.totalCost;
        if (incoming.supplierName) merged.supplierName = incoming.supplierName;
        // Distribute total → unit if still missing cost
        if (merged.totalCost > 0 && dst.unitCost <= 0 && dst.quantity > 0) {
            dst.unitCost = Math.round(merged.totalCost / dst.quantity);
        }
        return merged;
    }

    // Bare qty while asking quantity
    const qtyOnly = t.match(/^(?:qty|jumlah|jml)?\s*:?\s*(\d+)\s*(?:pcs|porsi|buah|x)?$/i);
    if (qtyOnly && (focus === 'quantity' || focus === 'items' || !(current.items[0].quantity > 0))) {
        const n = parseInt(qtyOnly[1], 10);
        if (n > 0) {
            current.items[0].quantity = n;
            return current;
        }
    }

    // Bare amount while asking cost = unit cost (same seller feel as jual)
    const amounts = extractRupiahAmounts(t);
    const bareNum = t.match(/^(?:rp\.?\s*|total\s*|harga\s*|modal\s*)?([\d.,]+(?:\s*rb)?)$/i);
    if (
        (focus === 'unit_cost' ||
            (!(current.items[0].unitCost > 0) && current.items[0].name && current.items[0].quantity > 0)) &&
        (amounts.length >= 1 || bareNum)
    ) {
        let val = amounts[0] || (bareNum ? parseRupiahToken(bareNum[1]) : null);
        if (!val && bareNum) {
            const plain = parseInt(bareNum[1].replace(/\D/g, ''), 10);
            if (Number.isFinite(plain) && plain > 0) val = plain;
        }
        if (val && val > 0) {
            const q = current.items[0].quantity > 0 ? current.items[0].quantity : 1;
            if (/total/i.test(t)) {
                current.items[0].unitCost = Math.round(val / q);
                current.totalCost = val;
            } else {
                current.items[0].unitCost = val;
                current.totalCost = val * q;
            }
            if (!(current.items[0].quantity > 0)) current.items[0].quantity = 1;
            return current;
        }
    }

    // Bare name while asking name
    if (
        (focus === 'name' || focus === 'items' || !current.items[0].name) &&
        /^[a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s\-]{1,50}$/i.test(t) &&
        amounts.length === 0
    ) {
        current.items[0].name = t.trim();
        return current;
    }

    return draft.items.length ? purchaseDraftFromParsed(draft) : emptyPurchaseDraft();
}
