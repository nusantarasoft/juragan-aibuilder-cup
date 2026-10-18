"use client";

import { create } from "zustand";
import type { EyeExpression } from "@/components/helper/TamagotchiGlobal";
import { CORRIDOR_Z, MEETING_DOOR } from "./floorplan";
import type { Spot, ZoneId } from "./types";

export const MASCOT_ID = "tamagotchi";
const STORAGE_KEY = "ns.admin.cinderPuff.v2";

export interface MascotPlayActivity {
    anim: string;
    expression: EyeExpression;
    label: string;
    durationMs: number;
}

export interface MascotPlaySpot {
    id: string;
    zone: ZoneId;
    name: string;
    position: [number, number];
    yaw: number;
    activities: MascotPlayActivity[];
}

export const MASCOT_PLAY_SPOTS: MascotPlaySpot[] = [
    {
        id: "lounge-rug",
        zone: "lounge",
        name: "Lounge Rug",
        position: [0, 7.2],
        yaw: 0,
        activities: [
            { anim: "golfing", expression: "star", label: "Putting Orb Golf in Lounge", durationMs: 7500 },
            { anim: "dancing2", expression: "love", label: "Spin Dancing on Lounge Rug", durationMs: 6800 },
            { anim: "stretching", expression: "happy", label: "Morning Stretch on Rug", durationMs: 6000 },
            { anim: "dancing", expression: "cool", label: "Showing Off Visor Moves", durationMs: 6500 },
        ],
    },
    {
        id: "lounge-coffee",
        zone: "lounge",
        name: "Coffee Kiosk",
        position: [0.85, 5.8],
        yaw: Math.PI / 2,
        activities: [
            { anim: "clapping", expression: "happy", label: "Cheering at Coffee Bar", durationMs: 6000 },
            { anim: "waving", expression: "love", label: "Greeting at Coffee Kiosk", durationMs: 5800 },
            { anim: "dancing", expression: "star", label: "Espresso Energy Hop", durationMs: 6400 },
        ],
    },
    {
        id: "core-orchestrator",
        zone: "core",
        name: "Agent Core",
        position: [0, -5.6],
        yaw: Math.PI,
        activities: [
            { anim: "working", expression: "money", label: "Conjuring Arcane Runes at Core", durationMs: 7800 },
            { anim: "salute", expression: "normal", label: "Saluting the Orchestrator", durationMs: 5500 },
            { anim: "surprised", expression: "star", label: "Marveling at Core Telemetry", durationMs: 5800 },
        ],
    },
    {
        id: "engineering-aisle",
        zone: "engineering",
        name: "Engineering Pod",
        position: [-8.5, 5.0],
        yaw: -Math.PI / 2,
        activities: [
            { anim: "working", expression: "star", label: "Syncing Runes with Engineering", durationMs: 7200 },
            { anim: "clapping", expression: "happy", label: "Cheering DevOps Pipeline", durationMs: 6000 },
            { anim: "pointing", expression: "cool", label: "Inspecting Infra Monitors", durationMs: 5800 },
        ],
    },
    {
        id: "research-holo",
        zone: "research",
        name: "HoloTable",
        position: [11, 8.3],
        yaw: 0,
        activities: [
            { anim: "working", expression: "star", label: "Channeling HoloTable Runes", durationMs: 7400 },
            { anim: "golfing", expression: "happy", label: "Orb Golf by HoloTable", durationMs: 7200 },
            { anim: "dancing2", expression: "cool", label: "Breakdancing by HoloTable", durationMs: 6500 },
        ],
    },
    {
        id: "operations-desk",
        zone: "operations",
        name: "Service Desk",
        position: [-11, -6.2],
        yaw: Math.PI,
        activities: [
            { anim: "waving", expression: "happy", label: "Cheering Service Desk Team", durationMs: 6000 },
            { anim: "clapping", expression: "love", label: "Applauding Ticket SLA", durationMs: 6200 },
            { anim: "salute", expression: "star", label: "Ops Floor Patrol Salute", durationMs: 5500 },
        ],
    },
    {
        id: "war-room",
        zone: "meeting",
        name: "War Room",
        position: [11, -6.4],
        yaw: Math.PI,
        activities: [
            { anim: "talking", expression: "happy", label: "Pitching Mascot Strategy", durationMs: 6500 },
            { anim: "pointing", expression: "star", label: "Pointing at Routine Board", durationMs: 6000 },
            { anim: "clapping", expression: "love", label: "Cheering War Room Sync", durationMs: 6000 },
        ],
    },
];

export function buildMascotPath(
    from: [number, number],
    fromZone: ZoneId,
    to: [number, number],
    toZone: ZoneId,
): [number, number][] {
    if (Math.hypot(from[0] - to[0], from[1] - to[1]) < 0.15) return [];
    const pts: [number, number][] = [];

    // Exit current zone to main corridor if changing zones or crossing corridor
    const sameZone = fromZone === toZone && fromZone !== "meeting";
    if (!sameZone) {
        if (fromZone === "meeting" || (from[0] > 3 && from[1] < -4.5)) {
            pts.push([MEETING_DOOR[0], MEETING_DOOR[1] - 1.0]);
            pts.push([MEETING_DOOR[0], CORRIDOR_Z]);
        } else {
            pts.push([from[0], CORRIDOR_Z]);
        }

        if (toZone === "meeting" || (to[0] > 3 && to[1] < -4.5)) {
            pts.push([MEETING_DOOR[0], CORRIDOR_Z]);
            pts.push([MEETING_DOOR[0], MEETING_DOOR[1] - 1.0]);
        } else {
            pts.push([to[0], CORRIDOR_Z]);
        }
    }

    pts.push(to);
    return pts;
}

export interface MascotVitals {
    energy: number;
    hunger: number;
    happiness: number;
    fitness: number;
    intellect: number;
    level: number;
    xp: number;
    bond: number;
    personality: string;
}

export interface MascotState {
    zone: ZoneId;
    spotName: string;
    targetPosition: [number, number];
    targetYaw: number;
    anim: string;
    expression: EyeExpression;
    activityLabel: string;
    roaming: boolean;
    hurrying: boolean;
    toast: string | null;
    moveNonce: number;
    lockUntil: number;
    vitals: MascotVitals;
    visitingAgentId: string | null;

    hydrateVitals: () => void;
    gainMascotXp: (amount: number, vitalsDelta?: Partial<MascotVitals>) => number;
    showToast: (text: string) => void;
    setDestination: (dest: {
        zone: ZoneId;
        spotName: string;
        position: [number, number];
        yaw: number;
        anim: string;
        expression: EyeExpression;
        activityLabel: string;
        hurrying?: boolean;
        lockDurationMs?: number;
        visitingAgentId?: string | null;
    }) => void;
    triggerTrick: (anim: string, expression: EyeExpression, label: string, durationMs?: number) => void;
    sendToZone: (zone: ZoneId) => void;
    visitAgentSpot: (agentId: string, agentName: string, spot: Spot) => void;
    petMascot: () => void;
    feedMascot: () => void;
    toggleRoaming: () => void;
}

const DEFAULT_VITALS: MascotVitals = {
    energy: 86,
    hunger: 84,
    happiness: 88,
    fitness: 72,
    intellect: 75,
    level: 3,
    xp: 40,
    bond: 45,
    personality: "cheerful",
};

function readStoredVitals(): MascotVitals {
    if (typeof window === "undefined") return DEFAULT_VITALS;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_VITALS;
        const parsed = JSON.parse(raw);
        return {
            energy: typeof parsed.energy === "number" ? Math.max(30, parsed.energy) : DEFAULT_VITALS.energy,
            hunger: typeof parsed.hunger === "number" ? Math.max(30, parsed.hunger) : DEFAULT_VITALS.hunger,
            happiness: typeof parsed.happiness === "number" ? Math.max(35, parsed.happiness) : DEFAULT_VITALS.happiness,
            fitness: typeof parsed.fitness === "number" ? Math.max(25, parsed.fitness) : DEFAULT_VITALS.fitness,
            intellect: typeof parsed.intellect === "number" ? Math.max(25, parsed.intellect) : DEFAULT_VITALS.intellect,
            level: typeof parsed.level === "number" ? Math.max(1, parsed.level) : DEFAULT_VITALS.level,
            xp: typeof parsed.xp === "number" ? Math.max(0, parsed.xp) : DEFAULT_VITALS.xp,
            bond: typeof parsed.bond === "number" ? Math.max(15, parsed.bond) : DEFAULT_VITALS.bond,
            personality: typeof parsed.personality === "string" ? parsed.personality : DEFAULT_VITALS.personality,
        };
    } catch {
        return DEFAULT_VITALS;
    }
}

function writeStoredVitals(vitals: MascotVitals) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vitals));
    } catch {
        // ignore storage errors
    }
}

export function getMascotRankTitle(level: number): { rank: string; title: string; color: string } {
    if (level >= 10) return { rank: "IV", title: "ARCH-IGNIS", color: "#38bdf8" };
    if (level >= 6) return { rank: "III", title: "ASH-WARDEN", color: "#a855f7" };
    if (level >= 3) return { rank: "II", title: "EMBER-PUFF", color: "#fb923c" };
    return { rank: "I", title: "CINDER-MITE", color: "#fb923c" };
}

export const useMascotStore = create<MascotState>((set, get) => ({
    zone: "lounge",
    spotName: "Lounge Rug",
    targetPosition: [0, 7.2],
    targetYaw: 0,
    anim: "golfing",
    expression: "star",
    activityLabel: "Putting Orb Golf in Lounge",
    roaming: true,
    hurrying: false,
    toast: null,
    moveNonce: 0,
    lockUntil: 0,
    vitals: DEFAULT_VITALS,
    visitingAgentId: null,

    hydrateVitals: () => {
        set({ vitals: readStoredVitals() });
    },

    gainMascotXp: (amount, vitalsDelta) => {
        const cur = get().vitals;
        let nextXp = cur.xp + amount;
        let nextLvl = cur.level;
        let needed = nextLvl * 50;
        while (nextXp >= needed) {
            nextXp -= needed;
            nextLvl += 1;
            needed = nextLvl * 50;
        }
        const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
        const nextVitals: MascotVitals = {
            ...cur,
            energy: clamp(cur.energy + (vitalsDelta?.energy ?? 0)),
            hunger: clamp(cur.hunger + (vitalsDelta?.hunger ?? 0)),
            happiness: clamp(cur.happiness + (vitalsDelta?.happiness ?? 0)),
            fitness: clamp(cur.fitness + (vitalsDelta?.fitness ?? 0)),
            intellect: clamp(cur.intellect + (vitalsDelta?.intellect ?? 0)),
            bond: clamp(cur.bond + (vitalsDelta?.bond ?? 0)),
            level: nextLvl,
            xp: nextXp,
        };
        writeStoredVitals(nextVitals);
        set({ vitals: nextVitals });
        return amount;
    },

    showToast: (text) => {
        set({ toast: text });
        setTimeout(() => {
            if (get().toast === text) set({ toast: null });
        }, 2400);
    },

    setDestination: (dest) =>
        set((s) => ({
            zone: dest.zone,
            spotName: dest.spotName,
            targetPosition: dest.position,
            targetYaw: dest.yaw,
            anim: dest.anim,
            expression: dest.expression,
            activityLabel: dest.activityLabel,
            hurrying: dest.hurrying ?? false,
            moveNonce: s.moveNonce + 1,
            lockUntil: dest.lockDurationMs ? Date.now() + dest.lockDurationMs : s.lockUntil,
            visitingAgentId: dest.visitingAgentId ?? null,
        })),

    triggerTrick: (anim, expression, label, durationMs = 7000) => {
        const earned = get().gainMascotXp(15, { happiness: 6, bond: 3, fitness: 2 });
        get().showToast(`✨ ${label.toUpperCase()} · +${earned} XP`);
        set({
            anim,
            expression,
            activityLabel: label,
            lockUntil: Date.now() + durationMs,
        });
    },

    sendToZone: (zone) => {
        const candidates = MASCOT_PLAY_SPOTS.filter((sp) => sp.zone === zone);
        const spot = candidates[Math.floor(Math.random() * candidates.length)] ?? MASCOT_PLAY_SPOTS[0];
        const act = spot.activities[Math.floor(Math.random() * spot.activities.length)];
        get().gainMascotXp(10, { fitness: 4, happiness: 4 });
        get().showToast(`🐾 HEADING TO ${spot.name.toUpperCase()}`);
        get().setDestination({
            zone: spot.zone,
            spotName: spot.name,
            position: spot.position,
            yaw: spot.yaw,
            anim: act.anim,
            expression: act.expression,
            activityLabel: act.label,
            hurrying: true,
            lockDurationMs: 11000,
            visitingAgentId: null,
        });
    },

    visitAgentSpot: (agentId, agentName, spot) => {
        const angle = spot.yaw + (Math.random() > 0.5 ? 0.85 : -0.85);
        const px = Math.max(-18.2, Math.min(18.2, spot.position[0] + Math.sin(angle) * 0.92));
        const pz = Math.max(-12.8, Math.min(12.2, spot.position[1] + Math.cos(angle) * 0.92));
        const yawToAgent = Math.atan2(spot.position[0] - px, spot.position[1] - pz);
        const socialActs: { anim: string; expression: EyeExpression; verb: string }[] = [
            { anim: "waving", expression: "happy", verb: `Waving to ${agentName}` },
            { anim: "clapping", expression: "star", verb: `Cheering on ${agentName}` },
            { anim: "dancing", expression: "love", verb: `Dancing with ${agentName}` },
            { anim: "working", expression: "money", verb: `Conjuring Runes for ${agentName}` },
            { anim: "talking", expression: "happy", verb: `Chatting with ${agentName}` },
        ];
        const chosen = socialActs[Math.floor(Math.random() * socialActs.length)];
        get().setDestination({
            zone: spot.zone,
            spotName: `Beside ${agentName}`,
            position: [px, pz],
            yaw: yawToAgent,
            anim: chosen.anim,
            expression: chosen.expression,
            activityLabel: chosen.verb,
            hurrying: false,
            lockDurationMs: 9500,
            visitingAgentId: agentId,
        });
    },

    petMascot: () => {
        const petAnims = ["dancing", "clapping", "waving", "dancing2"];
        const petExprs: EyeExpression[] = ["love", "happy", "star"];
        const anim = petAnims[Math.floor(Math.random() * petAnims.length)];
        const expr = petExprs[Math.floor(Math.random() * petExprs.length)];
        const earned = get().gainMascotXp(20, { happiness: 10, bond: 5, energy: 3 });
        get().showToast(`♥ PURR! +${earned} XP · +5 BOND`);
        set({
            anim,
            expression: expr,
            activityLabel: "Purring from Head Pat!",
            lockUntil: Date.now() + 5500,
        });
    },

    feedMascot: () => {
        const earned = get().gainMascotXp(18, { hunger: 24, energy: 14, happiness: 8, bond: 4 });
        get().showToast(`🍖 +24 FUEL · +${earned} XP`);
        set({
            anim: "clapping",
            expression: "love",
            activityLabel: "Munching Cinder Fuel!",
            lockUntil: Date.now() + 5500,
        });
    },

    toggleRoaming: () =>
        set((s) => {
            const next = !s.roaming;
            return {
                roaming: next,
                toast: next ? "🐾 FREE ROAM ENABLED" : "📌 STAYING AT CURRENT SPOT",
            };
        }),
}));
