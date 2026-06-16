import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Html, SoftShadows, Box } from '@react-three/drei';
import * as THREE from 'three';
import { Spin } from 'antd';

const HVACFan = ({ position, rotation, isRunning }: { position: [number,number,number], rotation?: [number,number,number], isRunning: boolean }) => {
    const fanRef = useRef<THREE.Group>(null);
    useFrame(() => {
        if (isRunning && fanRef.current) {
            fanRef.current.rotation.z -= 0.15;
        }
    });

    return (
        <group position={position} rotation={rotation || [0,0,0]}>
            <Box args={[1.2, 1.2, 0.4]} castShadow>
                <meshStandardMaterial color="#444" roughness={0.7} />
            </Box>
            <group ref={fanRef} position={[0, 0, 0.25]}>
                <mesh position={[0, 0.35, 0]}>
                    <boxGeometry args={[0.1, 0.7, 0.05]} />
                    <meshStandardMaterial color="#888" />
                </mesh>
                <mesh position={[0, -0.35, 0]}>
                    <boxGeometry args={[0.1, 0.7, 0.05]} />
                    <meshStandardMaterial color="#888" />
                </mesh>
                <mesh position={[0.35, 0, 0]} rotation={[0, 0, Math.PI/2]}>
                    <boxGeometry args={[0.1, 0.7, 0.05]} />
                    <meshStandardMaterial color="#888" />
                </mesh>
                <mesh position={[-0.35, 0, 0]} rotation={[0, 0, Math.PI/2]}>
                    <boxGeometry args={[0.1, 0.7, 0.05]} />
                    <meshStandardMaterial color="#888" />
                </mesh>
            </group>
        </group>
    );
};

const SmartZone = ({ position, size, label, temp, color }: { position: [number,number,number], size: [number,number], label: string, temp: number, color: string }) => {
    return (
        <group position={position}>
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
                <planeGeometry args={size} />
                <meshStandardMaterial color={color} transparent opacity={0.3} />
            </mesh>
            <Html position={[0, 1.5, 0]} center>
                <div style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', borderLeft: `3px solid ${color}` }}>
                    <div><strong>{label}</strong></div>
                    <div style={{ fontSize: 11 }}>{temp}°C</div>
                </div>
            </Html>
        </group>
    );
};

export default function Bms3dView({ isDark }: { isDark: boolean }) {
    return (
        <div style={{ width: '100%', height: 'calc(100vh - 180px)', minHeight: 600, borderRadius: 16, overflow: 'hidden', background: isDark ? '#050505' : '#e5e5e5' }}>
            <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>}>
                <Canvas shadows camera={{ position: [15, 15, 15], fov: 45 }}>
                    <color attach="background" args={[isDark ? '#050505' : '#e5e5e5']} />
                    <ambientLight intensity={isDark ? 0.4 : 0.8} />
                    <directionalLight position={[10, 20, 10]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
                    <SoftShadows size={15} samples={16} focus={0.5} />
                    
                    {/* Building Floor */}
                    <Grid args={[40, 40]} position={[0, 0, 0]} sectionSize={1} sectionColor="#666" cellColor="#333" />
                    
                    <group>
                        {/* Zones */}
                        <SmartZone position={[-5, 0, -5]} size={[10, 10]} label="North Wing (HQ)" temp={22.5} color="#52c41a" />
                        <SmartZone position={[5, 0, -5]} size={[10, 10]} label="Data Center" temp={19.0} color="#1890ff" />
                        <SmartZone position={[-5, 0, 5]} size={[10, 10]} label="Cafeteria" temp={24.2} color="#faad14" />
                        
                        {/* HVAC Units on Roof */}
                        <group position={[0, 4, 0]}>
                            <mesh position={[-5, 0, -5]} castShadow><boxGeometry args={[3, 2, 3]} /><meshStandardMaterial color="#ccc" /></mesh>
                            <HVACFan position={[-5, 1, -5]} rotation={[-Math.PI/2, 0, 0]} isRunning={true} />
                            
                            <mesh position={[5, 0, -5]} castShadow><boxGeometry args={[3, 2, 3]} /><meshStandardMaterial color="#ccc" /></mesh>
                            <HVACFan position={[5, 1, -5]} rotation={[-Math.PI/2, 0, 0]} isRunning={true} />
                        </group>
                    </group>

                    <OrbitControls makeDefault maxPolarAngle={Math.PI/2 - 0.1} />
                    <Environment preset="city" />
                </Canvas>
            </Suspense>
        </div>
    );
}
