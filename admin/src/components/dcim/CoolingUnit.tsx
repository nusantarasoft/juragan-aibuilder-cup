'use client';

import React from 'react';
import { Box, Cylinder, Html } from '@react-three/drei';

export function CoolingUnit({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
    // Generate slats array for the front ventilation grille pattern
    const slatCount = 14;
    const slatStartY = 0.4;
    const slatEndY = 1.68;
    const slatStep = (slatEndY - slatStartY) / (slatCount - 1);
    const slats = Array.from({ length: slatCount }, (_, i) => slatStartY + i * slatStep);

    return (
        <group position={position}>
            {/* Base Plinth */}
            <Box args={[1.48, 0.1, 1.18]} position={[0, 0.05, 0]}>
                <meshStandardMaterial color="#181a1b" roughness={0.8} metalness={0.2} />
            </Box>

            {/* Blue Accent Strip at Bottom */}
            <Box args={[1.51, 0.04, 1.21]} position={[0, 0.12, 0]}>
                <meshStandardMaterial color="#1890ff" emissive="#0066cc" emissiveIntensity={0.5} roughness={0.3} />
            </Box>

            {/* Main Cabinet Body */}
            <Box args={[1.46, 1.95, 1.16]} position={[0, 1.15, 0]}>
                <meshStandardMaterial color="#2d3137" metalness={0.5} roughness={0.5} />
            </Box>

            {/* Left Side Panel (Slightly lighter grey, metallic) */}
            <Box args={[0.02, 1.85, 1.1]} position={[-0.735, 1.15, 0]}>
                <meshStandardMaterial color="#424750" metalness={0.65} roughness={0.35} />
            </Box>

            {/* Right Side Panel (Slightly lighter grey, metallic) */}
            <Box args={[0.02, 1.85, 1.1]} position={[0.735, 1.15, 0]}>
                <meshStandardMaterial color="#424750" metalness={0.65} roughness={0.35} />
            </Box>

            {/* Front Panel Inset (Darker) */}
            <Box args={[1.34, 1.85, 0.02]} position={[0, 1.15, 0.585]}>
                <meshStandardMaterial color="#16181c" metalness={0.3} roughness={0.7} />
            </Box>

            {/* Front Grille Backing Mesh (Dark recessed area behind slats) */}
            <Box args={[1.22, 1.34, 0.01]} position={[0, 1.04, 0.592]}>
                <meshStandardMaterial color="#0b0c0e" roughness={0.9} />
            </Box>

            {/* Ventilation Grille Slats */}
            {slats.map((y, index) => (
                <Box key={index} args={[1.24, 0.025, 0.02]} position={[0, y, 0.602]}>
                    <meshStandardMaterial color="#22262c" metalness={0.4} roughness={0.6} />
                </Box>
            ))}

            {/* Control Panel Area */}
            <Box args={[0.7, 0.22, 0.02]} position={[0, 1.92, 0.598]}>
                <meshStandardMaterial color="#121417" metalness={0.8} roughness={0.2} />
            </Box>

            {/* Control Screen Display */}
            <Box args={[0.34, 0.12, 0.01]} position={[-0.1, 1.92, 0.608]}>
                <meshStandardMaterial color="#0c2340" emissive="#091d36" emissiveIntensity={0.6} roughness={0.2} />
            </Box>

            {/* Status LED Indicator (Green emissive circle) */}
            <Cylinder args={[0.025, 0.025, 0.01, 16]} position={[0.18, 1.92, 0.608]} rotation={[Math.PI / 2, 0, 0]}>
                <meshStandardMaterial color="#00ff66" emissive="#00ff66" emissiveIntensity={0.9} />
            </Cylinder>

            {/* Secondary Status Indicator LED (Blue) */}
            <Cylinder args={[0.015, 0.015, 0.01, 16]} position={[0.25, 1.92, 0.608]} rotation={[Math.PI / 2, 0, 0]}>
                <meshStandardMaterial color="#00aaff" emissive="#00aaff" emissiveIntensity={0.7} />
            </Cylinder>

            {/* Top Cowl / Cover Trim */}
            <Box args={[1.48, 0.06, 1.18]} position={[0, 2.15, 0]}>
                <meshStandardMaterial color="#1e2126" metalness={0.5} roughness={0.5} />
            </Box>

            {/* Top Exhaust Vent 1 */}
            <group position={[-0.38, 2.18, 0]}>
                <Cylinder args={[0.36, 0.38, 0.08, 24]} position={[0, 0.04, 0]}>
                    <meshStandardMaterial color="#1c1e22" metalness={0.6} roughness={0.4} />
                </Cylinder>
                <Cylinder args={[0.31, 0.31, 0.085, 24]} position={[0, 0.045, 0]}>
                    <meshStandardMaterial color="#0e1012" roughness={0.8} />
                </Cylinder>
                <Cylinder args={[0.08, 0.08, 0.09, 16]} position={[0, 0.048, 0]}>
                    <meshStandardMaterial color="#30343b" metalness={0.7} roughness={0.3} />
                </Cylinder>
            </group>

            {/* Top Exhaust Vent 2 */}
            <group position={[0.38, 2.18, 0]}>
                <Cylinder args={[0.36, 0.38, 0.08, 24]} position={[0, 0.04, 0]}>
                    <meshStandardMaterial color="#1c1e22" metalness={0.6} roughness={0.4} />
                </Cylinder>
                <Cylinder args={[0.31, 0.31, 0.085, 24]} position={[0, 0.045, 0]}>
                    <meshStandardMaterial color="#0e1012" roughness={0.8} />
                </Cylinder>
                <Cylinder args={[0.08, 0.08, 0.09, 16]} position={[0, 0.048, 0]}>
                    <meshStandardMaterial color="#30343b" metalness={0.7} roughness={0.3} />
                </Cylinder>
            </group>

            {/* HTML Label */}
            <Html position={[0, 2.45, 0]} center>
                <div style={{ background: '#1890ff', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.3)', pointerEvents: 'none', userSelect: 'none' }}>CRAC</div>
            </Html>
        </group>
    );
}
