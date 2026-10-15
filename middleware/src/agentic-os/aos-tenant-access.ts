import { ForbiddenException } from '@nestjs/common';
import { hasMinRole } from '../auth/app-roles';
import { tenantOf } from './agentic-os.service';
import { AOS_DEFAULT_TENANT } from './agentic-os.types';

export type AosSessionUser = { id: string; email?: string; role?: string };

/** v1 CMS: admins are scoped to the platform default tenant; super_admin may pass another tenantId. */
export function resolveAosTenant(user: AosSessionUser, requestedTenantId?: string | null): string {
    const home = AOS_DEFAULT_TENANT;
    const normalized = requestedTenantId?.trim() || null;

    if (!normalized || normalized === 'default' || tenantOf(normalized) === home) {
        return home;
    }

    if (hasMinRole(user.role ?? 'admin', 'super_admin')) {
        return tenantOf(normalized);
    }

    throw new ForbiddenException('You do not have access to this tenant');
}

/** @deprecated use resolveAosTenant */
export const resolveAosKasirTenant = resolveAosTenant;
