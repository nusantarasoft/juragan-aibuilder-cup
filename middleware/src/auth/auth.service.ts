import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
    DEFAULT_APP_ROLE,
    normalizeAppRole,
    normalizeUserStatus,
    type UserStatus,
} from './app-roles';

export type AuthProfile = {
    role: string;
    status: UserStatus;
};

/* v8 ignore start */
@Injectable()
export class AuthService {
/* v8 ignore stop */
    constructor(private supabaseService: SupabaseService) { }

    async resolveProfile(userId: string, fallbackRole?: string): Promise<AuthProfile> {
        const { data } = await this.supabaseService
            .getAdminClient()
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        const roleSource = data && data.role ? data.role : (fallbackRole || DEFAULT_APP_ROLE);
        return {
            role: normalizeAppRole(roleSource),
            status: normalizeUserStatus(data ? data.status : null),
        };
    }

    private async loadTenantContext(userId: string): Promise<{
        tenantId: string | null;
        studioSlug: string | null;
    }> {
        const admin = this.supabaseService.getAdminClient();
        const { data: membership } = await admin
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
        const tenantId = (membership?.tenant_id as string | undefined) ?? null;
        if (!tenantId) return { tenantId: null, studioSlug: null };
        const { data: store } = await admin
            .from('tenant_stores')
            .select('studio_slug')
            .eq('tenant_id', tenantId)
            .maybeSingle();
        return { tenantId, studioSlug: (store?.studio_slug as string | undefined) ?? null };
    }

    private assertEmailVerified(user: { email_confirmed_at?: string | null; role?: string }, profileRole: string) {
        if (profileRole === 'tenant_owner' && !user.email_confirmed_at) {
            throw new UnauthorizedException('Email verification required before sign in');
        }
    }

    private assertActive(profile: AuthProfile): void {
        if (profile.status === 'inactive') {
            throw new UnauthorizedException('Account is deactivated');
        }
    }

    async signIn(email: string, password: string) {
        const { data, error } = await this.supabaseService
            .getClient()
            .auth.signInWithPassword({ email, password });

        if (error) {
            throw new Error(error.message);
        }

        const user = data.user;
        if (!user) {
            throw new Error('Invalid login credentials');
        }

        const profile = await this.resolveProfile(user.id, user.role);
        this.assertActive(profile);
        this.assertEmailVerified(user, profile.role);
        const tenantCtx = await this.loadTenantContext(user.id);

        return {
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
            user: {
                ...user,
                role: profile.role,
                tenantId: tenantCtx.tenantId,
                studioSlug: tenantCtx.studioSlug,
                emailVerified: Boolean(user.email_confirmed_at),
            },
        };
    }

    async signUp(email: string, password: string, metadata?: Record<string, any>) {
        const { data, error } = await this.supabaseService
            .getClient()
            .auth.signUp({
                email,
                password,
                options: { data: metadata },
            });

        if (error) {
            throw new Error(error.message);
        }

        return {
            user: data.user,
            session: data.session,
        };
    }

    async signOut(accessToken: string) {
        const client = this.supabaseService.getClientWithToken(accessToken);
        const { error } = await client.auth.signOut();

        if (error) {
            throw new Error(error.message);
        }

        return true;
    }

    async getUser(accessToken: string) {
        const client = this.supabaseService.getClientWithToken(accessToken);
        const { data, error } = await client.auth.getUser();

        if (error) {
            throw new Error(error.message);
        }

        const profile = await this.resolveProfile(data.user.id, data.user.role);
        this.assertActive(profile);
        const tenantCtx = await this.loadTenantContext(data.user.id);
        return {
            ...data.user,
            role: profile.role,
            tenantId: tenantCtx.tenantId,
            studioSlug: tenantCtx.studioSlug,
            emailVerified: Boolean(data.user.email_confirmed_at),
        };
    }

    async refreshSession(refreshToken: string) {
        const { data, error } = await this.supabaseService
            .getClient()
            .auth.refreshSession({ refresh_token: refreshToken });

        if (error) {
            throw new Error(error.message);
        }

        return {
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
        };
    }
}
