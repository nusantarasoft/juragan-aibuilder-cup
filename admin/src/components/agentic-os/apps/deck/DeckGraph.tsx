"use client";

/**
 * Command Deck — graph renderer for every view (Rings · Circle · Areas · Links ·
 * Timeline · 3D Orbit). One SVG and one animation engine: switching views
 * tweens every node (position, scale, opacity), the view box and the view's
 * decoration, so the same dots fly from one layout into the next. The orbit is
 * projected live from 3D positions (auto-spin with motion, drag to rotate).
 * Wheel-zoom around the cursor, drag-pan, live "motion" particles along
 * active links and neighbourhood highlighting.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
    BarChart3, BookOpen, Boxes, Building2, Calculator, Factory, GitBranch, Handshake, KanbanSquare, Newspaper, Radar, Server, Shield, Sparkles, Ticket, Users, Warehouse, Wrench, type LucideIcon,
} from "lucide-react";
import { LINK_COLOR, ORBIT, hash01, project, type Box, type DeckLink, type DeckModel, type DeckNode, type Layout, type Pt, type Pt3, type TimelineDecor } from "../../lib/deckGraph";

type Xf = { k: number; x: number; y: number };
/** Animated node state: position, glyph scale (orbit depth) and opacity. */
type Anim = { x: number; y: number; s: number; o: number };
type AnimMap = Map<string, Anim>;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const TAU = Math.PI * 2;
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
/** View-change duration (ms). */
const DUR = 1100;
/** Orbit auto-spin (rad / ms). */
const SPIN = 0.00011;

/** Lucide glyph per Nusantarasoft module (application ring). */
export const MODULE_ICON: Record<string, LucideIcon> = {
    itsm: Ticket,
    knowledge: BookOpen,
    "command-center": Radar,
    ops: Wrench,
    devops: GitBranch,
    infrastructure: Server,
    security: Shield,
    dcim: Boxes,
    bms: Building2,
    scada: Factory,
    pm: KanbanSquare,
    hr: Users,
    reports: BarChart3,
    accounting: Calculator,
    crm: Handshake,
    news: Newspaper,
    "ai-studio": Sparkles,
    inventory: Warehouse,
};

const CLOUD_COLORS = ["#fb923c", "#f97316", "#fdba74", "#ea580c", "#fed7aa"];

/** Deterministic orange particle cloud drawn around the core (the "skills" nebula). */
const CoreCloud = React.memo(function CoreCloud({ motion, radius = 78 }: { motion: boolean; radius?: number }) {
    const layers = useMemo(
        () =>
            [0, 1, 2].map((layer) =>
                Array.from({ length: 170 }, (_, i) => {
                    const key = `c${layer}:${i}`;
                    const a = hash01(key, 1) * Math.PI * 2;
                    const r = radius * Math.pow(hash01(key, 2), 0.75) * (0.35 + 0.65 * (layer + 1) / 3);
                    return {
                        x: Math.cos(a) * r,
                        y: Math.sin(a) * r,
                        s: 0.5 + hash01(key, 3) * 1.25,
                        o: 0.35 + hash01(key, 4) * 0.6,
                        c: CLOUD_COLORS[Math.floor(hash01(key, 5) * CLOUD_COLORS.length)],
                    };
                }),
            ),
        [radius],
    );
    return (
        <g pointerEvents="none">
            <circle r={radius * 1.35} fill="url(#deck-core-glow)" />
            {layers.map((pts, li) => (
                <g key={li}>
                    {motion && <animateTransform attributeName="transform" type="rotate" from="0" to={li % 2 ? "-360" : "360"} dur={`${50 + li * 35}s`} repeatCount="indefinite" />}
                    {pts.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r={p.s} fill={p.c} fillOpacity={p.o} />
                    ))}
                </g>
            ))}
        </g>
    );
});

const hexPath = (r: number) => {
    const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
    });
    return `M${pts.join("L")}Z`;
};
const HEX8 = hexPath(8);

/** Labels shown with "names" on, by kind. Memory / skills only when zoomed in. */
const NAMED = new Set(["agent", "app", "routine", "workflow", "goal"]);
/** Timeline lane heads — always labelled (they are the axis). */
const LANE_KINDS = new Set(["routine", "workflow", "agent"]);

/** View box of a layout: its fixed box, or the bounds of its positions. */
function boxOf(layout: Layout): Box {
    if (layout.box) return layout.box;
    let minX = -540;
    let minY = -540;
    let maxX = 540;
    let maxY = 540;
    for (const p of layout.pos.values()) {
        minX = Math.min(minX, p.x - 40);
        minY = Math.min(minY, p.y - 40);
        maxX = Math.max(maxX, p.x + 40);
        maxY = Math.max(maxY, p.y + 40);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Target state of every node in a layout (orbit: projected at the current angle). */
function targetOf(layout: Layout, yaw: number, tilt: number): AnimMap {
    const out: AnimMap = new Map();
    if (layout.pos3) {
        const G = ORBIT.globe;
        for (const [id, p] of layout.pos3) {
            const q = project(p, yaw, tilt);
            const depth = Math.max(0, Math.min(1, (q.z + G * 1.1) / (G * 2.2)));
            out.set(id, { x: q.x, y: q.y, s: q.k, o: 0.28 + 0.72 * depth });
        }
        return out;
    }
    for (const [id, p] of layout.pos) out.set(id, { x: p.x, y: p.y, s: 1, o: layout.hidden?.has(id) ? 0 : 1 });
    return out;
}

const lerp = (a: number, b: number, e: number) => a + (b - a) * e;

export interface GraphProps {
    model: DeckModel;
    layout: Layout;
    visible: Set<string>;
    names: boolean;
    motion: boolean;
    search: string;
    selected: string | null;
    onSelect: (id: string | null) => void;
    onIsolate: (kind: "ring" | "group" | "area", ref: string) => void;
    fitNonce: number;
    light?: boolean;
}

export function DeckGraphSvg({ model, layout, visible, names, motion, search, selected, onSelect, onIsolate, fitNonce, light = false }: GraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [xf, setXf] = useState<Xf>({ k: 1, x: 0, y: 0 });
    const [hover, setHover] = useState<string | null>(null);
    const [, setTick] = useState(0);
    const drag = useRef<{ sx: number; sy: number; cx: number; cy: number; ox: number; oy: number; moved: boolean; bg: boolean; rotate: boolean } | null>(null);

    /* ---------------- animation engine ---------------- */

    const yaw = useRef(0.6);
    const tilt = useRef(ORBIT.tilt);
    const layoutRef = useRef(layout);
    const prevLayout = useRef<Layout | null>(null);
    const cur = useRef<AnimMap>(targetOf(layout, yaw.current, tilt.current));
    const box = useRef<Box>(boxOf(layout));
    const tween = useRef<{ from: AnimMap; fromBox: Box; t0: number; e: number } | null>(null);
    const motionRef = useRef(motion);
    motionRef.current = motion;
    const raf = useRef(0);
    const lastT = useRef(0);
    const lastPaint = useRef(0);

    const loop = useCallback((t: number) => {
        raf.current = 0;
        const L = layoutRef.current;
        const spinning = !!L.pos3 && motionRef.current && !drag.current?.rotate;
        if (spinning && lastT.current) yaw.current += (t - lastT.current) * SPIN;
        lastT.current = t;
        const tw = tween.current;
        // Steady orbit spin is painted at ~30 fps; view changes at full rate.
        if (!tw && spinning && t - lastPaint.current < 32) {
            raf.current = requestAnimationFrame(loop);
            return;
        }
        lastPaint.current = t;
        const target = targetOf(L, yaw.current, tilt.current);
        if (tw) {
            const p = Math.min(1, (t - tw.t0) / DUR);
            const e = ease(p);
            tw.e = e;
            const next: AnimMap = new Map();
            for (const [id, b] of target) {
                const a = tw.from.get(id) ?? { ...b, o: 0 };
                next.set(id, { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), s: lerp(a.s, b.s, e), o: lerp(a.o, b.o, e) });
            }
            cur.current = next;
            const B = boxOf(L);
            box.current = { x: lerp(tw.fromBox.x, B.x, e), y: lerp(tw.fromBox.y, B.y, e), w: lerp(tw.fromBox.w, B.w, e), h: lerp(tw.fromBox.h, B.h, e) };
            if (p >= 1) {
                tween.current = null;
                prevLayout.current = null;
            }
        } else {
            cur.current = target;
            box.current = boxOf(L);
        }
        setTick((n) => (n + 1) % 1_000_000);
        if (tween.current || spinning) raf.current = requestAnimationFrame(loop);
    }, []);

    const kick = useCallback(() => {
        if (!raf.current) {
            lastT.current = 0;
            raf.current = requestAnimationFrame(loop);
        }
    }, [loop]);

    // New layout → tween from wherever the nodes are right now.
    useLayoutEffect(() => {
        if (layoutRef.current === layout) return;
        prevLayout.current = layoutRef.current;
        tween.current = { from: new Map(cur.current), fromBox: { ...box.current }, t0: performance.now(), e: 0 };
        layoutRef.current = layout;
        kick();
    }, [layout, kick]);

    useEffect(() => {
        if (motion) kick();
    }, [motion, kick]);
    useEffect(() => () => cancelAnimationFrame(raf.current), []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => setXf({ k: 1, x: 0, y: 0 }), [fitNonce, layout.kind]);

    /* ---------------- interaction ---------------- */

    const toSvg = (clientX: number, clientY: number) => {
        const svg = svgRef.current;
        const ctm = svg?.getScreenCTM();
        if (!svg || !ctm) return { x: 0, y: 0 };
        const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
        return { x: p.x, y: p.y };
    };

    // Wheel zoom around the cursor (native listener so we can preventDefault).
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const ctm = svg.getScreenCTM();
            if (!ctm) return;
            const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
            setXf((t) => {
                const k = Math.max(0.4, Math.min(8, t.k * Math.exp(-e.deltaY * 0.0015)));
                return { k, x: p.x - ((p.x - t.x) * k) / t.k, y: p.y - ((p.y - t.y) * k) / t.k };
            });
        };
        svg.addEventListener("wheel", onWheel, { passive: false });
        return () => svg.removeEventListener("wheel", onWheel);
    }, []);

    const onPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        const p = toSvg(e.clientX, e.clientY);
        // In the orbit, a background drag rotates the globe; shift-drag pans.
        const rotate = !!layoutRef.current.pos3 && !e.shiftKey;
        drag.current = { sx: p.x, sy: p.y, cx: e.clientX, cy: e.clientY, ox: xf.x, oy: xf.y, moved: false, bg: (e.target as Element).getAttribute("data-bg") === "1", rotate };
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d) return;
        if (d.rotate) {
            const dx = e.clientX - d.cx;
            const dy = e.clientY - d.cy;
            if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
            if (!d.moved) return;
            yaw.current += dx * 0.006;
            tilt.current = Math.max(-0.15, Math.min(1.1, tilt.current + dy * 0.004));
            d.cx = e.clientX;
            d.cy = e.clientY;
            kick();
            return;
        }
        const p = toSvg(e.clientX, e.clientY);
        const dx = p.x - d.sx;
        const dy = p.y - d.sy;
        if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
        if (d.moved) setXf((t) => ({ ...t, x: d.ox + dx, y: d.oy + dy }));
    };
    const onPointerUp = () => {
        const d = drag.current;
        drag.current = null;
        if (d && !d.moved && d.bg) onSelect(null);
        if (d?.rotate) kick();
    };

    /* ---------------- render ---------------- */

    const L = layout;
    const pos = cur.current;
    const vb = box.current;
    const tw = tween.current;
    const e = tw ? tw.e : 1;
    const prev = tw ? prevLayout.current : null;
    const kind = L.kind ?? "rings";
    const ringView = kind === "rings";
    const orbit = kind === "orbit";
    const timeline = kind === "timeline";

    const focus = hover ?? selected;
    const near = focus ? model.adj.get(focus) ?? new Set<string>() : null;
    const q = search.trim().toLowerCase();
    const match = (n: DeckNode) => !q || n.label.toLowerCase().includes(q) || n.sub.toLowerCase().includes(q);
    const dimmed = (n: DeckNode) => (focus ? n.id !== focus && !near!.has(n.id) : false) || (!!q && !match(n));
    const k = xf.k;
    const nodeScale = 1 / Math.sqrt(k);

    // Links fade out on the timeline and soften in the orbit.
    const linkAlphaOf = (l: Layout | null) => (!l ? 0 : l.kind === "timeline" ? 0 : l.kind === "orbit" ? 0.6 : 1);
    const linkAlpha = prev ? lerp(linkAlphaOf(prev), linkAlphaOf(L), e) : linkAlphaOf(L);
    const drawLinks =
        linkAlpha < 0.02
            ? []
            : model.links.filter((l) => visible.has(l.s) && visible.has(l.t) && !(l.kind === "member" && (ringView || orbit || L.curved)));

    const linkPath = (l: DeckLink) => {
        const a = pos.get(l.s);
        const b = pos.get(l.t);
        if (!a || !b) return null;
        if (L.curved && !tw) return `M${a.x},${a.y} Q${(a.x + b.x) * 0.12},${(a.y + b.y) * 0.12} ${b.x},${b.y}`;
        return `M${a.x},${a.y} L${b.x},${b.y}`;
    };

    const hovered = hover ? model.byId.get(hover) : undefined;
    const hp = hover ? pos.get(hover) : undefined;
    const corePos = pos.get("core");

    return (
        <svg
            ref={svgRef}
            viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
            className={`h-full w-full touch-none select-none ${orbit ? "cursor-move" : "cursor-grab active:cursor-grabbing"}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
        >
            <defs>
                <radialGradient id="deck-core-glow">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={light ? "0.28" : "0.35"} />
                    <stop offset="55%" stopColor="#c2410c" stopOpacity={light ? "0.08" : "0.1"} />
                    <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="deck-bg" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor={light ? "#e2e8f0" : "#1e293b"} stopOpacity={light ? "0.55" : "0.45"} />
                    <stop offset="70%" stopColor={light ? "#f1f5f9" : "#0b0e13"} stopOpacity={light ? "0.25" : "0.2"} />
                    <stop offset="100%" stopColor={light ? "#f8fafc" : "#020617"} stopOpacity="0" />
                </radialGradient>
            </defs>
            <rect data-bg="1" x={vb.x - 2000} y={vb.y - 2000} width={vb.w + 4000} height={vb.h + 4000} fill="url(#deck-bg)" />
            <g transform={`translate(${xf.x} ${xf.y}) scale(${k})`}>
                {/* View decoration: the outgoing view fades out while the new one fades in. */}
                {prev && <Decor layout={prev} alpha={1 - e} motion={motion} yaw={yaw.current} tilt={tilt.current} onIsolate={onIsolate} k={k} light={light} />}
                <Decor layout={L} alpha={e} motion={motion} yaw={yaw.current} tilt={tilt.current} onIsolate={onIsolate} k={k} light={light} />

                {/* Core particle cloud */}
                {visible.has("core") && corePos && corePos.o > 0.02 && (
                    <g transform={`translate(${corePos.x} ${corePos.y}) scale(${orbit ? corePos.s : 1})`} opacity={corePos.o}>
                        <CoreCloud motion={motion} radius={ringView ? 92 : orbit ? 70 : 80} />
                    </g>
                )}

                {/* Links */}
                <g fill="none" opacity={linkAlpha}>
                    {drawLinks.map((l, i) => {
                        const d = linkPath(l);
                        if (!d) return null;
                        const on = focus ? l.s === focus || l.t === focus : false;
                        const off = focus ? !on : false;
                        const base = (l.kind === "core" ? 0.07 : l.kind === "member" ? 0.05 : 0.14) * (light ? 1.85 : 1);
                        const fade = Math.min(pos.get(l.s)?.o ?? 1, pos.get(l.t)?.o ?? 1);
                        return <path key={i} d={d} stroke={LINK_COLOR[l.kind]} strokeOpacity={(on ? 0.85 : off ? 0.03 : l.live ? 0.5 : base) * fade} strokeWidth={(on ? 1.6 : 0.8) / Math.sqrt(k)} pointerEvents="none" />;
                    })}
                </g>

                {/* Motion particles on live links (only once the view has settled) */}
                {motion &&
                    !tw &&
                    !orbit &&
                    linkAlpha > 0.5 &&
                    drawLinks
                        .filter((l) => l.live)
                        .map((l, i) => {
                            const d = linkPath(l);
                            if (!d) return null;
                            return (
                                <circle key={`p${i}`} r={2.6 * nodeScale} fill={LINK_COLOR[l.kind]} pointerEvents="none">
                                    <animateMotion dur={`${1.4 + (i % 5) * 0.25}s`} repeatCount="indefinite" path={d} />
                                </circle>
                            );
                        })}

                {/* Nodes */}
                {model.nodes.map((n) => {
                    if (!visible.has(n.id) || n.kind === "core") return null;
                    const p = pos.get(n.id);
                    if (!p || p.o < 0.02) return null;
                    const dim = dimmed(n);
                    const isSel = selected === n.id;
                    const glyphScale = (n.kind === "area" ? 1 / Math.max(1, k * 0.8) : nodeScale) * p.s;
                    const laneHead = timeline && LANE_KINDS.has(n.kind);
                    const showLabel =
                        laneHead ||
                        (!timeline && names && NAMED.has(n.kind) && (n.kind !== "routine" || k > 1.3 || ringView || orbit)) ||
                        (k > 2.4 && (n.kind === "memory" || n.kind === "skill" || n.kind === "playbook"));
                    return (
                        <g
                            key={n.id}
                            transform={`translate(${p.x} ${p.y})`}
                            opacity={(dim ? 0.12 : 1) * p.o}
                            className="cursor-pointer"
                            pointerEvents={p.o < 0.25 ? "none" : undefined}
                            onPointerEnter={() => setHover(n.id)}
                            onPointerLeave={() => setHover((h) => (h === n.id ? null : h))}
                            onPointerDown={(ev) => ev.stopPropagation()}
                            onClick={(ev) => {
                                ev.stopPropagation();
                                if (n.kind === "area") onIsolate("area", n.areaId ?? "");
                                else onSelect(isSel ? null : n.id);
                            }}
                        >
                            <g transform={`scale(${glyphScale})`}>
                                <NodeGlyphMemo n={n} motion={motion} selected={isSel} light={light} />
                            </g>
                            {showLabel ? <NodeLabel n={n} p={p} k={k} mode={laneHead ? "left" : ringView ? "radial" : "below"} light={light} /> : null}
                        </g>
                    );
                })}

                {/* Core label (always on top of the cloud) */}
                {visible.has("core") && corePos && corePos.o > 0.02 && model.byId.get("core") && (
                    <g
                        transform={`translate(${corePos.x} ${corePos.y}) scale(${1 / Math.max(1, k * 0.8)})`}
                        opacity={corePos.o}
                        className="cursor-pointer"
                        onPointerDown={(ev) => ev.stopPropagation()}
                        onClick={(ev) => {
                            ev.stopPropagation();
                            onSelect(selected === "core" ? null : "core");
                        }}
                        onPointerEnter={() => setHover("core")}
                        onPointerLeave={() => setHover((h) => (h === "core" ? null : h))}
                    >
                        <NodeGlyphMemo n={model.byId.get("core")!} motion={motion} selected={selected === "core"} light={light} />
                    </g>
                )}

                {/* Hover tooltip */}
                {hovered && hp && (
                    <g transform={`translate(${hp.x} ${hp.y}) scale(${1 / k})`} pointerEvents="none">
                        <g transform="translate(14 -14)">
                            <rect x={0} y={-30} width={Math.max(hovered.label.length, Math.min(hovered.sub.length, 60)) * 6.1 + 18} height={36} rx={6} fill={light ? "#ffffff" : "#020617"} fillOpacity={0.96} stroke={hovered.color} strokeOpacity={0.65} />
                            <text x={9} y={-16} fontSize={11} fontWeight={700} fill={light ? "#0f172a" : "#f8fafc"}>
                                {hovered.label.length > 60 ? `${hovered.label.slice(0, 58)}…` : hovered.label}
                            </text>
                            <text x={9} y={-3} fontSize={9.5} fill={light ? "#475569" : "#94a3b8"}>
                                {hovered.sub.length > 60 ? `${hovered.sub.slice(0, 58)}…` : hovered.sub}
                            </text>
                        </g>
                    </g>
                )}
            </g>
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/* View decoration                                                     */
/* ------------------------------------------------------------------ */

function Decor({ layout, alpha, motion, yaw, tilt, onIsolate, k, light }: { layout: Layout; alpha: number; motion: boolean; yaw: number; tilt: number; onIsolate: GraphProps["onIsolate"]; k: number; light: boolean }) {
    if (alpha < 0.02) return null;
    const ringView = layout.kind === "rings";
    return (
        <g opacity={alpha}>
            {layout.guides.map((g, i) => (
                <g key={i}>
                    <circle
                        r={g.r}
                        fill="none"
                        stroke={g.strong ? (light ? "rgba(15,23,42,0.24)" : "rgba(148,163,184,0.22)") : light ? "rgba(15,23,42,0.11)" : "rgba(148,163,184,0.09)"}
                        strokeWidth={g.strong ? 1.2 : 1}
                        strokeDasharray={g.dash ? "2 6" : undefined}
                        pointerEvents="none"
                    >
                        {motion && g.dash && <animateTransform attributeName="transform" type="rotate" from="0" to={i % 2 ? "-360" : "360"} dur={`${160 + i * 40}s`} repeatCount="indefinite" />}
                    </circle>
                    {ringView && g.strong && <RingTicks r={g.r} i={i} motion={motion} />}
                </g>
            ))}
            {ringView && layout.guides.length > 0 && (
                <circle r={Math.max(...layout.guides.map((g) => g.r)) + 16} fill="none" stroke={light ? "rgba(15,23,42,0.16)" : "rgba(148,163,184,0.12)"} strokeWidth={4} strokeDasharray="60 14 4 14" pointerEvents="none">
                    {motion && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="320s" repeatCount="indefinite" />}
                </circle>
            )}
            {layout.timeline && <TimelineDeco t={layout.timeline} light={light} />}
            {layout.kind === "orbit" && <OrbitDeco yaw={yaw} tilt={tilt} light={light} />}

            {/* Ring / group labels */}
            {layout.labels.map((l) => (
                <g
                    key={l.key}
                    transform={`translate(${l.x} ${l.y}) scale(${1 / Math.max(1, k * 0.8)})`}
                    className="cursor-pointer"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onIsolate(l.kind === "ring" ? "ring" : "group", l.ref);
                    }}
                >
                    <rect
                        x={-(l.text.length * 3.9 + (l.count !== undefined ? 16 : 0)) - 6}
                        y={-8}
                        width={(l.text.length * 3.9 + (l.count !== undefined ? 16 : 0)) * 2 + 12}
                        height={16}
                        rx={2}
                        fill={light ? "#ffffff" : "#0b0e13"}
                        fillOpacity={light ? 0.92 : 0.8}
                        stroke={light ? "rgba(15,23,42,0.14)" : "none"}
                        strokeWidth={0.8}
                    />
                    <text textAnchor="middle" dy={3.5} fontSize={9.5} letterSpacing={2} fill={light && (l.color === "#f8fafc" || l.color === "#e2e8f0" || l.color === "#cbd5e1") ? "#0f172a" : l.color} fontWeight={600} fontFamily={MONO}>
                        {l.text}
                        {l.count !== undefined ? ` ${l.count}` : ""}
                    </text>
                </g>
            ))}
        </g>
    );
}

const RingTicks = React.memo(function RingTicks({ r, i, motion }: { r: number; i: number; motion: boolean }) {
    return (
        <g pointerEvents="none" opacity={0.4}>
            {motion && <animateTransform attributeName="transform" type="rotate" from="0" to={i % 2 ? "360" : "-360"} dur={`${240 + i * 30}s`} repeatCount="indefinite" />}
            {Array.from({ length: 120 }, (_, t) => {
                const a = (t / 120) * Math.PI * 2;
                const r2 = r + (t % 10 === 0 ? 8 : 3);
                return <line key={t} x1={Math.cos(a) * r} y1={Math.sin(a) * r} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2} stroke="#64748b" strokeWidth={0.8} />;
            })}
        </g>
    );
});

/** Timeline: day grid + now line over the lanes, the files header, axis and no-date pile caption. */
const TimelineDeco = React.memo(function TimelineDeco({ t, light }: { t: TimelineDecor; light: boolean }) {
    return (
        <g pointerEvents="none" fontFamily={MONO}>
            {t.days.map((d) => (
                <g key={d.x}>
                    <line x1={d.x} x2={d.x} y1={t.laneTop - 12} y2={t.laneBottom + 10} stroke={light ? "#475569" : "#94a3b8"} strokeOpacity={d.major ? (light ? 0.28 : 0.16) : light ? 0.13 : 0.07} strokeWidth={0.8} />
                    {d.major && (
                        <text x={d.x + 3} y={t.laneTop - 16} fontSize={7} fill="#475569">
                            {d.label}
                        </text>
                    )}
                </g>
            ))}
            {t.lanes.map((l, i) => (
                <g key={i}>
                    <line x1={t.laneHead + 14} x2={t.x1} y1={l.y} y2={l.y} stroke={light ? "#475569" : "#94a3b8"} strokeOpacity={light ? 0.15 : 0.07} strokeDasharray="1 4" />
                    {l.label && (
                        <text x={t.laneHead - 12} y={l.y + 3} textAnchor="end" fontSize={8.5} fill={light ? "#334155" : "#94a3b8"}>
                            {l.label}
                        </text>
                    )}
                </g>
            ))}
            <line x1={t.nowX} x2={t.nowX} y1={t.laneTop - 14} y2={t.laneBottom + 12} stroke="#fb923c" strokeOpacity={0.65} strokeDasharray="3 3" />
            <text x={t.nowX} y={t.laneTop - 18} textAnchor="middle" fontSize={7} fill={light ? "#ea580c" : "#fb923c"}>
                now
            </text>
            <line x1={t.pileX - 20} x2={t.x1} y1={t.filesY - 12} y2={t.filesY - 12} stroke={light ? "#475569" : "#94a3b8"} strokeOpacity={light ? 0.18 : 0.1} />
            <text x={t.laneHead + 8} y={t.filesY} textAnchor="end" fontSize={8.5} letterSpacing={0.6}>
                <tspan fill={light ? "#0284c7" : "#93c5fd"} fontWeight={700}>
                    FILES
                </tspan>
                <tspan fill="#64748b"> · by last change</tspan>
            </text>
            <line x1={t.gridX - 9} x2={t.gridX - 9} y1={t.gridTop - 6} y2={t.gridBottom} stroke={light ? "#475569" : "#94a3b8"} strokeOpacity={light ? 0.25 : 0.18} />
            {t.gridW > 0 && (
                <>
                    <text x={t.gridX} y={t.gridBottom + 14} fontSize={7} fill="#475569">
                        older
                    </text>
                    <text x={t.gridX + t.gridW - 13} y={t.gridBottom + 14} textAnchor="end" fontSize={7} fill="#475569">
                        newest →
                    </text>
                </>
            )}
            <text x={t.pileX} y={t.pileY - 14} fontSize={8} fill="#64748b">
                no date · {t.pileCount}
            </text>
        </g>
    );
});

/** Orbit: wireframe globe, application ring and Pulse ring, projected at the current angle. */
function OrbitDeco({ yaw, tilt, light }: { yaw: number; tilt: number; light: boolean }) {
    const G = ORBIT.globe;
    const path = (pts: Pt3[]) =>
        pts
            .map((p, i) => {
                const q = project(p, yaw, tilt);
                return `${i ? "L" : "M"}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
            })
            .join("");
    const ring = (fn: (a: number) => Pt3, n = 72) => path(Array.from({ length: n + 1 }, (_, i) => fn((i / n) * TAU)));
    const meridians = Array.from({ length: 6 }, (_, m) => {
        const phi = (m * Math.PI) / 6;
        return ring((a) => ({ x: G * Math.cos(a) * Math.cos(phi), y: G * Math.sin(a), z: G * Math.cos(a) * Math.sin(phi) }));
    });
    const parallels = [-0.95, -0.5, 0, 0.5, 0.95].map((lat) => {
        const r = G * Math.cos(lat);
        const y = G * Math.sin(lat);
        return ring((a) => ({ x: r * Math.cos(a), y, z: r * Math.sin(a) }));
    });
    return (
        <g pointerEvents="none" fill="none">
            <circle r={G * 1.05} fill="url(#deck-core-glow)" opacity={0.25} />
            {meridians.map((d, i) => (
                <path key={`m${i}`} d={d} stroke={light ? "#334155" : "#94a3b8"} strokeOpacity={light ? 0.16 : 0.07} strokeWidth={0.8} />
            ))}
            {parallels.map((d, i) => (
                <path key={`p${i}`} d={d} stroke={light ? "#334155" : "#94a3b8"} strokeOpacity={i === 2 ? (light ? 0.25 : 0.12) : light ? 0.14 : 0.06} strokeWidth={0.8} />
            ))}
            <path d={ring((a) => ({ x: ORBIT.appRing * Math.cos(a), y: 0, z: ORBIT.appRing * Math.sin(a) }), 120)} stroke={light ? "#475569" : "#cbd5e1"} strokeOpacity={light ? 0.45 : 0.32} strokeWidth={1.1} />
            <path d={ring((a) => ({ x: ORBIT.pulseR * Math.cos(a), y: ORBIT.pulseY, z: ORBIT.pulseR * Math.sin(a) }))} stroke="#fb923c" strokeOpacity={light ? 0.45 : 0.3} strokeWidth={1} />
        </g>
    );
}

/* ------------------------------------------------------------------ */
/* Glyphs + labels                                                     */
/* ------------------------------------------------------------------ */

function NodeGlyph({ n, motion, selected, light }: { n: DeckNode; motion: boolean; selected: boolean; light: boolean }) {
    const ring = selected ? <circle r={n.kind === "app" ? 18 : n.kind === "agent" ? 15 : 8} fill="none" stroke={light ? "#0f172a" : "#f8fafc"} strokeWidth={1.4} strokeDasharray="3 2" /> : null;
    const ping = (r: number, color: string) =>
        motion ? <circle r={r} fill="none" stroke={color} strokeWidth={1.4} className="animate-ping" style={{ transformBox: "fill-box", transformOrigin: "center" }} /> : <circle r={r} fill="none" stroke={color} strokeWidth={1.4} strokeOpacity={0.6} />;
    switch (n.kind) {
        case "core":
            return (
                <g>
                    {ring}
                    <rect x={-42} y={-10} width={84} height={20} rx={2} fill={light ? "#ffffff" : "#0b0e13"} fillOpacity={0.95} stroke={light ? "#ea580c" : "#fdba74"} strokeOpacity={light ? 0.65 : 0.45} />
                    <text textAnchor="middle" dy={3.4} fontSize={9.5} fontWeight={700} letterSpacing={1.4} fill={light ? "#0f172a" : "#f8fafc"} fontFamily={MONO}>
                        {n.label}
                    </text>
                </g>
            );
        case "area": {
            const text = `${n.label.toUpperCase()} ${n.sub.split(" ")[0]}`;
            const w = text.length * 6 + 8;
            return (
                <g>
                    <rect x={10} y={-8} width={w} height={16} rx={2} fill={light ? "#ffffff" : "#0b0e13"} fillOpacity={light ? 0.92 : 0.82} stroke={light ? "rgba(15,23,42,0.12)" : "none"} strokeWidth={0.8} />
                    <circle r={8.5} fill={light ? "#ffffff" : "#0b0e13"} stroke={n.color} strokeWidth={1.2} />
                    <circle r={6.5} fill={n.color} />
                    <text textAnchor="middle" dy={3.2} fontSize={8.5} fontWeight={800} fill={light ? "#ffffff" : "#0b0e13"} fontFamily={MONO}>
                        {n.label.slice(0, 1).toUpperCase()}
                    </text>
                    <text x={14} dy={3.4} fontSize={9.5} fontWeight={600} letterSpacing={0.8} fill={light ? "#0f172a" : "#e2e8f0"} fontFamily={MONO}>
                        {text}
                    </text>
                </g>
            );
        }
        case "memory":
            return (
                <g>
                    {ring}
                    <circle r={3} fill={n.color} fillOpacity={n.health === "stale" ? 0.55 : 0.95} stroke={n.health === "broken" ? "#ef4444" : "none"} strokeWidth={1.4} />
                </g>
            );
        case "skill":
            return <circle r={2.6} fill="#fb923c" fillOpacity={0.85} />;
        case "playbook":
            return (
                <g>
                    {ring}
                    <rect x={-3} y={-3} width={6} height={6} transform="rotate(45)" fill={n.color} fillOpacity={n.status === "disabled" ? 0.35 : 0.9} />
                </g>
            );
        case "goal":
            return (
                <g>
                    {ring}
                    <path d="M0,-9 L9,0 L0,9 L-9,0 Z" fill={`${n.color}33`} stroke={n.color} strokeWidth={1.5} />
                    <path d="M0,-4 L4,0 L0,4 L-4,0 Z" fill={n.color} opacity={0.4 + 0.6 * (n.progress ?? 0)} />
                    {n.status === "at_risk" && <circle cx={8} cy={-8} r={2.6} fill="#f59e0b" />}
                </g>
            );
        case "agent":
            return (
                <g>
                    {n.live && ping(13, n.color)}
                    {ring}
                    <circle r={10} fill={`${n.color}30`} stroke={n.color} strokeWidth={1.6} strokeOpacity={n.status === "active" ? 1 : 0.4} />
                    <text textAnchor="middle" dy={3.6} fontSize={10} fontWeight={800} fill={n.color}>
                        {n.label.slice(0, 1).toUpperCase()}
                    </text>
                    {n.live && n.progress !== undefined && (
                        <circle r={12.5} fill="none" stroke={n.color} strokeWidth={1.6} strokeDasharray={`${(n.progress * 78.5).toFixed(1)} 78.5`} transform="rotate(-90)" />
                    )}
                </g>
            );
        case "routine":
            return (
                <g>
                    {n.live && ping(9, n.color)}
                    {ring}
                    <circle r={6} fill={light ? "#ffffff" : "#0b1020"} stroke={n.color} strokeWidth={2} strokeDasharray={n.status === "disabled" ? "2 2" : undefined} />
                    <circle r={2} fill={n.color} />
                </g>
            );
        case "workflow":
            return (
                <g>
                    {n.live && ping(11, n.color)}
                    {ring}
                    <path d={HEX8} fill={`${n.color}33`} stroke={n.color} strokeWidth={1.6} />
                </g>
            );
        case "app": {
            const Icon = MODULE_ICON[n.moduleId ?? n.refId] ?? Sparkles;
            return (
                <g>
                    {n.live && ping(15, n.color)}
                    {ring}
                    <circle r={11} fill={light ? "#ffffff" : "#0b0e13"} stroke={n.live ? n.color : light ? "#64748b" : "#94a3b8"} strokeOpacity={n.live ? 1 : 0.75} strokeWidth={1.3} />
                    <Icon x={-6} y={-6} width={12} height={12} color={n.live ? n.color : light ? "#1e293b" : "#e2e8f0"} strokeWidth={1.8} />
                </g>
            );
        }
        case "run":
            return n.live ? (
                <g>
                    {ping(4, n.color)}
                    <circle r={2.4} fill={n.color} />
                </g>
            ) : (
                <circle r={2.2} fill={n.color} fillOpacity={0.85} />
            );
        default:
            return <circle r={3} fill={n.color} />;
    }
}
const NodeGlyphMemo = React.memo(NodeGlyph);

function NodeLabel({ n, p, k, mode, light }: { n: DeckNode; p: Pt; k: number; mode: "radial" | "below" | "left"; light: boolean }) {
    const small = n.kind === "memory" || n.kind === "skill" || n.kind === "playbook" || n.kind === "routine";
    const fs = (small ? 8 : n.kind === "app" ? 9.5 : 9) / Math.max(1, k * 0.85);
    const text = n.label.length > 26 ? `${n.label.slice(0, 24)}…` : n.label;
    const halo = { paintOrder: "stroke" as const };
    const haloStroke = light ? "#f8fafc" : "#050816";
    if (mode === "left") {
        // Timeline lane head: right-aligned label to the left of the glyph.
        return (
            <text x={-12 / Math.sqrt(k)} y={3} textAnchor="end" fontSize={8.5 / Math.max(1, k * 0.85)} fill={light ? "#1e293b" : "#cbd5e1"} fontFamily={MONO} pointerEvents="none" style={halo} stroke={haloStroke} strokeWidth={3 / k}>
                {text}
            </text>
        );
    }
    if (mode === "radial" && (n.kind === "app" || n.kind === "routine" || n.kind === "workflow")) {
        // Radial placement outside the node so ring labels never collide with the ring itself.
        const a = Math.atan2(p.y, p.x);
        const off = (n.kind === "app" ? 22 : 13) / Math.sqrt(k);
        const right = Math.cos(a) >= 0;
        return (
            <text
                x={Math.cos(a) * off}
                y={Math.sin(a) * off + fs * 0.35}
                textAnchor={Math.abs(Math.cos(a)) < 0.25 ? "middle" : right ? "start" : "end"}
                fontSize={fs}
                fill={n.kind === "app" ? (light ? "#0f172a" : "#cbd5e1") : light ? "#334155" : "#94a3b8"}
                pointerEvents="none"
                style={halo}
                stroke={haloStroke}
                strokeWidth={3 / k}
            >
                {text}
            </text>
        );
    }
    const dy = (n.kind === "agent" ? 22 : n.kind === "goal" ? 19 : 12) / Math.sqrt(k);
    return (
        <text y={dy} textAnchor="middle" fontSize={fs} fill={n.kind === "agent" ? (light ? "#0f172a" : "#e2e8f0") : light ? "#334155" : "#94a3b8"} fontWeight={n.kind === "agent" ? 700 : 500} pointerEvents="none" style={halo} stroke={haloStroke} strokeWidth={3 / k}>
            {text}
        </text>
    );
}
