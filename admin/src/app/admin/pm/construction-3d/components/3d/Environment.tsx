import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneConfig } from './shared';
import { Outlines } from '@react-three/drei';

function SmartMaterial(props: any) {
  const config = useSceneConfig();
  const isSketchup = config?.visualStyle === 'sketchup';
  if (isSketchup) {
    const { clearcoat, clearcoatRoughness, metalness, ...rest } = props;
    return (
      <React.Fragment>
        <SmartMaterial attach="material" {...rest} roughness={1} metalness={0} />
        <Outlines thickness={0.02} color="#222" />
      </React.Fragment>
    );
  }
  return <SmartMaterial attach="material" {...props} />;
}

// Temporary definition, should be imported from shared constants
export const BUILDING = {
  width: 40,
  depth: 30,
  heightPerFloor: 3,
  floors: 5,
};

export const getPhaseOpacity = (progress: number, start: number, end: number) => {
  if (progress < start) return 0;
  if (progress > end) return 1;
  return (progress - start) / (end - start);
};

export function MaterialPiles({ progress }: { progress: number }) {
  const opacity = getPhaseOpacity(progress, 5, 80);
  if (opacity <= 0) return null;
  return (
    <group>
      {/* Sand pile */}
      <mesh position={[BUILDING.width / 2 + 4, 0.5, -4]} castShadow>
        <coneGeometry args={[1, 1, 8]} />
        <SmartMaterial color="#D2B48C" transparent opacity={opacity} roughness={1} />
      </mesh>
      {/* Gravel pile */}
      <mesh position={[BUILDING.width / 2 + 4, 0.4, -6]} castShadow>
        <coneGeometry args={[0.8, 0.8, 8]} />
        <SmartMaterial color="#888888" transparent opacity={opacity} roughness={1} />
      </mesh>
      {/* Lumber stack */}
      {[0, 0.22, 0.44].map((dy, i) => (
        <mesh key={`lum-${i}`} position={[-BUILDING.width / 2 - 4, 0.12 + dy, -5]}>
          <boxGeometry args={[2, 0.18, 0.5]} />
          <SmartMaterial color={i % 2 === 0 ? "#A0724A" : "#8B6333"} transparent opacity={opacity} roughness={0.8} />
        </mesh>
      ))}
      {/* Steel rebar bundles */}
      {[0, 0.15, 0.3].map((dy, i) => (
        <mesh key={`reb-${i}`} position={[-BUILDING.width / 2 - 4, 0.1 + dy, -7]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 2.5, 6]} />
          <SmartMaterial color="#555" transparent opacity={opacity} roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
      {/* Concrete blocks */}
      {[0, 0.35].map((dy, i) =>
        [0, 0.55].map((dx, j) => (
          <mesh key={`cb-${i}-${j}`} position={[BUILDING.width / 2 + 6 + dx, 0.17 + dy, -5]}>
            <boxGeometry args={[0.5, 0.3, 0.5]} />
            <SmartMaterial color="#999" transparent opacity={opacity} roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  );
}

export function SiteOffice({ progress }: { progress: number }) {
  const opacity = getPhaseOpacity(progress, 2, 90);
  if (opacity <= 0) return null;
  const ox = BUILDING.width / 2 + 8;
  const oz = BUILDING.depth / 2;
  return (
    <group position={[ox, 0, oz]}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[4, 2.2, 2.5]} />
        <SmartMaterial color="#F5F0E8" transparent opacity={opacity} roughness={0.7} />
      </mesh>
      <mesh position={[-1.2, 0.7, 1.26]}>
        <boxGeometry args={[0.7, 1.4, 0.05]} />
        <SmartMaterial color="#6B4226" transparent opacity={opacity} roughness={0.8} />
      </mesh>
      <mesh position={[0.3, 1.3, 1.26]}>
        <boxGeometry args={[0.8, 0.5, 0.03]} />
        <SmartMaterial color="#88BBDD" transparent opacity={opacity * 0.5} />
      </mesh>
      <mesh position={[1.4, 1.3, 1.26]}>
        <boxGeometry args={[0.8, 0.5, 0.03]} />
        <SmartMaterial color="#88BBDD" transparent opacity={opacity * 0.5} />
      </mesh>
      <mesh position={[-1.2, 0.12, 1.6]}>
        <boxGeometry args={[0.8, 0.12, 0.4]} />
        <SmartMaterial color="#777" transparent opacity={opacity} roughness={0.8} />
      </mesh>
      <mesh position={[-1.2, 0.24, 1.4]}>
        <boxGeometry args={[0.8, 0.12, 0.3]} />
        <SmartMaterial color="#777" transparent opacity={opacity} roughness={0.8} />
      </mesh>
      <mesh position={[0.5, 2.35, 1.26]}>
        <boxGeometry args={[1.5, 0.25, 0.04]} />
        <SmartMaterial color="#2255AA" transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 2.25, 0]}>
        <boxGeometry args={[4.2, 0.08, 2.7]} />
        <SmartMaterial color="#AAA" transparent opacity={opacity} roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  );
}

export function ParkingArea({ progress }: { progress: number }) {
  const opacity = getPhaseOpacity(progress, 2, 100);
  if (opacity <= 0) return null;
  const bx = -BUILDING.width / 2 - 8;
  const bz = BUILDING.depth / 2 + 3;
  const carColors = ["#CC3333", "#3366CC", "#666666"];
  return (
    <group position={[bx, 0, bz]}>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 4]} />
        <SmartMaterial color="#444" transparent opacity={opacity * 0.5} roughness={0.9} />
      </mesh>
      {[-2, 0, 2].map((lx, i) => (
        <mesh key={`pline-${i}`} position={[lx, 0.02, 0]}>
          <boxGeometry args={[0.06, 0.01, 3.5]} />
          <SmartMaterial color="#FFF" transparent opacity={opacity * 0.7} />
        </mesh>
      ))}
      {carColors.map((cc, i) => (
        <group key={`car-${i}`} position={[-2 + i * 2, 0, 0]}>
          <mesh position={[0, 0.4, 0]} castShadow>
            <boxGeometry args={[1.4, 0.5, 0.8]} />
            <SmartMaterial color={cc} transparent opacity={opacity} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.72, 0]} castShadow>
            <boxGeometry args={[0.9, 0.3, 0.75]} />
            <SmartMaterial color={cc} transparent opacity={opacity} roughness={0.4} />
          </mesh>
          {[[-0.5, 0.5], [-0.5, -0.5], [0.5, 0.5], [0.5, -0.5]].map(([cwx, cwz], wi) => (
            <mesh key={`cw-${wi}`} position={[cwx, 0.12, cwz]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.08, 8]} />
              <SmartMaterial color="#111" transparent opacity={opacity} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function CompassIndicator() {
  const hw = BUILDING.width;
  return (
    <group position={[-18, 0.1, -18]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.5, 32]} />
        <SmartMaterial color="#888" />
      </mesh>
      <mesh position={[0, 0.05, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.18, 1.2, 8]} />
        <SmartMaterial color="#EE3333" />
      </mesh>
      <mesh position={[0, 0.02, -0.7]}>
        <boxGeometry args={[0.04, 0.02, 0.8]} />
        <SmartMaterial color="#888" />
      </mesh>
      <mesh position={[0.7, 0.02, 0]}>
        <boxGeometry args={[0.8, 0.02, 0.04]} />
        <SmartMaterial color="#888" />
      </mesh>
      <mesh position={[-0.7, 0.02, 0]}>
        <boxGeometry args={[0.8, 0.02, 0.04]} />
        <SmartMaterial color="#888" />
      </mesh>
      <Html position={[0, 0.3, 1.8]} center style={{ pointerEvents: "none" }}>
        <div style={{ color: "#EE3333", fontWeight: 900, fontSize: 14 }}>N</div>
      </Html>
    </group>
  );
}

export function WeatherEffects({ enabled, type }: { enabled: boolean; type: "rain" | "snow" }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const dropData = useMemo(() => {
    const arr: { x: number; startX: number; z: number; y: number; speed: number; swaySpeed: number; swayOffset: number }[] = [];
    for (let i = 0; i < 200; i++) {
      const x = (Math.random() - 0.5) * 40;
      arr.push({
        x: x,
        startX: x,
        z: (Math.random() - 0.5) * 40,
        y: Math.random() * 30,
        speed: type === "snow" ? (2 + Math.random() * 3) : (12 + Math.random() * 8),
        swaySpeed: type === "snow" ? (0.5 + Math.random()) : 0,
        swayOffset: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [type]);

  useFrame((_, delta) => {
    if (!enabled || !meshRef.current) return;
    dropData.forEach((d, i) => {
      d.y -= d.speed * delta;
      if (type === "snow") {
        d.x = d.startX + Math.sin(Date.now() * 0.001 * d.swaySpeed + d.swayOffset) * 0.5;
      }
      if (d.y < 0) {
        d.y = 30 + Math.random() * 5;
      }
      dummy.position.set(d.x, d.y, d.z);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!enabled) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, 200]}>
      {type === "snow" ? (
        <sphereGeometry args={[0.08, 4, 4]} />
      ) : (
        <boxGeometry args={[0.02, 0.3, 0.02]} />
      )}
      <SmartMaterial 
        color={type === "snow" ? "#FFFFFF" : "#6688CC"} 
        transparent 
        opacity={type === "snow" ? 0.8 : 0.35} 
      />
    </instancedMesh>
  );
}
