import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
    constructor(private supabaseService: SupabaseService) { }

    async signIn(email: string, password: string) {
        const { data, error } = await this.supabaseService
            .getClient()
            .auth.signInWithPassword({ email, password });

        if (error) {
            throw new Error(error.message);
        }

        return {
            accessToken: data.session?.access_token,
            refreshToken: data.session?.refresh_token,
            user: data.user,
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

        return data.user;
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
