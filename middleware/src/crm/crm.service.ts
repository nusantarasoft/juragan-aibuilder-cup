import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class CrmService {
    constructor(private supabaseService: SupabaseService) { }

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
        avatarUrl?: string; status?: string; customFields?: any;
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
        avatarUrl?: string; status?: string; customFields?: any;
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
            avatarUrl: 'avatar_url', status: 'status', customFields: 'custom_fields',
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
}
