import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
    private supabase: SupabaseClient;
    private supabaseAdmin: SupabaseClient;

    constructor(private configService: ConfigService) {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || 'http://kong:8000';
        const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY') || '';
        const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_KEY') || '';

        // Client for authenticated requests (uses anon key, respects RLS)
        this.supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Admin client for privileged operations (bypasses RLS)
        this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }

    /**
     * Get the standard Supabase client (respects RLS)
     */
    getClient(): SupabaseClient {
        return this.supabase;
    }

    /**
     * Get the admin Supabase client (bypasses RLS)
     */
    getAdminClient(): SupabaseClient {
        return this.supabaseAdmin;
    }

    /**
     * Get a client with a specific user's JWT (for impersonation)
     */
    getClientWithToken(accessToken: string): SupabaseClient {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || 'http://kong:8000';
        const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY') || '';

        return createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
        });
    }
}
