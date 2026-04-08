import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { VertexAiService } from '../ai/vertex-ai.service';

@Injectable()
export class CrmService {
    private readonly logger = new Logger(CrmService.name);

    constructor(
        private supabaseService: SupabaseService,
        private vertexAi: VertexAiService,
    ) { }

    private get db() {
        return this.supabaseService.getAdminClient();
    }

    // ─── INDIVIDUALS ────────────────────────────────────────

    async getIndividuals(tenantId: string, filters?: {
        status?: string; leadStatus?: string; search?: string;
    }) {
        let query = this.db.from('individuals').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.leadStatus) query = query.eq('lead_status', filters.leadStatus);
        if (filters?.search) query = query.or(
            `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
        const { data, error } = await query.order('last_name').order('first_name');
        if (error) throw error;
        return data;
    }

    async getIndividual(id: string) {
        const { data, error } = await this.db.from('individuals').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createIndividual(tenantId: string, input: {
        firstName: string; lastName: string; salutation?: string;
        middleName?: string; suffix?: string; nickname?: string;
        dateOfBirth?: string; gender?: string; nationality?: string;
        preferredLanguage?: string; jobTitle?: string; department?: string;
        linkedinUrl?: string; twitterHandle?: string; website?: string;
        individualType?: string; source?: string; tags?: any;
        avatarUrl?: string; email?: string; phone?: string;
        status?: string; customFields?: any;
        leadStatus?: string; leadSource?: string; company?: string;
        ownerId?: string;
    }) {
        const { data, error } = await this.db.from('individuals').insert({
            tenant_id: tenantId,
            first_name: input.firstName,
            last_name: input.lastName,
            salutation: input.salutation || null,
            middle_name: input.middleName || null,
            suffix: input.suffix || null,
            nickname: input.nickname || null,
            date_of_birth: input.dateOfBirth || null,
            gender: input.gender || null,
            nationality: input.nationality || null,
            preferred_language: input.preferredLanguage || 'en',
            job_title: input.jobTitle || null,
            department: input.department || null,
            linkedin_url: input.linkedinUrl || null,
            twitter_handle: input.twitterHandle || null,
            website: input.website || null,
            individual_type: input.individualType || 'person',
            source: input.source || null,
            tags: input.tags || [],
            avatar_url: input.avatarUrl || null,
            email: input.email || null,
            phone: input.phone || null,
            status: input.status || 'active',
            custom_fields: input.customFields || {},
            lead_status: input.leadStatus || null,
            lead_source: input.leadSource || null,
            company: input.company || null,
            owner_id: input.ownerId || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateIndividual(id: string, input: {
        firstName?: string; lastName?: string; salutation?: string;
        middleName?: string; suffix?: string; nickname?: string;
        dateOfBirth?: string; gender?: string; nationality?: string;
        preferredLanguage?: string; jobTitle?: string; department?: string;
        linkedinUrl?: string; twitterHandle?: string; website?: string;
        individualType?: string; source?: string; tags?: any;
        avatarUrl?: string; email?: string; phone?: string;
        status?: string; customFields?: any;
        leadStatus?: string; leadSource?: string; company?: string;
        ownerId?: string;
    }) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            firstName: 'first_name', lastName: 'last_name', salutation: 'salutation',
            middleName: 'middle_name', suffix: 'suffix', nickname: 'nickname',
            dateOfBirth: 'date_of_birth', gender: 'gender', nationality: 'nationality',
            preferredLanguage: 'preferred_language', jobTitle: 'job_title',
            department: 'department', linkedinUrl: 'linkedin_url',
            twitterHandle: 'twitter_handle', website: 'website',
            individualType: 'individual_type', source: 'source', tags: 'tags',
            avatarUrl: 'avatar_url', email: 'email', phone: 'phone',
            status: 'status', customFields: 'custom_fields',
            leadStatus: 'lead_status', leadSource: 'lead_source', company: 'company',
            ownerId: 'owner_id',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if ((input as any)[key] !== undefined) updates[col] = (input as any)[key];
        }
        const { data, error } = await this.db.from('individuals').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteIndividual(id: string): Promise<boolean> {
        const { error } = await this.db.from('individuals').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── ACCOUNTS ────────────────────────────────────────────

    async getAccounts(tenantId: string, filters?: {
        type?: string; status?: string; search?: string;
    }) {
        let query = this.db.from('accounts').select('*').eq('tenant_id', tenantId);
        if (filters?.type) query = query.eq('type', filters.type);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.ilike('name', `%${filters.search}%`);
        const { data, error } = await query.order('name');
        if (error) throw error;
        return data;
    }

    async getAccount(id: string) {
        const { data, error } = await this.db.from('accounts').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createAccount(tenantId: string, input: {
        name: string; accountNumber?: string; type?: string; industry?: string;
        website?: string; phone?: string; fax?: string; email?: string;
        billingAddress?: any; shippingAddress?: any;
        annualRevenue?: number; employeeCount?: number;
        sicCode?: string; tickerSymbol?: string; ownership?: string;
        parentAccountId?: string; description?: string;
        tags?: any; customFields?: any; ownerId?: string;
        status?: string; rating?: string;
    }) {
        const { data, error } = await this.db.from('accounts').insert({
            tenant_id: tenantId,
            name: input.name,
            account_number: input.accountNumber || null,
            type: input.type || 'prospect',
            industry: input.industry || null,
            website: input.website || null,
            phone: input.phone || null,
            fax: input.fax || null,
            email: input.email || null,
            billing_address: input.billingAddress || {},
            shipping_address: input.shippingAddress || {},
            annual_revenue: input.annualRevenue || null,
            employee_count: input.employeeCount || null,
            sic_code: input.sicCode || null,
            ticker_symbol: input.tickerSymbol || null,
            ownership: input.ownership || null,
            parent_account_id: input.parentAccountId || null,
            description: input.description || null,
            tags: input.tags || [],
            custom_fields: input.customFields || {},
            owner_id: input.ownerId || null,
            status: input.status || 'active',
            rating: input.rating || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateAccount(id: string, input: {
        name?: string; accountNumber?: string; type?: string; industry?: string;
        website?: string; phone?: string; fax?: string; email?: string;
        billingAddress?: any; shippingAddress?: any;
        annualRevenue?: number; employeeCount?: number;
        sicCode?: string; tickerSymbol?: string; ownership?: string;
        parentAccountId?: string; description?: string;
        tags?: any; customFields?: any; ownerId?: string;
        status?: string; rating?: string;
    }) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            name: 'name', accountNumber: 'account_number', type: 'type',
            industry: 'industry', website: 'website', phone: 'phone',
            fax: 'fax', email: 'email', billingAddress: 'billing_address',
            shippingAddress: 'shipping_address', annualRevenue: 'annual_revenue',
            employeeCount: 'employee_count', sicCode: 'sic_code',
            tickerSymbol: 'ticker_symbol', ownership: 'ownership',
            parentAccountId: 'parent_account_id', description: 'description',
            tags: 'tags', customFields: 'custom_fields', ownerId: 'owner_id',
            status: 'status', rating: 'rating',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if ((input as any)[key] !== undefined) updates[col] = (input as any)[key];
        }
        const { data, error } = await this.db.from('accounts').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteAccount(id: string): Promise<boolean> {
        const { error } = await this.db.from('accounts').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── CONTACTS ────────────────────────────────────────────

    async getContacts(tenantId: string, filters?: {
        accountId?: string; status?: string; search?: string;
    }) {
        let query = this.db.from('contacts')
            .select('*, individuals(first_name, last_name, avatar_url, email), accounts(name)')
            .eq('tenant_id', tenantId);
        if (filters?.accountId) query = query.eq('account_id', filters.accountId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.or(
            `email.ilike.%${filters.search}%,title.ilike.%${filters.search}%`
        );
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getContact(id: string) {
        const { data, error } = await this.db.from('contacts')
            .select('*, individuals(first_name, last_name, avatar_url, email), accounts(name)')
            .eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async getContactsByIndividual(individualId: string) {
        const { data, error } = await this.db.from('contacts')
            .select('*, accounts(name)')
            .eq('individual_id', individualId)
            .order('is_primary', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getContactsByAccount(accountId: string) {
        const { data, error } = await this.db.from('contacts')
            .select('*, individuals(first_name, last_name, avatar_url, email)')
            .eq('account_id', accountId)
            .order('is_primary', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createContact(tenantId: string, input: {
        individualId: string; accountId?: string;
        title?: string; department?: string; role?: string;
        email?: string; phone?: string; mobilePhone?: string;
        mailingAddress?: any; otherAddress?: any;
        isPrimary?: boolean; doNotCall?: boolean; doNotEmail?: boolean;
        description?: string; tags?: any; customFields?: any;
        ownerId?: string; status?: string;
    }) {
        const { data, error } = await this.db.from('contacts').insert({
            tenant_id: tenantId,
            individual_id: input.individualId,
            account_id: input.accountId || null,
            title: input.title || null,
            department: input.department || null,
            role: input.role || null,
            email: input.email || null,
            phone: input.phone || null,
            mobile_phone: input.mobilePhone || null,
            mailing_address: input.mailingAddress || {},
            other_address: input.otherAddress || {},
            is_primary: input.isPrimary ?? false,
            do_not_call: input.doNotCall ?? false,
            do_not_email: input.doNotEmail ?? false,
            description: input.description || null,
            tags: input.tags || [],
            custom_fields: input.customFields || {},
            owner_id: input.ownerId || null,
            status: input.status || 'active',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateContact(id: string, input: {
        accountId?: string; title?: string; department?: string; role?: string;
        email?: string; phone?: string; mobilePhone?: string;
        mailingAddress?: any; otherAddress?: any;
        isPrimary?: boolean; doNotCall?: boolean; doNotEmail?: boolean;
        description?: string; tags?: any; customFields?: any;
        ownerId?: string; status?: string;
    }) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            accountId: 'account_id', title: 'title', department: 'department',
            role: 'role', email: 'email', phone: 'phone',
            mobilePhone: 'mobile_phone', mailingAddress: 'mailing_address',
            otherAddress: 'other_address', isPrimary: 'is_primary',
            doNotCall: 'do_not_call', doNotEmail: 'do_not_email',
            description: 'description', tags: 'tags', customFields: 'custom_fields',
            ownerId: 'owner_id', status: 'status',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if ((input as any)[key] !== undefined) updates[col] = (input as any)[key];
        }
        const { data, error } = await this.db.from('contacts').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteContact(id: string): Promise<boolean> {
        const { error } = await this.db.from('contacts').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── ACTIVITIES ──────────────────────────────────────────

    async getActivities(tenantId: string, filters?: {
        relatedToType?: string; relatedToId?: string;
        activityType?: string; status?: string; search?: string;
    }) {
        let query = this.db.from('crm_activities').select('*').eq('tenant_id', tenantId);
        if (filters?.relatedToType) query = query.eq('related_to_type', filters.relatedToType);
        if (filters?.relatedToId) query = query.eq('related_to_id', filters.relatedToId);
        if (filters?.activityType) query = query.eq('activity_type', filters.activityType);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.ilike('subject', `%${filters.search}%`);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getActivity(id: string) {
        const { data, error } = await this.db.from('crm_activities').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createActivity(tenantId: string, input: {
        activityType: string; subject: string; description?: string;
        relatedToType: string; relatedToId: string;
        dueDate?: string; startTime?: string; endTime?: string;
        priority?: string; status?: string; outcome?: string;
        ownerId?: string; assignedTo?: string;
        tags?: any; customFields?: any;
    }) {
        const { data, error } = await this.db.from('crm_activities').insert({
            tenant_id: tenantId,
            activity_type: input.activityType,
            subject: input.subject,
            description: input.description || null,
            related_to_type: input.relatedToType,
            related_to_id: input.relatedToId,
            due_date: input.dueDate || null,
            start_time: input.startTime || null,
            end_time: input.endTime || null,
            priority: input.priority || 'normal',
            status: input.status || 'open',
            outcome: input.outcome || null,
            owner_id: input.ownerId || null,
            assigned_to: input.assignedTo || null,
            tags: input.tags || [],
            custom_fields: input.customFields || {},
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateActivity(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            activityType: 'activity_type', subject: 'subject', description: 'description',
            relatedToType: 'related_to_type', relatedToId: 'related_to_id',
            dueDate: 'due_date', startTime: 'start_time', endTime: 'end_time',
            completedAt: 'completed_at', isCompleted: 'is_completed',
            priority: 'priority', status: 'status', outcome: 'outcome',
            ownerId: 'owner_id', assignedTo: 'assigned_to',
            tags: 'tags', customFields: 'custom_fields',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('crm_activities').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async completeActivity(id: string) {
        const { data, error } = await this.db.from('crm_activities').update({
            is_completed: true, completed_at: new Date().toISOString(),
            status: 'completed', updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteActivity(id: string): Promise<boolean> {
        const { error } = await this.db.from('crm_activities').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── NOTES ───────────────────────────────────────────────

    async getNotes(tenantId: string, filters?: {
        relatedToType?: string; relatedToId?: string;
    }) {
        let query = this.db.from('crm_notes').select('*').eq('tenant_id', tenantId);
        if (filters?.relatedToType) query = query.eq('related_to_type', filters.relatedToType);
        if (filters?.relatedToId) query = query.eq('related_to_id', filters.relatedToId);
        const { data, error } = await query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createNote(tenantId: string, input: {
        body: string; title?: string;
        relatedToType: string; relatedToId: string;
        isPinned?: boolean; ownerId?: string;
    }) {
        const { data, error } = await this.db.from('crm_notes').insert({
            tenant_id: tenantId,
            body: input.body,
            title: input.title || null,
            related_to_type: input.relatedToType,
            related_to_id: input.relatedToId,
            is_pinned: input.isPinned ?? false,
            owner_id: input.ownerId || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateNote(id: string, input: { body?: string; title?: string; isPinned?: boolean }) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (input.body !== undefined) updates.body = input.body;
        if (input.title !== undefined) updates.title = input.title;
        if (input.isPinned !== undefined) updates.is_pinned = input.isPinned;
        const { data, error } = await this.db.from('crm_notes').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteNote(id: string): Promise<boolean> {
        const { error } = await this.db.from('crm_notes').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── DEALS ───────────────────────────────────────────────

    async getDeals(tenantId: string, filters?: {
        stage?: string; status?: string; accountId?: string; search?: string;
    }) {
        let query = this.db.from('deals')
            .select('*, accounts(name), contacts(individual_id, individuals(first_name, last_name))')
            .eq('tenant_id', tenantId);
        if (filters?.stage) query = query.eq('stage', filters.stage);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.accountId) query = query.eq('account_id', filters.accountId);
        if (filters?.search) query = query.ilike('name', `%${filters.search}%`);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getDeal(id: string) {
        const { data, error } = await this.db.from('deals')
            .select('*, accounts(name), contacts(individual_id, individuals(first_name, last_name))')
            .eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createDeal(tenantId: string, input: {
        name: string; description?: string; amount?: number; currency?: string;
        stage?: string; probability?: number; closeDate?: string;
        accountId?: string; contactId?: string;
        type?: string; leadSource?: string; nextStep?: string;
        ownerId?: string; tags?: any; customFields?: any;
    }) {
        const { data, error } = await this.db.from('deals').insert({
            tenant_id: tenantId,
            name: input.name,
            description: input.description || null,
            amount: input.amount || null,
            currency: input.currency || 'USD',
            stage: input.stage || 'prospecting',
            probability: input.probability ?? 10,
            close_date: input.closeDate || null,
            account_id: input.accountId || null,
            contact_id: input.contactId || null,
            type: input.type || null,
            lead_source: input.leadSource || null,
            next_step: input.nextStep || null,
            owner_id: input.ownerId || null,
            tags: input.tags || [],
            custom_fields: input.customFields || {},
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateDeal(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            name: 'name', description: 'description', amount: 'amount',
            currency: 'currency', stage: 'stage', probability: 'probability',
            closeDate: 'close_date', accountId: 'account_id', contactId: 'contact_id',
            type: 'type', leadSource: 'lead_source', nextStep: 'next_step',
            lossReason: 'loss_reason', ownerId: 'owner_id', status: 'status',
            tags: 'tags', customFields: 'custom_fields',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('deals').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteDeal(id: string): Promise<boolean> {
        const { error } = await this.db.from('deals').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async generateDealNextBestAction(dealId: string) {
        const { data: deal, error } = await this.db.from('deals')
            .select('*, accounts(name), contacts(individual_id, individuals(first_name, last_name))')
            .eq('id', dealId).single();
        if (error || !deal) throw new Error("Deal not found");

        const prompt = `
            You are an expert sales AI assistant. Analyze the following deal and recommend the "Next Best Action" for the sales rep to take to move this deal forward.
            Keep it strictly actionable, highly specific, and professional. 
            Limit your response to a 2-3 sentence summary.
            Do not use conversational filler.

            Deal Name: ${deal.name}
            Stage: ${deal.stage}
            Amount: ${deal.amount || 'Unknown'} (Probability: ${deal.probability || 0}%)
            Account: ${deal.accounts?.name || 'Unknown'}
            Contact: ${deal.contacts?.individuals?.first_name || ''} ${deal.contacts?.individuals?.last_name || ''}
            Description: ${deal.description || 'None'}
            Next Step (Current): ${deal.next_step || 'None'}
        `;

        try {
            return await this.vertexAi.generateText(prompt);
        } catch (e) {
            this.logger.error("Failed to generate deal action via Vertex AI", e);
            return "Reach out to the primary contact to confirm the next steps and align on their timeline.";
        }
    }

    // ─── LEAD CONVERSION ─────────────────────────────────────

    async convertLead(tenantId: string, input: {
        individualId: string;
        accountName?: string; accountId?: string;
        contactTitle?: string; contactRole?: string;
        createDeal?: boolean; dealName?: string; dealAmount?: number;
        dealStage?: string; dealCloseDate?: string;
    }) {
        // 1) Resolve or create Account
        let accountId = input.accountId;
        if (!accountId && input.accountName) {
            const { data, error } = await this.db.from('accounts').insert({
                tenant_id: tenantId,
                name: input.accountName,
                type: 'prospect',
                status: 'active',
            }).select('id').single();
            if (error) throw error;
            accountId = data.id;
        }

        // 2) Create Contact
        const { data: contact, error: contactErr } = await this.db.from('contacts').insert({
            tenant_id: tenantId,
            individual_id: input.individualId,
            account_id: accountId || null,
            title: input.contactTitle || null,
            role: input.contactRole || null,
            is_primary: true,
            status: 'active',
        }).select('id').single();
        if (contactErr) throw contactErr;

        // 3) Optionally create Deal
        let dealId: string | null = null;
        if (input.createDeal && input.dealName) {
            const { data: deal, error: dealErr } = await this.db.from('deals').insert({
                tenant_id: tenantId,
                name: input.dealName,
                amount: input.dealAmount || null,
                stage: input.dealStage || 'prospecting',
                probability: 10,
                close_date: input.dealCloseDate || null,
                account_id: accountId || null,
                contact_id: contact.id,
                status: 'open',
            }).select('id').single();
            if (dealErr) throw dealErr;
            dealId = deal.id;
        }

        // 4) Mark individual as converted
        await this.db.from('individuals').update({
            lead_status: 'converted',
            updated_at: new Date().toISOString(),
        }).eq('id', input.individualId);

        return { accountId, contactId: contact.id, dealId };
    }

    // ─── CAMPAIGNS ───────────────────────────────────────────

    async getCampaigns(tenantId: string, filters?: { status?: string; search?: string }) {
        let query = this.db.from('campaigns').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.ilike('name', `%${filters.search}%`);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createCampaign(tenantId: string, input: {
        name: string; type?: string; status?: string;
        startDate?: string; endDate?: string;
        budget?: number; actualCost?: number; expectedRevenue?: number;
        description?: string;
    }) {
        const { data, error } = await this.db.from('campaigns').insert({
            tenant_id: tenantId, name: input.name,
            type: input.type || null, status: input.status || 'planned',
            start_date: input.startDate || null, end_date: input.endDate || null,
            budget: input.budget || null, actual_cost: input.actualCost || null,
            expected_revenue: input.expectedRevenue || null,
            description: input.description || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateCampaign(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            name: 'name', type: 'type', status: 'status',
            startDate: 'start_date', endDate: 'end_date',
            budget: 'budget', actualCost: 'actual_cost',
            expectedRevenue: 'expected_revenue', description: 'description',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('campaigns').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteCampaign(id: string): Promise<boolean> {
        const { error } = await this.db.from('campaigns').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getCampaignMembers(campaignId: string) {
        const { data, error } = await this.db.from('campaign_members')
            .select('*, individuals(first_name, last_name, email)')
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async addCampaignMember(campaignId: string, individualId: string, status = 'sent') {
        const { data, error } = await this.db.from('campaign_members').insert({
            campaign_id: campaignId,
            individual_id: individualId,
            status: status || 'sent',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateCampaignMemberStatus(id: string, status: string) {
        const payload: any = { status };
        if (status === 'responded' || status === 'converted') {
            payload.responded_at = new Date().toISOString();
        }
        const { data, error } = await this.db.from('campaign_members')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async removeCampaignMember(id: string): Promise<boolean> {
        const { error } = await this.db.from('campaign_members').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── AI CAMPAIGN CONTENT GENERATION ──────────────────────

    async generateCampaignContent(campaignId: string): Promise<string> {
        // Fetch campaign details locally
        const { data: campaign, error } = await this.db.from('campaigns').select('*').eq('id', campaignId).single();
        if (error || !campaign) {
            throw new Error("Campaign not found");
        }

        const prompt = `
            You are an expert B2B Marketing Copywriter.
            Please generate high-converting marketing content for the following campaign:

            Campaign Name: ${campaign.name}
            Campaign Type: ${campaign.type || 'General Promotion'}
            Objective/Description: ${campaign.description || 'Drive engagement and conversions.'}

            Based on the type of campaign (${campaign.type}), please generate the appropriate draft:
            - If it's an "email", generate an engaging Subject Line and a concise, persuasive email body with a clear CTA.
            - If it's a "social", generate a catchy social media post with relevant hashtags.
            - If it's an "ad", generate a bold headline, primary text, and description.
            - For anything else, generate a generic but engaging announcement letter.

            Format the response perfectly in Markdown format. Keep the tone professional, persuasive, and concise. Do not include any conversational filler (e.g., "Here is your email draft:").
        `;

        try {
            const content = await this.vertexAi.generateText(prompt);
            return content;
        } catch (e) {
            this.logger.error("Failed to generate campaign content via Vertex AI", e);
            return "*AI Generation Failed*\n\nPlease write the content manually or check your Vertex AI configuration.";
        }
    }

    // ─── CASES ───────────────────────────────────────────────

    async getCases(tenantId: string, filters?: { status?: string; priority?: string; search?: string }) {
        let query = this.db.from('cases')
            .select('*, contacts(individual_id, individuals(first_name, last_name)), accounts(name)')
            .eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.priority) query = query.eq('priority', filters.priority);
        if (filters?.search) query = query.ilike('subject', `%${filters.search}%`);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createCase(tenantId: string, input: {
        subject: string; description?: string;
        status?: string; priority?: string; origin?: string; type?: string;
        contactId?: string; accountId?: string;
    }) {
        const { data, error } = await this.db.from('cases').insert({
            tenant_id: tenantId, subject: input.subject,
            description: input.description || null,
            status: input.status || 'new', priority: input.priority || 'medium',
            origin: input.origin || null, type: input.type || null,
            contact_id: input.contactId || null, account_id: input.accountId || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateCase(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            subject: 'subject', description: 'description',
            status: 'status', priority: 'priority', origin: 'origin',
            type: 'type', contactId: 'contact_id', accountId: 'account_id',
            resolution: 'resolution', closedAt: 'closed_at',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('cases').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async closeCase(id: string, resolution: string) {
        const { data, error } = await this.db.from('cases').update({
            status: 'closed', resolution, closed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteCase(id: string): Promise<boolean> {
        const { error } = await this.db.from('cases').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── PRODUCTS ────────────────────────────────────────────

    async getProducts(tenantId: string, filters?: { search?: string; category?: string; isActive?: boolean }) {
        let query = this.db.from('products').select('*').eq('tenant_id', tenantId);
        if (filters?.search) query = query.ilike('name', `%${filters.search}%`);
        if (filters?.category) query = query.eq('category', filters.category);
        if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);
        const { data, error } = await query.order('name');
        if (error) throw error;
        return data;
    }

    async createProduct(tenantId: string, input: {
        name: string; code?: string; description?: string;
        unitPrice: number; currency?: string; category?: string;
    }) {
        const { data, error } = await this.db.from('products').insert({
            tenant_id: tenantId, name: input.name,
            code: input.code || null, description: input.description || null,
            unit_price: input.unitPrice, currency: input.currency || 'USD',
            category: input.category || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateProduct(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            name: 'name', code: 'code', description: 'description',
            unitPrice: 'unit_price', currency: 'currency', category: 'category',
            isActive: 'is_active',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('products').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteProduct(id: string): Promise<boolean> {
        const { error } = await this.db.from('products').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── QUOTES ──────────────────────────────────────────────

    async getQuotes(tenantId: string, filters?: { status?: string; dealId?: string; search?: string }) {
        let query = this.db.from('quotes')
            .select('*, deals(name), accounts(name), contacts(individual_id, individuals(first_name, last_name))')
            .eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.dealId) query = query.eq('deal_id', filters.dealId);
        if (filters?.search) query = query.ilike('name', `%${filters.search}%`);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createQuote(tenantId: string, input: {
        name: string; dealId?: string; accountId?: string; contactId?: string;
        discountPercent?: number; taxPercent?: number;
        validUntil?: string; description?: string; terms?: string;
        items?: { productId?: string; productName: string; quantity: number; unitPrice: number; discountPercent?: number }[];
    }) {
        // Calculate totals
        const items = input.items || [];
        const subtotal = items.reduce((s, i) => {
            const lineTotal = i.quantity * i.unitPrice * (1 - (i.discountPercent || 0) / 100);
            return s + lineTotal;
        }, 0);
        const discounted = subtotal * (1 - (input.discountPercent || 0) / 100);
        const total = discounted * (1 + (input.taxPercent || 0) / 100);

        const { data: quote, error } = await this.db.from('quotes').insert({
            tenant_id: tenantId, name: input.name,
            deal_id: input.dealId || null, account_id: input.accountId || null,
            contact_id: input.contactId || null,
            subtotal, discount_percent: input.discountPercent || 0,
            tax_percent: input.taxPercent || 0, total,
            valid_until: input.validUntil || null,
            description: input.description || null, terms: input.terms || null,
        }).select().single();
        if (error) throw error;

        // Insert line items
        if (items.length > 0) {
            const lineItems = items.map((item, idx) => ({
                quote_id: quote.id,
                product_id: item.productId || null,
                product_name: item.productName,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                discount_percent: item.discountPercent || 0,
                total: item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100),
                sort_order: idx,
            }));
            await this.db.from('quote_items').insert(lineItems);
        }

        return quote;
    }

    async updateQuote(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            name: 'name', status: 'status', dealId: 'deal_id',
            accountId: 'account_id', contactId: 'contact_id',
            discountPercent: 'discount_percent', taxPercent: 'tax_percent',
            validUntil: 'valid_until', description: 'description', terms: 'terms',
            subtotal: 'subtotal', total: 'total',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('quotes').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async getQuoteItems(quoteId: string) {
        const { data, error } = await this.db.from('quote_items')
            .select('*').eq('quote_id', quoteId).order('sort_order');
        if (error) throw error;
        return data;
    }

    async deleteQuote(id: string): Promise<boolean> {
        const { error } = await this.db.from('quotes').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── DASHBOARD ───────────────────────────────────────────

    async getDashboardStats(tenantId: string) {
        const [individuals, accounts, contacts, deals, activities, cases, campaigns, quotes, products] = await Promise.all([
            this.db.from('individuals').select('id, lead_status, status', { count: 'exact' }).eq('tenant_id', tenantId),
            this.db.from('accounts').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
            this.db.from('contacts').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
            this.db.from('deals').select('id, stage, amount, status').eq('tenant_id', tenantId),
            this.db.from('crm_activities').select('id, status, is_completed', { count: 'exact' }).eq('tenant_id', tenantId),
            this.db.from('cases').select('id, status, priority', { count: 'exact' }).eq('tenant_id', tenantId),
            this.db.from('campaigns').select('id, status, budget, actual_cost', { count: 'exact' }).eq('tenant_id', tenantId),
            this.db.from('quotes').select('id, status, total', { count: 'exact' }).eq('tenant_id', tenantId),
            this.db.from('products').select('id, is_active', { count: 'exact' }).eq('tenant_id', tenantId),
        ]);

        const dealRows = deals.data || [];
        const openDeals = dealRows.filter((d: any) => d.status === 'open');
        const wonDeals = dealRows.filter((d: any) => d.stage === 'closed_won');
        const caseRows = cases.data || [];
        const campaignRows = campaigns.data || [];
        const quoteRows = quotes.data || [];

        return {
            totalIndividuals: individuals.count || 0,
            totalAccounts: accounts.count || 0,
            totalContacts: contacts.count || 0,
            totalDeals: dealRows.length,
            openDeals: openDeals.length,
            pipelineValue: openDeals.reduce((s: number, d: any) => s + (d.amount || 0), 0),
            wonValue: wonDeals.reduce((s: number, d: any) => s + (d.amount || 0), 0),
            totalActivities: activities.count || 0,
            openActivities: (activities.data || []).filter((a: any) => !a.is_completed).length,
            totalCases: caseRows.length,
            openCases: caseRows.filter((c: any) => c.status !== 'closed').length,
            criticalCases: caseRows.filter((c: any) => c.priority === 'critical' && c.status !== 'closed').length,
            totalCampaigns: campaignRows.length,
            activeCampaigns: campaignRows.filter((c: any) => c.status === 'active').length,
            campaignBudget: campaignRows.reduce((s: number, c: any) => s + (c.budget || 0), 0),
            totalQuotes: quoteRows.length,
            quotesValue: quoteRows.reduce((s: number, q: any) => s + (q.total || 0), 0),
            acceptedQuotes: quoteRows.filter((q: any) => q.status === 'accepted').length,
            totalProducts: products.count || 0,
            activeProducts: (products.data || []).filter((p: any) => p.is_active).length,
        };
    }

    // ─── AI / INTELLIGENCE ───────────────────────────────────

    async scoreLeads(tenantId: string) {
        const { data: individuals } = await this.db.from('individuals')
            .select('*, contacts(id), crm_activities(id, is_completed)')
            .eq('tenant_id', tenantId);

        if (!individuals || individuals.length === 0) return [];

        // In a real production app, we might batch these or score incrementally.
        // For this feature expansion, we'll score them concurrently.
        const scoredLeads = await Promise.all(individuals.map(async (ind: any) => {
            try {
                const activityCount = ind.crm_activities?.length || 0;
                const completedCount = ind.crm_activities?.filter((a: any) => a.is_completed).length || 0;
                const hasContact = ind.contacts && ind.contacts.length > 0;

                const prompt = `
You are an expert CRM AI. Analyze this lead and provide a Lead Score (0-100), a Grade (A, B, C, D, F), and 3-5 brief reasoning factors.
Be realistic. Good signals: lots of activities, high completion rate, good job title, has contact record, converted status.

Lead info:
- Name: ${ind.first_name} ${ind.last_name}
- Job Title: ${ind.job_title || 'N/A'}
- Company: ${ind.company || 'N/A'}
- Status: ${ind.lead_status || 'New'}
- Source: ${ind.source || 'N/A'}
- Total Activities: ${activityCount} (${completedCount} completed)
- Has Contact Record: ${hasContact}

Respond strictly with a JSON object in this exact format:
{
  "score": 85,
  "grade": "A",
  "factors": ["+20 Highly engaged", "+10 Has company info", "-5 No phone number"]
}
                `;

                const aiResult = await this.vertexAi.generateStructuredJSON(prompt);

                return {
                    individualId: ind.id,
                    firstName: ind.first_name,
                    lastName: ind.last_name,
                    email: ind.email,
                    company: ind.company,
                    leadStatus: ind.lead_status,
                    score: aiResult.score || 0,
                    grade: aiResult.grade || 'C',
                    factors: aiResult.factors || ['AI Score Generation Complete'],
                };
            } catch (err) {
                this.logger.error(`Failed to score lead ${ind.id}:`, err);
                return {
                    individualId: ind.id, firstName: ind.first_name, lastName: ind.last_name,
                    email: ind.email, company: ind.company, leadStatus: ind.lead_status,
                    score: 0, grade: 'F', factors: ['Error generating AI score']
                };
            }
        }));

        return scoredLeads.sort((a, b) => b.score - a.score);
    }

    async getDealInsights(tenantId: string) {
        const { data: deals } = await this.db.from('deals')
            .select('*, accounts(name), contacts(individual_id, individuals(first_name, last_name))')
            .eq('tenant_id', tenantId).eq('status', 'open');

        if (!deals || deals.length === 0) return [];

        const insights = await Promise.all(deals.map(async (deal: any) => {
            try {
                const daysSinceCreation = Math.floor((Date.now() - new Date(deal.created_at).getTime()) / 86400000);
                let daysToClose = 'N/A';
                if (deal.close_date) {
                    daysToClose = Math.floor((new Date(deal.close_date).getTime() - Date.now()) / 86400000).toString();
                }

                const contactName = deal.contacts?.individuals
                    ? `${deal.contacts.individuals.first_name} ${deal.contacts.individuals.last_name}` : 'Unknown';

                const prompt = `
You are an expert Sales AI. Analyze this ongoing deal and provide a risk assessment, insights, and a recommendation.
Consider the age of the deal, the probability vs stage, and the close date.

Deal info:
- Name: ${deal.name}
- Account: ${deal.accounts?.name || 'N/A'}
- Stage: ${deal.stage}
- Amount: $${deal.amount || 0}
- Probability: ${deal.probability || 0}%
- Days Open: ${daysSinceCreation}
- Days until Close Date: ${daysToClose}

Respond strictly with a JSON object in this exact format:
{
  "riskLevel": "high", // must be "low", "medium", or "high"
  "insights": ["⚠️ Stalled in proposal stage", "💰 High value opportunity"],
  "recommendation": "Schedule an executive alignment call to push past the proposal stage."
}
                `;

                const aiResult = await this.vertexAi.generateStructuredJSON(prompt);

                return {
                    dealId: deal.id,
                    dealName: deal.name,
                    stage: deal.stage,
                    amount: deal.amount,
                    probability: deal.probability,
                    accountName: deal.accounts?.name,
                    contactName,
                    closeDate: deal.close_date,
                    daysSinceCreation,
                    riskLevel: ['low', 'medium', 'high'].includes(aiResult.riskLevel) ? aiResult.riskLevel : 'medium',
                    insights: aiResult.insights || [],
                    recommendation: aiResult.recommendation || 'Review deal status.',
                };

            } catch (err) {
                this.logger.error(`Failed to generate insights for deal ${deal.id}:`, err);
                return {
                    dealId: deal.id, dealName: deal.name, stage: deal.stage,
                    amount: deal.amount, probability: deal.probability,
                    accountName: deal.accounts?.name, contactName: 'Unknown',
                    closeDate: deal.close_date, daysSinceCreation: 0,
                    riskLevel: 'high', insights: ['Error generating AI insights'], recommendation: 'Manual review required.'
                };
            }
        }));

        return insights;
    }
}
