"use client";
import React, { useRef, useState, Suspense, useCallback, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import type { PlacedObject, PlacedObjectType, BuilderPaletteItem, BinOccupancy, RackInventory, ZoneInventory } from "./builderState";
import { GRID_SIZE, gridCoordsLabel } from "./builderState";
import type { Route, PathNode, GridCell } from "./pathfinding";
import { buildGrid } from "./pathfinding";

const ZONE_COLORS: Record<string, string> = {
    receiving: '#22c55e', storage: '#3b82f6', picking: '#f59e0b',
    packing: '#a855f7', shipping: '#06b6d4', cold: '#6366f1', quarantine: '#ef4444',
};

// ═══════════════════════════════════════════════════
// 3D OBJECTS
// ═══════════════════════════════════════════════════

function ZoneObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const color = obj.color || ZONE_COLORS[obj.zoneType || 'storage'] || '#3b82f6';
    // Seeded random for consistent zone cargo
    const seed = Math.abs(Math.sin(obj.x * 73.1 + obj.z * 197.3 + (obj.width || 1) * 43) * 43758.5453) % 1;
    const zoneArea = (obj.width || 1) * (obj.depth || 1);
    const cargoCount = ghost ? 0 : Math.min(Math.floor(zoneArea * (0.3 + seed * 0.4)), 12);
    const crateColors = ['#8B6914', '#a0784c', '#5a7050', '#6b8cae', '#7a7a7a', '#b8a070'];
    return (
        <group position={[obj.x, 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[obj.width / 2, 0.01, obj.depth / 2]} receiveShadow>
                <planeGeometry args={[obj.width, obj.depth]} />
                <meshStandardMaterial color={color} transparent opacity={ghost ? 0.3 : selected ? 0.35 : 0.15} />
            </mesh>
            {/* Border tape */}
            {[[obj.width / 2, 0, 0, obj.width, 0.06], [obj.width / 2, 0, obj.depth, obj.width, 0.06],
              [0, 0, obj.depth / 2, 0.06, obj.depth], [obj.width, 0, obj.depth / 2, 0.06, obj.depth],
            ].map(([x, _y, z, w, d], i) => (
                <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, z]}>
                    <planeGeometry args={[w, d]} />
                    <meshStandardMaterial color={color} transparent opacity={ghost ? 0.4 : selected ? 0.8 : 0.5} emissive={selected ? color : '#000'} emissiveIntensity={selected ? 0.3 : 0} />
                </mesh>
            ))}
            {/* Scattered cargo inside zone */}
            {cargoCount > 0 && Array.from({ length: cargoCount }, (_, ci) => {
                const cSeed = Math.abs(Math.sin(seed * 1000 + ci * 37.3)) % 1;
                const cSeed2 = Math.abs(Math.sin(seed * 2000 + ci * 51.1)) % 1;
                const cx = 0.4 + cSeed * ((obj.width || 1) - 0.8);
                const cz = 0.4 + cSeed2 * ((obj.depth || 1) - 0.8);
                const cColor = crateColors[Math.floor(cSeed * crateColors.length)];
                const ch = 0.12 + cSeed2 * 0.2;
                const cw = 0.18 + cSeed * 0.15;
                const cd = 0.18 + cSeed2 * 0.12;
                const isStacked = cSeed > 0.6;
                return (
                    <group key={`zc${ci}`}>
                        <mesh position={[cx, ch / 2 + 0.01, cz]}>
                            <boxGeometry args={[cw, ch, cd]} />
                            <meshStandardMaterial color={cColor} roughness={0.9} />
                        </mesh>
                        {isStacked && (
                            <mesh position={[cx, ch + 0.06, cz]}>
                                <boxGeometry args={[cw * 0.85, ch * 0.7, cd * 0.85]} />
                                <meshStandardMaterial color={crateColors[Math.floor(cSeed2 * crateColors.length)]} roughness={0.9} />
                            </mesh>
                        )}
                    </group>
                );
            })}
            {/* Sign post */}
            {!ghost && (
                <group position={[obj.width / 2, 0, -0.15]}>
                    <mesh position={[0, 0.6, 0]}><boxGeometry args={[0.04, 1.2, 0.04]} /><meshStandardMaterial color="#888" metalness={0.5} /></mesh>
                    <mesh position={[0, 1.25, 0]}><boxGeometry args={[Math.min(obj.width, 1.5), 0.35, 0.03]} /><meshStandardMaterial color={color} /></mesh>
                    <Html position={[0, 1.25, 0.02]} center style={{ pointerEvents: 'none' }} distanceFactor={12}>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: 11, fontFamily: 'system-ui', textShadow: '0 1px 3px rgba(0,0,0,0.6)', whiteSpace: 'nowrap' }}>
                            {obj.label || obj.zoneType || 'Zone'}
                        </div>
                    </Html>
                </group>
            )}
        </group>
    );
}

function RackObject({ obj, selected, ghost, rackInventory, highlightBin, onShelfClick }: {
    obj: PlacedObject; selected: boolean; ghost?: boolean;
    rackInventory?: RackInventory; highlightBin?: string;
    onShelfClick?: (obj: PlacedObject, level: number, bin?: BinOccupancy) => void;
}) {
    const levels = obj.rackLevels || 3;
    const h = levels * 0.42 + 0.1;
    const uprightColor = '#4466aa';
    const beamColor = '#e87722';
    const hasData = rackInventory && rackInventory.bins.length > 0;
    // Seeded pseudo-random for fallback decorative cargo
    const seed = Math.abs(Math.sin(obj.x * 127.1 + obj.z * 311.7) * 43758.5453) % 1;
    const boxColors = ['#8B6914', '#a0784c', '#6b8cae', '#7a7a7a', '#9c7c38', '#5a7d5a'];

    const getShelfCargoColor = (bin: BinOccupancy) => {
        if (!bin.isOccupied || bin.currentItemCount === 0) return null; // empty
        const maxItems = bin.maxWeight || 20;
        const pct = (bin.currentItemCount / maxItems) * 100;
        if (pct > 80) return '#ef4444'; // red - nearly full
        if (pct > 50) return '#f59e0b'; // amber - half full
        return '#22c55e'; // green - light
    };

    return (
        <group position={[obj.x, 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Uprights */}
            {[[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]].map(([px, pz], i) => (
                <mesh key={i} position={[px + 0.5, h / 2, pz + 0.5]}><boxGeometry args={[0.03, h, 0.03]} /><meshStandardMaterial color={uprightColor} metalness={0.6} roughness={0.3} transparent={ghost} opacity={ghost ? 0.4 : 1} /></mesh>
            ))}
            {/* Beams + shelves + cargo */}
            {Array.from({ length: levels + 1 }, (_, l) => {
                const y = l * 0.42 + 0.05;
                const bin = hasData ? rackInventory.bins.find(b => b.level === l) : undefined;
                const isHighlighted = bin && highlightBin && bin.binCode === highlightBin;

                // Data-driven cargo
                let cargoElement = null;
                if (l < levels && !ghost) {
                    if (hasData && bin) {
                        const cargoColor = getShelfCargoColor(bin);
                        if (cargoColor) {
                            const fillPct = Math.min(bin.currentItemCount / (bin.maxWeight || 20), 1);
                            const bw = 0.12 + fillPct * 0.2;
                            const bh = 0.06 + fillPct * 0.14;
                            cargoElement = (
                                <mesh position={[0.5, y + 0.02 + bh / 2 + 0.005, 0.5]}
                                    onClick={(e) => { e.stopPropagation(); onShelfClick?.(obj, l, bin); }}>
                                    <boxGeometry args={[bw, bh, 0.22]} />
                                    <meshStandardMaterial color={cargoColor} roughness={0.7}
                                        emissive={isHighlighted ? cargoColor : '#000'}
                                        emissiveIntensity={isHighlighted ? 0.5 : 0} />
                                </mesh>
                            );
                        }
                    } else {
                        // Fallback: decorative random boxes
                        const shelfSeed = Math.abs(Math.sin(seed * 1000 + l * 73.7)) % 1;
                        if (shelfSeed > 0.15) {
                            const numBoxes = shelfSeed > 0.7 ? 3 : shelfSeed > 0.4 ? 2 : 1;
                            cargoElement = (
                                <group>
                                    {Array.from({ length: numBoxes }, (_, bi) => {
                                        const bSeed = Math.abs(Math.sin(seed * 500 + l * 31 + bi * 17)) % 1;
                                        const bColor = boxColors[Math.floor(bSeed * boxColors.length)];
                                        const bh = 0.08 + bSeed * 0.12;
                                        const bw = numBoxes === 1 ? 0.28 : numBoxes === 2 ? 0.16 : 0.11;
                                        const xOff = numBoxes === 1 ? 0 : numBoxes === 2 ? (bi - 0.5) * 0.18 : (bi - 1) * 0.13;
                                        return (
                                            <mesh key={`c${bi}`} position={[0.5 + xOff, y + 0.02 + bh / 2 + 0.005, 0.5]}>
                                                <boxGeometry args={[bw, bh, 0.22]} />
                                                <meshStandardMaterial color={bColor} roughness={0.85} />
                                            </mesh>
                                        );
                                    })}
                                </group>
                            );
                        }
                    }
                }

                return (
                    <group key={l}>
                        {[-0.18, 0.18].map((pz, bi) => (
                            <mesh key={bi} position={[0.5, y, pz + 0.5]}><boxGeometry args={[0.42, 0.04, 0.025]} /><meshStandardMaterial color={beamColor} metalness={0.4} transparent={ghost} opacity={ghost ? 0.4 : 1} /></mesh>
                        ))}
                        {l < levels && <mesh position={[0.5, y + 0.02, 0.5]}><boxGeometry args={[0.4, 0.008, 0.34]} /><meshStandardMaterial color="#777" metalness={0.5} transparent opacity={ghost ? 0.2 : 0.5} /></mesh>}
                        {cargoElement}
                        {/* Highlight glow for searched bin */}
                        {isHighlighted && (
                            <mesh position={[0.5, y + 0.12, 0.5]}>
                                <boxGeometry args={[0.48, 0.2, 0.38]} />
                                <meshBasicMaterial color="#fbbf24" transparent opacity={0.25} />
                            </mesh>
                        )}
                        {/* Bin code label on shelf */}
                        {hasData && bin && !ghost && l < levels && (
                            <Html position={[0.5, y + 0.25, 0.9]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
                                <div style={{
                                    fontSize: 7, fontWeight: 700, fontFamily: 'monospace',
                                    color: isHighlighted ? '#fbbf24' : '#aaa',
                                    background: isHighlighted ? 'rgba(251,191,36,0.15)' : 'rgba(0,0,0,0.4)',
                                    padding: '1px 4px', borderRadius: 3, whiteSpace: 'nowrap',
                                    border: isHighlighted ? '1px solid rgba(251,191,36,0.4)' : '1px solid transparent',
                                }}>
                                    {bin.binCode}{bin.currentItemCount > 0 ? ` (${bin.currentItemCount})` : ''}
                                </div>
                            </Html>
                        )}
                    </group>
                );
            })}
            {/* Foot plates */}
            {[[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]].map(([px, pz], i) => (
                <mesh key={`f${i}`} position={[px + 0.5, 0.005, pz + 0.5]}><boxGeometry args={[0.08, 0.01, 0.08]} /><meshStandardMaterial color="#555" metalness={0.6} transparent={ghost} opacity={ghost ? 0.3 : 1} /></mesh>
            ))}
            {/* Selection glow */}
            {selected && <mesh position={[0.5, h / 2, 0.5]}><boxGeometry args={[0.6, h + 0.1, 0.5]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} /></mesh>}
        </group>
    );
}

function WallObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const len = obj.width || 3;
    return (
        <group position={[obj.x, 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            <mesh position={[len / 2, 1.75, 0.075]} castShadow>
                <boxGeometry args={[len, 3.5, 0.15]} />
                <meshStandardMaterial color={obj.color || '#b0b8c8'} roughness={0.85} transparent={ghost} opacity={ghost ? 0.3 : selected ? 0.9 : 1} emissive={selected ? '#fff' : '#000'} emissiveIntensity={selected ? 0.1 : 0} />
            </mesh>
        </group>
    );
}

function DoorObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const w = obj.width || 2;
    return (
        <group position={[obj.x, 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Door */}
            <mesh position={[w / 2, 1.75, 0]}>
                <boxGeometry args={[w, 3.5, 0.06]} />
                <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.3} transparent={ghost} opacity={ghost ? 0.3 : 1} />
            </mesh>
            {/* Ridges */}
            {Array.from({ length: 7 }, (_, r) => (
                <mesh key={r} position={[w / 2, r * 0.5 + 0.25, 0.04]}>
                    <boxGeometry args={[w - 0.1, 0.03, 0.03]} />
                    <meshStandardMaterial color="#555" metalness={0.6} transparent={ghost} opacity={ghost ? 0.2 : 1} />
                </mesh>
            ))}
            {/* Yellow frame */}
            {[[-0.05, w / 2], [w + 0.05, w / 2]].map(([fx], i) => (
                <mesh key={i} position={[fx, 1.75, 0]}>
                    <boxGeometry args={[0.1, 3.6, 0.12]} />
                    <meshStandardMaterial color="#f59e0b" transparent={ghost} opacity={ghost ? 0.4 : 1} />
                </mesh>
            ))}
            {selected && <mesh position={[w / 2, 1.75, 0]}><boxGeometry args={[w + 0.2, 3.7, 0.2]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} /></mesh>}
        </group>
    );
}

function PalletObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const op = ghost ? 0.3 : 1;
    const pSeed = Math.abs(Math.sin(obj.x * 83.1 + obj.z * 157.3) * 43758.5453) % 1;
    const boxColor = pSeed > 0.5 ? '#8B6914' : '#a0784c';
    return (
        <group position={[obj.x + 0.5, 0, obj.z + 0.5]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {[-0.12, 0, 0.12].map((z, i) => (
                <mesh key={`t${i}`} position={[0, 0.06, z]}><boxGeometry args={[0.35, 0.02, 0.09]} /><meshStandardMaterial color="#8B7355" roughness={0.9} transparent={ghost} opacity={op} /></mesh>
            ))}
            {[-0.12, 0, 0.12].map((x, i) => (
                <mesh key={`b${i}`} position={[x, 0.03, 0]}><boxGeometry args={[0.07, 0.04, 0.32]} /><meshStandardMaterial color="#6d5a40" roughness={0.95} transparent={ghost} opacity={op} /></mesh>
            ))}
            {/* Cargo box on pallet */}
            {!ghost && (
                <mesh position={[0, 0.17, 0]}>
                    <boxGeometry args={[0.3, 0.16, 0.28]} />
                    <meshStandardMaterial color={boxColor} roughness={0.85} />
                </mesh>
            )}
            {selected && <mesh position={[0, 0.12, 0]}><boxGeometry args={[0.45, 0.28, 0.4]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.4} /></mesh>}
        </group>
    );
}

function BollardObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const op = ghost ? 0.3 : 1;
    return (
        <group position={[obj.x + 0.5, 0, obj.z + 0.5]}>
            <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.12, 0.14, 0.04, 12]} /><meshStandardMaterial color="#333" metalness={0.5} transparent={ghost} opacity={op} /></mesh>
            <mesh position={[0, 0.38, 0]}><cylinderGeometry args={[0.06, 0.06, 0.7, 8]} /><meshStandardMaterial color="#f59e0b" transparent={ghost} opacity={op} /></mesh>
            <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.065, 0.065, 0.08, 8]} /><meshStandardMaterial color="#111" transparent={ghost} opacity={op} /></mesh>
            <mesh position={[0, 0.74, 0]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color="#f59e0b" transparent={ghost} opacity={op} /></mesh>
            {selected && <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.2, 0.2, 0.8, 8]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.4} /></mesh>}
        </group>
    );
}

function WorkstationObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const w = obj.width || 2;
    const op = ghost ? 0.3 : 1;
    return (
        <group position={[obj.x, 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Table top */}
            <mesh position={[w / 2, 0.85, 0.35]}><boxGeometry args={[w, 0.04, 0.7]} /><meshStandardMaterial color="#d4c5a9" roughness={0.7} transparent={ghost} opacity={op} /></mesh>
            {/* Legs */}
            {[[0.1, 0.1], [w - 0.1, 0.1], [0.1, 0.6], [w - 0.1, 0.6]].map(([lx, lz], i) => (
                <mesh key={i} position={[lx, 0.42, lz]}><boxGeometry args={[0.04, 0.84, 0.04]} /><meshStandardMaterial color="#555" metalness={0.4} transparent={ghost} opacity={op} /></mesh>
            ))}
            {/* Monitor */}
            <mesh position={[w / 2, 1.15, 0.2]}><boxGeometry args={[0.5, 0.3, 0.02]} /><meshStandardMaterial color="#222" transparent={ghost} opacity={op} /></mesh>
            <mesh position={[w / 2, 1.14, 0.19]}><boxGeometry args={[0.46, 0.26, 0.01]} /><meshStandardMaterial color="#1e40af" emissive="#1e40af" emissiveIntensity={ghost ? 0 : 0.3} transparent={ghost} opacity={op} /></mesh>
            <mesh position={[w / 2, 0.98, 0.2]}><boxGeometry args={[0.06, 0.08, 0.04]} /><meshStandardMaterial color="#333" transparent={ghost} opacity={op} /></mesh>
            {selected && <mesh position={[w / 2, 0.6, 0.35]}><boxGeometry args={[w + 0.1, 1.3, 0.8]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} /></mesh>}
        </group>
    );
}

function ConveyorObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const w = obj.width || 4;
    const op = ghost ? 0.3 : 1;
    return (
        <group position={[obj.x, 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Frame */}
            <mesh position={[w / 2, 0.45, 0.3]}><boxGeometry args={[w, 0.04, 0.55]} /><meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.3} transparent={ghost} opacity={op} /></mesh>
            {/* Side rails */}
            {[0.05, 0.55].map((rz, i) => (
                <mesh key={i} position={[w / 2, 0.48, rz]}><boxGeometry args={[w, 0.06, 0.03]} /><meshStandardMaterial color="#475569" metalness={0.6} transparent={ghost} opacity={op} /></mesh>
            ))}
            {/* Rollers */}
            {Array.from({ length: Math.floor(w / 0.12) }, (_, i) => (
                <mesh key={`r${i}`} position={[i * 0.12 + 0.1, 0.47, 0.3]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.025, 0.025, 0.45, 6]} />
                    <meshStandardMaterial color="#999" metalness={0.7} roughness={0.2} transparent={ghost} opacity={op} />
                </mesh>
            ))}
            {/* Legs */}
            {[[0.15, 0.1], [0.15, 0.5], [w - 0.15, 0.1], [w - 0.15, 0.5]].map(([lx, lz], i) => (
                <mesh key={`l${i}`} position={[lx, 0.22, lz]}><boxGeometry args={[0.04, 0.44, 0.04]} /><meshStandardMaterial color="#555" metalness={0.4} transparent={ghost} opacity={op} /></mesh>
            ))}
            {selected && <mesh position={[w / 2, 0.35, 0.3]}><boxGeometry args={[w + 0.1, 0.7, 0.7]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} /></mesh>}
        </group>
    );
}

function ForkliftObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const op = ghost ? 0.3 : 1;
    return (
        <group position={[obj.x + 0.5, 0, obj.z + 0.5]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Body */}
            <mesh position={[0, 0.35, 0]}><boxGeometry args={[0.5, 0.4, 0.7]} /><meshStandardMaterial color="#eab308" roughness={0.6} transparent={ghost} opacity={op} /></mesh>
            {/* Cab roof */}
            <mesh position={[0, 0.7, -0.05]}><boxGeometry args={[0.52, 0.04, 0.5]} /><meshStandardMaterial color="#333" transparent={ghost} opacity={op} /></mesh>
            {/* Cab posts */}
            {[[-0.24, -0.28], [0.24, -0.28]].map(([px, pz], i) => (
                <mesh key={i} position={[px, 0.55, pz]}><boxGeometry args={[0.03, 0.35, 0.03]} /><meshStandardMaterial color="#333" transparent={ghost} opacity={op} /></mesh>
            ))}
            {/* Mast */}
            <mesh position={[0, 0.65, 0.38]}><boxGeometry args={[0.06, 1.0, 0.04]} /><meshStandardMaterial color="#555" metalness={0.5} transparent={ghost} opacity={op} /></mesh>
            <mesh position={[0.12, 0.65, 0.38]}><boxGeometry args={[0.06, 1.0, 0.04]} /><meshStandardMaterial color="#555" metalness={0.5} transparent={ghost} opacity={op} /></mesh>
            {/* Forks */}
            {[-0.08, 0.08].map((fx, i) => (
                <mesh key={`fk${i}`} position={[fx, 0.08, 0.6]}><boxGeometry args={[0.06, 0.03, 0.5]} /><meshStandardMaterial color="#777" metalness={0.6} transparent={ghost} opacity={op} /></mesh>
            ))}
            {/* Wheels */}
            {[[-0.22, -0.3], [0.22, -0.3], [-0.15, 0.2], [0.15, 0.2]].map(([wx, wz], i) => (
                <mesh key={`w${i}`} position={[wx, 0.08, wz]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.08, 0.08, 0.06, 8]} />
                    <meshStandardMaterial color="#222" roughness={0.9} transparent={ghost} opacity={op} />
                </mesh>
            ))}
            {selected && <mesh position={[0, 0.4, 0.1]}><boxGeometry args={[0.7, 1, 1.2]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} /></mesh>}
        </group>
    );
}

// ═══════════════════════════════════════════════════
// OBJECT RENDERER
// ═══════════════════════════════════════════════════

function PlacedObjectRenderer({ obj, selected, ghost, rackInventoryMap, highlightBin, onShelfClick }: {
    obj: PlacedObject; selected: boolean; ghost?: boolean;
    rackInventoryMap?: Map<string, RackInventory>; highlightBin?: string;
    onShelfClick?: (obj: PlacedObject, level: number, bin?: BinOccupancy) => void;
}) {
    switch (obj.type) {
        case 'zone': return <ZoneObject obj={obj} selected={selected} ghost={ghost} />;
        case 'rack': return <RackObject obj={obj} selected={selected} ghost={ghost}
            rackInventory={rackInventoryMap?.get(obj.id)} highlightBin={highlightBin} onShelfClick={onShelfClick} />;
        case 'wall': return <WallObject obj={obj} selected={selected} ghost={ghost} />;
        case 'door': return <DoorObject obj={obj} selected={selected} ghost={ghost} />;
        case 'pallet': return <PalletObject obj={obj} selected={selected} ghost={ghost} />;
        case 'bollard': return <BollardObject obj={obj} selected={selected} ghost={ghost} />;
        case 'workstation': return <WorkstationObject obj={obj} selected={selected} ghost={ghost} />;
        case 'conveyor': return <ConveyorObject obj={obj} selected={selected} ghost={ghost} />;
        case 'forklift': return <ForkliftObject obj={obj} selected={selected} ghost={ghost} />;
        default: return null;
    }
}

// ═══════════════════════════════════════════════════
// WAREHOUSE BUILDING SHELL
// ═══════════════════════════════════════════════════

function BuildingShell({ gridCells, isDark }: { gridCells: number; isDark?: boolean }) {
    const dark = isDark !== false;
    const w = gridCells;
    const d = gridCells;
    const h = 6;
    // Theme-aware colors
    const floorColor = dark ? '#2c2f3a' : '#c8ccd4';
    const floorShine = dark ? '#3a4055' : '#b8bcc8';
    const wallColor = dark ? '#8890a0' : '#d0d4dc';
    const wallBack = dark ? '#7d8595' : '#c4c8d0';
    const wallBase = dark ? '#3a3d4a' : '#a0a4ac';
    const trussColor = dark ? '#444458' : '#9498a8';
    const trussBot = dark ? '#3a3d50' : '#a0a4b4';
    const crossColor = dark ? '#4a4d60' : '#90949c';
    const dockColor = dark ? '#555570' : '#b0b4c0';
    const lightHousing = dark ? '#ddd' : '#e8e8e8';
    return (
        <group>
            {/* Floor - industrial concrete */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, -0.01, d / 2]} receiveShadow>
                <planeGeometry args={[w + 4, d + 4]} />
                <meshStandardMaterial color={floorColor} metalness={0.05} roughness={0.92} />
            </mesh>
            {/* Epoxy shine layer */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0.001, d / 2]}>
                <planeGeometry args={[w + 1, d + 1]} />
                <meshStandardMaterial color={floorShine} metalness={0.35} roughness={0.5} transparent opacity={0.25} />
            </mesh>
            {/* Floor safety perimeter lines (yellow) */}
            {[
                [w / 2, 0.008, 0.5, w, 0.08],
                [w / 2, 0.008, d - 0.5, w, 0.08],
                [0.5, 0.008, d / 2, 0.08, d],
                [w - 0.5, 0.008, d / 2, 0.08, d],
            ].map(([x, y, z, gw, gd], i) => (
                <mesh key={`perim${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, y, z]}>
                    <planeGeometry args={[gw, gd]} />
                    <meshStandardMaterial color="#eab308" transparent opacity={0.2} />
                </mesh>
            ))}
            {/* Walls - partially transparent for visibility */}
            <mesh position={[w / 2, h / 2, -0.1]}><boxGeometry args={[w + 0.4, h, 0.15]} /><meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.1} transparent opacity={dark ? 0.35 : 0.25} /></mesh>
            <mesh position={[-0.1, h / 2, d / 2]}><boxGeometry args={[0.15, h, d + 0.4]} /><meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.1} transparent opacity={dark ? 0.35 : 0.25} /></mesh>
            <mesh position={[w + 0.1, h / 2, d / 2]}><boxGeometry args={[0.15, h, d + 0.4]} /><meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.1} transparent opacity={dark ? 0.35 : 0.25} /></mesh>
            <mesh position={[w / 2, h / 2, d + 0.1]}><boxGeometry args={[w + 0.4, h, 0.15]} /><meshStandardMaterial color={wallBack} roughness={0.8} metalness={0.1} transparent opacity={dark ? 0.35 : 0.25} /></mesh>
            {/* Wall base stripe (darker) */}
            {[
                [w / 2, 0.3, -0.12, w + 0.5, 0.6, 0.12],
                [w / 2, 0.3, d + 0.12, w + 0.5, 0.6, 0.12],
                [-0.12, 0.3, d / 2, 0.12, 0.6, d + 0.5],
                [w + 0.12, 0.3, d / 2, 0.12, 0.6, d + 0.5],
            ].map(([x, y, z, bw, bh, bd], i) => (
                <mesh key={`base${i}`} position={[x, y, z]}><boxGeometry args={[bw, bh, bd]} /><meshStandardMaterial color={wallBase} roughness={0.9} transparent opacity={0.6} /></mesh>
            ))}
            {/* Roof trusses - steel I-beams */}
            {Array.from({ length: Math.ceil(d / 3) + 1 }, (_, i) => (
                <group key={`truss${i}`}>
                    <mesh position={[w / 2, h - 0.06, Math.min(i * 3, d)]}>
                        <boxGeometry args={[w, 0.1, 0.06]} /><meshStandardMaterial color={trussColor} metalness={0.6} roughness={0.3} />
                    </mesh>
                    <mesh position={[w / 2, h - 0.15, Math.min(i * 3, d)]}>
                        <boxGeometry args={[w, 0.02, 0.12]} /><meshStandardMaterial color={trussBot} metalness={0.5} roughness={0.4} />
                    </mesh>
                </group>
            ))}
            {/* Cross-bracing */}
            {Array.from({ length: Math.ceil(w / 5) }, (_, i) => (
                <mesh key={`xbrace${i}`} position={[i * 5 + 2.5, h - 0.08, d / 2]}>
                    <boxGeometry args={[0.04, 0.08, d]} /><meshStandardMaterial color={crossColor} metalness={0.5} roughness={0.4} />
                </mesh>
            ))}
            {/* Overhead lights - industrial strip */}
            {Array.from({ length: Math.ceil(w / 4) }, (_, xi) =>
                Array.from({ length: Math.ceil(d / 5) }, (_, zi) => (
                    <group key={`lt-${xi}-${zi}`} position={[xi * 4 + 2, h - 0.2, zi * 5 + 2.5]}>
                        <mesh><boxGeometry args={[0.8, 0.04, 0.15]} /><meshStandardMaterial color={lightHousing} metalness={0.8} roughness={0.2} /></mesh>
                        <mesh position={[0, -0.025, 0]}><boxGeometry args={[0.7, 0.01, 0.11]} /><meshStandardMaterial color="#fff" emissive="#fffaf0" emissiveIntensity={0.5} /></mesh>
                        <pointLight position={[0, -0.15, 0]} intensity={0.15} distance={6} color="#fffaf0" />
                    </group>
                ))
            )}
            {/* Loading dock markers on back wall */}
            {Array.from({ length: Math.floor(w / 4) }, (_, i) => (
                <group key={`dock${i}`} position={[i * 4 + 2, 0, d + 0.07]}>
                    <mesh position={[0, 2, 0]}><boxGeometry args={[2.2, 3.8, 0.04]} /><meshStandardMaterial color={dockColor} roughness={0.9} /></mesh>
                    {/* Yellow/black chevrons */}
                    <mesh position={[0, 0.08, 0.01]}><boxGeometry args={[2.4, 0.12, 0.02]} /><meshStandardMaterial color="#eab308" /></mesh>
                </group>
            ))}
        </group>
    );
}

// ═══════════════════════════════════════════════════
// BUILD GRID (visible in build mode)
// ═══════════════════════════════════════════════════

function BuildGrid({ gridCells, onGridClick, ghostObj, buildMode }: {
    gridCells: number; onGridClick: (x: number, z: number) => void; ghostObj: PlacedObject | null; buildMode: boolean;
}) {
    const [hover, setHover] = useState<[number, number] | null>(null);

    if (!buildMode) return null;

    return (
        <group>
            {/* Grid lines */}
            <gridHelper args={[gridCells, gridCells, '#3b82f640', '#3b82f618']} position={[gridCells / 2, 0.003, gridCells / 2]} />
            {/* Origin axes */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.005, 0.15]}>
                <planeGeometry args={[1, 0.04]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.5} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.15, 0.005, 0.5]}>
                <planeGeometry args={[0.04, 1]} />
                <meshBasicMaterial color="#22c55e" transparent opacity={0.5} />
            </mesh>
            {/* Invisible click plane */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[gridCells / 2, 0.002, gridCells / 2]}
                onClick={(e) => {
                    const pt = e.point;
                    const gx = Math.floor(pt.x / GRID_SIZE) * GRID_SIZE;
                    const gz = Math.floor(pt.z / GRID_SIZE) * GRID_SIZE;
                    if (gx >= 0 && gz >= 0 && gx < gridCells && gz < gridCells) onGridClick(gx, gz);
                }}
                onPointerMove={(e) => {
                    const pt = e.point;
                    const gx = Math.floor(pt.x / GRID_SIZE) * GRID_SIZE;
                    const gz = Math.floor(pt.z / GRID_SIZE) * GRID_SIZE;
                    setHover([gx, gz]);
                }}
                onPointerOut={() => setHover(null)}
            >
                <planeGeometry args={[gridCells, gridCells]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
            {/* Hover cell highlight */}
            {hover && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[hover[0] + 0.5, 0.006, hover[1] + 0.5]}>
                    <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
                    <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} />
                </mesh>
            )}
            {/* Ghost preview */}
            {ghostObj && hover && (
                <PlacedObjectRenderer
                    obj={{ ...ghostObj, x: hover[0], z: hover[1] }}
                    selected={false}
                    ghost={true}
                />
            )}
        </group>
    );
}

// ═══════════════════════════════════════════════════
// CLICKABLE OBJECT WRAPPER
// ═══════════════════════════════════════════════════

function SelectableObject({ obj, selected, buildMode, onClick, rackInventoryMap, highlightBin, onShelfClick }: {
    obj: PlacedObject; selected: boolean; buildMode: boolean; onClick: (id: string, shiftKey: boolean) => void;
    rackInventoryMap?: Map<string, RackInventory>; highlightBin?: string;
    onShelfClick?: (obj: PlacedObject, level: number, bin?: BinOccupancy) => void;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <group
            onClick={(e) => { if (buildMode) { e.stopPropagation(); onClick(obj.id, (e as any).nativeEvent?.shiftKey || false); } }}
            onPointerOver={() => { setHovered(true); if (buildMode) document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHovered(false); if (buildMode) document.body.style.cursor = 'default'; }}
        >
            <PlacedObjectRenderer obj={obj} selected={selected} rackInventoryMap={rackInventoryMap} highlightBin={highlightBin} onShelfClick={onShelfClick} />
            {/* Locked badge */}
            {obj.locked && !buildMode && (
                <Html position={[obj.x + (obj.width || 1) / 2, 1.8, obj.z + (obj.depth || 1) / 2]}
                    center style={{ pointerEvents: 'none' }} distanceFactor={15}>
                    <div style={{ background: 'rgba(239,68,68,0.8)', color: '#fff', padding: '1px 4px', borderRadius: 3, fontSize: 8, fontWeight: 700 }}>
                        🔒
                    </div>
                </Html>
            )}
            {/* Hover tooltip (view mode) */}
            {hovered && !buildMode && (
                <Html position={[obj.x + (obj.width || 1) / 2, 2.2, obj.z + (obj.depth || 1) / 2]}
                    center style={{ pointerEvents: 'none' }} distanceFactor={12}>
                    <div style={{
                        background: 'rgba(10,10,30,0.9)', backdropFilter: 'blur(6px)',
                        border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
                        padding: '5px 8px', color: '#fff', fontSize: 9, fontFamily: 'system-ui',
                        whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    }}>
                        <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 2 }}>
                            {obj.label || obj.type}
                        </div>
                        <div style={{ color: '#aaa', fontSize: 8 }}>
                            {obj.type.toUpperCase()} · 📍{gridCoordsLabel(obj.x, obj.z)}
                            {obj.type === 'rack' ? ` · ${obj.rackLevels || 3} levels` : ''}
                            {obj.type === 'zone' ? ` · ${(obj.width || 1)}×${(obj.depth || 1)}` : ''}
                        </div>
                    </div>
                </Html>
            )}
        </group>
    );
}

// ═══════════════════════════════════════════════════
// AISLE MARKINGS (yellow dashed lines between rack rows)
// ═══════════════════════════════════════════════════

function AisleMarkings({ objects, gridCells }: { objects: PlacedObject[]; gridCells: number }) {
    const racks = objects.filter(o => o.type === 'rack');
    if (racks.length < 2) return null;

    // Find unique Z rows of racks
    const zRows = [...new Set(racks.map(r => Math.round(r.z * 2) / 2))].sort((a, b) => a - b);
    const markings: { z: number; minX: number; maxX: number }[] = [];

    for (let i = 0; i < zRows.length - 1; i++) {
        const gap = zRows[i + 1] - zRows[i];
        if (gap > 1 && gap < 4) {
            const midZ = (zRows[i] + zRows[i + 1]) / 2 + 0.5;
            const racksInRow = racks.filter(r => Math.abs(r.z - zRows[i]) < 0.5 || Math.abs(r.z - zRows[i + 1]) < 0.5);
            const xs = racksInRow.map(r => r.x);
            markings.push({ z: midZ, minX: Math.min(...xs) - 0.5, maxX: Math.max(...xs) + 1.5 });
        }
    }

    return (
        <group>
            {markings.map((m, i) => {
                const len = m.maxX - m.minX;
                const segments = Math.floor(len / 0.6);
                return Array.from({ length: segments }, (_, j) => (
                    <mesh key={`${i}-${j}`} rotation={[-Math.PI / 2, 0, 0]}
                        position={[m.minX + j * 0.6 + 0.2, 0.012, m.z]}>
                        <planeGeometry args={[0.4, 0.06]} />
                        <meshStandardMaterial color="#eab308" transparent opacity={0.5} />
                    </mesh>
                ));
            })}
        </group>
    );
}

// ═══════════════════════════════════════════════════
// ROUTE RENDERING
// ═══════════════════════════════════════════════════

function RoutePath({ route }: { route: Route }) {
    const tubeRef = useRef<THREE.Mesh>(null);
    const timeRef = useRef(0);

    const { geometry, color } = useMemo(() => {
        if (!route.fullPath || route.fullPath.length < 2) return { geometry: null, color: route.color };
        const points = route.fullPath.map(p => new THREE.Vector3(p.x + 0.5, 0.15, p.z + 0.5));
        const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);
        const geo = new THREE.TubeGeometry(curve, Math.max(points.length * 6, 20), 0.08, 6, false);
        return { geometry: geo, color: route.color };
    }, [route]);

    // Animated dash effect via UV offset
    useFrame((_, delta) => {
        if (!tubeRef.current) return;
        timeRef.current += delta;
        const mat = tubeRef.current.material as THREE.MeshStandardMaterial;
        if (mat) mat.emissiveIntensity = 0.4 + Math.sin(timeRef.current * 3) * 0.15;
    });

    if (!geometry) return null;
    return (
        <group>
            {/* Main glowing tube */}
            <mesh ref={tubeRef} geometry={geometry}>
                <meshStandardMaterial
                    color={color} emissive={color} emissiveIntensity={0.4}
                    transparent opacity={0.7} roughness={0.3} metalness={0.2}
                />
            </mesh>
            {/* Outer glow */}
            <mesh geometry={geometry}>
                <meshBasicMaterial color={color} transparent opacity={0.12} side={THREE.BackSide} />
            </mesh>
            {/* Direction arrows along path */}
            {route.fullPath.filter((_, i) => i % 4 === 2 && i < route.fullPath.length - 1).map((p, i) => {
                const next = route.fullPath[Math.min(i * 4 + 3, route.fullPath.length - 1)];
                const angle = Math.atan2(next.z - p.z, next.x - p.x);
                return (
                    <mesh key={`arr-${i}`} position={[p.x + 0.5, 0.22, p.z + 0.5]}
                        rotation={[-Math.PI / 2, 0, -angle + Math.PI / 2]}>
                        <coneGeometry args={[0.1, 0.2, 3]} />
                        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} transparent opacity={0.7} />
                    </mesh>
                );
            })}
        </group>
    );
}

function AnimatedParcel({ route, speed = 2.5 }: { route: Route; speed?: number }) {
    const meshRef = useRef<THREE.Group>(null);
    const progressRef = useRef(0);
    const pathLen = route.fullPath.length;

    useFrame((_, delta) => {
        if (!meshRef.current || pathLen < 2) return;
        progressRef.current += delta * speed / Math.max(pathLen, 1);
        if (progressRef.current >= 1) progressRef.current = 0;

        const idx = progressRef.current * (pathLen - 1);
        const i0 = Math.floor(idx);
        const i1 = Math.min(i0 + 1, pathLen - 1);
        const t = idx - i0;
        const p0 = route.fullPath[i0];
        const p1 = route.fullPath[i1];

        const x = p0.x + (p1.x - p0.x) * t + 0.5;
        const z = p0.z + (p1.z - p0.z) * t + 0.5;
        const hover = 0.35 + Math.sin(progressRef.current * Math.PI * 8) * 0.03;

        meshRef.current.position.set(x, hover, z);

        // Face direction of movement
        if (i0 !== i1) {
            const angle = Math.atan2(p1.z - p0.z, p1.x - p0.x);
            meshRef.current.rotation.y = -angle;
        }
    });

    if (pathLen < 2) return null;
    const col = route.color;
    return (
        <group ref={meshRef}>
            {/* Crate body */}
            <mesh>
                <boxGeometry args={[0.25, 0.2, 0.25]} />
                <meshStandardMaterial color="#c8a87c" roughness={0.8} />
            </mesh>
            {/* Tape */}
            <mesh position={[0, 0.101, 0]}>
                <boxGeometry args={[0.26, 0.01, 0.08]} />
                <meshStandardMaterial color={col} />
            </mesh>
            {/* Glow underneath */}
            <pointLight color={col} intensity={0.5} distance={1.5} />
        </group>
    );
}

function RouteWaypoints({ route }: { route: Route }) {
    return (
        <group>
            {route.stops.map((stop, i) => {
                const isFirst = i === 0;
                const isLast = i === route.stops.length - 1;
                const col = stop.color || route.color;
                return (
                    <group key={`wp-${i}`} position={[stop.x + 0.5, 0, stop.z + 0.5]}>
                        {/* Pulsing ring on floor */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                            <ringGeometry args={[0.3, 0.45, 24]} />
                            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.5} transparent opacity={0.6} side={THREE.DoubleSide} />
                        </mesh>
                        {/* Center dot */}
                        <mesh position={[0, 0.03, 0]}>
                            <cylinderGeometry args={[0.15, 0.15, 0.04, 16]} />
                            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.4} />
                        </mesh>
                        {/* Vertical beacon pole */}
                        <mesh position={[0, 1.0, 0]}>
                            <cylinderGeometry args={[0.02, 0.02, 2.0, 6]} />
                            <meshStandardMaterial color={col} transparent opacity={0.3} />
                        </mesh>
                        {/* Label */}
                        <Html position={[0, 2.3, 0]} center style={{ pointerEvents: 'none' }} distanceFactor={12}>
                            <div style={{
                                background: `${col}dd`, borderRadius: 8, padding: '3px 8px',
                                color: '#fff', fontSize: 9, fontWeight: 800, fontFamily: 'system-ui',
                                whiteSpace: 'nowrap', boxShadow: `0 2px 12px ${col}60`,
                                border: '1px solid rgba(255,255,255,0.3)',
                                display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                                <span style={{
                                    width: 16, height: 16, borderRadius: 16,
                                    background: 'rgba(255,255,255,0.25)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900,
                                }}>{i + 1}</span>
                                {stop.label}
                                {isFirst && ' 🚀'}
                                {isLast && ' 🏁'}
                            </div>
                        </Html>
                        {/* Glow light */}
                        <pointLight color={col} intensity={0.4} distance={2.5} position={[0, 0.5, 0]} />
                    </group>
                );
            })}
        </group>
    );
}

// ═══════════════════════════════════════════════════
// FLOOR GRID OVERLAY
// ═══════════════════════════════════════════════════

const GRID_OVERLAY_COLORS: Record<string, string> = {
    obstacle: '#ef4444',
    zone: '#3b82f6',
    aisle: '#22c55e',
    empty: '#1e1e3a',
};

function FloorGridOverlay({ objects, gridCells }: { objects: PlacedObject[]; gridCells: number }) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const grid = useMemo(() => buildGrid(objects), [objects]);

    const { colors, count } = useMemo(() => {
        const total = gridCells * gridCells;
        const cols = new Float32Array(total * 3);
        const tmpColor = new THREE.Color();
        for (let gz = 0; gz < gridCells; gz++) {
            for (let gx = 0; gx < gridCells; gx++) {
                const idx = gz * gridCells + gx;
                const cell = grid[gz]?.[gx];
                if (!cell) continue;
                let hex = GRID_OVERLAY_COLORS.empty;
                if (cell.cost === Infinity) hex = GRID_OVERLAY_COLORS.obstacle;
                else if (cell.type === 'aisle') hex = GRID_OVERLAY_COLORS.aisle;
                else if (cell.type === 'zone') {
                    hex = cell.zoneType === 'cold' ? '#6366f1' : cell.zoneType === 'quarantine' ? '#ef4444' : GRID_OVERLAY_COLORS.zone;
                }
                tmpColor.set(hex);
                cols[idx * 3] = tmpColor.r;
                cols[idx * 3 + 1] = tmpColor.g;
                cols[idx * 3 + 2] = tmpColor.b;
            }
        }
        return { colors: cols, count: total };
    }, [grid, gridCells]);

    useEffect(() => {
        if (!meshRef.current) return;
        for (let gz = 0; gz < gridCells; gz++) {
            for (let gx = 0; gx < gridCells; gx++) {
                dummy.position.set(gx + 0.5, 0.025, gz + 0.5);
                dummy.rotation.set(-Math.PI / 2, 0, 0);
                dummy.scale.set(0.92, 0.92, 1);
                dummy.updateMatrix();
                meshRef.current.setMatrixAt(gz * gridCells + gx, dummy.matrix);
            }
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        const colorAttr = new THREE.InstancedBufferAttribute(colors, 3);
        meshRef.current.instanceColor = colorAttr;
    }, [gridCells, colors, dummy]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial
                transparent opacity={0.35}
                side={THREE.DoubleSide}
                depthWrite={false}
            />
        </instancedMesh>
    );
}

// ═══════════════════════════════════════════════════
// SCENE CONTENT
// ═══════════════════════════════════════════════════

function SceneContent({ objects, selectedId, selectedIds, ghostObj, buildMode, gridCells, cameraPreset, onGridClick, onSelectObject, routes, showRoutes, animateRoutes, showGridOverlay, isDark, rackInventoryMap, highlightBin, onShelfClick }: {
    objects: PlacedObject[]; selectedId: string | null; selectedIds?: Set<string>; ghostObj: PlacedObject | null;
    buildMode: boolean; gridCells: number; cameraPreset: string; onGridClick: (x: number, z: number) => void; onSelectObject: (id: string, shiftKey: boolean) => void;
    routes?: Route[]; showRoutes?: boolean; animateRoutes?: boolean; showGridOverlay?: boolean; isDark?: boolean;
    rackInventoryMap?: Map<string, RackInventory>; highlightBin?: string;
    onShelfClick?: (obj: PlacedObject, level: number, bin?: BinOccupancy) => void;
}) {
    const bgColor = isDark !== false ? '#080814' : '#d5dbe3';
    return (
        <>
            <ambientLight intensity={isDark !== false ? 0.25 : 0.6} />
            <directionalLight position={[gridCells * 0.8, 12, gridCells * 0.3]} intensity={isDark !== false ? 0.55 : 0.8} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} color="#fffaf0" />
            <directionalLight position={[-gridCells * 0.3, 8, gridCells * 0.8]} intensity={isDark !== false ? 0.15 : 0.35} color="#b4c6e7" />
            <hemisphereLight color={isDark !== false ? '#c4d4f0' : '#dde4f0'} groundColor={isDark !== false ? '#2a2d3a' : '#b0b8c4'} intensity={isDark !== false ? 0.3 : 0.5} />
            <color attach="background" args={[bgColor]} />
            <fog attach="fog" args={[bgColor, gridCells * 1.5, gridCells * 4]} />

            <BuildingShell gridCells={gridCells} isDark={isDark} />
            <BuildGrid gridCells={gridCells} onGridClick={onGridClick} ghostObj={ghostObj} buildMode={buildMode} />
            <AisleMarkings objects={objects} gridCells={gridCells} />

            {objects.map(obj => (
                <SelectableObject key={obj.id} obj={obj} selected={selectedId === obj.id || (selectedIds?.has(obj.id) ?? false)} buildMode={buildMode} onClick={onSelectObject}
                    rackInventoryMap={rackInventoryMap} highlightBin={highlightBin} onShelfClick={onShelfClick} />
            ))}

            {/* Route rendering */}
            {showRoutes && routes && routes.map(route => (
                <group key={route.id}>
                    <RoutePath route={route} />
                    <RouteWaypoints route={route} />
                    {animateRoutes && <AnimatedParcel route={route} />}
                </group>
            ))}

            {/* Grid overlay */}
            {showGridOverlay && <FloorGridOverlay objects={objects} gridCells={gridCells} />}

            <CameraController gridCells={gridCells} preset={cameraPreset} />
            <OrbitControls makeDefault minDistance={2} maxDistance={gridCells * 2.5} maxPolarAngle={Math.PI / 2.05}
                enableDamping dampingFactor={0.06} target={[gridCells / 2, 0, gridCells / 2]} />
        </>
    );
}

// ═══════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════

interface WarehouseSceneProps {
    objects: PlacedObject[];
    selectedId: string | null;
    selectedIds?: Set<string>;
    ghostObj: PlacedObject | null;
    buildMode: boolean;
    gridCells: number;
    cameraPreset: string;
    onGridClick: (x: number, z: number) => void;
    onSelectObject: (id: string, shiftKey: boolean) => void;
    routes?: Route[];
    showRoutes?: boolean;
    animateRoutes?: boolean;
    showGridOverlay?: boolean;
    isDark?: boolean;
    rackInventoryMap?: Map<string, RackInventory>;
    highlightBin?: string;
    onShelfClick?: (obj: PlacedObject, level: number, bin?: BinOccupancy) => void;
}

// Camera controller for presets
function CameraController({ gridCells, preset }: { gridCells: number; preset: string }) {
    const { camera } = useThree();
    const targetPos = useRef(new THREE.Vector3());
    const animating = useRef(false);

    useEffect(() => {
        const half = gridCells / 2;
        switch (preset) {
            case 'top':
                targetPos.current.set(half, gridCells * 1.2, half + 0.1);
                break;
            case 'front':
                targetPos.current.set(half, gridCells * 0.25, gridCells * 1.3);
                break;
            case 'iso':
                targetPos.current.set(gridCells * 0.9, gridCells * 0.5, gridCells * 0.9);
                break;
            case 'corner':
            default:
                targetPos.current.set(gridCells * 0.7, gridCells * 0.4, gridCells * 0.7);
                break;
        }
        animating.current = true; // Start animating on preset change
    }, [preset, gridCells]);

    useFrame(() => {
        if (!animating.current) return;
        camera.position.lerp(targetPos.current, 0.06);
        // Stop lerping once close enough — let OrbitControls take over
        if (camera.position.distanceTo(targetPos.current) < 0.05) {
            animating.current = false;
        }
    });

    return null;
}

export default function WarehouseScene(props: WarehouseSceneProps) {
    return (
        <Canvas
            camera={{ position: [props.gridCells * 0.7, props.gridCells * 0.4, props.gridCells * 0.7], fov: 45 }}
            shadows dpr={[1, 1.5]}
            style={{ width: '100%', height: '100%', borderRadius: 12 }}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
        >
            <Suspense fallback={null}>
                <SceneContent {...props} />
            </Suspense>
        </Canvas>
    );
}
