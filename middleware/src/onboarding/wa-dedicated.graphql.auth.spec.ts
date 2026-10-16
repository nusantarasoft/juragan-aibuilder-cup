import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { resolveAosTenant } from '../agentic-os/aos-tenant-access';

const OWNER_TENANT = '00000000-0000-0000-0000-000000000201';
const OTHER = '00000000-0000-0000-0000-000000000099';

describe('P2-5 dedicated WA tenant isolation (unit)', () => {
    it('rejects tenant_owner cross-tenant reads (same guard as connect-wa GraphQL)', () => {
        expect(() =>
            resolveAosTenant({ id: 'u1', role: 'tenant_owner', tenantId: OWNER_TENANT }, OTHER),
        ).toThrow(ForbiddenException);
    });

    it('allows tenant_owner on home tenant', () => {
        expect(
            resolveAosTenant({ id: 'u1', role: 'tenant_owner', tenantId: OWNER_TENANT }, OWNER_TENANT),
        ).toBe(OWNER_TENANT);
    });
});
