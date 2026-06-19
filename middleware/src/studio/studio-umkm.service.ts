import { Injectable, Logger } from '@nestjs/common';
import { ClaudeAiService } from '../ai/claude-ai.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
    DEFAULT_STUDIO_SALES_CONTEXT,
    type StudioContextConfig,
} from './studio-db-context.service';
import {
    detectUmkmIntent,
    formatDailyReportWa,
    formatUmkmHelp,
    formatUnknownUmkmCommand,
    generateWaOrderNumber,
    parseSaleHeuristic,
    parseSaleJsonFromLlm,
    type ParsedUmkmSale,
    type UmkmDailyReport,
    type UmkmIntent,
} from './studio-umkm.util';
import {
    formatProductListWa,
    formatSaleConfirmationWithCatalog,
    resolveSaleItemsAgainstCatalog,
    type UmkmCatalogProduct,
    type UmkmSaleItemResolved,
} from './studio-umkm-product.util';
import { assertNoSupabaseError } from './studio-supabase.util';

const DEFAULT_TENANT = 'default';

export const DEFAULT_STUDIO_UMKM_CONTEXT: StudioContextConfig = {
    umkm_mode: true,
    audience: 'customer',
    tenant_id: DEFAULT_TENANT,
    supabase_views: DEFAULT_STUDIO_SALES_CONTEXT.supabase_views,
};

@Injectable()
export class StudioUmkmService {
    private readonly logger = new Logger(StudioUmkmService.name);

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly claudeAi: ClaudeAiService,
    ) {}

    private admin() {
        return this.supabaseService.getAdminClient();
    }

    isUmkmMode(config: StudioContextConfig): boolean {
        return config.umkm_mode === true;
    }

    resolveTenantId(config: StudioContextConfig): string {
        const tid = config.tenant_id;
        return typeof tid === 'string' && tid.trim() ? tid.trim() : DEFAULT_TENANT;
    }

    detectIntent(text: string): UmkmIntent {
        return detectUmkmIntent(text);
    }

    /**
     * Handle UMKM message when not using guided flow.
     * Returns null when intent is unknown (caller should fall back to generic chat).
     */
    async handleMessage(
        text: string,
        tenantId = DEFAULT_TENANT,
        phone?: string,
        config?: StudioContextConfig,
    ): Promise<string | null> {
        const intent = detectUmkmIntent(text);
        switch (intent) {
            case 'record_sale':
                return this.recordSaleFromText(text, tenantId, phone, config);
            case 'sales_report':
                return this.buildDailyReportMessage(tenantId);
            case 'list_products':
                return this.buildProductListMessage(tenantId);
            case 'help':
                return formatUmkmHelp();
            default:
                return formatUnknownUmkmCommand();
        }
    }

    async fetchActiveProducts(tenantId = DEFAULT_TENANT): Promise<UmkmCatalogProduct[]> {
        const { data, error } = await this.admin()
            .from('inv_items')
            .select('id, name, sku, selling_price')
            .eq('tenant_id', tenantId)
            .eq('status', 'active')
            .order('name');
        if (error) {
            this.logger.warn(`fetchActiveProducts: ${error.message}`);
            return [];
        }
        return (data || []).map((row: any) => ({
            id: String(row.id),
            name: String(row.name || ''),
            sku: row.sku ? String(row.sku) : null,
            sellingPrice: Number(row.selling_price ?? 0),
        }));
    }

    async buildProductListMessage(tenantId = DEFAULT_TENANT): Promise<string> {
        const products = await this.fetchActiveProducts(tenantId);
        return formatProductListWa(products);
    }

    async recordSaleFromText(
        text: string,
        tenantId = DEFAULT_TENANT,
        phone?: string,
        config?: StudioContextConfig,
    ): Promise<string> {
        const parsed = await this.parseSaleMessage(text);
        if (!parsed) {
            return [
                'Maaf, saya belum bisa memahami detail penjualannya.',
                '',
                'Contoh format:',
                '• jual 3 es kopi 45000',
                '• catat 2 tas total 500rb tunai',
                '• order pelanggan Budi 1 sabun 25000 transfer',
                '',
                'Ketik *daftar barang* untuk lihat produk terdaftar.',
            ].join('\n');
        }

        const products = await this.fetchActiveProducts(tenantId);
        const resolved = resolveSaleItemsAgainstCatalog(parsed.items, products);
        const requireMatch = config?.umkm_require_catalog_match === true;
        const hasUnmatched = resolved.some((i) => !i.catalogMatched);

        if (requireMatch && hasUnmatched && products.length > 0) {
            return formatSaleConfirmationWithCatalog({
                orderNumber: '',
                totalAmount: 0,
                items: resolved,
                unmatchedBlocked: true,
            });
        }

        const saleForSave: ParsedUmkmSale = {
            ...parsed,
            totalAmount: resolved.reduce((s, i) => s + i.quantity * i.unitPrice, 0) || parsed.totalAmount,
            items: resolved.map((i) => ({
                name: i.name,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
            })),
        };

        const order = await this.saveSale(tenantId, saleForSave, phone, resolved);
        return formatSaleConfirmationWithCatalog({
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            items: resolved,
            paymentMethod: parsed.paymentMethod,
        });
    }

    async parseSaleMessage(text: string): Promise<ParsedUmkmSale | null> {
        const heuristic = parseSaleHeuristic(text);
        if (heuristic) return heuristic;

        const llm = await this.parseSaleWithLlm(text);
        if (llm) return llm;

        return null;
    }

    private async parseSaleWithLlm(text: string): Promise<ParsedUmkmSale | null> {
        const prompt = [
            'Ekstrak data penjualan dari pesan WhatsApp UMKM (Bahasa Indonesia).',
            'Balas HANYA JSON valid tanpa penjelasan:',
            '{"items":[{"name":"string","quantity":number,"unitPrice":number}],"totalAmount":number,"customerName":string|null,"paymentMethod":string|null,"notes":string|null}',
            'unitPrice dan totalAmount dalam Rupiah (angka bulat, tanpa titik pemisah ribuan).',
            'Jika hanya total disebutkan, bagi merata ke item.',
            '',
            `Pesan: ${text}`,
        ].join('\n');

        try {
            const raw = await this.claudeAi.generateText(prompt);
            if (raw.includes('not configured') || raw.includes('request failed')) {
                return null;
            }
            return parseSaleJsonFromLlm(raw);
        } catch (e: any) {
            this.logger.warn(`LLM sale parse failed: ${e?.message}`);
            return null;
        }
    }

    async saveSale(
        tenantId: string,
        sale: ParsedUmkmSale,
        phone?: string,
        resolvedItems?: UmkmSaleItemResolved[],
    ): Promise<{ orderNumber: string; totalAmount: number; orderId: string }> {
        const orderNumber = generateWaOrderNumber();
        const subtotal = sale.totalAmount;
        const isPaid = sale.paymentMethod
            ? /tunai|cash|transfer|qris|debit|paid|lunas/i.test(sale.paymentMethod)
            : false;

        const { data: order, error } = await this.admin()
            .from('ecom_orders')
            .insert({
                tenant_id: tenantId,
                order_number: orderNumber,
                customer_name: sale.customerName || (phone ? `WA ${phone}` : 'Pelanggan WA'),
                customer_phone: phone || null,
                subtotal,
                total_amount: subtotal,
                paid_amount: isPaid ? subtotal : 0,
                payment_method: sale.paymentMethod || null,
                payment_status: isPaid ? 'paid' : 'unpaid',
                notes: sale.notes || null,
                source: 'api',
                status: 'completed',
                completed_at: new Date().toISOString(),
            })
            .select('id, order_number, total_amount')
            .single();

        assertNoSupabaseError(error, 'Failed to record UMKM sale');

        for (let i = 0; i < sale.items.length; i++) {
            const item = sale.items[i];
            const resolved = resolvedItems?.[i];
            const lineSubtotal = item.quantity * item.unitPrice;
            const sku =
                resolved?.itemSku ||
                `WA-${item.name.slice(0, 20).replace(/\s+/g, '-').toUpperCase()}`;
            const { error: itemErr } = await this.admin().from('ecom_order_items').insert({
                order_id: order.id,
                item_id: resolved?.itemId || null,
                item_name: item.name,
                item_sku: sku,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                subtotal: lineSubtotal,
                status: 'fulfilled',
            });
            if (itemErr) {
                this.logger.error(`Failed to insert order item: ${itemErr.message}`);
            }
        }

        this.logger.log(`UMKM sale recorded: ${orderNumber} tenant=${tenantId} total=${subtotal}`);
        return {
            orderId: order.id,
            orderNumber: order.order_number,
            totalAmount: Number(order.total_amount),
        };
    }

    async fetchDailyReport(tenantId = DEFAULT_TENANT): Promise<UmkmDailyReport> {
        const today = new Date().toISOString().slice(0, 10);
        const dayStart = `${today}T00:00:00.000Z`;
        const dayEnd = `${today}T23:59:59.999Z`;

        const { data: todayOrders, error: todayErr } = await this.admin()
            .from('ecom_orders')
            .select('total_amount, paid_amount, payment_status, status')
            .eq('tenant_id', tenantId)
            .gte('created_at', dayStart)
            .lte('created_at', dayEnd);
        if (todayErr) {
            this.logger.warn(`fetchDailyReport today orders: ${todayErr.message}`);
        }

        const activeToday = (todayOrders || []).filter(
            (o: { status?: string }) => o.status !== 'cancelled' && o.status !== 'refunded',
        );
        const orderCount = activeToday.length;
        const paidOrderCount = activeToday.filter((o: { payment_status?: string }) =>
            /^(paid|partial)$/i.test(String(o.payment_status || '')),
        ).length;
        const revenueGross = activeToday.reduce(
            (s: number, o: { total_amount?: number }) => s + Number(o.total_amount ?? 0),
            0,
        );
        const revenuePaid = activeToday.reduce((s: number, o: { paid_amount?: number; payment_status?: string }) => {
            if (!/^(paid|partial)$/i.test(String(o.payment_status || ''))) return s;
            return s + Number(o.paid_amount ?? 0);
        }, 0);

        const { data: lineItems, error: itemsErr } = await this.admin()
            .from('ecom_order_items')
            .select('item_name, quantity, subtotal, status, ecom_orders!inner(tenant_id, status)')
            .eq('ecom_orders.tenant_id', tenantId);
        if (itemsErr) {
            this.logger.warn(`fetchDailyReport line items: ${itemsErr.message}`);
        }

        const productMap = new Map<string, { name: string; unitsSold: number; revenue: number }>();
        for (const row of lineItems || []) {
            const order = (row as { ecom_orders?: { status?: string } }).ecom_orders;
            const itemStatus = String((row as { status?: string }).status || '');
            if (order?.status === 'cancelled' || order?.status === 'refunded') continue;
            if (itemStatus === 'cancelled' || itemStatus === 'returned') continue;
            const name = String((row as { item_name?: string }).item_name || 'Produk');
            const key = name.toLowerCase();
            const prev = productMap.get(key) || { name, unitsSold: 0, revenue: 0 };
            prev.unitsSold += Number((row as { quantity?: number }).quantity ?? 0);
            prev.revenue += Number((row as { subtotal?: number }).subtotal ?? 0);
            productMap.set(key, prev);
        }
        const topProducts = [...productMap.values()]
            .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold)
            .slice(0, 5);

        const { data: recentOrders, error: recentErr } = await this.admin()
            .from('ecom_orders')
            .select('order_number, customer_name, total_amount, created_at')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(5);
        if (recentErr) {
            this.logger.warn(`fetchDailyReport recent orders: ${recentErr.message}`);
        }

        return {
            salesDate: today,
            orderCount,
            paidOrderCount,
            revenueGross,
            revenuePaid,
            topProducts,
            recentOrders: (recentOrders || []).map((o: any) => ({
                orderNumber: String(o.order_number || ''),
                customerName: o.customer_name ? String(o.customer_name) : null,
                totalAmount: Number(o.total_amount ?? 0),
                createdAt: String(o.created_at || ''),
            })),
        };
    }

    async buildDailyReportMessage(tenantId = DEFAULT_TENANT): Promise<string> {
        const report = await this.fetchDailyReport(tenantId);
        return formatDailyReportWa(report);
    }

    /** Setup notebook for UMKM mode (context + optional guide flow creation). */
    async setupUmkmNotebook(
        notebookId: string,
        tenantId?: string,
    ): Promise<{
        notebookId: string;
        tenantId: string;
        contextConfig: StudioContextConfig;
    }> {
        const { data: notebook, error: nbErr } = await this.admin()
            .from('studio_notebooks')
            .select('id, context_config')
            .eq('id', notebookId)
            .single();
        if (nbErr || !notebook) throw nbErr || new Error('Notebook not found');

        const resolvedTenant =
            typeof tenantId === 'string' && tenantId.trim()
                ? tenantId.trim()
                : undefined;

        const merged: StudioContextConfig = {
            ...DEFAULT_STUDIO_UMKM_CONTEXT,
            ...(typeof notebook.context_config === 'object' && notebook.context_config
                ? (notebook.context_config as StudioContextConfig)
                : {}),
            umkm_mode: true,
            audience: 'customer',
            ...(resolvedTenant ? { tenant_id: resolvedTenant } : {}),
        };

        const { error: updErr } = await this.admin()
            .from('studio_notebooks')
            .update({ context_config: merged, audience: 'customer', updated_at: new Date() })
            .eq('id', notebookId);
        assertNoSupabaseError(updErr, 'Failed to update notebook UMKM context');

        return {
            notebookId,
            tenantId: this.resolveTenantId(merged),
            contextConfig: merged,
        };
    }
}
