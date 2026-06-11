import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { SceneProps, getPhaseOpacity } from "../templates";

// ─── Colour palette ──────────────────────────────────────────────
const COL = {
  dirt:       new THREE.Color("#6B4226"),
  dirtDark:   new THREE.Color("#4A2E17"),
  grassDark:  new THREE.Color("#2D5016"),
  barnRed:    new THREE.Color("#8B2500"),
  barnWood:   new THREE.Color("#5C3317"),
  roofRed:    new THREE.Color("#A52A2A"),
  silo:       new THREE.Color("#B0B8C0"),
  siloDome:   new THREE.Color("#C8D0D8"),
  fence:      new THREE.Color("#8B6914"),
  fencePlank: new THREE.Color("#A0824A"),
  road:       new THREE.Color("#555555"),
  roadLine:   new THREE.Color("#CCCC44"),
  water:      new THREE.Color("#2288DD"),
  pipe:       new THREE.Color("#4499CC"),
  tractor:    new THREE.Color("#E8891C"),
  tractorCab: new THREE.Color("#D07818"),
  wheel:      new THREE.Color("#222222"),
  seed:       new THREE.Color("#44AA22"),
  cropGreen1: new THREE.Color("#228B22"),
  cropGreen2: new THREE.Color("#2E8B57"),
  cropGreen3: new THREE.Color("#3CB371"),
  cropGold:   new THREE.Color("#DAA520"),
  cropYellow: new THREE.Color("#CCBA00"),
  warning:    new THREE.Color("#FFCC00"),
  equipment:  new THREE.Color("#666666"),
  waterTank:  new THREE.Color("#6699BB"),
  truck:      new THREE.Color("#446688"),
  truckBed:   new THREE.Color("#555D66"),
  siloFill:   new THREE.Color("#C8A43C"),
};

// ─── Field dimensions helper ─────────────────────────────────────
function useFieldLayout(rows: number, cols: number) {
  return useMemo(() => {
    const spacingX = 32 / cols;
    const spacingZ = 24 / rows;
    const originX = -16 + spacingX / 2;
    const originZ = -12 + spacingZ / 2;
    return { spacingX, spacingZ, originX, originZ, fieldW: 32, fieldD: 24 };
  }, [rows, cols]);
}

// ═════════════════════════════════════════════════════════════════
//  SUB‑COMPONENTS
// ═════════════════════════════════════════════════════════════════

// ── Ground Plane ─────────────────────────────────────────────────
function Ground({ opacity }: { opacity: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[44, 34]} />
      <meshStandardMaterial
        color={COL.grassDark}
        roughness={0.95}
        metalness={0}
      />
    </mesh>
  );
}

// ── Phase: Land Preparation ──────────────────────────────────────
function LandPrep({ opacity, rows, cols, layout }: {
  opacity: number; rows: number; cols: number;
  layout: ReturnType<typeof useFieldLayout>;
}) {
  const ref = useRef<THREE.Group>(null!);
  const { spacingX, spacingZ, originX, originZ } = layout;

  // Tilled soil rows
  const furrows = useMemo(() => {
    const arr: { x: number; z: number }[] = [];
    for (let r = 0; r < rows; r++) {
      arr.push({ x: 0, z: originZ + r * spacingZ });
    }
    return arr;
  }, [rows, originZ, spacingZ]);

  return (
    <group ref={ref} visible={opacity > 0}>
      {/* Main tilled field */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[33, 25]} />
        <meshStandardMaterial
          color={COL.dirt}
          roughness={1}
          metalness={0}
          transparent
          opacity={opacity}
        />
      </mesh>
      {/* Furrows */}
      {furrows.map((f, i) => (
        <mesh key={i} position={[0, 0.04, f.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[31, spacingZ * 0.25]} />
          <meshStandardMaterial
            color={COL.dirtDark}
            roughness={1}
            transparent
            opacity={opacity * 0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Phase: Irrigation ────────────────────────────────────────────
function Irrigation({ opacity, rows, layout }: {
  opacity: number; rows: number;
  layout: ReturnType<typeof useFieldLayout>;
}) {
  const { spacingZ, originZ } = layout;
  const channels = useMemo(() => {
    const arr: number[] = [];
    for (let r = 0; r <= rows; r++) {
      arr.push(originZ - spacingZ / 2 + r * spacingZ);
    }
    return arr;
  }, [rows, originZ, spacingZ]);

  const sprinklers = useMemo(() => {
    const arr: [number, number][] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 4; c++) {
        arr.push([-12 + c * 8, originZ + r * spacingZ]);
      }
    }
    return arr;
  }, [rows, originZ, spacingZ]);

  const sprayRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (sprayRef.current && opacity > 0) {
      const t = clock.getElapsedTime();
      sprayRef.current.children.forEach((child) => {
        child.rotation.y = t * 4;
      });
    }
  });

  return (
    <group visible={opacity > 0}>
      {/* Water channels */}
      {channels.map((z, i) => (
        <mesh key={`ch-${i}`} position={[0, 0.06, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 30, 6]} />
          <meshStandardMaterial
            color={COL.pipe}
            transparent
            opacity={opacity * 0.7}
            metalness={0.4}
            roughness={0.4}
          />
        </mesh>
      ))}
      {/* Main pipe along edge */}
      <mesh position={[-16, 0.3, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 26, 8]} />
        <meshStandardMaterial
          color={COL.pipe}
          transparent
          opacity={opacity * 0.8}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      {/* Sprinkler posts & Spray */}
      <group ref={sprayRef}>
        {sprinklers.map(([x, z], i) => (
          <group key={`sp-${i}`} position={[x, 0, z]}>
            {/* Post */}
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
              <meshStandardMaterial
                color={"#888888"}
                transparent
                opacity={opacity}
                metalness={0.6}
                roughness={0.3}
              />
            </mesh>
            {/* Head */}
            <mesh position={[0, 1.05, 0]}>
              <sphereGeometry args={[0.1, 8, 6]} />
              <meshStandardMaterial
                color={COL.water}
                transparent
                opacity={opacity * 0.6}
                metalness={0.3}
                roughness={0.4}
              />
            </mesh>
            {/* Rotating Spray Effect */}
            <mesh position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[1.5, 0.1, 16, 1, true]} />
              <meshStandardMaterial
                color={"#AADDFF"}
                transparent
                opacity={opacity * 0.25}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

// ── Phase: Seeding ───────────────────────────────────────────────
function Seeding({ opacity, rows, cols, layout }: {
  opacity: number; rows: number; cols: number;
  layout: ReturnType<typeof useFieldLayout>;
}) {
  const { spacingX, spacingZ, originX, originZ } = layout;
  const seeds = useMemo(() => {
    const arr: [number, number][] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push([originX + c * spacingX, originZ + r * spacingZ]);
      }
    }
    return arr;
  }, [rows, cols, originX, originZ, spacingX, spacingZ]);

  return (
    <group visible={opacity > 0}>
      {seeds.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.08, z]}>
          <sphereGeometry args={[0.1, 6, 4]} />
          <meshStandardMaterial
            color={COL.seed}
            transparent
            opacity={opacity}
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Phase: Growth ────────────────────────────────────────────────
function Growth({ opacity, rows, cols, layout, progress }: {
  opacity: number; rows: number; cols: number;
  layout: ReturnType<typeof useFieldLayout>; progress: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const { spacingX, spacingZ, originX, originZ } = layout;
  const growthFactor = Math.min(1, opacity); // 0..1
  const plantHeight = 0.3 + growthFactor * 1.8;

  const plants = useMemo(() => {
    const arr: [number, number, number][] = []; // x, z, colorIdx
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push([originX + c * spacingX, originZ + r * spacingZ, (r + c) % 3]);
      }
    }
    return arr;
  }, [rows, cols, originX, originZ, spacingX, spacingZ]);

  const colors = [COL.cropGreen1, COL.cropGreen2, COL.cropGreen3];

  // Subtle sway animation
  useFrame(({ clock }) => {
    if (groupRef.current && opacity > 0) {
      const t = clock.getElapsedTime();
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Group) {
          child.rotation.x = Math.sin(t * 1.2 + i * 0.3) * 0.03 * growthFactor;
          child.rotation.z = Math.cos(t * 0.9 + i * 0.5) * 0.03 * growthFactor;
        }
      });
    }
  });

  return (
    <group ref={groupRef} visible={opacity > 0}>
      {plants.map(([x, z, ci], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* Stem */}
          <mesh position={[0, plantHeight / 2, 0]}>
            <cylinderGeometry args={[0.03, 0.05, plantHeight, 5]} />
            <meshStandardMaterial
              color={colors[ci]}
              transparent
              opacity={opacity}
              roughness={0.7}
            />
          </mesh>
          {/* Leaf cluster top */}
          {growthFactor > 0.3 && (
            <mesh position={[0, plantHeight * 0.8, 0]}>
              <coneGeometry args={[0.18 * growthFactor, 0.5 * growthFactor, 5]} />
              <meshStandardMaterial
                color={colors[(ci + 1) % 3]}
                transparent
                opacity={opacity * 0.85}
                roughness={0.6}
              />
            </mesh>
          )}
          {/* Side leaves */}
          {growthFactor > 0.5 && (
            <>
              <mesh position={[0.12, plantHeight * 0.5, 0]} rotation={[0, 0, 0.6]}>
                <boxGeometry args={[0.22 * growthFactor, 0.04, 0.08]} />
                <meshStandardMaterial
                  color={colors[ci]}
                  transparent
                  opacity={opacity * 0.75}
                  roughness={0.6}
                />
              </mesh>
              <mesh position={[-0.1, plantHeight * 0.35, 0.05]} rotation={[0, 0.5, -0.5]}>
                <boxGeometry args={[0.2 * growthFactor, 0.04, 0.07]} />
                <meshStandardMaterial
                  color={colors[(ci + 2) % 3]}
                  transparent
                  opacity={opacity * 0.75}
                  roughness={0.6}
                />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

// ── Phase: Pest Control ──────────────────────────────────────────
function PestControl({ opacity }: { opacity: number }) {
  const markers = useMemo(() => {
    const arr: [number, number][] = [];
    // Around field perimeter
    for (let x = -16; x <= 16; x += 4) {
      arr.push([x, -13]);
      arr.push([x, 13]);
    }
    for (let z = -13; z <= 13; z += 4) {
      arr.push([-17, z]);
      arr.push([17, z]);
    }
    return arr;
  }, []);

  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current && opacity > 0) {
      const t = clock.getElapsedTime();
      ref.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          child.scale.setScalar(0.8 + Math.sin(t * 2.5 + i * 0.8) * 0.15);
        }
      });
    }
  });

  return (
    <group ref={ref} visible={opacity > 0}>
      {markers.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.6, z]}>
          <octahedronGeometry args={[0.25, 0]} />
          <meshStandardMaterial
            color={COL.warning}
            transparent
            opacity={opacity * 0.85}
            emissive={COL.warning}
            emissiveIntensity={0.3}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Phase: Harvest Prep ──────────────────────────────────────────
function HarvestPrep({ opacity }: { opacity: number }) {
  return (
    <group visible={opacity > 0}>
      {/* Equipment near barn */}
      {/* Cart */}
      <group position={[16, 0, -8]}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[2.2, 0.6, 1.2]} />
          <meshStandardMaterial
            color={COL.equipment}
            transparent
            opacity={opacity}
            metalness={0.5}
            roughness={0.4}
          />
        </mesh>
        {/* Wheels */}
        {[[-0.8, -0.5], [0.8, -0.5], [-0.8, 0.5], [0.8, 0.5]].map(([dx, dz], i) => (
          <mesh key={i} position={[dx, 0.2, dz]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.1, 8]} />
            <meshStandardMaterial
              color={COL.wheel}
              transparent
              opacity={opacity}
              metalness={0.3}
              roughness={0.6}
            />
          </mesh>
        ))}
      </group>
      {/* Tool rack */}
      <group position={[14, 0, -6]}>
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[0.1, 1.6, 1.5]} />
          <meshStandardMaterial
            color={COL.fence}
            transparent
            opacity={opacity}
            roughness={0.7}
          />
        </mesh>
        {[0, 0.4, -0.4].map((dz, i) => (
          <mesh key={i} position={[0.15, 0.6 + i * 0.25, dz]} rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.02, 0.02, 0.8, 4]} />
            <meshStandardMaterial
              color={"#888888"}
              transparent
              opacity={opacity}
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ── Phase: Harvesting ────────────────────────────────────────────
function Harvesting({ opacity, rows, cols, layout }: {
  opacity: number; rows: number; cols: number;
  layout: ReturnType<typeof useFieldLayout>;
}) {
  const { spacingX, spacingZ, originX, originZ } = layout;
  const groupRef = useRef<THREE.Group>(null!);

  const plants = useMemo(() => {
    const arr: [number, number, boolean][] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Some plants "harvested" (removed) based on position
        const harvested = (r + c) % 5 === 0;
        arr.push([originX + c * spacingX, originZ + r * spacingZ, harvested]);
      }
    }
    return arr;
  }, [rows, cols, originX, originZ, spacingX, spacingZ]);

  useFrame(({ clock }) => {
    if (groupRef.current && opacity > 0) {
      const t = clock.getElapsedTime();
      // Wave effect across the field for harvesting
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const plantX = child.position.x;
          // Plants drop down (get harvested) as wave passes
          const wave = Math.sin(t * 1.5 - plantX * 0.5);
          if (wave > 0.8 && child.scale.y > 0.1) {
            child.scale.y = THREE.MathUtils.lerp(child.scale.y, 0.1, 0.1);
            child.scale.x = THREE.MathUtils.lerp(child.scale.x, 1.5, 0.1);
          }
          child.rotation.x = Math.sin(t * 0.8 + i * 0.2) * 0.02;
        }
      });
    }
  });

  return (
    <group ref={groupRef} visible={opacity > 0}>
      {plants.map(([x, z, harvested], i) => {
        if (harvested) {
          // Small stump
          return (
            <mesh key={i} position={[x, 0.05, z]}>
              <cylinderGeometry args={[0.06, 0.06, 0.1, 4]} />
              <meshStandardMaterial
                color={COL.cropGold}
                transparent
                opacity={opacity * 0.5}
                roughness={0.9}
              />
            </mesh>
          );
        }
        // Golden crop (will be scaled down by animation)
        return (
          <mesh key={i} position={[x, 0.8, z]}>
            <cylinderGeometry args={[0.04, 0.06, 1.6, 5]} />
            <meshStandardMaterial
              color={COL.cropGold}
              transparent
              opacity={opacity}
              roughness={0.5}
              emissive={COL.cropYellow}
              emissiveIntensity={0.15}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ── Phase: Processing ────────────────────────────────────────────
function Processing({ opacity }: { opacity: number }) {
  const gearRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (gearRef.current) {
      gearRef.current.rotation.z = clock.getElapsedTime() * 1.5;
    }
  });

  return (
    <group visible={opacity > 0}>
      {/* Conveyor table near barn */}
      <mesh position={[16, 0.7, -4]}>
        <boxGeometry args={[3.5, 0.12, 1.2]} />
        <meshStandardMaterial
          color={"#777777"}
          transparent
          opacity={opacity}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
      {/* Conveyor legs */}
      {[[-1.4, -0.4], [-1.4, 0.4], [1.4, -0.4], [1.4, 0.4]].map(([dx, dz], i) => (
        <mesh key={i} position={[16 + dx, 0.35, -4 + dz]}>
          <cylinderGeometry args={[0.05, 0.05, 0.7, 6]} />
          <meshStandardMaterial
            color={"#555555"}
            transparent
            opacity={opacity}
            metalness={0.5}
            roughness={0.4}
          />
        </mesh>
      ))}
      {/* Gear / machinery */}
      <mesh ref={gearRef} position={[15, 1.3, -4]}>
        <torusGeometry args={[0.35, 0.08, 6, 8]} />
        <meshStandardMaterial
          color={"#999999"}
          transparent
          opacity={opacity}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {/* Small bins */}
      {[0, 1.2, 2.4].map((dx, i) => (
        <mesh key={`bin-${i}`} position={[14.5 + dx, 0.3, -2.5]}>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial
            color={"#8B6914"}
            transparent
            opacity={opacity * 0.85}
            roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Phase: Storage ───────────────────────────────────────────────
function StoragePhase({ opacity, siloFillLevel }: { opacity: number; siloFillLevel: number }) {
  return (
    <group visible={opacity > 0}>
      {/* Fill level inside silo - rises with opacity */}
      <mesh position={[19, siloFillLevel * 2.5, -10.5]}>
        <cylinderGeometry args={[1.75, 1.75, siloFillLevel * 5, 16]} />
        <meshStandardMaterial
          color={COL.siloFill}
          transparent
          opacity={opacity * 0.8}
          roughness={0.6}
        />
      </mesh>
    </group>
  );
}

// ── Phase: Distribution ──────────────────────────────────────────
function Distribution({ opacity }: { opacity: number }) {
  const truckRef = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (truckRef.current && opacity > 0) {
      // Truck slowly arrives along the road
      const target = 6;
      const current = truckRef.current.position.z;
      if (current < target) {
        truckRef.current.position.z += 0.01;
      }
    }
  });

  return (
    <group visible={opacity > 0}>
      <group ref={truckRef} position={[20, 0, -14]}>
        {/* Cab */}
        <mesh position={[0, 0.9, 0]}>
          <boxGeometry args={[2.2, 1.6, 2]} />
          <meshStandardMaterial
            color={COL.truck}
            transparent
            opacity={opacity}
            metalness={0.3}
            roughness={0.5}
          />
        </mesh>
        {/* Cargo bed */}
        <mesh position={[0, 0.6, -2.8]}>
          <boxGeometry args={[2.4, 1, 3.5]} />
          <meshStandardMaterial
            color={COL.truckBed}
            transparent
            opacity={opacity}
            metalness={0.4}
            roughness={0.5}
          />
        </mesh>
        {/* Wheels */}
        {[[-1, 0], [1, 0], [-1, -2.5], [1, -2.5]].map(([dx, dz], i) => (
          <mesh key={i} position={[dx, 0.25, dz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 8]} />
            <meshStandardMaterial
              color={COL.wheel}
              transparent
              opacity={opacity}
              metalness={0.2}
              roughness={0.7}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  PERMANENT STRUCTURES
// ═════════════════════════════════════════════════════════════════

// ── Barn ─────────────────────────────────────────────────────────
function Barn() {
  // Triangular roof using BufferGeometry
  const roofGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const hw = 2.8; // half width
    const hd = 2.2; // half depth
    const rh = 2;   // roof height
    // prettier-ignore
    const verts = new Float32Array([
      // Front face
      -hw, 0,  hd,   hw, 0,  hd,   0, rh,  hd,
      // Back face
      -hw, 0, -hd,   0, rh, -hd,   hw, 0, -hd,
      // Left slope
      -hw, 0, -hd,  -hw, 0,  hd,   0, rh,  hd,
      -hw, 0, -hd,   0, rh,  hd,   0, rh, -hd,
      // Right slope
       hw, 0,  hd,   hw, 0, -hd,   0, rh, -hd,
       hw, 0,  hd,   0, rh, -hd,   0, rh,  hd,
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group position={[17, 0, -10]}>
      {/* Main body */}
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[5.4, 3.6, 4.2]} />
        <meshStandardMaterial color={COL.barnRed} roughness={0.75} metalness={0.05} />
      </mesh>
      {/* Roof */}
      <mesh geometry={roofGeo} position={[0, 3.6, 0]}>
        <meshStandardMaterial color={COL.roofRed} roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 1.2, 2.11]}>
        <boxGeometry args={[1.8, 2.4, 0.05]} />
        <meshStandardMaterial color={COL.barnWood} roughness={0.8} />
      </mesh>
      {/* Door frame highlight */}
      <mesh position={[0, 1.2, 2.13]}>
        <boxGeometry args={[1.9, 2.5, 0.02]} />
        <meshStandardMaterial color={"#3A2010"} roughness={0.9} />
      </mesh>
      {/* Window */}
      <mesh position={[2.71, 2.2, 0]}>
        <boxGeometry args={[0.05, 0.8, 0.8]} />
        <meshStandardMaterial color={"#88BBDD"} roughness={0.3} metalness={0.1} transparent opacity={0.6} />
      </mesh>
      {/* Cross beams decoration */}
      <mesh position={[0, 2.8, 2.12]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[2.2, 0.08, 0.03]} />
        <meshStandardMaterial color={COL.barnWood} roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.8, 2.12]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[2.2, 0.08, 0.03]} />
        <meshStandardMaterial color={COL.barnWood} roughness={0.8} />
      </mesh>
    </group>
  );
}

// ── Silo ─────────────────────────────────────────────────────────
function Silo() {
  return (
    <group position={[19, 0, -10.5]}>
      {/* Body */}
      <mesh position={[0, 2.8, 0]}>
        <cylinderGeometry args={[1.8, 1.8, 5.6, 20]} />
        <meshStandardMaterial
          color={COL.silo}
          metalness={0.7}
          roughness={0.25}
        />
      </mesh>
      {/* Dome top */}
      <mesh position={[0, 5.6, 0]}>
        <sphereGeometry args={[1.8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={COL.siloDome}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>
      {/* Ring bands */}
      {[1, 2.5, 4].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <torusGeometry args={[1.82, 0.04, 6, 20]} />
          <meshStandardMaterial color={"#8899AA"} metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      {/* Cap/vent on top */}
      <mesh position={[0, 6.6, 0]}>
        <cylinderGeometry args={[0.15, 0.3, 0.5, 8]} />
        <meshStandardMaterial color={"#667788"} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

// ── Tractor ──────────────────────────────────────────────────────
function Tractor({ progress }: { progress: number }) {
  const ref = useRef<THREE.Group>(null!);
  const wheelRefs = useRef<THREE.Mesh[]>([]);
  const active = progress >= 10 && progress <= 80;

  useFrame(({ clock }) => {
    if (ref.current && active) {
      const t = clock.getElapsedTime();
      // Move slowly along rows
      const zRange = 22;
      const speed = 0.3;
      const cycle = (t * speed) % (zRange * 2);
      const z = cycle < zRange ? -11 + cycle : -11 + zRange * 2 - cycle;
      ref.current.position.z = z;
      // Rotate wheels
      wheelRefs.current.forEach((w) => {
        if (w) w.rotation.x += 0.05;
      });
    }
  });

  return (
    <group ref={ref} position={[-8, 0, 0]} visible={active}>
      {/* Body */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[1.4, 0.9, 2.8]} />
        <meshStandardMaterial color={COL.tractor} roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Cab / cabin */}
      <mesh position={[0, 1.5, -0.3]}>
        <boxGeometry args={[1.2, 1, 1.5]} />
        <meshStandardMaterial color={COL.tractorCab} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Cab windshield */}
      <mesh position={[0, 1.55, 0.46]}>
        <boxGeometry args={[1, 0.7, 0.04]} />
        <meshStandardMaterial color={"#AACCEE"} roughness={0.1} metalness={0.1} transparent opacity={0.5} />
      </mesh>
      {/* Exhaust pipe */}
      <mesh position={[0.5, 1.6, 0.8]}>
        <cylinderGeometry args={[0.06, 0.06, 0.8, 6]} />
        <meshStandardMaterial color={"#444444"} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Big rear wheels */}
      {[-0.8, 0.8].map((dx, i) => (
        <mesh
          key={`rw-${i}`}
          ref={(el) => { if (el) wheelRefs.current[i] = el; }}
          position={[dx, 0.5, -0.7]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.55, 0.55, 0.25, 10]} />
          <meshStandardMaterial color={COL.wheel} roughness={0.8} metalness={0.1} />
        </mesh>
      ))}
      {/* Small front wheels */}
      {[-0.65, 0.65].map((dx, i) => (
        <mesh
          key={`fw-${i}`}
          ref={(el) => { if (el) wheelRefs.current[i + 2] = el; }}
          position={[dx, 0.3, 1.1]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.3, 0.3, 0.18, 8]} />
          <meshStandardMaterial color={COL.wheel} roughness={0.8} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// ── Fence ────────────────────────────────────────────────────────
function Fence() {
  const posts = useMemo(() => {
    const arr: [number, number, number][] = []; // x, z, rotY
    const step = 3.5;
    // Along Z-edges
    for (let z = -13; z <= 13; z += step) {
      arr.push([-17.5, z, 0]);
      arr.push([17.5, z, 0]);
    }
    // Along X-edges (skip corners)
    for (let x = -17.5 + step; x < 17.5; x += step) {
      arr.push([x, -13.5, Math.PI / 2]);
      arr.push([x, 13.5, Math.PI / 2]);
    }
    return arr;
  }, []);

  return (
    <group>
      {posts.map(([x, z, ry], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* Post */}
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 1, 5]} />
            <meshStandardMaterial color={COL.fence} roughness={0.8} />
          </mesh>
          {/* Top cap */}
          <mesh position={[0, 1.02, 0]}>
            <coneGeometry args={[0.09, 0.12, 5]} />
            <meshStandardMaterial color={COL.fence} roughness={0.7} />
          </mesh>
        </group>
      ))}
      {/* Horizontal planks along each side */}
      {/* Left fence */}
      <mesh position={[-17.5, 0.35, 0]}>
        <boxGeometry args={[0.06, 0.08, 27]} />
        <meshStandardMaterial color={COL.fencePlank} roughness={0.75} />
      </mesh>
      <mesh position={[-17.5, 0.65, 0]}>
        <boxGeometry args={[0.06, 0.08, 27]} />
        <meshStandardMaterial color={COL.fencePlank} roughness={0.75} />
      </mesh>
      {/* Right fence */}
      <mesh position={[17.5, 0.35, 0]}>
        <boxGeometry args={[0.06, 0.08, 27]} />
        <meshStandardMaterial color={COL.fencePlank} roughness={0.75} />
      </mesh>
      <mesh position={[17.5, 0.65, 0]}>
        <boxGeometry args={[0.06, 0.08, 27]} />
        <meshStandardMaterial color={COL.fencePlank} roughness={0.75} />
      </mesh>
      {/* Front fence */}
      <mesh position={[0, 0.35, 13.5]}>
        <boxGeometry args={[35, 0.08, 0.06]} />
        <meshStandardMaterial color={COL.fencePlank} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.65, 13.5]}>
        <boxGeometry args={[35, 0.08, 0.06]} />
        <meshStandardMaterial color={COL.fencePlank} roughness={0.75} />
      </mesh>
      {/* Back fence */}
      <mesh position={[0, 0.35, -13.5]}>
        <boxGeometry args={[35, 0.08, 0.06]} />
        <meshStandardMaterial color={COL.fencePlank} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.65, -13.5]}>
        <boxGeometry args={[35, 0.08, 0.06]} />
        <meshStandardMaterial color={COL.fencePlank} roughness={0.75} />
      </mesh>
    </group>
  );
}

// ── Road ─────────────────────────────────────────────────────────
function Road() {
  return (
    <group>
      {/* Main road strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20.5, 0.02, 0]}>
        <planeGeometry args={[4, 34]} />
        <meshStandardMaterial color={COL.road} roughness={0.9} metalness={0} />
      </mesh>
      {/* Center line dashes */}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[20.5, 0.03, -15 + i * 2.8]}
        >
          <planeGeometry args={[0.12, 1.4]} />
          <meshStandardMaterial color={COL.roadLine} roughness={0.8} />
        </mesh>
      ))}
      {/* Road edges (curb) */}
      <mesh position={[18.5, 0.05, 0]}>
        <boxGeometry args={[0.15, 0.1, 34]} />
        <meshStandardMaterial color={"#888888"} roughness={0.8} />
      </mesh>
      <mesh position={[22.5, 0.05, 0]}>
        <boxGeometry args={[0.15, 0.1, 34]} />
        <meshStandardMaterial color={"#888888"} roughness={0.8} />
      </mesh>
    </group>
  );
}

// ── Water Tower ──────────────────────────────────────────────────
function WaterTower() {
  return (
    <group position={[-18, 0, -11]}>
      {/* Four legs */}
      {[[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 2.2, dz]}>
          <cylinderGeometry args={[0.08, 0.1, 4.4, 6]} />
          <meshStandardMaterial color={"#777777"} metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* Cross braces */}
      <mesh position={[0, 1.5, -0.6]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.05, 2, 0.05]} />
        <meshStandardMaterial color={"#666666"} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.5, 0.6]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.05, 2, 0.05]} />
        <meshStandardMaterial color={"#666666"} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Platform */}
      <mesh position={[0, 4.1, 0]}>
        <boxGeometry args={[2, 0.1, 2]} />
        <meshStandardMaterial color={"#555555"} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Tank */}
      <mesh position={[0, 5.2, 0]}>
        <cylinderGeometry args={[1, 1, 2, 12]} />
        <meshStandardMaterial
          color={COL.waterTank}
          metalness={0.5}
          roughness={0.35}
        />
      </mesh>
      {/* Tank top */}
      <mesh position={[0, 6.2, 0]}>
        <coneGeometry args={[1.05, 0.5, 12]} />
        <meshStandardMaterial
          color={COL.waterTank}
          metalness={0.5}
          roughness={0.35}
        />
      </mesh>
      {/* Pipe down */}
      <mesh position={[0.7, 2.5, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 5, 6]} />
        <meshStandardMaterial color={"#667788"} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

// ── Greenhouse ──────────────────────────────────────────────────
function Greenhouse() {
  return (
    <group position={[-14, 0, -10]}>
      {/* Glass walls */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[6, 3, 4]} />
        <meshStandardMaterial color="#88CCEE" transparent opacity={0.15} roughness={0.1} metalness={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* Frame edges */}
      {[[-3, 1.5, 0], [3, 1.5, 0]].map((p, i) => (
        <mesh key={`gh-f-${i}`} position={p as [number, number, number]}>
          <boxGeometry args={[0.08, 3, 4]} />
          <meshStandardMaterial color="#AAAAAA" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* Ridge beam */}
      <mesh position={[0, 3.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 6, 6]} />
        <meshStandardMaterial color="#AAAAAA" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Roof panels (angled) */}
      <mesh position={[0, 3.15, -0.9]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[6, 0.02, 2.2]} />
        <meshStandardMaterial color="#88CCEE" transparent opacity={0.12} />
      </mesh>
      <mesh position={[0, 3.15, 0.9]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[6, 0.02, 2.2]} />
        <meshStandardMaterial color="#88CCEE" transparent opacity={0.12} />
      </mesh>
      {/* Internal planting beds */}
      {[-1.5, 0, 1.5].map((x, i) => (
        <mesh key={`bed-${i}`} position={[x, 0.2, 0]}>
          <boxGeometry args={[1.2, 0.4, 3]} />
          <meshStandardMaterial color="#5C3317" roughness={0.9} />
        </mesh>
      ))}
      {/* Grow lights */}
      {[-1.5, 1.5].map((x, i) => (
        <mesh key={`gl-${i}`} position={[x, 2.7, 0]}>
          <boxGeometry args={[0.6, 0.06, 0.3]} />
          <meshStandardMaterial color="#DD88FF" emissive="#DD88FF" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* Door */}
      <mesh position={[3.01, 0.9, 0]}>
        <boxGeometry args={[0.02, 1.8, 0.9]} />
        <meshStandardMaterial color="#668899" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// ── Windmill ────────────────────────────────────────────────────
function Windmill() {
  const bladesRef = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    if (bladesRef.current) bladesRef.current.rotation.z += dt * 0.8;
  });
  return (
    <group position={[-18, 0, 8]}>
      {/* Tower */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.15, 0.3, 6, 8]} />
        <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Hub */}
      <mesh position={[0, 6.1, 0.2]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Blades */}
      <group ref={bladesRef} position={[0, 6.1, 0.3]}>
        {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
          <mesh key={`bl-${i}`} position={[Math.cos(angle) * 1.2, Math.sin(angle) * 1.2, 0]} rotation={[0, 0, angle]}>
            <boxGeometry args={[0.15, 2.2, 0.02]} />
            <meshStandardMaterial color="#DDDDDD" metalness={0.3} roughness={0.5} />
          </mesh>
        ))}
      </group>
      {/* Tail vane */}
      <mesh position={[0, 5.8, -0.4]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.6, 0.4, 0.02]} />
        <meshStandardMaterial color="#CC4444" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ── Animal Pen ──────────────────────────────────────────────────
function AnimalPen() {
  return (
    <group position={[14, 0, 8]}>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[5, 4]} />
        <meshStandardMaterial color="#8B7355" roughness={0.95} />
      </mesh>
      {/* Fence posts */}
      {[[-2.5, 0, -2], [-2.5, 0, 2], [2.5, 0, -2], [2.5, 0, 2], [0, 0, -2], [0, 0, 2]].map((p, i) => (
        <mesh key={`ap-p-${i}`} position={[p[0], 0.5, p[2]]}>
          <cylinderGeometry args={[0.05, 0.05, 1, 6]} />
          <meshStandardMaterial color="#8B6914" roughness={0.8} />
        </mesh>
      ))}
      {/* Fence rails */}
      {[-2, 2].map((z, i) => (
        <mesh key={`ap-r-${i}`} position={[0, 0.5, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 5, 4]} />
          <meshStandardMaterial color="#A0824A" roughness={0.8} />
        </mesh>
      ))}
      {/* Feeding trough */}
      <mesh position={[1.5, 0.3, 0]}>
        <boxGeometry args={[0.8, 0.4, 2]} />
        <meshStandardMaterial color="#6B4226" roughness={0.9} />
      </mesh>
      {/* Water bucket */}
      <mesh position={[-1.5, 0.2, 0.5]}>
        <cylinderGeometry args={[0.15, 0.12, 0.3, 8]} />
        <meshStandardMaterial color="#4488AA" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Shelter roof */}
      <mesh position={[-1, 1.3, 0]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[2.5, 0.06, 3]} />
        <meshStandardMaterial color="#8B6914" roughness={0.8} />
      </mesh>
      {/* Shelter posts */}
      {[[-2.2, 0, -1.3], [-2.2, 0, 1.3], [0.2, 0, -1.3], [0.2, 0, 1.3]].map((p, i) => (
        <mesh key={`sh-${i}`} position={[p[0], 0.65, p[2]]}>
          <cylinderGeometry args={[0.04, 0.04, 1.3, 6]} />
          <meshStandardMaterial color="#8B6914" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// ── Farm House ──────────────────────────────────────────────────
function FarmHouse() {
  return (
    <group position={[18, 0, 6]}>
      {/* Main body */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[3.5, 2.4, 3]} />
        <meshStandardMaterial color="#E8D5B5" roughness={0.8} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 2.8, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[4, 0.1, 3.5]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>
      <mesh position={[0, 3.1, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[3.2, 0.1, 3]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>
      <mesh position={[0, 3.35, 0]}>
        <boxGeometry args={[2.4, 0.1, 2.5]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.8, 1.51]}>
        <boxGeometry args={[0.7, 1.4, 0.02]} />
        <meshStandardMaterial color="#5C3317" roughness={0.8} />
      </mesh>
      {/* Windows */}
      {[[-1, 1.3, 1.51], [1, 1.3, 1.51]].map((p, i) => (
        <mesh key={`hw-${i}`} position={p as [number, number, number]}>
          <boxGeometry args={[0.5, 0.5, 0.02]} />
          <meshStandardMaterial color="#88BBDD" transparent opacity={0.5} metalness={0.3} />
        </mesh>
      ))}
      {/* Chimney */}
      <mesh position={[1.2, 3.6, -0.5]}>
        <boxGeometry args={[0.4, 1, 0.4]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>
      {/* Porch */}
      <mesh position={[0, 0.05, 2]}>
        <boxGeometry args={[3.5, 0.1, 1]} />
        <meshStandardMaterial color="#A0824A" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ── Weather Station ─────────────────────────────────────────────
function WeatherStation() {
  return (
    <group position={[-12, 0, 12]}>
      {/* Pole */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 3, 6]} />
        <meshStandardMaterial color="#888888" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Anemometer cups */}
      <group position={[0, 2.9, 0]}>
        {[0, 1, 2].map(i => (
          <mesh key={`an-${i}`} position={[Math.cos(i * Math.PI * 2 / 3) * 0.2, 0, Math.sin(i * Math.PI * 2 / 3) * 0.2]}>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshStandardMaterial color="#CCCCCC" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
      </group>
      {/* Solar panel */}
      <mesh position={[0.15, 2.2, 0]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.25, 0.02, 0.2]} />
        <meshStandardMaterial color="#1a237e" metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Rain gauge */}
      <mesh position={[-0.15, 2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.15, 8]} />
        <meshStandardMaterial color="#DDDDDD" transparent opacity={0.4} />
      </mesh>
      {/* Data box */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.15, 0.2, 0.1]} />
        <meshStandardMaterial color="#555555" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ── Compost Area ────────────────────────────────────────────────
function CompostArea() {
  return (
    <group position={[12, 0, -10]}>
      {/* Bins */}
      {[0, 1.3, 2.6].map((x, i) => (
        <group key={`cb-${i}`} position={[x - 1.3, 0, 0]}>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[1, 0.8, 1]} />
            <meshStandardMaterial color={i === 0 ? "#5C3317" : i === 1 ? "#4A6B2A" : "#8B6914"} roughness={0.9} />
          </mesh>
          {/* Fill material */}
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[0.85, 0.15, 0.85]} />
            <meshStandardMaterial color={i === 0 ? "#3D2010" : i === 1 ? "#2D5016" : "#6B4226"} roughness={1} />
          </mesh>
        </group>
      ))}
      {/* Pitchfork */}
      <mesh position={[2, 0.6, 0.5]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.02, 0.02, 1.2, 4]} />
        <meshStandardMaterial color="#8B6914" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ── Dirt Path ───────────────────────────────────────────────────
function DirtPath() {
  return (
    <group>
      {/* Path from barn to field */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, 0.02, -5]}>
        <planeGeometry args={[1.2, 10]} />
        <meshStandardMaterial color="#9B7B5A" roughness={0.95} />
      </mesh>
      {/* Path from road to barn */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[12, 0.02, -10]}>
        <planeGeometry args={[1.2, 6]} />
        <meshStandardMaterial color="#9B7B5A" roughness={0.95} />
      </mesh>
    </group>
  );
}

// ═════════════════════════════════════════════════════════════════
//  MAIN SCENE
// ═════════════════════════════════════════════════════════════════

export default function FarmingScene({ progress, selectedPhase, xray, config }: SceneProps) {
  const fieldRows = config.fieldRows ?? 8;
  const fieldCols = config.fieldCols ?? 12;
  const hasBarn   = config.hasBarn ?? true;
  const hasSilo   = config.hasSilo ?? true;
  const hasGreenhouse = config.hasGreenhouse ?? false;

  const layout = useFieldLayout(fieldRows, fieldCols);

  // ── Phase opacities ──
  const o = {
    land_prep:    getPhaseOpacity(progress, 0, 12),
    irrigation:   getPhaseOpacity(progress, 10, 22),
    seeding:      getPhaseOpacity(progress, 20, 35),
    growth:       getPhaseOpacity(progress, 32, 55),
    pest_control: getPhaseOpacity(progress, 40, 60),
    harvest_prep: getPhaseOpacity(progress, 58, 70),
    harvesting:   getPhaseOpacity(progress, 68, 82),
    processing:   getPhaseOpacity(progress, 78, 88),
    storage:      getPhaseOpacity(progress, 86, 94),
    distribution: getPhaseOpacity(progress, 92, 100),
  };

  // When a phase is selected, dim non-selected phases
  const phaseAlpha = (phaseId: string, base: number): number => {
    if (!selectedPhase) return base;
    return phaseId === selectedPhase ? base : base * 0.15;
  };

  // X-ray mode — make everything semi-transparent so internals show
  const xrayMul = xray ? 0.4 : 1;

  return (
    <group>
      {/* ── Ambient & directional light boosts for the scene ── */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[15, 20, 10]} intensity={0.8} castShadow />
      <directionalLight position={[-10, 12, -8]} intensity={0.3} />

      {/* ── Ground ── */}
      <Ground opacity={1 * xrayMul} />

      {/* ── Permanent structures ── */}
      {hasBarn && <Barn />}
      {hasSilo && <Silo />}
      {config.showVehicles !== false && <Tractor progress={progress} />}
      <Fence />
      <Road />
      <WaterTower />
      <Windmill />
      <AnimalPen />
      <FarmHouse />
      <WeatherStation />
      <CompostArea />
      <DirtPath />
      {hasGreenhouse && <Greenhouse />}

      {/* ── Phase layers ── */}
      <LandPrep
        opacity={phaseAlpha("land_prep", o.land_prep) * xrayMul}
        rows={fieldRows}
        cols={fieldCols}
        layout={layout}
      />
      <Irrigation
        opacity={phaseAlpha("irrigation", o.irrigation) * xrayMul}
        rows={fieldRows}
        layout={layout}
      />
      <Seeding
        opacity={phaseAlpha("seeding", o.seeding) * xrayMul}
        rows={fieldRows}
        cols={fieldCols}
        layout={layout}
      />
      <Growth
        opacity={phaseAlpha("growth", o.growth) * xrayMul}
        rows={fieldRows}
        cols={fieldCols}
        layout={layout}
        progress={progress}
      />
      <PestControl opacity={phaseAlpha("pest_control", o.pest_control) * xrayMul} />
      <HarvestPrep opacity={phaseAlpha("harvest_prep", o.harvest_prep) * xrayMul} />
      <Harvesting
        opacity={phaseAlpha("harvesting", o.harvesting) * xrayMul}
        rows={fieldRows}
        cols={fieldCols}
        layout={layout}
      />
      <Processing opacity={phaseAlpha("processing", o.processing) * xrayMul} />
      <StoragePhase
        opacity={phaseAlpha("storage", o.storage) * xrayMul}
        siloFillLevel={o.storage}
      />
      <Distribution opacity={phaseAlpha("distribution", o.distribution) * xrayMul} />

      {/* Floating BIM / Data Tooltip Example */}
      {config.highQualityGraphics && (
        <Html position={[17, 8, -10]} center distanceFactor={25}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)',
            color: 'white', padding: '6px 12px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px',
            pointerEvents: 'none', whiteSpace: 'nowrap',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ fontWeight: 'bold', color: '#4ade80' }}>Silo Storage</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Fill Level: {Math.round(o.storage * 100)}%</div>
          </div>
        </Html>
      )}
    </group>
  );
}
