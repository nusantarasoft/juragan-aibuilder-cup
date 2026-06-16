import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';

// 1. Lighting System
export const LightingSystem = ({ position, isOn, intensity = 1 }: { position: [number,number,number], isOn: boolean, intensity?: number }) => {
    return (
        <group position={position}>
            {/* Fixture */}
            <mesh position={[0, 2.9, 0]}>
                <boxGeometry args={[1, 0.1, 1]} />
                <meshStandardMaterial color="#fff" emissive={isOn ? "#fff" : "#000"} emissiveIntensity={intensity} />
            </mesh>
            {/* Actual Light */}
            {isOn && (
                <pointLight position={[0, 2.8, 0]} intensity={intensity * 2} distance={10} decay={2} castShadow />
            )}
        </group>
    );
};

// 2. Fire Safety System (Detector & Sprinkler)
export const FireSafetySystem = ({ position, isAlarmActive }: { position: [number,number,number], isAlarmActive: boolean }) => {
    const lightRef = useRef<THREE.PointLight>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    useFrame(({ clock }) => {
        if (isAlarmActive) {
            const pulse = Math.sin(clock.elapsedTime * 10) * 0.5 + 0.5;
            if (lightRef.current) lightRef.current.intensity = pulse * 2;
            if (materialRef.current) materialRef.current.emissiveIntensity = pulse;
        } else {
            if (lightRef.current) lightRef.current.intensity = 0;
            if (materialRef.current) materialRef.current.emissiveIntensity = 0;
        }
    });

    return (
        <group position={position}>
            {/* Smoke Detector */}
            <mesh position={[0, 3, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
                <meshStandardMaterial color="#eee" />
            </mesh>
            {/* Alarm LED */}
            <mesh position={[0, 2.95, 0.15]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial ref={materialRef} color="#ff0000" emissive="#ff0000" emissiveIntensity={0} />
            </mesh>
            <pointLight ref={lightRef} position={[0, 2.8, 0]} color="#ff0000" intensity={0} distance={5} />

            {/* Sprinkler Water Cone */}
            {isAlarmActive && (
                <mesh position={[0, 1.5, 0]}>
                    <coneGeometry args={[2, 3, 16]} />
                    <meshStandardMaterial color="#00aaff" transparent opacity={0.3} depthWrite={false} />
                </mesh>
            )}
        </group>
    );
};

// 3. Access Control (Doors)
export const SecurityDoor = ({ position, rotation, isOpen, isLocked }: { position: [number,number,number], rotation: [number,number,number], isOpen: boolean, isLocked: boolean }) => {
    const doorGroupRef = useRef<THREE.Group>(null);
    
    useFrame(() => {
        if (doorGroupRef.current) {
            // Smoothly swing open to 90 degrees if isOpen
            const targetRotation = isOpen ? -Math.PI / 2 : 0;
            doorGroupRef.current.rotation.y += (targetRotation - doorGroupRef.current.rotation.y) * 0.1;
        }
    });

    return (
        <group position={position} rotation={rotation}>
            {/* Door Frame */}
            <mesh position={[-0.6, 1, 0]}>
                <boxGeometry args={[0.1, 2, 0.2]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            <mesh position={[0.6, 1, 0]}>
                <boxGeometry args={[0.1, 2, 0.2]} />
                <meshStandardMaterial color="#333" />
            </mesh>

            {/* Hinge Group */}
            <group position={[-0.55, 0, 0]} ref={doorGroupRef}>
                {/* Door Panel */}
                <mesh position={[0.55, 1, 0]} castShadow>
                    <boxGeometry args={[1.1, 1.9, 0.05]} />
                    <meshStandardMaterial color={isLocked ? "#aa2222" : "#999"} transparent opacity={0.8} />
                </mesh>
                {/* Scanner/Reader */}
                <mesh position={[1.0, 1, 0.05]}>
                    <boxGeometry args={[0.1, 0.2, 0.05]} />
                    <meshStandardMaterial color={isLocked ? "#ff0000" : "#00ff00"} emissive={isLocked ? "#ff0000" : "#00ff00"} emissiveIntensity={0.5} />
                </mesh>
            </group>
        </group>
    );
};

// 4. HVAC Ducting
export const HVACDuct = ({ start, end, isFlowing }: { start: [number,number,number], end: [number,number,number], isFlowing: boolean }) => {
    const vecStart = new THREE.Vector3(...start);
    const vecEnd = new THREE.Vector3(...end);
    const distance = vecStart.distanceTo(vecEnd);
    const position = vecStart.clone().lerp(vecEnd, 0.5);
    
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const dir = vecEnd.clone().sub(vecStart).normalize();
    quaternion.setFromUnitVectors(up, dir);

    return (
        <group position={position} quaternion={quaternion}>
            {/* Square Duct */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[0.5, 0.3, distance]} />
                <meshStandardMaterial color="#888" roughness={0.4} metalness={0.6} />
            </mesh>
            {/* Airflow Particles (Simple representation) */}
            {isFlowing && (
                <mesh position={[0, -0.16, 0]}>
                    <planeGeometry args={[0.4, distance]} />
                    <meshBasicMaterial color="#00ffff" transparent opacity={0.2} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
            )}
        </group>
    );
};
