
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Edges, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { BUILDING, getPhaseOpacity, ConstructionPhase, SceneConfig } from './shared';

export function SitePrep({ progress, highlighted, phase }: { progress: number; highlighted: boolean; phase: ConstructionPhase }) {
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  return (
    <group>
      {/* Excavation pit - layered soil */}
      <mesh position={[0, -0.3, 0]} receiveShadow>
        <boxGeometry args={[BUILDING.width + 4, 0.6, BUILDING.depth + 4]} />
        <meshStandardMaterial color={highlighted ? "#D4A574" : "#8B6914"} transparent opacity={opacity * 0.9} roughness={0.9} />
      </mesh>
      {/* Subsoil layer */}
      <mesh position={[0, -0.65, 0]} receiveShadow>
        <boxGeometry args={[BUILDING.width + 5, 0.1, BUILDING.depth + 5]} />
        <meshStandardMaterial color="#5C3A0A" transparent opacity={opacity * 0.7} roughness={1} />
      </mesh>
      {/* Clay layer */}
      <mesh position={[0, -0.8, 0]} receiveShadow>
        <boxGeometry args={[BUILDING.width + 6, 0.2, BUILDING.depth + 6]} />
        <meshStandardMaterial color="#8B7355" transparent opacity={opacity * 0.5} roughness={1} />
      </mesh>

      {/* Construction fence posts with safety tape */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const r = Math.max(BUILDING.width, BUILDING.depth) / 2 + 3.5;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        return (
          <group key={`fence-${i}`}>
            <mesh position={[x, 0.5, z]}>
              <cylinderGeometry args={[0.05, 0.05, 1.5, 8]} />
              <meshStandardMaterial color="#F59E0B" transparent opacity={opacity} />
            </mesh>
            {/* Safety tape between posts */}
            {i < 11 && (
              <mesh position={[(x + Math.cos(((i + 1) / 12) * Math.PI * 2) * r) / 2, 0.9, (z + Math.sin(((i + 1) / 12) * Math.PI * 2) * r) / 2]}>
                <boxGeometry args={[0.8, 0.08, 0.02]} />
                <meshStandardMaterial color="#FF6600" transparent opacity={opacity * 0.8} emissive="#FF4400" emissiveIntensity={0.2} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Surveyor stakes with string lines */}
      {[
        [-BUILDING.width / 2, -BUILDING.depth / 2],
        [BUILDING.width / 2, -BUILDING.depth / 2],
        [BUILDING.width / 2, BUILDING.depth / 2],
        [-BUILDING.width / 2, BUILDING.depth / 2],
      ].map(([sx, sz], i) => (
        <group key={`stake-${i}`}>
          <mesh position={[sx, 0.3, sz]}>
            <cylinderGeometry args={[0.03, 0.03, 1, 6]} />
            <meshStandardMaterial color="#FF0000" transparent opacity={opacity} />
          </mesh>
          <mesh position={[sx, 0.65, sz]}>
            <boxGeometry args={[0.15, 0.15, 0.01]} />
            <meshStandardMaterial color="#FF8800" transparent opacity={opacity} emissive="#FF4400" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}

      {/* Excavator tracks in dirt */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`track-${i}`} position={[-BUILDING.width / 2 + 2 + i * 1.2, -0.25, BUILDING.depth / 2 + 1.5]} rotation={[-Math.PI / 2, 0, 0.15]}>
          <planeGeometry args={[0.6, 0.15]} />
          <meshStandardMaterial color="#5A3A10" transparent opacity={opacity * 0.6} roughness={1} />
        </mesh>
      ))}

      {/* Material staging area */}
      <group position={[-BUILDING.width / 2 - 3, 0, -BUILDING.depth / 2]}>
        {/* Rebar bundles */}
        {[0, 0.4, 0.8].map((dy, i) => (
          <mesh key={`rebar-${i}`} position={[0, 0.15 + dy * 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.15, 0.15, 2.5, 8]} />
            <meshStandardMaterial color="#8B4513" transparent opacity={opacity * 0.8} metalness={0.6} roughness={0.5} />
          </mesh>
        ))}
        {/* Cement bags stack */}
        {Array.from({ length: 3 }).map((_, i) =>
          Array.from({ length: 2 }).map((_, j) => (
            <mesh key={`cement-${i}-${j}`} position={[2, 0.2 + i * 0.35, -1 + j * 0.8]}>
              <boxGeometry args={[0.6, 0.3, 0.7]} />
              <meshStandardMaterial color="#A0A0A0" transparent opacity={opacity * 0.85} roughness={0.9} />
            </mesh>
          ))
        )}
        {/* Wooden planks */}
        <mesh position={[3.5, 0.15, 0]}>
          <boxGeometry args={[0.3, 0.08, 3]} />
          <meshStandardMaterial color="#C49A6C" transparent opacity={opacity * 0.8} roughness={0.8} />
        </mesh>
        <mesh position={[3.5, 0.25, 0]}>
          <boxGeometry args={[0.3, 0.08, 3]} />
          <meshStandardMaterial color="#B8905A" transparent opacity={opacity * 0.8} roughness={0.8} />
        </mesh>
      </group>

      {/* Temporary site office (porta cabin) */}
      <group position={[BUILDING.width / 2 + 4, 0, BUILDING.depth / 2]}>
        <mesh position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[3, 1.6, 2]} />
          <meshStandardMaterial color="#E8E0D0" transparent opacity={opacity} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.2, 1.01]}>
          <boxGeometry args={[1.2, 0.6, 0.02]} />
          <meshStandardMaterial color="#88AACC" transparent opacity={opacity * 0.5} roughness={0.1} />
        </mesh>
        {/* Door */}
        <mesh position={[-0.8, 0.6, 1.01]}>
          <boxGeometry args={[0.6, 1.2, 0.02]} />
          <meshStandardMaterial color="#666" transparent opacity={opacity} />
        </mesh>
      </group>
    </group>
  );
// --- Structural Frame (Columns + Beams per floor) ---
export function StructuralFrame({ progress, highlighted, xray, explodeLevel = 0, onSelectBimObject, phase }: { progress: number; highlighted: boolean; xray: boolean; explodeLevel?: number; onSelectBimObject?: (obj: any) => void; phase: ConstructionPhase }) {
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  const columnColor = highlighted ? "#5B9FFF" : "#4080D0";
  const beamColor = highlighted ? "#7BB8FF" : "#5090DD";

  const floorGroups: React.ReactElement[] = [];

  for (let floor = 0; floor < BUILDING.floors; floor++) {
    const floorProgress = getPhaseOpacity(
      progress,
      phase.startPercent + (floor / BUILDING.floors) * (phase.endPercent - phase.startPercent),
      phase.startPercent + ((floor + 1) / BUILDING.floors) * (phase.endPercent - phase.startPercent)
    );
    if (floorProgress <= 0) continue;

    const explodeOffset = floor * explodeLevel * 4;
    const baseY = 0.4 + floor * BUILDING.floorHeight + explodeOffset;

    const floorColumns: React.ReactElement[] = [];
    const floorBeamsX: React.ReactElement[] = [];
    const floorBeamsZ: React.ReactElement[] = [];

    // Columns at grid intersections
    for (let xi = 0; xi <= 5; xi++) {
      for (let zi = 0; zi <= 2; zi++) {
        const x = -BUILDING.width / 2 + (xi * BUILDING.width) / 5;
        const z = -BUILDING.depth / 2 + (zi * BUILDING.depth) / 2;
        floorColumns.push(
          <Instance
            key={`col-${floor}-${xi}-${zi}`}
            position={[x, baseY + (BUILDING.floorHeight * floorProgress) / 2, z]}
            scale={[0.4, BUILDING.floorHeight * floorProgress, 0.4]}
            onClick={(e) => {
              if (onSelectBimObject) {
                e.stopPropagation();
                onSelectBimObject({ id: `col-${floor}-${xi}-${zi}`, type: "Structural Column", material: "Steel/Concrete", floor: floor + 1, cost: "$1,200", phase: "Structural Frame" });
              }
            }}
          />
        );
      }
    }

    // Horizontal beams along length
    if (floorProgress > 0.5) {
      for (let zi = 0; zi <= 2; zi++) {
        const z = -BUILDING.depth / 2 + (zi * BUILDING.depth) / 2;
        floorBeamsX.push(
          <Instance
            key={`beamX-${floor}-${zi}`}
            position={[0, baseY + BUILDING.floorHeight, z]}
            scale={[BUILDING.width, 0.3, 0.3]}
            onClick={(e) => {
              if (onSelectBimObject) {
                e.stopPropagation();
                onSelectBimObject({ id: `beamX-${floor}-${zi}`, type: "Structural Beam (X)", material: "Steel", floor: floor + 1, cost: "$800", phase: "Structural Frame" });
              }
            }}
          />
        );
      }
      // Beams along width
      for (let xi = 0; xi <= 5; xi++) {
        const x = -BUILDING.width / 2 + (xi * BUILDING.width) / 5;
        floorBeamsZ.push(
          <Instance
            key={`beamZ-${floor}-${xi}`}
            position={[x, baseY + BUILDING.floorHeight, 0]}
            scale={[0.3, 0.3, BUILDING.depth]}
            onClick={(e) => {
              if (onSelectBimObject) {
                e.stopPropagation();
                onSelectBimObject({ id: `beamZ-${floor}-${xi}`, type: "Structural Beam (Z)", material: "Steel", floor: floor + 1, cost: "$850", phase: "Structural Frame" });
              }
            }}
          />
        );
      }
    }

    floorGroups.push(
      <group key={`sf-floor-${floor}`}>
        <Instances limit={floorColumns.length} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={columnColor}
            transparent
            opacity={xray ? 0.5 : opacity * floorProgress}
            roughness={0.4}
            metalness={0.6}
          />
          {floorColumns}
        </Instances>
        {floorBeamsX.length > 0 && (
          <Instances limit={floorBeamsX.length} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={beamColor}
              transparent
              opacity={xray ? 0.4 : opacity * floorProgress}
              roughness={0.4}
              metalness={0.6}
            />
            {floorBeamsX}
          </Instances>
        )}
        {floorBeamsZ.length > 0 && (
          <Instances limit={floorBeamsZ.length} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={beamColor}
              transparent
              opacity={xray ? 0.4 : opacity * floorProgress}
              roughness={0.4}
              metalness={0.6}
            />
            {floorBeamsZ}
          </Instances>
        )}
      </group>
    );
  }

  // Stairwell core (left side of building)
  const stairX = -BUILDING.width / 2 + 1.5;
  const totalH = BUILDING.floors * BUILDING.floorHeight;
  const stairElements: React.ReactElement[] = [];
  // Stair core walls
  stairElements.push(
    <mesh key="stair-wall-1" position={[stairX, 0.4 + totalH * opacity / 2, -BUILDING.depth / 2 + 1.5]}>
      <boxGeometry args={[0.2, totalH * opacity, 3]} />
      <meshStandardMaterial color="#708090" transparent opacity={xray ? 0.3 : opacity * 0.7} roughness={0.7} metalness={0.3} />
    </mesh>
  );
  stairElements.push(
    <mesh key="stair-wall-2" position={[stairX - 1.3, 0.4 + totalH * opacity / 2, -BUILDING.depth / 2 + 1.5]}>
      <boxGeometry args={[0.2, totalH * opacity, 3]} />
      <meshStandardMaterial color="#708090" transparent opacity={xray ? 0.3 : opacity * 0.7} roughness={0.7} metalness={0.3} />
    </mesh>
  );
  // Stair flights per floor
  for (let f = 0; f < BUILDING.floors; f++) {
    const sy = 0.4 + f * BUILDING.floorHeight;
    stairElements.push(
      <mesh key={`stair-flight-${f}`} position={[stairX - 0.65, sy + BUILDING.floorHeight / 2, -BUILDING.depth / 2 + 1.5]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[1.8, 0.1, 2.5]} />
        <meshStandardMaterial color="#607080" transparent opacity={xray ? 0.25 : opacity * 0.5} roughness={0.6} metalness={0.4} />
      </mesh>
    );
  }

  // Elevator shaft (right side of building)
  const elevX = BUILDING.width / 2 - 1.5;
  const elevElements: React.ReactElement[] = [];
  // Shaft walls
  elevElements.push(
    <mesh key="elev-front" position={[elevX, 0.4 + totalH * opacity / 2, -BUILDING.depth / 2 + 0.7]}>
      <boxGeometry args={[2, totalH * opacity, 0.15]} />
      <meshStandardMaterial color="#555" transparent opacity={xray ? 0.2 : opacity * 0.6} roughness={0.5} metalness={0.5} />
    </mesh>
  );
  elevElements.push(
    <mesh key="elev-back" position={[elevX, 0.4 + totalH * opacity / 2, -BUILDING.depth / 2 + 2.5]}>
      <boxGeometry args={[2, totalH * opacity, 0.15]} />
      <meshStandardMaterial color="#555" transparent opacity={xray ? 0.2 : opacity * 0.6} roughness={0.5} metalness={0.5} />
    </mesh>
  );
  // Elevator guide rails
  elevElements.push(
    <mesh key="elev-rail-1" position={[elevX - 0.7, 0.4 + totalH * opacity / 2, -BUILDING.depth / 2 + 1.6]}>
      <boxGeometry args={[0.06, totalH * opacity, 0.06]} />
      <meshStandardMaterial color="#888" transparent opacity={opacity * 0.5} metalness={0.8} roughness={0.2} />
    </mesh>
  );
  elevElements.push(
    <mesh key="elev-rail-2" position={[elevX + 0.7, 0.4 + totalH * opacity / 2, -BUILDING.depth / 2 + 1.6]}>
      <boxGeometry args={[0.06, totalH * opacity, 0.06]} />
      <meshStandardMaterial color="#888" transparent opacity={opacity * 0.5} metalness={0.8} roughness={0.2} />
    </mesh>
  );

  return (
    <group>
      {floorGroups}
      {stairElements}
      {elevElements}
    </group>
  );
}

// --- Floor Slabs ---
export function FloorSlabs({ progress, highlighted, xray, explodeLevel = 0, onSelectBimObject, phase }: { progress: number; highlighted: boolean; xray: boolean; explodeLevel?: number; onSelectBimObject?: (obj: any) => void; phase: ConstructionPhase }) {
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  return (
    <group>
      {Array.from({ length: BUILDING.floors }).map((_, floor) => {
        const floorOpacity = getPhaseOpacity(
          progress,
          phase.startPercent + (floor / BUILDING.floors) * (phase.endPercent - phase.startPercent),
          phase.startPercent + ((floor + 1) / BUILDING.floors) * (phase.endPercent - phase.startPercent)
        );
        if (floorOpacity <= 0) return null;

        const explodeOffset = floor * explodeLevel * 4;
        const y = 0.4 + (floor + 1) * BUILDING.floorHeight + explodeOffset;

        return (
          <mesh 
            key={`slab-${floor}`} 
            position={[0, y, 0]} 
            castShadow 
            receiveShadow
            onClick={(e) => {
              if (onSelectBimObject) {
                e.stopPropagation();
                onSelectBimObject({ id: `slab-${floor}`, type: "Concrete Floor Slab", material: "Reinforced Concrete", floor: floor + 1, cost: "$15,000", phase: "Floor Slabs", area: `${(BUILDING.width * BUILDING.depth).toFixed(0)} sqm` });
              }
            }}
          >
            <boxGeometry args={[BUILDING.width + 0.2, 0.25, BUILDING.depth + 0.2]} />
            <meshStandardMaterial
              color={highlighted ? "#B8A0E0" : "#9080C0"}
              transparent
              opacity={xray ? 0.3 : opacity * floorOpacity}
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// --- External Walls ---
export function ExternalWalls({ progress, highlighted, xray, config, explodeLevel = 0, onSelectBimObject, phase }: { progress: number; highlighted: boolean; xray: boolean; config: SceneConfig; explodeLevel?: number; onSelectBimObject?: (obj: any) => void; phase: ConstructionPhase }) {
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  const floorGroups: React.ReactElement[] = [];
  const wallColor = highlighted ? "#FFD080" : (config.wallColor ?? "#E8C868");

  for (let floor = 0; floor < BUILDING.floors; floor++) {
    const floorOpacity = getPhaseOpacity(
      progress,
      phase.startPercent + (floor / BUILDING.floors) * (phase.endPercent - phase.startPercent),
      phase.startPercent + ((floor + 1) / BUILDING.floors) * (phase.endPercent - phase.startPercent)
    );
    if (floorOpacity <= 0) continue;

    const explodeOffset = floor * explodeLevel * 4;
    const baseY = 0.4 + floor * BUILDING.floorHeight + BUILDING.floorHeight / 2 + 0.12 + explodeOffset;

    const floorWalls: React.ReactElement[] = [];

    // Front and back walls (along x-axis)  with window cutouts simulated as segments
    for (const zSide of [-1, 1]) {
      const z = zSide * (BUILDING.depth / 2);
      const segmentWidth = BUILDING.width / (BUILDING.windowsPerSide * 2 + 1);

      for (let seg = 0; seg <= BUILDING.windowsPerSide * 2; seg++) {
        const isWindow = seg % 2 === 1;
        if (isWindow) continue; // Skip window openings

        const x = -BUILDING.width / 2 + segmentWidth / 2 + seg * segmentWidth;
        floorWalls.push(
          <Instance 
            key={`wall-fb-${floor}-${zSide}-${seg}`} 
            position={[x, baseY, z]} 
            scale={[segmentWidth, BUILDING.floorHeight - 0.25, BUILDING.wallThickness]}
            onClick={(e) => {
              if (onSelectBimObject) {
                e.stopPropagation();
                onSelectBimObject({ id: `wall-fb-${floor}-${zSide}-${seg}`, type: "External Wall Panel", material: "Precast Concrete", floor: floor + 1, cost: "$3,500", phase: "External Walls" });
              }
            }}
          />
        );
      }

      // Wall sections above and below windows
      for (let seg = 0; seg < BUILDING.windowsPerSide; seg++) {
        const windowX = -BUILDING.width / 2 + segmentWidth + segmentWidth * 2 * seg + segmentWidth / 2;
        // Below window
        floorWalls.push(
          <Instance 
            key={`wall-bw-${floor}-${zSide}-${seg}`} 
            position={[windowX, baseY - BUILDING.floorHeight / 2 + 0.4, z]} 
            scale={[segmentWidth, 0.8, BUILDING.wallThickness]}
          />
        );
        // Above window
        floorWalls.push(
          <Instance 
            key={`wall-aw-${floor}-${zSide}-${seg}`} 
            position={[windowX, baseY + BUILDING.floorHeight / 2 - 0.3, z]} 
            scale={[segmentWidth, 0.4, BUILDING.wallThickness]}
          />
        );
      }
    }

    // Side walls (along z-axis)
    for (const xSide of [-1, 1]) {
      const x = xSide * (BUILDING.width / 2);
      floorWalls.push(
        <Instance 
          key={`wall-side-${floor}-${xSide}`} 
          position={[x, baseY, 0]} 
          scale={[BUILDING.wallThickness, BUILDING.floorHeight - 0.25, BUILDING.depth]}
        />
      );
    }

    floorGroups.push(
      <group key={`ew-floor-${floor}`}>
        <Instances limit={floorWalls.length} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={wallColor}
            transparent
            opacity={xray ? 0.15 : opacity * floorOpacity * 0.95}
            roughness={0.75}
            metalness={0.05}
            side={THREE.DoubleSide}
          />
          {floorWalls}
        </Instances>
      </group>
    );
  }

  return <group>{floorGroups}</group>;
}

// --- Windows & Glazing ---
export function WindowsGlazing({ progress, highlighted, xray, config, explodeLevel = 0, onSelectBimObject, phase }: { progress: number; highlighted: boolean; xray: boolean; config: SceneConfig; explodeLevel?: number; onSelectBimObject?: (obj: any) => void; phase: ConstructionPhase }) {
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  const floorGroups: React.ReactElement[] = [];
  const glassColor = highlighted ? "#80E0FF" : (config.glassColor ?? "#88CCEE");

  for (let floor = 0; floor < BUILDING.floors; floor++) {
    const floorOpacity = getPhaseOpacity(
      progress,
      phase.startPercent + (floor / BUILDING.floors) * (phase.endPercent - phase.startPercent),
      phase.startPercent + ((floor + 1) / BUILDING.floors) * (phase.endPercent - phase.startPercent)
    );
    if (floorOpacity <= 0) continue;

    const explodeOffset = floor * explodeLevel * 4;
    const baseY = 0.4 + floor * BUILDING.floorHeight + BUILDING.floorHeight / 2 + 0.12 + explodeOffset;
    const segmentWidth = BUILDING.width / (BUILDING.windowsPerSide * 2 + 1);

    const glassPanes: React.ReactElement[] = [];
    const frames: React.ReactElement[] = [];

    // Front and back windows
    for (const zSide of [-1, 1]) {
      const z = zSide * (BUILDING.depth / 2);

      for (let w = 0; w < BUILDING.windowsPerSide; w++) {
        const windowX = -BUILDING.width / 2 + segmentWidth + segmentWidth * 2 * w + segmentWidth / 2;

        glassPanes.push(
          <Instance
            key={`win-${floor}-${zSide}-${w}`}
            position={[windowX, baseY, z + zSide * 0.01]}
            onClick={(e) => {
              if (onSelectBimObject) {
                e.stopPropagation();
                onSelectBimObject({ id: `win-${floor}-${zSide}-${w}`, type: "Glazing Unit", material: "Double-Pane Low-E Glass", floor: floor + 1, cost: "$1,800", phase: "Windows & Glazing" });
              }
            }}
          />
        );

        // Window frame
        const frameThickness = 0.06;
        const framePositions = [
          { pos: [windowX, baseY + BUILDING.windowHeight / 2, z + zSide * 0.05] as [number, number, number], size: [segmentWidth * 0.95, frameThickness, frameThickness] as [number, number, number] },
          { pos: [windowX, baseY - BUILDING.windowHeight / 2, z + zSide * 0.05] as [number, number, number], size: [segmentWidth * 0.95, frameThickness, frameThickness] as [number, number, number] },
          { pos: [windowX - segmentWidth * 0.45, baseY, z + zSide * 0.05] as [number, number, number], size: [frameThickness, BUILDING.windowHeight, frameThickness] as [number, number, number] },
          { pos: [windowX + segmentWidth * 0.45, baseY, z + zSide * 0.05] as [number, number, number], size: [frameThickness, BUILDING.windowHeight, frameThickness] as [number, number, number] },
        ];

        framePositions.forEach((fp, fi) => {
          frames.push(
            <Instance key={`frame-${floor}-${zSide}-${w}-${fi}`} position={fp.pos} scale={fp.size} />
          );
        });
      }
    }

    floorGroups.push(
      <group key={`win-floor-${floor}`}>
        <Instances limit={glassPanes.length}>
          <planeGeometry args={[segmentWidth * 0.9, BUILDING.windowHeight]} />
          <meshPhysicalMaterial
            color={glassColor}
            transparent
            opacity={xray ? 0.1 : opacity * floorOpacity * 0.45}
            roughness={0.05}
            metalness={0.3}
            transmission={0.6}
            side={THREE.DoubleSide}
          />
          {glassPanes}
        </Instances>
        <Instances limit={frames.length}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#404040"
            transparent
            opacity={opacity * floorOpacity}
            metalness={0.8}
            roughness={0.3}
          />
          {frames}
        </Instances>
      </group>
    );
  }

  return <group>{floorGroups}</group>;
}

// --- Roofing ---
export function Roofing({ progress, highlighted, config, explodeLevel = 0, onSelectBimObject, phase }: { progress: number; highlighted: boolean; config: SceneConfig; explodeLevel?: number; onSelectBimObject?: (obj: any) => void; phase: ConstructionPhase }) {
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  const explodeOffset = BUILDING.floors * explodeLevel * 4;
  const roofY = 0.4 + BUILDING.floors * BUILDING.floorHeight + 0.15 + explodeOffset;
  const roofColor = highlighted ? "#FF7070" : (config.roofColor ?? "#CC4040");

  return (
    <group>
      {/* Main roof slab */}
      <mesh 
        position={[0, roofY, 0]} 
        castShadow 
        receiveShadow
        onClick={(e) => {
          if (onSelectBimObject) {
            e.stopPropagation();
            onSelectBimObject({ id: "roof-slab", type: "Roof Slab", material: "Waterproofed Concrete", floor: "Roof", cost: "$25,000", phase: "Roofing" });
          }
        }}
      >
        <boxGeometry args={[BUILDING.width + 0.8, 0.35, BUILDING.depth + 0.8]} />
        <meshStandardMaterial color={roofColor} transparent opacity={opacity} roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Parapet walls */}
      {[
        { pos: [0, roofY + 0.5, BUILDING.depth / 2 + 0.3] as [number, number, number], size: [BUILDING.width + 0.8, 0.7, 0.15] as [number, number, number] },
        { pos: [0, roofY + 0.5, -BUILDING.depth / 2 - 0.3] as [number, number, number], size: [BUILDING.width + 0.8, 0.7, 0.15] as [number, number, number] },
        { pos: [BUILDING.width / 2 + 0.3, roofY + 0.5, 0] as [number, number, number], size: [0.15, 0.7, BUILDING.depth + 0.8] as [number, number, number] },
        { pos: [-BUILDING.width / 2 - 0.3, roofY + 0.5, 0] as [number, number, number], size: [0.15, 0.7, BUILDING.depth + 0.8] as [number, number, number] },
      ].map((p, i) => (
        <mesh key={`parapet-${i}`} position={p.pos} castShadow>
          <boxGeometry args={p.size} />
          <meshStandardMaterial color="#888" transparent opacity={opacity * 0.9} roughness={0.7} />
        </mesh>
      ))}

      {/* Mechanical Penthouse */}
      <mesh position={[-2, roofY + 1.5, -1]} castShadow>
        <boxGeometry args={[3.5, 2.5, 3]} />
        <meshStandardMaterial color="#606068" transparent opacity={opacity * 0.85} roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Penthouse door */}
      <mesh position={[-2, roofY + 1.2, 0.51]}>
        <boxGeometry args={[0.8, 1.6, 0.02]} />
        <meshStandardMaterial color="#444" transparent opacity={opacity} metalness={0.5} />
      </mesh>
      {/* Penthouse vent grilles */}
      {[-3.1, -0.9].map((dz, i) => (
        <mesh key={`vent-${i}`} position={[-3.76, roofY + 1.8, dz]}>
          <boxGeometry args={[0.02, 0.8, 0.6]} />
          <meshStandardMaterial color="#555" transparent opacity={opacity * 0.7} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* HVAC Units Array */}
      {[[-4, 2], [-1, 2], [2, 2]].map(([dx, dz], i) => (
        <group key={`hvac-${i}`} position={[dx, roofY + 0.35, dz]}>
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[1.8, 0.7, 1.2]} />
            <meshStandardMaterial color="#778888" transparent opacity={opacity * 0.8} metalness={0.5} roughness={0.4} />
          </mesh>
          {/* Fan grill on top */}
          <mesh position={[0, 0.75, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.06, 12]} />
            <meshStandardMaterial color="#444" transparent opacity={opacity * 0.7} metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Elevator overrun */}
      <mesh position={[BUILDING.width / 2 - 1.5, roofY + 1.2, -BUILDING.depth / 2 + 1.6]} castShadow>
        <boxGeometry args={[2.2, 2, 2]} />
        <meshStandardMaterial color="#606068" transparent opacity={opacity * 0.8} roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Roof access stair enclosure */}
      <mesh position={[-BUILDING.width / 2 + 1.5, roofY + 1, -BUILDING.depth / 2 + 1.5]} castShadow>
        <boxGeometry args={[2.5, 1.5, 2.5]} />
        <meshStandardMaterial color="#666670" transparent opacity={opacity * 0.75} roughness={0.7} />
      </mesh>

      {/* Solar panel area */}
      <mesh position={[3, roofY + 0.2, -1]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[4, 0.05, 3]} />
        <meshStandardMaterial color="#1a237e" transparent opacity={opacity * 0.7} metalness={0.6} roughness={0.2} />
      </mesh>
      {/* Solar panel grid lines */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={`solar-line-${i}`} position={[1.5 + i * 1, roofY + 0.23, -1]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.02, 0.02, 3]} />
          <meshStandardMaterial color="#283593" transparent opacity={opacity * 0.5} />
        </mesh>
      ))}

      {/* Drainage slopes (slight raised edges) */}
      <mesh position={[0, roofY + 0.12, 0]} rotation={[0.02, 0, 0.01]}>
        <boxGeometry args={[BUILDING.width - 1, 0.08, BUILDING.depth - 1]} />
        <meshStandardMaterial color="#888080" transparent opacity={opacity * 0.3} roughness={0.9} />
      </mesh>
    </group>
  );
}

// --- Scaffolding (appears during construction, fades out near end) ---
export function Scaffolding({ progress }: { progress: number }) {
  const fadeIn = Math.min(1, Math.max(0, (progress - 15) / 10));
  const fadeOut = progress > 80 ? Math.max(0, (90 - progress) / 10) : 1;
  const opacity = fadeIn * fadeOut;
  if (opacity <= 0) return null;

  const scaffoldLevels = BUILDING.floors + 1;
  const pipeColor = "#708090";

  // Pre-calculate positions to keep render clean
  const pipes = useMemo(() => {
    const data: { key: string, position: [number, number, number], rotation: [number, number, number], scale: [number, number, number] }[] = [];
    
    // Horizontal ledger (front face)
    for (let level = 0; level < scaffoldLevels; level++) {
      const y = 0.4 + level * BUILDING.floorHeight;
      const z = BUILDING.depth / 2 + 1;
      data.push({
        key: `sc-h-f-${level}`,
        position: [0, y, z],
        rotation: [0, 0, Math.PI / 2],
        scale: [1, BUILDING.width + 1, 1]
      });
    }

    // Vertical standards (front face)
    const totalH = scaffoldLevels * BUILDING.floorHeight;
    for (let xi = 0; xi <= 4; xi++) {
      const x = -BUILDING.width / 2 - 0.3 + (xi * (BUILDING.width + 0.6)) / 4;
      data.push({
        key: `sc-v-f-${xi}`,
        position: [x, 0.4 + totalH / 2, BUILDING.depth / 2 + 1],
        rotation: [0, 0, 0],
        scale: [1, totalH, 1]
      });
    }

    // Side scaffold (x positive)
    for (let level = 0; level < scaffoldLevels; level++) {
      const y = 0.4 + level * BUILDING.floorHeight;
      const x = BUILDING.width / 2 + 1;
      data.push({
        key: `sc-h-s-${level}`,
        position: [x, y, 0],
        rotation: [Math.PI / 2, 0, 0],
        scale: [1, BUILDING.depth + 1, 1]
      });
    }
    return data;
  }, [scaffoldLevels]);

  const planks = useMemo(() => {
    const data: { key: string, position: [number, number, number], scale: [number, number, number] }[] = [];
    for (let level = 1; level < scaffoldLevels; level++) {
      const y = 0.4 + level * BUILDING.floorHeight;
      const z = BUILDING.depth / 2 + 1;
      data.push({
        key: `sc-plat-f-${level}`,
        position: [0, y + 0.01, z - 0.3],
        scale: [BUILDING.width + 0.5, 1, 1]
      });
    }
    return data;
  }, [scaffoldLevels]);

  return (
    <group>
      {/* Instances for all pipes */}
      <Instances limit={pipes.length} range={pipes.length}>
        <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
        <meshStandardMaterial color={pipeColor} transparent opacity={opacity * 0.7} metalness={0.6} roughness={0.4} />
        {pipes.map((pipe) => (
          <Instance
            key={pipe.key}
            position={pipe.position}
            rotation={pipe.rotation}
            scale={pipe.scale}
          />
        ))}
      </Instances>

      {/* Instances for all planks */}
      <Instances limit={planks.length} range={planks.length}>
        <boxGeometry args={[1, 0.04, 0.6]} />
        <meshStandardMaterial color="#B8905A" transparent opacity={opacity * 0.5} roughness={0.8} />
        {planks.map((plank) => (
          <Instance
            key={plank.key}
            position={plank.position}
            scale={plank.scale}
          />
        ))}
      </Instances>

      {/* Safety netting (semi-transparent green on one side) */}
      <mesh position={[0, 0.4 + (scaffoldLevels * BUILDING.floorHeight) / 2, BUILDING.depth / 2 + 1.3]}>
        <boxGeometry args={[BUILDING.width + 1, scaffoldLevels * BUILDING.floorHeight, 0.02]} />
        <meshStandardMaterial color="#22AA44" transparent opacity={opacity * 0.12} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// --- MEP Systems (simplified visual indicators) ---
export function MEPSystems({ progress, highlighted, explodeLevel = 0, onSelectBimObject, phase }: { progress: number; highlighted: boolean; explodeLevel?: number; onSelectBimObject?: (obj: any) => void; phase: ConstructionPhase }) {
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  const pipes: React.ReactElement[] = [];
  const pipeColor = highlighted ? "#40E0A0" : "#20C080";

  // Vertical risers
  for (const x of [-BUILDING.width / 2 + 0.8, BUILDING.width / 2 - 0.8]) {
    for (const z of [-BUILDING.depth / 2 + 0.5, BUILDING.depth / 2 - 0.5]) {
      const totalH = BUILDING.floors * BUILDING.floorHeight;
      pipes.push(
        <mesh key={`pipe-v-${x}-${z}`} position={[x, 0.4 + totalH / 2, z]}>
          <cylinderGeometry args={[0.08, 0.08, totalH * opacity, 8]} />
          <meshStandardMaterial color={pipeColor} transparent opacity={opacity * 0.7} metalness={0.6} roughness={0.3} />
        </mesh>
      );
    }
  }

  // Horizontal runs per floor
  for (let floor = 0; floor < BUILDING.floors; floor++) {
    const explodeOffset = floor * explodeLevel * 4;
    const y = 0.4 + (floor + 1) * BUILDING.floorHeight - 0.3 + explodeOffset;
    const floorOpacity = getPhaseOpacity(
      progress,
      phase.startPercent + (floor / BUILDING.floors) * (phase.endPercent - phase.startPercent),
      phase.startPercent + ((floor + 1) / BUILDING.floors) * (phase.endPercent - phase.startPercent)
    );
    if (floorOpacity <= 0) continue;

    pipes.push(
      <mesh 
        key={`pipe-h-${floor}`} 
        position={[0, y, -BUILDING.depth / 2 + 0.5]} 
        rotation={[0, 0, Math.PI / 2]}
        onClick={(e) => {
          if (onSelectBimObject) {
            e.stopPropagation();
            onSelectBimObject({ id: `pipe-h-${floor}`, type: "HVAC Duct", material: "Galvanized Steel", floor: floor + 1, cost: "$4,200", phase: "MEP Systems" });
          }
        }}
      >
        <cylinderGeometry args={[0.06, 0.06, BUILDING.width * 0.8, 8]} />
        <meshStandardMaterial color="#3B82F6" transparent opacity={opacity * floorOpacity * 0.6} metalness={0.5} roughness={0.4} />
      </mesh>
    );
  }

  return <group>{pipes}</group>;
}

// --- Interior Finishing (simplified) ---
export function InteriorFinishing({ progress, highlighted, explodeLevel = 0, onSelectBimObject, phase }: { progress: number; highlighted: boolean; explodeLevel?: number; onSelectBimObject?: (obj: any) => void; phase: ConstructionPhase }) {
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  const elements: React.ReactElement[] = [];

  for (let floor = 0; floor < BUILDING.floors; floor++) {
    const floorOpacity = getPhaseOpacity(
      progress,
      phase.startPercent + (floor / BUILDING.floors) * (phase.endPercent - phase.startPercent),
      phase.startPercent + ((floor + 1) / BUILDING.floors) * (phase.endPercent - phase.startPercent)
    );
    if (floorOpacity <= 0) continue;

    const explodeOffset = floor * explodeLevel * 4;
    const baseY = 0.4 + floor * BUILDING.floorHeight + 0.25 + explodeOffset;

    // Floor finish layer
    elements.push(
      <mesh 
        key={`ifloor-${floor}`} 
        position={[0, baseY, 0]}
        onClick={(e) => {
          if (onSelectBimObject) {
            e.stopPropagation();
            onSelectBimObject({ id: `ifloor-${floor}`, type: "Floor Finish", material: "Epoxy / Ceramic Tile", floor: floor + 1, cost: "$8,500", phase: "Interior Finishing" });
          }
        }}
      >
        <boxGeometry args={[BUILDING.width - 0.6, 0.05, BUILDING.depth - 0.6]} />
        <meshStandardMaterial
          color={highlighted ? "#FFB0D0" : "#E890B0"}
          transparent
          opacity={opacity * floorOpacity * 0.6}
          roughness={0.3}
        />
      </mesh>
    );

    // Interior partition walls
    for (let i = 1; i <= 2; i++) {
      const x = -BUILDING.width / 2 + (i * BUILDING.width) / 3;
      elements.push(
        <mesh 
          key={`iwall-${floor}-${i}`} 
          position={[x, baseY + BUILDING.floorHeight / 2, 0]}
          onClick={(e) => {
            if (onSelectBimObject) {
              e.stopPropagation();
              onSelectBimObject({ id: `iwall-${floor}-${i}`, type: "Partition Wall", material: "Drywall / Gypsum", floor: floor + 1, cost: "$2,100", phase: "Interior Finishing" });
            }
          }}
        >
          <boxGeometry args={[0.12, BUILDING.floorHeight - 0.5, BUILDING.depth * 0.6]} />
          <meshStandardMaterial
            color="#F0E0E8"
            transparent
            opacity={opacity * floorOpacity * 0.5}
            roughness={0.8}
          />
        </mesh>
      );
    }
  }

  return <group>{elements}</group>;
}

// --- Exterior Finishing ---
export function ExteriorFinishing({ progress, highlighted, phase }: { progress: number; highlighted: boolean; phase: ConstructionPhase }) {
  const opacity = getPhaseOpacity(progress, phase.startPercent, phase.endPercent);
  if (opacity <= 0) return null;

  return (
    <group>
      {/* Entrance canopy */}
      <mesh position={[0, 2, BUILDING.depth / 2 + 1]} castShadow>
        <boxGeometry args={[4, 0.15, 2]} />
        <meshStandardMaterial
          color={highlighted ? "#60E8D0" : "#40C8B0"}
          transparent
          opacity={opacity}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      {/* Canopy supports */}
      {[-1.5, 1.5].map((x) => (
        <mesh key={`canopy-sup-${x}`} position={[x, 1, BUILDING.depth / 2 + 1.8]}>
          <cylinderGeometry args={[0.08, 0.08, 2, 8]} />
          <meshStandardMaterial color="#555" transparent opacity={opacity} metalness={0.7} />
        </mesh>
      ))}
      {/* Landscaping - simplified trees */}
      {[
        [-BUILDING.width / 2 - 2, 0, 3],
        [BUILDING.width / 2 + 2, 0, -2],
        [-BUILDING.width / 2 - 2, 0, -3],
        [BUILDING.width / 2 + 2, 0, 3],
      ].map(([x, y, z], i) => (
        <group key={`tree-${i}`} position={[x, y, z]}>
          {/* Trunk */}
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.1, 0.15, 1.6, 8]} />
            <meshStandardMaterial color="#5D3A1A" transparent opacity={opacity} />
          </mesh>
          {/* Canopy */}
          <mesh position={[0, 2, 0]}>
            <sphereGeometry args={[0.9, 16, 12]} />
            <meshStandardMaterial color="#228B22" transparent opacity={opacity * 0.85} />
          </mesh>
        </group>
      ))}
      {/* Parking markers */}
      <mesh position={[0, 0.01, -BUILDING.depth / 2 - 3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BUILDING.width, 4]} />
        <meshStandardMaterial color="#444" transparent opacity={opacity * 0.6} />
      </mesh>
    </group>
  );
}

// --- Construction Crane ---

