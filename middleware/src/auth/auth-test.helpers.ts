const DEFAULT_GRAPHQL_URL = 'http://127.0.0.1:4001/graphql';

export function authGraphqlUrl(): string {
    return process.env.AUTH_GRAPHQL_URL?.trim() || process.env.STUDIO_GRAPHQL_URL?.trim() || DEFAULT_GRAPHQL_URL;
}

export function isAuthIntegrationEnabled(): boolean {
    return process.env.RUN_AUTH_INTEGRATION === '1' || process.env.RUN_AUTH_INTEGRATION === 'true';
}

export function authIntegrationCredentials(): { email: string; password: string } {
    return {
        email: process.env.AUTH_INTEGRATION_EMAIL?.trim() || 'admin@nusantarasoft.local',
        password: process.env.AUTH_INTEGRATION_PASSWORD?.trim() || 'Nusantarasoft123!',
    };
}

export async function gqlRequest<T>(
    query: string,
    variables?: Record<string, unknown>,
    token?: string,
): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(authGraphqlUrl(), {
        method: 'POST',
        headers,
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

export const SIGN_IN_MUTATION = `
    mutation SignIn($email: String!, $password: String!) {
        signIn(input: { email: $email, password: $password }) {
            accessToken
            refreshToken
            user { id email role }
        }
    }
`;

export const ME_QUERY = `
    query Me {
        me { id email role }
    }
`;

export const REFRESH_TOKEN_MUTATION = `
    mutation RefreshToken($refreshToken: String!) {
        refreshToken(refreshToken: $refreshToken) {
            accessToken
            refreshToken
        }
    }
`;

export const SIGN_OUT_MUTATION = `
    mutation SignOut {
        signOut
    }
`;
