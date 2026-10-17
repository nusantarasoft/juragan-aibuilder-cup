import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { resolveAosTenant } from '../agentic-os/aos-tenant-access';
import { AOS_DEFAULT_TENANT } from '../agentic-os/agentic-os.types';
import { TenantMembershipService } from './tenant-membership.service';

const OTHER = '00000000-0000-0000-0000-000000000099';
const OWNER_TENANT = '00000000-0000-0000-0000-000000000201';

describe('F2-1 tenant access', () => {
    it('rejects unauthenticated-style empty user for tenant_owner home', () => {
        expect(() =>
            resolveAosTenant({ id: 'u1', role: 'tenant_owner', tenantId: null }, OTHER),
        ).toThrow(ForbiddenException);
    });

    it('rejects tenant_owner cross-tenant', () => {
        expect(() =>
            resolveAosTenant({ id: 'u1', role: 'tenant_owner', tenantId: OWNER_TENANT }, OTHER),
        ).toThrow(ForbiddenException);
    });

    it('allows tenant_owner home tenant reads', () => {
        expect(
            resolveAosTenant({ id: 'u1', role: 'tenant_owner', tenantId: OWNER_TENANT }, OWNER_TENANT),
        ).toBe(OWNER_TENANT);
    });

    it('rejects admin without auth on membership assert (unit)', async () => {
        const svc = new TenantMembershipService({ getAdminClient: () => ({}) } as any);
        await expect(
            svc.assertTenantAccess({ id: 'u1', role: 'admin' }, OTHER),
        ).rejects.toThrow(ForbiddenException);
    });

    it('platform admin still defaults to AOS_DEFAULT_TENANT', () => {
        expect(resolveAosTenant({ id: 'u1', role: 'admin' })).toBe(AOS_DEFAULT_TENANT);
    });

    it('documents email gate error type for tenant_owner sign-in', () => {
        expect(new UnauthorizedException('Email verification required before sign in').message).toMatch(
            /verification/i,
        );
    });
});
