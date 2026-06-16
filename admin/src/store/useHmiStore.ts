import { create } from 'zustand';

export type HmiElementType = 'pump' | 'valve' | 'tank' | 'motor' | 'sensor' | 'pipe' | 'label' | 'gauge' | 'chart' | 'indicator' | 'shape';

export interface HmiElement {
    id: string;
    type: HmiElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    tagId?: string; // SCADA tag binding
    zIndex: number;
    properties: Record<string, any>; // Color, text, font size, min/max, etc.
}

interface HmiStoreState {
    elements: HmiElement[];
    selectedIds: string[];
    zoom: number;
    pan: { x: number; y: number };
    isEditMode: boolean;
    
    // Actions
    setElements: (elements: HmiElement[]) => void;
    addElement: (element: Omit<HmiElement, 'id' | 'zIndex'>) => void;
    updateElement: (id: string, updates: Partial<HmiElement>) => void;
    deleteElements: (ids: string[]) => void;
    
    selectElement: (id: string, multi?: boolean) => void;
    clearSelection: () => void;
    
    setZoom: (zoom: number) => void;
    setPan: (pan: { x: number; y: number }) => void;
    setEditMode: (edit: boolean) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useHmiStore = create<HmiStoreState>((set, get) => ({
    elements: [
        // Demo initial data matching the existing static SVG
        { id: 'e1', type: 'pipe', x: 150, y: 200, width: 250, height: 8, rotation: 0, zIndex: 1, properties: { color: '#1890ff', strokeWidth: 8, animated: true } },
        { id: 'e2', type: 'pipe', x: 400, y: 200, width: 8, height: 150, rotation: 0, zIndex: 1, properties: { color: '#1890ff', strokeWidth: 8, animated: true } },
        { id: 'e3', type: 'pipe', x: 400, y: 350, width: 400, height: 8, rotation: 0, zIndex: 1, properties: { color: '#1890ff', strokeWidth: 8, animated: true } },
        { id: 'e4', type: 'tank', x: 50, y: 150, width: 100, height: 200, rotation: 0, zIndex: 2, properties: { label: 'CHILLER 1', color: '#1890ff', fillLevel: 80 } },
        { id: 'e5', type: 'pump', x: 360, y: 235, width: 80, height: 80, rotation: 0, zIndex: 3, properties: { label: 'PUMP', color: '#52c41a', running: true, frequency: '60 Hz' } },
        { id: 'e6', type: 'tank', x: 750, y: 200, width: 100, height: 150, rotation: 0, zIndex: 2, properties: { label: 'TOWER', color: '#1890ff', isCoolingTower: true } },
        { id: 'e7', type: 'indicator', x: 200, y: 160, width: 90, height: 30, rotation: 0, zIndex: 4, tagId: 'tag_temp_1', properties: { format: '0.0', unit: '°C', defaultVal: 6.5, color: '#52c41a' } },
        { id: 'e8', type: 'indicator', x: 200, y: 310, width: 90, height: 30, rotation: 0, zIndex: 4, tagId: 'tag_temp_2', properties: { format: '0.0', unit: '°C', defaultVal: 12.1, color: '#faad14' } },
    ],
    selectedIds: [],
    zoom: 1,
    pan: { x: 0, y: 0 },
    isEditMode: true, // Start in edit mode for building
    
    setElements: (elements) => set({ elements }),
    
    addElement: (element) => set((state) => {
        const maxZ = state.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
        const newEl: HmiElement = {
            ...element,
            id: generateId(),
            zIndex: maxZ + 1,
        };
        return { elements: [...state.elements, newEl], selectedIds: [newEl.id] };
    }),
    
    updateElement: (id, updates) => set((state) => ({
        elements: state.elements.map(el => el.id === id ? { ...el, ...updates } : el)
    })),
    
    deleteElements: (ids) => set((state) => ({
        elements: state.elements.filter(el => !ids.includes(el.id)),
        selectedIds: state.selectedIds.filter(id => !ids.includes(id)),
    })),
    
    selectElement: (id, multi = false) => set((state) => {
        if (multi) {
            const isSelected = state.selectedIds.includes(id);
            return { selectedIds: isSelected ? state.selectedIds.filter(s => s !== id) : [...state.selectedIds, id] };
        }
        return { selectedIds: [id] };
    }),
    
    clearSelection: () => set({ selectedIds: [] }),
    
    setZoom: (zoom) => set({ zoom }),
    setPan: (pan) => set({ pan }),
    setEditMode: (isEditMode) => set({ isEditMode, selectedIds: isEditMode ? get().selectedIds : [] }),
}));
