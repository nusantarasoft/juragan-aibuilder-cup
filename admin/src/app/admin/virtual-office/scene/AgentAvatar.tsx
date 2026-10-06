"use client";

import React, { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { Agent, Spot } from "../lib/types";
import { CORRIDOR_Z, PALETTE, STATUS_META, buildPath, entryPoints, type Lighting } from "../lib/floorplan";
import { agentObjects, useOfficeStore } from "../lib/store";
import { MODULES, stepIndex } from "../lib/modules";

const WALK_SPEED = 2.6; // m/s
const tmp = new THREE.Vector3();
const lerp = THREE.MathUtils.lerp;

function dampAngle(current: number, target: number, t: number) {
    let d = (target - current) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return current + d * Math.min(1, t);
}

interface AgentAvatarProps {
    agent: Agent;
    spot: Spot;
    selected: boolean;
    hovered: boolean;
    showLabel: boolean;
    lighting: Lighting;
}

/**
 * A stylised hover-bot representing one AI agent.
 * Posture/animation is driven purely by `agent.status`; movement by `spot`.
 */
export const AgentAvatar = memo(function AgentAvatar({ agent, spot, selected, hovered, showLabel, lighting }: AgentAvatarProps) {
    const select = useOfficeStore((s) => s.select);
    const hover = useOfficeStore((s) => s.hover);

    const group = useRef<THREE.Group>(null!);
    const body = useRef<THREE.Group>(null!);
    const head = useRef<THREE.Group>(null!);
    const armL = useRef<THREE.Group>(null!);
    const armR = useRef<THREE.Group>(null!);
    const orbit = useRef<THREE.Group>(null!);
    const selRing = useRef<THREE.Mesh>(null!);

    const path = useRef<THREE.Vector3[]>([]);
    const spotRef = useRef(spot);
    const prevSpot = useRef(spot);
    const yaw = useRef(spot.yaw);
    const phase = useMemo(() => Math.random() * Math.PI * 2, []);
    spotRef.current = spot;

    const eyeMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#000000", toneMapped: false }), []);
    const tipMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#000000", toneMapped: false }), []);
    useEffect(() => () => { eyeMaterial.dispose(); tipMaterial.dispose(); }, [eyeMaterial, tipMaterial]);

    const status = agent.status;
    const statusColor = STATUS_META[status].color;
    const offline = status === "offline";
    const bodyColor = offline ? "#64748b" : PALETTE[lighting].botBody;

    useEffect(() => {
        eyeMaterial.emissive.set(status === "error" ? "#f87171" : status === "thinking" ? "#d8b4fe" : "#7dd3fc");
        tipMaterial.emissive.set(agent.color);
    }, [status, agent.color, eyeMaterial, tipMaterial]);

    // Place once and register for camera follow.
    useLayoutEffect(() => {
        const g = group.current;
        g.position.set(spot.position[0], 0, spot.position[1]);
        g.rotation.y = spot.yaw;
        agentObjects.set(agent.id, g);
        return () => {
            agentObjects.delete(agent.id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [agent.id]);

    // New destination → plan a walk.
    useEffect(() => {
        const prev = prevSpot.current;
        if (prev.key === spot.key) return;
        const g = group.current;
        const from: [number, number] = [g.position.x, g.position.z];
        const pts = path.current.length
            ? [[from[0], CORRIDOR_Z] as [number, number], ...entryPoints(spot), spot.position]
            : buildPath(from, prev.zone, prev.yaw, spot);
        path.current = pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
        prevSpot.current = spot;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spot.key]);

    useFrame((state, rawDt) => {
        const dt = Math.min(rawDt, 0.05);
        const t = state.clock.elapsedTime + phase;
        const g = group.current;

        // --- locomotion ---
        let moving = false;
        let desiredYaw = spotRef.current.yaw;
        const next = path.current[0];
        if (next) {
            tmp.set(next.x - g.position.x, 0, next.z - g.position.z);
            const dist = tmp.length();
            const step = WALK_SPEED * dt;
            if (dist > 1e-4) desiredYaw = Math.atan2(tmp.x, tmp.z);
            if (dist <= step) {
                g.position.x = next.x;
                g.position.z = next.z;
                path.current.shift();
            } else {
                g.position.addScaledVector(tmp, step / dist);
            }
            moving = true;
        }
        yaw.current = dampAngle(yaw.current, desiredYaw, dt * (moving ? 10 : 6));
        g.rotation.y = yaw.current;

        const k = Math.min(1, dt * 7);

        // --- body hover / lean ---
        const b = body.current;
        const targetY = offline ? 0.2 : 0.42 + Math.sin(t * (moving ? 10 : 2)) * (moving ? 0.03 : 0.045);
        b.position.y = lerp(b.position.y, targetY, k);
        b.rotation.x = lerp(b.rotation.x, moving ? 0.16 : 0, k);

        // --- head posture by status ---
        let hx = Math.sin(t * 0.8) * 0.04;
        let hy = Math.sin(t * 0.5) * 0.15;
        let hz = 0;
        if (moving) {
            hy = 0;
        } else if (status === "working") {
            hx = 0.18 + Math.sin(t * 7) * 0.03;
            hy = Math.sin(t * 0.9) * 0.08;
        } else if (status === "thinking") {
            hx = -0.22;
            hy = 0;
            hz = Math.sin(t * 1.6) * 0.14;
        } else if (status === "offline") {
            hx = 0.45;
            hy = 0;
        } else if (status === "paused") {
            hx = 0.25;
            hy = 0;
        } else if (status === "error") {
            hz = Math.sin(t * 9) * 0.06;
        } else if (status === "meeting") {
            hy = Math.sin(t * 0.6) * 0.5;
        }
        const h = head.current;
        h.rotation.x = lerp(h.rotation.x, hx, k);
        h.rotation.y = lerp(h.rotation.y, hy, k);
        h.rotation.z = lerp(h.rotation.z, hz, k);

        // --- arms ---
        const typing = status === "working" && !moving;
        const swing = Math.sin(t * 10) * 0.5;
        const idle = offline ? 0.1 : Math.sin(t * 1.3) * 0.06;
        const la = typing ? -1.1 + Math.sin(t * 16) * 0.15 : moving ? swing : idle;
        const ra = typing ? -1.1 + Math.sin(t * 16 + 1.7) * 0.15 : moving ? -swing : idle;
        armL.current.rotation.x = lerp(armL.current.rotation.x, la, Math.min(1, dt * 12));
        armR.current.rotation.x = lerp(armR.current.rotation.x, ra, Math.min(1, dt * 12));

        // --- fx ---
        orbit.current.visible = status === "thinking";
        orbit.current.rotation.y += dt * 2.5;

        selRing.current.visible = selected || hovered;
        const s = 1 + Math.sin(t * 4) * 0.06;
        selRing.current.scale.set(s, s, s);

        tipMaterial.emissiveIntensity = offline
            ? 0
            : status === "error"
              ? Math.sin(t * 10) > 0 ? 4 : 0.3
              : status === "working"
                ? 2 + Math.sin(t * 6)
                : 1.4;
        eyeMaterial.emissiveIntensity = offline ? 0 : Math.sin(t * 0.9) > 0.985 ? 0.1 : 2.2;
    });

    const onOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        hover(agent.id);
        document.body.style.cursor = "pointer";
    };
    const onOut = () => {
        if (useOfficeStore.getState().hoveredId === agent.id) hover(null);
        document.body.style.cursor = "";
    };
    const onClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        select(agent.id);
    };

    const pct = agent.task ? Math.round(agent.task.progress * 100) : 0;
    const mod = agent.task ? MODULES[agent.task.moduleId] : undefined;
    const pulse = status === "working" || status === "error" || status === "thinking";

    return (
        <group ref={group} onClick={onClick} onPointerOver={onOver} onPointerOut={onOut}>
            {/* Floor status ring */}
            <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
                <ringGeometry args={[0.36, 0.44, 48]} />
                <meshBasicMaterial color={statusColor} transparent opacity={offline ? 0.3 : 0.9} toneMapped={false} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position-y={0.016}>
                <circleGeometry args={[0.36, 48]} />
                <meshBasicMaterial color={statusColor} transparent opacity={0.14} depthWrite={false} />
            </mesh>
            <mesh ref={selRing} rotation-x={-Math.PI / 2} position-y={0.024} visible={false}>
                <ringGeometry args={[0.56, 0.63, 64]} />
                <meshBasicMaterial color={selected ? "#ffffff" : statusColor} transparent opacity={0.9} toneMapped={false} />
            </mesh>
            {selected && (
                <mesh position-y={1.6}>
                    <cylinderGeometry args={[0.55, 0.55, 3.2, 32, 1, true]} />
                    <meshBasicMaterial color={statusColor} transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
            )}
            {/* Invisible hit area (kept slim so the PC behind stays clickable) */}
            <mesh position-y={0.9}>
                <cylinderGeometry args={[0.36, 0.36, 1.6, 12]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            <group ref={body} position-y={0.42}>
                {/* Thruster */}
                <mesh position-y={-0.06}>
                    <sphereGeometry args={[0.1, 16, 16]} />
                    <meshBasicMaterial color={offline ? "#334155" : agent.color} toneMapped={false} />
                </mesh>
                {/* Torso */}
                <mesh position-y={0.4} castShadow>
                    <capsuleGeometry args={[0.26, 0.34, 8, 20]} />
                    <meshStandardMaterial color={bodyColor} roughness={0.35} metalness={0.15} />
                </mesh>
                <mesh position-y={0.52} rotation-x={Math.PI / 2}>
                    <torusGeometry args={[0.262, 0.03, 10, 40]} />
                    <meshStandardMaterial color={agent.color} emissive={agent.color} emissiveIntensity={offline ? 0 : 0.8} toneMapped={false} />
                </mesh>
                <mesh position={[0, 0.36, 0.262]}>
                    <circleGeometry args={[0.055, 24]} />
                    <meshBasicMaterial color={statusColor} toneMapped={false} />
                </mesh>
                {/* Arms */}
                {[-1, 1].map((side) => (
                    <group key={side} ref={side < 0 ? armL : armR} position={[side * 0.32, 0.62, 0]}>
                        <mesh position-y={-0.16} castShadow>
                            <capsuleGeometry args={[0.055, 0.2, 6, 12]} />
                            <meshStandardMaterial color={bodyColor} roughness={0.35} metalness={0.15} />
                        </mesh>
                        <mesh position-y={-0.32}>
                            <sphereGeometry args={[0.06, 12, 12]} />
                            <meshStandardMaterial color={agent.color} roughness={0.4} />
                        </mesh>
                    </group>
                ))}
                {/* Head */}
                <group ref={head} position-y={1.04}>
                    <mesh castShadow scale={[1, 0.88, 0.95]}>
                        <sphereGeometry args={[0.28, 28, 20]} />
                        <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.15} />
                    </mesh>
                    <RoundedBox args={[0.42, 0.17, 0.12]} radius={0.05} smoothness={4} position={[0, 0.01, 0.2]}>
                        <meshStandardMaterial color="#0b1220" roughness={0.15} metalness={0.6} />
                    </RoundedBox>
                    {[-0.085, 0.085].map((x) => (
                        <mesh key={x} position={[x, 0.015, 0.262]} material={eyeMaterial}>
                            <sphereGeometry args={[0.032, 12, 12]} />
                        </mesh>
                    ))}
                    {[-1, 1].map((s) => (
                        <mesh key={s} position={[s * 0.275, 0, 0]} rotation-z={Math.PI / 2}>
                            <cylinderGeometry args={[0.075, 0.075, 0.06, 20]} />
                            <meshStandardMaterial color={agent.color} roughness={0.4} />
                        </mesh>
                    ))}
                    <mesh position-y={0.32}>
                        <cylinderGeometry args={[0.012, 0.012, 0.16, 6]} />
                        <meshStandardMaterial color="#94a3b8" />
                    </mesh>
                    <mesh position-y={0.42} material={tipMaterial}>
                        <sphereGeometry args={[0.045, 16, 16]} />
                    </mesh>
                </group>
                {/* "Thinking" orbs */}
                <group ref={orbit} position-y={1.12} visible={false}>
                    {[0, 1, 2].map((i) => (
                        <mesh key={i} position={[Math.cos(i * 2.094) * 0.5, Math.sin(i * 2) * 0.08, Math.sin(i * 2.094) * 0.5]}>
                            <sphereGeometry args={[0.04, 10, 10]} />
                            <meshBasicMaterial color="#c084fc" toneMapped={false} />
                        </mesh>
                    ))}
                </group>
            </group>

            {(showLabel || selected || hovered) && (
                <Html position={[0, 2.25, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
                    <div
                        onClick={() => select(agent.id)}
                        onPointerEnter={() => hover(agent.id)}
                        onPointerLeave={() => hover(null)}
                        className="pointer-events-auto flex cursor-pointer select-none flex-col items-center gap-1"
                    >
                        <div
                            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-lg backdrop-blur-md transition-colors ${
                                selected ? "border-white bg-white text-slate-900" : "border-white/15 bg-slate-950/70 text-white"
                            }`}
                        >
                            <span className="relative flex h-2 w-2">
                                {pulse && (
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: statusColor }} />
                                )}
                                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: statusColor }} />
                            </span>
                            {agent.name}
                            {mod && (
                                <span
                                    className="rounded px-1 py-px text-[9px] font-bold"
                                    style={{ background: `${mod.color}33`, color: selected ? "#0f172a" : mod.color }}
                                >
                                    {mod.name}
                                </span>
                            )}
                            {status === "thinking" && <span className="text-violet-400">···</span>}
                            {status === "error" && <span className="font-bold text-red-500">!</span>}
                        </div>
                        {(selected || hovered) && agent.task && (
                            <div className="max-w-[240px] truncate rounded-md border border-white/10 bg-slate-950/80 px-2 py-0.5 text-[10px] text-slate-300 backdrop-blur-md">
                                {agent.task.steps[stepIndex(agent.task.progress, agent.task.steps.length)]} · {pct}%
                            </div>
                        )}
                    </div>
                </Html>
            )}
        </group>
    );
});
