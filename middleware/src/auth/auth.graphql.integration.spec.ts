import { describe, expect, it } from 'vitest';
import {
    authIntegrationCredentials,
    gqlRequest,
    isAuthIntegrationEnabled,
    ME_QUERY,
    REFRESH_TOKEN_MUTATION,
    SIGN_IN_MUTATION,
    SIGN_OUT_MUTATION,
} from './auth-test.helpers';

const RUN = isAuthIntegrationEnabled();
const creds = authIntegrationCredentials();

describe.skipIf(!RUN)('Auth GraphQL integration (live middleware + Supabase)', () => {
    it('signIn succeeds with valid CMS admin credentials', async () => {
        const data = await gqlRequest<{
            signIn: {
                accessToken: string;
                refreshToken: string;
                user: { id: string; email: string; role: string };
            };
        }>(SIGN_IN_MUTATION, {
            email: creds.email,
            password: creds.password,
        });

        expect(data.signIn.accessToken).toBeTruthy();
        expect(data.signIn.refreshToken).toBeTruthy();
        expect(data.signIn.user.email).toBe(creds.email);
        expect(data.signIn.user.id).toBeTruthy();
        expect(['super_admin', 'admin']).toContain(data.signIn.user.role);
    });

    it('signIn rejects invalid password', async () => {
        await expect(
            gqlRequest(SIGN_IN_MUTATION, {
                email: creds.email,
                password: 'definitely-wrong-password',
            }),
        ).rejects.toThrow(/invalid|credentials|password/i);
    });

    it('me returns authenticated user when access token is provided', async () => {
        const signedIn = await gqlRequest<{
            signIn: { accessToken: string; user: { id: string; email: string } };
        }>(SIGN_IN_MUTATION, creds);

        const data = await gqlRequest<{ me: { id: string; email: string; role: string } | null }>(
            ME_QUERY,
            undefined,
            signedIn.signIn.accessToken,
        );

        expect(data.me).not.toBeNull();
        expect(data.me?.email).toBe(creds.email);
        expect(data.me?.id).toBe(signedIn.signIn.user.id);
    });

    it('me returns null without authorization header', async () => {
        const data = await gqlRequest<{ me: null }>(ME_QUERY);
        expect(data.me).toBeNull();
    });

    it('refreshToken rotates session tokens', async () => {
        const signedIn = await gqlRequest<{
            signIn: { accessToken: string; refreshToken: string };
        }>(SIGN_IN_MUTATION, creds);

        const data = await gqlRequest<{
            refreshToken: { accessToken: string; refreshToken: string };
        }>(REFRESH_TOKEN_MUTATION, { refreshToken: signedIn.signIn.refreshToken });

        expect(data.refreshToken.accessToken).toBeTruthy();
        expect(data.refreshToken.refreshToken).toBeTruthy();
        expect(data.refreshToken.accessToken).not.toBe(signedIn.signIn.accessToken);
    });

    it('signOut accepts bearer token', async () => {
        const signedIn = await gqlRequest<{
            signIn: { accessToken: string };
        }>(SIGN_IN_MUTATION, creds);

        const data = await gqlRequest<{ signOut: boolean }>(
            SIGN_OUT_MUTATION,
            undefined,
            signedIn.signIn.accessToken,
        );

        expect(data.signOut).toBe(true);
    });
});
