/** Product catalog matching for UMKM sales (inv_items). */

export type UmkmCatalogProduct = {
    id: string;
    name: string;
    sku: string | null;
    sellingPrice: number;
};

export type UmkmSaleItemResolved = {
    name: string;
    quantity: number;
    unitPrice: number;
    itemId?: string;
    itemSku?: string;
    catalogMatched: boolean;
    catalogName?: string;
};

export function normalizeProductName(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\u00C0-\u024F\s-]/g, '');
}

/** Score how well query matches catalog product (higher = better). */
export function scoreProductMatch(query: string, product: UmkmCatalogProduct): number {
    const q = normalizeProductName(query);
    const name = normalizeProductName(product.name);
    const sku = (product.sku || '').toLowerCase().trim();
    if (!q) return 0;
    if (sku && q === sku) return 100;
    if (q === name) return 95;
    if (name.includes(q) || q.includes(name)) return 70 + Math.min(name.length, q.length) * 0.1;
    const qTokens = q.split(/\s+/).filter((t) => t.length > 1);
    const nameTokens = new Set(name.split(/\s+/));
    if (qTokens.length === 0) return 0;
    const overlap = qTokens.filter((t) => nameTokens.has(t) || name.includes(t)).length;
    return overlap >= 1 ? 40 + overlap * 10 : 0;
}

export function findBestProductMatch(
    query: string,
    products: UmkmCatalogProduct[],
    minScore = 55,
): UmkmCatalogProduct | null {
    let best: UmkmCatalogProduct | null = null;
    let bestScore = 0;
    for (const p of products) {
        const s = scoreProductMatch(query, p);
        if (s > bestScore) {
            bestScore = s;
            best = p;
        }
    }
    return bestScore >= minScore ? best : null;
}

export function resolveSaleItemsAgainstCatalog(
    items: { name: string; quantity: number; unitPrice: number }[],
    products: UmkmCatalogProduct[],
): UmkmSaleItemResolved[] {
    return items.map((it) => {
        const match = findBestProductMatch(it.name, products);
        if (!match) {
            return {
                name: it.name,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                catalogMatched: false,
            };
        }
        const unitPrice =
            it.unitPrice > 0
                ? it.unitPrice
                : match.sellingPrice > 0
                  ? match.sellingPrice
                  : it.unitPrice;
        return {
            name: match.name,
            quantity: it.quantity,
            unitPrice,
            itemId: match.id,
            itemSku: match.sku || undefined,
            catalogMatched: true,
            catalogName: match.name,
        };
    });
}

export function formatProductListWa(
    products: UmkmCatalogProduct[],
    opts?: { maxItems?: number },
): string {
    const max = opts?.maxItems ?? 30;
    if (products.length === 0) {
        return [
            '📦 *Daftar Barang*',
            '',
            'Belum ada produk terdaftar di katalog.',
            'Barang tetap bisa dicatat dengan nama bebas, mis. jual 2 kopi 30000',
        ].join('\n');
    }
    const lines = ['📦 *Daftar Barang*', ''];
    for (const p of products.slice(0, max)) {
        const price =
            p.sellingPrice > 0 ? ` — ${formatIdrShort(p.sellingPrice)}` : '';
        const sku = p.sku ? ` (${p.sku})` : '';
        lines.push(`• ${p.name}${sku}${price}`);
    }
    if (products.length > max) {
        lines.push(`… dan ${products.length - max} produk lainnya`);
    }
    lines.push('', 'Catat penjualan: *jual 2 [nama produk] [total/harga]*');
    return lines.join('\n');
}

function formatIdrShort(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatSaleConfirmationWithCatalog(order: {
    orderNumber: string;
    totalAmount: number;
    items: UmkmSaleItemResolved[];
    paymentMethod?: string;
    unmatchedBlocked?: boolean;
}): string {
    if (order.unmatchedBlocked) {
        const unknown = order.items.filter((i) => !i.catalogMatched).map((i) => i.name);
        return [
            '⚠️ Barang tidak dikenali di katalog:',
            ...unknown.map((n) => `• ${n}`),
            '',
            'Ketik *daftar barang* untuk lihat produk terdaftar,',
            'atau perbaiki nama produk lalu kirim ulang.',
        ].join('\n');
    }

    const lines = [
        '✅ Penjualan tercatat!',
        `No. order: *${order.orderNumber}*`,
        `Total: *${formatIdrShort(order.totalAmount)}*`,
    ];
    if (order.items.length) {
        lines.push('Item:');
        for (const it of order.items) {
            const tag = it.catalogMatched ? '' : ' _(belum di katalog)_';
            const sku = it.itemSku ? ` [${it.itemSku}]` : '';
            lines.push(
                `• ${it.quantity}x ${it.name}${sku} — ${formatIdrShort(it.quantity * it.unitPrice)}${tag}`,
            );
        }
    }
    if (order.paymentMethod) {
        lines.push(`Pembayaran: ${order.paymentMethod}`);
    }
    lines.push('');
    lines.push('Ketik *laporan* atau *daftar barang* untuk menu lain.');
    lines.push('Beri nilai layanan? Ketik *1–5*, *puas*, atau *kurang*.');
    return lines.join('\n');
}

/** Preview ringkasan sebelum commit (AIDLC staging di percakapan). */
export function formatSalePreviewWithCatalog(sale: {
    totalAmount: number;
    items: UmkmSaleItemResolved[];
    paymentMethod?: string;
    customerName?: string;
}): string {
    const lines = ['📋 *Konfirmasi penjualan*', ''];
    if (sale.items.length) {
        lines.push('Item:');
        for (const it of sale.items) {
            const tag = it.catalogMatched ? '' : ' _(belum di katalog)_';
            const sku = it.itemSku ? ` [${it.itemSku}]` : '';
            lines.push(
                `• ${it.quantity}x ${it.name}${sku} — ${formatIdrShort(it.quantity * it.unitPrice)}${tag}`,
            );
        }
    }
    lines.push(`Total: *${formatIdrShort(sale.totalAmount)}*`);
    if (sale.paymentMethod) lines.push(`Pembayaran: ${sale.paymentMethod}`);
    if (sale.customerName) lines.push(`Pelanggan: ${sale.customerName}`);
    lines.push('');
    lines.push('Benar? Ketik *ya* untuk simpan, atau *batal* untuk batalkan.');
    return lines.join('\n');
}

export type UmkmStockRow = {
    name: string;
    sku: string | null;
    available: number;
    onHand: number;
    reserved: number;
};

export function formatStockCheckWa(
    rows: UmkmStockRow[],
    opts?: { query?: string | null; maxItems?: number },
): string {
    const max = opts?.maxItems ?? 20;
    const q = opts?.query?.trim();
    if (rows.length === 0) {
        return [
            '📦 *Cek Stok*',
            '',
            q
                ? `Tidak ditemukan stok untuk *${q}*.`
                : 'Belum ada data stok di ledger.',
            'Ketik *daftar barang* untuk lihat katalog, atau *cek stok [nama]* lagi.',
        ].join('\n');
    }
    const lines = ['📦 *Cek Stok*', ''];
    if (q) lines.push(`Pencarian: *${q}*`, '');
    for (const r of rows.slice(0, max)) {
        const sku = r.sku ? ` [${r.sku}]` : '';
        lines.push(`• ${r.name}${sku} — tersedia *${formatQty(r.available)}* (on hand ${formatQty(r.onHand)})`);
    }
    if (rows.length > max) {
        lines.push(`… dan ${rows.length - max} item lainnya`);
    }
    return lines.join('\n');
}

function formatQty(n: number): string {
    if (Number.isInteger(n)) return String(n);
    return String(Math.round(n * 1000) / 1000);
}
