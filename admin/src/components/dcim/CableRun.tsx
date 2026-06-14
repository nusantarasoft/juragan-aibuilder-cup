import React from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

export function CableRun({ start, end, color = '#ff9900' }: { start: [number, number, number], end: [number, number, number], color?: string }) {
    // Generate a simple overhead L-shaped path for cables
    const points = [
        new THREE.Vector3(start[0], start[1], start[2]),
        new THREE.Vector3(start[0], 2.5, start[2]), // Go up to ceiling tray
        new THREE.Vector3(end[0], 2.5, start[2]),   // Move X
        new THREE.Vector3(end[0], 2.5, end[2]),     // Move Z
        new THREE.Vector3(end[0], end[1], end[2]),  // Go down to destination
    ];

    return (
        <Line points={points} color={color} lineWidth={3} />
    );
}
