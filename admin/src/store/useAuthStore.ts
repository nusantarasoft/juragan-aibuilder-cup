import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─── Role Hierarchy (CMS login roles) ───────────────────────────────────
export type AppRole = 'super_admin' | 'admin' | 'tenant_owner';

/** Legacy requirement aliases still used by RbacGuard call sites map to admin. */
export type RoleRequirement = AppRole | 'manager' | 'viewer' | 'guest';

const ROLE_LEVELS: Record<AppRole, number> = {
    super_admin: 100,
    admin: 80,
    tenant_owner: 70,
};

const REQUIREMENT_LEVELS: Record<RoleRequirement, number> = {
    super_admin: 100,
    admin: 80,
    manager: 80,
    viewer: 80,
    guest: 80,
};

export const ROLE_LABELS: Record<AppRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrator',
    tenant_owner: 'Pemilik toko',
};

/** Map any role string from the backend to a valid AppRole */
export function normalizeRole(raw?: string | null): AppRole {
    if (!raw) return 'admin';
    const lower = raw.toLowerCase().replace(/[\s-]/g, '_');
    if (lower === 'super_admin') return 'super_admin';
    if (lower === 'admin') return 'admin';
    if (lower === 'tenant_owner') return 'tenant_owner';
    if (lower === 'service_role' || lower === 'supabase_admin') return 'super_admin';
    // Legacy roles and Supabase JWT role collapse to admin (pengguna)
    return 'admin';
}

// ─── User Session ───────────────────────────────────────────────────────
export interface AuthUser {
    id: string;
    email: string;
    fullName: string;
    role: AppRole;
    tenantId: string;
    avatarUrl?: string;
}

interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;

    /** Set the current user session */
    setUser: (user: AuthUser) => void;

    /** Clear the current user session */
    clearUser: () => void;

    /** Sync from AuthContext user data (convenience method) */
    syncFromAuth: (userData: {
        id: string;
        email: string;
        fullName?: string;
        role?: string;
        tenantId?: string | null;
    }) => void;

    /** Check if the current user meets the minimum role level */
    hasRole: (requiredRole: RoleRequirement) => boolean;

    /** Get the numeric level for the current user's role */
    getRoleLevel: () => number;
}

// ─── Encrypted Storage (matches usePreferencesStore pattern) ────────────
const encrypt = (str: string) => btoa(str);
const decrypt = (str: string) => atob(str);

const noopStorage = {
    getItem: (_name: string): string | null => null,
    setItem: (_name: string, _value: string): void => {},
    removeItem: (_name: string): void => {},
};

const browserStorage = {
    getItem: (name: string): string | null => {
        const value = localStorage.getItem(name);
        if (!value) return null;
        try { return decrypt(value); }
        catch { return null; }
    },
    setItem: (name: string, value: string): void => {
        localStorage.setItem(name, encrypt(value));
    },
    removeItem: (name: string): void => {
        localStorage.removeItem(name);
    },
};

const encryptedStorage = typeof window !== 'undefined' ? browserStorage : noopStorage;

// ─── Store ─────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,

            setUser: (user) => set({ user, isAuthenticated: true }),

            clearUser: () => set({ user: null, isAuthenticated: false }),

            syncFromAuth: (userData) => {
                const role = normalizeRole(userData.role);
                set({
                    user: {
                        id: userData.id,
                        email: userData.email,
                        fullName: userData.fullName || userData.email.split('@')[0],
                        role,
                        tenantId: userData.tenantId || '00000000-0000-0000-0000-000000000010',
                    },
                    isAuthenticated: true,
                });
            },

            hasRole: (requiredRole) => {
                const { user } = get();
                // Default to admin for dev when no user session exists
                const effectiveRole = user?.role ?? 'admin';
                return ROLE_LEVELS[effectiveRole] >= REQUIREMENT_LEVELS[requiredRole];
            },

            getRoleLevel: () => {
                const { user } = get();
                return user ? ROLE_LEVELS[user.role] : ROLE_LEVELS.admin;
            },
        }),
        {
            name: 'cms-auth',
            storage: createJSONStorage(() => encryptedStorage),
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
