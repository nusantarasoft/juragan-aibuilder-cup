import { describe, expect, it } from 'vitest';
import {
    appendConfirmRiskToPreview,
    applySaleSlotReply,
    assessReadQueryClarity,
    assessSaleConfirmRisk,
    assessSaleSlots,
    emptySaleDraft,
    isExplicitAllStockQuery,
    nextSaleSlotQuestion,
    parseSaleDraftHeuristic,
    primaryMissingSlot,
    resolveReportPeriodReply,
    resolveStockScopeReply,
    saleDraftFromParsed,
    saleDraftToParsed,
} from './studio-umkm-confirm.util';
import type { UmkmSaleItemResolved } from './studio-umkm-product.util';
import { DEFAULT_UMKM_COMMANDS } from './studio-umkm-commands';

const cmds = DEFAULT_UMKM_COMMANDS;

describe('assessSaleSlots', () => {
    it('rejects null / empty items', () => {
        expect(assessSaleSlots(null).ok).toBe(false);
        expect(assessSaleSlots(undefined).missing).toEqual(['items']);
        expect(assessSaleSlots({ items: [] }).clarification).toMatch(/barang yang dijual/i);
    });

    it('flags missing name, qty, invalid price', () => {
        const a = assessSaleSlots({
            items: [{ name: '', quantity: 0, unitPrice: -1 }],
        });
        expect(a.ok).toBe(false);
        expect(a.missing).toEqual(expect.arrayContaining(['name', 'quantity', 'unit_price']));
        expect(a.clarification).toMatch(/nama barang/i);
        expect(a.clarification).toMatch(/jumlah/i);
        expect(a.clarification).toMatch(/harga/i);
    });

    it('clarification hints cover single missing slots', () => {
        expect(
            assessSaleSlots({ items: [{ name: '', quantity: 1, unitPrice: 10 }] }).clarification,
        ).toMatch(/nama barang/);
        expect(
            assessSaleSlots({ items: [{ name: 'x', quantity: 0, unitPrice: 10 }] }).clarification,
        ).toMatch(/jumlah/);
        expect(
            assessSaleSlots({ items: [{ name: 'x', quantity: 1, unitPrice: Number.NaN }] }).clarification,
        ).toMatch(/harga/);
    });

    it('treats non-finite qty/price as zero in line sum path', () => {
        const a = assessSaleSlots({
            items: [{ name: 'kopi', quantity: Number.NaN, unitPrice: Number.NaN }],
            totalAmount: 0,
        });
        expect(a.ok).toBe(false);
        expect(a.missing.length).toBeGreaterThan(0);
    });

    it('line sum uses ||0 for falsy numeric strings via Number()', () => {
        const a = assessSaleSlots({
            items: [{ name: 'kopi', quantity: 2, unitPrice: 0 }],
            totalAmount: undefined,
        });
        expect(a.ok).toBe(false);
        expect(a.missing).toEqual(['unit_price']);
    });

    it('rejects zero line sum and zero total', () => {
        const a = assessSaleSlots({
            items: [{ name: 'kopi', quantity: 2, unitPrice: 0 }],
            totalAmount: 0,
        });
        expect(a.ok).toBe(false);
        expect(a.missing).toEqual(['unit_price']);
        expect(a.clarification).toMatch(/Harga\/total/i);
    });

    it('accepts complete lines or total-only pricing', () => {
        expect(
            assessSaleSlots({
                items: [{ name: 'kopi', quantity: 2, unitPrice: 15000 }],
            }).ok,
        ).toBe(true);
        expect(
            assessSaleSlots({
                items: [{ name: 'tas', quantity: 1, unitPrice: 0 }],
                totalAmount: 50000,
            }).ok,
        ).toBe(true);
    });
});

describe('sale draft helpers', () => {
    it('empty + round-trip helpers', () => {
        expect(emptySaleDraft().items).toEqual([]);
        const d = saleDraftFromParsed({
            items: [{ name: 'Kopi', quantity: 2, unitPrice: 15000 }],
            totalAmount: 30000,
            paymentMethod: 'tunai',
        });
        expect(saleDraftToParsed(d).totalAmount).toBe(30000);
        expect(saleDraftToParsed({ items: [{ name: 'x', quantity: 2, unitPrice: 0 }], totalAmount: 20000 }).items[0]
            .unitPrice).toBe(10000);
        expect(saleDraftToParsed({ items: [{ name: 'x', quantity: 1, unitPrice: 5000 }], totalAmount: 0 }).totalAmount).toBe(
            5000,
        );
    });

    it('primaryMissingSlot order', () => {
        expect(primaryMissingSlot(['unit_price', 'name'])).toBe('name');
        expect(primaryMissingSlot(['quantity'])).toBe('quantity');
        expect(primaryMissingSlot([])).toBeNull();
    });

    it('nextSaleSlotQuestion is natural language without digit menus', () => {
        const draft = emptySaleDraft();
        const q1 = nextSaleSlotQuestion(assessSaleSlots(draft), draft);
        expect(q1).toMatch(/Barang apa/i);
        expect(q1).not.toMatch(/\*[1234]\*/);
        const withName = saleDraftFromParsed({
            items: [{ name: 'Bakso', quantity: 0, unitPrice: 0 }],
            totalAmount: 0,
        });
        const q2 = nextSaleSlotQuestion(assessSaleSlots(withName), withName);
        expect(q2).toMatch(/Oke — \*Bakso\*/i);
        expect(q2).toMatch(/jumlah \*Bakso\*/i);
        const needPrice = saleDraftFromParsed({
            items: [{ name: 'Bakso', quantity: 2, unitPrice: 0 }],
            totalAmount: 0,
        });
        const q3 = nextSaleSlotQuestion(assessSaleSlots(needPrice), needPrice);
        expect(q3).toMatch(/Oke — \*2x Bakso\*/i);
        expect(q3).toMatch(/Harga \*Bakso\*/i);
    });
});

describe('parseSaleDraftHeuristic', () => {
    it('keeps incomplete jual 2 kopi (tanpa harga)', () => {
        const d = parseSaleDraftHeuristic('jual 2 kopi', cmds);
        expect(d).toBeTruthy();
        expect(d!.items[0].name.toLowerCase()).toContain('kopi');
        expect(d!.items[0].quantity).toBe(2);
        expect(assessSaleSlots(d!).missing).toContain('unit_price');
    });

    it('name-only jual kopi', () => {
        const d = parseSaleDraftHeuristic('jual kopi', cmds);
        expect(d?.items[0].name.toLowerCase()).toContain('kopi');
    });

    it('keyword-only jual → empty draft', () => {
        expect(parseSaleDraftHeuristic('jual', cmds)?.items).toEqual([]);
        expect(parseSaleDraftHeuristic('jual tunai', cmds)?.items).toEqual([]);
    });

    it('complete still works', () => {
        const d = parseSaleDraftHeuristic('jual 2 bakso 18000', cmds);
        expect(assessSaleSlots(d!).ok).toBe(true);
    });

    it('rejects unrelated text', () => {
        expect(parseSaleDraftHeuristic('halo apa kabar', cmds)).toBeNull();
        expect(parseSaleDraftHeuristic('', cmds)).toBeNull();
        expect(parseSaleDraftHeuristic('asdfgh', cmds, { allowFollowUp: true })).toBeTruthy();
    });

    it('follow-up bare name / qty name / total / digit', () => {
        expect(parseSaleDraftHeuristic('mie ayam', cmds, { allowFollowUp: true })?.items[0].name).toMatch(
            /mie ayam/i,
        );
        expect(parseSaleDraftHeuristic('3 bakso', cmds, { allowFollowUp: true })?.items[0].quantity).toBe(3);
        expect(parseSaleDraftHeuristic('mie ayam', cmds)).toBeNull();
        expect(parseSaleDraftHeuristic('total 25000', cmds, { allowFollowUp: true })?.totalAmount).toBe(25000);
        expect(parseSaleDraftHeuristic('15000', cmds, { allowFollowUp: true })?.totalAmount).toBe(15000);
        expect(parseSaleDraftHeuristic('15rb', cmds, { allowFollowUp: true })?.totalAmount).toBe(15000);
        // qty 0 fails itemPatterns → follow-up qtyName branch
        expect(parseSaleDraftHeuristic('0 bakso', cmds, { allowFollowUp: true })?.items[0].name).toMatch(
            /bakso/i,
        );
    });

    it('incomplete with total keyword fills unit price', () => {
        const d = parseSaleDraftHeuristic('jual 2 abcd total 20000', cmds);
        expect(d).toBeTruthy();
        expect(d!.totalAmount === 20000 || d!.items.some((i) => i.unitPrice > 0)).toBe(true);
        // qty 0 + total → force quantity to 1 when distributing
        const d2 = parseSaleDraftHeuristic('jual xyz total 9000', cmds);
        expect(d2?.items[0]?.unitPrice || d2?.totalAmount).toBeTruthy();
    });
    it('follow-up name+amount hits single-amount draft path', () => {
        const d = parseSaleDraftHeuristic('kopi 15000', cmds, { allowFollowUp: true });
        expect(d).toBeTruthy();
        expect((d!.totalAmount || d!.items[0]?.unitPrice) > 0).toBe(true);
    });
});

describe('applySaleSlotReply multi-turn', () => {
    it('fills name → qty → price step by step', () => {
        let draft = emptySaleDraft();
        draft = applySaleSlotReply(draft, 'bakso', cmds);
        expect(draft.items[0].name.toLowerCase()).toContain('bakso');
        draft = applySaleSlotReply(draft, '2', cmds);
        expect(draft.items[0].quantity).toBe(2);
        draft = applySaleSlotReply(draft, '18000', cmds);
        expect(assessSaleSlots(draft).ok).toBe(true);
        expect(draft.items[0].unitPrice).toBe(18000);
    });

    it('accepts complete one-shot mid-wizard', () => {
        const draft = applySaleSlotReply(emptySaleDraft(), 'jual 1 es teh 5000', cmds);
        expect(assessSaleSlots(draft).ok).toBe(true);
    });

    it('accepts total N as price fill', () => {
        let draft = saleDraftFromParsed({
            items: [{ name: 'Kopi', quantity: 2, unitPrice: 0 }],
            totalAmount: 0,
        });
        draft = applySaleSlotReply(draft, 'total 30000', cmds);
        expect(assessSaleSlots(draft).ok).toBe(true);
        expect(draft.totalAmount).toBe(30000);
    });

    it('price when qty still 0 uses amount as total', () => {
        let draft = saleDraftFromParsed({
            items: [{ name: 'X', quantity: 0, unitPrice: 0 }],
            totalAmount: 0,
        });
        draft = applySaleSlotReply(draft, '12000', cmds);
        expect(draft.items[0].unitPrice).toBe(12000);
        expect(draft.totalAmount).toBe(12000);
    });

    it('name fallback when follow-up parser skips greeting words', () => {
        const draft = applySaleSlotReply(emptySaleDraft(), 'halo', cmds);
        expect(draft.items[0]?.name?.toLowerCase()).toContain('halo');
    });

    it('qty+name fallback via name path', () => {
        // Force name-path: reply that allowFollowUp blocks as product-ish but still has digits+name
        const draft = applySaleSlotReply(
            saleDraftFromParsed({ items: [{ name: '', quantity: 0, unitPrice: 0 }], totalAmount: 0 }),
            '2 es teh manis',
            cmds,
        );
        expect(draft.items[0].quantity).toBe(2);
        expect(draft.items[0].name.toLowerCase()).toMatch(/es teh/i);
    });

    it('empty reply keeps draft', () => {
        const d = saleDraftFromParsed({
            items: [{ name: 'X', quantity: 1, unitPrice: 0 }],
            totalAmount: 0,
        });
        expect(applySaleSlotReply(d, '   ', cmds).items[0].name).toBe('X');
    });

    it('unparsed noise keeps prior draft', () => {
        const d = applySaleSlotReply(emptySaleDraft(), '???', cmds);
        // "???" may be accepted as provisional name; must not invent qty/price
        expect(d.items[0]?.quantity || 0).toBe(0);
        expect(d.items[0]?.unitPrice || 0).toBe(0);
    });

    it('keeps existing draft when reply does not fill focused slot', () => {
        const prior = saleDraftFromParsed({
            items: [{ name: 'Bakso', quantity: 2, unitPrice: 0 }],
            totalAmount: 0,
        });
        const d = applySaleSlotReply(prior, 'x', cmds);
        expect(d.items[0].name).toMatch(/Bakso/i);
        expect(d.items[0].quantity).toBe(2);
    });
});

describe('assessSaleConfirmRisk + appendConfirmRiskToPreview', () => {
    const matched: UmkmSaleItemResolved = {
        name: 'Kopi',
        quantity: 1,
        unitPrice: 10000,
        catalogMatched: true,
    };
    const unmatched: UmkmSaleItemResolved = {
        name: 'X',
        quantity: 1,
        unitPrice: 0,
        catalogMatched: false,
    };

    it('no warnings when clean', () => {
        const risk = assessSaleConfirmRisk([matched]);
        expect(risk.hasUnmatchedCatalog).toBe(false);
        expect(risk.hasZeroPriceLine).toBe(false);
        expect(risk.warningLines).toHaveLength(0);
        expect(appendConfirmRiskToPreview('A\nB\nC', risk)).toBe('A\nB\nC');
    });

    it('warns unmatched and zero price, inserts above last line', () => {
        const risk = assessSaleConfirmRisk([unmatched]);
        expect(risk.hasUnmatchedCatalog).toBe(true);
        expect(risk.hasZeroPriceLine).toBe(true);
        expect(risk.warningLines.length).toBeGreaterThanOrEqual(2);
        const out = appendConfirmRiskToPreview('Header\nTotal\nBenar? Ketik ya', risk);
        expect(out).toContain('belum cocok katalog');
        expect(out).toContain('harga 0');
        expect(out).toMatch(/batal/i);
        expect(out.endsWith('Benar? Ketik ya')).toBe(true);
    });
});

describe('assessReadQueryClarity', () => {
    it('soft-confirms bare stock queries without digit menus', () => {
        for (const t of ['cek stok', 'stok', 'berapa stok', 'sisa stok', 'stock']) {
            const a = assessReadQueryClarity('stock', t);
            expect(a.needsSoftConfirm, t).toBe(true);
            expect(a.question).toMatch(/semua/i);
            expect(a.question).not.toMatch(/\*[1234]\*/);
        }
    });

    it('skips soft-confirm when product named', () => {
        const a = assessReadQueryClarity('stock', 'cek stok kopi');
        expect(a.needsSoftConfirm).toBe(false);
        expect(a.question).toBeNull();
    });

    it('soft-confirms bare report queries without digit menus', () => {
        for (const t of ['laporan', 'rekap', 'omzet', 'report', 'lihat laporan']) {
            const a = assessReadQueryClarity('report', t);
            expect(a.needsSoftConfirm).toBe(true);
            expect(a.question).toMatch(/hari ini/i);
            expect(a.question).not.toMatch(/\*[1234]\*/);
        }
    });

    it('skips soft-confirm when period present', () => {
        const a = assessReadQueryClarity('report', 'laporan hari ini');
        expect(a.needsSoftConfirm).toBe(false);
        expect(a.question).toBeNull();
    });
});

describe('isExplicitAllStockQuery + scope/period replies', () => {
    it('detects semua/all/seluruh', () => {
        expect(isExplicitAllStockQuery('cek stok semua')).toBe(true);
        expect(isExplicitAllStockQuery('stok all')).toBe(true);
        expect(isExplicitAllStockQuery('seluruh stok')).toBe(true);
        expect(isExplicitAllStockQuery('cek stok kopi')).toBe(false);
    });

    it('resolveStockScopeReply', () => {
        expect(resolveStockScopeReply('semua')?.kind).toBe('all');
        expect(resolveStockScopeReply('cek stok semua')?.kind).toBe('all');
        expect(resolveStockScopeReply('kopi')).toEqual({ kind: 'product', query: 'kopi' });
        expect(resolveStockScopeReply('cek stok mie')).toEqual({
            kind: 'product',
            query: expect.stringMatching(/mie/i),
        });
        expect(resolveStockScopeReply('')).toBeNull();
        expect(resolveStockScopeReply('???')).toBeNull();
    });

    it('resolveReportPeriodReply', () => {
        expect(resolveReportPeriodReply('hari ini')).toBe('today');
        expect(resolveReportPeriodReply('minggu ini')).toBe('week');
        expect(resolveReportPeriodReply('bulan')).toBe('month');
        expect(resolveReportPeriodReply('semua')).toBe('all');
        expect(resolveReportPeriodReply('laporan hari ini')).toBe('today');
        expect(resolveReportPeriodReply('xyz')).toBeNull();
        expect(resolveReportPeriodReply('')).toBeNull();
    });
});
