/** CMS login roles — only these two are supported. */
export const APP_ROLES = ['super_admin', 'admin'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const APP_ROLE_LEVELS: Record<AppRole, number> = {
    super_admin: 100,
    admin: 80,
};

export const DEFAULT_APP_ROLE: AppRole = 'admin';

export function isAppRole(value: string): value is AppRole {
    return (APP_ROLES as readonly string[]).includes(value);
}

/** Normalize any backend/Supabase role string to a supported AppRole. */
export function normalizeAppRole(raw?: string | null): AppRole {
    if (!raw) return DEFAULT_APP_ROLE;
    const lower = raw.toLowerCase().replace(/[\s-]/g, '_');
    if (isAppRole(lower)) return lower;
    if (lower === 'service_role' || lower === 'supabase_admin') return 'super_admin';
    // Legacy CMS roles and Supabase JWT role collapse to admin (pengguna)
    return DEFAULT_APP_ROLE;
}

/** True when userRole meets or exceeds any of the required roles. */
export function hasMinRole(userRole: string, required: AppRole | AppRole[]): boolean {
    const requiredList = Array.isArray(required) ? required : [required];
    const userLevel = APP_ROLE_LEVELS[normalizeAppRole(userRole)];
    return requiredList.some((role) => userLevel >= APP_ROLE_LEVELS[role]);
}

export type UserStatus = 'active' | 'inactive';

export function normalizeUserStatus(raw?: string | null): UserStatus {
    return raw === 'inactive' ? 'inactive' : 'active';
}
