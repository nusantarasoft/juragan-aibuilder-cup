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
    formatWelcomeFromCommands,
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
    isUmkmGreetingOnly,
    detectUmkmMenuDigit,
    extractStockProductQuery,
    formatDailyReportWa,
    formatJobClarificationPrompt,
    formatPendingStickyHint,
    formatSaleCancelled,
    formatUmkmHelp,
    formatUnknownUmkmCommand,
    generateWaOrderNumber,
    isUmkmIntakeClearJob,
    isUmkmMenuOnly,
    leftoverAfterCousinSale,
    matchUmkmIntakeJob,
    normalizeUmkmQtyFirst,
    parsePendingQtyCorrection,
    parseSaleHeuristic,
    parseSaleJsonFromLlm,
    resumeJobClarification,
    stripUmkmJobVerbs,
    toAidlcIntent,
    UMKM_CLARIFY_EXPIRED_COPY,
    type ParsedUmkmSale,
    type UmkmDailyReport,
    type UmkmIntakeJobCandidate,
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
    enrichSaleDraftFromCatalog,
    resolveSaleItemsAgainstCatalog,
    type UmkmCatalogProduct,
    type UmkmSaleItemResolved,
    type UmkmStockRow,
} from './studio-umkm-product.util';
import {
    appendConfirmRiskToPreview,
    applySaleSlotReply,
    assessReadQueryClarity,
    assessSaleConfirmRisk,
    assessSaleSlots,
    emptySaleDraft,
    isExplicitAllStockQuery,
    nextSaleSlotQuestion,
    parseSaleDraftHeuristic,
    resolveReportPeriodReply,
    resolveStockScopeReply,
    saleDraftFromParsed,
    saleDraftToParsed,
    type SaleDraft,
} from './studio-umkm-confirm.util';
import {
    applyPurchaseSlotReply,
    assessPurchaseSlots,
    emptyPurchaseDraft,
    nextPurchaseSlotQuestion,
    parsePurchaseDraftHeuristic,
    purchaseDraftFromParsed,
    purchaseDraftToParsed,
    type PurchaseDraft,
} from './studio-umkm-purchase-slots.util';
import {
    deserializeWizard,
    isConversationalWizard,
    isKnownWizardKind,
    serializeWizardPayload,
    type UmkmWizard,
} from './studio-umkm-durable.util';
import { assertNoSupabaseError } from './studio-supabase.util';

const DEFAULT_TENANT = 'default';
const PENDING_TTL_MS = 15 * 60 * 1000;

type WizardResolve =
    | { status: 'ok'; wizard: UmkmWizard }
    | { status: 'none' }
    | { status: 'expired'; kind: string }
    | { status: 'unknown_kind' };

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

export type { UmkmWizard };

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
        void this.persistWizardToDb(tenantId, wizard, phone, conversationId);
    }

    private clearWizard(tenantId: string, phone?: string, conversationId?: string) {
        this.wizardByChat.delete(this.chatKey(tenantId, phone, conversationId));
        void this.clearWizardInDb(tenantId, phone, conversationId);
    }

    private logIntake(
        event: 'mixed' | 'sale' | 'ask' | 'help' | 'sticky' | 'expired',
        extra?: { candidates?: UmkmIntakeJobCandidate[]; wizardKind?: string },
    ) {
        const candidates = extra?.candidates?.length ? extra.candidates.join(',') : '-';
        const wizardKind = extra?.wizardKind || '-';
        this.logger.log(`umkm_intake=${event} candidates=${candidates} wizardKind=${wizardKind}`);
    }

    private expireMemoryWizard(
        tenantId: string,
        phone?: string,
        conversationId?: string,
    ): { expired: true; kind: string } | { wizard: UmkmWizard } | null {
        const key = this.chatKey(tenantId, phone, conversationId);
        const w = this.wizardByChat.get(key);
        if (!w) return null;
        if (Date.now() - w.createdAt > PENDING_TTL_MS) {
            this.wizardByChat.delete(key);
            void this.clearWizardInDb(tenantId, phone, conversationId, 'expired');
            this.logIntake('expired', { wizardKind: w.kind });
            return { expired: true, kind: w.kind };
        }
        return { wizard: w };
    }

    private getWizard(tenantId: string, phone?: string, conversationId?: string): UmkmWizard | null {
        const peeked = this.expireMemoryWizard(tenantId, phone, conversationId);
        return peeked && 'wizard' in peeked ? peeked.wizard : null;
    }

    /** Memory first, then durable wizard row. */
    async resolveWizard(
        tenantId: string,
        phone?: string,
        conversationId?: string,
    ): Promise<UmkmWizard | null> {
        const detailed = await this.resolveWizardDetailed(tenantId, phone, conversationId);
        return detailed.status === 'ok' ? detailed.wizard : null;
    }

    private async resolveWizardDetailed(
        tenantId: string,
        phone?: string,
        conversationId?: string,
    ): Promise<WizardResolve> {
        const mem = this.expireMemoryWizard(tenantId, phone, conversationId);
        if (mem && 'expired' in mem) return { status: 'expired', kind: mem.kind };
        if (mem && 'wizard' in mem) return { status: 'ok', wizard: mem.wizard };
        return this.loadWizardFromDbDetailed(tenantId, phone, conversationId);
    }

    async loadWizardFromDb(
        tenantId: string,
        phone?: string,
        conversationId?: string,
    ): Promise<UmkmWizard | null> {
        const detailed = await this.loadWizardFromDbDetailed(tenantId, phone, conversationId);
        return detailed.status === 'ok' ? detailed.wizard : null;
    }

    private async loadWizardFromDbDetailed(
        tenantId: string,
        phone?: string,
        conversationId?: string,
    ): Promise<WizardResolve> {
        try {
            let q = this.admin()
                .from('studio_umkm_session_wizards')
                .select('id, kind, payload, created_at, tenant_id, phone, expires_at')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1);

            if (conversationId) {
                q = q.eq('conversation_id', conversationId);
            } else if (phone) {
                q = q.eq('tenant_id', tenantId).eq('phone', phone);
            } else {
                return { status: 'none' };
            }

            const { data: rows, error } = await q;
            if (error) {
                this.logger.warn(`loadWizardFromDb: ${error.message}`);
                return { status: 'none' };
            }
            const data = Array.isArray(rows) ? rows[0] : rows;
            if (!data) return { status: 'none' };
            const createdAt = new Date(data.created_at).getTime();
            const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : NaN;
            const expired =
                (Number.isFinite(expiresAt) && expiresAt <= Date.now()) ||
                Date.now() - createdAt > PENDING_TTL_MS;
            const kindStr = String(data.kind);
            if (expired) {
                this.logIntake('expired', { wizardKind: kindStr });
                await this.clearWizardInDb(tenantId, phone, conversationId, 'expired');
                return { status: 'expired', kind: kindStr };
            }
            if (!isKnownWizardKind(kindStr)) {
                await this.clearWizardInDb(tenantId, phone, conversationId, 'cleared');
                return { status: 'unknown_kind' };
            }
            const wizard = deserializeWizard(kindStr, data.payload, createdAt);
            if (!wizard) {
                await this.clearWizardInDb(tenantId, phone, conversationId, 'cleared');
                return { status: 'unknown_kind' };
            }
            this.wizardByChat.set(this.chatKey(tenantId, phone, conversationId), wizard);
            return { status: 'ok', wizard };
        } catch (e: any) {
            this.logger.warn(`loadWizardFromDb error: ${e?.message}`);
            return { status: 'none' };
        }
    }

    async persistWizardToDb(
        tenantId: string,
        wizard: UmkmWizard,
        phone?: string,
        conversationId?: string,
    ): Promise<void> {
        const expiresAt = new Date(wizard.createdAt + PENDING_TTL_MS).toISOString();
        try {
            await this.clearWizardInDb(tenantId, phone, conversationId, 'cleared');
            const { error } = await this.admin().from('studio_umkm_session_wizards').insert({
                tenant_id: tenantId,
                conversation_id: conversationId ?? null,
                phone: phone ?? null,
                kind: wizard.kind,
                payload: serializeWizardPayload(wizard),
                status: 'active',
                expires_at: expiresAt,
            });
            if (error) this.logger.warn(`persistWizardToDb: ${error.message}`);
        } catch (e: any) {
            this.logger.warn(`persistWizardToDb error: ${e?.message}`);
        }
    }

    async clearWizardInDb(
        tenantId: string,
        phone?: string,
        conversationId?: string,
        status: 'cleared' | 'expired' = 'cleared',
    ): Promise<void> {
        try {
            let q = this.admin()
                .from('studio_umkm_session_wizards')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('tenant_id', tenantId)
                .eq('status', 'active');
            if (conversationId) {
                q = q.eq('conversation_id', conversationId);
            } else if (phone) {
                q = q.eq('phone', phone);
            } else {
                return;
            }
            const { error } = await q;
            if (error) this.logger.warn(`clearWizardInDb: ${error.message}`);
        } catch (e: any) {
            this.logger.warn(`clearWizardInDb error: ${e?.message}`);
        }
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

    private pendingKey(tenantId: string, phone?: string, conversationId?: string): string {
        return this.chatKey(tenantId, phone, conversationId);
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

    getPendingSale(
        tenantId: string,
        phone?: string,
        conversationId?: string,
    ): PendingUmkmSale | undefined {
        return this.pruneExpiredPending(this.pendingKey(tenantId, phone, conversationId));
    }

    setPendingSale(
        tenantId: string,
        pending: PendingUmkmSale,
        phone?: string,
        conversationId?: string,
    ): void {
        this.pendingByChat.set(this.pendingKey(tenantId, phone, conversationId), pending);
    }

    clearPendingSale(tenantId: string, phone?: string, conversationId?: string): void {
        this.pendingByChat.delete(this.pendingKey(tenantId, phone, conversationId));
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
        const mem = this.getPendingSale(opts.tenantId, opts.phone, opts.conversationId);
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
            this.setPendingSale(tid, pending, pending.phone, conversationId);
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
     * Returns null only for ask (router → agentic). Unknown returns help string.
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

        const pendingPurchase = await this.resolvePendingPurchase({
            tenantId,
            phone,
            conversationId,
        });
        if (pendingPurchase && confirm === 'confirm') {
            const msg = await this.commitPendingPurchase(pendingPurchase, tenantId);
            this.clearPendingPurchase(tenantId, phone, conversationId, 'committed');
            return msg;
        }
        if (pendingPurchase && confirm === 'cancel') {
            this.clearPendingPurchase(tenantId, phone, conversationId, 'cancelled');
            return '❌ Belanja dibatalkan.';
        }

        if (pending && confirm === 'confirm') {
            this.clearPendingSale(tenantId, phone, conversationId);
            this.clearWizard(tenantId, phone, conversationId);
            return this.commitPendingSale(pending, tenantId);
        }
        if (pending && confirm === 'cancel') {
            this.clearPendingSale(tenantId, phone, conversationId);
            await this.markPendingSaleStatus(pending.pendingId, 'cancelled');
            return formatSaleCancelled(commands);
        }
        if (pending) {
            const qtyFix = parsePendingQtyCorrection(text);
            if (qtyFix != null) {
                return this.revisePendingSaleQty(pending, qtyFix, tenantId, phone, conversationId, commands);
            }
        }

        const hasPendingMoney = !!(pending || pendingPurchase);
        if (hasPendingMoney && !isUmkmIntakeClearJob(text, commands)) {
            this.logIntake('sticky', { wizardKind: pending ? 'pending_sale' : 'pending_purchase' });
            return formatPendingStickyHint(pending ? 'sale' : 'purchase', commands);
        }

        if (!hasPendingMoney) {
            const wizardReply = await this.continueWizard(text, tenantId, phone, conversationId, config);
            if (wizardReply !== undefined) return wizardReply;
        }

        const feedback = detectUmkmFeedback(text);
        if (feedback) {
            await this.logFeedback(tenantId, feedback, { phone, conversationId });
            return formatFeedbackThanks(feedback);
        }

        if (isUmkmGreetingOnly(text)) {
            return formatWelcomeFromCommands(commands);
        }

        const intent = detectUmkmIntent(text, commands);
        if (intent === 'help') {
            this.clearWizard(tenantId, phone, conversationId);
            this.logIntake('help');
            return formatUmkmHelp(commands);
        }
        if (intent === 'ask') {
            this.clearWizard(tenantId, phone, conversationId);
            this.logIntake('ask');
            return null;
        }

        const intake = matchUmkmIntakeJob(text);
        if (intake.kind === 'mixed') {
            this.setWizard(
                tenantId,
                {
                    kind: 'await_job_clarification',
                    createdAt: Date.now(),
                    originalText: intake.originalText,
                    candidates: intake.candidates,
                    retryCount: 0,
                },
                phone,
                conversationId,
            );
            this.logIntake('mixed', {
                candidates: intake.candidates,
                wizardKind: 'await_job_clarification',
            });
            return formatJobClarificationPrompt(intake.candidates);
        }

        if (intake.kind === 'sale') {
            const leftover = leftoverAfterCousinSale(intake.originalText);
            const flags = {
                conversationId,
                allowFollowUp: true,
                skipLlm: true,
            };
            this.logIntake('sale');
            if (!leftover) {
                this.clearPendingSale(tenantId, phone, conversationId);
                if (pending?.pendingId) {
                    void this.markPendingSaleStatus(pending.pendingId, 'cancelled');
                } else {
                    void this.expirePendingSalesInDb(tenantId, phone, conversationId);
                }
                this.clearPendingPurchasePublic(tenantId, phone, conversationId);
                return this.recordSaleFromText('jual', tenantId, phone, config, flags);
            }
            return this.recordSaleFromText(
                normalizeUmkmQtyFirst(leftover),
                tenantId,
                phone,
                config,
                flags,
            );
        }

        this.logger.debug(`UMKM intent=${intent} aidlc=${toAidlcIntent(intent)}`);
        switch (intent) {
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
                if (intent === 'check_stock' || /cek\s+stok|berapa\s+stok|sisa\s+stok/i.test(text)) {
                    return this.handleCheckStockIntent(text, tenantId, phone, conversationId);
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
                this.logIntake('sale');
                return this.recordSaleFromText(text, tenantId, phone, config, { conversationId });
            case 'sales_report':
                return this.handleSalesReportIntent(text, tenantId, phone, conversationId);
            default:
                this.logIntake('help');
                return formatUnknownUmkmCommand(commands);
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
     * Shared stock intent for direct WA + guided flow (soft-confirm then NL follow-up).
     */
    async handleCheckStockIntent(
        text: string,
        tenantId = DEFAULT_TENANT,
        phone?: string,
        conversationId?: string,
    ): Promise<string> {
        const clarity = assessReadQueryClarity('stock', text);
        if (clarity.needsSoftConfirm && !isExplicitAllStockQuery(text)) {
            this.setWizard(
                tenantId,
                { kind: 'await_stock_scope', createdAt: Date.now() },
                phone,
                conversationId,
            );
            return clarity.question!;
        }
        this.clearWizard(tenantId, phone, conversationId);
        return this.buildStockCheckMessage(text, tenantId);
    }

    /**
     * Shared report intent for direct WA + guided flow (soft-confirm period then build).
     */
    async handleSalesReportIntent(
        text: string,
        tenantId = DEFAULT_TENANT,
        phone?: string,
        conversationId?: string,
    ): Promise<string> {
        this.clearWizard(tenantId, phone, conversationId);
        const clarity = assessReadQueryClarity('report', text);
        if (clarity.needsSoftConfirm) {
            this.setWizard(
                tenantId,
                { kind: 'await_report_period', createdAt: Date.now() },
                phone,
                conversationId,
            );
            return clarity.question!;
        }
        const period = detectReportPeriod(text) || 'today';
        return this.buildCombinedReportMessage(tenantId, period);
    }

    /**
     * Parse + catalog match → preview (does not write DB). Used by guided flow + direct mode.
     * Incomplete sales return need_slots so the chat can ask natural follow-ups (no digit menu).
     */
    async prepareSaleFromText(
        text: string,
        tenantId = DEFAULT_TENANT,
        phone?: string,
        config?: StudioContextConfig,
        options?: { allowFollowUp?: boolean; skipLlm?: boolean },
    ): Promise<
        | { kind: 'preview'; message: string; pending: PendingUmkmSale }
        | { kind: 'need_slots'; message: string; draft: SaleDraft }
        | { kind: 'error'; message: string }
    > {
        const commands = this.resolveCommands(config);
        if (isUmkmMenuOnly(text) && detectUmkmIntent(text, commands) === 'record_sale') {
            const draft = emptySaleDraft();
            const slots = assessSaleSlots(draft);
            return {
                kind: 'need_slots',
                draft,
                message: [
                    'Siap catat penjualan.',
                    nextSaleSlotQuestion(slots, draft),
                ].join('\n'),
            };
        }

        const parsed = await this.parseSaleMessage(text, commands, { skipLlm: options?.skipLlm });
        const draft =
            (parsed ? saleDraftFromParsed(parsed) : null) ||
            parseSaleDraftHeuristic(text, commands, { allowFollowUp: options?.allowFollowUp });

        if (!draft) {
            return {
                kind: 'error',
                message: [
                    'Maaf, saya belum bisa memahami detail penjualannya.',
                    '',
                    'Coba kirim seperti: *jual 3 es kopi 45000*',
                    'Atau ketik *jual* lalu jawab pertanyaan saya satu per satu.',
                    '',
                    `Ketik *${(commands.keywords.list_products || [])[0] || 'daftar barang'}* untuk lihat produk, atau *batal* untuk batal.`,
                ].join('\n'),
            };
        }

        // Seller-first: isi harga dari katalog sebelum minta slot harga
        const products = await this.fetchActiveProducts(tenantId);
        const enriched = enrichSaleDraftFromCatalog(draft, products);
        const slots = assessSaleSlots(enriched);
        if (!slots.ok) {
            return {
                kind: 'need_slots',
                draft: enriched,
                message: nextSaleSlotQuestion(slots, enriched),
            };
        }

        return this.previewFromSaleDraft(saleDraftToParsed(enriched), tenantId, phone, config);
    }

    /** Build confirm preview from a complete sale draft. */
    private async previewFromSaleDraft(
        parsed: ParsedUmkmSale,
        tenantId: string,
        phone?: string,
        config?: StudioContextConfig,
    ): Promise<
        | { kind: 'preview'; message: string; pending: PendingUmkmSale }
        | { kind: 'error'; message: string }
    > {
        const commands = this.resolveCommands(config);
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

        const risk = assessSaleConfirmRisk(resolved);
        const preview = appendConfirmRiskToPreview(
            formatSalePreviewWithCatalog(
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
            risk,
        );

        return {
            kind: 'preview',
            pending,
            message: preview,
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
        let msg = formatSaleConfirmationWithCatalog({
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            items: pending.resolved,
            paymentMethod: pending.sale.paymentMethod,
        });
        if (order.stockWarnings?.length) {
            msg += [
                '',
                '⚠️ Penjualan tersimpan, tapi stok belum terpotong untuk:',
                ...order.stockWarnings.map((n) => `• ${n}`),
                'Cek *cek stok [nama]* atau potong manual via *tambah stok*.',
            ].join('\n');
        }
        return msg;
    }

    async recordSaleFromText(
        text: string,
        tenantId = DEFAULT_TENANT,
        phone?: string,
        config?: StudioContextConfig,
        options?: { conversationId?: string; allowFollowUp?: boolean; skipLlm?: boolean },
    ): Promise<string> {
        const prepared = await this.prepareSaleFromText(text, tenantId, phone, config, {
            allowFollowUp: options?.allowFollowUp,
            skipLlm: options?.skipLlm,
        });
        if (prepared.kind === 'error') return prepared.message;
        if (prepared.kind === 'need_slots') {
            this.clearPendingPurchasePublic(tenantId, phone, options?.conversationId);
            this.setWizard(
                tenantId,
                { kind: 'await_sale_slots', draft: prepared.draft, createdAt: Date.now() },
                phone,
                options?.conversationId,
            );
            return prepared.message;
        }
        this.clearPendingPurchasePublic(tenantId, phone, options?.conversationId);
        const pendingId = await this.persistPendingSaleToDb(tenantId, prepared.pending, {
            conversationId: options?.conversationId,
            phone,
        });
        if (pendingId) prepared.pending.pendingId = pendingId;
        this.setPendingSale(tenantId, prepared.pending, phone, options?.conversationId);
        return prepared.message;
    }

    async revisePendingSaleQty(
        pending: PendingUmkmSale,
        qty: number,
        tenantId: string,
        phone?: string,
        conversationId?: string,
        commands?: UmkmCommandsConfig,
    ): Promise<string> {
        const resolved = pending.resolved.map((it, i) =>
            i === 0 || pending.resolved.length === 1 ? { ...it, quantity: qty } : it,
        );
        const saleItems = pending.sale.items.map((it, i) =>
            i === 0 || pending.sale.items.length === 1 ? { ...it, quantity: qty } : it,
        );
        const totalAmount = resolved.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
        const next: PendingUmkmSale = {
            ...pending,
            sale: { ...pending.sale, items: saleItems, totalAmount },
            resolved,
            createdAt: Date.now(),
        };
        const pendingId = await this.persistPendingSaleToDb(tenantId, next, { conversationId, phone });
        if (pendingId) next.pendingId = pendingId;
        this.setPendingSale(tenantId, next, phone, conversationId);
        return formatSalePreviewWithCatalog(
            {
                totalAmount,
                items: resolved,
                paymentMethod: next.sale.paymentMethod,
                customerName: next.sale.customerName,
            },
            { confirm: commands?.confirm?.[0], cancel: commands?.cancel?.[0] },
        );
    }

    async parseSaleMessage(
        text: string,
        commands?: UmkmCommandsConfig | unknown,
        options?: { skipLlm?: boolean },
    ): Promise<ParsedUmkmSale | null> {
        // Avoid LLM hallucination on CS menu digits (e.g. "1")
        if (isUmkmMenuOnly(text)) return null;

        const heuristic = parseSaleHeuristic(text, commands);
        if (heuristic) return heuristic;

        if (options?.skipLlm) return null;

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
    ): Promise<{
        orderNumber: string;
        totalAmount: number;
        orderId: string;
        stockWarnings: string[];
    }> {
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

        const stockWarnings = await this.deductStockForSale(
            tenantId,
            order.id,
            orderNumber,
            resolvedItems,
        );

        this.logger.log(`UMKM sale recorded: ${orderNumber} tenant=${tenantId} total=${subtotal}`);
        return {
            orderId: order.id,
            orderNumber: order.order_number,
            totalAmount: Number(order.total_amount),
            stockWarnings,
        };
    }

    /** AIDLC: potong stok otomatis saat commit (hanya item yang match katalog). */
    private async deductStockForSale(
        tenantId: string,
        orderId: string,
        orderNumber: string,
        resolvedItems?: UmkmSaleItemResolved[],
    ): Promise<string[]> {
        const failed: string[] = [];
        if (!resolvedItems?.length) return failed;
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
                failed.push(item.name);
            }
        }
        return failed;
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
            this.pendingPurchaseByChat.delete(this.chatKey(tenantId, phone, conversationId));
            void this.clearPendingPurchasesInDb(tenantId, phone, conversationId, 'expired');
            return null;
        }
        return p;
    }

    clearPendingPurchasePublic(tenantId: string, phone?: string, conversationId?: string) {
        this.clearPendingPurchase(tenantId, phone, conversationId, 'cancelled');
    }

    private clearPendingPurchase(
        tenantId: string,
        phone?: string,
        conversationId?: string,
        status: 'cancelled' | 'committed' | 'expired' = 'cancelled',
    ) {
        const key = this.chatKey(tenantId, phone, conversationId);
        const existing = this.pendingPurchaseByChat.get(key);
        this.pendingPurchaseByChat.delete(key);
        if (existing?.pendingId) {
            void this.markPendingPurchaseStatus(existing.pendingId, status);
        } else {
            void this.clearPendingPurchasesInDb(tenantId, phone, conversationId, status);
        }
    }

    private setPendingPurchase(
        tenantId: string,
        pending: PendingUmkmPurchase,
        phone?: string,
        conversationId?: string,
    ) {
        this.pendingPurchaseByChat.set(this.chatKey(tenantId, phone, conversationId), pending);
        void this.persistPendingPurchaseToDb(tenantId, pending, { phone, conversationId }).then(
            (id) => {
                if (id) pending.pendingId = id;
            },
        );
    }

    async resolvePendingPurchase(opts: {
        tenantId: string;
        phone?: string;
        conversationId?: string;
    }): Promise<PendingUmkmPurchase | undefined> {
        const mem = this.getPendingPurchase(opts.tenantId, opts.phone, opts.conversationId);
        if (mem) return mem;
        return this.loadPendingPurchaseFromDb(opts.tenantId, opts.phone, opts.conversationId);
    }

    async loadPendingPurchaseFromDb(
        tenantId: string,
        phone?: string,
        conversationId?: string,
    ): Promise<PendingUmkmPurchase | undefined> {
        try {
            let q = this.admin()
                .from('studio_umkm_pending_purchases')
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
                this.logger.warn(`loadPendingPurchaseFromDb: ${error.message}`);
                return undefined;
            }
            const data = Array.isArray(rows) ? rows[0] : rows;
            if (!data) return undefined;
            const payload = data.payload as {
                purchase?: PendingUmkmPurchase['purchase'];
                resolved?: PendingUmkmPurchase['resolved'];
                phone?: string;
            };
            if (!payload?.purchase || !payload?.resolved) return undefined;
            const pending: PendingUmkmPurchase = {
                purchase: payload.purchase,
                resolved: payload.resolved,
                phone: payload.phone ?? phone ?? (data.phone ? String(data.phone) : undefined),
                createdAt: new Date(data.created_at).getTime(),
                pendingId: String(data.id),
            };
            this.pendingPurchaseByChat.set(
                this.chatKey(tenantId, pending.phone, conversationId),
                pending,
            );
            return pending;
        } catch (e: any) {
            this.logger.warn(`loadPendingPurchaseFromDb error: ${e?.message}`);
            return undefined;
        }
    }

    async persistPendingPurchaseToDb(
        tenantId: string,
        pending: PendingUmkmPurchase,
        opts?: { conversationId?: string; phone?: string },
    ): Promise<string | undefined> {
        const expiresAt = new Date(pending.createdAt + PENDING_TTL_MS).toISOString();
        const phone = opts?.phone ?? pending.phone ?? null;
        const conversationId = opts?.conversationId ?? null;
        try {
            await this.clearPendingPurchasesInDb(
                tenantId,
                phone || undefined,
                conversationId || undefined,
                'expired',
            );
            const { data, error } = await this.admin()
                .from('studio_umkm_pending_purchases')
                .insert({
                    tenant_id: tenantId,
                    conversation_id: conversationId,
                    phone,
                    payload: {
                        purchase: pending.purchase,
                        resolved: pending.resolved,
                        phone: pending.phone,
                    },
                    status: 'pending',
                    expires_at: expiresAt,
                })
                .select('id')
                .single();
            if (error) {
                this.logger.warn(`persistPendingPurchaseToDb: ${error.message}`);
                return undefined;
            }
            return data?.id ? String(data.id) : undefined;
        } catch (e: any) {
            this.logger.warn(`persistPendingPurchaseToDb error: ${e?.message}`);
            return undefined;
        }
    }

    async markPendingPurchaseStatus(
        pendingId: string | undefined,
        status: 'committed' | 'cancelled' | 'expired',
    ): Promise<void> {
        if (!pendingId) return;
        try {
            const { error } = await this.admin()
                .from('studio_umkm_pending_purchases')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', pendingId);
            if (error) this.logger.warn(`markPendingPurchaseStatus: ${error.message}`);
        } catch (e: any) {
            this.logger.warn(`markPendingPurchaseStatus error: ${e?.message}`);
        }
    }

    async clearPendingPurchasesInDb(
        tenantId: string,
        phone?: string,
        conversationId?: string,
        status: 'cancelled' | 'committed' | 'expired' = 'cancelled',
    ): Promise<void> {
        try {
            let q = this.admin()
                .from('studio_umkm_pending_purchases')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('tenant_id', tenantId)
                .eq('status', 'pending');
            if (conversationId) {
                q = q.eq('conversation_id', conversationId);
            } else if (phone) {
                q = q.eq('phone', phone);
            } else {
                return;
            }
            const { error } = await q;
            if (error) this.logger.warn(`clearPendingPurchasesInDb: ${error.message}`);
        } catch (e: any) {
            this.logger.warn(`clearPendingPurchasesInDb error: ${e?.message}`);
        }
    }

    /** Continue active submenu/wizard; undefined = no wizard / re-route to top-level intent. */
    async continueWizard(
        text: string,
        tenantId: string,
        phone?: string,
        conversationId?: string,
        config?: StudioContextConfig,
    ): Promise<string | undefined> {
        const resolved = await this.resolveWizardDetailed(tenantId, phone, conversationId);
        const commands = this.resolveCommands(config);
        if (resolved.status === 'expired') {
            if (resolved.kind === 'await_job_clarification') {
                return UMKM_CLARIFY_EXPIRED_COPY;
            }
            return undefined;
        }
        if (resolved.status === 'unknown_kind') {
            return formatUmkmHelp(commands);
        }
        if (resolved.status !== 'ok') return undefined;
        const wizard = resolved.wizard;
        const t = text.trim();

        // Escape hatch: batal / cancel exits any wizard
        if (detectUmkmConfirmReply(t, commands) === 'cancel') {
            this.clearWizard(tenantId, phone, conversationId);
            if (isConversationalWizard(wizard.kind)) {
                return '❌ Dibatalkan. Ketik *jual ...*, *cek stok ...*, atau *laporan ...* kapan saja.';
            }
            return `❌ Dibatalkan.\n\n${formatUmkmHelp(commands)}`;
        }

        // Slot wizards must not swallow cek stok / laporan / daftar as the next "nama barang".
        // Bare numbers stay in-slot (qty / harga modal). Clarify wizard keeps jual/belanja.
        const inSlotWizard =
            (isConversationalWizard(wizard.kind) && wizard.kind !== 'await_job_clarification') ||
            wizard.kind === 'menu_hub' ||
            wizard.kind === 'purchase_hub' ||
            wizard.kind === 'report_hub';
        const bareSlotNumber = /^\d+([.,]\d+)?(\s*(?:rb|ribu|pcs|porsi|buah|x))?$/i.test(t);
        if (inSlotWizard && !bareSlotNumber && isUmkmIntakeClearJob(t, commands)) {
            this.clearWizard(tenantId, phone, conversationId);
            return undefined;
        }

        if (wizard.kind === 'await_job_clarification') {
            return this.continueJobClarification(wizard, t, tenantId, phone, conversationId, config);
        }

        if (wizard.kind === 'menu_hub') {
            const choice =
                t === '1' || /^(daftar(\s+(menu|barang|produk))?|lihat\s+menu)$/i.test(t)
                    ? '1'
                    : t === '2' || /^(tambah\s+(menu|barang|produk)|menu\s+baru)$/i.test(t)
                      ? '2'
                      : t === '3' || /^(tambah\s+stok|stok\s+masuk)$/i.test(t)
                        ? '3'
                        : null;
            if (choice === '1') {
                this.clearWizard(tenantId, phone, conversationId);
                return this.buildProductListMessage(tenantId);
            }
            if (choice === '2') {
                this.setWizard(tenantId, { kind: 'await_add_product', createdAt: Date.now() }, phone, conversationId);
                return [
                    'Kirim nama menu dan harga — contoh: *mie ayam 15000*',
                    'Atau *bakso modal 10000 18000*',
                    '',
                    'Ketik *batal* untuk kembali.',
                ].join('\n');
            }
            if (choice === '3') {
                this.setWizard(tenantId, { kind: 'await_add_stock', createdAt: Date.now() }, phone, conversationId);
                return [
                    'Kirim nama menu dan jumlah — contoh: *mie ayam 10*',
                    '',
                    'Ketik *batal* untuk kembali.',
                ].join('\n');
            }
            return formatMenuHubUnknownChoice();
        }

        if (wizard.kind === 'purchase_hub') {
            const choice =
                t === '1' || /^(daftar(\s+belanja)?|semua)$/i.test(t)
                    ? '1'
                    : t === '2' || /^(bulan(\s+ini)?|belanja\s+bulan)$/i.test(t)
                      ? '2'
                      : t === '3' || /^(tambah(\s+belanja)?|catat\s+belanja|belanja)$/i.test(t)
                        ? '3'
                        : null;
            if (choice === '1') {
                this.clearWizard(tenantId, phone, conversationId);
                return this.buildPurchaseListMessage(tenantId, 'all');
            }
            if (choice === '2') {
                this.clearWizard(tenantId, phone, conversationId);
                return this.buildPurchaseListMessage(tenantId, 'month');
            }
            if (choice === '3') {
                this.setWizard(
                    tenantId,
                    { kind: 'await_purchase', createdAt: Date.now(), draft: emptyPurchaseDraft() },
                    phone,
                    conversationId,
                );
                return [
                    'Siap catat belanja.',
                    nextPurchaseSlotQuestion(
                        assessPurchaseSlots(emptyPurchaseDraft()),
                        emptyPurchaseDraft(),
                    ),
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
            const period = map[t] || detectReportPeriod(t) || resolveReportPeriodReply(t);
            if (period) {
                this.clearWizard(tenantId, phone, conversationId);
                return this.buildCombinedReportMessage(tenantId, period);
            }
            return formatReportHubUnknownChoice();
        }

        // Input wizards: bare menu digit exits so top-level menu can run
        // (except sale/purchase slot-fill — digits are qty/harga answers)
        const isInputWizard =
            wizard.kind === 'await_add_product' || wizard.kind === 'await_add_stock';
        if (isInputWizard && detectUmkmMenuDigit(t, commands)) {
            this.clearWizard(tenantId, phone, conversationId);
            return undefined;
        }

        if (wizard.kind === 'await_sale_slots') {
            const merged = applySaleSlotReply(wizard.draft, t, commands);
            const products = await this.fetchActiveProducts(tenantId);
            const enriched = enrichSaleDraftFromCatalog(merged, products);
            const slots = assessSaleSlots(enriched);
            if (!slots.ok) {
                this.setWizard(
                    tenantId,
                    { kind: 'await_sale_slots', draft: enriched, createdAt: Date.now() },
                    phone,
                    conversationId,
                );
                return nextSaleSlotQuestion(slots, enriched);
            }
            this.clearWizard(tenantId, phone, conversationId);
            const prepared = await this.previewFromSaleDraft(
                saleDraftToParsed(enriched),
                tenantId,
                phone,
                config,
            );
            if (prepared.kind === 'error') return prepared.message;
            const pendingId = await this.persistPendingSaleToDb(tenantId, prepared.pending, {
                conversationId,
                phone,
            });
            if (pendingId) prepared.pending.pendingId = pendingId;
            this.setPendingSale(tenantId, prepared.pending, phone, conversationId);
            return prepared.message;
        }

        if (wizard.kind === 'await_stock_scope') {
            const scope = resolveStockScopeReply(t);
            if (!scope) {
                return [
                    'Belum jelas.',
                    'Balas *semua* atau kirim *nama barang* (contoh: *kopi*).',
                    'Ketik *batal* untuk batal.',
                ].join('\n');
            }
            this.clearWizard(tenantId, phone, conversationId);
            if (scope.kind === 'all') {
                return this.buildStockCheckMessage('cek stok semua', tenantId);
            }
            return this.buildStockCheckMessage(`cek stok ${scope.query}`, tenantId);
        }

        if (wizard.kind === 'await_report_period') {
            const period = resolveReportPeriodReply(t);
            if (!period) {
                return [
                    'Periode belum jelas.',
                    'Balas *hari ini*, *minggu ini*, atau *bulan ini*.',
                    'Ketik *batal* untuk batal.',
                ].join('\n');
            }
            this.clearWizard(tenantId, phone, conversationId);
            return this.buildCombinedReportMessage(tenantId, period);
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
        this.clearWizard(tenantId, phone, conversationId);
        return formatUnknownUmkmCommand(commands);
    }

    private async continueJobClarification(
        wizard: Extract<UmkmWizard, { kind: 'await_job_clarification' }>,
        text: string,
        tenantId: string,
        phone: string | undefined,
        conversationId: string | undefined,
        config?: StudioContextConfig,
    ): Promise<string> {
        const commands = this.resolveCommands(config);
        if (detectUmkmConfirmReply(text, commands) === 'confirm') {
            return formatJobClarificationPrompt(wizard.candidates);
        }
        const resume = resumeJobClarification(text, wizard.candidates);
        if (resume.action === 'forced') {
            this.clearWizard(tenantId, phone, conversationId);
            return this.runForcedIntakeJob(
                resume.intent,
                wizard.originalText,
                tenantId,
                phone,
                conversationId,
                config,
            );
        }
        if (wizard.retryCount >= 1) {
            this.clearWizard(tenantId, phone, conversationId);
            this.logIntake('help', { wizardKind: 'await_job_clarification' });
            return formatUmkmHelp(commands);
        }
        this.setWizard(
            tenantId,
            {
                kind: 'await_job_clarification',
                createdAt: Date.now(),
                originalText: wizard.originalText,
                candidates: wizard.candidates,
                retryCount: 1,
            },
            phone,
            conversationId,
        );
        return formatJobClarificationPrompt(wizard.candidates);
    }

    private async runForcedIntakeJob(
        intent: UmkmIntakeJobCandidate,
        originalText: string,
        tenantId: string,
        phone: string | undefined,
        conversationId: string | undefined,
        config?: StudioContextConfig,
    ): Promise<string> {
        const stripped = stripUmkmJobVerbs(originalText);
        if (intent === 'sale') {
            const qtyFirst = normalizeUmkmQtyFirst(stripped);
            this.logIntake('sale', { wizardKind: 'await_job_clarification' });
            return this.recordSaleFromText(qtyFirst, tenantId, phone, config, {
                conversationId,
                allowFollowUp: true,
                skipLlm: true,
            });
        }
        if (intent === 'add_stock') {
            return this.beginOrRunAddStock(stripped || originalText, tenantId, phone, conversationId, false, {
                skipMenuHub: true,
            });
        }
        if (intent === 'purchase') {
            return this.beginOrRunPurchase(stripped || originalText, tenantId, phone, conversationId, config);
        }
        return this.handleCheckStockIntent(`cek stok ${stripped}`.trim(), tenantId, phone, conversationId);
    }

    /** Clear stuck wizard (e.g. after failed add-product). */
    clearWizardPublic(tenantId: string, phone?: string, conversationId?: string) {
        this.clearWizard(tenantId, phone, conversationId);
    }

    /**
     * Wipe in-flight UMKM state for a chat (wizard + pending sale/purchase).
     * Used by admin Sim Reset so UI clear also drops sticky multi-turn state.
     */
    resetSessionState(tenantId: string, phone?: string, conversationId?: string): void {
        const tid = String(tenantId || '').trim();
        if (!tid) return;
        const memPending = this.getPendingSale(tid, phone, conversationId);
        this.clearPendingSale(tid, phone, conversationId);
        if (memPending?.pendingId) {
            void this.markPendingSaleStatus(memPending.pendingId, 'cancelled');
        } else {
            void this.expirePendingSalesInDb(tid, phone, conversationId);
        }
        this.clearPendingPurchase(tid, phone, conversationId, 'cancelled');
        this.clearWizard(tid, phone, conversationId);
    }

    private async expirePendingSalesInDb(
        tenantId: string,
        phone?: string,
        conversationId?: string,
    ): Promise<void> {
        try {
            let q = this.admin()
                .from('studio_umkm_pending_sales')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('tenant_id', tenantId)
                .eq('status', 'pending');
            if (conversationId) {
                q = q.eq('conversation_id', conversationId);
            } else if (phone) {
                q = q.eq('phone', phone);
            } else {
                return;
            }
            const { error } = await q;
            if (error) this.logger.warn(`expirePendingSalesInDb: ${error.message}`);
        } catch (e: any) {
            this.logger.warn(`expirePendingSalesInDb error: ${e?.message}`);
        }
    }

    /** Stage multi-turn sale slot fill (guided / external callers). */
    startSaleSlotFill(
        tenantId: string,
        draft: SaleDraft,
        phone?: string,
        conversationId?: string,
    ) {
        this.setWizard(
            tenantId,
            { kind: 'await_sale_slots', draft, createdAt: Date.now() },
            phone,
            conversationId,
        );
    }

    async beginOrRunAddProduct(
        text: string,
        tenantId: string,
        phone?: string,
        conversationId?: string,
        fromWizard = false,
    ): Promise<string> {
        const wizard = this.getWizard(tenantId, phone, conversationId);
        const pendingDraft =
            wizard?.kind === 'await_add_product' ? wizard.draft : undefined;

        let parsed = parseAddProductMessage(text);

        // Seller-first: balas harga saja setelah nama sudah diisi
        if (pendingDraft?.name && (!parsed || parsed.sellingPrice <= 0)) {
            const combined = parseAddProductMessage(`${pendingDraft.name} ${text.trim()}`);
            if (combined && combined.sellingPrice > 0) {
                parsed = {
                    ...combined,
                    costPrice: combined.costPrice ?? pendingDraft.costPrice,
                };
            }
        }

        if (!parsed) {
            if (!fromWizard) {
                this.setWizard(
                    tenantId,
                    { kind: 'await_add_product', createdAt: Date.now() },
                    phone,
                    conversationId,
                );
            }
            return explainAddProductParseFailure(text);
        }

        // Jangan simpan menu harga 0 — tanya harga dulu
        if (parsed.sellingPrice <= 0) {
            this.setWizard(
                tenantId,
                {
                    kind: 'await_add_product',
                    createdAt: Date.now(),
                    draft: { name: parsed.name, costPrice: parsed.costPrice },
                },
                phone,
                conversationId,
            );
            return [
                `Oke — *${parsed.name}*.`,
                'Harga jual berapa?',
                'Balas angkanya saja — contoh: *18000* atau *18rb*.',
                'Ketik *batal* untuk batal.',
            ].join('\n');
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
                `• ${item.name}`,
                `• Harga jual: ${formatIdrShort(Number(item.selling_price || 0))}`,
                '',
                'Mau *tambah menu lagi*, *tambah stok*, atau *daftar barang*?',
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
        options?: { skipMenuHub?: boolean },
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
            if (options?.skipMenuHub) {
                this.clearWizard(tenantId, phone, conversationId);
            } else {
                this.setWizard(tenantId, { kind: 'menu_hub', createdAt: Date.now() }, phone, conversationId);
            }
            return [
                `✅ Stok *${match.name}* +${parsed.quantity}`,
                '',
                options?.skipMenuHub
                    ? 'Mau *tambah stok* lagi, *jual*, atau *daftar barang*?'
                    : 'Mau *tambah stok lagi*, *tambah menu*, atau *daftar barang*?',
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
        const wizard = this.getWizard(tenantId, phone, conversationId);
        const existingDraft =
            wizard?.kind === 'await_purchase' && wizard.draft ? wizard.draft : null;

        const complete = parsePurchaseHeuristic(text);
        let draft: PurchaseDraft;

        if (complete && assessPurchaseSlots(complete).ok) {
            draft = purchaseDraftFromParsed(complete);
        } else if (existingDraft && fromWizard) {
            draft = applyPurchaseSlotReply(existingDraft, text);
        } else {
            const loose = parsePurchaseDraftHeuristic(text);
            if (loose) {
                draft = loose;
            } else if (/^(tambah\s+belanja|catat\s+belanja|belanja)\s*$/i.test(text.trim())) {
                draft = emptyPurchaseDraft();
            } else if (!fromWizard) {
                this.setWizard(
                    tenantId,
                    { kind: 'await_purchase', createdAt: Date.now(), draft: emptyPurchaseDraft() },
                    phone,
                    conversationId,
                );
                return [
                    'Siap catat belanja.',
                    nextPurchaseSlotQuestion(
                        assessPurchaseSlots(emptyPurchaseDraft()),
                        emptyPurchaseDraft(),
                    ),
                ].join('\n');
            } else {
                draft = existingDraft || emptyPurchaseDraft();
                draft = applyPurchaseSlotReply(draft, text);
            }
        }

        const slots = assessPurchaseSlots(draft);
        if (!slots.ok) {
            this.setWizard(
                tenantId,
                { kind: 'await_purchase', draft, createdAt: Date.now() },
                phone,
                conversationId,
            );
            const q = nextPurchaseSlotQuestion(slots, draft);
            if (
                !fromWizard &&
                /^(tambah\s+belanja|catat\s+belanja|belanja)\s*$/i.test(text.trim())
            ) {
                return ['Siap catat belanja.', q].join('\n');
            }
            return q;
        }

        return this.previewPurchase(purchaseDraftToParsed(draft), tenantId, phone, conversationId);
    }

    private async previewPurchase(
        parsed: ParsedUmkmPurchase,
        tenantId: string,
        phone?: string,
        conversationId?: string,
    ): Promise<string> {
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
            purchase: {
                ...parsed,
                totalCost: resolved.reduce((s, r) => s + r.quantity * r.unitCost, 0),
            },
            resolved,
            phone,
            createdAt: Date.now(),
        };
        this.clearPendingSale(tenantId, phone, conversationId);
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
            'Mau lihat *minggu ini* atau *bulan ini*? Ketik *laporan minggu ini* / *laporan bulan ini*.',
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
