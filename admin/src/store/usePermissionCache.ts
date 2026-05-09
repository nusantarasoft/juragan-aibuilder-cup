import { create } from 'zustand';
import { gql } from '@/lib/graphql';

/**
 * Permission Cache Store
 * Caches system permission checks per session to avoid repeated GraphQL calls.
 * Used by RbacGuard to enforce fine-grained permission keys.
 */

interface PermissionCacheState {
    /** Map of permissionKey → isEnabled */
    cache: Record<string, boolean>;
    /** Timestamp of last fetch */
    lastFetch: number;
    /** Whether initial load is complete */
    loaded: boolean;
    /** Loading state */
    loading: boolean;

    /** Check a permission (returns cached value, or true if not yet loaded) */
    hasPermission: (key: string) => boolean;

    /** Fetch a single permission and cache it */
    fetchPermission: (tenantUserId: string, key: string) => Promise<boolean>;

    /** Clear cache (on sign out) */
    clearCache: () => void;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const usePermissionCache = create<PermissionCacheState>()((set, get) => ({
    cache: {},
    lastFetch: 0,
    loaded: false,
    loading: false,

    hasPermission: (key: string) => {
        const { cache, lastFetch } = get();
        // If cache is stale, allow (optimistic) — will be re-fetched
        if (Date.now() - lastFetch > CACHE_TTL_MS) return true;
        // If key not in cache, allow (not yet checked)
        if (!(key in cache)) return true;
        return cache[key];
    },

    fetchPermission: async (tenantUserId: string, key: string) => {
        const { cache, lastFetch } = get();
        // Return cached if fresh
        if (key in cache && Date.now() - lastFetch < CACHE_TTL_MS) {
            return cache[key];
        }

        try {
            const data = await gql<{ hasSystemPermission: boolean }>(`
                query($tenantUserId: String!, $permissionKey: String!) {
                    hasSystemPermission(tenantUserId: $tenantUserId, permissionKey: $permissionKey)
                }
            `, { tenantUserId, permissionKey: key });

            const result = data.hasSystemPermission ?? true;
            set((s) => ({
                cache: { ...s.cache, [key]: result },
                lastFetch: Date.now(),
                loaded: true,
            }));
            return result;
        } catch {
            // On error, allow (fail-open for usability)
            return true;
        }
    },

    clearCache: () => set({ cache: {}, lastFetch: 0, loaded: false }),
}));
