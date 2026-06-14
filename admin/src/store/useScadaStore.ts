import { create } from 'zustand';

interface ScadaState {
    selectedSourceId: string | null;
    selectedTagId: string | null;
    
    setSelectedSource: (id: string | null) => void;
    setSelectedTag: (id: string | null) => void;
}

export const useScadaStore = create<ScadaState>()((set) => ({
    selectedSourceId: null,
    selectedTagId: null,
    
    setSelectedSource: (id) => set({ selectedSourceId: id, selectedTagId: null }),
    setSelectedTag: (id) => set({ selectedTagId: id }),
}));
