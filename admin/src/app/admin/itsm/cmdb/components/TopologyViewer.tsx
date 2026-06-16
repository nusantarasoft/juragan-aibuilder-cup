"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Input, Checkbox, Tag, Badge } from "antd";
import { AimOutlined, SearchOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { usePreferencesStore } from "@/store/usePreferencesStore";

/* ── Colour Maps ────────────────────────────────────────────── */
const CLASS_COLORS: Record<string, string> = {
    server: "#3b82f6", database: "#10b981", application: "#8b5cf6",
    network: "#f97316", storage: "#06b6d4", service: "#ec4899",
};
const CLASS_ICONS: Record<string, string> = {
    server: "🖥", database: "🗄", application: "⚙",
    network: "🌐", storage: "💾", service: "🔗",
};
const REL_COLORS: Record<string, string> = {
    depends_on: "#f59e0b", runs_on: "#3b82f6", connects_to: "#10b981", hosts: "#8b5cf6",
};
const STATUS_DOT: Record<string, string> = { active: "#10b981", inactive: "#6b7280", maintenance: "#f59e0b" };

/* ── Types ──────────────────────────────────────────────────── */
interface TopologyViewerProps {
    configItems: any[];
    relationships: any[];
    onSelectCI?: (ciId: string) => void;
}
interface Node { id: string; x: number; y: number; vx: number; vy: number; r: number; ci: any; }
interface Edge { source: string; target: string; type: string; }

/* ── Force‑directed helpers ─────────────────────────────────── */
function buildGraph(items: any[], rels: any[]): { nodes: Node[]; edges: Edge[] } {
    const degMap = new Map<string, number>();
    rels.forEach(r => { degMap.set(r.sourceId, (degMap.get(r.sourceId) || 0) + 1); degMap.set(r.targetId, (degMap.get(r.targetId) || 0) + 1); });
    const nodes: Node[] = items.map((ci, i) => {
        const angle = (2 * Math.PI * i) / items.length;
        const spread = Math.min(items.length * 18, 220);
        return { id: ci.id, x: 400 + Math.cos(angle) * spread, y: 250 + Math.sin(angle) * spread, vx: 0, vy: 0, r: Math.max(16, Math.min(32, 14 + (degMap.get(ci.id) || 0) * 4)), ci };
    });
    const edges: Edge[] = rels.map(r => ({ source: r.sourceId, target: r.targetId, type: r.type || "depends_on" }));
    return { nodes, edges };
}

function simulate(nodes: Node[], edges: Edge[], iterations: number) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    for (let iter = 0; iter < iterations; iter++) {
        const alpha = 1 - iter / iterations;
        // Repulsion
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = (800 * alpha) / (dist * dist);
                const fx = (dx / dist) * force, fy = (dy / dist) * force;
                nodes[i].vx -= fx; nodes[i].vy -= fy;
                nodes[j].vx += fx; nodes[j].vy += fy;
            }
        }
        // Attraction along edges
        edges.forEach(e => {
            const s = nodeMap.get(e.source), t = nodeMap.get(e.target);
            if (!s || !t) return;
            const dx = t.x - s.x, dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (dist - 100) * 0.04 * alpha;
            const fx = (dx / dist) * force, fy = (dy / dist) * force;
            s.vx += fx; s.vy += fy;
            t.vx -= fx; t.vy -= fy;
        });
        // Center gravity
        nodes.forEach(n => { n.vx += (400 - n.x) * 0.01 * alpha; n.vy += (250 - n.y) * 0.01 * alpha; });
        // Apply velocity
        nodes.forEach(n => { n.x += n.vx * 0.6; n.y += n.vy * 0.6; n.vx *= 0.85; n.vy *= 0.85; });
    }
}

/* ── Component ──────────────────────────────────────────────── */
export default function TopologyViewer({ configItems, relationships, onSelectCI }: TopologyViewerProps) {
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === "dark";

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; ci: any } | null>(null);
    const [search, setSearch] = useState("");
    const [classFilters, setClassFilters] = useState<string[]>(Object.keys(CLASS_COLORS));
    const [statusFilter, setStatusFilter] = useState<string[]>(["active", "inactive", "maintenance"]);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const dragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    /* ── Filtered items ────────────────────────────────────── */
    const filtered = useMemo(() => {
        const lc = search.toLowerCase();
        return configItems.filter(ci =>
            classFilters.includes(ci.ciClass || ci.ci_class || "server") &&
            statusFilter.includes(ci.status || "active") &&
            (!lc || (ci.name || "").toLowerCase().includes(lc))
        );
    }, [configItems, classFilters, statusFilter, search]);

    const filteredIds = useMemo(() => new Set(filtered.map(ci => ci.id)), [filtered]);
    const filteredRels = useMemo(() => relationships.filter(r => filteredIds.has(r.sourceId) && filteredIds.has(r.targetId)), [relationships, filteredIds]);

    /* ── Graph layout (computed once per filter change) ───── */
    const { nodes, edges } = useMemo(() => {
        const g = buildGraph(filtered, filteredRels);
        simulate(g.nodes, g.edges, 120);
        return g;
    }, [filtered, filteredRels]);

    const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

    /* ── Stats ──────────────────────────────────────────────── */
    const classBreakdown = useMemo(() => {
        const m: Record<string, number> = {};
        filtered.forEach(ci => { const c = ci.ciClass || ci.ci_class || "server"; m[c] = (m[c] || 0) + 1; });
        return m;
    }, [filtered]);

    /* ── Canvas draw ────────────────────────────────────────── */
    const draw = useCallback(() => {
        const cvs = canvasRef.current; if (!cvs) return;
        const ctx = cvs.getContext("2d"); if (!ctx) return;
        const w = cvs.width, h = cvs.height;
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(pan.x + w / 2, pan.y + h / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-w / 2, -h / 2);

        const isSelection = selectedId !== null;

        // Draw edges
        edges.forEach(e => {
            const s = nodeMap.get(e.source), t = nodeMap.get(e.target);
            if (!s || !t) return;
            const connected = !isSelection || e.source === selectedId || e.target === selectedId;
            ctx.globalAlpha = connected ? 0.7 : 0.1;
            ctx.strokeStyle = REL_COLORS[e.type] || "#6b7280";
            ctx.lineWidth = connected ? 2 : 1;
            ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke();
            // Arrowhead
            const angle = Math.atan2(t.y - s.y, t.x - s.x);
            const aLen = 8, ax = t.x - Math.cos(angle) * t.r, ay = t.y - Math.sin(angle) * t.r;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - aLen * Math.cos(angle - 0.4), ay - aLen * Math.sin(angle - 0.4));
            ctx.lineTo(ax - aLen * Math.cos(angle + 0.4), ay - aLen * Math.sin(angle + 0.4));
            ctx.closePath();
            ctx.fillStyle = REL_COLORS[e.type] || "#6b7280"; ctx.fill();
        });

        ctx.globalAlpha = 1;

        // Draw nodes
        nodes.forEach(n => {
            const ciClass = n.ci.ciClass || n.ci.ci_class || "server";
            const color = CLASS_COLORS[ciClass] || "#6b7280";
            const isSelected = n.id === selectedId;
            const isHovered = n.id === hoveredId;
            const connected = !isSelection || isSelected || edges.some(e => (e.source === selectedId && e.target === n.id) || (e.target === selectedId && e.source === n.id));
            ctx.globalAlpha = connected ? 1 : 0.2;

            // Glow
            if (isSelected || isHovered) {
                ctx.shadowColor = color;
                ctx.shadowBlur = isSelected ? 18 : 10;
            }

            // Node body
            ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fillStyle = isDark ? `${color}33` : `${color}22`;
            ctx.fill();
            ctx.strokeStyle = isSelected ? themeColor : color;
            ctx.lineWidth = isSelected ? 3 : 1.5;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Icon
            ctx.font = `${n.r * 0.7}px sans-serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillStyle = color;
            ctx.fillText(CLASS_ICONS[ciClass] || "●", n.x, n.y);

            // Status dot
            const status = n.ci.status || "active";
            ctx.beginPath(); ctx.arc(n.x + n.r * 0.65, n.y - n.r * 0.65, 4, 0, Math.PI * 2);
            ctx.fillStyle = STATUS_DOT[status] || "#6b7280"; ctx.fill();
            ctx.strokeStyle = isDark ? "#1a1a2e" : "#ffffff"; ctx.lineWidth = 1.5; ctx.stroke();

            // Label
            ctx.font = "10px Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
            ctx.fillStyle = isDark ? "#cbd5e1" : "#374151";
            const label = (n.ci.name || "").length > 14 ? (n.ci.name || "").slice(0, 12) + "…" : (n.ci.name || "");
            ctx.fillText(label, n.x, n.y + n.r + 4);
        });

        ctx.globalAlpha = 1;
        ctx.restore();
    }, [nodes, edges, nodeMap, selectedId, hoveredId, zoom, pan, isDark, themeColor]);

    useEffect(() => { const id = requestAnimationFrame(draw); return () => cancelAnimationFrame(id); }, [draw]);

    /* ── Hit‑test ────────────────────────────────────────────── */
    const hitTest = useCallback((cx: number, cy: number) => {
        const cvs = canvasRef.current; if (!cvs) return null;
        const w = cvs.width, h = cvs.height;
        const wx = (cx - pan.x - w / 2) / zoom + w / 2;
        const wy = (cy - pan.y - h / 2) / zoom + h / 2;
        for (const n of nodes) {
            const dx = wx - n.x, dy = wy - n.y;
            if (dx * dx + dy * dy <= n.r * n.r) return n;
        }
        return null;
    }, [nodes, zoom, pan]);

    /* ── Mouse handlers ─────────────────────────────────────── */
    const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
        const hit = hitTest(cx, cy);
        if (hit) { setSelectedId(prev => prev === hit.id ? null : hit.id); onSelectCI?.(hit.id); }
        else { dragging.current = true; lastMouse.current = { x: e.clientX, y: e.clientY }; }
    }, [hitTest, onSelectCI]);

    const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (dragging.current) {
            setPan(p => ({ x: p.x + e.clientX - lastMouse.current.x, y: p.y + e.clientY - lastMouse.current.y }));
            lastMouse.current = { x: e.clientX, y: e.clientY }; return;
        }
        const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
        const hit = hitTest(cx, cy);
        setHoveredId(hit?.id ?? null);
        if (hit) { setTooltip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10, ci: hit.ci }); }
        else { setTooltip(null); }
    }, [hitTest]);

    const onMouseUp = useCallback(() => { dragging.current = false; }, []);
    const onWheel = useCallback((e: React.WheelEvent) => { e.preventDefault(); setZoom(z => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001))); }, []);
    const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); setSelectedId(null); }, []);

    /* ── Resize observer ────────────────────────────────────── */
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const resize = () => {
            const cvs = canvasRef.current, ctr = containerRef.current;
            if (!cvs || !ctr) return;
            cvs.width = ctr.clientWidth;
            cvs.height = 500;
            draw();
        };
        resize();
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, [draw]);

    /* ── Glass style ────────────────────────────────────────── */
    const glass: React.CSSProperties = {
        background: isDark ? "rgba(15,15,23,0.55)" : "rgba(255,255,255,0.65)",
        backdropFilter: "blur(12px)", border: isDark ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12, padding: 10,
    };
    const panelGlass: React.CSSProperties = {
        ...glass, position: "absolute" as const, top: 10, right: 10, zIndex: 5, maxWidth: 220, fontSize: 11,
    };

    return (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            {/* Stats Bar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                {[
                    { label: "CIs", value: filtered.length, color: themeColor },
                    { label: "Relationships", value: filteredRels.length, color: "#f59e0b" },
                    ...Object.entries(classBreakdown).map(([k, v]) => ({ label: k, value: v, color: CLASS_COLORS[k] || "#6b7280" })),
                ].map((s, i) => (
                    <Tag key={i} style={{ margin: 0, borderRadius: 8, border: "none", background: isDark ? `${s.color}18` : `${s.color}14`, color: s.color, fontWeight: 600, fontSize: 11 }}>
                        {s.label}: {s.value}
                    </Tag>
                ))}
            </div>

            {/* Canvas container */}
            <div ref={containerRef} style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: isDark ? "1px solid rgba(139,92,246,0.12)" : "1px solid rgba(0,0,0,0.08)", background: isDark ? "#0d0d1a" : "#f8fafc" }}>
                <canvas ref={canvasRef} height={500} style={{ display: "block", cursor: dragging.current ? "grabbing" : hoveredId ? "pointer" : "grab" }}
                    onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={() => { dragging.current = false; setTooltip(null); setHoveredId(null); }}
                    onWheel={onWheel} />

                {/* Tooltip */}
                {tooltip && (
                    <div style={{ ...glass, position: "absolute", left: tooltip.x, top: tooltip.y, zIndex: 10, pointerEvents: "none", padding: "8px 12px", fontSize: 11, minWidth: 150 }}>
                        <div style={{ fontWeight: 700, marginBottom: 3, color: isDark ? "#e2e8f0" : "#1e293b" }}>{tooltip.ci.name}</div>
                        <div style={{ color: isDark ? "#94a3b8" : "#64748b" }}>Class: <span style={{ color: CLASS_COLORS[tooltip.ci.ciClass || tooltip.ci.ci_class] || "#6b7280" }}>{tooltip.ci.ciClass || tooltip.ci.ci_class || "—"}</span></div>
                        <div style={{ color: isDark ? "#94a3b8" : "#64748b" }}>Status: {tooltip.ci.status || "—"}</div>
                        <div style={{ color: isDark ? "#94a3b8" : "#64748b" }}>Env: {tooltip.ci.environment || "—"}</div>
                        <div style={{ color: isDark ? "#94a3b8" : "#64748b" }}>IP: {tooltip.ci.ip_address || tooltip.ci.ipAddress || "—"}</div>
                    </div>
                )}

                {/* Control panel */}
                <div style={panelGlass}>
                    <Input size="small" prefix={<SearchOutlined style={{ color: isDark ? "#64748b" : "#9ca3af" }} />}
                        placeholder="Search CI…" value={search} onChange={e => setSearch(e.target.value)}
                        style={{ marginBottom: 8, borderRadius: 6, background: "transparent", fontSize: 11 }} allowClear />

                    <div style={{ fontSize: 10, fontWeight: 600, color: isDark ? "#94a3b8" : "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>CI Class</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
                        {Object.entries(CLASS_COLORS).map(([cls, clr]) => (
                            <Checkbox key={cls} checked={classFilters.includes(cls)} onChange={e => setClassFilters(prev => e.target.checked ? [...prev, cls] : prev.filter(c => c !== cls))}
                                style={{ fontSize: 11, color: isDark ? "#cbd5e1" : "#374151" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: clr, display: "inline-block" }} />
                                    {cls}
                                </span>
                            </Checkbox>
                        ))}
                    </div>

                    <div style={{ fontSize: 10, fontWeight: 600, color: isDark ? "#94a3b8" : "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Status</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
                        {["active", "inactive", "maintenance"].map(s => (
                            <Checkbox key={s} checked={statusFilter.includes(s)} onChange={e => setStatusFilter(prev => e.target.checked ? [...prev, s] : prev.filter(x => x !== s))}
                                style={{ fontSize: 11, color: isDark ? "#cbd5e1" : "#374151" }}>
                                <Badge color={STATUS_DOT[s]} text={<span style={{ fontSize: 11, color: isDark ? "#cbd5e1" : "#374151" }}>{s}</span>} />
                            </Checkbox>
                        ))}
                    </div>

                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={resetView}
                        style={{ width: "100%", padding: "4px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#fff", background: `linear-gradient(135deg, ${themeColor}, #6366f1)` }}>
                        <AimOutlined /> Reset View
                    </motion.button>
                </div>

                {/* Legend */}
                <div style={{ ...glass, position: "absolute", bottom: 10, left: 10, zIndex: 5, display: "flex", gap: 14, fontSize: 10 }}>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: 3, color: isDark ? "#cbd5e1" : "#374151" }}>Classes</div>
                        {Object.entries(CLASS_COLORS).map(([k, v]) => (
                            <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, color: isDark ? "#94a3b8" : "#64748b" }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: v, display: "inline-block" }} />{k}
                            </div>
                        ))}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: 3, color: isDark ? "#cbd5e1" : "#374151" }}>Relations</div>
                        {Object.entries(REL_COLORS).map(([k, v]) => (
                            <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, color: isDark ? "#94a3b8" : "#64748b" }}>
                                <span style={{ width: 14, height: 2, background: v, display: "inline-block", borderRadius: 1 }} />{k.replace(/_/g, " ")}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
