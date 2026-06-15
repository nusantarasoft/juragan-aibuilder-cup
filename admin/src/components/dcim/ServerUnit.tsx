import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function ServerUnit({ position, status }: { position: [number, number, number], status: string }) {
    const ledRef = useRef<THREE.MeshStandardMaterial>(null);

    useFrame(({ clock }) => {
        if (ledRef.current) {
            // Blinking activity light
            if (status === 'normal') {
                ledRef.current.emissiveIntensity = Math.random() > 0.9 ? 5 : 0;
            } else if (status === 'critical') {
                ledRef.current.emissiveIntensity = Math.random() > 0.5 ? 8 : 2;
            } else {
                ledRef.current.emissiveIntensity = 4;
            }
        }
    });

    return (
        <group position={position}>
            <mesh>
                <boxGeometry args={[0.6, 0.1, 0.2]} />
                <meshStandardMaterial color="#1f1f1f" />
            </mesh>
            <mesh position={[0.2, 0, 0.11]}>
                <circleGeometry args={[0.015, 16]} />
                <meshStandardMaterial 
                    ref={ledRef}
                    color={status === 'critical' ? '#ff4d4f' : '#52c41a'} 
                    emissive={status === 'critical' ? '#ff4d4f' : '#52c41a'}
                    toneMapped={false}
                />
            </mesh>
        </group>
    );
}
