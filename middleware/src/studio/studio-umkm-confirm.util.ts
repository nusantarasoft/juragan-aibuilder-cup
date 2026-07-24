/**
 * Confirmation / slot-filling helpers for UMKM WhatsApp (human-in-the-loop).
 * Write paths: multi-turn slot fill → preview → ya/batal.
 * Read paths: soft-clarify bare queries, then accept natural follow-ups (no digit menus).
 */

import type { UmkmSaleItemResolved } from './studio-umkm-product.util';
import { detectReportPeriod, type UmkmReportPeriod } from './studio-umkm-ops.util';
import {
    extractRupiahAmounts,
    extractStockProductQuery,
    looksLikeSaleMessage,
    parseRupiahToken,
    parseSaleHeuristic,
    type ParsedUmkmSale,
} from './studio-umkm.util';
import type { UmkmCommandsConfig } from './studio-umkm-commands';

export type SaleSlotId = 'items' | 'name' | 'quantity' | 'unit_price';

export type SaleSlotAssessment = {
    ok: boolean;
    missing: SaleSlotId[];
    clarification: string | null;
};

export type SaleConfirmRisk = {
    hasUnmatchedCatalog: boolean;
    /** True when any line has qty/price that looks incomplete after resolve. */
    hasZeroPriceLine: boolean;
    warningLines: string[];
};

export type ReadClarityAssessment = {
    needsSoftConfirm: boolean;
    question: string | null;
};

export type SaleDraft = {
    items: { name: string; quantity: number; unitPrice: number }[];
    totalAmount: number;
    customerName?: string;
    paymentMethod?: string;
    notes?: string;
};

type SaleLike = {
    items: { name: string; quantity: number; unitPrice: number }[];
    totalAmount?: number;
} | null | undefined;

const SLOT_PRIORITY: SaleSlotId[] = ['items', 'name', 'quantity', 'unit_price'];

export function emptySaleDraft(): SaleDraft {
    return { items: [], totalAmount: 0 };
}

export function saleDraftFromParsed(sale: ParsedUmkmSale | SaleDraft): SaleDraft {
    return {
        items: (sale.items || []).map((i) => ({
            name: String(i.name || '').trim(),
            quantity: Number(i.quantity) || 0,
            unitPrice: Number(i.unitPrice) || 0,
        })),
        totalAmount: Number(sale.totalAmount) || 0,
        customerName: sale.customerName,
        paymentMethod: sale.paymentMethod,
        notes: sale.notes,
    };
}

export function saleDraftToParsed(draft: SaleDraft): ParsedUmkmSale {
    const items = draft.items
        .filter((i) => String(i.name || '').trim())
        .map((i) => ({
            name: String(i.name).trim(),
            quantity: Number(i.quantity) || 0,
            unitPrice: Number(i.unitPrice) || 0,
        }));
    let totalAmount = Number(draft.totalAmount) || 0;
    const lineSum = items.reduce((s, i) => s + i.quantity * Math.max(0, i.unitPrice), 0);
    if (totalAmount <= 0 && lineSum > 0) totalAmount = lineSum;
    if (lineSum <= 0 && totalAmount > 0 && items.length) {
        const qtySum = items.reduce((s, i) => s + Math.max(0, i.quantity), 0) || 1;
        const per = Math.round(totalAmount / qtySum);
        for (const it of items) {
            if (!(it.unitPrice > 0)) it.unitPrice = per;
        }
    }
    return {
        items,
        totalAmount,
        customerName: draft.customerName,
        paymentMethod: draft.paymentMethod,
        notes: draft.notes,
    };
}

/** Validate required sale slots before staging a preview. */
export function assessSaleSlots(sale: SaleLike): SaleSlotAssessment {
    const missing: SaleSlotId[] = [];
    if (!sale || !Array.isArray(sale.items) || sale.items.length === 0) {
        return {
            ok: false,
            missing: ['items'],
            clarification:
                'Mohon sebutkan barang yang dijual. Contoh: *jual 3 kopi 15000* atau *catat 2 bakso total 30000 tunai*.',
        };
    }

    for (const it of sale.items) {
        const name = String(it?.name || '').trim();
        const qty = Number(it?.quantity);
        const price = Number(it?.unitPrice);
        if (!name) missing.push('name');
        if (!Number.isFinite(qty) || qty <= 0) missing.push('quantity');
        if (!Number.isFinite(price) || price < 0) missing.push('unit_price');
    }

    const uniq = [...new Set(missing)];
    if (uniq.length === 0) {
        const lineSum = sale.items.reduce(
            (s, i) => s + Number(i.quantity) * Math.max(0, Number(i.unitPrice)),
            0,
        );
        const total = Number(sale.totalAmount) || 0;
        if (lineSum <= 0 && total <= 0) {
            return {
                ok: false,
                missing: ['unit_price'],
                clarification:
                    'Harga/total belum jelas. Contoh: *jual 3 kopi 15000* atau *jual 2 tas total 50000*.',
            };
        }
        return { ok: true, missing: [], clarification: null };
    }

    const hints: string[] = [];
    if (uniq.includes('name')) hints.push('nama barang');
    if (uniq.includes('quantity')) hints.push('jumlah (qty)');
    if (uniq.includes('unit_price')) hints.push('harga atau total');

    return {
        ok: false,
        missing: uniq,
        clarification: `Data penjualan belum lengkap (${hints.join(', ')}). Contoh: *jual 3 kopi 15000 tunai*.`,
    };
}

export function primaryMissingSlot(missing: SaleSlotId[]): SaleSlotId | null {
    for (const s of SLOT_PRIORITY) {
        if (missing.includes(s)) return s;
    }
    return null;
}

/** One natural-language question at a time — no digit menu. Ack filled slots (human feel). */
export function nextSaleSlotQuestion(assessment: SaleSlotAssessment, draft: SaleDraft): string {
    const slot = primaryMissingSlot(assessment.missing) || 'items';
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
        ask = ['Barang apa yang dijual?', 'Balas nama barangnya saja — contoh: *mie ayam* atau *2 bakso*.'].join(
            '\n',
        );
    } else if (slot === 'quantity') {
        ask = [
            `Berapa jumlah${name ? ` *${name}*` : ''}?`,
            'Balas angkanya saja — contoh: *2* atau *3*.',
        ].join('\n');
    } else {
        ask = [
            `Harga${name ? ` *${name}*` : ''} berapa (atau total)?`,
            'Balas angkanya saja — contoh: *15000* atau *total 30000*.',
        ].join('\n');
    }
    return [ack, ask, cancel].filter(Boolean).join('\n');
}

/**
 * Loose sale draft parser: keeps name/qty even when harga belum ada.
 * Strict complete parse remains in parseSaleHeuristic.
 * Set allowFollowUp for mid-wizard replies (nama/qty/harga singkat).
 */
export function parseSaleDraftHeuristic(
    text: string,
    commands?: UmkmCommandsConfig | unknown,
    options?: { allowFollowUp?: boolean },
): SaleDraft | null {
    const complete = parseSaleHeuristic(text, commands);
    if (complete) return saleDraftFromParsed(complete);

    const raw = text.trim();
    if (!raw) return null;
    const looksSale = looksLikeSaleMessage(raw, commands);
    if (/^(jual|jualan|catat|order)\s*$/i.test(raw)) {
        return emptySaleDraft();
    }

    const looksFollowUp =
        options?.allowFollowUp === true &&
        (/^(?:\d+\s+)?[a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s\-]{1,50}$/i.test(raw) ||
            /^\d+\s*[a-zA-Z\u00C0-\u024F]/i.test(raw) ||
            /^(?:total|harga|bayar)\s*:?\s*/i.test(raw) ||
            /^\d{1,3}(?:[.,]\d{3})*(?:\s*(?:rb|ribu|jt))?$/i.test(raw) ||
            /^\d+$/.test(raw));

    if (!looksSale && !looksFollowUp) return null;

    const paymentMatch = raw.match(/\b(tunai|cash|transfer|qris|debit|kredit|cod)\b/i);
    const paymentMethod = paymentMatch ? paymentMatch[1].toLowerCase() : undefined;

    const amounts = extractRupiahAmounts(raw);
    const items: SaleDraft['items'] = [];

    const itemPatterns = [
        /(\d+)\s+([a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s\-]{1,50}?)(?:\s+@|\s+(?:rp|idr)?\s*[\d.,]+|\s+(?:tunai|transfer|total)|\s*$)/gi,
        /(?:jual|jualan|catat|order)\s+(\d+)\s+([a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s\-]{1,50})/gi,
    ];

    for (const re of itemPatterns) {
        let m: RegExpExecArray | null;
        while ((m = re.exec(raw)) !== null) {
            const qty = parseInt(m[1], 10);
            const name = m[2].trim().replace(/\s+(tunai|transfer|total|bayar).*$/i, '').trim();
            if (!Number.isFinite(qty) || qty <= 0 || name.length < 2 || /^\d+$/.test(name)) continue;
            items.push({ name, quantity: qty, unitPrice: 0 });
        }
    }

    // Same patterns can double-match ("jual 3 es teh") — keep one line
    if (items.length > 1) {
        const seen = new Set<string>();
        const unique = items.filter((it) => {
            const key = `${it.quantity}:${it.name.toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        items.length = 0;
        items.push(...unique);
        if (items.length > 1) {
            const primary = items.reduce((best, it) =>
                it.name.length >= best.name.length ? it : best,
            );
            items.length = 0;
            items.push(primary);
        }
    }

    if (items.length === 0) {
        const nameOnly = raw.match(
            /(?:jual|jualan|catat|order)\s+([a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s\-]{2,50})/i,
        );
        if (nameOnly) {
            const n = nameOnly[1].trim();
            if (!/^(tunai|cash|transfer|qris)$/i.test(n)) {
                items.push({ name: n, quantity: 1, unitPrice: 0 });
            }
        }
    }

    if (items.length === 0 && looksFollowUp && !/^\d+$/.test(raw) && !/(?:total|harga|bayar)/i.test(raw)) {
        const bare = raw
            .replace(/^(?:jual|jualan|catat|order)\s+/i, '')
            .replace(/\b(tunai|cash|transfer|qris)\b/gi, '')
            .trim();
        const qtyName = bare.match(/^(\d+)\s+(.+)$/);
        if (qtyName && qtyName[2].trim().length >= 2) {
            items.push({
                name: qtyName[2].trim(),
                quantity: parseInt(qtyName[1], 10),
                unitPrice: 0,
            });
        } else if (
            bare.length >= 2 &&
            /^[a-zA-Z\u00C0-\u024F]/i.test(bare) &&
            amounts.length === 0 &&
            !/^(jual|jualan|catat|order|halo|hai|thanks|ok)$/i.test(bare)
        ) {
            items.push({ name: bare, quantity: 0, unitPrice: 0 });
        }
    }

    if (items.length === 0 && amounts.length === 0 && !/^\d+$/.test(raw)) {
        // Keyword-only sale intent → empty draft for slot fill
        if (looksSale) return emptySaleDraft();
        return null;
    }

    const totalExplicit = raw.match(
        /(?:total|bayar|harga)\s*:?\s*(?:rp\.?\s*)?([\d][\d.,]*\s*(?:rb|ribu|jt|juta)?)/i,
    );
    let totalAmount = 0;
    if (totalExplicit) {
        const t = parseRupiahToken(totalExplicit[1]);
        /* v8 ignore next -- invalid total token after keyword is rare */
        if (t) totalAmount = t;
    } else if (amounts.length === 1 && items.length) {
        /* v8 ignore next -- usually folded into complete heuristic or totalExplicit */
        totalAmount = amounts[0];
    } else if (amounts.length >= items.length && items.length) {
        /* v8 ignore start -- multi-amount incomplete drafts are rare; complete parse usually wins first */
        for (let i = 0; i < items.length; i++) {
            items[i].unitPrice = amounts[i] || 0;
        }
        totalAmount = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
        /* v8 ignore stop */
    } else if (amounts.length > 0 && items.length === 0) {
        totalAmount = amounts[0];
    }

    if (totalAmount > 0 && items.length && items.every((it) => it.unitPrice === 0)) {
        /* v8 ignore start -- heuristic usually returns complete when total+items present */
        const qtySum = items.reduce((s, it) => s + Math.max(1, it.quantity || 0), 0) || 1;
        const per = Math.round(totalAmount / qtySum);
        for (const it of items) {
            if (!(it.quantity > 0)) it.quantity = 1;
            it.unitPrice = per;
        }
        /* v8 ignore stop */
    }

    return {
        items,
        totalAmount,
        paymentMethod,
    };
}

function parseQtyToken(text: string): number | null {
    const t = text.trim();
    const m =
        t.match(/^(?:qty|jumlah|jml|sebanyak)?\s*:?\s*(\d+)\s*(?:pcs|porsi|buah|x)?$/i) ||
        t.match(/^(\d+)$/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function ensureItem(draft: SaleDraft): SaleDraft {
    const next = saleDraftFromParsed(draft);
    if (!next.items.length) next.items = [{ name: '', quantity: 0, unitPrice: 0 }];
    return next;
}

/** Merge a natural-language reply into the current sale draft (one slot at a time). */
export function applySaleSlotReply(
    draft: SaleDraft,
    text: string,
    commands?: UmkmCommandsConfig | unknown,
): SaleDraft {
    const t = text.trim();
    if (!t) return saleDraftFromParsed(draft);

    // User sent a complete sale in one go
    const complete = parseSaleHeuristic(t, commands);
    if (complete && assessSaleSlots(complete).ok) {
        return saleDraftFromParsed(complete);
    }

    const incoming = parseSaleDraftHeuristic(t, commands, { allowFollowUp: true });
    const current = ensureItem(draft);
    const assessment = assessSaleSlots(
        draft.items.length ? draft : { items: [], totalAmount: 0 },
    );
    const focus = primaryMissingSlot(assessment.missing);

    if (incoming && incoming.items.length) {
        const merged = saleDraftFromParsed(draft.items.length ? draft : emptySaleDraft());
        if (!merged.items.length) merged.items = [{ name: '', quantity: 0, unitPrice: 0 }];
        const src = incoming.items[0];
        const dst = merged.items[0];
        if (src.name) dst.name = src.name;
        if (src.quantity > 0) dst.quantity = src.quantity;
        if (src.unitPrice > 0) dst.unitPrice = src.unitPrice;
        if (incoming.totalAmount > 0) merged.totalAmount = incoming.totalAmount;
        if (incoming.paymentMethod) merged.paymentMethod = incoming.paymentMethod;
        if (incoming.customerName) merged.customerName = incoming.customerName;
        return merged;
    }

    const qty = parseQtyToken(t);
    const amounts = extractRupiahAmounts(t);
    const looksMoney = amounts.length > 0 && amounts[0] >= 1000;
    if (
        qty != null &&
        !looksMoney &&
        (focus === 'quantity' || focus === 'items' || !(Number(current.items[0]?.quantity) > 0))
    ) {
        const merged = ensureItem(current);
        merged.items[0].quantity = qty;
        return merged;
    }

    const asTotal = /(?:total|bayar)\b/i.test(t);
    if (
        amounts.length &&
        (focus === 'unit_price' ||
            asTotal ||
            looksMoney ||
            (!(Number(current.items[0]?.unitPrice) > 0) && !(Number(current.totalAmount) > 0)))
    ) {
        const merged = ensureItem(current);
        if (asTotal) {
            merged.totalAmount = amounts[0];
            const q = Math.max(1, merged.items[0].quantity || 1);
            merged.items[0].unitPrice = Math.round(amounts[0] / q);
        } else {
            // Bare amount while asking for price = unit price (not total)
            merged.items[0].unitPrice = amounts[0];
            if (merged.items[0].quantity > 0) {
                merged.totalAmount = merged.items[0].quantity * amounts[0];
            } else {
                merged.totalAmount = amounts[0];
            }
        }
        return merged;
    }

    if (focus === 'name' || focus === 'items' || !String(current.items[0]?.name || '').trim()) {
        const name = t
            .replace(/^(?:jual|jualan|catat|order)\s+/i, '')
            .replace(/\b(tunai|cash|transfer|qris)\b/gi, '')
            .trim();
        if (
            name.length >= 2 &&
            !/^\d+$/.test(name) &&
            amounts.length === 0 &&
            !/^(jual|jualan|catat|order)$/i.test(name)
        ) {
            const merged = ensureItem(current);
            const qtyName = name.match(/^(\d+)\s+(.+)$/);
            if (qtyName) {
                /* v8 ignore start -- usually caught earlier by allowFollowUp draft parse */
                merged.items[0].quantity = parseInt(qtyName[1], 10);
                merged.items[0].name = qtyName[2].trim();
                /* v8 ignore stop */
            } else {
                merged.items[0].name = name;
            }
            return merged;
        }
    }

    return draft.items.length ? saleDraftFromParsed(draft) : emptySaleDraft();
}

/** Extra confirm emphasis when catalog match / price looks risky. */
export function assessSaleConfirmRisk(items: UmkmSaleItemResolved[]): SaleConfirmRisk {
    const hasUnmatchedCatalog = items.some((i) => !i.catalogMatched);
    const hasZeroPriceLine = items.some((i) => !(Number(i.unitPrice) > 0));
    const warningLines: string[] = [];
    if (hasUnmatchedCatalog) {
        warningLines.push(
            '⚠️ Ada item *belum cocok katalog*. Cek nama & harga di atas sebelum konfirmasi.',
        );
    }
    if (hasZeroPriceLine) {
        warningLines.push('⚠️ Ada item dengan harga 0. Pastikan total sudah benar sebelum simpan.');
    }
    if (hasUnmatchedCatalog || hasZeroPriceLine) {
        warningLines.push('Kalau salah, ketik *batal* lalu kirim ulang dengan format yang lebih jelas.');
    }
    return { hasUnmatchedCatalog, hasZeroPriceLine, warningLines };
}

/** Append risk warnings above the final confirm/cancel line. */
export function appendConfirmRiskToPreview(preview: string, risk: SaleConfirmRisk): string {
    if (!risk.warningLines.length) return preview;
    const lines = preview.split('\n');
    const insertAt = Math.max(0, lines.length - 1);
    return [...lines.slice(0, insertAt), '', ...risk.warningLines, '', lines[lines.length - 1]].join(
        '\n',
    );
}

/**
 * Soft-confirm bare read queries — natural language follow-ups, no digit menus.
 */
export function assessReadQueryClarity(
    kind: 'stock' | 'report',
    text: string,
): ReadClarityAssessment {
    const t = text.trim();
    if (kind === 'stock') {
        const q = extractStockProductQuery(t);
        const bare =
            !q &&
            (/^(cek\s+)?stok\s*$/i.test(t) ||
                /^berapa\s+stok\s*$/i.test(t) ||
                /^sisa\s+stok\s*$/i.test(t) ||
                /^stock\s*$/i.test(t));
        if (bare) {
            return {
                needsSoftConfirm: true,
                question: [
                    'Cek stok yang mana?',
                    'Balas *semua* untuk seluruh barang, atau kirim *nama barang*-nya (contoh: *kopi*).',
                    'Ketik *batal* kalau mau batalkan.',
                ].join('\n'),
            };
        }
        return { needsSoftConfirm: false, question: null };
    }

    const period = detectReportPeriod(t);
    const bareReport =
        !period &&
        (/^(laporan|rekap|omzet|report)(\s+penjualan)?\s*$/i.test(t) ||
            /^(lihat\s+)?(laporan|rekap|omzet)\s*$/i.test(t));
    if (bareReport) {
        return {
            needsSoftConfirm: true,
            question: [
                'Laporan periode mana?',
                'Balas *hari ini*, *minggu ini*, atau *bulan ini*.',
                'Ketik *batal* kalau mau batalkan.',
            ].join('\n'),
        };
    }
    return { needsSoftConfirm: false, question: null };
}

/** Treat "cek stok semua/all" as intentional full listing (skip soft confirm). */
export function isExplicitAllStockQuery(text: string): boolean {
    return /\b(semua|all|seluruh)\b/i.test(text.trim());
}

/** Resolve natural follow-up after soft-confirm stock question. */
export function resolveStockScopeReply(text: string): { kind: 'all' } | { kind: 'product'; query: string } | null {
    const t = text.trim();
    if (!t) return null;
    if (isExplicitAllStockQuery(t) || /^(cek\s+)?stok\s+(semua|all|seluruh)\s*$/i.test(t)) {
        return { kind: 'all' };
    }
    const q = extractStockProductQuery(t);
    if (q) return { kind: 'product', query: q };
    // bare product name
    if (/^[a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s\-]{1,40}$/i.test(t) && !/^(laporan|jual|batal|ya|tidak)$/i.test(t)) {
        return { kind: 'product', query: t };
    }
    return null;
}

/** Resolve natural follow-up after soft-confirm report question. */
export function resolveReportPeriodReply(text: string): UmkmReportPeriod | null {
    const t = text.trim();
    if (!t) return null;
    const fromDetect = detectReportPeriod(t);
    if (fromDetect) return fromDetect;
    if (/^(hari\s*ini|today|hr\s*ini)$/i.test(t)) return 'today';
    if (/^(minggu(\s*ini)?|week)$/i.test(t)) return 'week';
    if (/^(bulan(\s*ini)?|month)$/i.test(t)) return 'month';
    if (/^(semua|all|seluruh)$/i.test(t)) return 'all';
    return null;
}
