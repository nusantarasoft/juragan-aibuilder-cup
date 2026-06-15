import React from 'react';
import { Grid, ContactShadows } from '@react-three/drei';
import { RackModel } from './RackModel';
import { CoolingUnit } from './CoolingUnit';
import { ThermalOverlay } from './ThermalOverlay';
import { useDcimStore } from '@/store/useDcimStore';

export function DataCenterScene() {
    const { racks, viewMode, selectedRackId, setSelectedRackId } = useDcimStore();

    return (
        <group>
            {/* Raised Floor */}
            <Grid args={[40, 40]} position={[0, 0, 0]} sectionSize={0.6} sectionColor="#444" cellColor="#333" fadeDistance={30} />
            <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[40, 40]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
            </mesh>

            {/* CRAC Units (Cooling) */}
            <CoolingUnit position={[-8, 0, -2]} />
            <CoolingUnit position={[8, 0, -2]} />

            {/* Racks */}
            {racks.map(rack => (
                <RackModel 
                    key={rack.id} 
                    data={rack} 
                    viewMode={viewMode} 
                    onClick={() => setSelectedRackId(rack.id)} 
                    isSelected={selectedRackId === rack.id} 
                />
            ))}

            {/* Thermal Map Overlay */}
            {viewMode === 'Thermal' && (
                <ThermalOverlay width={20} length={20} />
            )}

            {/* Ambient Shadow */}
            <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={20} blur={2} far={4} />
        </group>
    );
}
