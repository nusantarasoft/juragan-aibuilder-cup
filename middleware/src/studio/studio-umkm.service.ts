import { Injectable, Logger } from '@nestjs/common';
import { AiRouterService } from '../ai/ai-router.service';
import { InventoryService } from '../inventory/inventory.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
    DEFAULT_STUDIO_SALES_CONTEXT,
    type StudioContextConfig,
} from './studio-db-context.service';
import {
    detectUmkmFeedback,
    formatFeedbackThanks,
    type UmkmFeedbackRating,
} from './studio-umkm-feedback.util';
import {
    detectUmkmConfirmReply,
    detectUmkmIntent,
    extractStockProductQuery,
    formatDailyReportWa,
    formatSaleCancelled,
    formatUmkmHelp,
    generateWaOrderNumber,
    parseSaleHeuristic,
    parseSaleJsonFromLlm,
    toAidlcIntent,
    type ParsedUmkmSale,
    type UmkmDailyReport,
    type UmkmIntent,
} from './studio-umkm.util';
import {
    buildUmkmQueryUnderstandingPrompt,
    normalizeUmkmQueryUnderstanding,
    parseUmkmQuJsonFromLlm,
    umkmQueryUnderstandingFromKeywords,
    type UmkmQueryUnderstanding,
} from './studio-umkm-qu';
import type { ConversationLine } from './query-understanding';
import {
    findBestProductMatch,
    formatProductListWa,
    formatSaleConfirmationWithCatalog,
    formatSalePreviewWithCatalog,
    formatStockCheckWa,
    resolveSaleItemsAgainstCatalog,
    type UmkmCatalogProduct,
    type UmkmSaleItemResolved,
    type UmkmStockRow,
} from './studio-umkm-product.util';
import { assertNoSupabaseError } from './studio-supabase.util';

const DEFAULT_TENANT = 'default';
const PENDING_TTL_MS = 15 * 60 * 1000;

export type PendingUmkmSale = {
    sale: ParsedUmkmSale;
    resolved: UmkmSaleItemResolved[];
    phone?: string;
    createdAt: number;
    /** Durable staging row id when persisted. */
    pendingId?: string;
};

export const DEFAULT_STUDIO_UMKM_CONTEXT: StudioContextConfig = {
    umkm_mode: true,
    audience: 'customer',
    tenant_id: DEFAULT_TENANT,
    supabase_views: DEFAULT_STUDIO_SALES_CONTEXT.supabase_views,
};

@Injectable()
export class StudioUmkmService {
    private readonly logger = new Logger(StudioUmkmService.name);
    /** Pending confirmations for non-guided umkm_mode (key = tenant:phone). */
    private readonly pendingByChat = new Map<string, PendingUmkmSale>();

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly aiRouter: AiRouterService,
        private readonly inventoryService: InventoryService,
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

    /** AIDLC Query Understanding — LLM with keyword fallback. */
    async understandUmkmQuery(
        text: string,
        options?: { conversationLines?: ConversationLine[] },
    ): Promise<UmkmQueryUnderstanding> {
        const trimmed = typeof text === 'string' ? text.trim() : '';
        if (!trimmed) return umkmQueryUnderstandingFromKeywords('');

        const prompt = buildUmkmQueryUnderstandingPrompt(trimmed, options?.conversationLines ?? []);
        try {
            const raw = await this.aiRouter.generateText(prompt);
            if (
                !raw ||
                raw.includes('not configured') ||
                raw.includes('request failed') ||
                raw.includes('not reachable')
            ) {
                return umkmQueryUnderstandingFromKeywords(trimmed);
            }
            const parsed = parseUmkmQuJsonFromLlm(raw);
            return normalizeUmkmQueryUnderstanding(parsed, trimmed);
        } catch (e: any) {
            this.logger.warn(`understandUmkmQuery failed: ${e?.message}`);
            return umkmQueryUnderstandingFromKeywords(trimmed);
        }
    }

    private pendingKey(tenantId: string, phone?: string): string {
        return `${tenantId}:${phone || 'anon'}`;
    }

    private pruneExpiredPending(key: string): PendingUmkmSale | undefined {
        const pending = this.pendingByChat.get(key);
        if (!pending) return undefined;
        if (Date.now() - pending.createdAt > PENDING_TTL_MS) {
            this.pendingByChat.delete(key);
            return undefined;
        }
        return pending;
    }

    getPendingSale(tenantId: string, phone?: string): PendingUmkmSale | undefined {
        return this.pruneExpiredPending(this.pendingKey(tenantId, phone));
    }

    setPendingSale(tenantId: string, pending: PendingUmkmSale, phone?: string): void {
        this.pendingByChat.set(this.pendingKey(tenantId, phone), pending);
    }

    clearPendingSale(tenantId: string, phone?: string): void {
        this.pendingByChat.delete(this.pendingKey(tenantId, phone));
    }

    isPendingSaleFresh(pending: PendingUmkmSale | null | undefined): pending is PendingUmkmSale {
        if (!pending || typeof pending.createdAt !== 'number') return false;
        return Date.now() - pending.createdAt <= PENDING_TTL_MS;
    }

    /** Load pending from memory, else durable staging table. */
    async resolvePendingSale(opts: {
        tenantId: string;
        phone?: string;
        conversationId?: string;
        memoryPending?: PendingUmkmSale | null;
    }): Promise<PendingUmkmSale | undefined> {
        if (this.isPendingSaleFresh(opts.memoryPending)) return opts.memoryPending;
        const mem = this.getPendingSale(opts.tenantId, opts.phone);
        if (mem) return mem;
        return this.loadPendingSaleFromDb(opts.tenantId, opts.phone, opts.conversationId);
    }

    async loadPendingSaleFromDb(
        tenantId: string,
        phone?: string,
        conversationId?: string,
    ): Promise<PendingUmkmSale | undefined> {
        try {
            let q = this.admin()
                .from('studio_umkm_pending_sales')
                .select('id, payload, expires_at, created_at, tenant_id, phone')
                .eq('status', 'pending')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1);

            if (conversationId) {
                q = q.eq('conversation_id', conversationId);
            } else if (phone) {
                q = q.eq('tenant_id', tenantId).eq('phone', phone);
            } else {
                return undefined;
            }

            const { data: rows, error } = await q;
            if (error) {
                this.logger.warn(`loadPendingSaleFromDb: ${error.message}`);
                return undefined;
            }
            const data = Array.isArray(rows) ? rows[0] : rows;
            if (!data) return undefined;

            const payload = data.payload as {
                sale?: ParsedUmkmSale;
                resolved?: UmkmSaleItemResolved[];
                phone?: string;
            };
            if (!payload?.sale || !payload?.resolved) return undefined;

            const pending: PendingUmkmSale = {
                sale: payload.sale,
                resolved: payload.resolved,
                phone: payload.phone ?? phone ?? (data.phone ? String(data.phone) : undefined),
                createdAt: new Date(data.created_at).getTime(),
                pendingId: String(data.id),
            };
            const tid = data.tenant_id ? String(data.tenant_id) : tenantId;
            this.setPendingSale(tid, pending, pending.phone);
            return pending;
        } catch (e: any) {
            this.logger.warn(`loadPendingSaleFromDb error: ${e?.message}`);
            return undefined;
        }
    }

    async persistPendingSaleToDb(
        tenantId: string,
        pending: PendingUmkmSale,
        opts?: { conversationId?: string; phone?: string },
    ): Promise<string | undefined> {
        const expiresAt = new Date(pending.createdAt + PENDING_TTL_MS).toISOString();
        const phone = opts?.phone ?? pending.phone ?? null;
        const conversationId = opts?.conversationId ?? null;

        try {
            // Expire older pending rows for same conversation/phone
            let expireQ = this.admin()
                .from('studio_umkm_pending_sales')
                .update({ status: 'expired', updated_at: new Date().toISOString() })
                .eq('tenant_id', tenantId)
                .eq('status', 'pending');
            if (conversationId) {
                expireQ = expireQ.eq('conversation_id', conversationId);
            } else if (phone) {
                expireQ = expireQ.eq('phone', phone);
            }
            await expireQ;

            const { data, error } = await this.admin()
                .from('studio_umkm_pending_sales')
                .insert({
                    tenant_id: tenantId,
                    conversation_id: conversationId,
                    phone,
                    payload: {
                        sale: pending.sale,
                        resolved: pending.resolved,
                        phone: pending.phone,
                    },
                    status: 'pending',
                    expires_at: expiresAt,
                })
                .select('id')
                .single();

            if (error) {
                this.logger.warn(`persistPendingSaleToDb: ${error.message}`);
                return undefined;
            }
            return data?.id ? String(data.id) : undefined;
        } catch (e: any) {
            this.logger.warn(`persistPendingSaleToDb error: ${e?.message}`);
            return undefined;
        }
    }

    async markPendingSaleStatus(
        pendingId: string | undefined,
        status: 'committed' | 'cancelled' | 'expired',
    ): Promise<void> {
        if (!pendingId) return;
        try {
            const { error } = await this.admin()
                .from('studio_umkm_pending_sales')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', pendingId);
            if (error) this.logger.warn(`markPendingSaleStatus: ${error.message}`);
        } catch (e: any) {
            this.logger.warn(`markPendingSaleStatus error: ${e?.message}`);
        }
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
        options?: { conversationId?: string; conversationLines?: ConversationLine[] },
    ): Promise<string | null> {
        const conversationId = options?.conversationId;
        const pending = await this.resolvePendingSale({
            tenantId,
            phone,
            conversationId,
        });
        const confirm = detectUmkmConfirmReply(text);
        if (pending && confirm === 'confirm') {
            this.clearPendingSale(tenantId, phone);
            return this.commitPendingSale(pending, tenantId);
        }
        if (pending && confirm === 'cancel') {
            this.clearPendingSale(tenantId, phone);
            await this.markPendingSaleStatus(pending.pendingId, 'cancelled');
            return formatSaleCancelled();
        }

        const feedback = detectUmkmFeedback(text);
        if (feedback) {
            await this.logFeedback(tenantId, feedback, { phone, conversationId });
            return formatFeedbackThanks(feedback);
        }

        let intent = detectUmkmIntent(text);
        if (intent === 'unknown' || intent === 'help') {
            const qu = await this.understandUmkmQuery(text, {
                conversationLines: options?.conversationLines,
            });
            if (qu.needs_clarification && qu.clarification_question) {
                return qu.clarification_question;
            }
            const mapped = toAidlcIntent(intent);
            // Prefer LLM intent when keyword was unknown; keep help if user asked help.
            if (intent === 'unknown') {
                intent =
                    qu.intent === 'catat_transaksi'
                        ? 'record_sale'
                        : qu.intent === 'cek_stok'
                          ? 'check_stock'
                          : qu.intent === 'laporan'
                            ? 'sales_report'
                            : qu.intent === 'tanya_umum'
                              ? 'unknown'
                              : 'unknown';
                this.logger.debug(
                    `UMKM QU intent=${qu.intent} conf=${qu.confidence_score} (keyword was unknown)`,
                );
            } else if (mapped === 'tanya_umum' && intent === 'help') {
                // keep help
            }
            void mapped;
        }

        this.logger.debug(`UMKM intent=${intent} aidlc=${toAidlcIntent(intent)}`);
        switch (intent) {
            case 'record_sale':
                return this.recordSaleFromText(text, tenantId, phone, config, { conversationId });
            case 'sales_report':
                return this.buildDailyReportMessage(tenantId);
            case 'list_products':
                return this.buildProductListMessage(tenantId);
            case 'check_stock':
                return this.buildStockCheckMessage(text, tenantId);
            case 'help':
                return formatUmkmHelp();
            default:
                if (pending) {
                    return [
                        'Masih ada draft penjualan menunggu konfirmasi.',
                        'Ketik *ya* untuk simpan, *batal* untuk batalkan, atau kirim ulang *jual ...*.',
                    ].join('\n');
                }
                // tanya_umum / lainnya → null so WhatsApp caller can fall back to RAG chat
                return null;
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

    async fetchStockRows(
        tenantId = DEFAULT_TENANT,
        productQuery?: string | null,
    ): Promise<UmkmStockRow[]> {
        const products = await this.fetchActiveProducts(tenantId);
        if (products.length === 0) return [];

        let scoped = products;
        if (productQuery) {
            const match = findBestProductMatch(productQuery, products, 40);
            scoped = match ? [match] : [];
            if (scoped.length === 0) {
                const q = productQuery.toLowerCase();
                scoped = products.filter(
                    (p) =>
                        p.name.toLowerCase().includes(q) ||
                        (p.sku && p.sku.toLowerCase().includes(q)),
                );
            }
        }

        if (scoped.length === 0) return [];

        const ids = scoped.map((p) => p.id);
        const { data, error } = await this.admin()
            .from('inv_stock_ledger')
            .select('item_id, on_hand, reserved, committed, available')
            .eq('tenant_id', tenantId)
            .in('item_id', ids);
        if (error) {
            this.logger.warn(`fetchStockRows: ${error.message}`);
        }

        const byItem = new Map<string, { onHand: number; reserved: number; available: number }>();
        for (const row of data || []) {
            const itemId = String((row as { item_id?: string }).item_id || '');
            const onHand = Number((row as { on_hand?: number }).on_hand ?? 0);
            const reserved = Number((row as { reserved?: number }).reserved ?? 0);
            const committed = Number((row as { committed?: number }).committed ?? 0);
            const availableRaw = (row as { available?: number }).available;
            const available =
                availableRaw != null
                    ? Number(availableRaw)
                    : onHand - reserved - committed;
            const prev = byItem.get(itemId) || { onHand: 0, reserved: 0, available: 0 };
            prev.onHand += onHand;
            prev.reserved += reserved;
            prev.available += available;
            byItem.set(itemId, prev);
        }

        return scoped.map((p) => {
            const stock = byItem.get(p.id) || { onHand: 0, reserved: 0, available: 0 };
            return {
                name: p.name,
                sku: p.sku,
                available: stock.available,
                onHand: stock.onHand,
                reserved: stock.reserved,
            };
        });
    }

    async buildStockCheckMessage(text: string, tenantId = DEFAULT_TENANT): Promise<string> {
        const query = extractStockProductQuery(text);
        const rows = await this.fetchStockRows(tenantId, query);
        return formatStockCheckWa(rows, { query });
    }

    /**
     * Parse + catalog match → preview (does not write DB). Used by guided flow + direct mode.
     */
    async prepareSaleFromText(
        text: string,
        tenantId = DEFAULT_TENANT,
        phone?: string,
        config?: StudioContextConfig,
    ): Promise<
        | { kind: 'preview'; message: string; pending: PendingUmkmSale }
        | { kind: 'error'; message: string }
    > {
        const parsed = await this.parseSaleMessage(text);
        if (!parsed) {
            return {
                kind: 'error',
                message: [
                    'Maaf, saya belum bisa memahami detail penjualannya.',
                    '',
                    'Contoh format:',
                    '• jual 3 es kopi 45000',
                    '• catat 2 tas total 500rb tunai',
                    '• order pelanggan Budi 1 sabun 25000 transfer',
                    '',
                    'Ketik *daftar barang* untuk lihat produk terdaftar.',
                ].join('\n'),
            };
        }

        const products = await this.fetchActiveProducts(tenantId);
        const resolved = resolveSaleItemsAgainstCatalog(parsed.items, products);
        const requireMatch = config?.umkm_require_catalog_match === true;
        const hasUnmatched = resolved.some((i) => !i.catalogMatched);

        if (requireMatch && hasUnmatched && products.length > 0) {
            return {
                kind: 'error',
                message: formatSaleConfirmationWithCatalog({
                    orderNumber: '',
                    totalAmount: 0,
                    items: resolved,
                    unmatchedBlocked: true,
                }),
            };
        }

        const saleForSave: ParsedUmkmSale = {
            ...parsed,
            totalAmount:
                resolved.reduce((s, i) => s + i.quantity * i.unitPrice, 0) || parsed.totalAmount,
            items: resolved.map((i) => ({
                name: i.name,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
            })),
        };

        const pending: PendingUmkmSale = {
            sale: saleForSave,
            resolved,
            phone,
            createdAt: Date.now(),
        };

        return {
            kind: 'preview',
            pending,
            message: formatSalePreviewWithCatalog({
                totalAmount: saleForSave.totalAmount,
                items: resolved,
                paymentMethod: parsed.paymentMethod,
                customerName: parsed.customerName,
            }),
        };
    }

    async commitPendingSale(
        pending: PendingUmkmSale,
        tenantId = DEFAULT_TENANT,
    ): Promise<string> {
        const pendingId = pending.pendingId;
        if (!this.isPendingSaleFresh(pending)) {
            await this.markPendingSaleStatus(pendingId, 'expired');
            return 'Draft penjualan sudah kedaluwarsa. Kirim ulang *jual ...* lalu konfirmasi dengan *ya*.';
        }
        const order = await this.saveSale(tenantId, pending.sale, pending.phone, pending.resolved);
        await this.markPendingSaleStatus(pendingId, 'committed');
        return formatSaleConfirmationWithCatalog({
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            items: pending.resolved,
            paymentMethod: pending.sale.paymentMethod,
        });
    }

    async recordSaleFromText(
        text: string,
        tenantId = DEFAULT_TENANT,
        phone?: string,
        config?: StudioContextConfig,
        options?: { conversationId?: string },
    ): Promise<string> {
        const prepared = await this.prepareSaleFromText(text, tenantId, phone, config);
        if (prepared.kind === 'error') return prepared.message;
        const pendingId = await this.persistPendingSaleToDb(tenantId, prepared.pending, {
            conversationId: options?.conversationId,
            phone,
        });
        if (pendingId) prepared.pending.pendingId = pendingId;
        this.setPendingSale(tenantId, prepared.pending, phone);
        return prepared.message;
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
            const raw = await this.aiRouter.generateText(prompt);
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

        await this.deductStockForSale(tenantId, order.id, orderNumber, resolvedItems);

        this.logger.log(`UMKM sale recorded: ${orderNumber} tenant=${tenantId} total=${subtotal}`);
        return {
            orderId: order.id,
            orderNumber: order.order_number,
            totalAmount: Number(order.total_amount),
        };
    }

    /** AIDLC: potong stok otomatis saat commit (hanya item yang match katalog). */
    private async deductStockForSale(
        tenantId: string,
        orderId: string,
        orderNumber: string,
        resolvedItems?: UmkmSaleItemResolved[],
    ): Promise<void> {
        if (!resolvedItems?.length) return;
        for (const item of resolvedItems) {
            if (!item.itemId || !item.catalogMatched) continue;
            try {
                await this.inventoryService.createStockMovement(tenantId, {
                    itemId: item.itemId,
                    movementType: 'SALE_OUT',
                    quantity: item.quantity,
                    unitCost: item.unitPrice,
                    reference: orderNumber,
                    referenceType: 'ecom_order',
                    referenceId: orderId,
                    notes: `UMKM WA: ${item.quantity} × ${item.name}`,
                });
            } catch (e: any) {
                this.logger.warn(
                    `Stock deduct failed for ${item.name} order=${orderNumber}: ${e?.message}`,
                );
            }
        }
    }

    async logFeedback(
        tenantId: string,
        rating: UmkmFeedbackRating,
        opts?: { phone?: string; conversationId?: string; metadata?: Record<string, unknown> },
    ): Promise<void> {
        try {
            const { error } = await this.admin().from('studio_umkm_feedback').insert({
                tenant_id: tenantId,
                conversation_id: opts?.conversationId || null,
                phone: opts?.phone || null,
                score: rating.score,
                label: rating.label,
                raw_text: rating.raw,
                metadata: opts?.metadata || {},
            });
            if (error) this.logger.warn(`logFeedback: ${error.message}`);
            else this.logger.log(`UMKM feedback ${rating.score}/5 tenant=${tenantId}`);
        } catch (e: any) {
            this.logger.warn(`logFeedback error: ${e?.message}`);
        }
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
