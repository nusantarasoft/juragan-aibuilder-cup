import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { WahaClientService } from '../waha/waha-client.service';
import { StudioService } from './studio.service';
import { GuideFlowService } from './guide-flow.service';
import { StudioDbContextService, getUmkmCommandsFromConfig } from './studio-db-context.service';
import { StudioUmkmService } from './studio-umkm.service';
import { StudioUmkmAgenticAskService } from './studio-umkm-agentic-ask.service';
import {
    detectUmkmFeedback,
    formatFeedbackThanks,
} from './studio-umkm-feedback.util';
import {
    canonicalUmkmConfirmText,
    detectUmkmConfirmReply,
    detectUmkmIntent,
    extractUmkmButtonReply,
    formatUmkmHelp,
    formatUnknownUmkmCommand,
    isUmkmMoneyConfirmPreview,
    umkmConfirmButtons,
} from './studio-umkm.util';
import { assertNoSupabaseError } from './studio-supabase.util';
import {
    collectUmkmOwnerPhones,
    extractBusinessPhoneFromPayload,
    normalizePhoneDigits,
    phonesMatch,
    pickSingleTenantFallback,
    pickTenantConfigBySenderPhone,
    StudioWhatsAppRateLimiter,
    stripWhatsAppMediaAnnotations,
    wahaPayloadHasMedia,
} from './studio-whatsapp.util';

const WA_CHUNK = 4000;
export const DEFAULT_TENANT = 'default';
const DEFAULT_RATE_LIMIT_PER_MINUTE = 10;
const RATE_LIMIT_MESSAGE =
    'Terlalu banyak pesan dalam waktu singkat. Mohon tunggu sebentar sebelum mengirim lagi.';
const UNREGISTERED_SENDER_MESSAGE =
    'Nomor Anda belum terdaftar sebagai pemilik UMKM. Hubungi admin untuk mendaftarkan nomor HP Anda.';
export const UMKM_INBOUND_APOLOGY = 'Sistem sibuk, ketik ulang.';

export type StudioWhatsAppConfigRow = {
    tenant_id: string;
    notebook_id: string | null;
    waha_session: string | null;
    business_phone: string | null;
    label: string | null;
    enabled: boolean;
    allowlist_phones: string[] | null;
    use_guided_flow: boolean;
    updated_at?: string;
};

@Injectable()
export class StudioWhatsAppService {
    private readonly logger = new Logger(StudioWhatsAppService.name);
    private readonly rateLimiter: StudioWhatsAppRateLimiter;

    constructor(
        private readonly configService: ConfigService,
        private readonly supabaseService: SupabaseService,
        private readonly wahaClient: WahaClientService,
        private readonly studioService: StudioService,
        private readonly guideFlowService: GuideFlowService,
        private readonly dbContextService: StudioDbContextService,
        private readonly umkmService: StudioUmkmService,
        private readonly agenticAskService: StudioUmkmAgenticAskService,
    ) {
        this.rateLimiter = new StudioWhatsAppRateLimiter(this.getRateLimitPerMinute());
    }

    /** Cron helper: enabled configs with notebook. */
    async listEnabledConfigsForCron(): Promise<StudioWhatsAppConfigRow[]> {
        const all = await this.listConfigs();
        return all.filter((c) => c.enabled && c.notebook_id);
    }

    /** Outbound text to phone (digits or chatId). Used by daily report cron — WAHA only. */
    async sendOutboundText(phoneOrChatId: string, text: string, session?: string): Promise<boolean> {
        const chatId = phoneOrChatId.includes('@')
            ? phoneOrChatId
            : this.wahaClient.phoneToChatId(phoneOrChatId);
        const res = await this.wahaClient.sendText(chatId, text, session);
        if (!res.success) {
            this.logger.warn(`sendOutboundText failed (WAHA): ${res.error}`);
        }
        return res.success;
    }

    private admin() {
        return this.supabaseService.getAdminClient();
    }

    verifyWebhookHmac(rawBody: Buffer, signatureHeader?: string): void {
        const key = this.configService.get('WAHA_WEBHOOK_HMAC_KEY') || '';
        if (!key) return;
        if (!signatureHeader) {
            this.logger.warn('WAHA_WEBHOOK_HMAC_KEY set but X-Webhook-Hmac missing — skip verify (dev)');
            return;
        }
        const expected = createHmac('sha512', key).update(rawBody).digest('hex');
        const sig = signatureHeader.replace(/^sha512=/i, '').trim();
        try {
            const a = Buffer.from(expected, 'hex');
            const b = Buffer.from(sig, 'hex');
            if (a.length !== b.length || !timingSafeEqual(a, b)) {
                throw new UnauthorizedException('Invalid webhook HMAC');
            }
        } catch {
            throw new UnauthorizedException('Invalid webhook HMAC');
        }
    }

    async listConfigs(): Promise<StudioWhatsAppConfigRow[]> {
        const { data, error } = await this.admin()
            .from('studio_whatsapp_config')
            .select('*')
            .order('tenant_id');
        assertNoSupabaseError(error, 'Failed to list WhatsApp configs');
        return (data || []) as StudioWhatsAppConfigRow[];
    }

    async getConfig(tenantId = DEFAULT_TENANT): Promise<StudioWhatsAppConfigRow | null> {
        const { data, error } = await this.admin()
            .from('studio_whatsapp_config')
            .select('*')
            .eq('tenant_id', tenantId)
            .maybeSingle();
        assertNoSupabaseError(error, 'Failed to get WhatsApp config');
        return data as StudioWhatsAppConfigRow | null;
    }

    async resolveConfigForWebhook(
        wahaSession: string,
        senderPhone: string,
        payload?: Record<string, unknown>,
    ): Promise<StudioWhatsAppConfigRow | null> {
        const { data, error } = await this.admin().from('studio_whatsapp_config').select('*');
        assertNoSupabaseError(error, 'Failed to resolve WhatsApp config for webhook');
        const configs = (data || []) as StudioWhatsAppConfigRow[];

        const bySender = pickTenantConfigBySenderPhone(configs, senderPhone);
        if (bySender) {
            return configs.find((c) => c.tenant_id === bySender.tenant_id) ?? null;
        }

        const activeCount = configs.filter((c) => c.enabled && c.notebook_id).length;
        if (activeCount <= 1) {
            const fallback = pickSingleTenantFallback(configs);
            if (fallback) {
                return configs.find((c) => c.tenant_id === fallback.tenant_id) ?? null;
            }
        }

        if (payload) {
            extractBusinessPhoneFromPayload(payload);
        }
        void wahaSession;
        return null;
    }

    private async assertOwnerPhonesUnique(
        tenantId: string,
        ownerPhone?: string | null,
        extraPhones?: string[] | null,
    ): Promise<void> {
        const incoming = [
            ...(ownerPhone ? [normalizePhoneDigits(ownerPhone)] : []),
            ...(extraPhones || []).map((p) => normalizePhoneDigits(p)),
        ].filter((p) => p.length >= 8);
        if (!incoming.length) return;

        const { data, error } = await this.admin().from('studio_whatsapp_config').select('*');
        assertNoSupabaseError(error, 'Failed to validate owner phone uniqueness');
        for (const row of (data || []) as StudioWhatsAppConfigRow[]) {
            if (row.tenant_id === tenantId) continue;
            for (const existing of collectUmkmOwnerPhones(row)) {
                for (const phone of incoming) {
                    if (phonesMatch(existing, phone)) {
                        throw new BadRequestException(
                            `Nomor ${phone} sudah terdaftar untuk UMKM "${row.label || row.tenant_id}".`,
                        );
                    }
                }
            }
        }
    }

    isAllowlistRequired(): boolean {
        const explicit = (this.configService.get<string>('STUDIO_WHATSAPP_REQUIRE_ALLOWLIST') || '')
            .trim()
            .toLowerCase();
        if (explicit === 'true' || explicit === '1') return true;
        if (explicit === 'false' || explicit === '0') return false;
        return process.env.NODE_ENV === 'production';
    }

    getRateLimitPerMinute(): number {
        const raw = parseInt(
            this.configService.get<string>('STUDIO_WHATSAPP_RATE_LIMIT_PER_MINUTE') ||
                String(DEFAULT_RATE_LIMIT_PER_MINUTE),
            10,
        );
        return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RATE_LIMIT_PER_MINUTE;
    }

    getSecurityMeta() {
        return {
            allowlistRequired: this.isAllowlistRequired(),
            rateLimitPerMinute: this.getRateLimitPerMinute(),
        };
    }

    async updateConfig(
        patch: Partial<{
            notebookId: string | null;
            enabled: boolean;
            allowlistPhones: string[];
            useGuidedFlow: boolean;
            wahaSession: string | null;
            businessPhone: string | null;
            label: string | null;
        }>,
        tenantId = DEFAULT_TENANT,
    ): Promise<StudioWhatsAppConfigRow> {
        const enabling = patch.enabled === true;
        const existing = await this.getConfig(tenantId);
        const ownerPhone =
            patch.businessPhone !== undefined
                ? patch.businessPhone
                : existing?.business_phone;
        const staffPhones =
            patch.allowlistPhones !== undefined
                ? patch.allowlistPhones
                : existing?.allowlist_phones;

        if (enabling) {
            const ownerDigits = ownerPhone ? normalizePhoneDigits(ownerPhone) : '';
            if (ownerDigits.length < 8) {
                throw new BadRequestException(
                    'Nomor pemilik UMKM wajib diisi (HP yang dipakai mengirim WA ke nomor admin).',
                );
            }
        }

        await this.assertOwnerPhonesUnique(tenantId, ownerPhone, staffPhones);

        const row: Record<string, unknown> = {
            tenant_id: tenantId,
            updated_at: new Date().toISOString(),
        };
        if (patch.notebookId !== undefined) row.notebook_id = patch.notebookId;
        if (patch.enabled !== undefined) row.enabled = patch.enabled;
        if (patch.allowlistPhones !== undefined) row.allowlist_phones = patch.allowlistPhones;
        if (patch.useGuidedFlow !== undefined) row.use_guided_flow = patch.useGuidedFlow;
        if (patch.wahaSession !== undefined) {
            row.waha_session = patch.wahaSession?.trim() || 'default';
        } else if (!existing?.waha_session) {
            row.waha_session = 'default';
        }
        if (patch.businessPhone !== undefined) {
            row.business_phone = patch.businessPhone
                ? normalizePhoneDigits(patch.businessPhone)
                : null;
        }
        if (patch.label !== undefined) row.label = patch.label;

        const { data, error } = await this.admin()
            .from('studio_whatsapp_config')
            .upsert(row, { onConflict: 'tenant_id' })
            .select()
            .single();
        assertNoSupabaseError(error, 'Failed to save WhatsApp config');
        return data as StudioWhatsAppConfigRow;
    }

    async getWahaSessionStatus() {
        const status = await this.wahaClient.getSessionStatus();
        const sessions = await this.wahaClient.listSessions();
        const version = await this.wahaClient.getVersion();
        return { session: status, sessions, version };
    }

    async restartWahaSession() {
        return this.wahaClient.restartSession();
    }

    async syncWahaSession() {
        return this.wahaClient.syncStuckSession();
    }

    async getWahaAuthQr(session?: string) {
        const st = await this.wahaClient.getSessionStatus(session);
        if (!st) {
            return {
                available: false,
                imageBase64: null,
                mimetype: null,
                error: 'WAHA tidak reachable — pastikan container waha berjalan',
            };
        }
        if (st.connected) {
            return {
                available: false,
                imageBase64: null,
                mimetype: null,
                error: null,
                connected: true,
            };
        }
        const qr = await this.wahaClient.getAuthQr(session);
        if (!qr) {
            return {
                available: false,
                imageBase64: null,
                mimetype: null,
                error: 'QR belum tersedia — klik Mulai sesi atau tunggu beberapa detik',
            };
        }
        return {
            available: true,
            imageBase64: qr.data,
            mimetype: qr.mimetype,
            error: null,
        };
    }

    async startWahaSession(session?: string) {
        return this.wahaClient.ensureSessionStarted(session);
    }

    async logoutWahaSession(session?: string) {
        return this.wahaClient.logoutSession(session);
    }

    async handleWebhook(body: Record<string, unknown>, session?: string): Promise<void> {
        const event = String(body.event || '').toLowerCase();
        if (event === 'message.any') {
            this.logger.debug('Webhook ignored duplicate event=message.any');
            return;
        }
        const allowed = new Set(['message', '']);
        if (event && !allowed.has(event)) {
            this.logger.debug(`Webhook ignored event=${event}`);
            return;
        }

        const payload = (body.payload || body) as Record<string, unknown>;
        if (!payload || typeof payload !== 'object') {
            this.logger.warn(`Webhook ${event}: empty payload`);
            return;
        }

        if (payload.fromMe === true) return;

        const chatId = String(
            payload.from || payload.chatId || payload.author || '',
        );
        if (!chatId) {
            this.logger.warn(`Webhook ${event}: no from/chatId in payload`);
            return;
        }

        const wahaSession = (session || String(body.session || '') || this.wahaClient.defaultSession).trim();
        const phone = this.extractPhone(chatId);

        const config = await this.resolveConfigForWebhook(wahaSession, phone, payload);
        if (!config?.enabled || !config.notebook_id) {
            this.logger.warn(
                `WA sender ${phone} not mapped to any UMKM tenant (shared inbox ${wahaSession})`,
            );
            await this.sendReplyChunks(chatId, UNREGISTERED_SENDER_MESSAGE, wahaSession);
            return;
        }

        const tenantId = config.tenant_id;
        this.logger.log(
            `WA inbound inbox=${wahaSession} tenant=${tenantId} sender=${phone}`,
        );

        const buttonReply = extractUmkmButtonReply(payload);
        const question = stripWhatsAppMediaAnnotations(
            buttonReply
                ? canonicalUmkmConfirmText(buttonReply)
                : await this.buildQuestionFromPayload(payload, wahaSession),
        );
        if (!question.trim()) return;

        const result = await this.processInboundCore({
            config,
            phone,
            chatId,
            question,
            displayName: String(payload.notifyName || payload.pushName || ''),
            feedbackProvider: 'waha',
            enforceRateLimit: true,
        });

        await this.sendReplyChunks(chatId, result.answer, wahaSession);
    }

    /**
     * Admin simulator: same decision tree as real WA inbound (guided / handleMessage / RAG),
     * without sending via WAHA. Session chatId is `sim:{tenant}:{phone}` so it won't clash with live WA.
     */
    async simulateInboundMessage(params: {
        tenantId: string;
        message: string;
        phone?: string;
        displayName?: string;
    }): Promise<{
        answer: string;
        conversationId: string;
        path: 'guided' | 'umkm' | 'rag' | 'feedback';
        phone: string;
        chatId: string;
    }> {
        const tenantId = String(params.tenantId || '').trim();
        if (!tenantId) throw new BadRequestException('tenantId required');

        const message = stripWhatsAppMediaAnnotations(String(params.message || '').trim());
        if (!message) throw new BadRequestException('message required');

        const config = await this.getConfig(tenantId);
        if (!config?.enabled || !config.notebook_id) {
            throw new BadRequestException(
                'UMKM belum aktif / belum punya notebook. Setup UMKM dulu sebelum simulasi chat.',
            );
        }

        const phone = normalizePhoneDigits(params.phone || '6280000000001');
        if (phone.length < 8) throw new BadRequestException('phone tidak valid');

        const chatId = `sim:${tenantId}:${phone}`;
        return this.processInboundCore({
            config,
            phone,
            chatId,
            question: message,
            displayName: params.displayName || 'Simulator WA',
            feedbackProvider: 'whatsapp_sim',
            enforceRateLimit: false,
        });
    }

    /**
     * Admin Sim Reset: clear sticky UMKM wizard/pending state and drop the sim WA session row
     * so the next message starts a fresh conversation (UI clear alone is not enough).
     */
    async resetSimSession(params: {
        tenantId: string;
        phone?: string;
    }): Promise<{ ok: true; phone: string; chatId: string }> {
        const tenantId = String(params.tenantId || '').trim();
        if (!tenantId) throw new BadRequestException('tenantId required');

        const phone = normalizePhoneDigits(params.phone || '6280000000001');
        if (phone.length < 8) throw new BadRequestException('phone tidak valid');

        const chatId = `sim:${tenantId}:${phone}`;

        const { data: existing } = await this.admin()
            .from('studio_whatsapp_sessions')
            .select('conversation_id')
            .eq('tenant_id', tenantId)
            .eq('chat_id', chatId)
            .maybeSingle();

        const conversationId =
            existing?.conversation_id != null ? String(existing.conversation_id) : undefined;

        this.umkmService.resetSessionState(tenantId, phone, conversationId);

        const { error } = await this.admin()
            .from('studio_whatsapp_sessions')
            .delete()
            .eq('tenant_id', tenantId)
            .eq('chat_id', chatId);
        if (error) {
            this.logger.warn(`resetSimSession delete session: ${error.message}`);
        }

        return { ok: true, phone, chatId };
    }

    /**
     * Shared WA inbound pipeline (webhook + simulator).
     */
    private async processInboundCore(opts: {
        config: StudioWhatsAppConfigRow;
        phone: string;
        chatId: string;
        question: string;
        displayName: string;
        feedbackProvider: string;
        enforceRateLimit: boolean;
    }): Promise<{
        answer: string;
        conversationId: string;
        path: 'guided' | 'umkm' | 'rag' | 'feedback';
        phone: string;
        chatId: string;
    }> {
        const { config, phone, chatId, question, displayName, feedbackProvider, enforceRateLimit } =
            opts;
        const tenantId = config.tenant_id;

        if (enforceRateLimit && !this.rateLimiter.tryConsume(`${tenantId}:${phone}`)) {
            this.logger.warn(`WhatsApp rate limit exceeded for tenant=${tenantId} phone=${phone}`);
            return {
                answer: RATE_LIMIT_MESSAGE,
                conversationId: '',
                path: 'umkm',
                phone,
                chatId,
            };
        }

        const { conversationId } = await this.resolveSession(
            tenantId,
            chatId,
            phone,
            config.notebook_id!,
            displayName,
        );

        const notebook = await this.studioService.getNotebook(config.notebook_id!);
        const notebookCfg = this.dbContextService.parseConfig(notebook.context_config);
        const dataTenantId = this.umkmService.resolveTenantId(notebookCfg);
        if (dataTenantId !== tenantId) {
            this.logger.warn(
                `Notebook tenant_id (${dataTenantId}) != WA config (${tenantId}); using WA config for data`,
            );
        }
        const umkmMode = this.umkmService.isUmkmMode(notebookCfg);

        const feedback = detectUmkmFeedback(question);
        if (feedback && umkmMode) {
            const pending = await this.umkmService.resolvePendingSale({
                tenantId,
                phone,
                conversationId,
            });
            const confirm = detectUmkmConfirmReply(question);
            if (!(pending && confirm)) {
                await this.umkmService.logFeedback(tenantId, feedback, {
                    phone,
                    conversationId,
                    metadata: { provider: feedbackProvider },
                });
                return {
                    answer: formatFeedbackThanks(feedback),
                    conversationId,
                    path: 'feedback',
                    phone,
                    chatId,
                };
            }
        }

        let answer: string;
        let path: 'guided' | 'umkm' | 'rag' = 'rag';
        try {
            if (umkmMode) {
                path = 'umkm';
                const umkmAnswer = await this.umkmService.handleMessage(
                    question,
                    tenantId,
                    phone,
                    { ...notebookCfg, tenant_id: tenantId },
                    { conversationId },
                );
                if (umkmAnswer) {
                    answer = umkmAnswer;
                } else {
                    const commands = getUmkmCommandsFromConfig({
                        ...notebookCfg,
                        tenant_id: tenantId,
                    });
                    if (detectUmkmIntent(question, commands) === 'ask') {
                        const lines = await this.studioService.getRecentConversationLines(
                            conversationId,
                            12,
                        );
                        const agentic = await this.agenticAskService.answer(
                            {
                                question,
                                notebookId: config.notebook_id!,
                                conversationId,
                                tenantId,
                                notebookName: notebook?.name,
                                conversationLines: lines.map(
                                    (l) =>
                                        `${l.role === 'assistant' ? 'Assistant' : 'User'}: ${l.content}`,
                                ),
                            },
                            { ...notebookCfg, tenant_id: tenantId },
                        );
                        answer = agentic.answer || formatUmkmHelp(commands);
                    } else {
                        this.logger.warn(
                            `UMKM handleMessage returned null for non-ask intent tenant=${tenantId}`,
                        );
                        answer = UMKM_INBOUND_APOLOGY;
                    }
                }
            } else if (config.use_guided_flow) {
                path = 'guided';
                answer = await this.runGuidedTurn(
                    config.notebook_id!,
                    question,
                    conversationId,
                    chatId,
                    tenantId,
                );
            } else {
                const result = await this.studioService.chat(
                    config.notebook_id!,
                    question,
                    conversationId,
                    undefined,
                );
                answer = result.answer || '';
            }
        } catch (e: any) {
            this.logger.error(
                `WA inbound failed tenant=${tenantId} sender=${phone}: ${e?.message}`,
                e?.stack,
            );
            answer = UMKM_INBOUND_APOLOGY;
        }

        if (
            umkmMode &&
            /masih mengindeks|Sumber di notebook ini belum siap/i.test(answer || '')
        ) {
            answer = formatUnknownUmkmCommand(
                getUmkmCommandsFromConfig({ ...notebookCfg, tenant_id: tenantId }),
            );
            path = 'umkm';
        }

        this.logger.log(`WA inbound path=${path} tenant=${tenantId} sender=${phone}`);
        return { answer, conversationId, path, phone, chatId };
    }

    private extractPhone(chatId: string): string {
        return normalizePhoneDigits(chatId);
    }

    private async buildQuestionFromPayload(
        payload: Record<string, unknown>,
        session?: string,
    ): Promise<string> {
        const parts: string[] = [];
        const body = String(payload.body || payload.caption || '').trim();
        if (body) parts.push(body);

        const hasMedia = wahaPayloadHasMedia(payload);
        const messageId = String(payload.id || '');
        if (hasMedia && messageId) {
            const media = await this.wahaClient.downloadMedia(messageId, session);
            if (media) {
                const kind = media.mimetype.startsWith('image/') ? 'gambar' : 'file';
                parts.push(`[User mengirim ${kind}: ${media.filename}, tipe ${media.mimetype}]`);
                if (media.mimetype.startsWith('image/')) {
                    parts.push(
                        '(Catatan: konten visual belum di-OCR otomatis; gunakan deskripsi teks user jika ada.)',
                    );
                }
            } else if (!body) {
                // Don't append failure noise onto text commands (breaks menu digit ^2$)
                parts.push('[User mengirim media yang tidak dapat diunduh]');
            }
        }

        return parts.join('\n').trim();
    }

    private async resolveSession(
        tenantId: string,
        chatId: string,
        phone: string,
        notebookId: string,
        displayName: string,
    ): Promise<{ conversationId: string }> {
        const { data: existing } = await this.admin()
            .from('studio_whatsapp_sessions')
            .select('conversation_id')
            .eq('tenant_id', tenantId)
            .eq('chat_id', chatId)
            .maybeSingle();

        if (existing?.conversation_id) {
            await this.admin()
                .from('studio_whatsapp_sessions')
                .update({
                    last_message_at: new Date().toISOString(),
                    display_name: displayName || undefined,
                    phone,
                })
                .eq('chat_id', chatId)
                .eq('tenant_id', tenantId);
            return { conversationId: existing.conversation_id };
        }

        const isSim = chatId.startsWith('sim:');
        const { data: conv, error } = await this.admin()
            .from('studio_conversations')
            .insert({
                notebook_id: notebookId,
                user_id: null,
                title: isSim
                    ? `Sim WA: ${displayName || phone}`
                    : displayName
                      ? `WA: ${displayName}`
                      : `WA: ${phone}`,
                // CHECK constraint: only 'web' | 'whatsapp' — sim distinguished via external_chat_id `sim:…`
                channel: 'whatsapp',
                external_chat_id: chatId,
            })
            .select('id')
            .single();
        assertNoSupabaseError(error, 'Failed to create WhatsApp conversation');

        await this.admin().from('studio_whatsapp_sessions').insert({
            tenant_id: tenantId,
            chat_id: chatId,
            conversation_id: conv.id,
            phone,
            display_name: displayName || null,
        });

        return { conversationId: conv.id };
    }

    private async runGuidedTurn(
        notebookId: string,
        message: string,
        conversationId: string,
        chatId: string,
        tenantId: string,
    ): Promise<string> {
        const flow = await this.guideFlowService.getPublishedFlowForNotebook(notebookId);
        if (!flow) {
            const result = await this.studioService.chat(notebookId, message, conversationId, undefined);
            return result.answer || '';
        }

        let activeConversationId = conversationId;
        const { data: conv } = await this.admin()
            .from('studio_conversations')
            .select('guide_flow_id, guide_flow_node_id')
            .eq('id', conversationId)
            .single();

        const parts: string[] = [];

        const flowMismatch = conv?.guide_flow_id && conv.guide_flow_id !== flow.id;
        const flowEnded = conv?.guide_flow_id && !conv.guide_flow_node_id;
        const needsNewSession = !conv?.guide_flow_id || flowMismatch || flowEnded;

        if (needsNewSession) {
            if (flowMismatch) {
                this.logger.log(
                    `WA guided session flow changed (${conv?.guide_flow_id} → ${flow.id}); restarting for chat ${chatId}`,
                );
            }
            const started = await this.guideFlowService.startGuidedSession(
                notebookId,
                flow.id,
                undefined,
            );
            activeConversationId = started.conversationId;
            await this.admin()
                .from('studio_whatsapp_sessions')
                .update({
                    conversation_id: activeConversationId,
                    last_message_at: new Date().toISOString(),
                })
                .eq('tenant_id', tenantId)
                .eq('chat_id', chatId);
            if (conversationId !== activeConversationId) {
                await this.admin().from('studio_conversations').delete().eq('id', conversationId);
            }
            const intro = (started.replies || []) as { content?: string }[];
            parts.push(...intro.map((r) => r.content || '').filter(Boolean));
            if (!started.waitingForInput) {
                return parts.join('\n\n') || '...';
            }
        }

        const turn = await this.guideFlowService.guidedChatTurn(
            notebookId,
            flow.id,
            message,
            activeConversationId,
            undefined,
        );
        const replies = (turn.replies || []) as { content?: string }[];
        parts.push(...replies.map((r) => r.content || '').filter(Boolean));
        return parts.join('\n\n') || '...';
    }

    private async sendReplyChunks(chatId: string, answer: string, session?: string): Promise<void> {
        const text = this.formatForWhatsApp(answer);
        if (!text.trim()) {
            await this.wahaClient.sendText(chatId, 'Maaf, tidak ada jawaban.', session);
            return;
        }
        if (isUmkmMoneyConfirmPreview(text)) {
            const choices = umkmConfirmButtons();
            const buttons = await this.wahaClient.sendButtons(chatId, text, choices, session);
            if (buttons.success) return;
            this.logger.warn(`WA confirm buttons unavailable: ${buttons.error}`);
            const list = await this.wahaClient.sendList(chatId, text, choices, session);
            if (list.success) return;
            this.logger.warn(`WA confirm list unavailable, sending text: ${list.error}`);
        }
        for (let i = 0; i < text.length; i += WA_CHUNK) {
            const chunk = text.slice(i, i + WA_CHUNK);
            const res = await this.wahaClient.sendText(chatId, chunk, session);
            if (!res.success) {
                this.logger.error(`Failed to send WA chunk (WAHA): ${res.error}`);
                break;
            }
        }
    }

    private formatForWhatsApp(markdown: string): string {
        return markdown
            .replace(/\*\*(.+?)\*\*/g, '*$1*')
            .replace(/^#{1,6}\s+/gm, '')
            .trim();
    }
}
