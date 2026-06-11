import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SceneProps, getPhaseOpacity } from "../templates";

// ─── Color palette for blocks ───────────────────────────────────
const BLOCK_COLORS = [
  "#7C3AED", "#2563EB", "#059669", "#0891B2", "#D97706",
  "#DC2626", "#16A34A", "#EC4899", "#6366F1", "#F59E0B",
];

// ─── Layout constants ───────────────────────────────────────────
const SPIRAL_RADIUS = 8;
const BLOCK_VERTICAL_SPACING = 3;
const BLOCK_SIZE: [number, number, number] = [2.2, 1.4, 2.2];

// ═════════════════════════════════════════════════════════════════
// 1. BASE PLATFORM — concentric rings with tech patterns
// ═════════════════════════════════════════════════════════════════
function BasePlatform() {
  const ringCount = 6;
  const baseRadius = 14;
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <cylinderGeometry args={[baseRadius, baseRadius, 0.12, 48]} />
        <meshStandardMaterial
          color="#0c0a1e"
          metalness={0.7}
          roughness={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Concentric rings */}
      {Array.from({ length: ringCount }, (_, i) => {
        const r = ((i + 1) / ringCount) * baseRadius;
        return (
          <mesh key={`ring-${i}`} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <torusGeometry args={[r, 0.03, 6, 64]} />
            <meshStandardMaterial
              color="#4338ca"
              transparent
              opacity={0.15 + (i / ringCount) * 0.15}
              emissive="#4338ca"
              emissiveIntensity={0.3}
            />
          </mesh>
        );
      })}

      {/* Radial tick marks */}
      {Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const cx = Math.cos(angle) * (baseRadius * 0.4);
        const cz = Math.sin(angle) * (baseRadius * 0.4);
        return (
          <mesh
            key={`tick-${i}`}
            position={[cx, 0.02, cz]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[baseRadius * 0.5, 0.02, 0.02]} />
            <meshStandardMaterial
              color="#6366F1"
              transparent
              opacity={0.08}
              emissive="#6366F1"
              emissiveIntensity={0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
// 2. HOLOGRAPHIC GRID — subtle grid plane with fading edges
// ═════════════════════════════════════════════════════════════════
function HolographicGrid() {
  const gridRef = useRef<THREE.Group>(null!);
  const lineCount = 30;
  const gridSize = 20;

  useFrame(({ clock }) => {
    if (gridRef.current) {
      const children = gridRef.current.children;
      const t = clock.getElapsedTime();
      children.forEach((child, idx) => {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.opacity = 0.04 + Math.sin(t * 0.5 + idx * 0.2) * 0.02;
        }
      });
    }
  });

  const lines = useMemo(() => {
    const result: { pos: [number, number, number]; scale: [number, number, number]; isX: boolean }[] = [];
    for (let i = 0; i <= lineCount; i++) {
      const offset = (i / lineCount - 0.5) * gridSize;
      // X-parallel line
      result.push({
        pos: [0, -0.02, offset],
        scale: [gridSize, 0.01, 0.01],
        isX: true,
      });
      // Z-parallel line
      result.push({
        pos: [offset, -0.02, 0],
        scale: [0.01, 0.01, gridSize],
        isX: false,
      });
    }
    return result;
  }, []);

  return (
    <group ref={gridRef}>
      {lines.map((line, i) => (
        <mesh key={`grid-${i}`} position={line.pos}>
          <boxGeometry args={line.scale} />
          <meshStandardMaterial
            color="#818CF8"
            transparent
            opacity={0.05}
            emissive="#818CF8"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
// 3. HEXAGONAL PLATFORM — 6-sided cylinder under each block
// ═════════════════════════════════════════════════════════════════
function HexPlatform({
  position,
  color,
  opacity,
}: {
  position: [number, number, number];
  color: string;
  opacity: number;
}) {
  const glowRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.15;
    }
  });

  if (opacity <= 0) return null;

  return (
    <group position={position}>
      {/* Main hex platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 0.15, 6]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity * 0.35}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Glow disc underneath */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
        <cylinderGeometry args={[2.3, 2.3, 0.03, 6]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity * 0.2}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Edge ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.0, 0]}>
        <torusGeometry args={[2.0, 0.03, 4, 6]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity * 0.5}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
// 4. BEVELED PHASE BLOCK — inner box + frame edges + glow + screen
// ═════════════════════════════════════════════════════════════════
function PhaseBlock({
  index,
  position,
  color,
  opacity,
  isSelected,
  isCompleted,
  completionFraction,
  xray,
}: {
  index: number;
  position: [number, number, number];
  color: string;
  opacity: number;
  isSelected: boolean;
  isCompleted: boolean;
  completionFraction: number;
  xray: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const frameRef = useRef<THREE.Mesh>(null!);
  const screenRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (!groupRef.current || !meshRef.current) return;
    const t = clock.getElapsedTime();

    // Floating bob animation for the entire block
    groupRef.current.position.y = position[1] + Math.sin(t * 1.2 + index) * 0.15;

    // Completed blocks: gentle pulse scale
    if (isCompleted && opacity > 0) {
      const scale = 1 + Math.sin(t * 2 + index) * 0.04;
      meshRef.current.scale.setScalar(scale);
    } else {
      meshRef.current.scale.setScalar(1);
    }

    // Glow ring pulse for selected
    if (glowRef.current) {
      const s = 1 + Math.sin(t * 3) * 0.1;
      glowRef.current.scale.setScalar(s);
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.8 + Math.sin(t * 4) * 0.4;
    }

    // Frame edge shimmer
    if (frameRef.current) {
      const mat = frameRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + Math.sin(t * 1.5 + index * 0.5) * 0.15;
    }

    // Screen flicker
    if (screenRef.current) {
      const mat = screenRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + Math.sin(t * 5 + index) * 0.1;
    }
  });

  if (opacity <= 0) return null;

  const effectiveOpacity = xray ? Math.min(opacity, 0.35) : opacity;

  return (
    <group ref={groupRef} position={position}>
      {/* Inner core box */}
      <mesh ref={meshRef}>
        <boxGeometry args={[BLOCK_SIZE[0] - 0.15, BLOCK_SIZE[1] - 0.15, BLOCK_SIZE[2] - 0.15]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={effectiveOpacity * 0.9}
          metalness={0.4}
          roughness={0.2}
          emissive={isSelected ? color : "#000000"}
          emissiveIntensity={isSelected ? 0.8 : 0}
          clearcoat={0.5}
          clearcoatRoughness={0.1}
        />
      </mesh>

      {/* Wireframe bevel edges */}
      <mesh ref={frameRef}>
        <boxGeometry args={BLOCK_SIZE} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={effectiveOpacity * 0.3}
          wireframe
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Front "screen" face — darker emissive rectangle */}
      <mesh
        ref={screenRef}
        position={[0, 0, BLOCK_SIZE[2] / 2 + 0.01]}
      >
        <boxGeometry args={[BLOCK_SIZE[0] * 0.7, BLOCK_SIZE[1] * 0.5, 0.02]} />
        <meshStandardMaterial
          color="#0a0a1a"
          transparent
          opacity={effectiveOpacity * 0.8}
          emissive={isCompleted ? "#4ade80" : color}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Completion bar on screen */}
      {completionFraction > 0 && (
        <mesh
          position={[
            -BLOCK_SIZE[0] * 0.35 + (BLOCK_SIZE[0] * 0.7 * completionFraction) / 2,
            -BLOCK_SIZE[1] * 0.15,
            BLOCK_SIZE[2] / 2 + 0.025,
          ]}
        >
          <boxGeometry
            args={[BLOCK_SIZE[0] * 0.7 * completionFraction, 0.12, 0.02]}
          />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={effectiveOpacity * 0.85}
            emissive="#ffffff"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}

      {/* Selection glow ring */}
      {isSelected && (
        <mesh ref={glowRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.4, 0.1, 8, 32]} />
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.7}
            emissive={color}
            emissiveIntensity={1.2}
          />
        </mesh>
      )}
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
// 5. STATUS INDICATOR — traffic-light style (red/yellow/green)
// ═════════════════════════════════════════════════════════════════
function StatusIndicator({
  position,
  completionFraction,
  opacity,
}: {
  position: [number, number, number];
  completionFraction: number;
  opacity: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + Math.sin(clock.getElapsedTime() * 3) * 0.2;
    }
  });

  if (opacity <= 0) return null;

  // Determine status color
  let statusColor: string;
  if (completionFraction >= 1) {
    statusColor = "#22c55e"; // green
  } else if (completionFraction > 0) {
    statusColor = "#eab308"; // yellow
  } else {
    statusColor = "#ef4444"; // red
  }

  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 6]} />
        <meshStandardMaterial
          color="#334155"
          transparent
          opacity={opacity * 0.6}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>

      {/* Status light sphere */}
      <mesh ref={ref} position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={0.5}
          transparent
          opacity={opacity * 0.9}
        />
      </mesh>

      {/* Halo */}
      <mesh position={[0, 0.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.02, 6, 16]} />
        <meshStandardMaterial
          color={statusColor}
          transparent
          opacity={opacity * 0.3}
          emissive={statusColor}
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
// 6. ACHIEVEMENT MARKER — diamond shape on completed blocks
// ═════════════════════════════════════════════════════════════════
function AchievementMarker({
  position,
  isCompleted,
  opacity,
  color,
}: {
  position: [number, number, number];
  isCompleted: boolean;
  opacity: number;
  color: string;
}) {
  const ref = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 1.5;
      const bob = Math.sin(clock.getElapsedTime() * 2) * 0.1;
      ref.current.position.y = position[1] + bob;
    }
  });

  if (!isCompleted || opacity <= 0) return null;

  return (
    <group ref={ref} position={position}>
      {/* Diamond = two cones tip-to-tip */}
      <mesh position={[0, 0.15, 0]}>
        <coneGeometry args={[0.22, 0.3, 4]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#fbbf24"
          emissiveIntensity={0.7}
          transparent
          opacity={opacity * 0.9}
          metalness={0.8}
          roughness={0.1}
        />
      </mesh>
      <mesh position={[0, -0.15, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.22, 0.3, 4]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#fbbf24"
          emissiveIntensity={0.7}
          transparent
          opacity={opacity * 0.9}
          metalness={0.8}
          roughness={0.1}
        />
      </mesh>

      {/* Star glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.35, 0.02, 6, 8]} />
        <meshStandardMaterial
          color="#fde68a"
          emissive="#fde68a"
          emissiveIntensity={0.6}
          transparent
          opacity={opacity * 0.5}
        />
      </mesh>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
// 7. DATA-FLOW PARTICLES — animated particles along connections
// ═════════════════════════════════════════════════════════════════
function DataFlowParticles({
  from,
  to,
  opacity,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  opacity: number;
  color: string;
}) {
  const particleCount = 5;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const offsets = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      phase: i / particleCount,
      speed: 0.3 + Math.random() * 0.3,
      wobble: Math.random() * 0.3,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current || opacity <= 0) return;
    const t = clock.getElapsedTime();

    offsets.forEach((p, i) => {
      const progress = (t * p.speed + p.phase) % 1;
      const x = from[0] + (to[0] - from[0]) * progress;
      const y = from[1] + (to[1] - from[1]) * progress + Math.sin(progress * Math.PI) * p.wobble;
      const z = from[2] + (to[2] - from[2]) * progress;
      dummy.position.set(x, y, z);
      const s = 0.06 + Math.sin(progress * Math.PI) * 0.04;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (opacity <= 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.0}
        transparent
        opacity={opacity * 0.9}
      />
    </instancedMesh>
  );
}

// ═════════════════════════════════════════════════════════════════
// 8. CONNECTING LINE — cylinder between blocks
// ═════════════════════════════════════════════════════════════════
function ConnectingLine({
  from,
  to,
  opacity,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  opacity: number;
  color: string;
}) {
  const { position, rotation, length } = useMemo(() => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const midX = (from[0] + to[0]) / 2;
    const midY = (from[1] + to[1]) / 2;
    const midZ = (from[2] + to[2]) / 2;

    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    const euler = new THREE.Euler().setFromQuaternion(quat);

    return {
      position: [midX, midY, midZ] as [number, number, number],
      rotation: euler,
      length: len,
    };
  }, [from, to]);

  if (opacity <= 0) return null;

  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[0.04, 0.04, length, 6]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity * 0.3}
        metalness={0.4}
        roughness={0.5}
        emissive={color}
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

// ═════════════════════════════════════════════════════════════════
// 9. CONNECTING BRIDGE — thin walkway box between adjacent blocks
// ═════════════════════════════════════════════════════════════════
function ConnectingBridge({
  from,
  to,
  opacity,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  opacity: number;
  color: string;
}) {
  const { position, rotY, length } = useMemo(() => {
    const dx = to[0] - from[0];
    const dz = to[2] - from[2];
    const len = Math.sqrt(dx * dx + dz * dz);
    const midX = (from[0] + to[0]) / 2;
    const midY = Math.min(from[1], to[1]) - BLOCK_SIZE[1] / 2 - 0.2;
    const midZ = (from[2] + to[2]) / 2;
    const angle = Math.atan2(dz, dx);

    return {
      position: [midX, midY, midZ] as [number, number, number],
      rotY: -angle,
      length: len,
    };
  }, [from, to]);

  if (opacity <= 0) return null;

  return (
    <mesh position={position} rotation={[0, rotY, 0]}>
      <boxGeometry args={[length, 0.06, 0.4]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity * 0.25}
        metalness={0.5}
        roughness={0.3}
        emissive={color}
        emissiveIntensity={0.1}
      />
    </mesh>
  );
}

// ═════════════════════════════════════════════════════════════════
// 10. PROGRESS RING — multi-ring torus with tick marks
// ═════════════════════════════════════════════════════════════════
function ProgressRing({ progress }: { progress: number }) {
  const ringRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = clock.getElapsedTime() * 0.08;
    }
  });

  const progressAngle = Math.max(0.01, (progress / 100) * Math.PI * 2);

  const arcGeo = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, 6, 6, 0, progressAngle, false, 0);
    const points = curve.getPoints(64);
    return new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        points.map((p) => new THREE.Vector3(p.x, 0, p.y)),
        false
      ),
      64,
      0.18,
      8,
      false
    );
  }, [progressAngle]);

  // Tick mark positions
  const tickMarks = useMemo(() => {
    const ticks: { x: number; z: number; angle: number }[] = [];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      ticks.push({ x: Math.cos(a) * 6, z: Math.sin(a) * 6, angle: a });
    }
    return ticks;
  }, []);

  return (
    <group position={[0, 0.1, 0]}>
      {/* Background ring 1 */}
      <mesh>
        <torusGeometry args={[6, 0.1, 6, 64]} />
        <meshStandardMaterial
          color="#1e1b4b"
          transparent
          opacity={0.2}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Background ring 2 — outer */}
      <mesh>
        <torusGeometry args={[6.5, 0.04, 6, 64]} />
        <meshStandardMaterial
          color="#312e81"
          transparent
          opacity={0.15}
          emissive="#4338ca"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Background ring 3 — inner */}
      <mesh>
        <torusGeometry args={[5.5, 0.04, 6, 64]} />
        <meshStandardMaterial
          color="#312e81"
          transparent
          opacity={0.15}
          emissive="#4338ca"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Tick marks */}
      {tickMarks.map((tick, i) => (
        <mesh key={`tick-${i}`} position={[tick.x, 0, tick.z]} rotation={[0, -tick.angle + Math.PI / 2, 0]}>
          <boxGeometry args={[0.04, 0.04, 0.3]} />
          <meshStandardMaterial
            color={i / 20 <= progress / 100 ? "#4ade80" : "#334155"}
            transparent
            opacity={0.5}
            emissive={i / 20 <= progress / 100 ? "#4ade80" : "#000000"}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}

      {/* Progress arc */}
      {progress > 0 && (
        <mesh ref={ringRef} geometry={arcGeo}>
          <meshStandardMaterial
            color="#4ade80"
            emissive="#4ade80"
            emissiveIntensity={0.6}
            transparent
            opacity={0.85}
            metalness={0.5}
            roughness={0.2}
          />
        </mesh>
      )}
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
// 11. CENTRAL PILLAR — glass-like with internal energy particles
// ═════════════════════════════════════════════════════════════════
function CentralPillar({
  progress,
  totalHeight,
}: {
  progress: number;
  totalHeight: number;
}) {
  const pillarRef = useRef<THREE.Mesh>(null!);
  const innerRef = useRef<THREE.Mesh>(null!);
  const particlesRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const fillHeight = (progress / 100) * totalHeight;
  const energyParticleCount = 30;

  const particleSeeds = useMemo(() => {
    return Array.from({ length: energyParticleCount }, () => ({
      radius: Math.random() * 0.5,
      speed: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      rotSpeed: 0.5 + Math.random() * 2,
    }));
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (pillarRef.current) {
      const mat = pillarRef.current.material as THREE.MeshPhysicalMaterial;
      mat.emissiveIntensity = 0.1 + Math.sin(t * 1.5) * 0.06;
    }

    if (innerRef.current) {
      const mat = innerRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.15;
    }

    // Animate energy particles rising
    if (particlesRef.current && fillHeight > 0.5) {
      particleSeeds.forEach((seed, i) => {
        const yProgress = (t * seed.speed + seed.phase) % 1;
        const y = yProgress * fillHeight;
        const angle = t * seed.rotSpeed + seed.phase;
        const r = seed.radius;
        dummy.position.set(
          Math.cos(angle) * r,
          y,
          Math.sin(angle) * r
        );
        const s = 0.03 + Math.sin(yProgress * Math.PI) * 0.03;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        particlesRef.current.setMatrixAt(i, dummy.matrix);
      });
      particlesRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outer glass pillar */}
      <mesh ref={pillarRef} position={[0, totalHeight / 2, 0]}>
        <cylinderGeometry args={[0.8, 1.0, totalHeight, 16]} />
        <meshPhysicalMaterial
          color="#6366F1"
          transparent
          opacity={0.08}
          metalness={0.1}
          roughness={0.05}
          emissive="#6366F1"
          emissiveIntensity={0.1}
          side={THREE.DoubleSide}
          transmission={0.6}
          thickness={0.5}
        />
      </mesh>

      {/* Inner fill */}
      {fillHeight > 0 && (
        <mesh ref={innerRef} position={[0, fillHeight / 2, 0]}>
          <cylinderGeometry args={[0.45, 0.65, fillHeight, 12]} />
          <meshStandardMaterial
            color="#818CF8"
            transparent
            opacity={0.3}
            metalness={0.7}
            roughness={0.15}
            emissive="#818CF8"
            emissiveIntensity={0.4}
          />
        </mesh>
      )}

      {/* Energy particles inside */}
      {fillHeight > 0.5 && (
        <instancedMesh ref={particlesRef} args={[undefined, undefined, energyParticleCount]}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial
            color="#c4b5fd"
            emissive="#a78bfa"
            emissiveIntensity={1.2}
            transparent
            opacity={0.8}
          />
        </instancedMesh>
      )}

      {/* Pillar cap ring */}
      <mesh position={[0, fillHeight + 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.65, 0.08, 8, 24]} />
        <meshStandardMaterial
          color="#a5b4fc"
          emissive="#a5b4fc"
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Top beacon */}
      <mesh position={[0, totalHeight + 0.5, 0]}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial
          color="#818CF8"
          emissive="#818CF8"
          emissiveIntensity={0.5}
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
// 12. ORBITING DATA NODES — electrons around completed blocks
// ═════════════════════════════════════════════════════════════════
function OrbitingNodes({
  blockPositions,
  blockCompleted,
  blockOpacities,
  blockColors,
}: {
  blockPositions: [number, number, number][];
  blockCompleted: boolean[];
  blockOpacities: number[];
  blockColors: string[];
}) {
  const nodesPerBlock = 3;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const trailRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const nodeData = useMemo(() => {
    const data: { blockIdx: number; orbitRadius: number; speed: number; phase: number; tilt: number }[] = [];
    blockPositions.forEach((_, bIdx) => {
      for (let n = 0; n < nodesPerBlock; n++) {
        data.push({
          blockIdx: bIdx,
          orbitRadius: 1.8 + n * 0.4,
          speed: 1.5 + n * 0.5,
          phase: (n / nodesPerBlock) * Math.PI * 2,
          tilt: (n - 1) * 0.3,
        });
      }
    });
    return data;
  }, [blockPositions]);

  const totalNodes = nodeData.length;
  const trailsPerNode = 3;
  const totalTrails = totalNodes * trailsPerNode;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    nodeData.forEach((nd, i) => {
      if (!blockCompleted[nd.blockIdx] || blockOpacities[nd.blockIdx] <= 0) {
        dummy.position.set(0, -1000, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);

        // Hide trails too
        if (trailRef.current) {
          for (let tr = 0; tr < trailsPerNode; tr++) {
            dummy.updateMatrix();
            trailRef.current.setMatrixAt(i * trailsPerNode + tr, dummy.matrix);
          }
        }
        return;
      }

      const bPos = blockPositions[nd.blockIdx];
      const angle = t * nd.speed + nd.phase;
      const r = nd.orbitRadius;

      const x = bPos[0] + Math.cos(angle) * r;
      const y = bPos[1] + nd.tilt + Math.sin(angle * 0.5) * 0.3;
      const z = bPos[2] + Math.sin(angle) * r;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(0.1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Trail dots behind
      if (trailRef.current) {
        for (let tr = 0; tr < trailsPerNode; tr++) {
          const trailAngle = angle - (tr + 1) * 0.15;
          const tx = bPos[0] + Math.cos(trailAngle) * r;
          const ty = bPos[1] + nd.tilt + Math.sin(trailAngle * 0.5) * 0.3;
          const tz = bPos[2] + Math.sin(trailAngle) * r;
          dummy.position.set(tx, ty, tz);
          dummy.scale.setScalar(0.06 - tr * 0.015);
          dummy.updateMatrix();
          trailRef.current.setMatrixAt(i * trailsPerNode + tr, dummy.matrix);
        }
      }
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (trailRef.current) trailRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {/* Main nodes */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, totalNodes]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial
          color="#e0e7ff"
          emissive="#a5b4fc"
          emissiveIntensity={1.0}
          transparent
          opacity={0.9}
        />
      </instancedMesh>

      {/* Trail particles */}
      <instancedMesh ref={trailRef} args={[undefined, undefined, totalTrails]}>
        <sphereGeometry args={[1, 4, 4]} />
        <meshStandardMaterial
          color="#c7d2fe"
          emissive="#818CF8"
          emissiveIntensity={0.6}
          transparent
          opacity={0.4}
        />
      </instancedMesh>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════
// 13. ENERGY BEAMS — vertical emissive cylinders from completed blocks
// ═════════════════════════════════════════════════════════════════
function EnergyBeams({
  blockPositions,
  blockCompleted,
  blockOpacities,
  blockColors,
  ceilingHeight,
}: {
  blockPositions: [number, number, number][];
  blockCompleted: boolean[];
  blockOpacities: number[];
  blockColors: string[];
  ceilingHeight: number;
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((ref, i) => {
      if (ref) {
        const mat = ref.material as THREE.MeshStandardMaterial;
        mat.opacity = 0.08 + Math.sin(t * 2 + i * 1.2) * 0.04;
        mat.emissiveIntensity = 0.4 + Math.sin(t * 3 + i) * 0.2;
      }
    });
  });

  return (
    <>
      {blockPositions.map((pos, i) => {
        if (!blockCompleted[i] || blockOpacities[i] <= 0) return null;
        const beamHeight = ceilingHeight - pos[1] + 2;
        return (
          <mesh
            key={`beam-${i}`}
            ref={(el) => { refs.current[i] = el; }}
            position={[pos[0], pos[1] + beamHeight / 2, pos[2]]}
          >
            <cylinderGeometry args={[0.08, 0.15, beamHeight, 8]} />
            <meshStandardMaterial
              color={blockColors[i]}
              transparent
              opacity={0.1}
              emissive={blockColors[i]}
              emissiveIntensity={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════
// 14. FLOATING METRICS RING — outer ring of cubes for sub-tasks
// ═════════════════════════════════════════════════════════════════
function MetricsRing({
  progress,
  blockCount,
}: {
  progress: number;
  blockCount: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const cubeCount = blockCount * 4; // 4 sub-task cubes per block
  const ringRadius = 11;

  const cubeColors = useMemo(() => {
    const colors: THREE.Color[] = [];
    for (let i = 0; i < cubeCount; i++) {
      const blockIdx = Math.floor(i / 4);
      const c = new THREE.Color(BLOCK_COLORS[blockIdx % BLOCK_COLORS.length]);
      colors.push(c);
    }
    return colors;
  }, [cubeCount]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    const colorArray = new Float32Array(cubeCount * 3);

    for (let i = 0; i < cubeCount; i++) {
      const angle = (i / cubeCount) * Math.PI * 2 + t * 0.1;
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius;
      const y = 0.5 + Math.sin(t * 1.5 + i * 0.3) * 0.2;

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, -angle, t * 0.5 + i);

      const cubeProgress = (i / cubeCount) * 100;
      const s = cubeProgress <= progress ? 0.2 : 0.1;
      dummy.scale.setScalar(s);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Set per-instance color
      const col = cubeProgress <= progress
        ? cubeColors[i]
        : new THREE.Color("#1e1b4b");

      colorArray[i * 3] = col.r;
      colorArray[i * 3 + 1] = col.g;
      colorArray[i * 3 + 2] = col.b;
    }

    meshRef.current.instanceMatrix.needsUpdate = true;

    // Update instance colors
    if (!meshRef.current.instanceColor) {
      meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3);
    } else {
      meshRef.current.instanceColor.array = colorArray;
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, cubeCount]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#6366F1"
        emissive="#6366F1"
        emissiveIntensity={0.3}
        transparent
        opacity={0.6}
        metalness={0.5}
        roughness={0.3}
      />
    </instancedMesh>
  );
}

// ═════════════════════════════════════════════════════════════════
// 15. AMBIENT PARTICLES — floating dust with random movement
// ═════════════════════════════════════════════════════════════════
function AmbientParticles({ totalHeight }: { totalHeight: number }) {
  const count = 80;
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const seeds = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 28,
      y: Math.random() * (totalHeight + 8),
      z: (Math.random() - 0.5) * 28,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: 0.1 + Math.random() * 0.3,
      speedZ: (Math.random() - 0.5) * 0.3,
      phase: Math.random() * Math.PI * 2,
      size: 0.03 + Math.random() * 0.04,
    }));
  }, [totalHeight]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    seeds.forEach((s, i) => {
      const x = s.x + Math.sin(t * s.speedX + s.phase) * 2;
      const y = (s.y + t * s.speedY) % (totalHeight + 10);
      const z = s.z + Math.cos(t * s.speedZ + s.phase) * 2;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(s.size + Math.sin(t * 2 + i) * 0.01);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshStandardMaterial
        color="#c7d2fe"
        emissive="#818CF8"
        emissiveIntensity={0.5}
        transparent
        opacity={0.35}
      />
    </instancedMesh>
  );
}

// ═════════════════════════════════════════════════════════════════
// ██  MAIN GENERIC SCENE  ██
// ═════════════════════════════════════════════════════════════════
function GenericScene({ progress, selectedPhase, xray, config }: SceneProps) {
  const blockCount = Math.max(3, Math.min(15, config.blockCount ?? 7));
  const rangePerBlock = 100 / blockCount;
  const totalHeight = blockCount * BLOCK_VERTICAL_SPACING;

  // Compute block positions
  const blockPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < blockCount; i++) {
      const angle = (i / blockCount) * Math.PI * 2;
      const x = Math.cos(angle) * SPIRAL_RADIUS;
      const z = Math.sin(angle) * SPIRAL_RADIUS;
      const y = i * BLOCK_VERTICAL_SPACING + BLOCK_VERTICAL_SPACING / 2;
      positions.push([x, y, z]);
    }
    return positions;
  }, [blockCount]);

  // Compute block data
  const blockData = useMemo(() => {
    return Array.from({ length: blockCount }, (_, i) => {
      const startPct = i * rangePerBlock;
      const endPct = (i + 1) * rangePerBlock;
      const color = BLOCK_COLORS[i % BLOCK_COLORS.length];
      const opacity = getPhaseOpacity(progress, startPct, endPct);
      const isCompleted = progress >= endPct;
      const completionFraction = Math.min(1, Math.max(0, (progress - startPct) / rangePerBlock));
      const phaseId = `block_${i}`;
      const isSelected = selectedPhase === phaseId;
      return { startPct, endPct, color, opacity, isCompleted, completionFraction, phaseId, isSelected };
    });
  }, [blockCount, rangePerBlock, progress, selectedPhase]);

  const blockOpacities = useMemo(() => blockData.map((b) => b.opacity), [blockData]);
  const blockCompleted = useMemo(() => blockData.map((b) => b.isCompleted), [blockData]);
  const blockColors = useMemo(() => blockData.map((b) => b.color), [blockData]);

  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[10, 25, 10]} intensity={0.7} />
      <pointLight position={[0, totalHeight + 5, 0]} intensity={0.5} color="#818CF8" distance={50} />
      <pointLight position={[-8, 3, 8]} intensity={0.3} color="#7C3AED" distance={30} />
      <pointLight position={[8, totalHeight * 0.6, -8]} intensity={0.25} color="#2563EB" distance={30} />

      {/* Base Platform */}
      <BasePlatform />

      {/* Holographic Grid */}
      <HolographicGrid />

      {/* Progress Ring */}
      <ProgressRing progress={progress} />

      {/* Central Pillar */}
      <CentralPillar progress={progress} totalHeight={totalHeight} />

      {/* Phase Blocks with sub-components */}
      {blockData.map((bd, i) => (
        <React.Fragment key={i}>
          {/* Hexagonal Platform */}
          <HexPlatform
            position={[
              blockPositions[i][0],
              blockPositions[i][1] - BLOCK_SIZE[1] / 2 - 0.15,
              blockPositions[i][2],
            ]}
            color={bd.color}
            opacity={bd.opacity}
          />

          {/* Phase Block */}
          <PhaseBlock
            index={i}
            position={blockPositions[i]}
            color={bd.color}
            opacity={bd.opacity}
            isSelected={bd.isSelected}
            isCompleted={bd.isCompleted}
            completionFraction={bd.completionFraction}
            xray={xray}
          />

          {/* Status Indicator */}
          <StatusIndicator
            position={[
              blockPositions[i][0] + BLOCK_SIZE[0] / 2 + 0.6,
              blockPositions[i][1] - BLOCK_SIZE[1] / 2,
              blockPositions[i][2],
            ]}
            completionFraction={bd.completionFraction}
            opacity={bd.opacity}
          />

          {/* Achievement Marker on completed blocks */}
          <AchievementMarker
            position={[
              blockPositions[i][0],
              blockPositions[i][1] + BLOCK_SIZE[1] / 2 + 0.6,
              blockPositions[i][2],
            ]}
            isCompleted={bd.isCompleted}
            opacity={bd.opacity}
            color={bd.color}
          />
        </React.Fragment>
      ))}

      {/* Connecting Lines + Data Flow + Bridges */}
      {blockData.map((bd, i) => {
        if (i === 0) return null;
        const fromOpacity = blockData[i - 1].opacity;
        const destOpacity = bd.opacity;
        const lineOpacity = Math.min(fromOpacity, destOpacity);
        if (lineOpacity <= 0) return null;

        return (
          <React.Fragment key={`conn-${i}`}>
            {/* Connection line */}
            <ConnectingLine
              from={blockPositions[i - 1]}
              to={blockPositions[i]}
              opacity={lineOpacity}
              color={bd.color}
            />

            {/* Data flow particles */}
            <DataFlowParticles
              from={blockPositions[i - 1]}
              to={blockPositions[i]}
              opacity={lineOpacity}
              color={bd.color}
            />

            {/* Connecting bridge */}
            <ConnectingBridge
              from={blockPositions[i - 1]}
              to={blockPositions[i]}
              opacity={lineOpacity}
              color={bd.color}
            />
          </React.Fragment>
        );
      })}

      {/* Orbiting Data Nodes */}
      <OrbitingNodes
        blockPositions={blockPositions}
        blockCompleted={blockCompleted}
        blockOpacities={blockOpacities}
        blockColors={blockColors}
      />

      {/* Energy Beams */}
      <EnergyBeams
        blockPositions={blockPositions}
        blockCompleted={blockCompleted}
        blockOpacities={blockOpacities}
        blockColors={blockColors}
        ceilingHeight={totalHeight + 4}
      />

      {/* Floating Metrics Ring */}
      <MetricsRing progress={progress} blockCount={blockCount} />

      {/* Ambient Particles */}
      <AmbientParticles totalHeight={totalHeight} />
    </group>
  );
}

export default GenericScene;
