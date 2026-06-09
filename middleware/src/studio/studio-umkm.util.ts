/** UMKM WhatsApp — intent detection, sale parsing helpers, report formatting. */

export type UmkmIntent = 'record_sale' | 'sales_report' | 'list_products' | 'help' | 'unknown';

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

const RECORD_KEYWORDS =
    /\b(jual|jualan|catat|order|pesan|beli|transaksi|terjual|sold)\b/i;
const REPORT_KEYWORDS =
    /\b(laporan|rekap|omzet|report|summary|ringkas|penjualan\s+hari\s+ini|hari\s+ini)\b/i;
const HELP_KEYWORDS = /\b(bantuan|help|menu|panduan|cara\s+pakai)\b/i;
const LIST_PRODUCTS_KEYWORDS =
    /\b(daftar\s+barang|daftar\s+produk|list\s+produk|list\s+barang|katalog|catalog|produk\s+apa\s+saja)\b/i;

/** Detect primary UMKM intent from free-text WhatsApp message. */
export function detectUmkmIntent(text: string): UmkmIntent {
    const t = text.trim();
    if (!t) return 'unknown';
    if (LIST_PRODUCTS_KEYWORDS.test(t)) return 'list_products';
    if (HELP_KEYWORDS.test(t) && !RECORD_KEYWORDS.test(t) && !REPORT_KEYWORDS.test(t)) {
        return 'help';
    }
    if (REPORT_KEYWORDS.test(t) && !RECORD_KEYWORDS.test(t)) return 'sales_report';
    if (RECORD_KEYWORDS.test(t)) return 'record_sale';
    if (REPORT_KEYWORDS.test(t)) return 'sales_report';
    return 'unknown';
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
export function parseSaleHeuristic(text: string): ParsedUmkmSale | null {
    const raw = text.trim();
    if (!raw || !RECORD_KEYWORDS.test(raw)) return null;

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
            items[i].unitPrice = amounts[i] || 0;
        }
        totalAmount = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    } else if (amounts.length > 0) {
        totalAmount = amounts[amounts.length - 1];
    }

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

export function formatUmkmHelp(): string {
    return [
        '📒 *Asisten Penjualan UMKM*',
        '',
        '*Catat penjualan* — contoh:',
        '• jual 3 es kopi 45000',
        '• catat 2 tas total 500rb tunai',
        '• order: pelanggan Budi, 1 sabun 25000 transfer',
        '',
        '*Daftar barang* — ketik:',
        '• daftar barang',
        '',
        '*Laporan* — contoh:',
        '• laporan hari ini',
        '• rekap omzet',
        '',
        'Ketik pesan penjualan, *daftar barang*, atau *laporan* kapan saja.',
    ].join('\n');
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
