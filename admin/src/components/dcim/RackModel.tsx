import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useCursor, TransformControls, Box } from '@react-three/drei';
import * as THREE from 'three';
import { ServerUnit } from './ServerUnit';
import { useDcimStore, RackData } from '@/store/useDcimStore';

interface RackModelProps {
    data: RackData;
    viewMode: string;
    onClick: (data: RackData) => void;
    isSelected: boolean;
}

export function RackModel({ data, viewMode, onClick, isSelected }: RackModelProps) {
    const { editMode, updateRackPosition, racks, selectedServerId, setSelectedServerId } = useDcimStore();
    const [hovered, setHovered] = useState(false);
    useCursor(hovered, 'pointer', 'auto');
    const ref = useRef<THREE.Group>(null);
    const ledMaterial = useRef<THREE.MeshStandardMaterial>(null);

    const U_HEIGHT = 0.04445;
    const rackHeight = data.totalU * U_HEIGHT + 0.1;
    const rackW = 0.6;
    const rackD = 1.0;

    const getViewColor = () => {
        switch (viewMode) {
            case 'Thermal': return data.temp < 25 ? '#52c41a' : data.temp < 29 ? '#faad14' : '#ff4d4f';
            case 'Power': return data.power < 4 ? '#87d068' : data.power < 7 ? '#108ee9' : '#722ed1';
            case 'Utilization':
                const util = data.usedU / data.totalU;
                return util < 0.5 ? '#d9d9d9' : util < 0.8 ? '#52c41a' : '#ff4d4f';
            default: return null;
        }
    };

    // Transparent glass color for normal view, colored for other modes
    const viewColor = getViewColor();
    const isNormalView = viewMode === 'Normal';
    const glassColor = viewColor || '#4488cc';
    const glassOpacity = isNormalView ? 0.25 : 0.4;

    useFrame(({ clock }) => {
        if (ledMaterial.current) {
            const isNormal = data.status === 'normal';
            const speed = data.status === 'critical' ? 10 : 3;
            const intensity = isNormal ? 2 : ((Math.sin(clock.elapsedTime * speed) + 1) / 2) * 5 + 2;
            ledMaterial.current.emissiveIntensity = intensity;
        }
    });

    const handleDragEnd = () => {
        if (ref.current) {
            const p = ref.current.position;
            const snapX = Math.round(p.x * 2) / 2;
            const snapZ = Math.round(p.z * 2) / 2;
            updateRackPosition(data.id, snapX, snapZ, data.rotationY);
        }
    };

    const isColliding = racks.some(r => {
        if (r.id === data.id) return false;
        const dx = r.x - data.x;
        const dz = r.z - data.z;
        return Math.sqrt(dx * dx + dz * dz) < 0.8;
    });

    const rackGroup = (
        <group
            position={[data.x, 0, data.z]}
            rotation={[0, data.rotationY || 0, 0]}
            onClick={(e) => { e.stopPropagation(); onClick(data); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
            ref={ref}
        >
            {/* Selection indicator ring */}
            {editMode && isSelected && (
                <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[1.0, 1.2, 32]} />
                    <meshBasicMaterial color={isColliding ? "#ff4d4f" : "#1890ff"} transparent opacity={0.8} />
                </mesh>
            )}
            {!editMode && isSelected && (
                <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.65, 0.75, 32]} />
                    <meshBasicMaterial color="#0088ff" transparent opacity={0.5} side={THREE.DoubleSide} />
                </mesh>
            )}

            {/* Edit mode controls */}
            {editMode && isSelected && (
                <Html position={[0, rackHeight + 0.3, 0]} center>
                    <div style={{ background: 'rgba(0,0,0,0.8)', padding: 4, borderRadius: 8, display: 'flex', gap: 4, pointerEvents: 'auto' }}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                updateRackPosition(data.id, data.x, data.z, (data.rotationY || 0) + Math.PI / 2);
                            }}
                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px 8px' }}
                        >
                            Rotate +90°
                        </button>
                    </div>
                </Html>
            )}

            {/* ===== TRANSPARENT GLASS RACK BODY ===== */}
            {/* Main transparent box */}
            <mesh position={[0, rackHeight / 2, 0]}>
                <boxGeometry args={[rackW, rackHeight, rackD]} />
                <meshPhysicalMaterial
                    color={glassColor}
                    transparent
                    opacity={glassOpacity}
                    roughness={0.1}
                    metalness={0.1}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Wireframe edges overlay */}
            <mesh position={[0, rackHeight / 2, 0]}>
                <boxGeometry args={[rackW, rackHeight, rackD]} />
                <meshBasicMaterial color={viewColor || '#3377aa'} wireframe transparent opacity={0.5} />
            </mesh>

            {/* ===== FRAME POSTS (4 vertical rails) ===== */}
            {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
                <Box
                    key={`post-${i}`}
                    args={[0.03, rackHeight, 0.03]}
                    position={[sx * (rackW / 2 - 0.015), rackHeight / 2, sz * (rackD / 2 - 0.015)]}
                >
                    <meshStandardMaterial color={viewColor || '#336699'} metalness={0.6} roughness={0.3} />
                </Box>
            ))}

            {/* Top frame */}
            <Box args={[rackW, 0.02, rackD]} position={[0, rackHeight, 0]}>
                <meshStandardMaterial color={viewColor || '#336699'} metalness={0.6} roughness={0.3} />
            </Box>
            {/* Bottom frame */}
            <Box args={[rackW, 0.02, rackD]} position={[0, 0.01, 0]}>
                <meshStandardMaterial color={viewColor || '#336699'} metalness={0.6} roughness={0.3} />
            </Box>

            {/* ===== INTERNAL SERVER UNITS (visible through glass) ===== */}
            {data.servers.map((server) => {
                const centerY = (server.uSlot - 1) * U_HEIGHT + ((server.uHeight * U_HEIGHT) / 2);
                return (
                    <ServerUnit
                        key={server.id}
                        server={server}
                        position={[0, centerY + 0.05, 0.1]}
                        isSelected={selectedServerId === server.id}
                        onClick={() => setSelectedServerId(server.id)}
                    />
                );
            })}

            {/* ===== STATUS LED ===== */}
            <mesh position={[rackW / 2 - 0.02, rackHeight - 0.05, rackD / 2 + 0.01]}>
                <circleGeometry args={[0.015, 16]} />
                <meshStandardMaterial
                    ref={ledMaterial}
                    color={data.status === 'critical' ? '#ff4d4f' : data.status === 'warning' ? '#faad14' : '#52c41a'}
                    emissive={data.status === 'critical' ? '#ff4d4f' : data.status === 'warning' ? '#faad14' : '#52c41a'}
                    emissiveIntensity={2}
                    toneMapped={false}
                />
            </mesh>

            {/* ===== RACK LABEL (Always visible, large, above rack) ===== */}
            <Html position={[0, rackHeight + 0.15, 0]} center style={{ pointerEvents: 'none' }}>
                <div style={{
                    background: isSelected ? '#1890ff' : 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    padding: '3px 10px',
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    border: isSelected ? '2px solid #40a9ff' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: isSelected ? '0 0 12px rgba(24,144,255,0.6)' : 'none',
                    letterSpacing: '0.5px',
                }}>
                    {data.name}
                </div>
            </Html>

            {/* ===== EXTRA INFO ON HOVER ===== */}
            {(hovered && !isSelected) && !editMode && (
                <Html position={[0, rackHeight + 0.5, 0]} center style={{ pointerEvents: 'none' }}>
                    <div style={{
                        background: 'rgba(0,0,0,0.85)', color: 'white', padding: '6px 10px',
                        borderRadius: 6, fontSize: 11, backdropFilter: 'blur(4px)',
                        whiteSpace: 'nowrap', lineHeight: '16px',
                    }}>
                        <div><strong>{data.name}</strong></div>
                        <div>{data.temp}°C · {data.power} kW · {Math.round((data.usedU / data.totalU) * 100)}%</div>
                    </div>
                </Html>
            )}
        </group>
    );

    if (editMode && isSelected) {
        return (
            <TransformControls mode="translate" showY={false} onMouseUp={handleDragEnd} translationSnap={0.5}>
                {rackGroup}
            </TransformControls>
        );
    }

    return rackGroup;
}
