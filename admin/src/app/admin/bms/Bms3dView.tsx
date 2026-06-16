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

import DraggableModel from '@/components/3d/DraggableModel';
import { useState } from 'react';
import { LightingSystem, FireSafetySystem, SecurityDoor, HVACDuct } from '@/components/bms/BmsComponents';

export type BmsLayer = 'All' | 'HVAC' | 'Fire' | 'Security' | 'Lighting';

export default function Bms3dView({ isDark, editMode = false, activeLayer = 'All' }: { isDark: boolean, editMode?: boolean, activeLayer?: BmsLayer }) {
    const [zone1Pos, setZone1Pos] = useState<[number,number,number]>([-5, 0, -5]);
    const [zone2Pos, setZone2Pos] = useState<[number,number,number]>([5, 0, -5]);
    const [zone3Pos, setZone3Pos] = useState<[number,number,number]>([-5, 0, 5]);
    const [hvac1Pos, setHvac1Pos] = useState<[number,number,number]>([-5, 4, -5]);
    const [hvac2Pos, setHvac2Pos] = useState<[number,number,number]>([5, 4, -5]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const handleSelect = (id: string) => {
        if (editMode) setSelectedId(id);
    };

    const handlePositionChange = (id: string, pos: [number,number,number]) => {
        if (id === 'ZONE-1') setZone1Pos(pos);
        if (id === 'ZONE-2') setZone2Pos(pos);
        if (id === 'ZONE-3') setZone3Pos(pos);
        if (id === 'HVAC-1') setHvac1Pos(pos);
        if (id === 'HVAC-2') setHvac2Pos(pos);
    };

    const [isAlarmActive, setIsAlarmActive] = useState(false);
    const [isLightingOn, setIsLightingOn] = useState(true);

    return (
        <div style={{ width: '100%', height: 'calc(100vh - 180px)', minHeight: 600, borderRadius: 16, overflow: 'hidden', background: isDark ? '#050505' : '#e5e5e5' }}>
            <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>}>
                <Canvas shadows camera={{ position: [15, 15, 15], fov: 45 }} onPointerMissed={() => editMode && setSelectedId(null)}>
                    <color attach="background" args={[isDark ? '#050505' : '#e5e5e5']} />
                    {/* Dim ambient light significantly if lighting mode is active so pointlights show up better */}
                    <ambientLight intensity={activeLayer === 'Lighting' || activeLayer === 'All' ? (isDark ? 0.1 : 0.3) : (isDark ? 0.4 : 0.8)} />
                    <directionalLight position={[10, 20, 10]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
                    <SoftShadows size={15} samples={16} focus={0.5} />
                    
                    {/* Building Floor */}
                    <Grid args={[40, 40]} position={[0, 0, 0]} sectionSize={1} sectionColor="#666" cellColor="#333" />
                    
                    <group>
                        {/* Zones */}
                        <DraggableModel id="ZONE-1" position={zone1Pos} editMode={editMode} selectedId={selectedId} onSelect={handleSelect} onPositionChange={handlePositionChange}>
                            <SmartZone position={[0, 0, 0]} size={[10, 10]} label="North Wing (HQ)" temp={22.5} color={activeLayer === 'HVAC' ? "#52c41a" : "#888"} />
                            {(activeLayer === 'Lighting' || activeLayer === 'All') && <LightingSystem position={[0, 0, 0]} isOn={isLightingOn} />}
                            {(activeLayer === 'Fire' || activeLayer === 'All') && <FireSafetySystem position={[0, 0, 0]} isAlarmActive={isAlarmActive} />}
                        </DraggableModel>
                        
                        <DraggableModel id="ZONE-2" position={zone2Pos} editMode={editMode} selectedId={selectedId} onSelect={handleSelect} onPositionChange={handlePositionChange}>
                            <SmartZone position={[0, 0, 0]} size={[10, 10]} label="Data Center" temp={19.0} color={activeLayer === 'HVAC' ? "#1890ff" : "#888"} />
                            {(activeLayer === 'Lighting' || activeLayer === 'All') && <LightingSystem position={[0, 0, 0]} isOn={isLightingOn} />}
                            {(activeLayer === 'Fire' || activeLayer === 'All') && <FireSafetySystem position={[0, 0, 0]} isAlarmActive={isAlarmActive} />}
                        </DraggableModel>
                        
                        <DraggableModel id="ZONE-3" position={zone3Pos} editMode={editMode} selectedId={selectedId} onSelect={handleSelect} onPositionChange={handlePositionChange}>
                            <SmartZone position={[0, 0, 0]} size={[10, 10]} label="Cafeteria" temp={24.2} color={activeLayer === 'HVAC' ? "#faad14" : "#888"} />
                            {(activeLayer === 'Lighting' || activeLayer === 'All') && <LightingSystem position={[0, 0, 0]} isOn={isLightingOn} />}
                            {(activeLayer === 'Fire' || activeLayer === 'All') && <FireSafetySystem position={[0, 0, 0]} isAlarmActive={isAlarmActive} />}
                        </DraggableModel>
                        
                        {/* Security Doors (between zones) */}
                        {(activeLayer === 'Security' || activeLayer === 'All') && (
                            <group>
                                <SecurityDoor position={[0, 0, -5]} rotation={[0, Math.PI/2, 0]} isOpen={false} isLocked={isAlarmActive} />
                                <SecurityDoor position={[-5, 0, 0]} rotation={[0, 0, 0]} isOpen={true} isLocked={false} />
                            </group>
                        )}

                        {/* HVAC Units and Ducts on Roof */}
                        {(activeLayer === 'HVAC' || activeLayer === 'All') && (
                            <group>
                                <DraggableModel id="HVAC-1" position={hvac1Pos} editMode={editMode} selectedId={selectedId} onSelect={handleSelect} onPositionChange={handlePositionChange}>
                                    <mesh position={[0, -4, 0]} castShadow><boxGeometry args={[3, 2, 3]} /><meshStandardMaterial color="#ccc" /></mesh>
                                    <HVACFan position={[0, -3, 0]} rotation={[-Math.PI/2, 0, 0]} isRunning={true} />
                                </DraggableModel>
                                
                                <DraggableModel id="HVAC-2" position={hvac2Pos} editMode={editMode} selectedId={selectedId} onSelect={handleSelect} onPositionChange={handlePositionChange}>
                                    <mesh position={[0, -4, 0]} castShadow><boxGeometry args={[3, 2, 3]} /><meshStandardMaterial color="#ccc" /></mesh>
                                    <HVACFan position={[0, -3, 0]} rotation={[-Math.PI/2, 0, 0]} isRunning={true} />
                                </DraggableModel>

                                {/* Connecting Ducts */}
                                <HVACDuct start={[hvac1Pos[0], hvac1Pos[1]-3.5, hvac1Pos[2]]} end={[zone1Pos[0], 3, zone1Pos[2]]} isFlowing={true} />
                                <HVACDuct start={[hvac2Pos[0], hvac2Pos[1]-3.5, hvac2Pos[2]]} end={[zone2Pos[0], 3, zone2Pos[2]]} isFlowing={true} />
                            </group>
                        )}
                    </group>

                    {/* Simulation Controls (Floating UI in 3D canvas) */}
                    <Html position={[-15, 10, 0]} center>
                        <div style={{ background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8, color: isDark ? '#fff' : '#000' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Simulations</div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input type="checkbox" checked={isAlarmActive} onChange={(e) => setIsAlarmActive(e.target.checked)} />
                                Trigger Fire Alarm
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input type="checkbox" checked={isLightingOn} onChange={(e) => setIsLightingOn(e.target.checked)} />
                                Master Lighting
                            </label>
                        </div>
                    </Html>

                    <OrbitControls makeDefault maxPolarAngle={Math.PI/2 - 0.1} />
                    <Environment preset="city" />
                </Canvas>
            </Suspense>
        </div>
    );
}
