import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class NotificationsService {
    constructor(private supabaseService: SupabaseService) {}

    private get db() {
        return this.supabaseService.getAdminClient();
    }

    // ─── CHANNELS ───────────────────────────────────────────

    async getChannels(tenantId: string) {
        const { data, error } = await this.db.from('notification_channels')
            .select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createChannel(tenantId: string, input: {
        name: string; channelType: string; config?: any; isActive?: boolean;
    }) {
        const { data, error } = await this.db.from('notification_channels').insert({
            tenant_id: tenantId, name: input.name,
            channel_type: input.channelType,
            config: input.config || {},
            is_active: input.isActive ?? true,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateChannel(id: string, input: {
        name?: string; config?: any; isActive?: boolean;
    }) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (input.name !== undefined) updates.name = input.name;
        if (input.config !== undefined) updates.config = input.config;
        if (input.isActive !== undefined) updates.is_active = input.isActive;
        const { data, error } = await this.db.from('notification_channels')
            .update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteChannel(id: string): Promise<boolean> {
        const { error } = await this.db.from('notification_channels').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── TEMPLATES ──────────────────────────────────────────

    async getTemplates(tenantId: string) {
        const { data, error } = await this.db.from('notification_templates')
            .select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createTemplate(tenantId: string, input: {
        name: string; channelType: string; subject?: string;
        body: string; variables?: string[];
    }) {
        const { data, error } = await this.db.from('notification_templates').insert({
            tenant_id: tenantId, name: input.name,
            channel_type: input.channelType,
            subject: input.subject || null,
            body: input.body, variables: input.variables || [],
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateTemplate(id: string, input: {
        name?: string; subject?: string; body?: string;
        variables?: string[]; isActive?: boolean;
    }) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (input.name !== undefined) updates.name = input.name;
        if (input.subject !== undefined) updates.subject = input.subject;
        if (input.body !== undefined) updates.body = input.body;
        if (input.variables !== undefined) updates.variables = input.variables;
        if (input.isActive !== undefined) updates.is_active = input.isActive;
        const { data, error } = await this.db.from('notification_templates')
            .update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteTemplate(id: string): Promise<boolean> {
        const { error } = await this.db.from('notification_templates').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── RULES ──────────────────────────────────────────────

    async getRules(tenantId: string) {
        const { data, error } = await this.db.from('notification_rules')
            .select('*, notification_channels(name, channel_type), notification_templates(name)')
            .eq('tenant_id', tenantId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createRule(tenantId: string, input: {
        name: string; module: string; event: string;
        channelId?: string; templateId?: string;
        recipientType?: string; recipientValue?: string;
        conditions?: any;
    }) {
        const { data, error } = await this.db.from('notification_rules').insert({
            tenant_id: tenantId, name: input.name,
            module: input.module, event: input.event,
            channel_id: input.channelId || null,
            template_id: input.templateId || null,
            recipient_type: input.recipientType || 'assignee',
            recipient_value: input.recipientValue || null,
            conditions: input.conditions || {},
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateRule(id: string, input: {
        name?: string; module?: string; event?: string;
        channelId?: string; templateId?: string;
        recipientType?: string; recipientValue?: string;
        conditions?: any; isActive?: boolean;
    }) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (input.name !== undefined) updates.name = input.name;
        if (input.module !== undefined) updates.module = input.module;
        if (input.event !== undefined) updates.event = input.event;
        if (input.channelId !== undefined) updates.channel_id = input.channelId;
        if (input.templateId !== undefined) updates.template_id = input.templateId;
        if (input.recipientType !== undefined) updates.recipient_type = input.recipientType;
        if (input.recipientValue !== undefined) updates.recipient_value = input.recipientValue;
        if (input.conditions !== undefined) updates.conditions = input.conditions;
        if (input.isActive !== undefined) updates.is_active = input.isActive;
        const { data, error } = await this.db.from('notification_rules')
            .update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteRule(id: string): Promise<boolean> {
        const { error } = await this.db.from('notification_rules').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── NOTIFICATIONS (Inbox) ──────────────────────────────

    async getNotifications(tenantId: string, userId: string, onlyUnread = false) {
        let query = this.db.from('notifications')
            .select('*').eq('tenant_id', tenantId).eq('user_id', userId);
        if (onlyUnread) query = query.eq('is_read', false);
        const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
        if (error) throw error;
        return data;
    }

    async markNotificationRead(id: string) {
        const { data, error } = await this.db.from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async markAllRead(tenantId: string, userId: string) {
        const { error } = await this.db.from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('tenant_id', tenantId).eq('user_id', userId).eq('is_read', false);
        if (error) throw error;
        return true;
    }

    async createNotification(tenantId: string, input: {
        userId: string; title: string; message?: string;
        module?: string; link?: string; icon?: string;
    }) {
        const { data, error } = await this.db.from('notifications').insert({
            tenant_id: tenantId, user_id: input.userId,
            title: input.title, message: input.message || null,
            module: input.module || null, link: input.link || null,
            icon: input.icon || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async deleteNotification(id: string): Promise<boolean> {
        const { error } = await this.db.from('notifications').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── LOGS ───────────────────────────────────────────────

    async getNotificationLogs(tenantId: string, limit = 50) {
        const { data, error } = await this.db.from('notification_logs')
            .select('*').eq('tenant_id', tenantId)
            .order('created_at', { ascending: false }).limit(limit);
        if (error) throw error;
        return data;
    }

    async createNotificationLog(tenantId: string, input: {
        ruleId?: string; channelType: string; recipient: string;
        subject?: string; body?: string; status?: string;
        errorMessage?: string; metadata?: any;
    }) {
        const { data, error } = await this.db.from('notification_logs').insert({
            tenant_id: tenantId, rule_id: input.ruleId || null,
            channel_type: input.channelType, recipient: input.recipient,
            subject: input.subject || null, body: input.body || null,
            status: input.status || 'pending',
            error_message: input.errorMessage || null,
            metadata: input.metadata || {},
        }).select().single();
        if (error) throw error;
        return data;
    }
}
