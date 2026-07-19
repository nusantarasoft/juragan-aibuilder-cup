import { Injectable, Logger } from '@nestjs/common';
import { AiRouterService } from '../ai/ai-router.service';
import { InventoryService } from '../inventory/inventory.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
    DEFAULT_STUDIO_SALES_CONTEXT,
    getUmkmCommandsFromConfig,
    type StudioContextConfig,
} from './studio-db-context.service';
import {
    DEFAULT_UMKM_COMMANDS,
    formatMenuHubPrompt,
    formatMenuHubUnknownChoice,
    formatPurchaseHubPrompt,
    formatPurchaseHubUnknownChoice,
    formatReportHubPrompt,
    formatReportHubUnknownChoice,
    sanitizeUmkmCommandsInput,
    type UmkmCommandsConfig,
} from './studio-umkm-commands';
import {
    detectUmkmFeedback,
    formatFeedbackThanks,
    type UmkmFeedbackRating,
} from './studio-umkm-feedback.util';
import {
    detectReportPeriod,
    explainAddProductParseFailure,
    explainAddStockParseFailure,
    formatIdrShort,
    generatePurchaseNumber,
    parseAddProductMessage,
    parseAddStockMessage,
    parsePurchaseHeuristic,
    periodRange,
    type ParsedUmkmPurchase,
    type UmkmReportPeriod,
} from './studio-umkm-ops.util';
import {
    detectUmkmConfirmReply,
    detectUmkmIntent,
    detectUmkmMenuDigit,
    extractStockProductQuery,
    formatDailyReportWa,
    formatRecordSaleMenuPrompt,
    formatSaleCancelled,
    formatUmkmHelp,
    generateWaOrderNumber,
    isUmkmMenuOnly,
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

export type PendingUmkmPurchase = {
    purchase: ParsedUmkmPurchase;
    resolved: { name: string; quantity: number; unitCost: number; itemId?: string; catalogMatched: boolean }[];
    phone?: string;
    createdAt: number;
    pendingId?: string;
};

type UmkmWizard =
    | { kind: 'menu_hub'; createdAt: number }
    | { kind: 'purchase_hub'; createdAt: number }
    | { kind: 'report_hub'; createdAt: number }
    | { kind: 'await_add_product'; createdAt: number }
    | { kind: 'await_add_stock'; createdAt: number }
    | { kind: 'await_purchase'; createdAt: number };

export const DEFAULT_STUDIO_UMKM_CONTEXT: StudioContextConfig = {
    umkm_mode: true,
    audience: 'customer',
    tenant_id: DEFAULT_TENANT,
    supabase_views: DEFAULT_STUDIO_SALES_CONTEXT.supabase_views,
    umkm_commands: structuredClone(DEFAULT_UMKM_COMMANDS),
};

@Injectable()
export class StudioUmkmService {
    private readonly logger = new Logger(StudioUmkmService.name);
    /** Pending confirmations for non-guided umkm_mode (key = tenant:phone). */
    private readonly pendingByChat = new Map<string, PendingUmkmSale>();
    private readonly pendingPurchaseByChat = new Map<string, PendingUmkmPurchase>();
    private readonly wizardByChat = new Map<string, UmkmWizard>();

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly aiRouter: AiRouterService,
        private readonly inventoryService: InventoryService,
    ) {}

    private admin() {
        return this.supabaseService.getAdminClient();
    }

    private chatKey(tenantId: string, phone?: string, conversationId?: string): string {
        return `${tenantId}:${phone || conversationId || 'anon'}`;
    }

    private setWizard(tenantId: string, wizard: UmkmWizard, phone?: string, conversationId?: string) {
        this.wizardByChat.set(this.chatKey(tenantId, phone, conversationId), wizard);
    }

    private clearWizard(tenantId: string, phone?: string, conversationId?: string) {
        this.wizardByChat.delete(this.chatKey(tenantId, phone, conversationId));
    }

    private getWizard(tenantId: string, phone?: string, conversationId?: string): UmkmWizard | null {
        const w = this.wizardByChat.get(this.chatKey(tenantId, phone, conversationId));
        if (!w) return null;
        if (Date.now() - w.createdAt > PENDING_TTL_MS) {
            this.clearWizard(tenantId, phone, conversationId);
            return null;
        }
        return w;
    }

    isUmkmMode(config: StudioContextConfig): boolean {
        return config.umkm_mode === true;
    }

    resolveTenantId(config: StudioContextConfig): string {
        const tid = config.tenant_id;
        return typeof tid === 'string' && tid.trim() ? tid.trim() : DEFAULT_TENANT;
    }

    detectIntent(text: string, commands?: UmkmCommandsConfig | unknown): UmkmIntent {
        return detectUmkmIntent(text, commands);
    }

    resolveCommands(config?: StudioContextConfig): UmkmCommandsConfig {
        return getUmkmCommandsFromConfig(config || {});
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
        const commands = this.resolveCommands(config);
        const pending = await this.resolvePendingSale({
            tenantId,
            phone,
            conversationId,
        });
        const confirm = detectUmkmConfirmReply(text, commands);

        const pendingPurchase = this.getPendingPurchase(tenantId, phone, conversationId);
        if (pendingPurchase && confirm === 'confirm') {
            this.clearPendingPurchase(tenantId, phone, conversationId);
            return this.commitPendingPurchase(pendingPurchase, tenantId);
        }
        if (pendingPurchase && confirm === 'cancel') {
            this.clearPendingPurchase(tenantId, phone, conversationId);
            return '❌ Belanja dibatalkan.';
        }

        if (pending && confirm === 'confirm') {
            this.clearPendingSale(tenantId, phone);
            this.clearWizard(tenantId, phone, conversationId);
            return this.commitPendingSale(pending, tenantId);
        }
        if (pending && confirm === 'cancel') {
            this.clearPendingSale(tenantId, phone);
            await this.markPendingSaleStatus(pending.pendingId, 'cancelled');
            return formatSaleCancelled(commands);
        }

        // Active submenu / wizard takes priority over new intents (except cancel)
        if (confirm === 'cancel') {
            this.clearWizard(tenantId, phone, conversationId);
        } else {
            const wizardReply = await this.continueWizard(text, tenantId, phone, conversationId, config);
            if (wizardReply !== undefined) return wizardReply;
        }

        const feedback = detectUmkmFeedback(text);
        if (feedback) {
            await this.logFeedback(tenantId, feedback, { phone, conversationId });
            return formatFeedbackThanks(feedback);
        }

        let intent = detectUmkmIntent(text, commands);
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
            case 'ask':
                this.clearWizard(tenantId, phone, conversationId);
                return null; // RAG / guided do_ask
            case 'menu_hub':
                return this.openMenuHub(tenantId, phone, conversationId);
            case 'purchase_hub':
                return this.openPurchaseHub(tenantId, phone, conversationId);
            case 'report_hub':
                return this.openReportHub(tenantId, phone, conversationId);
            case 'list_products':
                this.clearWizard(tenantId, phone, conversationId);
                return this.buildProductListMessage(tenantId);
            case 'add_product':
                return this.beginOrRunAddProduct(text, tenantId, phone, conversationId);
            case 'add_stock':
            case 'check_stock': {
                // check_stock legacy: if looks like query show stock; else add-stock flow
                if (intent === 'check_stock' || /cek\s+stok|berapa\s+stok|sisa\s+stok/i.test(text)) {
                    const q = extractStockProductQuery(text);
                    if (q || /cek\s+stok|berapa\s+stok/i.test(text)) {
                        this.clearWizard(tenantId, phone, conversationId);
                        return this.buildStockCheckMessage(text, tenantId);
                    }
                }
                return this.beginOrRunAddStock(text, tenantId, phone, conversationId);
            }
            case 'list_purchases':
                this.clearWizard(tenantId, phone, conversationId);
                return this.buildPurchaseListMessage(tenantId, detectReportPeriod(text) || 'all');
            case 'record_purchase':
                return this.beginOrRunPurchase(text, tenantId, phone, conversationId, config);
            case 'list_sales':
                this.clearWizard(tenantId, phone, conversationId);
                return this.buildSalesListMessage(tenantId, detectReportPeriod(text) || 'today');
            case 'record_sale':
                this.clearWizard(tenantId, phone, conversationId);
                return this.recordSaleFromText(text, tenantId, phone, config, { conversationId });
            case 'sales_report': {
                this.clearWizard(tenantId, phone, conversationId);
                const period = detectReportPeriod(text) || 'today';
                return this.buildCombinedReportMessage(tenantId, period);
            }
            case 'help':
                this.clearWizard(tenantId, phone, conversationId);
                return formatUmkmHelp(commands);
            default:
                if (pending) {
                    const confirmHint = commands.confirm[0] || 'ya';
                    const cancelHint = commands.cancel[0] || 'batal';
                    const saleKw = (commands.keywords.record_sale || [])[0] || 'jual';
                    return [
                        'Masih ada draft penjualan menunggu konfirmasi.',
                        `Ketik *${confirmHint}* untuk simpan, *${cancelHint}* untuk batalkan, atau kirim ulang *${saleKw} ...*.`,
                    ].join('\n');
                }
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
        const commands = this.resolveCommands(config);
        if (isUmkmMenuOnly(text) && detectUmkmIntent(text, commands) === 'record_sale') {
            return { kind: 'error', message: formatRecordSaleMenuPrompt(commands) };
        }

        const parsed = await this.parseSaleMessage(text, commands);
        if (!parsed) {
            return {
                kind: 'error',
                message: [
                    'Maaf, saya belum bisa memahami detail penjualannya.',
                    '',
                    'Contoh format:',
                    `• ${(commands.keywords.record_sale || [])[0] || 'jual'} 3 es kopi 45000`,
                    `• ${(commands.keywords.record_sale || [])[0] || 'catat'} 2 tas total 500rb tunai`,
                    '',
                    `Ketik *${(commands.keywords.list_products || [])[0] || 'daftar barang'}* untuk lihat produk, atau *${(commands.keywords.help || [])[0] || 'bantuan'}* untuk menu.`,
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
            message: formatSalePreviewWithCatalog(
                {
                    totalAmount: saleForSave.totalAmount,
                    items: resolved,
                    paymentMethod: parsed.paymentMethod,
                    customerName: parsed.customerName,
                },
                {
                    confirm: commands.confirm[0] || 'ya',
                    cancel: commands.cancel[0] || 'batal',
                },
            ),
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

    async parseSaleMessage(
        text: string,
        commands?: UmkmCommandsConfig | unknown,
    ): Promise<ParsedUmkmSale | null> {
        // Avoid LLM hallucination on CS menu digits (e.g. "1")
        if (isUmkmMenuOnly(text)) return null;

        const heuristic = parseSaleHeuristic(text, commands);
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

    openMenuHub(tenantId: string, phone?: string, conversationId?: string): string {
        this.setWizard(tenantId, { kind: 'menu_hub', createdAt: Date.now() }, phone, conversationId);
        return formatMenuHubPrompt();
    }

    openPurchaseHub(tenantId: string, phone?: string, conversationId?: string): string {
        this.setWizard(tenantId, { kind: 'purchase_hub', createdAt: Date.now() }, phone, conversationId);
        return formatPurchaseHubPrompt();
    }

    openReportHub(tenantId: string, phone?: string, conversationId?: string): string {
        this.setWizard(tenantId, { kind: 'report_hub', createdAt: Date.now() }, phone, conversationId);
        return formatReportHubPrompt();
    }

    getPendingPurchase(
        tenantId: string,
        phone?: string,
        conversationId?: string,
    ): PendingUmkmPurchase | null {
        const p = this.pendingPurchaseByChat.get(this.chatKey(tenantId, phone, conversationId));
        if (!p) return null;
        if (Date.now() - p.createdAt > PENDING_TTL_MS) {
            this.clearPendingPurchase(tenantId, phone, conversationId);
            return null;
        }
        return p;
    }

    clearPendingPurchasePublic(tenantId: string, phone?: string, conversationId?: string) {
        this.clearPendingPurchase(tenantId, phone, conversationId);
    }

    private clearPendingPurchase(tenantId: string, phone?: string, conversationId?: string) {
        this.pendingPurchaseByChat.delete(this.chatKey(tenantId, phone, conversationId));
    }

    private setPendingPurchase(
        tenantId: string,
        pending: PendingUmkmPurchase,
        phone?: string,
        conversationId?: string,
    ) {
        this.pendingPurchaseByChat.set(this.chatKey(tenantId, phone, conversationId), pending);
    }

    /** Continue active submenu/wizard; undefined = no wizard / re-route to top-level intent. */
    async continueWizard(
        text: string,
        tenantId: string,
        phone?: string,
        conversationId?: string,
        config?: StudioContextConfig,
    ): Promise<string | undefined> {
        const wizard = this.getWizard(tenantId, phone, conversationId);
        if (!wizard) return undefined;
        const t = text.trim();
        const commands = this.resolveCommands(config);

        // Escape hatch: batal / cancel exits any wizard back to main menu
        if (detectUmkmConfirmReply(t, commands) === 'cancel') {
            this.clearWizard(tenantId, phone, conversationId);
            return `❌ Dibatalkan.\n\n${formatUmkmHelp(commands)}`;
        }

        if (wizard.kind === 'menu_hub') {
            if (t === '1') {
                this.clearWizard(tenantId, phone, conversationId);
                return this.buildProductListMessage(tenantId);
            }
            if (t === '2') {
                this.setWizard(tenantId, { kind: 'await_add_product', createdAt: Date.now() }, phone, conversationId);
                return [
                    'Kirim: *nama menu* [harga]',
                    'Contoh: *mie ayam 15000* atau *bakso modal 10000 18000*',
                    '',
                    'Ketik *batal* untuk kembali ke menu.',
                ].join('\n');
            }
            if (t === '3') {
                this.setWizard(tenantId, { kind: 'await_add_stock', createdAt: Date.now() }, phone, conversationId);
                return [
                    'Kirim: *nama menu* *qty*',
                    'Contoh: *mie ayam 10*',
                    '',
                    'Ketik *batal* untuk kembali ke menu.',
                ].join('\n');
            }
            return formatMenuHubUnknownChoice();
        }

        if (wizard.kind === 'purchase_hub') {
            if (t === '1') {
                this.clearWizard(tenantId, phone, conversationId);
                return this.buildPurchaseListMessage(tenantId, 'all');
            }
            if (t === '2') {
                this.clearWizard(tenantId, phone, conversationId);
                return this.buildPurchaseListMessage(tenantId, 'month');
            }
            if (t === '3') {
                this.setWizard(tenantId, { kind: 'await_purchase', createdAt: Date.now() }, phone, conversationId);
                return [
                    'Kirim detail belanja:',
                    '• *belanja 10 mie ayam @5000*',
                    '• *belanja 2026-07-18 5 bakso 3000, 2 es teh 2000*',
                    '',
                    'Ketik *batal* untuk kembali ke menu.',
                ].join('\n');
            }
            return formatPurchaseHubUnknownChoice();
        }

        if (wizard.kind === 'report_hub') {
            const map: Record<string, UmkmReportPeriod> = {
                '1': 'today',
                '2': 'week',
                '3': 'month',
                '4': 'all',
            };
            const period = map[t] || detectReportPeriod(t);
            if (period) {
                this.clearWizard(tenantId, phone, conversationId);
                return this.buildCombinedReportMessage(tenantId, period);
            }
            return formatReportHubUnknownChoice();
        }

        // Input wizards: bare menu digit exits so top-level menu can run
        const isInputWizard =
            wizard.kind === 'await_add_product' ||
            wizard.kind === 'await_add_stock' ||
            wizard.kind === 'await_purchase';
        if (isInputWizard && detectUmkmMenuDigit(t, commands)) {
            this.clearWizard(tenantId, phone, conversationId);
            return undefined;
        }

        if (wizard.kind === 'await_add_product') {
            return this.beginOrRunAddProduct(text, tenantId, phone, conversationId, true);
        }
        if (wizard.kind === 'await_add_stock') {
            return this.beginOrRunAddStock(text, tenantId, phone, conversationId, true);
        }
        if (wizard.kind === 'await_purchase') {
            return this.beginOrRunPurchase(text, tenantId, phone, conversationId, config, true);
        }
        return undefined;
    }

    /** Clear stuck wizard (e.g. after failed add-product). */
    clearWizardPublic(tenantId: string, phone?: string, conversationId?: string) {
        this.clearWizard(tenantId, phone, conversationId);
    }

    async beginOrRunAddProduct(
        text: string,
        tenantId: string,
        phone?: string,
        conversationId?: string,
        fromWizard = false,
    ): Promise<string> {
        const parsed = parseAddProductMessage(text);
        if (!parsed) {
            if (!fromWizard) {
                this.setWizard(tenantId, { kind: 'await_add_product', createdAt: Date.now() }, phone, conversationId);
            }
            return explainAddProductParseFailure(text);
        }
        try {
            const item = await this.inventoryService.createItem(tenantId, {
                name: parsed.name,
                sellingPrice: parsed.sellingPrice,
                costPrice: parsed.costPrice ?? 0,
                status: 'active',
            });
            // Kembali ke hub Menu toko supaya user tahu posisi & bisa tambah lagi
            this.setWizard(tenantId, { kind: 'menu_hub', createdAt: Date.now() }, phone, conversationId);
            return [
                '✅ *Menu ditambahkan*',
                `• ${item.name}${item.sku ? ` [${item.sku}]` : ''}`,
                `• Harga jual: ${formatIdrShort(Number(item.selling_price || 0))}`,
                '',
                'Posisi Anda: *Menu toko*',
                '*1* Lihat daftar menu',
                '*2* Tambah menu lagi',
                '*3* Tambah stok',
                '',
                'Atau ketik *batal* / *0* untuk menu utama.',
            ].join('\n');
        } catch (e: any) {
            this.logger.warn(`add product failed: ${e?.message}`);
            return [
                `Gagal menambah menu: ${e?.message || 'error'}`,
                '',
                'Coba lagi, atau ketik *batal* untuk kembali ke menu.',
            ].join('\n');
        }
    }

    async beginOrRunAddStock(
        text: string,
        tenantId: string,
        phone?: string,
        conversationId?: string,
        fromWizard = false,
    ): Promise<string> {
        const parsed = parseAddStockMessage(text);
        if (!parsed || !Number.isFinite(parsed.quantity) || parsed.quantity <= 0) {
            if (!fromWizard) {
                this.setWizard(tenantId, { kind: 'await_add_stock', createdAt: Date.now() }, phone, conversationId);
            }
            return explainAddStockParseFailure(text);
        }
        const products = await this.fetchActiveProducts(tenantId);
        const match = findBestProductMatch(parsed.productQuery, products, 40);
        if (!match) {
            return [
                `Menu *${parsed.productQuery}* tidak ditemukan.`,
                'Ketik *batal*, lalu *2* → *1* untuk lihat daftar menu,',
                'atau ketik ulang nama yang lebih mirip + jumlah (contoh: *mie ayam 10*).',
            ].join('\n');
        }
        try {
            await this.inventoryService.createStockMovement(tenantId, {
                itemId: match.id,
                movementType: 'MANUAL_IN',
                quantity: parsed.quantity,
                referenceType: 'umkm_stock_in',
                notes: `WA tambah stok ${parsed.quantity}x ${match.name}`,
            });
            this.setWizard(tenantId, { kind: 'menu_hub', createdAt: Date.now() }, phone, conversationId);
            return [
                `✅ Stok *${match.name}* +${parsed.quantity}`,
                '',
                'Posisi Anda: *Menu toko*',
                '*1* Lihat daftar menu',
                '*2* Tambah menu',
                '*3* Tambah stok lagi',
                '',
                'Atau ketik *batal* / *0* untuk menu utama.',
            ].join('\n');
        } catch (e: any) {
            this.logger.warn(`add stock failed: ${e?.message}`);
            return [
                `Gagal tambah stok: ${e?.message || 'error'}`,
                '',
                'Coba lagi, atau ketik *batal* untuk kembali ke menu.',
            ].join('\n');
        }
    }

    async beginOrRunPurchase(
        text: string,
        tenantId: string,
        phone?: string,
        conversationId?: string,
        _config?: StudioContextConfig,
        fromWizard = false,
    ): Promise<string> {
        const parsed = parsePurchaseHeuristic(text);
        if (!parsed) {
            if (!fromWizard && !/^tambah\s+belanja|^belanja$/i.test(text.trim())) {
                // bare "tambah belanja" / menu digit path
            }
            if (!fromWizard) {
                this.setWizard(tenantId, { kind: 'await_purchase', createdAt: Date.now() }, phone, conversationId);
            }
            return [
                'Belum bisa saya baca sebagai belanja.',
                '',
                'Kirim detail, contoh:',
                '• *10 mie ayam @5000*',
                '• *belanja 2026-07-18 5 bakso 3000*',
                '',
                'Ketik *batal* atau *0* untuk kembali ke menu.',
            ].join('\n');
        }

        const products = await this.fetchActiveProducts(tenantId);
        const resolved = parsed.items.map((it) => {
            const match = findBestProductMatch(it.name, products, 40);
            return {
                name: match?.name || it.name,
                quantity: it.quantity,
                unitCost: it.unitCost,
                itemId: match?.id,
                catalogMatched: !!match,
            };
        });
        const pending: PendingUmkmPurchase = {
            purchase: { ...parsed, totalCost: resolved.reduce((s, r) => s + r.quantity * r.unitCost, 0) },
            resolved,
            phone,
            createdAt: Date.now(),
        };
        this.setPendingPurchase(tenantId, pending, phone, conversationId);
        this.clearWizard(tenantId, phone, conversationId);

        const lines = ['📋 *Konfirmasi belanja*', `Tanggal: ${parsed.purchaseDate}`, ''];
        for (const it of resolved) {
            const tag = it.catalogMatched ? '' : ' _(belum di katalog)_';
            lines.push(
                `• ${it.quantity}x ${it.name} @ ${formatIdrShort(it.unitCost)} = ${formatIdrShort(it.quantity * it.unitCost)}${tag}`,
            );
        }
        lines.push(`Total: *${formatIdrShort(pending.purchase.totalCost)}*`);
        lines.push('', 'Ketik *ya* untuk simpan, *batal* untuk batalkan.');
        return lines.join('\n');
    }

    async commitPendingPurchase(pending: PendingUmkmPurchase, tenantId: string): Promise<string> {
        const purchaseNumber = generatePurchaseNumber();
        const { data: header, error } = await this.admin()
            .from('studio_umkm_purchases')
            .insert({
                tenant_id: tenantId,
                purchase_number: purchaseNumber,
                purchase_date: pending.purchase.purchaseDate,
                supplier_name: pending.purchase.supplierName || null,
                total_cost: pending.purchase.totalCost,
                notes: pending.purchase.notes || null,
                source: 'whatsapp',
                status: 'completed',
            })
            .select('id')
            .single();
        if (error || !header) {
            this.logger.warn(`commit purchase: ${error?.message}`);
            return 'Gagal menyimpan belanja.';
        }

        for (const it of pending.resolved) {
            await this.admin().from('studio_umkm_purchase_items').insert({
                purchase_id: header.id,
                item_id: it.itemId || null,
                item_name: it.name,
                quantity: it.quantity,
                unit_cost: it.unitCost,
                subtotal: it.quantity * it.unitCost,
            });
            if (it.itemId) {
                try {
                    await this.inventoryService.createStockMovement(tenantId, {
                        itemId: it.itemId,
                        movementType: 'MANUAL_IN',
                        quantity: it.quantity,
                        unitCost: it.unitCost,
                        referenceType: 'umkm_purchase',
                        referenceId: header.id,
                        reference: purchaseNumber,
                        notes: `Belanja WA ${purchaseNumber}`,
                    });
                } catch (e: any) {
                    this.logger.warn(`stock in after purchase: ${e?.message}`);
                }
            }
        }

        return [
            '✅ *Belanja tercatat*',
            `No. ${purchaseNumber}`,
            `Tanggal: ${pending.purchase.purchaseDate}`,
            `Total: ${formatIdrShort(pending.purchase.totalCost)}`,
        ].join('\n');
    }

    async buildPurchaseListMessage(
        tenantId: string,
        period: UmkmReportPeriod = 'all',
    ): Promise<string> {
        const range = periodRange(period);
        let q = this.admin()
            .from('studio_umkm_purchases')
            .select('purchase_number, purchase_date, total_cost, supplier_name')
            .eq('tenant_id', tenantId)
            .eq('status', 'completed')
            .order('purchase_date', { ascending: false })
            .limit(15);
        if (range.from) q = q.gte('purchase_date', range.from.slice(0, 10));
        if (range.to) q = q.lte('purchase_date', range.to.slice(0, 10));
        const { data, error } = await q;
        if (error) {
            this.logger.warn(`list purchases: ${error.message}`);
            return 'Gagal memuat daftar belanja.';
        }
        if (!data?.length) {
            return [
                `Belum ada belanja untuk *${range.label}*.`,
                'Ketik *3* di menu Belanja, atau *tambah belanja*, untuk mencatat.',
                'Ketik *0* untuk menu utama.',
            ].join('\n');
        }
        const lines = [`🛒 *Daftar belanja (${range.label})*`, ''];
        let total = 0;
        for (const row of data) {
            total += Number(row.total_cost || 0);
            lines.push(
                `• ${row.purchase_date} ${row.purchase_number} — ${formatIdrShort(Number(row.total_cost || 0))}`,
            );
        }
        lines.push('', `Total: *${formatIdrShort(total)}*`);
        lines.push('', 'Ketik *0* menu utama, atau *tambah belanja* untuk menambah.');
        return lines.join('\n');
    }

    async buildSalesListMessage(
        tenantId: string,
        period: UmkmReportPeriod = 'today',
    ): Promise<string> {
        const range = periodRange(period);
        let q = this.admin()
            .from('ecom_orders')
            .select('order_number, customer_name, total_amount, created_at')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(15);
        if (range.from) q = q.gte('created_at', range.from);
        if (range.to) q = q.lte('created_at', range.to);
        const { data, error } = await q;
        if (error) {
            this.logger.warn(`list sales: ${error.message}`);
            return 'Gagal memuat daftar penjualan.';
        }
        if (!data?.length) {
            return [
                `Belum ada penjualan untuk *${range.label}*.`,
                'Ketik *5* atau *jual 2 mie ayam 30000* untuk mencatat.',
                'Ketik *0* untuk menu utama.',
            ].join('\n');
        }
        const lines = [`💵 *Daftar penjualan (${range.label})*`, ''];
        let total = 0;
        for (const row of data) {
            total += Number(row.total_amount || 0);
            const when = String(row.created_at || '').slice(0, 16).replace('T', ' ');
            lines.push(`• ${when} ${row.order_number} — ${formatIdrShort(Number(row.total_amount || 0))}`);
        }
        lines.push('', `Total: *${formatIdrShort(total)}*`);
        lines.push('', 'Ketik *5* untuk tambah penjualan, atau *0* untuk menu utama.');
        return lines.join('\n');
    }

    async buildCombinedReportMessage(
        tenantId: string,
        period: UmkmReportPeriod = 'today',
    ): Promise<string> {
        const range = periodRange(period);

        let salesQ = this.admin()
            .from('ecom_orders')
            .select('total_amount, paid_amount, payment_status')
            .eq('tenant_id', tenantId);
        if (range.from) salesQ = salesQ.gte('created_at', range.from);
        if (range.to) salesQ = salesQ.lte('created_at', range.to);
        const { data: sales } = await salesQ;

        let buyQ = this.admin()
            .from('studio_umkm_purchases')
            .select('total_cost')
            .eq('tenant_id', tenantId)
            .eq('status', 'completed');
        if (range.from) buyQ = buyQ.gte('purchase_date', range.from.slice(0, 10));
        if (range.to) buyQ = buyQ.lte('purchase_date', range.to.slice(0, 10));
        const { data: buys } = await buyQ;

        const orderCount = sales?.length || 0;
        const revenue = (sales || []).reduce((s, r: any) => s + Number(r.total_amount || 0), 0);
        const purchaseTotal = (buys || []).reduce((s, r: any) => s + Number(r.total_cost || 0), 0);
        const margin = revenue - purchaseTotal;

        return [
            `📊 *Laporan ${range.label}*`,
            '',
            `Penjualan: *${orderCount}* order`,
            `Total penjualan: *${formatIdrShort(revenue)}*`,
            `Total belanja: *${formatIdrShort(purchaseTotal)}*`,
            `Selisih: *${formatIdrShort(margin)}*`,
            '',
            'Ketik *6* untuk laporan periode lain, atau *0* untuk menu utama.',
        ].join('\n');
    }

    async buildDailyReportMessage(tenantId = DEFAULT_TENANT): Promise<string> {
        return this.buildCombinedReportMessage(tenantId, 'today');
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

        const existingCfg =
            typeof notebook.context_config === 'object' && notebook.context_config
                ? (notebook.context_config as StudioContextConfig)
                : {};

        const merged: StudioContextConfig = {
            ...DEFAULT_STUDIO_UMKM_CONTEXT,
            ...existingCfg,
            umkm_mode: true,
            audience: 'customer',
            ...(resolvedTenant ? { tenant_id: resolvedTenant } : {}),
            // Seed default commands only when missing — never overwrite custom
            umkm_commands: existingCfg.umkm_commands
                ? existingCfg.umkm_commands
                : structuredClone(DEFAULT_UMKM_COMMANDS),
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

    /** Save configurable WA commands onto notebook context_config. */
    async updateUmkmCommands(
        notebookId: string,
        commandsRaw: unknown,
    ): Promise<{ notebookId: string; contextConfig: StudioContextConfig; commands: UmkmCommandsConfig }> {
        const commands = sanitizeUmkmCommandsInput(commandsRaw);

        const { data: notebook, error: nbErr } = await this.admin()
            .from('studio_notebooks')
            .select('id, context_config')
            .eq('id', notebookId)
            .single();
        if (nbErr || !notebook) throw nbErr || new Error('Notebook not found');

        const existing =
            typeof notebook.context_config === 'object' && notebook.context_config
                ? (notebook.context_config as StudioContextConfig)
                : {};
        const merged: StudioContextConfig = {
            ...existing,
            umkm_mode: true,
            umkm_commands: commands,
        };

        const { data, error } = await this.admin()
            .from('studio_notebooks')
            .update({ context_config: merged, updated_at: new Date() })
            .eq('id', notebookId)
            .select('id, context_config')
            .single();
        assertNoSupabaseError(error, 'Failed to update UMKM commands');

        return {
            notebookId: data.id,
            contextConfig: data.context_config as StudioContextConfig,
            commands,
        };
    }
}
