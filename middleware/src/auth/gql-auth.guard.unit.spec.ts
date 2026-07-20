import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { GqlAuthGuard } from './gql-auth.guard';
import { AuthService } from './auth.service';

function mockContext(authHeader?: string) {
    const req: { headers: Record<string, string | undefined>; user?: unknown } = {
        headers: { authorization: authHeader },
    };
    return {
        context: {
            getType: () => 'graphql',
            getHandler: () => ({}),
            getClass: () => ({}),
            getArgs: () => [{}, {}, { req }, {}],
            switchToHttp: () => ({ getRequest: () => req }),
        } as any,
        req,
    };
}

describe('GqlAuthGuard', () => {
    it('sets req.user when bearer token is valid', async () => {
        const authService = {
            getUser: vi.fn().mockResolvedValue({
                id: 'u1',
                email: 'admin@nusantarasoft.local',
                role: 'super_admin',
            }),
        } as unknown as AuthService;
        const guard = new GqlAuthGuard(authService);
        const { context, req } = mockContext('Bearer token-1');

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(req.user).toEqual({
            id: 'u1',
            email: 'admin@nusantarasoft.local',
            role: 'super_admin',
        });
        expect(authService.getUser).toHaveBeenCalledWith('token-1');
    });

    it('rejects missing authorization header', async () => {
        const guard = new GqlAuthGuard({ getUser: vi.fn() } as unknown as AuthService);
        const { context } = mockContext(undefined);
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects empty bearer token', async () => {
        const guard = new GqlAuthGuard({ getUser: vi.fn() } as unknown as AuthService);
        const { context } = mockContext('Bearer   ');
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when getUser fails', async () => {
        const guard = new GqlAuthGuard({
            getUser: vi.fn().mockRejectedValue(new Error('jwt expired')),
        } as unknown as AuthService);
        const { context } = mockContext('Bearer bad');
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects non-Error getUser failures', async () => {
        const guard = new GqlAuthGuard({
            getUser: vi.fn().mockRejectedValue('boom'),
        } as unknown as AuthService);
        const { context } = mockContext('Bearer bad');
        await expect(guard.canActivate(context)).rejects.toMatchObject({
            message: 'Invalid session',
        });
    });

    it('rejects when request context has no req object', async () => {
        const guard = new GqlAuthGuard({ getUser: vi.fn() } as unknown as AuthService);
        const context = {
            getType: () => 'graphql',
            getHandler: () => ({}),
            getClass: () => ({}),
            getArgs: () => [{}, {}, {}, {}],
            switchToHttp: () => ({ getRequest: () => ({}) }),
        } as any;
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when req exists without headers', async () => {
        const guard = new GqlAuthGuard({ getUser: vi.fn() } as unknown as AuthService);
        const context = {
            getType: () => 'graphql',
            getHandler: () => ({}),
            getClass: () => ({}),
            getArgs: () => [{}, {}, { req: {} }, {}],
            switchToHttp: () => ({ getRequest: () => ({}) }),
        } as any;
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    });
});
