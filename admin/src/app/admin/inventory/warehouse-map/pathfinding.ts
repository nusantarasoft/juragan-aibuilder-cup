// ═══════════════════════════════════════════════════════
// AI PATHFINDING ENGINE — A* Grid-Based Routing
// ═══════════════════════════════════════════════════════

import type { PlacedObject, ZoneType } from './builderState';
import { GRID_CELLS, GRID_SIZE } from './builderState';

// ─── Types ───────────────────────────────────────────

export interface PathNode {
    x: number;
    z: number;
}

export interface RouteStop {
    label: string;
    x: number;
    z: number;
    zoneType?: ZoneType;
    color?: string;
}

export interface RouteMetrics {
    totalDistance: number;      // grid units
    estimatedTimeMin: number;  // minutes (based on forklift speed ~8 km/h ≈ 2.2 units/s)
    turns: number;
    zoneTransitions: number;
    segments: RouteSegment[];
}

export interface RouteSegment {
    from: RouteStop;
    to: RouteStop;
    path: PathNode[];
    distance: number;
}

export interface Route {
    id: string;
    name: string;
    color: string;
    stops: RouteStop[];
    segments: RouteSegment[];
    metrics: RouteMetrics;
    fullPath: PathNode[];      // flattened path for animation
}

// ─── Occupancy Grid ──────────────────────────────────

export type CellType = 'empty' | 'obstacle' | 'zone' | 'aisle';

export interface GridCell {
    type: CellType;
    cost: number;            // traversal cost multiplier
    zoneType?: ZoneType;
    objectId?: string;
}

const COST_EMPTY = 1.0;
const COST_AISLE = 0.6;      // Preferred paths
const COST_ZONE = 0.8;       // Walking through zones is ok
const COST_COLD = 1.5;       // Cold storage penalty
const COST_QUARANTINE = 3.0; // Avoid quarantine
const COST_OBSTACLE = Infinity;

/**
 * Build a 2D occupancy grid from placed objects.
 * Each cell is 1×1 matching GRID_SIZE.
 */
export function buildGrid(objects: PlacedObject[]): GridCell[][] {
    const grid: GridCell[][] = Array.from({ length: GRID_CELLS }, () =>
        Array.from({ length: GRID_CELLS }, () => ({
            type: 'empty' as CellType,
            cost: COST_EMPTY,
        }))
    );

    // Pass 1: Mark zones (walkable, variable cost)
    for (const obj of objects) {
        if (obj.type !== 'zone') continue;
        const x0 = Math.max(0, Math.floor(obj.x));
        const z0 = Math.max(0, Math.floor(obj.z));
        const x1 = Math.min(GRID_CELLS - 1, Math.floor(obj.x + (obj.width || 1)) - 1);
        const z1 = Math.min(GRID_CELLS - 1, Math.floor(obj.z + (obj.depth || 1)) - 1);
        for (let gx = x0; gx <= x1; gx++) {
            for (let gz = z0; gz <= z1; gz++) {
                let cost = COST_ZONE;
                if (obj.zoneType === 'cold') cost = COST_COLD;
                else if (obj.zoneType === 'quarantine') cost = COST_QUARANTINE;
                grid[gz][gx] = {
                    type: 'zone',
                    cost,
                    zoneType: obj.zoneType,
                    objectId: obj.id,
                };
            }
        }
    }

    // Pass 2: Mark obstacles (racks, walls, bollards, workstations, conveyors)
    for (const obj of objects) {
        if (obj.type === 'zone') continue;
        const x0 = Math.max(0, Math.floor(obj.x));
        const z0 = Math.max(0, Math.floor(obj.z));
        const w = obj.width || 1;
        const d = obj.depth || 1;
        const x1 = Math.min(GRID_CELLS - 1, Math.floor(obj.x + w) - 1);
        const z1 = Math.min(GRID_CELLS - 1, Math.floor(obj.z + d) - 1);
        for (let gx = x0; gx <= x1; gx++) {
            for (let gz = z0; gz <= z1; gz++) {
                grid[gz][gx] = {
                    type: 'obstacle',
                    cost: COST_OBSTACLE,
                    objectId: obj.id,
                };
            }
        }
    }

    // Pass 3: Detect aisles — empty cells adjacent to racks
    for (let gz = 0; gz < GRID_CELLS; gz++) {
        for (let gx = 0; gx < GRID_CELLS; gx++) {
            if (grid[gz][gx].type !== 'empty') continue;
            const neighbors = [
                gz > 0 ? grid[gz - 1][gx] : null,
                gz < GRID_CELLS - 1 ? grid[gz + 1][gx] : null,
                gx > 0 ? grid[gz][gx - 1] : null,
                gx < GRID_CELLS - 1 ? grid[gz][gx + 1] : null,
            ];
            const nearRack = neighbors.some(n => n && n.type === 'obstacle');
            if (nearRack) {
                grid[gz][gx] = { type: 'aisle', cost: COST_AISLE };
            }
        }
    }

    return grid;
}

// ─── A* Pathfinding ──────────────────────────────────

interface AStarNode {
    x: number;
    z: number;
    g: number;  // cost from start
    h: number;  // heuristic to end
    f: number;  // g + h
    parent: AStarNode | null;
}

// 8-directional neighbors (including diagonals)
const DIRS: [number, number, number][] = [
    [0, -1, 1], [0, 1, 1], [-1, 0, 1], [1, 0, 1],                    // Cardinal
    [-1, -1, 1.414], [-1, 1, 1.414], [1, -1, 1.414], [1, 1, 1.414],   // Diagonal
];

function heuristic(ax: number, az: number, bx: number, bz: number): number {
    // Octile distance (allows diagonal)
    const dx = Math.abs(ax - bx);
    const dz = Math.abs(az - bz);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
}

/**
 * A* pathfinding between two grid points.
 * Returns null if no path exists.
 */
export function findPath(
    grid: GridCell[][],
    startX: number, startZ: number,
    endX: number, endZ: number,
): PathNode[] | null {
    const sx = Math.round(startX);
    const sz = Math.round(startZ);
    const ex = Math.round(endX);
    const ez = Math.round(endZ);

    // Bounds check
    if (sx < 0 || sx >= GRID_CELLS || sz < 0 || sz >= GRID_CELLS) return null;
    if (ex < 0 || ex >= GRID_CELLS || ez < 0 || ez >= GRID_CELLS) return null;

    // Same point
    if (sx === ex && sz === ez) return [{ x: sx, z: sz }];

    // If destination is an obstacle, try to find the nearest walkable cell
    let actualEndX = ex, actualEndZ = ez;
    if (grid[ez]?.[ex]?.cost === Infinity) {
        const nearest = findNearestWalkable(grid, ex, ez);
        if (!nearest) return null;
        actualEndX = nearest.x;
        actualEndZ = nearest.z;
    }

    // Similarly for start
    let actualStartX = sx, actualStartZ = sz;
    if (grid[sz]?.[sx]?.cost === Infinity) {
        const nearest = findNearestWalkable(grid, sx, sz);
        if (!nearest) return null;
        actualStartX = nearest.x;
        actualStartZ = nearest.z;
    }

    const open: AStarNode[] = [];
    const closed = new Set<string>();
    const key = (x: number, z: number) => `${x},${z}`;

    const startNode: AStarNode = {
        x: actualStartX, z: actualStartZ,
        g: 0, h: heuristic(actualStartX, actualStartZ, actualEndX, actualEndZ),
        f: 0, parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    open.push(startNode);

    const gMap = new Map<string, number>();
    gMap.set(key(actualStartX, actualStartZ), 0);

    let iterations = 0;
    const MAX_ITERATIONS = GRID_CELLS * GRID_CELLS * 4;

    while (open.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;

        // Find node with lowest f
        let bestIdx = 0;
        for (let i = 1; i < open.length; i++) {
            if (open[i].f < open[bestIdx].f) bestIdx = i;
        }
        const current = open.splice(bestIdx, 1)[0];

        if (current.x === actualEndX && current.z === actualEndZ) {
            // Reconstruct path
            const path: PathNode[] = [];
            let node: AStarNode | null = current;
            while (node) {
                path.unshift({ x: node.x, z: node.z });
                node = node.parent;
            }
            return smoothPath(path, grid);
        }

        const ck = key(current.x, current.z);
        if (closed.has(ck)) continue;
        closed.add(ck);

        for (const [dx, dz, baseCost] of DIRS) {
            const nx = current.x + dx;
            const nz = current.z + dz;
            if (nx < 0 || nx >= GRID_CELLS || nz < 0 || nz >= GRID_CELLS) continue;

            const nk = key(nx, nz);
            if (closed.has(nk)) continue;

            const cell = grid[nz][nx];
            if (cell.cost === Infinity) continue;

            // Prevent diagonal movement through obstacles
            if (dx !== 0 && dz !== 0) {
                if (grid[current.z][nx]?.cost === Infinity || grid[nz]?.[current.x]?.cost === Infinity) continue;
            }

            const tentativeG = current.g + baseCost * cell.cost;
            const existingG = gMap.get(nk);
            if (existingG !== undefined && tentativeG >= existingG) continue;

            gMap.set(nk, tentativeG);
            const h = heuristic(nx, nz, actualEndX, actualEndZ);
            open.push({
                x: nx, z: nz,
                g: tentativeG, h, f: tentativeG + h,
                parent: current,
            });
        }
    }

    return null; // No path found
}

/**
 * Find the nearest walkable cell to a point.
 */
function findNearestWalkable(grid: GridCell[][], x: number, z: number): PathNode | null {
    for (let r = 1; r <= 5; r++) {
        for (let dx = -r; dx <= r; dx++) {
            for (let dz = -r; dz <= r; dz++) {
                if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
                const nx = x + dx;
                const nz = z + dz;
                if (nx >= 0 && nx < GRID_CELLS && nz >= 0 && nz < GRID_CELLS) {
                    if (grid[nz][nx].cost < Infinity) return { x: nx, z: nz };
                }
            }
        }
    }
    return null;
}

/**
 * Smooth a path by removing unnecessary waypoints on straight lines.
 */
function smoothPath(path: PathNode[], grid: GridCell[][]): PathNode[] {
    if (path.length <= 2) return path;
    const result: PathNode[] = [path[0]];
    for (let i = 1; i < path.length - 1; i++) {
        const prev = path[i - 1];
        const curr = path[i];
        const next = path[i + 1];
        const dx1 = curr.x - prev.x;
        const dz1 = curr.z - prev.z;
        const dx2 = next.x - curr.x;
        const dz2 = next.z - curr.z;
        // Keep waypoint if direction changes
        if (dx1 !== dx2 || dz1 !== dz2) {
            result.push(curr);
        }
    }
    result.push(path[path.length - 1]);
    return result;
}

// ─── Multi-Stop Route Computation ────────────────────

let _routeIdCounter = 0;

/**
 * Compute a full route through multiple stops.
 */
export function computeRoute(
    objects: PlacedObject[],
    stops: RouteStop[],
    name: string = 'Route',
    color: string = '#22c55e',
): Route | null {
    if (stops.length < 2) return null;

    const grid = buildGrid(objects);
    const segments: RouteSegment[] = [];
    const fullPath: PathNode[] = [];
    let totalDistance = 0;
    let totalTurns = 0;
    let zoneTransitions = 0;

    for (let i = 0; i < stops.length - 1; i++) {
        const from = stops[i];
        const to = stops[i + 1];
        const path = findPath(grid, from.x, from.z, to.x, to.z);

        if (!path || path.length === 0) {
            // If can't find path, still create the route with a straight line fallback
            const fallback = [{ x: Math.round(from.x), z: Math.round(from.z) }, { x: Math.round(to.x), z: Math.round(to.z) }];
            const dist = Math.sqrt((to.x - from.x) ** 2 + (to.z - from.z) ** 2);
            segments.push({ from, to, path: fallback, distance: dist });
            if (fullPath.length > 0) fullPath.pop(); // Remove duplicate junction
            fullPath.push(...fallback);
            totalDistance += dist;
            continue;
        }

        // Calculate segment distance
        let segDist = 0;
        for (let j = 1; j < path.length; j++) {
            segDist += Math.sqrt((path[j].x - path[j - 1].x) ** 2 + (path[j].z - path[j - 1].z) ** 2);
        }

        // Count turns in this segment
        for (let j = 1; j < path.length - 1; j++) {
            const dx1 = path[j].x - path[j - 1].x;
            const dz1 = path[j].z - path[j - 1].z;
            const dx2 = path[j + 1].x - path[j].x;
            const dz2 = path[j + 1].z - path[j].z;
            if (dx1 !== dx2 || dz1 !== dz2) totalTurns++;
        }

        segments.push({ from, to, path, distance: segDist });
        if (fullPath.length > 0) fullPath.pop(); // Avoid duplicate junction point
        fullPath.push(...path);
        totalDistance += segDist;

        // Count zone transition
        if (from.zoneType !== to.zoneType) zoneTransitions++;
    }

    if (segments.length === 0) return null;

    // Estimated time: forklift at ~2.2 grid units/sec ≈ 8 km/h
    const estimatedTimeMin = totalDistance / 2.2 / 60;

    _routeIdCounter++;
    return {
        id: `route-${Date.now()}-${_routeIdCounter}`,
        name,
        color,
        stops,
        segments,
        metrics: {
            totalDistance: Math.round(totalDistance * 10) / 10,
            estimatedTimeMin: Math.round(estimatedTimeMin * 100) / 100,
            turns: totalTurns,
            zoneTransitions,
            segments,
        },
        fullPath,
    };
}

// ─── Preset Route Generators ─────────────────────────

export function getZonesByType(objects: PlacedObject[], zoneType: ZoneType): PlacedObject[] {
    return objects.filter(o => o.type === 'zone' && o.zoneType === zoneType);
}

export function getZoneCenter(zone: PlacedObject): { x: number; z: number } {
    return {
        x: zone.x + (zone.width || 1) / 2,
        z: zone.z + (zone.depth || 1) / 2,
    };
}

export function findNearestZone(objects: PlacedObject[], x: number, z: number, zoneType?: ZoneType): PlacedObject | null {
    const zones = objects.filter(o => o.type === 'zone' && (!zoneType || o.zoneType === zoneType));
    if (zones.length === 0) return null;
    let nearest = zones[0];
    let minDist = Infinity;
    for (const zone of zones) {
        const c = getZoneCenter(zone);
        const d = Math.sqrt((c.x - x) ** 2 + (c.z - z) ** 2);
        if (d < minDist) { minDist = d; nearest = zone; }
    }
    return nearest;
}

function zoneToStop(zone: PlacedObject): RouteStop {
    const center = getZoneCenter(zone);
    const ZONE_COLORS: Record<string, string> = {
        receiving: '#22c55e', storage: '#3b82f6', picking: '#f59e0b',
        packing: '#a855f7', shipping: '#06b6d4', cold: '#6366f1', quarantine: '#ef4444',
    };
    return {
        label: zone.label || zone.zoneType || 'Zone',
        x: center.x,
        z: center.z,
        zoneType: zone.zoneType,
        color: zone.color || ZONE_COLORS[zone.zoneType || ''] || '#888',
    };
}

export type PresetRouteType = 'inbound' | 'pick' | 'outbound' | 'fullFlow';

export interface PresetRoute {
    type: PresetRouteType;
    label: string;
    icon: string;
    description: string;
    color: string;
}

export const PRESET_ROUTES: PresetRoute[] = [
    { type: 'inbound', label: 'Inbound', icon: '📥', description: 'Receiving → Storage', color: '#22c55e' },
    { type: 'pick', label: 'Pick Order', icon: '🛒', description: 'Storage → Picking', color: '#f59e0b' },
    { type: 'outbound', label: 'Outbound', icon: '📤', description: 'Picking → Shipping', color: '#06b6d4' },
    { type: 'fullFlow', label: 'Full Flow', icon: '🔄', description: 'Receiving → Storage → Picking → Shipping', color: '#a855f7' },
];

export function computePresetRoute(objects: PlacedObject[], preset: PresetRouteType): Route | null {
    const receiving = getZonesByType(objects, 'receiving')[0];
    const storage = getZonesByType(objects, 'storage')[0];
    const picking = getZonesByType(objects, 'picking')[0];
    const shipping = getZonesByType(objects, 'shipping')[0];
    const packing = getZonesByType(objects, 'packing')[0];

    let stops: RouteStop[] = [];
    let name = '';
    let color = '#22c55e';

    switch (preset) {
        case 'inbound':
            if (!receiving || !storage) return null;
            stops = [zoneToStop(receiving), zoneToStop(storage)];
            name = '📥 Inbound';
            color = '#22c55e';
            break;
        case 'pick':
            if (!storage || !picking) return null;
            stops = [zoneToStop(storage), zoneToStop(picking)];
            name = '🛒 Pick Order';
            color = '#f59e0b';
            break;
        case 'outbound':
            if (!picking && !packing) return null;
            if (!shipping) return null;
            const packOrPick = packing ? zoneToStop(packing) : null;
            stops = picking ? [zoneToStop(picking)] : [];
            if (packOrPick) stops.push(packOrPick);
            stops.push(zoneToStop(shipping));
            if (stops.length < 2) return null;
            name = '📤 Outbound';
            color = '#06b6d4';
            break;
        case 'fullFlow':
            const available: RouteStop[] = [];
            if (receiving) available.push(zoneToStop(receiving));
            if (storage) available.push(zoneToStop(storage));
            if (picking) available.push(zoneToStop(picking));
            if (packing) available.push(zoneToStop(packing));
            if (shipping) available.push(zoneToStop(shipping));
            if (available.length < 2) return null;
            stops = available;
            name = '🔄 Full Flow';
            color = '#a855f7';
            break;
    }

    return computeRoute(objects, stops, name, color);
}

// ─── Route Optimization (Nearest-Neighbor TSP) ──────

/**
 * Reorder intermediate stops for shortest total distance.
 * Keeps first and last stops fixed, reorders middle stops.
 */
export function optimizeStopOrder(stops: RouteStop[]): RouteStop[] {
    if (stops.length <= 3) return stops; // Nothing to optimize with 0-1 intermediate stops

    const first = stops[0];
    const last = stops[stops.length - 1];
    const middle = stops.slice(1, -1);

    // Nearest-neighbor heuristic
    const ordered: RouteStop[] = [];
    const remaining = [...middle];
    let current = first;

    while (remaining.length > 0) {
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < remaining.length; i++) {
            const d = Math.sqrt((remaining[i].x - current.x) ** 2 + (remaining[i].z - current.z) ** 2);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
        current = remaining.splice(bestIdx, 1)[0];
        ordered.push(current);
    }

    return [first, ...ordered, last];
}

/**
 * Get all zones as RouteStop[], useful for the custom route builder.
 */
export function getAllZonesAsStops(objects: PlacedObject[]): RouteStop[] {
    const ZONE_COLORS: Record<string, string> = {
        receiving: '#22c55e', storage: '#3b82f6', picking: '#f59e0b',
        packing: '#a855f7', shipping: '#06b6d4', cold: '#6366f1', quarantine: '#ef4444',
    };
    return objects
        .filter(o => o.type === 'zone')
        .map(zone => {
            const center = getZoneCenter(zone);
            return {
                label: zone.label || zone.zoneType || 'Zone',
                x: center.x,
                z: center.z,
                zoneType: zone.zoneType,
                color: zone.color || ZONE_COLORS[zone.zoneType || ''] || '#888',
            };
        });
}

