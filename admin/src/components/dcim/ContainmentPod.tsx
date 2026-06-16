import React from 'react';
import { PodData } from '@/store/useDcimStore';
import { Edges } from '@react-three/drei';

interface ContainmentPodProps {
    data: PodData;
    viewMode: string;
}

export function ContainmentPod({ data, viewMode }: ContainmentPodProps) {
    // A containment pod is typically a glass box that covers an aisle.
    // The width corresponds to the row of racks, depth is the aisle distance.
    // Height is standard rack height + some extra for roof panels (around 2.5m total).

    const height = 2.4; // A bit taller than standard racks (2m)
    
    // We adjust position to align exactly over the aisle
    return (
        <group position={[data.x, height / 2, data.z]}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[data.width, height, data.depth]} />
                <meshPhysicalMaterial 
                    color={data.type === 'cold-aisle' ? "#e6f7ff" : "#fff1f0"} 
                    transparent 
                    opacity={0.15} 
                    roughness={0.1} 
                    metalness={0.1}
                    clearcoat={1.0}
                    side={2} // DoubleSide
                />
                <Edges scale={1} threshold={15} color={data.type === 'cold-aisle' ? "#91d5ff" : "#ffa39e"} />
            </mesh>

            {/* Sliding Doors on the ends */}
            <mesh position={[-data.width / 2, 0, 0]}>
                <boxGeometry args={[0.05, height, data.depth]} />
                <meshPhysicalMaterial color="#333" transparent opacity={0.6} roughness={0.4} metalness={0.8} />
            </mesh>
            <mesh position={[data.width / 2, 0, 0]}>
                <boxGeometry args={[0.05, height, data.depth]} />
                <meshPhysicalMaterial color="#333" transparent opacity={0.6} roughness={0.4} metalness={0.8} />
            </mesh>

            {/* Roof Panels */}
            <mesh position={[0, height / 2, 0]}>
                <boxGeometry args={[data.width, 0.05, data.depth]} />
                <meshStandardMaterial color="#fff" transparent opacity={0.3} />
            </mesh>
        </group>
    );
}
