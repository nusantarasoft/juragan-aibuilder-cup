"use client";

/**
 * Agentic OS — Command Deck store: goals, gate reviews and deck stats, plus the
 * Deck's local layout preferences (persisted in localStorage). Kept apart from
 * the other stores so the Deck degrades gracefully if Phase 4 endpoints are
 * unavailable.
 */

import { create } from "zustand";
import { fetchDeck, type DeckSnapshot } from "./api";
import { useAosStore } from "./store";
import type { OsDeckStats, OsGoal, OsGoalReview } from "./types";

interface DeckState {
    goals: OsGoal[];
    reviews: OsGoalReview[];
    stats: OsDeckStats | null;
    taskGoals: Record<string, string>;
    includeArchived: boolean;
    state: "idle" | "loading" | "ready" | "unavailable";
    error: string | null;
    lastSync: number | null;
    refresh: () => Promise<DeckSnapshot | null>;
    setIncludeArchived: (on: boolean) => void;
}

let inflight: Promise<DeckSnapshot | null> | null = null;

const localTz = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
    } catch {
        return "Asia/Jakarta";
    }
};

export const useDeckStore = create<DeckState>((set, get) => ({
    goals: [],
    reviews: [],
    stats: null,
    taskGoals: {},
    includeArchived: false,
    state: "idle",
    error: null,
    lastSync: null,

    refresh: () => {
        if (inflight) return inflight;
        if (get().state === "idle") set({ state: "loading" });
        inflight = fetchDeck(get().includeArchived, localTz())
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

/** Run a mutation through the core toast/refresh helper, then refresh deck data too. */
export async function runDeck<T>(label: string, fn: () => Promise<T>, opts?: { silent?: boolean }): Promise<T | null> {
    const out = await useAosStore.getState().run(label, fn, opts);
    void useDeckStore.getState().refresh();
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
    if (ms > 0) timer = setInterval(() => void useDeckStore.getState().refresh(), ms);
}

export function startDeckPolling(ms: number): () => void {
    const id = ++seq;
    pollers.set(id, ms);
    reschedule();
    void useDeckStore.getState().refresh();
    return () => {
        pollers.delete(id);
        reschedule();
    };
}

/* ------------------------------------------------------------------ */
/* Layout preferences (local, per browser)                             */
/* ------------------------------------------------------------------ */

export type DeckView = "rings" | "circle" | "areas" | "links" | "timeline" | "orbit";
export const DECK_VIEWS: DeckView[] = ["rings", "circle", "areas", "links", "timeline", "orbit"];

export interface DeckLayout {
    view: DeckView;
    names: boolean;
    motion: boolean;
    focus: boolean;
    graphHeight: number;
    collapsed: Record<string, boolean>;
    secondTz: string;
    goalId: string | null;
}

export const DEFAULT_LAYOUT: DeckLayout = {
    view: "rings",
    names: true,
    motion: true,
    focus: false,
    graphHeight: 560,
    collapsed: {},
    secondTz: "Europe/London",
    goalId: null,
};

const LS_KEY = "aos.deck.layout.v1";

function loadLayout(): DeckLayout {
    if (typeof window === "undefined") return DEFAULT_LAYOUT;
    try {
        const raw = window.localStorage.getItem(LS_KEY);
        if (!raw) return DEFAULT_LAYOUT;
        const v = JSON.parse(raw) as Partial<DeckLayout>;
        return { ...DEFAULT_LAYOUT, ...v, view: DECK_VIEWS.includes(v.view as DeckView) ? (v.view as DeckView) : DEFAULT_LAYOUT.view };
    } catch {
        return DEFAULT_LAYOUT;
    }
}

interface DeckUiState extends DeckLayout {
    hydrated: boolean;
    hydrate: () => void;
    patch: (p: Partial<DeckLayout>) => void;
    toggleCollapsed: (panel: string) => void;
    reset: () => void;
}

const persist = (s: DeckLayout) => {
    try {
        const { view, names, motion, focus, graphHeight, collapsed, secondTz, goalId } = s;
        window.localStorage.setItem(LS_KEY, JSON.stringify({ view, names, motion, focus, graphHeight, collapsed, secondTz, goalId }));
    } catch {
        /* storage full / disabled — layout just won't persist */
    }
};

export const useDeckUi = create<DeckUiState>((set, get) => ({
    ...DEFAULT_LAYOUT,
    hydrated: false,
    hydrate: () => {
        if (get().hydrated) return;
        set({ ...loadLayout(), hydrated: true });
    },
    patch: (p) => {
        set(p);
        persist(get());
    },
    toggleCollapsed: (panel) => {
        set((s) => ({ collapsed: { ...s.collapsed, [panel]: !s.collapsed[panel] } }));
        persist(get());
    },
    reset: () => {
        set({ ...DEFAULT_LAYOUT });
        persist(get());
    },
}));
