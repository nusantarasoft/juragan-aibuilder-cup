import { describe, expect, it } from 'vitest';
import {
    detectReportPeriod,
    explainAddProductParseFailure,
    explainAddStockParseFailure,
    formatIdrShort,
    generatePurchaseNumber,
    jakartaDateParts,
    parseAddProductMessage,
    parseAddStockMessage,
    parseIndonesianDate,
    parsePurchaseHeuristic,
    periodRange,
    toIsoDate,
} from './studio-umkm-ops.util';

describe('jakartaDateParts / toIsoDate', () => {
    it('extracts y/m/day for a fixed instant', () => {
        // 2026-07-20T18:00:00Z -> 2026-07-21 01:00 in Jakarta (UTC+7)
        const parts = jakartaDateParts(new Date('2026-07-20T18:00:00Z'));
        expect(parts).toEqual({ y: 2026, m: 7, day: 21 });
    });

    it('pads month and day', () => {
        expect(toIsoDate(2026, 3, 5)).toBe('2026-03-05');
        expect(toIsoDate(2026, 12, 31)).toBe('2026-12-31');
    });
});

describe('periodRange', () => {
    const now = new Date('2026-07-15T05:00:00Z'); // Jakarta: 2026-07-15 12:00 (Wednesday)

    it('today', () => {
        const r = periodRange('today', now);
        expect(r.label).toBe('hari ini');
        expect(r.from).toBe('2026-07-15T00:00:00+07:00');
        expect(r.to).toBe('2026-07-15T23:59:59.999+07:00');
    });

    it('month spans first..last day', () => {
        const r = periodRange('month', now);
        expect(r.label).toBe('bulan ini');
        expect(r.from).toBe('2026-07-01T00:00:00+07:00');
        expect(r.to).toBe('2026-07-31T23:59:59.999+07:00');
    });

    it('week is Monday..Sunday', () => {
        const r = periodRange('week', now);
        expect(r.label).toBe('minggu ini');
        // Wed 2026-07-15 -> Monday 2026-07-13 .. Sunday 2026-07-19
        expect(r.from).toBe('2026-07-13T00:00:00+07:00');
        expect(r.to).toBe('2026-07-19T23:59:59.999+07:00');
    });

    it('week handles Sunday (offset 6)', () => {
        const sunday = new Date('2026-07-19T05:00:00Z'); // Jakarta Sunday
        const r = periodRange('week', sunday);
        expect(r.from).toBe('2026-07-13T00:00:00+07:00');
        expect(r.to).toBe('2026-07-19T23:59:59.999+07:00');
    });

    it('all -> null range', () => {
        const r = periodRange('all', now);
        expect(r).toEqual({ label: 'semua waktu', from: null, to: null });
    });

    it('year is calendar YTD Jakarta (parity with Hermes)', () => {
        // Fixture shared with Hermes test_period_rpc.py — 2026-03-15 Jakarta.
        const mid = new Date('2026-03-15T05:00:00Z'); // Jakarta 12:00
        const r = periodRange('year', mid);
        expect(r.label).toBe('tahun ini');
        expect(r.from).toBe('2026-01-01T00:00:00+07:00');
        expect(r.to).toBe('2026-03-15T23:59:59.999+07:00');
    });

    it('last_year is prior calendar year', () => {
        const mid = new Date('2026-10-05T05:00:00Z');
        const r = periodRange('last_year', mid);
        expect(r.label).toBe('tahun lalu');
        expect(r.from).toBe('2025-01-01T00:00:00+07:00');
        expect(r.to).toBe('2025-12-31T23:59:59.999+07:00');
    });

    it('last_3_months from day-1 of month-2', () => {
        const mid = new Date('2026-10-05T05:00:00Z');
        const r = periodRange('last_3_months', mid);
        expect(r.label).toBe('3 bulan terakhir');
        expect(r.from).toBe('2026-08-01T00:00:00+07:00');
        expect(r.to).toBe('2026-10-05T23:59:59.999+07:00');
    });

    it('quarter is current Q start through today', () => {
        const mid = new Date('2026-10-05T05:00:00Z');
        const r = periodRange('quarter', mid);
        expect(r.label).toBe('kuartal 4 2026');
        expect(r.from).toBe('2026-10-01T00:00:00+07:00');
        expect(r.to).toBe('2026-10-05T23:59:59.999+07:00');
    });
});

describe('detectReportPeriod', () => {
    it('today variants', () => {
        expect(detectReportPeriod('1')).toBe('today');
        expect(detectReportPeriod('hari ini')).toBe('today');
        expect(detectReportPeriod('today')).toBe('today');
        expect(detectReportPeriod('laporan hari ini dong')).toBe('today');
    });
    it('week variants', () => {
        expect(detectReportPeriod('2')).toBe('week');
        expect(detectReportPeriod('minggu ini')).toBe('week');
        expect(detectReportPeriod('week')).toBe('week');
    });
    it('month variants', () => {
        expect(detectReportPeriod('3')).toBe('month');
        expect(detectReportPeriod('bulan ini')).toBe('month');
    });
    it('year variants', () => {
        expect(detectReportPeriod('tahun ini')).toBe('year');
        expect(detectReportPeriod('year')).toBe('year');
        expect(detectReportPeriod('laporan tahun ini')).toBe('year');
        expect(detectReportPeriod('ytd')).toBe('year');
    });
    it('last_year / quarter / last_3_months', () => {
        expect(detectReportPeriod('tahun lalu')).toBe('last_year');
        expect(detectReportPeriod('laporan tahun lalu')).toBe('last_year');
        expect(detectReportPeriod('kuartal ini')).toBe('quarter');
        expect(detectReportPeriod('kuartal lalu')).toBe('quarter_last');
        expect(detectReportPeriod('3 bulan terakhir')).toBe('last_3_months');
        expect(detectReportPeriod('tiga bulan terakhir')).toBe('last_3_months');
    });
    it('all variants', () => {
        expect(detectReportPeriod('4')).toBe('all');
        expect(detectReportPeriod('semua')).toBe('all');
        expect(detectReportPeriod('all')).toBe('all');
    });
    it('returns null for unrelated text', () => {
        expect(detectReportPeriod('halo apa kabar')).toBeNull();
    });
});

describe('parseIndonesianDate', () => {
    it('parses ISO', () => {
        expect(parseIndonesianDate('belanja 2026-07-18 gula')).toBe('2026-07-18');
    });
    it('parses d/m/y', () => {
        expect(parseIndonesianDate('18/07/2026')).toBe('2026-07-18');
        expect(parseIndonesianDate('5-3-2026')).toBe('2026-03-05');
    });
    it('parses "hari ini"', () => {
        expect(parseIndonesianDate('hari ini')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    it('returns null otherwise', () => {
        expect(parseIndonesianDate('tanpa tanggal')).toBeNull();
    });
});

describe('parseAddProductMessage', () => {
    it('trailing price after strip prefix', () => {
        expect(parseAddProductMessage('tambah menu mie ayam 15000')).toEqual({
            name: 'mie ayam',
            sellingPrice: 15000,
            costPrice: undefined,
        });
    });
    it('captures modal/cost + rb suffix', () => {
        const r = parseAddProductMessage('bakso modal 10rb 18000');
        expect(r?.name).toBe('bakso');
        expect(r?.sellingPrice).toBe(18000);
        expect(r?.costPrice).toBe(10000);
    });
    it('handles @price form', () => {
        const r = parseAddProductMessage('es teh @5000');
        expect(r).toEqual({ name: 'es teh', sellingPrice: 5000, costPrice: undefined });
    });
    it('leading price form', () => {
        const r = parseAddProductMessage('15000 mie ayam');
        expect(r?.name).toBe('mie ayam');
        expect(r?.sellingPrice).toBe(15000);
    });
    it('name without a price still returns name (price 0)', () => {
        const r = parseAddProductMessage('mie ayam');
        expect(r).toEqual({ name: 'mie ayam', sellingPrice: 0, costPrice: undefined });
    });
    it('returns null for empty or single digit', () => {
        expect(parseAddProductMessage('tambah menu')).toBeNull();
        expect(parseAddProductMessage('tambah menu 5')).toBeNull();
    });
    it('returns null when only a price/number is given', () => {
        expect(parseAddProductMessage('tambah menu 15000')).toBeNull();
    });
    it('strips trailing separators from name', () => {
        const r = parseAddProductMessage('mie ayam - 15000');
        expect(r?.name).toBe('mie ayam');
    });

    it('modal that parses to 0 leaves costPrice undefined', () => {
        const r = parseAddProductMessage('tambah menu bakso modal 0 18000');
        expect(r?.name).toBe('bakso');
        expect(r?.sellingPrice).toBe(18000);
        expect(r?.costPrice).toBeUndefined();
    });

    it('skips the trailing-price branch when the preceding token is weak', () => {
        // "idr" before the price is a weak name, so the trailing-price branch is skipped
        // and no leading-price match applies either -> price stays 0.
        const r = parseAddProductMessage('idr 15000');
        expect(r?.sellingPrice).toBe(0);
        expect(r?.name).toBe('idr 15000');
    });

    it('trailing price of 0 yields sellingPrice 0', () => {
        const r = parseAddProductMessage('mie ayam 0');
        expect(r).toEqual({ name: 'mie ayam', sellingPrice: 0, costPrice: undefined });
    });

    it('leading price of 0 yields sellingPrice 0', () => {
        const r = parseAddProductMessage('0 mie ayam');
        expect(r).toEqual({ name: 'mie ayam', sellingPrice: 0, costPrice: undefined });
    });
});

describe('explainAddProductParseFailure', () => {
    it('empty / single digit -> back to menu', () => {
        expect(explainAddProductParseFailure('')).toContain('kembali ke menu');
        expect(explainAddProductParseFailure('5')).toContain('kembali ke menu');
    });
    it('numbers only hint', () => {
        expect(explainAddProductParseFailure('15000')).toContain('hanya angka');
    });
    it('too short name hint', () => {
        expect(explainAddProductParseFailure('x')).toContain('terlalu pendek');
    });
    it('two numbers is treated as numbers-only', () => {
        expect(explainAddProductParseFailure('10 5000')).toContain('hanya angka');
    });
    it('generic fallback', () => {
        const out = explainAddProductParseFailure('sesuatu yang aneh sekali');
        expect(out).toContain('Belum bisa saya baca');
        expect(out).toContain('kembali ke menu');
    });
});

describe('explainAddStockParseFailure', () => {
    it('empty / single digit', () => {
        expect(explainAddStockParseFailure('')).toContain('kembali ke menu');
        expect(explainAddStockParseFailure('0')).toContain('kembali ke menu');
    });
    it('name without quantity', () => {
        expect(explainAddStockParseFailure('mie ayam')).toContain('tanpa jumlah');
    });
    it('generic fallback for mixed input', () => {
        const out = explainAddStockParseFailure('mie ayam 10 20 30 !!!');
        expect(out).toContain('Belum bisa saya baca');
    });
});

describe('parseAddStockMessage', () => {
    it('quantity at end', () => {
        expect(parseAddStockMessage('tambah stok mie ayam 10')).toEqual({
            productQuery: 'mie ayam',
            quantity: 10,
        });
    });
    it('quantity at start', () => {
        expect(parseAddStockMessage('10 mie ayam')).toEqual({
            productQuery: 'mie ayam',
            quantity: 10,
        });
    });
    it('decimal comma', () => {
        expect(parseAddStockMessage('gula 2,5')).toEqual({ productQuery: 'gula', quantity: 2.5 });
    });
    it('returns null for empty / single digit / no qty', () => {
        expect(parseAddStockMessage('tambah stok')).toBeNull();
        expect(parseAddStockMessage('restok 5')).toBeNull();
        expect(parseAddStockMessage('mie ayam')).toBeNull();
    });
});

describe('parsePurchaseHeuristic', () => {
    it('parses date + multiple items (qty-first)', () => {
        const r = parsePurchaseHeuristic('belanja 2026-07-18 10 mie ayam @5000, 5 bakso 3000');
        expect(r?.purchaseDate).toBe('2026-07-18');
        expect(r?.items.length).toBe(2);
        expect(r?.totalCost).toBe(10 * 5000 + 5 * 3000);
    });
    it('parses name-first item and supplier', () => {
        const r = parsePurchaseHeuristic('tambah belanja gula 2 12000 dari Toko Jaya');
        expect(r?.items[0]).toMatchObject({ name: 'gula', quantity: 2, unitCost: 12000 });
        expect(r?.supplierName).toMatch(/Toko Jaya/i);
    });
    it('defaults date to today when none given', () => {
        const r = parsePurchaseHeuristic('belanja 3 telur 2000');
        expect(r?.purchaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    it('returns null for empty / single digit / no items', () => {
        expect(parsePurchaseHeuristic('')).toBeNull();
        expect(parsePurchaseHeuristic('belanja')).toBeNull();
        expect(parsePurchaseHeuristic('belanja 5')).toBeNull();
        expect(parsePurchaseHeuristic('belanja sesuatu tanpa angka')).toBeNull();
    });
    it('skips zero-quantity items but keeps valid ones', () => {
        const r = parsePurchaseHeuristic('belanja 0 gula 5000, 4 kopi 8000');
        expect(r?.items.length).toBe(1);
        expect(r?.items[0].name).toBe('kopi');
    });

    it('parses item whose unit cost is 0', () => {
        const r = parsePurchaseHeuristic('belanja 3 telur 0');
        expect(r?.items[0]).toMatchObject({ name: 'telur', quantity: 3, unitCost: 0 });
    });

    it('returns null when the message is only separators', () => {
        expect(parsePurchaseHeuristic('belanja ;')).toBeNull();
    });
});

describe('generatePurchaseNumber / formatIdrShort', () => {
    it('purchase number format BL-YYYYMMDD-####', () => {
        const n = generatePurchaseNumber(new Date('2026-07-15T05:00:00Z'));
        expect(n).toMatch(/^BL-20260715-\d{4}$/);
    });
    it('formats IDR', () => {
        expect(formatIdrShort(15000)).toBe('Rp 15.000');
        expect(formatIdrShort(1500.4)).toBe('Rp 1.500');
    });
});
