import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Html, useCursor, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { ServerUnit } from './ServerUnit';
import { useDcimStore, RackData } from '@/store/useDcimStore';

interface RackModelProps {
    data: RackData;
    viewMode: string;
    onClick: (data: any) => void;
    isSelected: boolean;
}

export function RackModel({ data, viewMode, onClick, isSelected }: RackModelProps) {
    const { editMode, updateRackPosition, racks, selectedServerId, setSelectedServerId } = useDcimStore();
    const [hovered, setHovered] = useState(false);
    useCursor(hovered, 'pointer', 'auto');
    const ref = useRef<THREE.Group>(null);
    const ledMaterial = useRef<THREE.MeshStandardMaterial>(null);

    const getColor = () => {
        if (isSelected) return '#1890ff';
        if (hovered) return '#40a9ff';
        
        switch (viewMode) {
            case 'Thermal': return data.temp < 25 ? '#52c41a' : data.temp < 29 ? '#faad14' : '#ff4d4f';
            case 'Power': return data.power < 4 ? '#87d068' : data.power < 7 ? '#108ee9' : '#722ed1';
            case 'Utilization': 
                const util = data.usedU / data.totalU;
                return util < 0.5 ? '#d9d9d9' : util < 0.8 ? '#52c41a' : '#ff4d4f';
            default: return '#262626';
        }
    };

    useFrame(({ clock }) => {
        if (ledMaterial.current && data.status !== 'normal') {
            const speed = data.status === 'critical' ? 10 : 3;
            ledMaterial.current.emissiveIntensity = ((Math.sin(clock.elapsedTime * speed) + 1) / 2) * 5 + 2;
        } else if (ledMaterial.current) {
            ledMaterial.current.emissiveIntensity = 2; // Base glow for normal
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

    // Basic collision check against other racks
    const isColliding = racks.some(r => {
        if (r.id === data.id) return false;
        const dx = r.x - data.x;
        const dz = r.z - data.z;
        return Math.sqrt(dx * dx + dz * dz) < 0.8;
    });

    const U_HEIGHT = 0.04445; // 1U in meters
    const rackHeight = data.totalU * U_HEIGHT + 0.1; // +0.1 for base and top panel

    const rackGroup = (
        <group position={[data.x, 0, data.z]} 
               rotation={[0, data.rotationY || 0, 0]}
               onClick={(e) => { e.stopPropagation(); onClick(data); }}
               onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
               onPointerOut={() => setHovered(false)}
               ref={ref}
        >
            {editMode && isSelected && (
                <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[1.0, 1.2, 32]} />
                    <meshBasicMaterial color={isColliding ? "#ff4d4f" : "#1890ff"} transparent opacity={0.8} />
                </mesh>
            )}
            {editMode && isSelected && (
                <Html position={[0, 2.5, 0]} center>
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
            <RoundedBox args={[0.6, rackHeight, 1.0]} radius={0.02} smoothness={4} position={[0, rackHeight/2, 0]}>
                <meshStandardMaterial color={getColor()} metalness={viewMode === 'Normal' ? 0.6 : 0.1} roughness={0.4} />
            </RoundedBox>

            {/* Front Door Glass */}
            {viewMode === 'Normal' && (
                <mesh position={[0, rackHeight/2, 0.51]}>
                    <planeGeometry args={[0.55, rackHeight - 0.1]} />
                    <meshPhysicalMaterial color="#111" transparent opacity={0.3} roughness={0.1} metalness={0.8} />
                </mesh>
            )}

            {/* Render actual servers */}
            {viewMode === 'Normal' && data.servers.map((server) => {
                // Calculate position based on uSlot
                // Bottom is 0, so slot 1 is at bottom.
                const centerY = (server.uSlot - 1) * U_HEIGHT + ((server.uHeight * U_HEIGHT) / 2);
                return (
                    <ServerUnit 
                        key={server.id} 
                        server={server}
                        position={[0, centerY + 0.05, 0.1]} // +0.05 for bottom base offset
                        isSelected={selectedServerId === server.id}
                        onClick={() => setSelectedServerId(server.id)}
                    />
                );
            })}

            {/* Status LED */}
            {viewMode === 'Normal' && (
                <mesh position={[0.25, rackHeight - 0.05, 0.52]}>
                    <circleGeometry args={[0.02, 16]} />
                    <meshStandardMaterial 
                        ref={ledMaterial}
                        color={data.status === 'critical' ? '#ff4d4f' : data.status === 'warning' ? '#faad14' : '#52c41a'} 
                        emissive={data.status === 'critical' ? '#ff4d4f' : data.status === 'warning' ? '#faad14' : '#52c41a'}
                        emissiveIntensity={data.status === 'normal' ? 2 : 5}
                        toneMapped={false}
                    />
                </mesh>
            )}

            {(hovered || isSelected || viewMode !== 'Normal') && !editMode && (
                <Html position={[0, rackHeight + 0.2, 0]} center style={{ pointerEvents: 'none' }}>
                    <div style={{
                        background: 'rgba(0,0,0,0.75)', color: 'white', padding: '4px 8px',
                        borderRadius: 4, fontSize: 12, backdropFilter: 'blur(4px)',
                        border: isSelected ? '1px solid #1890ff' : 'none', whiteSpace: 'nowrap'
                    }}>
                        <strong>{data.name}</strong>
                        {viewMode === 'Thermal' && <div>{data.temp}°C</div>}
                        {viewMode === 'Power' && <div>{data.power} kW</div>}
                        {viewMode === 'Utilization' && <div>{Math.round((data.usedU/data.totalU)*100)}% Used</div>}
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
