import { create } from 'zustand';

interface BmsState {
    selectedSystemId: string | null;
    selectedZoneId: string | null;
    
    setSelectedSystem: (id: string | null) => void;
    setSelectedZone: (id: string | null) => void;
}

export const useBmsStore = create<BmsState>()((set) => ({
    selectedSystemId: null,
    selectedZoneId: null,
    
    setSelectedSystem: (id) => set({ selectedSystemId: id, selectedZoneId: null }),
    setSelectedZone: (id) => set({ selectedZoneId: id }),
}));
