"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    BookOpen,
    Box,
    Compass,
    ExternalLink,
    Globe,
    Handshake,
    Megaphone,
    MessageSquare,
    Orbit,
    Pause,
    Play,
    RotateCcw,
    SlidersHorizontal,
    Sparkles,
    X,
    type LucideIcon,
} from "lucide-react";
import { hash01, project, type Pt3 } from "../agentic-os/lib/deckGraph";
import { getVOTheme } from "../layout/voTheme";

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const TAU = Math.PI * 2;
const SPIN = 0.00022;
const TWEEN_MS = 750;
const CLOUD_COLORS = ["#fb923c", "#f97316", "#fdba74", "#ea580c", "#fed7aa"];

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type OrbViewMode = "rings" | "orbit";

export interface OrbPageNode {
    id: string;
    code: string;
    label: string;
    shortLabel: string;
    sub: string;
    href: string;
    color: string;
    icon: LucideIcon;
    ringIndex: 1 | 2; // 1 = inner operational ring, 2 = outer surface ring
    angleDeg: number;
    orbitPos: Pt3;
}

interface SatelliteDot {
    id: string;
    color: string;
    size: number;
    ringX: number;
    ringY: number;
    orbitPos: Pt3;
}

interface AnimNodeState {
    x: number;
    y: number;
    s: number;
    o: number;
    z: number;
}

const ORB_GLOBE_R = 148;
const ORB_APP_RING_R = 172;
const ORB_PULSE_R = 112;
const ORB_PULSE_Y = -44;

const PAGE_NODES: OrbPageNode[] = [
    {
        id: "ai-studio",
        code: "ST",
        label: "AI Studio",
        shortLabel: "STUDIO",
        sub: "Grounded notebooks, RAG sources & assistant",
        href: "/admin/ai-studio",
        color: "#fb923c",
        icon: Sparkles,
        ringIndex: 1,
        angleDeg: -90,
        orbitPos: { x: 0, y: -32, z: ORB_APP_RING_R },
    },
    {
        id: "partner",
        code: "PT",
        label: "Partner",
        shortLabel: "PARTNER",
        sub: "Partner & UMKM directory, onboarding & WA sim",
        href: "/admin/ai-studio/partner",
        color: "#10b981",
        icon: Handshake,
        ringIndex: 1,
        angleDeg: -18,
        orbitPos: {
            x: ORB_APP_RING_R * Math.cos(0.9),
            y: -18,
            z: ORB_APP_RING_R * Math.sin(0.9),
        },
    },
    {
        id: "knowledge-research",
        code: "KR",
        label: "Knowledge Research",
        shortLabel: "RESEARCH",
        sub: "Autonomous web research & RAG knowledge vault",
        href: "/admin/ai-studio/knowledge-research",
        color: "#38bdf8",
        icon: BookOpen,
        ringIndex: 1,
        angleDeg: 54,
        orbitPos: {
            x: ORB_APP_RING_R * Math.cos(1.85),
            y: 24,
            z: ORB_APP_RING_R * Math.sin(1.85),
        },
    },
    {
        id: "showcase",
        code: "SH",
        label: "Showcase",
        shortLabel: "SHOWCASE",
        sub: "Generate showcase materials & visual brochures",
        href: "/admin/ai-studio/showcase",
        color: "#f43f5e",
        icon: Megaphone,
        ringIndex: 1,
        angleDeg: 126,
        orbitPos: {
            x: ORB_APP_RING_R * Math.cos(2.75),
            y: -26,
            z: ORB_APP_RING_R * Math.sin(2.75),
        },
    },
    {
        id: "messages",
        code: "MG",
        label: "Messages",
        shortLabel: "MESSAGES",
        sub: "Live WhatsApp customer & partner conversations",
        href: "/admin/ai-studio/messages",
        color: "#a855f7",
        icon: MessageSquare,
        ringIndex: 1,
        angleDeg: 198,
        orbitPos: {
            x: ORB_APP_RING_R * Math.cos(3.75),
            y: 28,
            z: ORB_APP_RING_R * Math.sin(3.75),
        },
    },
    {
        id: "settings",
        code: "CF",
        label: "Settings",
        shortLabel: "SETTINGS",
        sub: "AI providers, models & WhatsApp Gateway config",
        href: "/admin/ai-studio/settings",
        color: "#f59e0b",
        icon: SlidersHorizontal,
        ringIndex: 2,
        angleDeg: -54,
        orbitPos: {
            x: ORB_APP_RING_R * Math.cos(4.75),
            y: -48,
            z: ORB_APP_RING_R * Math.sin(4.75),
        },
    },
    {
        id: "virtual-office",
        code: "VO",
        label: "Virtual Office",
        shortLabel: "VIRTUAL HQ",
        sub: "3D spatial AI agent headquarters & live desks",
        href: "/admin/virtual-office",
        color: "#22d3ee",
        icon: Box,
        ringIndex: 2,
        angleDeg: 162,
        orbitPos: {
            x: ORB_APP_RING_R * Math.cos(5.55),
            y: 46,
            z: ORB_APP_RING_R * Math.sin(5.55),
        },
    },
];

/** Deterministic orange particle nebula around the core (from Agentic OS DeckGraph). */
const CoreCloud = React.memo(function CoreCloud({
    motion,
    radius = 56,
    gradientId,
}: {
    motion: boolean;
    radius?: number;
    gradientId: string;
}) {
    const layers = useMemo(
        () =>
            [0, 1, 2].map((layer) =>
                Array.from({ length: 85 }, (_, i) => {
                    const key = `orb-c${layer}:${i}`;
                    const a = hash01(key, 1) * TAU;
                    const r = radius * Math.pow(hash01(key, 2), 0.75) * (0.32 + (0.68 * (layer + 1)) / 3);
                    return {
                        x: Math.cos(a) * r,
                        y: Math.sin(a) * r,
                        s: 0.55 + hash01(key, 3) * 1.15,
                        o: 0.35 + hash01(key, 4) * 0.58,
                        c: CLOUD_COLORS[Math.floor(hash01(key, 5) * CLOUD_COLORS.length)],
                    };
                }),
            ),
        [radius],
    );
    return (
        <g pointerEvents="none">
            <circle r={radius * 1.4} fill={`url(#${gradientId})`} />
            {layers.map((pts, li) => (
                <g key={li}>
                    {motion && (
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0"
                            to={li % 2 ? "-360" : "360"}
                            dur={`${42 + li * 28}s`}
                            repeatCount="indefinite"
                        />
                    )}
                    {pts.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r={p.s} fill={p.c} fillOpacity={p.o} />
                    ))}
                </g>
            ))}
        </g>
    );
});

/** Radial precision tick marks around concentric rings (from Agentic OS DeckGraph). */
const RingTicks = React.memo(function RingTicks({
    r,
    index,
    motion,
}: {
    r: number;
    index: number;
    motion: boolean;
}) {
    return (
        <g pointerEvents="none" opacity={0.44}>
            {motion && (
                <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0"
                    to={index % 2 ? "360" : "-360"}
                    dur={`${180 + index * 30}s`}
                    repeatCount="indefinite"
                />
            )}
            {Array.from({ length: 96 }, (_, t) => {
                const a = (t / 96) * TAU;
                const r2 = r + (t % 8 === 0 ? 6.5 : 2.5);
                return (
                    <line
                        key={t}
                        x1={Math.cos(a) * r}
                        y1={Math.sin(a) * r}
                        x2={Math.cos(a) * r2}
                        y2={Math.sin(a) * r2}
                        stroke="#64748b"
                        strokeWidth={0.8}
                    />
                );
            })}
        </g>
    );
});

/** 3D Orbit wireframe globe + equatorial application ring + pulse ring (from Agentic OS DeckGraph). */
function OrbitGlobeDeco({
    yaw,
    tilt,
    light,
    alpha,
}: {
    yaw: number;
    tilt: number;
    light: boolean;
    alpha: number;
}) {
    if (alpha < 0.02) return null;
    const G = ORB_GLOBE_R;
    const path = (pts: Pt3[]) =>
        pts
            .map((p, i) => {
                const q = project(p, yaw, tilt, 680);
                return `${i ? "L" : "M"}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
            })
            .join("");
    const ring = (fn: (a: number) => Pt3, n = 64) =>
        path(Array.from({ length: n + 1 }, (_, i) => fn((i / n) * TAU)));

    const meridians = Array.from({ length: 6 }, (_, m) => {
        const phi = (m * Math.PI) / 6;
        return ring((a) => ({
            x: G * Math.cos(a) * Math.cos(phi),
            y: G * Math.sin(a),
            z: G * Math.cos(a) * Math.sin(phi),
        }));
    });
    const parallels = [-0.92, -0.48, 0, 0.48, 0.92].map((lat) => {
        const r = G * Math.cos(lat);
        const y = G * Math.sin(lat);
        return ring((a) => ({ x: r * Math.cos(a), y, z: r * Math.sin(a) }));
    });

    return (
        <g pointerEvents="none" fill="none" opacity={alpha}>
            {meridians.map((d, i) => (
                <path
                    key={`m${i}`}
                    d={d}
                    stroke={light ? "#334155" : "#94a3b8"}
                    strokeOpacity={light ? 0.2 : 0.11}
                    strokeWidth={0.85}
                />
            ))}
            {parallels.map((d, i) => (
                <path
                    key={`p${i}`}
                    d={d}
                    stroke={light ? "#334155" : "#94a3b8"}
                    strokeOpacity={i === 2 ? (light ? 0.3 : 0.18) : light ? 0.16 : 0.08}
                    strokeWidth={0.85}
                />
            ))}
            <path
                d={ring((a) => ({ x: ORB_APP_RING_R * Math.cos(a), y: 0, z: ORB_APP_RING_R * Math.sin(a) }), 96)}
                stroke={light ? "#475569" : "#cbd5e1"}
                strokeOpacity={light ? 0.5 : 0.36}
                strokeWidth={1.15}
                strokeDasharray="5 3"
            />
            <path
                d={ring((a) => ({ x: ORB_PULSE_R * Math.cos(a), y: ORB_PULSE_Y, z: ORB_PULSE_R * Math.sin(a) }))}
                stroke="#fb923c"
                strokeOpacity={light ? 0.55 : 0.42}
                strokeWidth={1.05}
            />
        </g>
    );
}

export default function FloatingOrbMenu({ darkMode = true }: { darkMode?: boolean }) {
    const router = useRouter();
    const pathname = usePathname() || "/admin/ai-studio";
    const vo = getVOTheme(darkMode);
    const light = !darkMode;

    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<OrbViewMode>("orbit");
    const [motionEnabled, setMotionEnabled] = useState(true);
    const [hoverId, setHoverId] = useState<string | null>(null);
    const [, setFrameTick] = useState(0);

    // 3D Orbit camera state
    const yawRef = useRef(0.55);
    const tiltRef = useRef(0.38);
    const modeRef = useRef<OrbViewMode>(mode);
    modeRef.current = mode;
    const motionRef = useRef(motionEnabled);
    motionRef.current = motionEnabled;

    // Tween between "rings" (0) and "orbit" (1)
    const blendRef = useRef(mode === "orbit" ? 1 : 0);
    const tweenRef = useRef<{ from: number; to: number; t0: number } | null>(null);
    const dragRef = useRef<{ cx: number; cy: number; moved: boolean } | null>(null);
    const rafRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    // Ambient satellite dots (memory/skill particles in both Rings and 3D Orbit)
    const satellites = useMemo<SatelliteDot[]>(() => {
        const palette = ["#fb923c", "#38bdf8", "#10b981", "#a855f7", "#f59e0b", "#22d3ee"];
        return Array.from({ length: 34 }, (_, i) => {
            const key = `sat:${i}`;
            const ringR = i < 18 ? 78 + hash01(key, 1) * 24 : 148 + hash01(key, 2) * 38;
            const ang = (i / 34) * TAU + hash01(key, 3) * 0.35;
            // Fibonacci sphere for 3D Orbit
            const u = 1 - (2 * (i + 0.5)) / 34;
            const rr = Math.sqrt(Math.max(0, 1 - u * u));
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;
            const sphereR = ORB_GLOBE_R * (0.78 + hash01(key, 4) * 0.22);
            return {
                id: key,
                color: palette[i % palette.length],
                size: 1.8 + hash01(key, 5) * 1.5,
                ringX: Math.cos(ang) * ringR,
                ringY: Math.sin(ang) * ringR,
                orbitPos: {
                    x: sphereR * rr * Math.cos(theta),
                    y: sphereR * u,
                    z: sphereR * rr * Math.sin(theta),
                },
            };
        });
    }, []);

    // Determine which page node matches current route
    const activePageId = useMemo(() => {
        const normalized = pathname.replace(/\/$/, "");
        const exact = PAGE_NODES.find((n) => n.href !== "/admin/ai-studio" && normalized.startsWith(n.href));
        if (exact) return exact.id;
        if (normalized === "/admin/ai-studio") return "ai-studio";
        return "ai-studio";
    }, [pathname]);

    const stepLoop = useCallback((now: number) => {
        rafRef.current = 0;
        const dt = lastTimeRef.current ? now - lastTimeRef.current : 16;
        lastTimeRef.current = now;

        const tw = tweenRef.current;
        if (tw) {
            const p = Math.min(1, (now - tw.t0) / TWEEN_MS);
            blendRef.current = lerp(tw.from, tw.to, easeInOutCubic(p));
            if (p >= 1) tweenRef.current = null;
        }

        const spinning =
            isOpen &&
            (modeRef.current === "orbit" || blendRef.current > 0.01) &&
            motionRef.current &&
            !dragRef.current;

        if (spinning) {
            yawRef.current += dt * SPIN;
        }

        setFrameTick((n) => (n + 1) % 1_000_000);

        if (isOpen && (tweenRef.current || spinning)) {
            rafRef.current = requestAnimationFrame(stepLoop);
        }
    }, [isOpen]);

    const kickLoop = useCallback(() => {
        if (!rafRef.current) {
            lastTimeRef.current = 0;
            rafRef.current = requestAnimationFrame(stepLoop);
        }
    }, [stepLoop]);

    useEffect(() => {
        if (isOpen) {
            kickLoop();
        }
        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = 0;
            }
        };
    }, [isOpen, motionEnabled, kickLoop]);

    const switchMode = useCallback(
        (nextMode: OrbViewMode) => {
            if (nextMode === modeRef.current && !tweenRef.current) return;
            setMode(nextMode);
            tweenRef.current = {
                from: blendRef.current,
                to: nextMode === "orbit" ? 1 : 0,
                t0: performance.now(),
            };
            kickLoop();
        },
        [kickLoop],
    );

    const handleResetView = useCallback(() => {
        yawRef.current = 0.55;
        tiltRef.current = 0.38;
        kickLoop();
    }, [kickLoop]);

    const handleNavigate = useCallback(
        (href: string) => {
            router.push(href);
            setIsOpen(false);
        },
        [router],
    );

    // Pointer drag rotation in 3D Orbit mode
    const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
        if (e.button !== 0) return;
        dragRef.current = { cx: e.clientX, cy: e.clientY, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = e.clientX - d.cx;
        const dy = e.clientY - d.cy;
        if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true;
        if (!d.moved) return;

        // If user drags in Rings mode, smoothly transition into 3D Orbit mode
        if (modeRef.current === "rings" && Math.abs(dx) + Math.abs(dy) > 8) {
            switchMode("orbit");
        }

        yawRef.current += dx * 0.0075;
        tiltRef.current = Math.max(-0.25, Math.min(1.05, tiltRef.current + dy * 0.0055));
        d.cx = e.clientX;
        d.cy = e.clientY;
        setFrameTick((n) => (n + 1) % 1_000_000);
    };

    const onPointerUp = () => {
        dragRef.current = null;
        kickLoop();
    };

    // Compute blended node positions (Rings <-> 3D Orbit)
    const blend = blendRef.current;
    const ringsAlpha = 1 - blend;
    const orbitAlpha = blend;

    const nodePositions = useMemo(() => {
        const map = new Map<string, AnimNodeState>();
        for (const node of PAGE_NODES) {
            const rad = (node.angleDeg * Math.PI) / 180;
            const ringR = node.ringIndex === 1 ? 118 : 168;
            const rx = Math.cos(rad) * ringR;
            const ry = Math.sin(rad) * ringR;

            const q = project(node.orbitPos, yawRef.current, tiltRef.current, 680);
            const depth = Math.max(0, Math.min(1, (q.z + ORB_APP_RING_R * 1.1) / (ORB_APP_RING_R * 2.2)));
            const orbitScale = q.k;
            const orbitOpacity = 0.38 + 0.62 * depth;

            map.set(node.id, {
                x: lerp(rx, q.x, blend),
                y: lerp(ry, q.y, blend),
                s: lerp(1, orbitScale, blend),
                o: lerp(1, orbitOpacity, blend),
                z: lerp(0, q.z, blend),
            });
        }
        return map;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blend, yawRef.current, tiltRef.current, isOpen]);

    // Sort nodes back-to-front in 3D Orbit so front nodes render over back nodes
    const sortedPageNodes = useMemo(() => {
        return [...PAGE_NODES].sort((a, b) => {
            const za = nodePositions.get(a.id)?.z ?? 0;
            const zb = nodePositions.get(b.id)?.z ?? 0;
            return za - zb;
        });
    }, [nodePositions]);

    const hoveredNode = useMemo(
        () => PAGE_NODES.find((n) => n.id === hoverId) ?? PAGE_NODES.find((n) => n.id === activePageId) ?? PAGE_NODES[0],
        [hoverId, activePageId],
    );

    return (
        <div
            data-testid="floating-orb-navigator"
            className="font-mono select-none"
            style={{
                position: "relative",
                fontFamily: MONO,
            }}
        >
            {/* ===================================================================== */}
            {/* EXPANDED AGENTIC OS RING & 3D ORBIT TACTICAL NAVIGATOR PANEL          */}
            {/* ===================================================================== */}
            {isOpen && (
                <div
                    data-testid="floating-orb-panel"
                    style={{
                        position: "fixed",
                        bottom: 92,
                        right: 24,
                        width: 430,
                        maxWidth: "calc(100vw - 32px)",
                        background: light ? "rgba(255, 255, 255, 0.97)" : "rgba(11, 14, 19, 0.96)",
                        border: `1px solid ${vo.borderStrong}`,
                        borderTop: "2px solid #fb923c",
                        boxShadow: light
                            ? "0 24px 48px -12px rgba(15, 23, 42, 0.22)"
                            : "0 28px 64px -12px rgba(0, 0, 0, 0.85), 0 0 28px rgba(251, 146, 60, 0.12)",
                        backdropFilter: "blur(16px)",
                        zIndex: 9999,
                    }}
                >
                    {/* Top Tactical Status & View Switcher Header */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "7px 10px",
                            borderBottom: `1px solid ${vo.border}`,
                            background: light ? "rgba(241, 245, 249, 0.85)" : "rgba(15, 23, 42, 0.65)",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                                className="inline-block h-1.5 w-1.5 animate-pulse"
                                style={{ background: "#fb923c" }}
                            />
                            <span
                                style={{
                                    fontSize: 9.5,
                                    fontWeight: 700,
                                    letterSpacing: "0.18em",
                                    textTransform: "uppercase",
                                    color: vo.text,
                                }}
                            >
                                ORBITAL DECK
                            </span>
                            <span style={{ fontSize: 9, color: "#fb923c", fontWeight: 700 }}>
                                // {mode === "orbit" ? "3D ORBIT" : "RINGS"}
                            </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {/* RINGS / 3D ORBIT Mode Switcher */}
                            <button
                                type="button"
                                data-testid="orb-mode-rings"
                                onClick={() => switchMode("rings")}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    height: 20,
                                    padding: "0 6px",
                                    fontSize: 9,
                                    fontWeight: 700,
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    border: `1px solid ${
                                        mode === "rings" ? "rgba(251, 146, 60, 0.75)" : vo.border
                                    }`,
                                    background:
                                        mode === "rings" ? "rgba(251, 146, 60, 0.16)" : "transparent",
                                    color: mode === "rings" ? "#fb923c" : vo.textMuted,
                                    cursor: "pointer",
                                }}
                            >
                                <Compass className="h-2.5 w-2.5" />
                                <span>Rings</span>
                            </button>

                            <button
                                type="button"
                                data-testid="orb-mode-orbit"
                                onClick={() => switchMode("orbit")}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    height: 20,
                                    padding: "0 6px",
                                    fontSize: 9,
                                    fontWeight: 700,
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    border: `1px solid ${
                                        mode === "orbit" ? "rgba(56, 189, 248, 0.75)" : vo.border
                                    }`,
                                    background:
                                        mode === "orbit" ? "rgba(56, 189, 248, 0.16)" : "transparent",
                                    color: mode === "orbit" ? "#38bdf8" : vo.textMuted,
                                    cursor: "pointer",
                                }}
                            >
                                <Globe className="h-2.5 w-2.5" />
                                <span>3D Orbit</span>
                            </button>

                            {/* Motion Pause/Play */}
                            <button
                                type="button"
                                title={motionEnabled ? "Pause orbital spin" : "Resume orbital spin"}
                                onClick={() => setMotionEnabled((m) => !m)}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 20,
                                    height: 20,
                                    border: `1px solid ${vo.border}`,
                                    background: "transparent",
                                    color: motionEnabled ? "#10b981" : vo.textMuted,
                                    cursor: "pointer",
                                }}
                            >
                                {motionEnabled ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
                            </button>

                            {/* Reset 3D Angle */}
                            <button
                                type="button"
                                title="Reset orbital camera angle"
                                onClick={handleResetView}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 20,
                                    height: 20,
                                    border: `1px solid ${vo.border}`,
                                    background: "transparent",
                                    color: vo.textMuted,
                                    cursor: "pointer",
                                }}
                            >
                                <RotateCcw className="h-2.5 w-2.5" />
                            </button>

                            {/* Close Button */}
                            <button
                                type="button"
                                title="Close Orbital Navigator"
                                onClick={() => setIsOpen(false)}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 20,
                                    height: 20,
                                    border: `1px solid ${vo.border}`,
                                    background: "transparent",
                                    color: vo.textMuted,
                                    cursor: "pointer",
                                }}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    </div>

                    {/* Interactive Ring & 3D Orbit SVG Canvas */}
                    <div
                        style={{
                            position: "relative",
                            width: "100%",
                            height: 330,
                            overflow: "hidden",
                            background: light ? "#f8fafc" : "#070a0f",
                        }}
                    >
                        <svg
                            viewBox="-215 -185 430 370"
                            className={`h-full w-full touch-none select-none ${
                                mode === "orbit" ? "cursor-move" : "cursor-grab active:cursor-grabbing"
                            }`}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                        >
                            <defs>
                                <radialGradient id="orb-deck-core-glow">
                                    <stop offset="0%" stopColor="#f97316" stopOpacity={light ? "0.28" : "0.38"} />
                                    <stop offset="55%" stopColor="#c2410c" stopOpacity={light ? "0.08" : "0.12"} />
                                    <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
                                </radialGradient>
                                <radialGradient id="orb-deck-bg" cx="50%" cy="50%" r="60%">
                                    <stop
                                        offset="0%"
                                        stopColor={light ? "#e2e8f0" : "#1e293b"}
                                        stopOpacity={light ? "0.6" : "0.45"}
                                    />
                                    <stop
                                        offset="70%"
                                        stopColor={light ? "#f1f5f9" : "#0b0e13"}
                                        stopOpacity={light ? "0.25" : "0.22"}
                                    />
                                    <stop offset="100%" stopColor={light ? "#f8fafc" : "#020617"} stopOpacity="0" />
                                </radialGradient>
                            </defs>

                            <rect x={-215} y={-185} width={430} height={370} fill="url(#orb-deck-bg)" />

                            {/* 1. RINGS MODE CONCENTRIC GUIDES & ROTATING TICKS */}
                            {ringsAlpha > 0.02 && (
                                <g opacity={ringsAlpha} pointerEvents="none">
                                    {[
                                        { r: 62, strong: false, dash: true },
                                        { r: 118, strong: true, dash: false },
                                        { r: 168, strong: true, dash: true },
                                    ].map((g, i) => (
                                        <g key={i}>
                                            <circle
                                                r={g.r}
                                                fill="none"
                                                stroke={
                                                    g.strong
                                                        ? light
                                                            ? "rgba(15,23,42,0.24)"
                                                            : "rgba(148,163,184,0.24)"
                                                        : light
                                                          ? "rgba(15,23,42,0.12)"
                                                          : "rgba(148,163,184,0.11)"
                                                }
                                                strokeWidth={g.strong ? 1.2 : 0.9}
                                                strokeDasharray={g.dash ? "3 6" : undefined}
                                            >
                                                {motionEnabled && g.dash && (
                                                    <animateTransform
                                                        attributeName="transform"
                                                        type="rotate"
                                                        from="0"
                                                        to={i % 2 ? "-360" : "360"}
                                                        dur={`${140 + i * 35}s`}
                                                        repeatCount="indefinite"
                                                    />
                                                )}
                                            </circle>
                                            {g.strong && <RingTicks r={g.r} index={i} motion={motionEnabled} />}
                                        </g>
                                    ))}
                                    {/* Outer segmented telemetry bezel ring */}
                                    <circle
                                        r={182}
                                        fill="none"
                                        stroke={light ? "rgba(15,23,42,0.15)" : "rgba(148,163,184,0.14)"}
                                        strokeWidth={3}
                                        strokeDasharray="48 12 4 12"
                                    >
                                        {motionEnabled && (
                                            <animateTransform
                                                attributeName="transform"
                                                type="rotate"
                                                from="0"
                                                to="360"
                                                dur="240s"
                                                repeatCount="indefinite"
                                            />
                                        )}
                                    </circle>

                                    {/* Ring Section Labels */}
                                    <g transform="translate(0 -118)">
                                        <rect
                                            x={-38}
                                            y={-7}
                                            width={76}
                                            height={14}
                                            rx={1}
                                            fill={light ? "#ffffff" : "#0b0e13"}
                                            fillOpacity={0.88}
                                        />
                                        <text
                                            textAnchor="middle"
                                            dy={3}
                                            fontSize={7.5}
                                            fontWeight={700}
                                            letterSpacing={1.8}
                                            fill="#38bdf8"
                                            fontFamily={MONO}
                                        >
                                            MODULES · 5
                                        </text>
                                    </g>
                                    <g transform="translate(0 -168)">
                                        <rect
                                            x={-42}
                                            y={-7}
                                            width={84}
                                            height={14}
                                            rx={1}
                                            fill={light ? "#ffffff" : "#0b0e13"}
                                            fillOpacity={0.88}
                                        />
                                        <text
                                            textAnchor="middle"
                                            dy={3}
                                            fontSize={7.5}
                                            fontWeight={700}
                                            letterSpacing={1.8}
                                            fill="#fb923c"
                                            fontFamily={MONO}
                                        >
                                            SURFACES · 2
                                        </text>
                                    </g>
                                </g>
                            )}

                            {/* 2. 3D ORBIT WIREFRAME GLOBE & PULSE RING */}
                            <OrbitGlobeDeco
                                yaw={yawRef.current}
                                tilt={tiltRef.current}
                                light={light}
                                alpha={orbitAlpha}
                            />

                            {/* 3. CORE ORANGE NEBULA CLOUD */}
                            <CoreCloud motion={motionEnabled} radius={58} gradientId="orb-deck-core-glow" />

                            {/* 4. AMBIENT SATELLITE DOTS (Skills & Memory Particles) */}
                            <g pointerEvents="none">
                                {satellites.map((sat) => {
                                    const q = project(sat.orbitPos, yawRef.current, tiltRef.current, 680);
                                    const depth = Math.max(0, Math.min(1, (q.z + ORB_GLOBE_R) / (ORB_GLOBE_R * 2)));
                                    const x = lerp(sat.ringX, q.x, blend);
                                    const y = lerp(sat.ringY, q.y, blend);
                                    const op = lerp(0.55, 0.2 + 0.65 * depth, blend);
                                    return (
                                        <circle
                                            key={sat.id}
                                            cx={x}
                                            cy={y}
                                            r={sat.size * lerp(1, q.k, blend)}
                                            fill={sat.color}
                                            fillOpacity={op}
                                        />
                                    );
                                })}
                            </g>

                            {/* 5. RADIAL LINKS & MOTION PARTICLES FROM CORE TO PAGE NODES */}
                            <g fill="none">
                                {PAGE_NODES.map((node, i) => {
                                    const p = nodePositions.get(node.id);
                                    if (!p) return null;
                                    const isHovered = hoverId === node.id;
                                    const isCurrent = activePageId === node.id;
                                    const d = `M0,0 L${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                                    const strokeOp =
                                        (isHovered ? 0.9 : isCurrent ? 0.65 : 0.24) * p.o;
                                    return (
                                        <g key={`link-${node.id}`}>
                                            <path
                                                d={d}
                                                stroke={node.color}
                                                strokeOpacity={strokeOp}
                                                strokeWidth={isHovered || isCurrent ? 1.5 : 0.9}
                                                strokeDasharray={isHovered || isCurrent ? undefined : "3 4"}
                                                pointerEvents="none"
                                            />
                                            {motionEnabled && (isHovered || isCurrent || i % 2 === 0) && (
                                                <circle
                                                    r={isHovered ? 3 : 2.2}
                                                    fill={node.color}
                                                    opacity={p.o}
                                                    pointerEvents="none"
                                                >
                                                    <animateMotion
                                                        dur={`${1.3 + (i % 4) * 0.3}s`}
                                                        repeatCount="indefinite"
                                                        path={d}
                                                    />
                                                </circle>
                                            )}
                                        </g>
                                    );
                                })}
                            </g>

                            {/* 6. CENTER CORE NODE (Click to toggle Rings / 3D Orbit) */}
                            <g
                                className="cursor-pointer"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    switchMode(mode === "orbit" ? "rings" : "orbit");
                                }}
                            >
                                <rect
                                    x={-44}
                                    y={-11}
                                    width={88}
                                    height={22}
                                    rx={2}
                                    fill={light ? "#ffffff" : "#0b0e13"}
                                    fillOpacity={0.95}
                                    stroke="#fb923c"
                                    strokeOpacity={0.75}
                                    strokeWidth={1.1}
                                />
                                <text
                                    textAnchor="middle"
                                    dy={3.4}
                                    fontSize={8.5}
                                    fontWeight={800}
                                    letterSpacing={1.5}
                                    fill={light ? "#0f172a" : "#f8fafc"}
                                    fontFamily={MONO}
                                >
                                    NUSANTARASOFT
                                </text>
                            </g>

                            {/* 7. ORBITING PAGE NAVIGATION NODES (Click to navigate to page) */}
                            {sortedPageNodes.map((node) => {
                                const p = nodePositions.get(node.id);
                                if (!p) return null;
                                const Icon = node.icon;
                                const isHovered = hoverId === node.id;
                                const isCurrent = activePageId === node.id;
                                const scale = p.s * (isHovered ? 1.16 : 1);

                                return (
                                    <g
                                        key={node.id}
                                        data-testid={`orb-node-${node.id}`}
                                        transform={`translate(${p.x} ${p.y})`}
                                        opacity={p.o}
                                        className="cursor-pointer"
                                        onPointerEnter={() => setHoverId(node.id)}
                                        onPointerLeave={() => setHoverId((h) => (h === node.id ? null : h))}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNavigate(node.href);
                                        }}
                                    >
                                        <g transform={`scale(${scale})`}>
                                            {/* Pulse ring on active or hovered page node */}
                                            {(isCurrent || isHovered) && (
                                                <circle
                                                    r={19}
                                                    fill="none"
                                                    stroke={node.color}
                                                    strokeWidth={1.3}
                                                    strokeDasharray={isCurrent ? "3 2" : undefined}
                                                    strokeOpacity={0.85}
                                                />
                                            )}
                                            {motionEnabled && isCurrent && (
                                                <circle
                                                    r={16}
                                                    fill="none"
                                                    stroke={node.color}
                                                    strokeWidth={1.3}
                                                    className="animate-ping"
                                                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                                                />
                                            )}

                                            {/* Node circular housing */}
                                            <circle
                                                r={14}
                                                fill={light ? "#ffffff" : "#0b0e13"}
                                                stroke={node.color}
                                                strokeWidth={isHovered || isCurrent ? 2 : 1.4}
                                            />
                                            <circle
                                                r={11.5}
                                                fill={node.color}
                                                fillOpacity={isHovered ? 0.25 : isCurrent ? 0.18 : 0.1}
                                            />
                                            <Icon
                                                x={-6.5}
                                                y={-6.5}
                                                width={13}
                                                height={13}
                                                color={node.color}
                                                strokeWidth={2}
                                            />
                                        </g>

                                        {/* Crisp Monospace Node Label Pill */}
                                        <g transform={`translate(0 ${(24 * scale).toFixed(1)})`} pointerEvents="none">
                                            <rect
                                                x={-(node.shortLabel.length * 3.4 + 10)}
                                                y={-7.5}
                                                width={node.shortLabel.length * 6.8 + 20}
                                                height={14}
                                                rx={1.5}
                                                fill={light ? "#ffffff" : "#0b0e13"}
                                                fillOpacity={0.92}
                                                stroke={isHovered || isCurrent ? node.color : light ? "rgba(15,23,42,0.18)" : "rgba(255,255,255,0.14)"}
                                                strokeWidth={0.8}
                                            />
                                            <text
                                                textAnchor="middle"
                                                dy={2.8}
                                                fontSize={8}
                                                fontWeight={700}
                                                letterSpacing={1.1}
                                                fill={isHovered || isCurrent ? node.color : light ? "#0f172a" : "#e2e8f0"}
                                                fontFamily={MONO}
                                            >
                                                {node.shortLabel}
                                            </text>
                                        </g>
                                    </g>
                                );
                            })}
                        </svg>

                        {/* Corner Mode Hint Overlay */}
                        <div
                            style={{
                                position: "absolute",
                                left: 8,
                                bottom: 6,
                                fontSize: 8.5,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                color: vo.textDim,
                                pointerEvents: "none",
                            }}
                        >
                            {mode === "orbit"
                                ? "DRAG GLOBE TO ROTATE 3D · CLICK NODE TO LAUNCH"
                                : "CLICK CORE FOR 3D ORBIT · CLICK NODE TO LAUNCH"}
                        </div>
                    </div>

                    {/* Active / Hovered Node Telemetry Readout Bar */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            padding: "6px 10px",
                            borderTop: `1px solid ${vo.border}`,
                            borderBottom: `1px solid ${vo.border}`,
                            background: light ? "rgba(241, 245, 249, 0.7)" : "rgba(15, 23, 42, 0.55)",
                        }}
                    >
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span
                                    style={{
                                        fontSize: 9,
                                        fontWeight: 800,
                                        padding: "1px 4px",
                                        border: `1px solid ${hoveredNode.color}88`,
                                        background: `${hoveredNode.color}18`,
                                        color: hoveredNode.color,
                                    }}
                                >
                                    [{hoveredNode.code}]
                                </span>
                                <span
                                    style={{
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        color: vo.text,
                                        letterSpacing: "0.06em",
                                    }}
                                >
                                    {hoveredNode.label}
                                </span>
                                {activePageId === hoveredNode.id && (
                                    <span
                                        style={{
                                            fontSize: 8.5,
                                            fontWeight: 700,
                                            color: "#10b981",
                                            letterSpacing: "0.12em",
                                        }}
                                    >
                                        · ACTIVE
                                    </span>
                                )}
                            </div>
                            <div
                                className="truncate"
                                style={{
                                    fontSize: 9.5,
                                    color: vo.textMuted,
                                    marginTop: 1,
                                }}
                            >
                                {hoveredNode.sub}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleNavigate(hoveredNode.href)}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "4px 8px",
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: "0.14em",
                                textTransform: "uppercase",
                                border: `1px solid ${hoveredNode.color}`,
                                background: `${hoveredNode.color}22`,
                                color: vo.text,
                                cursor: "pointer",
                                flexShrink: 0,
                            }}
                        >
                            <span>Open</span>
                            <ExternalLink className="h-2.5 w-2.5" style={{ color: hoveredNode.color }} />
                        </button>
                    </div>

                    {/* Direct Tactical Page Matrix (7 Key Destinations) */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                            gap: 4,
                            padding: 8,
                            background: light ? "#ffffff" : "#0b0e13",
                        }}
                    >
                        {PAGE_NODES.map((node) => {
                            const Icon = node.icon;
                            const isCurrent = activePageId === node.id;
                            const isHovered = hoverId === node.id;
                            return (
                                <button
                                    key={node.id}
                                    type="button"
                                    data-testid={`orb-quick-${node.id}`}
                                    onMouseEnter={() => setHoverId(node.id)}
                                    onMouseLeave={() => setHoverId((h) => (h === node.id ? null : h))}
                                    onClick={() => handleNavigate(node.href)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 5,
                                        padding: "5px 6px",
                                        border: `1px solid ${
                                            isHovered || isCurrent ? `${node.color}99` : vo.border
                                        }`,
                                        borderLeft: `2px solid ${node.color}`,
                                        background:
                                            isHovered || isCurrent
                                                ? `${node.color}18`
                                                : light
                                                  ? "rgba(15, 23, 42, 0.02)"
                                                  : "rgba(255, 255, 255, 0.02)",
                                        color: vo.text,
                                        cursor: "pointer",
                                        textAlign: "left",
                                        minWidth: 0,
                                        transition: "all 0.12s ease",
                                    }}
                                >
                                    <Icon
                                        className="h-3 w-3 shrink-0"
                                        style={{ color: node.color }}
                                    />
                                    <span
                                        className="truncate"
                                        style={{
                                            fontSize: 9,
                                            fontWeight: 700,
                                            letterSpacing: "0.06em",
                                        }}
                                    >
                                        {node.shortLabel}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ===================================================================== */}
            {/* FLOATING RING & 3D ORBIT TRIGGER BUTTON (BOTTOM-RIGHT)                */}
            {/* ===================================================================== */}
            <button
                type="button"
                data-testid="floating-orb-trigger"
                aria-label="Open Orbital Ring and 3D Orbit Navigator"
                title="Orbital Navigator — Rings & 3D Orbit"
                onClick={() => setIsOpen((o) => !o)}
                style={{
                    position: "relative",
                    width: 58,
                    height: 58,
                    padding: 0,
                    border: `1px solid ${isOpen ? "#fb923c" : "rgba(251, 146, 60, 0.55)"}`,
                    borderTop: "2px solid #fb923c",
                    background: light ? "rgba(255, 255, 255, 0.95)" : "rgba(11, 14, 19, 0.94)",
                    boxShadow: isOpen
                        ? "0 0 24px rgba(251, 146, 60, 0.45), 0 12px 28px rgba(0, 0, 0, 0.65)"
                        : "0 10px 26px rgba(0, 0, 0, 0.55), 0 0 14px rgba(251, 146, 60, 0.2)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    transition: "all 0.15s ease",
                }}
            >
                <svg viewBox="-34 -34 68 68" className="h-11 w-11 pointer-events-none">
                    <defs>
                        <radialGradient id="orb-trigger-glow">
                            <stop offset="0%" stopColor="#f97316" stopOpacity="0.55" />
                            <stop offset="65%" stopColor="#ea580c" stopOpacity="0.16" />
                            <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                    <circle r={28} fill="url(#orb-trigger-glow)" />

                    {/* Outer rotating tick ring */}
                    <g opacity={0.75}>
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0"
                            to="360"
                            dur="28s"
                            repeatCount="indefinite"
                        />
                        <circle
                            r={24}
                            fill="none"
                            stroke="#38bdf8"
                            strokeOpacity={0.55}
                            strokeWidth={1}
                            strokeDasharray="6 3"
                        />
                        {PAGE_NODES.map((n, i) => {
                            const a = (i / PAGE_NODES.length) * TAU;
                            return (
                                <circle
                                    key={n.id}
                                    cx={Math.cos(a) * 24}
                                    cy={Math.sin(a) * 24}
                                    r={2.1}
                                    fill={n.color}
                                />
                            );
                        })}
                    </g>

                    {/* 3D tilted orbital ellipses */}
                    <g opacity={0.85}>
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="360"
                            to="0"
                            dur="18s"
                            repeatCount="indefinite"
                        />
                        <ellipse
                            rx={18}
                            ry={7.5}
                            transform="rotate(-28)"
                            fill="none"
                            stroke="#fb923c"
                            strokeWidth={1.1}
                            strokeOpacity={0.85}
                        />
                        <ellipse
                            rx={18}
                            ry={7.5}
                            transform="rotate(52)"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth={0.9}
                            strokeOpacity={0.55}
                        />
                    </g>

                    {/* Core glowing nucleus */}
                    <circle r={5.5} fill="#0b0e13" stroke="#fb923c" strokeWidth={1.4} />
                    <circle r={2.6} fill="#fb923c" />
                </svg>

                <span
                    style={{
                        fontSize: 7.5,
                        fontWeight: 800,
                        letterSpacing: "0.16em",
                        color: isOpen ? "#fb923c" : vo.text,
                        lineHeight: 1,
                        marginTop: -2,
                    }}
                >
                    {isOpen ? "CLOSE" : "ORBIT"}
                </span>
            </button>
        </div>
    );
}
