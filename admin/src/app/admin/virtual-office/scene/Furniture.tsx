"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { AgentStatus, Desk as DeskModel } from "../lib/types";
import { MEETING_TABLE, PALETTE, SEAT_OFFSET, STATUS_META, type Lighting } from "../lib/floorplan";

/* ------------------------------------------------------------------ */
/* Desk + monitor (agent PC) + docking pad                             */
/* ------------------------------------------------------------------ */

export function Desk({
    desk,
    ownerColor,
    status,
    ownerAway,
    lighting,
    ownerName,
    moduleName,
    moduleColor,
    onScreenClick,
}: {
    desk: DeskModel;
    ownerColor: string;
    status: AgentStatus | null;
    ownerAway: boolean;
    lighting: Lighting;
    ownerName?: string;
    /** Module currently open on this PC (ITSM, Command Center, …). */
    moduleName?: string;
    moduleColor?: string;
    onScreenClick?: () => void;
}) {
    const pal = PALETTE[lighting];
    const screenMat = useRef<THREE.MeshStandardMaterial>(null);
    const scan = useRef<THREE.Mesh>(null);
    const phase = useMemo(() => Math.random() * 10, []);
    const [hovered, setHovered] = useState(false);

    const active = status === "working" || status === "thinking" || status === "error";
    const screenColor =
        !status || status === "offline"
            ? "#020617"
            : status === "error"
              ? STATUS_META.error.color
              : active
                ? moduleColor ?? STATUS_META[status].color
                : lighting === "night"
                  ? "#1e3a5f"
                  : "#93c5fd";

    useFrame(({ clock }) => {
        const t = clock.elapsedTime + phase;
        if (screenMat.current) {
            let intensity = !status || status === "offline" ? 0 : active ? 1.3 : 0.35;
            if (status === "working") intensity += Math.sin(t * 3) * 0.15;
            if (status === "error") intensity = Math.sin(t * 6) > 0 ? 1.8 : 0.5;
            if (hovered) intensity = Math.max(intensity, 0.9) + 0.4;
            screenMat.current.emissiveIntensity = intensity;
        }
        if (scan.current) {
            scan.current.visible = status === "working";
            scan.current.position.y = 0.42 + Math.sin(t * 1.7) * 0.2;
        }
    });

    const interactive = !!onScreenClick;
    const onOver = (e: ThreeEvent<PointerEvent>) => {
        if (!interactive) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
    };
    const onOut = () => {
        if (!interactive) return;
        setHovered(false);
        document.body.style.cursor = "";
    };
    const onClick = (e: ThreeEvent<MouseEvent>) => {
        if (!interactive) return;
        e.stopPropagation();
        if (e.delta <= 2) onScreenClick?.();
    };

    return (
        <group position={[desk.position[0], 0, desk.position[1]]} rotation-y={desk.rotation}>
            {/* Top */}
            <mesh position-y={0.74} castShadow receiveShadow>
                <boxGeometry args={[1.6, 0.05, 0.9]} />
                <meshStandardMaterial color={pal.desk} roughness={0.55} />
            </mesh>
            {/* Side panels */}
            {[-0.76, 0.76].map((x) => (
                <mesh key={x} position={[x, 0.36, 0]} castShadow>
                    <boxGeometry args={[0.04, 0.72, 0.82]} />
                    <meshStandardMaterial color={pal.deskLeg} roughness={0.6} />
                </mesh>
            ))}
            {/* Monitor — the agent's PC */}
            <group position={[0, 0.765, -0.28]} onClick={onClick} onPointerOver={onOver} onPointerOut={onOut}>
                <mesh position-y={0.01}>
                    <boxGeometry args={[0.24, 0.02, 0.16]} />
                    <meshStandardMaterial color={pal.dark} metalness={0.5} roughness={0.35} />
                </mesh>
                <mesh position-y={0.12}>
                    <cylinderGeometry args={[0.02, 0.02, 0.24, 8]} />
                    <meshStandardMaterial color={pal.dark} metalness={0.5} roughness={0.35} />
                </mesh>
                <mesh position-y={0.42} castShadow>
                    <boxGeometry args={[0.92, 0.52, 0.035]} />
                    <meshStandardMaterial color={pal.dark} metalness={0.4} roughness={0.4} />
                </mesh>
                {/* Hover frame */}
                <mesh position={[0, 0.42, -0.004]} visible={hovered}>
                    <boxGeometry args={[1.0, 0.6, 0.03]} />
                    <meshBasicMaterial color={moduleColor ?? ownerColor} toneMapped={false} />
                </mesh>
                <mesh position={[0, 0.42, 0.0185]}>
                    <planeGeometry args={[0.86, 0.46]} />
                    <meshStandardMaterial ref={screenMat} color="#000000" emissive={screenColor} emissiveIntensity={1} toneMapped={false} />
                </mesh>
                <mesh ref={scan} position={[0, 0.42, 0.022]}>
                    <planeGeometry args={[0.86, 0.015]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.45} toneMapped={false} />
                </mesh>
                {/* Generous hit area so the PC is easy to click from far away */}
                <mesh position={[0, 0.42, 0]}>
                    <boxGeometry args={[1.05, 0.7, 0.25]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
                {hovered && ownerName && (
                    <Html position={[0, 0.95, 0]} center zIndexRange={[12, 0]} style={{ pointerEvents: "none" }}>
                        <div className="flex select-none items-center gap-2 whitespace-nowrap rounded-lg border border-white/15 bg-slate-950/85 px-2.5 py-1.5 text-[11px] text-white shadow-xl backdrop-blur-md">
                            <span className="h-2 w-2 rounded-sm" style={{ background: moduleColor ?? ownerColor }} />
                            <span className="font-semibold">View {ownerName}&apos;s screen</span>
                            {moduleName && <span className="text-slate-400">· {moduleName}</span>}
                        </div>
                    </Html>
                )}
            </group>
            {/* Keyboard + mug */}
            <mesh position={[0, 0.775, 0.12]}>
                <boxGeometry args={[0.5, 0.015, 0.16]} />
                <meshStandardMaterial color={lighting === "night" ? "#334155" : "#e2e8f0"} />
            </mesh>
            <mesh position={[0.6, 0.81, 0.08]} castShadow>
                <cylinderGeometry args={[0.045, 0.04, 0.09, 12]} />
                <meshStandardMaterial color={ownerColor} />
            </mesh>
            {/* Docking pad — glows brighter when the agent is away */}
            <group position={[0, 0.012, SEAT_OFFSET]}>
                <mesh rotation-x={-Math.PI / 2}>
                    <ringGeometry args={[0.46, 0.5, 48]} />
                    <meshBasicMaterial color={ownerColor} transparent opacity={ownerAway ? 0.95 : 0.3} toneMapped={false} />
                </mesh>
            </group>
        </group>
    );
}

/* ------------------------------------------------------------------ */
/* Decor                                                               */
/* ------------------------------------------------------------------ */

export function Plant({ position, scale = 1 }: { position: [number, number]; scale?: number }) {
    return (
        <group position={[position[0], 0, position[1]]} scale={scale}>
            <mesh position-y={0.22} castShadow receiveShadow>
                <cylinderGeometry args={[0.22, 0.17, 0.44, 16]} />
                <meshStandardMaterial color="#e7e5e4" roughness={0.8} />
            </mesh>
            <mesh position-y={0.78} castShadow>
                <icosahedronGeometry args={[0.38, 0]} />
                <meshStandardMaterial color="#15803d" flatShading roughness={0.8} />
            </mesh>
            <mesh position={[0.14, 1.05, 0.06]} castShadow>
                <icosahedronGeometry args={[0.26, 0]} />
                <meshStandardMaterial color="#22c55e" flatShading roughness={0.8} />
            </mesh>
            <mesh position={[-0.12, 1.0, -0.08]} castShadow>
                <icosahedronGeometry args={[0.22, 0]} />
                <meshStandardMaterial color="#16a34a" flatShading roughness={0.8} />
            </mesh>
        </group>
    );
}

export function Sofa({ position, rotation = 0, color }: { position: [number, number]; rotation?: number; color: string }) {
    return (
        <group position={[position[0], 0, position[1]]} rotation-y={rotation}>
            <RoundedBox args={[2.6, 0.42, 0.95]} radius={0.08} position={[0, 0.25, 0]} castShadow receiveShadow>
                <meshStandardMaterial color={color} roughness={0.9} />
            </RoundedBox>
            <RoundedBox args={[2.6, 0.55, 0.22]} radius={0.08} position={[0, 0.62, -0.38]} castShadow>
                <meshStandardMaterial color={color} roughness={0.9} />
            </RoundedBox>
            {[-1.25, 1.25].map((x) => (
                <RoundedBox key={x} args={[0.2, 0.5, 0.95]} radius={0.06} position={[x, 0.45, 0]} castShadow>
                    <meshStandardMaterial color={color} roughness={0.9} />
                </RoundedBox>
            ))}
        </group>
    );
}

export function LoungeSet({ table, lighting }: { table: [number, number]; lighting: Lighting }) {
    const pal = PALETTE[lighting];
    return (
        <group>
            {/* High table where agents gather */}
            <group position={[table[0], 0, table[1]]}>
                <mesh position-y={0.02}>
                    <cylinderGeometry args={[0.3, 0.3, 0.04, 24]} />
                    <meshStandardMaterial color={pal.dark} />
                </mesh>
                <mesh position-y={0.52}>
                    <cylinderGeometry args={[0.04, 0.04, 1.0, 10]} />
                    <meshStandardMaterial color={pal.deskLeg} metalness={0.6} roughness={0.3} />
                </mesh>
                <mesh position-y={1.04} castShadow>
                    <cylinderGeometry args={[0.5, 0.5, 0.05, 32]} />
                    <meshStandardMaterial color={pal.desk} roughness={0.4} />
                </mesh>
                <mesh position={[0.12, 1.11, 0.05]}>
                    <cylinderGeometry args={[0.045, 0.04, 0.09, 12]} />
                    <meshStandardMaterial color="#f472b6" />
                </mesh>
            </group>
            {/* Rug + sofa + coffee table */}
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 9.6]} receiveShadow>
                <circleGeometry args={[2.1, 48]} />
                <meshStandardMaterial color={lighting === "night" ? "#2a1730" : "#fce7f3"} roughness={1} />
            </mesh>
            <Sofa position={[0, 8.6]} color={lighting === "night" ? "#3b2a52" : "#c4b5fd"} />
            <mesh position={[0, 0.22, 10]} castShadow>
                <cylinderGeometry args={[0.55, 0.55, 0.06, 32]} />
                <meshStandardMaterial color={pal.desk} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.1, 10]}>
                <cylinderGeometry args={[0.06, 0.06, 0.2, 8]} />
                <meshStandardMaterial color={pal.deskLeg} />
            </mesh>
            {/* Coffee kiosk */}
            <group position={[1.85, 0, 5.8]} rotation-y={-Math.PI / 2}>
                <mesh position-y={0.5} castShadow receiveShadow>
                    <boxGeometry args={[1.3, 1.0, 0.55]} />
                    <meshStandardMaterial color={pal.desk} roughness={0.5} />
                </mesh>
                <mesh position={[-0.3, 1.25, -0.05]} castShadow>
                    <boxGeometry args={[0.4, 0.5, 0.35]} />
                    <meshStandardMaterial color={pal.dark} metalness={0.5} roughness={0.3} />
                </mesh>
                <mesh position={[-0.3, 1.32, 0.126]}>
                    <planeGeometry args={[0.22, 0.1]} />
                    <meshBasicMaterial color="#f472b6" toneMapped={false} />
                </mesh>
                {[0.15, 0.32, 0.49].map((x) => (
                    <mesh key={x} position={[x, 1.05, 0.05]}>
                        <cylinderGeometry args={[0.045, 0.04, 0.1, 12]} />
                        <meshStandardMaterial color="#fafaf9" />
                    </mesh>
                ))}
            </group>
        </group>
    );
}

/* ------------------------------------------------------------------ */
/* Glass partitions                                                    */
/* ------------------------------------------------------------------ */

function GlassWall({ from, to, height = 2.6, accent }: { from: [number, number]; to: [number, number]; height?: number; accent: string }) {
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const len = Math.hypot(dx, dz);
    const angle = -Math.atan2(dz, dx);
    return (
        <group position={[(from[0] + to[0]) / 2, 0, (from[1] + to[1]) / 2]} rotation-y={angle}>
            <mesh position-y={height / 2}>
                <boxGeometry args={[len, height, 0.04]} />
                <meshStandardMaterial color="#bae6fd" transparent opacity={0.12} roughness={0.05} metalness={0.2} depthWrite={false} />
            </mesh>
            <mesh position-y={height}>
                <boxGeometry args={[len, 0.04, 0.07]} />
                <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} toneMapped={false} />
            </mesh>
            <mesh position-y={0.03}>
                <boxGeometry args={[len, 0.06, 0.07]} />
                <meshStandardMaterial color="#64748b" />
            </mesh>
        </group>
    );
}

export function MeetingRoom({ lighting, inSession }: { lighting: Lighting; inSession: boolean }) {
    const pal = PALETTE[lighting];
    const screen = useRef<THREE.MeshStandardMaterial>(null);
    useFrame(({ clock }) => {
        if (screen.current) screen.current.emissiveIntensity = inSession ? 1.1 + Math.sin(clock.elapsedTime * 2) * 0.1 : 0.15;
    });
    const [tx, tz] = MEETING_TABLE.center;
    const [tw, td] = MEETING_TABLE.size;
    const accent = "#f59e0b";
    return (
        <group>
            {/* Table */}
            <RoundedBox args={[tw, 0.08, td]} radius={0.03} position={[tx, 0.74, tz]} castShadow receiveShadow>
                <meshStandardMaterial color={pal.desk} roughness={0.35} />
            </RoundedBox>
            {[-tw / 3, tw / 3].map((x) => (
                <mesh key={x} position={[tx + x, 0.36, tz]} castShadow>
                    <boxGeometry args={[0.3, 0.72, 0.8]} />
                    <meshStandardMaterial color={pal.deskLeg} />
                </mesh>
            ))}
            {/* Hologram puck in the middle of the table */}
            <mesh position={[tx, 0.8, tz]}>
                <cylinderGeometry args={[0.25, 0.25, 0.03, 32]} />
                <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={inSession ? 2 : 0.2} toneMapped={false} />
            </mesh>
            {/* Wall screen */}
            <group position={[tx, 1.75, -13.9]}>
                <mesh>
                    <boxGeometry args={[5, 2.2, 0.08]} />
                    <meshStandardMaterial color={pal.dark} metalness={0.4} roughness={0.4} />
                </mesh>
                <mesh position-z={0.045}>
                    <planeGeometry args={[4.8, 2.0]} />
                    <meshStandardMaterial ref={screen} color="#000000" emissive="#1d4ed8" emissiveIntensity={0.15} toneMapped={false} />
                </mesh>
            </group>
            {/* Glass walls with a door gap on the corridor side */}
            <GlassWall from={[3, -4.5]} to={[9.9, -4.5]} accent={accent} />
            <GlassWall from={[12.1, -4.5]} to={[19.9, -4.5]} accent={accent} />
            <GlassWall from={[3, -13.95]} to={[3, -4.5]} accent={accent} />
            <GlassWall from={[19.9, -13.95]} to={[19.9, -4.5]} accent={accent} />
        </group>
    );
}

/* ------------------------------------------------------------------ */
/* Ops data wall (animated bar charts)                                 */
/* ------------------------------------------------------------------ */

const BAR_COUNT = 36;
const BAR_COLORS = ["#22c55e", "#38bdf8", "#a855f7", "#f59e0b"];

export function DataWall({ position, lighting }: { position: [number, number, number]; lighting: Lighting }) {
    const pal = PALETTE[lighting];
    const bars = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useLayoutEffect(() => {
        const mesh = bars.current;
        if (!mesh) return;
        const c = new THREE.Color();
        for (let i = 0; i < BAR_COUNT; i++) mesh.setColorAt(i, c.set(BAR_COLORS[Math.floor(i / 12) % BAR_COLORS.length]));
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }, []);

    useFrame(({ clock }) => {
        const mesh = bars.current;
        if (!mesh) return;
        const t = clock.elapsedTime;
        for (let i = 0; i < BAR_COUNT; i++) {
            const panel = Math.floor(i / 12);
            const j = i % 12;
            const h = 0.15 + 1.0 * (0.5 + 0.5 * Math.sin(t * (0.6 + (j % 5) * 0.25) + i * 1.3));
            dummy.position.set((panel - 1) * 3.95 - 1.5 + j * 0.27, -0.72 + h / 2, 0.06);
            dummy.scale.set(1, h, 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
    });

    return (
        <group position={position}>
            <mesh>
                <boxGeometry args={[12.2, 2.0, 0.08]} />
                <meshStandardMaterial color={pal.dark} metalness={0.4} roughness={0.4} />
            </mesh>
            {[-3.95, 0, 3.95].map((x) => (
                <mesh key={x} position={[x, 0, 0.045]}>
                    <planeGeometry args={[3.8, 1.8]} />
                    <meshStandardMaterial color="#000000" emissive="#0c4a6e" emissiveIntensity={0.6} toneMapped={false} />
                </mesh>
            ))}
            <instancedMesh ref={bars} args={[undefined, undefined, BAR_COUNT]}>
                <boxGeometry args={[0.18, 1, 0.02]} />
                <meshBasicMaterial toneMapped={false} />
            </instancedMesh>
        </group>
    );
}

/* ------------------------------------------------------------------ */
/* Agent Core: server racks + orchestrator                             */
/* ------------------------------------------------------------------ */

export function ServerRack({ position, facing, lighting }: { position: [number, number]; facing: 1 | -1; lighting: Lighting }) {
    const pal = PALETTE[lighting];
    const ledA = useRef<THREE.MeshStandardMaterial>(null);
    const ledB = useRef<THREE.MeshStandardMaterial>(null);
    const phase = useMemo(() => Math.random() * 10, []);
    useFrame(({ clock }) => {
        const t = clock.elapsedTime + phase;
        if (ledA.current) ledA.current.emissiveIntensity = 1.4 + Math.sin(t * 5) * 0.6;
        if (ledB.current) ledB.current.emissiveIntensity = Math.sin(t * 9) > 0.3 ? 2.2 : 0.3;
    });
    return (
        <group position={[position[0], 0, position[1]]} rotation-y={facing > 0 ? Math.PI / 2 : -Math.PI / 2}>
            <mesh position-y={1.05} castShadow receiveShadow>
                <boxGeometry args={[0.7, 2.1, 0.9]} />
                <meshStandardMaterial color={lighting === "night" ? "#0b1120" : "#334155"} metalness={0.6} roughness={0.35} />
            </mesh>
            {Array.from({ length: 8 }).map((_, i) => (
                <mesh key={i} position={[0, 0.3 + i * 0.22, 0.452]}>
                    <planeGeometry args={[0.55, 0.035]} />
                    <meshStandardMaterial
                        ref={i === 0 ? ledA : i === 5 ? ledB : undefined}
                        color="#000000"
                        emissive={i === 5 ? "#f59e0b" : i % 2 ? "#38bdf8" : "#22c55e"}
                        emissiveIntensity={1.4}
                        toneMapped={false}
                    />
                </mesh>
            ))}
            <mesh position={[0, 2.12, 0]}>
                <boxGeometry args={[0.72, 0.04, 0.92]} />
                <meshStandardMaterial color={pal.deskLeg} />
            </mesh>
        </group>
    );
}

export function Orchestrator({
    position,
    activeCount,
    lighting,
    showLabel,
}: {
    position: [number, number];
    activeCount: number;
    lighting: Lighting;
    showLabel: boolean;
}) {
    const core = useRef<THREE.Group>(null);
    const ring1 = useRef<THREE.Mesh>(null);
    const ring2 = useRef<THREE.Mesh>(null);
    const color = "#818cf8";

    useFrame(({ clock }, dt) => {
        const t = clock.elapsedTime;
        if (core.current) {
            core.current.rotation.y += dt * 0.6;
            core.current.rotation.x += dt * 0.2;
            core.current.position.y = 1.85 + Math.sin(t * 1.2) * 0.08;
        }
        if (ring1.current) ring1.current.rotation.z += dt * 0.8;
        if (ring2.current) ring2.current.rotation.x += dt * 0.5;
    });

    return (
        <group position={[position[0], 0, position[1]]}>
            <mesh position-y={0.17} castShadow receiveShadow>
                <cylinderGeometry args={[0.75, 0.9, 0.34, 40]} />
                <meshStandardMaterial color={lighting === "night" ? "#111827" : "#475569"} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position-y={0.345} rotation-x={-Math.PI / 2}>
                <ringGeometry args={[0.45, 0.62, 48]} />
                <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            <mesh position-y={1.1}>
                <cylinderGeometry args={[0.06, 0.06, 1.5, 12, 1, true]} />
                <meshBasicMaterial color={color} transparent opacity={0.35} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
            <group ref={core} position-y={1.85}>
                <mesh>
                    <icosahedronGeometry args={[0.42, 1]} />
                    <meshStandardMaterial color="#1e1b4b" emissive={color} emissiveIntensity={2.2} flatShading toneMapped={false} />
                </mesh>
                <mesh scale={1.3}>
                    <icosahedronGeometry args={[0.42, 1]} />
                    <meshBasicMaterial color="#c7d2fe" wireframe transparent opacity={0.35} />
                </mesh>
            </group>
            <mesh ref={ring1} position-y={1.85} rotation-x={Math.PI / 2}>
                <torusGeometry args={[0.95, 0.018, 8, 96]} />
                <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            <mesh ref={ring2} position-y={1.85}>
                <torusGeometry args={[1.2, 0.012, 8, 96]} />
                <meshBasicMaterial color="#c084fc" toneMapped={false} />
            </mesh>
            <pointLight position-y={1.9} color={color} intensity={lighting === "night" ? 18 : 4} distance={10} decay={2} />
            {showLabel && (
                <Html position={[0, 3.05, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
                    <div className="flex select-none flex-col items-center whitespace-nowrap rounded-xl border border-indigo-400/30 bg-indigo-950/70 px-3 py-1 text-center shadow-lg shadow-indigo-500/20 backdrop-blur-md">
                        <span className="text-[11px] font-semibold tracking-wide text-indigo-100">Orchestrator</span>
                        <span className="text-[10px] text-indigo-300">{activeCount} active tasks routed</span>
                    </div>
                </Html>
            )}
        </group>
    );
}

export function HoloTable({ position }: { position: [number, number] }) {
    const holo = useRef<THREE.Mesh>(null);
    useFrame((_, dt) => {
        if (holo.current) {
            holo.current.rotation.y += dt * 0.7;
            holo.current.rotation.x += dt * 0.25;
        }
    });
    const color = "#a855f7";
    return (
        <group position={[position[0], 0, position[1]]}>
            <mesh position-y={0.4} castShadow receiveShadow>
                <cylinderGeometry args={[0.85, 0.95, 0.8, 40]} />
                <meshStandardMaterial color="#1e1b4b" metalness={0.5} roughness={0.35} />
            </mesh>
            <mesh position-y={0.81} rotation-x={-Math.PI / 2}>
                <ringGeometry args={[0.55, 0.78, 48]} />
                <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            <mesh position-y={1.25}>
                <cylinderGeometry args={[0.75, 0.55, 0.9, 32, 1, true]} />
                <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh ref={holo} position-y={1.6}>
                <torusKnotGeometry args={[0.32, 0.09, 120, 12]} />
                <meshStandardMaterial color="#000000" emissive={color} emissiveIntensity={1.8} wireframe toneMapped={false} />
            </mesh>
        </group>
    );
}
