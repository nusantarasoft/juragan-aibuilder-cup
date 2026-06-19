import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';

type AuthUser = {
    id: string;
    email?: string;
    role?: string;
};

function buildAuthService(options: {
    signInResult?: { data: { user: AuthUser; session: { access_token: string; refresh_token: string } } | null; error: { message: string } | null };
    profileRole?: string | null;
    profileError?: boolean;
    getUserResult?: { data: { user: AuthUser }; error: { message: string } | null };
    refreshResult?: { data: { session: { access_token: string; refresh_token: string } } | null; error: { message: string } | null };
    signOutError?: { message: string } | null;
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

    const profileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(
            options.profileError
                ? { data: null, error: { message: 'db error' } }
                : { data: options.profileRole ? { role: options.profileRole } : null, error: null },
        ),
    };

    const supabaseMock = {
        getClient: () => ({ auth: authClient }),
        getAdminClient: () => ({
            from: vi.fn().mockReturnValue(profileQuery),
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
                data: { user: null as unknown as AuthUser, session: null as unknown as { access_token: string; refresh_token: string } },
                error: { message: 'Invalid login credentials' },
            },
        });

        await expect(service.signIn('admin@nusantarasoft.local', 'wrong')).rejects.toThrow(
            'Invalid login credentials',
        );
    });

    it('signIn falls back to Supabase role when user_profiles row is missing', async () => {
        const { service } = buildAuthService({ profileRole: null });

        const result = await service.signIn('admin@nusantarasoft.local', 'Nusantarasoft123!');

        expect(result.user?.role).toBe('authenticated');
    });

    it('getUser resolves app role for bearer token session', async () => {
        const { service } = buildAuthService({ profileRole: 'admin' });

        const user = await service.getUser('access-token');

        expect(user.email).toBe('admin@nusantarasoft.local');
        expect(user.role).toBe('admin');
    });

    it('refreshSession returns rotated tokens', async () => {
        const { service } = buildAuthService({});

        const result = await service.refreshSession('refresh-token');

        expect(result).toEqual({
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
        });
    });

    it('signOut succeeds when Supabase auth has no error', async () => {
        const { service } = buildAuthService({});

        await expect(service.signOut('access-token')).resolves.toBe(true);
    });
});
