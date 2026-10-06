import { create } from 'zustand';

export interface ServerData {
    id: string;
    name: string;
    uSlot: number; // The U index where the server starts (1-indexed from bottom usually)
    uHeight: number; // e.g. 1, 2, 4
    ip: string;
    cpu: number; // 0-100%
    ram: number; // 0-100%
    temp: number;
    power: number; // Watts
    status: 'normal' | 'warning' | 'critical';
}

export interface RackData {
    id: string;
    name: string;
    x: number;
    z: number;
    totalU: number; // e.g. 42, 48, 52
    usedU: number;
    temp: number;
    power: number; // kW
    status: 'normal' | 'warning' | 'critical';
    rotationY?: number;
    servers: ServerData[];
}

export interface PodData {
    id: string;
    name: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    type: 'hot-aisle' | 'cold-aisle';
}

export interface CracData {
    id: string;
    name: string;
    x: number;
    z: number;
    rotationY?: number;
    status: 'normal' | 'warning' | 'critical';
}

export interface PduData {
    id: string;
    name: string;
    x: number;
    z: number;
    rotationY?: number;
    power: number;
    status: 'normal' | 'warning' | 'critical';
}

export interface WorldObjectData {
    id: string;
    type: 'wall' | 'tree' | 'generator' | 'zone' | 'pillar' | 'cableTray' | 'pipe' | 'server1u' | 'server2u' | 'networkSwitch';
    material?: 'grass' | 'concrete' | 'tiles' | 'metal';
    x: number;
    z: number;
    width?: number;
    depth?: number;
    rotationY?: number;
}

interface DcimState {
    racks: RackData[];
    pods: PodData[];
    cracs: CracData[];
    pdus: PduData[];
    worldObjects: WorldObjectData[];
    selectedRackId: string | null;
    selectedServerId: string | null;
    viewMode: 'Normal' | 'Thermal' | 'Power' | 'Utilization' | 'Network';
    editMode: boolean;
    measureMode: boolean;
    measurePoints: [number, number, number][];
    snapToGrid: boolean;
    orbitEnabled: boolean;
    transformMode: 'translate' | 'rotate';
    setOrbitEnabled: (enabled: boolean) => void;
    setTransformMode: (mode: 'translate' | 'rotate') => void;
    setMeasureMode: (mode: boolean) => void;
    setMeasurePoints: (points: [number, number, number][]) => void;
    setRacks: (racks: RackData[]) => void;
    setPods: (pods: PodData[]) => void;
    setSelectedRackId: (id: string | null) => void;
    setSelectedServerId: (id: string | null) => void;
    setViewMode: (mode: 'Normal' | 'Thermal' | 'Power' | 'Utilization') => void;
    setEditMode: (mode: boolean) => void;
    setSnapToGrid: (snap: boolean) => void;
    updateRackPosition: (id: string, x: number, z: number, rotationY?: number) => void;
    addRack: (rack: RackData) => void;
    removeRack: (id: string) => void;

    // CRAC Actions
    setCracs: (cracs: CracData[]) => void;
    addCrac: (crac: CracData) => void;
    removeCrac: (id: string) => void;
    updateCracPosition: (id: string, x: number, z: number, rotationY?: number) => void;

    // PDU Actions
    setPdus: (pdus: PduData[]) => void;
    addPdu: (pdu: PduData) => void;
    removePdu: (id: string) => void;
    updatePduPosition: (id: string, x: number, z: number, rotationY?: number) => void;

    // World Object Actions
    setWorldObjects: (objects: WorldObjectData[]) => void;
    addWorldObject: (obj: WorldObjectData) => void;
    removeWorldObject: (id: string) => void;
    updateWorldObjectPosition: (id: string, x: number, z: number, rotationY?: number) => void;
    updateWorldObjectDimensions: (id: string, width: number, depth: number) => void;
}

// Generate demo racks - dcTrack style layout with numbered rows and lettered columns
const generateRacks = (): RackData[] => {
    const racks: RackData[] = [];
    let id = 1;
    let srvId = 1;

    const ROWS = 8;        // 8 rows
    const COLS = 8;         // 8 racks per row
    const COL_SPACING = 1.4; // meters between racks in a row
    const ROW_SPACING = 2.5; // meters between rows (aisle width)

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const temp = 22 + Math.random() * 12;
            let status: 'normal' | 'warning' | 'critical' = 'normal';
            if (temp > 30) status = 'critical';
            else if (temp > 27) status = 'warning';

            const totalU = Math.random() > 0.8 ? 48 : 42;
            const servers: ServerData[] = [];
            let currentU = 1;
            let rackPower = 0;
            let rackUsedU = 0;

            while (currentU < totalU - 4) {
                if (Math.random() > 0.3) {
                    const uHeight = Math.random() > 0.8 ? 2 : 1;
                    if (currentU + uHeight <= totalU) {
                        const srvTemp = 25 + Math.random() * 15;
                        const srvCpu = Math.floor(Math.random() * 100);
                        const srvStatus = srvTemp > 35 ? 'critical' : (srvCpu > 85 ? 'warning' : 'normal');
                        const srvPower = uHeight * (150 + Math.random() * 300);

                        servers.push({
                            id: `SRV-${srvId++}`,
                            name: `AppNode-${srvId}`,
                            uSlot: currentU,
                            uHeight,
                            ip: `10.0.${row}.${col * 10 + servers.length}`,
                            cpu: srvCpu,
                            ram: Math.floor(40 + Math.random() * 50),
                            temp: Math.round(srvTemp * 10) / 10,
                            power: Math.round(srvPower),
                            status: srvStatus
                        });
                        rackUsedU += uHeight;
                        rackPower += srvPower;
                        currentU += uHeight;
                    } else {
                        break;
                    }
                } else {
                    currentU += 1;
                }
            }

            // Alternate facing for hot/cold aisle containment
            const isTopRowOfAisle = row % 2 === 0;
            const rotationY = isTopRowOfAisle ? 0 : Math.PI;

            // dcTrack-style naming: row number + column letter (1A, 1B, ..., 8H)
            const name = `${row + 1}${String.fromCharCode(65 + col)}`;

            // Position: centered around origin
            const xOffset = (col - (COLS - 1) / 2) * COL_SPACING;
            const zOffset = (row - (ROWS - 1) / 2) * ROW_SPACING;

            racks.push({
                id: `RACK-${id++}`,
                name,
                x: xOffset,
                z: zOffset,
                totalU,
                usedU: rackUsedU,
                temp: Math.round(temp * 10) / 10,
                power: Math.round((rackPower / 1000) * 10) / 10,
                status,
                rotationY,
                servers
            });
        }
    }
    return racks;
};

// Generate demo pods (Cold aisle containment between paired rows)
const generatePods = (): PodData[] => {
    const pods: PodData[] = [];
    const COLS = 8;
    const COL_SPACING = 1.4;
    const ROW_SPACING = 2.5;
    const width = COLS * COL_SPACING;

    // One pod between each pair of rows (0-1, 2-3, 4-5, 6-7)
    for (let pair = 0; pair < 4; pair++) {
        const row0 = pair * 2;
        const row1 = pair * 2 + 1;
        const z0 = (row0 - 3.5) * ROW_SPACING;
        const z1 = (row1 - 3.5) * ROW_SPACING;
        pods.push({
            id: `POD-${pair + 1}`,
            name: `Cold Aisle ${pair + 1}`,
            x: 0,
            z: (z0 + z1) / 2,
            width,
            depth: ROW_SPACING * 0.6,
            type: 'cold-aisle'
        });
    }
    return pods;
};

const generateCracs = (): CracData[] => {
    return [
        { id: 'CRAC-1', name: 'CRAC-A', x: -10, z: -6, status: 'normal' },
        { id: 'CRAC-2', name: 'CRAC-B', x: -10, z: 0, status: 'normal' },
        { id: 'CRAC-3', name: 'CRAC-C', x: -10, z: 6, status: 'normal' },
        { id: 'CRAC-4', name: 'CRAC-D', x: 10, z: -6, status: 'normal' },
        { id: 'CRAC-5', name: 'CRAC-E', x: 10, z: 0, status: 'warning' },
        { id: 'CRAC-6', name: 'CRAC-F', x: 10, z: 6, status: 'normal' },
    ];
};

const generatePdus = (): PduData[] => {
    return [
        { id: 'PDU-1', name: 'PDU-1A', x: -12, z: -4, power: 120, status: 'normal' },
        { id: 'PDU-2', name: 'PDU-1B', x: -12, z: 4, power: 95, status: 'normal' },
        { id: 'PDU-3', name: 'PDU-2A', x: 12, z: -4, power: 110, status: 'normal' },
        { id: 'PDU-4', name: 'PDU-2B', x: 12, z: 4, power: 85, status: 'normal' },
    ];
};

export const useDcimStore = create<DcimState>((set) => ({
    racks: generateRacks(),
    pods: generatePods(),
    cracs: generateCracs(),
    pdus: generatePdus(),
    worldObjects: [],
    selectedRackId: null,
    selectedServerId: null,
    viewMode: 'Utilization',
    editMode: false,
    measureMode: false,
    measurePoints: [],
    snapToGrid: true,
    orbitEnabled: true,
    transformMode: 'translate',
    setOrbitEnabled: (enabled) => set({ orbitEnabled: enabled }),
    setTransformMode: (mode) => set({ transformMode: mode }),
    setMeasureMode: (measureMode) => set({ measureMode, measurePoints: [] }),
    setMeasurePoints: (measurePoints) => set({ measurePoints }),
    setRacks: (racks) => set({ racks }),
    setPods: (pods) => set({ pods }),
    setSelectedRackId: (id) => set({ selectedRackId: id, selectedServerId: null }), // clear server selection when changing rack
    setSelectedServerId: (id) => set({ selectedServerId: id }),
    setViewMode: (viewMode) => set({ viewMode }),
    setEditMode: (editMode) => set({ editMode }),
    setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
    updateRackPosition: (id, x, z, rotationY) => set((state) => ({
        racks: state.racks.map(r => r.id === id ? { ...r, x, z, ...(rotationY !== undefined ? { rotationY } : {}) } : r)
    })),
    addRack: (rack) => set((state) => ({ racks: [...state.racks, rack] })),
    removeRack: (id) => set((state) => ({ racks: state.racks.filter(r => r.id !== id), selectedRackId: state.selectedRackId === id ? null : state.selectedRackId })),

    setCracs: (cracs) => set({ cracs }),
    addCrac: (crac) => set((state) => ({ cracs: [...state.cracs, crac] })),
    removeCrac: (id) => set((state) => ({ cracs: state.cracs.filter(c => c.id !== id), selectedRackId: state.selectedRackId === id ? null : state.selectedRackId })),
    updateCracPosition: (id, x, z, rotationY) => set((state) => ({
        cracs: state.cracs.map(c => c.id === id ? { ...c, x, z, ...(rotationY !== undefined ? { rotationY } : {}) } : c)
    })),

    setPdus: (pdus) => set({ pdus }),
    addPdu: (pdu) => set((state) => ({ pdus: [...state.pdus, pdu] })),
    removePdu: (id) => set((state) => ({ pdus: state.pdus.filter(p => p.id !== id), selectedRackId: state.selectedRackId === id ? null : state.selectedRackId })),
    updatePduPosition: (id, x, z, rotationY) => set((state) => ({
        pdus: state.pdus.map(p => p.id === id ? { ...p, x, z, ...(rotationY !== undefined ? { rotationY } : {}) } : p)
    })),

    setWorldObjects: (worldObjects) => set({ worldObjects }),
    addWorldObject: (obj) => set((state) => ({ worldObjects: [...state.worldObjects, obj] })),
    removeWorldObject: (id) => set((state) => ({ worldObjects: state.worldObjects.filter(o => o.id !== id), selectedRackId: state.selectedRackId === id ? null : state.selectedRackId })),
    updateWorldObjectPosition: (id, x, z, rotationY) => set((state) => ({
        worldObjects: state.worldObjects.map(o => o.id === id ? { ...o, x, z, ...(rotationY !== undefined ? { rotationY } : {}) } : o)
    })),
    updateWorldObjectDimensions: (id, width, depth) => set((state) => ({
        worldObjects: state.worldObjects.map(o => o.id === id ? { ...o, width, depth } : o)
    })),
}));
