import React, { useRef, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, TransformControls, Line, Text } from '@react-three/drei';
import { Button } from 'antd';
import { SyncOutlined, EditOutlined, DragOutlined } from '@ant-design/icons';
import * as THREE from 'three';
import dayjs from 'dayjs';

import { SceneConfig, ConstructionPhase } from './shared';
import { useBuildStore } from '@/store/useBuildStore';
export function PlacedObject({
  id,
  defaultPosition,
  rotationY = 0,
  pathType,
  editMode,
  selectedObjectId,
  onSelect,
  onMove,
  onRotate,
  onDelete,
  children,
}: {
  id: string;
  defaultPosition: [number, number, number];
  rotationY?: number;
  pathType?: string;
  editMode: boolean;
  selectedObjectId: string | null;
  onSelect: (id: string | null) => void;
  onMove?: (id: string) => void;
  onRotate?: (id: string) => void;
  onDelete?: (id: string) => void;
  children: React.ReactNode;
}) {
  const isSelected = editMode && selectedObjectId === id;
  const groupRef = useRef<THREE.Group>(null);

  const handleClick = useCallback((e: any) => {
    if (!editMode) return;
    e.stopPropagation();
    onSelect(selectedObjectId === id ? null : id);
  }, [editMode, id, selectedObjectId, onSelect]);

  useFrame((state) => {
    if (groupRef.current && pathType === "patrol" && !editMode) {
      const time = state.clock.getElapsedTime();
      const offset = Math.sin(time) * 4; 
      groupRef.current.position.set(
        defaultPosition[0] + Math.sin(rotationY) * offset,
        defaultPosition[1],
        defaultPosition[2] + Math.cos(rotationY) * offset
      );
    } else if (groupRef.current) {
      groupRef.current.position.set(defaultPosition[0], defaultPosition[1], defaultPosition[2]);
    }
  });

  return (
    <group ref={groupRef} position={defaultPosition} rotation={[0, rotationY, 0]} onClick={handleClick}>
      {editMode && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2, 2.3, 32]} />
          <meshBasicMaterial color={isSelected ? "#00ff88" : "#ffffff"} transparent opacity={isSelected ? 0.6 : 0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
      {children}
      {isSelected && (
        <Html position={[0, 4, 0]} center>
          <div style={{
            display: "flex", gap: 8, background: "rgba(0,0,0,0.8)",
            padding: "4px 8px", borderRadius: 8, pointerEvents: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
          }}>
            <Button type="text" size="small" style={{ color: "#fff" }} icon={<DragOutlined />} onClick={(e) => { e.stopPropagation(); onMove?.(id); }}>Move</Button>
            <Button type="text" size="small" style={{ color: "#fff" }} icon={<SyncOutlined />} onClick={(e) => { e.stopPropagation(); onRotate?.(id); }}>Rotate</Button>
            <Button type="text" size="small" danger icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onDelete?.(id); }}>Delete</Button>
          </div>
        </Html>
      )}
    </group>
  );
}

export function DraggableObject({
  id,
  defaultPosition,
  rotationY = 0,
  editMode,
  selectedObjectId,
  onSelect,
  onPositionChange,
  onRotate,
  onDelete,
  children,
}: {
  id: string;
  defaultPosition: [number, number, number];
  rotationY?: number;
  editMode: boolean;
  selectedObjectId: string | null;
  onSelect: (id: string | null) => void;
  onPositionChange: (id: string, pos: [number, number, number]) => void;
  onRotate?: (id: string) => void;
  onDelete?: (id: string) => void;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const isSelected = editMode && selectedObjectId === id;

  const handleClick = useCallback((e: any) => {
    if (!editMode) return;
    e.stopPropagation();
    onSelect(selectedObjectId === id ? null : id);
  }, [editMode, id, selectedObjectId, onSelect]);

  const { gridSnap, setGridSnap, transformMode, setTransformMode, pmObjects } = useBuildStore();
  
  // Basic collision check: distance to any other pmObject < 1.0m
  const isColliding = pmObjects.some(obj => {
    if (obj.id === id) return false;
    const dx = obj.position[0] - defaultPosition[0];
    const dz = obj.position[2] - defaultPosition[2];
    return Math.sqrt(dx * dx + dz * dz) < 1.0;
  });

  const handleObjectChange = useCallback(() => {
    if (groupRef.current) {
      if (transformMode === 'translate') {
        const p = groupRef.current.position;
        if (gridSnap) {
          p.x = Math.round(p.x * 2) / 2; // 0.5m grid
          p.z = Math.round(p.z * 2) / 2;
        }
        onPositionChange(id, [p.x, p.y, p.z]);
      } else {
        const r = groupRef.current.rotation;
        if (gridSnap) {
            // Snap to 15 degrees (PI/12)
            r.y = Math.round(r.y / (Math.PI / 12)) * (Math.PI / 12);
        }
        if (onRotate) onRotate(id); // Using the prop if it takes the ID, though rotation in TransformControls modifies ref directly.
        // We really should pass the exact rotation up:
        // onRotationChange(id, r.y);
      }
    }
  }, [id, gridSnap, transformMode, onPositionChange, onRotate]);

  if (isSelected) {
    return (
      <TransformControls
        mode={transformMode}
        showY={transformMode === 'translate' ? false : true} // Allow Y rotation
        showX={transformMode === 'translate'}
        showZ={transformMode === 'translate'}
        translationSnap={gridSnap ? 0.5 : null}
        rotationSnap={gridSnap ? Math.PI / 12 : null}
        onMouseUp={handleObjectChange}
      >
        <group ref={groupRef} position={defaultPosition} rotation={[0, rotationY, 0]} onClick={handleClick}>
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2, 2.3, 32]} />
            <meshBasicMaterial color={isColliding ? "#ff4d4f" : "#00ff88"} transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
          {children}

          <Html position={[0, 4, 0]} center>
            <div style={{
              display: "flex", gap: 8, background: "rgba(0,0,0,0.8)",
              padding: "4px 8px", borderRadius: 8, pointerEvents: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
            }}>
              <Button type="text" size="small" style={{ color: "#fff" }} icon={<SyncOutlined />} onClick={(e) => { 
                e.stopPropagation(); 
                setTransformMode(transformMode === 'translate' ? 'rotate' : 'translate'); 
              }}>
                {transformMode === 'translate' ? 'Switch to Rotate' : 'Switch to Move'}
              </Button>
              <Button type="text" size="small" style={{ color: "#fff" }} onClick={(e) => { 
                e.stopPropagation(); 
                setGridSnap(!gridSnap); 
              }}>
                {gridSnap ? 'Snap: ON' : 'Snap: OFF'}
              </Button>
              <Button type="text" size="small" danger icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onDelete?.(id); }}>Delete</Button>
            </div>
          </Html>
        </group>
      </TransformControls>
    );
  }

  return (
    <group position={defaultPosition} rotation={[0, rotationY, 0]} onClick={handleClick}>
      {editMode && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 2, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}
      {children}
    </group>
  );
}

export function GlobalClippingPlane({ y, enabled }: { y: number; enabled: boolean }) {
  const { gl } = useThree();
  useEffect(() => {
    if (enabled) {
      const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), y);
      gl.clippingPlanes = [plane];
      gl.localClippingEnabled = true;
    } else {
      gl.clippingPlanes = [];
      gl.localClippingEnabled = false;
    }
    return () => {
      gl.clippingPlanes = [];
      gl.localClippingEnabled = false;
    };
  }, [y, enabled, gl]);
  return null;
}

export function CostScheduleHeatmap({
  mode,
  config,
  progress,
  tasks = [],
}: {
  mode: "cost" | "schedule";
  config: SceneConfig;
  progress: number;
  tasks?: any[];
}) {
  const floors = config.floors ?? 5;
  const fh = config.floorHeight ?? 3.2;
  const bw = config.buildingWidth ?? 14;
  const bd = config.buildingDepth ?? 10;

  const getFloorRisk = useCallback((floor: number): number => {
    const floorTasks = tasks.filter(t => t.tags && t.tags.includes(`bim:floor_${floor}`));
    
    if (floorTasks.length === 0) {
      if (mode === "cost") {
        return Math.min(1, 0.2 + (floor / floors) * 0.7 + Math.sin(floor * 1.3) * 0.1);
      } else {
        const mid = floors / 2;
        const dist = Math.abs(floor - mid) / mid;
        return Math.min(1, 0.15 + (1 - dist) * 0.7 + (progress < 40 ? 0.2 : 0));
      }
    }

    if (mode === "cost") {
      let totalEst = 0;
      let totalLogged = 0;
      floorTasks.forEach(t => {
        totalEst += t.estimatedHours || 0;
        totalLogged += t.loggedHours || 0;
      });
      if (totalEst === 0) return 0.5;
      return Math.min(1, totalLogged / totalEst);
    } else {
      let scheduleRisk = 0;
      floorTasks.forEach(t => {
        if (!t.dueDate) return;
        const due = dayjs(t.dueDate);
        const end = t.endDate ? dayjs(t.endDate) : dayjs();
        if (end.isAfter(due)) {
          scheduleRisk += 0.2;
        }
      });
      return Math.min(1, scheduleRisk + 0.1);
    }
  }, [mode, floors, progress, tasks]);

  const riskToColor = useCallback((risk: number): THREE.Color => {
    if (risk < 0.5) {
      const t = risk * 2;
      return new THREE.Color().setHSL(0.33 - t * 0.17, 0.85, 0.5);
    } else {
      const t = (risk - 0.5) * 2;
      return new THREE.Color().setHSL(0.16 - t * 0.16, 0.9, 0.45);
    }
  }, []);

  const builtFloors = Math.ceil(floors * Math.min(1, progress / 70));

  return (
    <group>
      {Array.from({ length: builtFloors }, (_, i) => {
        const risk = getFloorRisk(i);
        const color = riskToColor(risk);
        const y = 0.4 + i * fh + fh * 0.5;
        return (
          <mesh key={`hm-${i}`} position={[0, y, 0]}>
            <boxGeometry args={[bw * 0.95, fh * 0.85, bd * 0.95]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.18 + risk * 0.15}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function InSceneGantt({ phases, progress, bw }: { phases: ConstructionPhase[], progress: number, bw: number }) {
  const ganttWidth = 20;
  const ganttHeight = phases.length * 0.8;
  
  return (
    <group position={[-bw / 2 - ganttWidth - 4, ganttHeight + 2, 0]}>
      <mesh position={[ganttWidth / 2, -ganttHeight / 2 + 0.5, -0.1]}>
        <planeGeometry args={[ganttWidth + 6, ganttHeight + 3]} />
        <meshBasicMaterial color="#111827" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      
      <Text position={[ganttWidth / 2, 1.5, 0]} fontSize={0.8} color="#ffffff" anchorX="center" outlineWidth={0.02} outlineColor="#000000">
        4D PM Schedule
      </Text>

      {[0, 25, 50, 75, 100].map(pct => (
        <group key={`grid-${pct}`} position={[(pct / 100) * ganttWidth, 0, 0]}>
          <Line points={[[0, 0.5, -0.05], [0, -ganttHeight, -0.05]]} color="#374151" lineWidth={1} />
          <Text position={[0, 0.8, 0]} fontSize={0.3} color="#9ca3af" anchorX="center" anchorY="bottom">
            {pct}%
          </Text>
        </group>
      ))}

      {phases.map((phase, i) => {
        const y = -i * 0.8;
        const startX = (phase.startPercent / 100) * ganttWidth;
        const endX = (phase.endPercent / 100) * ganttWidth;
        const w = Math.max(endX - startX, 0.1);
        const isActive = progress >= phase.startPercent && progress <= phase.endPercent;
        const isDone = progress > phase.endPercent;
        const barColor = isDone ? "#10b981" : isActive ? phase.color : "#4b5563";
        
        return (
          <group key={phase.id}>
            <Text position={[-0.5, y, 0]} fontSize={0.4} color={isActive ? "#ffffff" : "#d1d5db"} anchorX="right" anchorY="middle" outlineWidth={0.01} outlineColor="#000000">
              {phase.shortName}
            </Text>
            <mesh position={[startX + w / 2, y, 0.05]}>
              <boxGeometry args={[w, 0.4, 0.1]} />
              <meshStandardMaterial color={barColor} emissive={isActive ? barColor : "#000000"} emissiveIntensity={isActive ? 0.8 : 0} />
            </mesh>
          </group>
        );
      })}

      <group position={[(progress / 100) * ganttWidth, 0.5, 0.1]}>
        <Line points={[[0, 0, 0], [0, -ganttHeight - 0.5, 0]]} color="#ef4444" lineWidth={2} />
        <mesh position={[0, 0, 0.05]}>
          <circleGeometry args={[0.15, 16]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>
    </group>
  );
}

export function RfiMarker3D({ rfi, position }: { rfi: any; position: [number, number, number] }) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const textRef = useRef<THREE.Group>(null);

  const colorMap: Record<string, string> = { high: "#ef4444", medium: "#f97316", low: "#eab308" };
  const markerColor = colorMap[rfi.priority] ?? "#ef4444";

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1.0 + Math.sin(t * 3) * 0.1;
    if (sphereRef.current) {
      sphereRef.current.scale.setScalar(pulse);
      (sphereRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(t * 4) * 0.4;
    }
    if (ringRef.current) {
      const ripple = (t * 0.8) % 1;
      const ringScale = 0.4 + ripple * 1.2;
      ringRef.current.scale.setScalar(ringScale);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 1.0 - ripple;
    }
    if (textRef.current) {
      textRef.current.position.y = 1.5 + Math.sin(t * 2.5) * 0.08;
    }
  });

  return (
    <group position={position}>
      <mesh ref={sphereRef} position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.28, 24, 24]} />
        <meshStandardMaterial
          color={markerColor}
          emissive={markerColor}
          emissiveIntensity={0.8}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={ringRef} position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.03, 8, 32]} />
        <meshBasicMaterial color={markerColor} transparent opacity={0.6} depthWrite={false} />
      </mesh>

      <group ref={textRef}>
        <Text
          position={[0, 1.5, 0.32]}
          fontSize={0.38}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          !
        </Text>
      </group>
    </group>
  );
}

export function PulsingClashMarker({ clash }: { clash: { id: string; severity: "critical" | "warning" | "info"; phaseA: string; phaseB: string; message: string; clashType?: "sequence" | "resource" | "cost"; position: [number, number, number] } }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const isCritical = clash.severity === "critical";
  const baseColor = clash.clashType === "cost" ? "#3B82F6" : clash.clashType === "resource" ? "#FF8C00" : isCritical ? "#FF0040" : "#FF8C00";

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.8 + Math.sin(t * 5) * 0.25;
    const opacityPulse = 0.4 + Math.sin(t * 3.5) * 0.4;

    if (meshRef.current) {
      meshRef.current.scale.setScalar(pulse);
      meshRef.current.rotation.y = t * 1.5;
      meshRef.current.rotation.x = t * 1.0;
    }
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = opacityPulse;
      glowRef.current.scale.setScalar(pulse * 1.5);
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = Math.PI / 2;
      ring1Ref.current.scale.setScalar(1 + (t % 2) * 1.5);
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - (t % 2));
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = Math.PI / 2;
      ring2Ref.current.scale.setScalar(1 + ((t + 1) % 2) * 1.5);
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - ((t + 1) % 2));
    }
    if (beamRef.current) {
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(t * 2) * 0.15;
    }
  });

  return (
    <group position={clash.position}>
      {/* Core Octahedron */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[1.2, 0]} />
        <meshBasicMaterial color={baseColor} wireframe opacity={0.9} transparent />
      </mesh>
      
      {/* Glow Sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshBasicMaterial color={baseColor} opacity={0.3} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Radar Rings */}
      <mesh ref={ring1Ref}>
        <ringGeometry args={[1.8, 2.0, 32]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ring2Ref}>
        <ringGeometry args={[1.8, 2.0, 32]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Vertical Beam */}
      <mesh ref={beamRef} position={[0, 5, 0]}>
        <cylinderGeometry args={[0.05, 0.6, 10, 16, 1, true]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.25} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* HTML Label */}
      <Html position={[0, 2.5, 0]} center distanceFactor={12} zIndexRange={[100, 0]}>
        <div style={{
          background: isCritical ? "rgba(220, 38, 38, 0.85)" : "rgba(234, 88, 12, 0.85)",
          color: "white",
          padding: "8px 14px",
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          boxShadow: `0 8px 32px ${isCritical ? "rgba(255, 0, 64, 0.4)" : "rgba(255, 140, 0, 0.4)"}`,
          border: `1px solid ${isCritical ? "rgba(255,120,120,0.5)" : "rgba(255,200,100,0.5)"}`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          transform: "translateY(0px)",
          transition: "transform 0.2s",
        }}>
          <span style={{ fontSize: 16 }}>{isCritical ? "⚠️" : "⚡"}</span>
          <span>{clash.message}</span>
        </div>
      </Html>
    </group>
  );
}

export function ProgressLabel3D({ progress }: { progress: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.position.y = 8 + Math.sin(t * 2) * 0.5;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <Html position={[0, 0, 0]} center distanceFactor={25}>
          <div style={{
            background: "rgba(16, 185, 129, 0.9)",
            color: "white",
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "16px",
            fontWeight: "bold",
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
            border: "2px solid rgba(255,255,255,0.4)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span>🏆</span>
            <span>{Math.round(progress)}% Completed</span>
          </div>
        </Html>
      </mesh>
    </group>
  );
}

export function MeasurementRenderer({ points }: { points: [number, number, number][] }) {
  if (points.length < 2) return null;

  return (
    <group>
      <Line points={points} color="#3b82f6" lineWidth={3} depthTest={false} />
      {points.map((p, i) => {
        if (i === 0) return null;
        const prev = new THREE.Vector3(...points[i - 1]);
        const curr = new THREE.Vector3(...p);
        const dist = prev.distanceTo(curr);
        const midPoint = prev.lerp(curr, 0.5);

        return (
          <Html key={`dist-${i}`} position={[midPoint.x, midPoint.y + 0.5, midPoint.z]} center>
            <div style={{
              background: "rgba(0,0,0,0.8)",
              color: "#3b82f6",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "bold",
              pointerEvents: "none",
              border: "1px solid #3b82f6"
            }}>
              {dist.toFixed(1)}m
            </div>
          </Html>
        );
      })}
    </group>
  );
}
