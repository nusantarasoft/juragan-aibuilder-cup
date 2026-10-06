import React from 'react';
import * as THREE from 'three';
import { Grid, Box } from '@react-three/drei';

/**
 * Architectural floor plan style data center - clean white grid,
 * open plan, no walls/ceiling. Like Sunbird dcTrack visualization.
 */
export function DataCenterArchitecture() {
    const floorW = 40;
    const floorD = 30;

    return (
        <group>
            {/* ===== FLOOR BASE ===== */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
                <planeGeometry args={[floorW, floorD]} />
                <meshStandardMaterial color="#f0f0f0" roughness={0.9} metalness={0.0} />
            </mesh>

            {/* ===== RAISED FLOOR GRID ===== */}
            <Grid
                position={[0, 0.001, 0]}
                args={[floorW, floorD]}
                cellSize={0.6}
                cellThickness={0.6}
                cellColor="#cccccc"
                sectionSize={3.0}
                sectionThickness={1.0}
                sectionColor="#999999"
                fadeDistance={80}
                infiniteGrid={false}
            />

            {/* ===== FLOOR EDGE MARKERS ===== */}
            {/* Subtle border around the data hall footprint */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
                <ringGeometry args={[0, 0, 0]} />
            </mesh>
            {/* Border lines */}
            <Box args={[floorW, 0.02, 0.05]} position={[0, 0.01, -floorD / 2]}>
                <meshBasicMaterial color="#888888" />
            </Box>
            <Box args={[floorW, 0.02, 0.05]} position={[0, 0.01, floorD / 2]}>
                <meshBasicMaterial color="#888888" />
            </Box>
            <Box args={[0.05, 0.02, floorD]} position={[-floorW / 2, 0.01, 0]}>
                <meshBasicMaterial color="#888888" />
            </Box>
            <Box args={[0.05, 0.02, floorD]} position={[floorW / 2, 0.01, 0]}>
                <meshBasicMaterial color="#888888" />
            </Box>
        </group>
    );
}
