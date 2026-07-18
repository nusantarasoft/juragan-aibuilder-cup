/**
 * Supabase client singleton for the Admin frontend.
 * Uses the self-hosted Supabase instance via Kong API gateway.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc1MjE1MjE4LCJleHAiOjIxNDU5MTY4MDB9.6q7QrCyLzEJ-m2Mw8Y29BNR_tF3fKAfbXhdcc4HKxhE';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
    if (!client) {
        client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            realtime: {
                params: {
                    eventsPerSecond: 10,
                },
            },
        });
    }
    return client;
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };
