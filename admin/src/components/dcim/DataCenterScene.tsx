import React from 'react';
import { Grid, ContactShadows, Line, RoundedBox } from '@react-three/drei';
import { RackModel } from './RackModel';
import { CoolingUnit } from './CoolingUnit';
import { ThermalOverlay } from './ThermalOverlay';
import { ContainmentPod } from './ContainmentPod';
import { useDcimStore } from '@/store/useDcimStore';
import DraggableModel from '../3d/DraggableModel';

export function DataCenterScene() {
    const { racks, pods, viewMode, editMode, selectedRackId, setSelectedRackId } = useDcimStore();

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

            {/* Aisle Containment Pods */}
            {pods.map(pod => (
                <ContainmentPod key={pod.id} data={pod} viewMode={viewMode} />
            ))}

            {/* PDU & Cables */}
            {viewMode === 'Power' && (
                <group>
                    <RoundedBox args={[1, 2.5, 1]} position={[10, 1.25, 10]} radius={0.05} smoothness={4}>
                        <meshStandardMaterial color="#87d068" roughness={0.3} metalness={0.8} />
                    </RoundedBox>
                    {racks.map((rack, i) => {
                        const start = new THREE.Vector3(10, 2.5, 10);
                        const end = new THREE.Vector3(rack.x, 2.0, rack.z);
                        // Make an L-shape cable route overhead
                        const mid1 = new THREE.Vector3(10, 3.5, 10);
                        const mid2 = new THREE.Vector3(rack.x, 3.5, 10);
                        const mid3 = new THREE.Vector3(rack.x, 3.5, rack.z);
                        return (
                            <Line 
                                key={`cable-${i}`}
                                points={[start, mid1, mid2, mid3, end]} 
                                color={rack.power > 6 ? "#ff4d4f" : "#108ee9"} 
                                lineWidth={3} 
                                dashed 
                                dashScale={10}
                                dashSize={0.5}
                            />
                        );
                    })}
                </group>
            )}

            {/* Racks */}
            {racks.map(rack => (
                <DraggableModel
                    key={rack.id}
                    id={rack.id}
                    position={[rack.x, 0, rack.z]}
                    rotation={[0, rack.rotationY || 0, 0]}
                    editMode={editMode}
                    selectedId={selectedRackId}
                    onSelect={setSelectedRackId}
                    onPositionChange={(id, [x, y, z]) => {
                        const state = useDcimStore.getState();
                        state.updateRackPosition(id, x, z);
                    }}
                >
                    <RackModel 
                        data={rack} 
                        viewMode={viewMode} 
                        onClick={() => !editMode && setSelectedRackId(rack.id)} 
                        isSelected={selectedRackId === rack.id} 
                    />
                </DraggableModel>
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
