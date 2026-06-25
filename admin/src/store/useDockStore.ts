import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DockWindowType {
    id: string;
    title: string;
    widgetType: 'athan' | 'calculator' | 'notes' | 'calendar' | 'snake' | 'pong';
    zIndex: number;
    minimized: boolean;
    width: number;
    height: number;
}

interface DockState {
    windows: DockWindowType[];
    activeWindowId: string | null;
    dockMode: 'auto' | 'always' | 'hidden';
    dockItemsOrder: string[];
    
    // Actions
    setDockMode: (mode: 'auto' | 'always' | 'hidden') => void;
    setDockItemsOrder: (order: string[]) => void;
    openWindow: (widgetType: DockWindowType['widgetType'], title: string, width?: number, height?: number) => void;
    closeWindow: (id: string) => void;
    minimizeWindow: (id: string) => void;
    restoreWindow: (id: string) => void;
    bringToFront: (id: string) => void;
}

let nextZIndex = 1000;

export const useDockStore = create<DockState>()(
    persist(
        (set, get) => ({
            windows: [],
            activeWindowId: null,
            dockMode: 'auto',
            dockItemsOrder: ['athan', 'calculator', 'notes', 'calendar', 'snake', 'pong'],

            setDockMode: (mode) => set({ dockMode: mode }),
            setDockItemsOrder: (order) => set({ dockItemsOrder: order }),

            openWindow: (widgetType, title, width = 400, height = 500) => {
                const state = get();
                // Check if already open
                const existing = state.windows.find(w => w.widgetType === widgetType);
                if (existing) {
                    if (existing.minimized) {
                        state.restoreWindow(existing.id);
                    } else {
                        state.bringToFront(existing.id);
                    }
                    return;
                }

                // Open new window
                const newId = `${widgetType}-${Date.now()}`;
                nextZIndex += 1;
                set({
                    windows: [...state.windows, {
                        id: newId,
                        title,
                        widgetType,
                        zIndex: nextZIndex,
                        minimized: false,
                        width,
                        height
                    }],
                    activeWindowId: newId
                });
            },

            closeWindow: (id) => set((state) => ({
                windows: state.windows.filter(w => w.id !== id),
                activeWindowId: state.activeWindowId === id ? null : state.activeWindowId
            })),

            minimizeWindow: (id) => set((state) => ({
                windows: state.windows.map(w => w.id === id ? { ...w, minimized: true } : w),
                activeWindowId: state.activeWindowId === id ? null : state.activeWindowId
            })),

            restoreWindow: (id) => {
                const state = get();
                nextZIndex += 1;
                set({
                    windows: state.windows.map(w => w.id === id ? { ...w, minimized: false, zIndex: nextZIndex } : w),
                    activeWindowId: id
                });
            },

            bringToFront: (id) => {
                const state = get();
                if (state.activeWindowId === id) return;
                nextZIndex += 1;
                set({
                    windows: state.windows.map(w => w.id === id ? { ...w, zIndex: nextZIndex } : w),
                    activeWindowId: id
                });
            }
        }),
        {
            name: 'dock-storage',
            partialize: (state) => ({ 
                dockMode: state.dockMode,
                dockItemsOrder: state.dockItemsOrder 
            }),
        }
    )
);
