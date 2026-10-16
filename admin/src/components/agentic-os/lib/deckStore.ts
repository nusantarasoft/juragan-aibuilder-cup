"use client";

/**
 * Agentic OS — Command Deck store: goals, gate reviews and deck stats, plus the
 * Deck's local layout preferences (persisted in localStorage). Kept apart from
 * the other stores so the Deck degrades gracefully if Phase 4 endpoints are
 * unavailable.
 */

import { useCallback, useEffect, useState } from "react";
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

export type SidePanelId = "left" | "right";
export type SidePanelMode = "pinned-left" | "pinned-right" | "windowed" | "minimized";

export interface SidePanelState {
    mode: SidePanelMode;
    lastPin: "pinned-left" | "pinned-right";
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
}

export interface DeckLayout {
    view: DeckView;
    names: boolean;
    motion: boolean;
    focus: boolean;
    graphHeight: number;
    collapsed: Record<string, boolean>;
    secondTz: string;
    goalId: string | null;
    panels: Record<SidePanelId, SidePanelState>;
}

export const DEFAULT_PANELS: Record<SidePanelId, SidePanelState> = {
    left: { mode: "pinned-left", lastPin: "pinned-left", x: 20, y: 14, w: 300, h: 540, z: 20 },
    right: { mode: "pinned-right", lastPin: "pinned-right", x: -1, y: 14, w: 300, h: 540, z: 21 },
};

export const DEFAULT_LAYOUT: DeckLayout = {
    view: "rings",
    names: true,
    motion: true,
    focus: false,
    graphHeight: 560,
    collapsed: {},
    secondTz: "Europe/London",
    goalId: null,
    panels: DEFAULT_PANELS,
};

const LS_KEY = "aos.deck.layout.v1";

function loadLayout(): DeckLayout {
    if (typeof window === "undefined") return DEFAULT_LAYOUT;
    try {
        const raw = window.localStorage.getItem(LS_KEY);
        if (!raw) return DEFAULT_LAYOUT;
        const v = JSON.parse(raw) as Partial<DeckLayout>;
        const panels: Record<SidePanelId, SidePanelState> = {
            left: { ...DEFAULT_PANELS.left, ...(v.panels?.left ?? {}) },
            right: { ...DEFAULT_PANELS.right, ...(v.panels?.right ?? {}) },
        };
        return {
            ...DEFAULT_LAYOUT,
            ...v,
            view: DECK_VIEWS.includes(v.view as DeckView) ? (v.view as DeckView) : DEFAULT_LAYOUT.view,
            panels,
        };
    } catch {
        return DEFAULT_LAYOUT;
    }
}

interface DeckUiState extends DeckLayout {
    hydrated: boolean;
    hydrate: () => void;
    patch: (p: Partial<DeckLayout>) => void;
    patchPanel: (id: SidePanelId, p: Partial<SidePanelState>) => void;
    toggleCollapsed: (panel: string) => void;
    reset: () => void;
}

const persist = (s: DeckLayout) => {
    try {
        const { view, names, motion, focus, graphHeight, collapsed, secondTz, goalId, panels } = s;
        window.localStorage.setItem(LS_KEY, JSON.stringify({ view, names, motion, focus, graphHeight, collapsed, secondTz, goalId, panels }));
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
    patchPanel: (id, p) => {
        set((s) => {
            const cur = s.panels[id] ?? DEFAULT_PANELS[id];
            const nextMode = p.mode ?? cur.mode;
            const lastPin = nextMode === "pinned-left" || nextPinCheck(nextMode) ? (nextMode as "pinned-left" | "pinned-right") : p.lastPin ?? cur.lastPin;
            return {
                panels: {
                    ...s.panels,
                    [id]: { ...cur, ...p, lastPin },
                },
            };
        });
        persist(get());
    },
    toggleCollapsed: (panel) => {
        set((s) => ({ collapsed: { ...s.collapsed, [panel]: !s.collapsed[panel] } }));
        persist(get());
    },
    reset: () => {
        set({ ...DEFAULT_LAYOUT, panels: { left: { ...DEFAULT_PANELS.left }, right: { ...DEFAULT_PANELS.right } } });
        persist(get());
    },
}));

function nextPinCheck(m: SidePanelMode): m is "pinned-left" | "pinned-right" {
    return m === "pinned-left" || m === "pinned-right";
}

/* ------------------------------------------------------------------ */
/* Theme synchronization with Nusantarasoft main layout                */
/* ------------------------------------------------------------------ */

function readInitialDark(): boolean {
    if (typeof document === "undefined") return true;
    try {
        const saved = window.localStorage.getItem("cms-dark-mode");
        if (saved !== null) return saved === "true";
    } catch {
        /* ignore */
    }
    return true;
}

export function useAosTheme() {
    const [isDark, setIsDark] = useState<boolean>(readInitialDark);

    useEffect(() => {
        const initial = readInitialDark();
        setIsDark(initial);
        document.documentElement.classList.toggle("dark", initial);

        const onSync = (e: Event) => {
            const detail = (e as CustomEvent<boolean>).detail;
            if (typeof detail === "boolean") {
                setIsDark(detail);
                document.documentElement.classList.toggle("dark", detail);
            }
        };
        window.addEventListener("cms-theme-sync", onSync);

        const obs = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains("dark"));
        });
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

        return () => {
            window.removeEventListener("cms-theme-sync", onSync);
            obs.disconnect();
        };
    }, []);

    const setTheme = useCallback((nextDark: boolean) => {
        setIsDark(nextDark);
        try {
            window.localStorage.setItem("cms-dark-mode", String(nextDark));
        } catch {
            /* ignore */
        }
        document.documentElement.classList.toggle("dark", nextDark);
        document.dispatchEvent(new CustomEvent("cms-set-dark-mode", { detail: nextDark }));
        window.dispatchEvent(new CustomEvent("cms-theme-sync", { detail: nextDark }));
    }, []);

    return { isDark, light: !isDark, setTheme };
}


