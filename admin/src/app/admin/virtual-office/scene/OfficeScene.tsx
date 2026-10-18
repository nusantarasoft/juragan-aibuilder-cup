"use client";

import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { CameraControls, Grid, Html, Line } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import {
    DESKS,
    FLOOR,
    LOUNGE_TABLE,
    PALETTE,
    WALL_HEIGHT,
    ZONES,
    ZONE_BY_ID,
    assignSpots,
    createSeatMemory,
    type Lighting,
} from "../lib/floorplan";
import { agentObjects, useOfficeStore } from "../lib/store";
import { MODULES } from "../lib/modules";
import type { Zone } from "../lib/types";
import { AgentAvatar } from "./AgentAvatar";
import { DataWall, Desk, HoloTable, LoungeSet, MeetingRoom, Orchestrator, Plant, ServerRack } from "./Furniture";
import { OfficeMascot } from "./OfficeMascot";
import { RoutineBoard } from "./RoutineBoard";

/* ------------------------------------------------------------------ */
/* Lights                                                              */
/* ------------------------------------------------------------------ */

function Lights({ lighting }: { lighting: Lighting }) {
    const night = lighting === "night";
    return (
        <>
            <ambientLight intensity={night ? 0.35 : 0.75} />
            <hemisphereLight args={[night ? "#6d7cff" : "#ffffff", night ? "#0b1020" : "#c7d2de", night ? 0.55 : 0.9]} />
            <directionalLight
                position={[18, 30, 14]}
                intensity={night ? 0.6 : 2.3}
                color={night ? "#a5b4fc" : "#fff7ed"}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-left={-26}
                shadow-camera-right={26}
                shadow-camera-top={22}
                shadow-camera-bottom={-22}
                shadow-camera-near={1}
                shadow-camera-far={80}
                shadow-bias={-0.0004}
                shadow-normalBias={0.02}
            />
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Floor, zones, walls                                                 */
/* ------------------------------------------------------------------ */

function ZoneTile({ zone, lighting, count }: { zone: Zone; lighting: Lighting; count: number }) {
    const focusOnZone = useOfficeStore((s) => s.focusOnZone);
    const [w, d] = zone.size;
    const iw = w - 0.3;
    const id = d - 0.3;
    const points = useMemo(
        () =>
            [
                [-iw / 2, 0, -id / 2],
                [iw / 2, 0, -id / 2],
                [iw / 2, 0, id / 2],
                [-iw / 2, 0, id / 2],
                [-iw / 2, 0, -id / 2],
            ] as [number, number, number][],
        [iw, id],
    );
    return (
        <group position={[zone.center[0], 0.008, zone.center[1]]}>
            <mesh rotation-x={-Math.PI / 2} receiveShadow>
                <planeGeometry args={[iw, id]} />
                <meshStandardMaterial color={zone.color} transparent opacity={PALETTE[lighting].zoneOpacity} depthWrite={false} />
            </mesh>
            <Line points={points} color={zone.color} lineWidth={1.5} transparent opacity={0.75} />
            <Html position={[-iw / 2 + 0.3, 0, id / 2 - 0.3]} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
                <button
                    type="button"
                    onClick={() => focusOnZone(zone.id)}
                    className="pointer-events-auto -translate-y-full cursor-pointer select-none whitespace-nowrap border px-2 py-1 text-left font-mono shadow-md backdrop-blur-md transition hover:scale-105"
                    style={{
                        borderColor: `${zone.color}66`,
                        borderLeftColor: zone.color,
                        borderLeftWidth: 2,
                        background: lighting === "night" ? "rgba(11,14,19,0.88)" : "rgba(255,255,255,0.92)",
                    }}
                >
                    <div className="text-[9.5px] font-bold uppercase tracking-[0.18em]" style={{ color: zone.color }}>
                        {zone.name}
                    </div>
                    <div className={`text-[9.5px] ${lighting === "night" ? "text-slate-400" : "text-slate-600"}`}>
                        {zone.tagline}
                        {count > 0 ? ` · ${count} agent${count > 1 ? "s" : ""}` : ""}
                    </div>
                </button>
            </Html>
        </group>
    );
}

function Window({ position, rotationY, width, lighting }: { position: [number, number, number]; rotationY: number; width: number; lighting: Lighting }) {
    const pal = PALETTE[lighting];
    return (
        <group position={position} rotation-y={rotationY}>
            <mesh position-z={-0.005}>
                <planeGeometry args={[width + 0.14, 1.74]} />
                <meshStandardMaterial color={pal.deskLeg} />
            </mesh>
            <mesh>
                <planeGeometry args={[width, 1.6]} />
                <meshStandardMaterial color={pal.window} emissive={pal.window} emissiveIntensity={pal.windowEmissive} toneMapped={false} />
            </mesh>
            <mesh position-z={0.005}>
                <planeGeometry args={[0.05, 1.6]} />
                <meshStandardMaterial color={pal.deskLeg} />
            </mesh>
        </group>
    );
}

function OfficeShell({ lighting }: { lighting: Lighting }) {
    const pal = PALETTE[lighting];
    const select = useOfficeStore((s) => s.select);
    const agents = useOfficeStore((s) => s.agents);
    const counts = useMemo(() => {
        const c: Record<string, number> = {};
        for (const a of agents) {
            const z = a.location === "meeting" ? "meeting" : a.location === "lounge" ? "lounge" : a.zone;
            c[z] = (c[z] ?? 0) + 1;
        }
        return c;
    }, [agents]);

    const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
        if (e.delta <= 2) select(null);
    };

    const halfW = FLOOR.width / 2;
    const halfD = FLOOR.depth / 2;

    return (
        <group>
            {/* Slab */}
            <mesh position-y={-0.2} receiveShadow>
                <boxGeometry args={[FLOOR.width + 0.6, 0.4, FLOOR.depth + 0.6]} />
                <meshStandardMaterial color={pal.slab} roughness={0.9} />
            </mesh>
            {/* Floor */}
            <mesh rotation-x={-Math.PI / 2} position-y={0.001} receiveShadow onClick={onFloorClick}>
                <planeGeometry args={[FLOOR.width, FLOOR.depth]} />
                <meshStandardMaterial color={pal.floor} roughness={0.85} />
            </mesh>
            <Grid
                position={[0, 0.004, 0]}
                args={[FLOOR.width, FLOOR.depth]}
                cellSize={1}
                cellThickness={0.6}
                cellColor={pal.grid}
                sectionSize={5}
                sectionThickness={1}
                sectionColor={pal.gridSection}
                fadeDistance={160}
                fadeStrength={0.6}
            />
            {ZONES.map((z) => (
                <ZoneTile key={z.id} zone={z} lighting={lighting} count={counts[z.id] ?? 0} />
            ))}

            {/* Back + left walls (cut-away diorama) */}
            <mesh position={[0, WALL_HEIGHT / 2, -halfD - 0.12]} castShadow receiveShadow>
                <boxGeometry args={[FLOOR.width + 0.5, WALL_HEIGHT, 0.25]} />
                <meshStandardMaterial color={pal.wall} roughness={0.8} />
            </mesh>
            <mesh position={[-halfW - 0.12, WALL_HEIGHT / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.25, WALL_HEIGHT, FLOOR.depth]} />
                <meshStandardMaterial color={pal.wall} roughness={0.8} />
            </mesh>
            {/* Accent light strips on wall tops */}
            <mesh position={[0, WALL_HEIGHT + 0.02, -halfD - 0.12]}>
                <boxGeometry args={[FLOOR.width + 0.5, 0.04, 0.27]} />
                <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={lighting === "night" ? 2 : 0.6} toneMapped={false} />
            </mesh>
            <mesh position={[-halfW - 0.12, WALL_HEIGHT + 0.02, 0]}>
                <boxGeometry args={[0.27, 0.04, FLOOR.depth]} />
                <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={lighting === "night" ? 2 : 0.6} toneMapped={false} />
            </mesh>

            {/* Windows */}
            {[1.5, 5.5, 9.5].map((z) => (
                <Window key={z} position={[-halfW + 0.01, 1.8, z]} rotationY={Math.PI / 2} width={3} lighting={lighting} />
            ))}
            {[5.3, 16.7].map((x) => (
                <Window key={x} position={[x, 1.8, -halfD + 0.01]} rotationY={0} width={2.4} lighting={lighting} />
            ))}
        </group>
    );
}

/* ------------------------------------------------------------------ */
/* Furniture + agents                                                  */
/* ------------------------------------------------------------------ */

function Props({ lighting }: { lighting: Lighting }) {
    const { agents, showLabels, openScreen } = useOfficeStore(
        useShallow((s) => ({ agents: s.agents, showLabels: s.showLabels, openScreen: s.openScreen })),
    );
    const byDesk = useMemo(() => new Map(agents.map((a) => [a.deskId, a])), [agents]);
    const inSession = agents.some((a) => a.location === "meeting");
    const activeCount = agents.filter((a) => a.status === "working" || a.status === "thinking").length;

    return (
        <group>
            {DESKS.map((d) => {
                const owner = byDesk.get(d.id);
                const mod = owner ? MODULES[owner.task?.moduleId ?? owner.modules[0]] : undefined;
                return (
                    <Desk
                        key={d.id}
                        desk={d}
                        lighting={lighting}
                        ownerColor={owner?.color ?? "#64748b"}
                        status={owner && owner.location === "desk" ? owner.status : owner ? "idle" : null}
                        ownerAway={!!owner && owner.location !== "desk"}
                        ownerName={owner?.name}
                        moduleName={mod?.name}
                        moduleColor={owner?.task ? mod?.color : undefined}
                        onScreenClick={owner ? () => openScreen(owner.id) : undefined}
                    />
                );
            })}

            <MeetingRoom lighting={lighting} inSession={inSession} />
            {/* Live Pulse routine board on the War Room wall (Agentic OS "Screen") */}
            <RoutineBoard position={[11, 1.75, -13.8]} lighting={lighting} />
            <DataWall position={[-11, 1.8, -13.9]} lighting={lighting} />
            <LoungeSet table={LOUNGE_TABLE} lighting={lighting} />
            <HoloTable position={[11, 10.4]} />

            {/* Agent Core */}
            {[-12.6, -11.75, -10.9].map((z) => (
                <React.Fragment key={z}>
                    <ServerRack position={[-1.8, z]} facing={1} lighting={lighting} />
                    <ServerRack position={[1.8, z]} facing={-1} lighting={lighting} />
                </React.Fragment>
            ))}
            <Orchestrator position={[0, -7.6]} activeCount={activeCount} lighting={lighting} showLabel={showLabels} />

            {/* Greenery */}
            {(
                [
                    [-19.2, -13.2], [-19.2, 12.9], [-19.2, -0.4], [-3.6, 12.9], [3.6, 12.9],
                    [19.2, 12.9], [2.1, 12.6], [-2.1, 12.6], [-3.5, -4.1], [3.6, -0.5], [-3.5, -13.2],
                ] as [number, number][]
            ).map((p, i) => (
                <Plant key={i} position={p} scale={0.8 + (i % 3) * 0.12} />
            ))}
        </group>
    );
}

function Agents({ lighting }: { lighting: Lighting }) {
    const { agents, selectedId, hoveredId, showLabels } = useOfficeStore(
        useShallow((s) => ({ agents: s.agents, selectedId: s.selectedId, hoveredId: s.hoveredId, showLabels: s.showLabels })),
    );
    const memory = useRef(createSeatMemory());
    const spots = useMemo(() => assignSpots(agents, memory.current), [agents]);

    return (
        <>
            {agents.map((a) => (
                <AgentAvatar
                    key={a.id}
                    agent={a}
                    spot={spots[a.id]}
                    selected={a.id === selectedId}
                    hovered={a.id === hoveredId}
                    showLabel={showLabels}
                    lighting={lighting}
                />
            ))}
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

const OVERVIEW: [number, number, number, number, number, number] = [24, 26, 30, 0, 0, 0.5];

function CameraRig() {
    const controls = useRef<CameraControls>(null);
    const cameraNonce = useOfficeStore((s) => s.cameraNonce);
    const transitionUntil = useRef(0);
    const last = useRef(new THREE.Vector3());
    const tracking = useRef<string | null>(null);
    const target = useMemo(() => new THREE.Vector3(), []);

    useEffect(() => {
        const c = controls.current;
        if (typeof window !== "undefined") {
            (window as unknown as { __voCameraControls?: CameraControls | null }).__voCameraControls = c;
            (window as unknown as { __voAgentObjects?: typeof agentObjects }).__voAgentObjects = agentObjects;
        }
        if (!c) return;
        const { cameraMode, focusZone, selectedId } = useOfficeStore.getState();
        transitionUntil.current = performance.now() + 900;
        if (cameraMode === "overview") {
            void c.setLookAt(...OVERVIEW, true);
        } else if (cameraMode === "top") {
            void c.setLookAt(0, 46, 0.01, 0, 0, 0, true);
        } else if (cameraMode === "zone" && focusZone) {
            const [x, z] = ZONE_BY_ID[focusZone].center;
            void c.setLookAt(x + 8, 13, z + 12, x, 0, z, true);
        } else if (cameraMode === "follow" && selectedId) {
            const obj = agentObjects.get(selectedId);
            if (obj) {
                const p = obj.position;
                void c.setLookAt(p.x + 4.5, 5, p.z + 6.5, p.x, 1.1, p.z, true);
                last.current.copy(p);
                tracking.current = selectedId;
            }
        }
    }, [cameraNonce]);

    // Keep a walking agent in frame while following.
    useFrame(() => {
        const c = controls.current;
        if (typeof window !== "undefined") {
            (window as unknown as { __voCameraControls?: CameraControls | null }).__voCameraControls = c;
            (window as unknown as { __voAgentObjects?: typeof agentObjects }).__voAgentObjects = agentObjects;
            if ((window as unknown as { __voManualCamera?: boolean }).__voManualCamera) return;
        }
        const { cameraMode, selectedId } = useOfficeStore.getState();
        if (!c || cameraMode !== "follow" || !selectedId) {
            tracking.current = null;
            return;
        }
        const obj = agentObjects.get(selectedId);
        if (!obj) return;
        if (tracking.current !== selectedId) {
            tracking.current = selectedId;
            last.current.copy(obj.position);
            return;
        }
        const dx = obj.position.x - last.current.x;
        const dz = obj.position.z - last.current.z;
        last.current.copy(obj.position);
        if (dx * dx + dz * dz < 1e-8 || performance.now() < transitionUntil.current) return;
        c.getTarget(target);
        void c.moveTo(target.x + dx, target.y, target.z + dz, false);
    });

    return (
        <CameraControls
            ref={controls}
            makeDefault
            minDistance={1.2}
            maxDistance={80}
            maxPolarAngle={Math.PI / 2.15}
            smoothTime={0.35}
        />
    );
}

/* ------------------------------------------------------------------ */
/* Canvas                                                              */
/* ------------------------------------------------------------------ */

export default function OfficeScene() {
    const lighting = useOfficeStore((s) => s.lighting);
    const select = useOfficeStore((s) => s.select);
    const pal = PALETTE[lighting];
    const night = lighting === "night";

    return (
        <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [OVERVIEW[0], OVERVIEW[1], OVERVIEW[2]], fov: 38, near: 0.1, far: 300 }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            onPointerMissed={() => select(null)}
        >
            <color attach="background" args={[pal.bg]} />
            <fog attach="fog" args={[pal.bg, 60, 140]} />
            <Lights lighting={lighting} />
            <Suspense fallback={null}>
                <OfficeShell lighting={lighting} />
                <Props lighting={lighting} />
                <Agents lighting={lighting} />
                <OfficeMascot />
            </Suspense>
            <CameraRig />
            <EffectComposer multisampling={4}>
                <Bloom mipmapBlur intensity={night ? 1.0 : 0.4} luminanceThreshold={night ? 0.55 : 0.92} luminanceSmoothing={0.25} />
                <Vignette eskil={false} offset={0.25} darkness={night ? 0.65 : 0.3} />
            </EffectComposer>
        </Canvas>
    );
}
