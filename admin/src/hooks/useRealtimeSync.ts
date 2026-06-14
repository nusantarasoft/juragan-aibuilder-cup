"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE";

interface UseRealtimeSyncOptions {
    /** The Postgres table to subscribe to. */
    table: string;
    /** Optional Supabase Realtime filter, e.g. `project_id=eq.abc123`. */
    filter?: string;
    /** Callback fired on every CDC event. */
    onEvent: (
        eventType: RealtimeEventType,
        newRecord: Record<string, any> | null,
        oldRecord: Record<string, any> | null,
    ) => void;
    /** Schema to watch. Defaults to `public`. */
    schema?: string;
    /** Whether the subscription is enabled. Defaults to `true`. */
    enabled?: boolean;
}

interface UseRealtimeSyncReturn {
    /** Whether the channel is currently in the SUBSCRIBED state. */
    isConnected: boolean;
    /** Raw channel status string from Supabase Realtime. */
    channelStatus: string;
}

/**
 * A reusable React hook for Supabase Realtime CDC (postgres_changes).
 *
 * Subscribes to INSERT, UPDATE, and DELETE events on a given table.
 * Handles auto-reconnect on disconnect and cleans up on unmount.
 *
 * Usage:
 * ```ts
 * const { isConnected, channelStatus } = useRealtimeSync({
 *     table: "pm_tasks",
 *     filter: `project_id=eq.${projectId}`,
 *     onEvent: (type, newRec, oldRec) => { ... },
 * });
 * ```
 */
export function useRealtimeSync({
    table,
    filter,
    onEvent,
    schema = "public",
    enabled = true,
}: UseRealtimeSyncOptions): UseRealtimeSyncReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [channelStatus, setChannelStatus] = useState<string>("CLOSED");

    // Store onEvent in a ref so we don't re-subscribe when callback identity changes
    const onEventRef = useRef(onEvent);
    onEventRef.current = onEvent;

    const channelRef = useRef<RealtimeChannel | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cleanup = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        if (channelRef.current) {
            try {
                getSupabaseClient().removeChannel(channelRef.current);
            } catch {
                /* ignore */
            }
            channelRef.current = null;
        }
        setIsConnected(false);
        setChannelStatus("CLOSED");
    }, []);

    const subscribe = useCallback(() => {
        // Clean previous channel if any
        cleanup();

        if (!enabled) return;

        try {
            const supabase = getSupabaseClient();
            const channelName = `realtime-${table}-${filter || "all"}-${Date.now()}`;

            const baseFilter: { event: string; schema: string; table: string; filter?: string } = {
                event: "*" as any,
                schema,
                table,
            };
            if (filter) baseFilter.filter = filter;

            // Subscribe to INSERT
            const channel = supabase
                .channel(channelName)
                .on(
                    "postgres_changes" as any,
                    { event: "INSERT", schema, table, ...(filter ? { filter } : {}) },
                    (payload: any) => {
                        onEventRef.current("INSERT", payload.new ?? null, null);
                    },
                )
                .on(
                    "postgres_changes" as any,
                    { event: "UPDATE", schema, table, ...(filter ? { filter } : {}) },
                    (payload: any) => {
                        onEventRef.current("UPDATE", payload.new ?? null, payload.old ?? null);
                    },
                )
                .on(
                    "postgres_changes" as any,
                    { event: "DELETE", schema, table, ...(filter ? { filter } : {}) },
                    (payload: any) => {
                        onEventRef.current("DELETE", null, payload.old ?? null);
                    },
                )
                .subscribe((status: string) => {
                    setChannelStatus(status);
                    if (status === "SUBSCRIBED") {
                        setIsConnected(true);
                    } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
                        setIsConnected(false);
                        // Auto-reconnect after 5 seconds
                        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
                        reconnectTimerRef.current = setTimeout(() => {
                            subscribe();
                        }, 5000);
                    } else {
                        setIsConnected(false);
                    }
                });

            channelRef.current = channel;
        } catch {
            // Supabase client might not be available (SSR), fall through
            setIsConnected(false);
            setChannelStatus("ERROR");
        }
    }, [table, filter, schema, enabled, cleanup]);

    useEffect(() => {
        subscribe();
        return cleanup;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [table, filter, schema, enabled]);

    return { isConnected, channelStatus };
}
