// Warehouse Builder State & Types
// Sim-game style layout customization

export type PlacedObjectType =
    | 'zone' | 'rack' | 'wall' | 'door' | 'pallet'
    | 'bollard' | 'workstation' | 'conveyor' | 'forklift';

export type ZoneType = 'receiving' | 'storage' | 'picking' | 'packing' | 'shipping' | 'cold' | 'quarantine' | 'hazardous' | 'staging' | 'climate_controlled';

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
    // WMS location hierarchy: Row → Rack (Bay) → Bin (Level)
    row?: string;              // Row identifier (A, B, C...)
    bay?: number;              // Bay position within the row (1, 2, 3...)
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
    // ═══════════════════════════════════════════════════════
    // AMAZON-STYLE FULFILLMENT CENTER — DENSE LAYOUT
    // 30×30 grid packed with racks, conveyors, and zones.
    // Flow: Inbound Docks → Receiving → Stow → Storage →
    //       Pick → Pack → Sort → Ship → Outbound Docks
    // ═══════════════════════════════════════════════════════

    const objs: PlacedObject[] = [];
    const id = () => generateId();
    const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWX'.split('');

    // ─── INBOUND: RECEIVING DOCK (front, z=0-3) ────────
    objs.push({ id: id(), type: 'zone', x: 1, z: 1, rotation: 0, width: 12, depth: 3, zoneType: 'receiving', label: 'Inbound Receiving', color: '#22c55e' });
    // 6 dock doors along front wall
    for (let i = 0; i < 6; i++) {
        objs.push({ id: id(), type: 'door', x: 1 + i * 2, z: 0, rotation: 0, width: 1.5, depth: 1, label: `IN-${i + 1}` });
    }
    // Inbound pallets staged
    for (let i = 0; i < 8; i++) {
        objs.push({ id: id(), type: 'pallet', x: 2 + i * 1.1, z: 2, rotation: 0, width: 1, depth: 1 });
    }
    for (let i = 0; i < 6; i++) {
        objs.push({ id: id(), type: 'pallet', x: 2 + i * 1.3, z: 3, rotation: 90, width: 1, depth: 1 });
    }
    // Inbound conveyor line
    objs.push({ id: id(), type: 'conveyor', x: 1, z: 3.5, rotation: 0, width: 12, depth: 1, label: 'Inbound Sortation' });

    // ─── QUARANTINE / QC (front-right) ─────────────────
    objs.push({ id: id(), type: 'zone', x: 14, z: 1, rotation: 0, width: 4, depth: 3, zoneType: 'quarantine', label: 'QC Hold', color: '#ef4444' });
    objs.push({ id: id(), type: 'pallet', x: 15, z: 2, rotation: 0, width: 1, depth: 1 });
    objs.push({ id: id(), type: 'pallet', x: 16.2, z: 2, rotation: 0, width: 1, depth: 1 });
    objs.push({ id: id(), type: 'workstation', x: 15, z: 3, rotation: 0, width: 2, depth: 1 });

    // ─── COLD STORAGE (far right, z=1-6) ───────────────
    objs.push({ id: id(), type: 'zone', x: 20, z: 1, rotation: 0, width: 9, depth: 5, zoneType: 'cold', label: 'Cold Chain (-18°C)', color: '#6366f1' });
    objs.push({ id: id(), type: 'door', x: 20, z: 3, rotation: 90, width: 2, depth: 1, label: 'Freezer' });
    // Cold racks — 3 rows × 6 bays
    for (let row = 0; row < 3; row++) {
        for (let bay = 0; bay < 6; bay++) {
            objs.push({ id: id(), type: 'rack', x: 21 + bay * 1.15, z: 2 + row * 1.5, rotation: 0, width: 1, depth: 1, rackLevels: 4, row: `CF${row}`, bay: bay + 1 });
        }
    }

    // ═══════════════════════════════════════════════════
    // MAIN STORAGE — DENSE RACK FIELD (z=5 to z=21)
    // 16 rows × 12 bays = 192 racks
    // ═══════════════════════════════════════════════════
    const RACK_ZONE_X = 1;
    const RACK_ZONE_W = 28;
    const RACK_ZONE_Z = 5;
    const RACK_ZONE_D = 17;

    // Left storage block (x=1-13)
    objs.push({ id: id(), type: 'zone', x: 1, z: 5, rotation: 0, width: 13, depth: 17, zoneType: 'storage', label: 'Storage Block A', color: '#3b82f6' });
    // Right storage block (x=15-28)
    objs.push({ id: id(), type: 'zone', x: 15, z: 5, rotation: 0, width: 14, depth: 17, zoneType: 'storage', label: 'Storage Block B', color: '#3b82f6' });

    // === LEFT BLOCK RACKS: rows A-H, 10 bays each ===
    for (let row = 0; row < 8; row++) {
        const rz = 6 + row * 2; // rack z position (rows every 2 units, leaving 1-unit aisles)
        for (let bay = 0; bay < 10; bay++) {
            const rx = 2 + bay * 1.1;
            const levels = row < 4 ? 5 : (row < 6 ? 4 : 3); // taller racks in first rows
            objs.push({ id: id(), type: 'rack', x: rx, z: rz, rotation: 0, width: 1, depth: 1, rackLevels: levels, row: ROW_LETTERS[row], bay: bay + 1 });
        }
    }

    // === RIGHT BLOCK RACKS: rows I-P, 10 bays each ===
    for (let row = 0; row < 8; row++) {
        const rz = 6 + row * 2;
        for (let bay = 0; bay < 10; bay++) {
            const rx = 16 + bay * 1.1;
            const levels = row < 4 ? 5 : (row < 6 ? 4 : 3);
            objs.push({ id: id(), type: 'rack', x: rx, z: rz, rotation: 0, width: 1, depth: 1, rackLevels: levels, row: ROW_LETTERS[8 + row], bay: bay + 1 });
        }
    }

    // === CENTER AISLE CONVEYOR — vertical spine (x=14) ===
    objs.push({ id: id(), type: 'conveyor', x: 14, z: 5.5, rotation: 90, width: 16, depth: 1, label: 'Main Spine Conveyor' });

    // === CROSS AISLES — horizontal conveyors at z=9, z=14, z=18 ===
    objs.push({ id: id(), type: 'conveyor', x: 1, z: 9, rotation: 0, width: 12, depth: 1, label: 'Cross Aisle A' });
    objs.push({ id: id(), type: 'conveyor', x: 16, z: 14, rotation: 0, width: 12, depth: 1, label: 'Cross Aisle B' });

    // === FORKLIFTS IN AISLES ===
    const forkliftPositions: [number, number, number][] = [
        [6, 7, 90], [6, 11, 270], [6, 15, 90], [6, 19, 270],
        [20, 7, 90], [20, 11, 270], [20, 15, 90], [20, 19, 270],
        [14, 8, 0], [14, 16, 180],
    ];
    forkliftPositions.forEach(([fx, fz, fr]) => {
        objs.push({ id: id(), type: 'forklift', x: fx, z: fz, rotation: fr, width: 1, depth: 1 });
    });

    // === SAFETY BOLLARDS — every aisle intersection ===
    const bollardCols = [0.5, 13.5, 14.5, 28.5];
    const bollardRows = [5, 9, 13, 17, 21];
    bollardCols.forEach(bx => {
        bollardRows.forEach(bz => {
            objs.push({ id: id(), type: 'bollard', x: bx, z: bz, rotation: 0, width: 1, depth: 1 });
        });
    });

    // ═══════════════════════════════════════════════════
    // OUTBOUND: PICK → PACK → SORT → SHIP (z=22-29)
    // ═══════════════════════════════════════════════════

    // ─── PICKING STATIONS (z=22-24) ────────────────────
    objs.push({ id: id(), type: 'zone', x: 1, z: 22, rotation: 0, width: 13, depth: 3, zoneType: 'picking', label: 'Pick Mod 1-6', color: '#f59e0b' });
    objs.push({ id: id(), type: 'zone', x: 15, z: 22, rotation: 0, width: 14, depth: 3, zoneType: 'picking', label: 'Pick Mod 7-12', color: '#f59e0b' });
    // Pick stations — 12 workstations
    for (let i = 0; i < 6; i++) {
        objs.push({ id: id(), type: 'workstation', x: 2 + i * 2, z: 23, rotation: 0, width: 1.5, depth: 1 });
    }
    for (let i = 0; i < 6; i++) {
        objs.push({ id: id(), type: 'workstation', x: 16 + i * 2, z: 23, rotation: 0, width: 1.5, depth: 1 });
    }
    // Pick-to-light racks (small, 2-level)
    for (let i = 0; i < 6; i++) {
        objs.push({ id: id(), type: 'rack', x: 2 + i * 2, z: 22.2, rotation: 0, width: 1, depth: 1, rackLevels: 2, row: 'P', bay: i + 1 });
    }
    for (let i = 0; i < 6; i++) {
        objs.push({ id: id(), type: 'rack', x: 16 + i * 2, z: 22.2, rotation: 0, width: 1, depth: 1, rackLevels: 2, row: 'Q', bay: i + 1 });
    }

    // ─── PACKING LINES (z=25-26) ───────────────────────
    objs.push({ id: id(), type: 'zone', x: 1, z: 25, rotation: 0, width: 28, depth: 2, zoneType: 'packing', label: 'Pack Lines 1-8', color: '#a855f7' });
    // 8 packing workstations in a line
    for (let i = 0; i < 8; i++) {
        objs.push({ id: id(), type: 'workstation', x: 2 + i * 3.3, z: 25.5, rotation: 0, width: 2, depth: 1 });
    }
    // Pack conveyor → sort
    objs.push({ id: id(), type: 'conveyor', x: 1, z: 26.5, rotation: 0, width: 28, depth: 1, label: 'Pack → Sort Conveyor' });

    // ─── SHIPPING / OUTBOUND DOCKS (z=27-29) ──────────
    objs.push({ id: id(), type: 'zone', x: 1, z: 27, rotation: 0, width: 28, depth: 2.5, zoneType: 'shipping', label: 'Outbound Shipping', color: '#06b6d4' });
    // Outbound conveyor
    objs.push({ id: id(), type: 'conveyor', x: 1, z: 27.5, rotation: 0, width: 28, depth: 1, label: 'Outbound Sort Line' });
    // Staged outbound pallets
    for (let i = 0; i < 12; i++) {
        objs.push({ id: id(), type: 'pallet', x: 2 + i * 2.2, z: 28.5, rotation: 0, width: 1, depth: 1 });
    }
    // 8 outbound dock doors
    for (let i = 0; i < 8; i++) {
        objs.push({ id: id(), type: 'door', x: 2 + i * 3.2, z: 29.5, rotation: 0, width: 2, depth: 1, label: `OUT-${i + 1}` });
    }
    // Outbound forklifts
    objs.push({ id: id(), type: 'forklift', x: 5, z: 28, rotation: 180, width: 1, depth: 1 });
    objs.push({ id: id(), type: 'forklift', x: 15, z: 28, rotation: 180, width: 1, depth: 1 });
    objs.push({ id: id(), type: 'forklift', x: 25, z: 28, rotation: 180, width: 1, depth: 1 });

    return objs;
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
    // ─── WAREHOUSE-TYPE-SPECIFIC TEMPLATES ──────────────
    {
        name: 'Cold Storage Warehouse',
        description: '20×18 — freezer zones, airlocks, insulated walls, temp monitoring',
        icon: '❄️',
        objects: (): PlacedObject[] => {
            const id = () => generateId();
            const objs: PlacedObject[] = [];

            // ─── OUTER INSULATED WALLS ─────────────────────
            objs.push({ id: id(), type: 'wall', x: 0, z: 0, rotation: 0, width: 20, depth: 1, label: 'Insulated Wall N', color: '#a5b4fc' });
            objs.push({ id: id(), type: 'wall', x: 0, z: 17, rotation: 0, width: 20, depth: 1, label: 'Insulated Wall S', color: '#a5b4fc' });
            objs.push({ id: id(), type: 'wall', x: 0, z: 1, rotation: 90, width: 16, depth: 1, label: 'Insulated Wall W', color: '#a5b4fc' });
            objs.push({ id: id(), type: 'wall', x: 19, z: 1, rotation: 90, width: 16, depth: 1, label: 'Insulated Wall E', color: '#a5b4fc' });

            // ─── FREEZER ZONE A (-18°C) ────────────────────
            objs.push({ id: id(), type: 'zone', x: 1, z: 1, rotation: 0, width: 8, depth: 7, zoneType: 'cold', label: 'Freezer A (-18°C)', color: '#6366f1' });
            // Insulated partition wall
            objs.push({ id: id(), type: 'wall', x: 9, z: 1, rotation: 90, width: 7, depth: 1, label: 'Partition Wall', color: '#818cf8' });
            // Racks in Freezer A — 4 rows × 6 bays, 4 levels
            for (let row = 0; row < 4; row++) {
                for (let bay = 0; bay < 6; bay++) {
                    objs.push({ id: id(), type: 'rack', x: 2 + bay * 1.1, z: 2 + row * 1.5, rotation: 0, width: 1, depth: 1, rackLevels: 4, row: `FA${row}`, bay: bay + 1, color: '#818cf8' });
                }
            }

            // ─── FREEZER ZONE B (-25°C) ────────────────────
            objs.push({ id: id(), type: 'zone', x: 10, z: 1, rotation: 0, width: 9, depth: 7, zoneType: 'cold', label: 'Deep Freeze B (-25°C)', color: '#4f46e5' });
            // Racks in Freezer B — 4 rows × 7 bays, 4 levels
            for (let row = 0; row < 4; row++) {
                for (let bay = 0; bay < 7; bay++) {
                    objs.push({ id: id(), type: 'rack', x: 11 + bay * 1.1, z: 2 + row * 1.5, rotation: 0, width: 1, depth: 1, rackLevels: 4, row: `FB${row}`, bay: bay + 1, color: '#7c3aed' });
                }
            }

            // ─── AIRLOCK / BUFFER ZONE ─────────────────────
            objs.push({ id: id(), type: 'wall', x: 1, z: 8, rotation: 0, width: 18, depth: 1, label: 'Airlock Wall', color: '#c4b5fd' });
            objs.push({ id: id(), type: 'zone', x: 1, z: 9, rotation: 0, width: 18, depth: 2, zoneType: 'storage', label: 'Airlock Buffer Zone', color: '#c4b5fd' });
            objs.push({ id: id(), type: 'door', x: 5, z: 8, rotation: 0, width: 2, depth: 1, label: 'Airlock Door A' });
            objs.push({ id: id(), type: 'door', x: 13, z: 8, rotation: 0, width: 2, depth: 1, label: 'Airlock Door B' });

            // ─── AMBIENT STAGING / SHIPPING ────────────────
            objs.push({ id: id(), type: 'zone', x: 1, z: 11, rotation: 0, width: 8, depth: 3, zoneType: 'receiving', label: 'Inbound Staging', color: '#93c5fd' });
            objs.push({ id: id(), type: 'zone', x: 10, z: 11, rotation: 0, width: 9, depth: 3, zoneType: 'shipping', label: 'Outbound Staging', color: '#7dd3fc' });
            // Pallets in staging
            for (let i = 0; i < 5; i++) {
                objs.push({ id: id(), type: 'pallet', x: 2 + i * 1.2, z: 12, rotation: 0, width: 1, depth: 1 });
            }
            for (let i = 0; i < 5; i++) {
                objs.push({ id: id(), type: 'pallet', x: 11 + i * 1.2, z: 12, rotation: 0, width: 1, depth: 1 });
            }

            // ─── TEMPERATURE MONITORING WORKSTATIONS ───────
            objs.push({ id: id(), type: 'workstation', x: 2, z: 14, rotation: 0, width: 2, depth: 1, label: 'Temp Monitor A' });
            objs.push({ id: id(), type: 'workstation', x: 10, z: 14, rotation: 0, width: 2, depth: 1, label: 'Temp Monitor B' });
            objs.push({ id: id(), type: 'workstation', x: 16, z: 14, rotation: 0, width: 2, depth: 1, label: 'Temp Monitor C' });

            // ─── DOCK DOORS (minimal) ──────────────────────
            objs.push({ id: id(), type: 'door', x: 2, z: 15, rotation: 0, width: 2, depth: 1, label: 'IN-1' });
            objs.push({ id: id(), type: 'door', x: 6, z: 15, rotation: 0, width: 2, depth: 1, label: 'IN-2' });
            objs.push({ id: id(), type: 'door', x: 12, z: 15, rotation: 0, width: 2, depth: 1, label: 'OUT-1' });
            objs.push({ id: id(), type: 'door', x: 16, z: 15, rotation: 0, width: 2, depth: 1, label: 'OUT-2' });

            // ─── FORKLIFTS ─────────────────────────────────
            objs.push({ id: id(), type: 'forklift', x: 4, z: 10, rotation: 90, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'forklift', x: 14, z: 10, rotation: 270, width: 1, depth: 1 });

            // ─── BOLLARDS ──────────────────────────────────
            objs.push({ id: id(), type: 'bollard', x: 0.5, z: 8.5, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'bollard', x: 18.5, z: 8.5, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'bollard', x: 9, z: 8.5, rotation: 0, width: 1, depth: 1 });

            return objs;
        },
    },
    {
        name: 'Hazardous Materials',
        description: '24×20 — wide safety aisles, containment zones, emergency stations',
        icon: '☢️',
        objects: (): PlacedObject[] => {
            const id = () => generateId();
            const objs: PlacedObject[] = [];

            // ─── CONTAINMENT PERIMETER WALLS ───────────────
            objs.push({ id: id(), type: 'wall', x: 0, z: 0, rotation: 0, width: 24, depth: 1, label: 'Containment Wall N', color: '#fbbf24' });
            objs.push({ id: id(), type: 'wall', x: 0, z: 19, rotation: 0, width: 24, depth: 1, label: 'Containment Wall S', color: '#fbbf24' });
            objs.push({ id: id(), type: 'wall', x: 0, z: 1, rotation: 90, width: 18, depth: 1, label: 'Containment Wall W', color: '#fbbf24' });
            objs.push({ id: id(), type: 'wall', x: 23, z: 1, rotation: 90, width: 18, depth: 1, label: 'Containment Wall E', color: '#fbbf24' });

            // ─── HAZMAT STORAGE ZONE A (left) ──────────────
            objs.push({ id: id(), type: 'zone', x: 2, z: 2, rotation: 0, width: 9, depth: 7, zoneType: 'quarantine', label: 'HazMat Zone A — Flammables', color: '#ef4444' });
            // Spill containment berms (inner walls)
            objs.push({ id: id(), type: 'wall', x: 2, z: 2, rotation: 0, width: 9, depth: 1, label: 'Berm A-N', color: '#dc2626' });
            objs.push({ id: id(), type: 'wall', x: 2, z: 8, rotation: 0, width: 9, depth: 1, label: 'Berm A-S', color: '#dc2626' });
            objs.push({ id: id(), type: 'wall', x: 2, z: 3, rotation: 90, width: 5, depth: 1, label: 'Berm A-W', color: '#dc2626' });
            objs.push({ id: id(), type: 'wall', x: 10, z: 3, rotation: 90, width: 5, depth: 1, label: 'Berm A-E', color: '#dc2626' });
            // Wide-spaced racks (2-unit spacing) — 3 rows × 3 bays
            for (let row = 0; row < 3; row++) {
                for (let bay = 0; bay < 3; bay++) {
                    objs.push({ id: id(), type: 'rack', x: 3.5 + bay * 2, z: 3.5 + row * 2, rotation: 0, width: 1, depth: 1, rackLevels: 3, row: `HA${row}`, bay: bay + 1, color: '#f87171' });
                }
            }

            // ─── HAZMAT STORAGE ZONE B (right) ─────────────
            objs.push({ id: id(), type: 'zone', x: 13, z: 2, rotation: 0, width: 9, depth: 7, zoneType: 'quarantine', label: 'HazMat Zone B — Corrosives', color: '#f97316' });
            // Spill containment berms
            objs.push({ id: id(), type: 'wall', x: 13, z: 2, rotation: 0, width: 9, depth: 1, label: 'Berm B-N', color: '#ea580c' });
            objs.push({ id: id(), type: 'wall', x: 13, z: 8, rotation: 0, width: 9, depth: 1, label: 'Berm B-S', color: '#ea580c' });
            objs.push({ id: id(), type: 'wall', x: 13, z: 3, rotation: 90, width: 5, depth: 1, label: 'Berm B-W', color: '#ea580c' });
            objs.push({ id: id(), type: 'wall', x: 21, z: 3, rotation: 90, width: 5, depth: 1, label: 'Berm B-E', color: '#ea580c' });
            // Wide-spaced racks — 3 rows × 3 bays
            for (let row = 0; row < 3; row++) {
                for (let bay = 0; bay < 3; bay++) {
                    objs.push({ id: id(), type: 'rack', x: 14.5 + bay * 2, z: 3.5 + row * 2, rotation: 0, width: 1, depth: 1, rackLevels: 3, row: `HB${row}`, bay: bay + 1, color: '#fb923c' });
                }
            }

            // ─── SAFETY BOLLARDS (every intersection) ──────
            const bollardPositions: [number, number][] = [
                [1.5, 1.5], [11.5, 1.5], [22.5, 1.5],
                [1.5, 9.5], [11.5, 9.5], [22.5, 9.5],
                [1.5, 18.5], [11.5, 18.5], [22.5, 18.5],
                [6, 9.5], [17, 9.5],
            ];
            bollardPositions.forEach(([bx, bz]) => {
                objs.push({ id: id(), type: 'bollard', x: bx, z: bz, rotation: 0, width: 1, depth: 1 });
            });

            // ─── EMERGENCY SHOWER STATIONS ──────────────────
            objs.push({ id: id(), type: 'workstation', x: 1, z: 10, rotation: 0, width: 2, depth: 1, label: 'Emergency Shower 1', color: '#fbbf24' });
            objs.push({ id: id(), type: 'workstation', x: 11, z: 10, rotation: 0, width: 2, depth: 1, label: 'Emergency Shower 2', color: '#fbbf24' });
            objs.push({ id: id(), type: 'workstation', x: 21, z: 10, rotation: 0, width: 2, depth: 1, label: 'Emergency Shower 3', color: '#fbbf24' });

            // ─── SAFETY / QC WORKSTATIONS ───────────────────
            objs.push({ id: id(), type: 'workstation', x: 5, z: 12, rotation: 0, width: 2, depth: 1, label: 'Safety Inspection' });
            objs.push({ id: id(), type: 'workstation', x: 17, z: 12, rotation: 0, width: 2, depth: 1, label: 'MSDS Station' });

            // ─── RECEIVING / SHIPPING (bottom) ─────────────
            objs.push({ id: id(), type: 'zone', x: 2, z: 13, rotation: 0, width: 9, depth: 3, zoneType: 'receiving', label: 'HazMat Receiving', color: '#22c55e' });
            objs.push({ id: id(), type: 'zone', x: 13, z: 13, rotation: 0, width: 9, depth: 3, zoneType: 'shipping', label: 'HazMat Shipping', color: '#06b6d4' });
            // Pallets
            for (let i = 0; i < 4; i++) {
                objs.push({ id: id(), type: 'pallet', x: 3 + i * 1.5, z: 14, rotation: 0, width: 1, depth: 1 });
            }
            for (let i = 0; i < 4; i++) {
                objs.push({ id: id(), type: 'pallet', x: 14 + i * 1.5, z: 14, rotation: 0, width: 1, depth: 1 });
            }

            // ─── DOORS ─────────────────────────────────────
            objs.push({ id: id(), type: 'door', x: 3, z: 16, rotation: 0, width: 2, depth: 1, label: 'IN-1' });
            objs.push({ id: id(), type: 'door', x: 7, z: 16, rotation: 0, width: 2, depth: 1, label: 'IN-2' });
            objs.push({ id: id(), type: 'door', x: 15, z: 16, rotation: 0, width: 2, depth: 1, label: 'OUT-1' });
            objs.push({ id: id(), type: 'door', x: 19, z: 16, rotation: 0, width: 2, depth: 1, label: 'OUT-2' });

            // ─── FORKLIFTS ─────────────────────────────────
            objs.push({ id: id(), type: 'forklift', x: 6, z: 11, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'forklift', x: 17, z: 11, rotation: 0, width: 1, depth: 1 });

            return objs;
        },
    },
    {
        name: 'Bonded Warehouse',
        description: '22×18 — customs inspection, sealed storage, security checkpoints',
        icon: '🔒',
        objects: (): PlacedObject[] => {
            const id = () => generateId();
            const objs: PlacedObject[] = [];

            // ─── SECURITY CHECKPOINT (entrance) ────────────
            objs.push({ id: id(), type: 'wall', x: 0, z: 0, rotation: 0, width: 22, depth: 1, label: 'Perimeter Wall N', color: '#94a3b8' });
            objs.push({ id: id(), type: 'wall', x: 0, z: 17, rotation: 0, width: 22, depth: 1, label: 'Perimeter Wall S', color: '#94a3b8' });
            objs.push({ id: id(), type: 'wall', x: 0, z: 1, rotation: 90, width: 16, depth: 1, label: 'Perimeter Wall W', color: '#94a3b8' });
            objs.push({ id: id(), type: 'wall', x: 21, z: 1, rotation: 90, width: 16, depth: 1, label: 'Perimeter Wall E', color: '#94a3b8' });
            // Security gate
            objs.push({ id: id(), type: 'wall', x: 8, z: 0, rotation: 0, width: 6, depth: 1, label: 'Security Gate Wall', color: '#64748b' });
            objs.push({ id: id(), type: 'door', x: 10, z: 0, rotation: 0, width: 2, depth: 1, label: 'Security Gate' });

            // ─── CUSTOMS INSPECTION AREA ───────────────────
            objs.push({ id: id(), type: 'zone', x: 1, z: 1, rotation: 0, width: 20, depth: 3, zoneType: 'quarantine', label: 'Customs Inspection Area', color: '#f59e0b' });
            objs.push({ id: id(), type: 'workstation', x: 3, z: 2, rotation: 0, width: 2, depth: 1, label: 'Customs Desk 1' });
            objs.push({ id: id(), type: 'workstation', x: 9, z: 2, rotation: 0, width: 2, depth: 1, label: 'Customs Desk 2' });
            objs.push({ id: id(), type: 'workstation', x: 15, z: 2, rotation: 0, width: 2, depth: 1, label: 'Customs Desk 3' });
            // Inspection pallets
            for (let i = 0; i < 6; i++) {
                objs.push({ id: id(), type: 'pallet', x: 2 + i * 3, z: 3, rotation: 0, width: 1, depth: 1 });
            }

            // ─── PARTITION WALL (inspection → sealed storage)
            objs.push({ id: id(), type: 'wall', x: 1, z: 4, rotation: 0, width: 20, depth: 1, label: 'Customs Barrier', color: '#64748b' });
            objs.push({ id: id(), type: 'door', x: 5, z: 4, rotation: 0, width: 2, depth: 1, label: 'Approved Entry' });
            objs.push({ id: id(), type: 'door', x: 15, z: 4, rotation: 0, width: 2, depth: 1, label: 'Approved Entry 2' });

            // ─── SEALED STORAGE ZONE A ─────────────────────
            objs.push({ id: id(), type: 'zone', x: 1, z: 5, rotation: 0, width: 9, depth: 5, zoneType: 'storage', label: 'Sealed Storage A', color: '#3b82f6' });
            objs.push({ id: id(), type: 'wall', x: 10, z: 5, rotation: 90, width: 5, depth: 1, label: 'Seal Partition', color: '#64748b' });
            // Racks in Zone A
            for (let row = 0; row < 3; row++) {
                for (let bay = 0; bay < 7; bay++) {
                    objs.push({ id: id(), type: 'rack', x: 2 + bay * 1.1, z: 6 + row * 1.5, rotation: 0, width: 1, depth: 1, rackLevels: 5, row: `SA${row}`, bay: bay + 1 });
                }
            }

            // ─── SEALED STORAGE ZONE B ─────────────────────
            objs.push({ id: id(), type: 'zone', x: 11, z: 5, rotation: 0, width: 10, depth: 5, zoneType: 'storage', label: 'Sealed Storage B', color: '#2563eb' });
            // Racks in Zone B
            for (let row = 0; row < 3; row++) {
                for (let bay = 0; bay < 7; bay++) {
                    objs.push({ id: id(), type: 'rack', x: 12 + bay * 1.1, z: 6 + row * 1.5, rotation: 0, width: 1, depth: 1, rackLevels: 5, row: `SB${row}`, bay: bay + 1 });
                }
            }

            // ─── PARTITION WALL (sealed storage → release) ─
            objs.push({ id: id(), type: 'wall', x: 1, z: 10, rotation: 0, width: 20, depth: 1, label: 'Release Barrier', color: '#64748b' });
            objs.push({ id: id(), type: 'door', x: 5, z: 10, rotation: 0, width: 2, depth: 1, label: 'Release Gate A' });
            objs.push({ id: id(), type: 'door', x: 15, z: 10, rotation: 0, width: 2, depth: 1, label: 'Release Gate B' });

            // ─── RELEASE / DOCUMENT PROCESSING ─────────────
            objs.push({ id: id(), type: 'zone', x: 1, z: 11, rotation: 0, width: 20, depth: 3, zoneType: 'packing', label: 'Release Processing', color: '#a855f7' });
            objs.push({ id: id(), type: 'workstation', x: 3, z: 12, rotation: 0, width: 2, depth: 1, label: 'Doc Processing 1' });
            objs.push({ id: id(), type: 'workstation', x: 9, z: 12, rotation: 0, width: 2, depth: 1, label: 'Doc Processing 2' });
            objs.push({ id: id(), type: 'workstation', x: 15, z: 12, rotation: 0, width: 2, depth: 1, label: 'Doc Processing 3' });
            objs.push({ id: id(), type: 'conveyor', x: 1, z: 13, rotation: 0, width: 20, depth: 1, label: 'Release Conveyor' });

            // ─── SHIPPING AREA ─────────────────────────────
            objs.push({ id: id(), type: 'zone', x: 1, z: 14, rotation: 0, width: 20, depth: 3, zoneType: 'shipping', label: 'Outbound Shipping', color: '#06b6d4' });
            for (let i = 0; i < 8; i++) {
                objs.push({ id: id(), type: 'pallet', x: 2 + i * 2.2, z: 15, rotation: 0, width: 1, depth: 1 });
            }
            objs.push({ id: id(), type: 'door', x: 3, z: 16, rotation: 0, width: 2, depth: 1, label: 'OUT-1' });
            objs.push({ id: id(), type: 'door', x: 9, z: 16, rotation: 0, width: 2, depth: 1, label: 'OUT-2' });
            objs.push({ id: id(), type: 'door', x: 15, z: 16, rotation: 0, width: 2, depth: 1, label: 'OUT-3' });

            // ─── FORKLIFTS & BOLLARDS ──────────────────────
            objs.push({ id: id(), type: 'forklift', x: 5, z: 8, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'forklift', x: 16, z: 8, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'forklift', x: 10, z: 15, rotation: 180, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'bollard', x: 0.5, z: 4.5, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'bollard', x: 20.5, z: 4.5, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'bollard', x: 0.5, z: 10.5, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'bollard', x: 20.5, z: 10.5, rotation: 0, width: 1, depth: 1 });

            return objs;
        },
    },
    {
        name: 'Transit Hub / Cross-Dock',
        description: '28×16 — inbound left, outbound right, conveyors, staging areas',
        icon: '🔄',
        objects: (): PlacedObject[] => {
            const id = () => generateId();
            const objs: PlacedObject[] = [];

            // ─── INBOUND DOCKS (LEFT SIDE) ─────────────────
            objs.push({ id: id(), type: 'zone', x: 0, z: 1, rotation: 0, width: 4, depth: 14, zoneType: 'receiving', label: 'Inbound Staging', color: '#22c55e' });
            for (let i = 0; i < 6; i++) {
                objs.push({ id: id(), type: 'door', x: 0, z: 2 + i * 2.2, rotation: 90, width: 2, depth: 1, label: `IN-${i + 1}` });
            }
            // Inbound pallets
            for (let i = 0; i < 6; i++) {
                objs.push({ id: id(), type: 'pallet', x: 2, z: 2 + i * 2.2, rotation: 0, width: 1, depth: 1 });
                objs.push({ id: id(), type: 'pallet', x: 3, z: 2 + i * 2.2, rotation: 0, width: 1, depth: 1 });
            }

            // ─── OUTBOUND DOCKS (RIGHT SIDE) ───────────────
            objs.push({ id: id(), type: 'zone', x: 24, z: 1, rotation: 0, width: 4, depth: 14, zoneType: 'shipping', label: 'Outbound Staging', color: '#06b6d4' });
            for (let i = 0; i < 6; i++) {
                objs.push({ id: id(), type: 'door', x: 27, z: 2 + i * 2.2, rotation: 90, width: 2, depth: 1, label: `OUT-${i + 1}` });
            }
            // Outbound pallets
            for (let i = 0; i < 6; i++) {
                objs.push({ id: id(), type: 'pallet', x: 25, z: 2 + i * 2.2, rotation: 0, width: 1, depth: 1 });
                objs.push({ id: id(), type: 'pallet', x: 26, z: 2 + i * 2.2, rotation: 0, width: 1, depth: 1 });
            }

            // ─── CENTER STAGING ZONES ──────────────────────
            objs.push({ id: id(), type: 'zone', x: 5, z: 1, rotation: 0, width: 18, depth: 4, zoneType: 'storage', label: 'Staging Area North', color: '#e2e8f0' });
            objs.push({ id: id(), type: 'zone', x: 5, z: 11, rotation: 0, width: 18, depth: 4, zoneType: 'storage', label: 'Staging Area South', color: '#e2e8f0' });
            // Staging pallets (north)
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 12; col++) {
                    objs.push({ id: id(), type: 'pallet', x: 6 + col * 1.4, z: 2 + row * 1.5, rotation: 0, width: 1, depth: 1 });
                }
            }
            // Staging pallets (south)
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 12; col++) {
                    objs.push({ id: id(), type: 'pallet', x: 6 + col * 1.4, z: 12 + row * 1.5, rotation: 0, width: 1, depth: 1 });
                }
            }

            // ─── 3 LONG CONVEYORS (left → right) ──────────
            objs.push({ id: id(), type: 'conveyor', x: 4, z: 5.5, rotation: 0, width: 20, depth: 1, label: 'Sort Line 1' });
            objs.push({ id: id(), type: 'conveyor', x: 4, z: 8, rotation: 0, width: 20, depth: 1, label: 'Sort Line 2' });
            objs.push({ id: id(), type: 'conveyor', x: 4, z: 10.5, rotation: 0, width: 20, depth: 1, label: 'Sort Line 3' });

            // ─── SORTING WORKSTATIONS ──────────────────────
            objs.push({ id: id(), type: 'workstation', x: 8, z: 7, rotation: 0, width: 2, depth: 1, label: 'Sort Station 1' });
            objs.push({ id: id(), type: 'workstation', x: 14, z: 7, rotation: 0, width: 2, depth: 1, label: 'Sort Station 2' });
            objs.push({ id: id(), type: 'workstation', x: 20, z: 7, rotation: 0, width: 2, depth: 1, label: 'Sort Station 3' });
            objs.push({ id: id(), type: 'workstation', x: 8, z: 9.5, rotation: 0, width: 2, depth: 1, label: 'Sort Station 4' });
            objs.push({ id: id(), type: 'workstation', x: 14, z: 9.5, rotation: 0, width: 2, depth: 1, label: 'Sort Station 5' });
            objs.push({ id: id(), type: 'workstation', x: 20, z: 9.5, rotation: 0, width: 2, depth: 1, label: 'Sort Station 6' });

            // ─── FORKLIFTS ─────────────────────────────────
            objs.push({ id: id(), type: 'forklift', x: 4, z: 3, rotation: 90, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'forklift', x: 4, z: 13, rotation: 90, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'forklift', x: 23, z: 3, rotation: 270, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'forklift', x: 23, z: 13, rotation: 270, width: 1, depth: 1 });

            // ─── BOLLARDS ──────────────────────────────────
            objs.push({ id: id(), type: 'bollard', x: 4.5, z: 0.5, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'bollard', x: 4.5, z: 15.5, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'bollard', x: 23.5, z: 0.5, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'bollard', x: 23.5, z: 15.5, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'bollard', x: 14, z: 0.5, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'bollard', x: 14, z: 15.5, rotation: 0, width: 1, depth: 1 });

            return objs;
        },
    },
    {
        name: 'Retail Backroom',
        description: '14×10 — compact receiving, small storage, returns corner, POS prep',
        icon: '🏪',
        objects: (): PlacedObject[] => {
            const id = () => generateId();
            const objs: PlacedObject[] = [];

            // ─── RECEIVING AREA ────────────────────────────
            objs.push({ id: id(), type: 'zone', x: 1, z: 1, rotation: 0, width: 4, depth: 3, zoneType: 'receiving', label: 'Receiving', color: '#22c55e' });
            objs.push({ id: id(), type: 'door', x: 1, z: 0, rotation: 0, width: 2, depth: 1, label: 'Delivery Door' });
            objs.push({ id: id(), type: 'pallet', x: 2, z: 2, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'pallet', x: 3.5, z: 2, rotation: 0, width: 1, depth: 1 });

            // ─── COMPACT STORAGE ───────────────────────────
            objs.push({ id: id(), type: 'zone', x: 6, z: 1, rotation: 0, width: 7, depth: 5, zoneType: 'storage', label: 'Backroom Storage', color: '#3b82f6' });
            // 2-level racks — 3 rows × 5 bays (compact)
            for (let row = 0; row < 3; row++) {
                for (let bay = 0; bay < 5; bay++) {
                    objs.push({ id: id(), type: 'rack', x: 7 + bay * 1.1, z: 2 + row * 1.5, rotation: 0, width: 1, depth: 1, rackLevels: 2, row: `R${row}`, bay: bay + 1 });
                }
            }

            // ─── RETURNS / QUARANTINE CORNER ───────────────
            objs.push({ id: id(), type: 'zone', x: 1, z: 5, rotation: 0, width: 4, depth: 3, zoneType: 'quarantine', label: 'Returns / Damages', color: '#ef4444' });
            objs.push({ id: id(), type: 'pallet', x: 2, z: 6, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'pallet', x: 3.5, z: 6, rotation: 0, width: 1, depth: 1 });

            // ─── POS PREP WORKSTATION ──────────────────────
            objs.push({ id: id(), type: 'workstation', x: 6, z: 7, rotation: 0, width: 2, depth: 1, label: 'POS Prep Station' });
            objs.push({ id: id(), type: 'workstation', x: 9, z: 7, rotation: 0, width: 2, depth: 1, label: 'Price Tagging' });

            // ─── FLOOR-TO-SHOP DOOR ────────────────────────
            objs.push({ id: id(), type: 'door', x: 12, z: 7, rotation: 0, width: 2, depth: 1, label: 'To Shop Floor' });

            // ─── BOLLARDS ──────────────────────────────────
            objs.push({ id: id(), type: 'bollard', x: 5.5, z: 0.5, rotation: 0, width: 1, depth: 1 });
            objs.push({ id: id(), type: 'bollard', x: 5.5, z: 8.5, rotation: 0, width: 1, depth: 1 });

            return objs;
        },
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
    const r = rackObj.row || suggestRow(rackObj.z);
    const b = rackObj.bay != null ? rackObj.bay : Math.floor(rackObj.x) + 1;
    const bayStr = String(b).padStart(2, '0');
    return Array.from({ length: levels }, (_, l) => ({
        code: `${r}-${bayStr}-L${l + 1}`,
        aisle: r,
        rack: `${r}-${bayStr}`,
        level: `L${l + 1}`,
        position: `${r}${bayStr}`,
        binType: 'rack_shelf',
        status: 'active',
    }));
}

// Inventory data types for the 3D scene
export interface BinOccupancy {
    binId: string;
    binCode: string;           // Full location code: e.g. "A-03-L2" or "A-03-L2-P1"
    level: number;             // Shelf level (0-based)
    position?: number;         // Horizontal position within level (for wide racks)
    currentItemCount: number;
    isOccupied: boolean;
    maxWeight?: number;
    items?: Array<{ name: string; sku: string; qty: number }>;
}

// Generate location code from row/bay/level
export function locationCode(row?: string, bay?: number, level?: number): string {
    const r = row || '?';
    const b = bay != null ? String(bay).padStart(2, '0') : '??';
    if (level != null) return `${r}-${b}-L${level}`;
    return `${r}-${b}`;
}

// Auto-detect suggested row letter from Z position
export function suggestRow(z: number): string {
    const idx = Math.floor(z / 2); // Group every 2 grid units into a row
    return String.fromCharCode(65 + Math.min(idx, 25)); // A-Z
}

// Auto-detect suggested bay number from X position within a row
export function suggestBay(x: number, objects: PlacedObject[], row: string): number {
    // Find all racks in the same row, sort by x, return position
    const sameRow = objects.filter(o => o.type === 'rack' && o.row === row).sort((a, b) => a.x - b.x);
    const idx = sameRow.findIndex(o => o.x === x);
    return idx >= 0 ? idx + 1 : sameRow.length + 1;
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

// ═══════════════════════════════════════════
// AUTO-GENERATE LAYOUT FROM INVENTORY DATA
// ═══════════════════════════════════════════

interface InvZoneInput { id: string; code: string; name: string; zoneType?: string; capacity?: number; }
interface InvBinInput { id: string; zoneId: string; code: string; aisle?: string; rack?: string; level?: string; position?: string; }

// Zone type → preferred position tier (lower = closer to entrance)
const ZONE_POSITION_PRIORITY: Record<string, number> = {
    receiving: 0, quarantine: 1, storage: 2, cold: 3, picking: 4, packing: 5, shipping: 6,
};
const ZONE_TYPE_COLORS: Record<string, string> = {
    receiving: '#22c55e', storage: '#3b82f6', picking: '#f59e0b',
    packing: '#a855f7', shipping: '#06b6d4', cold: '#6366f1', quarantine: '#ef4444',
};

export function generateLayoutFromInventory(
    zones: InvZoneInput[],
    bins: InvBinInput[],
    warehouseId: string,
    warehouseType?: string
): PlacedObject[] {
    if (zones.length === 0) return getDefaultLayout();

    const objs: PlacedObject[] = [];
    const id = () => generateId();

    // ═══════════════════════════════════════════════════
    // ANALYZE INVENTORY DATA STRUCTURE
    // ═══════════════════════════════════════════════════

    // Group bins by zone → aisle → rack
    interface RackInfo { rackCode: string; bins: InvBinInput[]; maxLevel: number; }
    interface AisleInfo { aisleCode: string; racks: Map<string, RackInfo>; }
    interface ZoneLayout {
        zone: InvZoneInput;
        aisles: Map<string, AisleInfo>;
        totalRacks: number;
        totalBins: number;
        maxAisleRacks: number;
    }

    const zoneLayouts: ZoneLayout[] = [];

    for (const zone of zones) {
        const zoneBins = bins.filter(b => b.zoneId === zone.id);
        if (zoneBins.length === 0 && zone.zoneType !== 'receiving' && zone.zoneType !== 'shipping') continue;

        const aisles = new Map<string, AisleInfo>();
        for (const bin of zoneBins) {
            const aisleCode = bin.aisle || 'Default';
            if (!aisles.has(aisleCode)) aisles.set(aisleCode, { aisleCode, racks: new Map() });
            const aisle = aisles.get(aisleCode)!;

            const rackCode = bin.rack || 'Default';
            if (!aisle.racks.has(rackCode)) aisle.racks.set(rackCode, { rackCode, bins: [], maxLevel: 1 });
            const rack = aisle.racks.get(rackCode)!;
            rack.bins.push(bin);

            // Parse level number
            const levelStr = bin.level || '1';
            const levelNum = parseInt(levelStr.replace(/\D/g, '')) || 1;
            rack.maxLevel = Math.max(rack.maxLevel, levelNum);
        }

        let totalRacks = 0;
        let maxAisleRacks = 0;
        for (const aisle of aisles.values()) {
            totalRacks += aisle.racks.size;
            maxAisleRacks = Math.max(maxAisleRacks, aisle.racks.size);
        }

        zoneLayouts.push({
            zone,
            aisles,
            totalRacks,
            totalBins: zoneBins.length,
            maxAisleRacks,
        });
    }

    // Sort zones by flow priority: receiving → storage → hazardous → cold → picking → packing → shipping
    const ZONE_FLOW: Record<string, number> = {
        receiving: 0, quarantine: 1, storage: 2, hazardous: 3,
        climate_controlled: 4, cold: 5, staging: 6, picking: 7,
        packing: 8, shipping: 9,
    };
    zoneLayouts.sort((a, b) => {
        const pa = ZONE_FLOW[a.zone.zoneType || 'storage'] ?? 5;
        const pb = ZONE_FLOW[b.zone.zoneType || 'storage'] ?? 5;
        return pa - pb;
    });

    // ═══════════════════════════════════════════════════
    // CALCULATE GRID SIZE based on actual data
    // ═══════════════════════════════════════════════════
    const maxRacksInAnyAisle = Math.max(...zoneLayouts.map(zl => zl.maxAisleRacks), 3);
    const totalAisles = zoneLayouts.reduce((s, zl) => s + zl.aisles.size, 0);
    const totalRacks = zoneLayouts.reduce((s, zl) => s + zl.totalRacks, 0);

    // Width: max racks per aisle * spacing + margin
    const rackSpacing = 1.2;
    const zoneMarginX = 1;
    const minZoneWidth = maxRacksInAnyAisle * rackSpacing + 3;
    const G = Math.max(Math.ceil(minZoneWidth + 4), 18); // grid size

    // ═══════════════════════════════════════════════════
    // PLACE EACH ZONE
    // ═══════════════════════════════════════════════════
    let cursorZ = 1; // current Z position (flows top-to-bottom)
    const ZONE_TYPE_COLORS: Record<string, string> = {
        receiving: '#22c55e', storage: '#3b82f6', picking: '#f59e0b',
        packing: '#a855f7', shipping: '#06b6d4', cold: '#6366f1',
        quarantine: '#ef4444', hazardous: '#dc2626', staging: '#d97706',
        climate_controlled: '#4f46e5',
    };

    for (const zl of zoneLayouts) {
        const zone = zl.zone;
        const zoneType = zone.zoneType || 'storage';
        const zoneColor = ZONE_TYPE_COLORS[zoneType] || '#3b82f6';
        const aisleCount = zl.aisles.size;

        // ─── RECEIVING ZONE ─────────────────────────────
        if (zoneType === 'receiving') {
            const zoneDepth = 3;
            objs.push({
                id: id(), type: 'zone', x: 1, z: cursorZ, rotation: 0,
                width: G - 2, depth: zoneDepth, zoneType: 'receiving',
                label: zone.name || 'Receiving', color: zoneColor,
                linkedZoneId: zone.id, warehouseId,
            });

            // Dock doors
            const dockCount = Math.max(zl.totalRacks, 3);
            for (let i = 0; i < dockCount; i++) {
                const dx = 2 + i * Math.floor((G - 4) / dockCount);
                objs.push({ id: id(), type: 'door', x: dx, z: cursorZ - 0.5, rotation: 0, width: 1.5, depth: 1, label: `IN-${i + 1}`, warehouseId });
            }

            // Pallets along receiving
            for (let i = 0; i < Math.min(dockCount, G - 4); i++) {
                objs.push({ id: id(), type: 'pallet', x: 2 + i * 1.3, z: cursorZ + 1, rotation: 0, width: 1, depth: 1, warehouseId });
            }

            // Place rack objects for each receiving bin (dock positions)
            let rackIdx = 0;
            for (const [, aisle] of zl.aisles) {
                for (const [, rack] of aisle.racks) {
                    const rx = 2 + rackIdx * 1.5;
                    objs.push({
                        id: id(), type: 'rack', x: rx, z: cursorZ + 2, rotation: 0,
                        width: 1, depth: 1, rackLevels: rack.maxLevel,
                        row: aisle.aisleCode, bay: rackIdx + 1,
                        linkedBinIds: rack.bins.sort((a, b) => {
                            const la = parseInt((a.level || '1').replace(/\D/g, '')) || 1;
                            const lb = parseInt((b.level || '1').replace(/\D/g, '')) || 1;
                            return la - lb;
                        }).map(b => b.id),
                        warehouseId,
                    });
                    rackIdx++;
                }
            }

            // Conveyor
            objs.push({ id: id(), type: 'conveyor', x: 1, z: cursorZ + zoneDepth, rotation: 0, width: G - 2, depth: 1, label: 'Inbound Sortation', warehouseId });
            cursorZ += zoneDepth + 1.5;
            continue;
        }

        // ─── SHIPPING ZONE ──────────────────────────────
        if (zoneType === 'shipping') {
            const zoneDepth = 3;
            objs.push({
                id: id(), type: 'zone', x: 1, z: cursorZ, rotation: 0,
                width: G - 2, depth: zoneDepth, zoneType: 'shipping',
                label: zone.name || 'Shipping', color: zoneColor,
                linkedZoneId: zone.id, warehouseId,
            });

            // Conveyor
            objs.push({ id: id(), type: 'conveyor', x: 1, z: cursorZ + 0.5, rotation: 0, width: G - 2, depth: 1, label: 'Outbound Sort Line', warehouseId });

            // Outbound pallets
            const dockCount = Math.max(zl.totalRacks, 2);
            for (let i = 0; i < Math.min(dockCount * 2, G - 4); i++) {
                objs.push({ id: id(), type: 'pallet', x: 2 + i * 1.3, z: cursorZ + 1.5, rotation: 0, width: 1, depth: 1, warehouseId });
            }

            // Dock doors
            for (let i = 0; i < dockCount; i++) {
                const dx = 2 + i * Math.floor((G - 4) / Math.max(dockCount, 1));
                objs.push({ id: id(), type: 'door', x: dx, z: cursorZ + zoneDepth, rotation: 0, width: 1.5, depth: 1, label: `OUT-${i + 1}`, warehouseId });
            }

            // Forklift
            objs.push({ id: id(), type: 'forklift', x: Math.floor(G / 2), z: cursorZ + 1, rotation: 180, width: 1, depth: 1, warehouseId });

            cursorZ += zoneDepth + 1.5;
            continue;
        }

        // ─── PICKING ZONE ───────────────────────────────
        if (zoneType === 'picking') {
            const zoneDepth = Math.max(aisleCount * 1.5 + 1, 3);
            objs.push({
                id: id(), type: 'zone', x: 1, z: cursorZ, rotation: 0,
                width: G - 2, depth: zoneDepth, zoneType: 'picking',
                label: zone.name || 'Picking', color: zoneColor,
                linkedZoneId: zone.id, warehouseId,
            });

            // Place pick stations with racks
            let pickIdx = 0;
            for (const [, aisle] of zl.aisles) {
                for (const [, rack] of aisle.racks) {
                    const rx = 2 + pickIdx * 2;
                    if (rx >= G - 2) break;
                    // Workstation
                    objs.push({ id: id(), type: 'workstation', x: rx, z: cursorZ + 1, rotation: 0, width: 1.5, depth: 1, warehouseId });
                    // Rack
                    objs.push({
                        id: id(), type: 'rack', x: rx, z: cursorZ + 0.2, rotation: 0,
                        width: 1, depth: 1, rackLevels: rack.maxLevel,
                        row: aisle.aisleCode, bay: pickIdx + 1,
                        linkedBinIds: rack.bins.sort((a, b) => {
                            const la = parseInt((a.level || '1').replace(/\D/g, '')) || 1;
                            const lb = parseInt((b.level || '1').replace(/\D/g, '')) || 1;
                            return la - lb;
                        }).map(b => b.id),
                        warehouseId,
                    });
                    pickIdx++;
                }
            }

            cursorZ += zoneDepth + 1;
            continue;
        }

        // ─── STORAGE / HAZARDOUS / COLD / STAGING / CLIMATE CONTROLLED ──
        // These are the main zones with aisles and racks
        const aisleSpacing = 2.0; // Z spacing between aisles
        const zoneDepth = Math.max(aisleCount * aisleSpacing + 1, 3);
        const zoneWidth = Math.max(zl.maxAisleRacks * rackSpacing + 2, 6);

        objs.push({
            id: id(), type: 'zone', x: 1, z: cursorZ, rotation: 0,
            width: Math.min(zoneWidth + 2, G - 2), depth: zoneDepth,
            zoneType: zoneType as any,
            label: zone.name || `Zone ${zone.code}`, color: zoneColor,
            linkedZoneId: zone.id, warehouseId,
        });

        // Hazardous: add containment walls
        if (zoneType === 'hazardous') {
            objs.push({ id: id(), type: 'wall', x: 1, z: cursorZ, rotation: 0, width: Math.min(zoneWidth + 2, G - 2), depth: 1, label: 'Containment Wall', color: '#fbbf24', warehouseId });
            objs.push({ id: id(), type: 'wall', x: 1, z: cursorZ + zoneDepth - 0.5, rotation: 0, width: Math.min(zoneWidth + 2, G - 2), depth: 1, label: 'Containment Wall', color: '#fbbf24', warehouseId });
            // Add safety bollards at corners
            objs.push({ id: id(), type: 'bollard', x: 1.5, z: cursorZ + 0.5, rotation: 0, width: 1, depth: 1, warehouseId });
            objs.push({ id: id(), type: 'bollard', x: zoneWidth + 2.5, z: cursorZ + 0.5, rotation: 0, width: 1, depth: 1, warehouseId });
        }

        // Climate controlled: add insulated walls
        if (zoneType === 'climate_controlled' || zoneType === 'cold') {
            objs.push({ id: id(), type: 'wall', x: 1, z: cursorZ, rotation: 0, width: Math.min(zoneWidth + 2, G - 2), depth: 1, label: 'Insulated Wall', color: '#a5b4fc', warehouseId });
            objs.push({ id: id(), type: 'door', x: 2, z: cursorZ, rotation: 0, width: 1.5, depth: 1, label: 'Airlock', warehouseId });
        }

        // Staging: add pallets
        if (zoneType === 'staging') {
            for (let i = 0; i < Math.min(4, G - 4); i++) {
                objs.push({ id: id(), type: 'pallet', x: 2 + i * 1.3, z: cursorZ + zoneDepth - 1, rotation: 0, width: 1, depth: 1, warehouseId });
            }
        }

        // Place aisles and racks within zone
        let aisleIdx = 0;
        for (const [aisleCode, aisle] of zl.aisles) {
            const aisleZ = cursorZ + 0.8 + aisleIdx * aisleSpacing;

            // Place each rack in the aisle
            let bayIdx = 0;
            for (const [, rack] of aisle.racks) {
                const rx = 2 + bayIdx * rackSpacing;

                // Sort bins by level for linkedBinIds
                const sortedBins = [...rack.bins].sort((a, b) => {
                    const la = parseInt((a.level || '1').replace(/\D/g, '')) || 1;
                    const lb = parseInt((b.level || '1').replace(/\D/g, '')) || 1;
                    return la - lb;
                });

                // Check if this is a ground-floor bin (GF level = large items)
                const isGroundFloor = rack.bins.some(b => b.level === 'GF');
                const rackLevels = isGroundFloor ? 1 : rack.maxLevel;

                objs.push({
                    id: id(), type: 'rack', x: rx, z: aisleZ, rotation: 0,
                    width: 1, depth: 1, rackLevels,
                    row: aisleCode, bay: bayIdx + 1,
                    linkedBinIds: sortedBins.map(b => b.id),
                    color: zoneType === 'hazardous' ? '#f87171' :
                           zoneType === 'cold' ? '#818cf8' :
                           zoneType === 'climate_controlled' ? '#7c3aed' : undefined,
                    warehouseId,
                });

                bayIdx++;
            }

            aisleIdx++;
        }

        // Add forklift per zone if > 4 racks
        if (zl.totalRacks > 4) {
            objs.push({
                id: id(), type: 'forklift',
                x: Math.min(zl.maxAisleRacks * rackSpacing + 3, G - 3),
                z: cursorZ + Math.floor(zoneDepth / 2),
                rotation: 90, width: 1, depth: 1, warehouseId,
            });
        }

        cursorZ += zoneDepth + 1;
    }

    // ═══════════════════════════════════════════════════
    // ADD INFRASTRUCTURE
    // ═══════════════════════════════════════════════════

    // Main aisle bollards along the right edge
    for (let bz = 2; bz < cursorZ; bz += 5) {
        objs.push({ id: id(), type: 'bollard', x: G - 2, z: bz, rotation: 0, width: 1, depth: 1, warehouseId });
    }

    return objs;
}

