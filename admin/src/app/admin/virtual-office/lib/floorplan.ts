import type { Agent, AgentStatus, Desk, Spot, Zone, ZoneId } from "./types";

/* ------------------------------------------------------------------ */
/* Visual constants                                                    */
/* ------------------------------------------------------------------ */

export const STATUS_META: Record<AgentStatus, { label: string; color: string; description: string }> = {
    working: { label: "Working", color: "#22c55e", description: "Executing a task" },
    thinking: { label: "Thinking", color: "#a855f7", description: "Planning / reasoning" },
    idle: { label: "Idle", color: "#38bdf8", description: "Available for new work" },
    meeting: { label: "In meeting", color: "#f59e0b", description: "Collaborating with other agents" },
    paused: { label: "Paused", color: "#94a3b8", description: "Paused by an operator" },
    error: { label: "Needs attention", color: "#ef4444", description: "Blocked — operator action required" },
    offline: { label: "Offline", color: "#475569", description: "Not running" },
};

export type Lighting = "day" | "night";

export const PALETTE: Record<
    Lighting,
    {
        bg: string; floor: string; slab: string; wall: string; desk: string; deskLeg: string;
        dark: string; grid: string; gridSection: string; window: string; windowEmissive: number;
        botBody: string; zoneOpacity: number;
    }
> = {
    day: {
        bg: "#dbe4ee", floor: "#f5f7fa", slab: "#c4cfdc", wall: "#e6ebf1", desk: "#ffffff", deskLeg: "#cbd5e1",
        dark: "#1e293b", grid: "#d5dde7", gridSection: "#a9b6c6", window: "#bfdbfe", windowEmissive: 0.9,
        botBody: "#f8fafc", zoneOpacity: 0.12,
    },
    night: {
        bg: "#05070d", floor: "#0c111d", slab: "#080c16", wall: "#101726", desk: "#1b2435", deskLeg: "#2b364a",
        dark: "#070b14", grid: "#162033", gridSection: "#26344d", window: "#13294d", windowEmissive: 0.6,
        botBody: "#dfe6ef", zoneOpacity: 0.1,
    },
};

/* ------------------------------------------------------------------ */
/* Floor plan (metres). x → right, z → toward the default camera.      */
/* ------------------------------------------------------------------ */

export const FLOOR = { width: 40, depth: 28 } as const;
export const WALL_HEIGHT = 3.2;
/** Main walkway between the front and back halves of the office. */
export const CORRIDOR_Z = -2.75;
export const MEETING_DOOR: [number, number] = [11, -4.5];

export const ZONES: Zone[] = [
    { id: "engineering", name: "Engineering & Infra", tagline: "DevOps · Infra · Security · Facilities", color: "#38bdf8", center: [-11, 6], size: [16, 14] },
    { id: "lounge", name: "Lounge", tagline: "Breaks & syncs", color: "#f472b6", center: [0, 6], size: [5, 14] },
    { id: "research", name: "Business Insights", tagline: "CRM · Finance · Reports · AI", color: "#a855f7", center: [11, 6], size: [16, 14] },
    { id: "operations", name: "Service Desk", tagline: "ITSM · Ops · Command Center", color: "#22c55e", center: [-11, -9], size: [16, 9] },
    { id: "core", name: "Agent Core", tagline: "Orchestration", color: "#818cf8", center: [0, -9], size: [5, 9] },
    { id: "meeting", name: "War Room", tagline: "Multi-agent meetings", color: "#f59e0b", center: [11, -9], size: [16, 9] },
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z])) as Record<ZoneId, Zone>;

/** Two desks back-to-back. */
function pod(zone: ZoneId, id: string, x: number, zc: number): Desk[] {
    return [
        { id: `${id}-a`, zone, position: [x, zc - 0.475], rotation: Math.PI },
        { id: `${id}-b`, zone, position: [x, zc + 0.475], rotation: 0 },
    ];
}

export const DESKS: Desk[] = [
    ...pod("engineering", "eng-1", -16, 5),
    ...pod("engineering", "eng-2", -11, 5),
    ...pod("engineering", "eng-3", -6, 5),
    ...pod("research", "res-1", 7.5, 5),
    ...pod("research", "res-2", 14.5, 5),
    { id: "ops-1", zone: "operations", position: [-16, -8.4], rotation: 0 },
    { id: "ops-2", zone: "operations", position: [-11, -8.4], rotation: 0 },
    { id: "ops-3", zone: "operations", position: [-6, -8.4], rotation: 0 },
    // Second row — capacity for agents created in the Agentic OS.
    ...pod("engineering", "eng-4", -16, 9.6),
    ...pod("engineering", "eng-5", -11, 9.6),
    ...pod("engineering", "eng-6", -6, 9.6),
    ...pod("research", "res-3", 7.5, 9.6),
    ...pod("research", "res-4", 14.5, 9.6),
    { id: "ops-4", zone: "operations", position: [-16, -11.6], rotation: 0 },
    { id: "ops-5", zone: "operations", position: [-11, -11.6], rotation: 0 },
    { id: "ops-6", zone: "operations", position: [-6, -11.6], rotation: 0 },
];

export const DESK_BY_ID = Object.fromEntries(DESKS.map((d) => [d.id, d])) as Record<string, Desk>;

/** Distance from desk centre to where the agent hovers. */
export const SEAT_OFFSET = 0.85;

export function deskSeat(desk: Desk): Spot {
    const r = desk.rotation;
    return {
        key: `desk:${desk.id}`,
        position: [desk.position[0] + SEAT_OFFSET * Math.sin(r), desk.position[1] + SEAT_OFFSET * Math.cos(r)],
        yaw: r + Math.PI,
        zone: desk.zone,
    };
}

export const MEETING_TABLE = { center: [11, -9.5] as [number, number], size: [6.2, 1.4] as [number, number] };

export const MEETING_SEATS: Spot[] = [8.75, 10.25, 11.75, 13.25].flatMap((x, i) => [
    { key: `meet:s${i}`, position: [x, -8.3] as [number, number], yaw: Math.PI, zone: "meeting" as ZoneId },
    { key: `meet:n${i}`, position: [x, -10.7] as [number, number], yaw: 0, zone: "meeting" as ZoneId },
]);

export const LOUNGE_TABLE: [number, number] = [0, 3.4];

export const LOUNGE_SPOTS: Spot[] = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map((a, i) => ({
    key: `lounge:${i}`,
    position: [LOUNGE_TABLE[0] + Math.sin(a) * 0.95, LOUNGE_TABLE[1] + Math.cos(a) * 0.95] as [number, number],
    yaw: a + Math.PI,
    zone: "lounge" as ZoneId,
}));

/* ------------------------------------------------------------------ */
/* Spot assignment (sticky so avatars don't shuffle seats)             */
/* ------------------------------------------------------------------ */

export interface SeatMemory {
    meeting: Map<string, number>;
    lounge: Map<string, number>;
}

export function createSeatMemory(): SeatMemory {
    return { meeting: new Map(), lounge: new Map() };
}

function claim(memory: Map<string, number>, ids: string[], capacity: number): Map<string, number> {
    for (const id of [...memory.keys()]) if (!ids.includes(id)) memory.delete(id);
    const taken = new Set(memory.values());
    for (const id of ids) {
        if (memory.has(id)) continue;
        for (let i = 0; i < capacity; i++) {
            if (!taken.has(i)) {
                memory.set(id, i);
                taken.add(i);
                break;
            }
        }
    }
    return memory;
}

export function assignSpots(agents: Agent[], memory: SeatMemory): Record<string, Spot> {
    const meetingIds = agents.filter((a) => a.location === "meeting").map((a) => a.id);
    const loungeIds = agents.filter((a) => a.location === "lounge").map((a) => a.id);
    claim(memory.meeting, meetingIds, MEETING_SEATS.length);
    claim(memory.lounge, loungeIds, LOUNGE_SPOTS.length);

    const spots: Record<string, Spot> = {};
    for (const a of agents) {
        const m = memory.meeting.get(a.id);
        const l = memory.lounge.get(a.id);
        if (a.location === "meeting" && m !== undefined) spots[a.id] = MEETING_SEATS[m];
        else if (a.location === "lounge" && l !== undefined) spots[a.id] = LOUNGE_SPOTS[l];
        else spots[a.id] = deskSeat(DESK_BY_ID[a.deskId]);
    }
    return spots;
}

/* ------------------------------------------------------------------ */
/* Very small router: everyone walks via the main corridor             */
/* ------------------------------------------------------------------ */

type P = [number, number];

/** Waypoints to get from a spot out to the corridor. */
function exitPoints(pos: P, zone: ZoneId, yaw: number): P[] {
    if (zone === "meeting") {
        const pts: P[] = [];
        const [tx, tz] = MEETING_TABLE.center;
        // Far side of the table: walk around the table end first.
        if (pos[1] < tz) {
            const sx = pos[0] < tx ? tx - MEETING_TABLE.size[0] / 2 - 0.6 : tx + MEETING_TABLE.size[0] / 2 + 0.6;
            pts.push([sx, pos[1]], [sx, tz + 1.8]);
        }
        pts.push([MEETING_DOOR[0], MEETING_DOOR[1] - 1.1], [MEETING_DOOR[0], CORRIDOR_Z]);
        return pts;
    }
    const pts: P[] = [];
    const towardCorridor = pos[1] > CORRIDOR_Z ? -1 : 1;
    // A desk in the same column between the avatar and the corridor (front rows block the back rows).
    const blocked = DESKS.some(
        (d) =>
            Math.abs(d.position[0] - pos[0]) < 1.0 &&
            (towardCorridor < 0 ? d.position[1] < pos[1] - 0.2 && d.position[1] > CORRIDOR_Z : d.position[1] > pos[1] + 0.2 && d.position[1] < CORRIDOR_Z),
    );
    // If the desk/table sits between the avatar and the corridor, side-step into the aisle first.
    if (Math.cos(yaw) * towardCorridor > 0.5 || blocked) {
        const dir = pos[0] >= ZONE_BY_ID[zone].center[0] ? 1 : -1;
        pts.push([pos[0] + dir * 1.15, pos[1]]);
    }
    const last = pts.length ? pts[pts.length - 1] : pos;
    pts.push([last[0], CORRIDOR_Z]);
    return pts;
}

export function entryPoints(spot: Spot): P[] {
    return exitPoints(spot.position, spot.zone, spot.yaw).reverse();
}

export function buildPath(from: P, fromZone: ZoneId, fromYaw: number, to: Spot): P[] {
    if (Math.hypot(from[0] - to.position[0], from[1] - to.position[1]) < 0.05) return [];
    return [...exitPoints(from, fromZone, fromYaw), ...entryPoints(to), to.position];
}
