import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Box, Cylinder, Torus, SoftShadows, GizmoHelper, GizmoViewport, Sphere } from '@react-three/drei';
import { EffectComposer, Bloom, SSAO, SMAA, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import DraggableModel from '@/components/3d/DraggableModel';
import { useScada3dStore, Scada3dElement } from '@/store/useScada3dStore';
import { useScadaStore } from '@/store/useScadaStore';
const WaterPipe = ({ start, end, radius = 0.1, animateFlow = false, thermalMode = false, temperature = 'cold' }: any) => {
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


const AlarmBeacon = ({ position, active }: { position: [number,number,number], active: boolean }) => {
    const lightRef = useRef<THREE.PointLight>(null);
    const beaconRef = useRef<THREE.Mesh>(null);
    
    useFrame((state) => {
        if (active && lightRef.current && beaconRef.current) {
            const time = state.clock.elapsedTime * 10;
            const intensity = (Math.sin(time) + 1) / 2; // Pulsing
            lightRef.current.intensity = intensity * 15;
            beaconRef.current.rotation.y += 0.2;
        }
    });

    return (
        <group position={position}>
            <Cylinder args={[0.2, 0.2, 0.5, 16]} position={[0, 0.25, 0]}>
                <meshStandardMaterial color={active ? "#ff0000" : "#550000"} emissive={active ? "#ff0000" : "#000000"} emissiveIntensity={active ? 2 : 0} transparent opacity={0.8} />
            </Cylinder>
            <mesh ref={beaconRef} position={[0, 0.25, 0]}>
                <boxGeometry args={[0.05, 0.4, 0.3]} />
                <meshStandardMaterial color="#222" />
            </mesh>
            {active && <pointLight ref={lightRef} color="#ff0000" distance={10} decay={2} />}
        </group>
    );
};

const RoboticArm = ({ position, isRunning, id, onClick }: { position: [number,number,number], isRunning: boolean, id: string, onClick: (id: string) => void }) => {
    const baseRef = useRef<THREE.Group>(null);
    const joint1Ref = useRef<THREE.Group>(null);
    const joint2Ref = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (isRunning && baseRef.current && joint1Ref.current && joint2Ref.current) {
            const time = state.clock.elapsedTime * 1.5;
            baseRef.current.rotation.y = Math.sin(time * 0.5) * 1.5;
            joint1Ref.current.rotation.z = Math.sin(time) * 0.5 + 0.5;
            joint2Ref.current.rotation.z = Math.cos(time * 1.2) * 0.5 - 0.5;
        }
    });

    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
            {/* Base */}
            <Cylinder args={[1, 1.2, 0.5, 32]} position={[0, 0.25, 0]} castShadow>
                <meshStandardMaterial color="#ffaa00" />
            </Cylinder>
            <group ref={baseRef} position={[0, 0.5, 0]}>
                <Box args={[0.8, 1.5, 0.8]} position={[0, 0.75, 0]} castShadow>
                    <meshStandardMaterial color="#444" />
                </Box>
                {/* Joint 1 */}
                <group ref={joint1Ref} position={[0, 1.5, 0]}>
                    <Cylinder args={[0.5, 0.5, 1, 16]} rotation={[Math.PI/2, 0, 0]} castShadow>
                        <meshStandardMaterial color="#222" />
                    </Cylinder>
                    <Box args={[0.5, 3, 0.5]} position={[0, 1.5, 0]} castShadow>
                        <meshStandardMaterial color="#ffaa00" />
                    </Box>
                    {/* Joint 2 */}
                    <group ref={joint2Ref} position={[0, 3, 0]}>
                        <Cylinder args={[0.4, 0.4, 0.8, 16]} rotation={[Math.PI/2, 0, 0]} castShadow>
                            <meshStandardMaterial color="#222" />
                        </Cylinder>
                        <Box args={[0.3, 2, 0.3]} position={[0, 1, 0]} castShadow>
                            <meshStandardMaterial color="#444" />
                        </Box>
                        {/* End Effector */}
                        <Box args={[0.8, 0.2, 0.8]} position={[0, 2, 0]} castShadow>
                            <meshStandardMaterial color="#ff2222" />
                        </Box>
                    </group>
                </group>
            </group>
            <Html position={[0, 6, 0]} center>
                <div style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 12, border: `1px solid ${isRunning ? '#52c41a' : '#faad14'}`, pointerEvents: 'none' }}>
                    <strong>{id}</strong><br/>
                    <span style={{ color: isRunning ? '#52c41a' : '#aaa' }}>{isRunning ? 'ASSEMBLY: ON' : 'STANDBY'}</span>
                </div>
            </Html>
        </group>
    );
};

// ==================== NEW CAD COMPONENTS ====================

const ServerRack = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => {
    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
            {/* Rack Frame */}
            <Box args={[1.2, 4, 1.8]} position={[0, 2, 0]} castShadow receiveShadow>
                <meshStandardMaterial color="#111" roughness={0.3} metalness={0.9} />
            </Box>
            {/* Server Units (6U stacked) */}
            {[0.4, 0.9, 1.4, 1.9, 2.4, 2.9].map((y, i) => (
                <Box key={i} args={[1.1, 0.35, 1.7]} position={[0.05, y, 0]} castShadow>
                    <meshStandardMaterial color={i < 4 ? "#1a1a2e" : "#222"} roughness={0.5} metalness={0.6} />
                </Box>
            ))}
            {/* LED indicators */}
            {[0.4, 0.9, 1.4, 1.9].map((y, i) => (
                <Box key={`led-${i}`} args={[0.05, 0.05, 0.05]} position={[0.55, y, 0.86]}>
                    <meshBasicMaterial color="#52c41a" />
                </Box>
            ))}
            <Html position={[0, 4.5, 0]} center>
                <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 10, border: '1px solid #722ed1' }}>
                    <strong>{id}</strong>
                </div>
            </Html>
        </group>
    );
};

const Transformer = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[3, 2.5, 2]} position={[0, 1.25, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#556b2f" roughness={0.6} metalness={0.5} />
        </Box>
        {/* Bushings */}
        {[-0.8, 0, 0.8].map((x, i) => (
            <Cylinder key={i} args={[0.15, 0.1, 1.2, 8]} position={[x, 3.1, 0]} castShadow>
                <meshStandardMaterial color="#8b4513" roughness={0.4} metalness={0.3} />
            </Cylinder>
        ))}
        {/* Fins */}
        {[-1, -0.5, 0, 0.5, 1].map((x, i) => (
            <Box key={`fin-${i}`} args={[0.05, 2, 2.2]} position={[x, 1.25, 0]} castShadow>
                <meshStandardMaterial color="#4a5e2f" roughness={0.6} metalness={0.5} />
            </Box>
        ))}
        <Html position={[0, 4, 0]} center>
            <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 10, border: '1px solid #faad14' }}>
                <strong>{id}</strong><br/><span style={{color:'#52c41a'}}>XFMR</span>
            </div>
        </Html>
    </group>
);

const Generator = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => {
    const shaftRef = useRef<THREE.Mesh>(null);
    useFrame(() => { if (shaftRef.current) shaftRef.current.rotation.x += 0.05; });
    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
            <Box args={[4, 2, 2]} position={[0, 1, 0]} castShadow receiveShadow>
                <meshStandardMaterial color="#2c3e50" roughness={0.4} metalness={0.7} />
            </Box>
            <Cylinder args={[0.8, 0.8, 2.5, 16]} position={[-2.5, 1, 0]} rotation={[0, 0, Math.PI/2]} castShadow>
                <meshStandardMaterial color="#555" roughness={0.3} metalness={0.8} />
            </Cylinder>
            <mesh ref={shaftRef} position={[-3.8, 1, 0]} rotation={[0, 0, Math.PI/2]}>
                <cylinderGeometry args={[0.3, 0.3, 0.3, 6]} />
                <meshStandardMaterial color="#faad14" />
            </mesh>
            <Html position={[0, 2.8, 0]} center>
                <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 10, border: '1px solid #eb2f96' }}>
                    <strong>{id}</strong><br/><span style={{color:'#52c41a'}}>GENSET</span>
                </div>
            </Html>
        </group>
    );
};

const UPS = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[1.5, 4, 1.5]} position={[0, 2, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#1a1a2e" roughness={0.3} metalness={0.8} />
        </Box>
        <Box args={[1.3, 0.8, 0.05]} position={[0, 3.2, 0.76]}>
            <meshBasicMaterial color="#003a8c" />
        </Box>
        <Box args={[0.1, 0.1, 0.05]} position={[0.3, 3.6, 0.77]}>
            <meshBasicMaterial color="#52c41a" />
        </Box>
        <Html position={[0, 4.5, 0]} center>
            <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 10, border: '1px solid #13c2c2' }}>
                <strong>{id}</strong><br/><span style={{color:'#52c41a'}}>UPS ONLINE</span>
            </div>
        </Html>
    </group>
);

const AHU = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => {
    const fanRef = useRef<THREE.Mesh>(null);
    useFrame(() => { if (fanRef.current) fanRef.current.rotation.z += 0.15; });
    return (
        <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
            <Box args={[4, 2, 2.5]} position={[0, 1, 0]} castShadow receiveShadow>
                <meshStandardMaterial color="#607d8b" roughness={0.5} metalness={0.4} />
            </Box>
            {/* Intake grille */}
            <Box args={[0.1, 1.5, 2]} position={[-2, 1, 0]}>
                <meshStandardMaterial color="#333" roughness={0.8} />
            </Box>
            <mesh ref={fanRef} position={[2.05, 1, 0]}>
                <circleGeometry args={[0.6, 6]} />
                <meshStandardMaterial color="#aaa" side={THREE.DoubleSide} />
            </mesh>
            <Html position={[0, 2.8, 0]} center>
                <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 10, border: '1px solid #1890ff' }}>
                    <strong>{id}</strong><br/><span style={{color:'#52c41a'}}>AHU</span>
                </div>
            </Html>
        </group>
    );
};

const Switchgear = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[3, 4, 1.2]} position={[0, 2, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#2c2c2c" roughness={0.3} metalness={0.8} />
        </Box>
        {/* Panel doors */}
        {[-0.8, 0, 0.8].map((x, i) => (
            <Box key={i} args={[0.85, 3.5, 0.05]} position={[x, 2, 0.63]} castShadow>
                <meshStandardMaterial color="#3a3a3a" roughness={0.4} metalness={0.7} />
            </Box>
        ))}
        {/* Warning stripe */}
        <Box args={[3, 0.15, 0.06]} position={[0, 0.1, 0.64]}>
            <meshBasicMaterial color="#faad14" />
        </Box>
        <Html position={[0, 4.5, 0]} center>
            <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 10, border: '1px solid #faad14' }}>
                <strong>{id}</strong><br/><span style={{color:'#faad14'}}>SWGR</span>
            </div>
        </Html>
    </group>
);

const CableTrayComponent = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[6, 0.1, 0.6]} position={[0, 0, 0]} castShadow>
            <meshStandardMaterial color="#888" roughness={0.5} metalness={0.6} />
        </Box>
        <Box args={[6, 0.3, 0.05]} position={[0, 0.15, 0.28]} castShadow>
            <meshStandardMaterial color="#777" roughness={0.5} metalness={0.6} />
        </Box>
        <Box args={[6, 0.3, 0.05]} position={[0, 0.15, -0.28]} castShadow>
            <meshStandardMaterial color="#777" roughness={0.5} metalness={0.6} />
        </Box>
    </group>
);

const CRAC = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[2, 4, 1.5]} position={[0, 2, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#37474f" roughness={0.4} metalness={0.5} />
        </Box>
        {/* Grille */}
        <Box args={[1.6, 1.5, 0.05]} position={[0, 1, 0.78]}>
            <meshStandardMaterial color="#263238" roughness={0.8} />
        </Box>
        {/* Display */}
        <Box args={[0.8, 0.4, 0.05]} position={[0, 3.2, 0.78]}>
            <meshBasicMaterial color="#003a8c" />
        </Box>
        <Html position={[0, 4.5, 0]} center>
            <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 10, border: '1px solid #13c2c2' }}>
                <strong>{id}</strong><br/><span style={{color:'#13c2c2'}}>CRAC</span>
            </div>
        </Html>
    </group>
);

const WallComponent = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[6, 3, 0.3]} position={[0, 1.5, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#bfbfbf" roughness={0.8} metalness={0.1} />
        </Box>
    </group>
);

const FloorComponent = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[10, 0.15, 10]} position={[0, 0.075, 0]} receiveShadow>
            <meshStandardMaterial color="#d9d9d9" roughness={0.9} metalness={0.05} />
        </Box>
    </group>
);

const ColumnComponent = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[0.5, 4, 0.5]} position={[0, 2, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#8c8c8c" roughness={0.6} metalness={0.3} />
        </Box>
    </group>
);

const DoorComponent = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[1.2, 2.4, 0.1]} position={[0, 1.2, 0]} castShadow>
            <meshStandardMaterial color="#8b4513" roughness={0.7} metalness={0.2} />
        </Box>
        {/* Handle */}
        <Cylinder args={[0.04, 0.04, 0.3, 8]} position={[0.45, 1.1, 0.08]} rotation={[Math.PI/2, 0, 0]}>
            <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.2} />
        </Cylinder>
    </group>
);

const StairsComponent = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        {[0, 1, 2, 3, 4].map((i) => (
            <Box key={i} args={[2, 0.2, 0.5]} position={[0, i * 0.3 + 0.1, i * 0.5]} castShadow receiveShadow>
                <meshStandardMaterial color="#888" roughness={0.7} metalness={0.3} />
            </Box>
        ))}
    </group>
);

const AccessFloorComponent = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        {/* Raised floor tiles */}
        {[-2, 0, 2].map((x) => [-2, 0, 2].map((z) => (
            <Box key={`${x}-${z}`} args={[1.9, 0.08, 1.9]} position={[x, 0.6, z]} receiveShadow>
                <meshStandardMaterial color="#ccc" roughness={0.8} metalness={0.2} />
            </Box>
        )))}
        {/* Pedestals */}
        {[-3, -1, 1, 3].map((x) => [-3, -1, 1, 3].map((z) => (
            <Cylinder key={`p-${x}-${z}`} args={[0.08, 0.08, 0.56, 8]} position={[x, 0.28, z]}>
                <meshStandardMaterial color="#777" metalness={0.8} roughness={0.3} />
            </Cylinder>
        )))}
    </group>
);

const FireSuppressionComponent = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Cylinder args={[0.4, 0.4, 3, 16]} position={[0, 1.5, 0]} castShadow>
            <meshStandardMaterial color="#cc0000" roughness={0.4} metalness={0.5} />
        </Cylinder>
        <Cylinder args={[0.45, 0.45, 0.2, 16]} position={[0, 3.1, 0]}>
            <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
        </Cylinder>
        <Html position={[0, 3.8, 0]} center>
            <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 10, border: '1px solid #f5222d' }}>
                <strong>{id}</strong><br/><span style={{color:'#f5222d'}}>FM-200</span>
            </div>
        </Html>
    </group>
);

const GenericEquipment = ({ position, id, onClick, color, label }: { position: [number,number,number], id: string, onClick: (id: string) => void, color: string, label: string }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[1.5, 3, 1.2]} position={[0, 1.5, 0]} castShadow receiveShadow>
            <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
        </Box>
        <Box args={[1.3, 0.5, 0.05]} position={[0, 2.5, 0.63]}>
            <meshBasicMaterial color="#003a8c" />
        </Box>
        <Html position={[0, 3.5, 0]} center>
            <div style={{ background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 10, border: `1px solid ${color}` }}>
                <strong>{id}</strong><br/><span style={{color}}>{label}</span>
            </div>
        </Html>
    </group>
);

const DuctComponent = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[6, 0.8, 1.2]} position={[0, 0, 0]} castShadow>
            <meshStandardMaterial color="#9e9e9e" roughness={0.6} metalness={0.4} />
        </Box>
    </group>
);

const RoofComponent = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[10, 0.2, 10]} position={[0, 0, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#616161" roughness={0.7} metalness={0.3} />
        </Box>
    </group>
);

const WindowComponent = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[1.5, 1.2, 0.1]} position={[0, 0, 0]} castShadow>
            <meshPhysicalMaterial color="#87ceeb" transparent opacity={0.4} roughness={0.05} metalness={0.1} transmission={0.8} thickness={0.3} />
        </Box>
        {/* Frame */}
        <Box args={[1.6, 0.06, 0.12]} position={[0, 0.6, 0]}><meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} /></Box>
        <Box args={[1.6, 0.06, 0.12]} position={[0, -0.6, 0]}><meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} /></Box>
        <Box args={[0.06, 1.2, 0.12]} position={[0.75, 0, 0]}><meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} /></Box>
        <Box args={[0.06, 1.2, 0.12]} position={[-0.75, 0, 0]}><meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} /></Box>
    </group>
);

const PipeElbow = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Torus args={[0.5, 0.15, 16, 16, Math.PI / 2]} rotation={[0, 0, 0]}>
            <meshStandardMaterial color="#1890ff" roughness={0.3} metalness={0.6} />
        </Torus>
    </group>
);

const PipeTee = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Cylinder args={[0.15, 0.15, 2, 16]} rotation={[0, 0, Math.PI/2]}>
            <meshStandardMaterial color="#1890ff" roughness={0.3} metalness={0.6} />
        </Cylinder>
        <Cylinder args={[0.15, 0.15, 1, 16]} position={[0, 0.5, 0]}>
            <meshStandardMaterial color="#1890ff" roughness={0.3} metalness={0.6} />
        </Cylinder>
    </group>
);

const PipeReducer = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Cylinder args={[0.25, 0.15, 0.6, 16]} castShadow>
            <meshStandardMaterial color="#1890ff" roughness={0.3} metalness={0.6} />
        </Cylinder>
    </group>
);

const PipeFlange = ({ position, id, onClick }: { position: [number,number,number], id: string, onClick: (id: string) => void }) => (
    <group position={position} onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Cylinder args={[0.35, 0.35, 0.1, 16]} castShadow>
            <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </Cylinder>
        <Cylinder args={[0.15, 0.15, 0.2, 16]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#666" roughness={0.3} metalness={0.8} />
        </Cylinder>
    </group>
);

// ─── Landscape & World Building ──────────────────────────────────────────────

const Tree = ({ id, onClick }: { id: string, onClick: (id: string) => void }) => (
    <group onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Cylinder args={[0.2, 0.4, 2, 8]} position={[0, 1, 0]} castShadow>
            <meshStandardMaterial color="#5c4033" roughness={0.9} />
        </Cylinder>
        <Sphere args={[1.5, 16, 16]} position={[0, 2.5, 0]} castShadow>
            <meshStandardMaterial color="#2e8b57" roughness={0.8} />
        </Sphere>
        <Sphere args={[1.2, 16, 16]} position={[0.8, 2.2, 0.5]} castShadow>
            <meshStandardMaterial color="#228b22" roughness={0.8} />
        </Sphere>
        <Sphere args={[1.2, 16, 16]} position={[-0.8, 2.8, -0.5]} castShadow>
            <meshStandardMaterial color="#3cb371" roughness={0.8} />
        </Sphere>
    </group>
);

const Bush = ({ id, onClick }: { id: string, onClick: (id: string) => void }) => (
    <group onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Sphere args={[0.8, 16, 16]} position={[0, 0.6, 0]} castShadow>
            <meshStandardMaterial color="#2e8b57" roughness={0.9} />
        </Sphere>
        <Sphere args={[0.6, 16, 16]} position={[0.5, 0.4, 0.2]} castShadow>
            <meshStandardMaterial color="#228b22" roughness={0.9} />
        </Sphere>
        <Sphere args={[0.5, 16, 16]} position={[-0.4, 0.3, -0.4]} castShadow>
            <meshStandardMaterial color="#3cb371" roughness={0.9} />
        </Sphere>
    </group>
);

const Road = ({ id, color, opacity, metalness, roughness, onClick }: { id: string, color: string, opacity?: number, metalness?: number, roughness?: number, onClick: (id: string) => void }) => (
    <group onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[4, 0.1, 4]} position={[0, 0.05, 0]} receiveShadow>
            <meshStandardMaterial color={color || "#333333"} metalness={metalness ?? 0.1} roughness={roughness ?? 0.9} transparent={opacity !== undefined && opacity < 1} opacity={opacity ?? 1} />
        </Box>
        <Box args={[0.2, 0.11, 2]} position={[0, 0.05, 0]} receiveShadow>
            <meshStandardMaterial color="#ffffff" />
        </Box>
    </group>
);

const Water = ({ id, color, opacity, metalness, roughness, onClick }: { id: string, color: string, opacity?: number, metalness?: number, roughness?: number, onClick: (id: string) => void }) => (
    <group onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[4, 0.2, 4]} position={[0, 0.1, 0]} receiveShadow>
            <meshStandardMaterial color={color || "#1e90ff"} metalness={metalness ?? 0.8} roughness={roughness ?? 0.1} transparent opacity={opacity ?? 0.6} />
        </Box>
    </group>
);

const Grass = ({ id, color, opacity, metalness, roughness, onClick }: { id: string, color: string, opacity?: number, metalness?: number, roughness?: number, onClick: (id: string) => void }) => (
    <group onClick={(e) => { e.stopPropagation(); onClick(id); }}>
        <Box args={[4, 0.1, 4]} position={[0, 0.05, 0]} receiveShadow>
            <meshStandardMaterial color={color || "#4f8f00"} metalness={metalness ?? 0} roughness={roughness ?? 1} transparent={opacity !== undefined && opacity < 1} opacity={opacity ?? 1} />
        </Box>
    </group>
);

// ─── Vehicles ──────────────────────────────────────────────────────────────

const Truck = ({ id, color, opacity, metalness, roughness, onClick }: { id: string, color: string, opacity?: number, metalness?: number, roughness?: number, onClick: (id: string) => void }) => {
    const matProps = { metalness: metalness ?? 0.6, roughness: roughness ?? 0.4, transparent: opacity !== undefined && opacity < 1, opacity: opacity ?? 1 };
    return (
        <group onClick={(e) => { e.stopPropagation(); onClick(id); }}>
            <Box args={[2, 1.5, 4]} position={[0, 1.5, -1]} castShadow>
                <meshStandardMaterial color="#e0e0e0" {...matProps} />
            </Box>
            <Box args={[1.8, 1.2, 1.5]} position={[0, 1.2, 1.8]} castShadow>
                <meshStandardMaterial color={color || "#1890ff"} {...matProps} />
            </Box>
            {/* Wheels */}
            {[-1, 1].map(x => [-2, 0, 2].map(z => (
                <Cylinder key={`${x}-${z}`} args={[0.5, 0.5, 0.4, 16]} rotation={[0, 0, Math.PI/2]} position={[x > 0 ? 1 : -1, 0.5, z]} castShadow>
                    <meshStandardMaterial color="#222" />
                </Cylinder>
            )))}
        </group>
    );
};

const Forklift = ({ id, color, opacity, metalness, roughness, onClick }: { id: string, color: string, opacity?: number, metalness?: number, roughness?: number, onClick: (id: string) => void }) => {
    const matProps = { metalness: metalness ?? 0.5, roughness: roughness ?? 0.5, transparent: opacity !== undefined && opacity < 1, opacity: opacity ?? 1 };
    return (
        <group onClick={(e) => { e.stopPropagation(); onClick(id); }}>
            <Box args={[1.2, 1, 2]} position={[0, 0.8, 0]} castShadow>
                <meshStandardMaterial color={color || "#faad14"} {...matProps} />
            </Box>
            {/* Forks */}
            <Box args={[1, 2.5, 0.1]} position={[0, 1.5, 1.1]} castShadow>
                <meshStandardMaterial color="#333" />
            </Box>
            <Box args={[0.1, 0.1, 1.5]} position={[-0.3, 0.1, 1.8]} castShadow>
                <meshStandardMaterial color="#333" />
            </Box>
            <Box args={[0.1, 0.1, 1.5]} position={[0.3, 0.1, 1.8]} castShadow>
                <meshStandardMaterial color="#333" />
            </Box>
            {/* Wheels */}
            {[-0.65, 0.65].map(x => [-0.8, 0.8].map(z => (
                <Cylinder key={`${x}-${z}`} args={[0.3, 0.3, 0.2, 16]} rotation={[0, 0, Math.PI/2]} position={[x, 0.3, z]} castShadow>
                    <meshStandardMaterial color="#222" />
                </Cylinder>
            )))}
        </group>
    );
};

// ==================== MAIN SCENE ====================

export default function Scada3DScene({ onSelect, animateFlow, thermalMode, alarmActive, editMode = false, transformMode = 'translate', selectedId, showWireframe = false }: { onSelect: (id: any) => void, animateFlow: boolean, thermalMode: boolean, alarmActive: boolean, editMode?: boolean, transformMode?: 'translate' | 'rotate' | 'scale', selectedId?: string | null, showWireframe?: boolean }) {
    
    // Store
    const { elements, updateElement, environment } = useScada3dStore();
    const { tags } = useScadaStore();

    // Valve states
    const [valve1Open, setValve1Open] = useState(true);
    const [valve2Open, setValve2Open] = useState(true);

    const handleSelect = (id: string) => {
        if (id === 'VALVE-01') setValve1Open(!valve1Open);
        if (id === 'VALVE-02') setValve2Open(!valve2Open);
        onSelect(id);
    };

    const mainFlow = animateFlow && valve1Open;
    const secondaryFlow = animateFlow && valve2Open;

    const handleTransformChange = (id: string, type: 'position' | 'rotation' | 'scale', value: [number,number,number]) => {
        updateElement(id, { [type]: value });
    };

    const renderEquipment = (el: Scada3dElement) => {
        const tag = el.tagId ? tags[el.tagId] : null;
        const isAlarm = tag ? tag.alarm : alarmActive;
        const isRunning = tag ? !!tag.value : animateFlow;
        const color = el.properties.color || '#888';
        const m = el.properties.metalness;
        const r = el.properties.roughness;
        const o = el.properties.opacity;
        
        const matProps = {
            color,
            wireframe: showWireframe,
            metalness: m ?? 0.5,
            roughness: r ?? 0.5,
            transparent: o !== undefined && o < 1,
            opacity: o ?? 1
        };

        switch (el.type) {
            // Original HVAC
            case 'chiller':
                return <Chiller position={[0,0,0]} id={el.id} onClick={handleSelect} thermalMode={thermalMode} alarm={isAlarm} />;
            case 'pump':
                return <Pump position={[0,0,0]} id={el.id} onClick={handleSelect} animateFlow={isRunning && mainFlow} />;
            case 'cooling_tower':
                return <CoolingTower position={[0,0,0]} id={el.id} isRunning={secondaryFlow} onClick={handleSelect} alarm={isAlarm} />;
            case 'valve':
                return <Valve position={[0,0,0]} id={el.id} isOpen={el.id === 'VALVE-01' ? valve1Open : (el.id === 'VALVE-02' ? valve2Open : true)} onClick={handleSelect} />;
            case 'robot':
                return <RoboticArm position={[0,0,0]} id={el.id} isRunning={isRunning} onClick={handleSelect} />;

            // Primitives
            case 'box':
                return <group onClick={(e) => { e.stopPropagation(); handleSelect(el.id); }}><Box args={[2,2,2]} castShadow receiveShadow><meshStandardMaterial {...matProps} /></Box></group>;
            case 'sphere':
                return <group onClick={(e) => { e.stopPropagation(); handleSelect(el.id); }}><mesh castShadow receiveShadow><sphereGeometry args={[1, 32, 32]} /><meshStandardMaterial {...matProps} /></mesh></group>;
            case 'cylinder':
                return <group onClick={(e) => { e.stopPropagation(); handleSelect(el.id); }}><Cylinder args={[1, 1, 2, 32]} castShadow receiveShadow><meshStandardMaterial {...matProps} /></Cylinder></group>;
            case 'cone':
                return <group onClick={(e) => { e.stopPropagation(); handleSelect(el.id); }}><mesh castShadow receiveShadow><coneGeometry args={[1, 2, 32]} /><meshStandardMaterial {...matProps} /></mesh></group>;
            case 'torus':
                return <group onClick={(e) => { e.stopPropagation(); handleSelect(el.id); }}><Torus args={[1, 0.4, 16, 32]} castShadow receiveShadow><meshStandardMaterial {...matProps} /></Torus></group>;
            case 'plane':
                return <group onClick={(e) => { e.stopPropagation(); handleSelect(el.id); }}><mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow><planeGeometry args={[4, 4]} /><meshStandardMaterial side={THREE.DoubleSide} {...matProps} /></mesh></group>;

            // Electrical
            case 'transformer':
                return <Transformer position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'generator':
                return <Generator position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'ups':
                return <UPS position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'switchgear':
                return <Switchgear position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'ats':
                return <GenericEquipment position={[0,0,0]} id={el.id} onClick={handleSelect} color={color !== '#888' ? color : "#2c3e50"} label="ATS" />;
            case 'pdu':
                return <GenericEquipment position={[0,0,0]} id={el.id} onClick={handleSelect} color={color !== '#888' ? color : "#1a1a2e"} label="PDU" />;
            case 'mcc':
                return <GenericEquipment position={[0,0,0]} id={el.id} onClick={handleSelect} color={color !== '#888' ? color : "#333"} label="MCC" />;
            case 'panel':
                return <GenericEquipment position={[0,0,0]} id={el.id} onClick={handleSelect} color={color !== '#888' ? color : "#444"} label="PANEL" />;

            // Data Center
            case 'server_rack':
                return <ServerRack position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'cable_tray':
                return <CableTrayComponent position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'crac':
                return <CRAC position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'fire_suppression':
                return <FireSuppressionComponent position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'access_floor':
                return <AccessFloorComponent position={[0,0,0]} id={el.id} onClick={handleSelect} />;

            // HVAC Extended
            case 'ahu':
                return <AHU position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'fcu':
                return <GenericEquipment position={[0,0,0]} id={el.id} onClick={handleSelect} color={color !== '#888' ? color : "#607d8b"} label="FCU" />;
            case 'damper':
                return <GenericEquipment position={[0,0,0]} id={el.id} onClick={handleSelect} color={color !== '#888' ? color : "#78909c"} label="DAMPER" />;
            case 'exhaust_fan':
                return <GenericEquipment position={[0,0,0]} id={el.id} onClick={handleSelect} color={color !== '#888' ? color : "#546e7a"} label="EXH FAN" />;
            case 'duct':
                return <DuctComponent position={[0,0,0]} id={el.id} onClick={handleSelect} />;

            // Building
            case 'wall':
                return <WallComponent position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'floor':
                return <FloorComponent position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'column':
                return <ColumnComponent position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'door':
                return <DoorComponent position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'stairs':
                return <StairsComponent position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'window':
                return <WindowComponent position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'roof':
                return <RoofComponent position={[0,0,0]} id={el.id} onClick={handleSelect} />;

            // Piping
            case 'pipe':
                return <group onClick={(e) => { e.stopPropagation(); handleSelect(el.id); }}><Cylinder args={[0.15, 0.15, 4, 16]} rotation={[0, 0, Math.PI/2]} castShadow><meshStandardMaterial color={color !== '#888' ? color : "#1890ff"} roughness={r ?? 0.3} metalness={m ?? 0.6} transparent={matProps.transparent} opacity={matProps.opacity} /></Cylinder></group>;
            case 'elbow':
                return <PipeElbow position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'tee':
                return <PipeTee position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'reducer':
                return <PipeReducer position={[0,0,0]} id={el.id} onClick={handleSelect} />;
            case 'flange':
                return <PipeFlange position={[0,0,0]} id={el.id} onClick={handleSelect} />;

            // Landscape & World Building
            case 'tree':
                return <Tree id={el.id} onClick={handleSelect} />;
            case 'bush':
                return <Bush id={el.id} onClick={handleSelect} />;
            case 'road':
                return <Road id={el.id} color={color} opacity={o} metalness={m} roughness={r} onClick={handleSelect} />;
            case 'water':
                return <Water id={el.id} color={color} opacity={o} metalness={m} roughness={r} onClick={handleSelect} />;
            case 'grass':
                return <Grass id={el.id} color={color} opacity={o} metalness={m} roughness={r} onClick={handleSelect} />;

            // Vehicles
            case 'truck':
                return <Truck id={el.id} color={color} opacity={o} metalness={m} roughness={r} onClick={handleSelect} />;
            case 'forklift':
                return <Forklift id={el.id} color={color} opacity={o} metalness={m} roughness={r} onClick={handleSelect} />;

            default:
                return <Box args={[1,1,1]}><meshStandardMaterial {...matProps} /></Box>;
        }
    };

    return (
        <Canvas 
            camera={{ position: [15, 12, 20], fov: 45 }} 
            shadows
            gl={{ antialias: false, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
            onPointerMissed={() => editMode && onSelect(null)}
        >
            {/* Gizmo Viewport for CAD feeling */}
            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                <GizmoViewport axisColors={['#ff3653', '#8adb00', '#2c8fdf']} labelColor="white" />
            </GizmoHelper>
            <SoftShadows size={15} samples={16} focus={0.5} />
            <ambientLight intensity={0.5} />
            {environment === 'day' && <directionalLight position={[10, 20, 10]} intensity={2.5} castShadow shadow-mapSize={[2048, 2048]} />}
            {environment === 'studio' && (
                <>
                    <directionalLight position={[10, 15, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
                    <directionalLight position={[-10, 10, -10]} intensity={1} color="#e0f0ff" />
                    <ambientLight intensity={1} />
                </>
            )}
            {environment === 'night' && (
                <>
                    <directionalLight position={[10, 15, 10]} intensity={0.5} castShadow shadow-mapSize={[2048, 2048]} color="#aaccff" />
                    <directionalLight position={[-10, 10, -10]} intensity={0.2} color="#001133" />
                </>
            )}

            <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color={environment === 'night' ? "#1a1a1a" : (environment === 'day' ? '#e8ecef' : '#ffffff')} roughness={0.8} />
            </mesh>
            <gridHelper args={[100, 100, environment === 'night' ? '#333' : '#ddd', environment === 'night' ? '#222' : '#eee']} position={[0, 0, 0]} />

            <group position={[0, 0, -2]}>
                
                {/* Render Dynamic Elements */}
                {elements.map(el => (
                    <DraggableModel 
                        key={el.id} 
                        id={el.id} 
                        position={el.position} 
                        rotation={el.rotation} 
                        scale={el.scale} 
                        editMode={editMode} 
                        transformMode={transformMode} 
                        selectedId={selectedId || null} 
                        onSelect={handleSelect} 
                        onTransformChange={handleTransformChange}
                    >
                        {renderEquipment(el)}
                    </DraggableModel>
                ))}

                {/* Static Hardcoded Pipes for context */}

                <AlarmBeacon position={[0, 4.5, 8]} active={alarmActive} />

            </group>

            <EffectComposer multisampling={0}>
                <SMAA />
                <SSAO radius={0.2} intensity={10} luminanceInfluence={0.6} />
                <Bloom luminanceThreshold={environment === 'night' ? 0.5 : 0.8} intensity={environment === 'night' ? 1.2 : 0.6} />
                <DepthOfField focusDistance={0.05} focalLength={0.1} bokehScale={2} />
            </EffectComposer>

            <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2 - 0.05} maxDistance={60} target={[0, 2, 0]} />
            <Environment preset={environment === 'studio' ? 'studio' : (environment === 'day' ? 'park' : 'night')} />
        </Canvas>
    );
}

