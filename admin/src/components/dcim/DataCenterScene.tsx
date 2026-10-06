import React from 'react';
import * as THREE from 'three';
import { ContactShadows, Line, RoundedBox, Box } from '@react-three/drei';
import { RackModel } from './RackModel';
import { CoolingUnit } from './CoolingUnit';
import { ThermalOverlay } from './ThermalOverlay';
import { AirflowParticles } from './AirflowParticles';
import { ContainmentPod } from './ContainmentPod';
import { useDcimStore } from '@/store/useDcimStore';
import DraggableModel from '../3d/DraggableModel';
import { DataCenterArchitecture } from './DataCenterArchitecture';
import { WorldObjectRenderer } from './WorldObjectRenderer';
import { MeasurementTool } from './MeasurementTool';
import { NetworkOverlay } from './NetworkOverlay';

/**
 * Green zone area on the floor (like dcTrack containment/designated areas)
 */
function FloorZone({ position, width, depth, label, color = '#44cc44' }: {
    position: [number, number, number];
    width: number;
    depth: number;
    label: string;
    color?: string;
}) {
    return (
        <group position={position}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
                <planeGeometry args={[width, depth]} />
                <meshBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} />
            </mesh>
            {/* Border */}
            <Box args={[width, 0.01, 0.04]} position={[0, 0.01, -depth / 2]}>
                <meshBasicMaterial color={color} transparent opacity={0.5} />
            </Box>
            <Box args={[width, 0.01, 0.04]} position={[0, 0.01, depth / 2]}>
                <meshBasicMaterial color={color} transparent opacity={0.5} />
            </Box>
            <Box args={[0.04, 0.01, depth]} position={[-width / 2, 0.01, 0]}>
                <meshBasicMaterial color={color} transparent opacity={0.5} />
            </Box>
            <Box args={[0.04, 0.01, depth]} position={[width / 2, 0.01, 0]}>
                <meshBasicMaterial color={color} transparent opacity={0.5} />
            </Box>
        </group>
    );
}

/**
 * Overhead cable routing lines between racks
 */
function CableRouting({ racks }: { racks: any[] }) {
    if (racks.length < 2) return null;

    const cableHeight = 3.0;
    const trunkZ = -12; // Cable tray runs along back
    const cables: { points: THREE.Vector3[]; color: string }[] = [];

    // Create trunk cable tray lines
    const minX = Math.min(...racks.map(r => r.x)) - 2;
    const maxX = Math.max(...racks.map(r => r.x)) + 2;

    // Generate some cable routes from racks to trunk
    racks.forEach((rack, i) => {
        if (i % 3 === 0) { // Every 3rd rack gets a visible cable
            const color = i % 6 === 0 ? '#2266cc' : i % 6 === 3 ? '#cc3333' : '#8844cc';
            const start = new THREE.Vector3(rack.x, cableHeight, rack.z);
            const mid1 = new THREE.Vector3(rack.x, cableHeight, trunkZ);
            const end = new THREE.Vector3(minX + (i / racks.length) * (maxX - minX), cableHeight, trunkZ);
            cables.push({ points: [start, mid1, end], color });
        }
    });

    return (
        <group>
            {/* Trunk cable tray line */}
            <Line
                points={[
                    new THREE.Vector3(minX, cableHeight, trunkZ),
                    new THREE.Vector3(maxX, cableHeight, trunkZ),
                ]}
                color="#666666"
                lineWidth={2}
            />

            {/* Individual cable routes */}
            {cables.map((cable, i) => (
                <Line
                    key={`cable-rt-${i}`}
                    points={cable.points}
                    color={cable.color}
                    lineWidth={1.5}
                    transparent
                    opacity={0.6}
                />
            ))}
        </group>
    );
}

export function DataCenterScene() {
    const { racks, pods, cracs, pdus, worldObjects, viewMode, editMode, transformMode, selectedRackId, setSelectedRackId } = useDcimStore();

    return (
        <group>
            <MeasurementTool />

            {/* Clean architectural floor plan */}
            <DataCenterArchitecture />

            {/* Bright, even lighting for architectural viz */}
            <ambientLight intensity={1.2} color="#ffffff" />
            <directionalLight
                position={[15, 20, 10]}
                intensity={1.0}
                color="#ffffff"
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-camera-left={-20}
                shadow-camera-right={20}
                shadow-camera-top={20}
                shadow-camera-bottom={-20}
            />
            <directionalLight position={[-10, 15, -10]} intensity={0.5} color="#eeeeff" />

            {/* Green designated zones */}
            <FloorZone position={[14, 0, 6]} width={6} depth={5} label="Zone A" color="#44cc44" />
            <FloorZone position={[14, 0, 0]} width={6} depth={5} label="Zone B" color="#44cc44" />
            <FloorZone position={[14, 0, -6]} width={6} depth={5} label="Zone C" color="#44cc44" />

            {/* Cable routing visualization */}
            <CableRouting racks={racks} />

            {/* CRAC Units */}
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

            {/* PDUs */}
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
                    <RoundedBox args={[0.6, 2.0, 0.6]} position={[0, 1.0, 0]} radius={0.03} smoothness={4}>
                        <meshStandardMaterial color="#2a5a2a" roughness={0.3} metalness={0.7} />
                    </RoundedBox>
                </DraggableModel>
            ))}

            {/* World Objects */}
            {worldObjects.map(obj => (
                <DraggableModel
                    key={obj.id}
                    id={obj.id}
                    position={[obj.x, 0, obj.z]}
                    rotation={[0, obj.rotationY || 0, 0]}
                    editMode={editMode}
                    transformMode={transformMode}
                    snapToGrid={useDcimStore.getState().snapToGrid}
                    selectedId={selectedRackId}
                    onSelect={setSelectedRackId}
                    onTransformChange={(id, type, value) => {
                        const state = useDcimStore.getState();
                        if (type === 'position') state.updateWorldObjectPosition(id, value[0], value[2], obj.rotationY);
                        if (type === 'rotation') state.updateWorldObjectPosition(id, obj.x, obj.z, value[1]);
                    }}
                >
                    <WorldObjectRenderer data={obj} viewMode={viewMode} />
                </DraggableModel>
            ))}

            {/* Power cable lines (Power view) */}
            {viewMode === 'Power' && (
                <group>
                    {racks.map((rack, i) => {
                        const pdu = pdus[0] || { x: 8, z: 0 };
                        const start = new THREE.Vector3(pdu.x, 2.0, pdu.z);
                        const end = new THREE.Vector3(rack.x, 1.8, rack.z);
                        const mid1 = new THREE.Vector3(pdu.x, 3.0, pdu.z);
                        const mid2 = new THREE.Vector3(rack.x, 3.0, pdu.z);
                        const mid3 = new THREE.Vector3(rack.x, 3.0, rack.z);
                        return (
                            <Line
                                key={`pwr-${i}`}
                                points={[start, mid1, mid2, mid3, end]}
                                color={rack.power > 6 ? "#ff4d4f" : "#108ee9"}
                                lineWidth={2}
                                dashed
                                dashScale={10}
                                dashSize={0.5}
                            />
                        );
                    })}
                </group>
            )}

            <NetworkOverlay />
            <AirflowParticles />

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

            {/* Thermal overlay */}
            {viewMode === 'Thermal' && (
                <group>
                    <ThermalOverlay width={30} length={20} />
                    <AirflowParticles count={800} />
                </group>
            )}

            <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={50} blur={2} far={4} />
        </group>
    );
}
