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
  onDoubleClick?: (id: string) => void;
  onTransformChange?: (id: string, type: 'position' | 'rotation' | 'scale', value: [number, number, number]) => void;
  onPositionChange?: (id: string, position: [number, number, number]) => void;
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
  onDoubleClick,
  onTransformChange,
  onPositionChange,
  snapToGrid = false,
  gridSize = 0.5,
  children
}: DraggableModelProps) {
  const ref = useRef<THREE.Group>(null);
  const transformRef = useRef<any>(null);
  const isSelected = editMode && selectedId === id;

  useEffect(() => {
    if (transformRef.current) {
      const controls = transformRef.current;
      const callback = (event: any) => {
        if (!event.value && ref.current) {
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
          e.stopPropagation();
          onSelect(id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (onDoubleClick) onDoubleClick(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        {children}

        {isSelected && (
          <mesh scale={[1.02, 1.02, 1.02]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial
              color="#0ea5e9"
              wireframe
              wireframeLinewidth={2}
              transparent
              opacity={0.4}
            />
          </mesh>
        )}
      </group>

      {isSelected && editMode && (
        <TransformControls
          ref={transformRef}
          object={ref as any}
          mode={transformMode}
          size={0.6}
          translationSnap={snapToGrid ? gridSize : null}
          rotationSnap={snapToGrid ? Math.PI / 2 : null}
          scaleSnap={snapToGrid ? gridSize : null}
        />
      )}
    </group>
  );
}
