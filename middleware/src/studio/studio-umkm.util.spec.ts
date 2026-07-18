import { describe, expect, it } from 'vitest';
import {
    defaultUmkmGuideFlowDefinition,
    validateGuideFlowGraph,
} from './guide-flow.definition';
import {
    detectUmkmConfirmReply,
    detectUmkmIntent,
    detectUmkmMenuDigit,
    extractStockProductQuery,
    formatDailyReportWa,
    formatRecordSaleMenuPrompt,
    formatSaleConfirmation,
    formatSalePreview,
    formatUmkmHelp,
    formatUnknownUmkmCommand,
    generateWaOrderNumber,
    parseRupiahToken,
    parseSaleHeuristic,
    parseSaleJsonFromLlm,
    toAidlcIntent,
} from './studio-umkm.util';
import { resolveUmkmListenTarget } from './guide-flow.interpreter';

describe('studio-umkm.util', () => {
    it('detects record vs report intent', () => {
        expect(detectUmkmIntent('jual 3 kopi 45000')).toBe('record_sale');
        expect(detectUmkmIntent('jual produk kopi 45000')).toBe('record_sale');
        expect(detectUmkmIntent('laporan hari ini')).toBe('sales_report');
        expect(detectUmkmIntent('berapa penjualan hari ini')).toBe('sales_report');
        expect(detectUmkmIntent('ringkasan')).toBe('sales_report');
        expect(detectUmkmIntent('berapa omzet')).toBe('sales_report');
        expect(detectUmkmIntent('daftar barang')).toBe('list_products');
        expect(detectUmkmIntent('list barang')).toBe('list_products');
        expect(detectUmkmIntent('cek stok gula')).toBe('check_stock');
        expect(detectUmkmIntent('stok kopi berapa')).toBe('check_stock');
        expect(detectUmkmIntent('bantuan')).toBe('help');
        expect(detectUmkmIntent('halo')).toBe('unknown');
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
        expect(extractStockProductQuery('stok kopi berapa')).toMatch(/kopi/i);
    });

    it('formats unknown command hint', () => {
        expect(formatUnknownUmkmCommand()).toContain('belum dikenali');
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
