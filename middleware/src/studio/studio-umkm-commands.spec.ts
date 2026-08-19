import { describe, expect, it } from 'vitest';
import {
    buildUmkmCommandMatcher,
    DEFAULT_UMKM_COMMANDS,
    resolveUmkmCommands,
    sanitizeUmkmCommandsInput,
    formatMenuHubPrompt,
    formatMenuHubUnknownChoice,
    formatPurchaseHubPrompt,
    formatPurchaseHubUnknownChoice,
    formatReportHubPrompt,
    formatReportHubUnknownChoice,
    formatWelcomeFromCommands,
    keywordsToRegex,
    exactRepliesToRegex,
    uniqueMenuForDisplay,
    umkmIntentToListenTarget,
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

    it('unions default keywords into a stamped list (empty does not wipe)', () => {
        const cfg = resolveUmkmCommands({
            keywords: { check_stock: ['cek stok lama'], add_stock: [] },
        });
        expect(cfg.keywords.add_stock).toEqual(DEFAULT_UMKM_COMMANDS.keywords.add_stock);
        expect(cfg.keywords.check_stock).toContain('cek stok lama');
        expect(cfg.keywords.check_stock).toContain('cek stok');
    });

    it('keeps custom aliases on top of defaults', () => {
        const cfg = resolveUmkmCommands({
            keywords: { add_stock: ['restok gudang'], check_stock: ['cek stok'] },
        });
        expect(cfg.keywords.add_stock).toContain('restok');
        expect(cfg.keywords.add_stock).toContain('restok gudang');
        expect(cfg.keywords.check_stock).toContain('cek stok');
    });

    it('keeps default ask keywords when the stamp sends an empty list', () => {
        const matcher = buildUmkmCommandMatcher(resolveUmkmCommands({ keywords: { ask: [] } }));
        expect(matcher.intentRegex.has('ask')).toBe(true);
        expect(matcher.intentRegex.get('ask')?.test('tanya dong')).toBe(true);
        expect(matcher.intentRegex.has('record_sale')).toBe(true);
    });

    it('dedupes duplicate menu digits for display', () => {
        const menu = uniqueMenuForDisplay({
            menu: [
                { digit: '1', intent: 'ask', label: 'A' },
                { digit: '1', intent: 'help', label: 'B' },
                { digit: '2', intent: 'help', label: 'C' },
            ],
            keywords: {},
            confirm: [],
            cancel: [],
        });
        expect(menu.map((m) => m.digit)).toEqual(['1', '2']);
    });

    it('maps every intent to a listen target', () => {
        const expected: Record<string, string> = {
            ask: 'do_ask',
            menu_hub: 'do_menu_hub',
            list_products: 'do_list',
            add_product: 'do_add_product',
            add_stock: 'do_add_stock',
            check_stock: 'do_stock',
            purchase_hub: 'do_purchase_hub',
            list_purchases: 'do_list_purchases',
            record_purchase: 'do_record_purchase',
            list_sales: 'do_list_sales',
            record_sale: 'do_record',
            report_hub: 'do_report_hub',
            sales_report: 'do_report',
            help: 'help',
        };
        for (const [intent, target] of Object.entries(expected)) {
            expect(umkmIntentToListenTarget(intent as any)).toBe(target);
        }
    });

    it('normalizes keyword lists: non-array, dedupe, blanks, nullish items', () => {
        const cfg = resolveUmkmCommands({
            keywords: {
                ask: 'not-an-array' as any,
                help: ['Bantuan', 'bantuan', '', '   ', null as any, undefined as any, 'panduan'],
            },
        });
        expect(cfg.keywords.ask).toEqual(DEFAULT_UMKM_COMMANDS.keywords.ask);
        expect(cfg.keywords.help).toContain('bantuan');
        expect(cfg.keywords.help).toContain('panduan');
        expect(cfg.keywords.help).toContain('help');
    });

    it('normalizes menus: non-array yields empty', () => {
        const cfg = resolveUmkmCommands({ menu: 'nope' as any });
        expect(cfg.menu).toEqual([]);
    });

    it('normalizes menu rows: skips invalid rows, digits, intents; defaults label', () => {
        const cfg = resolveUmkmCommands({
            menu: [
                null,
                'string-row',
                { digit: 'x', intent: 'ask', label: 'bad-digit' },
                { digit: '7', intent: 'bogus', label: 'bad-intent' },
                { intent: 'ask', label: 'missing-digit' },
                { digit: '6', label: 'missing-intent' },
                { digit: '8', intent: 'ask' },
                { digit: '9', intent: 'help', label: '   ' },
            ],
            keywords: {},
            confirm: [],
            cancel: [],
        } as any);
        const byDigit = Object.fromEntries(cfg.menu.map((m) => [m.digit, m]));
        expect(cfg.menu.map((m) => m.digit).sort()).toEqual(['8', '9']);
        expect(byDigit['8'].label).toBe('ask'); // label defaulted to intent
        expect(byDigit['9'].label).toBe('help'); // blank label -> intent
    });

    it('unions a partial user list with defaults', () => {
        const cfg = resolveUmkmCommands({ keywords: { ask: ['tanya dong', 'nanya dong'] } });
        expect(cfg.keywords.help).toEqual(DEFAULT_UMKM_COMMANDS.keywords.help);
        expect(cfg.keywords.ask).toContain('tanya');
        expect(cfg.keywords.ask).toContain('nanya dong');
    });

    it('treats non-object config as full defaults', () => {
        expect(resolveUmkmCommands(42)).toEqual(DEFAULT_UMKM_COMMANDS);
    });

    it('applies defaults for sections omitted on an object config', () => {
        const cfg = resolveUmkmCommands({ label: 'noise' } as any);
        expect(cfg.menu).toEqual(DEFAULT_UMKM_COMMANDS.menu);
        expect(cfg.keywords.ask).toEqual(DEFAULT_UMKM_COMMANDS.keywords.ask);
        expect(cfg.confirm).toEqual(DEFAULT_UMKM_COMMANDS.confirm);
        expect(cfg.cancel).toEqual(DEFAULT_UMKM_COMMANDS.cancel);
    });

    it('keywordsToRegex / exactRepliesToRegex return null on empty input', () => {
        expect(keywordsToRegex([])).toBeNull();
        expect(keywordsToRegex(['  '])).toBeNull();
        expect(exactRepliesToRegex([])).toBeNull();
        expect(exactRepliesToRegex(['  '])).toBeNull();
        expect(keywordsToRegex(['jual'])?.test('mau jual')).toBe(true);
        expect(exactRepliesToRegex(['ya'])?.test('ya')).toBe(true);
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

describe('studio-umkm hub prompts', () => {
    it('formats welcome from commands', () => {
        expect(formatWelcomeFromCommands(DEFAULT_UMKM_COMMANDS)).toContain('*Menu*');
    });

    it('formats menu hub prompt and unknown choice', () => {
        expect(formatMenuHubPrompt()).toContain('Menu toko');
        expect(formatMenuHubUnknownChoice()).toContain('tidak dikenali');
        expect(formatMenuHubUnknownChoice()).toContain('Menu toko');
    });

    it('formats purchase hub prompt and unknown choice', () => {
        expect(formatPurchaseHubPrompt()).toContain('Belanja');
        expect(formatPurchaseHubUnknownChoice()).toContain('tidak dikenali');
        expect(formatPurchaseHubUnknownChoice()).toContain('Belanja');
    });

    it('formats report hub prompt and unknown choice', () => {
        expect(formatReportHubPrompt()).toContain('Laporan');
        expect(formatReportHubUnknownChoice()).toContain('tidak dikenali');
        expect(formatReportHubUnknownChoice()).toContain('Laporan');
    });
});

describe('studio-umkm-ops', () => {
    it('parses add product', () => {
        const p = parseAddProductMessage('tambah menu mie ayam 15000');
        expect(p?.name).toMatch(/mie ayam/i);
        expect(p?.sellingPrice).toBe(15000);
        const named = parseAddProductMessage(
            'tambah barang indomie goreng harga jual 3500 modal 3000',
        );
        expect(named?.name.toLowerCase()).toBe('indomie goreng');
        expect(named?.sellingPrice).toBe(3500);
        expect(named?.costPrice).toBe(3000);
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
