import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';

function mockContext(user?: { role?: string }) {
    const req = { user };
    return {
        getType: () => 'graphql',
        getHandler: () => ({}),
        getClass: () => ({}),
        getArgs: () => [{}, {}, { req }, {}],
        switchToHttp: () => ({ getRequest: () => req }),
    } as any;
}

describe('RolesGuard', () => {
    it('allows when no roles metadata is set', () => {
        const reflector = {
            getAllAndOverride: vi.fn().mockReturnValue(undefined),
        } as unknown as Reflector;
        const guard = new RolesGuard(reflector);
        expect(guard.canActivate(mockContext({ role: 'admin' }))).toBe(true);
    });

    it('allows when roles metadata is empty', () => {
        const reflector = {
            getAllAndOverride: vi.fn().mockReturnValue([]),
        } as unknown as Reflector;
        const guard = new RolesGuard(reflector);
        expect(guard.canActivate(mockContext({ role: 'admin' }))).toBe(true);
    });

    it('allows admin when admin is required', () => {
        const reflector = {
            getAllAndOverride: vi.fn().mockReturnValue(['admin']),
        } as unknown as Reflector;
        const guard = new RolesGuard(reflector);
        expect(guard.canActivate(mockContext({ role: 'admin' }))).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
    });

    it('allows super_admin when admin is required', () => {
        const reflector = {
            getAllAndOverride: vi.fn().mockReturnValue(['admin']),
        } as unknown as Reflector;
        const guard = new RolesGuard(reflector);
        expect(guard.canActivate(mockContext({ role: 'super_admin' }))).toBe(true);
    });

    it('rejects admin when super_admin is required', () => {
        const reflector = {
            getAllAndOverride: vi.fn().mockReturnValue(['super_admin']),
        } as unknown as Reflector;
        const guard = new RolesGuard(reflector);
        expect(() => guard.canActivate(mockContext({ role: 'admin' }))).toThrow(UnauthorizedException);
    });

    it('rejects missing user', () => {
        const reflector = {
            getAllAndOverride: vi.fn().mockReturnValue(['admin']),
        } as unknown as Reflector;
        const guard = new RolesGuard(reflector);
        expect(() => guard.canActivate(mockContext(undefined))).toThrow(UnauthorizedException);
    });

    it('rejects when graphql context has no req', () => {
        const reflector = {
            getAllAndOverride: vi.fn().mockReturnValue(['admin']),
        } as unknown as Reflector;
        const guard = new RolesGuard(reflector);
        const context = {
            getType: () => 'graphql',
            getHandler: () => ({}),
            getClass: () => ({}),
            getArgs: () => [{}, {}, {}, {}],
            switchToHttp: () => ({ getRequest: () => ({}) }),
        } as any;
        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
});
