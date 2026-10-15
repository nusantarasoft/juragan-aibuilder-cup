"use client";

/**
 * Agentic OS — shared client store. Used by the OS apps and by the Virtual
 * Office data source, so both always show the same agents, tasks and settings.
 */

import { create } from "zustand";
import { AosError, fetchSnapshot, subscribeAosTaskQueue, type AosSnapshot } from "./api";
import type { OsAgent, OsApproval, OsPlaybook, OsSettings, OsStats, OsTask } from "./types";

export interface Toast {
    id: number;
    kind: "success" | "error" | "info";
    text: string;
}

interface AosState {
    agents: OsAgent[];
    playbooks: OsPlaybook[];
    tasks: OsTask[];
    approvals: OsApproval[];
    settings: OsSettings | null;
    stats: OsStats | null;

    status: "idle" | "loading" | "ready" | "error";
    error: string | null;
    lastSync: number | null;
    includeArchived: boolean;
    toasts: Toast[];

    refresh: () => Promise<AosSnapshot | null>;
    setIncludeArchived: (on: boolean) => void;
    /** Run a mutation with toast feedback, then refresh. Returns the result or null on failure. */
    run: <T>(label: string, fn: () => Promise<T>, opts?: { silent?: boolean }) => Promise<T | null>;
    toast: (kind: Toast["kind"], text: string) => void;
    dismiss: (id: number) => void;
}

let toastSeq = 0;
let inflight: Promise<AosSnapshot | null> | null = null;

export const useAosStore = create<AosState>((set, get) => ({
    agents: [],
    playbooks: [],
    tasks: [],
    approvals: [],
    settings: null,
    stats: null,

    status: "idle",
    error: null,
    lastSync: null,
    includeArchived: false,
    toasts: [],

    refresh: () => {
        if (inflight) return inflight;
        if (get().status === "idle") set({ status: "loading" });
        inflight = fetchSnapshot(get().includeArchived)
            .then((snap) => {
                set({
                    agents: snap.agents ?? [],
                    playbooks: snap.playbooks ?? [],
                    tasks: snap.tasks ?? [],
                    approvals: snap.approvals ?? [],
                    settings: snap.settings ?? get().settings,
                    stats: snap.stats ?? get().stats,
                    status: "ready",
                    error: null,
                    lastSync: Date.now(),
                });
                return snap;
            })
            .catch((e: unknown) => {
                set({ status: get().lastSync ? "ready" : "error", error: e instanceof Error ? e.message : String(e) });
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

    run: async (label, fn, opts) => {
        try {
            const out = await fn();
            if (!opts?.silent) get().toast("success", label);
            void get().refresh();
            return out;
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            get().toast("error", e instanceof AosError && e.unauthorized ? "Sign in to the admin to make changes." : msg);
            return null;
        }
    },

    toast: (kind, text) => {
        const id = ++toastSeq;
        set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, text }] }));
        setTimeout(() => get().dismiss(id), kind === "error" ? 6000 : 3200);
    },

    dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/* ------------------------------------------------------------------ */
/* Ref-counted polling: many components can ask, one timer runs.       */
/* ------------------------------------------------------------------ */

const pollers = new Map<number, number>();
let pollerSeq = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let currentMs = 0;

function reschedule() {
    const ms = pollers.size ? Math.min(...pollers.values()) : 0;
    if (ms === currentMs) return;
    if (timer) clearInterval(timer);
    timer = null;
    currentMs = ms;
    if (ms > 0) timer = setInterval(() => void useAosStore.getState().refresh(), ms);
}

/** Start polling at `ms` (the fastest requested interval wins). Returns a stop function. */
let taskQueueSubStop: (() => void) | null = null;

function ensureTaskQueueSubscription(): void {
    if (typeof window === "undefined" || taskQueueSubStop) return;
    taskQueueSubStop = subscribeAosTaskQueue((ev) => {
        const state = useAosStore.getState();
        if (ev.stats) {
            useAosStore.setState({ stats: ev.stats, lastSync: Date.now() });
        }
        if (ev.task) {
            const tasks = [...state.tasks];
            const idx = tasks.findIndex((t) => t.id === ev.task!.id);
            if (idx >= 0) tasks[idx] = ev.task;
            else tasks.unshift(ev.task);
            useAosStore.setState({ tasks, lastSync: Date.now(), status: "ready" });
        } else {
            void state.refresh();
        }
    });
}

export function startAosPolling(ms: number): () => void {
    ensureTaskQueueSubscription();
    const id = ++pollerSeq;
    pollers.set(id, ms);
    reschedule();
    void useAosStore.getState().refresh();
    return () => {
        pollers.delete(id);
        reschedule();
    };
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

export const agentById = (agents: OsAgent[], id: string | null | undefined) => agents.find((a) => a.id === id || a.slug === id);

export const STATUS_ORDER: OsTask["status"][] = ["queued", "running", "awaiting_approval", "review", "done", "failed", "cancelled"];
