import { create } from 'zustand';

export type Scada3dElementType = 
    // Primitives
    | 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane'
    // HVAC/MEP
    | 'chiller' | 'pump' | 'cooling_tower' | 'valve' | 'ahu' | 'fcu' | 'damper' | 'exhaust_fan' | 'duct'
    // Electrical
    | 'transformer' | 'generator' | 'ups' | 'ats' | 'pdu' | 'switchgear' | 'mcc' | 'panel'
    // Data Center
    | 'server_rack' | 'cable_tray' | 'crac' | 'fire_suppression' | 'access_floor'
    // Building
    | 'wall' | 'floor' | 'column' | 'door' | 'stairs' | 'window' | 'roof'
    // Piping
    | 'pipe' | 'elbow' | 'tee' | 'reducer' | 'flange'
    // Other
    | 'robot';

export interface Scada3dElement {
    id: string;
    type: Scada3dElementType;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    tagId?: string;
    groupId?: string;
    properties: Record<string, any>;
}

interface Scada3dStoreState {
    elements: Scada3dElement[];
    history: Scada3dElement[][];
    historyIndex: number;
    
    setElements: (elements: Scada3dElement[]) => void;
    addElement: (element: Omit<Scada3dElement, 'id'>) => void;
    updateElement: (id: string, updates: Partial<Scada3dElement>) => void;
    deleteElement: (id: string) => void;
    duplicateElement: (id: string) => void;
    
    // History
    undo: () => void;
    redo: () => void;
    pushHistory: () => void;
}

let idCounter = 100;
const genId = (type: string) => `${type.toUpperCase()}-${++idCounter}`;

export const useScada3dStore = create<Scada3dStoreState>((set, get) => ({
    elements: [
        { id: 'CHILLER-01', type: 'chiller', position: [-8, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], tagId: 'tag_temp_1', properties: { name: 'Primary Chiller', thermalMode: false, alarm: false } },
        { id: 'PUMP-CW-01', type: 'pump', position: [2, 0, 2], rotation: [0, 0, 0], scale: [1, 1, 1], tagId: 'tag_pump_hz', properties: { name: 'Condenser Water Pump' } },
        { id: 'VALVE-01', type: 'valve', position: [-2, 0.5, 4], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Main Valve', isOpen: true } },
        { id: 'VALVE-02', type: 'valve', position: [5, 1.5, -6], rotation: [0, 0, Math.PI/2], scale: [1, 1, 1], properties: { name: 'Secondary Valve', isOpen: true } },
        { id: 'CT-01', type: 'cooling_tower', position: [10, 0, -6], rotation: [0, 0, 0], scale: [1, 1, 1], tagId: 'tag_ct_vib', properties: { name: 'Cooling Tower 1', alarm: false } },
        { id: 'ROBOT-01', type: 'robot', position: [0, 0, 8], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Assembly Arm' } },
    ],
    history: [],
    historyIndex: -1,
    
    pushHistory: () => set(state => {
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(state.elements)));
        return { history: newHistory.slice(-30), historyIndex: newHistory.length - 1 };
    }),
    
    setElements: (elements) => set({ elements }),
    
    addElement: (element) => {
        get().pushHistory();
        set(state => ({
            elements: [...state.elements, { ...element, id: genId(element.type) }]
        }));
    },
    
    updateElement: (id, updates) => set(state => ({
        elements: state.elements.map(el => el.id === id ? { ...el, ...updates } : el)
    })),
    
    deleteElement: (id) => {
        get().pushHistory();
        set(state => ({
            elements: state.elements.filter(el => el.id !== id)
        }));
    },
    
    duplicateElement: (id) => {
        get().pushHistory();
        set(state => {
            const el = state.elements.find(e => e.id === id);
            if (!el) return state;
            const newEl: Scada3dElement = {
                ...JSON.parse(JSON.stringify(el)),
                id: genId(el.type),
                position: [el.position[0] + 2, el.position[1], el.position[2] + 2] as [number, number, number],
                properties: { ...el.properties, name: `${el.properties.name || el.type} (copy)` }
            };
            return { elements: [...state.elements, newEl] };
        });
    },
    
    undo: () => set(state => {
        if (state.historyIndex < 0) return state;
        const elements = state.history[state.historyIndex];
        return { elements: JSON.parse(JSON.stringify(elements)), historyIndex: state.historyIndex - 1 };
    }),
    
    redo: () => set(state => {
        if (state.historyIndex >= state.history.length - 1) return state;
        const elements = state.history[state.historyIndex + 1];
        return { elements: JSON.parse(JSON.stringify(elements)), historyIndex: state.historyIndex + 1 };
    }),
}));
