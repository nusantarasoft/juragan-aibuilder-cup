import { create } from 'zustand';

export type Scada3dElementType = 'chiller' | 'pump' | 'cooling_tower' | 'valve' | 'pipe' | 'robot';

export interface Scada3dElement {
    id: string;
    type: Scada3dElementType;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    properties: Record<string, any>;
}

interface Scada3dStoreState {
    elements: Scada3dElement[];
    
    // Actions
    setElements: (elements: Scada3dElement[]) => void;
    addElement: (element: Omit<Scada3dElement, 'id'>) => void;
    updateElement: (id: string, updates: Partial<Scada3dElement>) => void;
    deleteElement: (id: string) => void;
}

const generateId = (type: string) => `${type.toUpperCase()}-${Math.random().toString(36).substr(2, 5)}`;

export const useScada3dStore = create<Scada3dStoreState>((set) => ({
    elements: [
        { id: 'CHILLER-01', type: 'chiller', position: [-8, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Primary Chiller', thermalMode: false, alarm: false } },
        { id: 'PUMP-CW-01', type: 'pump', position: [2, 0, 2], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Condenser Water Pump' } },
        { id: 'VALVE-01', type: 'valve', position: [-2, 0.5, 4], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Main Valve', isOpen: true } },
        { id: 'VALVE-02', type: 'valve', position: [5, 1.5, -6], rotation: [0, 0, Math.PI/2], scale: [1, 1, 1], properties: { name: 'Secondary Valve', isOpen: true } },
        { id: 'CT-01', type: 'cooling_tower', position: [10, 0, -6], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Cooling Tower 1', alarm: false } },
        { id: 'ROBOT-01', type: 'robot', position: [0, 0, 8], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Assembly Arm' } },
    ],
    
    setElements: (elements) => set({ elements }),
    
    addElement: (element) => set((state) => {
        const newEl: Scada3dElement = {
            ...element,
            id: generateId(element.type),
        };
        return { elements: [...state.elements, newEl] };
    }),
    
    updateElement: (id, updates) => set((state) => ({
        elements: state.elements.map(el => el.id === id ? { ...el, ...updates } : el)
    })),
    
    deleteElement: (id) => set((state) => ({
        elements: state.elements.filter(el => el.id !== id),
    })),
}));
