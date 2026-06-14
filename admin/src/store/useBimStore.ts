import { create } from 'zustand';

interface BimState {
    selectedModelId: string | null;
    selectedElementId: string | null;
    
    setSelectedModel: (id: string | null) => void;
    setSelectedElement: (id: string | null) => void;
}

export const useBimStore = create<BimState>()((set) => ({
    selectedModelId: null,
    selectedElementId: null,
    
    setSelectedModel: (id) => set({ selectedModelId: id, selectedElementId: null }),
    setSelectedElement: (id) => set({ selectedElementId: id }),
}));
