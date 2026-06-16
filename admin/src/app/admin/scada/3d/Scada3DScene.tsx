import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Box, Cylinder, Torus, SoftShadows } from '@react-three/drei';
import { EffectComposer, Bloom, SSAO, SMAA, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';

const WaterPipe = ({ start, end, radius, animateFlow, thermalMode, temperature }: { start: [number,number,number], end: [number,number,number], radius: number, animateFlow: boolean, thermalMode: boolean, temperature: 'hot' | 'cold' | 'neutral' }) => {
    const ref = useRef<THREE.Mesh>(null);
    const vecStart = new THREE.Vector3(...start);
    const vecEnd = new THREE.Vector3(...end);
    const distance = vecStart.distanceTo(vecEnd);
    const position = vecStart.clone().lerp(vecEnd, 0.5);
    
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const dir = vecEnd.clone().sub(vecStart).normalize();
    quaternion.setFromUnitVectors(up, dir);

    const getColors = () => {
        if (thermalMode) {
            if (temperature === 'hot') return { c1: '#ff4d4f', c2: '#ff7875' };
            if (temperature === 'cold') return { c1: '#0050b3', c2: '#1890ff' };
            return { c1: '#555', c2: '#777' };
        }
        return { c1: '#1890ff', c2: '#69c0ff' };
    };

    const colors = getColors();

    const uniforms = useMemo(() => ({
        time: { value: 0 },
        color1: { value: new THREE.Color(colors.c1) },
        color2: { value: new THREE.Color(colors.c2) }
    }), [colors.c1, colors.c2]);

    useFrame((state) => {
        if (animateFlow) {
            uniforms.time.value = state.clock.elapsedTime * 2.0;
        }
    });

    return (
        <mesh position={position} quaternion={quaternion} ref={ref} castShadow receiveShadow>
            <cylinderGeometry args={[radius, radius, distance, 16]} />
            <shaderMaterial 
                transparent
                uniforms={uniforms}
                vertexShader={`
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `}
                fragmentShader={`
                    uniform float time;
                    uniform vec3 color1;
                    uniform vec3 color2;
                    varying vec2 vUv;
                    void main() {
                        float wave = sin(vUv.y * 20.0 - time) * 0.5 + 0.5;
                        gl_FragColor = vec4(mix(color1, color2, wave), 0.8);
                    }
                `}
            />
        </mesh>
    );
};


const FluidTank = ({ position, level, id, onClick }: { position: [number,number,number], level: number, id: string, onClick: (id: string) => void }) => {
    // level is 0.0 to 1.0
    const tankHeight = 6;
    const waterHeight = tankHeight * level;
    
    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
            {/* Outer Glass Shell */}
            <Cylinder args={[3, 3, tankHeight, 32]} position={[0, tankHeight/2, 0]} castShadow>
                <meshPhysicalMaterial 
                    color="#ffffff" 
                    transparent 
                    opacity={0.3} 
                    roughness={0.1} 
                    metalness={0.1}
                    transmission={0.9} 
                    thickness={0.5} 
                />
            </Cylinder>
            
            {/* Water Fill */}
            {waterHeight > 0.1 && (
                <Cylinder args={[2.9, 2.9, waterHeight, 32]} position={[0, waterHeight/2, 0]}>
                    <meshStandardMaterial color="#1890ff" transparent opacity={0.8} />
                </Cylinder>
            )}

            {/* Base */}
            <Cylinder args={[3.2, 3.2, 0.5, 32]} position={[0, 0.25, 0]}>
                <meshStandardMaterial color="#555" />
            </Cylinder>
            
            {/* Cap */}
            <Cylinder args={[3.2, 3.2, 0.5, 32]} position={[0, tankHeight, 0]}>
                <meshStandardMaterial color="#555" />
            </Cylinder>

            <Html position={[0, tankHeight + 1, 0]} center>
                <div style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 12 }}>
                    {id} ({Math.round(level * 100)}%)
                </div>
            </Html>
        </group>
    );
};

const WaterPump = ({ position, rotation, isRunning, id, onClick }: { position: [number,number,number], rotation?: [number,number,number], isRunning: boolean, id: string, onClick: (id: string) => void }) => {
    const impellerRef = useRef<THREE.Mesh>(null);
    useFrame(() => {
        if (isRunning && impellerRef.current) {
            impellerRef.current.rotation.z += 0.2;
        }
    });

    return (
        <group position={position} rotation={rotation || [0,0,0]} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
            <Box args={[1.5, 1, 1]} position={[0, 0.5, 0]} castShadow>
                <meshStandardMaterial color={isRunning ? "#52c41a" : "#faad14"} />
            </Box>
            <Cylinder args={[0.8, 0.8, 0.5, 16]} position={[1, 0.5, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
                <meshStandardMaterial color="#444" />
            </Cylinder>
            <mesh position={[1.3, 0.5, 0]} rotation={[0, 0, Math.PI/2]} ref={impellerRef}>
                <cylinderGeometry args={[0.5, 0.5, 0.1, 8]} />
                <meshStandardMaterial color="#222" />
            </mesh>
            <Html position={[0, 1.5, 0]} center>
                <div style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 10 }}>
                    {id} ({isRunning ? 'ON' : 'OFF'})
                </div>
            </Html>
        </group>
    );
};

const Valve = ({ position, rotation, onClick, id, isOpen }: { position: [number,number,number], rotation?: [number,number,number], onClick: (id: string) => void, id: string, isOpen: boolean }) => {
    return (
        <group position={position} rotation={rotation || [0,0,0]} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
            <Cylinder args={[0.3, 0.3, 0.6, 16]} rotation={[0, 0, Math.PI/2]} castShadow receiveShadow>
                <meshStandardMaterial color="#888" metalness={0.6} roughness={0.4} />
            </Cylinder>
            <Cylinder args={[0.05, 0.05, 0.5, 8]} position={[0, 0.5, 0]} castShadow receiveShadow>
                <meshStandardMaterial color="#666" />
            </Cylinder>
            <Torus args={[0.3, 0.05, 8, 16]} position={[0, 0.75, 0]} rotation={[Math.PI/2, 0, 0]} castShadow receiveShadow>
                <meshStandardMaterial color={isOpen ? "#52c41a" : "#f5222d"} />
            </Torus>
            <Html position={[0, 1.2, 0]} center>
                <div style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 10, border: `1px solid ${isOpen ? '#52c41a' : '#f5222d'}`, pointerEvents: 'auto', cursor: 'pointer' }}>
                    {id} ({isOpen ? 'OPEN' : 'CLOSED'})
                </div>
            </Html>
        </group>
    );
};

const CoolingTower = ({ position, onClick, id, isRunning, alarm }: { position: [number,number,number], onClick: (id: string) => void, id: string, isRunning: boolean, alarm?: boolean }) => {
    const fanRef = useRef<THREE.Group>(null);
    useFrame(() => {
        if (isRunning && fanRef.current) {
            fanRef.current.rotation.y += 0.1;
        }
    });
    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
            <Box args={[4, 5, 4]} position={[0, 2.5, 0]} castShadow receiveShadow>
                <meshStandardMaterial color={alarm ? "#ffcccc" : "#cccccc"} roughness={0.7} />
            </Box>
            <Cylinder args={[1.5, 1.8, 1, 32]} position={[0, 5.5, 0]} castShadow receiveShadow>
                <meshStandardMaterial color="#aaaaaa" />
            </Cylinder>
            <group position={[0, 5.5, 0]} ref={fanRef}>
                <Box args={[2.8, 0.1, 0.4]}>
                    <meshStandardMaterial color="#333" />
                </Box>
                <Box args={[0.4, 0.1, 2.8]}>
                    <meshStandardMaterial color="#333" />
                </Box>
            </group>
            {alarm && <pointLight position={[0, 6.5, 0]} color="#ff0000" intensity={2} distance={10} />}
            <Html position={[0, 7.5, 0]} center>
                <div style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 12, border: `1px solid ${alarm ? '#f5222d' : '#1890ff'}`, pointerEvents: 'none' }}>
                    <strong>{id}</strong><br/>
                    <span style={{ color: alarm ? '#f5222d' : (isRunning ? '#52c41a' : '#aaa') }}>
                        {alarm ? 'ALARM: HIGH VIB' : (isRunning ? 'Status: RUN' : 'Status: OFF')}
                    </span>
                </div>
            </Html>
        </group>
    );
};

const Chiller = ({ position, onClick, id, thermalMode, alarm }: { position: [number,number,number], onClick: (id: string) => void, id: string, thermalMode: boolean, alarm: boolean }) => {
    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
            <Box args={[3, 2, 4]} castShadow receiveShadow position={[0, 1, 0]}>
                <meshStandardMaterial color={thermalMode ? "#0050b3" : (alarm ? "#441111" : "#222")} roughness={0.3} metalness={0.8} />
            </Box>
            <Box args={[0.2, 1, 1]} position={[1.55, 1, 0]} castShadow>
                <meshStandardMaterial color="#444" />
            </Box>
            <Box args={[0.21, 0.8, 0.8]} position={[1.55, 1, 0]}>
                <meshBasicMaterial color={alarm ? "#f5222d" : "#52c41a"} />
            </Box>
            <Html position={[0, 2.5, 0]} center>
                <div style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 12, border: `1px solid ${alarm ? '#f5222d' : '#1890ff'}`, pointerEvents: 'none' }}>
                    <strong>{id}</strong><br/>
                    <span style={{ color: alarm ? '#f5222d' : '#52c41a' }}>{alarm ? 'TRIP' : 'RUN'}</span>
                </div>
            </Html>
        </group>
    );
};

const Pump = ({ position, onClick, id, animateFlow }: { position: [number,number,number], onClick: (id: string) => void, id: string, animateFlow: boolean }) => {
    const rotorRef = useRef<THREE.Group>(null);
    
    useFrame((state) => {
        if (animateFlow && rotorRef.current) {
            rotorRef.current.rotation.x += 0.2;
        }
    });

    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
            <Cylinder args={[0.6, 0.6, 1.5, 32]} rotation={[0, 0, Math.PI/2]} position={[-0.5, 0.6, 0]} castShadow receiveShadow>
                <meshStandardMaterial color="#52c41a" roughness={0.5} metalness={0.5} />
            </Cylinder>
            <Torus args={[0.6, 0.3, 16, 32]} position={[0.5, 0.6, 0]} rotation={[0, Math.PI/2, 0]} castShadow receiveShadow>
                <meshStandardMaterial color="#444" roughness={0.2} metalness={0.8} />
            </Torus>
            <group position={[-1.3, 0.6, 0]} ref={rotorRef}>
                <Box args={[0.1, 0.8, 0.2]}>
                    <meshStandardMaterial color="#faad14" />
                </Box>
            </group>
            <Html position={[0, 1.8, 0]} center>
                <div style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 12, border: '1px solid #52c41a', pointerEvents: 'none' }}>
                    <strong>{id}</strong><br/>
                    <span style={{ color: '#1890ff' }}>{animateFlow ? '60.0 Hz' : '0.0 Hz'}</span>
                </div>
            </Html>
        </group>
    );
};

import DraggableModel from '@/components/3d/DraggableModel';

export default function Scada3DScene({ onSelect, animateFlow, thermalMode, alarmActive, editMode = false }: { onSelect: (id: any) => void, animateFlow: boolean, thermalMode: boolean, alarmActive: boolean, editMode?: boolean }) {
    
    // Valve states
    const [valve1Open, setValve1Open] = useState(true);
    const [valve2Open, setValve2Open] = useState(true);

    const [chillerPos, setChillerPos] = useState<[number,number,number]>([-8, 0, 0]);
    const [pumpPos, setPumpPos] = useState<[number,number,number]>([2, 0, 2]);
    const [ctPos, setCtPos] = useState<[number,number,number]>([10, 0, -6]);
    const [selectedEquipId, setSelectedEquipId] = useState<string | null>(null);

    const handleSelect = (id: string) => {
        if (editMode) {
            setSelectedEquipId(id);
            return;
        }

        if (id === 'VALVE-01') {
            setValve1Open(!valve1Open);
            return;
        }
        if (id === 'VALVE-02') {
            setValve2Open(!valve2Open);
            return;
        }

        const equipData: any = {
            'CHILLER-01': { id: 'CHILLER-01', name: 'Primary Centrifugal Chiller', status: alarmActive ? 'Fault' : 'Running', telemetry: { 'Leaving Water Temp': '6.5 °C', 'Entering Water Temp': '12.1 °C', 'Compressor Load': '78%' } },
            'PUMP-CW-01': { id: 'PUMP-CW-01', name: 'Condenser Water Pump', status: (animateFlow && valve1Open) ? 'Running' : 'Stopped', telemetry: { 'Frequency': (animateFlow && valve1Open) ? '60.0 Hz' : '0.0 Hz', 'Flow Rate': (animateFlow && valve1Open) ? '1250 GPM' : '0 GPM', 'Vibration': '0.04 in/s' } },
            'CT-01': { id: 'CT-01', name: 'Cooling Tower 1', status: alarmActive ? 'High Vib Alarm' : 'Running', telemetry: { 'Fan Speed': '100%', 'Basin Temp': '22.0 °C' } }
        };
        if (equipData[id]) onSelect(equipData[id]);
    };

    const mainFlow = animateFlow && valve1Open;
    const secondaryFlow = animateFlow && valve2Open;

    const handlePositionChange = (id: string, pos: [number,number,number]) => {
        if (id === 'CHILLER-01') setChillerPos(pos);
        if (id === 'PUMP-CW-01') setPumpPos(pos);
        if (id === 'CT-01') setCtPos(pos);
    };

    return (
        <Canvas 
            camera={{ position: [15, 12, 20], fov: 45 }} 
            shadows
            gl={{ antialias: false, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
            onPointerMissed={() => editMode && setSelectedEquipId(null)}
        >
            <SoftShadows size={15} samples={16} focus={0.5} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 15, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
            <directionalLight position={[-10, 10, -10]} intensity={0.3} />

            <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
            </mesh>
            <gridHelper args={[100, 100, '#333', '#222']} position={[0, 0, 0]} />

            <group position={[0, 0, -2]}>
                
                {/* Chiller Section */}
                <DraggableModel id="CHILLER-01" position={chillerPos} editMode={editMode} selectedId={selectedEquipId} onSelect={handleSelect} onPositionChange={handlePositionChange}>
                    <Chiller position={[0, 0, 0]} id="CHILLER-01" onClick={handleSelect} thermalMode={thermalMode} alarm={false} />
                </DraggableModel>
                
                {/* Chiller to Pump Pipes */}
                <WaterPipe start={[-8, 0.5, 2]} end={[-8, 0.5, 4]} radius={0.2} animateFlow={mainFlow} thermalMode={thermalMode} temperature="cold" />
                <WaterPipe start={[-8, 0.5, 4]} end={[-2, 0.5, 4]} radius={0.2} animateFlow={mainFlow} thermalMode={thermalMode} temperature="cold" />
                
                {/* Main Control Valve */}
                <Valve position={[-2, 0.5, 4]} id="VALVE-01" isOpen={valve1Open} onClick={handleSelect} />

                {/* Valve to Pump */}
                <WaterPipe start={[-1.7, 0.5, 4]} end={[2, 0.5, 4]} radius={0.2} animateFlow={mainFlow} thermalMode={thermalMode} temperature="cold" />
                <WaterPipe start={[2, 0.5, 4]} end={[2, 0.6, 2.5]} radius={0.2} animateFlow={mainFlow} thermalMode={thermalMode} temperature="cold" />

                <DraggableModel id="PUMP-CW-01" position={pumpPos} editMode={editMode} selectedId={selectedEquipId} onSelect={handleSelect} onPositionChange={handlePositionChange}>
                    <Pump position={[0, 0, 0]} id="PUMP-CW-01" onClick={handleSelect} animateFlow={mainFlow} />
                </DraggableModel>
                
                {/* Outbound from Pump */}
                <WaterPipe start={[2.5, 0.6, 2]} end={[6, 0.6, 2]} radius={0.15} animateFlow={mainFlow} thermalMode={thermalMode} temperature="cold" />
                <WaterPipe start={[6, 0.6, 2]} end={[6, 5, 2]} radius={0.15} animateFlow={mainFlow} thermalMode={thermalMode} temperature="cold" />

                {/* Cooling Tower Loop (Hot Water Return) */}
                <WaterPipe start={[-8, 1.5, -2]} end={[-8, 1.5, -6]} radius={0.25} animateFlow={secondaryFlow} thermalMode={thermalMode} temperature="hot" />
                <WaterPipe start={[-8, 1.5, -6]} end={[5, 1.5, -6]} radius={0.25} animateFlow={secondaryFlow} thermalMode={thermalMode} temperature="hot" />
                
                <Valve position={[5, 1.5, -6]} rotation={[0,0,Math.PI/2]} id="VALVE-02" isOpen={valve2Open} onClick={handleSelect} />
                
                <WaterPipe start={[5.3, 1.5, -6]} end={[10, 1.5, -6]} radius={0.25} animateFlow={secondaryFlow} thermalMode={thermalMode} temperature="hot" />
                <WaterPipe start={[10, 1.5, -6]} end={[10, 5, -6]} radius={0.25} animateFlow={secondaryFlow} thermalMode={thermalMode} temperature="hot" />

                {/* Cooling Tower */}
                <DraggableModel id="CT-01" position={ctPos} editMode={editMode} selectedId={selectedEquipId} onSelect={handleSelect} onPositionChange={handlePositionChange}>
                    <CoolingTower position={[0, 0, 0]} id="CT-01" isRunning={secondaryFlow} onClick={handleSelect} alarm={alarmActive} />
                </DraggableModel>

            </group>

            <EffectComposer multisampling={0}>
                <SMAA />
                <SSAO radius={0.2} intensity={10} luminanceInfluence={0.6} />
                <Bloom luminanceThreshold={0.5} intensity={1.2} />
                <DepthOfField focusDistance={0.05} focalLength={0.1} bokehScale={2} />
            </EffectComposer>

            <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2 - 0.05} maxDistance={60} target={[0, 2, 0]} />
            <Environment preset="night" />
        </Canvas>
    );
}
