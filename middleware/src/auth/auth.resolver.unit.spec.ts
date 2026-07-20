import { describe, expect, it, vi } from 'vitest';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';

describe('AuthResolver', () => {
    function build(overrides?: Partial<AuthService>) {
        const authService = {
            signIn: vi.fn().mockResolvedValue({
                accessToken: 'a',
                refreshToken: 'r',
                user: { id: 'u1', email: 'a@b.com', role: 'admin' },
            }),
            signUp: vi.fn().mockResolvedValue({
                user: { id: 'u2', email: 'c@d.com', role: 'authenticated' },
                session: null,
            }),
            signOut: vi.fn().mockResolvedValue(true),
            getUser: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', role: 'super_admin' }),
            refreshSession: vi.fn().mockResolvedValue({
                accessToken: 'na',
                refreshToken: 'nr',
            }),
            ...overrides,
        } as unknown as AuthService;
        return { resolver: new AuthResolver(authService), authService };
    }

    it('signIn maps auth service result', async () => {
        const { resolver, authService } = build();
        const result = await resolver.signIn({ email: 'a@b.com', password: 'x' });
        expect(authService.signIn).toHaveBeenCalledWith('a@b.com', 'x');
        expect(result).toEqual({
            accessToken: 'a',
            refreshToken: 'r',
            user: { id: 'u1', email: 'a@b.com', role: 'admin' },
        });
    });

    it('signIn handles missing user payload', async () => {
        const { resolver } = build({
            signIn: vi.fn().mockResolvedValue({
                accessToken: 'a',
                refreshToken: 'r',
                user: undefined,
            }),
        } as any);
        const result = await resolver.signIn({ email: 'a@b.com', password: 'x' });
        expect(result.user).toBeUndefined();
    });

    it('signUp maps user without tokens', async () => {
        const { resolver, authService } = build();
        const result = await resolver.signUp({ email: 'c@d.com', password: 'x', name: 'C' });
        expect(authService.signUp).toHaveBeenCalledWith('c@d.com', 'x', { name: 'C' });
        expect(result.user?.email).toBe('c@d.com');
    });

    it('signUp handles missing user', async () => {
        const { resolver } = build({
            signUp: vi.fn().mockResolvedValue({ user: null, session: null }),
        } as any);
        const result = await resolver.signUp({ email: 'c@d.com', password: 'x' });
        expect(result.user).toBeUndefined();
    });

    it('signOut requires authorization header', async () => {
        const { resolver } = build();
        await expect(resolver.signOut({ req: {} })).rejects.toThrow('No authorization header');
    });

    it('signOut strips bearer token', async () => {
        const { resolver, authService } = build();
        await expect(
            resolver.signOut({ req: { headers: { authorization: 'Bearer tok' } } }),
        ).resolves.toBe(true);
        expect(authService.signOut).toHaveBeenCalledWith('tok');
    });

    it('me returns null without authorization', async () => {
        const { resolver } = build();
        await expect(resolver.me({ req: {} })).resolves.toBeNull();
    });

    it('me returns mapped user', async () => {
        const { resolver } = build();
        const result = await resolver.me({
            req: { headers: { authorization: 'Bearer tok' } },
        });
        expect(result).toEqual({ id: 'u1', email: 'a@b.com', role: 'super_admin' });
    });

    it('me returns null when getUser yields falsy', async () => {
        const { resolver } = build({
            getUser: vi.fn().mockResolvedValue(null),
        } as any);
        await expect(
            resolver.me({ req: { headers: { authorization: 'Bearer tok' } } }),
        ).resolves.toBeNull();
    });

    it('refreshToken maps tokens with empty fallbacks', async () => {
        const { resolver } = build({
            refreshSession: vi.fn().mockResolvedValue({
                accessToken: undefined,
                refreshToken: undefined,
            }),
        } as any);
        await expect(resolver.refreshToken('r')).resolves.toEqual({
            accessToken: '',
            refreshToken: '',
        });
    });

    it('refreshToken returns rotated tokens', async () => {
        const { resolver } = build();
        await expect(resolver.refreshToken('r')).resolves.toEqual({
            accessToken: 'na',
            refreshToken: 'nr',
        });
    });
});
