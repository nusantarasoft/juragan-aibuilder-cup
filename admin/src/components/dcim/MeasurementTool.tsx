import React, { useRef } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { Text, Line } from '@react-three/drei';
import { useDcimStore } from '@/store/useDcimStore';

export function MeasurementTool() {
    const { measureMode, measurePoints, setMeasurePoints } = useDcimStore();
    const { camera, pointer, raycaster } = useThree();
    const cursorRef = useRef<THREE.Mesh>(null);
    const planeRef = useRef<THREE.Mesh>(null);

    // Update cursor position
    useFrame(() => {
        if (!measureMode || !cursorRef.current || !planeRef.current) return;
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObject(planeRef.current);
        if (intersects.length > 0) {
            cursorRef.current.position.copy(intersects[0].point);
            // snap to grid (0.5 intervals)
            const snap = useDcimStore.getState().snapToGrid;
            if (snap) {
                cursorRef.current.position.x = Math.round(cursorRef.current.position.x * 2) / 2;
                cursorRef.current.position.z = Math.round(cursorRef.current.position.z * 2) / 2;
            }
            cursorRef.current.position.y = 0.05; // slightly above floor
        }
    });

    if (!measureMode && measurePoints.length === 0) return null;

    const handlePointerDown = (e: any) => {
        if (!measureMode) return;
        e.stopPropagation();
        if (measurePoints.length >= 2) {
            // reset
            setMeasurePoints([[cursorRef.current!.position.x, 0, cursorRef.current!.position.z]]);
        } else {
            setMeasurePoints([...measurePoints, [cursorRef.current!.position.x, 0, cursorRef.current!.position.z]]);
        }
    };

    // Calculate distance
    let distance = 0;
    if (measurePoints.length === 2) {
        const p1 = new THREE.Vector3(...measurePoints[0]);
        const p2 = new THREE.Vector3(...measurePoints[1]);
        distance = p1.distanceTo(p2);
    }

    const points: [number, number, number][] = [...measurePoints];
    // If we have 1 point, draw line to cursor
    // But since we can't easily sync state in useFrame to a Line component, we just show the line after 2 points.
    
    return (
        <group>
            {measureMode && (
                <mesh 
                    ref={planeRef} 
                    rotation={[-Math.PI / 2, 0, 0]} 
                    position={[0, 0, 0]} 
                    onPointerDown={handlePointerDown}
                    visible={false}
                >
                    <planeGeometry args={[100, 100]} />
                    <meshBasicMaterial transparent opacity={0} />
                </mesh>
            )}

            {measureMode && (
                <mesh ref={cursorRef}>
                    <sphereGeometry args={[0.1, 16, 16]} />
                    <meshBasicMaterial color="yellow" depthTest={false} />
                </mesh>
            )}

            {measurePoints.map((p, i) => (
                <mesh key={i} position={p}>
                    <sphereGeometry args={[0.15, 16, 16]} />
                    <meshBasicMaterial color="#ff0044" />
                </mesh>
            ))}

            {measurePoints.length === 2 && (
                <group>
                    <Line
                        points={points}
                        color="#ff0044"
                        lineWidth={3}
                        dashed
                        dashSize={0.2}
                        gapSize={0.1}
                    />
                    <Text
                        position={[
                            (points[0][0] + points[1][0]) / 2,
                            1,
                            (points[0][2] + points[1][2]) / 2
                        ]}
                        color="#ffffff"
                        fontSize={0.5}
                        outlineWidth={0.05}
                        outlineColor="#000000"
                    >
                        {distance.toFixed(2)}m
                    </Text>
                </group>
            )}
        </group>
    );
}
