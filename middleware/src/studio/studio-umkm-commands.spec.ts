import { describe, expect, it } from 'vitest';
import {
    buildUmkmCommandMatcher,
    DEFAULT_UMKM_COMMANDS,
    resolveUmkmCommands,
    sanitizeUmkmCommandsInput,
} from './studio-umkm-commands';
import { detectUmkmIntent, formatUmkmHelp } from './studio-umkm.util';
import {
    parseAddProductMessage,
    parseAddStockMessage,
    parsePurchaseHeuristic,
    periodRange,
} from './studio-umkm-ops.util';

describe('studio-umkm-commands', () => {
    it('resolves new default menu', () => {
        const cfg = resolveUmkmCommands(undefined);
        expect(cfg.menu.find((m) => m.digit === '1')?.intent).toBe('ask');
        expect(cfg.menu.find((m) => m.digit === '5')?.intent).toBe('record_sale');
        expect(cfg.menu.find((m) => m.digit === '3')?.intent).toBe('purchase_hub');
    });

    it('detects new intents', () => {
        expect(detectUmkmIntent('tanya')).toBe('ask');
        expect(detectUmkmIntent('tambah menu')).toBe('add_product');
        expect(detectUmkmIntent('tambah belanja')).toBe('record_purchase');
        expect(detectUmkmIntent('daftar penjualan')).toBe('list_sales');
        expect(detectUmkmIntent('jual 2 mie')).toBe('record_sale');
        expect(detectUmkmIntent('1')).toBe('ask');
        expect(detectUmkmIntent('5')).toBe('record_sale');
    });

    it('remaps menu digits', () => {
        const cfg = resolveUmkmCommands({
            menu: [{ digit: '9', intent: 'list_sales', label: 'Jualan' }],
            keywords: DEFAULT_UMKM_COMMANDS.keywords,
            confirm: ['ya'],
            cancel: ['batal'],
        });
        expect(detectUmkmIntent('9', cfg)).toBe('list_sales');
        expect(formatUmkmHelp(cfg)).toContain('*9*');
    });

    it('does not match pesan inside penjualan', () => {
        const m = buildUmkmCommandMatcher(DEFAULT_UMKM_COMMANDS);
        expect(m.intentRegex.get('record_sale')?.test('berapa penjualan hari ini')).toBe(false);
    });

    it('sanitizes duplicate digits', () => {
        const cleaned = sanitizeUmkmCommandsInput({
            menu: [
                { digit: '1', intent: 'ask', label: 'A' },
                { digit: '1', intent: 'help', label: 'B' },
            ],
            keywords: {},
            confirm: ['ya'],
            cancel: ['batal'],
        });
        expect(cleaned.menu.filter((m) => m.digit === '1')).toHaveLength(1);
    });
});

describe('studio-umkm-ops', () => {
    it('parses add product', () => {
        const p = parseAddProductMessage('tambah menu mie ayam 15000');
        expect(p?.name).toMatch(/mie ayam/i);
        expect(p?.sellingPrice).toBe(15000);
    });

    it('parses add stock', () => {
        const s = parseAddStockMessage('tambah stok mie ayam 10');
        expect(s?.productQuery).toMatch(/mie ayam/i);
        expect(s?.quantity).toBe(10);
    });

    it('parses purchase', () => {
        const b = parsePurchaseHeuristic('belanja 10 mie ayam @5000');
        expect(b?.items[0].quantity).toBe(10);
        expect(b?.totalCost).toBe(50000);
    });

    it('builds period ranges', () => {
        expect(periodRange('today').from).toBeTruthy();
        expect(periodRange('all').from).toBeNull();
    });
});
