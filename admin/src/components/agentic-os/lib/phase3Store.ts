"use client";

/**
 * Agentic OS — Phase 3 store: Memory Map (MAPS "M"), Workflows and workflow
 * runs. Kept apart from the core snapshot so the Virtual Office and older apps
 * keep working even if these endpoints are unavailable.
 */

import { create } from "zustand";
import { fetchPhase3, type Phase3Snapshot } from "./api";
import { useAosStore } from "./store";
import type { OsMemoryArea, OsMemoryItem, OsWorkflow, OsWorkflowRun } from "./types";

interface Phase3State {
    areas: OsMemoryArea[];
    items: OsMemoryItem[];
    workflows: OsWorkflow[];
    workflowRuns: OsWorkflowRun[];
    includeArchived: boolean;
    state: "idle" | "loading" | "ready" | "unavailable";
    error: string | null;
    lastSync: number | null;
    refresh: () => Promise<Phase3Snapshot | null>;
    setIncludeArchived: (on: boolean) => void;
}

let inflight: Promise<Phase3Snapshot | null> | null = null;

export const usePhase3Store = create<Phase3State>((set, get) => ({
    areas: [],
    items: [],
    workflows: [],
    workflowRuns: [],
    includeArchived: false,
    state: "idle",
    error: null,
    lastSync: null,

    refresh: () => {
        if (inflight) return inflight;
        if (get().state === "idle") set({ state: "loading" });
        inflight = fetchPhase3(get().includeArchived)
            .then((p) => {
                set({ ...p, state: "ready", error: null, lastSync: Date.now() });
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

/** Run a mutation through the core toast/refresh helper, then refresh Phase 3 data too. */
export async function runP3<T>(label: string, fn: () => Promise<T>, opts?: { silent?: boolean }): Promise<T | null> {
    const out = await useAosStore.getState().run(label, fn, opts);
    void usePhase3Store.getState().refresh();
    return out;
}

/* Ref-counted polling (same pattern as the other stores). */
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
    if (ms > 0) timer = setInterval(() => void usePhase3Store.getState().refresh(), ms);
}

export function startPhase3Polling(ms: number): () => void {
    const id = ++seq;
    pollers.set(id, ms);
    reschedule();
    void usePhase3Store.getState().refresh();
    return () => {
        pollers.delete(id);
        reschedule();
    };
}
