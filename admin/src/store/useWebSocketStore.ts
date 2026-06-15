import { create } from 'zustand';

export interface CursorPosition {
    id: string;
    x: number;
    y: number;
    color: string;
    name: string;
}

interface WebSocketState {
    isConnected: boolean;
    lastPing: number | null;
    telemetryData: any;
    activeAlarms: number;
    cursors: Record<string, CursorPosition>;
    setIsConnected: (connected: boolean) => void;
    setLastPing: (time: number) => void;
    updateTelemetry: (data: any) => void;
    updateCursor: (cursor: CursorPosition) => void;
    removeCursor: (id: string) => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
    isConnected: false,
    lastPing: null,
    telemetryData: null,
    activeAlarms: 0,
    cursors: {},
    setIsConnected: (connected) => set({ isConnected: connected }),
    setLastPing: (time) => set({ lastPing: time }),
    updateTelemetry: (data) => set((state) => ({ 
        telemetryData: { ...state.telemetryData, ...data },
        activeAlarms: data.activeAlarms !== undefined ? data.activeAlarms : state.activeAlarms,
    })),
    updateCursor: (cursor) => set((state) => ({
        cursors: { ...state.cursors, [cursor.id]: cursor }
    })),
    removeCursor: (id) => set((state) => {
        const newCursors = { ...state.cursors };
        delete newCursors[id];
        return { cursors: newCursors };
    }),
}));
