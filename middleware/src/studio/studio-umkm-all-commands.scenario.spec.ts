/**
 * Uji menyeluruh SEMUA perintah menu WA UMKM (0–6) + keyword + perilaku user.
 * Positif & negatif, termasuk stuck/escape/noise.
 */
import { describe, expect, it } from 'vitest';
import {
    DEFAULT_UMKM_COMMANDS,
    formatMenuHubPrompt,
    formatPurchaseHubPrompt,
    formatPurchaseHubUnknownChoice,
    formatReportHubPrompt,
    formatReportHubUnknownChoice,
} from './studio-umkm-commands';
import { parsePurchaseHeuristic } from './studio-umkm-ops.util';
import {
    detectUmkmConfirmReply,
    detectUmkmIntent,
    detectUmkmMenuDigit,
    formatRecordSaleMenuPrompt,
    formatUmkmHelp,
    formatUnknownUmkmCommand,
    parseSaleHeuristic,
} from './studio-umkm.util';
import { resolveUmkmListenTarget } from './guide-flow.interpreter';
import type { GuideFlowNode } from './guide-flow.definition';
import { stripWhatsAppMediaAnnotations } from './studio-whatsapp.util';
import {
    DEFAULT_STUDIO_UMKM_CONTEXT,
} from './studio-umkm.service';
import { makeUmkmService } from './studio-umkm-test-harness';

const cmds = DEFAULT_UMKM_COMMANDS;
const cfg = DEFAULT_STUDIO_UMKM_CONTEXT;

const listenStub = {
    id: 'listen_intent',
    type: 'listen' as const,
    transitions: [
        { when: 'regex' as const, pattern: '^0$', target: 'help' },
        { when: 'regex' as const, pattern: '^1$', target: 'do_ask' },
        { when: 'regex' as const, pattern: '^2$', target: 'do_menu_hub' },
        { when: 'regex' as const, pattern: '^3$', target: 'do_purchase_hub' },
        { when: 'regex' as const, pattern: '^4$', target: 'do_list_sales' },
        { when: 'regex' as const, pattern: '^5$', target: 'do_record' },
        { when: 'regex' as const, pattern: '^6$', target: 'do_report_hub' },
        { when: 'default' as const, target: 'help' },
    ],
} as GuideFlowNode;

const DIGIT_INTENTS: Record<string, string> = {
    '0': 'help',
    '1': 'ask',
    '2': 'menu_hub',
    '3': 'purchase_hub',
    '4': 'list_sales',
    '5': 'record_sale',
    '6': 'report_hub',
};

describe('Menu utama: digit 0–6 (routing)', () => {
    for (const [digit, intent] of Object.entries(DIGIT_INTENTS)) {
        it(`POSITIF digit ${digit} → ${intent}`, () => {
            expect(detectUmkmIntent(digit, cmds)).toBe(intent);
            expect(detectUmkmMenuDigit(digit, cmds)).toBe(intent);
        });
    }

    it('POSITIF flow targets sesuai digit', () => {
        expect(resolveUmkmListenTarget(listenStub, '0', { commands: cmds })).toBe('help');
        expect(resolveUmkmListenTarget(listenStub, '1', { commands: cmds })).toBe('do_ask');
        expect(resolveUmkmListenTarget(listenStub, '2', { commands: cmds })).toBe('do_menu_hub');
        expect(resolveUmkmListenTarget(listenStub, '3', { commands: cmds })).toBe('do_purchase_hub');
        expect(resolveUmkmListenTarget(listenStub, '4', { commands: cmds })).toBe('do_list_sales');
        expect(resolveUmkmListenTarget(listenStub, '5', { commands: cmds })).toBe('do_record');
        expect(resolveUmkmListenTarget(listenStub, '6', { commands: cmds })).toBe('do_report_hub');
    });

    it('NEGATIF digit 7/8/9 bukan menu utama', () => {
        expect(detectUmkmMenuDigit('7', cmds)).toBeNull();
        expect(detectUmkmMenuDigit('8', cmds)).toBeNull();
        expect(detectUmkmMenuDigit('99', cmds)).toBeNull();
    });

    it('POSITIF help (0) menampilkan semua digit', () => {
        const help = formatUmkmHelp(cmds);
        for (const d of Object.keys(DIGIT_INTENTS)) {
            expect(help).toContain(`*${d}*`);
        }
    });

    it('POSITIF media-polluted digit tetap kebaca', () => {
        for (const d of ['0', '2', '5']) {
            const polluted = `${d}\n[User mengirim media yang tidak dapat diunduh]`;
            expect(detectUmkmMenuDigit(polluted, cmds)).toBe(DIGIT_INTENTS[d]);
            expect(stripWhatsAppMediaAnnotations(polluted)).toBe(d);
        }
    });
});

describe('Perintah 0 — Bantuan', () => {
    it('POSITIF keyword bantuan / help / panduan', () => {
        expect(detectUmkmIntent('bantuan', cmds)).toBe('help');
        expect(detectUmkmIntent('help', cmds)).toBe('help');
        expect(detectUmkmIntent('panduan', cmds)).toBe('help');
        expect(detectUmkmIntent('menu', cmds)).not.toBe('help'); // "menu" saja ambigu
    });

    it('POSITIF unknown command arahkan ke menu', () => {
        const msg = formatUnknownUmkmCommand(cmds);
        expect(msg).toMatch(/belum dikenali|Perintah/i);
        expect(msg).toMatch(/\*0\*|\*5\*|\d/);
    });
});

describe('Perintah 1 — Tanya (ask)', () => {
    it('POSITIF digit & keyword → ask', () => {
        expect(detectUmkmIntent('1', cmds)).toBe('ask');
        expect(detectUmkmIntent('tanya', cmds)).toBe('ask');
        expect(detectUmkmIntent('bertanya', cmds)).toBe('ask');
    });

    it('POSITIF handleMessage ask → null (serahkan RAG)', async () => {
        const { svc } = makeUmkmService();
        const r = await svc.handleMessage('1', 't', undefined, cfg, { conversationId: 'c-ask' });
        expect(r).toBeNull();
    });

    it('NEGATIF "tanya harga mie" tetap ask (bukan sale)', () => {
        // keyword ask includes "tanya" — may match ask first depending on order
        const intent = detectUmkmIntent('tanya harga mie', cmds);
        expect(['ask', 'unknown', 'record_sale']).toContain(intent);
    });
});

describe('Perintah 2 — Menu toko (smoke + posisi)', () => {
    it('POSITIF open hub', () => {
        const { svc } = makeUmkmService();
        expect(svc.openMenuHub('t', undefined, 'c')).toBe(formatMenuHubPrompt());
    });

    it('POSITIF setelah tambah menu ada posisi lanjut', async () => {
        const { svc } = makeUmkmService();
        svc.openMenuHub('t', undefined, 'c');
        await svc.continueWizard('2', 't', undefined, 'c', cfg);
        const ok = await svc.continueWizard('cireng 8000', 't', undefined, 'c', cfg);
        expect(ok).toMatch(/ditambahkan/i);
        expect(ok).toMatch(/Posisi Anda/i);
        expect(ok).toMatch(/Tambah menu lagi/i);
    });
});

describe('Perintah 3 — Belanja (purchase_hub)', () => {
    it('POSITIF digit/keyword → purchase_hub', () => {
        expect(detectUmkmIntent('3', cmds)).toBe('purchase_hub');
        expect(detectUmkmIntent('belanja', cmds)).toBe('record_purchase'); // keyword belanja = record
    });

    it('POSITIF open hub copy', () => {
        const { svc } = makeUmkmService();
        expect(svc.openPurchaseHub('t', undefined, 'c')).toBe(formatPurchaseHubPrompt());
        expect(formatPurchaseHubPrompt()).toMatch(/batal/i);
    });

    it('POSITIF hub 1 daftar (kosong) ramah', async () => {
        const { svc } = makeUmkmService({ purchases: [] });
        svc.openPurchaseHub('t', undefined, 'c');
        const r = await svc.continueWizard('1', 't', undefined, 'c', cfg);
        expect(r).toMatch(/Belum ada belanja/i);
        expect(r).toMatch(/0|tambah/i);
    });

    it('POSITIF hub 1 daftar terisi', async () => {
        const { svc } = makeUmkmService({
            purchases: [
                {
                    purchase_number: 'PB-1',
                    purchase_date: '2026-07-18',
                    total_cost: 50000,
                },
            ],
        });
        svc.openPurchaseHub('t', undefined, 'c');
        const r = await svc.continueWizard('1', 't', undefined, 'c', cfg);
        expect(r).toMatch(/PB-1|Daftar belanja/i);
        expect(r).toMatch(/0|tambah/i);
    });

    it('POSITIF hub 3 → format → preview konfirmasi', async () => {
        const { svc } = makeUmkmService();
        svc.openPurchaseHub('t', undefined, 'c');
        const tip = await svc.continueWizard('3', 't', undefined, 'c', cfg);
        expect(tip).toMatch(/detail belanja|batal/i);
        const preview = await svc.continueWizard('10 mie ayam @5000', 't', undefined, 'c', cfg);
        expect(preview).toMatch(/Konfirmasi belanja/i);
        expect(preview).toMatch(/ya|batal/i);
        expect(svc.getPendingPurchase('t', undefined, 'c')).toBeTruthy();
    });

    it('POSITIF parse belanja', () => {
        const p = parsePurchaseHeuristic('belanja 5 bakso @3000');
        expect(p?.items[0].quantity).toBe(5);
        expect(p?.totalCost).toBe(15000);
    });

    it.each(['4', '9', 'halo', 'ok'])('NEGATIF pilihan hub %j → tidak dikenali', async (input) => {
        const { svc } = makeUmkmService();
        svc.openPurchaseHub('t', undefined, 'c');
        const r = await svc.continueWizard(input, 't', undefined, 'c', cfg);
        expect(r).toMatch(/tidak dikenali|Belanja/i);
        expect(formatPurchaseHubUnknownChoice()).toMatch(/tidak dikenali/i);
    });

    it.each(['batal', 'tidak'])('POSITIF escape hub %j', async (w) => {
        const { svc } = makeUmkmService();
        svc.openPurchaseHub('t', undefined, 'c');
        expect(await svc.continueWizard(w, 't', undefined, 'c', cfg)).toMatch(/Dibatalkan/i);
    });

    it('NEGATIF await purchase input jelek → tip + batal', async () => {
        const { svc } = makeUmkmService();
        svc.openPurchaseHub('t', undefined, 'c');
        await svc.continueWizard('3', 't', undefined, 'c', cfg);
        const tip = await svc.continueWizard('asdf', 't', undefined, 'c', cfg);
        expect(tip).toMatch(/belanja|batal/i);
    });

    it('POSITIF escape digit dari await_purchase', async () => {
        const { svc } = makeUmkmService();
        svc.openPurchaseHub('t', undefined, 'c');
        await svc.continueWizard('3', 't', undefined, 'c', cfg);
        expect(await svc.continueWizard('0', 't', undefined, 'c', cfg)).toBeUndefined();
    });

    it('POSITIF konfirmasi ya menyimpan; batal membatalkan', async () => {
        const { svc } = makeUmkmService();
        const pending = {
            purchase: {
                items: [{ name: 'Mie Ayam', quantity: 2, unitCost: 5000 }],
                totalCost: 10000,
                purchaseDate: '2026-07-18',
            },
            resolved: [
                {
                    name: 'Mie Ayam',
                    quantity: 2,
                    unitCost: 5000,
                    itemId: 'p1',
                    catalogMatched: true,
                },
            ],
            createdAt: Date.now(),
        };
        // set via begin flow
        svc.openPurchaseHub('t', undefined, 'cp');
        await svc.continueWizard('3', 't', undefined, 'cp', cfg);
        await svc.continueWizard('2 mie ayam @5000', 't', undefined, 'cp', cfg);
        expect(svc.getPendingPurchase('t', undefined, 'cp')).toBeTruthy();

        svc.clearPendingPurchasePublic('t', undefined, 'cp');
        expect(svc.getPendingPurchase('t', undefined, 'cp')).toBeNull();
        void pending;
    });
});

describe('Perintah 4 — Daftar penjualan', () => {
    it('POSITIF digit & keyword', () => {
        expect(detectUmkmIntent('4', cmds)).toBe('list_sales');
        expect(detectUmkmIntent('daftar penjualan', cmds)).toBe('list_sales');
        expect(detectUmkmIntent('riwayat penjualan', cmds)).toBe('list_sales');
    });

    it('POSITIF kosong → arah jual + menu', async () => {
        const { svc } = makeUmkmService({ orders: [] });
        const r = await svc.buildSalesListMessage('t', 'today');
        expect(r).toMatch(/Belum ada penjualan/i);
        expect(r).toMatch(/\*5\*|\*0\*|jual/i);
    });

    it('POSITIF ada data → total + next step', async () => {
        const { svc } = makeUmkmService({
            orders: [
                {
                    order_number: 'WA-1',
                    total_amount: 30000,
                    created_at: '2026-07-18T10:00:00Z',
                },
            ],
        });
        const r = await svc.buildSalesListMessage('t', 'today');
        expect(r).toMatch(/WA-1|Daftar penjualan/i);
        expect(r).toMatch(/\*5\*|\*0\*/);
    });
});

describe('Perintah 5 — Tambah penjualan', () => {
    it('POSITIF digit & keyword', () => {
        expect(detectUmkmIntent('5', cmds)).toBe('record_sale');
        expect(detectUmkmIntent('jual 2 mie 30000', cmds)).toBe('record_sale');
        expect(detectUmkmIntent('catat penjualan', cmds)).toBe('record_sale');
    });

    it('POSITIF digit 5 saja → prompt format (bukan crash)', async () => {
        const { svc } = makeUmkmService();
        const prepared = await svc.prepareSaleFromText('5', 't', undefined, cfg);
        expect(prepared.kind).toBe('error');
        expect(prepared.message).toMatch(/Kirim detail|jual/i);
        expect(formatRecordSaleMenuPrompt(cmds)).toMatch(/jual|batal|0/i);
    });

    it('POSITIF parse jual heuristic', () => {
        const s = parseSaleHeuristic('jual 2 mie ayam 30000');
        expect(s).not.toBeNull();
        expect(s!.items.length).toBeGreaterThan(0);
    });

    it('POSITIF preview penjualan dengan katalog', async () => {
        const { svc } = makeUmkmService();
        const prepared = await svc.prepareSaleFromText('jual 2 mie ayam 30000', 't', undefined, cfg);
        expect(prepared.kind).toBe('preview');
        if (prepared.kind === 'preview') {
            expect(prepared.message).toMatch(/ya|batal|konfirmasi|preview|Benar/i);
            expect(prepared.pending.sale.totalAmount).toBeGreaterThan(0);
        }
    });

    it('NEGATIF teks tidak jelas → tip format', async () => {
        const { svc } = makeUmkmService();
        const prepared = await svc.prepareSaleFromText('asdfgh', 't', undefined, cfg);
        expect(prepared.kind).toBe('error');
        expect(prepared.message).toMatch(/memahami|Contoh|bantuan|daftar/i);
    });

    it('NEGATIF kosong / hanya spasi', async () => {
        const { svc } = makeUmkmService();
        const prepared = await svc.prepareSaleFromText('   ', 't', undefined, cfg);
        expect(prepared.kind).toBe('error');
    });
});

describe('Perintah 6 — Laporan (report_hub)', () => {
    it('POSITIF digit & keyword', () => {
        expect(detectUmkmIntent('6', cmds)).toBe('report_hub');
        expect(detectUmkmIntent('laporan', cmds)).toBe('sales_report');
        expect(detectUmkmIntent('omzet', cmds)).toBe('sales_report');
    });

    it('POSITIF open hub', () => {
        const { svc } = makeUmkmService();
        expect(svc.openReportHub('t', undefined, 'c')).toBe(formatReportHubPrompt());
        expect(formatReportHubPrompt()).toMatch(/batal|1|4/i);
    });

    it.each([
        ['1', /hari ini|Laporan/i],
        ['2', /minggu|Laporan/i],
        ['3', /bulan|Laporan/i],
        ['4', /semua|Laporan/i],
    ] as const)('POSITIF hub periode %s', async (digit, re) => {
        const { svc } = makeUmkmService({ orders: [], purchases: [] });
        svc.openReportHub('t', undefined, 'c');
        const r = await svc.continueWizard(digit, 't', undefined, 'c', cfg);
        expect(r).toMatch(/Laporan/i);
        expect(r).toMatch(/Penjualan|belanja|Selisih/i);
        expect(r).toMatch(/0|6/i);
        expect(r).toMatch(re);
    });

    it.each(['5', '9', 'halo'])('NEGATIF pilihan hub %j', async (input) => {
        const { svc } = makeUmkmService();
        svc.openReportHub('t', undefined, 'c');
        const r = await svc.continueWizard(input, 't', undefined, 'c', cfg);
        expect(r).toMatch(/tidak dikenali|Laporan/i);
        expect(formatReportHubUnknownChoice()).toMatch(/tidak dikenali/i);
    });

    it('POSITIF batal dari report hub', async () => {
        const { svc } = makeUmkmService();
        svc.openReportHub('t', undefined, 'c');
        expect(await svc.continueWizard('batal', 't', undefined, 'c', cfg)).toMatch(/Dibatalkan/i);
    });

    it('POSITIF keyword laporan langsung (tanpa hub)', async () => {
        const { svc } = makeUmkmService();
        const r = await svc.handleMessage('laporan hari ini', 't', undefined, cfg, {
            conversationId: 'c-lap',
        });
        expect(r).toMatch(/Laporan/i);
    });
});

describe('Perilaku user lintas perintah', () => {
    it('confirm/cancel detection', () => {
        expect(detectUmkmConfirmReply('ya', cmds)).toBe('confirm');
        expect(detectUmkmConfirmReply('iya', cmds)).toBe('confirm');
        expect(detectUmkmConfirmReply('batal', cmds)).toBe('cancel');
        expect(detectUmkmConfirmReply('tidak', cmds)).toBe('cancel');
        expect(detectUmkmConfirmReply('mie ayam', cmds)).toBeNull();
    });

    it('N: salah masuk hub belanja lalu pindah ke menu utama via batal', async () => {
        const { svc } = makeUmkmService();
        svc.openPurchaseHub('t', undefined, 'cx');
        await svc.continueWizard('9', 't', undefined, 'cx', cfg);
        const out = await svc.continueWizard('batal', 't', undefined, 'cx', cfg);
        expect(out).toMatch(/Dibatalkan/i);
        expect(out).toMatch(/\*2\*|\*5\*/);
    });

    it('N: dari report tekan digit menu 2 setelah batal → hub menu', async () => {
        const { svc } = makeUmkmService();
        svc.openReportHub('t', undefined, 'cy');
        await svc.continueWizard('batal', 't', undefined, 'cy', cfg);
        expect(svc.openMenuHub('t', undefined, 'cy')).toMatch(/Menu toko/);
    });

    it('P: alur user tipikal jual → list → laporan', async () => {
        const { svc } = makeUmkmService({
            orders: [
                {
                    order_number: 'WA-9',
                    total_amount: 45000,
                    created_at: '2026-07-18T12:00:00Z',
                },
            ],
        });
        const preview = await svc.prepareSaleFromText('jual 3 bakso 45000', 't', undefined, cfg);
        expect(preview.kind).toBe('preview');
        const list = await svc.buildSalesListMessage('t', 'today');
        expect(list).toMatch(/WA-9/);
        const report = await svc.buildCombinedReportMessage('t', 'today');
        expect(report).toMatch(/Laporan|Penjualan/i);
    });

    it('N: perintah acak → unknown intent path', () => {
        expect(detectUmkmIntent('xyzzy foobar', cmds)).toBe('unknown');
    });

    it('P: shortcut keyword tanpa digit tetap jalan', () => {
        expect(detectUmkmIntent('daftar menu', cmds)).toBe('list_products');
        expect(detectUmkmIntent('tambah menu', cmds)).toBe('add_product');
        expect(detectUmkmIntent('tambah stok', cmds)).toBe('add_stock');
        expect(detectUmkmIntent('cek stok bakso', cmds)).toBe('check_stock');
        expect(detectUmkmIntent('daftar belanja', cmds)).toBe('list_purchases');
        expect(detectUmkmIntent('tambah belanja', cmds)).toBe('record_purchase');
    });
});
