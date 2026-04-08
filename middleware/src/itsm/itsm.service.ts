import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ItsmService {
    private readonly logger = new Logger(ItsmService.name);
    private db: any;

    constructor(private supabaseService: SupabaseService) {
        this.db = this.supabaseService.getAdminClient();
    }

    // ═══════════════════════════════════════════════════════════
    // ─── TICKET MANAGEMENT ─────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getTickets(filters?: { status?: string; priority?: string; categoryId?: string; assignedTo?: string; search?: string }) {
        let query = this.db.from('itsm_tickets').select('*').order('created_at', { ascending: false });
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.priority) query = query.eq('priority', filters.priority);
        if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
        if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
        if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%,reporter_name.ilike.%${filters.search}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async getTicketById(id: string) {
        const { data, error } = await this.db.from('itsm_tickets').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async getNextTicketNumber(): Promise<string> {
        const { data } = await this.db.from('itsm_tickets').select('ticket_number').order('created_at', { ascending: false }).limit(1);
        if (data && data.length > 0 && data[0].ticket_number) {
            const num = parseInt(data[0].ticket_number.replace('INC-', ''), 10);
            return `INC-${String(num + 1).padStart(4, '0')}`;
        }
        return 'INC-0001';
    }

    async createTicket(tenantId: string, input: any) {
        const ticketNumber = await this.getNextTicketNumber();

        // Auto-assign SLA policy based on priority
        let slaPolicyId = input.slaPolicyId;
        let slaResponseDue = null;
        let slaResolutionDue = null;

        if (!slaPolicyId && input.priority) {
            const { data: slaData } = await this.db.from('itsm_sla_policies')
                .select('*').eq('priority', input.priority).eq('status', 'active').limit(1);
            if (slaData && slaData.length > 0) {
                slaPolicyId = slaData[0].id;
                const now = new Date();
                slaResponseDue = new Date(now.getTime() + slaData[0].response_time_minutes * 60000).toISOString();
                slaResolutionDue = new Date(now.getTime() + slaData[0].resolution_time_minutes * 60000).toISOString();
            }
        }

        const { data, error } = await this.db.from('itsm_tickets').insert({
            tenant_id: tenantId,
            ticket_number: ticketNumber,
            title: input.title,
            description: input.description,
            category_id: input.categoryId || null,
            priority: input.priority || 'medium',
            status: 'new',
            impact: input.impact || 'medium',
            urgency: input.urgency || 'medium',
            contact_id: input.contactId || null,
            account_id: input.accountId || null,
            individual_id: input.individualId || null,
            pm_stakeholder_id: input.pmStakeholderId || null,
            reporter_name: input.reporterName,
            reporter_email: input.reporterEmail,
            assigned_to: input.assignedTo,
            assigned_group: input.assignedGroup,
            sla_policy_id: slaPolicyId || null,
            sla_response_due: slaResponseDue,
            sla_resolution_due: slaResolutionDue,
            channel: input.channel || 'portal',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateTicket(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            title: 'title', description: 'description', categoryId: 'category_id',
            priority: 'priority', status: 'status', impact: 'impact', urgency: 'urgency',
            contactId: 'contact_id', accountId: 'account_id', individualId: 'individual_id',
            pmStakeholderId: 'pm_stakeholder_id', reporterName: 'reporter_name',
            reporterEmail: 'reporter_email', assignedTo: 'assigned_to',
            assignedGroup: 'assigned_group', slaPolicyId: 'sla_policy_id',
            slaResponseMet: 'sla_response_met', slaResolutionMet: 'sla_resolution_met',
            channel: 'channel', resolutionNotes: 'resolution_notes',
        };
        for (const [k, c] of Object.entries(fieldMap)) {
            if (input[k] !== undefined) updates[c] = input[k];
        }

        // Handle status transitions
        if (input.status === 'resolved' && !updates.resolved_at) {
            updates.resolved_at = new Date().toISOString();
        }
        if (input.status === 'closed' && !updates.closed_at) {
            updates.closed_at = new Date().toISOString();
        }

        const { data, error } = await this.db.from('itsm_tickets').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteTicket(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_tickets').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── COMMENTS ──────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getComments(ticketId: string) {
        const { data, error } = await this.db.from('itsm_ticket_comments')
            .select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async addComment(input: any) {
        const { data, error } = await this.db.from('itsm_ticket_comments').insert({
            ticket_id: input.ticketId,
            author: input.author || 'System',
            content: input.content,
            is_internal: input.isInternal || false,
        }).select().single();
        if (error) throw error;
        return data;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── CATEGORIES ────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getCategories() {
        const { data, error } = await this.db.from('itsm_categories')
            .select('*').order('name', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async createCategory(tenantId: string, input: any) {
        const { data, error } = await this.db.from('itsm_categories').insert({
            tenant_id: tenantId,
            name: input.name,
            description: input.description,
            parent_id: input.parentId || null,
            icon: input.icon,
            status: input.status || 'active',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateCategory(id: string, input: any) {
        const updates: any = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;
        if (input.parentId !== undefined) updates.parent_id = input.parentId;
        if (input.icon !== undefined) updates.icon = input.icon;
        if (input.status !== undefined) updates.status = input.status;
        const { data, error } = await this.db.from('itsm_categories').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteCategory(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_categories').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── SLA POLICIES ──────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getSlaPolicies() {
        const { data, error } = await this.db.from('itsm_sla_policies')
            .select('*').order('response_time_minutes', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async createSlaPolicy(tenantId: string, input: any) {
        const { data, error } = await this.db.from('itsm_sla_policies').insert({
            tenant_id: tenantId,
            name: input.name,
            priority: input.priority,
            response_time_minutes: input.responseTimeMinutes,
            resolution_time_minutes: input.resolutionTimeMinutes,
            escalation_after_minutes: input.escalationAfterMinutes,
            status: input.status || 'active',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateSlaPolicy(id: string, input: any) {
        const updates: any = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.priority !== undefined) updates.priority = input.priority;
        if (input.responseTimeMinutes !== undefined) updates.response_time_minutes = input.responseTimeMinutes;
        if (input.resolutionTimeMinutes !== undefined) updates.resolution_time_minutes = input.resolutionTimeMinutes;
        if (input.escalationAfterMinutes !== undefined) updates.escalation_after_minutes = input.escalationAfterMinutes;
        if (input.status !== undefined) updates.status = input.status;
        const { data, error } = await this.db.from('itsm_sla_policies').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteSlaPolicy(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_sla_policies').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── DASHBOARD STATS ───────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getDashboardStats() {
        const { data: all } = await this.db.from('itsm_tickets').select('id, status, priority, sla_resolution_due, sla_resolution_met, created_at, resolved_at');
        const tickets = all || [];
        const now = new Date();

        const openStatuses = ['new', 'open', 'in_progress', 'pending'];
        const openTickets = tickets.filter((t: any) => openStatuses.includes(t.status));
        const unassigned = tickets.filter((t: any) => openStatuses.includes(t.status) && !t.assigned_to);
        const slaBreach = openTickets.filter((t: any) => t.sla_resolution_due && new Date(t.sla_resolution_due) < now);

        // Avg resolution time (in hours) for resolved/closed tickets
        const resolved = tickets.filter((t: any) => t.resolved_at);
        let avgResolutionHours = 0;
        if (resolved.length > 0) {
            const totalMs = resolved.reduce((sum: number, t: any) => sum + (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()), 0);
            avgResolutionHours = Math.round((totalMs / resolved.length) / (1000 * 60 * 60) * 10) / 10;
        }

        // By priority
        const byPriority = { critical: 0, high: 0, medium: 0, low: 0 };
        openTickets.forEach((t: any) => { if (byPriority[t.priority as keyof typeof byPriority] !== undefined) byPriority[t.priority as keyof typeof byPriority]++; });

        // By status
        const byStatus = { new: 0, open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0 };
        tickets.forEach((t: any) => { if (byStatus[t.status as keyof typeof byStatus] !== undefined) byStatus[t.status as keyof typeof byStatus]++; });

        // SLA compliance
        const withSla = tickets.filter((t: any) => t.sla_resolution_due);
        const slaMet = withSla.filter((t: any) => t.sla_resolution_met === true || (t.status !== 'resolved' && t.status !== 'closed' && new Date(t.sla_resolution_due) > now));
        const slaCompliance = withSla.length > 0 ? Math.round((slaMet.length / withSla.length) * 100) : 100;

        return {
            totalOpen: openTickets.length,
            totalUnassigned: unassigned.length,
            totalSlaBreach: slaBreach.length,
            avgResolutionHours,
            byPriority,
            byStatus,
            slaCompliance,
            totalTickets: tickets.length,
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ─── CROSS-MODULE LOOKUPS ──────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async searchReporters(search: string) {
        const results: any[] = [];

        // Search CRM Contacts
        const { data: contacts } = await this.db.from('contacts')
            .select('id, title, email, account_id').ilike('title', `%${search}%`).limit(5);
        (contacts || []).forEach((c: any) => results.push({ id: c.id, name: c.title || c.email, email: c.email, type: 'contact', entityId: c.id }));

        // Search CRM Individuals
        const { data: individuals } = await this.db.from('individuals')
            .select('id, first_name, last_name, email, company').or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`).limit(5);
        (individuals || []).forEach((i: any) => results.push({ id: i.id, name: `${i.first_name || ''} ${i.last_name || ''}`.trim(), email: i.email, type: 'individual', entityId: i.id }));

        // Search CRM Accounts
        const { data: accounts } = await this.db.from('accounts')
            .select('id, name, email').ilike('name', `%${search}%`).limit(5);
        (accounts || []).forEach((a: any) => results.push({ id: a.id, name: a.name, email: a.email, type: 'account', entityId: a.id }));

        // Search PM Stakeholders
        const { data: stakeholders } = await this.db.from('pm_stakeholders')
            .select('id, name, email, role, organization').ilike('name', `%${search}%`).limit(5);
        (stakeholders || []).forEach((s: any) => results.push({ id: s.id, name: s.name, email: s.email, type: 'pm_stakeholder', entityId: s.id, extra: `${s.role || ''} - ${s.organization || ''}` }));

        return results;
    }
}
