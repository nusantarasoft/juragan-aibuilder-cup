import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HermesProvider } from '../whatsapp/hermes.provider';
import { SupabaseService } from '../supabase/supabase.service';
import { StudioUmkmService } from './studio-umkm.service';
import { normalizeAppRole } from '../auth/app-roles';
import { formatStudioWaHumanOutboundText } from './studio-wa-human-reply.util';

const TAKEOVER_TTL_MS = 30 * 60 * 1000;
const PREVIEW_MAX = 240;
const PLATFORM_AUDIT_TENANT = '00000000-0000-0000-0000-000000000010';

export type WaTurnAuthorKind = 'owner' | 'ai' | 'human';

export type RecordWaTurnInput = {
    phone: string;
    chatId?: string;
    authorKind: WaTurnAuthorKind;
    bodyText: string;
    authorUserId?: string | null;
    authorDisplayName?: string | null;
};

@Injectable()
export class StudioWaConversationsService {
    private readonly logger = new Logger(StudioWaConversationsService.name);

    constructor(
        private readonly sb: SupabaseService,
        private readonly umkm: StudioUmkmService,
        private readonly hermes: HermesProvider,
        private readonly config: ConfigService,
    ) {}

    private db() {
        return this.sb.getAdminClient();
    }

    assertSuperAdmin(role?: string | null): void {
        if (normalizeAppRole(role) !== 'super_admin') {
            throw new ForbiddenException('Hanya super admin Nusantarasoft yang dapat mengakses Percakapan WA');
        }
    }

    internalKeyExpected(): string {
        return String(
            this.config.get('KASIR_CONSULT_KEY') || process.env.KASIR_CONSULT_KEY || '',
        ).trim();
    }

    assertInternalKey(key?: string): void {
        const expected = this.internalKeyExpected();
        if (!expected || key !== expected) {
            throw new ForbiddenException('Unauthorized');
        }
    }

    private digits(phone: string): string {
        return phone.replace(/\D/g, '');
    }

    private preview(text: string): string {
        const t = text.trim();
        if (t.length <= PREVIEW_MAX) return t;
        return `${t.slice(0, PREVIEW_MAX - 1)}…`;
    }

    async expireStaleTakeovers(): Promise<void> {
        const now = new Date().toISOString();
        await this.db()
            .from('studio_wa_conversations')
            .update({ takeover_active: false, takeover_until: null })
            .eq('takeover_active', true)
            .lt('takeover_until', now);
    }

    async handoffForPhone(phone: string): Promise<{ active: boolean; until?: string }> {
        await this.expireStaleTakeovers();
        const ctx = await this.umkm.resolveUmkmContextByOwnerPhone(phone);
        if (!ctx) return { active: false };
        const { data } = await this.db()
            .from('studio_wa_conversations')
            .select('takeover_active,takeover_until')
            .eq('tenant_id', ctx.tenantId)
            .eq('owner_phone', this.digits(phone))
            .maybeSingle();
        if (!data?.takeover_active) return { active: false };
        return {
            active: true,
            until: data.takeover_until ? String(data.takeover_until) : undefined,
        };
    }

    /** Best-effort turn persist from Hermes; never throws to caller. */
    async recordTurnBestEffort(input: RecordWaTurnInput): Promise<void> {
        try {
            await this.recordTurn(input);
        } catch (err) {
            this.logger.warn(`wa-turn record failed: ${(err as Error).message}`);
        }
    }

    async recordTurn(input: RecordWaTurnInput): Promise<{ conversationId: string; messageId: string }> {
        const phone = this.digits(input.phone);
        if (phone.length < 8) {
            throw new ForbiddenException('phone invalid');
        }
        const body = String(input.bodyText || '').trim();
        if (!body) {
            throw new ForbiddenException('body_text required');
        }

        const ctx = await this.umkm.resolveUmkmContextByOwnerPhone(phone);
        if (!ctx) {
            throw new ForbiddenException('Sender not on store whitelist');
        }

        const tenantId = ctx.tenantId;
        const now = new Date().toISOString();
        const chatJid =
            input.chatId && input.chatId.includes('@')
                ? input.chatId
                : `${phone}@s.whatsapp.net`;

        const { data: existing } = await this.db()
            .from('studio_wa_conversations')
            .select('id,chat_jid')
            .eq('tenant_id', tenantId)
            .eq('owner_phone', phone)
            .maybeSingle();

        let conversationId = existing?.id as string | undefined;
        if (!conversationId) {
            const { data: created, error: insErr } = await this.db()
                .from('studio_wa_conversations')
                .insert({
                    tenant_id: tenantId,
                    owner_phone: phone,
                    chat_jid: chatJid,
                    last_message_preview: this.preview(body),
                    last_message_at: now,
                })
                .select('id')
                .single();
            if (insErr) throw new Error(insErr.message);
            conversationId = created.id;
        } else {
            const patch: Record<string, unknown> = {
                last_message_preview: this.preview(body),
                last_message_at: now,
            };
            if (!existing?.chat_jid && chatJid) patch.chat_jid = chatJid;
            await this.db()
                .from('studio_wa_conversations')
                .update(patch)
                .eq('id', conversationId);
        }

        const { data: msg, error: msgErr } = await this.db()
            .from('studio_wa_messages')
            .insert({
                conversation_id: conversationId,
                tenant_id: tenantId,
                author_kind: input.authorKind,
                body_text: body,
                author_user_id: input.authorUserId ?? null,
                author_display_name: input.authorDisplayName ?? null,
            })
            .select('id')
            .single();
        if (msgErr) throw new Error(msgErr.message);

        return { conversationId, messageId: msg.id };
    }

    /** Admin human reply — conversation already exists; no WA whitelist re-check. */
    private async appendMessageForConversation(
        conv: Record<string, unknown>,
        input: {
            authorKind: WaTurnAuthorKind;
            bodyText: string;
            authorUserId?: string | null;
            authorDisplayName?: string | null;
        },
    ): Promise<{ messageId: string }> {
        const body = input.bodyText.trim();
        const tenantId = String(conv.tenant_id);
        const conversationId = String(conv.id);
        const now = new Date().toISOString();
        const { error: updErr } = await this.db()
            .from('studio_wa_conversations')
            .update({
                last_message_preview: this.preview(body),
                last_message_at: now,
            })
            .eq('id', conversationId);
        if (updErr) throw new Error(updErr.message);
        const { data: msg, error: msgErr } = await this.db()
            .from('studio_wa_messages')
            .insert({
                conversation_id: conversationId,
                tenant_id: tenantId,
                author_kind: input.authorKind,
                body_text: body,
                author_user_id: input.authorUserId ?? null,
                author_display_name: input.authorDisplayName ?? null,
            })
            .select('id')
            .single();
        if (msgErr) throw new Error(msgErr.message);
        return { messageId: msg.id as string };
    }

    private async audit(
        action: string,
        summary: string,
        entityId: string,
        userId: string | null,
        metadata: Record<string, unknown>,
    ): Promise<void> {
        try {
            await this.db().from('audit_logs').insert({
                tenant_id: PLATFORM_AUDIT_TENANT,
                user_id: userId,
                action,
                module: 'ai-studio',
                entity_type: 'studio_wa_conversation',
                entity_id: entityId,
                metadata: { ...metadata, summary },
            });
        } catch (err) {
            this.logger.warn(`audit append failed: ${(err as Error).message}`);
        }
    }

    private async loadConversation(id: string) {
        await this.expireStaleTakeovers();
        const { data, error } = await this.db()
            .from('studio_wa_conversations')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) throw new NotFoundException('Percakapan tidak ditemukan');
        return data as Record<string, unknown>;
    }

    private async storeDisplayName(tenantId: string): Promise<string | undefined> {
        const { data: bySlug } = await this.db()
            .from('tenant_stores')
            .select('display_name')
            .eq('studio_slug', tenantId)
            .maybeSingle();
        if (bySlug?.display_name) return String(bySlug.display_name);
        const { data: byTenant } = await this.db()
            .from('tenant_stores')
            .select('display_name')
            .eq('tenant_id', tenantId)
            .maybeSingle();
        return byTenant?.display_name ? String(byTenant.display_name) : undefined;
    }

    async listConversations() {
        await this.expireStaleTakeovers();
        const { data, error } = await this.db()
            .from('studio_wa_conversations')
            .select(
                'id,tenant_id,owner_phone,last_message_preview,last_message_at,takeover_active,takeover_by_name,takeover_until',
            )
            .order('last_message_at', { ascending: false, nullsFirst: false });
        if (error) throw new Error(error.message);
        const rows = data || [];
        const storeNames = new Map<string, string>();
        for (const row of rows) {
            const tid = String(row.tenant_id);
            if (!storeNames.has(tid)) {
                const name = await this.storeDisplayName(tid);
                if (name) storeNames.set(tid, name);
            }
        }
        return rows.map((row) => ({
            id: row.id,
            tenantId: row.tenant_id,
            storeName: storeNames.get(String(row.tenant_id)),
            ownerPhone: row.owner_phone,
            lastMessagePreview: row.last_message_preview ?? undefined,
            lastMessageAt: row.last_message_at ?? undefined,
            takeoverActive: Boolean(row.takeover_active),
            takeoverByName: row.takeover_by_name ?? undefined,
            takeoverUntil: row.takeover_until ?? undefined,
        }));
    }

    async listMessages(conversationId: string) {
        await this.expireStaleTakeovers();
        const conv = await this.loadConversation(conversationId);
        const { data, error } = await this.db()
            .from('studio_wa_messages')
            .select('id,author_kind,body_text,author_display_name,created_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
        if (error) throw new Error(error.message);
        return {
            conversation: conv,
            messages: (data || []).map((m) => ({
                id: m.id,
                authorKind: m.author_kind,
                bodyText: m.body_text,
                authorDisplayName: m.author_display_name ?? undefined,
                createdAt: m.created_at,
            })),
        };
    }

    async startTakeover(
        conversationId: string,
        user: { id: string; fullName?: string | null; email?: string | null },
    ) {
        const conv = await this.loadConversation(conversationId);
        const until = new Date(Date.now() + TAKEOVER_TTL_MS).toISOString();
        const display =
            user.fullName?.trim() ||
            user.email?.trim() ||
            'Super Admin';
        const { error } = await this.db()
            .from('studio_wa_conversations')
            .update({
                takeover_active: true,
                takeover_by_user_id: user.id,
                takeover_by_name: display,
                takeover_until: until,
            })
            .eq('id', conversationId);
        if (error) throw new Error(error.message);
        await this.audit(
            'studio_wa_takeover_start',
            `Ambil alih percakapan WA ${conv.owner_phone}`,
            conversationId,
            user.id,
            { tenant_id: conv.tenant_id, owner_phone: conv.owner_phone, until },
        );
        return { ok: true as const, until };
    }

    async releaseTakeover(
        conversationId: string,
        user: { id: string },
        reason: 'manual' | 'auto' = 'manual',
    ) {
        const conv = await this.loadConversation(conversationId);
        if (!conv.takeover_active) return { ok: true as const };
        const { error } = await this.db()
            .from('studio_wa_conversations')
            .update({
                takeover_active: false,
                takeover_by_user_id: null,
                takeover_by_name: null,
                takeover_until: null,
            })
            .eq('id', conversationId);
        if (error) throw new Error(error.message);
        await this.audit(
            reason === 'auto' ? 'studio_wa_takeover_auto_release' : 'studio_wa_takeover_release',
            reason === 'auto'
                ? `Takeover otomatis berakhir (${conv.owner_phone})`
                : `Kembalikan ke AI (${conv.owner_phone})`,
            conversationId,
            user.id,
            { tenant_id: conv.tenant_id, owner_phone: conv.owner_phone, reason },
        );
        return { ok: true as const };
    }

    async sendHumanReply(
        conversationId: string,
        text: string,
        user: { id: string; fullName?: string | null; email?: string | null },
    ) {
        const conv = await this.loadConversation(conversationId);
        if (!conv.takeover_active) {
            throw new ForbiddenException('Ambil alih percakapan terlebih dahulu');
        }
        const body = text.trim();
        if (!body) {
            throw new ForbiddenException('Pesan tidak boleh kosong');
        }
        const outboundText = formatStudioWaHumanOutboundText(body);
        const chatId =
            (conv.chat_jid as string | undefined) ||
            `${conv.owner_phone}@s.whatsapp.net`;
        const send = await this.hermes.sendText(chatId, outboundText);
        if (!send.success) {
            throw new Error(send.error || 'Gagal kirim WhatsApp');
        }
        const display =
            user.fullName?.trim() ||
            user.email?.trim() ||
            'Super Admin';
        const recorded = await this.appendMessageForConversation(conv, {
            authorKind: 'human',
            bodyText: outboundText,
            authorUserId: user.id,
            authorDisplayName: display,
        });
        const until = new Date(Date.now() + TAKEOVER_TTL_MS).toISOString();
        await this.db()
            .from('studio_wa_conversations')
            .update({
                takeover_until: until,
                takeover_by_user_id: user.id,
                takeover_by_name: display,
            })
            .eq('id', conversationId);
        await this.audit(
            'studio_wa_human_reply',
            `Balasan manusia ke ${conv.owner_phone}`,
            conversationId,
            user.id,
            { message_id: recorded.messageId, len: outboundText.length },
        );
        return { ok: true, messageId: recorded.messageId };
    }
}
