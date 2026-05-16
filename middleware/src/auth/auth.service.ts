import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
    constructor(private supabaseService: SupabaseService) { }

    private async resolveAppRole(userId: string, fallback?: string): Promise<string> {
        const { data } = await this.supabaseService
            .getAdminClient()
            .from('user_profiles')
            .select('role')
            .eq('id', userId)
            .maybeSingle();
        return data?.role || fallback || 'viewer';
    }

    async signIn(email: string, password: string) {
        const { data, error } = await this.supabaseService
            .getClient()
            .auth.signInWithPassword({ email, password });

        if (error) {
            throw new Error(error.message);
        }

        const user = data.user;
        const appRole = user ? await this.resolveAppRole(user.id, user.role) : undefined;

        return {
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
            user: user ? { ...user, role: appRole } : undefined,
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

        const appRole = await this.resolveAppRole(data.user.id, data.user.role);
        return { ...data.user, role: appRole };
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
