import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line, RoundedBox, Text } from '@react-three/drei';
import { useDcimStore } from '@/store/useDcimStore';

function NetworkCable({ start, end }: { start: THREE.Vector3, end: THREE.Vector3 }) {
    const lineRef = useRef<any>(null);
    const dashOffset = useRef(0);

    useFrame((state, delta) => {
        if (lineRef.current?.material) {
            dashOffset.current -= delta * 2;
            lineRef.current.material.dashOffset = dashOffset.current;
        }
    });

    const mid1 = new THREE.Vector3(start.x, 3.5, start.z);
    const mid2 = new THREE.Vector3(end.x, 3.5, start.z);
    const mid3 = new THREE.Vector3(end.x, 3.5, end.z);

    return (
        <Line 
            ref={lineRef}
            points={[start, mid1, mid2, mid3, end]} 
            color="#00f0ff" 
            lineWidth={4} 
            dashed 
            dashScale={10}
            dashSize={0.5}
            dashOffset={0}
        />
    );
}

export function NetworkOverlay() {
    const { racks, viewMode } = useDcimStore();

    if (viewMode !== 'Network') return null;

    // Define a Core Switch at a fixed location
    const coreSwitchPos = new THREE.Vector3(-10, 1.5, 10);

    return (
        <group>
            <RoundedBox args={[1, 3, 1]} position={coreSwitchPos} radius={0.05} smoothness={4}>
                <meshStandardMaterial color="#001133" roughness={0.2} metalness={0.9} emissive="#0055ff" emissiveIntensity={0.5} />
            </RoundedBox>
            <Text position={[-10, 3.5, 10]} fontSize={0.5} color="#00ffff" outlineWidth={0.02} outlineColor="#000000">
                Core Switch
            </Text>

            {racks.map((rack, i) => {
                const end = new THREE.Vector3(rack.x, 2.0, rack.z);
                return (
                    <NetworkCable key={`net-${i}`} start={new THREE.Vector3(-10, 2.5, 10)} end={end} />
                );
            })}
        </group>
    );
}
