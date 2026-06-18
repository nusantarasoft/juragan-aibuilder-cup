import React from 'react';
import * as THREE from 'three';
import { Grid, Box } from '@react-three/drei';

export function DataCenterArchitecture() {
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: '#e2e8f0', // light grey/blue modern concrete
        roughness: 0.9,
        metalness: 0.1 
    });

    const pillarMaterial = new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.7,
        metalness: 0.3
    });

    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: '#1a1a1a', // dark industrial ceiling
        roughness: 0.8,
    });

    // Generate Pillars (3x3 grid)
    const pillars = [];
    for (let x of [-12, 0, 12]) {
        for (let z of [-12, 0, 12]) {
            pillars.push(<Box key={`pillar-${x}-${z}`} args={[0.6, 4.5, 0.6]} position={[x, 2.25, z]} material={pillarMaterial} castShadow receiveShadow />);
        }
    }

    // Generate Ceiling Lights (4x4 grid)
    const lights = [];
    for (let x of [-15, -5, 5, 15]) {
        for (let z of [-15, -5, 5, 15]) {
            lights.push(
                <group key={`light-${x}-${z}`} position={[x, 4.48, z]}>
                    {/* The physical LED panel */}
                    <Box args={[2, 0.05, 2]}>
                        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
                    </Box>
                    {/* The actual light source */}
                    <pointLight distance={15} intensity={0.5} decay={2} color="#ffffff" castShadow />
                </group>
            );
        }
    }

    return (
        <group>
            {/* Raised Floor */}
            <Grid args={[40, 40]} position={[0, 0.01, 0]} sectionSize={0.6} sectionColor="#444" cellColor="#333" fadeDistance={30} />
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[40, 40]} />
                <meshStandardMaterial color="#262626" roughness={0.7} />
            </mesh>

            {/* Back Wall */}
            <Box args={[40, 4.5, 0.5]} position={[0, 2.25, -20.25]} material={wallMaterial} receiveShadow />
            
            {/* Left Wall */}
            <Box args={[0.5, 4.5, 40]} position={[-20.25, 2.25, 0]} material={wallMaterial} receiveShadow />
            
            {/* Right Wall */}
            <Box args={[0.5, 4.5, 40]} position={[20.25, 2.25, 0]} material={wallMaterial} receiveShadow />

            {/* Ceiling */}
            <mesh position={[0, 4.5, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[40.5, 40.5]} />
                <primitive object={ceilingMaterial} />
            </mesh>

            {/* Pillars */}
            {pillars}

            {/* Ceiling Lights */}
            {lights}

            {/* Ambient Base Light */}
            <ambientLight intensity={0.2} />
        </group>
    );
}
