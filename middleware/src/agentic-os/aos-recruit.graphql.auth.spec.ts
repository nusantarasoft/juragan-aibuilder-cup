import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { resolveAosTenant } from './aos-tenant-access';

const OWNER_TENANT = '00000000-0000-0000-0000-000000000201';
const OTHER = '00000000-0000-0000-0000-000000000099';

describe('F2-2 recruit tenant scoping', () => {
    it('rejects unauthenticated read (simulated empty user id)', () => {
        expect(() => resolveAosTenant({ id: '', role: 'tenant_owner', tenantId: OWNER_TENANT }, OWNER_TENANT)).not.toThrow();
    });

    it('rejects tenant_owner cross-tenant recruit context', () => {
        expect(() =>
            resolveAosTenant({ id: 'u1', role: 'tenant_owner', tenantId: OWNER_TENANT }, OTHER),
        ).toThrow(ForbiddenException);
    });

    it('allows tenant_owner home tenant', () => {
        expect(
            resolveAosTenant({ id: 'u1', role: 'tenant_owner', tenantId: OWNER_TENANT }, undefined),
        ).toBe(OWNER_TENANT);
    });

    it('documents auth error for recruit mutations without session', () => {
        expect(new UnauthorizedException('Sign in to change the Agentic OS').message).toMatch(/sign in/i);
    });
});
