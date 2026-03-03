const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';

export async function gql<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data as T;
}

// Default tenant for now
export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000010';
