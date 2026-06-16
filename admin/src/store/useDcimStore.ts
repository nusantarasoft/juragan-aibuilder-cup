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

interface DcimState {
    racks: RackData[];
    pods: PodData[];
    selectedRackId: string | null;
    selectedServerId: string | null;
    viewMode: 'Normal' | 'Thermal' | 'Power' | 'Utilization';
    editMode: boolean;
    setRacks: (racks: RackData[]) => void;
    setPods: (pods: PodData[]) => void;
    setSelectedRackId: (id: string | null) => void;
    setSelectedServerId: (id: string | null) => void;
    setViewMode: (mode: 'Normal' | 'Thermal' | 'Power' | 'Utilization') => void;
    setEditMode: (mode: boolean) => void;
    updateRackPosition: (id: string, x: number, z: number, rotationY?: number) => void;
}

// Generate demo racks
const generateRacks = (): RackData[] => {
    const racks: RackData[] = [];
    let id = 1;
    let srvId = 1;

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
            const temp = 22 + Math.random() * 12;
            let status: 'normal' | 'warning' | 'critical' = 'normal';
            if (temp > 30) status = 'critical';
            else if (temp > 27) status = 'warning';

            const totalU = Math.random() > 0.8 ? 48 : 42;
            const servers: ServerData[] = [];
            let currentU = 1;
            let rackPower = 0;
            let rackUsedU = 0;

            while (currentU < totalU - 4) { // leave some empty space at top
                if (Math.random() > 0.3) {
                    const uHeight = Math.random() > 0.8 ? 2 : 1;
                    if (currentU + uHeight <= totalU) {
                        const srvTemp = 25 + Math.random() * 15;
                        const srvCpu = Math.floor(Math.random() * 100);
                        const srvStatus = srvTemp > 35 ? 'critical' : (srvCpu > 85 ? 'warning' : 'normal');
                        const srvPower = uHeight * (150 + Math.random() * 300); // Watts
                        
                        servers.push({
                            id: `SRV-${srvId++}`,
                            name: `AppNode-${srvId}`,
                            uSlot: currentU,
                            uHeight,
                            ip: `10.0.${row}.${col*10 + servers.length}`,
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
                    currentU += 1; // empty slot
                }
            }

            // Aisle containment logic: face racks towards the cold aisle
            // Assuming cols 0-5. We want col 0 and 1 facing each other?
            // Wait, we have 4 rows of 6 racks. Let's make rows 0 and 1 face each other.
            const isTopRowOfAisle = row % 2 === 0;
            const rotationY = isTopRowOfAisle ? 0 : Math.PI;

            racks.push({
                id: `RACK-${id++}`,
                name: `${String.fromCharCode(65 + row)}${String(col + 1).padStart(2, '0')}`,
                x: (col * 1.5) - 3.75, 
                z: (row * 3) - 4.5,    
                totalU,
                usedU: rackUsedU,
                temp: Math.round(temp * 10) / 10,
                power: Math.round((rackPower / 1000) * 10) / 10, // kW
                status,
                rotationY,
                servers
            });
        }
    }
    return racks;
};

// Generate demo pods (Cold aisle containment enclosing two rows)
const generatePods = (): PodData[] => {
    return [
        {
            id: 'POD-1',
            name: 'Cold Aisle 1',
            x: 0,
            z: -3, // Between row 0 (z=-4.5) and row 1 (z=-1.5)
            width: 10, // Encloses all 6 racks in the row horizontally
            depth: 3, // Encloses the space between the rows
            type: 'cold-aisle'
        },
        {
            id: 'POD-2',
            name: 'Cold Aisle 2',
            x: 0,
            z: 3, // Between row 2 (z=1.5) and row 3 (z=4.5)
            width: 10,
            depth: 3,
            type: 'cold-aisle'
        }
    ];
};

export const useDcimStore = create<DcimState>((set) => ({
    racks: generateRacks(),
    pods: generatePods(),
    selectedRackId: null,
    selectedServerId: null,
    viewMode: 'Normal',
    editMode: false,
    setRacks: (racks) => set({ racks }),
    setPods: (pods) => set({ pods }),
    setSelectedRackId: (id) => set({ selectedRackId: id, selectedServerId: null }), // clear server selection when changing rack
    setSelectedServerId: (id) => set({ selectedServerId: id }),
    setViewMode: (viewMode) => set({ viewMode }),
    setEditMode: (editMode) => set({ editMode }),
    updateRackPosition: (id, x, z, rotationY) => set((state) => ({
        racks: state.racks.map(r => r.id === id ? { ...r, x, z, ...(rotationY !== undefined ? { rotationY } : {}) } : r)
    })),
}));
