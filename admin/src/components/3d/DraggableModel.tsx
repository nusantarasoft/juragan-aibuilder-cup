import React, { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';

interface DraggableModelProps {
  id: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  editMode: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPositionChange: (id: string, position: [number, number, number]) => void;
  children: React.ReactNode;
}

export default function DraggableModel({
  id,
  position,
  rotation = [0, 0, 0],
  editMode,
  selectedId,
  onSelect,
  onPositionChange,
  children
}: DraggableModelProps) {
  const ref = useRef<THREE.Group>(null);
  const transformRef = useRef<any>(null);
  const isSelected = editMode && selectedId === id;

  // When dragging stops, notify parent of new position
  useEffect(() => {
    if (transformRef.current) {
      const controls = transformRef.current;
      const callback = (event: any) => {
        if (!event.value && ref.current) {
          // Dragging finished (event.value is true during drag, false on end)
          const p = ref.current.position;
          onPositionChange(id, [p.x, p.y, p.z]);
        }
      };
      controls.addEventListener('dragging-changed', callback);
      return () => controls.removeEventListener('dragging-changed', callback);
    }
  }, [id, onPositionChange, isSelected]);

  return (
    <group>
      <group
        ref={ref}
        position={position}
        rotation={rotation}
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
          mode="translate" 
          size={0.6}
        />
      )}
    </group>
  );
}
