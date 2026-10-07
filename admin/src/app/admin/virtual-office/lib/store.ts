import { create } from "zustand";
import type { Object3D } from "three";
import type { Lighting } from "./floorplan";
import type { ActivityEntry, Agent, AgentCommand, AgentDataSource, ChatMessage, DataMode, OfficeEvent, ZoneId } from "./types";

export type CameraMode = "overview" | "top" | "zone" | "follow" | "free";

interface OfficeState {
    agents: Agent[];
    activity: ActivityEntry[];
    chats: Record<string, ChatMessage[]>;
    /** Where agents come from: the Agentic OS database or the local demo simulation. */
    dataMode: DataMode;

    selectedId: string | null;
    hoveredId: string | null;
    /** Agent whose PC screen is open (live module view). */
    screenAgentId: string | null;

    cameraMode: CameraMode;
    focusZone: ZoneId | null;
    /** Bumped whenever the camera should (re)animate to the current mode. */
    cameraNonce: number;

    lighting: Lighting;
    showLabels: boolean;

    source: AgentDataSource | null;

    setSource: (source: AgentDataSource | null) => void;
    applyEvent: (event: OfficeEvent) => void;
    select: (id: string | null) => void;
    hover: (id: string | null) => void;
    openScreen: (agentId: string) => void;
    closeScreen: () => void;
    setCameraMode: (mode: CameraMode) => void;
    focusOnZone: (zone: ZoneId) => void;
    toggleLighting: () => void;
    toggleLabels: () => void;
    resetView: () => void;

    sendChat: (agentId: string, text: string) => void;
    dispatchTask: (title: string, agentId?: string) => Promise<string | null>;
    command: (agentId: string, cmd: AgentCommand) => void;
}

export const useOfficeStore = create<OfficeState>((set, get) => ({
    agents: [],
    activity: [],
    chats: {},
    dataMode: "connecting",

    selectedId: null,
    hoveredId: null,
    screenAgentId: null,

    cameraMode: "overview",
    focusZone: null,
    cameraNonce: 0,

    lighting: "night",
    showLabels: true,

    source: null,

    setSource: (source) => set({ source }),

    openScreen: (agentId) =>
        set((s) => ({ screenAgentId: agentId, selectedId: agentId, cameraMode: "follow", cameraNonce: s.cameraNonce + 1 })),

    closeScreen: () => set({ screenAgentId: null }),

    applyEvent: (event) => {
        switch (event.type) {
            case "agent.patch":
                set((s) => ({
                    agents: s.agents.map((a) => (a.id === event.agentId ? { ...a, ...event.patch } : a)),
                }));
                break;
            case "roster":
                set((s) => {
                    const ids = new Set(event.agents.map((a) => a.id));
                    return {
                        agents: event.agents,
                        selectedId: s.selectedId && !ids.has(s.selectedId) ? null : s.selectedId,
                        screenAgentId: s.screenAgentId && !ids.has(s.screenAgentId) ? null : s.screenAgentId,
                    };
                });
                break;
            case "mode":
                set({ dataMode: event.mode });
                break;
            case "activity":
                set((s) => (s.activity.some((x) => x.id === event.entry.id) ? s : { activity: [event.entry, ...s.activity].slice(0, 100) }));
                break;
            case "chat":
                set((s) => ({
                    chats: { ...s.chats, [event.agentId]: [...(s.chats[event.agentId] ?? []), event.message].slice(-60) },
                }));
                break;
        }
    },

    select: (id) =>
        set((s) =>
            id
                ? { selectedId: id, cameraMode: "follow", cameraNonce: s.cameraNonce + 1 }
                : { selectedId: null, cameraMode: s.cameraMode === "follow" ? "free" : s.cameraMode },
        ),

    hover: (id) => set({ hoveredId: id }),

    setCameraMode: (mode) =>
        set((s) => ({
            cameraMode: mode,
            focusZone: mode === "zone" ? s.focusZone : null,
            cameraNonce: s.cameraNonce + 1,
        })),

    focusOnZone: (zone) => set((s) => ({ cameraMode: "zone", focusZone: zone, cameraNonce: s.cameraNonce + 1 })),

    toggleLighting: () => set((s) => ({ lighting: s.lighting === "day" ? "night" : "day" })),

    toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),

    resetView: () =>
        set((s) => ({
            selectedId: null,
            hoveredId: null,
            screenAgentId: null,
            cameraMode: "overview",
            focusZone: null,
            cameraNonce: s.cameraNonce + 1,
        })),

    sendChat: (agentId, text) => {
        const message: ChatMessage = { id: Math.random().toString(36).slice(2), from: "user", text, ts: Date.now() };
        get().applyEvent({ type: "chat", agentId, message });
        void get().source?.sendMessage(agentId, text);
    },

    dispatchTask: async (title, agentId) => {
        const source = get().source;
        if (!source) return null;
        return source.dispatchTask({ title, agentId });
    },

    command: (agentId, cmd) => {
        void get().source?.command(agentId, cmd);
    },
}));

/** Live 3D objects of each avatar — used by the camera to frame/follow agents. */
export const agentObjects = new Map<string, Object3D>();
