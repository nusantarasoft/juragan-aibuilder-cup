"use client";

import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import { TamagotchiModel } from "@/components/helper/TamagotchiGlobal";
import { assignSpots, createSeatMemory } from "../lib/floorplan";
import {
    MASCOT_ID,
    MASCOT_MOODS,
    buildMascotPath,
    getMascotRankTitle,
    useMascotStore,
} from "../lib/mascotStore";
import { agentObjects, useOfficeStore } from "../lib/store";
import type { ZoneId } from "../lib/types";

const tmp = new THREE.Vector3();

function dampAngle(current: number, target: number, t: number) {
    let d = (target - current) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return current + d * Math.min(1, t);
}

export const OfficeMascot = memo(function OfficeMascot() {
    const {
        selectedId,
        hoveredId,
        showLabels,
        agents,
        select,
        hover,
    } = useOfficeStore(
        useShallow((s) => ({
            selectedId: s.selectedId,
            hoveredId: s.hoveredId,
            showLabels: s.showLabels,
            agents: s.agents,
            select: s.select,
            hover: s.hover,
        })),
    );

    const {
        zone,
        spotName,
        targetPosition,
        targetYaw,
        anim,
        expression,
        activityLabel,
        mood,
        roaming,
        hurrying,
        toast,
        moveNonce,
        vitals,
        hydrateVitals,
        roamNextByMood,
        actRandomlyInPlace,
        petMascot,
    } = useMascotStore(
        useShallow((s) => ({
            zone: s.zone,
            spotName: s.spotName,
            targetPosition: s.targetPosition,
            targetYaw: s.targetYaw,
            anim: s.anim,
            expression: s.expression,
            activityLabel: s.activityLabel,
            mood: s.mood,
            roaming: s.roaming,
            hurrying: s.hurrying,
            toast: s.toast,
            moveNonce: s.moveNonce,
            vitals: s.vitals,
            hydrateVitals: s.hydrateVitals,
            roamNextByMood: s.roamNextByMood,
            actRandomlyInPlace: s.actRandomlyInPlace,
            petMascot: s.petMascot,
        })),
    );

    const selected = selectedId === MASCOT_ID;
    const hovered = hoveredId === MASCOT_ID;

    const groupRef = useRef<THREE.Group>(null!);
    const selRingRef = useRef<THREE.Mesh>(null!);
    const pathRef = useRef<THREE.Vector3[]>([]);
    const currentZoneRef = useRef<ZoneId>(zone);
    const yawRef = useRef<number>(targetYaw);
    const [isMoving, setIsMoving] = useState(false);
    const isMovingRef = useRef(false);

    const seatMemory = useRef(createSeatMemory());
    const agentSpots = useMemo(() => assignSpots(agents, seatMemory.current), [agents]);

    useEffect(() => {
        hydrateVitals();
    }, [hydrateVitals]);

    // Register in agentObjects so CameraRig can follow Cinder-Puff when selected
    useLayoutEffect(() => {
        const g = groupRef.current;
        g.position.set(targetPosition[0], 0, targetPosition[1]);
        g.rotation.y = targetYaw;
        agentObjects.set(MASCOT_ID, g);
        return () => {
            agentObjects.delete(MASCOT_ID);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Recompute waypoints whenever target destination changes
    useEffect(() => {
        const g = groupRef.current;
        if (!g) return;
        const from: [number, number] = [g.position.x, g.position.z];
        const pts = buildMascotPath(from, currentZoneRef.current, targetPosition, zone);
        pathRef.current = pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
        currentZoneRef.current = zone;
        if (pts.length > 0 && !isMovingRef.current) {
            isMovingRef.current = true;
            setIsMoving(true);
        }
    }, [moveNonce, targetPosition, zone]);

    // Mood-driven autonomous random roaming & random in-place behavior scheduler
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const scheduleNextTick = () => {
            const st = useMascotStore.getState();
            const moodMeta = MASCOT_MOODS[st.mood] ?? MASCOT_MOODS.playful;
            const [minMs, maxMs] = moodMeta.roamIntervalMs;
            // Tick frequently so Puff feels alive, spontaneous, and responsive to mood
            const delay = Math.round((minMs + Math.random() * (maxMs - minMs)) * 0.55);

            timeoutId = setTimeout(() => {
                const cur = useMascotStore.getState();
                if (!isMovingRef.current && Date.now() >= cur.lockUntil) {
                    if (cur.roaming) {
                        // 72% chance to roam to a new random spot/zone, 28% chance to do a spontaneous new trick right here
                        if (Math.random() < 0.72) {
                            roamNextByMood(agents, agentSpots);
                        } else {
                            actRandomlyInPlace();
                        }
                    } else {
                        // Even when pinned to a spot, Puff still acts randomly based on his mood!
                        actRandomlyInPlace();
                    }
                }
                scheduleNextTick();
            }, delay);
        };

        scheduleNextTick();
        return () => clearTimeout(timeoutId);
    }, [agents, agentSpots, roamNextByMood, actRandomlyInPlace]);

    useFrame((state, rawDt) => {
        const dt = Math.min(rawDt, 0.05);
        const t = state.clock.elapsedTime;
        const g = groupRef.current;
        if (!g) return;

        const moodMeta = MASCOT_MOODS[mood] ?? MASCOT_MOODS.playful;
        let movingNow = false;
        let desiredYaw = targetYaw;
        const nextWaypoint = pathRef.current[0];

        if (nextWaypoint) {
            tmp.set(nextWaypoint.x - g.position.x, 0, nextWaypoint.z - g.position.z);
            const dist = tmp.length();
            const speed = hurrying ? moodMeta.runSpeed : moodMeta.walkSpeed;
            const step = speed * dt;
            if (dist > 1e-4) {
                desiredYaw = Math.atan2(tmp.x, tmp.z);
            }
            if (dist <= step) {
                g.position.x = nextWaypoint.x;
                g.position.z = nextWaypoint.z;
                pathRef.current.shift();
            } else {
                g.position.addScaledVector(tmp, step / dist);
            }
            movingNow = pathRef.current.length > 0 || dist > step;
        }

        if (movingNow !== isMovingRef.current) {
            isMovingRef.current = movingNow;
            setIsMoving(movingNow);
            if (!movingNow && hurrying) {
                useMascotStore.setState({ hurrying: false });
            }
        }

        yawRef.current = dampAngle(yawRef.current, desiredYaw, dt * (movingNow ? 10 : 6));
        g.rotation.y = yawRef.current;

        if (selRingRef.current) {
            selRingRef.current.visible = selected || hovered;
            const s = 1 + Math.sin(t * 4.5) * 0.07;
            selRingRef.current.scale.set(s, s, s);
        }
    });

    const handleOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        hover(MASCOT_ID);
        document.body.style.cursor = "pointer";
    };

    const handleOut = () => {
        if (useOfficeStore.getState().hoveredId === MASCOT_ID) hover(null);
        document.body.style.cursor = "";
    };

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        select(MASCOT_ID);
        petMascot();
    };

    const rankInfo = getMascotRankTitle(vitals.level);
    const moodMeta = MASCOT_MOODS[mood] ?? MASCOT_MOODS.playful;
    const effectiveModelState = isMoving ? (hurrying ? "running" : "walking") : anim;
    const moveVerb =
        mood === "hyper"
            ? "Zooming"
            : mood === "sleepy"
              ? "Drifting"
              : mood === "grumpy"
                ? "Stomping"
                : mood === "hungry"
                  ? "Foraging"
                  : hurrying
                    ? "Dashing"
                    : "Waddling";
    const effectiveLabel = isMoving ? `${moveVerb} to ${spotName}…` : activityLabel;

    return (
        <group
            ref={groupRef}
            onClick={handleClick}
            onPointerOver={handleOver}
            onPointerOut={handleOut}
        >
            {/* Mascot Floor Aura Ring */}
            <mesh rotation-x={-Math.PI / 2} position-y={0.022}>
                <ringGeometry args={[0.42, 0.50, 48]} />
                <meshBasicMaterial color={moodMeta.color} transparent opacity={0.88} toneMapped={false} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position-y={0.017}>
                <circleGeometry args={[0.42, 48]} />
                <meshBasicMaterial color={moodMeta.color} transparent opacity={0.16} depthWrite={false} />
            </mesh>
            <mesh ref={selRingRef} rotation-x={-Math.PI / 2} position-y={0.026} visible={false}>
                <ringGeometry args={[0.60, 0.68, 64]} />
                <meshBasicMaterial color={selected ? "#ffffff" : "#fb923c"} transparent opacity={0.95} toneMapped={false} />
            </mesh>
            {selected && (
                <mesh rotation-x={-Math.PI / 2} position-y={0.03}>
                    <ringGeometry args={[0.72, 0.76, 64]} />
                    <meshBasicMaterial color={moodMeta.color} transparent opacity={0.75} toneMapped={false} />
                </mesh>
            )}

            {/* Soft local studio key & rim light so Puff's 3D fur coat and cream belly pop in both Day & Night modes */}
            <pointLight position={[0.3, 1.35, 1.05]} intensity={1.15} distance={3.6} decay={1.6} color="#fffaf0" />
            <pointLight position={[-0.4, 1.25, -0.95]} intensity={0.65} distance={3.2} decay={1.6} color="#e2e8f0" />

            {/* 3D Cinder-Puff Tamagotchi Model (scaled & offset so feet sit cleanly on floor y=0) */}
            <group position={[0, 0.62, 0]} scale={0.88}>
                <TamagotchiModel
                    state={effectiveModelState}
                    eyeExpression={expression}
                    onPet={() => {
                        select(MASCOT_ID);
                        petMascot();
                    }}
                />
            </group>

            {/* Floating Agentic OS Name Tag, Mood Pill & Activity Bubble */}
            {(showLabels || selected || hovered || toast) && (
                <Html position={[0, 1.95, 0]} center zIndexRange={[12, 0]} style={{ pointerEvents: "none" }}>
                    <div
                        onClick={() => {
                            select(MASCOT_ID);
                            petMascot();
                        }}
                        onPointerEnter={() => hover(MASCOT_ID)}
                        onPointerLeave={() => hover(null)}
                        className="pointer-events-auto flex cursor-pointer select-none flex-col items-center gap-1 font-mono"
                    >
                        {toast && (
                            <div
                                className="animate-bounce whitespace-nowrap border border-orange-400/90 bg-[#0b0e13]/95 px-2 py-0.5 text-[9.5px] font-bold tracking-wider text-orange-300 shadow-lg"
                                style={{ borderLeftWidth: 2, borderLeftColor: "#fb923c" }}
                            >
                                {toast}
                            </div>
                        )}
                        <div
                            className={`flex items-center gap-1.5 whitespace-nowrap border px-2 py-0.5 text-[10.5px] font-semibold shadow-lg backdrop-blur-md transition-colors ${
                                selected
                                    ? "border-orange-400/90 bg-[#0b0e13]/95 text-white"
                                    : "border-orange-400/45 bg-[#0b0e13]/90 text-white"
                            }`}
                            style={{ borderLeftColor: moodMeta.color, borderLeftWidth: 2 }}
                        >
                            <span className="relative flex h-1.5 w-1.5">
                                <span
                                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-65"
                                    style={{ background: moodMeta.color }}
                                />
                                <span
                                    className="relative inline-flex h-1.5 w-1.5 rounded-full"
                                    style={{ background: moodMeta.color }}
                                />
                            </span>
                            <span>CINDER-PUFF</span>
                            <span
                                className="border px-1 py-px text-[8.5px] font-bold uppercase tracking-wider"
                                style={{
                                    background: `${moodMeta.color}22`,
                                    borderColor: `${moodMeta.color}66`,
                                    color: moodMeta.color,
                                }}
                            >
                                {moodMeta.emoji} {moodMeta.id}
                            </span>
                            <span
                                className="border px-1 py-px text-[8.5px] font-bold uppercase tracking-wider"
                                style={{
                                    background: `${rankInfo.color}22`,
                                    borderColor: `${rankInfo.color}66`,
                                    color: rankInfo.color,
                                }}
                            >
                                LV.{vitals.level}
                            </span>
                        </div>
                        <div className="max-w-[260px] truncate border border-white/15 bg-[#0b0e13]/92 px-2 py-0.5 text-[9.5px] text-cyan-200 backdrop-blur-md">
                            {effectiveLabel}
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
});
