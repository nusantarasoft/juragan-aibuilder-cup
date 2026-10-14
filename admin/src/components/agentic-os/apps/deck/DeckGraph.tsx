"use client";

/**
 * Command Deck — 2D graph renderer (Rings · Circle · Areas · Links).
 * SVG with wheel-zoom around the cursor, drag-pan, tweened view changes,
 * live "motion" particles along active links and neighbourhood highlighting.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    BarChart3, BookOpen, Boxes, Building2, Calculator, Factory, GitBranch, Handshake, KanbanSquare, Newspaper, Radar, Server, Shield, Sparkles, Ticket, Users, Warehouse, Wrench, type LucideIcon,
} from "lucide-react";
import { LINK_COLOR, hash01, type DeckLink, type DeckModel, type DeckNode, type Layout, type Pt } from "../../lib/deckGraph";

type Xf = { k: number; x: number; y: number };

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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

/** Tween node positions whenever the target layout changes. */
function useTween(target: Map<string, Pt>, enabled: boolean) {
    const [cur, setCur] = useState(target);
    const curRef = useRef(target);
    useEffect(() => {
        if (!enabled) {
            curRef.current = target;
            setCur(target);
            return;
        }
        const from = curRef.current;
        const t0 = performance.now();
        let raf = 0;
        const step = (t: number) => {
            const p = Math.min(1, (t - t0) / 650);
            const e = ease(p);
            const m = new Map<string, Pt>();
            for (const [id, b] of target) {
                const a = from.get(id) ?? { x: 0, y: 0 };
                m.set(id, { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e });
            }
            curRef.current = m;
            setCur(m);
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target, enabled]);
    return cur;
}

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
    ringView: boolean;
}

export function DeckGraphSvg({ model, layout, visible, names, motion, search, selected, onSelect, onIsolate, fitNonce, ringView }: GraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [xf, setXf] = useState<Xf>({ k: 1, x: 0, y: 0 });
    const [hover, setHover] = useState<string | null>(null);
    const pos = useTween(layout.pos, motion);
    const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean; bg: boolean } | null>(null);

    // View box from the layout's bounds (stable per layout).
    const vb = useMemo(() => {
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
    }, [layout]);

    useEffect(() => setXf({ k: 1, x: 0, y: 0 }), [fitNonce, layout]);

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
        drag.current = { sx: p.x, sy: p.y, ox: xf.x, oy: xf.y, moved: false, bg: (e.target as Element).getAttribute("data-bg") === "1" };
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d) return;
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
    };

    const focus = hover ?? selected;
    const near = focus ? model.adj.get(focus) ?? new Set<string>() : null;
    const q = search.trim().toLowerCase();
    const match = (n: DeckNode) => !q || n.label.toLowerCase().includes(q) || n.sub.toLowerCase().includes(q);
    const dimmed = (n: DeckNode) => (focus ? n.id !== focus && !near!.has(n.id) : false) || (!!q && !match(n));
    const k = xf.k;
    const nodeScale = 1 / Math.sqrt(k);

    const drawLinks = model.links.filter((l) => visible.has(l.s) && visible.has(l.t) && !(ringView && l.kind === "member") && !(layout.curved && l.kind === "member"));

    const linkPath = (l: DeckLink) => {
        const a = pos.get(l.s);
        const b = pos.get(l.t);
        if (!a || !b) return null;
        if (layout.curved) return `M${a.x},${a.y} Q${(a.x + b.x) * 0.12},${(a.y + b.y) * 0.12} ${b.x},${b.y}`;
        return `M${a.x},${a.y} L${b.x},${b.y}`;
    };

    const hovered = hover ? model.byId.get(hover) : undefined;
    const hp = hover ? pos.get(hover) : undefined;

    return (
        <svg
            ref={svgRef}
            viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
            className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
        >
            <defs>
                <radialGradient id="deck-core-glow">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                    <stop offset="55%" stopColor="#c2410c" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="deck-bg" cx="50%" cy="50%" r="60%">
                    <stop offset="0%" stopColor="#1e293b" stopOpacity="0.45" />
                    <stop offset="70%" stopColor="#0b0e13" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                </radialGradient>
            </defs>
            <rect data-bg="1" x={vb.x - 2000} y={vb.y - 2000} width={vb.w + 4000} height={vb.h + 4000} fill="url(#deck-bg)" />
            <g transform={`translate(${xf.x} ${xf.y}) scale(${k})`}>
                {/* Guides */}
                {layout.guides.map((g, i) => (
                    <g key={i}>
                        <circle r={g.r} fill="none" stroke={g.strong ? "rgba(148,163,184,0.22)" : "rgba(148,163,184,0.09)"} strokeWidth={g.strong ? 1.2 : 1} strokeDasharray={g.dash ? "2 6" : undefined} pointerEvents="none">
                            {motion && g.dash && <animateTransform attributeName="transform" type="rotate" from="0" to={i % 2 ? "-360" : "360"} dur={`${160 + i * 40}s`} repeatCount="indefinite" />}
                        </circle>
                        {ringView && g.strong && (
                            <g pointerEvents="none" opacity={0.4}>
                                {motion && <animateTransform attributeName="transform" type="rotate" from="0" to={i % 2 ? "360" : "-360"} dur={`${240 + i * 30}s`} repeatCount="indefinite" />}
                                {Array.from({ length: 120 }, (_, t) => {
                                    const a = (t / 120) * Math.PI * 2;
                                    const r2 = g.r + (t % 10 === 0 ? 8 : 3);
                                    return <line key={t} x1={Math.cos(a) * g.r} y1={Math.sin(a) * g.r} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2} stroke="#64748b" strokeWidth={0.8} />;
                                })}
                            </g>
                        )}
                    </g>
                ))}
                {ringView && layout.guides.length > 0 && (
                    <circle r={Math.max(...layout.guides.map((g) => g.r)) + 16} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth={4} strokeDasharray="60 14 4 14" pointerEvents="none">
                        {motion && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="320s" repeatCount="indefinite" />}
                    </circle>
                )}

                {/* Core particle cloud */}
                {visible.has("core") && pos.get("core") && (
                    <g transform={`translate(${pos.get("core")!.x} ${pos.get("core")!.y})`}>
                        <CoreCloud motion={motion} radius={ringView ? 92 : 80} />
                    </g>
                )}

                {/* Links */}
                <g fill="none">
                    {drawLinks.map((l, i) => {
                        const d = linkPath(l);
                        if (!d) return null;
                        const on = focus ? l.s === focus || l.t === focus : false;
                        const off = focus ? !on : false;
                        const base = l.kind === "core" ? 0.07 : l.kind === "member" ? 0.05 : 0.14;
                        return <path key={i} d={d} stroke={LINK_COLOR[l.kind]} strokeOpacity={on ? 0.85 : off ? 0.03 : l.live ? 0.5 : base} strokeWidth={(on ? 1.6 : 0.8) / Math.sqrt(k)} pointerEvents="none" />;
                    })}
                </g>

                {/* Motion particles on live links */}
                {motion &&
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
                    if (!visible.has(n.id)) return null;
                    const p = pos.get(n.id);
                    if (!p) return null;
                    const dim = dimmed(n);
                    const isSel = selected === n.id;
                    return (
                        <g
                            key={n.id}
                            transform={`translate(${p.x} ${p.y})`}
                            opacity={dim ? 0.12 : 1}
                            className="cursor-pointer"
                            onPointerEnter={() => setHover(n.id)}
                            onPointerLeave={() => setHover((h) => (h === n.id ? null : h))}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (n.kind === "area") onIsolate("area", n.areaId ?? "");
                                else onSelect(isSel ? null : n.id);
                            }}
                        >
                            <g transform={n.kind === "area" || n.kind === "core" ? `scale(${1 / Math.max(1, k * 0.8)})` : `scale(${nodeScale})`}>
                                <NodeGlyph n={n} motion={motion} selected={isSel} />
                            </g>
                            {(names && NAMED.has(n.kind) && (n.kind !== "routine" || k > 1.3 || ringView)) || (k > 2.4 && (n.kind === "memory" || n.kind === "skill" || n.kind === "playbook")) ? (
                                <NodeLabel n={n} p={p} k={k} ringView={ringView} />
                            ) : null}
                        </g>
                    );
                })}

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
                        <rect x={-(l.text.length * 3.9 + (l.count !== undefined ? 16 : 0)) - 6} y={-8} width={(l.text.length * 3.9 + (l.count !== undefined ? 16 : 0)) * 2 + 12} height={16} rx={2} fill="#0b0e13" fillOpacity={0.8} />
                        <text textAnchor="middle" dy={3.5} fontSize={9.5} letterSpacing={2} fill={l.color} fontWeight={600} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                            {l.text}
                            {l.count !== undefined ? ` ${l.count}` : ""}
                        </text>
                    </g>
                ))}

                {/* Hover tooltip */}
                {hovered && hp && (
                    <g transform={`translate(${hp.x} ${hp.y}) scale(${1 / k})`} pointerEvents="none">
                        <g transform="translate(14 -14)">
                            <rect x={0} y={-30} width={Math.max(hovered.label.length, Math.min(hovered.sub.length, 60)) * 6.1 + 18} height={36} rx={6} fill="#020617" fillOpacity={0.95} stroke={hovered.color} strokeOpacity={0.6} />
                            <text x={9} y={-16} fontSize={11} fontWeight={700} fill="#f8fafc">
                                {hovered.label.length > 60 ? `${hovered.label.slice(0, 58)}…` : hovered.label}
                            </text>
                            <text x={9} y={-3} fontSize={9.5} fill="#94a3b8">
                                {hovered.sub.length > 60 ? `${hovered.sub.slice(0, 58)}…` : hovered.sub}
                            </text>
                        </g>
                    </g>
                )}
            </g>
        </svg>
    );
}

function NodeGlyph({ n, motion, selected }: { n: DeckNode; motion: boolean; selected: boolean }) {
    const ring = selected ? <circle r={n.kind === "app" ? 18 : n.kind === "agent" ? 15 : 8} fill="none" stroke="#f8fafc" strokeWidth={1.4} strokeDasharray="3 2" /> : null;
    const ping = (r: number, color: string) =>
        motion ? <circle r={r} fill="none" stroke={color} strokeWidth={1.4} className="animate-ping" style={{ transformBox: "fill-box", transformOrigin: "center" }} /> : <circle r={r} fill="none" stroke={color} strokeWidth={1.4} strokeOpacity={0.6} />;
    switch (n.kind) {
        case "core":
            return (
                <g>
                    <rect x={-42} y={-10} width={84} height={20} rx={2} fill="#0b0e13" fillOpacity={0.92} stroke="#fdba74" strokeOpacity={0.45} />
                    <text textAnchor="middle" dy={3.4} fontSize={9.5} fontWeight={700} letterSpacing={1.4} fill="#f8fafc" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                        {n.label}
                    </text>
                </g>
            );
        case "area": {
            const text = `${n.label.toUpperCase()} ${n.sub.split(" ")[0]}`;
            const w = text.length * 6 + 8;
            return (
                <g>
                    <rect x={10} y={-8} width={w} height={16} rx={2} fill="#0b0e13" fillOpacity={0.82} />
                    <circle r={8.5} fill="#0b0e13" stroke={n.color} strokeWidth={1.2} />
                    <circle r={6.5} fill={n.color} />
                    <text textAnchor="middle" dy={3.2} fontSize={8.5} fontWeight={800} fill="#0b0e13" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                        {n.label.slice(0, 1).toUpperCase()}
                    </text>
                    <text x={14} dy={3.4} fontSize={9.5} fontWeight={600} letterSpacing={0.8} fill="#e2e8f0" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
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
                    <circle r={6} fill="#0b1020" stroke={n.color} strokeWidth={2} strokeDasharray={n.status === "disabled" ? "2 2" : undefined} />
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
                    <circle r={11} fill="#0b0e13" stroke={n.live ? n.color : "#94a3b8"} strokeOpacity={n.live ? 1 : 0.75} strokeWidth={1.3} />
                    <Icon x={-6} y={-6} width={12} height={12} color={n.live ? n.color : "#e2e8f0"} strokeWidth={1.8} />
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

function NodeLabel({ n, p, k, ringView }: { n: DeckNode; p: Pt; k: number; ringView: boolean }) {
    const small = n.kind === "memory" || n.kind === "skill" || n.kind === "playbook" || n.kind === "routine";
    const fs = (small ? 8 : n.kind === "app" ? 9.5 : 9) / Math.max(1, k * 0.85);
    const text = n.label.length > 26 ? `${n.label.slice(0, 24)}…` : n.label;
    if (ringView && (n.kind === "app" || n.kind === "routine" || n.kind === "workflow")) {
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
                fill={n.kind === "app" ? "#cbd5e1" : "#94a3b8"}
                pointerEvents="none"
                style={{ paintOrder: "stroke" }}
                stroke="#050816"
                strokeWidth={3 / k}
            >
                {text}
            </text>
        );
    }
    const dy = (n.kind === "agent" ? 22 : n.kind === "goal" ? 19 : 12) / Math.sqrt(k);
    return (
        <text y={dy} textAnchor="middle" fontSize={fs} fill={n.kind === "agent" ? "#e2e8f0" : "#94a3b8"} fontWeight={n.kind === "agent" ? 700 : 500} pointerEvents="none" style={{ paintOrder: "stroke" }} stroke="#050816" strokeWidth={3 / k}>
            {text}
        </text>
    );
}
