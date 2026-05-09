import { create } from 'zustand';
import { gql, DEFAULT_TENANT_ID } from '@/lib/graphql';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Notification {
    id: string;
    title: string;
    message?: string;
    module?: string;
    link?: string;
    icon?: string;
    isRead: boolean;
    readAt?: string;
    createdAt: string;
}

interface NotificationStore {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    lastFetch: number;
    realtimeActive: boolean;

    fetchNotifications: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    startPolling: () => () => void;
}

const POLL_INTERVAL = 30_000; // 30s fallback polling
const USER_ID = 'system'; // Will be dynamic once auth is wired

/**
 * Map a Supabase row (snake_case) to the Notification interface (camelCase).
 */
function mapRow(row: any): Notification {
    return {
        id: row.id,
        title: row.title,
        message: row.message,
        module: row.module,
        link: row.link,
        icon: row.icon,
        isRead: row.is_read ?? false,
        readAt: row.read_at,
        createdAt: row.created_at,
    };
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    lastFetch: 0,
    realtimeActive: false,

    fetchNotifications: async () => {
        try {
            const data = await gql(`query($t: String!, $uid: String!) {
                notifications(tenantId: $t, userId: $uid) {
                    id title message module link icon isRead readAt createdAt
                }
            }`, { t: DEFAULT_TENANT_ID, uid: USER_ID });

            const notifs = (data.notifications || []) as Notification[];
            set({
                notifications: notifs,
                unreadCount: notifs.filter(n => !n.isRead).length,
                lastFetch: Date.now(),
            });
        } catch {
            // Silent fail — don't disrupt UX
        }
    },

    markRead: async (id: string) => {
        try {
            await gql(`mutation($id: String!) { markNotificationRead(id: $id) { id } }`, { id });
            const { notifications } = get();
            const updated = notifications.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n);
            set({
                notifications: updated,
                unreadCount: updated.filter(n => !n.isRead).length,
            });
        } catch { /* silent */ }
    },

    markAllRead: async () => {
        try {
            await gql(`mutation($t: String!, $uid: String!) { markAllNotificationsRead(tenantId: $t, userId: $uid) }`, {
                t: DEFAULT_TENANT_ID, uid: USER_ID,
            });
            const { notifications } = get();
            set({
                notifications: notifications.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })),
                unreadCount: 0,
            });
        } catch { /* silent */ }
    },

    startPolling: () => {
        // Initial fetch
        get().fetchNotifications();

        // ── Attempt Supabase Realtime subscription ──
        let channel: RealtimeChannel | null = null;
        let pollingInterval: ReturnType<typeof setInterval> | null = null;

        try {
            const supabase = getSupabaseClient();
            channel = supabase
                .channel('notifications-realtime')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${USER_ID}`,
                    },
                    (payload) => {
                        // Real-time INSERT — prepend to existing notifications
                        const newNotif = mapRow(payload.new);
                        const { notifications } = get();
                        set({
                            notifications: [newNotif, ...notifications],
                            unreadCount: [newNotif, ...notifications].filter(n => !n.isRead).length,
                            lastFetch: Date.now(),
                        });
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${USER_ID}`,
                    },
                    (payload) => {
                        // Real-time UPDATE — update matching notification
                        const updated = mapRow(payload.new);
                        const { notifications } = get();
                        const mapped = notifications.map(n => n.id === updated.id ? updated : n);
                        set({
                            notifications: mapped,
                            unreadCount: mapped.filter(n => !n.isRead).length,
                            lastFetch: Date.now(),
                        });
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        set({ realtimeActive: true });
                        // With Realtime active, reduce polling to a 2-minute heartbeat
                        if (pollingInterval) clearInterval(pollingInterval);
                        pollingInterval = setInterval(() => get().fetchNotifications(), 120_000);
                    } else {
                        set({ realtimeActive: false });
                    }
                });
        } catch {
            // Realtime failed to initialize — fall through to polling
        }

        // ── Fallback polling (30s) — will be replaced if Realtime connects ──
        if (!pollingInterval) {
            pollingInterval = setInterval(() => get().fetchNotifications(), POLL_INTERVAL);
        }

        // Cleanup function
        return () => {
            if (pollingInterval) clearInterval(pollingInterval);
            if (channel) {
                try { getSupabaseClient().removeChannel(channel); } catch { /* ignore */ }
            }
        };
    },
}));
