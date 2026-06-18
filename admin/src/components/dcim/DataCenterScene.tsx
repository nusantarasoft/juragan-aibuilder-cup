import React from 'react';
import * as THREE from 'three';
import { Grid, ContactShadows, Line, RoundedBox } from '@react-three/drei';
import { RackModel } from './RackModel';
import { CoolingUnit } from './CoolingUnit';
import { ThermalOverlay } from './ThermalOverlay';
import { AirflowParticles } from './AirflowParticles';
import { ContainmentPod } from './ContainmentPod';
import { useDcimStore } from '@/store/useDcimStore';
import DraggableModel from '../3d/DraggableModel';
import { DataCenterArchitecture } from './DataCenterArchitecture';
import { Environment } from '@react-three/drei';

export function DataCenterScene() {
    const { racks, pods, cracs, pdus, viewMode, editMode, transformMode, selectedRackId, setSelectedRackId } = useDcimStore();

    return (
        <group>
            {/* Environment lighting & reflections */}
            <Environment preset="warehouse" />

            {/* Real Data Hall Architecture */}
            <DataCenterArchitecture />

            {/* CRAC Units (Cooling) */}
            {cracs.map(crac => (
                <DraggableModel
                    key={crac.id}
                    id={crac.id}
                    position={[crac.x, 0, crac.z]}
                    rotation={[0, crac.rotationY || 0, 0]}
                    editMode={editMode}
                    transformMode={transformMode}
                    snapToGrid={useDcimStore.getState().snapToGrid}
                    selectedId={selectedRackId}
                    onSelect={setSelectedRackId}
                    onTransformChange={(id, type, value) => {
                        const state = useDcimStore.getState();
                        if (type === 'position') state.updateCracPosition(id, value[0], value[2], crac.rotationY);
                        if (type === 'rotation') state.updateCracPosition(id, crac.x, crac.z, value[1]);
                    }}
                >
                    <CoolingUnit />
                </DraggableModel>
            ))}

            {/* Aisle Containment Pods */}
            {pods.map(pod => (
                <ContainmentPod key={pod.id} data={pod} viewMode={viewMode} />
            ))}

            
            {/* PDU & Cables */}
            {pdus.map(pdu => (
                <DraggableModel
                    key={pdu.id}
                    id={pdu.id}
                    position={[pdu.x, 0, pdu.z]}
                    rotation={[0, pdu.rotationY || 0, 0]}
                    editMode={editMode}
                    transformMode={transformMode}
                    snapToGrid={useDcimStore.getState().snapToGrid}
                    selectedId={selectedRackId}
                    onSelect={setSelectedRackId}
                    onTransformChange={(id, type, value) => {
                        const state = useDcimStore.getState();
                        if (type === 'position') state.updatePduPosition(id, value[0], value[2], pdu.rotationY);
                        if (type === 'rotation') state.updatePduPosition(id, pdu.x, pdu.z, value[1]);
                    }}
                >
                    <RoundedBox args={[1, 2.5, 1]} position={[0, 1.25, 0]} radius={0.05} smoothness={4}>
                        <meshStandardMaterial color="#87d068" roughness={0.3} metalness={0.8} />
                    </RoundedBox>
                </DraggableModel>
            ))}

            {viewMode === 'Power' && (
                <group>
                    {racks.map((rack, i) => {
                        const pdu = pdus[0] || { x: 10, z: 10 };
                        const start = new THREE.Vector3(pdu.x, 2.5, pdu.z);
                        const end = new THREE.Vector3(rack.x, 2.0, rack.z);
                        const mid1 = new THREE.Vector3(pdu.x, 3.5, pdu.z);
                        const mid2 = new THREE.Vector3(rack.x, 3.5, pdu.z);
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
            
            {/* Network Topology Streams (Always visible in Power mode for demo) */}
            {viewMode === 'Power' && (
                <group>
                    <RoundedBox args={[1, 3, 1]} position={[-10, 1.5, 10]} radius={0.05} smoothness={4}>
                        <meshStandardMaterial color="#722ed1" roughness={0.3} metalness={0.8} emissive="#722ed1" emissiveIntensity={0.2} />
                    </RoundedBox>
                    {racks.map((rack, i) => {
                        const start = new THREE.Vector3(-10, 3, 10);
                        const end = new THREE.Vector3(rack.x, 2.0, rack.z);
                        return (
                            <Line 
                                key={`net-${i}`}
                                points={[start, end]} 
                                color="#d3adf7" 
                                lineWidth={1} 
                                dashed 
                                dashScale={50}
                                dashSize={0.2}
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
                    transformMode={transformMode}
                    snapToGrid={useDcimStore.getState().snapToGrid}
                    selectedId={selectedRackId}
                    onSelect={setSelectedRackId}
                    onTransformChange={(id, type, value) => {
                        const state = useDcimStore.getState();
                        if (type === 'position') state.updateRackPosition(id, value[0], value[2], rack.rotationY);
                        if (type === 'rotation') state.updateRackPosition(id, rack.x, rack.z, value[1]);
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

            {/* Thermal Map Overlay & Airflow */}
            {viewMode === 'Thermal' && (
                <group>
                    <ThermalOverlay width={20} length={20} />
                    <AirflowParticles count={1000} />
                </group>
            )}

            {/* Ambient Shadow */}
            <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={20} blur={2} far={4} />
        </group>
    );
}
