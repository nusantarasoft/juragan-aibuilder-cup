import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UnauthorizedException } from '@nestjs/common';

type AuthUser = {
    id: string;
    email?: string;
    role?: string;
};

function buildAuthService(options: {
    signInResult?: { data: { user: AuthUser | null; session: { access_token: string; refresh_token: string } | null }; error: { message: string } | null };
    profileRole?: string | null;
    profileStatus?: string | null;
    profileExists?: boolean;
    profileError?: boolean;
    getUserResult?: { data: { user: AuthUser }; error: { message: string } | null };
    refreshResult?: { data: { session: { access_token: string; refresh_token: string } } | null; error: { message: string } | null };
    signOutError?: { message: string } | null;
    signUpResult?: { data: { user: AuthUser | null; session: unknown }; error: { message: string } | null };
}) {
    const authClient = {
        signInWithPassword: vi.fn().mockResolvedValue(
            options.signInResult ?? {
                data: {
                    user: { id: 'user-1', email: 'admin@nusantarasoft.local', role: 'authenticated' },
                    session: { access_token: 'access-token', refresh_token: 'refresh-token' },
                },
                error: null,
            },
        ),
        signUp: vi.fn().mockResolvedValue(
            options.signUpResult ?? {
                data: {
                    user: { id: 'user-2', email: 'new@nusantarasoft.local' },
                    session: null,
                },
                error: null,
            },
        ),
        getUser: vi.fn().mockResolvedValue(
            options.getUserResult ?? {
                data: { user: { id: 'user-1', email: 'admin@nusantarasoft.local', role: 'authenticated' } },
                error: null,
            },
        ),
        refreshSession: vi.fn().mockResolvedValue(
            options.refreshResult ?? {
                data: { session: { access_token: 'new-access', refresh_token: 'new-refresh' } },
                error: null,
            },
        ),
        signOut: vi.fn().mockResolvedValue({ error: options.signOutError ?? null }),
    };

    const hasProfile = options.profileExists === true
        || options.profileRole != null
        || options.profileStatus != null;

    const profileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(
            options.profileError
                ? { data: null, error: { message: 'db error' } }
                : {
                    data: hasProfile
                        ? {
                            role: options.profileRole ?? null,
                            status: options.profileStatus ?? null,
                        }
                        : null,
                    error: null,
                },
        ),
    };

    const emptyTenantQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const supabaseMock = {
        getClient: () => ({ auth: authClient }),
        getAdminClient: () => ({
            from: vi.fn((table: string) => {
                if (table === 'user_profiles') return profileQuery;
                return emptyTenantQuery;
            }),
        }),
        getClientWithToken: () => ({ auth: authClient }),
    } as unknown as SupabaseService;

    return { service: new AuthService(supabaseMock), authClient, profileQuery };
}

describe('AuthService', () => {
    it('signIn returns tokens and resolves app role from user_profiles', async () => {
        const { service } = buildAuthService({ profileRole: 'super_admin' });

        const result = await service.signIn('admin@nusantarasoft.local', 'Nusantarasoft123!');

        expect(result.accessToken).toBe('access-token');
        expect(result.refreshToken).toBe('refresh-token');
        expect(result.user?.email).toBe('admin@nusantarasoft.local');
        expect(result.user?.role).toBe('super_admin');
    });

    it('signIn throws when Supabase auth returns an error', async () => {
        const { service } = buildAuthService({
            signInResult: {
                data: { user: null, session: null },
                error: { message: 'Invalid login credentials' },
            },
        });

        await expect(service.signIn('admin@nusantarasoft.local', 'wrong')).rejects.toThrow(
            'Invalid login credentials',
        );
    });

    it('signIn throws when auth succeeds but user payload is missing', async () => {
        const { service } = buildAuthService({
            signInResult: {
                data: { user: null, session: { access_token: 'a', refresh_token: 'r' } },
                error: null,
            },
        });

        await expect(service.signIn('admin@nusantarasoft.local', 'x')).rejects.toThrow(
            'Invalid login credentials',
        );
    });

    it('signIn normalizes missing profile role to admin', async () => {
        const { service } = buildAuthService({ profileRole: null });

        const result = await service.signIn('admin@nusantarasoft.local', 'Nusantarasoft123!');

        expect(result.user?.role).toBe('admin');
    });

    it('signIn rejects deactivated accounts', async () => {
        const { service } = buildAuthService({
            profileRole: 'admin',
            profileStatus: 'inactive',
        });

        await expect(service.signIn('admin@nusantarasoft.local', 'Nusantarasoft123!')).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });

    it('getUser resolves app role for bearer token session', async () => {
        const { service } = buildAuthService({ profileRole: 'admin' });

        const user = await service.getUser('access-token');

        expect(user.email).toBe('admin@nusantarasoft.local');
        expect(user.role).toBe('admin');
    });

    it('getUser rejects deactivated accounts', async () => {
        const { service } = buildAuthService({
            profileRole: 'admin',
            profileStatus: 'inactive',
        });

        await expect(service.getUser('access-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('getUser throws when Supabase returns an error', async () => {
        const { service } = buildAuthService({
            getUserResult: {
                data: { user: { id: 'user-1' } },
                error: { message: 'jwt expired' },
            },
        });

        await expect(service.getUser('bad')).rejects.toThrow('jwt expired');
    });

    it('refreshSession returns rotated tokens', async () => {
        const { service } = buildAuthService({});

        const result = await service.refreshSession('refresh-token');

        expect(result).toEqual({
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
        });
    });

    it('refreshSession throws on error', async () => {
        const { service } = buildAuthService({
            refreshResult: {
                data: null,
                error: { message: 'Invalid refresh token' },
            },
        });

        await expect(service.refreshSession('bad')).rejects.toThrow('Invalid refresh token');
    });

    it('signOut succeeds when Supabase auth has no error', async () => {
        const { service } = buildAuthService({});

        await expect(service.signOut('access-token')).resolves.toBe(true);
    });

    it('signOut throws when Supabase returns an error', async () => {
        const { service } = buildAuthService({
            signOutError: { message: 'session missing' },
        });

        await expect(service.signOut('access-token')).rejects.toThrow('session missing');
    });

    it('signUp returns created user', async () => {
        const { service, authClient } = buildAuthService({});

        const result = await service.signUp('new@nusantarasoft.local', 'Password123!', { name: 'New' });

        expect(result.user?.email).toBe('new@nusantarasoft.local');
        expect(authClient.signUp).toHaveBeenCalled();
    });

    it('signUp throws on error', async () => {
        const { service } = buildAuthService({
            signUpResult: {
                data: { user: null, session: null },
                error: { message: 'User already registered' },
            },
        });

        await expect(service.signUp('a@b.com', 'Password123!')).rejects.toThrow('User already registered');
    });

    it('signIn rejects tenant_owner when email is not verified', async () => {
        const { service } = buildAuthService({
            profileRole: 'tenant_owner',
            profileStatus: 'active',
            signInResult: {
                data: {
                    user: {
                        id: 'user-1',
                        email: 'owner@example.com',
                        email_confirmed_at: null,
                    },
                    session: { access_token: 'access-token', refresh_token: 'refresh-token' },
                },
                error: null,
            },
        });

        await expect(service.signIn('owner@example.com', 'Password123!')).rejects.toThrow(
            UnauthorizedException,
        );
    });

    it('signIn uses DEFAULT_APP_ROLE when profile and fallback are empty', async () => {
        const { service } = buildAuthService({
            profileExists: true,
            profileRole: null,
            profileStatus: 'active',
            signInResult: {
                data: {
                    user: { id: 'user-1', email: 'admin@nusantarasoft.local' },
                    session: { access_token: 'access-token', refresh_token: 'refresh-token' },
                },
                error: null,
            },
        });

        const result = await service.signIn('admin@nusantarasoft.local', 'Nusantarasoft123!');
        expect(result.user?.role).toBe('admin');
    });

    it('resolveProfile prefers profile role over fallback', async () => {
        const { service } = buildAuthService({
            profileRole: 'super_admin',
            profileStatus: 'active',
        });
        const profile = await service.resolveProfile('user-1', 'authenticated');
        expect(profile).toEqual({ role: 'super_admin', status: 'active' });
    });
});
