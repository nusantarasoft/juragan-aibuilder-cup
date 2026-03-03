import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TenantsService {
    constructor(private supabaseService: SupabaseService) { }

    private get db() {
        return this.supabaseService.getAdminClient();
    }

    async findAll() {
        const { data, error } = await this.db.from('tenants').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async findById(id: string) {
        const { data, error } = await this.db.from('tenants').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async findBySlug(slug: string) {
        const { data, error } = await this.db.from('tenants').select('*').eq('slug', slug).single();
        if (error) throw error;
        return data;
    }

    async create(input: { name: string; slug: string; domain?: string; logoUrl?: string; subscriptionPlan?: string }) {
        const { data, error } = await this.db.from('tenants').insert({
            name: input.name,
            slug: input.slug,
            domain: input.domain || null,
            logo_url: input.logoUrl || null,
            subscription_plan: input.subscriptionPlan || 'free',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async update(id: string, input: {
        name?: string; slug?: string; domain?: string;
        logoUrl?: string; settings?: any; subscriptionPlan?: string; isActive?: boolean;
    }) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (input.name !== undefined) updates.name = input.name;
        if (input.slug !== undefined) updates.slug = input.slug;
        if (input.domain !== undefined) updates.domain = input.domain;
        if (input.logoUrl !== undefined) updates.logo_url = input.logoUrl;
        if (input.settings !== undefined) updates.settings = input.settings;
        if (input.subscriptionPlan !== undefined) updates.subscription_plan = input.subscriptionPlan;
        if (input.isActive !== undefined) updates.is_active = input.isActive;

        const { data, error } = await this.db.from('tenants').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.db.from('tenants').delete().eq('id', id);
        if (error) throw error;
        return true;
    }
}
