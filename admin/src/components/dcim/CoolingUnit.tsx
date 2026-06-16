import React from 'react';
import { Box, Html } from '@react-three/drei';

export function CoolingUnit({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
    return (
        <group position={position}>
            <Box args={[1.5, 2.2, 1.2]} position={[0, 1.1, 0]}>
                <meshStandardMaterial color="#333" metalness={0.5} roughness={0.6} />
            </Box>
            <Box args={[1.3, 0.2, 1.0]} position={[0, 0.2, 0.6]}>
                <meshStandardMaterial color="#111" />
            </Box>
            <Html position={[0, 2.4, 0]} center>
                <div style={{ background: '#1890ff', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>CRAC</div>
            </Html>
        </group>
    );
}
