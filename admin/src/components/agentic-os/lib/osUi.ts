"use client";

/**
 * Agentic OS — UI launcher store. Lives apart from `registry.tsx` so apps can
 * open other apps without importing the registry (avoids circular imports).
 */

import { create } from "zustand";

export type AppId = "overview" | "studio" | "tasks" | "playbooks" | "governance" | "memory" | "pulse" | "workflows" | "brain" | "settings";
export type AppParams = Record<string, string>;

interface OsUiState {
    open: boolean;
    request: { app: AppId; params: AppParams; nonce: number } | null;
    launch: (app?: AppId, params?: AppParams) => void;
    close: () => void;
}

export const useOsUi = create<OsUiState>((set) => ({
    open: false,
    request: null,
    launch: (app = "overview", params = {}) => set({ open: true, request: { app, params, nonce: Date.now() } }),
    close: () => set({ open: false }),
}));
