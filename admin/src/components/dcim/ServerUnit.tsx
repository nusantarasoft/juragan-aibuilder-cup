import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { ServerData } from '@/store/useDcimStore';

export function ServerUnit({ server, position, isSelected, onClick }: { server: ServerData, position: [number, number, number], isSelected: boolean, onClick: () => void }) {
    const ledRef = useRef<THREE.MeshStandardMaterial>(null);
    const groupRef = useRef<THREE.Group>(null);
    const [targetZ] = useState(() => new THREE.Vector3());

    useFrame(({ clock }) => {
        if (ledRef.current) {
            // Blinking activity light
            if (server.status === 'normal') {
                ledRef.current.emissiveIntensity = Math.random() > 0.9 ? 5 : 0;
            } else if (server.status === 'critical') {
                ledRef.current.emissiveIntensity = Math.random() > 0.5 ? 8 : 2;
            } else {
                ledRef.current.emissiveIntensity = 4;
            }
        }
        
        // Blade pull-out animation
        if (groupRef.current) {
            const tz = isSelected ? position[2] + 0.4 : position[2];
            groupRef.current.position.z += (tz - groupRef.current.position.z) * 0.1;
        }
    });

    const uHeightBase = 0.04445;
    const height = server.uHeight * uHeightBase;

    return (
        <group position={position} ref={groupRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
            <mesh>
                <boxGeometry args={[0.58, height - 0.005, 0.8]} />
                <meshStandardMaterial color={isSelected ? "#1890ff" : "#1f1f1f"} />
            </mesh>
            <mesh position={[0.2, 0, 0.405]}>
                <circleGeometry args={[0.005, 16]} />
                <meshStandardMaterial 
                    ref={ledRef}
                    color={server.status === 'critical' ? '#ff4d4f' : '#52c41a'} 
                    emissive={server.status === 'critical' ? '#ff4d4f' : '#52c41a'}
                    toneMapped={false}
                />
            </mesh>
        </group>
    );
}
