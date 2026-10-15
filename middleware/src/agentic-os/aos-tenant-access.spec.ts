import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AOS_DEFAULT_TENANT } from './agentic-os.types';
import { resolveAosKasirTenant } from './aos-tenant-access';

const admin = { id: 'u1', role: 'admin' };
const superAdmin = { id: 'u2', role: 'super_admin' };
const owner = { id: 'u3', role: 'tenant_owner', tenantId: '00000000-0000-0000-0000-000000000201' };
const OTHER_TENANT = '00000000-0000-0000-0000-000000000099';

describe('resolveAosKasirTenant', () => {
    it('defaults admin to platform tenant when tenantId omitted', () => {
        expect(resolveAosKasirTenant(admin)).toBe(AOS_DEFAULT_TENANT);
    });

    it('allows admin to request default tenant explicitly', () => {
        expect(resolveAosKasirTenant(admin, AOS_DEFAULT_TENANT)).toBe(AOS_DEFAULT_TENANT);
        expect(resolveAosKasirTenant(admin, 'default')).toBe(AOS_DEFAULT_TENANT);
    });

    it('rejects admin cross-tenant reads', () => {
        expect(() => resolveAosKasirTenant(admin, OTHER_TENANT)).toThrow(ForbiddenException);
    });

    it('allows super_admin cross-tenant reads', () => {
        expect(resolveAosKasirTenant(superAdmin, OTHER_TENANT)).toBe(OTHER_TENANT);
    });

    it('scopes tenant_owner to membership tenant', () => {
        expect(resolveAosKasirTenant(owner)).toBe(owner.tenantId!);
        expect(() => resolveAosKasirTenant(owner, OTHER_TENANT)).toThrow(ForbiddenException);
    });
});
