"use client";

/**
 * Command Deck — 3D ORBIT view. The rings model lifted into layered orbits:
 * apps below, memory & skills around the core, agents and Pulse above.
 * Instanced spheres per kind (cheap), click to open a card, hover tooltip,
 * auto-rotation when motion is on.
 */

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { LINK_COLOR, layoutRings, type DeckModel, type DeckNode, type NodeKind } from "../../lib/deckGraph";

const S = 1 / 90;
const HEIGHT: Record<NodeKind, number> = { core: 0, skill: 0.1, playbook: 0.1, area: 0.35, memory: 0.25, goal: 0.45, agent: 1.1, routine: 1.7, workflow: 1.75, run: 1.95, app: -0.9 };
const SIZE: Record<NodeKind, number> = { core: 0.42, skill: 0.035, playbook: 0.05, area: 0.09, memory: 0.045, goal: 0.11, agent: 0.17, routine: 0.09, workflow: 0.11, run: 0.035, app: 0.19 };
const RING_LEVELS: { r: number; y: number; color: string }[] = [
    { r: 0.2, y: 0.1, color: "#fb923c" },
    { r: 0.51, y: 0.25, color: "#e879f9" },
    { r: 0.6, y: 1.1, color: "#818cf8" },
    { r: 0.72, y: 1.7, color: "#fb923c" },
    { r: 0.9, y: -0.9, color: "#38bdf8" },
];

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
            {kind === "app" || kind === "workflow" ? <octahedronGeometry args={[1, 0]} /> : kind === "goal" ? <tetrahedronGeometry args={[1, 0]} /> : <sphereGeometry args={[1, 12, 10]} />}
            <meshStandardMaterial vertexColors={false} toneMapped={false} emissiveIntensity={0.6} roughness={0.4} metalness={0.1} />
        </instancedMesh>
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
                <lineBasicMaterial vertexColors transparent opacity={focus ? 0.04 : 0.13} depthWrite={false} />
            </lineSegments>
            <lineSegments geometry={hot}>
                <lineBasicMaterial vertexColors transparent opacity={0.9} depthWrite={false} />
            </lineSegments>
        </group>
    );
}

function circlePoints(r: number, y: number, n = 128): [number, number, number][] {
    return Array.from({ length: n + 1 }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return [Math.cos(a) * r, y, Math.sin(a) * r];
    });
}

const LABELED = new Set<NodeKind>(["agent", "app", "area", "workflow"]);

export default function DeckOrbit({ model, visible, names, motion, selected, onSelect }: {
    model: DeckModel;
    visible: Set<string>;
    names: boolean;
    motion: boolean;
    selected: string | null;
    onSelect: (id: string | null) => void;
}) {
    const [hover, setHover] = useState<string | null>(null);
    const pos = useMemo(() => {
        const flat = layoutRings(model).pos;
        const m = new Map<string, THREE.Vector3>();
        for (const n of model.nodes) {
            const p = flat.get(n.id) ?? { x: 0, y: 0 };
            m.set(n.id, new THREE.Vector3(p.x * S, HEIGHT[n.kind] ?? 0, p.y * S));
        }
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model.key]);
    const kinds = useMemo(() => [...new Set(model.nodes.map((n) => n.kind))].filter((k) => k !== "core"), [model.nodes]);
    const focus = hover ?? selected;
    const hovered = hover ? model.byId.get(hover) : undefined;

    return (
        <Canvas camera={{ position: [0, 6.5, 9.5], fov: 45 }} dpr={[1, 1.75]} onPointerMissed={() => onSelect(null)} gl={{ antialias: true, alpha: true }}>
            <fog attach="fog" args={["#050816", 10, 26]} />
            <ambientLight intensity={0.55} />
            <pointLight position={[0, 0.5, 0]} intensity={30} color="#a5b4fc" distance={14} />
            <directionalLight position={[5, 8, 4]} intensity={0.6} />
            <OrbitControls enablePan enableDamping autoRotate={motion} autoRotateSpeed={0.35} minDistance={3} maxDistance={22} />

            {/* Core */}
            <mesh
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect("core");
                }}
            >
                <sphereGeometry args={[SIZE.core, 32, 24]} />
                <meshStandardMaterial color="#818cf8" emissive="#6366f1" emissiveIntensity={1.4} toneMapped={false} />
            </mesh>
            <mesh>
                <sphereGeometry args={[SIZE.core * 1.9, 32, 24]} />
                <meshBasicMaterial color="#6366f1" transparent opacity={0.08} depthWrite={false} />
            </mesh>

            {RING_LEVELS.map((r) => (
                <Line key={r.r} points={circlePoints(r.r * 500 * S, r.y)} color={r.color} lineWidth={1} transparent opacity={0.25} />
            ))}

            <Links model={model} pos={pos} visible={visible} focus={focus} />
            {kinds.map((k) => (
                <KindInstances key={k} nodes={model.nodes} pos={pos} kind={k} visible={visible} selected={selected} onSelect={onSelect} onHover={setHover} />
            ))}

            {names &&
                model.nodes
                    .filter((n) => LABELED.has(n.kind) && visible.has(n.id))
                    .map((n) => {
                        const p = pos.get(n.id)!;
                        return (
                            <Html key={n.id} position={[p.x, p.y + SIZE[n.kind] + 0.12, p.z]} center distanceFactor={9} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
                                <div className="whitespace-nowrap rounded bg-slate-950/70 px-1 text-[10px] font-semibold" style={{ color: n.kind === "area" ? n.color : "#e2e8f0" }}>
                                    {n.label}
                                </div>
                            </Html>
                        );
                    })}

            {hovered && pos.get(hovered.id) && (
                <Html position={pos.get(hovered.id)!.toArray()} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
                    <div className="ml-3 -mt-10 max-w-[260px] rounded-lg border bg-slate-950/95 px-2 py-1 shadow-xl" style={{ borderColor: `${hovered.color}88` }}>
                        <div className="truncate text-[11px] font-bold text-white">{hovered.label}</div>
                        <div className="truncate text-[10px] text-slate-400">{hovered.sub}</div>
                    </div>
                </Html>
            )}
        </Canvas>
    );
}
