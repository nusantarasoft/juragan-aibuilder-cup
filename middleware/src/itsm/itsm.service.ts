import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { VertexAiService } from '../ai/vertex-ai.service';

@Injectable()
export class ItsmService {
    private readonly logger = new Logger(ItsmService.name);
    private db: any;

    constructor(
        private supabaseService: SupabaseService,
        private aiService: VertexAiService,
    ) {
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

    async getModuleCounts() {
        const [sr, prb, chg, ka] = await Promise.all([
            this.db.from('itsm_service_requests').select('id, status', { count: 'exact', head: false }),
            this.db.from('itsm_problems').select('id, status', { count: 'exact', head: false }),
            this.db.from('itsm_changes').select('id, status', { count: 'exact', head: false }),
            this.db.from('itsm_knowledge_articles').select('id, status', { count: 'exact', head: false }),
        ]);
        const srData = sr.data || [];
        const prbData = prb.data || [];
        const chgData = chg.data || [];
        const kaData = ka.data || [];

        const openSR = ['submitted', 'approved', 'in_fulfillment'];
        const openPRB = ['new', 'investigating', 'root_cause_identified'];
        const openCHG = ['draft', 'submitted', 'under_review', 'approved', 'scheduled', 'implementing'];

        return {
            serviceRequests: { total: srData.length, open: srData.filter((r: any) => openSR.includes(r.status)).length },
            problems: { total: prbData.length, open: prbData.filter((r: any) => openPRB.includes(r.status)).length, knownErrors: prbData.filter((r: any) => r.status === 'known_error').length },
            changes: { total: chgData.length, open: chgData.filter((r: any) => openCHG.includes(r.status)).length },
            knowledge: { total: kaData.length, published: kaData.filter((r: any) => r.status === 'published').length },
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

    // ═══════════════════════════════════════════════════════════
    // ─── AI-POWERED FEATURES ──────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async aiCategorizeTicket(title: string, description: string) {
        const categories = await this.getCategories();
        const categoryNames = categories.map((c: any) => c.name).join(', ');
        const prompt = `You are an ITSM AI assistant. Given the following ticket, categorize it and suggest priority.

Available categories: ${categoryNames}

Ticket Title: ${title}
Ticket Description: ${description || 'N/A'}

Please categorize this ticket and classify ticket category, suggest a priority level (critical/high/medium/low), impact, urgency, and assignment group. Also provide brief reasoning.

Return JSON with: suggestedCategory, suggestedPriority, suggestedImpact, suggestedUrgency, confidence (0-1), reasoning, suggestedAssignmentGroup, relatedKBArticles (array of strings)`;

        const raw = await this.aiService.generateText(prompt);
        try {
            return JSON.parse(raw.replace(/```json|```/g, '').trim());
        } catch {
            return JSON.parse(raw);
        }
    }

    async aiSuggestResolution(ticketId: string) {
        const ticket = await this.getTicketById(ticketId);
        if (!ticket) throw new Error('Ticket not found');

        const prompt = `You are an ITSM AI support assistant. A user has reported the following IT issue. Please suggest resolution steps and troubleshoot.

Ticket: ${ticket.ticket_number}
Title: ${ticket.title}
Description: ${ticket.description || 'N/A'}
Priority: ${ticket.priority}
Category: ${ticket.category_id || 'Unknown'}
Impact: ${ticket.impact}

Provide step-by-step resolution suggestion steps. Return JSON with: suggestedSteps (array), estimatedResolutionTime, confidence (0-1), relatedIncidents (array)`;

        const raw = await this.aiService.generateText(prompt);
        try {
            return JSON.parse(raw.replace(/```json|```/g, '').trim());
        } catch {
            return JSON.parse(raw);
        }
    }

    async aiAnalyzeSlaRisk(ticketId: string) {
        const ticket = await this.getTicketById(ticketId);
        if (!ticket) throw new Error('Ticket not found');

        const now = new Date();
        const slaResolutionDue = ticket.sla_resolution_due ? new Date(ticket.sla_resolution_due) : null;
        const remainingMs = slaResolutionDue ? slaResolutionDue.getTime() - now.getTime() : null;
        const remainingStr = remainingMs
            ? `${Math.floor(remainingMs / 3600000)}h ${Math.floor((remainingMs % 3600000) / 60000)}m`
            : 'No SLA set';

        const prompt = `You are an ITSM AI assistant performing SLA risk analysis and ticket priority assessment.

Ticket: ${ticket.ticket_number}
Title: ${ticket.title}
Priority: ${ticket.priority}
Status: ${ticket.status}
SLA Resolution Due: ${ticket.sla_resolution_due || 'Not set'}
Time Remaining: ${remainingStr}
Created: ${ticket.created_at}

Analyze the SLA risk for this ticket. Return JSON with: riskLevel (low/medium/high/critical), slaStatus (on_track/at_risk/breached), remainingTime, recommendation, suggestedEscalation (boolean), similarTicketsAvgResolution`;

        const raw = await this.aiService.generateText(prompt);
        try {
            return JSON.parse(raw.replace(/```json|```/g, '').trim());
        } catch {
            return JSON.parse(raw);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ─── SERVICE PORTFOLIO ────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getPortfolioServices(filters?: { lifecycleStatus?: string; serviceType?: string; search?: string }) {
        let query = this.db.from('itsm_service_portfolio').select('*').order('created_at', { ascending: false });
        if (filters?.lifecycleStatus) query = query.eq('lifecycle_status', filters.lifecycleStatus);
        if (filters?.serviceType) query = query.eq('service_type', filters.serviceType);
        if (filters?.search) query = query.or(`name.ilike.%${filters.search}%,service_code.ilike.%${filters.search}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async getPortfolioServiceById(id: string) {
        const { data, error } = await this.db.from('itsm_service_portfolio').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    private async getNextServiceCode(): Promise<string> {
        const { data } = await this.db.from('itsm_service_portfolio').select('service_code').order('created_at', { ascending: false }).limit(1);
        if (data?.length > 0 && data[0].service_code) {
            const num = parseInt(data[0].service_code.replace('SVC-', ''), 10);
            return `SVC-${String(num + 1).padStart(4, '0')}`;
        }
        return 'SVC-0001';
    }

    async createPortfolioService(tenantId: string, input: any) {
        const serviceCode = await this.getNextServiceCode();
        const { data, error } = await this.db.from('itsm_service_portfolio').insert({
            tenant_id: tenantId, service_code: serviceCode, name: input.name, description: input.description,
            business_owner: input.businessOwner, technical_owner: input.technicalOwner,
            lifecycle_status: input.lifecycleStatus || 'pipeline', service_type: input.serviceType || 'business',
            criticality: input.criticality || 'medium', cost_center: input.costCenter,
            budget_allocated: input.budgetAllocated, sla_target: input.slaTarget,
            dependencies: input.dependencies, risks: input.risks, notes: input.notes,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updatePortfolioService(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            name: 'name', description: 'description', businessOwner: 'business_owner',
            technicalOwner: 'technical_owner', lifecycleStatus: 'lifecycle_status',
            serviceType: 'service_type', criticality: 'criticality', costCenter: 'cost_center',
            budgetAllocated: 'budget_allocated', slaTarget: 'sla_target', dependencies: 'dependencies',
            risks: 'risks', notes: 'notes', publishedToCatalog: 'published_to_catalog',
        };
        for (const [k, c] of Object.entries(map)) { if (input[k] !== undefined) updates[c] = input[k]; }
        if (input.publishedToCatalog === true && !updates.published_at) updates.published_at = new Date().toISOString();
        const { data, error } = await this.db.from('itsm_service_portfolio').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deletePortfolioService(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_service_portfolio').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // Publish to catalog
    async publishToCatalog(portfolioId: string, input: any) {
        const svc = await this.getPortfolioServiceById(portfolioId);
        if (!svc) throw new Error('Service not found');
        const catalogCode = `CAT-${String(Date.now()).slice(-6)}`;
        const { data, error } = await this.db.from('itsm_service_catalog').insert({
            tenant_id: svc.tenant_id, portfolio_service_id: portfolioId, catalog_code: catalogCode,
            name: input.name || svc.name, short_description: input.shortDescription || svc.description?.slice(0, 200),
            description: input.description || svc.description, category_id: input.categoryId || null,
            icon: input.icon, estimated_delivery: input.estimatedDelivery, cost: input.cost,
            approval_required: input.approvalRequired || false, approval_type: input.approvalType || 'simple',
            fulfillment_group: input.fulfillmentGroup, status: 'active',
        }).select().single();
        if (error) throw error;
        // Mark portfolio service as published
        await this.db.from('itsm_service_portfolio').update({ published_to_catalog: true, published_at: new Date().toISOString() }).eq('id', portfolioId);
        return data;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── SERVICE CATALOG ──────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getCatalogItems(filters?: { status?: string; categoryId?: string; search?: string }) {
        let query = this.db.from('itsm_service_catalog').select('*').order('name', { ascending: true });
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
        if (filters?.search) query = query.or(`name.ilike.%${filters.search}%,catalog_code.ilike.%${filters.search}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async createCatalogItem(tenantId: string, input: any) {
        const catalogCode = `CAT-${String(Date.now()).slice(-6)}`;
        const { data, error } = await this.db.from('itsm_service_catalog').insert({
            tenant_id: tenantId, catalog_code: catalogCode, name: input.name,
            short_description: input.shortDescription, description: input.description,
            portfolio_service_id: input.portfolioServiceId || null, category_id: input.categoryId || null,
            icon: input.icon, estimated_delivery: input.estimatedDelivery, cost: input.cost,
            approval_required: input.approvalRequired || false, approval_type: input.approvalType || 'simple',
            fulfillment_group: input.fulfillmentGroup, status: input.status || 'active',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateCatalogItem(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            name: 'name', shortDescription: 'short_description', description: 'description',
            categoryId: 'category_id', icon: 'icon', estimatedDelivery: 'estimated_delivery',
            cost: 'cost', approvalRequired: 'approval_required', approvalType: 'approval_type',
            fulfillmentGroup: 'fulfillment_group', status: 'status',
        };
        for (const [k, c] of Object.entries(map)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('itsm_service_catalog').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteCatalogItem(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_service_catalog').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── SERVICE REQUESTS (SR-) ───────────────────────────────
    // ═══════════════════════════════════════════════════════════

    private async getNextSRNumber(): Promise<string> {
        const { data } = await this.db.from('itsm_service_requests').select('request_number').order('created_at', { ascending: false }).limit(1);
        if (data?.length > 0) { const n = parseInt(data[0].request_number.replace('SR-', ''), 10); return `SR-${String(n + 1).padStart(4, '0')}`; }
        return 'SR-0001';
    }

    async getServiceRequests(filters?: { status?: string; priority?: string; search?: string }) {
        let query = this.db.from('itsm_service_requests').select('*').order('created_at', { ascending: false });
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.priority) query = query.eq('priority', filters.priority);
        if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,request_number.ilike.%${filters.search}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async createServiceRequest(tenantId: string, input: any) {
        const requestNumber = await this.getNextSRNumber();
        const { data, error } = await this.db.from('itsm_service_requests').insert({
            tenant_id: tenantId, request_number: requestNumber, title: input.title,
            description: input.description, catalog_item_id: input.catalogItemId || null,
            category_id: input.categoryId || null, priority: input.priority || 'medium',
            status: 'submitted', requested_for: input.requestedFor,
            requester_name: input.requesterName, requester_email: input.requesterEmail,
            contact_id: input.contactId || null, account_id: input.accountId || null,
            fulfillment_group: input.fulfillmentGroup,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateServiceRequest(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            title: 'title', description: 'description', catalogItemId: 'catalog_item_id',
            categoryId: 'category_id', priority: 'priority', status: 'status',
            requestedFor: 'requested_for', requesterName: 'requester_name',
            requesterEmail: 'requester_email', fulfillmentGroup: 'fulfillment_group',
            fulfilledBy: 'fulfilled_by', notes: 'notes',
        };
        for (const [k, c] of Object.entries(map)) { if (input[k] !== undefined) updates[c] = input[k]; }
        if (input.status === 'fulfilled') updates.fulfilled_at = new Date().toISOString();
        const { data, error } = await this.db.from('itsm_service_requests').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteServiceRequest(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_service_requests').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── PROBLEMS (PRB-) ──────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    private async getNextPRBNumber(): Promise<string> {
        const { data } = await this.db.from('itsm_problems').select('problem_number').order('created_at', { ascending: false }).limit(1);
        if (data?.length > 0) { const n = parseInt(data[0].problem_number.replace('PRB-', ''), 10); return `PRB-${String(n + 1).padStart(4, '0')}`; }
        return 'PRB-0001';
    }

    async getProblems(filters?: { status?: string; priority?: string; search?: string }) {
        let query = this.db.from('itsm_problems').select('*').order('created_at', { ascending: false });
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.priority) query = query.eq('priority', filters.priority);
        if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,problem_number.ilike.%${filters.search}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async createProblem(tenantId: string, input: any) {
        const problemNumber = await this.getNextPRBNumber();
        const { data, error } = await this.db.from('itsm_problems').insert({
            tenant_id: tenantId, problem_number: problemNumber, title: input.title,
            description: input.description, category_id: input.categoryId || null,
            priority: input.priority || 'medium', impact: input.impact || 'medium',
            assigned_to: input.assignedTo, assigned_group: input.assignedGroup,
            reporter_name: input.reporterName, reporter_email: input.reporterEmail,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateProblem(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            title: 'title', description: 'description', categoryId: 'category_id',
            priority: 'priority', status: 'status', impact: 'impact',
            rootCause: 'root_cause', workaround: 'workaround', isKnownError: 'is_known_error',
            knowledgeArticleId: 'knowledge_article_id', assignedTo: 'assigned_to',
            assignedGroup: 'assigned_group', resolutionNotes: 'resolution_notes',
        };
        for (const [k, c] of Object.entries(map)) { if (input[k] !== undefined) updates[c] = input[k]; }
        if (input.status === 'resolved') updates.resolved_at = new Date().toISOString();
        if (input.status === 'closed') updates.closed_at = new Date().toISOString();
        const { data, error } = await this.db.from('itsm_problems').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteProblem(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_problems').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async linkProblemIncident(problemId: string, incidentId: string) {
        const { data, error } = await this.db.from('itsm_problem_incidents').insert({ problem_id: problemId, incident_id: incidentId }).select().single();
        if (error) throw error;
        return data;
    }

    async getProblemIncidents(problemId: string) {
        const { data, error } = await this.db.from('itsm_problem_incidents').select('*, itsm_tickets(*)').eq('problem_id', problemId);
        if (error) throw error;
        return data || [];
    }

    // ═══════════════════════════════════════════════════════════
    // ─── CHANGE REQUESTS (CHG-) ───────────────────────────────
    // ═══════════════════════════════════════════════════════════

    private async getNextCHGNumber(): Promise<string> {
        const { data } = await this.db.from('itsm_changes').select('change_number').order('created_at', { ascending: false }).limit(1);
        if (data?.length > 0) { const n = parseInt(data[0].change_number.replace('CHG-', ''), 10); return `CHG-${String(n + 1).padStart(4, '0')}`; }
        return 'CHG-0001';
    }

    async getChanges(filters?: { status?: string; changeType?: string; search?: string }) {
        let query = this.db.from('itsm_changes').select('*').order('created_at', { ascending: false });
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.changeType) query = query.eq('change_type', filters.changeType);
        if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,change_number.ilike.%${filters.search}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async createChange(tenantId: string, input: any) {
        const changeNumber = await this.getNextCHGNumber();
        const { data, error } = await this.db.from('itsm_changes').insert({
            tenant_id: tenantId, change_number: changeNumber, title: input.title,
            description: input.description, category_id: input.categoryId || null,
            change_type: input.changeType || 'normal', priority: input.priority || 'medium',
            risk_level: input.riskLevel || 'medium', impact: input.impact || 'medium',
            implementation_plan: input.implementationPlan, rollback_plan: input.rollbackPlan,
            test_plan: input.testPlan, scheduled_start: input.scheduledStart || null,
            scheduled_end: input.scheduledEnd || null, cab_required: input.cabRequired ?? true,
            requested_by: input.requestedBy, assigned_to: input.assignedTo,
            assigned_group: input.assignedGroup, related_incident_id: input.relatedIncidentId || null,
            related_problem_id: input.relatedProblemId || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateChange(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            title: 'title', description: 'description', categoryId: 'category_id',
            changeType: 'change_type', priority: 'priority', riskLevel: 'risk_level',
            status: 'status', impact: 'impact', implementationPlan: 'implementation_plan',
            rollbackPlan: 'rollback_plan', testPlan: 'test_plan',
            scheduledStart: 'scheduled_start', scheduledEnd: 'scheduled_end',
            actualStart: 'actual_start', actualEnd: 'actual_end',
            cabRequired: 'cab_required', cabDecision: 'cab_decision',
            cabNotes: 'cab_notes', cabDate: 'cab_date',
            requestedBy: 'requested_by', assignedTo: 'assigned_to',
            assignedGroup: 'assigned_group', reviewNotes: 'review_notes',
        };
        for (const [k, c] of Object.entries(map)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('itsm_changes').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteChange(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_changes').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── KNOWLEDGE ARTICLES (KA-) ─────────────────────────────
    // ═══════════════════════════════════════════════════════════

    private async getNextKANumber(): Promise<string> {
        const { data } = await this.db.from('itsm_knowledge_articles').select('article_number').order('created_at', { ascending: false }).limit(1);
        if (data?.length > 0) { const n = parseInt(data[0].article_number.replace('KA-', ''), 10); return `KA-${String(n + 1).padStart(4, '0')}`; }
        return 'KA-0001';
    }

    async getKnowledgeArticles(filters?: { status?: string; articleType?: string; search?: string }) {
        let query = this.db.from('itsm_knowledge_articles').select('*').order('created_at', { ascending: false });
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.articleType) query = query.eq('article_type', filters.articleType);
        if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,article_number.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async createKnowledgeArticle(tenantId: string, input: any) {
        const articleNumber = await this.getNextKANumber();
        const { data, error } = await this.db.from('itsm_knowledge_articles').insert({
            tenant_id: tenantId, article_number: articleNumber, title: input.title,
            content: input.content, category_id: input.categoryId || null,
            article_type: input.articleType || 'solution', status: 'draft',
            related_problem_id: input.relatedProblemId || null, author: input.author,
            tags: input.tags || [],
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateKnowledgeArticle(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            title: 'title', content: 'content', categoryId: 'category_id',
            articleType: 'article_type', status: 'status', relatedProblemId: 'related_problem_id',
            author: 'author', tags: 'tags',
        };
        for (const [k, c] of Object.entries(map)) { if (input[k] !== undefined) updates[c] = input[k]; }
        if (input.status === 'published' && !updates.published_at) updates.published_at = new Date().toISOString();
        const { data, error } = await this.db.from('itsm_knowledge_articles').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteKnowledgeArticle(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_knowledge_articles').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── APPROVALS (simple + multi-level) ─────────────────────
    // ═══════════════════════════════════════════════════════════

    async getApprovals(recordType: string, recordId: string) {
        const { data, error } = await this.db.from('itsm_approvals').select('*')
            .eq('record_type', recordType).eq('record_id', recordId).order('approval_level', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async createApproval(tenantId: string, input: any) {
        const { data, error } = await this.db.from('itsm_approvals').insert({
            tenant_id: tenantId, record_type: input.recordType, record_id: input.recordId,
            approval_level: input.approvalLevel || 1, approver_name: input.approverName,
            approver_email: input.approverEmail,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async decideApproval(id: string, status: string, notes?: string) {
        const { data, error } = await this.db.from('itsm_approvals').update({
            status, decision_notes: notes || null, decided_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── CMDB — CONFIGURATION ITEMS ──────────────────────────
    // ═══════════════════════════════════════════════════════════

    private async getNextCINumber(): Promise<string> {
        const { data } = await this.db.from('itsm_configuration_items').select('ci_number').order('created_at', { ascending: false }).limit(1);
        if (data?.length > 0) { const n = parseInt(data[0].ci_number.replace('CI-', ''), 10); return `CI-${String(n + 1).padStart(4, '0')}`; }
        return 'CI-0001';
    }

    async getConfigurationItems(filters?: { ciClass?: string; status?: string; environment?: string; search?: string }) {
        let query = this.db.from('itsm_configuration_items').select('*').order('ci_number', { ascending: true });
        if (filters?.ciClass) query = query.eq('ci_class', filters.ciClass);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.environment) query = query.eq('environment', filters.environment);
        if (filters?.search) query = query.or(`name.ilike.%${filters.search}%,ci_number.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%,ip_address.ilike.%${filters.search}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async getConfigurationItemById(id: string) {
        const { data, error } = await this.db.from('itsm_configuration_items').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createConfigurationItem(tenantId: string, input: any) {
        const ciNumber = await this.getNextCINumber();
        const { data, error } = await this.db.from('itsm_configuration_items').insert({
            tenant_id: tenantId, ci_number: ciNumber, name: input.name,
            ci_class: input.ciClass || 'hardware', ci_type: input.ciType,
            status: input.status || 'active', environment: input.environment || 'production',
            criticality: input.criticality || 'medium', location: input.location,
            department: input.department, owner: input.owner, managed_by: input.managedBy,
            vendor: input.vendor, manufacturer: input.manufacturer, model: input.model,
            serial_number: input.serialNumber, ip_address: input.ipAddress, mac_address: input.macAddress,
            os_info: input.osInfo, version: input.version, cpu: input.cpu,
            memory_gb: input.memoryGb, storage_gb: input.storageGb,
            purchase_date: input.purchaseDate, warranty_expiry: input.warrantyExpiry,
            install_date: input.installDate, end_of_life: input.endOfLife,
            asset_id: input.assetId || null, service_id: input.serviceId || null,
            parent_ci_id: input.parentCiId || null, tags: input.tags || [],
            custom_fields: input.customFields || {}, notes: input.notes,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateConfigurationItem(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            name: 'name', ciClass: 'ci_class', ciType: 'ci_type', status: 'status',
            environment: 'environment', criticality: 'criticality', location: 'location',
            department: 'department', owner: 'owner', managedBy: 'managed_by',
            vendor: 'vendor', manufacturer: 'manufacturer', model: 'model',
            serialNumber: 'serial_number', ipAddress: 'ip_address', macAddress: 'mac_address',
            osInfo: 'os_info', version: 'version', cpu: 'cpu',
            memoryGb: 'memory_gb', storageGb: 'storage_gb',
            purchaseDate: 'purchase_date', warrantyExpiry: 'warranty_expiry',
            installDate: 'install_date', decommissionDate: 'decommission_date',
            endOfLife: 'end_of_life', assetId: 'asset_id', serviceId: 'service_id',
            parentCiId: 'parent_ci_id', tags: 'tags', customFields: 'custom_fields', notes: 'notes',
        };
        for (const [k, c] of Object.entries(map)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('itsm_configuration_items').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteConfigurationItem(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_configuration_items').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getCIRelationships(ciId: string) {
        const { data: outgoing } = await this.db.from('itsm_ci_relationships')
            .select('*, target:itsm_configuration_items!itsm_ci_relationships_target_ci_id_fkey(id, ci_number, name, ci_class, status)')
            .eq('source_ci_id', ciId);
        const { data: incoming } = await this.db.from('itsm_ci_relationships')
            .select('*, source:itsm_configuration_items!itsm_ci_relationships_source_ci_id_fkey(id, ci_number, name, ci_class, status)')
            .eq('target_ci_id', ciId);
        return { outgoing: outgoing || [], incoming: incoming || [] };
    }

    async addCIRelationship(sourceCiId: string, targetCiId: string, relationshipType: string, description?: string) {
        const { data, error } = await this.db.from('itsm_ci_relationships').insert({
            source_ci_id: sourceCiId, target_ci_id: targetCiId,
            relationship_type: relationshipType, description: description || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async removeCIRelationship(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_ci_relationships').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── EVENT MANAGEMENT ────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    private async getNextEVTNumber(): Promise<string> {
        const { data } = await this.db.from('itsm_events').select('event_number').order('created_at', { ascending: false }).limit(1);
        if (data?.length > 0) { const n = parseInt(data[0].event_number.replace('EVT-', ''), 10); return `EVT-${String(n + 1).padStart(4, '0')}`; }
        return 'EVT-0001';
    }

    async getEvents(filters?: { status?: string; severity?: string; eventType?: string; source?: string; search?: string }) {
        let query = this.db.from('itsm_events').select('*').order('occurred_at', { ascending: false });
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.severity) query = query.eq('severity', filters.severity);
        if (filters?.eventType) query = query.eq('event_type', filters.eventType);
        if (filters?.source) query = query.eq('source', filters.source);
        if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,event_number.ilike.%${filters.search}%,resource_name.ilike.%${filters.search}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async createEvent(tenantId: string, input: any) {
        const eventNumber = await this.getNextEVTNumber();
        const { data, error } = await this.db.from('itsm_events').insert({
            tenant_id: tenantId, event_number: eventNumber, source: input.source,
            source_event_id: input.sourceEventId, event_type: input.eventType || 'warning',
            severity: input.severity || 'medium', title: input.title,
            description: input.description, category: input.category,
            resource_name: input.resourceName, resource_type: input.resourceType,
            metric_name: input.metricName, metric_value: input.metricValue,
            threshold_value: input.thresholdValue, ci_id: input.ciId || null,
            service_id: input.serviceId || null, correlation_key: input.correlationKey,
            suppression_key: input.suppressionKey,
            occurred_at: input.occurredAt || new Date().toISOString(),
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateEvent(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            status: 'status', severity: 'severity', eventType: 'event_type',
            acknowledgedBy: 'acknowledged_by', description: 'description',
        };
        for (const [k, c] of Object.entries(map)) { if (input[k] !== undefined) updates[c] = input[k]; }
        if (input.status === 'acknowledged') updates.acknowledged_at = new Date().toISOString();
        if (input.status === 'closed') updates.resolved_at = new Date().toISOString();
        const { data, error } = await this.db.from('itsm_events').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async escalateEventToIncident(eventId: string, tenantId: string) {
        const event = await this.db.from('itsm_events').select('*').eq('id', eventId).single();
        if (event.error || !event.data) throw new Error('Event not found');
        const e = event.data;

        // Create incident from event
        const priorityMap: Record<string, string> = { critical: 'critical', high: 'high', medium: 'medium', low: 'low', informational: 'low' };
        const ticket = await this.createTicket(tenantId, {
            title: `[Auto] ${e.title}`,
            description: `Auto-created from event ${e.event_number}.\n\nSource: ${e.source}\nResource: ${e.resource_name || 'N/A'}\nMetric: ${e.metric_name || 'N/A'} = ${e.metric_value || 'N/A'} (threshold: ${e.threshold_value || 'N/A'})\n\n${e.description || ''}`,
            priority: priorityMap[e.severity] || 'medium',
            impact: e.severity === 'critical' ? 'high' : 'medium',
            urgency: e.severity === 'critical' || e.severity === 'high' ? 'high' : 'medium',
            channel: 'monitoring',
            reporterName: `Monitoring (${e.source})`,
            reporterEmail: 'monitoring@nusantarasoft.local',
        });

        // Link event to incident
        await this.db.from('itsm_events').update({
            status: 'escalated', escalated_to_incident_id: ticket.id,
            updated_at: new Date().toISOString(),
        }).eq('id', eventId);

        return ticket;
    }

    async deleteEvent(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_events').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── RELEASE MANAGEMENT ──────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    private async getNextRELNumber(): Promise<string> {
        const { data } = await this.db.from('itsm_releases').select('release_number').order('created_at', { ascending: false }).limit(1);
        if (data?.length > 0) { const n = parseInt(data[0].release_number.replace('REL-', ''), 10); return `REL-${String(n + 1).padStart(4, '0')}`; }
        return 'REL-0001';
    }

    async getReleases(filters?: { status?: string; releaseType?: string; search?: string }) {
        let query = this.db.from('itsm_releases').select('*').order('created_at', { ascending: false });
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.releaseType) query = query.eq('release_type', filters.releaseType);
        if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,release_number.ilike.%${filters.search}%,version.ilike.%${filters.search}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async createRelease(tenantId: string, input: any) {
        const releaseNumber = await this.getNextRELNumber();
        const { data, error } = await this.db.from('itsm_releases').insert({
            tenant_id: tenantId, release_number: releaseNumber, title: input.title,
            version: input.version, description: input.description,
            release_type: input.releaseType || 'minor', priority: input.priority || 'medium',
            risk_level: input.riskLevel || 'medium',
            planned_start: input.plannedStart, planned_end: input.plannedEnd,
            release_manager: input.releaseManager, build_team: input.buildTeam,
            test_lead: input.testLead, deployment_plan: input.deploymentPlan,
            validation_plan: input.validationPlan, rollback_plan: input.rollbackPlan,
            communication_plan: input.communicationPlan, tags: input.tags || [],
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateRelease(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            title: 'title', version: 'version', description: 'description',
            releaseType: 'release_type', status: 'status', priority: 'priority',
            riskLevel: 'risk_level', plannedStart: 'planned_start', plannedEnd: 'planned_end',
            actualStart: 'actual_start', actualEnd: 'actual_end', buildNumber: 'build_number',
            releaseManager: 'release_manager', buildTeam: 'build_team', testLead: 'test_lead',
            deploymentPlan: 'deployment_plan', validationPlan: 'validation_plan',
            rollbackPlan: 'rollback_plan', communicationPlan: 'communication_plan',
            testResults: 'test_results', deploymentNotes: 'deployment_notes',
            postReleaseReview: 'post_release_review', tags: 'tags',
        };
        for (const [k, c] of Object.entries(map)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('itsm_releases').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteRelease(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_releases').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getReleaseChanges(releaseId: string) {
        const { data, error } = await this.db.from('itsm_release_changes')
            .select('*, itsm_changes(*)').eq('release_id', releaseId).order('sort_order');
        if (error) throw error;
        return data || [];
    }

    async addReleaseChange(releaseId: string, changeId: string) {
        const { data, error } = await this.db.from('itsm_release_changes').insert({
            release_id: releaseId, change_id: changeId,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async removeReleaseChange(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_release_changes').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── WORKFORCE / AGENT MANAGEMENT ────────────────────────
    // ═══════════════════════════════════════════════════════════

    private async getNextAGTCode(): Promise<string> {
        const { data } = await this.db.from('itsm_agents').select('agent_code').order('created_at', { ascending: false }).limit(1);
        if (data?.length > 0) { const n = parseInt(data[0].agent_code.replace('AGT-', ''), 10); return `AGT-${String(n + 1).padStart(4, '0')}`; }
        return 'AGT-0001';
    }

    async getAgents(filters?: { status?: string; team?: string; role?: string; search?: string }) {
        let query = this.db.from('itsm_agents').select('*').order('name', { ascending: true });
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.team) query = query.eq('team', filters.team);
        if (filters?.role) query = query.eq('role', filters.role);
        if (filters?.search) query = query.or(`name.ilike.%${filters.search}%,agent_code.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async createAgent(tenantId: string, input: any) {
        const agentCode = await this.getNextAGTCode();
        const { data, error } = await this.db.from('itsm_agents').insert({
            tenant_id: tenantId, agent_code: agentCode, name: input.name,
            email: input.email, phone: input.phone, title: input.title,
            department: input.department, team: input.team,
            role: input.role || 'agent', status: input.status || 'active',
            shift: input.shift || 'day', shift_start: input.shiftStart,
            shift_end: input.shiftEnd, timezone: input.timezone || 'Asia/Jakarta',
            max_tickets: input.maxTickets || 10, user_id: input.userId || null,
            notes: input.notes,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateAgent(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            name: 'name', email: 'email', phone: 'phone', title: 'title',
            department: 'department', team: 'team', role: 'role', status: 'status',
            shift: 'shift', shiftStart: 'shift_start', shiftEnd: 'shift_end',
            timezone: 'timezone', maxTickets: 'max_tickets',
            currentTicketCount: 'current_ticket_count', utilizationPct: 'utilization_pct',
            avgResolutionHours: 'avg_resolution_hours',
            customerSatisfactionScore: 'customer_satisfaction_score',
            totalTicketsResolved: 'total_tickets_resolved',
            slaCompliancePct: 'sla_compliance_pct', notes: 'notes',
        };
        for (const [k, c] of Object.entries(map)) { if (input[k] !== undefined) updates[c] = input[k]; }
        const { data, error } = await this.db.from('itsm_agents').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteAgent(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_agents').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getAgentSkills(agentId: string) {
        const { data, error } = await this.db.from('itsm_agent_skills').select('*').eq('agent_id', agentId).order('skill_name');
        if (error) throw error;
        return data || [];
    }

    async addAgentSkill(agentId: string, input: any) {
        const { data, error } = await this.db.from('itsm_agent_skills').insert({
            agent_id: agentId, skill_name: input.skillName,
            proficiency_level: input.proficiencyLevel || 'intermediate',
            certified: input.certified || false,
            certification_name: input.certificationName,
            certification_expiry: input.certificationExpiry,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async removeAgentSkill(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_agent_skills').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getAgentWorkload() {
        const { data, error } = await this.db.from('itsm_agents').select('*')
            .eq('status', 'active').order('current_ticket_count', { ascending: true });
        if (error) throw error;
        return (data || []).map((a: any) => ({
            ...a,
            available_capacity: (a.max_tickets || 10) - (a.current_ticket_count || 0),
            utilization_pct: a.max_tickets > 0 ? Math.round((a.current_ticket_count / a.max_tickets) * 100) : 0,
        }));
    }

    // ═══════════════════════════════════════════════════════════
    // ─── SERVICE CONTINUITY ──────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    private async getNextBCPNumber(): Promise<string> {
        const { data } = await this.db.from('itsm_continuity_plans').select('plan_number').order('created_at', { ascending: false }).limit(1);
        if (data?.length > 0) { const n = parseInt(data[0].plan_number.replace('BCP-', ''), 10); return `BCP-${String(n + 1).padStart(4, '0')}`; }
        return 'BCP-0001';
    }

    async getContinuityPlans(filters?: { status?: string; planType?: string; search?: string }) {
        let query = this.db.from('itsm_continuity_plans').select('*').order('created_at', { ascending: false });
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.planType) query = query.eq('plan_type', filters.planType);
        if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,plan_number.ilike.%${filters.search}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async createContinuityPlan(tenantId: string, input: any) {
        const planNumber = await this.getNextBCPNumber();
        const { data, error } = await this.db.from('itsm_continuity_plans').insert({
            tenant_id: tenantId, plan_number: planNumber, title: input.title,
            plan_type: input.planType || 'bcp', description: input.description,
            scope: input.scope, assumptions: input.assumptions,
            rto_hours: input.rtoHours, rpo_hours: input.rpoHours, mtpd_hours: input.mtpdHours,
            recovery_priority: input.recoveryPriority || 'medium',
            risk_assessment: input.riskAssessment, business_impact_analysis: input.businessImpactAnalysis,
            recovery_strategy: input.recoveryStrategy, recovery_procedures: input.recoveryProcedures,
            communication_plan: input.communicationPlan, escalation_contacts: input.escalationContacts,
            test_frequency: input.testFrequency || 'annually',
            plan_owner: input.planOwner, service_id: input.serviceId || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateContinuityPlan(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            title: 'title', planType: 'plan_type', status: 'status',
            description: 'description', scope: 'scope', assumptions: 'assumptions',
            rtoHours: 'rto_hours', rpoHours: 'rpo_hours', mtpdHours: 'mtpd_hours',
            recoveryPriority: 'recovery_priority', riskAssessment: 'risk_assessment',
            businessImpactAnalysis: 'business_impact_analysis',
            recoveryStrategy: 'recovery_strategy', recoveryProcedures: 'recovery_procedures',
            communicationPlan: 'communication_plan', escalationContacts: 'escalation_contacts',
            lastTestDate: 'last_test_date', lastTestResult: 'last_test_result',
            nextTestDate: 'next_test_date', testFrequency: 'test_frequency',
            planOwner: 'plan_owner', approvedBy: 'approved_by', reviewDate: 'review_date',
            serviceId: 'service_id',
        };
        for (const [k, c] of Object.entries(map)) { if (input[k] !== undefined) updates[c] = input[k]; }
        if (input.status === 'approved') updates.approved_at = new Date().toISOString();
        const { data, error } = await this.db.from('itsm_continuity_plans').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteContinuityPlan(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_continuity_plans').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── AVAILABILITY MANAGEMENT ─────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getAvailabilityRecords(filters?: { serviceId?: string; ciId?: string }) {
        let query = this.db.from('itsm_availability_records').select('*').order('period_start', { ascending: false });
        if (filters?.serviceId) query = query.eq('service_id', filters.serviceId);
        if (filters?.ciId) query = query.eq('ci_id', filters.ciId);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async createAvailabilityRecord(tenantId: string, input: any) {
        const { data, error } = await this.db.from('itsm_availability_records').insert({
            tenant_id: tenantId, service_id: input.serviceId || null,
            ci_id: input.ciId || null, period_start: input.periodStart,
            period_end: input.periodEnd, uptime_minutes: input.uptimeMinutes,
            downtime_minutes: input.downtimeMinutes,
            planned_downtime_minutes: input.plannedDowntimeMinutes || 0,
            unplanned_downtime_minutes: input.unplannedDowntimeMinutes || 0,
            mtbf_hours: input.mtbfHours, mtrs_hours: input.mtrsHours,
            incident_count: input.incidentCount || 0,
            sla_target_pct: input.slaTargetPct || 99.9, notes: input.notes,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async deleteAvailabilityRecord(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_availability_records').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── DEPLOYMENT MANAGEMENT ───────────────────────────────
    // ═══════════════════════════════════════════════════════════

    private async getNextDEPNumber(): Promise<string> {
        const { data } = await this.db.from('itsm_deployments').select('deployment_number').order('created_at', { ascending: false }).limit(1);
        if (data?.length > 0) { const n = parseInt(data[0].deployment_number.replace('DEP-', ''), 10); return `DEP-${String(n + 1).padStart(4, '0')}`; }
        return 'DEP-0001';
    }

    async getDeployments(filters?: { status?: string; environment?: string; search?: string }) {
        let query = this.db.from('itsm_deployments').select('*').order('created_at', { ascending: false });
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.environment) query = query.eq('environment', filters.environment);
        if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,deployment_number.ilike.%${filters.search}%`);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async createDeployment(tenantId: string, input: any) {
        const deploymentNumber = await this.getNextDEPNumber();
        const { data, error } = await this.db.from('itsm_deployments').insert({
            tenant_id: tenantId, deployment_number: deploymentNumber, title: input.title,
            description: input.description, deployment_type: input.deploymentType || 'standard',
            environment: input.environment || 'production',
            release_id: input.releaseId || null, change_id: input.changeId || null,
            ci_id: input.ciId || null, planned_start: input.plannedStart,
            planned_end: input.plannedEnd, deployed_by: input.deployedBy,
            deployment_team: input.deploymentTeam, deployment_steps: input.deploymentSteps,
            validation_steps: input.validationSteps, rollback_steps: input.rollbackSteps,
            tags: input.tags || [],
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateDeployment(id: string, input: any) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            title: 'title', description: 'description', deploymentType: 'deployment_type',
            status: 'status', environment: 'environment',
            releaseId: 'release_id', changeId: 'change_id', ciId: 'ci_id',
            plannedStart: 'planned_start', plannedEnd: 'planned_end',
            actualStart: 'actual_start', actualEnd: 'actual_end',
            deployedBy: 'deployed_by', deploymentTeam: 'deployment_team',
            deploymentSteps: 'deployment_steps', validationSteps: 'validation_steps',
            rollbackSteps: 'rollback_steps', validationResult: 'validation_result',
            deploymentLog: 'deployment_log', issuesFound: 'issues_found', tags: 'tags',
        };
        for (const [k, c] of Object.entries(map)) { if (input[k] !== undefined) updates[c] = input[k]; }
        if (input.status === 'in_progress' && !updates.actual_start) updates.actual_start = new Date().toISOString();
        if ((input.status === 'completed' || input.status === 'failed') && !updates.actual_end) updates.actual_end = new Date().toISOString();
        const { data, error } = await this.db.from('itsm_deployments').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteDeployment(id: string): Promise<boolean> {
        const { error } = await this.db.from('itsm_deployments').delete().eq('id', id);
        if (error) throw error;
        return true;
    }
}
