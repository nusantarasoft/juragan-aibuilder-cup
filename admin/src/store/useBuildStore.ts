import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PlacedItem {
    id: string;
    type: string;
    position: [number, number, number];
    rotationY: number;
    scale?: [number, number, number];
    pathType?: string; // e.g., 'patrol' or 'waypoint'
    waypoints?: [number, number, number][]; // List of points for movement
}

interface BuildStore {
    // PM Construction Scene
    pmObjects: PlacedItem[];
    addPmObject: (obj: PlacedItem) => void;
    updatePmObject: (id: string, updates: Partial<PlacedItem>) => void;
    removePmObject: (id: string) => void;
    clearPmObjects: () => void;

    // DCIM Data Center Scene (for custom added racks/units)
    dcimObjects: PlacedItem[];
    addDcimObject: (obj: PlacedItem) => void;
    updateDcimObject: (id: string, updates: Partial<PlacedItem>) => void;
    removeDcimObject: (id: string) => void;
    clearDcimObjects: () => void;

    // Global Edit Mode State
    editMode: boolean;
    setEditMode: (mode: boolean) => void;
    gridSnap: boolean;
    setGridSnap: (snap: boolean) => void;
    transformMode: 'translate' | 'rotate';
    setTransformMode: (mode: 'translate' | 'rotate') => void;
}

export const useBuildStore = create<BuildStore>()(
    persist(
        (set) => ({
            // PM
            pmObjects: [],
            addPmObject: (obj) => set((state) => ({ pmObjects: [...state.pmObjects, obj] })),
            updatePmObject: (id, updates) => set((state) => ({
                pmObjects: state.pmObjects.map(o => o.id === id ? { ...o, ...updates } : o)
            })),
            removePmObject: (id) => set((state) => ({
                pmObjects: state.pmObjects.filter(o => o.id !== id)
            })),
            clearPmObjects: () => set({ pmObjects: [] }),

            // DCIM
            dcimObjects: [],
            addDcimObject: (obj) => set((state) => ({ dcimObjects: [...state.dcimObjects, obj] })),
            updateDcimObject: (id, updates) => set((state) => ({
                dcimObjects: state.dcimObjects.map(o => o.id === id ? { ...o, ...updates } : o)
            })),
            removeDcimObject: (id) => set((state) => ({
                dcimObjects: state.dcimObjects.filter(o => o.id !== id)
            })),
            clearDcimObjects: () => set({ dcimObjects: [] }),

            // Global UI State (Not persisted, but kept here for cross-component sync)
            editMode: false,
            setEditMode: (editMode) => set({ editMode }),
            gridSnap: true,
            setGridSnap: (gridSnap) => set({ gridSnap }),
            transformMode: 'translate',
            setTransformMode: (transformMode) => set({ transformMode }),
        }),
        {
            name: 'ns-build-storage', // unique name for localStorage
            partialize: (state) => ({ 
                pmObjects: state.pmObjects, 
                dcimObjects: state.dcimObjects,
                gridSnap: state.gridSnap, // Keep user's grid preference
            }), 
        }
    )
);
