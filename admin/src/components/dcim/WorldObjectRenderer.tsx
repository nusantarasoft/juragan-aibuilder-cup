import React from 'react';
import { Box, Cylinder, Sphere } from '@react-three/drei';
import { WorldObjectData } from '@/store/useDcimStore';

export function WorldObjectRenderer({ data, viewMode }: { data: WorldObjectData; viewMode: string }) {
    if (data.type === 'wall') {
        return (
            <group position={[0, 1.5, 0]}>
                <Box args={[4, 3, 0.4]} castShadow receiveShadow>
                    <meshStandardMaterial color="#b0b0b0" roughness={0.9} />
                </Box>
            </group>
        );
    }
    
    if (data.type === 'tree') {
        return (
            <group position={[0, 0, 0]}>
                {/* Trunk */}
                <Cylinder args={[0.2, 0.3, 1]} position={[0, 0.5, 0]} castShadow receiveShadow>
                    <meshStandardMaterial color="#5c4033" roughness={1} />
                </Cylinder>
                {/* Leaves */}
                <Sphere args={[1.2, 16, 16]} position={[0, 2, 0]} castShadow receiveShadow>
                    <meshStandardMaterial color="#2e8b57" roughness={0.8} />
                </Sphere>
            </group>
        );
    }

    if (data.type === 'generator') {
        return (
            <group position={[0, 1, 0]}>
                <Box args={[2.5, 2, 4]} castShadow receiveShadow>
                    <meshStandardMaterial color="#333333" roughness={0.7} metalness={0.5} />
                </Box>
                <Cylinder args={[0.3, 0.3, 1]} position={[0.8, 1.5, 1.2]} castShadow receiveShadow>
                    <meshStandardMaterial color="#111111" />
                </Cylinder>
            </group>
        );
    }

    if (data.type === 'zone') {
        let color = "#333333";
        if (data.material === 'grass') color = "#4caf50";
        if (data.material === 'concrete') color = "#9e9e9e";
        if (data.material === 'tiles') color = "#e0e0e0";

        return (
            <group position={[0, 0.01, 0]}>
                <Box args={[data.width || 10, 0.1, data.depth || 10]} receiveShadow>
                    <meshStandardMaterial color={color} roughness={0.9} />
                </Box>
            </group>
        );
    }

    if (data.type === 'pillar') {
        return (
            <group position={[0, 2, 0]}>
                <Box args={[0.8, 4, 0.8]} castShadow receiveShadow>
                    <meshStandardMaterial color="#c0c0c0" roughness={1.0} />
                </Box>
            </group>
        );
    }

    if (data.type === 'cableTray') {
        return (
            <group position={[0, 3.5, 0]}>
                <Box args={[4, 0.1, 0.6]} castShadow receiveShadow>
                    <meshStandardMaterial color="#b87333" roughness={0.5} metalness={0.8} />
                </Box>
            </group>
        );
    }

    if (data.type === 'pipe') {
        return (
            <group position={[0, 3.8, 0]}>
                <Cylinder args={[0.2, 0.2, 4]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
                    <meshStandardMaterial color={data.material === 'metal' ? "#aaaaaa" : "#1a53ff"} roughness={0.3} metalness={0.6} />
                </Cylinder>
            </group>
        );
    }

    if (data.type === 'server1u') {
        return (
            <group position={[0, 0.05, 0]}>
                <Box args={[0.8, 0.1, 1]} castShadow receiveShadow>
                    <meshStandardMaterial color="#2c2c2c" roughness={0.7} metalness={0.4} />
                </Box>
                {/* Front Panel Lights */}
                <Box args={[0.7, 0.05, 0.01]} position={[0, 0, 0.5]} castShadow={false}>
                    <meshStandardMaterial color="#52c41a" emissive="#52c41a" emissiveIntensity={0.5} />
                </Box>
            </group>
        );
    }

    if (data.type === 'server2u') {
        return (
            <group position={[0, 0.1, 0]}>
                <Box args={[0.8, 0.2, 1]} castShadow receiveShadow>
                    <meshStandardMaterial color="#262626" roughness={0.8} metalness={0.3} />
                </Box>
                {/* Drive Bays */}
                {Array.from({ length: 4 }).map((_, i) => (
                    <Box key={i} args={[0.15, 0.15, 0.02]} position={[-0.3 + (i * 0.2), 0, 0.5]} castShadow={false}>
                        <meshStandardMaterial color="#1f1f1f" />
                    </Box>
                ))}
            </group>
        );
    }

    if (data.type === 'networkSwitch') {
        return (
            <group position={[0, 0.05, 0]}>
                <Box args={[0.8, 0.1, 0.8]} castShadow receiveShadow>
                    <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.5} />
                </Box>
                {/* Ports */}
                <Box args={[0.7, 0.05, 0.01]} position={[0, 0, 0.4]} castShadow={false}>
                    <meshStandardMaterial color="#1890ff" emissive="#1890ff" emissiveIntensity={0.8} />
                </Box>
            </group>
        );
    }

    return null;
}
