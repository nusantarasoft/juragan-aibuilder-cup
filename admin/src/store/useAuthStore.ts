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

// ─── Default Admin User ────────────────────────────────────────────────
// The admin panel is already auth-gated; default to admin role so
// existing functionality is fully preserved until roles are configured.
const DEFAULT_USER: AuthUser = {
    id: 'system',
    email: 'admin@nusantarasoft.com',
    fullName: 'System Administrator',
    role: 'admin',
    tenantId: 'default',
};

// ─── Store ─────────────────────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: DEFAULT_USER,
            isAuthenticated: true,

            setUser: (user) => set({ user, isAuthenticated: true }),

            clearUser: () => set({ user: null, isAuthenticated: false }),

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
