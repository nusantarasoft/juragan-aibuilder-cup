import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY } from './public.decorator';
import { GlobalAuthGuard } from './global-auth.guard';

describe('GlobalAuthGuard', () => {
    const authService = {
        getUser: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', role: 'admin' }),
    };

    function gqlContext(auth?: string) {
        const req: { headers: { authorization?: string }; user?: unknown } = {
            headers: {},
        };
        if (auth) req.headers.authorization = auth;
        return {
            getType: () => 'graphql',
            getHandler: () => ({}),
            getClass: () => ({}),
            switchToHttp: () => ({ getRequest: () => req }),
            ...(vi.mocked(GqlExecutionContext.create) as unknown as object),
        } as ExecutionContext;
    }

    it('allows @Public without Authorization', async () => {
        const reflector = {
            getAllAndOverride: vi.fn((key: string) => key === IS_PUBLIC_KEY),
        } as unknown as Reflector;
        vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
            getContext: () => ({ req: { headers: {} } }),
        } as ReturnType<typeof GqlExecutionContext.create>);

        const guard = new GlobalAuthGuard(reflector, authService as never);
        const ctx = {
            getType: () => 'graphql',
            getHandler: () => ({}),
            getClass: () => ({}),
        } as ExecutionContext;
        await expect(guard.canActivate(ctx)).resolves.toBe(true);
    });

    it('rejects missing token on protected route', async () => {
        const reflector = {
            getAllAndOverride: vi.fn(() => false),
        } as unknown as Reflector;
        vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
            getContext: () => ({ req: { headers: {} } }),
        } as ReturnType<typeof GqlExecutionContext.create>);

        const guard = new GlobalAuthGuard(reflector, authService as never);
        const ctx = {
            getType: () => 'graphql',
            getHandler: () => ({}),
            getClass: () => ({}),
        } as ExecutionContext;
        await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    });
});
