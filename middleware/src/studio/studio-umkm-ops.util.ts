/** UMKM ops helpers — date ranges, purchase / product / stock parsing. */

export type UmkmReportPeriod = 'today' | 'week' | 'month' | 'all';

export type ParsedUmkmPurchaseItem = {
    name: string;
    quantity: number;
    unitCost: number;
};

export type ParsedUmkmPurchase = {
    items: ParsedUmkmPurchaseItem[];
    totalCost: number;
    purchaseDate: string; // YYYY-MM-DD
    supplierName?: string;
    notes?: string;
};

export type ParsedAddProduct = {
    name: string;
    sellingPrice: number;
    costPrice?: number;
};

export type ParsedAddStock = {
    productQuery: string;
    quantity: number;
};

/** Asia/Jakarta calendar helpers (approx via UTC+7 offset). */
export function jakartaDateParts(d = new Date()): { y: number; m: number; day: number } {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const parts = fmt.formatToParts(d);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
    return { y: get('year'), m: get('month'), day: get('day') };
}

export function toIsoDate(y: number, m: number, day: number): string {
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function periodRange(period: UmkmReportPeriod, now = new Date()): {
    label: string;
    from: string | null;
    to: string | null;
} {
    const { y, m, day } = jakartaDateParts(now);
    const today = toIsoDate(y, m, day);
    if (period === 'today') {
        return { label: 'hari ini', from: `${today}T00:00:00+07:00`, to: `${today}T23:59:59.999+07:00` };
    }
    if (period === 'month') {
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
        const from = toIsoDate(y, m, 1);
        const to = toIsoDate(y, m, lastDay);
        return { label: 'bulan ini', from: `${from}T00:00:00+07:00`, to: `${to}T23:59:59.999+07:00` };
    }
    if (period === 'week') {
        // Monday-start week in Jakarta
        const utcApprox = new Date(`${today}T12:00:00+07:00`);
        const dow = utcApprox.getUTCDay(); // 0 Sun
        const offset = dow === 0 ? 6 : dow - 1;
        const start = new Date(utcApprox);
        start.setUTCDate(start.getUTCDate() - offset);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 6);
        const s = jakartaDateParts(start);
        const e = jakartaDateParts(end);
        const from = toIsoDate(s.y, s.m, s.day);
        const to = toIsoDate(e.y, e.m, e.day);
        return { label: 'minggu ini', from: `${from}T00:00:00+07:00`, to: `${to}T23:59:59.999+07:00` };
    }
    return { label: 'semua waktu', from: null, to: null };
}

export function detectReportPeriod(text: string): UmkmReportPeriod | null {
    const t = text.trim().toLowerCase();
    if (/^(1|hari(\s+ini)?|today)$/i.test(t) || /\bhari\s+ini\b/i.test(t)) return 'today';
    if (/^(2|minggu(\s+ini)?|week)$/i.test(t) || /\bminggu\s+ini\b/i.test(t)) return 'week';
    if (/^(3|bulan(\s+ini)?|month)$/i.test(t) || /\bbulan\s+ini\b/i.test(t)) return 'month';
    if (/^(4|semua|all)$/i.test(t) || /\bsemua\b/i.test(t)) return 'all';
    return null;
}

export function parseIndonesianDate(raw: string): string | null {
    const t = raw.trim();
    const iso = t.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dmy = t.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})\b/);
    if (dmy) {
        return toIsoDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
    }
    if (/hari\s+ini|today/i.test(t)) {
        const p = jakartaDateParts();
        return toIsoDate(p.y, p.m, p.day);
    }
    return null;
}

function parseMoneyToken(raw: string): number | null {
    const s = raw.trim().toLowerCase().replace(/rp\.?|idr/gi, '').replace(/\s/g, '');
    if (!s) return null;
    const rb = s.match(/^([\d.,]+)\s*rb$/);
    if (rb) {
        const n = parseFloat(rb[1].replace(/\./g, '').replace(',', '.'));
        return Number.isFinite(n) ? Math.round(n * 1000) : null;
    }
    const plain = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(plain) && plain > 0 ? Math.round(plain) : null;
}

/** Parse: tambah menu mie ayam 15000 [modal 10000] */
export function parseAddProductMessage(text: string): ParsedAddProduct | null {
    const t = text
        .trim()
        .replace(/^(tambah\s+menu|tambah\s+barang|tambah\s+produk|buat\s+menu|menu\s+baru)\s*/i, '')
        .trim();
    if (!t || /^[0-9]$/.test(t)) return null;

    const costMatch = t.match(/(?:modal|hpp|cost)\s*:?\s*([\d.,]+(?:\s*rb)?)/i);
    const costPrice = costMatch ? parseMoneyToken(costMatch[1]) || undefined : undefined;
    const withoutCost = costMatch ? t.replace(costMatch[0], '').trim() : t;

    const priceMatch = withoutCost.match(/(?:@|harga|rp\.?\s*)?\s*([\d][\d.,]*(?:\s*rb)?)\s*$/i);
    let sellingPrice = 0;
    let name = withoutCost;
    if (priceMatch) {
        sellingPrice = parseMoneyToken(priceMatch[1]) || 0;
        name = withoutCost.slice(0, priceMatch.index).trim();
    }
    name = name.replace(/[,\-–]+$/, '').trim();
    if (name.length < 2) return null;
    if (sellingPrice <= 0) {
        // allow name-only; price 0
        sellingPrice = 0;
    }
    return { name, sellingPrice, costPrice };
}

/** Parse: tambah stok mie ayam 10 */
export function parseAddStockMessage(text: string): ParsedAddStock | null {
    let t = text
        .trim()
        .replace(/^(tambah\s+stok|stok\s+masuk|isi\s+stok|restok)\s*/i, '')
        .trim();
    if (!t || /^[0-9]$/.test(t)) return null;

    const qtyEnd = t.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*$/);
    if (qtyEnd) {
        return {
            productQuery: qtyEnd[1].trim(),
            quantity: parseFloat(qtyEnd[2].replace(',', '.')),
        };
    }
    const qtyStart = t.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
    if (qtyStart) {
        return {
            productQuery: qtyStart[2].trim(),
            quantity: parseFloat(qtyStart[1].replace(',', '.')),
        };
    }
    return null;
}

/**
 * Parse belanja: "belanja 2026-07-18 10 mie ayam @5000, 5 bakso 3000"
 * or "tambah belanja 2 gula 12000"
 */
export function parsePurchaseHeuristic(text: string): ParsedUmkmPurchase | null {
    let raw = text.trim();
    if (!raw) return null;
    raw = raw.replace(/^(tambah\s+belanja|catat\s+belanja|belanja)\s*/i, '').trim();
    if (!raw || /^[0-9]$/.test(raw)) return null;

    const date = parseIndonesianDate(raw) || (() => {
        const p = jakartaDateParts();
        return toIsoDate(p.y, p.m, p.day);
    })();
    raw = raw
        .replace(/\b(20\d{2})-(\d{2})-(\d{2})\b/, '')
        .replace(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})\b/, '')
        .replace(/\bhari\s+ini\b/gi, '')
        .trim();

    const supplierMatch = raw.match(/(?:supplier|toko|dari)\s*:?\s*([a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s]{1,40})/i);
    const supplierName = supplierMatch ? supplierMatch[1].trim() : undefined;
    if (supplierMatch) raw = raw.replace(supplierMatch[0], '').trim();

    const items: ParsedUmkmPurchaseItem[] = [];
    const chunks = raw.split(/,|;|\n/).map((c) => c.trim()).filter(Boolean);
    const sources = chunks.length ? chunks : [raw];

    for (const chunk of sources) {
        const m =
            chunk.match(
                /(\d+(?:[.,]\d+)?)\s+([a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s\-]{1,50}?)\s*(?:@|rp\.?\s*)?\s*([\d.,]+(?:\s*rb)?)/i,
            ) ||
            chunk.match(
                /([a-zA-Z\u00C0-\u024F][\w\u00C0-\u024F\s\-]{1,50}?)\s+(\d+(?:[.,]\d+)?)\s*(?:@|rp\.?\s*)?\s*([\d.,]+(?:\s*rb)?)/i,
            );
        if (!m) continue;
        let qty: number;
        let name: string;
        let costRaw: string;
        if (/^\d/.test(m[1])) {
            qty = parseFloat(m[1].replace(',', '.'));
            name = m[2].trim();
            costRaw = m[3];
        } else {
            name = m[1].trim();
            qty = parseFloat(m[2].replace(',', '.'));
            costRaw = m[3];
        }
        const unitCost = parseMoneyToken(costRaw) || 0;
        if (!Number.isFinite(qty) || qty <= 0 || name.length < 2) continue;
        items.push({ name, quantity: qty, unitCost });
    }

    if (items.length === 0) return null;
    const totalCost = items.reduce((s, it) => s + it.quantity * it.unitCost, 0);
    return { items, totalCost, purchaseDate: date, supplierName };
}

export function generatePurchaseNumber(d = new Date()): string {
    const p = jakartaDateParts(d);
    const stamp = `${p.y}${String(p.m).padStart(2, '0')}${String(p.day).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `BL-${stamp}-${rand}`;
}

export function formatIdrShort(n: number): string {
    return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}
