"use client";

import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { Edges, useCursor } from "@react-three/drei";

function GenericBimElement({ geometry, position, scale, rotation, color, type, onClick, name, explodeFactor, clipPlane }: any) {
    const [hovered, setHovered] = useState(false);
    useCursor(hovered, 'pointer', 'auto');
    const isWireframe = type === 'wireframe';
    const isGhost = type === 'ghost';
    
    // Calculate exploded position
    const vec = new THREE.Vector3(position[0], position[1], position[2]);
    if (explodeFactor > 0) {
        // Explode horizontally from center (X, Z) and vertically from center (Y=10)
        const dir = new THREE.Vector3(vec.x, (vec.y - 10) * 2, vec.z).normalize();
        const distance = vec.length() * explodeFactor * 0.1;
        vec.add(dir.multiplyScalar(distance));
    }

    return (
        <mesh 
            geometry={geometry}
            position={[vec.x, vec.y, vec.z]} 
            scale={scale} 
            rotation={rotation || [0,0,0]}
            onClick={(e) => { e.stopPropagation(); onClick(name, e); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
            castShadow={type !== 'performance'}
            receiveShadow={type !== 'performance'}
        >
            {geometry ? null : <boxGeometry />}
            {type === 'hidden-line' || type === 'flat' || type === 'performance' ? (
                <meshBasicMaterial 
                    color={hovered ? '#40a9ff' : color} 
                    transparent={isGhost} 
                    opacity={isGhost ? 0.3 : 0.95} 
                    wireframe={isWireframe}
                    clippingPlanes={clipPlane ? [clipPlane] : []}
                    side={THREE.DoubleSide}
                />
            ) : (
                <meshPhysicalMaterial 
                    color={hovered ? '#40a9ff' : color} 
                    transparent={isGhost} 
                    opacity={isGhost ? 0.3 : 0.95} 
                    roughness={0.4}
                    metalness={0.2}
                    clearcoat={0.1}
                    wireframe={isWireframe}
                    clippingPlanes={clipPlane ? [clipPlane] : []}
                    clipShadows={true}
                    side={THREE.DoubleSide}
                />
            )}
            {type !== 'performance' && <Edges scale={1} threshold={15} color={hovered ? "#fff" : (isWireframe ? color : (type === 'hidden-line' ? '#333' : '#222'))} />}
        </mesh>
    );
}

// Custom Cylinder Element
function CylinderBimElement({ position, scale, rotation, color, type, onClick, name, explodeFactor, clipPlane, args }: any) {
    const [hovered, setHovered] = useState(false);
    useCursor(hovered, 'pointer', 'auto');
    const isWireframe = type === 'wireframe';
    const isGhost = type === 'ghost';
    
    const vec = new THREE.Vector3(position[0], position[1], position[2]);
    if (explodeFactor > 0) {
        const dir = new THREE.Vector3(vec.x, (vec.y - 10) * 2, vec.z).normalize();
        const distance = vec.length() * explodeFactor * 0.1;
        vec.add(dir.multiplyScalar(distance));
    }

    return (
        <mesh 
            position={[vec.x, vec.y, vec.z]} 
            rotation={rotation || [0,0,0]}
            onClick={(e) => { e.stopPropagation(); onClick(name, e); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
            castShadow={type !== 'performance'}
            receiveShadow={type !== 'performance'}
        >
            <cylinderGeometry args={args || [1, 1, 1, 16]} />
            {type === 'hidden-line' || type === 'flat' || type === 'performance' ? (
                <meshBasicMaterial 
                    color={hovered ? '#40a9ff' : color} 
                    transparent={isGhost} 
                    opacity={isGhost ? 0.3 : 0.95} 
                    wireframe={isWireframe}
                    clippingPlanes={clipPlane ? [clipPlane] : []}
                    side={THREE.DoubleSide}
                />
            ) : (
                <meshPhysicalMaterial 
                    color={hovered ? '#40a9ff' : color} 
                    transparent={isGhost} 
                    opacity={isGhost ? 0.3 : 0.95} 
                    roughness={0.4}
                    metalness={0.2}
                    wireframe={isWireframe}
                    clippingPlanes={clipPlane ? [clipPlane] : []}
                    clipShadows={true}
                    side={THREE.DoubleSide}
                />
            )}
            {type !== 'performance' && <Edges scale={1} threshold={15} color={hovered ? "#fff" : (isWireframe ? color : (type === 'hidden-line' ? '#333' : '#222'))} />}
        </mesh>
    );
}

export function MockBuildingModel({ onElementClick, viewMode, activeSystems, explodeFactor, clipY }: any) {
    const renderType = viewMode; 
    const clipPlane = useMemo(() => clipY < 30 ? new THREE.Plane(new THREE.Vector3(0, -1, 0), clipY) : null, [clipY]);

    let archColor, hvacColor, elecColor, plumbColor, glassColor;
    if (viewMode === 'monochrome') {
        archColor = hvacColor = elecColor = plumbColor = glassColor = "#e2e8f0";
    } else if (viewMode === 'hidden-line') {
        archColor = hvacColor = elecColor = plumbColor = glassColor = "#ffffff";
    } else if (viewMode === 'color-coded' || viewMode === 'flat') {
        archColor = "#cbd5e1";
        glassColor = "#bae6fd";
        hvacColor = "#3b82f6"; // Blue
        elecColor = "#eab308"; // Yellow
        plumbColor = "#22c55e"; // Green
    } else if (viewMode === 'performance') {
        archColor = "#94a3b8"; // Core/Structure is neutral
        glassColor = "#bae6fd"; // Default glass, overridden later for orientation
        hvacColor = "#ef4444"; // HVAC exhaust is hot
        elecColor = "#64748b"; 
        plumbColor = "#64748b";
    } else { // shaded, wireframe, ghost
        archColor = "#e2e8f0"; // concrete
        glassColor = "#0284c7"; // glass blue
        hvacColor = "#a3a3a3"; // galvanized steel
        elecColor = "#475569"; // dark grey panels/trays
        plumbColor = "#f8fafc"; // PVC white
    }

    const floors = 8;
    const floorHeight = 4.5;
    const bWidth = 50;
    const bDepth = 50;

    const elements = [];

    // --- ARCHITECTURE ---
    if (activeSystems.arch) {
        // Foundation
        elements.push(
            <GenericBimElement key="arch-found" position={[0, -0.5, 0]} scale={[bWidth + 2, 1, bDepth + 2]} color="#8c8c8c" type={renderType} onClick={onElementClick} name="Architectural / Foundation" explodeFactor={0} clipPlane={clipPlane} />
        );

        for (let i = 0; i < floors + 1; i++) {
            const y = i * floorHeight;
            // Floor Slabs
            elements.push(
                <GenericBimElement key={`arch-floor-${i}`} position={[0, y, 0]} scale={[bWidth, 0.4, bDepth]} color={archColor} type={renderType} onClick={onElementClick} name={`Architectural / Floor Slab L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
            );

            // Columns (grid)
            if (i < floors) {
                const colY = y + floorHeight / 2;
                for (let x = -bWidth/2 + 2.5; x <= bWidth/2 - 2.5; x += 7.5) {
                    for (let z = -bDepth/2 + 2.5; z <= bDepth/2 - 2.5; z += 7.5) {
                        elements.push(
                            <GenericBimElement key={`arch-col-${i}-${x}-${z}`} position={[x, colY, z]} scale={[0.8, floorHeight, 0.8]} color="#94a3b8" type={renderType} onClick={onElementClick} name={`Architectural / Structural Column L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                        );
                    }
                }

                // Core (Elevator Shaft)
                elements.push(
                    <GenericBimElement key={`arch-core-${i}`} position={[0, colY, 0]} scale={[8, floorHeight, 8]} color="#cbd5e1" type={renderType} onClick={onElementClick} name={`Architectural / Concrete Core L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                );

                // Interior Walls (Corridors)
                elements.push(
                    <GenericBimElement key={`arch-int1-${i}`} position={[0, colY, 6]} scale={[bWidth - 10, floorHeight, 0.2]} color={archColor} type={renderType} onClick={onElementClick} name={`Architectural / Interior Wall Corridor S L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                );
                elements.push(
                    <GenericBimElement key={`arch-int2-${i}`} position={[0, colY, -6]} scale={[bWidth - 10, floorHeight, 0.2]} color={archColor} type={renderType} onClick={onElementClick} name={`Architectural / Interior Wall Corridor N L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                );
                elements.push(
                    <GenericBimElement key={`arch-int3-${i}`} position={[6, colY, 0]} scale={[0.2, floorHeight, bDepth - 10]} color={archColor} type={renderType} onClick={onElementClick} name={`Architectural / Interior Wall Corridor E L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                );
                elements.push(
                    <GenericBimElement key={`arch-int4-${i}`} position={[-6, colY, 0]} scale={[0.2, floorHeight, bDepth - 10]} color={archColor} type={renderType} onClick={onElementClick} name={`Architectural / Interior Wall Corridor W L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                );

                // Glass Curtain Wall (All faces)
                const wallMode = renderType === 'shaded' ? 'ghost' : renderType;
                
                // Performance Heatmap colors for glass based on orientation
                const southGlassColor = viewMode === 'performance' ? '#f97316' : glassColor; // Orange for high solar gain
                const northGlassColor = viewMode === 'performance' ? '#3b82f6' : glassColor; // Blue for low solar gain

                elements.push(
                    <GenericBimElement key={`arch-wall-s-${i}`} position={[0, colY, bDepth/2]} scale={[bWidth, floorHeight, 0.2]} color={southGlassColor} type={wallMode} onClick={onElementClick} name={`Architectural / Curtain Wall South L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                );
                elements.push(
                    <GenericBimElement key={`arch-wall-n-${i}`} position={[0, colY, -bDepth/2]} scale={[bWidth, floorHeight, 0.2]} color={northGlassColor} type={wallMode} onClick={onElementClick} name={`Architectural / Curtain Wall North L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                );
                elements.push(
                    <GenericBimElement key={`arch-wall-e-${i}`} position={[bWidth/2, colY, 0]} scale={[0.2, floorHeight, bDepth]} color={glassColor} type={wallMode} onClick={onElementClick} name={`Architectural / Curtain Wall East L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                );
                elements.push(
                    <GenericBimElement key={`arch-wall-w-${i}`} position={[-bWidth/2, colY, 0]} scale={[0.2, floorHeight, bDepth]} color={glassColor} type={wallMode} onClick={onElementClick} name={`Architectural / Curtain Wall West L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                );
            }
        }
    }

    // --- MECHANICAL (HVAC) ---
    if (activeSystems.mech) {
        const roofY = floors * floorHeight + 1.5;
        // Roof Chillers / AHUs
        elements.push(
            <GenericBimElement key="mech-ahu-1" position={[6, roofY, -4]} scale={[4, 2.5, 5]} color={hvacColor} type={renderType} onClick={onElementClick} name="Mechanical / Rooftop AHU-1" explodeFactor={explodeFactor} clipPlane={clipPlane} />
        );
        elements.push(
            <GenericBimElement key="mech-ahu-2" position={[-6, roofY, -4]} scale={[4, 2.5, 5]} color={hvacColor} type={renderType} onClick={onElementClick} name="Mechanical / Rooftop AHU-2" explodeFactor={explodeFactor} clipPlane={clipPlane} />
        );

        // Vertical Main Shafts
        elements.push(
            <GenericBimElement key="mech-shaft-s" position={[2, (roofY)/2, 2]} scale={[1.5, roofY, 1.5]} color={hvacColor} type={renderType} onClick={onElementClick} name="Mechanical / Main Supply Shaft" explodeFactor={explodeFactor} clipPlane={clipPlane} />
        );
        elements.push(
            <GenericBimElement key="mech-shaft-r" position={[-2, (roofY)/2, 2]} scale={[1.5, roofY, 1.5]} color={hvacColor} type={renderType} onClick={onElementClick} name="Mechanical / Main Return Shaft" explodeFactor={explodeFactor} clipPlane={clipPlane} />
        );

        // Floor Ducts
        for (let i = 0; i < floors; i++) {
            const ceilingY = i * floorHeight + 3.8;
            // Primary Loop
            elements.push(
                <GenericBimElement key={`mech-duct-p1-${i}`} position={[0, ceilingY, -9]} scale={[30, 0.6, 1.2]} color={hvacColor} type={renderType} onClick={onElementClick} name={`Mechanical / Primary Supply Duct N L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
            );
            elements.push(
                <GenericBimElement key={`mech-duct-p2-${i}`} position={[0, ceilingY, 9]} scale={[30, 0.6, 1.2]} color={hvacColor} type={renderType} onClick={onElementClick} name={`Mechanical / Primary Supply Duct S L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
            );
            // Branches
            for (let x = -15; x <= 15; x += 7.5) {
                if (x === 0) continue; // Skip core
                elements.push(
                    <GenericBimElement key={`mech-duct-b-${i}-${x}`} position={[x, ceilingY, 0]} scale={[0.5, 0.4, 20]} color={hvacColor} type={renderType} onClick={onElementClick} name={`Mechanical / Branch Duct L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                );
                // VAV Box
                elements.push(
                    <GenericBimElement key={`mech-vav-${i}-${x}`} position={[x, ceilingY, -1.5]} scale={[1, 0.8, 1.2]} color="#64748b" type={renderType} onClick={onElementClick} name={`Mechanical / VAV Box L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                );
            }
        }
    }

    // --- ELECTRICAL ---
    if (activeSystems.elec) {
        // Main Switchboard G
        elements.push(
            <GenericBimElement key="elec-msb" position={[-12, 1.5, 8]} scale={[3, 3, 1]} color={elecColor} type={renderType} onClick={onElementClick} name="Electrical / Main Switchboard Ground" explodeFactor={explodeFactor} clipPlane={clipPlane} />
        );
        // Vertical Busway
        const roofY = floors * floorHeight;
        elements.push(
            <GenericBimElement key="elec-bus" position={[-4, roofY/2, 2.5]} scale={[0.8, roofY, 0.3]} color={elecColor} type={renderType} onClick={onElementClick} name="Electrical / Vertical Busway Main" explodeFactor={explodeFactor} clipPlane={clipPlane} />
        );

        for (let i = 0; i < floors; i++) {
            const ceilingY = i * floorHeight + 3.9;
            const floorY = i * floorHeight;
            // Floor Panel
            elements.push(
                <GenericBimElement key={`elec-panel-${i}`} position={[-6.5, floorY + 1.5, 2.5]} scale={[1.2, 2, 0.3]} color={elecColor} type={renderType} onClick={onElementClick} name={`Electrical / Distribution Panel L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
            );
            // Cable Tray Loop
            elements.push(
                <GenericBimElement key={`elec-tray-${i}`} position={[0, ceilingY, 8]} scale={[35, 0.1, 0.8]} color={elecColor} type={renderType} onClick={onElementClick} name={`Electrical / Primary Cable Tray L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
            );
            
            // Lighting Grid
            for (let x = -20; x <= 20; x += 5) {
                for (let z = -20; z <= 20; z += 5) {
                    if (Math.abs(x) < 6 && Math.abs(z) < 6) continue; // Skip core
                    elements.push(
                        <GenericBimElement key={`elec-light-${i}-${x}-${z}`} position={[x, ceilingY, z]} scale={[1.2, 0.05, 0.6]} color="#ffffff" type={renderType} onClick={onElementClick} name={`Electrical / LED Troffer L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                    );
                }
            }
        }
    }

    // --- PLUMBING ---
    if (activeSystems.plumb) {
        const roofY = floors * floorHeight;
        // Roof Tanks
        elements.push(
            <CylinderBimElement key="plumb-tank-1" position={[10, roofY + 2.5, 6]} args={[1.5, 1.5, 4, 32]} color={plumbColor} type={renderType} onClick={onElementClick} name="Plumbing / Cooling Tower A" explodeFactor={explodeFactor} clipPlane={clipPlane} />
        );
        elements.push(
            <CylinderBimElement key="plumb-tank-2" position={[10, roofY + 2.5, 2]} args={[1.5, 1.5, 4, 32]} color={plumbColor} type={renderType} onClick={onElementClick} name="Plumbing / Cooling Tower B" explodeFactor={explodeFactor} clipPlane={clipPlane} />
        );

        // Vertical Stacks (Core)
        elements.push(
            <CylinderBimElement key="plumb-stack-w" position={[3, roofY/2, 0]} args={[0.2, 0.2, roofY, 16]} color={plumbColor} type={renderType} onClick={onElementClick} name="Plumbing / Domestic Water Stack" explodeFactor={explodeFactor} clipPlane={clipPlane} />
        );
        elements.push(
            <CylinderBimElement key="plumb-stack-s" position={[3, roofY/2, 1]} args={[0.3, 0.3, roofY, 16]} color={plumbColor} type={renderType} onClick={onElementClick} name="Plumbing / Sanitary Stack" explodeFactor={explodeFactor} clipPlane={clipPlane} />
        );

        for (let i = 0; i < floors; i++) {
            const floorY = i * floorHeight;
            // Restroom blocks
            elements.push(
                <GenericBimElement key={`plumb-restroom-${i}`} position={[4.5, floorY + 1.2, 0.5]} scale={[2, 2.4, 3]} color="#cbd5e1" type={renderType} onClick={onElementClick} name={`Plumbing / Restroom Fixtures L${i}`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
            );
        }
    }

    return (
        <group position={[0, 0, 0]}>
            {elements}
        </group>
    );
}
