import { describe, expect, it } from 'vitest';

const DEFAULT_GRAPHQL_URL = 'http://127.0.0.1:4001/graphql';

function authGraphqlUrl(): string {
    return process.env.AUTH_GRAPHQL_URL?.trim() || process.env.NEXT_PUBLIC_GRAPHQL_URL?.trim() || DEFAULT_GRAPHQL_URL;
}

function isAuthIntegrationEnabled(): boolean {
    return process.env.RUN_AUTH_INTEGRATION === '1' || process.env.RUN_AUTH_INTEGRATION === 'true';
}

function authIntegrationCredentials(): { email: string; password: string } {
    return {
        email: process.env.AUTH_INTEGRATION_EMAIL?.trim() || 'admin@nusantarasoft.local',
        password: process.env.AUTH_INTEGRATION_PASSWORD?.trim() || 'Nusantarasoft123!',
    };
}

async function gqlRequest<T>(
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

const SIGN_IN_MUTATION = `
    mutation SignIn($email: String!, $password: String!) {
        signIn(input: { email: $email, password: $password }) {
            accessToken
            refreshToken
            user { id email role }
        }
    }
`;

const RUN = isAuthIntegrationEnabled();
const creds = authIntegrationCredentials();

describe.skipIf(!RUN)('Admin auth GraphQL integration', () => {
    it('signIn mutation returns tokens for CMS admin', async () => {
        const data = await gqlRequest<{
            signIn: {
                accessToken: string;
                refreshToken: string;
                user: { id: string; email: string; role: string };
            };
        }>(SIGN_IN_MUTATION, creds);

        expect(data.signIn.accessToken.length).toBeGreaterThan(20);
        expect(data.signIn.refreshToken.length).toBeGreaterThan(0);
        expect(data.signIn.user.email).toBe(creds.email);
    });

    it('signIn mutation rejects invalid credentials', async () => {
        await expect(
            gqlRequest(SIGN_IN_MUTATION, {
                email: creds.email,
                password: 'invalid-password-for-test',
            }),
        ).rejects.toThrow(/invalid|credentials|password/i);
    });
});
