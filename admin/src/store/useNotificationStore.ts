import { create } from 'zustand';
import { gql, DEFAULT_TENANT_ID } from '@/lib/graphql';

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

    fetchNotifications: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    startPolling: () => () => void;
}

const POLL_INTERVAL = 30_000; // 30 seconds
const USER_ID = 'system'; // Will be dynamic once auth is wired

export const useNotificationStore = create<NotificationStore>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    lastFetch: 0,

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

        const interval = setInterval(() => {
            get().fetchNotifications();
        }, POLL_INTERVAL);

        return () => clearInterval(interval);
    },
}));
