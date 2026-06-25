import React, { useState, useMemo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Line, Box, Cylinder, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

type DrawingMode = 'none' | 'wall' | 'fence' | 'floor' | 'column' | 'roof' | 'pipe' | 'road' | 'path' | 'water' | 'grass';
type DrawnLineType = { id: string; type: string; points: [number, number, number][], color?: string, material?: string, height?: number, phase?: number, cost?: number, manufacturer?: string, weight?: string };

const DRAW_COLORS: Record<string, string> = {
  wall: '#aaaaaa',
  fence: '#eab308',
  floor: '#60a5fa',
  column: '#f97316',
  roof: '#ef4444',
  pipe: '#22d3ee',
  road: '#555555',
  path: '#a0824a',
  water: '#3b82f6',
  grass: '#22c55e',
};

export function CADDrawingTool({
  drawingMode,
  drawnLines,
  currentLine,
  setCurrentLine,
  setDrawnLines,
  onSelectLine,
  snapToGrid = false,
  snapSize = 1.0,
}: {
  drawingMode: DrawingMode | string;
  drawnLines: DrawnLineType[];
  currentLine: [number, number, number][];
  setCurrentLine: (pts: [number, number, number][]) => void;
  setDrawnLines: (lines: any) => void;
  onSelectLine?: (id: string) => void;
  snapToGrid?: boolean;
  snapSize?: number;
}) {
  const [mousePos, setMousePos] = useState<[number, number, number] | null>(null);

  const handlePointerMove = (e: any) => {
    if (drawingMode === 'none') return;
    const { point } = e;
    let x = point.x;
    let z = point.z;
    
    // Grid Snapping
    if (snapToGrid) {
      x = Math.round(point.x / snapSize) * snapSize;
      z = Math.round(point.z / snapSize) * snapSize;
    }

    // Vertex Snapping
    let snapped = false;
    for (const line of drawnLines) {
      for (const pt of line.points) {
        const dist = Math.sqrt(Math.pow(pt[0] - point.x, 2) + Math.pow(pt[2] - point.z, 2));
        if (dist < 0.8) {
          x = pt[0];
          z = pt[2];
          snapped = true;
          break;
        }
      }
      if (snapped) break;
    }
    
    // Also snap to current line points
    if (!snapped && currentLine.length > 0) {
      const pt = currentLine[0];
      const dist = Math.sqrt(Math.pow(pt[0] - point.x, 2) + Math.pow(pt[2] - point.z, 2));
      if (dist < 0.8) {
        x = pt[0];
        z = pt[2];
      }
    }

    setMousePos([x, 0.05, z]);
  };

  const handleClick = (e: any) => {
    if (drawingMode === 'none') return;
    e.stopPropagation();
    if (!mousePos) return;

    // Column mode: single click places a column immediately
    if (drawingMode === 'column') {
      setDrawnLines([
        ...drawnLines,
        { id: `drawn-${Date.now()}`, type: 'column', points: [mousePos] },
      ]);
      return;
    }

    setCurrentLine([...currentLine, mousePos]);
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

  const [typedLength, setTypedLength] = useState<string>("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (drawingMode === 'none' || currentLine.length === 0) {
        setTypedLength("");
        return;
      }
      
      if (e.key >= '0' && e.key <= '9' || e.key === '.') {
        setTypedLength(prev => prev + e.key);
      } else if (e.key === 'Backspace') {
        setTypedLength(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter' && typedLength.length > 0) {
        // Calculate exact point
        const length = parseFloat(typedLength);
        if (!isNaN(length) && mousePos) {
          const lastPt = currentLine[currentLine.length - 1];
          const dir = new THREE.Vector3(mousePos[0] - lastPt[0], 0, mousePos[2] - lastPt[2]).normalize();
          const newPt: [number, number, number] = [
            lastPt[0] + dir.x * length,
            0.05,
            lastPt[2] + dir.z * length
          ];
          setCurrentLine([...currentLine, newPt]);
          setMousePos(newPt);
        }
        setTypedLength("");
      } else if (e.key === 'Escape') {
        setTypedLength("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawingMode, currentLine, mousePos, typedLength, setCurrentLine]);

  const lineColor = DRAW_COLORS[drawingMode] || '#ffffff';

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
          {/* Guide line for multi-point types */}
          {line.points.length > 1 && (
            <Line
              points={line.points}
              color={line.color || DRAW_COLORS[line.type] || '#ffffff'}
              lineWidth={line.type === 'wall' ? 10 : 3}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectLine) onSelectLine(line.id);
              }}
            />
          )}

          {/* Wall extrusion */}
          {line.type === 'wall' && line.points.map((pt, i) => {
            if (i === 0) return null;
            const prev = line.points[i - 1];
            const dist = new THREE.Vector3(...pt).distanceTo(new THREE.Vector3(...prev));
            const angle = Math.atan2(prev[2] - pt[2], prev[0] - pt[0]);
            const wallH = line.height ?? 3;
            return (
              <Box 
                key={`${line.id}-seg-${i}`} 
                args={[dist, wallH, 0.4]} 
                position={[(pt[0] + prev[0]) / 2, wallH / 2, (pt[2] + prev[2]) / 2]} 
                rotation={[0, -angle, 0]}
                onClick={(e) => { e.stopPropagation(); if (onSelectLine) onSelectLine(line.id); }}
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

          {/* Floor / Water / Grass slab extrusion */}
          {['floor', 'water', 'grass'].includes(line.type) && line.points.length > 2 && (() => {
            const shape = new THREE.Shape();
            shape.moveTo(line.points[0][0], line.points[0][2]);
            for (let i = 1; i < line.points.length; i++) {
              shape.lineTo(line.points[i][0], line.points[i][2]);
            }
            shape.closePath();
            
            let color = line.color;
            let roughness = 0.9;
            let metalness = 0.1;
            let transparent = false;
            let opacity = 1.0;
            let yPos = 0.15;
            
            if (line.type === 'water') {
              color = color || "#3b82f6";
              roughness = 0.1;
              metalness = 0.8;
              transparent = true;
              opacity = 0.7;
              yPos = 0.05;
            } else if (line.type === 'grass') {
              color = color || "#22c55e";
              roughness = 1.0;
              yPos = 0.08;
            } else {
              color = color || "#94a3b8";
            }

            return (
              <mesh 
                key={`${line.id}-${line.type}`} 
                rotation={[-Math.PI / 2, 0, 0]} 
                position={[0, yPos, 0]}
                onClick={(e) => { e.stopPropagation(); if (onSelectLine) onSelectLine(line.id); }}
              >
                <extrudeGeometry args={[shape, { depth: line.height ?? 0.2, bevelEnabled: false }]} />
                <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} transparent={transparent} opacity={opacity} />
              </mesh>
            );
          })()}

          {/* Column placement */}
          {line.type === 'column' && line.points.map((pt, i) => (
            <Cylinder
              key={`${line.id}-col-${i}`}
              args={[0.3, 0.3, 3.2, 16]}
              position={[pt[0], 1.6, pt[2]]}
              onClick={(e) => { e.stopPropagation(); if (onSelectLine) onSelectLine(line.id); }}
            >
              <meshStandardMaterial color={line.color || "#d4d4d8"} roughness={0.6} metalness={0.2} />
            </Cylinder>
          ))}

          {/* Roof surface */}
          {line.type === 'roof' && line.points.length > 2 && (() => {
            const shape = new THREE.Shape();
            shape.moveTo(line.points[0][0], line.points[0][2]);
            for (let i = 1; i < line.points.length; i++) {
              shape.lineTo(line.points[i][0], line.points[i][2]);
            }
            shape.closePath();
            return (
              <mesh 
                key={`${line.id}-roof`} 
                rotation={[-Math.PI / 2, 0, 0]} 
                position={[0, (line.height ?? 9) + 0.5, 0]}
                onClick={(e) => { e.stopPropagation(); if (onSelectLine) onSelectLine(line.id); }}
              >
                <extrudeGeometry args={[shape, { depth: 0.5, bevelEnabled: false }]} />
                <meshStandardMaterial color={line.color || "#b91c1c"} roughness={0.7} />
              </mesh>
            );
          })()}

          {/* Pipe segments */}
          {line.type === 'pipe' && line.points.map((pt, i) => {
            if (i === 0) return null;
            const prev = line.points[i - 1];
            const dist = new THREE.Vector3(...pt).distanceTo(new THREE.Vector3(...prev));
            const midX = (pt[0] + prev[0]) / 2;
            const midY = 1.5;
            const midZ = (pt[2] + prev[2]) / 2;
            const angle = Math.atan2(prev[2] - pt[2], prev[0] - pt[0]);
            return (
              <group key={`${line.id}-pipe-${i}`}>
                <mesh position={[midX, midY, midZ]} rotation={[0, -angle, Math.PI / 2]}>
                  <cylinderGeometry args={[0.1, 0.1, dist, 12]} />
                  <meshStandardMaterial color={line.color || "#22d3ee"} roughness={0.3} metalness={0.6} />
                </mesh>
                {/* Joint spheres */}
                <mesh position={[pt[0], midY, pt[2]]}>
                  <sphereGeometry args={[0.15, 8, 8]} />
                  <meshStandardMaterial color={line.color || "#0891b2"} metalness={0.5} roughness={0.3} />
                </mesh>
              </group>
            );
          })}

          {/* Road segments */}
          {line.type === 'road' && line.points.map((pt, i) => {
            if (i === 0) return null;
            const prev = line.points[i - 1];
            const dist = new THREE.Vector3(...pt).distanceTo(new THREE.Vector3(...prev));
            const angle = Math.atan2(prev[2] - pt[2], prev[0] - pt[0]);
            return (
              <Box 
                key={`${line.id}-road-${i}`} 
                args={[dist, 0.08, 3]} 
                position={[(pt[0] + prev[0]) / 2, 0.04, (pt[2] + prev[2]) / 2]} 
                rotation={[0, -angle, 0]}
                onClick={(e) => { e.stopPropagation(); if (onSelectLine) onSelectLine(line.id); }}
              >
                <meshStandardMaterial color={line.color || "#444444"} roughness={0.95} />
              </Box>
            );
          })}

          {/* Path segments */}
          {line.type === 'path' && line.points.map((pt, i) => {
            if (i === 0) return null;
            const prev = line.points[i - 1];
            const dist = new THREE.Vector3(...pt).distanceTo(new THREE.Vector3(...prev));
            const angle = Math.atan2(prev[2] - pt[2], prev[0] - pt[0]);
            return (
              <Box 
                key={`${line.id}-path-${i}`} 
                args={[dist, 0.05, 1.2]} 
                position={[(pt[0] + prev[0]) / 2, 0.025, (pt[2] + prev[2]) / 2]} 
                rotation={[0, -angle, 0]}
                onClick={(e) => { e.stopPropagation(); if (onSelectLine) onSelectLine(line.id); }}
              >
                <meshStandardMaterial color={line.color || "#8B7355"} roughness={1} />
              </Box>
            );
          })}
          {/* Measure segments */}
          {line.type === 'measure' && line.points.map((pt, i) => {
            if (i === 0) return null;
            const prev = line.points[i - 1];
            const dist = new THREE.Vector3(...pt).distanceTo(new THREE.Vector3(...prev));
            const midX = (pt[0] + prev[0]) / 2;
            const midZ = (pt[2] + prev[2]) / 2;
            return (
              <group key={`${line.id}-measure-${i}`}>
                <Line points={[prev, pt]} color="#ef4444" lineWidth={3} dashed dashScale={10} dashSize={0.5} gapSize={0.5} />
                <Html position={[midX, 1, midZ]} center style={{ pointerEvents: 'none' }}>
                  <div style={{ background: "rgba(239, 68, 68, 0.9)", color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 12, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                    {dist.toFixed(2)}m
                  </div>
                </Html>
              </group>
            );
          })}
        </group>
      ))}

      {/* Render current line being drawn */}
      {currentLine.length > 0 && mousePos && (
        <group>
          <Line
            points={[...currentLine, mousePos]}
            color={lineColor}
            lineWidth={3}
            dashed
          />
          {/* Live Measurement */}
          {(() => {
            const lastPoint = currentLine[currentLine.length - 1];
            const dist = new THREE.Vector3(...lastPoint).distanceTo(new THREE.Vector3(...mousePos));
            const midX = (lastPoint[0] + mousePos[0]) / 2;
            const midZ = (lastPoint[2] + mousePos[2]) / 2;
            return (
              <Html position={[midX, 1, midZ]} center style={{ pointerEvents: 'none' }}>
                <div style={{ background: "rgba(239, 68, 68, 0.9)", color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 12, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                  {dist.toFixed(2)}m
                </div>
              </Html>
            );
          })()}
        </group>
      )}
      
      {/* Typed Length HUD */}
      {typedLength && mousePos && (
        <Html position={[mousePos[0], 2, mousePos[2]]} center style={{ pointerEvents: 'none' }}>
          <div style={{ background: "#22c55e", color: "white", padding: "4px 8px", borderRadius: 4, fontSize: 14, fontWeight: 700, boxShadow: "0 4px 12px rgba(0,0,0,0.4)", border: "2px solid white" }}>
            L: {typedLength} m
          </div>
        </Html>
      )}

      {/* Snap indicator */}
      {drawingMode !== 'none' && mousePos && (
        <mesh position={mousePos} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.4, 16]} />
          <meshBasicMaterial color={lineColor} />
        </mesh>
      )}
    </group>
  );
}
