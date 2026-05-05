import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─── Role Hierarchy ─────────────────────────────────────────────────────
export type AppRole = 'super_admin' | 'admin' | 'manager' | 'viewer' | 'guest';

const ROLE_LEVELS: Record<AppRole, number> = {
    super_admin: 100,
    admin: 80,
    manager: 60,
    viewer: 40,
    guest: 20,
};

export const ROLE_LABELS: Record<AppRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrator',
    manager: 'Manager',
    viewer: 'Viewer',
    guest: 'Guest',
};

/** Map any role string from the backend to a valid AppRole */
export function normalizeRole(raw?: string | null): AppRole {
    if (!raw) return 'viewer';
    const lower = raw.toLowerCase().replace(/[\s-]/g, '_');
    if (lower in ROLE_LEVELS) return lower as AppRole;
    // Common Supabase role mappings
    if (lower === 'service_role' || lower === 'supabase_admin') return 'super_admin';
    if (lower === 'authenticated') return 'viewer';
    return 'viewer';
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
    syncFromAuth: (userData: { id: string; email: string; fullName?: string; role?: string }) => void;

    /** Check if the current user meets the minimum role level */
    hasRole: (requiredRole: AppRole) => boolean;

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
                        tenantId: 'default',
                    },
                    isAuthenticated: true,
                });
            },

            hasRole: (requiredRole) => {
                const { user } = get();
                if (!user) return false;
                return ROLE_LEVELS[user.role] >= ROLE_LEVELS[requiredRole];
            },

            getRoleLevel: () => {
                const { user } = get();
                return user ? ROLE_LEVELS[user.role] : 0;
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
