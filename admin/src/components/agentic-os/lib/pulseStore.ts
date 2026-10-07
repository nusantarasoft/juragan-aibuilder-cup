"use client";

/**
 * Agentic OS — Pulse store (MAPS "P"). Routines, run log, queue, caps and
 * approval history. Kept apart from the core snapshot so the Virtual Office
 * and Phase 1 apps keep working even if the Pulse backend is unavailable.
 */

import { create } from "zustand";
import { fetchPulse, type PulseSnapshot } from "./api";
import { useAosStore } from "./store";
import type { OsApproval, OsPulseSettings, OsPulseStatus, OsRoutine, OsRun, OsRunQueueItem } from "./types";

interface PulseState {
    routines: OsRoutine[];
    runs: OsRun[];
    queue: OsRunQueueItem[];
    status: OsPulseStatus | null;
    settings: OsPulseSettings | null;
    /** All approvals (pending + decided), newest first. */
    approvalHistory: OsApproval[];
    includeArchived: boolean;
    state: "idle" | "loading" | "ready" | "unavailable";
    error: string | null;
    lastSync: number | null;
    refresh: () => Promise<PulseSnapshot | null>;
    setIncludeArchived: (on: boolean) => void;
}

let inflight: Promise<PulseSnapshot | null> | null = null;

export const usePulseStore = create<PulseState>((set, get) => ({
    routines: [],
    runs: [],
    queue: [],
    status: null,
    settings: null,
    approvalHistory: [],
    includeArchived: false,
    state: "idle",
    error: null,
    lastSync: null,

    refresh: () => {
        if (inflight) return inflight;
        if (get().state === "idle") set({ state: "loading" });
        inflight = fetchPulse(get().includeArchived)
            .then((p) => {
                set({
                    routines: p.routines,
                    runs: p.runs,
                    queue: p.queue,
                    status: p.status,
                    settings: p.settings,
                    approvalHistory: p.approvals,
                    state: "ready",
                    error: null,
                    lastSync: Date.now(),
                });
                return p;
            })
            .catch((e: unknown) => {
                set({ state: get().lastSync ? "ready" : "unavailable", error: e instanceof Error ? e.message : String(e) });
                return null;
            })
            .finally(() => {
                inflight = null;
            });
        return inflight;
    },

    setIncludeArchived: (on) => {
        set({ includeArchived: on });
        void get().refresh();
    },
}));

/** Run a mutation through the core toast/refresh helper, then refresh Pulse data too. */
export async function runPulse<T>(label: string, fn: () => Promise<T>, opts?: { silent?: boolean }): Promise<T | null> {
    const out = await useAosStore.getState().run(label, fn, opts);
    void usePulseStore.getState().refresh();
    return out;
}

/* Ref-counted polling (same pattern as the core store). */
const pollers = new Map<number, number>();
let seq = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let current = 0;

function reschedule() {
    const ms = pollers.size ? Math.min(...pollers.values()) : 0;
    if (ms === current) return;
    if (timer) clearInterval(timer);
    timer = null;
    current = ms;
    if (ms > 0) timer = setInterval(() => void usePulseStore.getState().refresh(), ms);
}

export function startPulsePolling(ms: number): () => void {
    const id = ++seq;
    pollers.set(id, ms);
    reschedule();
    void usePulseStore.getState().refresh();
    return () => {
        pollers.delete(id);
        reschedule();
    };
}
