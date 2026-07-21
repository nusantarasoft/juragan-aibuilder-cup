import React, { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TerrainSystemProps {
  terrainMap: number[];
  setTerrainMap: React.Dispatch<React.SetStateAction<number[]>>;
  editMode: boolean;
  brushMode: 'none' | 'raise' | 'lower' | 'flatten';
  brushSize: number;
  brushStrength: number;
}

export function TerrainSystem({
  terrainMap,
  setTerrainMap,
  editMode,
  brushMode,
  brushSize,
  brushStrength
}: TerrainSystemProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const gridSegments = 100;
  const terrainSize = 200;

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(terrainSize, terrainSize, gridSegments - 1, gridSegments - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (terrainMap[i] !== undefined) {
        pos.setY(i, terrainMap[i]);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }, [terrainMap]);

  const [isPointerDown, setIsPointerDown] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<THREE.Vector3 | null>(null);

  const applyBrush = useCallback((center: THREE.Vector3) => {
    if (brushMode === 'none') return;
    
    setTerrainMap(prev => {
      const newMap = [...prev];
      const pos = geometry.attributes.position;
      let changed = false;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const dist = Math.sqrt(Math.pow(x - center.x, 2) + Math.pow(z - center.z, 2));

        if (dist <= brushSize) {
          // Soft brush falloff
          const falloff = 1 - (dist / brushSize);
          const effect = brushStrength * falloff;
          
          if (brushMode === 'raise') {
            newMap[i] = (newMap[i] || 0) + effect;
            changed = true;
          } else if (brushMode === 'lower') {
            newMap[i] = (newMap[i] || 0) - effect;
            changed = true;
          } else if (brushMode === 'flatten') {
            // Flatten towards a specific height, let's say 0
            newMap[i] = (newMap[i] || 0) * (1 - effect * 0.5);
            changed = true;
          }
        }
      }
      return changed ? newMap : prev;
    });
  }, [brushMode, brushSize, brushStrength, geometry, setTerrainMap]);

  useFrame(() => {
    if (isPointerDown && hoveredPoint && brushMode !== 'none') {
      applyBrush(hoveredPoint);
    }
  });

  const handlePointerMove = (e: any) => {
    if (!editMode || brushMode === 'none') return;
    e.stopPropagation();
    setHoveredPoint(e.point);
  };

  const handlePointerDown = (e: any) => {
    if (!editMode || brushMode === 'none') return;
    // For PC, left click is 0. If rotating camera, it's right click (2).
    if (e.button !== 0) return;
    e.stopPropagation();
    setIsPointerDown(true);
    setHoveredPoint(e.point);
  };

  const handlePointerUp = () => {
    setIsPointerDown(false);
  };

  return (
    <group>
      <mesh 
        ref={meshRef} 
        geometry={geometry} 
        onPointerMove={handlePointerMove} 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerUp}
      >
        <meshStandardMaterial 
          color="#3f6212" 
          roughness={0.9} 
          metalness={0.0} 
          side={THREE.DoubleSide} 
          flatShading
        />
      </mesh>
      
      {/* Brush cursor visualization */}
      {editMode && brushMode !== 'none' && hoveredPoint && (
        <mesh position={[hoveredPoint.x, hoveredPoint.y + 0.1, hoveredPoint.z]} rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[brushSize * 0.9, brushSize, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
