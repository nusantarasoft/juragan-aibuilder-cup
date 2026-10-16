import { ForbiddenException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { hasMinRole, normalizeAppRole } from '../auth/app-roles';
import { AOS_DEFAULT_TENANT } from '../agentic-os/agentic-os.types';

export type SessionTenantUser = {
    id: string;
    email?: string;
    role?: string;
    tenantId?: string | null;
    studioSlug?: string | null;
};

@Injectable()
export class TenantMembershipService {
    constructor(private readonly supabase: SupabaseService) {}

    private admin() {
        return this.supabase.getAdminClient();
    }

    async loadMembership(userId: string): Promise<{ tenantId: string | null; studioSlug: string | null }> {
        const { data: membership } = await this.admin()
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

        const tenantId = (membership?.tenant_id as string | undefined) ?? null;
        if (!tenantId) {
            return { tenantId: null, studioSlug: null };
        }

        const { data: store } = await this.admin()
            .from('tenant_stores')
            .select('studio_slug')
            .eq('tenant_id', tenantId)
            .maybeSingle();

        return { tenantId, studioSlug: (store?.studio_slug as string | undefined) ?? null };
    }

    async resolveTenantForUser(
        user: SessionTenantUser,
        requestedTenantId?: string | null,
    ): Promise<string> {
        const role = normalizeAppRole(user.role);
        const requested = requestedTenantId?.trim() || null;

        if (hasMinRole(role, 'super_admin')) {
            return requested && requested !== 'default' ? requested : AOS_DEFAULT_TENANT;
        }

        if (role === 'tenant_owner') {
            const home = user.tenantId?.trim();
            if (!home) {
                throw new ForbiddenException('Tenant membership required');
            }
            if (requested && requested !== home && requested !== 'default') {
                throw new ForbiddenException('You do not have access to this tenant');
            }
            return home;
        }

        // Platform CMS admin — v1 home tenant
        if (!requested || requested === 'default') {
            return AOS_DEFAULT_TENANT;
        }
        if (requested === AOS_DEFAULT_TENANT) {
            return AOS_DEFAULT_TENANT;
        }
        throw new ForbiddenException('You do not have access to this tenant');
    }

    async assertTenantAccess(user: SessionTenantUser, requestedTenantId: string): Promise<string> {
        return this.resolveTenantForUser(user, requestedTenantId);
    }

    async tenantIdForStore(storeId: string): Promise<string | null> {
        const { data } = await this.admin()
            .from('tenant_stores')
            .select('tenant_id')
            .eq('id', storeId)
            .maybeSingle();
        return (data?.tenant_id as string | undefined) ?? null;
    }

    async storeForTenant(tenantId: string) {
        const { data } = await this.admin()
            .from('tenant_stores')
            .select('id, display_name, studio_slug, tenant_id')
            .eq('tenant_id', tenantId)
            .maybeSingle();
        return data as
            | { id: string; display_name: string; studio_slug: string; tenant_id: string }
            | null;
    }
}
