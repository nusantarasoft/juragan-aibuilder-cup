import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { WahaClientService } from '../waha/waha-client.service';
import { StudioService } from './studio.service';
import { GuideFlowService } from './guide-flow.service';

const WA_CHUNK = 4000;
const DEFAULT_TENANT = 'default';

export type StudioWhatsAppConfigRow = {
    tenant_id: string;
    notebook_id: string | null;
    enabled: boolean;
    allowlist_phones: string[] | null;
    use_guided_flow: boolean;
    updated_at?: string;
};

@Injectable()
export class StudioWhatsAppService {
    private readonly logger = new Logger(StudioWhatsAppService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly supabaseService: SupabaseService,
        private readonly wahaClient: WahaClientService,
        private readonly studioService: StudioService,
        private readonly guideFlowService: GuideFlowService,
    ) {}

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

    async getConfig(tenantId = DEFAULT_TENANT): Promise<StudioWhatsAppConfigRow | null> {
        const { data, error } = await this.admin()
            .from('studio_whatsapp_config')
            .select('*')
            .eq('tenant_id', tenantId)
            .maybeSingle();
        if (error) throw error;
        return data as StudioWhatsAppConfigRow | null;
    }

    async updateConfig(
        patch: Partial<{
            notebookId: string | null;
            enabled: boolean;
            allowlistPhones: string[];
            useGuidedFlow: boolean;
        }>,
        tenantId = DEFAULT_TENANT,
    ): Promise<StudioWhatsAppConfigRow> {
        const row: Record<string, unknown> = {
            tenant_id: tenantId,
            updated_at: new Date().toISOString(),
        };
        if (patch.notebookId !== undefined) row.notebook_id = patch.notebookId;
        if (patch.enabled !== undefined) row.enabled = patch.enabled;
        if (patch.allowlistPhones !== undefined) row.allowlist_phones = patch.allowlistPhones;
        if (patch.useGuidedFlow !== undefined) row.use_guided_flow = patch.useGuidedFlow;

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
        const allowed = new Set(['message', 'message.any', '']);
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

        this.logger.log(`WA inbound event=${event || 'message'} from=${chatId}`);

        const config = await this.getConfig();
        if (!config?.enabled || !config.notebook_id) {
            this.logger.debug('WhatsApp disabled or no notebook configured');
            return;
        }

        const phone = this.extractPhone(chatId);
        if (!this.isPhoneAllowed(phone, config.allowlist_phones)) {
            this.logger.warn(`WhatsApp message from non-allowlisted phone: ${phone}`);
            return;
        }

        const question = await this.buildQuestionFromPayload(payload, session);
        if (!question.trim()) return;

        const { conversationId } = await this.resolveSession(
            chatId,
            phone,
            config.notebook_id,
            String(payload.notifyName || payload.pushName || ''),
        );

        // studio_conversations.user_id is uuid — never pass wa:phone into DB writes
        let answer: string;
        if (config.use_guided_flow) {
            answer = await this.runGuidedTurn(
                config.notebook_id,
                question,
                conversationId,
                chatId,
            );
        } else {
            const result = await this.studioService.chat(
                config.notebook_id,
                question,
                conversationId,
                undefined,
            );
            answer = result.answer || '';
        }

        await this.sendReplyChunks(chatId, answer, session);
    }

    private extractPhone(chatId: string): string {
        const local = chatId.split('@')[0] || '';
        const digits = local.replace(/\D/g, '');
        if (digits.length >= 8) return digits;
        return chatId.replace(/\D/g, '');
    }

    private isPhoneAllowed(phone: string, allowlist: string[] | null): boolean {
        if (!allowlist?.length) return true;
        const normalized = phone.replace(/\D/g, '');
        return allowlist.some((p) => {
            const a = p.replace(/\D/g, '');
            return a === normalized || normalized.endsWith(a) || a.endsWith(normalized);
        });
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
        chatId: string,
        phone: string,
        notebookId: string,
        displayName: string,
    ): Promise<{ conversationId: string }> {
        const { data: existing } = await this.admin()
            .from('studio_whatsapp_sessions')
            .select('conversation_id')
            .eq('tenant_id', DEFAULT_TENANT)
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
                .eq('tenant_id', DEFAULT_TENANT);
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
            tenant_id: DEFAULT_TENANT,
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
    ): Promise<string> {
        const flow = await this.guideFlowService.getPublishedFlowForNotebook(notebookId);
        if (!flow) {
            const result = await this.studioService.chat(notebookId, message, conversationId, undefined);
            return result.answer || '';
        }

        let activeConversationId = conversationId;
        const { data: conv } = await this.admin()
            .from('studio_conversations')
            .select('guide_flow_id')
            .eq('id', conversationId)
            .single();

        const parts: string[] = [];

        if (!conv?.guide_flow_id) {
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
                .eq('tenant_id', DEFAULT_TENANT)
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
