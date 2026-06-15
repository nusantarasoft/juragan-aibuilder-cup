import { create } from 'zustand';

interface RackData {
    id: string;
    name: string;
    x: number;
    z: number;
    totalU: number;
    usedU: number;
    temp: number;
    power: number;
    status: 'normal' | 'warning' | 'critical';
}

interface DcimState {
    racks: RackData[];
    selectedRackId: string | null;
    viewMode: 'Normal' | 'Thermal' | 'Power' | 'Utilization';
    setRacks: (racks: RackData[]) => void;
    setSelectedRackId: (id: string | null) => void;
    setViewMode: (mode: 'Normal' | 'Thermal' | 'Power' | 'Utilization') => void;
}

// Generate demo racks
const generateRacks = (): RackData[] => {
    const racks: RackData[] = [];
    let id = 1;
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
            const temp = 22 + Math.random() * 12;
            let status: 'normal' | 'warning' | 'critical' = 'normal';
            if (temp > 30) status = 'critical';
            else if (temp > 27) status = 'warning';

            racks.push({
                id: `RACK-${id++}`,
                name: `${String.fromCharCode(65 + row)}${String(col + 1).padStart(2, '0')}`,
                x: (col * 1.5) - 3.75, 
                z: (row * 3) - 4.5,    
                totalU: 42,
                usedU: Math.floor(10 + Math.random() * 32),
                temp: Math.round(temp * 10) / 10,
                power: Math.round(2 + Math.random() * 6 * 10) / 10,
                status
            });
        }
    }
    return racks;
};

export const useDcimStore = create<DcimState>((set) => ({
    racks: generateRacks(),
    selectedRackId: null,
    viewMode: 'Normal',
    setRacks: (racks) => set({ racks }),
    setSelectedRackId: (id) => set({ selectedRackId: id }),
    setViewMode: (viewMode) => set({ viewMode }),
}));
