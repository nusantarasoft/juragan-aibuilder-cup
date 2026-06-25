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
    // Landscape / World Building
    | 'tree' | 'bush' | 'road' | 'water' | 'grass'
    // Vehicles
    | 'truck' | 'forklift'
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

export type EnvironmentType = 'day' | 'night' | 'studio';

interface Scada3dStoreState {
    elements: Scada3dElement[];
    history: Scada3dElement[][];
    historyIndex: number;
    environment: EnvironmentType;
    
    setEnvironment: (env: EnvironmentType) => void;
    setElements: (elements: Scada3dElement[]) => void;
    addElement: (element: Omit<Scada3dElement, 'id'>) => void;
    updateElement: (id: string, updates: Partial<Scada3dElement>) => void;
    deleteElement: (id: string) => void;
    duplicateElement: (id: string) => void;
    
    // File Operations
    clearScene: () => void;
    exportScene: () => string;
    importScene: (json: string) => void;
    
    // History
    undo: () => void;
    redo: () => void;
    pushHistory: () => void;
}

let idCounter = 100;
const genId = (type: string) => `${type.toUpperCase()}-${++idCounter}`;

export const useScada3dStore = create<Scada3dStoreState>((set, get) => ({
    elements: [
        // === LANDSCAPE & EXTERIOR ===
        { id: 'GRASS-01', type: 'grass', position: [0, -0.05, 0], rotation: [0, 0, 0], scale: [8, 1, 6], properties: { name: 'Facility Grounds', roughness: 1, color: '#4f8f00' } },
        { id: 'ROAD-01', type: 'road', position: [0, 0, 10], rotation: [0, 0, 0], scale: [8, 1, 1.5], properties: { name: 'Main Road', color: '#333' } },
        { id: 'TRUCK-01', type: 'truck', position: [2, 0, 10], rotation: [0, -Math.PI/2, 0], scale: [1, 1, 1], properties: { name: 'Delivery Truck', color: '#1890ff' } },
        { id: 'FORKLIFT-01', type: 'forklift', position: [-2, 0, 8.5], rotation: [0, Math.PI/4, 0], scale: [1, 1, 1], properties: { name: 'Yard Forklift', color: '#faad14' } },
        { id: 'TREE-01', type: 'tree', position: [-12, 0, 6], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Oak Tree' } },
        { id: 'TREE-02', type: 'tree', position: [-10, 0, 12], rotation: [0, Math.PI/3, 0], scale: [1.2, 1.2, 1.2], properties: { name: 'Oak Tree' } },
        { id: 'TREE-03', type: 'tree', position: [12, 0, 6], rotation: [0, 0, 0], scale: [0.9, 0.9, 0.9], properties: { name: 'Oak Tree' } },
        { id: 'TREE-04', type: 'tree', position: [14, 0, 10], rotation: [0, -Math.PI/6, 0], scale: [1.1, 1.1, 1.1], properties: { name: 'Oak Tree' } },

        // === BUILDING SHELL ===
        // Floor slab
        { id: 'FLOOR-01', type: 'floor', position: [0, 0, 0], rotation: [0, 0, 0], scale: [7.5, 0.5, 4], properties: { name: 'Concrete Slab', color: '#a0a0a0' } },
        // Exterior Walls
        { id: 'WALL-N', type: 'wall', position: [0, 2, -7.8], rotation: [0, 0, 0], scale: [7.5, 2, 0.2], properties: { name: 'North Wall', color: '#d0d0d0' } },
        { id: 'WALL-S', type: 'wall', position: [0, 2, 7.8], rotation: [0, 0, 0], scale: [7.5, 2, 0.2], properties: { name: 'South Wall', color: '#d0d0d0' } },
        { id: 'WALL-E', type: 'wall', position: [14.8, 2, 0], rotation: [0, Math.PI/2, 0], scale: [4, 2, 0.2], properties: { name: 'East Wall', color: '#d0d0d0' } },
        { id: 'WALL-W', type: 'wall', position: [-14.8, 2, 0], rotation: [0, Math.PI/2, 0], scale: [4, 2, 0.2], properties: { name: 'West Wall', color: '#d0d0d0' } },
        // Interior Walls (Separating Data Hall from MEP)
        { id: 'WALL-INT-1', type: 'wall', position: [-4, 2, 0], rotation: [0, Math.PI/2, 0], scale: [4, 2, 0.1], properties: { name: 'Data Hall Partition', color: '#eeeeee' } },
        { id: 'DOOR-01', type: 'door', position: [-4, 1.5, 6], rotation: [0, Math.PI/2, 0], scale: [1, 1.5, 1], properties: { name: 'Secure Door' } },

        // === DATA CENTER ROOM (Center/Right) ===
        // Row 1 (Cold Aisle)
        { id: 'RACK-1A', type: 'server_rack', position: [0, 0.5, -4], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Rack 1A' } },
        { id: 'RACK-1B', type: 'server_rack', position: [1.2, 0.5, -4], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Rack 1B' } },
        { id: 'RACK-1C', type: 'server_rack', position: [2.4, 0.5, -4], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Rack 1C' } },
        { id: 'RACK-1D', type: 'server_rack', position: [3.6, 0.5, -4], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Rack 1D' } },
        { id: 'RACK-1E', type: 'server_rack', position: [4.8, 0.5, -4], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Rack 1E' } },
        { id: 'RACK-1F', type: 'server_rack', position: [6.0, 0.5, -4], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Rack 1F' } },
        
        // Row 2 (Hot Aisle face-to-face)
        { id: 'RACK-2A', type: 'server_rack', position: [0, 0.5, 0], rotation: [0, Math.PI, 0], scale: [1, 1, 1], properties: { name: 'Rack 2A' } },
        { id: 'RACK-2B', type: 'server_rack', position: [1.2, 0.5, 0], rotation: [0, Math.PI, 0], scale: [1, 1, 1], properties: { name: 'Rack 2B' } },
        { id: 'RACK-2C', type: 'server_rack', position: [2.4, 0.5, 0], rotation: [0, Math.PI, 0], scale: [1, 1, 1], properties: { name: 'Rack 2C' } },
        { id: 'RACK-2D', type: 'server_rack', position: [3.6, 0.5, 0], rotation: [0, Math.PI, 0], scale: [1, 1, 1], properties: { name: 'Rack 2D' } },
        { id: 'RACK-2E', type: 'server_rack', position: [4.8, 0.5, 0], rotation: [0, Math.PI, 0], scale: [1, 1, 1], properties: { name: 'Rack 2E' } },
        { id: 'RACK-2F', type: 'server_rack', position: [6.0, 0.5, 0], rotation: [0, Math.PI, 0], scale: [1, 1, 1], properties: { name: 'Rack 2F' } },

        // Row 3
        { id: 'RACK-3A', type: 'server_rack', position: [0, 0.5, 4], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Rack 3A' } },
        { id: 'RACK-3B', type: 'server_rack', position: [1.2, 0.5, 4], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Rack 3B' } },
        { id: 'RACK-3C', type: 'server_rack', position: [2.4, 0.5, 4], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Rack 3C' } },
        { id: 'RACK-3D', type: 'server_rack', position: [3.6, 0.5, 4], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Rack 3D' } },

        // CRAC Units
        { id: 'CRAC-1', type: 'crac', position: [-2, 0.5, -4], rotation: [0, Math.PI/2, 0], scale: [1, 1, 1], tagId: 'tag_temp_1', properties: { name: 'CRAC-01' } },
        { id: 'CRAC-2', type: 'crac', position: [-2, 0.5, 0], rotation: [0, Math.PI/2, 0], scale: [1, 1, 1], properties: { name: 'CRAC-02' } },
        { id: 'CRAC-3', type: 'crac', position: [-2, 0.5, 4], rotation: [0, Math.PI/2, 0], scale: [1, 1, 1], properties: { name: 'CRAC-03' } },

        // Cable Trays Overhead
        { id: 'TRAY-1', type: 'cable_tray', position: [3, 3, -4], rotation: [0, Math.PI/2, 0], scale: [1, 1, 1], properties: { name: 'Data Tray A' } },
        { id: 'TRAY-2', type: 'cable_tray', position: [3, 3, 0], rotation: [0, Math.PI/2, 0], scale: [1, 1, 1], properties: { name: 'Data Tray B' } },
        { id: 'TRAY-3', type: 'cable_tray', position: [3, 3, 4], rotation: [0, Math.PI/2, 0], scale: [1, 1, 1], properties: { name: 'Power Tray' } },

        // === MEP ROOM (Left) ===
        { id: 'CHILLER-01', type: 'chiller', position: [-10, 0.5, -4], rotation: [0, Math.PI/2, 0], scale: [1, 1, 1], properties: { name: 'Primary Chiller', thermalMode: false } },
        { id: 'CHILLER-02', type: 'chiller', position: [-10, 0.5, 0], rotation: [0, Math.PI/2, 0], scale: [1, 1, 1], properties: { name: 'Standby Chiller', thermalMode: false } },
        { id: 'PUMP-01', type: 'pump', position: [-6, 0.5, -4], rotation: [0, Math.PI/2, 0], scale: [1, 1, 1], tagId: 'tag_pump_hz', properties: { name: 'CW Pump 1' } },
        { id: 'PUMP-02', type: 'pump', position: [-6, 0.5, 0], rotation: [0, Math.PI/2, 0], scale: [1, 1, 1], properties: { name: 'CW Pump 2' } },
        { id: 'UPS-01', type: 'ups', position: [-12, 0.5, 5], rotation: [0, Math.PI, 0], scale: [1, 1, 1], properties: { name: 'UPS Bank A' } },
        { id: 'UPS-02', type: 'ups', position: [-10, 0.5, 5], rotation: [0, Math.PI, 0], scale: [1, 1, 1], properties: { name: 'UPS Bank B' } },
        { id: 'TRANSFORMER-01', type: 'transformer', position: [-8, 0.5, 5], rotation: [0, Math.PI, 0], scale: [1, 1, 1], properties: { name: 'TX-01 Main' } },
        { id: 'PANEL-01', type: 'panel', position: [-6, 0.5, 5], rotation: [0, Math.PI, 0], scale: [1, 1, 1], properties: { name: 'Main Switchboard', color: '#444' } },

        // Roof items
        { id: 'CT-01', type: 'cooling_tower', position: [-10, 4.5, -4], rotation: [0, 0, 0], scale: [1, 1, 1], tagId: 'tag_ct_vib', properties: { name: 'Roof CT-1' } },
        { id: 'CT-02', type: 'cooling_tower', position: [-10, 4.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1], properties: { name: 'Roof CT-2' } },
    ],
    history: [],
    historyIndex: -1,
    environment: 'night',
    
    setEnvironment: (env) => set({ environment: env }),
    
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

    clearScene: () => {
        get().pushHistory();
        set({ elements: [] });
    },

    exportScene: () => {
        const { elements } = get();
        return JSON.stringify(elements, null, 2);
    },

    importScene: (json) => {
        try {
            const elements = JSON.parse(json);
            if (Array.isArray(elements)) {
                get().pushHistory();
                set({ elements });
            }
        } catch (e) {
            console.error("Failed to import scene:", e);
        }
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
