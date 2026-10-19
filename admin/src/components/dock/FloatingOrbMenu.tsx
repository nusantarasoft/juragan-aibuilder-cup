"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen,
    Box,
    Handshake,
    Megaphone,
    MessageSquare,
    SlidersHorizontal,
    Sparkles,
    type LucideIcon,
} from "lucide-react";
import { hash01, project, type Pt3 } from "../agentic-os/lib/deckGraph";

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const TAU = Math.PI * 2;
const SPIN = 0.00026;
const TWEEN_MS = 650;
const CLOUD_COLORS = ["#fb923c", "#f97316", "#fdba74", "#ea580c", "#fed7aa"];

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type OrbViewMode = "rings" | "orbit";

export interface OrbPageNode {
    id: string;
    code: string;
    label: string;
    shortLabel: string;
    href: string;
    color: string;
    icon: LucideIcon;
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

// Restored 216x216 Ring & 3D Orbit radii
const RING_MAIN_R = 80;
const ORB_GLOBE_R = 72;
const ORB_APP_RING_R = 88;
const ORB_PULSE_R = 58;
const ORB_PULSE_Y = -22;

const PAGE_NODES: OrbPageNode[] = [
    {
        id: "ai-studio",
        code: "ST",
        label: "AI Studio",
        shortLabel: "STUDIO",
        href: "/admin/ai-studio",
        color: "#fb923c",
        icon: Sparkles,
        angleDeg: -90,
        orbitPos: {
            x: ORB_APP_RING_R * Math.cos(0),
            y: -16,
            z: ORB_APP_RING_R * Math.sin(0),
        },
    },
    {
        id: "partner",
        code: "PT",
        label: "Partner",
        shortLabel: "PARTNER",
        href: "/admin/ai-studio/partner",
        color: "#10b981",
        icon: Handshake,
        angleDeg: -90 + 360 / 7,
        orbitPos: {
            x: ORB_APP_RING_R * Math.cos((TAU * 1) / 7),
            y: 18,
            z: ORB_APP_RING_R * Math.sin((TAU * 1) / 7),
        },
    },
    {
        id: "knowledge-research",
        code: "KR",
        label: "Knowledge Research",
        shortLabel: "RESEARCH",
        href: "/admin/ai-studio/knowledge-research",
        color: "#38bdf8",
        icon: BookOpen,
        angleDeg: -90 + (360 * 2) / 7,
        orbitPos: {
            x: ORB_APP_RING_R * Math.cos((TAU * 2) / 7),
            y: -22,
            z: ORB_APP_RING_R * Math.sin((TAU * 2) / 7),
        },
    },
    {
        id: "showcase",
        code: "SH",
        label: "Showcase",
        shortLabel: "SHOWCASE",
        href: "/admin/ai-studio/showcase",
        color: "#f43f5e",
        icon: Megaphone,
        angleDeg: -90 + (360 * 3) / 7,
        orbitPos: {
            x: ORB_APP_RING_R * Math.cos((TAU * 3) / 7),
            y: 20,
            z: ORB_APP_RING_R * Math.sin((TAU * 3) / 7),
        },
    },
    {
        id: "messages",
        code: "MG",
        label: "Messages",
        shortLabel: "MESSAGES",
        href: "/admin/ai-studio/messages",
        color: "#a855f7",
        icon: MessageSquare,
        angleDeg: -90 + (360 * 4) / 7,
        orbitPos: {
            x: ORB_APP_RING_R * Math.cos((TAU * 4) / 7),
            y: -18,
            z: ORB_APP_RING_R * Math.sin((TAU * 4) / 7),
        },
    },
    {
        id: "settings",
        code: "CF",
        label: "Settings",
        shortLabel: "SETTINGS",
        href: "/admin/ai-studio/settings",
        color: "#f59e0b",
        icon: SlidersHorizontal,
        angleDeg: -90 + (360 * 5) / 7,
        orbitPos: {
            x: ORB_APP_RING_R * Math.cos((TAU * 5) / 7),
            y: 22,
            z: ORB_APP_RING_R * Math.sin((TAU * 5) / 7),
        },
    },
    {
        id: "virtual-office",
        code: "VO",
        label: "Virtual Office",
        shortLabel: "3D HQ",
        href: "/admin/virtual-office",
        color: "#22d3ee",
        icon: Box,
        angleDeg: -90 + (360 * 6) / 7,
        orbitPos: {
            x: ORB_APP_RING_R * Math.cos((TAU * 6) / 7),
            y: -14,
            z: ORB_APP_RING_R * Math.sin((TAU * 6) / 7),
        },
    },
];

/** Deterministic orange particle nebula around the core (from Agentic OS DeckGraph). */
const CoreCloud = React.memo(function CoreCloud({
    radius = 34,
    gradientId,
}: {
    radius?: number;
    gradientId: string;
}) {
    const layers = useMemo(
        () =>
            [0, 1, 2].map((layer) =>
                Array.from({ length: 42 }, (_, i) => {
                    const key = `orb-mini-c${layer}:${i}`;
                    const a = hash01(key, 1) * TAU;
                    const r = radius * Math.pow(hash01(key, 2), 0.75) * (0.35 + (0.65 * (layer + 1)) / 3);
                    return {
                        x: Math.cos(a) * r,
                        y: Math.sin(a) * r,
                        s: 0.45 + hash01(key, 3) * 0.85,
                        o: 0.3 + hash01(key, 4) * 0.48,
                        c: CLOUD_COLORS[Math.floor(hash01(key, 5) * CLOUD_COLORS.length)],
                    };
                }),
            ),
        [radius],
    );
    return (
        <g pointerEvents="none">
            <circle r={radius * 1.45} fill={`url(#${gradientId})`} />
            {layers.map((pts, li) => (
                <g key={li}>
                    <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0"
                        to={li % 2 ? "-360" : "360"}
                        dur={`${45 + li * 25}s`}
                        repeatCount="indefinite"
                    />
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
    light,
}: {
    r: number;
    index: number;
    light: boolean;
}) {
    return (
        <g pointerEvents="none" opacity={light ? 0.48 : 0.4}>
            <animateTransform
                attributeName="transform"
                type="rotate"
                from="0"
                to={index % 2 ? "360" : "-360"}
                dur={`${160 + index * 35}s`}
                repeatCount="indefinite"
            />
            {Array.from({ length: 72 }, (_, t) => {
                const a = (t / 72) * TAU;
                const r2 = r + (t % 6 === 0 ? 4.5 : 2);
                return (
                    <line
                        key={t}
                        x1={Math.cos(a) * r}
                        y1={Math.sin(a) * r}
                        x2={Math.cos(a) * r2}
                        y2={Math.sin(a) * r2}
                        stroke={light ? "#475569" : "#94a3b8"}
                        strokeWidth={0.75}
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
                const q = project(p, yaw, tilt, 420);
                return `${i ? "L" : "M"}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
            })
            .join("");
    const ring = (fn: (a: number) => Pt3, n = 56) =>
        path(Array.from({ length: n + 1 }, (_, i) => fn((i / n) * TAU)));

    const meridians = Array.from({ length: 6 }, (_, m) => {
        const phi = (m * Math.PI) / 6;
        return ring((a) => ({
            x: G * Math.cos(a) * Math.cos(phi),
            y: G * Math.sin(a),
            z: G * Math.cos(a) * Math.sin(phi),
        }));
    });
    const parallels = [-0.9, -0.45, 0, 0.45, 0.9].map((lat) => {
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
                    strokeOpacity={light ? 0.24 : 0.16}
                    strokeWidth={0.75}
                />
            ))}
            {parallels.map((d, i) => (
                <path
                    key={`p${i}`}
                    d={d}
                    stroke={light ? "#334155" : "#94a3b8"}
                    strokeOpacity={i === 2 ? (light ? 0.34 : 0.24) : light ? 0.18 : 0.12}
                    strokeWidth={0.75}
                />
            ))}
            <path
                d={ring((a) => ({ x: ORB_APP_RING_R * Math.cos(a), y: 0, z: ORB_APP_RING_R * Math.sin(a) }), 72)}
                stroke={light ? "#475569" : "#cbd5e1"}
                strokeOpacity={light ? 0.55 : 0.42}
                strokeWidth={1}
                strokeDasharray="4 3"
            />
            <path
                d={ring((a) => ({ x: ORB_PULSE_R * Math.cos(a), y: ORB_PULSE_Y, z: ORB_PULSE_R * Math.sin(a) }))}
                stroke="#fb923c"
                strokeOpacity={light ? 0.6 : 0.5}
                strokeWidth={0.95}
            />
        </g>
    );
}

export default function FloatingOrbMenu({ darkMode = true }: { darkMode?: boolean }) {
    const router = useRouter();
    const pathname = usePathname() || "/admin/ai-studio";
    const light = !darkMode;

    // Visibility state toggled by the bottom-right interactive corner reactor button
    const [isVisible, setIsVisible] = useState(true);
    const [toggleHovered, setToggleHovered] = useState(false);

    // Default shape is "rings"; clicking the center toggles to "orbit" (3D Orbit)
    const [mode, setMode] = useState<OrbViewMode>("rings");
    const [hoverId, setHoverId] = useState<string | null>(null);
    const [coreHovered, setCoreHovered] = useState(false);
    const [, setFrameTick] = useState(0);

    // 3D Orbit angle state
    const yawRef = useRef(0.55);
    const tiltRef = useRef(0.38);
    const modeRef = useRef<OrbViewMode>(mode);
    modeRef.current = mode;
    const isVisibleRef = useRef(isVisible);
    isVisibleRef.current = isVisible;

    // Tween blend: 0 = RINGS (default), 1 = 3D ORBIT
    const blendRef = useRef(0);
    const tweenRef = useRef<{ from: number; to: number; t0: number } | null>(null);
    const dragRef = useRef<{ cx: number; cy: number; moved: boolean } | null>(null);
    const rafRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    // Ambient satellite dots (memory/skill particles in both Rings and 3D Orbit)
    const satellites = useMemo<SatelliteDot[]>(() => {
        const palette = ["#fb923c", "#38bdf8", "#10b981", "#a855f7", "#f59e0b", "#22d3ee"];
        return Array.from({ length: 22 }, (_, i) => {
            const key = `sat-mini:${i}`;
            const ringR = i < 12 ? 42 + hash01(key, 1) * 14 : 92 + hash01(key, 2) * 12;
            const ang = (i / 22) * TAU + hash01(key, 3) * 0.35;
            const u = 1 - (2 * (i + 0.5)) / 22;
            const rr = Math.sqrt(Math.max(0, 1 - u * u));
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;
            const sphereR = ORB_GLOBE_R * (0.75 + hash01(key, 4) * 0.24);
            return {
                id: key,
                color: palette[i % palette.length],
                size: 1.3 + hash01(key, 5) * 1.1,
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

    // Highlight current active page
    const activePageId = useMemo(() => {
        const normalized = pathname.replace(/\/$/, "");
        const exact = PAGE_NODES.find((n) => n.href !== "/admin/ai-studio" && normalized.startsWith(n.href));
        if (exact) return exact.id;
        return "ai-studio";
    }, [pathname]);

    const stepLoop = useCallback((now: number) => {
        rafRef.current = 0;
        if (!isVisibleRef.current) return;

        const dt = lastTimeRef.current ? now - lastTimeRef.current : 16;
        lastTimeRef.current = now;

        const tw = tweenRef.current;
        if (tw) {
            const p = Math.min(1, (now - tw.t0) / TWEEN_MS);
            blendRef.current = lerp(tw.from, tw.to, easeInOutCubic(p));
            if (p >= 1) tweenRef.current = null;
        }

        const spinning =
            isVisibleRef.current &&
            (modeRef.current === "orbit" || blendRef.current > 0.01) &&
            !dragRef.current;

        if (spinning) {
            yawRef.current += dt * SPIN;
        }

        setFrameTick((n) => (n + 1) % 1_000_000);

        if (isVisibleRef.current && (tweenRef.current || spinning)) {
            rafRef.current = requestAnimationFrame(stepLoop);
        }
    }, []);

    const kickLoop = useCallback(() => {
        if (!rafRef.current && isVisibleRef.current) {
            lastTimeRef.current = 0;
            rafRef.current = requestAnimationFrame(stepLoop);
        }
    }, [stepLoop]);

    useEffect(() => {
        if (isVisible && (mode === "orbit" || blendRef.current > 0.01)) {
            kickLoop();
        }
        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = 0;
            }
        };
    }, [isVisible, mode, kickLoop]);

    // Toggle between default Ring ("rings") and 3D Orbit ("orbit") when center is clicked
    const toggleCenterMode = useCallback(() => {
        const nextMode: OrbViewMode = modeRef.current === "rings" ? "orbit" : "rings";
        setMode(nextMode);
        modeRef.current = nextMode;
        tweenRef.current = {
            from: blendRef.current,
            to: nextMode === "orbit" ? 1 : 0,
            t0: performance.now(),
        };
        kickLoop();
    }, [kickLoop]);

    // Pointer drag rotation when in 3D Orbit mode
    const onGlobePointerDown = (e: React.PointerEvent<SVGCircleElement>) => {
        if (e.button !== 0 || modeRef.current !== "orbit") return;
        e.stopPropagation();
        dragRef.current = { cx: e.clientX, cy: e.clientY, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onGlobePointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = e.clientX - d.cx;
        const dy = e.clientY - d.cy;
        if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true;
        if (!d.moved) return;

        yawRef.current += dx * 0.0085;
        tiltRef.current = Math.max(-0.3, Math.min(1.05, tiltRef.current + dy * 0.0065));
        d.cx = e.clientX;
        d.cy = e.clientY;
        setFrameTick((n) => (n + 1) % 1_000_000);
    };

    const onGlobePointerUp = () => {
        if (!dragRef.current) return;
        dragRef.current = null;
        kickLoop();
    };

    const blend = blendRef.current;
    const ringsAlpha = 1 - blend;
    const orbitAlpha = blend;

    const nodePositions = useMemo(() => {
        const map = new Map<string, AnimNodeState>();
        for (const node of PAGE_NODES) {
            const rad = (node.angleDeg * Math.PI) / 180;
            const rx = Math.cos(rad) * RING_MAIN_R;
            const ry = Math.sin(rad) * RING_MAIN_R;

            const q = project(node.orbitPos, yawRef.current, tiltRef.current, 420);
            const depth = Math.max(0, Math.min(1, (q.z + ORB_APP_RING_R * 1.1) / (ORB_APP_RING_R * 2.2)));
            const orbitScale = q.k;
            const orbitOpacity = 0.42 + 0.58 * depth;

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
    }, [blend, yawRef.current, tiltRef.current]);

    // Sort nodes back-to-front in 3D Orbit
    const sortedPageNodes = useMemo(() => {
        return [...PAGE_NODES].sort((a, b) => {
            const za = nodePositions.get(a.id)?.z ?? 0;
            const zb = nodePositions.get(b.id)?.z ?? 0;
            return za - zb;
        });
    }, [nodePositions]);

    const hoveredNode = useMemo(
        () => (hoverId ? PAGE_NODES.find((n) => n.id === hoverId) ?? null : null),
        [hoverId],
    );

    const isFocused = Boolean(hoverId || coreHovered || mode === "orbit");
    const accentColor = mode === "orbit" ? "#38bdf8" : "#fb923c";

    return (
        <div
            data-testid="floating-orb-navigator"
            className="font-mono select-none"
            style={{
                position: "fixed",
                bottom: 6,
                right: 6,
                zIndex: 9998,
                fontFamily: MONO,
                pointerEvents: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
            }}
        >
            {/* ===================================================================== */}
            {/* TRANSPARENT 216x216 RING / 3D ORBIT NAVIGATOR                         */}
            {/* ===================================================================== */}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        key="orb-ring-canvas"
                        initial={{ opacity: 0, scale: 0.35, rotate: -35, y: 40, x: 40 }}
                        animate={{
                            opacity: isFocused ? 0.98 : 0.8,
                            scale: 1,
                            rotate: 0,
                            y: 0,
                            x: 0,
                        }}
                        exit={{ opacity: 0, scale: 0.25, rotate: 35, y: 55, x: 55 }}
                        transition={{ type: "spring", stiffness: 290, damping: 24 }}
                        style={{
                            position: "relative",
                            width: 216,
                            height: 216,
                            marginBottom: 4,
                            marginRight: 4,
                            background: "transparent",
                            pointerEvents: "none",
                            transformOrigin: "bottom right",
                        }}
                    >
                        {/* Floating micro-pill tooltip above the ring when a node or center is hovered */}
                        {(hoveredNode || coreHovered) && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: -22,
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    whiteSpace: "nowrap",
                                    padding: "2px 7px",
                                    fontSize: 8.5,
                                    fontWeight: 700,
                                    letterSpacing: "0.14em",
                                    textTransform: "uppercase",
                                    background: light ? "rgba(255, 255, 255, 0.88)" : "rgba(11, 14, 19, 0.86)",
                                    border: `1px solid ${
                                        hoveredNode
                                            ? `${hoveredNode.color}99`
                                            : mode === "orbit"
                                              ? "rgba(56, 189, 248, 0.65)"
                                              : "rgba(251, 146, 60, 0.65)"
                                    }`,
                                    color: hoveredNode
                                        ? hoveredNode.color
                                        : light
                                          ? "#0f172a"
                                          : "#f8fafc",
                                    backdropFilter: "blur(6px)",
                                    pointerEvents: "none",
                                    zIndex: 20,
                                }}
                            >
                                {hoveredNode
                                    ? `[${hoveredNode.code}] ${hoveredNode.label}`
                                    : mode === "rings"
                                      ? "CLICK CENTER → 3D ORBIT"
                                      : "CLICK CENTER → RINGS"}
                            </div>
                        )}

                        <svg
                            viewBox="-115 -115 230 230"
                            className="h-full w-full overflow-visible select-none"
                            style={{
                                background: "transparent",
                                pointerEvents: "none",
                            }}
                        >
                            <defs>
                                <radialGradient id="orb-transparent-core-glow">
                                    <stop offset="0%" stopColor="#f97316" stopOpacity={light ? "0.22" : "0.28"} />
                                    <stop offset="55%" stopColor="#c2410c" stopOpacity={light ? "0.06" : "0.09"} />
                                    <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
                                </radialGradient>
                            </defs>

                            {/* Invisible drag capture disc ONLY active in 3D Orbit mode for rotating the globe */}
                            {mode === "orbit" && (
                                <circle
                                    r={ORB_APP_RING_R + 12}
                                    fill="transparent"
                                    className="cursor-move"
                                    style={{ pointerEvents: "auto" }}
                                    onPointerDown={onGlobePointerDown}
                                    onPointerMove={onGlobePointerMove}
                                    onPointerUp={onGlobePointerUp}
                                />
                            )}

                            {/* 1. DEFAULT RINGS DECORATION (Concentric HUD rings + rotating ticks) */}
                            {ringsAlpha > 0.02 && (
                                <g opacity={ringsAlpha} pointerEvents="none">
                                    {[
                                        { r: 42, strong: false, dash: true },
                                        { r: RING_MAIN_R, strong: true, dash: false },
                                        { r: 100, strong: false, dash: true },
                                    ].map((g, i) => (
                                        <g key={i}>
                                            <circle
                                                r={g.r}
                                                fill="none"
                                                stroke={
                                                    g.strong
                                                        ? light
                                                            ? "rgba(15, 23, 42, 0.28)"
                                                            : "rgba(148, 163, 184, 0.28)"
                                                        : light
                                                          ? "rgba(15, 23, 42, 0.14)"
                                                          : "rgba(148, 163, 184, 0.14)"
                                                }
                                                strokeWidth={g.strong ? 1.1 : 0.8}
                                                strokeDasharray={g.dash ? "2.5 5" : undefined}
                                            >
                                                {g.dash && (
                                                    <animateTransform
                                                        attributeName="transform"
                                                        type="rotate"
                                                        from="0"
                                                        to={i % 2 ? "-360" : "360"}
                                                        dur={`${120 + i * 35}s`}
                                                        repeatCount="indefinite"
                                                    />
                                                )}
                                            </circle>
                                            {g.strong && <RingTicks r={g.r} index={i} light={light} />}
                                        </g>
                                    ))}

                                    {/* Outer segmented tactical bezel arc */}
                                    <circle
                                        r={107}
                                        fill="none"
                                        stroke={light ? "rgba(15, 23, 42, 0.16)" : "rgba(148, 163, 184, 0.15)"}
                                        strokeWidth={2}
                                        strokeDasharray="34 10 3 10"
                                    >
                                        <animateTransform
                                            attributeName="transform"
                                            type="rotate"
                                            from="0"
                                            to="360"
                                            dur="210s"
                                            repeatCount="indefinite"
                                        />
                                    </circle>
                                </g>
                            )}

                            {/* 2. 3D ORBIT WIREFRAME GLOBE & PULSE RING (Appears when center is clicked) */}
                            <OrbitGlobeDeco
                                yaw={yawRef.current}
                                tilt={tiltRef.current}
                                light={light}
                                alpha={orbitAlpha}
                            />

                            {/* 3. CORE ORANGE NEBULA CLOUD */}
                            <CoreCloud radius={34} gradientId="orb-transparent-core-glow" />

                            {/* 4. AMBIENT SATELLITE DOTS (Skills & Memory Particles) */}
                            <g pointerEvents="none">
                                {satellites.map((sat) => {
                                    const q = project(sat.orbitPos, yawRef.current, tiltRef.current, 420);
                                    const depth = Math.max(0, Math.min(1, (q.z + ORB_GLOBE_R) / (ORB_GLOBE_R * 2)));
                                    const x = lerp(sat.ringX, q.x, blend);
                                    const y = lerp(sat.ringY, q.y, blend);
                                    const op = lerp(0.5, 0.18 + 0.62 * depth, blend);
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

                            {/* 5. RADIAL LINKS & MOTION PARTICLES FROM CENTER CORE TO PAGE NODES */}
                            <g fill="none" pointerEvents="none">
                                {PAGE_NODES.map((node, i) => {
                                    const p = nodePositions.get(node.id);
                                    if (!p) return null;
                                    const isHovered = hoverId === node.id;
                                    const isCurrent = activePageId === node.id;
                                    const d = `M0,0 L${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                                    const strokeOp = (isHovered ? 0.88 : isCurrent ? 0.6 : 0.22) * p.o;
                                    return (
                                        <g key={`link-${node.id}`}>
                                            <path
                                                d={d}
                                                stroke={node.color}
                                                strokeOpacity={strokeOp}
                                                strokeWidth={isHovered || isCurrent ? 1.25 : 0.75}
                                                strokeDasharray={isHovered || isCurrent ? undefined : "2.5 3.5"}
                                            />
                                            {(isHovered || isCurrent || i % 2 === 0) && (
                                                <circle
                                                    r={isHovered ? 2.3 : 1.7}
                                                    fill={node.color}
                                                    opacity={p.o * 0.9}
                                                >
                                                    <animateMotion
                                                        dur={`${1.4 + (i % 4) * 0.28}s`}
                                                        repeatCount="indefinite"
                                                        path={d}
                                                    />
                                                </circle>
                                            )}
                                        </g>
                                    );
                                })}
                            </g>

                            {/* 6. ORBITING PAGE NAVIGATION BUTTONS */}
                            {sortedPageNodes.map((node) => {
                                const p = nodePositions.get(node.id);
                                if (!p) return null;
                                const Icon = node.icon;
                                const isHovered = hoverId === node.id;
                                const isCurrent = activePageId === node.id;
                                const scale = p.s * (isHovered ? 1.18 : 1);

                                return (
                                    <g
                                        key={node.id}
                                        data-testid={`orb-node-${node.id}`}
                                        transform={`translate(${p.x} ${p.y})`}
                                        opacity={p.o}
                                        className="cursor-pointer"
                                        style={{ pointerEvents: "auto" }}
                                        onPointerEnter={() => setHoverId(node.id)}
                                        onPointerLeave={() => setHoverId((h) => (h === node.id ? null : h))}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(node.href);
                                        }}
                                    >
                                        <g transform={`scale(${scale})`}>
                                            {(isCurrent || isHovered) && (
                                                <circle
                                                    r={14.5}
                                                    fill="none"
                                                    stroke={node.color}
                                                    strokeWidth={1.1}
                                                    strokeDasharray={isCurrent ? "2.5 2" : undefined}
                                                    strokeOpacity={0.9}
                                                />
                                            )}
                                            {isCurrent && (
                                                <circle
                                                    r={12.5}
                                                    fill="none"
                                                    stroke={node.color}
                                                    strokeWidth={1.1}
                                                    className="animate-ping"
                                                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                                                />
                                            )}

                                            {/* Semi-transparent node button disc */}
                                            <circle
                                                r={11}
                                                fill={light ? "rgba(255, 255, 255, 0.78)" : "rgba(11, 14, 19, 0.74)"}
                                                stroke={node.color}
                                                strokeWidth={isHovered || isCurrent ? 1.6 : 1.15}
                                            />
                                            <circle
                                                r={9}
                                                fill={node.color}
                                                fillOpacity={isHovered ? 0.28 : isCurrent ? 0.18 : 0.08}
                                            />
                                            <Icon
                                                x={-5}
                                                y={-5}
                                                width={10}
                                                height={10}
                                                color={node.color}
                                                strokeWidth={2}
                                            />
                                        </g>

                                        {/* Micro label below each node */}
                                        <text
                                            y={17.5 * scale}
                                            textAnchor="middle"
                                            fontSize={6.8}
                                            fontWeight={700}
                                            letterSpacing={0.8}
                                            fill={isHovered || isCurrent ? node.color : light ? "#1e293b" : "#cbd5e1"}
                                            fontFamily={MONO}
                                            pointerEvents="none"
                                            style={{ paintOrder: "stroke" }}
                                            stroke={light ? "rgba(248, 250, 252, 0.85)" : "rgba(5, 8, 22, 0.85)"}
                                            strokeWidth={2.2}
                                        >
                                            {node.shortLabel}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* 7. CENTER CORE BUTTON (Restored RING/CORE & 3D/ORBIT badge — click to morph) */}
                            <g
                                data-testid="floating-orb-trigger"
                                className="cursor-pointer"
                                style={{ pointerEvents: "auto" }}
                                onPointerEnter={() => setCoreHovered(true)}
                                onPointerLeave={() => setCoreHovered(false)}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCenterMode();
                                }}
                            >
                                <circle
                                    r={22}
                                    fill="none"
                                    stroke={accentColor}
                                    strokeWidth={coreHovered ? 1.4 : 0.9}
                                    strokeDasharray="4 2.5"
                                    strokeOpacity={coreHovered ? 0.95 : 0.65}
                                />
                                <circle
                                    r={18.5}
                                    fill={light ? "rgba(255, 255, 255, 0.82)" : "rgba(11, 14, 19, 0.78)"}
                                    stroke={accentColor}
                                    strokeWidth={1.3}
                                />
                                <text
                                    textAnchor="middle"
                                    y={-1.5}
                                    fontSize={6.5}
                                    fontWeight={800}
                                    letterSpacing={1.1}
                                    fill={accentColor}
                                    fontFamily={MONO}
                                >
                                    {mode === "orbit" ? "3D" : "RING"}
                                </text>
                                <text
                                    textAnchor="middle"
                                    y={6}
                                    fontSize={5.5}
                                    fontWeight={700}
                                    letterSpacing={0.9}
                                    fill={light ? "#334155" : "#94a3b8"}
                                    fontFamily={MONO}
                                >
                                    {mode === "orbit" ? "ORBIT" : "CORE"}
                                </text>
                            </g>
                        </svg>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===================================================================== */}
            {/* UNIQUE INTERACTIVE GYRO-IRIS HIDE/SHOW BUTTON (VERY BOTTOM RIGHT)     */}
            {/* ===================================================================== */}
            <motion.button
                type="button"
                data-testid="floating-orb-visibility-toggle"
                aria-label={isVisible ? "Hide Orbital Navigator" : "Show Orbital Navigator"}
                title={isVisible ? "Collapse Orbital Navigator" : "Deploy Orbital Navigator"}
                onMouseEnter={() => setToggleHovered(true)}
                onMouseLeave={() => setToggleHovered(false)}
                onClick={() => setIsVisible((v) => !v)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                style={{
                    pointerEvents: "auto",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    height: 30,
                    padding: "0 9px 0 6px",
                    background: light ? "rgba(255, 255, 255, 0.9)" : "rgba(11, 14, 19, 0.88)",
                    border: `1px solid ${
                        toggleHovered
                            ? accentColor
                            : isVisible
                              ? `${accentColor}77`
                              : light
                                ? "rgba(15, 23, 42, 0.22)"
                                : "rgba(255, 255, 255, 0.16)"
                    }`,
                    borderTop: `2px solid ${isVisible ? accentColor : "#64748b"}`,
                    backdropFilter: "blur(10px)",
                    boxShadow: toggleHovered
                        ? `0 0 18px ${accentColor}44, 0 6px 20px rgba(0, 0, 0, 0.45)`
                        : "0 4px 14px rgba(0, 0, 0, 0.35)",
                    cursor: "pointer",
                    overflow: "hidden",
                    transition: "border-color 0.18s ease, box-shadow 0.18s ease",
                }}
            >
                {/* Corner HUD targeting ticks */}
                <span
                    style={{
                        position: "absolute",
                        bottom: 1,
                        left: 1,
                        width: 4,
                        height: 4,
                        borderBottom: `1px solid ${accentColor}`,
                        borderLeft: `1px solid ${accentColor}`,
                        opacity: 0.75,
                    }}
                />
                <span
                    style={{
                        position: "absolute",
                        bottom: 1,
                        right: 1,
                        width: 4,
                        height: 4,
                        borderBottom: `1px solid ${accentColor}`,
                        borderRight: `1px solid ${accentColor}`,
                        opacity: 0.75,
                    }}
                />

                {/* Animated Micro-Gyroscope / Orbital Iris SVG */}
                <svg viewBox="-14 -14 28 28" className="h-5 w-5 shrink-0 overflow-visible">
                    {/* Outer radar tick bezel */}
                    <g opacity={isVisible ? 0.9 : 0.45}>
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0"
                            to="360"
                            dur={toggleHovered ? "4s" : "14s"}
                            repeatCount="indefinite"
                        />
                        <circle
                            r={11.5}
                            fill="none"
                            stroke={accentColor}
                            strokeWidth={1.1}
                            strokeDasharray="5 2.5 1.5 2.5"
                        />
                    </g>

                    {/* Inner counter-rotating 3D gimbal ellipse */}
                    <g opacity={isVisible ? 0.95 : 0.5}>
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="360"
                            to="0"
                            dur={toggleHovered ? "3s" : "9s"}
                            repeatCount="indefinite"
                        />
                        <ellipse
                            rx={8}
                            ry={3.6}
                            transform="rotate(-30)"
                            fill="none"
                            stroke={isVisible ? "#fb923c" : "#94a3b8"}
                            strokeWidth={1}
                        />
                        <ellipse
                            rx={8}
                            ry={3.6}
                            transform="rotate(60)"
                            fill="none"
                            stroke={isVisible ? "#38bdf8" : "#64748b"}
                            strokeWidth={0.9}
                        />
                    </g>

                    {/* Center reactor core dot */}
                    <circle
                        r={isVisible ? 2.6 : 1.8}
                        fill={isVisible ? accentColor : "#64748b"}
                    />
                </svg>

                {/* Interactive Status & Action Label */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, lineHeight: 1 }}>
                    <span
                        style={{
                            fontSize: 8.5,
                            fontWeight: 800,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: light ? "#0f172a" : "#f8fafc",
                        }}
                    >
                        {isVisible ? (toggleHovered ? "HIDE ORBIT" : "ORBIT") : "LAUNCH ORBIT"}
                    </span>
                    <span
                        style={{
                            fontSize: 7.5,
                            fontWeight: 800,
                            padding: "1.5px 4px",
                            border: `1px solid ${isVisible ? `${accentColor}88` : "rgba(148,163,184,0.35)"}`,
                            background: isVisible ? `${accentColor}1f` : "transparent",
                            color: isVisible ? accentColor : "#94a3b8",
                            letterSpacing: "0.1em",
                        }}
                    >
                        {isVisible ? (mode === "orbit" ? "3D" : "RING") : "OFF"}
                    </span>
                </div>
            </motion.button>
        </div>
    );
}
