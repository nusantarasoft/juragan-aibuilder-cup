import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

import { BUILDING, getPhaseOpacity } from './shared';

export function ForkliftLoader({ progress }: { progress: number }) {
  const opacity = getPhaseOpacity(progress, 20, 70);
  const groupRef = useRef<THREE.Group>(null);
  const forkRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<THREE.Mesh[]>([]);

  // Figure-8 path around the material pile area
  const centerX = BUILDING.width / 2 + 5;
  const centerZ = -5;
  const radiusX = 3;
  const radiusZ = 2.5;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      // Figure-8 path using Lissajous curve
      const speed = 0.3;
      const px = centerX + Math.sin(t * speed) * radiusX;
      const pz = centerZ + Math.sin(t * speed * 2) * radiusZ;
      // Direction of travel (derivative)
      const dx = Math.cos(t * speed) * radiusX * speed;
      const dz = Math.cos(t * speed * 2) * radiusZ * speed * 2;
      const angle = Math.atan2(dx, dz);
      groupRef.current.position.set(px, 0, pz);
      groupRef.current.rotation.y = angle;
      // Fork lifting animation (up/down cycle)
      if (forkRef.current) {
        const liftCycle = (Math.sin(t * 0.6) + 1) * 0.5; // 0-1
        forkRef.current.position.y = 0.3 + liftCycle * 0.8;
      }
      // Wheel rotation
      const wheelSpin = t * 3.0;
      wheelRefs.current.forEach(w => {
        if (w) w.rotation.y = wheelSpin;
      });
    }
  });
  if (opacity <= 0) return null;
  return (
    <group ref={groupRef} position={[centerX, 0, centerZ]}>
      {/* Main body */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[1.0, 0.7, 1.6]} />
        <meshPhysicalMaterial color="#E8B230" transparent opacity={opacity} roughness={0.4} metalness={0.3} clearcoat={0.5} />
      </mesh>
      {/* Overhead guard / cage */}
      <mesh position={[0, 1.3, -0.1]} castShadow>
        <boxGeometry args={[1.0, 0.06, 1.4]} />
        <meshPhysicalMaterial color="#D4A020" transparent opacity={opacity} roughness={0.5} metalness={0.4} clearcoat={0.3} />
      </mesh>
      {/* Guard posts */}
      {[[-0.45, -0.3], [-0.45, 0.55], [0.45, -0.3], [0.45, 0.55]].map(([gx, gz], i) => (
        <mesh key={`fg-${i}`} position={[gx, 1.0, gz]}>
          <boxGeometry args={[0.05, 0.7, 0.05]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#D4A020" transparent opacity={opacity} roughness={0.5} />
        </mesh>
      ))}
      {/* Seat */}
      <mesh position={[0, 0.85, -0.1]}>
        <boxGeometry args={[0.4, 0.25, 0.4]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#333" transparent opacity={opacity} roughness={0.8} />
      </mesh>
      {/* Steering wheel */}
      <mesh position={[0, 1.0, 0.35]} rotation={[0.4, 0, 0]}>
        <torusGeometry args={[0.1, 0.02, 6, 12]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#111" transparent opacity={opacity} roughness={0.5} />
      </mesh>
      {/* Mast (vertical rails) */}
      {[-0.2, 0.2].map((mx, i) => (
        <mesh key={`mast-${i}`} position={[mx, 0.9, 0.85]}>
          <boxGeometry args={[0.06, 1.6, 0.06]} />
          <meshPhysicalMaterial color="#D4A020" transparent opacity={opacity} roughness={0.4} metalness={0.5} clearcoat={0.3} />
        </mesh>
      ))}
      {/* Fork carriage (moves up/down) */}
      <group ref={forkRef} position={[0, 0.3, 0.85]}>
        {/* Carriage plate */}
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[0.5, 0.3, 0.05]} />
          <meshPhysicalMaterial color="#888" transparent opacity={opacity} roughness={0.5} metalness={0.6} />
        </mesh>
        {/* Left fork tine */}
        <mesh position={[-0.15, -0.15, 0.4]} castShadow>
          <boxGeometry args={[0.08, 0.04, 0.7]} />
          <meshPhysicalMaterial color="#666" transparent opacity={opacity} roughness={0.4} metalness={0.8} clearcoat={0.2} />
        </mesh>
        {/* Right fork tine */}
        <mesh position={[0.15, -0.15, 0.4]} castShadow>
          <boxGeometry args={[0.08, 0.04, 0.7]} />
          <meshPhysicalMaterial color="#666" transparent opacity={opacity} roughness={0.4} metalness={0.8} clearcoat={0.2} />
        </mesh>
      </group>
      {/* Counter weight (rear) */}
      <mesh position={[0, 0.5, -0.7]}>
        <boxGeometry args={[0.8, 0.4, 0.3]} />
        <meshPhysicalMaterial color="#555" transparent opacity={opacity} roughness={0.7} metalness={0.4} />
      </mesh>
      {/* Front wheels */}
      {[-0.5, 0.5].map((wx, i) => (
        <mesh key={`ffw-${i}`} ref={(el) => { if (el) wheelRefs.current[i] = el; }} position={[wx, 0.18, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.12, 10]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#222" transparent opacity={opacity} roughness={0.9} />
        </mesh>
      ))}
      {/* Rear wheels */}
      {[-0.5, 0.5].map((wx, i) => (
        <mesh key={`frw-${i}`} ref={(el) => { if (el) wheelRefs.current[i + 2] = el; }} position={[wx, 0.18, -0.55]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.12, 10]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#222" transparent opacity={opacity} roughness={0.9} />
        </mesh>
      ))}
      {/* Label */}
      <Html position={[0, 1.8, 0]} center>
        <div style={{ background: "rgba(0,0,0,0.7)", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", whiteSpace: "nowrap", pointerEvents: "none", opacity: opacity > 0.5 ? 1 : 0, transition: "opacity 0.3s" }}>
          Forklift
        </div>
      </Html>
    </group>
  );
}

// --- Animated Construction Workers ---
const WORKER_PATHS: Array<{
  role: string;
  color: string;
  hatColor: string;
  startPct: number;
  endPct: number;
  speed: number;
  pathFn: (t: number) => [number, number, number];
  yaw: (t: number) => number;
}> = [
  {
    role: "Surveyor",
    color: "#2563eb",
    hatColor: "#facc15",
    startPct: 0,
    endPct: 100,
    speed: 0.4,
    pathFn: (t) => [
      -BUILDING.width / 2 - 2 + Math.sin(t) * 3,
      0,
      -BUILDING.depth / 2 + Math.cos(t * 0.7) * 4,
    ],
    yaw: (t) => Math.atan2(Math.cos(t) * 3 * 0.4, -Math.sin(t * 0.7) * 4 * 0.7 * 0.4),
  },
  {
    role: "Bricklayer",
    color: "#dc2626",
    hatColor: "#facc15",
    startPct: 15,
    endPct: 70,
    speed: 0.25,
    pathFn: (t) => [
      BUILDING.width / 2 + 1.5,
      0,
      -3 + Math.sin(t) * 3,
    ],
    yaw: (t) => Math.atan2(0, Math.cos(t) * 3 * 0.25),
  },
  {
    role: "Supervisor",
    color: "#f97316",
    hatColor: "#ffffff",
    startPct: 0,
    endPct: 100,
    speed: 0.15,
    pathFn: (t) => [
      BUILDING.width / 2 + 6,
      0,
      BUILDING.depth / 2 + 2,
    ],
    yaw: (t) => t * 0.5,
  },
  {
    role: "Steelworker",
    color: "#16a34a",
    hatColor: "#facc15",
    startPct: 20,
    endPct: 80,
    speed: 0.3,
    pathFn: (t) => [
      Math.sin(t * 0.5) * (BUILDING.width / 2 + 1),
      0,
      BUILDING.depth / 2 + 3 + Math.cos(t * 0.3) * 2,
    ],
    yaw: (t) => Math.atan2(
      Math.cos(t * 0.5) * 0.5 * (BUILDING.width / 2 + 1) * 0.15,
      -Math.sin(t * 0.3) * 0.3 * 2 * 0.15
    ),
  },
  {
    role: "Electrician",
    color: "#7c3aed",
    hatColor: "#facc15",
    startPct: 50,
    endPct: 90,
    speed: 0.35,
    pathFn: (t) => [
      -BUILDING.width / 2 + 2 + Math.sin(t * 1.2) * 2,
      0,
      BUILDING.depth / 2 + 1 + Math.cos(t * 0.8) * 2,
    ],
    yaw: (t) => Math.atan2(
      Math.cos(t * 1.2) * 1.2 * 2 * 0.35,
      -Math.sin(t * 0.8) * 0.8 * 2 * 0.35
    ),
  },
  {
    role: "Laborer",
    color: "#0891b2",
    hatColor: "#facc15",
    startPct: 5,
    endPct: 85,
    speed: 0.5,
    pathFn: (t) => [
      BUILDING.width / 2 + 4 + Math.sin(t * 0.6) * 2,
      0,
      -5 + Math.cos(t * 0.9) * 2,
    ],
    yaw: (t) => Math.atan2(
      Math.cos(t * 0.6) * 0.6 * 2 * 0.5,
      -Math.sin(t * 0.9) * 0.9 * 2 * 0.5
    ),
  },
  {
    role: "Welder",
    color: "#b91c1c",
    hatColor: "#94a3b8",
    startPct: 20,
    endPct: 60,
    speed: 0.2,
    pathFn: (t) => [
      -1 + Math.sin(t * 0.4) * 4,
      0,
      -BUILDING.depth / 2 - 2.5,
    ],
    yaw: (t) => Math.atan2(Math.cos(t * 0.4) * 0.4 * 4 * 0.2, 0),
  },
];

function SingleWorker({ worker, progress }: { worker: typeof WORKER_PATHS[0]; progress: number }) {
  const opacity = getPhaseOpacity(progress, worker.startPct, worker.endPct);
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pos = worker.pathFn(t * worker.speed);
    const angle = worker.yaw(t * worker.speed);
    if (groupRef.current) {
      groupRef.current.position.set(pos[0], pos[1], pos[2]);
      groupRef.current.rotation.y = angle;
    }
    // Walking animation — swing limbs
    const swing = Math.sin(t * worker.speed * 8) * 0.4;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.7;
    if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.7;
  });

  if (opacity <= 0) return null;
  return (
    <group ref={groupRef}>
      {/* Hard hat */}
      <mesh position={[0, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.14, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color={worker.hatColor} transparent opacity={opacity} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.62, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.04, 10]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color={worker.hatColor} transparent opacity={opacity} roughness={0.4} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#FDBCB4" transparent opacity={opacity} roughness={0.7} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[0.3, 0.5, 0.18]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color={worker.color} transparent opacity={opacity} roughness={0.6} />
      </mesh>
      {/* Left arm */}
      <group ref={leftArmRef} position={[-0.22, 1.3, 0]}>
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[0.1, 0.35, 0.1]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color={worker.color} transparent opacity={opacity} roughness={0.6} />
        </mesh>
      </group>
      {/* Right arm */}
      <group ref={rightArmRef} position={[0.22, 1.3, 0]}>
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[0.1, 0.35, 0.1]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color={worker.color} transparent opacity={opacity} roughness={0.6} />
        </mesh>
      </group>
      {/* Left leg */}
      <group ref={leftLegRef} position={[-0.08, 0.85, 0]}>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.12, 0.45, 0.12]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#374151" transparent opacity={opacity} roughness={0.7} />
        </mesh>
        {/* Boot */}
        <mesh position={[0, -0.47, 0.04]}>
          <boxGeometry args={[0.13, 0.08, 0.2]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#1a1a1a" transparent opacity={opacity} roughness={0.9} />
        </mesh>
      </group>
      {/* Right leg */}
      <group ref={rightLegRef} position={[0.08, 0.85, 0]}>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.12, 0.45, 0.12]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#374151" transparent opacity={opacity} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.47, 0.04]}>
          <boxGeometry args={[0.13, 0.08, 0.2]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#1a1a1a" transparent opacity={opacity} roughness={0.9} />
        </mesh>
      </group>
      {/* Role label */}
      <Html position={[0, 2.0, 0]} center>
        <div style={{
          background: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "2px 6px",
          borderRadius: 4,
          fontSize: 8,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          opacity: opacity > 0.5 ? 0.9 : 0,
          transition: "opacity 0.3s",
          border: `1px solid ${worker.color}44`,
        }}>
          👷 {worker.role}
        </div>
      </Html>
    </group>
  );
}

export function ConstructionWorkers({ progress }: { progress: number }) {
  return (
    <group>
      {WORKER_PATHS.map((w, i) => (
        <SingleWorker key={`worker-${i}`} worker={w} progress={progress} />
      ))}
    </group>
  );
}

// --- Animated Equipment ---
export function TowerCrane({ progress }: { progress: number }) {
  const craneRef = useRef<THREE.Group>(null!);
  const hookRef = useRef<THREE.Group>(null!);
  const active = progress > 15 && progress < 90;
  
  useFrame(({ clock }) => {
    if (craneRef.current && active) {
      const t = clock.getElapsedTime();
      // Slow slewing (rotation)
      craneRef.current.rotation.y = Math.sin(t * 0.2) * 1.5;
    }
    if (hookRef.current && active) {
      const t = clock.getElapsedTime();
      // Hook going up and down
      hookRef.current.position.y = 8 + Math.sin(t * 0.5) * 4;
    }
  });

  if (!active) return null;

  return (
    <group position={[-12, 0, 10]}>
      {/* Mast */}
      <mesh position={[0, 10, 0]}>
        <boxGeometry args={[0.8, 20, 0.8]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#EAB308" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Cabin & Jib Group */}
      <group ref={craneRef} position={[0, 20, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#222" />
        </mesh>
        {/* Jib */}
        <mesh position={[8, 0.5, 0]}>
          <boxGeometry args={[16, 0.6, 0.6]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#EAB308" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Counter-jib */}
        <mesh position={[-3, 0.5, 0]}>
          <boxGeometry args={[6, 0.6, 0.6]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#EAB308" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Counter-weight */}
        <mesh position={[-5, 0, 0]}>
          <boxGeometry args={[2, 1.5, 1]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#555" />
        </mesh>
        {/* Hook */}
        <group ref={hookRef} position={[12, 0, 0]}>
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 15]} />
            <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#111" />
          </mesh>
          <mesh position={[0, -8, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#111" />
          </mesh>
          <mesh position={[0, -8.4, 0]}>
            <torusGeometry args={[0.15, 0.05, 8, 12]} />
            <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#ff2222" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function ConstructionCrane({ progress }: { progress: number }) {
  const craneOpacity = Math.min(1, Math.max(0, (progress - 5) / 10));
  const fadeOut = progress > 85 ? Math.max(0, (95 - progress) / 10) : 1;
  const opacity = craneOpacity * fadeOut;
  if (opacity <= 0) return null;

  const craneX = BUILDING.width / 2 + 3;
  const craneZ = -BUILDING.depth / 2 + 2;
  const craneHeight = BUILDING.floors * BUILDING.floorHeight + 8;
  const boomLength = 16;
  const craneColor = "#FFB020";
  const counterColor = "#CC8810";

  // Slow rotation of the boom
  const boomRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (boomRef.current) {
      boomRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.4;
    }
  });

  return (
    <group position={[craneX, 0, craneZ]}>
      {/* Mast (vertical tower) */}
      <mesh position={[0, craneHeight / 2, 0]}>
        <boxGeometry args={[0.8, craneHeight, 0.8]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color={craneColor} transparent opacity={opacity} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Mast lattice lines */}
      {Array.from({ length: Math.floor(craneHeight / 2) }).map((_, i) => (
        <mesh key={`lattice-${i}`} position={[0, i * 2 + 1, 0]}>
          <boxGeometry args={[1, 0.08, 1]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color={"#DD9918"} transparent opacity={opacity * 0.8} metalness={0.3} />
        </mesh>
      ))}
      {/* Base */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[2.5, 0.4, 2.5]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color={"#555"} transparent opacity={opacity} metalness={0.5} roughness={0.6} />
      </mesh>
      {/* Rotating boom group */}
      <group ref={boomRef} position={[0, craneHeight, 0]}>
        {/* Boom (horizontal arm) */}
        <mesh position={[-boomLength / 2 + 2, 0.4, 0]}>
          <boxGeometry args={[boomLength, 0.5, 0.5]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color={craneColor} transparent opacity={opacity} metalness={0.4} roughness={0.5} />
        </mesh>
        {/* Counter-boom */}
        <mesh position={[4, 0.4, 0]}>
          <boxGeometry args={[5, 0.5, 0.5]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color={counterColor} transparent opacity={opacity} metalness={0.4} roughness={0.5} />
        </mesh>
        {/* Counterweight */}
        <mesh position={[6, -0.2, 0]}>
          <boxGeometry args={[1.5, 1, 1]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color={"#666"} transparent opacity={opacity} metalness={0.3} roughness={0.7} />
        </mesh>
        {/* Operator cabin */}
        <mesh position={[0.5, -0.3, 0]}>
          <boxGeometry args={[1.2, 1.2, 1]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color={craneColor} transparent opacity={opacity} metalness={0.3} roughness={0.5} />
        </mesh>
        {/* Hook cable */}
        <mesh position={[-boomLength / 2, -2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 4, 6]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color={"#333"} transparent opacity={opacity * 0.7} />
        </mesh>
        {/* Hook */}
        <mesh position={[-boomLength / 2, -4.2, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color={"#444"} transparent opacity={opacity} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

// --- Camera Animator (supports target positions for view presets) ---
export function CameraAnimator({ targetPos, lookAtPos, controlsRef }: { targetPos: [number, number, number]; lookAtPos?: [number, number, number]; controlsRef?: React.MutableRefObject<any> }) {
  const isAnimating = useRef(true);
  const startTime = useRef(Date.now());
  const startPos = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const endPos = useMemo(() => new THREE.Vector3(...targetPos), [targetPos]);
  const endTarget = useMemo(() => new THREE.Vector3(...(lookAtPos || [0, 6, 0])), [lookAtPos]);
  const duration = 1500;
  const initialized = useRef(false);

  useFrame(({ camera }) => {
    if (!initialized.current) {
      startPos.current.copy(camera.position);
      if (controlsRef?.current) {
        startTarget.current.copy(controlsRef.current.target);
      } else {
        startTarget.current.copy(endTarget);
      }
      initialized.current = true;
      isAnimating.current = true;
      startTime.current = Date.now();
    }
    if (!isAnimating.current) return;
    const elapsed = Date.now() - startTime.current;
    const t = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - t, 3);

    camera.position.lerpVectors(startPos.current, endPos, eased);
    if (controlsRef?.current) {
      controlsRef.current.target.lerpVectors(startTarget.current, endTarget, eased);
    } else {
      camera.lookAt(endTarget);
    }

    if (t >= 1) isAnimating.current = false;
  });

  return null;
}

// View presets
export const VIEW_PRESETS: Record<string, { pos: [number, number, number]; label: string; icon: string }> = {
  iso: { pos: [20, 15, 20], label: "Isometric", icon: "3D" },
  front: { pos: [0, 8, 30], label: "Front", icon: "F" },
  right: { pos: [30, 8, 0], label: "Right", icon: "R" },
  top: { pos: [0, 35, 0.1], label: "Top", icon: "T" },
  back: { pos: [0, 8, -30], label: "Back", icon: "B" },
};

// --- Construction Site Fence ---
export function ConstructionFence({ progress }: { progress: number }) {
  const opacity = Math.min(1, Math.max(0, (progress - 2) / 8));
  const fadeOut = progress > 90 ? Math.max(0, (100 - progress) / 10) : 1;
  const finalOpacity = opacity * fadeOut;
  if (finalOpacity <= 0) return null;

  const fenceW = BUILDING.width + 8;
  const fenceD = BUILDING.depth + 8;
  const postHeight = 1.2;
  const postSpacing = 3;
  const posts: React.ReactElement[] = [];

  // Generate fence posts around perimeter
  for (let x = -fenceW / 2; x <= fenceW / 2; x += postSpacing) {
    posts.push(
      <mesh key={`fp-f-${x}`} position={[x, postHeight / 2, fenceD / 2]}>
        <cylinderGeometry args={[0.05, 0.05, postHeight, 6]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#FF6600" transparent opacity={finalOpacity} />
      </mesh>,
      <mesh key={`fp-b-${x}`} position={[x, postHeight / 2, -fenceD / 2]}>
        <cylinderGeometry args={[0.05, 0.05, postHeight, 6]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#FF6600" transparent opacity={finalOpacity} />
      </mesh>
    );
  }
  for (let z = -fenceD / 2 + postSpacing; z < fenceD / 2; z += postSpacing) {
    posts.push(
      <mesh key={`fp-l-${z}`} position={[-fenceW / 2, postHeight / 2, z]}>
        <cylinderGeometry args={[0.05, 0.05, postHeight, 6]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#FF6600" transparent opacity={finalOpacity} />
      </mesh>,
      <mesh key={`fp-r-${z}`} position={[fenceW / 2, postHeight / 2, z]}>
        <cylinderGeometry args={[0.05, 0.05, postHeight, 6]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#FF6600" transparent opacity={finalOpacity} />
      </mesh>
    );
  }

  // Horizontal rails (2 levels)
  const rails: React.ReactElement[] = [];
  for (const h of [0.4, 0.9]) {
    // Front & back
    rails.push(
      <mesh key={`rail-f-${h}`} position={[0, h, fenceD / 2]}>
        <boxGeometry args={[fenceW, 0.04, 0.04]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#FF8800" transparent opacity={finalOpacity * 0.8} />
      </mesh>,
      <mesh key={`rail-b-${h}`} position={[0, h, -fenceD / 2]}>
        <boxGeometry args={[fenceW, 0.04, 0.04]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#FF8800" transparent opacity={finalOpacity * 0.8} />
      </mesh>
    );
    // Left & right
    rails.push(
      <mesh key={`rail-l-${h}`} position={[-fenceW / 2, h, 0]}>
        <boxGeometry args={[0.04, 0.04, fenceD]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#FF8800" transparent opacity={finalOpacity * 0.8} />
      </mesh>,
      <mesh key={`rail-r-${h}`} position={[fenceW / 2, h, 0]}>
        <boxGeometry args={[0.04, 0.04, fenceD]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#FF8800" transparent opacity={finalOpacity * 0.8} />
      </mesh>
    );
  }

  return (
    <group>
      {posts}
      {rails}
    </group>
  );
}

// --- Construction Site Vehicles & Equipment ---

export function Excavator({ progress }: { progress: number }) {
  const opacity = getPhaseOpacity(progress, 0, 25);
  const groupRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Group>(null);
  const leftTrackRef = useRef<THREE.Mesh>(null);
  const rightTrackRef = useRef<THREE.Mesh>(null);

  // Rectangular path around the foundation perimeter
  const pathHalfW = BUILDING.width / 2 + 5;
  const pathHalfD = BUILDING.depth / 2 + 5;
  const perimeter = 2 * (pathHalfW * 2 + pathHalfD * 2);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Arm bobbing animation (existing)
    if (armRef.current) {
      armRef.current.rotation.x = Math.sin(t * 0.8) * 0.12;
    }
    // Driving along rectangular path around foundation
    if (groupRef.current) {
      const speed = 0.06; // slow traversal
      const d = ((t * speed) % 1 + 1) % 1; // normalized 0-1 along perimeter
      const seg1 = (pathHalfW * 2) / perimeter;
      const seg2 = seg1 + (pathHalfD * 2) / perimeter;
      const seg3 = seg2 + (pathHalfW * 2) / perimeter;
      let px = 0, pz = 0, angle = 0;
      if (d < seg1) {
        // Bottom edge: left to right
        const frac = d / seg1;
        px = -pathHalfW + frac * pathHalfW * 2;
        pz = -pathHalfD;
        angle = -Math.PI / 2;
      } else if (d < seg2) {
        // Right edge: bottom to top
        const frac = (d - seg1) / (seg2 - seg1);
        px = pathHalfW;
        pz = -pathHalfD + frac * pathHalfD * 2;
        angle = 0;
      } else if (d < seg3) {
        // Top edge: right to left
        const frac = (d - seg2) / (seg3 - seg2);
        px = pathHalfW - frac * pathHalfW * 2;
        pz = pathHalfD;
        angle = Math.PI / 2;
      } else {
        // Left edge: top to bottom
        const frac = (d - seg3) / (1 - seg3);
        px = -pathHalfW;
        pz = pathHalfD - frac * pathHalfD * 2;
        angle = Math.PI;
      }
      groupRef.current.position.set(px, 0, pz);
      groupRef.current.rotation.y = angle;
      // Track rotation proportional to movement
      const trackSpin = t * speed * perimeter * 0.5;
      if (leftTrackRef.current) leftTrackRef.current.rotation.z = trackSpin;
      if (rightTrackRef.current) rightTrackRef.current.rotation.z = trackSpin;
    }
  });
  if (opacity <= 0) return null;
  return (
    <group ref={groupRef} position={[-BUILDING.width / 2 - 5, 0, -2]}>
      {/* Body */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[2, 1.2, 1.5]} />
        <meshPhysicalMaterial color="#E8B230" transparent opacity={opacity} roughness={0.4} metalness={0.3} clearcoat={0.5} />
      </mesh>
      {/* Cab */}
      <mesh position={[0.5, 1.9, 0]} castShadow>
        <boxGeometry args={[1, 0.8, 1.2]} />
        <meshPhysicalMaterial color="#D4A020" transparent opacity={opacity} roughness={0.3} metalness={0.4} clearcoat={0.6} />
        <Html position={[0, 1.5, 0]} center>
          <div style={{ background: "rgba(0,0,0,0.7)", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", whiteSpace: "nowrap", pointerEvents: "none", opacity: opacity > 0.5 ? 1 : 0, transition: "opacity 0.3s" }}>
            Excavating
          </div>
        </Html>
      </mesh>
      {/* Cab window */}
      <mesh position={[1.01, 2, 0]}>
        <boxGeometry args={[0.02, 0.45, 0.8]} />
        <meshPhysicalMaterial color="#88CCEE" transparent opacity={opacity * 0.5} roughness={0.1} metalness={0.9} clearcoat={1.0} />
      </mesh>
      {/* Left track */}
      <mesh ref={leftTrackRef} position={[0, 0.2, 0.65]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 2.4, 8]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#333" transparent opacity={opacity} roughness={0.9} />
      </mesh>
      {/* Right track */}
      <mesh ref={rightTrackRef} position={[0, 0.2, -0.65]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 2.4, 8]} />
        <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#333" transparent opacity={opacity} roughness={0.9} />
      </mesh>
      {/* Arm assembly */}
      <group ref={armRef} position={[-0.8, 1.6, 0]}>
        {/* Boom */}
        <mesh position={[-1, 0.4, 0]} rotation={[0, 0, 0.4]}>
          <boxGeometry args={[2.2, 0.3, 0.25]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#D4A020" transparent opacity={opacity} roughness={0.5} />
        </mesh>
        {/* Stick */}
        <mesh position={[-2.3, 0.2, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[1.5, 0.22, 0.2]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#C09018" transparent opacity={opacity} roughness={0.5} />
        </mesh>
        {/* Bucket */}
        <mesh position={[-3.1, -0.15, 0]} rotation={[0, 0, -0.6]}>
          <boxGeometry args={[0.6, 0.5, 0.7]} />
          <meshPhysicalMaterial color="#888" transparent opacity={opacity} roughness={0.4} metalness={0.8} clearcoat={0.2} />
        </mesh>
      </group>
    </group>
  );
}

export function ConcreteMixer({ progress }: { progress: number }) {
  const opacity = getPhaseOpacity(progress, 10, 45);
  const groupRef = useRef<THREE.Group>(null);
  const drumRef = useRef<THREE.Mesh>(null);
  const wheelRefs = useRef<THREE.Mesh[]>([]);

  // Drive toward building, pause (pour), reverse back, loop
  const startX = BUILDING.width / 2 + 14; // off-site start
  const pourX = BUILDING.width / 2 + 2;   // near building
  const pz = 3;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Drum rotation (existing)
    if (drumRef.current) {
      drumRef.current.rotation.x += 0.02;
    }
    // Driving animation: approach → pause → reverse → pause (12s cycle)
    if (groupRef.current) {
      const cycle = 12; // seconds per full cycle
      const phase = (t % cycle) / cycle; // 0-1 normalized
      let px: number;
      let facingAngle: number;
      if (phase < 0.35) {
        // Drive toward building (0% - 35%)
        const frac = phase / 0.35;
        const ease = frac * frac * (3 - 2 * frac); // smoothstep
        px = startX - ease * (startX - pourX);
        facingAngle = Math.PI; // face left toward building
      } else if (phase < 0.55) {
        // Paused at pour site (35% - 55%)
        px = pourX;
        facingAngle = Math.PI;
      } else if (phase < 0.9) {
        // Reverse back (55% - 90%)
        const frac = (phase - 0.55) / 0.35;
        const ease = frac * frac * (3 - 2 * frac);
        px = pourX + ease * (startX - pourX);
        facingAngle = 0; // face right away from building
      } else {
        // Paused off-site (90% - 100%)
        px = startX;
        facingAngle = 0;
      }
      groupRef.current.position.set(px, 0, pz);
      groupRef.current.rotation.y = facingAngle;
      // Wheel rotation proportional to movement
      const wheelSpin = t * 2.0;
      wheelRefs.current.forEach(w => {
        if (w) w.rotation.y = wheelSpin;
      });
    }
  });
  if (opacity <= 0) return null;
  return (
    <group ref={groupRef} position={[startX, 0, pz]}>
      {/* Truck body */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[3, 1.2, 1.5]} />
        <meshPhysicalMaterial color="#E0E0E0" transparent opacity={opacity} roughness={0.4} metalness={0.2} clearcoat={0.8} />
      </mesh>
      {/* Cab */}
      <mesh position={[1.7, 1.1, 0]} castShadow>
        <boxGeometry args={[1, 1, 1.4]} />
        <meshPhysicalMaterial color="#CCCCCC" transparent opacity={opacity} roughness={0.3} metalness={0.3} clearcoat={0.9} />
      </mesh>
      {/* Drum */}
      <mesh ref={drumRef} position={[-0.2, 1.7, 0]} rotation={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.7, 0.9, 2.2, 12]} />
        <meshPhysicalMaterial color="#F0F0F0" transparent opacity={opacity} roughness={0.3} metalness={0.6} clearcoat={0.4} />
        <Html position={[0, 1.5, 0]} center>
          <div style={{ background: "rgba(0,0,0,0.7)", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", whiteSpace: "nowrap", pointerEvents: "none", opacity: opacity > 0.5 ? 1 : 0, transition: "opacity 0.3s" }}>
            Mixing Concrete
          </div>
        </Html>
      </mesh>
      {/* Wheels - left side */}
      {[-0.9, -0.4, 0.7, 1.2].map((wx, i) => (
        <mesh key={`mw-${i}`} ref={(el) => { if (el) wheelRefs.current[i] = el; }} position={[wx, 0.2, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.15, 10]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#222" transparent opacity={opacity} roughness={0.9} />
        </mesh>
      ))}
      {/* Wheels - right side */}
      {[-0.9, -0.4, 0.7, 1.2].map((wx, i) => (
        <mesh key={`mw2-${i}`} ref={(el) => { if (el) wheelRefs.current[i + 4] = el; }} position={[wx, 0.2, -0.8]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.15, 10]} />
          <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#222" transparent opacity={opacity} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function DumpTruck({ progress }: { progress: number }) {
  const opacity = getPhaseOpacity(progress, 0, 30);
  const groupRef = useRef<THREE.Group>(null);
  const bedRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<THREE.Mesh[]>([]);

  // Drive in from off-site, stop near excavator area, dump, drive away
  const offSiteZ = -BUILDING.depth / 2 - 20; // far off-site
  const dumpZ = -BUILDING.depth / 2 - 3;      // near excavator
  const driveX = -BUILDING.width / 2 - 8;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      const cycle = 16; // seconds per full cycle
      const phase = (t % cycle) / cycle; // 0-1 normalized
      let pz: number;
      let facingAngle: number;
      let dumpAngle = 0;
      if (phase < 0.25) {
        // Drive in toward dump site (0% - 25%)
        const frac = phase / 0.25;
        const ease = frac * frac * (3 - 2 * frac);
        pz = offSiteZ + ease * (dumpZ - offSiteZ);
        facingAngle = 0; // face +Z
      } else if (phase < 0.55) {
        // Stopped, dump bed lifts and lowers (25% - 55%)
        pz = dumpZ;
        facingAngle = 0;
        const dumpPhase = (phase - 0.25) / 0.3;
        dumpAngle = Math.sin(dumpPhase * Math.PI) * 0.5;
      } else if (phase < 0.85) {
        // Drive away (55% - 85%)
        const frac = (phase - 0.55) / 0.3;
        const ease = frac * frac * (3 - 2 * frac);
        pz = dumpZ - ease * (dumpZ - offSiteZ);
        facingAngle = Math.PI; // face -Z (driving away)
      } else {
        // Paused off-site (85% - 100%)
        pz = offSiteZ;
        facingAngle = Math.PI;
      }
      groupRef.current.position.set(driveX, 0, pz);
      groupRef.current.rotation.y = facingAngle;
      // Dump bed animation
      if (bedRef.current) {
        bedRef.current.rotation.z = dumpAngle;
      }
      // Wheel rotation proportional to movement
      const wheelSpin = t * 1.5;
      wheelRefs.current.forEach(w => {
        if (w) w.rotation.y = wheelSpin;
      });
    }
  });
  if (opacity <= 0) return null;
  return (
    <group ref={groupRef} position={[driveX, 0, offSiteZ]}>
      {/* Cab */}
      <mesh position={[0, 1.2, 1.5]} castShadow>
        <boxGeometry args={[1.6, 1.2, 1.2]} />
        <meshPhysicalMaterial color="#CC2222" transparent opacity={opacity} roughness={0.3} metalness={0.4} clearcoat={0.8} />
      </mesh>
      {/* Dump Bed Pivot Group */}
      <group position={[0, 0.9, 0.9]}>
        <group ref={bedRef} position={[0, 0, -1.4]}>
          {/* Dump Bed */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[1.8, 1, 2.8]} />
            <meshPhysicalMaterial color="#888888" transparent opacity={opacity} roughness={0.6} metalness={0.5} />
          </mesh>
          {/* Dirt Load */}
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[1.5, 0.2, 2.5]} />
            <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#654321" transparent opacity={opacity} roughness={1.0} />
          </mesh>
        </group>
      </group>
      {/* Wheels */}
      {[-0.8, -0.1, 1.5].map((wz, i) => (
        <group key={`dt-w-${i}`}>
          <mesh ref={(el) => { if (el) wheelRefs.current[i * 2] = el; }} position={[0.9, 0.4, wz]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.3, 12]} />
            <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#222" transparent opacity={opacity} roughness={0.9} />
          </mesh>
          <mesh ref={(el) => { if (el) wheelRefs.current[i * 2 + 1] = el; }} position={[-0.9, 0.4, wz]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.3, 12]} />
            <meshPhysicalMaterial clearcoat={0.3} clearcoatRoughness={0.2} color="#222" transparent opacity={opacity} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}


// --- Safety Zones ---
