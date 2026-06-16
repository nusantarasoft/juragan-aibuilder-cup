import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Html, SoftShadows, Box, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';

const Building = ({ position, args, color, label, path, Icon }: any) => {
    const router = useRouter();
    const [hovered, setHovered] = useState(false);
    const ref = useRef<THREE.Group>(null);

    useFrame(() => {
        if (ref.current) {
            // Smooth scale on hover
            const targetScale = hovered ? 1.05 : 1.0;
            ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        }
    });

    return (
        <group 
            position={position} 
            ref={ref}
            onClick={(e) => { e.stopPropagation(); router.push(path); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        >
            <Box args={args} position={[0, args[1]/2, 0]} castShadow receiveShadow>
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} emissive={hovered ? color : '#000'} emissiveIntensity={0.2} />
            </Box>
            {/* Windows pattern overlay (simple approximation) */}
            <Box args={[args[0] + 0.05, args[1] * 0.8, args[2] + 0.05]} position={[0, args[1]/2, 0]}>
                <meshStandardMaterial color={hovered ? "#fff" : "#888"} wireframe transparent opacity={0.1} />
            </Box>

            <Html position={[0, args[1] + 1, 0]} center style={{ pointerEvents: 'none', transition: 'all 0.3s', opacity: hovered ? 1 : 0.6, transform: hovered ? 'scale(1.2)' : 'scale(1)' }}>
                <div style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${color}`, boxShadow: hovered ? `0 0 10px ${color}` : 'none' }}>
                    <span style={{ color }}>{Icon}</span>
                    <strong style={{ fontSize: 14 }}>{label}</strong>
                </div>
            </Html>
        </group>
    );
};

export default function Campus3DScene({ isDark }: { isDark: boolean }) {
    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
            <Canvas shadows camera={{ position: [20, 25, 30], fov: 40 }}>
                <color attach="background" args={[isDark ? '#050505' : '#e5e5e5']} />
                <fog attach="fog" args={[isDark ? '#050505' : '#e5e5e5', 30, 80]} />
                
                <ambientLight intensity={isDark ? 0.4 : 0.8} />
                <directionalLight position={[20, 30, 10]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
                <SoftShadows size={20} samples={16} focus={0.5} />
                
                {/* Master Ground Grid */}
                <Grid args={[100, 100]} position={[0, 0, 0]} sectionSize={2} sectionColor="#444" cellColor="#222" fadeDistance={50} />
                <mesh position={[0, -0.1, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
                    <planeGeometry args={[100, 100]} />
                    <meshStandardMaterial color={isDark ? "#111" : "#ddd"} />
                </mesh>

                {/* The Campus Buildings */}
                {/* 1. DCIM - Data Center */}
                <Building 
                    position={[-10, 0, -10]} 
                    args={[8, 6, 12]} 
                    color="#1890ff" 
                    label="Data Center (DCIM)" 
                    path="/admin/dcim/3d-view" 
                    Icon="☁️"
                />

                {/* 2. SCADA - Industrial Plant */}
                <Building 
                    position={[10, 0, -5]} 
                    args={[10, 8, 8]} 
                    color="#52c41a" 
                    label="Industrial Plant (SCADA)" 
                    path="/admin/scada/3d" 
                    Icon="🏭"
                />

                {/* 3. BMS - HQ Office */}
                <Building 
                    position={[-5, 0, 10]} 
                    args={[12, 15, 8]} 
                    color="#722ed1" 
                    label="Headquarters (BMS)" 
                    path="/admin/bms" 
                    Icon="🏢"
                />

                {/* 4. PM Construction - New Development Area */}
                <Building 
                    position={[12, 0, 12]} 
                    args={[6, 3, 6]} 
                    color="#faad14" 
                    label="Construction Site (PM)" 
                    path="/admin/pm/construction-3d" 
                    Icon="🏗️"
                />

                {/* Decorative Roads/Paths */}
                <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
                    <planeGeometry args={[4, 40]} />
                    <meshStandardMaterial color={isDark ? "#222" : "#ccc"} />
                </mesh>
                <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, Math.PI/2]} receiveShadow>
                    <planeGeometry args={[4, 40]} />
                    <meshStandardMaterial color={isDark ? "#222" : "#ccc"} />
                </mesh>

                <OrbitControls makeDefault maxPolarAngle={Math.PI/2 - 0.05} maxDistance={60} minDistance={10} target={[0,0,0]} />
                <Environment preset={isDark ? "night" : "city"} blur={0.8} />
            </Canvas>
        </div>
    );
}
