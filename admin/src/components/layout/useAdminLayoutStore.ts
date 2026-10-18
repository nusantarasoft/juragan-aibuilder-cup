"use client";

import { create } from "zustand";

export type AdminPanelId = "left" | "right";
export type AdminPanelMode = "pinned-left" | "pinned-right" | "windowed" | "minimized";

export interface AdminPanelState {
    mode: AdminPanelMode;
    lastPin: "pinned-left" | "pinned-right";
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
}

const MIN_PILL_W = 284;
const MIN_PILL_H = 34;
const SNAP_EDGE_PX = 56;
const OUTER_COLLAPSED_WIDTH = 64;
const INNER_COLLAPSED_WIDTH = 68;

export const DEFAULT_ADMIN_PANELS: Record<AdminPanelId, AdminPanelState> = {
    left: { mode: "pinned-left", lastPin: "pinned-left", x: 16, y: 12, w: 260, h: 600, z: 40 },
    right: { mode: "pinned-left", lastPin: "pinned-left", x: 288, y: 12, w: 248, h: 600, z: 41 },
};

export function readInitialDarkMode(): boolean {
    if (typeof window === "undefined") return true;
    try {
        if (!localStorage.getItem("ns.admin.aosDarkInit.v1")) {
            localStorage.setItem("ns.admin.aosDarkInit.v1", "1");
            localStorage.setItem("cms-dark-mode", "true");
            document.documentElement.classList.add("dark");
            return true;
        }
        const saved = localStorage.getItem("cms-dark-mode");
        const isDark = saved === null ? true : saved === "true";
        if (isDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        return isDark;
    } catch {
        return true;
    }
}

interface AdminLayoutState {
    panels: Record<AdminPanelId, AdminPanelState>;
    dropEdge: "left" | "right" | null;
    focus: boolean;
    darkMode: boolean;
    setDarkMode: (dark: boolean) => void;
    patchPanel: (id: AdminPanelId, p: Partial<AdminPanelState>) => void;
    bringFront: (id: AdminPanelId) => void;
    setDropEdge: (edge: "left" | "right" | null) => void;
    toggleFocus: () => void;
    resetLayout: () => void;
}

export const useAdminLayout = create<AdminLayoutState>((set, get) => ({
    panels: {
        left: { ...DEFAULT_ADMIN_PANELS.left },
        right: { ...DEFAULT_ADMIN_PANELS.right },
    },
    dropEdge: null,
    focus: false,
    darkMode: readInitialDarkMode(),
    setDarkMode: (darkMode) => set({ darkMode }),
    patchPanel: (id, p) =>
        set((s) => {
            const cur = s.panels[id];
            const nextMode = p.mode ?? cur.mode;
            const lastPin =
                nextMode === "pinned-left" || nextMode === "pinned-right"
                    ? nextMode
                    : p.lastPin ?? cur.lastPin;
            return {
                panels: {
                    ...s.panels,
                    [id]: { ...cur, ...p, lastPin },
                },
            };
        }),
    bringFront: (id) => {
        const s = get();
        const topZ = Math.max(s.panels.left.z, s.panels.right.z);
        if (s.panels[id].z <= topZ) {
            set({
                panels: {
                    ...s.panels,
                    [id]: { ...s.panels[id], z: topZ + 1 },
                },
            });
        }
    },
    setDropEdge: (dropEdge) => set({ dropEdge }),
    toggleFocus: () => set((s) => ({ focus: !s.focus })),
    resetLayout: () =>
        set({
            panels: {
                left: { ...DEFAULT_ADMIN_PANELS.left },
                right: { ...DEFAULT_ADMIN_PANELS.right },
            },
            dropEdge: null,
            focus: false,
        }),
}));

