import React, { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';

interface DraggableModelProps {
  id: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  editMode: boolean;
  transformMode?: 'translate' | 'rotate' | 'scale';
  selectedId: string | null;
  onSelect: (id: string) => void;
  onTransformChange?: (id: string, type: 'position' | 'rotation' | 'scale', value: [number, number, number]) => void;
  onPositionChange?: (id: string, position: [number, number, number]) => void; // Keep for backward compatibility
  snapToGrid?: boolean;
  gridSize?: number;
  children: React.ReactNode;
}

export default function DraggableModel({
  id,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  editMode,
  transformMode = 'translate',
  selectedId,
  onSelect,
  onTransformChange,
  onPositionChange,
  snapToGrid = false,
  gridSize = 0.5,
  children
}: DraggableModelProps) {
  const ref = useRef<THREE.Group>(null);
  const transformRef = useRef<any>(null);
  const isSelected = editMode && selectedId === id;

  // When dragging stops, notify parent of new position/rotation/scale
  useEffect(() => {
    if (transformRef.current) {
      const controls = transformRef.current;
      const callback = (event: any) => {
        if (!event.value && ref.current) {
          // Dragging finished (event.value is true during drag, false on end)
          const p = ref.current.position;
          const r = ref.current.rotation;
          const s = ref.current.scale;
          
          if (onTransformChange) {
             if (transformMode === 'translate') onTransformChange(id, 'position', [p.x, p.y, p.z]);
             if (transformMode === 'rotate') onTransformChange(id, 'rotation', [r.x, r.y, r.z]);
             if (transformMode === 'scale') onTransformChange(id, 'scale', [s.x, s.y, s.z]);
          } else if (onPositionChange && transformMode === 'translate') {
             onPositionChange(id, [p.x, p.y, p.z]);
          }
        }
      };
      controls.addEventListener('dragging-changed', callback);
      return () => controls.removeEventListener('dragging-changed', callback);
    }
  }, [id, onPositionChange, onTransformChange, isSelected, transformMode]);

  return (
    <group>
      <group
        ref={ref}
        position={position}
        rotation={rotation}
        scale={scale}
        onClick={(e) => {
          if (editMode) {
            e.stopPropagation();
            onSelect(id);
          }
        }}
        onPointerOver={(e) => {
          if (editMode) {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={(e) => {
          if (editMode) {
            document.body.style.cursor = 'default';
          }
        }}
      >
        {children}
        
        {/* Selection Highlight */}
        {isSelected && (
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.05, 1.05, 1.05]} />
            <meshBasicMaterial color="#0ea5e9" wireframe />
          </mesh>
        )}
      </group>

      {/* Attach TransformControls if selected */}
      {isSelected && (
        <TransformControls 
          ref={transformRef}
          object={ref as any} 
          mode={transformMode} 
          size={0.6}
          translationSnap={snapToGrid ? gridSize : null}
          rotationSnap={snapToGrid ? Math.PI / 2 : null}
        />
      )}
    </group>
  );
}
