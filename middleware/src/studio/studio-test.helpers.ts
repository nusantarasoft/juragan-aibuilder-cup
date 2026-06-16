const DEFAULT_GRAPHQL_URL = 'http://127.0.0.1:4001/graphql';

export function studioGraphqlUrl(): string {
    return process.env.STUDIO_GRAPHQL_URL?.trim() || DEFAULT_GRAPHQL_URL;
}

export function isStudioIntegrationEnabled(): boolean {
    return process.env.RUN_STUDIO_INTEGRATION === '1' || process.env.RUN_STUDIO_INTEGRATION === 'true';
}

export async function gqlRequest<T>(
    query: string,
    variables?: Record<string, unknown>,
): Promise<T> {
    const response = await fetch(studioGraphqlUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
        throw new Error(`GraphQL HTTP ${response.status}: ${await response.text()}`);
    }
    const payload = (await response.json()) as { data?: T; errors?: { message: string }[] };
    if (payload.errors?.length) {
        throw new Error(payload.errors[0]?.message || 'GraphQL error');
    }
    if (!payload.data) {
        throw new Error('GraphQL response missing data');
    }
    return payload.data;
}
