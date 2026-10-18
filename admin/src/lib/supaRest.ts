/**
 * Direct Supabase REST client for ITSM ITIL v4 modules.
 * Uses PostgREST endpoint rather than GraphQL for these newer tables.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function supaRest<T = any[]>(
    table: string,
    options?: {
        select?: string;
        filters?: Record<string, string>;
        order?: string;
        limit?: number;
    }
): Promise<T> {
    const params = new URLSearchParams();
    params.set('select', options?.select || '*');
    if (options?.order) params.set('order', options.order);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.filters) {
        for (const [col, val] of Object.entries(options.filters)) {
            if (val) params.set(col, val);
        }
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || res.statusText);
    }
    return res.json() as Promise<T>;
}

export async function supaInsert<T = any>(table: string, body: Record<string, any>): Promise<T> {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || err.details || res.statusText);
    }
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
}

export async function supaUpdate<T = any>(table: string, id: string, body: Record<string, any>): Promise<T> {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || res.statusText);
    }
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
}

export async function supaDelete(table: string, id: string): Promise<void> {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || res.statusText);
    }
}
