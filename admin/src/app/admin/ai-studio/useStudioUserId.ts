"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAuthStore } from "@/store/useAuthStore";

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidStudioUserId(id?: string | null): id is string {
    const v = id?.trim();
    return Boolean(v && UUID_RE.test(v));
}

/**
 * Single source of truth for AI Studio user id.
 * Prefers live AuthContext over persisted Zustand store (avoids stale localStorage ids).
 */
export function useStudioUserId(): string | undefined {
    const { user: contextUser, loading } = useAuth();
    const storeUserId = useAuthStore((s) => s.user?.id);
    const raw = contextUser?.id ?? storeUserId;

    useEffect(() => {
        if (loading || !raw) return;
        if (!isValidStudioUserId(raw)) {
            console.warn(
                "[AI Studio] Invalid user id in session — sign out and sign in again.",
                raw,
            );
        } else if (storeUserId && contextUser?.id && storeUserId !== contextUser.id) {
            console.warn(
                "[AI Studio] Auth store id differs from session — using live session id.",
            );
        }
    }, [loading, raw, storeUserId, contextUser?.id]);

    return isValidStudioUserId(raw) ? raw : undefined;
}
