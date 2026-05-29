// Warehouse Builder State & Types
// Sim-game style layout customization

export type PlacedObjectType =
    | 'zone' | 'rack' | 'wall' | 'door' | 'pallet'
    | 'bollard' | 'workstation' | 'conveyor' | 'forklift';

export type ZoneType = 'receiving' | 'storage' | 'picking' | 'packing' | 'shipping' | 'cold' | 'quarantine';

export interface PlacedObject {
    id: string;
    type: PlacedObjectType;
    x: number;
    z: number;
    rotation: number; // degrees: 0, 90, 180, 270
    width: number;
    depth: number;
    // type-specific props
    zoneType?: ZoneType;
    rackLevels?: number;
    wallLength?: number;
    label?: string;
    color?: string;
    locked?: boolean;
    // inventory linking
    linkedZoneId?: string;     // Links zone to InvZone
    linkedBinIds?: string[];   // Links rack shelves to InvBin records (index = level)
    warehouseId?: string;      // Parent warehouse reference
}

export interface BuilderPaletteItem {
    type: PlacedObjectType;
    label: string;
    icon: string;
    description: string;
    defaultWidth: number;
    defaultDepth: number;
    category: 'structure' | 'storage' | 'zone' | 'equipment';
    color: string;
}

export const PALETTE_ITEMS: BuilderPaletteItem[] = [
    // Zones
    { type: 'zone', label: 'Storage Zone', icon: '🏗️', description: 'General storage area', defaultWidth: 4, defaultDepth: 3, category: 'zone', color: '#3b82f6' },
    { type: 'zone', label: 'Receiving Zone', icon: '📥', description: 'Incoming goods dock', defaultWidth: 3, defaultDepth: 2, category: 'zone', color: '#22c55e' },
    { type: 'zone', label: 'Shipping Zone', icon: '📤', description: 'Outgoing shipment area', defaultWidth: 3, defaultDepth: 2, category: 'zone', color: '#06b6d4' },
    { type: 'zone', label: 'Picking Zone', icon: '🛒', description: 'Order picking area', defaultWidth: 3, defaultDepth: 2, category: 'zone', color: '#f59e0b' },
    { type: 'zone', label: 'Cold Storage', icon: '❄️', description: 'Temperature-controlled', defaultWidth: 3, defaultDepth: 3, category: 'zone', color: '#6366f1' },
    // Storage
    { type: 'rack', label: 'Pallet Rack', icon: '🔩', description: 'Multi-level pallet rack', defaultWidth: 1, defaultDepth: 1, category: 'storage', color: '#e87722' },
    { type: 'pallet', label: 'Pallet', icon: '📦', description: 'Wooden pallet', defaultWidth: 1, defaultDepth: 1, category: 'storage', color: '#8B7355' },
    // Structure
    { type: 'wall', label: 'Wall', icon: '🧱', description: 'Interior wall segment', defaultWidth: 3, defaultDepth: 1, category: 'structure', color: '#94a3b8' },
    { type: 'door', label: 'Door', icon: '🚪', description: 'Roll-up dock door', defaultWidth: 2, defaultDepth: 1, category: 'structure', color: '#6b7280' },
    // Equipment
    { type: 'workstation', label: 'Workstation', icon: '🖥️', description: 'Packing / QC desk', defaultWidth: 2, defaultDepth: 1, category: 'equipment', color: '#8b5cf6' },
    { type: 'conveyor', label: 'Conveyor', icon: '⚙️', description: 'Roller conveyor belt', defaultWidth: 4, defaultDepth: 1, category: 'equipment', color: '#64748b' },
    { type: 'bollard', label: 'Bollard', icon: '⚠️', description: 'Safety bollard', defaultWidth: 1, defaultDepth: 1, category: 'equipment', color: '#f59e0b' },
    { type: 'forklift', label: 'Forklift', icon: '🚜', description: 'Forklift parking', defaultWidth: 1, defaultDepth: 2, category: 'equipment', color: '#eab308' },
];

export const ZONE_TYPE_MAP: Record<string, ZoneType> = {
    'Storage Zone': 'storage',
    'Receiving Zone': 'receiving',
    'Shipping Zone': 'shipping',
    'Picking Zone': 'picking',
    'Cold Storage': 'cold',
};

export const GRID_SIZE = 1; // 1 unit per grid cell
export const GRID_CELLS = 30; // 30x30 grid

// Grid coordinate label (A1, B2, etc.)
export function gridCoordsLabel(x: number, z: number): string {
    const col = String.fromCharCode(65 + Math.min(Math.floor(x), 25)); // A-Z
    const row = Math.floor(z) + 1;
    return `${col}${row}`;
}

// Auto-arrange racks inside a zone
export function autoArrangeRacks(zone: PlacedObject, levels: number = 3, spacing: number = 2): PlacedObject[] {
    const racks: PlacedObject[] = [];
    const innerX = zone.x + 0.5;
    const innerZ = zone.z + 0.5;
    const innerW = (zone.width || 1) - 1;
    const innerD = (zone.depth || 1) - 1;
    // Place racks in rows
    for (let row = 0; row < innerD; row += spacing) {
        for (let col = 0; col < innerW; col += 1.2) {
            racks.push({
                id: generateId(),
                type: 'rack',
                x: Math.round((innerX + col) * 10) / 10,
                z: Math.round((innerZ + row) * 10) / 10,
                rotation: 0,
                width: 1,
                depth: 1,
                rackLevels: levels,
                label: `Rack ${gridCoordsLabel(innerX + col, innerZ + row)}`,
            });
        }
    }
    return racks;
}

let _idCounter = 0;
export function generateId(): string {
    _idCounter++;
    return `obj-${Date.now()}-${_idCounter}`;
}

export function getDefaultLayout(): PlacedObject[] {
    return [
        // Pre-placed demo zones
        { id: generateId(), type: 'zone', x: 2, z: 2, rotation: 0, width: 4, depth: 3, zoneType: 'receiving', label: 'Receiving', color: '#22c55e' },
        { id: generateId(), type: 'zone', x: 8, z: 2, rotation: 0, width: 6, depth: 4, zoneType: 'storage', label: 'Storage A', color: '#3b82f6' },
        { id: generateId(), type: 'zone', x: 8, z: 8, rotation: 0, width: 6, depth: 4, zoneType: 'storage', label: 'Storage B', color: '#3b82f6' },
        { id: generateId(), type: 'zone', x: 2, z: 7, rotation: 0, width: 4, depth: 3, zoneType: 'picking', label: 'Picking', color: '#f59e0b' },
        { id: generateId(), type: 'zone', x: 16, z: 2, rotation: 0, width: 4, depth: 3, zoneType: 'shipping', label: 'Shipping', color: '#06b6d4' },
        { id: generateId(), type: 'zone', x: 16, z: 7, rotation: 0, width: 4, depth: 4, zoneType: 'cold', label: 'Cold Storage', color: '#6366f1' },
        // Pre-placed racks inside storage zones
        ...Array.from({ length: 4 }, (_, i) => ({
            id: generateId(), type: 'rack' as PlacedObjectType, x: 9 + i * 1.2, z: 3, rotation: 0, width: 1, depth: 1, rackLevels: 4,
        })),
        ...Array.from({ length: 4 }, (_, i) => ({
            id: generateId(), type: 'rack' as PlacedObjectType, x: 9 + i * 1.2, z: 5, rotation: 0, width: 1, depth: 1, rackLevels: 3,
        })),
        ...Array.from({ length: 4 }, (_, i) => ({
            id: generateId(), type: 'rack' as PlacedObjectType, x: 9 + i * 1.2, z: 9, rotation: 0, width: 1, depth: 1, rackLevels: 4,
        })),
        // Pallets near receiving
        { id: generateId(), type: 'pallet', x: 3, z: 3, rotation: 0, width: 1, depth: 1 },
        { id: generateId(), type: 'pallet', x: 4, z: 3, rotation: 0, width: 1, depth: 1 },
        { id: generateId(), type: 'pallet', x: 3, z: 4, rotation: 90, width: 1, depth: 1 },
        // Bollards
        { id: generateId(), type: 'bollard', x: 7, z: 2, rotation: 0, width: 1, depth: 1 },
        { id: generateId(), type: 'bollard', x: 7, z: 6, rotation: 0, width: 1, depth: 1 },
        // Workstation
        { id: generateId(), type: 'workstation', x: 3, z: 8, rotation: 0, width: 2, depth: 1 },
        // Conveyor
        { id: generateId(), type: 'conveyor', x: 17, z: 4, rotation: 0, width: 3, depth: 1 },
    ];
}

// ═══════════════════════════════════════════════════════
// BACKEND PERSISTENCE (replaces localStorage)
// ═══════════════════════════════════════════════════════

import { inventoryService } from '@/lib/inventoryService';

const LOCAL_CACHE_KEY = 'nusantarasoft_warehouse_layout_cache';

// Save active layout to backend
export async function saveLayout(objects: PlacedObject[], layoutId?: string): Promise<string | null> {
    try {
        const result = await inventoryService.saveWarehouseLayout(undefined, {
            id: layoutId || undefined,
            name: 'Active Layout',
            objects,
            isActive: true,
        });
        // Cache locally for fast reload
        try { localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(objects)); } catch { /* ignore */ }
        return result.id;
    } catch (err) {
        console.error('Failed to save layout to backend, caching locally:', err);
        try { localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(objects)); } catch { /* ignore */ }
        return null;
    }
}

// Load active layout from backend (with local cache fallback)
export async function loadLayout(): Promise<{ objects: PlacedObject[]; layoutId: string | null }> {
    try {
        const layouts = await inventoryService.getWarehouseLayouts();
        const active = layouts.find(l => l.isActive);
        if (active) {
            try { localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(active.objects)); } catch { /* ignore */ }
            return { objects: active.objects, layoutId: active.id };
        }
        // No active layout — check if there are any at all
        if (layouts.length > 0) {
            const first = layouts[0];
            return { objects: first.objects, layoutId: first.id };
        }
    } catch (err) {
        console.error('Failed to load from backend, trying local cache:', err);
    }
    // Fallback: try local cache
    try {
        const cached = localStorage.getItem(LOCAL_CACHE_KEY);
        if (cached) return { objects: JSON.parse(cached), layoutId: null };
    } catch { /* ignore */ }
    return { objects: [], layoutId: null };
}

// Clear active layout
export async function clearLayout(layoutId?: string): Promise<void> {
    if (layoutId) {
        try { await inventoryService.deleteWarehouseLayout(layoutId); } catch { /* ignore */ }
    }
    try { localStorage.removeItem(LOCAL_CACHE_KEY); } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════
// NAMED LAYOUT MANAGEMENT (backend-backed)
// ═══════════════════════════════════════════════════════

export interface SavedLayout {
    id: string;
    name: string;
    savedAt: string;
    objectCount: number;
    zoneCount: number;
    rackCount: number;
    objects: PlacedObject[];
}

export async function listLayouts(): Promise<SavedLayout[]> {
    try {
        const layouts = await inventoryService.getWarehouseLayouts();
        return layouts.map(l => ({
            id: l.id,
            name: l.name,
            savedAt: l.updatedAt,
            objectCount: l.objectCount,
            zoneCount: l.zoneCount,
            rackCount: l.rackCount,
            objects: l.objects,
        }));
    } catch (err) {
        console.error('Failed to list layouts:', err);
        return [];
    }
}

export async function saveNamedLayout(name: string, objects: PlacedObject[]): Promise<SavedLayout> {
    const result = await inventoryService.saveWarehouseLayout(undefined, {
        name,
        objects,
        isActive: false,
    });
    return {
        id: result.id,
        name: result.name,
        savedAt: result.updatedAt,
        objectCount: result.objectCount,
        zoneCount: result.zoneCount,
        rackCount: result.rackCount,
        objects: result.objects,
    };
}

export async function loadNamedLayout(id: string): Promise<PlacedObject[] | null> {
    try {
        const layout = await inventoryService.getWarehouseLayout(id);
        return layout?.objects || null;
    } catch {
        return null;
    }
}

export async function deleteNamedLayout(id: string): Promise<void> {
    try { await inventoryService.deleteWarehouseLayout(id); } catch { /* ignore */ }
}

export async function renameNamedLayout(id: string, name: string): Promise<void> {
    try {
        // Load existing, then update name
        const layout = await inventoryService.getWarehouseLayout(id);
        if (layout) {
            await inventoryService.saveWarehouseLayout(undefined, {
                id,
                name,
                objects: layout.objects,
            });
        }
    } catch { /* ignore */ }
}

export function exportLayoutJSON(objects: PlacedObject[]): string {
    return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), objects }, null, 2);
}

export function importLayoutJSON(json: string): PlacedObject[] | null {
    try {
        const data = JSON.parse(json);
        if (data.objects && Array.isArray(data.objects)) return data.objects;
    } catch { /* ignore */ }
    return null;
}

export function duplicateObject(obj: PlacedObject): PlacedObject {
    return { ...obj, id: generateId(), x: obj.x + 1, z: obj.z + 1 };
}

// ═══════════════════════════════════════════
// WAREHOUSE TEMPLATES
// ═══════════════════════════════════════════

export interface WarehouseTemplate {
    name: string;
    description: string;
    icon: string;
    objects: () => PlacedObject[];
}

export const TEMPLATES: WarehouseTemplate[] = [
    {
        name: 'Small Warehouse',
        description: '15×12 — receiving, 2 storage rows, shipping dock',
        icon: '🏠',
        objects: () => [
            { id: generateId(), type: 'zone', x: 1, z: 1, rotation: 0, width: 3, depth: 2, zoneType: 'receiving', label: 'Receiving', color: '#22c55e' },
            { id: generateId(), type: 'zone', x: 5, z: 1, rotation: 0, width: 5, depth: 4, zoneType: 'storage', label: 'Storage', color: '#3b82f6' },
            { id: generateId(), type: 'zone', x: 11, z: 1, rotation: 0, width: 3, depth: 3, zoneType: 'shipping', label: 'Shipping', color: '#06b6d4' },
            { id: generateId(), type: 'zone', x: 1, z: 4, rotation: 0, width: 3, depth: 3, zoneType: 'picking', label: 'Picking', color: '#f59e0b' },
            ...Array.from({ length: 3 }, (_, i) => ({
                id: generateId(), type: 'rack' as PlacedObjectType, x: 6 + i * 1.2, z: 2, rotation: 0, width: 1, depth: 1, rackLevels: 3,
            })),
            ...Array.from({ length: 3 }, (_, i) => ({
                id: generateId(), type: 'rack' as PlacedObjectType, x: 6 + i * 1.2, z: 4, rotation: 0, width: 1, depth: 1, rackLevels: 3,
            })),
            { id: generateId(), type: 'workstation', x: 2, z: 5, rotation: 0, width: 2, depth: 1 },
            { id: generateId(), type: 'pallet', x: 2, z: 2, rotation: 0, width: 1, depth: 1 },
            { id: generateId(), type: 'door', x: 12, z: 4, rotation: 0, width: 2, depth: 1 },
        ],
    },
    {
        name: 'Medium Warehouse',
        description: '22×18 — full zone layout with cold storage',
        icon: '🏭',
        objects: () => getDefaultLayout(),
    },
    {
        name: 'Large Distribution Center',
        description: '28×24 — 6 zones, conveyor system, multiple docks',
        icon: '🏗️',
        objects: () => [
            { id: generateId(), type: 'zone', x: 1, z: 1, rotation: 0, width: 5, depth: 3, zoneType: 'receiving', label: 'Receiving A', color: '#22c55e' },
            { id: generateId(), type: 'zone', x: 1, z: 5, rotation: 0, width: 5, depth: 3, zoneType: 'receiving', label: 'Receiving B', color: '#22c55e' },
            { id: generateId(), type: 'zone', x: 8, z: 1, rotation: 0, width: 8, depth: 5, zoneType: 'storage', label: 'Storage A', color: '#3b82f6' },
            { id: generateId(), type: 'zone', x: 8, z: 8, rotation: 0, width: 8, depth: 5, zoneType: 'storage', label: 'Storage B', color: '#3b82f6' },
            { id: generateId(), type: 'zone', x: 8, z: 15, rotation: 0, width: 8, depth: 4, zoneType: 'storage', label: 'Storage C', color: '#3b82f6' },
            { id: generateId(), type: 'zone', x: 18, z: 1, rotation: 0, width: 5, depth: 4, zoneType: 'shipping', label: 'Shipping', color: '#06b6d4' },
            { id: generateId(), type: 'zone', x: 18, z: 7, rotation: 0, width: 5, depth: 4, zoneType: 'cold', label: 'Cold Storage', color: '#6366f1' },
            { id: generateId(), type: 'zone', x: 1, z: 10, rotation: 0, width: 5, depth: 4, zoneType: 'picking', label: 'Picking', color: '#f59e0b' },
            { id: generateId(), type: 'zone', x: 1, z: 16, rotation: 0, width: 5, depth: 3, zoneType: 'packing', label: 'Packing', color: '#a855f7' },
            { id: generateId(), type: 'zone', x: 18, z: 13, rotation: 0, width: 5, depth: 3, zoneType: 'quarantine', label: 'Quarantine', color: '#ef4444' },
            // Racks in Storage A
            ...Array.from({ length: 6 }, (_, i) => ({
                id: generateId(), type: 'rack' as PlacedObjectType, x: 9 + i * 1.1, z: 2, rotation: 0, width: 1, depth: 1, rackLevels: 5,
            })),
            ...Array.from({ length: 6 }, (_, i) => ({
                id: generateId(), type: 'rack' as PlacedObjectType, x: 9 + i * 1.1, z: 4, rotation: 0, width: 1, depth: 1, rackLevels: 5,
            })),
            // Racks in Storage B
            ...Array.from({ length: 6 }, (_, i) => ({
                id: generateId(), type: 'rack' as PlacedObjectType, x: 9 + i * 1.1, z: 9, rotation: 0, width: 1, depth: 1, rackLevels: 4,
            })),
            ...Array.from({ length: 6 }, (_, i) => ({
                id: generateId(), type: 'rack' as PlacedObjectType, x: 9 + i * 1.1, z: 11, rotation: 0, width: 1, depth: 1, rackLevels: 4,
            })),
            // Racks in Storage C
            ...Array.from({ length: 6 }, (_, i) => ({
                id: generateId(), type: 'rack' as PlacedObjectType, x: 9 + i * 1.1, z: 16, rotation: 0, width: 1, depth: 1, rackLevels: 3,
            })),
            // Conveyors
            { id: generateId(), type: 'conveyor', x: 3, z: 14, rotation: 0, width: 4, depth: 1 },
            { id: generateId(), type: 'conveyor', x: 19, z: 5, rotation: 0, width: 3, depth: 1 },
            // Doors
            { id: generateId(), type: 'door', x: 1, z: 4, rotation: 0, width: 2, depth: 1 },
            { id: generateId(), type: 'door', x: 19, z: 5, rotation: 0, width: 2, depth: 1 },
            // Workstations
            { id: generateId(), type: 'workstation', x: 2, z: 17, rotation: 0, width: 2, depth: 1 },
            { id: generateId(), type: 'workstation', x: 19, z: 14, rotation: 0, width: 2, depth: 1 },
            // Forklifts
            { id: generateId(), type: 'forklift', x: 7, z: 6, rotation: 0, width: 1, depth: 2 },
            { id: generateId(), type: 'forklift', x: 7, z: 14, rotation: 0, width: 1, depth: 2 },
            // Bollards
            ...Array.from({ length: 4 }, (_, i) => ({
                id: generateId(), type: 'bollard' as PlacedObjectType, x: 7, z: 1 + i * 5, rotation: 0, width: 1, depth: 1,
            })),
            // Pallets
            ...Array.from({ length: 3 }, (_, i) => ({
                id: generateId(), type: 'pallet' as PlacedObjectType, x: 2 + i, z: 2, rotation: 0, width: 1, depth: 1,
            })),
        ],
    },
    {
        name: 'Empty Warehouse',
        description: 'Start from scratch — blank 30×30 grid',
        icon: '📐',
        objects: () => [],
    },
];

// ═══════════════════════════════════════════
// BIN GENERATION & LINKING HELPERS
// ═══════════════════════════════════════════

// Generate a bin code from rack position and level: e.g. "A03-R1-L2"
export function generateBinCode(rackObj: PlacedObject, level: number): string {
    const col = String.fromCharCode(65 + Math.min(Math.floor(rackObj.x), 25));
    const row = String.fromCharCode(65 + Math.min(Math.floor(rackObj.z), 25));
    const rackNum = Math.floor(rackObj.x) + 1;
    return `${col}${row.padStart(2, '0')}-R${rackNum}-L${level + 1}`;
}

// Generate bin records for all shelf levels of a rack
export function generateRackBinInputs(rackObj: PlacedObject): Array<{
    code: string; aisle: string; rack: string; level: string; position: string;
    binType: string; status: string;
}> {
    const levels = rackObj.rackLevels || 3;
    const col = String.fromCharCode(65 + Math.min(Math.floor(rackObj.x), 25));
    const row = Math.floor(rackObj.z) + 1;
    return Array.from({ length: levels }, (_, l) => ({
        code: `${col}${String(row).padStart(2, '0')}-R${Math.floor(rackObj.x) + 1}-L${l + 1}`,
        aisle: col,
        rack: `R${Math.floor(rackObj.x) + 1}`,
        level: `L${l + 1}`,
        position: `${col}${row}`,
        binType: 'rack_shelf',
        status: 'active',
    }));
}

// Inventory data types for the 3D scene
export interface BinOccupancy {
    binId: string;
    binCode: string;
    level: number;
    currentItemCount: number;
    isOccupied: boolean;
    maxWeight?: number;
    items?: Array<{ name: string; sku: string; qty: number }>;
}

export interface RackInventory {
    rackObjectId: string;
    bins: BinOccupancy[];
    totalItems: number;
    fillPercent: number; // 0-100
}

export interface ZoneInventory {
    zoneObjectId: string;
    linkedZoneId: string;
    totalBins: number;
    occupiedBins: number;
    totalItems: number;
    utilization: number; // 0-100
}
