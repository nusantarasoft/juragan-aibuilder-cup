import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function AirflowParticles({ count = 500 }: { count?: number }) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    // Initial particle positions and speeds
    const [particles, setParticles] = React.useState<any[]>([]);

    React.useEffect(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 20;
            const y = Math.random() * 5;
            const z = (Math.random() - 0.5) * 20;
            const speed = 0.02 + Math.random() * 0.05;
            temp.push({ x, y, z, speed });
        }
        setParticles(temp);
    }, [count]);

    useFrame(() => {
        if (!mesh.current) return;
        particles.forEach((particle, i) => {
            // Move particles up to simulate heat rising, or forward to simulate AC fans
            particle.y += particle.speed;
            particle.x += Math.sin(particle.y) * 0.01;
            
            if (particle.y > 6) {
                particle.y = 0;
                particle.x = (Math.random() - 0.5) * 20;
                particle.z = (Math.random() - 0.5) * 20;
            }
            
            dummy.position.set(particle.x, particle.y, particle.z);
            
            // Scale particles based on height
            const s = Math.max(0.1, 1 - (particle.y / 6));
            dummy.scale.set(s, s, s);
            
            dummy.updateMatrix();
            mesh.current!.setMatrixAt(i, dummy.matrix);
        });
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]} position={[0, 0, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#69c0ff" transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
        </instancedMesh>
    );
}
