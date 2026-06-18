import { create } from 'zustand';

export interface ScadaTag {
    id: string;
    name: string;
    value: any;
    unit: string;
    type: 'number' | 'boolean' | 'string';
    alarm: boolean;
}

export interface DataCenterSite {
    id: string;
    name: string;
    location: string;
    lat: number;
    lng: number;
    tier: string;
    capacity: string;
    status: 'healthy' | 'warning' | 'critical';
    pue: number;
}

interface ScadaState {
    tags: Record<string, ScadaTag>;
    selectedSourceId: string | null;
    selectedTagId: string | null;
    
    // Sites
    sites: DataCenterSite[];
    currentSiteId: string;
    
    // Actions
    updateTag: (id: string, value: any, alarm?: boolean) => void;
    setTags: (tags: Record<string, ScadaTag>) => void;
    setSelectedSource: (id: string | null) => void;
    setSelectedTag: (id: string | null) => void;
    setSite: (siteId: string) => void;
}

export const useScadaStore = create<ScadaState>()((set) => ({
    tags: {
        'tag_temp_1': { id: 'tag_temp_1', name: 'Chiller 1 Temp', value: 6.5, unit: '°C', type: 'number', alarm: false },
        'tag_temp_2': { id: 'tag_temp_2', name: 'Tower Return Temp', value: 12.1, unit: '°C', type: 'number', alarm: false },
        'tag_pump_hz': { id: 'tag_pump_hz', name: 'Pump Frequency', value: 60.0, unit: 'Hz', type: 'number', alarm: false },
        'tag_pump_status': { id: 'tag_pump_status', name: 'Pump Status', value: true, unit: '', type: 'boolean', alarm: false },
        'tag_ct_vib': { id: 'tag_ct_vib', name: 'CT Vibration Alarm', value: false, unit: '', type: 'boolean', alarm: false },
    },
    selectedSourceId: null,
    selectedTagId: null,
    
    sites: [
        { id: 'jkt-dc1', name: 'Jakarta DC-1', location: 'Jakarta, Indonesia', lat: -6.2088, lng: 106.8456, tier: 'Tier III', capacity: '2.4 MW', status: 'healthy', pue: 1.42 },
        { id: 'sby-dc2', name: 'Surabaya DC-2', location: 'Surabaya, Indonesia', lat: -7.2575, lng: 112.7521, tier: 'Tier II', capacity: '1.2 MW', status: 'warning', pue: 1.68 },
        { id: 'sgp-dc3', name: 'Singapore DC-3', location: 'Singapore', lat: 1.3521, lng: 103.8198, tier: 'Tier IV', capacity: '5.0 MW', status: 'healthy', pue: 1.25 },
        { id: 'bali-dr', name: 'Bali DR-Site', location: 'Denpasar, Bali', lat: -8.6500, lng: 115.2167, tier: 'Tier II', capacity: '0.8 MW', status: 'critical', pue: 1.85 },
    ],
    currentSiteId: 'jkt-dc1',
    
    updateTag: (id, value, alarm) => set((state) => ({
        tags: {
            ...state.tags,
            [id]: { 
                ...state.tags[id], 
                value, 
                alarm: alarm !== undefined ? alarm : state.tags[id]?.alarm 
            }
        }
    })),
    setTags: (tags) => set({ tags }),
    setSelectedSource: (id) => set({ selectedSourceId: id, selectedTagId: null }),
    setSelectedTag: (id) => set({ selectedTagId: id }),
    setSite: (siteId) => set({ currentSiteId: siteId }),
}));
