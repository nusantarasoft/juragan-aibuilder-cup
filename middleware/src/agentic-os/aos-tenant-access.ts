import { ForbiddenException } from '@nestjs/common';
import { hasMinRole } from '../auth/app-roles';
import { tenantOf } from './agentic-os.service';
import { AOS_DEFAULT_TENANT } from './agentic-os.types';

export type AosSessionUser = {
    id: string;
    email?: string;
    role?: string;
    tenantId?: string | null;
};

/** Platform admins → default tenant; tenant_owner → membership tenant; super_admin may override. */
export function resolveAosTenant(user: AosSessionUser, requestedTenantId?: string | null): string {
    const normalized = requestedTenantId?.trim() || null;
    const role = user.role ?? 'admin';

    if (hasMinRole(role, 'super_admin')) {
        if (!normalized || normalized === 'default') return AOS_DEFAULT_TENANT;
        return tenantOf(normalized);
    }

    if (role === 'tenant_owner') {
        const home = user.tenantId?.trim();
        if (!home) {
            throw new ForbiddenException('Tenant membership required');
        }
        if (normalized && normalized !== 'default' && tenantOf(normalized) !== home) {
            throw new ForbiddenException('You do not have access to this tenant');
        }
        return home;
    }

    const home = AOS_DEFAULT_TENANT;
    if (!normalized || normalized === 'default' || tenantOf(normalized) === home) {
        return home;
    }

    throw new ForbiddenException('You do not have access to this tenant');
}

/** @deprecated use resolveAosTenant */
export const resolveAosKasirTenant = resolveAosTenant;
