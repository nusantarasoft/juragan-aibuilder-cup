/**
 * Configurable UMKM WhatsApp commands (keywords, menu digits, confirm/cancel).
 * Stored in studio_notebooks.context_config.umkm_commands.
 */

export const UMKM_COMMAND_INTENTS = [
    'ask',
    'menu_hub',
    'list_products',
    'add_product',
    'add_stock',
    'check_stock',
    'purchase_hub',
    'list_purchases',
    'record_purchase',
    'list_sales',
    'record_sale',
    'report_hub',
    'sales_report',
    'help',
] as const;

export type UmkmCommandIntent = (typeof UMKM_COMMAND_INTENTS)[number];

/** Detection priority (more specific before hubs / help). */
export const UMKM_INTENT_DETECT_ORDER: UmkmCommandIntent[] = [
    'add_product',
    'add_stock',
    'check_stock',
    'list_purchases', // before record_purchase so "daftar belanja" ≠ "belanja"
    'record_purchase',
    'list_sales',
    'record_sale',
    'list_products',
    'sales_report',
    'menu_hub',
    'purchase_hub',
    'report_hub',
    'ask',
    'help',
];

export type UmkmMenuCommand = {
    digit: string;
    intent: UmkmCommandIntent;
    label: string;
};

export type UmkmCommandsConfig = {
    menu: UmkmMenuCommand[];
    keywords: Partial<Record<UmkmCommandIntent, string[]>>;
    confirm: string[];
    cancel: string[];
};

export const DEFAULT_UMKM_COMMANDS: UmkmCommandsConfig = {
    menu: [
        { digit: '1', intent: 'ask', label: 'Tanya' },
        { digit: '2', intent: 'menu_hub', label: 'Menu (daftar / tambah / stok)' },
        { digit: '3', intent: 'purchase_hub', label: 'Belanja' },
        { digit: '4', intent: 'list_sales', label: 'Daftar penjualan' },
        { digit: '5', intent: 'record_sale', label: 'Tambah penjualan' },
        { digit: '6', intent: 'report_hub', label: 'Laporan' },
        { digit: '0', intent: 'help', label: 'Bantuan' },
    ],
    keywords: {
        ask: ['tanya', 'bertanya', 'tanya dong', 'bagaimana', 'gimana'],
        menu_hub: ['menu toko', 'kelola menu', 'menu hub'],
        list_products: [
            'daftar menu',
            'daftar barang',
            'daftar produk',
            'list produk',
            'list barang',
            'katalog',
            'catalog',
        ],
        add_product: ['tambah menu', 'tambah barang', 'tambah produk', 'buat menu', 'menu baru'],
        add_stock: ['tambah stok', 'stok masuk', 'isi stok', 'restok'],
        check_stock: ['cek stok', 'stok berapa', 'berapa stok', 'sisa stok', 'sisa barang', 'stock', 'stok'],
        purchase_hub: ['belanja hub', 'menu belanja'],
        list_purchases: ['daftar belanja', 'riwayat belanja', 'lihat belanja'],
        record_purchase: ['tambah belanja', 'catat belanja', 'belanja'],
        list_sales: ['daftar penjualan', 'riwayat penjualan', 'lihat penjualan', 'list penjualan'],
        record_sale: [
            'jual',
            'jualan',
            'catat penjualan',
            'tambah penjualan',
            'catat',
            'order',
            'transaksi',
            'terjual',
            'ada yang beli',
            'yang beli',
            'tadi beli',
        ],
        report_hub: ['menu laporan'],
        sales_report: [
            'laporan',
            'laporkan',
            'rekap',
            'ringkasan',
            // Avoid bare "omzet" — matches advice Q like "cara menaikkan omzet"
            'berapa omzet',
            'berapa omset',
            'cek omzet',
            'cek omset',
            'lihat omzet',
            'lihat omset',
            'omzet hari ini',
            'omset hari ini',
            'omzet minggu',
            'omset minggu',
            'omzet bulan',
            'omset bulan',
            'report',
            'total penjualan',
            'penjualan hari ini',
        ],
        help: ['bantuan', 'help', 'panduan', 'cara pakai', 'contoh'],
    },
    confirm: ['ya', 'iya', 'y', 'yes', 'benar', 'betul', 'ok', 'oke', 'okay', 'setuju', 'simpan', 'confirm', 'lanjut'],
    cancel: ['batal', 'batalkan', 'cancel', 'tidak', 'tdk', 'no', 'ngga', 'enggak', 'jangan'],
};

/** Legacy alias map for old configs. */
const LEGACY_INTENT_ALIASES: Record<string, UmkmCommandIntent> = {};

const INTENT_SET = new Set<string>(UMKM_COMMAND_INTENTS);

/* v8 ignore next 3 -- every UMKM intent has a default keyword list; the `|| []` is a type-guard */
function defaultKeywordsFor(intent: UmkmCommandIntent): string[] {
    return [...(DEFAULT_UMKM_COMMANDS.keywords[intent] || [])];
}

function normalizeKeywordList(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (const item of raw) {
        const s = String(item ?? '')
            .trim()
            .toLowerCase();
        if (s.length >= 1 && !out.includes(s)) out.push(s);
    }
    return out;
}

function normalizeMenu(raw: unknown): UmkmMenuCommand[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const out: UmkmMenuCommand[] = [];
    for (const row of raw) {
        if (!row || typeof row !== 'object') continue;
        const r = row as Record<string, unknown>;
        const digit = String(r.digit ?? '')
            .trim()
            .replace(/\D/g, '')
            .slice(0, 1);
        let intent = String(r.intent ?? '').trim();
        /* v8 ignore next -- LEGACY_INTENT_ALIASES is currently empty; kept for forward-compat with old configs */
        if (LEGACY_INTENT_ALIASES[intent]) intent = LEGACY_INTENT_ALIASES[intent];
        const label = String(r.label ?? intent).trim() || intent;
        if (!/^[0-9]$/.test(digit)) continue;
        if (!INTENT_SET.has(intent)) continue;
        if (seen.has(digit)) continue;
        seen.add(digit);
        out.push({ digit, intent: intent as UmkmCommandIntent, label });
    }
    return out;
}

function unionKeywordList(intent: UmkmCommandIntent, userRaw: unknown): string[] {
    const defaults = defaultKeywordsFor(intent);
    const extra = normalizeKeywordList(userRaw);
    const out = [...defaults];
    for (const k of extra) {
        if (!out.includes(k)) out.push(k);
    }
    return out;
}

/** Merge partial/user config with defaults. Keyword arrays union into DEFAULT (empty does not wipe). Menu/confirm/cancel still replace when present. */
export function resolveUmkmCommands(raw?: unknown): UmkmCommandsConfig {
    if (!raw || typeof raw !== 'object') {
        return structuredClone(DEFAULT_UMKM_COMMANDS);
    }
    const src = raw as Partial<UmkmCommandsConfig> & Record<string, unknown>;
    const hasMenu = Object.prototype.hasOwnProperty.call(src, 'menu');
    const hasKeywords = Object.prototype.hasOwnProperty.call(src, 'keywords');
    const hasConfirm = Object.prototype.hasOwnProperty.call(src, 'confirm');
    const hasCancel = Object.prototype.hasOwnProperty.call(src, 'cancel');

    const menu = hasMenu ? normalizeMenu(src.menu) : structuredClone(DEFAULT_UMKM_COMMANDS.menu);

    const keywords: UmkmCommandsConfig['keywords'] = {};
    for (const intent of UMKM_COMMAND_INTENTS) {
        if (hasKeywords && src.keywords && typeof src.keywords === 'object') {
            const userList = (src.keywords as Record<string, unknown>)[intent];
            if (userList === undefined) {
                keywords[intent] = defaultKeywordsFor(intent);
            } else {
                keywords[intent] = unionKeywordList(intent, userList);
            }
        } else {
            keywords[intent] = defaultKeywordsFor(intent);
        }
    }

    const confirm = hasConfirm
        ? normalizeKeywordList(src.confirm)
        : [...DEFAULT_UMKM_COMMANDS.confirm];
    const cancel = hasCancel
        ? normalizeKeywordList(src.cancel)
        : [...DEFAULT_UMKM_COMMANDS.cancel];

    return { menu, keywords, confirm, cancel };
}

export function sanitizeUmkmCommandsInput(raw: unknown): UmkmCommandsConfig {
    const resolved = resolveUmkmCommands(raw);
    const digits = resolved.menu.map((m) => m.digit);
    /* v8 ignore start -- defensive: resolveUmkmCommands() already dedupes digits and drops invalid intents */
    if (new Set(digits).size !== digits.length) {
        throw new Error('Menu digit harus unik');
    }
    for (const m of resolved.menu) {
        if (!INTENT_SET.has(m.intent)) {
            throw new Error(`Intent menu tidak valid: ${m.intent}`);
        }
    }
    /* v8 ignore stop */
    return resolved;
}

export function escapeRegexToken(token: string): string {
    return token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

export function keywordsToRegex(keywords: string[]): RegExp | null {
    const cleaned = keywords.map((k) => k.trim()).filter((k) => k.length > 0);
    if (cleaned.length === 0) return null;
    // Longer phrases first so "tambah penjualan" wins over "tambah"
    const sorted = [...cleaned].sort((a, b) => b.length - a.length);
    const parts = sorted.map((k) => {
        const escaped = escapeRegexToken(k);
        if (!/\s/.test(k)) return `\\b${escaped}\\b`;
        return escaped;
    });
    return new RegExp(`(?:${parts.join('|')})`, 'i');
}

export function exactRepliesToRegex(replies: string[]): RegExp | null {
    const cleaned = replies.map((k) => k.trim()).filter((k) => k.length > 0);
    if (cleaned.length === 0) return null;
    const parts = cleaned.map((k) => `^${escapeRegexToken(k)}$`);
    return new RegExp(`(?:${parts.join('|')})`, 'i');
}

export type UmkmCommandMatcher = {
    commands: UmkmCommandsConfig;
    digitToIntent: Map<string, UmkmCommandIntent>;
    intentRegex: Map<UmkmCommandIntent, RegExp>;
    confirmRe: RegExp | null;
    cancelRe: RegExp | null;
};

export function buildUmkmCommandMatcher(commands?: UmkmCommandsConfig | unknown): UmkmCommandMatcher {
    const resolved = resolveUmkmCommands(commands);
    const digitToIntent = new Map<string, UmkmCommandIntent>();
    for (const m of resolved.menu) {
        digitToIntent.set(m.digit, m.intent);
    }
    const intentRegex = new Map<UmkmCommandIntent, RegExp>();
    for (const intent of UMKM_COMMAND_INTENTS) {
        /* v8 ignore next -- resolveUmkmCommands() populates every intent; `|| []` is a type-guard */
        const re = keywordsToRegex(resolved.keywords[intent] || []);
        if (re) intentRegex.set(intent, re);
    }
    return {
        commands: resolved,
        digitToIntent,
        intentRegex,
        confirmRe: exactRepliesToRegex(resolved.confirm),
        cancelRe: exactRepliesToRegex(resolved.cancel),
    };
}

export function umkmIntentToListenTarget(intent: UmkmCommandIntent): string {
    switch (intent) {
        case 'ask':
            return 'do_ask';
        case 'menu_hub':
            return 'do_menu_hub';
        case 'list_products':
            return 'do_list';
        case 'add_product':
            return 'do_add_product';
        case 'add_stock':
            return 'do_add_stock';
        case 'check_stock':
            return 'do_stock';
        case 'purchase_hub':
            return 'do_purchase_hub';
        case 'list_purchases':
            return 'do_list_purchases';
        case 'record_purchase':
            return 'do_record_purchase';
        case 'list_sales':
            return 'do_list_sales';
        case 'record_sale':
            return 'do_record';
        case 'report_hub':
            return 'do_report_hub';
        case 'sales_report':
            return 'do_report';
        case 'help':
            return 'help';
        /* v8 ignore next 2 -- exhaustive switch over UmkmCommandIntent; default is unreachable */
        default:
            return 'help';
    }
}

export function uniqueMenuForDisplay(commands: UmkmCommandsConfig): UmkmMenuCommand[] {
    const seen = new Set<string>();
    const out: UmkmMenuCommand[] = [];
    for (const m of commands.menu) {
        if (seen.has(m.digit)) continue;
        seen.add(m.digit);
        out.push(m);
    }
    return out.sort((a, b) => a.digit.localeCompare(b.digit));
}

export function formatWelcomeFromCommands(commands: UmkmCommandsConfig): string {
    const menu = uniqueMenuForDisplay(commands);
    const lines = [
        'Halo! Siap bantu catat jualan.',
        '',
        'Ketik seperti biasa, contoh *jual 2 indomie* atau *stok indomie*.',
        '',
        '*Menu* — kalau mau balas angka:',
    ];
    for (const m of menu) {
        lines.push(`*${m.digit}* ${m.label}`);
    }
    return lines.join('\n');
}

export function formatMenuHubPrompt(): string {
    return [
        '🍽️ *Menu toko*',
        '',
        '• *daftar* — lihat menu',
        '• *tambah menu* — menu baru',
        '• *tambah stok* — stok masuk',
        '',
        'Boleh juga balas *1* / *2* / *3*. Ketik *batal* untuk kembali.',
    ].join('\n');
}

export function formatMenuHubUnknownChoice(): string {
    return [
        'Pilihan tidak dikenali. Coba ketik *daftar*, *tambah menu*, atau *tambah stok*.',
        '',
        formatMenuHubPrompt(),
    ].join('\n');
}

export function formatPurchaseHubPrompt(): string {
    return [
        '🛒 *Belanja*',
        '',
        '• *daftar* — semua belanja',
        '• *bulan ini* — belanja bulan ini',
        '• *tambah belanja* — catat belanja baru',
        '',
        'Boleh juga balas *1* / *2* / *3*. Ketik *batal* untuk kembali.',
    ].join('\n');
}

export function formatPurchaseHubUnknownChoice(): string {
    return [
        'Pilihan tidak dikenali. Coba ketik *daftar*, *bulan ini*, atau *tambah belanja*.',
        '',
        formatPurchaseHubPrompt(),
    ].join('\n');
}

export function formatReportHubPrompt(): string {
    return [
        '📊 *Laporan*',
        '',
        '• *hari ini* — ringkas hari ini',
        '• *minggu ini* — minggu berjalan',
        '• *bulan ini* — bulan berjalan',
        '• *semua* — seluruh periode',
        '',
        'Boleh juga balas *1*–*4*. Ketik *batal* untuk kembali.',
    ].join('\n');
}

export function formatReportHubUnknownChoice(): string {
    return [
        'Pilihan tidak dikenali. Balas *hari ini*, *minggu ini*, *bulan ini*, atau *semua*.',
        '',
        formatReportHubPrompt(),
    ].join('\n');
}
