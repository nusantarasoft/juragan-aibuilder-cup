import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { SceneProps, getPhaseOpacity } from "../templates";

// ═══════════════════════════════════════════════════════════════
// ██  MANUFACTURING SCENE — Factory Production Line  ██
// ═══════════════════════════════════════════════════════════════

// --- Helper: Lerp color ---
function lerpColor(a: string, b: string, t: number): THREE.Color {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return ca.lerp(cb, t);
}

// ═══════════════════════════════════════════════════════════════
// 🏭  FACTORY BUILDING (Permanent)
// ═══════════════════════════════════════════════════════════════

function FactoryBuilding({ xray }: { xray: boolean }) {
  const wallOpacity = xray ? 0.12 : 0.35;
  const roofOpacity = xray ? 0.08 : 0.25;
  const wallColor = "#8a8a90";
  const roofColor = "#555560";

  return (
    <group>
      {/* Floor */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[32, 22]} />
        <meshStandardMaterial color="#3a3a40" metalness={0.3} roughness={0.8} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 5, -11]}>
        <boxGeometry args={[32, 10, 0.3]} />
        <meshStandardMaterial
          color={wallColor}
          metalness={0.6}
          roughness={0.4}
          transparent
          opacity={wallOpacity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Front wall */}
      <mesh position={[0, 5, 11]}>
        <boxGeometry args={[32, 10, 0.3]} />
        <meshStandardMaterial
          color={wallColor}
          metalness={0.6}
          roughness={0.4}
          transparent
          opacity={wallOpacity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Left wall */}
      <mesh position={[-16, 5, 0]}>
        <boxGeometry args={[0.3, 10, 22]} />
        <meshStandardMaterial
          color={wallColor}
          metalness={0.6}
          roughness={0.4}
          transparent
          opacity={wallOpacity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Right wall */}
      <mesh position={[16, 5, 0]}>
        <boxGeometry args={[0.3, 10, 22]} />
        <meshStandardMaterial
          color={wallColor}
          metalness={0.6}
          roughness={0.4}
          transparent
          opacity={wallOpacity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 10, 0]}>
        <boxGeometry args={[33, 0.25, 23]} />
        <meshStandardMaterial
          color={roofColor}
          metalness={0.7}
          roughness={0.3}
          transparent
          opacity={roofOpacity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Skylights (glass panels on roof) */}
      {[-8, 0, 8].map((x, i) => (
        <mesh key={`skylight-${i}`} position={[x, 10.15, 0]}>
          <boxGeometry args={[4, 0.05, 8]} />
          <meshStandardMaterial
            color="#88ccff"
            metalness={0.1}
            roughness={0.1}
            transparent
            opacity={0.2}
            emissive="#88ccff"
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}

      {/* Roof support beams (I-beams running across) */}
      {[-10, -5, 0, 5, 10].map((x, i) => (
        <mesh key={`beam-${i}`} position={[x, 9.75, 0]}>
          <boxGeometry args={[0.2, 0.5, 22]} />
          <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Support columns */}
      {[-15, -7.5, 0, 7.5, 15].map((x) =>
        [-10, 10].map((z, zi) => (
          <mesh key={`col-${x}-${zi}`} position={[x, 5, z]}>
            <boxGeometry args={[0.4, 10, 0.4]} />
            <meshStandardMaterial color="#666" metalness={0.8} roughness={0.25} />
          </mesh>
        ))
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🔄 CONVEYOR BELT (Permanent)
// ═══════════════════════════════════════════════════════════════

function ConveyorBelt({ conveyorLength }: { conveyorLength: number }) {
  const rollersRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (rollersRef.current) {
      rollersRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.rotation.z = clock.getElapsedTime() * 2;
        }
      });
    }
  });

  const rollerCount = Math.floor(conveyorLength / 0.8);

  return (
    <group position={[0, 0.8, 0]}>
      {/* Belt surface */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[conveyorLength, 0.08, 2]} />
        <meshStandardMaterial color="#1a1a1e" metalness={0.2} roughness={0.9} />
      </mesh>

      {/* Left rail */}
      <mesh position={[0, 0.15, -1.05]}>
        <boxGeometry args={[conveyorLength, 0.7, 0.1]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Right rail */}
      <mesh position={[0, 0.15, 1.05]}>
        <boxGeometry args={[conveyorLength, 0.7, 0.1]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Legs */}
      {Array.from({ length: Math.floor(conveyorLength / 4) + 1 }, (_, i) => {
        const x = -conveyorLength / 2 + i * 4;
        return (
          <React.Fragment key={`leg-${i}`}>
            <mesh position={[x, -0.4, -0.9]}>
              <boxGeometry args={[0.15, 0.8, 0.15]} />
              <meshStandardMaterial color="#444" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[x, -0.4, 0.9]}>
              <boxGeometry args={[0.15, 0.8, 0.15]} />
              <meshStandardMaterial color="#444" metalness={0.7} roughness={0.3} />
            </mesh>
          </React.Fragment>
        );
      })}

      {/* Rollers */}
      <group ref={rollersRef}>
        {Array.from({ length: rollerCount }, (_, i) => {
          const x = -conveyorLength / 2 + 0.4 + i * 0.8;
          return (
            <mesh key={`roller-${i}`} position={[x, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 1.9, 8]} />
              <meshStandardMaterial color="#777" metalness={0.9} roughness={0.2} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// ⚙️  MACHINES (Permanent — status lights animate per phase)
// ═══════════════════════════════════════════════════════════════

function Machine({
  position,
  index,
  machineSetupOpacity,
  isProductionActive,
}: {
  position: [number, number, number];
  index: number;
  machineSetupOpacity: number;
  isProductionActive: boolean;
}) {
  const lightRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (lightRef.current) {
      const mat = lightRef.current.material as THREE.MeshStandardMaterial;
      if (isProductionActive) {
        mat.emissiveIntensity = 0.5 + Math.sin(clock.getElapsedTime() * 3 + index) * 0.5;
        mat.emissive.set("#00ff44");
      } else if (machineSetupOpacity > 0) {
        mat.emissiveIntensity = machineSetupOpacity * 0.8;
        mat.emissive.set("#ffaa00");
      } else {
        mat.emissiveIntensity = 0.1;
        mat.emissive.set("#ff0000");
      }
    }
  });

  return (
    <group position={position}>
      {/* Machine body */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[2.2, 3, 2.5]} />
        <meshStandardMaterial color="#4a4a52" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Machine top housing */}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[1.8, 0.4, 2.2]} />
        <meshStandardMaterial color="#5a5a62" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Control panel */}
      <mesh position={[0, 2.2, 1.3]}>
        <boxGeometry args={[1.0, 0.8, 0.1]} />
        <meshStandardMaterial color="#222" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Panel screen */}
      <mesh position={[0, 2.3, 1.36]}>
        <boxGeometry args={[0.6, 0.4, 0.02]} />
        <meshStandardMaterial
          color="#001122"
          emissive="#0066aa"
          emissiveIntensity={machineSetupOpacity * 0.5}
          metalness={0.1}
          roughness={0.3}
        />
      </mesh>

      {/* Status light */}
      <mesh ref={lightRef} position={[0.8, 3.5, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color="#222" emissive="#ff0000" emissiveIntensity={0.1} />
      </mesh>

      {/* Vent grilles on sides */}
      {[-1.12, 1.12].map((z, vi) => (
        <group key={`vent-${vi}`}>
          {[0, 0.2, 0.4, 0.6].map((y, gi) => (
            <mesh key={`g-${gi}`} position={[0, 0.8 + y, z]}>
              <boxGeometry args={[1.6, 0.06, 0.02]} />
              <meshStandardMaterial color="#333" metalness={0.9} roughness={0.2} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Base / footing */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[2.4, 0.2, 2.7]} />
        <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Machines({
  machineCount,
  conveyorLength,
  machineSetupOpacity,
  isProductionActive,
}: {
  machineCount: number;
  conveyorLength: number;
  machineSetupOpacity: number;
  isProductionActive: boolean;
}) {
  const machinePositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    const spacing = (conveyorLength - 4) / (machineCount - 1);
    for (let i = 0; i < machineCount; i++) {
      const x = -conveyorLength / 2 + 2 + i * spacing;
      const z = i % 2 === 0 ? -3 : 3;
      positions.push([x, 0, z]);
    }
    return positions;
  }, [machineCount, conveyorLength]);

  return (
    <group>
      {machinePositions.map((pos, i) => (
        <Machine
          key={`machine-${i}`}
          position={pos}
          index={i}
          machineSetupOpacity={machineSetupOpacity}
          isProductionActive={isProductionActive}
        />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🚚 LOADING DOCK (Permanent)
// ═══════════════════════════════════════════════════════════════

function LoadingDock() {
  return (
    <group position={[13, 0, 8]}>
      {/* Raised platform */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[6, 1.2, 5]} />
        <meshStandardMaterial color="#5a5a5a" metalness={0.5} roughness={0.6} />
      </mesh>

      {/* Dock door frame */}
      <mesh position={[3, 3.5, 0]}>
        <boxGeometry args={[0.3, 7, 4.5]} />
        <meshStandardMaterial color="#444" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Dock door (rolled up) */}
      <mesh position={[3, 6.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.4, 0.4, 4, 12]} />
        <meshStandardMaterial color="#666" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Bumpers */}
      {[-1.5, 1.5].map((z, i) => (
        <mesh key={`bumper-${i}`} position={[3, 1, z]}>
          <boxGeometry args={[0.5, 1.5, 0.5]} />
          <meshStandardMaterial color="#222" metalness={0.3} roughness={0.8} />
        </mesh>
      ))}

      {/* Dock leveler (the ramp plate) */}
      <mesh position={[2.5, 1.25, 0]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[2, 0.08, 3.5]} />
        <meshStandardMaterial color="#777" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Warning stripes on edge */}
      <mesh position={[0, 1.22, 2.3]}>
        <boxGeometry args={[6, 0.05, 0.3]} />
        <meshStandardMaterial color="#ffcc00" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🏢 OFFICE SECTION (Permanent)
// ═══════════════════════════════════════════════════════════════

function OfficeSection() {
  return (
    <group position={[-12, 0, -8]}>
      {/* Office floor */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 5]} />
        <meshStandardMaterial color="#555560" metalness={0.2} roughness={0.7} />
      </mesh>

      {/* Glass walls */}
      {/* Front */}
      <mesh position={[0, 2, 2.5]}>
        <boxGeometry args={[7, 4, 0.1]} />
        <meshStandardMaterial
          color="#aaddff"
          metalness={0.1}
          roughness={0.05}
          transparent
          opacity={0.25}
        />
      </mesh>
      {/* Side */}
      <mesh position={[3.5, 2, 0]}>
        <boxGeometry args={[0.1, 4, 5]} />
        <meshStandardMaterial
          color="#aaddff"
          metalness={0.1}
          roughness={0.05}
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* Desk */}
      <mesh position={[-1, 0.8, 0]}>
        <boxGeometry args={[3, 0.08, 1.2]} />
        <meshStandardMaterial color="#8B6914" metalness={0.2} roughness={0.7} />
      </mesh>
      {/* Desk legs */}
      {[
        [-2.4, -0.5],
        [0.4, -0.5],
        [-2.4, 0.5],
        [0.4, 0.5],
      ].map(([dx, dz], i) => (
        <mesh key={`dleg-${i}`} position={[-1 + dx, 0.4, dz]}>
          <boxGeometry args={[0.06, 0.8, 0.06]} />
          <meshStandardMaterial color="#666" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* Chair */}
      <mesh position={[-1, 0.5, 1.2]}>
        <boxGeometry args={[0.6, 0.08, 0.6]} />
        <meshStandardMaterial color="#333" metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[-1, 0.9, 1.5]}>
        <boxGeometry args={[0.6, 0.7, 0.08]} />
        <meshStandardMaterial color="#333" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Office ceiling light */}
      <mesh position={[0, 3.9, 0]}>
        <boxGeometry args={[4, 0.08, 0.6]} />
        <meshStandardMaterial
          color="#fff"
          emissive="#ffffee"
          emissiveIntensity={0.4}
          metalness={0.1}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// 💨 SMOKE STACK (Permanent — animated smoke)
// ═══════════════════════════════════════════════════════════════

function SmokeParticle({ delay, stackX, stackZ }: { delay: number; stackX: number; stackZ: number }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = ((clock.getElapsedTime() + delay) % 4) / 4;
      ref.current.position.y = 11 + t * 6;
      ref.current.position.x = stackX + Math.sin(clock.getElapsedTime() * 0.5 + delay) * t * 1.5;
      ref.current.position.z = stackZ + Math.cos(clock.getElapsedTime() * 0.3 + delay * 2) * t;
      const scale = 0.2 + t * 0.8;
      ref.current.scale.setScalar(scale);
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      mat.opacity = (1 - t) * 0.25;
    }
  });

  return (
    <mesh ref={ref} position={[stackX, 11, stackZ]}>
      <sphereGeometry args={[0.5, 8, 8]} />
      <meshStandardMaterial
        color="#999"
        transparent
        opacity={0.2}
        metalness={0}
        roughness={1}
      />
    </mesh>
  );
}

function SmokeStack() {
  const stackX = 12;
  const stackZ = -9;

  return (
    <group>
      {/* Chimney */}
      <mesh position={[stackX, 6, stackZ]}>
        <cylinderGeometry args={[0.6, 0.8, 12, 12]} />
        <meshStandardMaterial color="#555" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* Chimney cap */}
      <mesh position={[stackX, 12.2, stackZ]}>
        <cylinderGeometry args={[0.9, 0.65, 0.5, 12]} />
        <meshStandardMaterial color="#444" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Chimney base */}
      <mesh position={[stackX, 0.25, stackZ]}>
        <boxGeometry args={[2, 0.5, 2]} />
        <meshStandardMaterial color="#444" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Smoke particles */}
      {Array.from({ length: 8 }, (_, i) => (
        <SmokeParticle key={`smoke-${i}`} delay={i * 0.5} stackX={stackX} stackZ={stackZ} />
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// 🚜 FORKLIFT (Permanent — animated during warehouse phase)
// ═══════════════════════════════════════════════════════════════

function Forklift({ warehouseOpacity }: { warehouseOpacity: number }) {
  const ref = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (ref.current && warehouseOpacity > 0.3) {
      const t = clock.getElapsedTime() * 0.5;
      ref.current.position.x = 6 + Math.sin(t) * 4;
      ref.current.position.z = 6 + Math.cos(t) * 2;
      ref.current.rotation.y = Math.atan2(Math.cos(t) * 4, -Math.sin(t) * 2);
    }
  });

  return (
    <group ref={ref} position={[6, 0, 6]}>
      {/* Body */}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[1.2, 1.0, 2]} />
        <meshStandardMaterial color="#e8b800" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Cabin */}
      <mesh position={[0, 1.5, -0.2]}>
        <boxGeometry args={[1.1, 0.8, 1.2]} />
        <meshStandardMaterial color="#d4a600" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 2, -0.2]}>
        <boxGeometry args={[1.3, 0.08, 1.4]} />
        <meshStandardMaterial color="#333" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Fork mast */}
      <mesh position={[0, 1, 1.1]}>
        <boxGeometry args={[0.15, 2, 0.15]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Forks */}
      {[-0.3, 0.3].map((x, i) => (
        <mesh key={`fork-${i}`} position={[x, 0.25, 1.6]}>
          <boxGeometry args={[0.1, 0.06, 1]} />
          <meshStandardMaterial color="#666" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* Wheels */}
      {[
        [-0.55, 0.2, 0.7],
        [0.55, 0.2, 0.7],
        [-0.45, 0.2, -0.7],
        [0.45, 0.2, -0.7],
      ].map(([wx, wy, wz], i) => (
        <mesh key={`wheel-${i}`} position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.15, 12]} />
          <meshStandardMaterial color="#222" metalness={0.3} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE: 📐 DESIGN (0-12%)
// ═══════════════════════════════════════════════════════════════

function DesignPhase({ opacity }: { opacity: number }) {
  const screenRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (screenRef.current && opacity > 0) {
      const mat = screenRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.15;
    }
  });

  if (opacity <= 0) return null;

  return (
    <group position={[-12, 0, -3]}>
      {/* Blueprint table top */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[3, 0.08, 2]} />
        <meshStandardMaterial
          color="#1a2a44"
          metalness={0.1}
          roughness={0.6}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Table legs */}
      {[
        [-1.3, -0.8],
        [1.3, -0.8],
        [-1.3, 0.8],
        [1.3, 0.8],
      ].map(([dx, dz], i) => (
        <mesh key={`tleg-${i}`} position={[dx, 0.42, dz]}>
          <boxGeometry args={[0.08, 0.84, 0.08]} />
          <meshStandardMaterial
            color="#666"
            metalness={0.7}
            roughness={0.3}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}

      {/* Grid lines on blueprint */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={`gridH-${i}`} position={[0, 0.9, -0.75 + i * 0.25]}>
          <boxGeometry args={[2.8, 0.005, 0.01]} />
          <meshStandardMaterial
            color="#4488cc"
            emissive="#4488cc"
            emissiveIntensity={0.3}
            transparent
            opacity={opacity * 0.6}
          />
        </mesh>
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={`gridV-${i}`} position={[-1.2 + i * 0.3, 0.9, 0]}>
          <boxGeometry args={[0.01, 0.005, 1.8]} />
          <meshStandardMaterial
            color="#4488cc"
            emissive="#4488cc"
            emissiveIntensity={0.3}
            transparent
            opacity={opacity * 0.6}
          />
        </mesh>
      ))}

      {/* CAD Screen (vertical) */}
      <mesh ref={screenRef} position={[-1, 2.2, -1.5]} rotation={[0.1, 0.3, 0]}>
        <boxGeometry args={[2, 1.5, 0.05]} />
        <meshStandardMaterial
          color="#001833"
          emissive="#0055cc"
          emissiveIntensity={0.3}
          metalness={0.2}
          roughness={0.3}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Screen stand */}
      <mesh position={[-1, 1.2, -1.5]}>
        <cylinderGeometry args={[0.05, 0.08, 1.0, 8]} />
        <meshStandardMaterial
          color="#555"
          metalness={0.8}
          roughness={0.3}
          transparent
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE: 📦 RAW MATERIALS (10-25%)
// ═══════════════════════════════════════════════════════════════

function RawMaterialsPhase({ opacity }: { opacity: number }) {
  if (opacity <= 0) return null;

  const palletPositions: [number, number, number][] = [
    [-8, 0, 8],
    [-6, 0, 8],
    [-8, 0, 6],
    [-6, 0, 6],
    [-7, 1.2, 7],
  ];

  return (
    <group>
      {palletPositions.map(([x, y, z], i) => {
        const boxOpacity = Math.min(opacity * (1 + i * 0.3), 1);
        return (
          <group key={`pallet-${i}`} position={[x, y, z]}>
            {/* Pallet base */}
            <mesh position={[0, 0.1, 0]}>
              <boxGeometry args={[1.2, 0.15, 1.2]} />
              <meshStandardMaterial
                color="#8B6914"
                metalness={0.1}
                roughness={0.8}
                transparent
                opacity={boxOpacity}
              />
            </mesh>
            {/* Stacked box */}
            <mesh position={[0, 0.65, 0]}>
              <boxGeometry args={[1, 0.9, 1]} />
              <meshStandardMaterial
                color="#a0784a"
                metalness={0.1}
                roughness={0.7}
                transparent
                opacity={boxOpacity}
              />
            </mesh>
            {/* Box strapping */}
            <mesh position={[0, 0.65, 0.51]}>
              <boxGeometry args={[0.9, 0.05, 0.01]} />
              <meshStandardMaterial
                color="#666"
                metalness={0.7}
                roughness={0.3}
                transparent
                opacity={boxOpacity}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE: 🏭 PRODUCTION (33-55%) — items on conveyor
// ═══════════════════════════════════════════════════════════════

function ProductionPhase({
  opacity,
  conveyorLength,
}: {
  opacity: number;
  conveyorLength: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (groupRef.current && opacity > 0) {
      groupRef.current.children.forEach((child, i) => {
        const speed = 1.5;
        const offset = i * (conveyorLength / 5);
        const x =
          ((clock.getElapsedTime() * speed + offset) % conveyorLength) -
          conveyorLength / 2;
        child.position.x = x;
      });
    }
  });

  if (opacity <= 0) return null;

  return (
    <group ref={groupRef} position={[0, 1.55, 0]}>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={`item-${i}`} position={[0, 0, 0]}>
          <boxGeometry args={[0.6, 0.4, 0.6]} />
          <meshStandardMaterial
            color={["#4488ff", "#44cc88", "#ff8844", "#cc44ff", "#ffcc44"][i]}
            metalness={0.4}
            roughness={0.4}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE: 🔩 ASSEMBLY (50-65%) — robotic arms
// ═══════════════════════════════════════════════════════════════

function AssemblyPhase({ opacity }: { opacity: number }) {
  const arm1Ref = useRef<THREE.Group>(null!);
  const arm2Ref = useRef<THREE.Group>(null!);

  const spark1Ref = useRef<THREE.Mesh>(null!);
  const spark2Ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (opacity > 0) {
      const t = clock.getElapsedTime();
      if (arm1Ref.current) {
        arm1Ref.current.rotation.y = Math.sin(t * 1.5) * 0.5;
        arm1Ref.current.rotation.z = Math.sin(t * 2) * 0.3 - 0.3;
      }
      if (arm2Ref.current) {
        arm2Ref.current.rotation.y = Math.sin(t * 1.5 + Math.PI) * 0.5;
        arm2Ref.current.rotation.z = Math.sin(t * 2 + Math.PI) * 0.3 - 0.3;
      }
      // Welding sparks flickering
      if (spark1Ref.current) {
        const mat = spark1Ref.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = Math.random() > 0.5 ? 2 + Math.random() * 3 : 0;
        spark1Ref.current.scale.setScalar(0.5 + Math.random());
      }
      if (spark2Ref.current) {
        const mat = spark2Ref.current.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = Math.random() > 0.5 ? 2 + Math.random() * 3 : 0;
        spark2Ref.current.scale.setScalar(0.5 + Math.random());
      }
    }
  });

  if (opacity <= 0) return null;

  const RoboticArm = ({
    pos,
    armRef,
  }: {
    pos: [number, number, number];
    armRef: React.RefObject<THREE.Group>;
  }) => (
    <group position={pos}>
      {/* Base */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.5, 0.6, 0.6, 16]} />
        <meshStandardMaterial
          color="#ff6600"
          metalness={0.7}
          roughness={0.25}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Arm segments */}
      <group ref={armRef} position={[0, 0.6, 0]}>
        {/* Lower arm */}
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.12, 0.15, 2, 8]} />
          <meshStandardMaterial
            color="#ff8800"
            metalness={0.7}
            roughness={0.3}
            transparent
            opacity={opacity}
          />
        </mesh>

        {/* Joint */}
        <mesh position={[0, 2, 0]}>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshStandardMaterial
            color="#555"
            metalness={0.9}
            roughness={0.2}
            transparent
            opacity={opacity}
          />
        </mesh>

        {/* Upper arm */}
        <mesh position={[0, 2.7, 0]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.1, 0.12, 1.2, 8]} />
          <meshStandardMaterial
            color="#ff8800"
            metalness={0.7}
            roughness={0.3}
            transparent
            opacity={opacity}
          />
        </mesh>

        {/* Gripper */}
        {[-0.1, 0.1].map((dx, gi) => (
          <mesh key={`grip-${gi}`} position={[dx + 0.2, 3.3, 0]}>
            <boxGeometry args={[0.04, 0.3, 0.08]} />
            <meshStandardMaterial
              color="#444"
              metalness={0.8}
              roughness={0.25}
              transparent
              opacity={opacity}
            />
          </mesh>
        ))}
        {/* Welding Spark */}
        <mesh ref={armRef === arm1Ref ? spark1Ref : spark2Ref} position={[0.2, 3.45, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#aaccff"
            emissiveIntensity={0}
            transparent
            opacity={opacity}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );

  return (
    <group>
      <RoboticArm pos={[2, 0, -2.5]} armRef={arm1Ref} />
      <RoboticArm pos={[2, 0, 2.5]} armRef={arm2Ref} />

      {/* Assembly station platform */}
      <mesh position={[2, 0.05, 0]}>
        <boxGeometry args={[3, 0.1, 6]} />
        <meshStandardMaterial
          color="#444"
          metalness={0.5}
          roughness={0.5}
          transparent
          opacity={opacity * 0.8}
        />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE: ✅ QUALITY CONTROL (62-75%) — scanner beam
// ═══════════════════════════════════════════════════════════════

function QualityPhase({ opacity }: { opacity: number }) {
  const scannerRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (scannerRef.current && opacity > 0) {
      scannerRef.current.position.x = 5 + Math.sin(clock.getElapsedTime() * 2) * 1.5;
      const mat = scannerRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + Math.sin(clock.getElapsedTime() * 5) * 0.2;
    }
  });

  if (opacity <= 0) return null;

  return (
    <group position={[5, 0, 0]}>
      {/* QC Station frame */}
      <mesh position={[0, 2, -1.5]}>
        <boxGeometry args={[3, 4, 0.15]} />
        <meshStandardMaterial
          color="#555"
          metalness={0.7}
          roughness={0.3}
          transparent
          opacity={opacity * 0.7}
        />
      </mesh>

      {/* Scanner beam (horizontal green plane) */}
      <mesh ref={scannerRef} position={[0, 1.8, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.05, 2.5, 3]} />
        <meshStandardMaterial
          color="#00ff44"
          emissive="#00ff44"
          emissiveIntensity={0.5}
          transparent
          opacity={opacity * 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Green checkmark indicators */}
      {[0, 1, 2].map((i) => (
        <mesh key={`check-${i}`} position={[-1 + i, 4.3, -1.5]}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial
            color="#00cc33"
            emissive="#00ff44"
            emissiveIntensity={opacity * 0.8}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}

      {/* QC platform */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[4, 0.1, 4]} />
        <meshStandardMaterial
          color="#3a3a44"
          metalness={0.4}
          roughness={0.6}
          transparent
          opacity={opacity * 0.7}
        />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE: 📦 PACKAGING (72-82%) — box lids closing animation
// ═══════════════════════════════════════════════════════════════

function PackagingPhase({ opacity }: { opacity: number }) {
  const lidsRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (lidsRef.current && opacity > 0) {
      lidsRef.current.children.forEach((child, i) => {
        const t = (clock.getElapsedTime() * 0.8 + i * 1.5) % 3;
        const angle = t < 1.5 ? Math.PI / 2 * (1 - t / 1.5) : 0;
        child.rotation.x = -angle;
      });
    }
  });

  if (opacity <= 0) return null;

  return (
    <group position={[8, 0, -5]}>
      {/* Packaging station table */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[5, 0.1, 3]} />
        <meshStandardMaterial
          color="#555"
          metalness={0.5}
          roughness={0.5}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Boxes being packaged */}
      {[-1.5, 0, 1.5].map((x, i) => (
        <group key={`pkg-${i}`} position={[x, 1.4, 0]}>
          {/* Box body */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.9, 0.7, 0.9]} />
            <meshStandardMaterial
              color="#b8860b"
              metalness={0.1}
              roughness={0.7}
              transparent
              opacity={opacity}
            />
          </mesh>
        </group>
      ))}

      {/* Animated lids */}
      <group ref={lidsRef}>
        {[-1.5, 0, 1.5].map((x, i) => (
          <mesh key={`lid-${i}`} position={[x, 1.75, -0.45]}>
            <boxGeometry args={[0.92, 0.04, 0.92]} />
            <meshStandardMaterial
              color="#c09020"
              metalness={0.1}
              roughness={0.6}
              transparent
              opacity={opacity}
            />
          </mesh>
        ))}
      </group>

      {/* Table legs */}
      {[
        [-2.3, -1.3],
        [2.3, -1.3],
        [-2.3, 1.3],
        [2.3, 1.3],
      ].map(([dx, dz], i) => (
        <mesh key={`pkleg-${i}`} position={[dx, 0.4, dz]}>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial
            color="#444"
            metalness={0.7}
            roughness={0.3}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE: 🏪 WAREHOUSE (80-90%) — shelving racks filling
// ═══════════════════════════════════════════════════════════════

function WarehousePhase({ opacity }: { opacity: number }) {
  if (opacity <= 0) return null;

  const shelfRows = 3;
  const shelfLevels = 3;

  return (
    <group position={[-3, 0, 7]}>
      {Array.from({ length: shelfRows }, (_, row) => (
        <group key={`shelf-${row}`} position={[row * 3 - 3, 0, 0]}>
          {/* Shelf uprights */}
          {[-0.6, 0.6].map((z, ui) => (
            <mesh key={`upright-${ui}`} position={[0, 2, z]}>
              <boxGeometry args={[0.08, 4, 0.08]} />
              <meshStandardMaterial
                color="#4466aa"
                metalness={0.6}
                roughness={0.35}
                transparent
                opacity={opacity}
              />
            </mesh>
          ))}

          {/* Shelf platforms */}
          {Array.from({ length: shelfLevels }, (_, level) => (
            <mesh key={`platform-${level}`} position={[0, 0.8 + level * 1.2, 0]}>
              <boxGeometry args={[2, 0.06, 1.4]} />
              <meshStandardMaterial
                color="#555"
                metalness={0.5}
                roughness={0.4}
                transparent
                opacity={opacity}
              />
            </mesh>
          ))}

          {/* Products on shelves - fill based on opacity */}
          {Array.from({ length: shelfLevels }, (_, level) => {
            const itemCount = Math.floor(opacity * 3);
            return Array.from({ length: itemCount }, (_, item) => (
              <mesh
                key={`product-${level}-${item}`}
                position={[-0.5 + item * 0.5, 1.1 + level * 1.2, 0]}
              >
                <boxGeometry args={[0.35, 0.4, 0.35]} />
                <meshStandardMaterial
                  color={["#cc6633", "#3366cc", "#33cc66"][level]}
                  metalness={0.2}
                  roughness={0.6}
                  transparent
                  opacity={opacity}
                />
              </mesh>
            ));
          })}
        </group>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE: 🚛 SHIPPING (88-96%) — truck at loading dock
// ═══════════════════════════════════════════════════════════════

function ShippingPhase({ opacity }: { opacity: number }) {
  if (opacity <= 0) return null;

  return (
    <group position={[17, 0, 8]}>
      {/* Truck body (container) */}
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[6, 3, 3]} />
        <meshStandardMaterial
          color="#cccccc"
          metalness={0.4}
          roughness={0.5}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Truck cab */}
      <mesh position={[3.5, 1.8, 0]}>
        <boxGeometry args={[1.5, 2, 2.5]} />
        <meshStandardMaterial
          color="#2255aa"
          metalness={0.5}
          roughness={0.4}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Windshield */}
      <mesh position={[4.3, 2.2, 0]}>
        <boxGeometry args={[0.05, 1, 2]} />
        <meshStandardMaterial
          color="#88bbff"
          metalness={0.1}
          roughness={0.1}
          transparent
          opacity={opacity * 0.5}
        />
      </mesh>

      {/* Wheels */}
      {[
        [-1.5, 0.5, -1.6],
        [-1.5, 0.5, 1.6],
        [1.5, 0.5, -1.6],
        [1.5, 0.5, 1.6],
        [3.5, 0.5, -1.4],
        [3.5, 0.5, 1.4],
      ].map(([wx, wy, wz], i) => (
        <mesh key={`twheel-${i}`} position={[wx, wy, wz]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.3, 16]} />
          <meshStandardMaterial
            color="#222"
            metalness={0.3}
            roughness={0.8}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}

      {/* Truck undercarriage */}
      <mesh position={[1, 0.7, 0]}>
        <boxGeometry args={[7, 0.3, 1.5]} />
        <meshStandardMaterial
          color="#333"
          metalness={0.6}
          roughness={0.4}
          transparent
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHASE: 🔧 MAINTENANCE (94-100%) — tool markers on machines
// ═══════════════════════════════════════════════════════════════

function MaintenancePhase({
  opacity,
  machineCount,
  conveyorLength,
}: {
  opacity: number;
  machineCount: number;
  conveyorLength: number;
}) {
  const markersRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (markersRef.current && opacity > 0) {
      markersRef.current.children.forEach((child, i) => {
        child.position.y = 4.5 + Math.sin(clock.getElapsedTime() * 2 + i) * 0.3;
        child.rotation.z = Math.sin(clock.getElapsedTime() * 1.5 + i) * 0.2;
      });
    }
  });

  if (opacity <= 0) return null;

  const spacing = (conveyorLength - 4) / (machineCount - 1);

  return (
    <group ref={markersRef}>
      {Array.from({ length: machineCount }, (_, i) => {
        const x = -conveyorLength / 2 + 2 + i * spacing;
        const z = i % 2 === 0 ? -3 : 3;
        return (
          <group key={`maint-${i}`} position={[x, 4.5, z]}>
            {/* Wrench icon (simplified as crossed cylinders) */}
            <mesh rotation={[0, 0, Math.PI / 4]}>
              <cylinderGeometry args={[0.06, 0.06, 1, 8]} />
              <meshStandardMaterial
                color="#ff4444"
                emissive="#ff2222"
                emissiveIntensity={0.5}
                transparent
                opacity={opacity}
              />
            </mesh>
            <mesh rotation={[0, 0, -Math.PI / 4]}>
              <cylinderGeometry args={[0.06, 0.06, 1, 8]} />
              <meshStandardMaterial
                color="#ff4444"
                emissive="#ff2222"
                emissiveIntensity={0.5}
                transparent
                opacity={opacity}
              />
            </mesh>

            {/* Warning circle */}
            <mesh position={[0, 0.6, 0]}>
              <sphereGeometry args={[0.2, 12, 12]} />
              <meshStandardMaterial
                color="#ffaa00"
                emissive="#ffaa00"
                emissiveIntensity={opacity * 0.6}
                transparent
                opacity={opacity * 0.8}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// 💡 SCENE LIGHTING
// ═══════════════════════════════════════════════════════════════

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[15, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-10, 15, -5]} intensity={0.3} color="#aabbff" />
      <pointLight position={[0, 8, 0]} intensity={0.4} color="#ffffee" distance={25} />
      {/* Warm fill from loading dock side */}
      <pointLight position={[15, 5, 8]} intensity={0.3} color="#ffddaa" distance={15} />
    </>
  );
}

// ── Robotic Arm (animated) ──────────────────────────────────────
function RoboticArm({ position, assemblyOpacity }: { position: [number, number, number]; assemblyOpacity: number }) {
  const armRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (armRef.current && assemblyOpacity > 0) {
      armRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.6;
    }
  });
  if (assemblyOpacity <= 0) return null;
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.5, 0.6, 0.3, 12]} />
        <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} transparent opacity={assemblyOpacity} />
      </mesh>
      {/* Rotating arm assembly */}
      <group ref={armRef} position={[0, 0.3, 0]}>
        {/* Shoulder joint */}
        <mesh position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#FF6600" metalness={0.6} roughness={0.3} transparent opacity={assemblyOpacity} />
        </mesh>
        {/* Upper arm */}
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 1, 8]} />
          <meshStandardMaterial color="#FF6600" metalness={0.6} roughness={0.3} transparent opacity={assemblyOpacity} />
        </mesh>
        {/* Elbow joint */}
        <mesh position={[0, 1.35, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} transparent opacity={assemblyOpacity} />
        </mesh>
        {/* Forearm */}
        <mesh position={[0.3, 1.5, 0]} rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[0.06, 0.06, 0.7, 8]} />
          <meshStandardMaterial color="#FF6600" metalness={0.6} roughness={0.3} transparent opacity={assemblyOpacity} />
        </mesh>
        {/* Gripper */}
        <mesh position={[0.6, 1.55, 0]}>
          <boxGeometry args={[0.15, 0.08, 0.2]} />
          <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} transparent opacity={assemblyOpacity} />
        </mesh>
      </group>
    </group>
  );
}

// ── Overhead Crane ──────────────────────────────────────────────
function OverheadCrane({ progress }: { progress: number }) {
  const trolleyRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (trolleyRef.current) {
      trolleyRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.3) * 8;
    }
  });
  if (progress < 20) return null;
  const opacity = Math.min(1, (progress - 20) / 15);
  return (
    <group position={[0, 9.5, 0]}>
      {/* Rails */}
      {[-8, 8].map((z, i) => (
        <mesh key={`cr-${i}`} position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 24, 6]} />
          <meshStandardMaterial color="#666" metalness={0.7} roughness={0.3} transparent opacity={opacity * 0.8} />
        </mesh>
      ))}
      {/* Bridge beam */}
      <group ref={trolleyRef}>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 16, 8]} />
          <meshStandardMaterial color="#FFD700" metalness={0.5} roughness={0.4} transparent opacity={opacity * 0.8} />
        </mesh>
        {/* Hook cable */}
        <mesh position={[0, -1.5, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 3, 4]} />
          <meshStandardMaterial color="#888" metalness={0.6} transparent opacity={opacity * 0.6} />
        </mesh>
        {/* Hook */}
        <mesh position={[0, -3.1, 0]}>
          <torusGeometry args={[0.08, 0.025, 8, 12, Math.PI]} />
          <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} transparent opacity={opacity * 0.7} />
        </mesh>
      </group>
    </group>
  );
}

// ── Control Room (elevated) ─────────────────────────────────────
function ControlRoom() {
  return (
    <group position={[-12, 0, -7]}>
      {/* Support pillars */}
      {[[-1.5, 0, -1], [-1.5, 0, 1], [1.5, 0, -1], [1.5, 0, 1]].map((p, i) => (
        <mesh key={`cp-${i}`} position={[p[0], 2, p[2]]}>
          <cylinderGeometry args={[0.1, 0.1, 4, 8]} />
          <meshStandardMaterial color="#555" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* Floor */}
      <mesh position={[0, 4.05, 0]}>
        <boxGeometry args={[4, 0.1, 3]} />
        <meshStandardMaterial color="#444" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Glass walls */}
      <mesh position={[0, 5.2, 0]}>
        <boxGeometry args={[4, 2.2, 3]} />
        <meshStandardMaterial color="#88BBDD" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      {/* Frame */}
      {[[-2, 5.2, 0], [2, 5.2, 0]].map((p, i) => (
        <mesh key={`cf-${i}`} position={p as [number, number, number]}>
          <boxGeometry args={[0.06, 2.2, 3]} />
          <meshStandardMaterial color="#555" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* Monitor desk */}
      <mesh position={[0, 4.5, 0]}>
        <boxGeometry args={[2.5, 0.06, 1]} />
        <meshStandardMaterial color="#333" roughness={0.6} />
      </mesh>
      {/* Monitors */}
      {[-0.8, 0, 0.8].map((x, i) => (
        <mesh key={`mon-${i}`} position={[x, 4.9, -0.2]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.5, 0.35, 0.02]} />
          <meshStandardMaterial color="#111" emissive="#2244FF" emissiveIntensity={0.2} />
        </mesh>
      ))}
      {/* Stairs */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`st-${i}`} position={[-3, 0.5 + i * 0.5, -1 + i * 0.25]}>
          <boxGeometry args={[0.8, 0.08, 0.4]} />
          <meshStandardMaterial color="#666" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// ── Safety Equipment ────────────────────────────────────────────
function SafetyEquipment() {
  return (
    <group>
      {/* Fire extinguisher stations */}
      {[[8, 0, -9], [-8, 0, -9], [0, 0, 9]].map((p, i) => (
        <group key={`fe-${i}`} position={p as [number, number, number]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
            <meshStandardMaterial color="#CC2222" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.04, 0.03, 0.1, 6]} />
            <meshStandardMaterial color="#111" metalness={0.7} />
          </mesh>
          {/* Wall mount bracket */}
          <mesh position={[0, 0.6, -0.08]}>
            <boxGeometry args={[0.2, 0.4, 0.02]} />
            <meshStandardMaterial color="#888" metalness={0.5} />
          </mesh>
        </group>
      ))}
      {/* Emergency shower */}
      <group position={[10, 0, 0]}>
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 3, 6]} />
          <meshStandardMaterial color="#FFCC00" roughness={0.5} />
        </mesh>
        <mesh position={[0, 3, 0]}>
          <cylinderGeometry args={[0.2, 0.15, 0.06, 8]} />
          <meshStandardMaterial color="#FFCC00" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.5, 0.15]}>
          <boxGeometry args={[0.08, 0.3, 0.02]} />
          <meshStandardMaterial color="#CC2222" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

// ── Floor Markings ──────────────────────────────────────────────
function FloorMarkings() {
  return (
    <group>
      {/* Main aisle markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 5]}>
        <planeGeometry args={[20, 0.1]} />
        <meshStandardMaterial color="#FFCC00" emissive="#FFCC00" emissiveIntensity={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -5]}>
        <planeGeometry args={[20, 0.1]} />
        <meshStandardMaterial color="#FFCC00" emissive="#FFCC00" emissiveIntensity={0.15} />
      </mesh>
      {/* Cross aisles */}
      {[-6, 0, 6].map((x, i) => (
        <mesh key={`fa-${i}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[x, 0.02, 0]}>
          <planeGeometry args={[10, 0.1]} />
          <meshStandardMaterial color="#FFCC00" emissive="#FFCC00" emissiveIntensity={0.1} />
        </mesh>
      ))}
      {/* Hazard zone stripes near machines */}
      {[-4, 4].map((x, i) => (
        <mesh key={`hz-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 0]}>
          <planeGeometry args={[2.5, 0.08]} />
          <meshStandardMaterial color="#FF4444" emissive="#FF4444" emissiveIntensity={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// ── Warehouse Shelving ──────────────────────────────────────────
function WarehouseShelving({ warehouseOpacity }: { warehouseOpacity: number }) {
  if (warehouseOpacity <= 0) return null;
  return (
    <group position={[8, 0, -5]}>
      {/* 4 bays of 3-level racks */}
      {[0, 2.5, 5, 7.5].map((x, bay) => (
        <group key={`rack-${bay}`} position={[x - 3.75, 0, 0]}>
          {/* Uprights */}
          {[-0.8, 0.8].map((dz, ui) => (
            <mesh key={`up-${ui}`} position={[0, 1.5, dz]}>
              <boxGeometry args={[0.06, 3, 0.06]} />
              <meshStandardMaterial color="#3366AA" metalness={0.6} roughness={0.3} transparent opacity={warehouseOpacity * 0.9} />
            </mesh>
          ))}
          {/* Shelf levels */}
          {[0.5, 1.5, 2.5].map((y, level) => (
            <group key={`shelf-${level}`}>
              <mesh position={[0, y, 0]}>
                <boxGeometry args={[1.8, 0.04, 1.6]} />
                <meshStandardMaterial color="#5577AA" metalness={0.5} roughness={0.4} transparent opacity={warehouseOpacity * 0.8} />
              </mesh>
              {/* Box on shelf */}
              {level <= Math.floor(warehouseOpacity * 3) && (
                <mesh position={[0, y + 0.2, 0]}>
                  <boxGeometry args={[0.8, 0.35, 0.6]} />
                  <meshStandardMaterial color="#C8A43C" roughness={0.7} transparent opacity={warehouseOpacity * 0.85} />
                </mesh>
              )}
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// ██  MAIN MANUFACTURING SCENE  ██
// ═══════════════════════════════════════════════════════════════

function ManufacturingScene({ progress, selectedPhase, xray, config }: SceneProps) {
  const machineCount = config.machineCount ?? 6;
  const conveyorLength = config.conveyorLength ?? 20;
  const hasLoadingDock = config.hasLoadingDock ?? true;

  // Phase opacities
  const designOp = getPhaseOpacity(progress, 0, 12);
  const rawMaterialsOp = getPhaseOpacity(progress, 10, 25);
  const machineSetupOp = getPhaseOpacity(progress, 22, 35);
  const productionOp = getPhaseOpacity(progress, 33, 55);
  const assemblyOp = getPhaseOpacity(progress, 50, 65);
  const qualityOp = getPhaseOpacity(progress, 62, 75);
  const packagingOp = getPhaseOpacity(progress, 72, 82);
  const warehouseOp = getPhaseOpacity(progress, 80, 90);
  const shippingOp = getPhaseOpacity(progress, 88, 96);
  const maintenanceOp = getPhaseOpacity(progress, 94, 100);

  // When a specific phase is selected, dim others
  const phaseIds = [
    "design",
    "raw_materials",
    "machine_setup",
    "production",
    "assembly",
    "quality",
    "packaging",
    "warehouse",
    "shipping",
    "maintenance",
  ];
  const opacities = [
    designOp,
    rawMaterialsOp,
    machineSetupOp,
    productionOp,
    assemblyOp,
    qualityOp,
    packagingOp,
    warehouseOp,
    shippingOp,
    maintenanceOp,
  ];

  const getAdjustedOpacity = (phaseId: string, baseOpacity: number) => {
    if (!selectedPhase) return baseOpacity;
    return phaseId === selectedPhase ? baseOpacity : baseOpacity * 0.15;
  };

  const adj = phaseIds.map((id, i) => getAdjustedOpacity(id, opacities[i]));

  const isProductionActive = productionOp > 0.3;

  return (
    <group>
      <SceneLighting />

      {/* === PERMANENT ELEMENTS === */}
      <FactoryBuilding xray={xray} />
      <ConveyorBelt conveyorLength={conveyorLength} />
      <Machines
        machineCount={machineCount}
        conveyorLength={conveyorLength}
        machineSetupOpacity={adj[2]}
        isProductionActive={isProductionActive && (!selectedPhase || selectedPhase === "production")}
      />
      {hasLoadingDock && <LoadingDock />}
      <OfficeSection />
      <SmokeStack />
      {config.showVehicles !== false && <Forklift warehouseOpacity={adj[7]} />}
      <ControlRoom />
      <SafetyEquipment />
      <FloorMarkings />
      <OverheadCrane progress={progress} />

      {/* === PHASE ELEMENTS === */}
      <RoboticArm position={[-2, 0, 2]} assemblyOpacity={adj[4]} />
      <RoboticArm position={[2, 0, 2]} assemblyOpacity={adj[4]} />
      <WarehouseShelving warehouseOpacity={adj[7]} />

      <DesignPhase opacity={adj[0]} />
      <RawMaterialsPhase opacity={adj[1]} />
      <ProductionPhase opacity={adj[3]} conveyorLength={conveyorLength} />
      <AssemblyPhase opacity={adj[4]} />
      <QualityPhase opacity={adj[5]} />
      <PackagingPhase opacity={adj[6]} />
      <WarehousePhase opacity={adj[7]} />
      <ShippingPhase opacity={adj[8]} />
      <MaintenancePhase
        opacity={adj[9]}
        machineCount={machineCount}
        conveyorLength={conveyorLength}
      />

      {/* Floating BIM / Data Tooltip Example */}
      {config.highQualityGraphics && (
        <Html position={[0, 10, 0]} center distanceFactor={25}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)',
            color: 'white', padding: '6px 12px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px',
            pointerEvents: 'none', whiteSpace: 'nowrap',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ fontWeight: 'bold', color: '#60a5fa' }}>Main Assembly Line</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Efficiency: 94%</div>
          </div>
        </Html>
      )}
    </group>
  );
}

export default ManufacturingScene;
