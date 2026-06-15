import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Html, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { ServerUnit } from './ServerUnit';

interface RackModelProps {
    data: any;
    viewMode: string;
    onClick: (data: any) => void;
    isSelected: boolean;
}

export function RackModel({ data, viewMode, onClick, isSelected }: RackModelProps) {
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
            ledMaterial.current.emissiveIntensity = (Math.sin(clock.elapsedTime * speed) + 1) / 2;
        }
    });

    return (
        <group position={[data.x, 1, data.z]} 
               onClick={(e) => { e.stopPropagation(); onClick(data); }}
               onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
               onPointerOut={() => setHovered(false)}
               ref={ref}
        >
            <RoundedBox args={[0.8, 2, 1.2]} radius={0.05} smoothness={4}>
                <meshStandardMaterial color={getColor()} metalness={viewMode === 'Normal' ? 0.6 : 0.1} roughness={0.4} />
            </RoundedBox>

            {viewMode === 'Normal' && (
                <mesh position={[0, 0, 0.61]}>
                    <planeGeometry args={[0.7, 1.9]} />
                    <meshPhysicalMaterial color="#111" transparent opacity={0.6} roughness={0.1} metalness={0.8} />
                </mesh>
            )}

            {viewMode === 'Normal' && Array.from({ length: Math.floor(data.usedU / 4) }).map((_, i) => (
                <ServerUnit key={i} position={[0, -0.8 + (i * 0.15), 0.5]} status={data.status} />
            ))}

            {viewMode === 'Normal' && (
                <mesh position={[0.3, 0.9, 0.62]}>
                    <circleGeometry args={[0.02, 16]} />
                    <meshStandardMaterial 
                        ref={ledMaterial}
                        color={data.status === 'critical' ? '#ff4d4f' : data.status === 'warning' ? '#faad14' : '#52c41a'} 
                        emissive={data.status === 'critical' ? '#ff4d4f' : data.status === 'warning' ? '#faad14' : '#52c41a'}
                        emissiveIntensity={data.status === 'normal' ? 1 : 0}
                    />
                </mesh>
            )}

            {(hovered || isSelected || viewMode !== 'Normal') && (
                <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
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
}
