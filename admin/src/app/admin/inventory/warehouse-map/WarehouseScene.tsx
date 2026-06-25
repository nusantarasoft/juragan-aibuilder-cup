"use client";
import React, { useRef, useState, Suspense, useCallback, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, ContactShadows, PointerLockControls, SoftShadows, Environment, OrthographicCamera, TransformControls } from "@react-three/drei";
import { EffectComposer, Bloom, SSAO, Vignette, SMAA, DepthOfField } from "@react-three/postprocessing";
import * as THREE from "three";
import type { PlacedObject, PlacedObjectType, BuilderPaletteItem, BinOccupancy, RackInventory, ZoneInventory } from "./builderState";
import { GRID_SIZE, gridCoordsLabel, locationCode, suggestRow } from "./builderState";
import type { Route, PathNode, GridCell } from "./pathfinding";
import { buildGrid } from "./pathfinding";

const ZONE_COLORS: Record<string, string> = {
    receiving: '#22c55e', storage: '#3b82f6', picking: '#f59e0b',
    packing: '#a855f7', shipping: '#06b6d4', cold: '#6366f1', quarantine: '#ef4444',
    hazardous: '#dc2626', staging: '#d97706', climate_controlled: '#4f46e5',
};

// ═══════════════════════════════════════════════════
// 3D OBJECTS
// ═══════════════════════════════════════════════════

function ZoneObject({ obj, selected, ghost, zoneInventory }: { obj: PlacedObject; selected: boolean; ghost?: boolean; zoneInventory?: ZoneInventory }) {
    const color = obj.color || ZONE_COLORS[obj.zoneType || 'storage'] || '#3b82f6';
    // Seeded random for consistent zone cargo positions
    const seed = Math.abs(Math.sin(obj.x * 73.1 + obj.z * 197.3 + (obj.width || 1) * 43) * 43758.5453) % 1;
    const zoneArea = (obj.width || 1) * (obj.depth || 1);

    // Data-driven cargo: use real utilization if available, otherwise decorative fallback
    const fillPercent = zoneInventory ? zoneInventory.utilization : null;
    const cargoCount = ghost ? 0 : (
        fillPercent !== null
            ? Math.min(Math.floor(zoneArea * (fillPercent / 100) * 0.7), 12)
            : Math.min(Math.floor(zoneArea * (0.3 + seed * 0.4)), 12)
    );
    const crateColorsByFill = fillPercent !== null
        ? fillPercent > 80 ? ['#b91c1c', '#dc2626', '#ef4444'] // red tones (high fill)
        : fillPercent > 50 ? ['#b45309', '#d97706', '#f59e0b'] // amber tones (mid fill)
        : ['#166534', '#22c55e', '#4ade80'] // green tones (low fill)
        : ['#8B6914', '#a0784c', '#5a7050', '#6b8cae', '#7a7a7a', '#b8a070']; // decorative fallback

    return (
        <group position={[obj.x, 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[obj.width / 2, 0.01, obj.depth / 2]} receiveShadow>
                <planeGeometry args={[obj.width, obj.depth]} />
                <meshStandardMaterial color={color} transparent opacity={ghost ? 0.3 : selected ? 0.35 : 0.18} />
            </mesh>
            {/* Hazard stripes for cold/quarantine zones */}
            {!ghost && (obj.zoneType === 'cold' || obj.zoneType === 'quarantine') && Array.from({ length: Math.ceil((obj.width + obj.depth) / 0.5) }, (_, si) => {
                const stripeX = si * 0.5 - obj.depth * 0.3;
                if (stripeX < -0.2 || stripeX > obj.width + 0.2) return null;
                return (
                    <mesh key={`hz${si}`} rotation={[-Math.PI / 2, 0, 0]} position={[Math.min(Math.max(stripeX, 0), obj.width), 0.013, obj.depth / 2]}
                        rotation-z={Math.PI / 4}>
                        <planeGeometry args={[0.08, obj.depth * 1.5]} />
                        <meshStandardMaterial
                            color={obj.zoneType === 'quarantine' ? '#ef4444' : '#60a5fa'}
                            transparent opacity={0.25}
                        />
                    </mesh>
                );
            })}
            {/* Border tape — glows red when high utilization */}
            {[[obj.width / 2, 0, 0, obj.width, 0.06], [obj.width / 2, 0, obj.depth, obj.width, 0.06],
              [0, 0, obj.depth / 2, 0.06, obj.depth], [obj.width, 0, obj.depth / 2, 0.06, obj.depth],
            ].map(([x, _y, z, w, d], i) => (
                <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, z]}>
                    <planeGeometry args={[w, d]} />
                    <meshStandardMaterial color={color} transparent opacity={ghost ? 0.4 : selected ? 0.8 : 0.55}
                        emissive={selected ? color : (fillPercent !== null && fillPercent > 80 ? '#ef4444' : '#000')}
                        emissiveIntensity={selected ? 0.3 : (fillPercent !== null && fillPercent > 80 ? 0.4 : 0)} />
                </mesh>
            ))}
            {/* Scattered cargo inside zone */}
            {cargoCount > 0 && Array.from({ length: cargoCount }, (_, ci) => {
                const cSeed = Math.abs(Math.sin(seed * 1000 + ci * 37.3)) % 1;
                const cSeed2 = Math.abs(Math.sin(seed * 2000 + ci * 51.1)) % 1;
                const cx = 0.4 + cSeed * ((obj.width || 1) - 0.8);
                const cz = 0.4 + cSeed2 * ((obj.depth || 1) - 0.8);
                const cColor = crateColorsByFill[Math.floor(cSeed * crateColorsByFill.length)];
                const ch = 0.12 + cSeed2 * 0.2;
                const cw = 0.18 + cSeed * 0.15;
                const cd = 0.18 + cSeed2 * 0.12;
                // More stacking when fill is higher
                const stackThreshold = fillPercent !== null ? (fillPercent > 70 ? 0.3 : 0.7) : 0.6;
                const isStacked = cSeed > stackThreshold;
                return (
                    <group key={`zc${ci}`}>
                        <mesh position={[cx, ch / 2 + 0.01, cz]} castShadow>
                            <boxGeometry args={[cw, ch, cd]} />
                            <meshStandardMaterial color={cColor} roughness={0.85} />
                        </mesh>
                        {isStacked && (
                            <mesh position={[cx, ch + 0.06, cz]} castShadow>
                                <boxGeometry args={[cw * 0.85, ch * 0.7, cd * 0.85]} />
                                <meshStandardMaterial color={crateColorsByFill[Math.floor(cSeed2 * crateColorsByFill.length)]} roughness={0.85} />
                            </mesh>
                        )}
                    </group>
                );
            })}
            {/* Utilization badge (data-driven only) */}
            {!ghost && zoneInventory && (
                <Html position={[obj.width / 2, 0.05, obj.depth + 0.15]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
                    <div style={{
                        fontSize: 8, fontWeight: 700, fontFamily: 'monospace',
                        color: fillPercent! > 80 ? '#fca5a5' : fillPercent! > 50 ? '#fcd34d' : '#86efac',
                        background: 'rgba(0,0,0,0.55)', padding: '1px 5px', borderRadius: 3,
                        whiteSpace: 'nowrap',
                    }}>
                        {zoneInventory.totalItems} items · {fillPercent!.toFixed(0)}%
                    </div>
                </Html>
            )}
            {/* Sign post */}
            {!ghost && (
                <group position={[obj.width / 2, 0, -0.15]}>
                    <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[0.04, 1.2, 0.04]} /><meshStandardMaterial color="#888" metalness={0.7} roughness={0.2} /></mesh>
                    <mesh position={[0, 1.25, 0]} castShadow><boxGeometry args={[Math.min(obj.width, 1.5), 0.35, 0.03]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} /></mesh>
                    <Html position={[0, 1.25, 0.02]} center style={{ pointerEvents: 'none' }} distanceFactor={12}>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: 11, fontFamily: 'system-ui', textShadow: '0 1px 3px rgba(0,0,0,0.6)', whiteSpace: 'nowrap' }}>
                            {obj.zoneType === 'cold' ? '❄️ ' : obj.zoneType === 'quarantine' ? '⚠️ ' : obj.zoneType === 'receiving' ? '📥 ' : obj.zoneType === 'shipping' ? '🚚 ' : obj.zoneType === 'picking' ? '🔍 ' : obj.zoneType === 'hazardous' ? '☣️ ' : obj.zoneType === 'staging' ? '📋 ' : obj.zoneType === 'climate_controlled' ? '🌡️ ' : obj.zoneType === 'storage' ? '📦 ' : ''}{obj.label || obj.zoneType || 'Zone'}
                        </div>
                    </Html>
                </group>
            )}
        </group>
    );
}

// ═══════════════════════════════════════════════════
// DUST PARTICLES — atmospheric depth
// ═══════════════════════════════════════════════════

function DustParticles({ count = 200, gridCells = 30 }: { count?: number; gridCells?: number }) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const seeds = useMemo(() => {
        const s = new Float32Array(count * 4); // x, y, z, speed
        for (let i = 0; i < count; i++) {
            s[i * 4] = Math.random() * gridCells;
            s[i * 4 + 1] = 0.5 + Math.random() * 5;
            s[i * 4 + 2] = Math.random() * gridCells;
            s[i * 4 + 3] = 0.02 + Math.random() * 0.06; // drift speed
        }
        return s;
    }, [count, gridCells]);

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        for (let i = 0; i < count; i++) {
            const ix = i * 4;
            // Gentle drift
            seeds[ix] += Math.sin(seeds[ix + 1] * 3 + seeds[ix] * 0.5) * delta * seeds[ix + 3] * 10;
            seeds[ix + 1] += Math.sin(seeds[ix] * 2.7) * delta * 0.02;
            seeds[ix + 2] += Math.cos(seeds[ix + 1] * 2.1 + seeds[ix + 2] * 0.3) * delta * seeds[ix + 3] * 10;
            // Wrap around
            if (seeds[ix] < -1) seeds[ix] = gridCells + 1;
            if (seeds[ix] > gridCells + 1) seeds[ix] = -1;
            if (seeds[ix + 2] < -1) seeds[ix + 2] = gridCells + 1;
            if (seeds[ix + 2] > gridCells + 1) seeds[ix + 2] = -1;

            dummy.position.set(seeds[ix], seeds[ix + 1], seeds[ix + 2]);
            dummy.scale.setScalar(0.015 + seeds[ix + 3] * 0.15);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
            <sphereGeometry args={[1, 4, 4]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.15} depthWrite={false} />
        </instancedMesh>
    );
}

function RackObject({ obj, selected, ghost, rackInventory, highlightBin, onShelfClick, stockAlert }: {
    obj: PlacedObject; selected: boolean; ghost?: boolean;
    rackInventory?: RackInventory; highlightBin?: string;
    onShelfClick?: (obj: PlacedObject, level: number, bin?: BinOccupancy) => void;
    stockAlert?: 'low' | 'overstock' | 'empty';
}) {
    const levels = obj.rackLevels || 3;
    const h = levels * 0.42 + 0.1;
    const rw = obj.width || 1;   // rack width in grid units
    const rd = obj.depth || 1;   // rack depth in grid units
    const hasData = rackInventory && rackInventory.bins.length > 0;
    const hasHighlightedBin = highlightBin ? rackInventory?.bins.some(b => b.binCode === highlightBin) : false;
    const dimmed = Boolean(highlightBin && !hasHighlightedBin);
    const uprightColor = dimmed ? '#2a3352' : '#4466aa';
    const beamColor = dimmed ? '#7a4418' : '#e87722';
    // Geometry dimensions scaled by rack size
    const cx = rw / 2;       // center X
    const cz = rd / 2;       // center Z
    const halfW = rw * 0.4;  // half-width of uprights spread
    const halfD = rd * 0.36; // half-depth of uprights spread
    const shelfW = rw * 0.8; // shelf board width
    const shelfD = rd * 0.68;// shelf board depth
    const beamW = rw * 0.84; // beam length

    const getShelfCargoColor = (bin: BinOccupancy) => {
        if (!bin.isOccupied || bin.currentItemCount === 0) return null; // empty
        const maxItems = bin.maxWeight || 20;
        const pct = (bin.currentItemCount / maxItems) * 100;
        if (pct > 80) return '#ef4444'; // red - nearly full
        if (pct > 50) return '#f59e0b'; // amber - half full
        return '#22c55e'; // green - light
    };

    // ═══════════════════════════════════════════════════
    // SMART CARGO GENERATOR
    // ═══════════════════════════════════════════════════
    const SmartCargo = ({ bin, shelfW, shelfD }: { bin: BinOccupancy, shelfW: number, shelfD: number }) => {
        if (!bin.items || bin.items.length === 0) {
            const pct = Math.min((bin.currentItemCount || 0) / (bin.maxWeight || 20), 1);
            const bw = (0.12 + pct * 0.2) * shelfW;
            const bh = 0.06 + pct * 0.14;
            const bd = 0.22 * shelfD;
            const color = getShelfCargoColor(bin) || '#777';
            return (
                <mesh position={[0, bh / 2 + 0.005, 0]}>
                    <boxGeometry args={[bw, bh, bd]} />
                    <meshStandardMaterial color={color} roughness={0.7} />
                </mesh>
            );
        }

        const seedRandom = (str: string) => {
            let h = 0; for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
            return () => { h = Math.imul(741103597, h); return ((h >>> 0) / 4294967296); };
        };

        const elements: React.ReactNode[] = [];
        let cx = -shelfW / 2 + 0.15;
        
        for (const item of bin.items) {
            const rand = seedRandom(item.name);
            const hue = Math.floor(rand() * 360);
            const boxColor = `hsl(${hue}, 40%, 60%)`;
            const numBoxes = Math.max(1, Math.min(4, Math.ceil(item.qty / 15)));
            
            for (let i = 0; i < numBoxes; i++) {
                const w = 0.15 + rand() * 0.15;
                const h = 0.15 + rand() * 0.2;
                const d = 0.2 + rand() * 0.15;

                if (cx + w / 2 > shelfW / 2 - 0.1) {
                    cx = -shelfW / 2 + 0.15; // Simple wrap to start
                }

                elements.push(
                    <group key={`${item.name}-${i}`} position={[cx + w / 2, h / 2 + 0.005, 0]}>
                        <mesh castShadow>
                            <boxGeometry args={[w, h, d]} />
                            <meshStandardMaterial color={boxColor} roughness={0.85} />
                        </mesh>
                        {/* Fake shipping label */}
                        <mesh position={[0, h * 0.1, d / 2 + 0.001]}>
                            <planeGeometry args={[w * 0.4, h * 0.3]} />
                            <meshBasicMaterial color="#ffffff" />
                        </mesh>
                        {/* Secondary label/tape */}
                        <mesh position={[-w * 0.15, -h * 0.2, d / 2 + 0.002]}>
                            <planeGeometry args={[w * 0.2, h * 0.1]} />
                            <meshBasicMaterial color={`hsl(${hue}, 60%, 30%)`} />
                        </mesh>
                    </group>
                );
                cx += w + 0.05;
            }
        }
        return <group>{elements}</group>;
    };

    return (
        <group position={[obj.x, 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Uprights */}
            {[[-halfW, -halfD], [halfW, -halfD], [-halfW, halfD], [halfW, halfD]].map(([px, pz], i) => (
                <mesh key={i} position={[px + cx, h / 2, pz + cz]} castShadow><boxGeometry args={[0.03, h, 0.03]} /><meshStandardMaterial color={uprightColor} metalness={0.7} roughness={0.2} transparent={ghost || dimmed} opacity={ghost ? 0.4 : dimmed ? 0.4 : 1} /></mesh>
            ))}
            {/* Beams + shelves + cargo */}
            {Array.from({ length: levels + 1 }, (_, l) => {
                const y = l * 0.42 + 0.05;
                const bin = hasData ? rackInventory.bins.find(b => b.level === l) : undefined;
                const isHighlighted = bin && highlightBin && bin.binCode === highlightBin;

                // Data-driven cargo
                let cargoElement = null;
                if (l < levels && !ghost && hasData && bin && bin.isOccupied) {
                    cargoElement = (
                        <group position={[cx, y + 0.02, cz]} onClick={(e) => { e.stopPropagation(); onShelfClick?.(obj, l, bin); }}>
                            <SmartCargo bin={bin} shelfW={shelfW} shelfD={shelfD} />
                        </group>
                    );
                }

                return (
                    <group key={l} scale={isHighlighted ? [1.1, 1.1, 1.1] : [1, 1, 1]}>
                        {[-halfD, halfD].map((pz, bi) => (
                            <mesh key={bi} position={[cx, y, pz + cz]}><boxGeometry args={[beamW, 0.04, 0.025]} /><meshStandardMaterial color={beamColor} metalness={0.4} transparent={ghost || dimmed} opacity={ghost ? 0.4 : dimmed ? 0.4 : 1} /></mesh>
                        ))}
                        {l < levels && <mesh position={[cx, y + 0.02, cz]}><boxGeometry args={[shelfW, 0.008, shelfD]} /><meshStandardMaterial color={isHighlighted ? '#fbbf24' : (dimmed ? '#444' : '#777')} metalness={0.5} transparent opacity={ghost ? 0.2 : dimmed ? 0.25 : (isHighlighted ? 0.85 : 0.5)} emissive={isHighlighted ? '#fbbf24' : '#000'} emissiveIntensity={isHighlighted ? 0.6 : 0} /></mesh>}
                        {cargoElement}
                        {/* Capacity fill bar under occupied shelf */}
                        {hasData && bin && !ghost && l < levels && bin.isOccupied && bin.currentItemCount > 0 && (() => {
                            const fillPct = Math.min(bin.currentItemCount / (bin.maxWeight || 20), 1);
                            const fillWidth = shelfW * fillPct;
                            const fillColor = fillPct > 0.8 ? '#ef4444' : fillPct > 0.5 ? '#f59e0b' : '#22c55e';
                            return (
                                <mesh position={[cx - shelfW / 2 + fillWidth / 2, y + 0.015, cz + halfD + 0.15]}>
                                    <boxGeometry args={[fillWidth, 0.006, 0.03]} />
                                    <meshStandardMaterial color={fillColor} emissive={fillColor} emissiveIntensity={0.3} />
                                </mesh>
                            );
                        })()}
                        {/* Highlight glow for searched bin */}
                        {isHighlighted && (
                            <mesh position={[cx, y + 0.12, cz]}>
                                <boxGeometry args={[shelfW * 1.1, 0.2, shelfD * 1.05]} />
                                <meshBasicMaterial color="#fbbf24" transparent opacity={0.25} />
                            </mesh>
                        )}
                        {/* Bin code label on shelf — with item names from item master */}
                        {hasData && bin && !ghost && l < levels && (
                            <Html position={[cx, y + 0.25, cz + halfD + 0.4]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
                                <div style={{
                                    fontSize: 7, fontWeight: 700, fontFamily: 'monospace',
                                    color: isHighlighted ? '#fbbf24' : '#aaa',
                                    background: isHighlighted ? 'rgba(251,191,36,0.15)' : 'rgba(0,0,0,0.4)',
                                    padding: '1px 4px', borderRadius: 3, whiteSpace: 'nowrap',
                                    border: isHighlighted ? '1px solid rgba(251,191,36,0.4)' : '1px solid transparent',
                                    maxWidth: 120,
                                }}>
                                    {bin.binCode}{bin.currentItemCount > 0 ? ` (${bin.currentItemCount})` : ''}
                                    {bin.items && bin.items.length > 0 && (
                                        <div style={{ fontSize: 6, color: '#6ee7b7', fontWeight: 600, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {bin.items.slice(0, 2).map((itm, ii) => (
                                                <div key={ii} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    📦 {itm.name.length > 16 ? itm.name.slice(0, 16) + '…' : itm.name} ×{itm.qty}
                                                </div>
                                            ))}
                                            {bin.items.length > 2 && <div style={{ color: '#9ca3af' }}>+{bin.items.length - 2} more</div>}
                                        </div>
                                    )}
                                </div>
                            </Html>
                        )}
                    </group>
                );
            })}
            {/* Foot plates */}
            {[[-halfW, -halfD], [halfW, -halfD], [-halfW, halfD], [halfW, halfD]].map(([px, pz], i) => (
                <mesh key={`f${i}`} position={[px + cx, 0.005, pz + cz]}><boxGeometry args={[0.08, 0.01, 0.08]} /><meshStandardMaterial color={dimmed ? '#333' : '#555'} metalness={0.6} transparent={ghost || dimmed} opacity={ghost ? 0.3 : dimmed ? 0.4 : 1} /></mesh>
            ))}
            {/* Selection glow */}
            {selected && <mesh position={[cx, h / 2, cz]}><boxGeometry args={[rw * 0.6 + 0.1, h + 0.1, rd * 0.5 + 0.1]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} /></mesh>}
            {/* Rack aisle/bay label */}
            {!ghost && obj.row && (
                <Html position={[cx, h + 0.15, cz]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
                    <div style={{
                        fontSize: 7, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                        color: dimmed ? '#555' : '#a5f3fc',
                        background: dimmed ? 'rgba(0,0,0,0.2)' : 'rgba(8,47,73,0.6)',
                        backdropFilter: 'blur(4px)',
                        padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                        border: `1px solid ${dimmed ? 'transparent' : 'rgba(34,211,238,0.4)'}`,
                        boxShadow: dimmed ? 'none' : '0 0 10px rgba(6,182,212,0.5), inset 0 0 5px rgba(6,182,212,0.3)',
                        textShadow: dimmed ? 'none' : '0 0 4px rgba(165,243,252,0.8)',
                        letterSpacing: 0.3,
                    }}>
                        {obj.row}{obj.bay ? `-${String(obj.bay).padStart(2, '0')}` : ''}
                    </div>
                </Html>
            )}
            {/* Item count pill for racks with inventory */}
            {!ghost && hasData && rackInventory && rackInventory.bins.some(b => b.currentItemCount > 0) && (
                <Html position={[cx, h + 0.35, cz]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
                    <div style={{
                        fontSize: 7, fontWeight: 700, fontFamily: 'monospace',
                        color: '#fff',
                        background: 'rgba(59,130,246,0.7)',
                        padding: '1px 5px', borderRadius: 8, whiteSpace: 'nowrap',
                        backdropFilter: 'blur(4px)',
                    }}>
                        📦 {rackInventory.bins.reduce((sum, b) => sum + b.currentItemCount, 0)}
                    </div>
                </Html>
            )}
            {/* Stock alert badge */}
            {!ghost && stockAlert && (
                <Html position={[cx, h + 0.4, cz]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
                    <div style={{
                        fontSize: 9, fontWeight: 800, fontFamily: 'system-ui',
                        color: stockAlert === 'low' ? '#fbbf24' : stockAlert === 'overstock' ? '#fff' : '#9ca3af',
                        background: stockAlert === 'low' ? 'rgba(251,191,36,0.2)'
                            : stockAlert === 'overstock' ? 'rgba(239,68,68,0.25)'
                            : 'rgba(100,100,100,0.2)',
                        backdropFilter: 'blur(8px)',
                        padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap',
                        border: `1px solid ${stockAlert === 'low' ? 'rgba(251,191,36,0.4)' : stockAlert === 'overstock' ? 'rgba(239,68,68,0.4)' : 'rgba(100,100,100,0.3)'}`,
                        boxShadow: stockAlert === 'overstock' ? '0 0 12px rgba(239,68,68,0.3)' : 'none',
                        animation: stockAlert !== 'empty' ? 'pulse 2s ease-in-out infinite' : 'none',
                        display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                        {stockAlert === 'low' ? '⚠️ Low' : stockAlert === 'overstock' ? '🔴 Over' : '○'}
                    </div>
                </Html>
            )}
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
    const rollerCount = Math.floor(w / 0.12);
    return (
        <group position={[obj.x, 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Frame */}
            <mesh position={[w / 2, 0.45, 0.3]} castShadow><boxGeometry args={[w, 0.04, 0.55]} /><meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.25} transparent={ghost} opacity={op} /></mesh>
            {/* Side rails */}
            {[0.05, 0.55].map((rz, i) => (
                <mesh key={i} position={[w / 2, 0.48, rz]} castShadow><boxGeometry args={[w, 0.06, 0.03]} /><meshStandardMaterial color="#475569" metalness={0.7} roughness={0.2} transparent={ghost} opacity={op} /></mesh>
            ))}
            {/* Animated Rollers */}
            {Array.from({ length: rollerCount }, (_, i) => (
                <AnimatedRoller key={`r${i}`} x={i * 0.12 + 0.1} ghost={ghost} op={op} />
            ))}
            {/* Legs */}
            {[[0.15, 0.1], [0.15, 0.5], [w - 0.15, 0.1], [w - 0.15, 0.5]].map(([lx, lz], i) => (
                <mesh key={`l${i}`} position={[lx, 0.22, lz]} castShadow><boxGeometry args={[0.04, 0.44, 0.04]} /><meshStandardMaterial color="#555" metalness={0.5} roughness={0.3} transparent={ghost} opacity={op} /></mesh>
            ))}
            {selected && <mesh position={[w / 2, 0.35, 0.3]}><boxGeometry args={[w + 0.1, 0.7, 0.7]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} /></mesh>}
        </group>
    );
}

// Animated roller that spins continuously
function AnimatedRoller({ x, ghost, op }: { x: number; ghost?: boolean; op: number }) {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((_, delta) => {
        if (ref.current && !ghost) {
            ref.current.rotation.x += delta * 3;
        }
    });
    return (
        <mesh ref={ref} position={[x, 0.47, 0.3]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 0.45, 8]} />
            <meshStandardMaterial color="#b0b0b0" metalness={0.8} roughness={0.15} transparent={ghost} opacity={op} />
        </mesh>
    );
}

function ForkliftObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const op = ghost ? 0.3 : 1;
    const beaconRef = useRef<THREE.Group>(null);
    useFrame((_, delta) => {
        if (beaconRef.current && !ghost) beaconRef.current.rotation.y += delta * 4;
    });
    return (
        <group position={[obj.x + 0.5, 0, obj.z + 0.5]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Body */}
            <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[0.5, 0.4, 0.7]} /><meshStandardMaterial color="#eab308" roughness={0.5} metalness={0.15} transparent={ghost} opacity={op} /></mesh>
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
            {/* Rotating amber warning beacon */}
            {!ghost && (
                <group ref={beaconRef} position={[0, 0.76, -0.05]}>
                    <mesh><cylinderGeometry args={[0.035, 0.04, 0.06, 8]} /><meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} /></mesh>
                    <mesh position={[0.04, 0, 0]}><boxGeometry args={[0.04, 0.03, 0.015]} /><meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.2} /></mesh>
                    <pointLight color="#f59e0b" intensity={0.3} distance={2} />
                </group>
            )}
            {selected && <mesh position={[0, 0.4, 0.1]}><boxGeometry args={[0.7, 1, 1.2]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} /></mesh>}
        </group>
    );
}

// ═══════════════════════════════════════════════════
// NEW EQUIPMENT OBJECTS
// ═══════════════════════════════════════════════════

function AGVObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const op = ghost ? 0.4 : 1;
    const pulseRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (!ghost && pulseRef.current) {
            (pulseRef.current.material as THREE.Material).opacity = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.5;
        }
    });
    return (
        <group position={[obj.x + 0.5, 0, obj.z + 0.5]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Chassis */}
            <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[0.8, 0.15, 0.6]} /><meshStandardMaterial color="#334155" transparent={ghost} opacity={op} roughness={0.6} metalness={0.4} /></mesh>
            {/* Sensor dome */}
            <mesh position={[0.3, 0.22, 0]}><cylinderGeometry args={[0.08, 0.08, 0.08, 16]} /><meshStandardMaterial color="#94a3b8" transparent={ghost} opacity={op} /></mesh>
            {/* Status light */}
            <mesh ref={pulseRef} position={[0.3, 0.28, 0]}><sphereGeometry args={[0.04, 16, 16]} /><meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={1} transparent /></mesh>
            {/* Wheels */}
            {[[-0.25, -0.3], [0.25, -0.3], [-0.25, 0.3], [0.25, 0.3]].map(([wx, wz], i) => (
                <mesh key={`w${i}`} position={[wx, 0.06, wz]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
                    <meshStandardMaterial color="#1e293b" transparent={ghost} opacity={op} />
                </mesh>
            ))}
            {selected && <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.9, 0.3, 0.7]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} /></mesh>}
        </group>
    );
}

function ChargingStationObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const op = ghost ? 0.4 : 1;
    return (
        <group position={[obj.x + 0.5, 0, obj.z + 0.5]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Base Pad */}
            <mesh position={[0, 0.02, 0]} receiveShadow><boxGeometry args={[1.2, 0.04, 1.2]} /><meshStandardMaterial color="#475569" transparent={ghost} opacity={op} /></mesh>
            {/* Charger Column */}
            <mesh position={[-0.4, 0.6, 0]} castShadow><boxGeometry args={[0.2, 1.2, 0.4]} /><meshStandardMaterial color="#3b82f6" transparent={ghost} opacity={op} /></mesh>
            {/* Screen */}
            <mesh position={[-0.29, 0.8, 0]} rotation={[0, 0, -0.1]}><boxGeometry args={[0.02, 0.2, 0.25]} /><meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={ghost ? 0 : 0.5} transparent={ghost} opacity={op} /></mesh>
            {/* Charge contacts */}
            <mesh position={[-0.25, 0.1, 0]}><boxGeometry args={[0.1, 0.05, 0.2]} /><meshStandardMaterial color="#eab308" metalness={0.8} roughness={0.2} transparent={ghost} opacity={op} /></mesh>
            {selected && <mesh position={[0, 0.6, 0]}><boxGeometry args={[1.3, 1.2, 1.3]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} /></mesh>}
        </group>
    );
}

function IndustrialFanObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const op = ghost ? 0.4 : 1;
    const bladesRef = useRef<THREE.Group>(null);
    useFrame((_, delta) => {
        if (!ghost && bladesRef.current) bladesRef.current.rotation.y += delta * 5;
    });
    return (
        <group position={[obj.x + 0.5, 0, obj.z + 0.5]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Base stand */}
            <mesh position={[0, 0.05, 0]} castShadow><cylinderGeometry args={[0.3, 0.4, 0.1, 16]} /><meshStandardMaterial color="#1e293b" transparent={ghost} opacity={op} /></mesh>
            {/* Pole */}
            <mesh position={[0, 1.0, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, 2.0, 8]} /><meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.5} transparent={ghost} opacity={op} /></mesh>
            {/* Motor housing */}
            <mesh position={[0, 2.0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.15, 0.15, 0.3, 16]} /><meshStandardMaterial color="#334155" transparent={ghost} opacity={op} /></mesh>
            {/* Blades */}
            <group ref={bladesRef} position={[0, 2.0, 0.18]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.1, 16]} /><meshStandardMaterial color="#94a3b8" transparent={ghost} opacity={op} /></mesh>
                {[0, 1, 2, 3].map(i => (
                    <mesh key={i} rotation={[0, 0, i * (Math.PI / 2)]} position={[0, 0, 0]}>
                        <mesh position={[0, 0.35, 0]} rotation={[0.2, 0, 0]}>
                            <boxGeometry args={[0.1, 0.6, 0.02]} />
                            <meshStandardMaterial color="#cbd5e1" metalness={0.2} roughness={0.5} transparent={ghost} opacity={op} />
                        </mesh>
                    </mesh>
                ))}
            </group>
            {/* Fan Cage */}
            <mesh position={[0, 2.0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.8, 0.8, 0.1, 32, 1, true]} />
                <meshStandardMaterial color="#64748b" wireframe transparent={ghost} opacity={op ? 0.5 : 0.2} />
            </mesh>
            {selected && <mesh position={[0, 1.0, 0]}><boxGeometry args={[1.7, 2.8, 0.8]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} /></mesh>}
        </group>
    );
}

function SecurityCameraObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const op = ghost ? 0.4 : 1;
    const sweepRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (!ghost && sweepRef.current) {
            sweepRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.6;
        }
    });
    return (
        <group position={[obj.x + 0.5, 0, obj.z + 0.5]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Pole (assuming it's pole mounted for now) */}
            <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[0.04, 0.05, 3.0, 8]} /><meshStandardMaterial color="#475569" transparent={ghost} opacity={op} /></mesh>
            {/* Mount bracket */}
            <mesh position={[0, 2.9, 0.1]}><boxGeometry args={[0.05, 0.1, 0.2]} /><meshStandardMaterial color="#1e293b" transparent={ghost} opacity={op} /></mesh>
            {/* Camera Body sweeping */}
            <group position={[0, 2.9, 0.2]} ref={sweepRef}>
                <mesh castShadow><boxGeometry args={[0.15, 0.15, 0.3]} /><meshStandardMaterial color="#f8fafc" transparent={ghost} opacity={op} /></mesh>
                {/* Lens */}
                <mesh position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.02, 16]} /><meshStandardMaterial color="#0f172a" transparent={ghost} opacity={op} /></mesh>
                {/* Red recording LED */}
                <mesh position={[0.05, 0.05, 0.16]}><sphereGeometry args={[0.01, 8, 8]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={ghost ? 0 : 1} transparent={ghost} opacity={op} /></mesh>
                {/* View cone (visual) */}
                {!ghost && selected && (
                    <mesh position={[0, 0, 1.5]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[1.5, 0.05, 3, 16, 1, true]} />
                        <meshBasicMaterial color="#ef4444" transparent opacity={0.1} side={THREE.DoubleSide} />
                    </mesh>
                )}
            </group>
            {selected && <mesh position={[0, 1.5, 0]}><boxGeometry args={[0.4, 3, 0.4]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} /></mesh>}
        </group>
    );
}

function ShippingContainerObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const op = ghost ? 0.4 : 1;
    const w = obj.width || 2;
    const d = obj.depth || 4;
    return (
        <group position={[obj.x + w/2, 0, obj.z + d/2]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Main body */}
            <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
                <boxGeometry args={[w - 0.05, 2.5, d - 0.05]} />
                <meshStandardMaterial color={obj.color || '#0ea5e9'} roughness={0.7} metalness={0.2} transparent={ghost} opacity={op} />
            </mesh>
            {/* Corrugated vertical lines (simplified as multiple thin boxes) */}
            {Array.from({ length: Math.floor(d * 2) }).map((_, i) => (
                <mesh key={`c${i}`} position={[(w - 0.02) / 2, 1.25, -d/2 + 0.25 + i * 0.5]}>
                    <boxGeometry args={[0.04, 2.4, 0.2]} />
                    <meshStandardMaterial color={obj.color || '#0ea5e9'} roughness={0.8} transparent={ghost} opacity={op} />
                </mesh>
            ))}
            {Array.from({ length: Math.floor(d * 2) }).map((_, i) => (
                <mesh key={`c2_${i}`} position={[-(w - 0.02) / 2, 1.25, -d/2 + 0.25 + i * 0.5]}>
                    <boxGeometry args={[0.04, 2.4, 0.2]} />
                    <meshStandardMaterial color={obj.color || '#0ea5e9'} roughness={0.8} transparent={ghost} opacity={op} />
                </mesh>
            ))}
            {/* Doors on front */}
            <mesh position={[0, 1.25, d/2]}><boxGeometry args={[w - 0.1, 2.4, 0.06]} /><meshStandardMaterial color={obj.color || '#0ea5e9'} roughness={0.6} transparent={ghost} opacity={op} /></mesh>
            {/* Door locking bars */}
            {[[-0.4, 0.04], [-0.15, 0.04], [0.15, 0.04], [0.4, 0.04]].map(([bx, bz], i) => (
                <mesh key={`b${i}`} position={[bx, 1.25, d/2 + bz]}><cylinderGeometry args={[0.02, 0.02, 2.3, 8]} /><meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.4} transparent={ghost} opacity={op} /></mesh>
            ))}
            {selected && <mesh position={[0, 1.25, 0]}><boxGeometry args={[w + 0.1, 2.6, d + 0.1]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} /></mesh>}
        </group>
    );
}

function SafetyBarrierObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const op = ghost ? 0.4 : 1;
    const w = obj.width || 2;
    return (
        <group position={[obj.x + w/2, 0, obj.z + 0.5]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Posts */}
            <mesh position={[-w/2 + 0.1, 0.5, 0]} castShadow><cylinderGeometry args={[0.08, 0.1, 1.0, 12]} /><meshStandardMaterial color="#eab308" transparent={ghost} opacity={op} /></mesh>
            <mesh position={[w/2 - 0.1, 0.5, 0]} castShadow><cylinderGeometry args={[0.08, 0.1, 1.0, 12]} /><meshStandardMaterial color="#eab308" transparent={ghost} opacity={op} /></mesh>
            {/* Horizontal rails */}
            <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[w, 0.15, 0.05]} /><meshStandardMaterial color="#eab308" transparent={ghost} opacity={op} /></mesh>
            <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[w, 0.15, 0.05]} /><meshStandardMaterial color="#eab308" transparent={ghost} opacity={op} /></mesh>
            {/* Black stripes on rails */}
            {Array.from({ length: Math.floor(w / 0.4) }).map((_, i) => (
                <group key={`stripe${i}`} position={[-w/2 + 0.3 + i * 0.4, 0.6, 0]}>
                    <mesh position={[0, 0.2, 0]} rotation={[0, 0, 0.3]}><boxGeometry args={[0.1, 0.18, 0.06]} /><meshStandardMaterial color="#1e293b" transparent={ghost} opacity={op} /></mesh>
                    <mesh position={[0, -0.2, 0]} rotation={[0, 0, 0.3]}><boxGeometry args={[0.1, 0.18, 0.06]} /><meshStandardMaterial color="#1e293b" transparent={ghost} opacity={op} /></mesh>
                </group>
            ))}
            {selected && <mesh position={[0, 0.5, 0]}><boxGeometry args={[w + 0.2, 1.1, 0.4]} /><meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} /></mesh>}
        </group>
    );
}

// ═══════════════════════════════════════════════════
// OBJECT RENDERER
// ═══════════════════════════════════════════════════

function PlacedObjectRenderer({ obj, selected, ghost, rackInventoryMap, zoneInventoryMap, highlightBin, onShelfClick, stockAlerts }: {
    obj: PlacedObject; selected: boolean; ghost?: boolean;
    rackInventoryMap?: Map<string, RackInventory>; zoneInventoryMap?: Map<string, ZoneInventory>;
    highlightBin?: string;
    onShelfClick?: (obj: PlacedObject, level: number, bin?: BinOccupancy) => void;
    stockAlerts?: Map<string, 'low' | 'overstock' | 'empty'>;
}) {
    switch (obj.type) {
        case 'zone': return <ZoneObject obj={obj} selected={selected} ghost={ghost} zoneInventory={zoneInventoryMap?.get(obj.linkedZoneId || obj.id)} />;
        case 'rack': return <RackObject obj={obj} selected={selected} ghost={ghost}
            rackInventory={rackInventoryMap?.get(obj.id)} highlightBin={highlightBin} onShelfClick={onShelfClick}
            stockAlert={stockAlerts?.get(obj.id)} />;
        case 'wall': return <WallObject obj={obj} selected={selected} ghost={ghost} />;
        case 'door': return <DoorObject obj={obj} selected={selected} ghost={ghost} />;
        case 'pallet': return <PalletObject obj={obj} selected={selected} ghost={ghost} />;
        case 'bollard': return <BollardObject obj={obj} selected={selected} ghost={ghost} />;
        case 'workstation': return <WorkstationObject obj={obj} selected={selected} ghost={ghost} />;
        case 'conveyor': return <ConveyorObject obj={obj} selected={selected} ghost={ghost} />;
        case 'forklift': return <ForkliftObject obj={obj} selected={selected} ghost={ghost} />;
        case 'platform': return <PlatformObject obj={obj} selected={selected} ghost={ghost} />;
        case 'stairs': return <StairsObject obj={obj} selected={selected} ghost={ghost} />;
        case 'robot_agv': return <AGVObject obj={obj} selected={selected} ghost={ghost} />;
        case 'charging_station': return <ChargingStationObject obj={obj} selected={selected} ghost={ghost} />;
        case 'industrial_fan': return <IndustrialFanObject obj={obj} selected={selected} ghost={ghost} />;
        case 'security_camera': return <SecurityCameraObject obj={obj} selected={selected} ghost={ghost} />;
        case 'shipping_container': return <ShippingContainerObject obj={obj} selected={selected} ghost={ghost} />;
        case 'safety_barrier': return <SafetyBarrierObject obj={obj} selected={selected} ghost={ghost} />;
        case 'tree': return <TreeObject obj={obj} selected={selected} ghost={ghost} />;
        case 'shrub': return <ShrubObject obj={obj} selected={selected} ghost={ghost} />;
        case 'road': return <RoadObject obj={obj} selected={selected} ghost={ghost} />;
        case 'fence': return <FenceObject obj={obj} selected={selected} ghost={ghost} />;
        case 'truck': return <TruckObject obj={obj} selected={selected} ghost={ghost} />;
        case 'custom_model': return <CustomModelObject obj={obj} selected={selected} ghost={ghost} />;
        default: return null;
    }
}

// --- NEW RENDERERS ---

function SelectionHighlight({ w, d, h = 1 }: { w: number, d: number, h?: number }) {
    return (
        <mesh position={[w/2, h/2, d/2]}>
            <boxGeometry args={[w + 0.1, h + 0.1, d + 0.1]} />
            <meshBasicMaterial color="#fff" wireframe transparent opacity={0.3} />
        </mesh>
    );
}

function TreeObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const w = obj.width || 2;
    const color = obj.color || '#22c55e';
    const trunkH = w * 0.8;
    return (
        <group position={[obj.x, obj.y || 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            <mesh position={[w/2, trunkH/2, w/2]} castShadow receiveShadow>
                <cylinderGeometry args={[w*0.1, w*0.15, trunkH, 8]} />
                <meshStandardMaterial color="#8B5A2B" transparent opacity={ghost ? 0.3 : 1} />
            </mesh>
            <mesh position={[w/2, trunkH + w*0.5, w/2]} castShadow receiveShadow>
                <sphereGeometry args={[w*0.8, 16, 16]} />
                <meshStandardMaterial color={color} transparent opacity={ghost ? 0.3 : 0.9} roughness={0.8} />
            </mesh>
            {selected && <SelectionHighlight w={w} d={w} />}
        </group>
    );
}

function ShrubObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const w = obj.width || 1;
    const color = obj.color || '#16a34a';
    return (
        <group position={[obj.x, obj.y || 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            <mesh position={[w/2, w*0.4, w/2]} castShadow receiveShadow>
                <sphereGeometry args={[w*0.6, 12, 12]} />
                <meshStandardMaterial color={color} transparent opacity={ghost ? 0.3 : 0.9} roughness={0.9} />
            </mesh>
            {selected && <SelectionHighlight w={w} d={w} />}
        </group>
    );
}

function RoadObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const w = obj.width || 4;
    const d = obj.depth || 4;
    const color = obj.color || '#334155';
    return (
        <group position={[obj.x, (obj.y || 0) + 0.02, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            <mesh position={[w/2, 0, d/2]} receiveShadow>
                <boxGeometry args={[w, 0.02, d]} />
                <meshStandardMaterial color={color} transparent opacity={ghost ? 0.4 : 1} roughness={0.9} />
            </mesh>
            {/* Road markings */}
            <mesh position={[w/2, 0.02, d/2]}>
                <boxGeometry args={[0.2, 0.01, d * 0.8]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={ghost ? 0.2 : 0.6} />
            </mesh>
            {selected && <SelectionHighlight w={w} d={d} />}
        </group>
    );
}

function FenceObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const w = obj.width || 4;
    const d = obj.depth || 1;
    const color = obj.color || '#94a3b8';
    return (
        <group position={[obj.x, obj.y || 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Posts */}
            <mesh position={[0.1, 1, d/2]} castShadow><cylinderGeometry args={[0.05, 0.05, 2]} /><meshStandardMaterial color={color} metalness={0.5} transparent opacity={ghost ? 0.4 : 1}/></mesh>
            <mesh position={[w-0.1, 1, d/2]} castShadow><cylinderGeometry args={[0.05, 0.05, 2]} /><meshStandardMaterial color={color} metalness={0.5} transparent opacity={ghost ? 0.4 : 1}/></mesh>
            {/* Mesh */}
            <mesh position={[w/2, 1, d/2]} castShadow receiveShadow>
                <boxGeometry args={[w, 2, 0.02]} />
                <meshStandardMaterial color={color} transparent opacity={ghost ? 0.2 : 0.4} wireframe />
            </mesh>
            {selected && <SelectionHighlight w={w} d={d} />}
        </group>
    );
}

function TruckObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const w = obj.width || 2;
    const d = obj.depth || 5;
    const color = obj.color || '#ef4444';
    return (
        <group position={[obj.x, obj.y || 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Cab */}
            <mesh position={[w/2, 1, d * 0.15]} castShadow>
                <boxGeometry args={[w*0.9, 2, d*0.3]} />
                <meshStandardMaterial color={color} transparent opacity={ghost ? 0.4 : 1} roughness={0.3} />
            </mesh>
            {/* Trailer */}
            <mesh position={[w/2, 1.5, d * 0.65]} castShadow>
                <boxGeometry args={[w, 3, d*0.7]} />
                <meshStandardMaterial color="#f8fafc" transparent opacity={ghost ? 0.4 : 1} roughness={0.5} />
            </mesh>
            {/* Wheels */}
            <mesh position={[w*0.1, 0.4, d*0.2]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.4,0.4,0.3]} /><meshStandardMaterial color="#1e293b" /></mesh>
            <mesh position={[w*0.9, 0.4, d*0.2]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.4,0.4,0.3]} /><meshStandardMaterial color="#1e293b" /></mesh>
            <mesh position={[w*0.1, 0.4, d*0.8]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.4,0.4,0.3]} /><meshStandardMaterial color="#1e293b" /></mesh>
            <mesh position={[w*0.9, 0.4, d*0.8]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.4,0.4,0.3]} /><meshStandardMaterial color="#1e293b" /></mesh>
            {selected && <SelectionHighlight w={w} d={d} />}
        </group>
    );
}

function CustomModelObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const w = obj.width || 2;
    const d = obj.depth || 2;
    const { useGLTF } = require('@react-three/drei');
    
    // We use a small inline component for Suspense fallback if needed, but useGLTF caches it.
    let model = null;
    try {
        if (obj.modelUrl) {
            // Suspense will catch this during render. The parent WarehouseScene is wrapped in Suspense.
            const gltf = useGLTF(obj.modelUrl);
            if (gltf && gltf.scene) {
                // Clone the scene so we can reuse the same model URL multiple times
                model = <primitive object={gltf.scene.clone()} position={[w/2, 0, d/2]} />;
            }
        }
    } catch (e) {
        console.error("Failed to load custom GLTF model:", obj.modelUrl, e);
    }

    return (
        <group position={[obj.x, obj.y || 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {model ? (
                <group scale={[1, 1, 1]}>
                    {model}
                </group>
            ) : (
                <mesh position={[w/2, 1, d/2]} castShadow receiveShadow>
                    <boxGeometry args={[w, 2, d]} />
                    <meshStandardMaterial color={obj.color || '#a855f7'} transparent opacity={ghost ? 0.3 : 0.8} wireframe />
                </mesh>
            )}
            
            {!model && (
                <Html position={[w/2, 2.5, d/2]} center style={{ pointerEvents: 'none' }}>
                    <div style={{ background: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: 10, whiteSpace: 'nowrap' }}>
                        Custom Model
                    </div>
                </Html>
            )}
            {selected && <SelectionHighlight w={w} d={d} />}
        </group>
    );
}

function PlatformObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const w = obj.width || 4;
    const d = obj.depth || 4;
    return (
        <group position={[obj.x, 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {/* Platform Floor */}
            <mesh position={[w / 2, -0.05, d / 2]} receiveShadow castShadow>
                <boxGeometry args={[w, 0.1, d]} />
                <meshStandardMaterial color={obj.color || '#64748b'} transparent opacity={ghost ? 0.3 : 0.75} roughness={0.3} metalness={0.2} />
            </mesh>
            {/* Support Pillars */}
            <mesh position={[0.1, -1.75, 0.1]}><boxGeometry args={[0.2, 3.5, 0.2]} /><meshStandardMaterial color="#475569" /></mesh>
            <mesh position={[w - 0.1, -1.75, 0.1]}><boxGeometry args={[0.2, 3.5, 0.2]} /><meshStandardMaterial color="#475569" /></mesh>
            <mesh position={[0.1, -1.75, d - 0.1]}><boxGeometry args={[0.2, 3.5, 0.2]} /><meshStandardMaterial color="#475569" /></mesh>
            <mesh position={[w - 0.1, -1.75, d - 0.1]}><boxGeometry args={[0.2, 3.5, 0.2]} /><meshStandardMaterial color="#475569" /></mesh>
            {/* Guard Rails */}
            <mesh position={[w / 2, 0.5, 0.05]}><boxGeometry args={[w, 0.05, 0.1]} /><meshStandardMaterial color="#eab308" /></mesh>
            <mesh position={[w / 2, 0.5, d - 0.05]}><boxGeometry args={[w, 0.05, 0.1]} /><meshStandardMaterial color="#eab308" /></mesh>
            <mesh position={[0.05, 0.5, d / 2]}><boxGeometry args={[0.1, 0.05, d]} /><meshStandardMaterial color="#eab308" /></mesh>
            <mesh position={[w - 0.05, 0.5, d / 2]}><boxGeometry args={[0.1, 0.05, d]} /><meshStandardMaterial color="#eab308" /></mesh>
            {/* Selection highlight */}
            {selected && <mesh position={[w / 2, 0, d / 2]}><boxGeometry args={[w + 0.1, 0.12, d + 0.1]} /><meshBasicMaterial color="#3b82f6" wireframe /></mesh>}
        </group>
    );
}

function StairsObject({ obj, selected, ghost }: { obj: PlacedObject; selected: boolean; ghost?: boolean }) {
    const w = obj.width || 1;
    const d = obj.depth || 2;
    const steps = 10;
    const stepDepth = d / steps;
    const stepHeight = 3.5 / steps;
    return (
        <group position={[obj.x, 0, obj.z]} rotation={[0, (obj.rotation * Math.PI) / 180, 0]}>
            {Array.from({ length: steps }).map((_, i) => (
                <mesh key={i} position={[w / 2, -3.5 + (i * stepHeight) + stepHeight / 2, (i * stepDepth) + stepDepth / 2]} castShadow receiveShadow>
                    <boxGeometry args={[w, stepHeight, stepDepth]} />
                    <meshStandardMaterial color="#475569" transparent={ghost} opacity={ghost ? 0.3 : 1} />
                </mesh>
            ))}
            {/* Railing */}
            <mesh position={[0.05, -1.75 + 0.5, d / 2]} rotation={[-Math.atan2(3.5, d), 0, 0]}>
                <boxGeometry args={[0.1, 0.05, Math.hypot(d, 3.5)]} />
                <meshStandardMaterial color="#eab308" />
            </mesh>
            <mesh position={[w - 0.05, -1.75 + 0.5, d / 2]} rotation={[-Math.atan2(3.5, d), 0, 0]}>
                <boxGeometry args={[0.1, 0.05, Math.hypot(d, 3.5)]} />
                <meshStandardMaterial color="#eab308" />
            </mesh>
            {selected && <mesh position={[w / 2, -1.75, d / 2]}><boxGeometry args={[w + 0.1, 3.6, d + 0.1]} /><meshBasicMaterial color="#3b82f6" wireframe /></mesh>}
        </group>
    );
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
    const columnColor = dark ? '#5a6070' : '#8890a0';
    const corrugateColor = dark ? '#6a7080' : '#bec4cc';
    const corrugateColorAlt = dark ? '#5e6678' : '#b0b8c4';
    const jointColor = dark ? '#22252e' : '#a8aeb8';
    const exitGreen = '#22c55e';
    const skylightColor = dark ? '#1a2a40' : '#d8e8f8';
    const apronColor = dark ? '#242830' : '#b8bcc0';
    return (
        <group>
            {/* ═══ FLOOR — industrial concrete with expansion joints ═══ */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, -0.01, d / 2]} receiveShadow>
                <planeGeometry args={[w + 4, d + 4]} />
                <meshStandardMaterial color={floorColor} metalness={0.05} roughness={0.92} />
            </mesh>
            {/* Epoxy shine layer */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0.001, d / 2]}>
                <planeGeometry args={[w + 1, d + 1]} />
                <meshStandardMaterial color={floorShine} metalness={0.35} roughness={0.5} transparent opacity={0.25} />
            </mesh>
            {/* Expansion joints (horizontal & vertical) */}
            {Array.from({ length: Math.ceil(w / 4) + 1 }, (_, i) => (
                <mesh key={`ej-h${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[i * 4, 0.005, d / 2]}>
                    <planeGeometry args={[0.02, d + 2]} />
                    <meshStandardMaterial color={jointColor} transparent opacity={0.6} />
                </mesh>
            ))}
            {Array.from({ length: Math.ceil(d / 4) + 1 }, (_, i) => (
                <mesh key={`ej-v${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0.005, i * 4]}>
                    <planeGeometry args={[w + 2, 0.02]} />
                    <meshStandardMaterial color={jointColor} transparent opacity={0.6} />
                </mesh>
            ))}
            {/* Anti-slip yellow walkway lines */}
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
            {/* Pedestrian crossing stripes near doors */}
            {Array.from({ length: 5 }, (_, i) => (
                <mesh key={`xwalk${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[w / 2 - 1 + i * 0.5, 0.009, 0.8]}>
                    <planeGeometry args={[0.3, 0.6]} />
                    <meshStandardMaterial color="#fff" transparent opacity={0.35} />
                </mesh>
            ))}

            {/* ═══ WALLS — corrugated metal panels ═══ */}
            {/* Main walls (semi-transparent) */}
            <mesh position={[w / 2, h / 2, -0.1]}><boxGeometry args={[w + 0.4, h, 0.15]} /><meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.1} transparent opacity={dark ? 0.35 : 0.25} /></mesh>
            <mesh position={[-0.1, h / 2, d / 2]}><boxGeometry args={[0.15, h, d + 0.4]} /><meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.1} transparent opacity={dark ? 0.35 : 0.25} /></mesh>
            <mesh position={[w + 0.1, h / 2, d / 2]}><boxGeometry args={[0.15, h, d + 0.4]} /><meshStandardMaterial color={wallColor} roughness={0.8} metalness={0.1} transparent opacity={dark ? 0.35 : 0.25} /></mesh>
            <mesh position={[w / 2, h / 2, d + 0.1]}><boxGeometry args={[w + 0.4, h, 0.15]} /><meshStandardMaterial color={wallBack} roughness={0.8} metalness={0.1} transparent opacity={dark ? 0.35 : 0.25} /></mesh>
            {/* Corrugated grooves on side walls */}
            {Array.from({ length: Math.ceil(h / 0.4) }, (_, i) => (
                <group key={`corr-l-${i}`}>
                    <mesh position={[-0.17, i * 0.4 + 0.2, d / 2]}><boxGeometry args={[0.02, 0.06, d + 0.3]} /><meshStandardMaterial color={i % 2 ? corrugateColor : corrugateColorAlt} metalness={0.4} roughness={0.5} transparent opacity={dark ? 0.5 : 0.35} /></mesh>
                    <mesh position={[w + 0.17, i * 0.4 + 0.2, d / 2]}><boxGeometry args={[0.02, 0.06, d + 0.3]} /><meshStandardMaterial color={i % 2 ? corrugateColor : corrugateColorAlt} metalness={0.4} roughness={0.5} transparent opacity={dark ? 0.5 : 0.35} /></mesh>
                </group>
            ))}
            {/* Corrugated grooves on front/back */}
            {Array.from({ length: Math.ceil(h / 0.4) }, (_, i) => (
                <group key={`corr-fb-${i}`}>
                    <mesh position={[w / 2, i * 0.4 + 0.2, -0.17]}><boxGeometry args={[w + 0.3, 0.06, 0.02]} /><meshStandardMaterial color={i % 2 ? corrugateColor : corrugateColorAlt} metalness={0.4} roughness={0.5} transparent opacity={dark ? 0.5 : 0.35} /></mesh>
                    <mesh position={[w / 2, i * 0.4 + 0.2, d + 0.17]}><boxGeometry args={[w + 0.3, 0.06, 0.02]} /><meshStandardMaterial color={i % 2 ? corrugateColor : corrugateColorAlt} metalness={0.4} roughness={0.5} transparent opacity={dark ? 0.5 : 0.35} /></mesh>
                </group>
            ))}
            {/* Wall base stripe (darker, thicker) */}
            {[
                [w / 2, 0.3, -0.12, w + 0.5, 0.6, 0.12],
                [w / 2, 0.3, d + 0.12, w + 0.5, 0.6, 0.12],
                [-0.12, 0.3, d / 2, 0.12, 0.6, d + 0.5],
                [w + 0.12, 0.3, d / 2, 0.12, 0.6, d + 0.5],
            ].map(([x, y, z, bw, bh, bd], i) => (
                <mesh key={`base${i}`} position={[x, y, z]}><boxGeometry args={[bw, bh, bd]} /><meshStandardMaterial color={wallBase} roughness={0.9} transparent opacity={0.6} /></mesh>
            ))}

            {/* ═══ STEEL I-BEAM COLUMNS ═══ */}
            {Array.from({ length: Math.ceil(w / 5) + 1 }, (_, i) => {
                const cx = Math.min(i * 5, w);
                return (
                    <group key={`col-front-${i}`}>
                        {/* Front wall columns */}
                        <mesh position={[cx, h / 2, -0.05]}><boxGeometry args={[0.12, h, 0.12]} /><meshStandardMaterial color={columnColor} metalness={0.7} roughness={0.25} /></mesh>
                        <mesh position={[cx, h / 2, -0.05]}><boxGeometry args={[0.2, h, 0.03]} /><meshStandardMaterial color={columnColor} metalness={0.6} roughness={0.3} /></mesh>
                        {/* Back wall columns */}
                        <mesh position={[cx, h / 2, d + 0.05]}><boxGeometry args={[0.12, h, 0.12]} /><meshStandardMaterial color={columnColor} metalness={0.7} roughness={0.25} /></mesh>
                        <mesh position={[cx, h / 2, d + 0.05]}><boxGeometry args={[0.2, h, 0.03]} /><meshStandardMaterial color={columnColor} metalness={0.6} roughness={0.3} /></mesh>
                    </group>
                );
            })}
            {Array.from({ length: Math.ceil(d / 5) + 1 }, (_, i) => {
                const cz = Math.min(i * 5, d);
                return (
                    <group key={`col-side-${i}`}>
                        {/* Left wall columns */}
                        <mesh position={[-0.05, h / 2, cz]}><boxGeometry args={[0.12, h, 0.12]} /><meshStandardMaterial color={columnColor} metalness={0.7} roughness={0.25} /></mesh>
                        <mesh position={[-0.05, h / 2, cz]}><boxGeometry args={[0.03, h, 0.2]} /><meshStandardMaterial color={columnColor} metalness={0.6} roughness={0.3} /></mesh>
                        {/* Right wall columns */}
                        <mesh position={[w + 0.05, h / 2, cz]}><boxGeometry args={[0.12, h, 0.12]} /><meshStandardMaterial color={columnColor} metalness={0.7} roughness={0.25} /></mesh>
                        <mesh position={[w + 0.05, h / 2, cz]}><boxGeometry args={[0.03, h, 0.2]} /><meshStandardMaterial color={columnColor} metalness={0.6} roughness={0.3} /></mesh>
                    </group>
                );
            })}

            {/* ═══ ROOF TRUSSES — steel I-beams ═══ */}
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

            {/* ═══ SKYLIGHTS — translucent roof panels ═══ */}
            {Array.from({ length: Math.ceil(w / 6) }, (_, xi) =>
                Array.from({ length: Math.ceil(d / 8) }, (_, zi) => (
                    <group key={`sky-${xi}-${zi}`} position={[xi * 6 + 3, h - 0.02, zi * 8 + 4]}>
                        <mesh><boxGeometry args={[2, 0.03, 1.2]} /><meshStandardMaterial color={skylightColor} transparent opacity={0.3} metalness={0.1} roughness={0.2} /></mesh>
                        {/* Skylight frame */}
                        <mesh position={[0, 0, 0.62]}><boxGeometry args={[2.1, 0.05, 0.04]} /><meshStandardMaterial color={trussColor} metalness={0.6} /></mesh>
                        <mesh position={[0, 0, -0.62]}><boxGeometry args={[2.1, 0.05, 0.04]} /><meshStandardMaterial color={trussColor} metalness={0.6} /></mesh>
                        {/* Natural light from skylight */}
                        <pointLight position={[0, -0.5, 0]} intensity={dark ? 0.08 : 0.15} distance={8} color="#e0e8ff" />
                    </group>
                ))
            )}

            {/* ═══ OVERHEAD LIGHTS — industrial strip ═══ */}
            {Array.from({ length: Math.ceil(w / 4) }, (_, xi) =>
                Array.from({ length: Math.ceil(d / 5) }, (_, zi) => (
                    <group key={`lt-${xi}-${zi}`} position={[xi * 4 + 2, h - 0.2, zi * 5 + 2.5]}>
                        <mesh><boxGeometry args={[0.8, 0.04, 0.15]} /><meshStandardMaterial color={lightHousing} metalness={0.8} roughness={0.2} /></mesh>
                        <mesh position={[0, -0.025, 0]}><boxGeometry args={[0.7, 0.01, 0.11]} /><meshStandardMaterial color="#fff" emissive="#fffaf0" emissiveIntensity={0.5} /></mesh>
                        <pointLight position={[0, -0.15, 0]} intensity={0.15} distance={6} color="#fffaf0" />
                    </group>
                ))
            )}

            {/* ═══ FIRE EXIT SIGNS ═══ */}
            {[
                [0.3, h - 0.5, -0.08, 0],
                [w - 0.3, h - 0.5, -0.08, 0],
                [0.3, h - 0.5, d + 0.08, Math.PI],
                [w - 0.3, h - 0.5, d + 0.08, Math.PI],
            ].map(([x, y, z, ry], i) => (
                <group key={`exit${i}`} position={[x, y, z]} rotation={[0, ry, 0]}>
                    <mesh><boxGeometry args={[0.4, 0.18, 0.03]} /><meshStandardMaterial color={exitGreen} emissive={exitGreen} emissiveIntensity={dark ? 0.6 : 0.3} /></mesh>
                    <Html center distanceFactor={12} style={{ pointerEvents: 'none' }}>
                        <div style={{ color: '#fff', fontSize: 7, fontWeight: 900, fontFamily: 'system-ui', textShadow: '0 0 4px rgba(34,197,94,0.8)' }}>EXIT ➜</div>
                    </Html>
                </group>
            ))}

            {/* ═══ LOADING DOCK DOORS (back wall) ═══ */}
            {Array.from({ length: Math.floor(w / 4) }, (_, i) => (
                <group key={`dock${i}`} position={[i * 4 + 2, 0, d + 0.07]}>
                    {/* Dock door panel */}
                    <mesh position={[0, 2, 0]}><boxGeometry args={[2.2, 3.8, 0.04]} /><meshStandardMaterial color={dockColor} roughness={0.9} /></mesh>
                    {/* Door ridges (roll-up look) */}
                    {Array.from({ length: 15 }, (_, ri) => (
                        <mesh key={`dkr${ri}`} position={[0, ri * 0.26 + 0.15, 0.025]}>
                            <boxGeometry args={[2.0, 0.02, 0.02]} />
                            <meshStandardMaterial color={dark ? '#4a4d58' : '#a0a4b0'} metalness={0.4} />
                        </mesh>
                    ))}
                    {/* Door tracks (left/right) */}
                    {[-1.15, 1.15].map((dx, ti) => (
                        <mesh key={`dkt${ti}`} position={[dx, 2, 0.02]}><boxGeometry args={[0.06, 4, 0.04]} /><meshStandardMaterial color={columnColor} metalness={0.7} roughness={0.3} /></mesh>
                    ))}
                    {/* Yellow/black chevron bumper */}
                    <mesh position={[0, 0.08, 0.01]}><boxGeometry args={[2.4, 0.12, 0.02]} /><meshStandardMaterial color="#eab308" /></mesh>
                    {/* Dock number */}
                    <Html position={[0, 4.1, 0.03]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
                        <div style={{ color: dark ? '#aaa' : '#666', fontSize: 8, fontWeight: 800, fontFamily: 'monospace' }}>DOCK {i + 1}</div>
                    </Html>
                    {/* Dock light */}
                    <mesh position={[0, 4.0, -0.1]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={dark ? 0.8 : 0.3} /></mesh>
                </group>
            ))}

            {/* ═══ EXTERIOR CONCRETE APRON ═══ */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, -0.02, d + 2]}>
                <planeGeometry args={[w + 2, 3]} />
                <meshStandardMaterial color={apronColor} metalness={0.02} roughness={0.95} />
            </mesh>
        </group>
    );
}

// ═══════════════════════════════════════════════════
// BUILD GRID (visible in build mode)
// ═══════════════════════════════════════════════════

function BuildGrid({ gridCells, onGridClick, ghostObj, buildMode, currentFloor, onPointerDown, onPointerMove, onPointerUp }: {
    gridCells: number; onGridClick: (x: number, z: number) => void; ghostObj: PlacedObject | null; buildMode: boolean; currentFloor?: number;
    onPointerDown?: (e: any) => void; onPointerMove?: (e: any) => void; onPointerUp?: (e: any) => void;
}) {
    const [hover, setHover] = useState<[number, number] | null>(null);

    if (!buildMode) return null;

    const floorHeight = 3.5;
    const yPos = (currentFloor || 0) * floorHeight;

    return (
        <group position={[0, yPos, 0]}>
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
                    // e.point is in world space. But since plane is parented to group with yPos, 
                    // and camera is perspective, x and z can be slightly off if we use e.point directly without accounting for local space.
                    // Wait, group position shifts the plane. So we should use e.point or the intersection point in local space? 
                    // Let's just use e.point but subtract y-offset is not needed because X and Z are fine for vertical planes? No, X/Z of point are world.
                    // Since it's a plane, e.point will be exactly on the plane, so its X and Z will be correct!
                    const pt = e.point;
                    const gx = Math.floor(pt.x / GRID_SIZE) * GRID_SIZE;
                    const gz = Math.floor(pt.z / GRID_SIZE) * GRID_SIZE;
                    if (gx >= 0 && gz >= 0 && gx < gridCells && gz < gridCells) onGridClick(gx, gz);
                }}
                onPointerMove={(e) => {
                    if (onPointerMove) onPointerMove(e);
                    const pt = e.point;
                    const gx = Math.floor(pt.x / GRID_SIZE) * GRID_SIZE;
                    const gz = Math.floor(pt.z / GRID_SIZE) * GRID_SIZE;
                    setHover([gx, gz]);
                }}
                onPointerDown={(e) => {
                    if (onPointerDown) onPointerDown(e);
                }}
                onPointerUp={(e) => {
                    if (onPointerUp) onPointerUp(e);
                }}
                onPointerOut={(e) => {
                    setHover(null);
                    if (onPointerUp) onPointerUp(e); // Trigger up if dragged outside
                }}
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
                    obj={{ ...ghostObj, x: hover[0], z: hover[1], floorLevel: 0 }}
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

function SelectableObject({ obj, selected, buildMode, onClick, rackInventoryMap, zoneInventoryMap, highlightBin, onShelfClick, stockAlerts, onZoneClick, currentFloor }: {
    obj: PlacedObject; selected: boolean; buildMode: boolean; onClick: (id: string, shiftKey: boolean) => void;
    rackInventoryMap?: Map<string, RackInventory>; zoneInventoryMap?: Map<string, ZoneInventory>;
    highlightBin?: string;
    onShelfClick?: (obj: PlacedObject, level: number, bin?: BinOccupancy) => void;
    stockAlerts?: Map<string, 'low' | 'overstock' | 'empty'>;
    onZoneClick?: (zoneObj: any) => void;
    currentFloor?: number;
}) {
    const [hovered, setHovered] = useState(false);
    const floorHeight = 3.5;
    const yPos = (obj.floorLevel || 0) * floorHeight;
    const isHidden = currentFloor !== undefined && (obj.floorLevel || 0) > currentFloor;
    
    if (isHidden) return null; // Hide upper floors completely for clarity
    
    return (
        <group
            position={[0, yPos, 0]}
            onClick={(e) => {
                if (buildMode) { e.stopPropagation(); onClick(obj.id, (e as any).nativeEvent?.shiftKey || false); }
                else if (obj.type === 'zone' && onZoneClick) { e.stopPropagation(); onZoneClick(obj); }
            }}
            onPointerOver={() => { setHovered(true); if (buildMode || (obj.type === 'zone' && onZoneClick)) document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        >
            <PlacedObjectRenderer obj={obj} selected={selected} rackInventoryMap={rackInventoryMap} zoneInventoryMap={zoneInventoryMap} highlightBin={highlightBin} onShelfClick={onShelfClick} stockAlerts={stockAlerts} />
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
                            {obj.type === 'rack' ? ` · ${obj.rackLevels || 3} levels · ${locationCode(obj.row || suggestRow(obj.z), obj.bay ?? Math.floor(obj.x) + 1)}` : ''}
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

function AnimatedFleet({ route, speed = 1.5 }: { route: Route; speed?: number }) {
    const meshRef = useRef<THREE.Group>(null);
    const wheelsRef = useRef<THREE.Mesh[]>([]);
    const progressRef = useRef(0);
    const pathLen = route.fullPath.length;

    // Use route id to deterministically assign a fleet type
    const hash = route.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const types = ['agv', 'forklift', 'worker'];
    const fleetType = types[hash % types.length];

    useFrame((state, delta) => {
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
        meshRef.current.position.set(x, 0, z);

        // Face direction of movement
        if (i0 !== i1) {
            const angle = Math.atan2(p1.x - p0.x, p1.z - p0.z);
            const targetRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
            meshRef.current.quaternion.slerp(targetRot, 10 * delta);
        }

        // Spin wheels or animate worker bob
        if (fleetType === 'worker') {
            meshRef.current.position.y = Math.abs(Math.sin(progressRef.current * pathLen * Math.PI)) * 0.1;
        } else {
            wheelsRef.current.forEach(w => {
                if (w) w.rotation.x -= speed * delta * 5;
            });
        }
    });

    if (pathLen < 2) return null;
    const col = route.color;

    return (
        <group ref={meshRef}>
            {fleetType === 'agv' && (
                <group>
                    {/* AGV Base */}
                    <mesh position={[0, 0.15, 0]} castShadow>
                        <boxGeometry args={[0.6, 0.2, 0.9]} />
                        <meshStandardMaterial color={col} roughness={0.4} metalness={0.6} />
                    </mesh>
                    <mesh position={[0, 0.35, -0.2]} castShadow>
                        <cylinderGeometry args={[0.08, 0.08, 0.2]} />
                        <meshStandardMaterial color="#333" roughness={0.7} />
                    </mesh>
                    <mesh position={[0, 0.46, -0.2]}>
                        <sphereGeometry args={[0.04]} />
                        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.8} />
                    </mesh>
                    <mesh position={[-0.15, 0.05, 0.45]} castShadow><boxGeometry args={[0.08, 0.04, 0.6]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} /></mesh>
                    <mesh position={[0.15, 0.05, 0.45]} castShadow><boxGeometry args={[0.08, 0.04, 0.6]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} /></mesh>
                    <pointLight position={[0.2, 0.2, 0.45]} color="#ffffff" intensity={0.5} distance={2} />
                    <mesh position={[0.2, 0.2, 0.46]}><circleGeometry args={[0.04, 16]} /><meshBasicMaterial color="#ffffff" /></mesh>
                    <pointLight position={[-0.2, 0.2, 0.45]} color="#ffffff" intensity={0.5} distance={2} />
                    <mesh position={[-0.2, 0.2, 0.46]}><circleGeometry args={[0.04, 16]} /><meshBasicMaterial color="#ffffff" /></mesh>
                    <mesh position={[0, 0.25, 0.5]} castShadow><boxGeometry args={[0.4, 0.3, 0.4]} /><meshStandardMaterial color="#d4d4d8" roughness={0.9} /></mesh>
                    <mesh position={[0, 0.401, 0.5]}><boxGeometry args={[0.42, 0.01, 0.1]} /><meshStandardMaterial color={col} /></mesh>
                    {[-0.3, 0.3].map((wx, i) => 
                        [-0.3, 0.3].map((wz, j) => (
                            <mesh key={`${i}-${j}`} position={[wx, 0.08, wz]} rotation={[0, 0, Math.PI/2]} ref={el => { if(el && !wheelsRef.current.includes(el)) wheelsRef.current.push(el); }}>
                                <cylinderGeometry args={[0.08, 0.08, 0.08, 16]} />
                                <meshStandardMaterial color="#111" roughness={0.9} />
                            </mesh>
                        ))
                    )}
                </group>
            )}
            {fleetType === 'forklift' && (
                <group>
                    <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[0.5, 0.4, 0.7]} /><meshStandardMaterial color="#eab308" roughness={0.5} metalness={0.15} /></mesh>
                    <mesh position={[0, 0.7, -0.05]}><boxGeometry args={[0.52, 0.04, 0.5]} /><meshStandardMaterial color="#333" /></mesh>
                    {[[-0.24, -0.28], [0.24, -0.28]].map(([px, pz], i) => (
                        <mesh key={i} position={[px, 0.55, pz]}><boxGeometry args={[0.03, 0.35, 0.03]} /><meshStandardMaterial color="#333" /></mesh>
                    ))}
                    <mesh position={[0, 0.65, 0.38]}><boxGeometry args={[0.06, 1.0, 0.04]} /><meshStandardMaterial color="#555" metalness={0.5} /></mesh>
                    <mesh position={[0.12, 0.65, 0.38]}><boxGeometry args={[0.06, 1.0, 0.04]} /><meshStandardMaterial color="#555" metalness={0.5} /></mesh>
                    {[-0.08, 0.08].map((fx, i) => (
                        <mesh key={`fk${i}`} position={[fx, 0.08, 0.6]}><boxGeometry args={[0.06, 0.03, 0.5]} /><meshStandardMaterial color="#777" metalness={0.6} /></mesh>
                    ))}
                    {[[-0.22, -0.3], [0.22, -0.3], [-0.15, 0.2], [0.15, 0.2]].map(([wx, wz], i) => (
                        <mesh key={`w${i}`} position={[wx, 0.08, wz]} rotation={[0, 0, Math.PI / 2]} ref={el => { if(el && !wheelsRef.current.includes(el)) wheelsRef.current.push(el); }}>
                            <cylinderGeometry args={[0.08, 0.08, 0.06, 8]} />
                            <meshStandardMaterial color="#222" roughness={0.9} />
                        </mesh>
                    ))}
                    <mesh position={[0, 0.25, 0.65]} castShadow><boxGeometry args={[0.4, 0.3, 0.4]} /><meshStandardMaterial color="#d4d4d8" roughness={0.9} /></mesh>
                </group>
            )}
            {fleetType === 'worker' && (
                <group position={[0, 0, 0]} scale={[0.8, 0.8, 0.8]}>
                    <mesh position={[0, 0.4, 0]} castShadow><cylinderGeometry args={[0.15, 0.15, 0.8, 16]} /><meshStandardMaterial color={col} roughness={0.8} /></mesh>
                    <mesh position={[0, 0.9, 0]} castShadow><sphereGeometry args={[0.15, 16, 16]} /><meshStandardMaterial color="#fcd34d" roughness={0.4} /></mesh>
                    <mesh position={[0, 1.05, 0]} castShadow><cylinderGeometry args={[0.16, 0.16, 0.1, 16]} /><meshStandardMaterial color="#f59e0b" roughness={0.2} metalness={0.1} /></mesh>
                </group>
            )}
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
// VOLUMETRIC THERMAL CLOUDS
// ═══════════════════════════════════════════════════

function VolumetricThermalClouds({ gridCells, zoneTypeMap, mode }: { gridCells: number; zoneTypeMap: Map<string, string>; mode: string }) {
    if (mode !== 'temperature') return null;

    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const { colors, scales, count, offsets, pts } = useMemo(() => {
        const c1 = new THREE.Color();
        const c2 = new THREE.Color();
        const tmpColor = new THREE.Color();
        const points: any[] = [];
        
        for (let gz = 0; gz < gridCells; gz++) {
            for (let gx = 0; gx < gridCells; gx++) {
                const zt = zoneTypeMap.get(`${gx},${gz}`);
                let value = -1;
                if (zt === 'cold' || zt === 'climate_controlled') value = 0.1;
                else if (zt === 'hazardous' || zt === 'quarantine') value = 0.9;
                else if (zt) value = 0.5;

                if (value >= 0) {
                    // interpolate color
                    if (value < 0.3) { c1.set('#3b82f6'); c2.set('#22c55e'); tmpColor.lerpColors(c1, c2, value / 0.3); }
                    else if (value < 0.7) { c1.set('#22c55e'); c2.set('#f59e0b'); tmpColor.lerpColors(c1, c2, (value - 0.3) / 0.4); }
                    else { c1.set('#f59e0b'); c2.set('#ef4444'); tmpColor.lerpColors(c1, c2, (value - 0.7) / 0.3); }

                    // Generate a few particles per cell
                    for(let i=0; i<3; i++) {
                        points.push({
                            x: gx + 0.5 + (Math.random() - 0.5) * 1.2,
                            y: 0.5 + Math.random() * 2.5,
                            z: gz + 0.5 + (Math.random() - 0.5) * 1.2,
                            scale: 0.4 + Math.random() * 0.8,
                            color: tmpColor.clone(),
                            offset: Math.random() * 100
                        });
                    }
                }
            }
        }
        
        const cols = new Float32Array(points.length * 3);
        const scls = new Float32Array(points.length);
        const offs = new Float32Array(points.length);
        
        points.forEach((pt, i) => {
            cols[i * 3] = pt.color.r; cols[i * 3 + 1] = pt.color.g; cols[i * 3 + 2] = pt.color.b;
            scls[i] = pt.scale;
            offs[i] = pt.offset;
        });
        
        return { colors: cols, scales: scls, count: points.length, offsets: offs, pts: points };
    }, [gridCells, zoneTypeMap, mode]);

    useFrame(({ clock }) => {
        if (!meshRef.current || count === 0) return;
        const time = clock.getElapsedTime();
        for (let i = 0; i < count; i++) {
            const pt = pts[i];
            const driftY = Math.sin(time * 0.5 + offsets[i]) * 0.3;
            const driftX = Math.cos(time * 0.2 + offsets[i]) * 0.2;
            dummy.position.set(pt.x + driftX, pt.y + driftY, pt.z);
            dummy.scale.setScalar(scales[i] * (1 + Math.sin(time * 1.5 + offsets[i]) * 0.15));
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    useEffect(() => {
        if (!meshRef.current) return;
        const colorAttr = new THREE.InstancedBufferAttribute(colors, 3);
        meshRef.current.instanceColor = colorAttr;
    }, [colors]);

    if (count === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshStandardMaterial transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} roughness={1} />
        </instancedMesh>
    );
}

// ═══════════════════════════════════════════════════
// HEATMAP OVERLAY
// ═══════════════════════════════════════════════════

function HeatmapOverlay({ objects, gridCells, mode, rackInventoryMap, zoneInventoryMap, heatmapData }: {
    objects: PlacedObject[]; gridCells: number; mode: string;
    rackInventoryMap?: Map<string, RackInventory>; zoneInventoryMap?: Map<string, ZoneInventory>;
    heatmapData?: Map<string, number>;
}) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const { colors, alphas, count, zoneTypeMap } = useMemo(() => {
        const total = gridCells * gridCells;
        const cols = new Float32Array(total * 3);
        const alph = new Float32Array(total); // per-cell alpha tracking
        const tmpColor = new THREE.Color();
        const c1 = new THREE.Color();
        const c2 = new THREE.Color();

        // Pre-compute rack fill map by grid cell proximity
        const rackFillMap = new Map<string, number>();
        if (mode === 'capacity' && rackInventoryMap) {
            for (const obj of objects) {
                if (obj.type !== 'rack') continue;
                const inv = rackInventoryMap.get(obj.id);
                if (!inv) continue;
                const totalCap = inv.bins.reduce((s, b) => s + (b.maxWeight || 20), 0) || 1;
                const totalUsed = inv.bins.reduce((s, b) => s + b.currentItemCount, 0);
                const fill = Math.min(totalUsed / totalCap, 1);
                // Paint cells covered by rack + 1-cell radius
                for (let dz = -1; dz <= (obj.depth || 1); dz++) {
                    for (let dx = -1; dx <= (obj.width || 1); dx++) {
                        const gx = obj.x + dx;
                        const gz = obj.z + dz;
                        if (gx >= 0 && gz >= 0 && gx < gridCells && gz < gridCells) {
                            const key = `${gx},${gz}`;
                            const existing = rackFillMap.get(key) || 0;
                            rackFillMap.set(key, Math.max(existing, fill));
                        }
                    }
                }
            }
        }

        // Zone type map for temperature mode
        const zoneTypeMap = new Map<string, string>();
        if (mode === 'temperature') {
            for (const obj of objects) {
                if (obj.type !== 'zone') continue;
                for (let dz = 0; dz < (obj.depth || 1); dz++) {
                    for (let dx = 0; dx < (obj.width || 1); dx++) {
                        zoneTypeMap.set(`${obj.x + dx},${obj.z + dz}`, obj.zoneType || 'storage');
                    }
                }
            }
        }

        for (let gz = 0; gz < gridCells; gz++) {
            for (let gx = 0; gx < gridCells; gx++) {
                const idx = gz * gridCells + gx;
                const cellKey = `${gx},${gz}`;
                let value = -1; // -1 means no data

                if (mode === 'capacity') {
                    const f = rackFillMap.get(cellKey);
                    if (f !== undefined) value = f;
                } else if (mode === 'activity') {
                    const v = heatmapData?.get(cellKey);
                    if (v !== undefined) value = Math.min(v, 1);
                } else if (mode === 'temperature') {
                    const zt = zoneTypeMap.get(cellKey);
                    if (zt === 'cold' || zt === 'climate_controlled') value = 0;
                    else if (zt === 'hazardous' || zt === 'quarantine') value = 1;
                    else if (zt) value = 0.4;
                }

                if (value < 0) {
                    // No data — fully transparent
                    tmpColor.set('#000000');
                    alph[idx] = 0;
                } else {
                    // Smooth gradient
                    if (mode === 'temperature') {
                        if (value < 0.3) { c1.set('#3b82f6'); c2.set('#22c55e'); tmpColor.lerpColors(c1, c2, value / 0.3); }
                        else if (value < 0.7) { c1.set('#22c55e'); c2.set('#f59e0b'); tmpColor.lerpColors(c1, c2, (value - 0.3) / 0.4); }
                        else { c1.set('#f59e0b'); c2.set('#ef4444'); tmpColor.lerpColors(c1, c2, (value - 0.7) / 0.3); }
                    } else {
                        // capacity & activity: green -> yellow -> red
                        if (value < 0.5) { c1.set('#22c55e'); c2.set('#f59e0b'); tmpColor.lerpColors(c1, c2, value / 0.5); }
                        else { c1.set('#f59e0b'); c2.set('#ef4444'); tmpColor.lerpColors(c1, c2, (value - 0.5) / 0.5); }
                    }
                    alph[idx] = 0.5;
                }
                cols[idx * 3] = tmpColor.r;
                cols[idx * 3 + 1] = tmpColor.g;
                cols[idx * 3 + 2] = tmpColor.b;
            }
        }
        return { colors: cols, alphas: alph, count: total, zoneTypeMap };
    }, [objects, gridCells, mode, rackInventoryMap, zoneInventoryMap, heatmapData]);

    useEffect(() => {
        if (!meshRef.current) return;
        for (let gz = 0; gz < gridCells; gz++) {
            for (let gx = 0; gx < gridCells; gx++) {
                const idx = gz * gridCells + gx;
                const a = alphas[idx];
                dummy.position.set(gx + 0.5, 0.03, gz + 0.5);
                dummy.rotation.set(-Math.PI / 2, 0, 0);
                dummy.scale.set(a > 0 ? 0.96 : 0, a > 0 ? 0.96 : 0, 1);
                dummy.updateMatrix();
                meshRef.current.setMatrixAt(idx, dummy.matrix);
            }
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        const colorAttr = new THREE.InstancedBufferAttribute(colors, 3);
        meshRef.current.instanceColor = colorAttr;
    }, [gridCells, colors, alphas, dummy]);

    return (
        <group>
            <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial
                    transparent opacity={0.5}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    emissive="#ffffff" emissiveIntensity={0.08}
                />
            </instancedMesh>
            {mode === 'temperature' && zoneTypeMap && (
                <VolumetricThermalClouds gridCells={gridCells} zoneTypeMap={zoneTypeMap} mode={mode} />
            )}
        </group>
    );
}

// ═══════════════════════════════════════════════════
// ACTIVITY MARKERS
// ═══════════════════════════════════════════════════

function ActivityMarkerSphere({ marker }: { marker: { id: string; type: 'putaway' | 'pick'; x: number; z: number; binCode: string; itemName?: string } }) {
    const meshRef = useRef<THREE.Group>(null);
    const ring1Ref = useRef<THREE.Mesh>(null);
    const ring2Ref = useRef<THREE.Mesh>(null);
    const color = marker.type === 'putaway' ? '#3b82f6' : '#f59e0b';
    const icon = marker.type === 'putaway' ? '📥' : '🛒';

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const t = clock.getElapsedTime() * 3 + marker.x * 7;
        const s = 1 + Math.sin(t) * 0.15;
        meshRef.current.scale.setScalar(s);
        
        if (ring1Ref.current) {
            ring1Ref.current.scale.setScalar(1 + (t % 2) * 2);
            (ring1Ref.current.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - (t % 2));
        }
        if (ring2Ref.current) {
            const t2 = (t + 1) % 2;
            ring2Ref.current.scale.setScalar(1 + t2 * 2);
            (ring2Ref.current.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - t2);
        }
    });

    return (
        <group position={[marker.x + 0.5, 0.5, marker.z + 0.5]}>
            <group ref={meshRef}>
                <mesh>
                    <sphereGeometry args={[0.08, 12, 12]} />
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
                </mesh>
                {/* Holographic rings */}
                <mesh ref={ring1Ref} rotation={[-Math.PI/2, 0, 0]} position={[0, -0.48, 0]}>
                    <ringGeometry args={[0.1, 0.12, 32]} />
                    <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
                </mesh>
                <mesh ref={ring2Ref} rotation={[-Math.PI/2, 0, 0]} position={[0, -0.48, 0]}>
                    <ringGeometry args={[0.1, 0.12, 32]} />
                    <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
                </mesh>
            </group>
            <pointLight color={color} intensity={0.3} distance={1.5} />
            <Html center distanceFactor={10} style={{ pointerEvents: 'none', transform: 'translate3d(0, -20px, 0)' }}>
                <div style={{
                    fontSize: 8, fontWeight: 700, fontFamily: 'monospace',
                    color: '#fff', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    padding: '2px 6px', borderRadius: 6, whiteSpace: 'nowrap',
                    border: `1px solid ${color}50`,
                    display: 'flex', alignItems: 'center', gap: 3,
                }}>
                    <span>{icon}</span>
                    <span>{marker.binCode}</span>
                </div>
            </Html>
        </group>
    );
}

function ActivityMarkers({ markers }: { markers: Array<{ id: string; type: 'putaway' | 'pick'; x: number; z: number; binCode: string; itemName?: string }> }) {
    return (
        <group>
            {markers.map(m => (
                <ActivityMarkerSphere key={m.id} marker={m} />
            ))}
        </group>
    );
}

// ═══════════════════════════════════════════════════
// ZONE STATS POPOVER
// ═══════════════════════════════════════════════════

function ZoneStatsPopover({ obj, stats, onClose }: {
    obj: PlacedObject;
    stats: { totalBins: number; usedBins: number; totalItems: number; topItems: Array<{ name: string; qty: number }> };
    onClose: () => void;
}) {
    const utilization = stats.totalBins > 0 ? Math.round((stats.usedBins / stats.totalBins) * 100) : 0;
    const zoneColor = obj.color || ZONE_COLORS[obj.zoneType || 'storage'] || '#3b82f6';
    const barWidth = Math.max(utilization, 2);

    return (
        <Html position={[obj.x + (obj.width || 1) / 2, 3, obj.z + (obj.depth || 1) / 2]} center distanceFactor={10}>
            <div style={{
                background: 'rgba(10,12,28,0.92)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
                padding: '12px 16px', color: '#fff', fontSize: 10, fontFamily: 'system-ui',
                minWidth: 180, maxWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 12 }}>
                        {obj.label || obj.zoneType || 'Zone'}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{
                        background: 'rgba(255,255,255,0.1)', border: 'none', color: '#aaa',
                        borderRadius: 4, cursor: 'pointer', fontSize: 12, padding: '0 4px', lineHeight: '16px',
                    }}>×</button>
                </div>
                {/* Type badge */}
                <div style={{
                    display: 'inline-block', background: `${zoneColor}30`, color: zoneColor,
                    padding: '1px 8px', borderRadius: 6, fontSize: 8, fontWeight: 700,
                    marginBottom: 8, border: `1px solid ${zoneColor}40`,
                }}>
                    {(obj.zoneType || 'storage').toUpperCase()}
                </div>
                {/* Capacity bar */}
                <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#9ca3af', marginBottom: 3 }}>
                        <span>Capacity</span>
                        <span>{stats.usedBins}/{stats.totalBins} bins · {utilization}%</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                        <div style={{
                            width: `${barWidth}%`, height: '100%', borderRadius: 4,
                            background: utilization > 80 ? '#ef4444' : utilization > 50 ? '#f59e0b' : '#22c55e',
                            transition: 'width 0.3s ease',
                        }} />
                    </div>
                </div>
                {/* Items count */}
                <div style={{ fontSize: 9, color: '#d1d5db', marginBottom: 6 }}>
                    📦 <strong>{stats.totalItems}</strong> total items
                </div>
                {/* Top items */}
                {stats.topItems.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6 }}>
                        <div style={{ fontSize: 8, color: '#6b7280', marginBottom: 4 }}>Top Items</div>
                        {stats.topItems.slice(0, 4).map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#d1d5db', marginBottom: 2 }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{item.name}</span>
                                <span style={{ color: '#9ca3af', fontWeight: 600 }}>×{item.qty}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Html>
    );
}

// ═══════════════════════════════════════════════════
// FIRST PERSON CONTROLLER
// ═══════════════════════════════════════════════════
function FirstPersonController({ gridCells }: { gridCells: number }) {
    const { camera } = useThree();
    const [movement, setMovement] = useState({ forward: false, backward: false, left: false, right: false });
    const isLocked = useRef(false);
    const [showInstructions, setShowInstructions] = useState(true);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isLocked.current) return;
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': setMovement(m => ({ ...m, forward: true })); break;
                case 'KeyS': case 'ArrowDown': setMovement(m => ({ ...m, backward: true })); break;
                case 'KeyA': case 'ArrowLeft': setMovement(m => ({ ...m, left: true })); break;
                case 'KeyD': case 'ArrowRight': setMovement(m => ({ ...m, right: true })); break;
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': setMovement(m => ({ ...m, forward: false })); break;
                case 'KeyS': case 'ArrowDown': setMovement(m => ({ ...m, backward: false })); break;
                case 'KeyA': case 'ArrowLeft': setMovement(m => ({ ...m, left: false })); break;
                case 'KeyD': case 'ArrowRight': setMovement(m => ({ ...m, right: false })); break;
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        
        // Initial setup for first person
        camera.position.set(gridCells / 2, 1.6, gridCells + 2);
        camera.rotation.set(0, 0, 0);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, [camera, gridCells]);

    useFrame((_, delta) => {
        if (!isLocked.current) return;
        const speed = 8 * delta; // 8 units per second
        const velocity = new THREE.Vector3();
        if (movement.forward) velocity.z -= speed;
        if (movement.backward) velocity.z += speed;
        if (movement.left) velocity.x -= speed;
        if (movement.right) velocity.x += speed;

        velocity.applyQuaternion(camera.quaternion);
        velocity.y = 0; // keep height constant
        camera.position.add(velocity);
        camera.position.y = 1.6;
    });

    return (
        <>
            <PointerLockControls 
                onLock={() => { isLocked.current = true; setShowInstructions(false); }} 
                onUnlock={() => { isLocked.current = false; setShowInstructions(true); setMovement({forward:false, backward:false, left:false, right:false}); }} 
            />
            {showInstructions && (
                <Html center>
                    <div style={{
                        background: 'rgba(0,0,0,0.8)', padding: '20px 30px', borderRadius: 12,
                        color: 'white', textAlign: 'center', pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)', whiteSpace: 'nowrap'
                    }}>
                        <h3 style={{ margin: '0 0 10px', fontSize: 20 }}>First-Person Mode</h3>
                        <p style={{ margin: '0 0 15px', color: '#ccc' }}>Click anywhere to start exploring</p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <kbd style={{ background: '#333', padding: '4px 8px', borderRadius: 4, borderBottom: '2px solid #111' }}>W</kbd>
                            <kbd style={{ background: '#333', padding: '4px 8px', borderRadius: 4, borderBottom: '2px solid #111' }}>A</kbd>
                            <kbd style={{ background: '#333', padding: '4px 8px', borderRadius: 4, borderBottom: '2px solid #111' }}>S</kbd>
                            <kbd style={{ background: '#333', padding: '4px 8px', borderRadius: 4, borderBottom: '2px solid #111' }}>D</kbd>
                        </div>
                        <p style={{ margin: '15px 0 0', fontSize: 12, color: '#888' }}>Press ESC to exit</p>
                    </div>
                </Html>
            )}
        </>
    );
}

// ═══════════════════════════════════════════════════


// ═══════════════════════════════════════════════════
// SCENE CONTENT
// ═══════════════════════════════════════════════════

function SceneContent({ objects, selectedId, selectedIds, ghostObj, buildMode, gridCells, cameraPreset, onGridClick, onSelectObject, routes, showRoutes, animateRoutes, showTraffic, showGridOverlay, isDark, rackInventoryMap, zoneInventoryMap, binPositionRegistry, highlightBin, onShelfClick, rulerMode, rulerPoints, onRulerClick, heatmapMode, heatmapData, showActivityMarkers, activityMarkers, stockAlerts, onZoneClick, selectedZoneId, zoneStatsData, currentFloor, timeOfDay, envShadows, selectionBox }: {
    objects: PlacedObject[]; selectedId: string | null; selectedIds?: Set<string>; ghostObj: PlacedObject | null;
    buildMode: boolean; gridCells: number; cameraPreset: string; onGridClick: (x: number, z: number) => void; onSelectObject: (id: string, shiftKey: boolean) => void;
    routes?: Route[]; showRoutes?: boolean; animateRoutes?: boolean; showTraffic?: boolean; showGridOverlay?: boolean; isDark?: boolean;
    rackInventoryMap?: Map<string, RackInventory>; zoneInventoryMap?: Map<string, ZoneInventory>;
    binPositionRegistry?: Map<string, [number, number, number]>;
    highlightBin?: string;
    onShelfClick?: (obj: PlacedObject, level: number, bin?: BinOccupancy) => void;
    rulerMode?: boolean; rulerPoints?: [number, number][]; onRulerClick?: (x: number, z: number) => void;
    heatmapMode?: 'off' | 'capacity' | 'activity' | 'temperature';
    heatmapData?: Map<string, number>;
    showActivityMarkers?: boolean;
    activityMarkers?: Array<{ id: string; type: 'putaway' | 'pick'; x: number; z: number; binCode: string; itemName?: string }>;
    stockAlerts?: Map<string, 'low' | 'overstock' | 'empty'>;
    onZoneClick?: (zoneObj: any) => void;
    selectedZoneId?: string | null;
    zoneStatsData?: Map<string, { totalBins: number; usedBins: number; totalItems: number; topItems: Array<{ name: string; qty: number }> }>;
    currentFloor?: number;
    timeOfDay?: number;
    envShadows?: boolean;
    selectionBox?: { startX: number, startZ: number, endX: number, endZ: number } | null;
}) {
    const bgColor = isDark !== false ? '#080814' : '#d5dbe3';

    // Compute beacon position once via useMemo (shared by LocatorBeacon + CameraFlyTo)
    const beaconPos = useMemo<[number, number, number] | null>(() => {
        if (!highlightBin) return null;
        let pos: [number, number, number] | null = null;

        // Strategy 0: Direct lookup from pre-built bin position registry
        if (binPositionRegistry && binPositionRegistry.size > 0) {
            const registryPos = binPositionRegistry.get(highlightBin);
            if (registryPos) return registryPos;
        }

        // Strategy 1: Exact match from rackInventoryMap
        if (rackInventoryMap && rackInventoryMap.size > 0) {
            for (const obj of objects) {
                if (obj.type !== 'rack') continue;
                const inv = rackInventoryMap.get(obj.id);
                if (!inv) continue;
                const matchedBin = inv.bins.find(b => b.binCode === highlightBin);
                if (matchedBin) {
                    const levels = obj.rackLevels || 3;
                    const rackHeight = levels * 0.42 + 0.1;
                    pos = [obj.x + (obj.width || 1) / 2, rackHeight, obj.z + (obj.depth || 1) / 2];
                    break;
                }
            }
        }

        // Strategy 2: Match rack by row/bay from bin code patterns
        if (!pos) {
            const binUpper = highlightBin.toUpperCase();
            const racks = objects.filter(o => o.type === 'rack');

            // Strategy 2a: Match generateRackBinInputs format: "A-03-L1" → row=A, bay=3
            // Format: {ROW_LETTER}-{BAY_PADDED}-L{LEVEL}
            const genMatch = binUpper.match(/^([A-Z])-(\d+)-L(\d+)$/);
            if (genMatch) {
                const targetRow = genMatch[1];
                const targetBay = parseInt(genMatch[2]);
                const matchedRack = racks.find(r =>
                    r.row === targetRow && r.bay === targetBay
                );
                if (matchedRack) {
                    const levels = matchedRack.rackLevels || 3;
                    const rackHeight = levels * 0.42 + 0.1;
                    pos = [matchedRack.x + (matchedRack.width || 1) / 2, rackHeight, matchedRack.z + (matchedRack.depth || 1) / 2];
                }
            }

            // Strategy 2b: Match compound bin codes with zone prefix: "STR-A-A1-R1-L1", "CLD-A2-R3-L1"
            if (!pos) {
                const aisleMatch = binUpper.match(/A(\d+)/);
                const rackMatch = binUpper.match(/R(\d+)/);

                if (aisleMatch && rackMatch) {
                    const targetAisle = parseInt(aisleMatch[1]);
                    const targetRack = parseInt(rackMatch[1]);
                    const sortedByZ = [...racks].sort((a, b) => a.z - b.z);
                    const uniqueZRows = [...new Set(sortedByZ.map(r => Math.round(r.z)))];
                    const aisleIndex = Math.min(targetAisle - 1, uniqueZRows.length - 1);
                    const targetZ = uniqueZRows[aisleIndex >= 0 ? aisleIndex : 0];

                    if (targetZ !== undefined) {
                        const racksInRow = racks.filter(r => Math.abs(r.z - targetZ) < 1.5).sort((a, b) => a.x - b.x);
                        const rackIndex = Math.min(targetRack - 1, racksInRow.length - 1);
                        const matchedRack = racksInRow[rackIndex >= 0 ? rackIndex : 0];
                        if (matchedRack) {
                            const levels = matchedRack.rackLevels || 3;
                            const rackHeight = levels * 0.42 + 0.1;
                            pos = [matchedRack.x + (matchedRack.width || 1) / 2, rackHeight, matchedRack.z + (matchedRack.depth || 1) / 2];
                        }
                    }
                }
            }

            // Strategy 2c: Partial row match — bin contains a rack row letter at start
            if (!pos) {
                const firstSegment = binUpper.split(/[-_]/)[0];
                if (firstSegment && firstSegment.length <= 3) {
                    const rackWithRow = racks.find(r => r.row && r.row.toUpperCase() === firstSegment);
                    if (rackWithRow) {
                        const levels = rackWithRow.rackLevels || 3;
                        const rackHeight = levels * 0.42 + 0.1;
                        pos = [rackWithRow.x + (rackWithRow.width || 1) / 2, rackHeight, rackWithRow.z + (rackWithRow.depth || 1) / 2];
                    }
                }
            }

            // Strategy 3: Label substring match
            if (!pos) {
                const binParts = binUpper.split(/[-_]/);
                for (const rack of racks) {
                    const rackLabel = (rack.label || '').toUpperCase();
                    if (rackLabel && binParts.some(p => p.length > 1 && rackLabel.includes(p))) {
                        const levels = rack.rackLevels || 3;
                        const rackHeight = levels * 0.42 + 0.1;
                        pos = [rack.x + (rack.width || 1) / 2, rackHeight, rack.z + (rack.depth || 1) / 2];
                        break;
                    }
                }
            }

            // Strategy 4: Zone match
            if (!pos) {
                const zones = objects.filter(o => o.type === 'zone');
                for (const zone of zones) {
                    const zoneLabel = (zone.label || '').toUpperCase();
                    if (zoneLabel && binUpper.includes(zoneLabel.replace(/\s+/g, '-').split('-')[0])) {
                        const zx = zone.x, zz = zone.z;
                        const zw = zone.width || 4, zd = zone.depth || 4;
                        const rackInZone = racks.find(r => r.x >= zx && r.x < zx + zw && r.z >= zz && r.z < zz + zd);
                        if (rackInZone) {
                            const levels = rackInZone.rackLevels || 3;
                            const rackHeight = levels * 0.42 + 0.1;
                            pos = [rackInZone.x + (rackInZone.width || 1) / 2, rackHeight, rackInZone.z + (rackInZone.depth || 1) / 2];
                        }
                        break;
                    }
                }
            }

            // Strategy 5: Last resort — central rack fallback
            if (!pos && racks.length > 0) {
                const midIdx = Math.floor(racks.length / 2);
                const fallbackRack = racks[midIdx];
                const levels = fallbackRack.rackLevels || 3;
                const rackHeight = levels * 0.42 + 0.1;
                pos = [fallbackRack.x + (fallbackRack.width || 1) / 2, rackHeight, fallbackRack.z + (fallbackRack.depth || 1) / 2];
            }
        }

        return pos;
    }, [highlightBin, objects, rackInventoryMap, binPositionRegistry]);

    return (
        <>
            {/* Enhanced Lighting based on Time of Day */}
            {(() => {
                const tod = timeOfDay ?? 12;
                // 6am=0, 12pm=PI/2, 6pm=PI
                const sunAngle = Math.max(0, Math.min(1, (tod - 6) / 12)) * Math.PI;
                const sunY = Math.max(2, Math.sin(sunAngle) * 20); // Keep slightly above horizon
                const sunX = Math.cos(sunAngle) * gridCells;
                const isNight = tod < 6 || tod > 18;
                const shadowEnabled = envShadows !== false;
                const baseIntensity = isDark !== false ? 0.2 : 0.5;
                
                let lightColor = "#fffaf0";
                if (tod < 8 || tod > 16) lightColor = "#ffd1b3"; // Morning / Evening warm glow

                return (
                    <>
                        <ambientLight intensity={isNight ? baseIntensity * 0.5 : baseIntensity} />
                        {!isNight && (
                            <directionalLight
                                position={[sunX, sunY, gridCells * 0.3]}
                                intensity={(isDark !== false ? 0.6 : 0.9) * Math.max(0.2, Math.sin(sunAngle))}
                                castShadow={shadowEnabled}
                                shadow-mapSize-width={shadowEnabled ? 4096 : 512}
                                shadow-mapSize-height={shadowEnabled ? 4096 : 512}
                                shadow-camera-left={-gridCells}
                                shadow-camera-right={gridCells}
                                shadow-camera-top={gridCells}
                                shadow-camera-bottom={-gridCells}
                                shadow-camera-near={0.5}
                                shadow-camera-far={gridCells * 3}
                                shadow-bias={-0.0002}
                                color={lightColor}
                            />
                        )}
                        {isNight && (
                            // Moonlight
                            <directionalLight 
                                position={[-gridCells*0.5, 10, -gridCells*0.5]} 
                                intensity={0.2} 
                                color="#a5b4fc" 
                                castShadow={shadowEnabled} 
                            />
                        )}
                    </>
                );
            })()}
            <directionalLight position={[-gridCells * 0.3, 8, gridCells * 0.8]} intensity={isDark !== false ? 0.15 : 0.3} color="#b4c6e7" />
            <hemisphereLight color={isDark !== false ? '#c4d4f0' : '#dde4f0'} groundColor={isDark !== false ? '#2a2d3a' : '#b0b8c4'} intensity={isDark !== false ? 0.35 : 0.5} />
            <color attach="background" args={[bgColor]} />
            <fog attach="fog" args={[bgColor, gridCells * 1.8, gridCells * 4.5]} />

            {/* Extra fill light to simulate environment reflections */}
            <pointLight position={[gridCells / 2, 8, gridCells / 2]} intensity={isDark !== false ? 0.1 : 0.2} color="#c4d4f0" />

            {/* HDRI Environment for realistic metallic reflections */}
            <Environment preset="city" />

            {/* Contact shadows for premium grounding */}
            <ContactShadows
                position={[gridCells / 2, -0.005, gridCells / 2]}
                opacity={isDark !== false ? 0.3 : 0.2}
                scale={gridCells + 2}
                blur={2}
                far={6}
            />

            <BuildingShell gridCells={gridCells} isDark={isDark} />
            <BuildGrid gridCells={gridCells} onGridClick={onGridClick} ghostObj={ghostObj} buildMode={buildMode} currentFloor={currentFloor} />
            <AisleMarkings objects={objects} gridCells={gridCells} />

            {/* Atmospheric dust particles */}
            {!buildMode && <DustParticles count={150} gridCells={gridCells} />}

            {objects.map(obj => (
                <SelectableObject key={obj.id} obj={obj} selected={selectedId === obj.id || (selectedIds?.has(obj.id) ?? false)} buildMode={buildMode} onClick={onSelectObject}
                    rackInventoryMap={rackInventoryMap} zoneInventoryMap={zoneInventoryMap} highlightBin={highlightBin} onShelfClick={onShelfClick}
                    stockAlerts={stockAlerts} onZoneClick={onZoneClick} currentFloor={currentFloor} />
            ))}

            {/* Route rendering */}
            {showRoutes && routes && routes.map(route => (
                <group key={route.id}>
                    <RoutePath route={route} />
                    <RouteWaypoints route={route} />
                    {animateRoutes && <AnimatedFleet route={route} />}
                </group>
            ))}

            {/* Traffic Analyzer */}
            {/* showTraffic && routes && routes.length > 0 && <TrafficAnalyzerOverlay routes={routes} /> */}

            {/* Selection Box Overlay */}
            {selectionBox && (() => {
                const minX = Math.min(selectionBox.startX, selectionBox.endX);
                const maxX = Math.max(selectionBox.startX, selectionBox.endX);
                const minZ = Math.min(selectionBox.startZ, selectionBox.endZ);
                const maxZ = Math.max(selectionBox.startZ, selectionBox.endZ);
                const w = maxX - minX || 0.1;
                const d = maxZ - minZ || 0.1;
                return (
                    <mesh position={[minX + w/2, 0.05, minZ + d/2]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[w, d]} />
                        <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} side={THREE.DoubleSide} />
                        <lineSegments>
                            <edgesGeometry args={[new THREE.PlaneGeometry(w, d)]} />
                            <lineBasicMaterial color="#3b82f6" linewidth={2} />
                        </lineSegments>
                    </mesh>
                );
            })()}

            {/* Grid overlay */}
            {showGridOverlay && <FloorGridOverlay objects={objects} gridCells={gridCells} />}

            {/* Heatmap overlay */}
            {heatmapMode && heatmapMode !== 'off' && (
                <HeatmapOverlay objects={objects} gridCells={gridCells} mode={heatmapMode}
                    rackInventoryMap={rackInventoryMap} zoneInventoryMap={zoneInventoryMap} heatmapData={heatmapData} />
            )}

            {/* Activity markers */}
            {showActivityMarkers && activityMarkers && activityMarkers.length > 0 && (
                <ActivityMarkers markers={activityMarkers} />
            )}

            {/* Zone stats popover */}
            {selectedZoneId && zoneStatsData && (() => {
                const zoneObj = objects.find(o => o.id === selectedZoneId && o.type === 'zone');
                const stats = zoneStatsData.get(selectedZoneId);
                if (zoneObj && stats) {
                    return <ZoneStatsPopover obj={zoneObj} stats={stats} onClose={() => onZoneClick?.(zoneObj)} />;
                }
                return null;
            })()}

            {/* Locator Beacon for highlighted bin */}
            {beaconPos && <LocatorBeacon position={beaconPos} color="#22c55e" label={highlightBin} />}

            {/* Ruler / Measurement Tool */}
            {rulerMode && <RulerFloorClick gridCells={gridCells} onRulerClick={onRulerClick} />}
            {rulerPoints && rulerPoints.length >= 1 && (
                <RulerTool points={rulerPoints} />
            )}

            {cameraPreset === 'first-person' ? (
                <FirstPersonController gridCells={gridCells} />
            ) : (
                <>
                    {cameraPreset === 'cad-2d' ? (
                        <OrthographicCamera makeDefault position={[gridCells / 2, gridCells * 1.5, gridCells / 2]} zoom={18} near={-200} far={200} />
                    ) : (
                        <CameraFlyTo gridCells={gridCells} preset={cameraPreset} flyToTarget={beaconPos || undefined} />
                    )}
                    <OrbitControls makeDefault minDistance={2} maxDistance={gridCells * 2.5} maxPolarAngle={Math.PI / 2.05}
                        enableDamping dampingFactor={0.06} target={[gridCells / 2, 0, gridCells / 2]}
                        enableRotate={cameraPreset !== 'cad-2d'} />
                </>
            )}
        </>
    );
}

// ═══════════════════════════════════════════════════
// RULER / MEASUREMENT TOOL
// ═══════════════════════════════════════════════════

function RulerFloorClick({ gridCells, onRulerClick }: { gridCells: number; onRulerClick?: (x: number, z: number) => void }) {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[gridCells / 2, 0.02, gridCells / 2]}
            onClick={(e) => {
                e.stopPropagation();
                const p = e.point;
                onRulerClick?.(Math.round(p.x * 10) / 10, Math.round(p.z * 10) / 10);
            }}>
            <planeGeometry args={[gridCells, gridCells]} />
            <meshBasicMaterial transparent opacity={0} />
        </mesh>
    );
}

function RulerTool({ points }: { points: [number, number][] }) {
    const p1 = points[0];
    const p2 = points.length >= 2 ? points[1] : null;

    const distance = p2 ? Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2) : 0;
    const midX = p2 ? (p1[0] + p2[0]) / 2 : p1[0];
    const midZ = p2 ? (p1[1] + p2[1]) / 2 : p1[1];

    return (
        <group>
            {/* Start point marker */}
            <mesh position={[p1[0], 0.06, p1[1]]}>
                <sphereGeometry args={[0.12, 12, 12]} />
                <meshBasicMaterial color="#fbbf24" />
            </mesh>
            <Html position={[p1[0], 0.35, p1[1]]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
                <div style={{
                    fontSize: 8, fontWeight: 700, fontFamily: 'monospace',
                    color: '#fbbf24', background: 'rgba(0,0,0,0.6)',
                    padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap',
                }}>
                    A ({p1[0].toFixed(1)}, {p1[1].toFixed(1)})
                </div>
            </Html>

            {/* End point marker + line */}
            {p2 && (
                <>
                    <mesh position={[p2[0], 0.06, p2[1]]}>
                        <sphereGeometry args={[0.12, 12, 12]} />
                        <meshBasicMaterial color="#fbbf24" />
                    </mesh>
                    <Html position={[p2[0], 0.35, p2[1]]} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
                        <div style={{
                            fontSize: 8, fontWeight: 700, fontFamily: 'monospace',
                            color: '#fbbf24', background: 'rgba(0,0,0,0.6)',
                            padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap',
                        }}>
                            B ({p2[0].toFixed(1)}, {p2[1].toFixed(1)})
                        </div>
                    </Html>

                    {/* Measurement line - use thin box for reliable rendering */}
                    {p2 && (() => {
                        const dx = p2[0] - p1[0], dz = p2[1] - p1[1];
                        const len = Math.sqrt(dx * dx + dz * dz);
                        const angle = Math.atan2(dx, dz);
                        return (
                            <mesh position={[midX, 0.06, midZ]} rotation={[0, angle, 0]}>
                                <boxGeometry args={[0.04, 0.02, len]} />
                                <meshBasicMaterial color="#fbbf24" />
                            </mesh>
                        );
                    })()}

                    {/* Distance label */}
                    <Html position={[midX, 0.5, midZ]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
                        <div style={{
                            fontSize: 12, fontWeight: 800, fontFamily: 'system-ui',
                            color: '#fff', background: 'rgba(251,191,36,0.85)',
                            padding: '3px 10px', borderRadius: 6, whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}>
                            📏 {distance.toFixed(2)} m
                        </div>
                    </Html>
                </>
            )}
        </group>
    );
}

// ═══════════════════════════════════════════════════
// LOCATOR BEACON — 3D animated marker for bin search
// ═══════════════════════════════════════════════════

function LocatorBeacon({ position, color = '#22c55e', label }: { position: [number, number, number]; color?: string; label?: string }) {
    const beaconRef = useRef<THREE.Group>(null!);
    const ring1Ref = useRef<THREE.Mesh>(null!);
    const ring2Ref = useRef<THREE.Mesh>(null!);
    const pillarRef = useRef<THREE.Mesh>(null!);
    const spotRef = useRef<THREE.Mesh>(null!);
    const sparklesRef = useRef<THREE.Points>(null!);

    // Create sparkle particles
    const sparkleGeo = useMemo(() => {
        const count = 24;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = 0.5 + Math.random() * 0.8;
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = Math.random() * 3;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return geo;
    }, []);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (beaconRef.current) {
            // Smooth bobbing pin
            beaconRef.current.position.y = position[1] + 2 + Math.sin(t * 1.8) * 0.25;
            beaconRef.current.rotation.y = t * 0.5;
        }
        if (ring1Ref.current) {
            // Primary ring pulse
            const t1 = (t * 0.7) % 1;
            const scale1 = 1 + t1 * 4;
            ring1Ref.current.scale.set(scale1, scale1, 1);
            (ring1Ref.current.material as THREE.MeshStandardMaterial).opacity = (1 - t1) * 0.6;
        }
        if (ring2Ref.current) {
            // Secondary ring pulse (offset)
            const t2 = ((t * 0.7) + 0.5) % 1;
            const scale2 = 1 + t2 * 4;
            ring2Ref.current.scale.set(scale2, scale2, 1);
            (ring2Ref.current.material as THREE.MeshStandardMaterial).opacity = (1 - t2) * 0.4;
        }
        if (pillarRef.current) {
            (pillarRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
                0.5 + Math.sin(t * 3) * 0.3;
        }
        if (spotRef.current) {
            // Pulsing floor spotlight
            const spotScale = 1.5 + Math.sin(t * 2) * 0.3;
            spotRef.current.scale.set(spotScale, spotScale, 1);
            (spotRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * 2) * 0.05;
        }
        if (sparklesRef.current) {
            // Rotate sparkles slowly and bob each particle
            sparklesRef.current.rotation.y = t * 0.3;
            const posArr = sparklesRef.current.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < posArr.length / 3; i++) {
                posArr[i * 3 + 1] = (posArr[i * 3 + 1] + 0.02) % 4;
            }
            sparklesRef.current.geometry.attributes.position.needsUpdate = true;
        }
    });

    return (
        <group position={position}>
            {/* Floor spotlight projection */}
            <mesh ref={spotRef} position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[1.5, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.DoubleSide} />
            </mesh>

            {/* Vertical light pillar */}
            <mesh ref={pillarRef} position={[0, 1.5, 0]}>
                <cylinderGeometry args={[0.04, 0.18, 4.5, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.35} />
            </mesh>

            {/* Primary floor ring pulse */}
            <mesh ref={ring1Ref} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.3, 0.5, 32]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>

            {/* Secondary ring pulse (offset timing) */}
            <mesh ref={ring2Ref} position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.2, 0.35, 32]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.4} side={THREE.DoubleSide} />
            </mesh>

            {/* Sparkle particles */}
            <points ref={sparklesRef} geometry={sparkleGeo}>
                <pointsMaterial color={color} size={0.06} transparent opacity={0.6} sizeAttenuation />
            </points>

            {/* Floating pin marker */}
            <group ref={beaconRef}>
                {/* Outer glow sphere */}
                <mesh>
                    <sphereGeometry args={[0.32, 16, 16]} />
                    <meshBasicMaterial color={color} transparent opacity={0.12} />
                </mesh>
                {/* Inner solid sphere */}
                <mesh>
                    <sphereGeometry args={[0.2, 16, 16]} />
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} metalness={0.3} roughness={0.2} />
                </mesh>
                {/* Pointer cone */}
                <mesh position={[0, -0.32, 0]}>
                    <coneGeometry args={[0.12, 0.35, 8]} />
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
                </mesh>
                {/* Bin code label */}
                {label && (
                    <Html position={[0, 0.7, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
                        <div style={{
                            background: `${color}ee`, backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255,255,255,0.35)', borderRadius: 10,
                            padding: '5px 12px', color: '#fff', fontSize: 11, fontWeight: 800,
                            fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap',
                            boxShadow: `0 4px 20px ${color}60, 0 0 40px ${color}30`,
                            display: 'flex', alignItems: 'center', gap: 5,
                            letterSpacing: 0.5,
                        }}>
                            <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: '#fff', boxShadow: '0 0 6px rgba(255,255,255,0.8)',
                                animation: 'pulse 1.5s infinite',
                            }} />
                            {label}
                        </div>
                    </Html>
                )}
            </group>
            {/* Point light for scene glow */}
            <pointLight color={color} intensity={3} distance={6} />
            {/* Ground-level fill */}
            <pointLight color={color} intensity={1} distance={3} position={[0, 0.3, 0]} />
        </group>
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
    onPointerDown?: (e: any) => void;
    onPointerMove?: (e: any) => void;
    onPointerUp?: (e: any) => void;
    selectionBox?: { startX: number, startZ: number, endX: number, endZ: number } | null;
    routes?: Route[];
    showRoutes?: boolean;
    animateRoutes?: boolean;
    showTraffic?: boolean;
    showGridOverlay?: boolean;
    isDark?: boolean;
    rackInventoryMap?: Map<string, RackInventory>;
    zoneInventoryMap?: Map<string, ZoneInventory>;
    highlightBin?: string;
    binPositionRegistry?: Map<string, [number, number, number]>;
    onShelfClick?: (obj: PlacedObject, level: number, bin?: BinOccupancy) => void;
    rulerMode?: boolean;
    rulerPoints?: [number, number][];
    onRulerClick?: (x: number, z: number) => void;
    graphicsQuality?: 'high' | 'performance';
    heatmapMode?: 'off' | 'capacity' | 'activity' | 'temperature';
    heatmapData?: Map<string, number>;
    showActivityMarkers?: boolean;
    activityMarkers?: Array<{ id: string; type: 'putaway' | 'pick'; x: number; z: number; binCode: string; itemName?: string }>;
    stockAlerts?: Map<string, 'low' | 'overstock' | 'empty'>;
    onZoneClick?: (zoneObj: any) => void;
    selectedZoneId?: string | null;
    zoneStatsData?: Map<string, { totalBins: number; usedBins: number; totalItems: number; topItems: Array<{ name: string; qty: number }> }>;
    currentFloor?: number;
    envShadows?: boolean;
    timeOfDay?: number;
}

// Camera controller with fly-to-beacon support
function CameraFlyTo({ gridCells, preset, flyToTarget }: { gridCells: number; preset: string; flyToTarget?: [number, number, number] }) {
    const { camera } = useThree();
    const controls = useThree(s => s.controls) as any;
    const targetPos = useRef(new THREE.Vector3());
    const orbitTarget = useRef(new THREE.Vector3(gridCells / 2, 0, gridCells / 2));
    const animating = useRef(false);
    const prevFlyTo = useRef<string>('');

    // Fly-to-beacon takes priority over preset changes
    useEffect(() => {
        if (flyToTarget) {
            const key = flyToTarget.join(',');
            if (key === prevFlyTo.current) return;
            prevFlyTo.current = key;

            // Position camera closer to beacon with better viewing angle
            const [bx, by, bz] = flyToTarget;
            targetPos.current.set(bx + 3, by + 4.5, bz + 3);
            orbitTarget.current.set(bx, 0, bz);
            animating.current = true;
        }
    }, [flyToTarget]);

    // Preset-based camera positioning
    useEffect(() => {
        if (flyToTarget) return; // Don't override fly-to
        const half = gridCells / 2;
        orbitTarget.current.set(half, 0, half);
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
        animating.current = true;
    }, [preset, gridCells, flyToTarget]);

    useFrame(() => {
        if (!animating.current) return;
        // Smooth ease-out interpolation
        const speed = 0.06;
        camera.position.lerp(targetPos.current, speed);
        if (controls && controls.target) {
            const ct = controls.target as THREE.Vector3;
            ct.lerp(orbitTarget.current, speed);
            controls.update?.();
        }
        if (camera.position.distanceTo(targetPos.current) < 0.05) {
            animating.current = false;
        }
    });

    return null;
}

export default function WarehouseScene(props: WarehouseSceneProps) {
    const isHigh = props.graphicsQuality !== 'performance';
    return (
        <Canvas
            camera={{ position: [props.gridCells * 0.7, props.gridCells * 0.4, props.gridCells * 0.7], fov: 45 }}
            shadows={isHigh} dpr={isHigh ? [1, 2] : [1, 1.5]}
            style={{ width: '100%', height: '100%', borderRadius: 12 }}
            gl={{
                antialias: true, alpha: false,
                powerPreference: 'high-performance',
                preserveDrawingBuffer: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: isHigh ? 1.1 : 1.0,
            }}
        >
            <Suspense fallback={null}>
                <SceneContent {...props} />
                {isHigh && <SoftShadows size={15} samples={16} focus={0.5} />}
            </Suspense>
            {/* Post-processing pipeline (high quality only) */}
            {isHigh && (
                <EffectComposer multisampling={0}>
                    <SMAA />
                    <SSAO
                        radius={0.4}
                        intensity={15}
                        luminanceInfluence={0.6}
                        color={new THREE.Color(props.isDark !== false ? '#0a0a1a' : '#8090a0')}
                    />
                    <Bloom
                        intensity={1.2}
                        luminanceThreshold={0.4}
                        luminanceSmoothing={0.9}
                        mipmapBlur
                    />
                    <Vignette
                        offset={0.3}
                        darkness={props.isDark !== false ? 0.5 : 0.25}
                    />
                    <DepthOfField focusDistance={0.05} focalLength={0.15} bokehScale={4} />
                </EffectComposer>
            )}
        </Canvas>
    );
}
