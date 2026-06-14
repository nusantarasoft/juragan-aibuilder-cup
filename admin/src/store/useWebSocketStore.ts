import { create } from 'zustand';

interface WebSocketState {
    isConnected: boolean;
    lastPing: number | null;
    telemetryData: any;
    activeAlarms: number;
    setIsConnected: (connected: boolean) => void;
    setLastPing: (time: number) => void;
    updateTelemetry: (data: any) => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
    isConnected: false,
    lastPing: null,
    telemetryData: null,
    activeAlarms: 0,
    setIsConnected: (connected) => set({ isConnected: connected }),
    setLastPing: (time) => set({ lastPing: time }),
    updateTelemetry: (data) => set((state) => ({ 
        telemetryData: { ...state.telemetryData, ...data },
        activeAlarms: data.activeAlarms !== undefined ? data.activeAlarms : state.activeAlarms,
    })),
}));
