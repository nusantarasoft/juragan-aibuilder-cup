import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { WahaClientService } from '../waha/waha-client.service';
import { StudioService } from './studio.service';
import { GuideFlowService } from './guide-flow.service';
import { StudioDbContextService } from './studio-db-context.service';
import { StudioUmkmService } from './studio-umkm.service';
import {
    extractBusinessPhoneFromPayload,
    isPhoneInAllowlist,
    normalizePhoneDigits,
    pickWhatsAppConfigForWebhook,
    StudioWhatsAppRateLimiter,
} from './studio-whatsapp.util';

const WA_CHUNK = 4000;
export const DEFAULT_TENANT = 'default';
const DEFAULT_RATE_LIMIT_PER_MINUTE = 10;
const RATE_LIMIT_MESSAGE =
    'Terlalu banyak pesan dalam waktu singkat. Mohon tunggu sebentar sebelum mengirim lagi.';

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
    ) {
        this.rateLimiter = new StudioWhatsAppRateLimiter(this.getRateLimitPerMinute());
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
        if (error) throw error;
        return (data || []) as StudioWhatsAppConfigRow[];
    }

    async getConfig(tenantId = DEFAULT_TENANT): Promise<StudioWhatsAppConfigRow | null> {
        const { data, error } = await this.admin()
            .from('studio_whatsapp_config')
            .select('*')
            .eq('tenant_id', tenantId)
            .maybeSingle();
        if (error) throw error;
        return data as StudioWhatsAppConfigRow | null;
    }

    async resolveConfigForWebhook(
        wahaSession: string,
        payload?: Record<string, unknown>,
    ): Promise<StudioWhatsAppConfigRow | null> {
        const { data, error } = await this.admin().from('studio_whatsapp_config').select('*');
        if (error) throw error;
        const configs = (data || []) as StudioWhatsAppConfigRow[];
        const businessPhone = payload ? extractBusinessPhoneFromPayload(payload) : null;
        const picked = pickWhatsAppConfigForWebhook(configs, wahaSession, businessPhone);
        return picked ? (configs.find((c) => c.tenant_id === picked.tenant_id) ?? null) : null;
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
        const allowlist = patch.allowlistPhones;
        if (enabling && this.isAllowlistRequired()) {
            const phones = allowlist ?? (await this.getConfig(tenantId))?.allowlist_phones ?? [];
            if (!phones?.length) {
                throw new BadRequestException(
                    'Allowlist nomor wajib diisi saat WhatsApp diaktifkan (production / STUDIO_WHATSAPP_REQUIRE_ALLOWLIST=true).',
                );
            }
        }

        if (patch.wahaSession) {
            const sessionKey = patch.wahaSession.trim();
            const { data: conflict } = await this.admin()
                .from('studio_whatsapp_config')
                .select('tenant_id')
                .eq('waha_session', sessionKey)
                .neq('tenant_id', tenantId)
                .maybeSingle();
            if (conflict) {
                throw new BadRequestException(
                    `WAHA session "${sessionKey}" sudah dipakai tenant "${conflict.tenant_id}".`,
                );
            }
        }

        const row: Record<string, unknown> = {
            tenant_id: tenantId,
            updated_at: new Date().toISOString(),
        };
        if (patch.notebookId !== undefined) row.notebook_id = patch.notebookId;
        if (patch.enabled !== undefined) row.enabled = patch.enabled;
        if (patch.allowlistPhones !== undefined) row.allowlist_phones = patch.allowlistPhones;
        if (patch.useGuidedFlow !== undefined) row.use_guided_flow = patch.useGuidedFlow;
        if (patch.wahaSession !== undefined) row.waha_session = patch.wahaSession;
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
        if (error) throw error;
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
        const config = await this.resolveConfigForWebhook(wahaSession, payload);
        if (!config?.enabled || !config.notebook_id) {
            this.logger.warn(
                `WhatsApp not configured for session=${wahaSession} tenant=${config?.tenant_id ?? '?'}`,
            );
            return;
        }

        const tenantId = config.tenant_id;
        this.logger.log(
            `WA inbound session=${wahaSession} tenant=${tenantId} from=${chatId}`,
        );

        const phone = this.extractPhone(chatId);
        if (!this.isPhoneAllowed(phone, config.allowlist_phones)) {
            this.logger.warn(`WhatsApp message from non-allowlisted phone: ${phone}`);
            return;
        }

        if (!this.rateLimiter.tryConsume(`${tenantId}:${phone}`)) {
            this.logger.warn(`WhatsApp rate limit exceeded for tenant=${tenantId} phone=${phone}`);
            await this.sendReplyChunks(chatId, RATE_LIMIT_MESSAGE, wahaSession);
            return;
        }

        const question = await this.buildQuestionFromPayload(payload, wahaSession);
        if (!question.trim()) return;

        const { conversationId } = await this.resolveSession(
            tenantId,
            chatId,
            phone,
            config.notebook_id,
            String(payload.notifyName || payload.pushName || ''),
        );

        const notebook = await this.studioService.getNotebook(config.notebook_id);
        const notebookCfg = this.dbContextService.parseConfig(notebook.context_config);
        const dataTenantId = this.umkmService.resolveTenantId(notebookCfg);
        if (dataTenantId !== tenantId) {
            this.logger.warn(
                `Notebook tenant_id (${dataTenantId}) != WA config (${tenantId}); using WA config for data`,
            );
        }
        const umkmMode = this.umkmService.isUmkmMode(notebookCfg);

        let answer: string;
        if (config.use_guided_flow) {
            answer = await this.runGuidedTurn(
                config.notebook_id,
                question,
                conversationId,
                chatId,
                tenantId,
            );
        } else if (umkmMode) {
            const umkmAnswer = await this.umkmService.handleMessage(
                question,
                tenantId,
                phone,
                { ...notebookCfg, tenant_id: tenantId },
            );
            if (umkmAnswer) {
                answer = umkmAnswer;
            } else {
                const result = await this.studioService.chat(
                    config.notebook_id,
                    question,
                    conversationId,
                    undefined,
                );
                answer = result.answer || '';
            }
        } else {
            const result = await this.studioService.chat(
                config.notebook_id,
                question,
                conversationId,
                undefined,
            );
            answer = result.answer || '';
        }

        await this.sendReplyChunks(chatId, answer, wahaSession);
    }

    private extractPhone(chatId: string): string {
        return normalizePhoneDigits(chatId);
    }

    private isPhoneAllowed(phone: string, allowlist: string[] | null): boolean {
        if (this.isAllowlistRequired()) {
            return isPhoneInAllowlist(phone, allowlist);
        }
        if (!allowlist?.length) return true;
        return isPhoneInAllowlist(phone, allowlist);
    }

    private async buildQuestionFromPayload(
        payload: Record<string, unknown>,
        session?: string,
    ): Promise<string> {
        const parts: string[] = [];
        const body = String(payload.body || payload.caption || '').trim();
        if (body) parts.push(body);

        const hasMedia = payload.hasMedia === true || payload.mediaUrl || payload._data;
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
            } else {
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

        const { data: conv, error } = await this.admin()
            .from('studio_conversations')
            .insert({
                notebook_id: notebookId,
                user_id: null,
                title: displayName ? `WA: ${displayName}` : `WA: ${phone}`,
                channel: 'whatsapp',
                external_chat_id: chatId,
            })
            .select('id')
            .single();
        if (error) throw error;

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
        for (let i = 0; i < text.length; i += WA_CHUNK) {
            const chunk = text.slice(i, i + WA_CHUNK);
            const res = await this.wahaClient.sendText(chatId, chunk, session);
            if (!res.success) {
                this.logger.error(`Failed to send WA chunk: ${res.error}`);
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
