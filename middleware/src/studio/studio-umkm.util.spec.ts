import { describe, expect, it } from 'vitest';
import {
    defaultUmkmGuideFlowDefinition,
    validateGuideFlowGraph,
} from './guide-flow.definition';
import {
    detectUmkmConfirmReply,
    detectUmkmIntent,
    detectUmkmMenuDigit,
    isUmkmGreetingOnly,
    extractRupiahAmounts,
    extractStockProductQuery,
    formatDailyReportWa,
    formatRecordSaleMenuPrompt,
    formatSaleCancelled,
    formatSaleConfirmation,
    formatSalePreview,
    formatUmkmHelp,
    formatUnknownUmkmCommand,
    generateWaOrderNumber,
    isUmkmMenuOnly,
    looksLikeSaleMessage,
    looksLikeUmkmDirectDataQuery,
    looksLikeUmkmOpenQuestion,
    parsePendingQtyCorrection,
    parseRupiahToken,
    parseSaleHeuristic,
    parseSaleJsonFromLlm,
    resumeJobClarification,
    stripUmkmJobVerbs,
    toAidlcIntent,
    matchUmkmIntakeJob,
    normalizeUmkmQtyFirst,
    formatJobClarificationPrompt,
    formatPendingStickyHint,
    isUmkmIntakeClearJob,
} from './studio-umkm.util';
import type { UmkmCommandsConfig } from './studio-umkm-commands';
import { resolveUmkmListenTarget } from './guide-flow.interpreter';

describe('studio-umkm.util', () => {
    it('detects record vs report intent', () => {
        expect(detectUmkmIntent('jual 3 kopi 45000')).toBe('record_sale');
        expect(detectUmkmIntent('jual produk kopi 45000')).toBe('record_sale');
        expect(detectUmkmIntent('laporan hari ini')).toBe('sales_report');
        expect(detectUmkmIntent('berapa penjualan hari ini')).toBe('sales_report');
        expect(detectUmkmIntent('ringkasan')).toBe('sales_report');
        expect(detectUmkmIntent('berapa omzet')).toBe('sales_report');
        expect(detectUmkmIntent('omzet hari ini')).toBe('sales_report');
        expect(
            detectUmkmIntent('Bagaimana cara menaikkan omzet usaha saya hingga 20%'),
        ).toBe('ask');
        expect(detectUmkmIntent('bagaimana cara meningkatkan omset')).toBe('ask');
        expect(detectUmkmIntent('tips tingkatkan omzet toko')).toBe('ask');
        expect(detectUmkmIntent('daftar barang')).toBe('list_products');
        expect(detectUmkmIntent('list barang')).toBe('list_products');
        expect(detectUmkmIntent('cek stok gula')).toBe('check_stock');
        expect(detectUmkmIntent('stok kopi berapa')).toBe('check_stock');
        expect(detectUmkmIntent('bantuan')).toBe('help');
        expect(detectUmkmIntent('halo')).toBe('unknown');
        expect(isUmkmGreetingOnly('halo')).toBe(true);
        expect(isUmkmGreetingOnly('selamat pagi')).toBe(true);
        expect(isUmkmGreetingOnly('halo jual 1 bakso')).toBe(false);
        expect(isUmkmGreetingOnly('1')).toBe(false);
        expect(isUmkmGreetingOnly('pagi, baru buka toko nih')).toBe(true);
        expect(detectUmkmIntent('bantuan dong, mau catat jualan')).toBe('help');
        expect(detectUmkmIntent('tadi ada yang beli 2 indomie goreng')).toBe('record_sale');
        expect(detectUmkmIntent('kalau stok indomie mau habis, mending restock berapa?')).toBe(
            'ask',
        );
        expect(detectUmkmMenuDigit('2\n[User mengirim media yang tidak dapat diunduh]')).toBe(
            'menu_hub',
        );
        expect(detectUmkmIntent('2\n[User mengirim media yang tidak dapat diunduh]')).toBe(
            'menu_hub',
        );
    });

    it('detects CS-style numbered menu', () => {
        expect(detectUmkmMenuDigit('1')).toBe('ask');
        expect(detectUmkmMenuDigit('5')).toBe('record_sale');
        expect(detectUmkmMenuDigit('6')).toBe('report_hub');
        expect(detectUmkmMenuDigit('12')).toBeNull();
        expect(detectUmkmIntent('1')).toBe('ask');
        expect(detectUmkmIntent('5')).toBe('record_sale');
        expect(formatRecordSaleMenuPrompt()).toMatch(/penjualan/i);
        expect(formatUmkmHelp()).toMatch(/\*1\*/);
    });

    it('detects confirm / cancel replies', () => {
        expect(detectUmkmConfirmReply('ya')).toBe('confirm');
        expect(detectUmkmConfirmReply('batal')).toBe('cancel');
        expect(detectUmkmConfirmReply('1')).toBeNull();
        expect(detectUmkmConfirmReply('0')).toBeNull();
        expect(detectUmkmConfirmReply('jual 2 kopi')).toBeNull();
    });

    it('maps AIDLC intent aliases', () => {
        expect(toAidlcIntent('record_sale')).toBe('catat_transaksi');
        expect(toAidlcIntent('check_stock')).toBe('cek_stok');
        expect(toAidlcIntent('sales_report')).toBe('laporan');
        expect(toAidlcIntent('unknown')).toBe('lainnya');
    });

    it('extracts stock product query', () => {
        expect(extractStockProductQuery('cek stok gula')).toBe('gula');
        expect(extractStockProductQuery('stok indomie goreng masih berapa?')).toMatch(/indomie goreng/i);
    });

    it('formats unknown command hint', () => {
        expect(formatUnknownUmkmCommand()).toMatch(/Belum kebaca|jual 2 indomie/i);
        expect(formatUnknownUmkmCommand()).toMatch(/\*1\*/);
    });

    it('parses rupiah tokens', () => {
        expect(parseRupiahToken('15rb')).toBe(15000);
        expect(parseRupiahToken('2.5jt')).toBe(2500000);
        expect(parseRupiahToken('Rp 45000')).toBe(45000);
    });

    it('parses common sale messages heuristically', () => {
        const a = parseSaleHeuristic('jual 3 es kopi 45000');
        expect(a?.items).toHaveLength(1);
        expect(a?.items[0].quantity).toBe(3);
        expect(a?.totalAmount).toBe(45000);

        const b = parseSaleHeuristic('catat 2 tas total 500rb tunai');
        expect(b?.totalAmount).toBe(500000);
        expect(b?.paymentMethod).toBe('tunai');
    });

    it('parses LLM JSON sale payload', () => {
        const raw = '```json\n{"items":[{"name":"Sabun","quantity":1,"unitPrice":25000}],"totalAmount":25000}\n```';
        const parsed = parseSaleJsonFromLlm(raw);
        expect(parsed?.items[0].name).toBe('Sabun');
        expect(parsed?.totalAmount).toBe(25000);
    });

    it('formats confirmation, preview, and report for WhatsApp', () => {
        const confirm = formatSaleConfirmation({
            orderNumber: 'WA-20260609-120000-1234',
            totalAmount: 45000,
            items: [{ name: 'Es Kopi', quantity: 3, unitPrice: 15000 }],
            paymentMethod: 'tunai',
        });
        expect(confirm).toContain('tercatat');
        expect(confirm).toMatch(/45[.\s]?000/);

        const preview = formatSalePreview({
            totalAmount: 45000,
            items: [{ name: 'Es Kopi', quantity: 3, unitPrice: 15000 }],
        });
        expect(preview).toContain('Konfirmasi');
        expect(preview).toContain('ya');

        const report = formatDailyReportWa({
            salesDate: '2026-06-09',
            orderCount: 5,
            paidOrderCount: 4,
            revenueGross: 1250000,
            revenuePaid: 1000000,
            topProducts: [{ name: 'Kopi Susu', unitsSold: 12, revenue: 180000 }],
            recentOrders: [],
        });
        expect(report).toContain('Laporan Penjualan');
        expect(report).toContain('Kopi Susu');
    });

    it('generates unique WA order numbers', () => {
        const a = generateWaOrderNumber(new Date('2026-06-09T10:00:00Z'));
        expect(a).toMatch(/^WA-20260609-/);
    });
});

// Empty arrays mean "disabled" in resolveUmkmCommands, so these configs exercise fallbacks.
const cfgNoMenu: Partial<UmkmCommandsConfig> = { menu: [] };
const cfgNoMenuNoSaleKw: Partial<UmkmCommandsConfig> = {
    menu: [],
    keywords: { record_sale: [] } as any,
};
const cfgEmpty: Partial<UmkmCommandsConfig> = {
    menu: [],
    keywords: {
        record_sale: [],
        help: [],
        check_stock: [],
        list_products: [],
        sales_report: [],
    } as any,
    confirm: [],
    cancel: [],
};

describe('studio-umkm.util — extra coverage', () => {
    it('isUmkmMenuOnly detects single digits only', () => {
        expect(isUmkmMenuOnly('3')).toBe(true);
        expect(isUmkmMenuOnly('12')).toBe(false);
        expect(isUmkmMenuOnly('halo')).toBe(false);
    });

    it('detectUmkmMenuDigit handles whitespace-only and unmapped digits', () => {
        expect(detectUmkmMenuDigit('   \n  ')).toBeNull();
        expect(detectUmkmMenuDigit('9')).toBeNull(); // 9 not in default menu
    });

    it('toAidlcIntent maps every intent group', () => {
        expect(toAidlcIntent('add_stock')).toBe('cek_stok');
        expect(toAidlcIntent('report_hub')).toBe('laporan');
        expect(toAidlcIntent('list_products')).toBe('tanya_umum');
        expect(toAidlcIntent('ask')).toBe('tanya_umum');
        expect(toAidlcIntent('help')).toBe('tanya_umum');
        expect(toAidlcIntent('menu_hub')).toBe('tanya_umum');
        expect(toAidlcIntent('purchase_hub')).toBe('lainnya');
    });

    it('detectUmkmConfirmReply returns null for punctuation-only text', () => {
        expect(detectUmkmConfirmReply('...')).toBeNull();
    });

    it('detectUmkmIntent returns unknown for blank text', () => {
        expect(detectUmkmIntent('   ')).toBe('unknown');
    });

    it('extractStockProductQuery rejects too-short or stopword queries', () => {
        expect(extractStockProductQuery('cek stok')).toBeNull();
        expect(extractStockProductQuery('stok ada')).toBeNull();
    });

    it('looksLikeUmkmOpenQuestion covers all trigger branches', () => {
        expect(looksLikeUmkmOpenQuestion('kecil')).toBe(false); // too short
        expect(looksLikeUmkmOpenQuestion('tips jualan biar rame')).toBe(true); // tips
        expect(looksLikeUmkmOpenQuestion('cara naikkan penjualan')).toBe(true); // cara naikkan
        expect(looksLikeUmkmOpenQuestion('mau meningkatkan omzet toko saya')).toBe(true); // verb+omzet
        expect(looksLikeUmkmOpenQuestion('barang biasa saja disini')).toBe(false); // no trigger
        expect(looksLikeUmkmOpenQuestion('kalau stok mau habis mending restock berapa')).toBe(true);
        expect(looksLikeUmkmDirectDataQuery('kalau stok mau habis mending restock berapa')).toBe(
            false,
        );
        expect(parsePendingQtyCorrection('salah deh, maksudnya 2')).toBe(2);
        expect(parsePendingQtyCorrection('ya simpan')).toBeNull();
    });

    it('looksLikeUmkmDirectDataQuery covers branches', () => {
        expect(looksLikeUmkmDirectDataQuery('')).toBe(false);
        expect(looksLikeUmkmDirectDataQuery('berapa total penjualan')).toBe(true);
        expect(looksLikeUmkmDirectDataQuery('omzet toko')).toBe(true); // leading omzet
        expect(looksLikeUmkmDirectDataQuery('jual kopi enak')).toBe(false);
    });

    it('looksLikeSaleMessage detects record_sale phrasing', () => {
        expect(looksLikeSaleMessage('jual 2 kopi')).toBe(true);
        expect(looksLikeSaleMessage('halo apa kabar')).toBe(false);
    });
});

describe('parseRupiahToken — edge cases', () => {
    it('returns null for empty/zero/non-numeric', () => {
        expect(parseRupiahToken('rp')).toBeNull();
        expect(parseRupiahToken('0')).toBeNull();
        expect(parseRupiahToken('abc')).toBeNull();
    });
    it('returns null for malformed jt/rb tokens', () => {
        expect(parseRupiahToken('.jt')).toBeNull();
        expect(parseRupiahToken('.rb')).toBeNull();
    });
    it('parses decimal thousands and ribu', () => {
        expect(parseRupiahToken('15.000')).toBe(15000);
        expect(parseRupiahToken('2,5rb')).toBe(2500);
    });
});

describe('extractRupiahAmounts', () => {
    it('extracts suffixed and plain amounts, de-duplicated', () => {
        const amounts = extractRupiahAmounts('total 500rb dan 45000 juga rp 45000');
        expect(amounts).toContain(500000);
        expect(amounts).toContain(45000);
        expect(new Set(amounts).size).toBe(amounts.length);
    });
});

describe('parseSaleHeuristic — branches', () => {
    it('returns null for empty or non-sale text', () => {
        expect(parseSaleHeuristic('')).toBeNull();
        expect(parseSaleHeuristic('halo apa kabar')).toBeNull();
    });

    it('returns null when a sale has no resolvable amount', () => {
        expect(parseSaleHeuristic('jual 2 kopi')).toBeNull();
    });

    it('captures customer + payment and single explicit total', () => {
        const s = parseSaleHeuristic('jual 3 es kopi 45000 tunai pelanggan: Budi');
        expect(s?.paymentMethod).toBe('tunai');
        expect(s?.customerName).toBe('Budi');
        expect(s?.totalAmount).toBe(45000);
    });

    it('picks the longest-named item when the first is longest', () => {
        // "order" is a record_sale keyword (not caught by the jual|jualan|catat pattern), and
        // "tunai" separates the two items so both survive into the primary-item reducer.
        const s = parseSaleHeuristic('order 2 nasi goreng spesial tunai 3 teh 90000');
        expect(s?.items).toHaveLength(1);
        expect(s?.items[0].name).toMatch(/nasi goreng/i);
    });

    it('picks the longest-named item when a later one is longest', () => {
        const s = parseSaleHeuristic('jual 2 teh 3 nasi goreng spesial 90000');
        expect(s?.items).toHaveLength(1);
        expect(s?.items[0].name).toMatch(/nasi goreng/i);
    });

    it('skips zero-quantity items (returns null when nothing left)', () => {
        expect(parseSaleHeuristic('jual 0 kopi 5000')).toBeNull();
    });

    it('returns null when explicit total parses to 0', () => {
        expect(parseSaleHeuristic('jual 2 kopi total 0')).toBeNull();
    });

    it('uses name-only fallback when qty is absent', () => {
        const s = parseSaleHeuristic('jual kopi 20000');
        expect(s?.items[0].quantity).toBe(1);
        expect(s?.totalAmount).toBe(20000);
    });

    it('distributes multiple amounts across an item', () => {
        const s = parseSaleHeuristic('jual 2 kopi rp 15000 rp 20000');
        expect(s?.items[0].unitPrice).toBe(15000);
        expect(s?.totalAmount).toBe(30000);
    });

    it('handles a tiny explicit total that rounds unit price to 0', () => {
        const s = parseSaleHeuristic('jual 3 kopi total 1');
        expect(s?.totalAmount).toBe(1);
        expect(s?.items[0].unitPrice).toBe(0);
    });

    it('truncates long messages into notes', () => {
        const long = 'jual 1 kopi 15000 ' + 'x'.repeat(220);
        const s = parseSaleHeuristic(long);
        expect(s?.notes?.length).toBe(200);
    });
});

describe('parseSaleJsonFromLlm — branches', () => {
    it('parses raw (non-fenced) JSON and recomputes total from items', () => {
        const parsed = parseSaleJsonFromLlm(
            '{"items":[{"name":"Teh","quantity":2,"unitPrice":5000}]}',
        );
        expect(parsed?.totalAmount).toBe(10000);
    });

    it('returns null when there are no braces', () => {
        expect(parseSaleJsonFromLlm('tidak ada json')).toBeNull();
    });

    it('returns null for malformed JSON', () => {
        expect(parseSaleJsonFromLlm('{ items: [ }')).toBeNull();
    });

    it('returns null when items are empty or total non-positive', () => {
        expect(parseSaleJsonFromLlm('{"items":[],"totalAmount":0}')).toBeNull();
        expect(parseSaleJsonFromLlm('{"items":[{"name":""}],"totalAmount":0}')).toBeNull();
    });

    it('returns null when the items key is missing entirely', () => {
        expect(parseSaleJsonFromLlm('{"totalAmount":100}')).toBeNull();
    });

    it('applies defaults and derives per-item price when unitPrice is 0', () => {
        const parsed = parseSaleJsonFromLlm(
            '{"items":[{"name":"Nasi"}],"totalAmount":12000,"customerName":"Ani","paymentMethod":"qris","notes":"catatan"}',
        );
        expect(parsed?.items[0].quantity).toBe(1);
        expect(parsed?.items[0].unitPrice).toBe(12000);
        expect(parsed?.customerName).toBe('Ani');
        expect(parsed?.paymentMethod).toBe('qris');
        expect(parsed?.notes).toBe('catatan');
    });

    it('omits optional fields when absent', () => {
        const parsed = parseSaleJsonFromLlm(
            '{"items":[{"name":"Roti","quantity":1,"unitPrice":8000}],"totalAmount":8000}',
        );
        expect(parsed?.customerName).toBeUndefined();
        expect(parsed?.paymentMethod).toBeUndefined();
        expect(parsed?.notes).toBeUndefined();
    });
});

describe('format functions — fallback branches via empty configs', () => {
    it('formatSaleConfirmation without items or payment', () => {
        const msg = formatSaleConfirmation({ orderNumber: 'X', totalAmount: 0, items: [] });
        expect(msg).not.toContain('Item:');
        expect(msg).not.toContain('Pembayaran');
    });

    it('formatSalePreview without items but with payment + customer (empty config hints)', () => {
        const msg = formatSalePreview(
            { totalAmount: 1000, items: [], paymentMethod: 'tunai', customerName: 'Sri' },
            cfgEmpty,
        );
        expect(msg).toContain('*ya*');
        expect(msg).toContain('*batal*');
        expect(msg).toContain('Pembayaran: tunai');
        expect(msg).toContain('Pelanggan: Sri');
        expect(msg).not.toContain('Item:');
    });

    it('formatSaleCancelled with and without menu digits', () => {
        expect(formatSaleCancelled()).toContain('dibatalkan'); // default: digits present
        const noMenu = formatSaleCancelled(cfgNoMenu); // digits absent
        expect(noMenu).toContain('dibatalkan');
        const empty = formatSaleCancelled(cfgEmpty); // keyword fallbacks 'jual'/'bantuan'
        expect(empty).toContain('jual');
        expect(empty).toContain('bantuan');
    });

    it('formatRecordSaleMenuPrompt with empty config falls back to defaults', () => {
        const msg = formatRecordSaleMenuPrompt(cfgEmpty);
        expect(msg).toContain('jual');
        expect(msg).toContain('*ya*');
        expect(msg).toContain('*batal*');
        expect(msg).not.toContain('kembali ke menu'); // no help digit
    });

    it('formatUnknownUmkmCommand with empty menu lists keyword hints', () => {
        const withKw = formatUnknownUmkmCommand(cfgNoMenu); // menu empty, default keywords present
        expect(withKw).toContain('•');
        const noKw = formatUnknownUmkmCommand(cfgNoMenuNoSaleKw); // some keyword lists empty
        expect(noKw).toMatch(/Belum kebaca|jual 2 indomie/i);
    });

    it('formatUmkmHelp with empty menu + empty keyword lists', () => {
        const msg = formatUmkmHelp(cfgEmpty);
        expect(msg).toContain('jual 2 indomie');
        expect(msg).toContain('*ya*');
        expect(msg).toContain('*batal*');
    });

    it('formatDailyReportWa with empty top products but recent orders', () => {
        const msg = formatDailyReportWa({
            salesDate: '2026-07-01',
            orderCount: 2,
            paidOrderCount: 1,
            revenueGross: 50000,
            revenuePaid: 25000,
            topProducts: [],
            recentOrders: [
                { orderNumber: 'A1', customerName: 'Doni', totalAmount: 25000, createdAt: 'now' },
                { orderNumber: 'A2', customerName: null, totalAmount: 25000, createdAt: 'now' },
            ],
        });
        expect(msg).toContain('Order terbaru');
        expect(msg).toContain('Doni');
        expect(msg).toContain('Pelanggan'); // null customer -> 'Pelanggan'
        expect(msg).not.toContain('terlaris');
    });
});

describe('defaultUmkmGuideFlowDefinition', () => {
    it('is a valid guide flow graph', () => {
        const def = defaultUmkmGuideFlowDefinition();
        validateGuideFlowGraph(def);
        expect(def.nodes.some((n) => n.type === 'action' && n.action === 'record_sale')).toBe(true);
        expect(def.nodes.some((n) => n.type === 'action' && n.action === 'confirm_sale')).toBe(true);
        expect(def.nodes.some((n) => n.type === 'action' && n.action === 'check_stock')).toBe(true);
    });

    it('routes unknown text to help via intent resolver', () => {
        const def = defaultUmkmGuideFlowDefinition();
        const listen = def.nodes.find((n) => n.id === 'listen_intent');
        expect(listen?.type).toBe('listen');
        if (listen?.type !== 'listen') return;
        expect(resolveUmkmListenTarget(listen, 'halo')).toBe('do_ask');
        expect(resolveUmkmListenTarget(listen, 'list barang')).toBe('do_list');
        expect(resolveUmkmListenTarget(listen, 'jual 2 kopi 30000')).toBe('do_record');
        expect(resolveUmkmListenTarget(listen, '1')).toBe('do_ask');
        expect(resolveUmkmListenTarget(listen, '5')).toBe('do_record');
        expect(resolveUmkmListenTarget(listen, 'tambah belanja')).toBe('do_record_purchase');
        expect(resolveUmkmListenTarget(listen, 'ya', { hasPendingSale: true })).toBe('do_confirm');
        expect(resolveUmkmListenTarget(listen, 'batal', { hasPendingSale: true })).toBe('do_cancel');
        expect(def.nodes.some((n) => n.id === 'do_ask' && n.type === 'rag')).toBe(true);    });
});

describe('matchUmkmIntakeJob (D4.1)', () => {
    it('clarifies muddy qty+name as sale vs add_stock', () => {
        expect(matchUmkmIntakeJob('indomie 2')).toEqual({
            kind: 'mixed',
            candidates: ['sale', 'add_stock'],
            originalText: 'indomie 2',
        });
        expect(matchUmkmIntakeJob('mie ayam 2 porsi').kind).toBe('mixed');
    });

    it('clarifies beli+qty+name as sale vs purchase', () => {
        expect(matchUmkmIntakeJob('beli 10 indomie')).toEqual({
            kind: 'mixed',
            candidates: ['sale', 'purchase'],
            originalText: 'beli 10 indomie',
        });
    });

    it('clarifies stock+sale verbs without qty as sale vs check_stock', () => {
        expect(matchUmkmIntakeJob('stok atau jual indomie')).toEqual({
            kind: 'mixed',
            candidates: ['sale', 'check_stock'],
            originalText: 'stok atau jual indomie',
        });
    });

    it('does not clarify customer-sale, belanja, price, hostile singles', () => {
        expect(matchUmkmIntakeJob('tadi ada yang beli 2 indomie goreng').kind).toBe('none');
        expect(matchUmkmIntakeJob('belanja 10 indomie').kind).toBe('none');
        expect(matchUmkmIntakeJob('kopi 15000').kind).toBe('none');
        expect(matchUmkmIntakeJob('2').kind).toBe('none');
        expect(matchUmkmIntakeJob('indomie').kind).toBe('none');
        expect(matchUmkmIntakeJob('pembelian 10').kind).toBe('none');
        expect(matchUmkmIntakeJob('pembelian 10 indomie').kind).toBe('none');
    });

    it('bare catat/jual is empty sale, not mixed', () => {
        expect(matchUmkmIntakeJob('catat')).toEqual({ kind: 'empty_sale' });
        expect(matchUmkmIntakeJob('jual')).toEqual({ kind: 'empty_sale' });
    });

    it('resumeJobClarification maps aliases and skips matcher', () => {
        expect(resumeJobClarification('jual', ['sale', 'add_stock'])).toEqual({
            action: 'forced',
            intent: 'sale',
        });
        expect(resumeJobClarification('tambah stok', ['sale', 'add_stock'])).toEqual({
            action: 'forced',
            intent: 'add_stock',
        });
        expect(resumeJobClarification('belanja', ['sale', 'purchase'])).toEqual({
            action: 'forced',
            intent: 'purchase',
        });
        expect(resumeJobClarification('cek stok', ['sale', 'check_stock'])).toEqual({
            action: 'forced',
            intent: 'check_stock',
        });
        expect(resumeJobClarification('stok', ['sale', 'check_stock'])).toEqual({
            action: 'forced',
            intent: 'check_stock',
        });
        expect(resumeJobClarification('stok', ['sale', 'add_stock']).action).toBe('none');
        expect(resumeJobClarification('ya', ['sale', 'add_stock']).action).toBe('none');
    });

    it('qty-first normalize + strip verbs', () => {
        expect(normalizeUmkmQtyFirst('indomie 2')).toBe('2 indomie');
        expect(normalizeUmkmQtyFirst('2 indomie')).toBe('2 indomie');
        expect(stripUmkmJobVerbs('beli 10 indomie')).toBe('10 indomie');
    });

    it('clarify copy lists accepted aliases; pending hint has no kirim ulang jual', () => {
        const prompt = formatJobClarificationPrompt(['sale', 'add_stock']);
        expect(prompt).toMatch(/jual/);
        expect(prompt).toMatch(/tambah stok/);
        expect(prompt).not.toMatch(/cek stok/);
        const hint = formatPendingStickyHint('sale');
        expect(hint).not.toMatch(/kirim ulang/);
        expect(hint).toMatch(/batal/);
        expect(isUmkmIntakeClearJob('cek stok')).toBe(true);
        expect(isUmkmIntakeClearJob('indomie 2')).toBe(false);
        expect(isUmkmIntakeClearJob('jual 2 indomie')).toBe(true);
    });
});
