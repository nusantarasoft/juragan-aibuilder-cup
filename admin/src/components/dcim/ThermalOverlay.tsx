import React from 'react';
import * as THREE from 'three';

// A simple heatmap plane overlay
export function ThermalOverlay({ width, length, yOffset = 0.05 }: { width: number, length: number, yOffset?: number }) {
    // In a real app, this would use a custom ShaderMaterial based on sensor points.
    // For demo, we just use a generic colored mesh
    return (
        <mesh position={[0, yOffset, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width, length, 32, 32]} />
            <meshBasicMaterial color="#faad14" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
    );
}
