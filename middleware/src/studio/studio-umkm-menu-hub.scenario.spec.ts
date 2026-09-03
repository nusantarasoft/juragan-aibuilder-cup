/**
 * Uji menyeluruh perintah WA *2* (Menu toko) — sudut pandang tester + pengguna.
 * Meliputi: routing, hub, tambah menu, tambah stok, escape, noise WA, salah ketik.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    DEFAULT_UMKM_COMMANDS,
    formatMenuHubPrompt,
    formatMenuHubUnknownChoice,
} from './studio-umkm-commands';
import {
    explainAddProductParseFailure,
    explainAddStockParseFailure,
    parseAddProductMessage,
    parseAddStockMessage,
} from './studio-umkm-ops.util';
import {
    detectUmkmConfirmReply,
    detectUmkmIntent,
    detectUmkmMenuDigit,
    formatUmkmHelp,
} from './studio-umkm.util';
import { resolveUmkmListenTarget } from './guide-flow.interpreter';
import { stripWhatsAppMediaAnnotations, whatsappPayloadHasMedia } from './studio-whatsapp.util';
import { formatProductListWa, findBestProductMatch } from './studio-umkm-product.util';
import {
    DEFAULT_STUDIO_UMKM_CONTEXT,
    StudioUmkmService,
} from './studio-umkm.service';

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
};

const CATALOG = [
    { id: 'p1', name: 'Mie Ayam', sku: 'MA-01', sellingPrice: 15000 },
    { id: 'p2', name: 'Bakso', sku: 'BK-01', sellingPrice: 18000 },
    { id: 'p3', name: 'Es Teh', sku: 'ET-01', sellingPrice: 5000 },
];

function makeService(opts?: {
    products?: typeof CATALOG;
    createItemError?: Error;
}) {
    const products = opts?.products ?? CATALOG;
    const createItem = vi.fn(
        async (_tenant: string, input: { name: string; sellingPrice: number; costPrice?: number }) => {
            if (opts?.createItemError) throw opts.createItemError;
            return {
                name: input.name,
                sku: 'SKU-NEW',
                selling_price: input.sellingPrice,
            };
        },
    );
    const createStockMovement = vi.fn(async () => ({ id: 'mov-1' }));

    const invChain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
            data: products.map((p) => ({
                id: p.id,
                name: p.name,
                sku: p.sku,
                selling_price: p.sellingPrice,
            })),
            error: null,
        }),
    };

    const supabase = {
        getAdminClient: () => ({
            from: (table: string) => {
                if (table === 'inv_stock_ledger') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({ data: [], error: null }),
                    };
                }
                return invChain;
            },
        }),
    };
    const ai = { generateText: vi.fn(async () => '') };
    const inventory = { createItem, createStockMovement };
    const pendamping = { coach: vi.fn(async () => '*Pendamping*\n\nStub.') };
    const svc = new StudioUmkmService(supabase as any, ai as any, inventory as any, pendamping as any);
    return { svc, createItem, createStockMovement };
}

describe('WA noise & payload (sebelum intent)', () => {
    it.each([
        ['2', '2'],
        [' 2 ', '2'],
        ['2\n[User mengirim media yang tidak dapat diunduh]', '2'],
        [
            '2\n[User mengirim gambar: x.jpg, tipe image/jpeg]\n(Catatan: konten visual belum di-OCR otomatis; gunakan deskripsi teks user jika ada.)',
            '2',
        ],
        ['mie ayam 15000\n[User mengirim media yang tidak dapat diunduh]', 'mie ayam 15000'],
    ])('strip media annotations: %j → %j', (raw, expected) => {
        expect(stripWhatsAppMediaAnnotations(raw)).toBe(expected);
    });

    it('teks chat biasa tidak dianggap media walau ada _data', () => {
        expect(whatsappPayloadHasMedia({ body: '2', _data: { id: 'x', type: 'chat' } })).toBe(false);
        expect(whatsappPayloadHasMedia({ hasMedia: true })).toBe(true);
        expect(whatsappPayloadHasMedia({ _data: { type: 'image', mimetype: 'image/jpeg' } })).toBe(true);
    });
});

describe('Entry: user buka menu 2', () => {
    it('digit 2 → menu_hub / do_menu_hub', () => {
        expect(detectUmkmIntent('2', cmds)).toBe('menu_hub');
        expect(detectUmkmMenuDigit('2', cmds)).toBe('menu_hub');
        expect(resolveUmkmListenTarget(listenStub, '2', { commands: cmds })).toBe('do_menu_hub');
    });

    it.each(['menu toko', 'kelola menu', 'menu hub'])('keyword %j → menu_hub', (kw) => {
        expect(detectUmkmIntent(kw, cmds)).toBe('menu_hub');
    });

    it('digit lain tidak salah jadi menu_hub', () => {
        expect(detectUmkmIntent('1', cmds)).toBe('ask');
        expect(detectUmkmIntent('3', cmds)).toBe('purchase_hub');
        expect(detectUmkmIntent('5', cmds)).toBe('record_sale');
        expect(detectUmkmIntent('0', cmds)).toBe('help');
    });

    it('prompt hub lengkap & human-friendly', () => {
        const p = formatMenuHubPrompt();
        expect(p).toMatch(/Menu toko/i);
        expect(p).toMatch(/\*1\*/);
        expect(p).toMatch(/\*2\*/);
        expect(p).toMatch(/\*3\*/);
        expect(p).toMatch(/daftar|lihat menu/i);
        expect(p).toMatch(/Tambah menu/i);
        expect(p).toMatch(/stok/i);
        expect(p).toMatch(/batal/i);
    });
});

describe('Hub submenu (wizard menu_hub)', () => {
    let svc: StudioUmkmService;
    const tenant = 'umkm-test';
    const conv = 'conv-hub';

    beforeEach(() => {
        ({ svc } = makeService());
        svc.openMenuHub(tenant, undefined, conv);
    });

    it('POSITIF 1 → daftar menu berisi katalog', async () => {
        const reply = await svc.continueWizard('1', tenant, undefined, conv, cfg);
        expect(reply).toMatch(/Daftar Barang|Mie Ayam|Bakso/i);
    });

    it('POSITIF 1 saat katalog kosong → pesan ramah', async () => {
        ({ svc } = makeService({ products: [] }));
        svc.openMenuHub(tenant, undefined, conv);
        const reply = await svc.continueWizard('1', tenant, undefined, conv, cfg);
        expect(reply).toMatch(/Belum ada produk/i);
    });

    it('POSITIF 2 → minta format tambah menu + jalan keluar', async () => {
        const reply = await svc.continueWizard('2', tenant, undefined, conv, cfg);
        expect(reply).toMatch(/nama menu/i);
        expect(reply).toMatch(/batal/i);
        expect(reply).toMatch(/contoh/i);
    });

    it('POSITIF 3 → minta format tambah stok + jalan keluar', async () => {
        const reply = await svc.continueWizard('3', tenant, undefined, conv, cfg);
        expect(reply).toMatch(/qty|jumlah|nama menu/i);
        expect(reply).toMatch(/batal/i);
    });

    it.each(['4', '5', '6', '7', '8', '9', '99', 'abc', 'halo', 'ya', 'ok'])(
        'NEGATIF pilihan hub %j → tidak dikenali / ulang hub',
        async (input) => {
            const reply = await svc.continueWizard(input, tenant, undefined, conv, cfg);
            expect(reply).toMatch(/tidak dikenali|Menu toko/i);
            const again = await svc.continueWizard('1', tenant, undefined, conv, cfg);
            expect(again).toMatch(/Daftar Barang|Mie Ayam|Belum ada/i);
        },
    );

    it.each(['batal', 'batalkan', 'cancel', 'tidak'])(
        'POSITIF escape hub dengan %j → menu utama',
        async (word) => {
            const reply = await svc.continueWizard(word, tenant, undefined, conv, cfg);
            expect(reply).toMatch(/Dibatalkan/i);
            expect(reply).toMatch(/\*2\*/);
            expect(await svc.continueWizard('1', tenant, undefined, conv, cfg)).toBeUndefined();
        },
    );
});

describe('Alur tambah menu (2→2→…)', () => {
    let svc: StudioUmkmService;
    let createItem: ReturnType<typeof vi.fn>;
    const tenant = 'umkm-test';
    const conv = 'conv-add';

    beforeEach(async () => {
        ({ svc, createItem } = makeService());
        svc.openMenuHub(tenant, undefined, conv);
        await svc.continueWizard('2', tenant, undefined, conv, cfg);
    });

    const positiveInputs: Array<{
        input: string;
        name: RegExp;
        price: number;
        cost?: number;
    }> = [
        { input: 'mie ayam 15000', name: /mie ayam/i, price: 15000 },
        { input: 'Mie Ayam 15.000', name: /mie ayam/i, price: 15000 },
        { input: 'bakso 12rb', name: /bakso/i, price: 12000 },
        { input: 'es teh @5000', name: /es teh/i, price: 5000 },
        { input: 'es teh harga 5000', name: /es teh/i, price: 5000 },
        { input: 'Rp 15000 mie ayam', name: /mie ayam/i, price: 15000 },
        { input: '15000 bakso', name: /bakso/i, price: 15000 },
        { input: 'bakso modal 10000 18000', name: /bakso/i, price: 18000, cost: 10000 },
        { input: 'tambah menu kopi susu 20000', name: /kopi susu/i, price: 20000 },
        { input: 'mie ayam spesial 2 20000', name: /mie ayam spesial 2/i, price: 20000 },
        { input: '  es teh   5000  ', name: /es teh/i, price: 5000 },
        { input: 'kopi', name: /kopi/i, price: 0 },
    ];

    for (const c of positiveInputs) {
        it(`POSITIF parse: ${JSON.stringify(c.input)}`, () => {
            const p = parseAddProductMessage(c.input);
            expect(p).not.toBeNull();
            expect(p!.name).toMatch(c.name);
            expect(p!.sellingPrice).toBe(c.price);
            if (c.cost != null) expect(p!.costPrice).toBe(c.cost);
        });
    }

    it('POSITIF wizard: simpan menu → sukses & kembali ke Menu toko', async () => {
        const reply = await svc.continueWizard('mie ayam bakso 16000', tenant, undefined, conv, cfg);
        expect(reply).toMatch(/Menu ditambahkan/i);
        expect(reply).toMatch(/tambah menu lagi/i);
        expect(createItem).toHaveBeenCalled();
        // masih di hub: 2 = tambah lagi
        const again = await svc.continueWizard('2', tenant, undefined, conv, cfg);
        expect(again).toMatch(/nama menu|batal/i);
    });

    it('NEGATIF DB error → pesan gagal + arah batal', async () => {
        ({ svc, createItem } = makeService({
            createItemError: new Error("Could not find the 'asset_category' column"),
        }));
        svc.openMenuHub(tenant, undefined, conv);
        await svc.continueWizard('2', tenant, undefined, conv, cfg);
        const reply = await svc.continueWizard('mie ayam 15000', tenant, undefined, conv, cfg);
        expect(reply).toMatch(/Gagal menambah menu/i);
        expect(reply).toMatch(/batal/i);
    });

    const negativeInputs = [
        '',
        '2',
        '0',
        '5',
        '15000',
        'Rp 12rb',
        '10000 18000',
        'a',
        '.',
        '!!!',
        'rp',
        'harga',
        '   ',
    ];

    for (const input of negativeInputs) {
        it(`NEGATIF tidak parse sebagai menu: ${JSON.stringify(input)}`, () => {
            expect(parseAddProductMessage(input)).toBeNull();
            const tip = explainAddProductParseFailure(input);
            expect(tip).toMatch(/batal/i);
            expect(tip.length).toBeGreaterThan(40);
        });
    }

    it.each(['0', '1', '2', '3', '4', '5', '6'])(
        'POSITIF escape digit %s dari await_add_product → undefined (re-route)',
        async (digit) => {
            const reply = await svc.continueWizard(digit, tenant, undefined, conv, cfg);
            expect(reply).toBeUndefined();
        },
    );

    it.each(['batal', 'cancel', 'tidak'])(
        'POSITIF escape %s dari await_add_product → cancel singkat (conversational)',
        async (word) => {
            const reply = await svc.continueWizard(word, tenant, undefined, conv, cfg);
            expect(reply).toMatch(/Dibatalkan/i);
            // Conversational: jangan dump full digit menu
            expect(reply).toMatch(/jual|cek stok|laporan/i);
            expect(reply).not.toMatch(/\*1\* Tanya/);
        },
    );

    it('NEGATIF input jelek tetap di wizard & tip jelas (bukan diam)', async () => {
        const reply = await svc.continueWizard('15000', tenant, undefined, conv, cfg);
        expect(reply).toMatch(/hanya angka|nama/i);
        expect(reply).toMatch(/batal/i);
        const ok = await svc.continueWizard('es jeruk 7000', tenant, undefined, conv, cfg);
        expect(ok).toMatch(/Menu ditambahkan/i);
    });
});

describe('Alur tambah stok (2→3→…)', () => {
    let svc: StudioUmkmService;
    let createStockMovement: ReturnType<typeof vi.fn>;
    const tenant = 'umkm-test';
    const conv = 'conv-stock';

    beforeEach(async () => {
        ({ svc, createStockMovement } = makeService());
        svc.openMenuHub(tenant, undefined, conv);
        await svc.continueWizard('3', tenant, undefined, conv, cfg);
    });

    it.each([
        ['mie ayam 10', /mie ayam/i, 10],
        ['10 mie ayam', /mie ayam/i, 10],
        ['tambah stok bakso 5', /bakso/i, 5],
        ['es teh 2.5', /es teh/i, 2.5],
        ['3 bakso', /bakso/i, 3],
    ] as const)('POSITIF parse stok %j', (input, q, qty) => {
        const s = parseAddStockMessage(input);
        expect(s).not.toBeNull();
        expect(s!.productQuery).toMatch(q);
        expect(s!.quantity).toBe(qty);
    });

    it('POSITIF wizard: stok produk dikenal → sukses & kembali ke Menu toko', async () => {
        const reply = await svc.continueWizard('mie ayam 10', tenant, undefined, conv, cfg);
        expect(reply).toMatch(/Stok.*Mie Ayam|\+10/i);
        expect(reply).toMatch(/tambah stok lagi|daftar barang/i);
        expect(createStockMovement).toHaveBeenCalled();
        const again = await svc.continueWizard('3', tenant, undefined, conv, cfg);
        expect(again).toMatch(/qty|jumlah|nama menu|batal/i);
    });

    it('NEGATIF produk tidak ada → arah daftar, tetap bisa coba lagi', async () => {
        const reply = await svc.continueWizard('xyzabc 10', tenant, undefined, conv, cfg);
        expect(reply).toMatch(/tidak ditemukan/i);
        expect(reply).toMatch(/daftar|batal|2/i);
        const ok = await svc.continueWizard('bakso 3', tenant, undefined, conv, cfg);
        expect(ok).toMatch(/Stok|\+3/i);
    });

    it('NEGATIF nama tanpa qty', async () => {
        expect(parseAddStockMessage('mie ayam')).toBeNull();
        const tip = explainAddStockParseFailure('mie ayam');
        expect(tip).toMatch(/tanpa jumlah/i);
        const reply = await svc.continueWizard('mie ayam', tenant, undefined, conv, cfg);
        expect(reply).toMatch(/jumlah|qty|10/i);
        expect(reply).toMatch(/batal/i);
    });

    it.each(['0', '1', '5', 'batal'])('escape %s dari await_add_stock', async (input) => {
        const reply = await svc.continueWizard(input, tenant, undefined, conv, cfg);
        if (input === 'batal') {
            expect(reply).toMatch(/Dibatalkan/i);
        } else {
            expect(reply).toBeUndefined();
        }
    });

    it('fuzzy match: "mie" menemukan Mie Ayam', () => {
        const m = findBestProductMatch('mie', CATALOG, 40);
        expect(m?.name).toMatch(/Mie Ayam/i);
    });
});

describe('Daftar menu (2→1) & copy', () => {
    it('format kosong vs terisi', () => {
        expect(formatProductListWa([])).toMatch(/Belum ada produk/i);
        const filled = formatProductListWa(CATALOG);
        expect(filled).toMatch(/Mie Ayam/);
        expect(filled).toMatch(/Bakso/);
        expect(filled).toMatch(/jual/i);
    });
});

describe('Salah komunikasi / bentrok intent', () => {
    it('shortcut keyword tidak harus lewat hub', () => {
        expect(detectUmkmIntent('daftar menu', cmds)).toBe('list_products');
        expect(detectUmkmIntent('tambah menu', cmds)).toBe('add_product');
        expect(detectUmkmIntent('tambah stok', cmds)).toBe('add_stock');
        expect(detectUmkmIntent('cek stok mie', cmds)).toBe('check_stock');
    });

    it('confirm words tidak memicu menu digit', () => {
        expect(detectUmkmMenuDigit('ya', cmds)).toBeNull();
        expect(detectUmkmConfirmReply('ya', cmds)).toBe('confirm');
        expect(detectUmkmConfirmReply('batal', cmds)).toBe('cancel');
    });

    it('setelah dibatalkan, help masih punya opsi 2', () => {
        expect(formatUmkmHelp(cmds)).toMatch(/\*2\*/);
    });

    it('unknown hub choice copy', () => {
        expect(formatMenuHubUnknownChoice()).toMatch(/tidak dikenali/i);
    });
});

describe('Conversasi end-to-end (simulasi user WA)', () => {
    it('P: buka → daftar → selesai', async () => {
        const { svc } = makeService();
        const t = 't1';
        const c = 'c1';
        expect(svc.openMenuHub(t, undefined, c)).toMatch(/Menu toko/);
        const list = await svc.continueWizard('1', t, undefined, c, cfg);
        expect(list).toMatch(/Mie Ayam/);
        expect(await svc.continueWizard('halo', t, undefined, c, cfg)).toBeUndefined();
    });

    it('P: buka → tambah → simpan → bisa tambah lagi dari hub', async () => {
        const { svc } = makeService();
        const t = 't2';
        const c = 'c2';
        svc.openMenuHub(t, undefined, c);
        await svc.continueWizard('2', t, undefined, c, cfg);
        const saved = await svc.continueWizard('gado gado 12000', t, undefined, c, cfg);
        expect(saved).toMatch(/ditambahkan/i);
        expect(saved).toMatch(/tambah menu lagi/i);
        expect(await svc.continueWizard('2', t, undefined, c, cfg)).toMatch(/nama menu/i);
    });

    it('P: buka → stok → sukses', async () => {
        const { svc } = makeService();
        const t = 't3';
        const c = 'c3';
        svc.openMenuHub(t, undefined, c);
        await svc.continueWizard('3', t, undefined, c, cfg);
        const stock = await svc.continueWizard('es teh 20', t, undefined, c, cfg);
        expect(stock).toMatch(/\+20|Stok/i);
        expect(stock).toMatch(/tambah stok lagi|daftar barang/i);
    });

    it('N: stuck recovery — salah berkali-kali lalu batal', async () => {
        const { svc } = makeService();
        const t = 't4';
        const c = 'c4';
        svc.openMenuHub(t, undefined, c);
        await svc.continueWizard('2', t, undefined, c, cfg);
        expect(await svc.continueWizard('15000', t, undefined, c, cfg)).toMatch(/nama|angka/i);
        expect(await svc.continueWizard('999', t, undefined, c, cfg)).toMatch(/batal/i);
        expect(await svc.continueWizard('a', t, undefined, c, cfg)).toMatch(/batal/i);
        const out = await svc.continueWizard('batal', t, undefined, c, cfg);
        expect(out).toMatch(/Dibatalkan/i);
        expect(await svc.continueWizard('1', t, undefined, c, cfg)).toBeUndefined();
    });

    it('N: salah pilih hub → tetap bisa pilih benar', async () => {
        const { svc } = makeService();
        const t = 't5';
        const c = 'c5';
        svc.openMenuHub(t, undefined, c);
        expect(await svc.continueWizard('9', t, undefined, c, cfg)).toMatch(/tidak dikenali/i);
        expect(await svc.continueWizard('1', t, undefined, c, cfg)).toMatch(/Daftar|Mie/i);
    });

    it('N: dari tambah menu tekan 5 → lepas wizard (siap jual)', async () => {
        const { svc } = makeService();
        const t = 't6';
        const c = 'c6';
        svc.openMenuHub(t, undefined, c);
        await svc.continueWizard('2', t, undefined, c, cfg);
        expect(await svc.continueWizard('5', t, undefined, c, cfg)).toBeUndefined();
        expect(detectUmkmIntent('5', cmds)).toBe('record_sale');
    });

    it('N: media-polluted digit di hub setelah strip', async () => {
        const cleaned = stripWhatsAppMediaAnnotations(
            '1\n[User mengirim media yang tidak dapat diunduh]',
        );
        const { svc } = makeService();
        const t = 't7';
        const c = 'c7';
        svc.openMenuHub(t, undefined, c);
        expect(await svc.continueWizard(cleaned, t, undefined, c, cfg)).toMatch(/Daftar|Mie/i);
    });

    it('N: qty stok 0 / negatif → tip, tidak commit', async () => {
        const { svc, createStockMovement } = makeService();
        const t = 't8';
        const c = 'c8';
        svc.openMenuHub(t, undefined, c);
        await svc.continueWizard('3', t, undefined, c, cfg);
        expect(await svc.continueWizard('mie ayam 0', t, undefined, c, cfg)).toMatch(/batal|jumlah/i);
        expect(createStockMovement).not.toHaveBeenCalled();
        expect(await svc.continueWizard('mie ayam -5', t, undefined, c, cfg)).toMatch(/batal|jumlah/i);
        expect(createStockMovement).not.toHaveBeenCalled();
    });

    it('P: batal dari tambah menu → buka hub lagi → stok', async () => {
        const { svc } = makeService();
        const t = 't9';
        const c = 'c9';
        svc.openMenuHub(t, undefined, c);
        await svc.continueWizard('2', t, undefined, c, cfg);
        expect(await svc.continueWizard('batal', t, undefined, c, cfg)).toMatch(/Dibatalkan/i);
        svc.openMenuHub(t, undefined, c);
        await svc.continueWizard('3', t, undefined, c, cfg);
        expect(await svc.continueWizard('bakso 1', t, undefined, c, cfg)).toMatch(/Stok|\+1/i);
    });

    it('P: nama panjang & spasi ganda tetap diterima', () => {
        const p = parseAddProductMessage('mie ayam bakso spesial rumah makan 25000');
        expect(p?.name).toMatch(/mie ayam bakso spesial rumah makan/i);
        expect(p?.sellingPrice).toBe(25000);
    });

    it('N: hanya emoji / simbol → ditolak dengan tip', () => {
        expect(parseAddProductMessage('🍜')).toBeNull();
        expect(parseAddProductMessage('???')).toBeNull();
        expect(explainAddProductParseFailure('🍜')).toMatch(/batal/i);
    });

    it('P: polluted full message setelah strip masih parse menu', () => {
        const cleaned = stripWhatsAppMediaAnnotations(
            'bakso 18000\n[User mengirim media yang tidak dapat diunduh]',
        );
        const p = parseAddProductMessage(cleaned);
        expect(p?.name).toMatch(/bakso/i);
        expect(p?.sellingPrice).toBe(18000);
    });
});
