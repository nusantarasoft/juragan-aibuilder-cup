/** UMKM WhatsApp — intent detection, sale parsing helpers, report formatting. */

import {
    buildUmkmCommandMatcher,
    DEFAULT_UMKM_COMMANDS,
    resolveUmkmCommands,
    uniqueMenuForDisplay,
    UMKM_INTENT_DETECT_ORDER,
    type UmkmCommandIntent,
    type UmkmCommandsConfig,
    type UmkmCommandMatcher,
} from './studio-umkm-commands';

export type UmkmIntent = UmkmCommandIntent | 'unknown' | 'check_stock';

/** AIDLC intent labels from dokumen AI Development Life Cycle UMKM. */
export type AidlcUmkmIntent =
    | 'catat_transaksi'
    | 'cek_stok'
    | 'laporan'
    | 'tanya_umum'
    | 'lainnya';

export type UmkmSaleItem = {
    name: string;
    quantity: number;
    unitPrice: number;
};

export type ParsedUmkmSale = {
    items: UmkmSaleItem[];
    totalAmount: number;
    customerName?: string;
    paymentMethod?: string;
    notes?: string;
};

export type UmkmDailyReport = {
    salesDate: string;
    orderCount: number;
    paidOrderCount: number;
    revenueGross: number;
    revenuePaid: number;
    topProducts: { name: string; unitsSold: number; revenue: number }[];
    recentOrders: {
        orderNumber: string;
        customerName: string | null;
        totalAmount: number;
        createdAt: string;
    }[];
};

export type { UmkmCommandsConfig, UmkmCommandIntent };

const defaultMatcher = buildUmkmCommandMatcher(DEFAULT_UMKM_COMMANDS);

function matcherFrom(commands?: UmkmCommandsConfig | unknown): UmkmCommandMatcher {
    if (!commands) return defaultMatcher;
    return buildUmkmCommandMatcher(commands);
}

/** CS-style menu digit → intent. Returns null if not a single menu digit. */
export function detectUmkmMenuDigit(
    text: string,
    commands?: UmkmCommandsConfig | unknown,
): UmkmIntent | null {
    const lines = text
        .trim()
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    // Prefer first line so "2\n[User mengirim media...]" still maps to menu digit 2
    const t = lines[0] || '';
    if (!/^[0-9]$/.test(t)) return null;
    const m = matcherFrom(commands);
    return (m.digitToIntent.get(t) as UmkmIntent | undefined) ?? null;
}

/** True when message is only a CS menu digit (0–9). */
export function isUmkmMenuOnly(text: string): boolean {
    return /^[0-9]$/.test(text.trim());
}

/** Map internal UMKM intent → AIDLC label (telemetry / docs). */
export function toAidlcIntent(intent: UmkmIntent): AidlcUmkmIntent {
    switch (intent) {
        case 'record_sale':
            return 'catat_transaksi';
        case 'check_stock':
        case 'add_stock':
            return 'cek_stok';
        case 'sales_report':
        case 'report_hub':
            return 'laporan';
        case 'list_products':
        case 'ask':
        case 'help':
        case 'menu_hub':
            return 'tanya_umum';
        default:
            return 'lainnya';
    }
}

/** Detect ya/batal reply while a pending sale awaits confirmation. */
export function detectUmkmConfirmReply(
    text: string,
    commands?: UmkmCommandsConfig | unknown,
): 'confirm' | 'cancel' | null {
    const t = text.trim().replace(/^[.!]+|[.!]+$/g, '').trim();
    if (!t) return null;
    const m = matcherFrom(commands);
    if (m.confirmRe?.test(t)) return 'confirm';
    if (m.cancelRe?.test(t)) return 'cancel';
    return null;
}

/** Extract product query from stock-check phrasing. */
export function extractStockProductQuery(text: string): string | null {
    const t = text.trim();
    const patterns = [
        /(?:cek\s+)?stok\s+(?:berapa\s+)?(.+?)(?:\s+berapa)?$/i,
        /berapa\s+stok\s+(.+)$/i,
        /sisa\s+(?:stok|barang)\s+(.+)$/i,
        /stock\s+(.+)$/i,
        /tambah\s+stok\s+(.+)$/i,
    ];
    for (const re of patterns) {
        const m = t.match(re);
        if (!m?.[1]) continue;
        const q = m[1]
            .replace(/\b(berapa|ya|dong|kah|sih|aja|sekarang)\b/gi, '')
            .trim();
        if (q.length >= 2 && !/^(berapa|ada|semua|all)$/i.test(q)) return q;
    }
    return null;
}

/**
 * Advice / open question (tips, bagaimana, menaikkan omzet…) — route to Tanya,
 * not operational commands that share keywords like "omzet" / "penjualan".
 */
export function looksLikeUmkmOpenQuestion(text: string): boolean {
    const t = text.trim();
    if (!t || t.length < 8) return false;
    if (
        /\b(bagaimana|gimana|tips|saran|rekomendasi|strategi|ide|kenapa|mengapa)\b/i.test(t)
    ) {
        return true;
    }
    if (/\b(cara\s+(?:me)?(?:naikkan|ningkatkan|tingkatkan|agar|supaya))\b/i.test(t)) {
        return true;
    }
    if (
        /\b(?:meningkatkan|menaikkan|tingkatkan|naikkan)\b.{0,40}\b(?:omzet|omset|penjualan|laba|pendapatan)\b/i.test(
            t,
        )
    ) {
        return true;
    }
    return false;
}

/** Explicit data lookup — keep sales_report even if phrasing is long. */
export function looksLikeUmkmDirectDataQuery(text: string): boolean {
    const t = text.trim();
    if (!t) return false;
    if (
        /\b(berapa|lihat|tampilkan|cek|show|total|hari\s+ini|minggu\s+ini|bulan\s+ini|rekap|laporan)\b/i.test(
            t,
        )
    ) {
        return true;
    }
    return /^(omzet|omset|laporan|rekap|ringkasan)\b/i.test(t);
}

/** Detect primary UMKM intent from free-text WhatsApp message. */
export function detectUmkmIntent(
    text: string,
    commands?: UmkmCommandsConfig | unknown,
): UmkmIntent {
    const t = text.trim();
    if (!t) return 'unknown';
    const m = matcherFrom(commands);
    const menu = detectUmkmMenuDigit(t, m.commands);
    if (menu) return menu;

    // Advice Q before keyword scan: "cara menaikkan omzet" must not hit sales_report.
    if (looksLikeUmkmOpenQuestion(t) && !looksLikeUmkmDirectDataQuery(t)) {
        return 'ask';
    }

    for (const intent of UMKM_INTENT_DETECT_ORDER) {
        const re = m.intentRegex.get(intent);
        if (re?.test(t)) return intent;
    }
    return 'unknown';
}

/** Greeting-only inbound (no sale/menu payload) — send welcome cheat-sheet before QU. */
export function isUmkmGreetingOnly(text: string): boolean {
    const t = text
        .trim()
        .toLowerCase()
        .replace(/[!.,?…]+$/g, '')
        .trim();
    if (!t) return false;
    if (isUmkmMenuOnly(text)) return false;
    if (looksLikeSaleMessage(text)) return false;
    return /^(halo|hai|hi|hello|hei|hey|selamat\s+(pagi|siang|sore|malam)|assalamu['']?alaikum|assalamualaikum|permisi|ping)(\s+(kak|bos|min|admin|semua))?$/.test(
        t,
    );
}

/** True if text looks like a sale message (for heuristic parser gate). */
export function looksLikeSaleMessage(
    text: string,
    commands?: UmkmCommandsConfig | unknown,
): boolean {
    const m = matcherFrom(commands);
    return !!m.intentRegex.get('record_sale')?.test(text);
}

/** 2.5 / 2,5 → decimal; 15.000 / 15000 → integer thousands separator. */
function parseIndonesianDecimal(numPart: string): number {
    const compact = numPart.trim();
    if (/^\d+[.,]\d{1,2}$/.test(compact)) {
        return parseFloat(compact.replace(',', '.'));
    }
    return parseFloat(compact.replace(/\./g, '').replace(',', '.'));
}

/** Parse Indonesian rupiah shorthand: 15rb, 2.5jt, Rp 15000. */
export function parseRupiahToken(raw: string): number | null {
    const s = raw.trim().toLowerCase().replace(/rp\.?|idr/gi, '').replace(/\s/g, '');
    if (!s) return null;

    const jt = s.match(/^([\d.,]+)\s*jt$/);
    if (jt) {
        const n = parseIndonesianDecimal(jt[1]);
        return Number.isFinite(n) ? Math.round(n * 1_000_000) : null;
    }

    const rb = s.match(/^([\d.,]+)\s*rb$/);
    if (rb) {
        const n = parseIndonesianDecimal(rb[1]);
        return Number.isFinite(n) ? Math.round(n * 1_000) : null;
    }

    const plain = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(plain);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n);
}

/** Extract all monetary values from text (ordered). */
export function extractRupiahAmounts(text: string): number[] {
    const amounts: number[] = [];
    const patterns = [
        /(?:rp\.?\s*|idr\s*)?([\d][\d.,]*)\s*(?:rb|ribu|jt|juta)\b/gi,
        /(?:rp\.?\s*|idr\s*)([\d][\d.,]*)/gi,
        /(?:total|bayar|harga|@)\s*:?\s*([\d][\d.,]*)\s*(?:rb|ribu|jt|juta)?/gi,
        /(?:^|\s)([\d]{4,})(?:\s|$)/g,
    ];
    for (const re of patterns) {
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
            const token = m[0].includes('rb') || m[0].includes('ribu') || m[0].includes('jt') || m[0].includes('juta')
                ? m[0]
                : m[1];
            const val = parseRupiahToken(token);
            if (val && val > 0) amounts.push(val);
        }
    }
    return [...new Set(amounts)];
}

/** Rule-based sale parser for common UMKM WhatsApp patterns. */
export function parseSaleHeuristic(
    text: string,
    commands?: UmkmCommandsConfig | unknown,
): ParsedUmkmSale | null {
    const raw = text.trim();
    if (!raw || !looksLikeSaleMessage(raw, commands)) return null;

    const paymentMatch = raw.match(/\b(tunai|cash|transfer|qris|debit|kredit|cod)\b/i);
    const paymentMethod = paymentMatch ? paymentMatch[1].toLowerCase() : undefined;

    const customerMatch = raw.match(
        /(?:pelanggan|customer|nama)\s*:?\s*([a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s]{1,40})/i,
    );
    const customerName = customerMatch ? customerMatch[1].trim() : undefined;

    const amounts = extractRupiahAmounts(raw);
    const items: UmkmSaleItem[] = [];

    const itemPatterns = [
        /(\d+)\s+([a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s\-]{1,50}?)(?:\s+@|\s+(?:rp|idr)?\s*[\d.,]+|\s+(?:tunai|transfer|total)|\s*$)/gi,
        /(?:jual|jualan|catat)\s+(\d+)\s+([a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s\-]{1,50})/gi,
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

    const seen = new Set<string>();
    const uniqueItems = items.filter((it) => {
        const key = `${it.quantity}:${it.name.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    items.length = 0;
    items.push(...uniqueItems);

    if (items.length > 1) {
        const primary = items.reduce((best, it) =>
            it.name.length >= best.name.length ? it : best,
        );
        items.length = 0;
        items.push(primary);
    }

    if (items.length === 0) {
        const nameOnly = raw.match(
            /(?:jual|jualan|catat|order)\s+([a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s\-]{2,50})/i,
        );
        if (nameOnly) {
            items.push({ name: nameOnly[1].trim(), quantity: 1, unitPrice: 0 });
        }
    }

    if (items.length === 0) return null;

    const totalExplicit = raw.match(/(?:total|bayar|harga)\s*:?\s*(?:rp\.?\s*)?([\d][\d.,]*\s*(?:rb|ribu|jt|juta)?)/i);
    let totalAmount = 0;
    if (totalExplicit) {
        const t = parseRupiahToken(totalExplicit[1]);
        if (t) totalAmount = t;
    } else if (amounts.length === 1) {
        totalAmount = amounts[0];
    } else if (amounts.length >= items.length) {
        for (let i = 0; i < items.length; i++) {
            /* v8 ignore next -- amounts are pre-filtered to be > 0 and i < items.length <= amounts.length, so `|| 0` never triggers */
            items[i].unitPrice = amounts[i] || 0;
        }
        totalAmount = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    }
    /* v8 ignore start -- unreachable: items is always reduced to a single item before here, so amounts.length (>0) is always >= items.length and handled above */
    else if (amounts.length > 0) {
        totalAmount = amounts[amounts.length - 1];
    }
    /* v8 ignore stop */

    if (totalAmount <= 0) {
        return null;
    }

    if (items.every((it) => it.unitPrice === 0)) {
        const perItem = Math.round(totalAmount / items.reduce((s, it) => s + it.quantity, 0));
        for (const it of items) {
            it.unitPrice = perItem;
        }
    }

    for (const it of items) {
        if (it.unitPrice <= 0) {
            it.unitPrice = Math.round(totalAmount / it.quantity);
        }
    }

    return {
        items,
        totalAmount,
        customerName,
        paymentMethod,
        notes: raw.length > 200 ? raw.slice(0, 200) : undefined,
    };
}

export function formatIdr(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatSaleConfirmation(order: {
    orderNumber: string;
    totalAmount: number;
    items: UmkmSaleItem[];
    paymentMethod?: string;
}): string {
    const lines = [
        '✅ Penjualan tercatat!',
        `No. order: *${order.orderNumber}*`,
        `Total: *${formatIdr(order.totalAmount)}*`,
    ];
    if (order.items.length) {
        lines.push('Item:');
        for (const it of order.items) {
            lines.push(`• ${it.quantity}x ${it.name} — ${formatIdr(it.quantity * it.unitPrice)}`);
        }
    }
    if (order.paymentMethod) {
        lines.push(`Pembayaran: ${order.paymentMethod}`);
    }
    lines.push('');
    lines.push('Ketik *laporan* untuk rekap hari ini, atau *bantuan* untuk menu.');
    return lines.join('\n');
}

/** Preview before commit (AIDLC: konfirmasi wajib sebelum simpan). */
export function formatSalePreview(
    sale: {
        totalAmount: number;
        items: UmkmSaleItem[];
        paymentMethod?: string;
        customerName?: string;
    },
    commands?: UmkmCommandsConfig | unknown,
): string {
    const cfg = resolveUmkmCommands(commands ?? DEFAULT_UMKM_COMMANDS);
    const confirmHint = (cfg.confirm[0] || 'ya');
    const cancelHint = (cfg.cancel[0] || 'batal');
    const lines = ['📋 *Konfirmasi penjualan*', ''];
    if (sale.items.length) {
        lines.push('Item:');
        for (const it of sale.items) {
            lines.push(`• ${it.quantity}x ${it.name} — ${formatIdr(it.quantity * it.unitPrice)}`);
        }
    }
    lines.push(`Total: *${formatIdr(sale.totalAmount)}*`);
    if (sale.paymentMethod) lines.push(`Pembayaran: ${sale.paymentMethod}`);
    if (sale.customerName) lines.push(`Pelanggan: ${sale.customerName}`);
    lines.push('');
    lines.push(`Benar? Ketik *${confirmHint}* untuk simpan, atau *${cancelHint}* untuk batalkan.`);
    return lines.join('\n');
}

export function formatSaleCancelled(commands?: UmkmCommandsConfig | unknown): string {
    const cfg = resolveUmkmCommands(commands ?? DEFAULT_UMKM_COMMANDS);
    /* v8 ignore next -- resolveUmkmCommands() always defines keywords.record_sale; the `|| []` is a type-guard */
    const saleKw = (cfg.keywords.record_sale || [])[0] || 'jual';
    const saleDigit = cfg.menu.find((m) => m.intent === 'record_sale')?.digit;
    const helpDigit = cfg.menu.find((m) => m.intent === 'help')?.digit;
    /* v8 ignore next -- resolveUmkmCommands() always defines keywords.help; the `|| []` is a type-guard */
    const helpKw = (cfg.keywords.help || [])[0] || 'bantuan';
    const saleHint = saleDigit ? `*${saleKw} ...* / *${saleDigit}*` : `*${saleKw} ...*`;
    const helpHint = helpDigit ? `*${helpDigit}* / *${helpKw}*` : `*${helpKw}*`;
    return `❌ Penjualan dibatalkan. Ketik ${saleHint} untuk catat ulang, atau ${helpHint} untuk menu.`;
}

/** Prompt after user picks menu catat penjualan without sale details. */
export function formatRecordSaleMenuPrompt(commands?: UmkmCommandsConfig | unknown): string {
    const cfg = resolveUmkmCommands(commands ?? DEFAULT_UMKM_COMMANDS);
    /* v8 ignore next -- resolveUmkmCommands() always defines keywords.record_sale; the `|| []` is a type-guard */
    const saleKw = (cfg.keywords.record_sale || [])[0] || 'jual';
    const confirmHint = cfg.confirm.slice(0, 2).map((c) => `*${c}*`).join(' / ') || '*ya*';
    const cancelHint = cfg.cancel.slice(0, 2).map((c) => `*${c}*`).join(' / ') || '*batal*';
    const helpDigit = cfg.menu.find((m) => m.intent === 'help')?.digit;
    const label = cfg.menu.find((m) => m.intent === 'record_sale')?.label || 'Catat penjualan';
    return [
        `🛒 *${label}*`,
        '',
        'Kirim detail transaksi, contoh:',
        `• ${saleKw} 2 mie ayam 30000`,
        `• ${saleKw} 1 bakso 15000 tunai`,
        '',
        `Setelah preview, ketik ${confirmHint} untuk simpan, atau ${cancelHint}.`,
        helpDigit ? `Ketik *${helpDigit}* untuk kembali ke menu.` : '',
    ]
        .filter(Boolean)
        .join('\n');
}

/** Short reply when free-text command is not recognized. */
export function formatUnknownUmkmCommand(commands?: UmkmCommandsConfig | unknown): string {
    const cfg = resolveUmkmCommands(commands ?? DEFAULT_UMKM_COMMANDS);
    const menu = uniqueMenuForDisplay(cfg);
    const lines = ['🤔 Perintah belum dikenali.', '', 'Balas angka menu, atau ketik perintah:'];
    for (const m of menu) {
        lines.push(`*${m.digit}* ${m.label}`);
    }
    if (menu.length === 0) {
        for (const intent of ['record_sale', 'check_stock', 'list_products', 'sales_report', 'help'] as const) {
            /* v8 ignore next -- resolveUmkmCommands() always defines each intent's keyword list; the `|| []` is a type-guard */
            const kw = (cfg.keywords[intent] || [])[0];
            if (kw) lines.push(`• *${kw}*`);
        }
    }
    return lines.join('\n');
}

export function formatUmkmHelp(commands?: UmkmCommandsConfig | unknown): string {
    const cfg = resolveUmkmCommands(commands ?? DEFAULT_UMKM_COMMANDS);
    const menu = uniqueMenuForDisplay(cfg);
    const lines = ['📒 *Asisten Penjualan UMKM*', ''];
    if (menu.length) {
        lines.push('*Menu* — balas angka:');
        for (const m of menu) {
            lines.push(`*${m.digit}* ${m.label}`);
        }
        lines.push('');
    }
    lines.push('*Atau ketik kalimat* — contoh:');
    /* v8 ignore next -- resolveUmkmCommands() always defines keywords.record_sale; the `|| []` is a type-guard */
    const saleKw = (cfg.keywords.record_sale || [])[0];
    if (saleKw) lines.push(`• ${saleKw} 3 es kopi 45000`);
    /* v8 ignore next -- keywords.check_stock is always defined; the `|| []` is a type-guard */
    const stockKw = (cfg.keywords.check_stock || [])[0];
    if (stockKw) lines.push(`• ${stockKw} gula`);
    /* v8 ignore next -- keywords.list_products is always defined; the `|| []` is a type-guard */
    const listKw = (cfg.keywords.list_products || [])[0];
    if (listKw) lines.push(`• ${listKw}`);
    /* v8 ignore next -- keywords.sales_report is always defined; the `|| []` is a type-guard */
    const reportKw = (cfg.keywords.sales_report || [])[0];
    if (reportKw) lines.push(`• ${reportKw}`);
    lines.push('');
    const confirmHint = cfg.confirm.slice(0, 2).map((c) => `*${c}*`).join(' / ') || '*ya*';
    const cancelHint = cfg.cancel.slice(0, 2).map((c) => `*${c}*`).join(' / ') || '*batal*';
    lines.push(`Setelah preview penjualan: ${confirmHint} = simpan, ${cancelHint} = batalkan.`);
    return lines.join('\n');
}

export function formatDailyReportWa(report: UmkmDailyReport): string {
    const lines = [
        `📊 *Laporan Penjualan*`,
        `Tanggal: ${report.salesDate}`,
        '',
        `Order hari ini: *${report.orderCount}* (${report.paidOrderCount} lunas)`,
        `Omzet kotor: *${formatIdr(report.revenueGross)}*`,
        `Omzet terbayar: *${formatIdr(report.revenuePaid)}*`,
    ];

    if (report.topProducts.length > 0) {
        lines.push('', '*Produk terlaris hari ini:*');
        for (const p of report.topProducts.slice(0, 5)) {
            lines.push(`• ${p.name} — ${p.unitsSold} pcs (${formatIdr(p.revenue)})`);
        }
    }

    if (report.recentOrders.length > 0) {
        lines.push('', '*Order terbaru:*');
        for (const o of report.recentOrders.slice(0, 3)) {
            const name = o.customerName || 'Pelanggan';
            lines.push(`• ${o.orderNumber}: ${name} — ${formatIdr(o.totalAmount)}`);
        }
    }

    lines.push('', 'Ketik *jual ...* untuk catat penjualan baru.');
    return lines.join('\n');
}

/** Generate unique WA order number: WA-YYYYMMDD-HHMMSS-XXXX */
export function generateWaOrderNumber(now = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `WA-${date}-${time}-${rand}`;
}

/** Parse JSON sale object from LLM response (strips markdown fences). */
export function parseSaleJsonFromLlm(raw: string): ParsedUmkmSale | null {
    const trimmed = raw.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonText = fenced ? fenced[1].trim() : trimmed;
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start < 0 || end <= start) return null;

    try {
        const obj = JSON.parse(jsonText.slice(start, end + 1)) as {
            items?: { name?: string; quantity?: number; unitPrice?: number }[];
            totalAmount?: number;
            customerName?: string | null;
            paymentMethod?: string | null;
            notes?: string | null;
        };
        const items: UmkmSaleItem[] = (obj.items || [])
            .map((it) => ({
                name: String(it.name || '').trim(),
                quantity: Math.max(1, Number(it.quantity) || 1),
                unitPrice: Math.max(0, Number(it.unitPrice) || 0),
            }))
            .filter((it) => it.name.length > 0);

        let totalAmount = Number(obj.totalAmount) || 0;
        if (totalAmount <= 0 && items.length) {
            totalAmount = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
        }
        if (totalAmount <= 0 || items.length === 0) return null;

        if (items.every((it) => it.unitPrice === 0)) {
            const per = Math.round(totalAmount / items.reduce((s, it) => s + it.quantity, 0));
            for (const it of items) it.unitPrice = per;
        }

        return {
            items,
            totalAmount,
            customerName: obj.customerName ? String(obj.customerName).trim() : undefined,
            paymentMethod: obj.paymentMethod ? String(obj.paymentMethod).trim() : undefined,
            notes: obj.notes ? String(obj.notes).trim() : undefined,
        };
    } catch {
        return null;
    }
}
