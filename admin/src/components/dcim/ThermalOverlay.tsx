import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export function ThermalOverlay({ width, length, yOffset = 0.05 }: { width: number, length: number, yOffset?: number }) {
    const meshRef = useRef<THREE.Mesh>(null);
    
    // Advanced Shader Material for volumetric heat maps
    const uniforms = useRef({
        time: { value: 0 },
        hotspots: { value: [
            new THREE.Vector2(-0.2, 0.1), // Normalized coords
            new THREE.Vector2(0.3, -0.3),
            new THREE.Vector2(0.0, 0.0)
        ]}
    }).current;

    useFrame((state) => {
        if (meshRef.current) {
            uniforms.time.value = state.clock.elapsedTime;
        }
    });

    return (
        <mesh ref={meshRef} position={[0, yOffset, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width, length, 64, 64]} />
            <shaderMaterial 
                transparent 
                depthWrite={false}
                blending={THREE.AdditiveBlending}
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
                    uniform vec2 hotspots[3];
                    varying vec2 vUv;
                    
                    void main() {
                        vec2 uv = vUv - 0.5; // center at 0,0
                        float heat = 0.0;
                        
                        // Calculate distance to hotspots
                        for(int i=0; i<3; i++) {
                            float dist = distance(uv, hotspots[i]);
                            heat += 0.05 / (dist * dist + 0.01);
                        }
                        
                        // Add some pulsing noise
                        heat += sin(uv.x * 20.0 + time) * 0.1;
                        heat += cos(uv.y * 20.0 - time) * 0.1;
                        
                        // Color mapping (blue -> green -> yellow -> red)
                        vec3 color = vec3(0.0);
                        if (heat < 0.3) {
                            color = mix(vec3(0.0, 0.0, 0.5), vec3(0.0, 0.8, 0.0), heat/0.3);
                        } else if (heat < 0.6) {
                            color = mix(vec3(0.0, 0.8, 0.0), vec3(0.8, 0.8, 0.0), (heat-0.3)/0.3);
                        } else {
                            color = mix(vec3(0.8, 0.8, 0.0), vec3(1.0, 0.0, 0.0), (heat-0.6)/0.4);
                        }
                        
                        gl_FragColor = vec4(color, clamp(heat * 0.5, 0.0, 0.7));
                    }
                `}
            />
        </mesh>
    );
}
