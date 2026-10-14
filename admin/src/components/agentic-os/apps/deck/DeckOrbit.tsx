"use client";

/**
 * Command Deck — 3D ORBIT view. Memory items form a globe (one patch per
 * area), the core sits inside as an orange particle nebula with the skills,
 * agents orbit just under the surface, applications ride an equatorial ring
 * and Pulse (routines, workflows, runs) hangs below. Instanced meshes per
 * kind (cheap), hover tooltip, click to select, auto-rotation with motion.
 */

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { LINK_COLOR, hash01, type DeckModel, type DeckNode, type NodeKind } from "../../lib/deckGraph";

const GLOBE = 3;
const APP_RING = 4.5;
const SIZE: Record<NodeKind, number> = { core: 0.3, skill: 0.035, playbook: 0.045, area: 0.11, memory: 0.042, goal: 0.09, agent: 0.11, routine: 0.09, workflow: 0.1, run: 0.035, app: 0.15 };

/** n points evenly spread on the unit sphere. */
function fibonacci(n: number): THREE.Vector3[] {
    const out: THREE.Vector3[] = [];
    const g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
        const y = 1 - ((i + 0.5) / Math.max(1, n)) * 2;
        const r = Math.sqrt(1 - y * y);
        out.push(new THREE.Vector3(Math.cos(i * g) * r, y, Math.sin(i * g) * r));
    }
    return out;
}

function layoutGlobe(model: DeckModel): Map<string, THREE.Vector3> {
    const pos = new Map<string, THREE.Vector3>();
    pos.set("core", new THREE.Vector3());
    const of = (k: NodeKind) => model.nodes.filter((n) => n.kind === k);

    // Skills + playbooks: inside the nebula.
    for (const n of [...of("skill"), ...of("playbook")]) {
        const d = new THREE.Vector3(hash01(n.id, 1) * 2 - 1, hash01(n.id, 2) * 2 - 1, hash01(n.id, 3) * 2 - 1).normalize();
        pos.set(n.id, d.multiplyScalar(0.25 + 0.6 * Math.cbrt(hash01(n.id, 4))));
    }

    // Memory + goals: one patch per area on the globe (greedy nearest assignment).
    const surface = model.nodes.filter((n) => n.kind === "memory" || n.kind === "goal");
    const pts = fibonacci(surface.length);
    const free = new Set(pts.map((_, i) => i));
    const areaDirs = fibonacci(Math.max(1, model.areas.length));
    const byArea = model.areas
        .map((a, i) => ({ a, dir: areaDirs[i], ids: surface.filter((n) => n.areaId === a.id).map((n) => n.id) }))
        .sort((x, y) => y.ids.length - x.ids.length);
    for (const grp of byArea) {
        const ranked = [...free].sort((i, j) => pts[j].dot(grp.dir) - pts[i].dot(grp.dir));
        grp.ids.forEach((id, k) => {
            const idx = ranked[k];
            if (idx === undefined) return;
            free.delete(idx);
            pos.set(id, pts[idx].clone().multiplyScalar(GLOBE));
        });
        pos.set(`ar:${grp.a.id}`, grp.dir.clone().multiplyScalar(GLOBE + 0.32));
    }
    const rest = [...free];
    for (const n of surface) if (!pos.has(n.id)) pos.set(n.id, pts[rest.shift() ?? 0].clone().multiplyScalar(GLOBE));

    // Agents: an inner shell.
    const agents = of("agent");
    fibonacci(agents.length).forEach((d, i) => pos.set(agents[i].id, d.multiplyScalar(1.7)));

    // Applications: equatorial ring.
    const apps = of("app");
    apps.forEach((n, i) => {
        const a = (i / Math.max(1, apps.length)) * Math.PI * 2;
        pos.set(n.id, new THREE.Vector3(Math.cos(a) * APP_RING, 0, Math.sin(a) * APP_RING));
    });

    // Pulse: a small ring hanging under the globe; runs scattered just below it.
    const pulse = [...of("routine"), ...of("workflow")];
    pulse.forEach((n, i) => {
        const a = (i / Math.max(1, pulse.length)) * Math.PI * 2 + 0.4;
        pos.set(n.id, new THREE.Vector3(Math.cos(a) * 1.3, -GLOBE - 0.75, Math.sin(a) * 1.3));
    });
    for (const r of of("run")) {
        const t = [...(model.adj.get(r.id) ?? [])].map((id) => pos.get(id)).find(Boolean);
        const base = t && t.y < -GLOBE ? t : new THREE.Vector3(0, -GLOBE - 0.75, 0);
        pos.set(r.id, new THREE.Vector3(base.x + (hash01(r.id, 1) - 0.5) * 0.7, base.y - 0.25 - hash01(r.id, 2) * 0.35, base.z + (hash01(r.id, 3) - 0.5) * 0.7));
    }

    for (const n of model.nodes) if (!pos.has(n.id)) pos.set(n.id, new THREE.Vector3((hash01(n.id, 1) - 0.5) * 2, (hash01(n.id, 2) - 0.5) * 2, (hash01(n.id, 3) - 0.5) * 2));
    return pos;
}

function KindInstances({ nodes, pos, kind, visible, selected, onSelect, onHover }: {
    nodes: DeckNode[];
    pos: Map<string, THREE.Vector3>;
    kind: NodeKind;
    visible: Set<string>;
    selected: string | null;
    onSelect: (id: string | null) => void;
    onHover: (id: string | null) => void;
}) {
    const ref = useRef<THREE.InstancedMesh>(null);
    const list = useMemo(() => nodes.filter((n) => n.kind === kind && visible.has(n.id)), [nodes, kind, visible]);
    useLayoutEffect(() => {
        const mesh = ref.current;
        if (!mesh) return;
        const m = new THREE.Matrix4();
        const c = new THREE.Color();
        list.forEach((n, i) => {
            const p = pos.get(n.id) ?? new THREE.Vector3();
            const s = SIZE[kind] * (selected === n.id ? 1.8 : n.live ? 1.35 : 1);
            m.compose(p, new THREE.Quaternion(), new THREE.Vector3(s, s, s));
            mesh.setMatrixAt(i, m);
            mesh.setColorAt(i, c.set(n.color));
        });
        mesh.count = list.length;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
    }, [list, pos, kind, selected]);
    if (!list.length) return null;
    const ringy = kind === "routine" || kind === "app";
    return (
        <instancedMesh
            ref={ref}
            args={[undefined, undefined, Math.max(1, list.length)]}
            onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                if (e.instanceId !== undefined && list[e.instanceId]) onSelect(list[e.instanceId].id);
            }}
            onPointerMove={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                if (e.instanceId !== undefined && list[e.instanceId]) onHover(list[e.instanceId].id);
            }}
            onPointerOut={() => onHover(null)}
        >
            {kind === "workflow" ? <octahedronGeometry args={[1, 0]} /> : kind === "goal" ? <tetrahedronGeometry args={[1, 0]} /> : ringy ? <torusGeometry args={[1, 0.22, 8, 24]} /> : <sphereGeometry args={[1, 10, 8]} />}
            <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
    );
}

/** Orange nebula at the centre (the core + skills). */
function CoreNebula({ motion }: { motion: boolean }) {
    const ref = useRef<THREE.Points>(null);
    const geo = useMemo(() => {
        const n = 1400;
        const p = new Float32Array(n * 3);
        const c = new Float32Array(n * 3);
        const col = new THREE.Color();
        const palette = ["#fb923c", "#f97316", "#fdba74", "#ea580c", "#fed7aa"];
        for (let i = 0; i < n; i++) {
            const k = `n${i}`;
            const d = new THREE.Vector3(hash01(k, 1) * 2 - 1, hash01(k, 2) * 2 - 1, hash01(k, 3) * 2 - 1).normalize();
            const r = 0.95 * Math.pow(hash01(k, 4), 0.6);
            p.set([d.x * r, d.y * r, d.z * r], i * 3);
            col.set(palette[Math.floor(hash01(k, 5) * palette.length)]);
            c.set([col.r, col.g, col.b], i * 3);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(p, 3));
        g.setAttribute("color", new THREE.BufferAttribute(c, 3));
        return g;
    }, []);
    useFrame((_, dt) => {
        if (motion && ref.current) ref.current.rotation.y += dt * 0.25;
    });
    return (
        <points ref={ref} geometry={geo}>
            <pointsMaterial size={0.035} vertexColors transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
        </points>
    );
}

function Links({ model, pos, visible, focus }: { model: DeckModel; pos: Map<string, THREE.Vector3>; visible: Set<string>; focus: string | null }) {
    const { all, hot } = useMemo(() => {
        const a: number[] = [];
        const ac: number[] = [];
        const h: number[] = [];
        const hc: number[] = [];
        const c = new THREE.Color();
        for (const l of model.links) {
            if (l.kind === "member" || !visible.has(l.s) || !visible.has(l.t)) continue;
            const p = pos.get(l.s);
            const q = pos.get(l.t);
            if (!p || !q) continue;
            c.set(LINK_COLOR[l.kind]);
            const isHot = focus ? l.s === focus || l.t === focus : !!l.live;
            const P = isHot ? h : a;
            const C = isHot ? hc : ac;
            P.push(p.x, p.y, p.z, q.x, q.y, q.z);
            C.push(c.r, c.g, c.b, c.r, c.g, c.b);
        }
        const mk = (P: number[], C: number[]) => {
            const g = new THREE.BufferGeometry();
            g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
            g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
            return g;
        };
        return { all: mk(a, ac), hot: mk(h, hc) };
    }, [model, pos, visible, focus]);
    return (
        <group>
            <lineSegments geometry={all}>
                <lineBasicMaterial vertexColors transparent opacity={focus ? 0.03 : 0.08} depthWrite={false} />
            </lineSegments>
            <lineSegments geometry={hot}>
                <lineBasicMaterial vertexColors transparent opacity={0.9} depthWrite={false} />
            </lineSegments>
        </group>
    );
}

function circle(r: number, plane: "xz" | "xy" | "yz", y = 0, n = 160): [number, number, number][] {
    return Array.from({ length: n + 1 }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const u = Math.cos(a) * r;
        const v = Math.sin(a) * r;
        return plane === "xz" ? [u, y, v] : plane === "xy" ? [u, v, 0] : [0, u, v];
    });
}

const LABELED = new Set<NodeKind>(["agent", "app", "workflow"]);
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export default function DeckOrbit({ model, visible, names, motion, selected, onSelect }: {
    model: DeckModel;
    visible: Set<string>;
    names: boolean;
    motion: boolean;
    selected: string | null;
    onSelect: (id: string | null) => void;
}) {
    const [hover, setHover] = useState<string | null>(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const pos = useMemo(() => layoutGlobe(model), [model.key]);
    const kinds = useMemo(() => [...new Set(model.nodes.map((n) => n.kind))].filter((k) => k !== "core" && k !== "area"), [model.nodes]);
    const focus = hover ?? selected;
    const hovered = hover ? model.byId.get(hover) : undefined;
    const core = model.byId.get("core");

    return (
        <Canvas camera={{ position: [0, 3.2, 10.5], fov: 45 }} dpr={[1, 1.75]} onPointerMissed={() => onSelect(null)} gl={{ antialias: true, alpha: true }}>
            <fog attach="fog" args={["#0b0e13", 11, 24]} />
            <OrbitControls enablePan enableDamping autoRotate={motion} autoRotateSpeed={0.45} minDistance={3} maxDistance={22} />

            {visible.has("core") && <CoreNebula motion={motion} />}
            {core && (
                <Html position={[0, 0, 0]} center zIndexRange={[25, 0]} style={{ pointerEvents: "none" }}>
                    <div style={{ fontFamily: MONO }} className="whitespace-nowrap border border-orange-300/40 bg-[#0b0e13]/90 px-2 py-0.5 text-[10px] font-bold tracking-[0.15em] text-white">
                        {core.label}
                    </div>
                </Html>
            )}

            {/* Globe guides + application ring */}
            <Line points={circle(GLOBE, "xz")} color="#94a3b8" lineWidth={1} transparent opacity={0.12} />
            <Line points={circle(GLOBE, "xy")} color="#94a3b8" lineWidth={1} transparent opacity={0.07} />
            <Line points={circle(GLOBE, "yz")} color="#94a3b8" lineWidth={1} transparent opacity={0.07} />
            <Line points={circle(APP_RING, "xz")} color="#cbd5e1" lineWidth={1.2} transparent opacity={0.35} />
            <Line points={circle(1.3, "xz", -GLOBE - 0.75)} color="#fb923c" lineWidth={1} transparent opacity={0.25} />

            <Links model={model} pos={pos} visible={visible} focus={focus} />
            {kinds.map((k) => (
                <KindInstances key={k} nodes={model.nodes} pos={pos} kind={k} visible={visible} selected={selected} onSelect={onSelect} onHover={setHover} />
            ))}

            {/* Area badges */}
            {model.nodes
                .filter((n) => n.kind === "area" && visible.has(n.id))
                .map((n) => (
                    <Html key={n.id} position={pos.get(n.id)!.toArray()} center zIndexRange={[22, 0]} style={{ pointerEvents: "none" }}>
                        <div style={{ fontFamily: MONO }} className="flex items-center gap-1 whitespace-nowrap bg-[#0b0e13]/75 pr-1.5 text-[10px] font-semibold tracking-wider text-slate-200">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black text-[#0b0e13]" style={{ background: n.color }}>
                                {n.label.slice(0, 1).toUpperCase()}
                            </span>
                            {n.label.toUpperCase()} {n.sub.split(" ")[0]}
                        </div>
                    </Html>
                ))}

            {names &&
                model.nodes
                    .filter((n) => LABELED.has(n.kind) && visible.has(n.id))
                    .map((n) => {
                        const p = pos.get(n.id)!;
                        return (
                            <Html key={n.id} position={[p.x, p.y + SIZE[n.kind] + 0.14, p.z]} center distanceFactor={9} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
                                <div style={{ fontFamily: MONO }} className="whitespace-nowrap bg-[#0b0e13]/60 px-1 text-[10px] text-slate-300">
                                    {n.label}
                                </div>
                            </Html>
                        );
                    })}

            {hovered && pos.get(hovered.id) && (
                <Html position={pos.get(hovered.id)!.toArray()} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
                    <div style={{ fontFamily: MONO }} className="ml-3 -mt-10 max-w-[260px] border bg-[#0b0e13]/95 px-2 py-1 shadow-xl" >
                        <div className="truncate text-[11px] font-bold text-white" style={{ color: hovered.color }}>{hovered.label}</div>
                        <div className="truncate text-[10px] text-slate-400">{hovered.sub}</div>
                    </div>
                </Html>
            )}
        </Canvas>
    );
}
