import React, { useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Line, Box } from '@react-three/drei';
import * as THREE from 'three';

export function CADDrawingTool({
  drawingMode,
  drawnLines,
  currentLine,
  setCurrentLine,
  setDrawnLines,
}: {
  drawingMode: 'none' | 'wall' | 'fence';
  drawnLines: { id: string; type: 'wall' | 'fence' | string; points: [number, number, number][], color?: string, material?: string }[];
  currentLine: [number, number, number][];
  setCurrentLine: (pts: [number, number, number][]) => void;
  setDrawnLines: (lines: any) => void;
  onSelectLine?: (id: string) => void;
}) {
  const [mousePos, setMousePos] = useState<[number, number, number] | null>(null);

  const handlePointerMove = (e: any) => {
    if (drawingMode === 'none') return;
    const { point } = e;
    // Snap to grid (1 meter snap)
    const snap = 1;
    const x = Math.round(point.x / snap) * snap;
    const z = Math.round(point.z / snap) * snap;
    setMousePos([x, 0.05, z]);
  };

  const handleClick = (e: any) => {
    if (drawingMode === 'none') return;
    e.stopPropagation();
    if (mousePos) {
      setCurrentLine([...currentLine, mousePos]);
    }
  };

  const handleContextMenu = (e: any) => {
    if (drawingMode === 'none') return;
    e.stopPropagation();
    if (currentLine.length > 1) {
      setDrawnLines([
        ...drawnLines,
        { id: `drawn-${Date.now()}`, type: drawingMode, points: currentLine },
      ]);
    }
    setCurrentLine([]);
  };

  return (
    <group>
      {/* Invisible catching plane */}
      {drawingMode !== 'none' && (
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, 0, 0]} 
          onPointerMove={handlePointerMove}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        >
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}

      {/* Render existing drawn lines */}
      {drawnLines.map((line) => (
        <group key={line.id}>
          {line.points.length > 1 && (
            <Line
              points={line.points}
              color={line.color || (line.type === 'wall' ? '#aaaaaa' : '#eab308')}
              lineWidth={line.type === 'wall' ? 10 : 3}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectLine) onSelectLine(line.id);
              }}
            />
          )}
          {/* If wall, render extruded shape */}
          {line.type === 'wall' && line.points.map((pt, i) => {
            if (i === 0) return null;
            const prev = line.points[i - 1];
            const dist = new THREE.Vector3(...pt).distanceTo(new THREE.Vector3(...prev));
            const angle = Math.atan2(prev[2] - pt[2], prev[0] - pt[0]);
            return (
              <Box 
                key={`${line.id}-seg-${i}`} 
                args={[dist, 3, 0.4]} 
                position={[(pt[0] + prev[0]) / 2, 1.5, (pt[2] + prev[2]) / 2]} 
                rotation={[0, -angle, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectLine) onSelectLine(line.id);
                }}
              >
                <meshStandardMaterial 
                  color={line.color || "#eeeeee"} 
                  roughness={line.material === 'glass' ? 0.1 : (line.material === 'steel' ? 0.2 : 0.8)}
                  metalness={line.material === 'steel' ? 0.8 : 0.1}
                  transparent={line.material === 'glass'}
                  opacity={line.material === 'glass' ? 0.5 : 1}
                />
              </Box>
            );
          })}
        </group>
      ))}

      {/* Render current line being drawn */}
      {currentLine.length > 0 && mousePos && (
        <Line
          points={[...currentLine, mousePos]}
          color={drawingMode === 'wall' ? '#aaaaaa' : '#eab308'}
          lineWidth={3}
          dashed
        />
      )}
      
      {/* Snap indicator */}
      {drawingMode !== 'none' && mousePos && (
        <mesh position={mousePos} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.4, 16]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
      )}
    </group>
  );
}
