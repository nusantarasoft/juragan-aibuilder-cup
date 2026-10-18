"use client";

import { create } from "zustand";
import type { EyeExpression } from "@/components/helper/TamagotchiGlobal";
import { CORRIDOR_Z, DESKS, LOUNGE_TABLE, MEETING_DOOR, MEETING_TABLE } from "./floorplan";
import type { Agent, Spot, ZoneId } from "./types";

export const MASCOT_ID = "tamagotchi";
const STORAGE_KEY = "ns.admin.cinderPuff.v2";

export type MascotMoodId =
    | "hyper"
    | "playful"
    | "curious"
    | "social"
    | "hungry"
    | "sleepy"
    | "grumpy"
    | "arcane";

export interface MascotPlayActivity {
    anim: string;
    expression: EyeExpression;
    label: string;
    durationMs: number;
    vitalsDelta?: Partial<MascotVitals>;
}

export interface MascotMoodMeta {
    id: MascotMoodId;
    label: string;
    emoji: string;
    color: string;
    tagline: string;
    walkSpeed: number;
    runSpeed: number;
    hurryChance: number;
    roamIntervalMs: [number, number];
    agentVisitChance: number;
    zoneWeights: Record<ZoneId, number>;
    activities: MascotPlayActivity[];
}

export const MASCOT_MOODS: Record<MascotMoodId, MascotMoodMeta> = {
    hyper: {
        id: "hyper",
        label: "Hyper Zoomies",
        emoji: "⚡",
        color: "#38bdf8",
        tagline: "Sprinting across all zones with boundless energy!",
        walkSpeed: 3.4,
        runSpeed: 4.9,
        hurryChance: 0.85,
        roamIntervalMs: [3800, 5800],
        agentVisitChance: 0.32,
        zoneWeights: {
            lounge: 1.2,
            core: 1.3,
            engineering: 1.4,
            research: 1.4,
            operations: 1.3,
            meeting: 1.2,
        },
        activities: [
            { anim: "dancing2", expression: "star", label: "Hyper Breakdance Spin!", durationMs: 4600, vitalsDelta: { energy: -4, hunger: -3, happiness: 5, fitness: 4 } },
            { anim: "dancing", expression: "love", label: "Zoomie Victory Hop!", durationMs: 4200, vitalsDelta: { energy: -3, hunger: -2, happiness: 5, fitness: 3 } },
            { anim: "golfing", expression: "star", label: "Speed-Putting Energy Orbs!", durationMs: 5000, vitalsDelta: { energy: -3, happiness: 4, fitness: 3 } },
            { anim: "surprised", expression: "star", label: "Hyped Overdrive Spark!", durationMs: 3800, vitalsDelta: { energy: -2, happiness: 3 } },
            { anim: "clapping", expression: "happy", label: "Rapid Star-Spark Applause!", durationMs: 4200, vitalsDelta: { energy: -2, happiness: 4 } },
            { anim: "pointing", expression: "cool", label: "Striking a Neon Visor Pose!", durationMs: 4000, vitalsDelta: { happiness: 3 } },
        ],
    },
    playful: {
        id: "playful",
        label: "Playful & Happy",
        emoji: "🎉",
        color: "#10b981",
        tagline: "Bouncing around the office looking for fun games!",
        walkSpeed: 2.7,
        runSpeed: 4.2,
        hurryChance: 0.48,
        roamIntervalMs: [4800, 7200],
        agentVisitChance: 0.36,
        zoneWeights: {
            lounge: 1.5,
            core: 1.1,
            engineering: 1.2,
            research: 1.4,
            operations: 1.1,
            meeting: 1.1,
        },
        activities: [
            { anim: "golfing", expression: "happy", label: "Playing Floor Orb Golf", durationMs: 5600, vitalsDelta: { energy: -2, hunger: -2, happiness: 5, fitness: 2 } },
            { anim: "dancing", expression: "happy", label: "Doing a Happy Little Bounce", durationMs: 5000, vitalsDelta: { energy: -2, happiness: 5, fitness: 2 } },
            { anim: "dancing2", expression: "love", label: "Twirling with Cyan Ribbons", durationMs: 5200, vitalsDelta: { energy: -3, happiness: 6 } },
            { anim: "pointing", expression: "cool", label: "Flexing Cool Shades on Floor", durationMs: 4800, vitalsDelta: { happiness: 4 } },
            { anim: "clapping", expression: "star", label: "Clapping Happy Sparks", durationMs: 4600, vitalsDelta: { happiness: 4, bond: 2 } },
            { anim: "waving", expression: "love", label: "Waving Cheerfully Around", durationMs: 4500, vitalsDelta: { happiness: 3, bond: 2 } },
        ],
    },
    curious: {
        id: "curious",
        label: "Curious Explorer",
        emoji: "🔍",
        color: "#a855f7",
        tagline: "Wandering into every corner to inspect desks and gear!",
        walkSpeed: 2.5,
        runSpeed: 3.9,
        hurryChance: 0.34,
        roamIntervalMs: [4600, 6800],
        agentVisitChance: 0.35,
        zoneWeights: {
            engineering: 1.6,
            research: 1.6,
            core: 1.5,
            operations: 1.4,
            meeting: 1.4,
            lounge: 0.9,
        },
        activities: [
            { anim: "pointing", expression: "confused", label: "Investigating Mysterious Telemetry", durationMs: 5200, vitalsDelta: { intellect: 4, energy: -1 } },
            { anim: "surprised", expression: "surprised", label: "Ooh! Discovering New Floor Data!", durationMs: 4500, vitalsDelta: { intellect: 3, happiness: 2 } },
            { anim: "working", expression: "star", label: "Scanning Area with Arcane Runes", durationMs: 5600, vitalsDelta: { intellect: 5, energy: -2 } },
            { anim: "pointing", expression: "star", label: "Pointing Out System Anomalies", durationMs: 4800, vitalsDelta: { intellect: 3 } },
            { anim: "salute", expression: "normal", label: "Reporting Patrol Findings", durationMs: 4400, vitalsDelta: { intellect: 2, bond: 2 } },
            { anim: "talking", expression: "confused", label: "Muttering Curious Theories", durationMs: 4800, vitalsDelta: { intellect: 3 } },
        ],
    },
    social: {
        id: "social",
        label: "Social Butterfly",
        emoji: "💬",
        color: "#f472b6",
        tagline: "Visiting agents and spreading morale across all teams!",
        walkSpeed: 2.6,
        runSpeed: 4.0,
        hurryChance: 0.44,
        roamIntervalMs: [4500, 6800],
        agentVisitChance: 0.65,
        zoneWeights: {
            operations: 1.5,
            engineering: 1.5,
            research: 1.4,
            meeting: 1.5,
            lounge: 1.4,
            core: 1.1,
        },
        activities: [
            { anim: "waving", expression: "love", label: "Waving Warmly to the Team", durationMs: 4800, vitalsDelta: { bond: 4, happiness: 4 } },
            { anim: "talking", expression: "happy", label: "Sharing Pep Talk & Gossip", durationMs: 5200, vitalsDelta: { bond: 4, happiness: 3, energy: -1 } },
            { anim: "clapping", expression: "love", label: "Cheering Everyone's Hard Work", durationMs: 4800, vitalsDelta: { bond: 5, happiness: 4 } },
            { anim: "dancing", expression: "love", label: "Doing a Morale Boost Dance", durationMs: 5000, vitalsDelta: { bond: 3, happiness: 5, energy: -2 } },
            { anim: "salute", expression: "happy", label: "Saluting Fellow Teammates", durationMs: 4300, vitalsDelta: { bond: 3, happiness: 2 } },
        ],
    },
    arcane: {
        id: "arcane",
        label: "Arcane Mystic",
        emoji: "🔮",
        color: "#818cf8",
        tagline: "Channeling glowing rune circles at key nexus points!",
        walkSpeed: 2.4,
        runSpeed: 3.8,
        hurryChance: 0.28,
        roamIntervalMs: [5000, 7400],
        agentVisitChance: 0.28,
        zoneWeights: {
            core: 1.8,
            research: 1.6,
            engineering: 1.4,
            meeting: 1.3,
            operations: 1.1,
            lounge: 0.9,
        },
        activities: [
            { anim: "working", expression: "money", label: "Conjuring Golden Arcane Runes", durationMs: 6000, vitalsDelta: { intellect: 6, energy: -3, happiness: 3 } },
            { anim: "working", expression: "star", label: "Weaving Astral Floor Glyphs", durationMs: 5800, vitalsDelta: { intellect: 5, energy: -2 } },
            { anim: "pointing", expression: "cool", label: "Aligning Ley-Line Harmonics", durationMs: 4800, vitalsDelta: { intellect: 4 } },
            { anim: "salute", expression: "star", label: "Honoring the Core Spirit", durationMs: 4500, vitalsDelta: { intellect: 3, bond: 2 } },
            { anim: "stretching", expression: "happy", label: "Meditative Mana Stretch", durationMs: 4800, vitalsDelta: { energy: 4, intellect: 3 } },
        ],
    },
    hungry: {
        id: "hungry",
        label: "Hungry Forager",
        emoji: "🍖",
        color: "#f59e0b",
        tagline: "Sniffing around every zone in search of cinder snacks & coffee!",
        walkSpeed: 2.8,
        runSpeed: 4.3,
        hurryChance: 0.58,
        roamIntervalMs: [4000, 6000],
        agentVisitChance: 0.30,
        zoneWeights: {
            lounge: 2.4,
            operations: 1.2,
            engineering: 1.1,
            research: 1.1,
            meeting: 1.0,
            core: 0.9,
        },
        activities: [
            { anim: "clapping", expression: "love", label: "Munching Found Cinder-Biscuits!", durationMs: 5000, vitalsDelta: { hunger: 18, energy: 8, happiness: 6 } },
            { anim: "talking", expression: "confused", label: "Asking Around for Snacks…", durationMs: 4500, vitalsDelta: { hunger: 4, bond: 2 } },
            { anim: "surprised", expression: "star", label: "Spotted Crumbs on the Floor!", durationMs: 4200, vitalsDelta: { hunger: 12, happiness: 4 } },
            { anim: "refusing", expression: "angry", label: "Tummy Rumbling Loudly!", durationMs: 4200, vitalsDelta: { hunger: 6, happiness: -1 } },
            { anim: "waving", expression: "happy", label: "Begging Politely for Treats", durationMs: 4600, vitalsDelta: { hunger: 14, bond: 3, happiness: 4 } },
        ],
    },
    sleepy: {
        id: "sleepy",
        label: "Sleepy & Cozy",
        emoji: "💤",
        color: "#60a5fa",
        tagline: "Waddling slowly to cozy corners for yawns and power naps…",
        walkSpeed: 1.65,
        runSpeed: 2.5,
        hurryChance: 0.06,
        roamIntervalMs: [5800, 8400],
        agentVisitChance: 0.18,
        zoneWeights: {
            lounge: 2.0,
            meeting: 1.4,
            research: 1.3,
            engineering: 1.1,
            operations: 1.0,
            core: 1.0,
        },
        activities: [
            { anim: "sleeping", expression: "sleepy", label: "Dozing Off on the Floor (Zzz…)", durationMs: 6400, vitalsDelta: { energy: 20, happiness: 4 } },
            { anim: "stretching", expression: "sleepy", label: "Big Drowsy Stretch & Yawn", durationMs: 5000, vitalsDelta: { energy: 10, fitness: 2 } },
            { anim: "idle", expression: "sleepy", label: "Nodding Off Standing Up…", durationMs: 4800, vitalsDelta: { energy: 12 } },
            { anim: "sleeping", expression: "happy", label: "Dreaming of Starlight Treats", durationMs: 6000, vitalsDelta: { energy: 18, happiness: 6 } },
        ],
    },
    grumpy: {
        id: "grumpy",
        label: "Grumpy & Sassy",
        emoji: "💢",
        color: "#ef4444",
        tagline: "Stomping around with sassy attitude until cheered up!",
        walkSpeed: 2.3,
        runSpeed: 3.7,
        hurryChance: 0.30,
        roamIntervalMs: [4200, 6200],
        agentVisitChance: 0.25,
        zoneWeights: {
            engineering: 1.4,
            operations: 1.5,
            meeting: 1.5,
            core: 1.4,
            research: 1.2,
            lounge: 1.3,
        },
        activities: [
            { anim: "refusing", expression: "angry", label: "Hmph! Refusing Orders with Sass!", durationMs: 4600, vitalsDelta: { happiness: 6, energy: 2 } },
            { anim: "pointing", expression: "angry", label: "Scolding Slow Build Pipelines!", durationMs: 4600, vitalsDelta: { happiness: 5, intellect: 2 } },
            { anim: "pointing", expression: "cool", label: "Too Cool to Care Right Now", durationMs: 4400, vitalsDelta: { happiness: 7 } },
            { anim: "talking", expression: "angry", label: "Grumbling About Bug Tickets", durationMs: 4500, vitalsDelta: { happiness: 6 } },
            { anim: "stretching", expression: "sad", label: "Venting Steam & Stretching Out", durationMs: 4800, vitalsDelta: { happiness: 10, energy: 5 } },
        ],
    },
};

export const MASCOT_MOOD_LIST: MascotMoodMeta[] = Object.values(MASCOT_MOODS);

export interface MascotPlaySpot {
    id: string;
    zone: ZoneId;
    name: string;
    position: [number, number];
    yaw: number;
    activities: MascotPlayActivity[];
}

export const MASCOT_PLAY_SPOTS: MascotPlaySpot[] = [
    // Lounge (center: [0, 6], size: [5, 14])
    {
        id: "lounge-rug",
        zone: "lounge",
        name: "Lounge Rug",
        position: [0, 7.2],
        yaw: 0,
        activities: MASCOT_MOODS.playful.activities,
    },
    {
        id: "lounge-coffee",
        zone: "lounge",
        name: "Coffee Kiosk",
        position: [0.95, 5.8],
        yaw: Math.PI / 2,
        activities: MASCOT_MOODS.hungry.activities,
    },
    {
        id: "lounge-north",
        zone: "lounge",
        name: "Lounge Window Nook",
        position: [-1.1, 10.6],
        yaw: 0,
        activities: MASCOT_MOODS.sleepy.activities,
    },
    {
        id: "lounge-entry",
        zone: "lounge",
        name: "Lounge South Arch",
        position: [0.0, 0.8],
        yaw: Math.PI,
        activities: MASCOT_MOODS.social.activities,
    },

    // Agent Core (center: [0, -9], size: [5, 9])
    {
        id: "core-orchestrator",
        zone: "core",
        name: "Agent Core Nexus",
        position: [0, -5.6],
        yaw: Math.PI,
        activities: MASCOT_MOODS.arcane.activities,
    },
    {
        id: "core-racks-west",
        zone: "core",
        name: "West Server Racks",
        position: [-0.85, -10.2],
        yaw: -Math.PI / 2,
        activities: MASCOT_MOODS.curious.activities,
    },
    {
        id: "core-racks-east",
        zone: "core",
        name: "East Server Racks",
        position: [0.85, -10.2],
        yaw: Math.PI / 2,
        activities: MASCOT_MOODS.arcane.activities,
    },

    // Engineering & Infra (center: [-11, 6], size: [16, 14])
    {
        id: "engineering-aisle",
        zone: "engineering",
        name: "Engineering Central Aisle",
        position: [-8.5, 5.0],
        yaw: -Math.PI / 2,
        activities: MASCOT_MOODS.curious.activities,
    },
    {
        id: "engineering-west-window",
        zone: "engineering",
        name: "Engineering Sunlit Bay",
        position: [-17.8, 7.2],
        yaw: Math.PI / 2,
        activities: MASCOT_MOODS.playful.activities,
    },
    {
        id: "engineering-north-pod",
        zone: "engineering",
        name: "Infra North Pods",
        position: [-13.5, 11.5],
        yaw: 0,
        activities: MASCOT_MOODS.hyper.activities,
    },
    {
        id: "engineering-south-walk",
        zone: "engineering",
        name: "DevOps Corridor Edge",
        position: [-11.0, 1.2],
        yaw: Math.PI,
        activities: MASCOT_MOODS.social.activities,
    },

    // Business Insights / Research (center: [11, 6], size: [16, 14])
    {
        id: "research-holo",
        zone: "research",
        name: "HoloTable",
        position: [11.0, 8.2],
        yaw: 0,
        activities: MASCOT_MOODS.arcane.activities,
    },
    {
        id: "research-east-aisle",
        zone: "research",
        name: "Insights East Aisle",
        position: [16.8, 6.8],
        yaw: -Math.PI / 2,
        activities: MASCOT_MOODS.hyper.activities,
    },
    {
        id: "research-center-benches",
        zone: "research",
        name: "Analytics Pod Walk",
        position: [11.0, 2.4],
        yaw: Math.PI,
        activities: MASCOT_MOODS.curious.activities,
    },
    {
        id: "research-north-corner",
        zone: "research",
        name: "AI Lab Corner",
        position: [5.2, 11.4],
        yaw: Math.PI / 4,
        activities: MASCOT_MOODS.playful.activities,
    },

    // Service Desk / Operations (center: [-11, -9], size: [16, 9])
    {
        id: "operations-desk",
        zone: "operations",
        name: "Service Desk Plaza",
        position: [-11.0, -6.0],
        yaw: Math.PI,
        activities: MASCOT_MOODS.social.activities,
    },
    {
        id: "operations-datawall",
        zone: "operations",
        name: "Ops Telemetry Wall",
        position: [-11.0, -12.6],
        yaw: Math.PI,
        activities: MASCOT_MOODS.curious.activities,
    },
    {
        id: "operations-west-bay",
        zone: "operations",
        name: "ITSM West Bay",
        position: [-17.5, -9.8],
        yaw: Math.PI / 2,
        activities: MASCOT_MOODS.grumpy.activities,
    },
    {
        id: "operations-east-aisle",
        zone: "operations",
        name: "Command Center Aisle",
        position: [-4.6, -9.8],
        yaw: -Math.PI / 2,
        activities: MASCOT_MOODS.hyper.activities,
    },

    // War Room / Meeting (center: [11, -9], size: [16, 9])
    {
        id: "war-room",
        zone: "meeting",
        name: "War Room Strategy Spot",
        position: [11.0, -6.3],
        yaw: Math.PI,
        activities: MASCOT_MOODS.social.activities,
    },
    {
        id: "war-room-board",
        zone: "meeting",
        name: "Pulse Routine Board",
        position: [11.0, -12.3],
        yaw: Math.PI,
        activities: MASCOT_MOODS.curious.activities,
    },
    {
        id: "war-room-east",
        zone: "meeting",
        name: "War Room East Wing",
        position: [15.8, -9.5],
        yaw: -Math.PI / 2,
        activities: MASCOT_MOODS.playful.activities,
    },
    {
        id: "war-room-west",
        zone: "meeting",
        name: "War Room West Lounge",
        position: [6.0, -9.5],
        yaw: Math.PI / 2,
        activities: MASCOT_MOODS.sleepy.activities,
    },
];

const ZONE_SAFE_BOUNDS: Record<ZoneId, { xMin: number; xMax: number; zMin: number; zMax: number }> = {
    engineering: { xMin: -18.0, xMax: -4.2, zMin: -1.8, zMax: 12.0 },
    lounge: { xMin: -1.8, xMax: 1.8, zMin: -1.8, zMax: 11.8 },
    research: { xMin: 4.2, xMax: 18.0, zMin: -1.8, zMax: 12.0 },
    operations: { xMin: -18.0, xMax: -4.2, zMin: -12.6, zMax: -5.2 },
    core: { xMin: -1.1, xMax: 1.1, zMin: -10.5, zMax: -5.0 },
    meeting: { xMin: 5.2, xMax: 16.8, zMin: -12.4, zMax: -5.6 },
};

export function isSafeMascotFloorPoint(x: number, z: number): boolean {
    if (x < -18.4 || x > 18.4 || z < -12.9 || z > 12.4) return false;

    // Avoid desk footprints
    for (const d of DESKS) {
        if (Math.abs(x - d.position[0]) < 1.35 && Math.abs(z - d.position[1]) < 0.95) {
            return false;
        }
    }

    // Avoid Lounge Table
    if (Math.hypot(x - LOUNGE_TABLE[0], z - LOUNGE_TABLE[1]) < 1.35) return false;

    // Avoid HoloTable in Research
    if (Math.hypot(x - 11.0, z - 10.4) < 1.55) return false;

    // Avoid Agent Core Orchestrator
    if (Math.hypot(x - 0.0, z - -7.6) < 1.45) return false;

    // Avoid Agent Core Server Racks
    if (Math.abs(x) > 1.05 && Math.abs(x) < 2.5 && z < -10.1 && z > -13.2) return false;

    // Avoid War Room Meeting Table
    const [mtx, mtz] = MEETING_TABLE.center;
    if (Math.abs(x - mtx) < MEETING_TABLE.size[0] / 2 + 0.65 && Math.abs(z - mtz) < MEETING_TABLE.size[1] / 2 + 0.65) {
        return false;
    }

    // Avoid War Room Glass Wall at z = -4.5 for x > 3
    if (x > 2.8 && Math.abs(z - -4.5) < 0.65 && Math.abs(x - MEETING_DOOR[0]) > 0.9) {
        return false;
    }

    return true;
}

export function sampleRandomFloorSpotInZone(zone: ZoneId): { position: [number, number]; name: string; yaw: number } {
    const b = ZONE_SAFE_BOUNDS[zone];
    const zoneSpots = MASCOT_PLAY_SPOTS.filter((s) => s.zone === zone);

    // 55% chance to pick a completely random free-roam coordinate anywhere in the zone
    if (Math.random() < 0.55) {
        for (let attempt = 0; attempt < 24; attempt++) {
            const rx = b.xMin + Math.random() * (b.xMax - b.xMin);
            const rz = b.zMin + Math.random() * (b.zMax - b.zMin);
            if (isSafeMascotFloorPoint(rx, rz)) {
                const nearest = zoneSpots.reduce(
                    (best, cur) => {
                        const dist = Math.hypot(cur.position[0] - rx, cur.position[1] - rz);
                        return dist < best.dist ? { spot: cur, dist } : best;
                    },
                    { spot: zoneSpots[0] ?? MASCOT_PLAY_SPOTS[0], dist: Infinity },
                );
                return {
                    position: [Number(rx.toFixed(2)), Number(rz.toFixed(2))],
                    name: nearest.dist < 2.6 ? nearest.spot.name : `${zone.charAt(0).toUpperCase() + zone.slice(1)} Floor`,
                    yaw: (Math.random() - 0.5) * Math.PI * 2,
                };
            }
        }
    }

    // Otherwise pick one of the zone's landmarks with organic random jitter
    const base = zoneSpots[Math.floor(Math.random() * zoneSpots.length)] ?? MASCOT_PLAY_SPOTS[0];
    for (let attempt = 0; attempt < 12; attempt++) {
        const jx = base.position[0] + (Math.random() - 0.5) * 1.6;
        const jz = base.position[1] + (Math.random() - 0.5) * 1.6;
        if (isSafeMascotFloorPoint(jx, jz)) {
            return {
                position: [Number(jx.toFixed(2)), Number(jz.toFixed(2))],
                name: base.name,
                yaw: base.yaw + (Math.random() - 0.5) * 0.9,
            };
        }
    }

    return {
        position: base.position,
        name: base.name,
        yaw: base.yaw,
    };
}

export function deriveMoodFromVitals(vitals: MascotVitals, currentMood?: MascotMoodId): MascotMoodId {
    if (vitals.hunger < 48) return "hungry";
    if (vitals.energy < 44) return "sleepy";
    if (vitals.happiness < 48) return "grumpy";

    // Weighted random mood transitions so Puff naturally shifts moods over time
    const pool: { mood: MascotMoodId; weight: number }[] = [
        { mood: "hyper", weight: vitals.energy > 72 && vitals.happiness > 75 ? 2.4 : 0.9 },
        { mood: "playful", weight: vitals.happiness > 60 ? 2.6 : 1.2 },
        { mood: "curious", weight: vitals.intellect > 60 ? 2.2 : 1.4 },
        { mood: "social", weight: vitals.bond > 40 ? 2.1 : 1.3 },
        { mood: "arcane", weight: vitals.intellect > 68 ? 2.0 : 1.1 },
        { mood: "hungry", weight: vitals.hunger < 68 ? 1.5 : 0.45 },
        { mood: "sleepy", weight: vitals.energy < 65 ? 1.4 : 0.35 },
        { mood: "grumpy", weight: vitals.happiness < 68 ? 1.2 : 0.35 },
    ];

    // Slight momentum for current mood unless rolling a fresh mood shift
    if (currentMood && Math.random() < 0.42) {
        return currentMood;
    }

    const total = pool.reduce((acc, item) => acc + item.weight, 0);
    let r = Math.random() * total;
    for (const item of pool) {
        r -= item.weight;
        if (r <= 0) return item.mood;
    }
    return "playful";
}

export function pickWeightedZoneForMood(mood: MascotMoodId, currentZone: ZoneId): ZoneId {
    const weights = MASCOT_MOODS[mood].zoneWeights;
    const entries = (Object.keys(weights) as ZoneId[]).map((z) => ({
        zone: z,
        // Encourage exploring different areas across the whole floor
        weight: z === currentZone ? weights[z] * 0.45 : weights[z],
    }));
    const total = entries.reduce((sum, e) => sum + e.weight, 0);
    let r = Math.random() * total;
    for (const e of entries) {
        r -= e.weight;
        if (r <= 0) return e.zone;
    }
    return "lounge";
}

export function pickRandomActivityForMood(mood: MascotMoodId, currentAnim?: string): MascotPlayActivity {
    const meta = MASCOT_MOODS[mood];
    // 80% from current mood's signature activities, 20% wildcard from another compatible mood for variety
    let pool = meta.activities;
    if (Math.random() < 0.2) {
        const allMoods = Object.values(MASCOT_MOODS);
        const randomMood = allMoods[Math.floor(Math.random() * allMoods.length)];
        pool = randomMood.activities;
    }
    const candidates = pool.filter((a) => a.anim !== currentAnim);
    const list = candidates.length > 0 ? candidates : pool;
    return list[Math.floor(Math.random() * list.length)];
}

export function buildMascotPath(
    from: [number, number],
    fromZone: ZoneId,
    to: [number, number],
    toZone: ZoneId,
): [number, number][] {
    if (Math.hypot(from[0] - to[0], from[1] - to[1]) < 0.15) return [];
    const pts: [number, number][] = [];

    const fromInMeeting = fromZone === "meeting" || (from[0] > 3 && from[1] < -4.5);
    const toInMeeting = toZone === "meeting" || (to[0] > 3 && to[1] < -4.5);
    const crossesCorridor = (from[1] - CORRIDOR_Z) * (to[1] - CORRIDOR_Z) < 0;
    const sameZone = fromZone === toZone && !fromInMeeting && !toInMeeting && !crossesCorridor;

    if (!sameZone) {
        if (fromInMeeting && !toInMeeting) {
            pts.push([MEETING_DOOR[0], MEETING_DOOR[1] - 1.0]);
            pts.push([MEETING_DOOR[0], CORRIDOR_Z]);
        } else if (!fromInMeeting) {
            pts.push([from[0], CORRIDOR_Z]);
        }

        if (toInMeeting && !fromInMeeting) {
            pts.push([MEETING_DOOR[0], CORRIDOR_Z]);
            pts.push([MEETING_DOOR[0], MEETING_DOOR[1] - 1.0]);
        } else if (!toInMeeting) {
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
    mood: MascotMoodId;
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
    setMood: (mood: MascotMoodId, announce?: boolean) => void;
    randomizeMoodAndRoam: (agents?: Agent[], agentSpots?: Record<string, Spot>) => void;
    roamNextByMood: (agents?: Agent[], agentSpots?: Record<string, Spot>) => void;
    actRandomlyInPlace: () => void;
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
    mood: "playful",
    roaming: true,
    hurrying: false,
    toast: null,
    moveNonce: 0,
    lockUntil: 0,
    vitals: DEFAULT_VITALS,
    visitingAgentId: null,

    hydrateVitals: () => {
        const vitals = readStoredVitals();
        const mood = deriveMoodFromVitals(vitals, get().mood);
        set({ vitals, mood });
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
        const clamp = (v: number) => Math.max(20, Math.min(100, Math.round(v)));
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
        }, 2500);
    },

    setMood: (mood, announce = true) => {
        const meta = MASCOT_MOODS[mood];
        const act = pickRandomActivityForMood(mood, get().anim);
        if (announce) {
            get().showToast(`${meta.emoji} MOOD: ${meta.label.toUpperCase()}`);
        }
        set({
            mood,
            anim: act.anim,
            expression: act.expression,
            activityLabel: act.label,
        });
    },

    actRandomlyInPlace: () => {
        const st = get();
        const nextMood = Math.random() < 0.28 ? deriveMoodFromVitals(st.vitals, st.mood) : st.mood;
        const act = pickRandomActivityForMood(nextMood, st.anim);
        if (act.vitalsDelta) {
            st.gainMascotXp(4, act.vitalsDelta);
        }
        set({
            mood: nextMood,
            anim: act.anim,
            expression: act.expression,
            activityLabel: act.label,
            targetYaw: st.targetYaw + (Math.random() - 0.5) * 1.1,
        });
    },

    roamNextByMood: (agents = [], agentSpots = {}) => {
        const st = get();
        const nextMood = deriveMoodFromVitals(st.vitals, st.mood);
        const moodMeta = MASCOT_MOODS[nextMood];
        const moodChanged = nextMood !== st.mood;

        if (moodChanged) {
            set({ mood: nextMood });
        }

        const onlineAgents = agents.filter((a) => a.status !== "offline");
        if (onlineAgents.length > 0 && Math.random() < moodMeta.agentVisitChance) {
            const chosenAgent = onlineAgents[Math.floor(Math.random() * onlineAgents.length)];
            const sp = agentSpots[chosenAgent.id];
            if (sp) {
                st.visitAgentSpot(chosenAgent.id, chosenAgent.name, sp);
                return;
            }
        }

        // Pick a zone weighted by Puff's current mood (covers all 6 zones across the office)
        const nextZone = pickWeightedZoneForMood(nextMood, st.zone);
        const sampled = sampleRandomFloorSpotInZone(nextZone);
        const nextAct = pickRandomActivityForMood(nextMood, st.anim);
        const hurrying = Math.random() < moodMeta.hurryChance;

        if (nextAct.vitalsDelta) {
            st.gainMascotXp(6, nextAct.vitalsDelta);
        }

        if (moodChanged) {
            st.showToast(`${moodMeta.emoji} ${moodMeta.label.toUpperCase()} → ${sampled.name.toUpperCase()}`);
        }

        st.setDestination({
            zone: nextZone,
            spotName: sampled.name,
            position: sampled.position,
            yaw: sampled.yaw,
            anim: nextAct.anim,
            expression: nextAct.expression,
            activityLabel: nextAct.label,
            hurrying,
            lockDurationMs: nextAct.durationMs,
            visitingAgentId: null,
        });
    },

    randomizeMoodAndRoam: (agents = [], agentSpots = {}) => {
        const allMoodIds = Object.keys(MASCOT_MOODS) as MascotMoodId[];
        const others = allMoodIds.filter((m) => m !== get().mood);
        const chosenMood = others[Math.floor(Math.random() * others.length)] ?? "hyper";
        const moodMeta = MASCOT_MOODS[chosenMood];
        set({ mood: chosenMood, lockUntil: 0 });
        get().showToast(`${moodMeta.emoji} MOOD SHIFT: ${moodMeta.label.toUpperCase()}!`);

        const nextZone = pickWeightedZoneForMood(chosenMood, get().zone);
        const sampled = sampleRandomFloorSpotInZone(nextZone);
        const nextAct = pickRandomActivityForMood(chosenMood, get().anim);
        get().setDestination({
            zone: nextZone,
            spotName: sampled.name,
            position: sampled.position,
            yaw: sampled.yaw,
            anim: nextAct.anim,
            expression: nextAct.expression,
            activityLabel: nextAct.label,
            hurrying: Math.random() < Math.max(0.5, moodMeta.hurryChance),
            lockDurationMs: nextAct.durationMs,
            visitingAgentId: null,
        });
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

    triggerTrick: (anim, expression, label, durationMs = 6500) => {
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
        const mood = get().mood;
        const sampled = sampleRandomFloorSpotInZone(zone);
        const act = pickRandomActivityForMood(mood, get().anim);
        get().gainMascotXp(10, { fitness: 4, happiness: 4 });
        get().showToast(`🐾 HEADING TO ${sampled.name.toUpperCase()}`);
        get().setDestination({
            zone,
            spotName: sampled.name,
            position: sampled.position,
            yaw: sampled.yaw,
            anim: act.anim,
            expression: act.expression,
            activityLabel: act.label,
            hurrying: true,
            lockDurationMs: 8500,
            visitingAgentId: null,
        });
    },

    visitAgentSpot: (agentId, agentName, spot) => {
        const mood = get().mood;
        const moodMeta = MASCOT_MOODS[mood];
        const angle = spot.yaw + (Math.random() > 0.5 ? 0.85 : -0.85);
        const px = Math.max(-18.2, Math.min(18.2, spot.position[0] + Math.sin(angle) * 0.95));
        const pz = Math.max(-12.8, Math.min(12.2, spot.position[1] + Math.cos(angle) * 0.95));
        const yawToAgent = Math.atan2(spot.position[0] - px, spot.position[1] - pz);

        const moodSocialActs: Record<MascotMoodId, { anim: string; expression: EyeExpression; verb: string }[]> = {
            hyper: [
                { anim: "dancing2", expression: "star", verb: `Breakdancing beside ${agentName}!` },
                { anim: "dancing", expression: "love", verb: `Doing Zoomie Hops with ${agentName}!` },
                { anim: "clapping", expression: "star", verb: `Hyping up ${agentName}!` },
            ],
            playful: [
                { anim: "golfing", expression: "happy", verb: `Playing Orb Golf near ${agentName}` },
                { anim: "dancing", expression: "happy", verb: `Dancing happily with ${agentName}` },
                { anim: "pointing", expression: "cool", verb: `Showing off visor to ${agentName}` },
            ],
            curious: [
                { anim: "pointing", expression: "star", verb: `Inspecting ${agentName}'s monitor` },
                { anim: "surprised", expression: "surprised", verb: `Marveling at ${agentName}'s output` },
                { anim: "working", expression: "star", verb: `Scanning runes beside ${agentName}` },
            ],
            social: [
                { anim: "waving", expression: "love", verb: `Waving warmly to ${agentName}` },
                { anim: "talking", expression: "happy", verb: `Chatting with ${agentName}` },
                { anim: "clapping", expression: "love", verb: `Cheering on ${agentName}` },
            ],
            arcane: [
                { anim: "working", expression: "money", verb: `Conjuring Runes for ${agentName}` },
                { anim: "salute", expression: "star", verb: `Channeling mana for ${agentName}` },
            ],
            hungry: [
                { anim: "talking", expression: "confused", verb: `Asking ${agentName} for snacks…` },
                { anim: "waving", expression: "love", verb: `Hoping ${agentName} has treats!` },
            ],
            sleepy: [
                { anim: "stretching", expression: "sleepy", verb: `Yawning sleepily beside ${agentName}` },
                { anim: "sleeping", expression: "sleepy", verb: `Napping by ${agentName}'s desk (Zzz)` },
            ],
            grumpy: [
                { anim: "refusing", expression: "angry", verb: `Shaking head at ${agentName}'s screen!` },
                { anim: "pointing", expression: "angry", verb: `Critiquing ${agentName}'s code!` },
            ],
        };

        const pool = moodSocialActs[mood] ?? moodSocialActs.social;
        const chosen = pool[Math.floor(Math.random() * pool.length)];

        get().setDestination({
            zone: spot.zone,
            spotName: `Beside ${agentName}`,
            position: [px, pz],
            yaw: yawToAgent,
            anim: chosen.anim,
            expression: chosen.expression,
            activityLabel: chosen.verb,
            hurrying: Math.random() < moodMeta.hurryChance,
            lockDurationMs: 6800,
            visitingAgentId: agentId,
        });
    },

    petMascot: () => {
        const petAnims = ["dancing", "clapping", "waving", "dancing2"];
        const petExprs: EyeExpression[] = ["love", "happy", "star"];
        const anim = petAnims[Math.floor(Math.random() * petAnims.length)];
        const expr = petExprs[Math.floor(Math.random() * petExprs.length)];
        const earned = get().gainMascotXp(20, { happiness: 12, bond: 5, energy: 4 });
        const curMood = get().mood;
        const nextMood: MascotMoodId = curMood === "grumpy" ? "playful" : curMood;
        get().showToast(`♥ PURR! +${earned} XP · +5 BOND`);
        set({
            mood: nextMood,
            anim,
            expression: expr,
            activityLabel: "Purring from Head Pat!",
            lockUntil: Date.now() + 5000,
        });
    },

    feedMascot: () => {
        const earned = get().gainMascotXp(18, { hunger: 26, energy: 14, happiness: 10, bond: 4 });
        const curMood = get().mood;
        const nextMood: MascotMoodId = curMood === "hungry" || curMood === "grumpy" ? "playful" : curMood;
        get().showToast(`🍖 +26 FUEL · +${earned} XP`);
        set({
            mood: nextMood,
            anim: "clapping",
            expression: "love",
            activityLabel: "Munching Cinder Fuel!",
            lockUntil: Date.now() + 5000,
        });
    },

    toggleRoaming: () =>
        set((s) => {
            const next = !s.roaming;
            if (!next) {
                return {
                    roaming: false,
                    anim: "idle",
                    expression: "happy",
                    activityLabel: "Standing by on the floor",
                    lockUntil: Date.now() + 60000,
                    toast: "📌 STAYING AT CURRENT SPOT",
                };
            }
            return {
                roaming: true,
                lockUntil: 0,
                toast: "🐾 FREE ROAM ENABLED",
            };
        }),
}));
