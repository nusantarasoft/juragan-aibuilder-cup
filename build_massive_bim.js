const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'admin/src/app/admin/bim/viewer');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const mockBuildingPath = path.join(dir, 'MockBuildingModel.tsx');
const bimViewerPath = path.join(dir, 'BimViewer.tsx');

const mockBuildingContent = `"use client";

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
            onClick={(e) => { e.stopPropagation(); onClick(name); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
            castShadow
            receiveShadow
        >
            {geometry ? null : <boxGeometry />}
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
            <Edges scale={1} threshold={15} color={hovered ? "#fff" : (isWireframe ? color : "#222")} />
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
            onClick={(e) => { e.stopPropagation(); onClick(name); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
            castShadow
            receiveShadow
        >
            <cylinderGeometry args={args || [1, 1, 1, 16]} />
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
            <Edges scale={1} threshold={15} color={hovered ? "#fff" : (isWireframe ? color : "#222")} />
        </mesh>
    );
}

export function MockBuildingModel({ onElementClick, viewMode, activeSystems, explodeFactor, clipY }: any) {
    const renderType = viewMode; 
    const clipPlane = useMemo(() => clipY < 30 ? new THREE.Plane(new THREE.Vector3(0, -1, 0), clipY) : null, [clipY]);

    let archColor, hvacColor, elecColor, plumbColor, glassColor;
    if (viewMode === 'monochrome') {
        archColor = hvacColor = elecColor = plumbColor = glassColor = "#e2e8f0";
    } else if (viewMode === 'color-coded') {
        archColor = "#cbd5e1";
        glassColor = "#bae6fd";
        hvacColor = "#3b82f6"; // Blue
        elecColor = "#eab308"; // Yellow
        plumbColor = "#22c55e"; // Green
    } else { // shaded, wireframe, ghost
        archColor = "#e2e8f0"; // concrete
        glassColor = "#0284c7"; // glass blue
        hvacColor = "#a3a3a3"; // galvanized steel
        elecColor = "#475569"; // dark grey panels/trays
        plumbColor = "#f8fafc"; // PVC white
    }

    const floors = 5;
    const floorHeight = 4.5;
    const bWidth = 30;
    const bDepth = 20;

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
                <GenericBimElement key={\`arch-floor-\${i}\`} position={[0, y, 0]} scale={[bWidth, 0.4, bDepth]} color={archColor} type={renderType} onClick={onElementClick} name={\`Architectural / Floor Slab L\${i}\`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
            );

            // Columns (grid)
            if (i < floors) {
                const colY = y + floorHeight / 2;
                for (let x = -bWidth/2 + 1; x <= bWidth/2 - 1; x += 7) {
                    for (let z = -bDepth/2 + 1; z <= bDepth/2 - 1; z += 6) {
                        elements.push(
                            <GenericBimElement key={\`arch-col-\${i}-\${x}-\${z}\`} position={[x, colY, z]} scale={[0.8, floorHeight, 0.8]} color="#94a3b8" type={renderType} onClick={onElementClick} name={\`Architectural / Structural Column L\${i}\`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                        );
                    }
                }

                // Core (Elevator Shaft)
                elements.push(
                    <GenericBimElement key={\`arch-core-\${i}\`} position={[0, colY, 0]} scale={[6, floorHeight, 6]} color="#cbd5e1" type={renderType} onClick={onElementClick} name={\`Architectural / Concrete Core L\${i}\`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                );

                // Glass Curtain Wall (South & North faces)
                const wallMode = renderType === 'shaded' ? 'ghost' : renderType;
                elements.push(
                    <GenericBimElement key={\`arch-wall-s-\${i}\`} position={[0, colY, bDepth/2]} scale={[bWidth, floorHeight, 0.2]} color={glassColor} type={wallMode} onClick={onElementClick} name={\`Architectural / Curtain Wall South L\${i}\`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                );
                elements.push(
                    <GenericBimElement key={\`arch-wall-n-\${i}\`} position={[0, colY, -bDepth/2]} scale={[bWidth, floorHeight, 0.2]} color={glassColor} type={wallMode} onClick={onElementClick} name={\`Architectural / Curtain Wall North L\${i}\`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
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
                <GenericBimElement key={\`mech-duct-p-\${i}\`} position={[0, ceilingY, -3]} scale={[24, 0.6, 1.2]} color={hvacColor} type={renderType} onClick={onElementClick} name={\`Mechanical / Primary Supply Duct L\${i}\`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
            );
            // Branches
            for (let x = -10; x <= 10; x += 5) {
                if (x === 0) continue; // Skip core
                elements.push(
                    <GenericBimElement key={\`mech-duct-b-\${i}-\${x}\`} position={[x, ceilingY, 2]} scale={[0.5, 0.4, 10]} color={hvacColor} type={renderType} onClick={onElementClick} name={\`Mechanical / Branch Duct L\${i}\`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
                );
                // VAV Box
                elements.push(
                    <GenericBimElement key={\`mech-vav-\${i}-\${x}\`} position={[x, ceilingY, -1.5]} scale={[1, 0.8, 1.2]} color="#64748b" type={renderType} onClick={onElementClick} name={\`Mechanical / VAV Box L\${i}\`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
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
                <GenericBimElement key={\`elec-panel-\${i}\`} position={[-4.5, floorY + 1.5, 2.5]} scale={[1.2, 2, 0.3]} color={elecColor} type={renderType} onClick={onElementClick} name={\`Electrical / Distribution Panel L\${i}\`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
            );
            // Cable Tray Loop
            elements.push(
                <GenericBimElement key={\`elec-tray-\${i}\`} position={[0, ceilingY, 4]} scale={[22, 0.1, 0.8]} color={elecColor} type={renderType} onClick={onElementClick} name={\`Electrical / Primary Cable Tray L\${i}\`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
            );
            
            // Lighting Grid
            for (let x = -12; x <= 12; x += 4) {
                for (let z = -8; z <= 8; z += 4) {
                    if (Math.abs(x) < 4 && Math.abs(z) < 4) continue; // Skip core
                    elements.push(
                        <GenericBimElement key={\`elec-light-\${i}-\${x}-\${z}\`} position={[x, ceilingY, z]} scale={[1.2, 0.05, 0.6]} color="#ffffff" type={renderType} onClick={onElementClick} name={\`Electrical / LED Troffer L\${i}\`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
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
                <GenericBimElement key={\`plumb-restroom-\${i}\`} position={[4.5, floorY + 1.2, 0.5]} scale={[2, 2.4, 3]} color="#cbd5e1" type={renderType} onClick={onElementClick} name={\`Plumbing / Restroom Fixtures L\${i}\`} explodeFactor={explodeFactor} clipPlane={clipPlane} />
            );
        }
    }

    return (
        <group position={[0, 0, 0]}>
            {elements}
        </group>
    );
}
`;

const bimViewerContent = `"use client";

import React, { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, SoftShadows, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, SSAO, ToneMapping, SMAA, DepthOfField } from "@react-three/postprocessing";
import * as THREE from "three";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useTheme } from "next-themes";
import { Select, Button, Typography, Spin, Divider, Row, Col, Progress, Slider, Switch, Badge, Tag, Space } from "antd";
import { 
    AppstoreOutlined, FireOutlined, ExperimentOutlined, NodeIndexOutlined, 
    ApiOutlined, EnvironmentOutlined, BarChartOutlined, ThunderboltOutlined,
    CloudOutlined, ControlOutlined, SunOutlined, ProjectOutlined,
    ScissorOutlined, CompressOutlined, ExpandOutlined
} from "@ant-design/icons";
import { GlassPanel } from "@/components/ui/GlassPanel";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";

// Import massive building model
import { MockBuildingModel } from "./MockBuildingModel";

const { Text, Title } = Typography;

export default function BimViewer() {
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => { setMounted(true); }, []);
    const isDark = mounted && resolvedTheme === "dark";
    
    // State
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<string>('shaded'); // shaded, monochrome, color-coded, wireframe, ghost
    const [activeSystems, setActiveSystems] = useState({ arch: true, mech: true, elec: true, plumb: true });
    
    const [activeAnalysis, setActiveAnalysis] = useState<string>('none'); 
    
    // Advanced BIM Feature States
    const [explodeFactor, setExplodeFactor] = useState<number>(0);
    const [clipY, setClipY] = useState<number>(30); // 30 is above roof (no clipping)

    // Calculate Costs mock
    const costArch = activeSystems.arch ? 15000000 : 0;
    const costMech = activeSystems.mech ? 4500000 : 0;
    const costElec = activeSystems.elec ? 3200000 : 0;
    const costPlumb = activeSystems.plumb ? 2100000 : 0;
    const totalCost = costArch + costMech + costElec + costPlumb;

    // Mock UI Content
    const LeftPanel = (
        <GlassPanel isDark={isDark} intensity="high" style={{ height: '100%', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: \`1px solid \${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}\` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: isDark ? '#aaa' : '#666', marginBottom: 8 }}>Environmental Analysis</div>
                <Select 
                    value={activeAnalysis}
                    onChange={setActiveAnalysis}
                    style={{ width: '100%' }} 
                    options={[
                        { label: <span><ProjectOutlined /> Default View</span>, value: 'none' },
                        { label: <span><SunOutlined /> Sun & Daylight Analysis</span>, value: 'sun' },
                        { label: <span><CloudOutlined /> Wind Flow Simulation</span>, value: 'wind' }
                    ]} 
                />
            </div>
            
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: isDark ? '#aaa' : '#666', marginBottom: 16 }}>Advanced Interactivity</div>
                
                <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 12 }}><ScissorOutlined /> Section Clipping (Y-Axis)</Text>
                        <Text style={{ fontSize: 12, color: themeColor }}>{clipY < 30 ? 'Active' : 'Off'}</Text>
                    </div>
                    <Slider min={-2} max={30} step={0.1} value={clipY} onChange={setClipY} tooltip={{ formatter: val => \`Height: \${val}m\` }} />
                </div>

                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 12 }}><ExpandOutlined /> Explode Assembly</Text>
                        <Text style={{ fontSize: 12, color: themeColor }}>{explodeFactor.toFixed(1)}x</Text>
                    </div>
                    <Slider min={0} max={10} step={0.1} value={explodeFactor} onChange={setExplodeFactor} />
                </div>

                <Divider style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', margin: '16px 0' }} />

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: isDark ? '#aaa' : '#666', marginBottom: 16 }}>MEP Systems Filter</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Row align="middle" justify="space-between">
                        <Col><Badge color="#cbd5e1" text={<span style={{color: isDark?'#e2e8f0':'#333'}}>Architectural</span>} /></Col>
                        <Col><Switch size="small" checked={activeSystems.arch} onChange={c => setActiveSystems({...activeSystems, arch: c})} /></Col>
                    </Row>
                    <Row align="middle" justify="space-between">
                        <Col><Badge color="#3b82f6" text={<span style={{color: isDark?'#e2e8f0':'#333'}}>Mechanical (HVAC)</span>} /></Col>
                        <Col><Switch size="small" checked={activeSystems.mech} onChange={c => setActiveSystems({...activeSystems, mech: c})} /></Col>
                    </Row>
                    <Row align="middle" justify="space-between">
                        <Col><Badge color="#eab308" text={<span style={{color: isDark?'#e2e8f0':'#333'}}>Electrical</span>} /></Col>
                        <Col><Switch size="small" checked={activeSystems.elec} onChange={c => setActiveSystems({...activeSystems, elec: c})} /></Col>
                    </Row>
                    <Row align="middle" justify="space-between">
                        <Col><Badge color="#22c55e" text={<span style={{color: isDark?'#e2e8f0':'#333'}}>Plumbing / Piping</span>} /></Col>
                        <Col><Switch size="small" checked={activeSystems.plumb} onChange={c => setActiveSystems({...activeSystems, plumb: c})} /></Col>
                    </Row>
                </div>
            </div>
        </GlassPanel>
    );

    const RightPanel = (
        <GlassPanel isDark={isDark} intensity="high" style={{ height: '100%', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: \`1px solid \${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}\` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: isDark ? '#aaa' : '#666', marginBottom: 8 }}>Performance & Cost Metrics</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Tag color="green">LEED Platinum Target</Tag>
                    <Tag color="blue">Commercial Class A</Tag>
                </div>
            </div>

            <div style={{ padding: '20px', flex: 1, overflowY: 'auto', color: isDark ? '#e2e8f0' : '#333' }}>
                {!selectedElement ? (
                    <>
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <div style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', padding: 12, borderRadius: 8 }}>
                                    <div style={{ fontSize: 11, color: isDark ? '#aaa' : '#666' }}>Gross Floor Area</div>
                                    <div style={{ fontSize: 18, fontWeight: 600, color: themeColor }}>14,500 <span style={{fontSize: 12}}>m²</span></div>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', padding: 12, borderRadius: 8 }}>
                                    <div style={{ fontSize: 11, color: isDark ? '#aaa' : '#666' }}>Est. Project Cost</div>
                                    <div style={{ fontSize: 17, fontWeight: 600, color: '#52c41a' }}>$\{(totalCost / 1000000).toFixed(1)}M</div>
                                </div>
                            </Col>
                        </Row>

                        <div style={{ marginTop: 24 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Cost Breakdown (Active Systems)</div>
                            
                            {activeSystems.arch && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}><span>Architecture</span><span>$15.0M</span></div>}
                            {activeSystems.arch && <Progress percent={60} strokeColor="#cbd5e1" showInfo={false} style={{ marginBottom: 12 }} />}
                            
                            {activeSystems.mech && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}><span>Mechanical (HVAC)</span><span>$4.5M</span></div>}
                            {activeSystems.mech && <Progress percent={18} strokeColor="#3b82f6" showInfo={false} style={{ marginBottom: 12 }} />}
                            
                            {activeSystems.elec && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}><span>Electrical</span><span>$3.2M</span></div>}
                            {activeSystems.elec && <Progress percent={13} strokeColor="#eab308" showInfo={false} style={{ marginBottom: 12 }} />}
                            
                            {activeSystems.plumb && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}><span>Plumbing</span><span>$2.1M</span></div>}
                            {activeSystems.plumb && <Progress percent={9} strokeColor="#22c55e" showInfo={false} style={{ marginBottom: 12 }} />}
                        </div>

                        <div style={{ marginTop: 24 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Daylight Potential (Spatial Autonomy)</div>
                            <Progress percent={82} strokeColor={themeColor} status="active" />
                        </div>
                    </>
                ) : (
                    <div className="fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: isDark ? '#aaa' : '#666' }}>Selected Element</div>
                            <Button size="small" type="text" onClick={() => setSelectedElement(null)} style={{ fontSize: 11, color: themeColor }}>Clear</Button>
                        </div>
                        
                        <Text strong style={{ display: 'block', fontSize: 16, marginBottom: 16, color: themeColor }}>{selectedElement}</Text>
                        
                        <Row gutter={8} style={{ marginBottom: 24 }}>
                            <Col span={12}><Button block size="small" type="primary" ghost>Focus</Button></Col>
                            <Col span={12}><Button block size="small" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', border: 'none' }}>Isolate</Button></Col>
                        </Row>
                        
                        <div style={{ fontWeight: 600, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', padding: '6px 12px', marginBottom: 12, borderRadius: 6, borderLeft: \`3px solid \${themeColor}\` }}>BIM Metadata</div>
                        <Row style={{ marginBottom: 12, fontSize: 13 }}><Col span={10}><Text type="secondary">System:</Text></Col><Col span={14}>{selectedElement.split(' / ')[0]}</Col></Row>
                        <Row style={{ marginBottom: 12, fontSize: 13 }}><Col span={10}><Text type="secondary">Component:</Text></Col><Col span={14}>{selectedElement.split(' / ')[1]}</Col></Row>
                        
                        <div style={{ fontWeight: 600, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', padding: '6px 12px', margin: '24px 0 12px 0', borderRadius: 6, borderLeft: \`3px solid \${themeColor}\` }}>Maintenance & Lifecycle</div>
                        <Row style={{ marginBottom: 12, fontSize: 13 }}><Col span={10}><Text type="secondary">Installed:</Text></Col><Col span={14}>Oct 12, 2024</Col></Row>
                        <Row style={{ marginBottom: 12, fontSize: 13 }}><Col span={10}><Text type="secondary">Next Inspection:</Text></Col><Col span={14}>Oct 12, 2026</Col></Row>
                    </div>
                )}
            </div>
        </GlassPanel>
    );

    return (
        <CMSLayout 
            title={<AuroraText>Advanced BIM Digital Twin</AuroraText>}
            subTitle={<DecryptedText text="Massive 5-Story Model with Interactive Explode & Clipping" speed={60} />}
        >
            <div style={{ position: 'relative', height: 'calc(100vh - 160px)', minHeight: 600, width: '100%', borderRadius: 16, overflow: 'hidden', background: isDark ? '#050505' : '#e5e5e5' }}>
                
                {/* --- 3D CANVAS --- */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
                    <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>}>
                        <Canvas 
                            camera={{ position: [35, 30, 35], fov: 45 }} 
                            shadows
                            gl={{ antialias: false, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2, localClippingEnabled: true }}
                        >
                            <SoftShadows size={15} samples={16} focus={0.5} />
                            
                            {/* Dynamic Lighting */}
                            {activeAnalysis === 'sun' ? (
                                <>
                                    <ambientLight intensity={0.2} />
                                    <directionalLight position={[20, 40, -10]} intensity={2.5} castShadow shadow-mapSize={[4096, 4096]} shadow-bias={-0.0001}>
                                        <orthographicCamera attach="shadow-camera" args={[-40, 40, 40, -40, 0.1, 100]} />
                                    </directionalLight>
                                </>
                            ) : (
                                <>
                                    <ambientLight intensity={isDark ? 0.4 : 0.7} />
                                    <directionalLight position={[15, 30, 15]} intensity={isDark ? 1.5 : 1.0} castShadow shadow-mapSize={[2048, 2048]} />
                                    <directionalLight position={[-15, 15, -15]} intensity={0.5} />
                                </>
                            )}
                            
                            <Grid args={[200, 200]} sectionSize={1} sectionColor={isDark ? '#444' : '#ccc'} cellColor={isDark ? '#222' : '#eee'} position={[0, -0.56, 0]} fadeDistance={80} />
                            
                            {/* Massive Building Model */}
                            <MockBuildingModel 
                                onElementClick={(type: string) => setSelectedElement(type)} 
                                viewMode={viewMode} 
                                activeSystems={activeSystems} 
                                explodeFactor={explodeFactor}
                                clipY={clipY}
                            />
                            
                            <EffectComposer multisampling={0}>
                                <SMAA />
                                <SSAO samples={21} radius={0.15} intensity={15} luminanceInfluence={0.6} />
                                <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={1.2} />
                                <DepthOfField focusDistance={0.05} focalLength={0.15} bokehScale={4} />
                                <ToneMapping />
                            </EffectComposer>

                            <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} autoRotate={activeAnalysis === 'none' && explodeFactor === 0} autoRotateSpeed={0.3} />
                            <Environment preset={isDark ? "night" : "sunset"} blur={0.8} />
                            <ContactShadows position={[0, -0.55, 0]} opacity={0.85} scale={100} blur={2.5} far={20} resolution={1024} color={isDark ? "#000000" : "#0f172a"} />
                        </Canvas>
                    </Suspense>
                </div>

                {/* --- FLOATING UI LAYER --- */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: 'none' }}>
                    
                    {/* Top Toolbar */}
                    <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'auto' }}>
                        
                        {/* Project PM Selector */}
                        <GlassPanel isDark={isDark} intensity="high" style={{ padding: '6px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: isDark ? '#fff' : '#000' }}>
                                <AppstoreOutlined style={{ color: themeColor }} />
                                <span style={{ fontSize: 12, fontWeight: 600 }}>PM PROJECT:</span>
                            </div>
                            <Select 
                                defaultValue="proj1" 
                                variant="borderless" 
                                style={{ width: 260 }}
                                options={[
                                    { label: 'Downtown Highrise Tower (Active)', value: 'proj1' },
                                    { label: 'Suburban Office Complex', value: 'proj2' }
                                ]}
                            />
                        </GlassPanel>

                        {/* View Modes Toolbar */}
                        <GlassPanel isDark={isDark} intensity="high" style={{ padding: '6px', borderRadius: 8, display: 'flex', gap: 4 }}>
                            <Button size="small" type={viewMode === 'shaded' ? 'primary' : 'text'} style={{ color: viewMode === 'shaded' ? '#fff' : (isDark ? '#aaa' : '#666') }} onClick={() => setViewMode('shaded')}>Realistic</Button>
                            <Button size="small" type={viewMode === 'monochrome' ? 'primary' : 'text'} style={{ color: viewMode === 'monochrome' ? '#fff' : (isDark ? '#aaa' : '#666') }} onClick={() => setViewMode('monochrome')}>Monochrome</Button>
                            <Button size="small" type={viewMode === 'color-coded' ? 'primary' : 'text'} style={{ color: viewMode === 'color-coded' ? '#fff' : (isDark ? '#aaa' : '#666') }} onClick={() => setViewMode('color-coded')}>Systems</Button>
                            <div style={{ width: 1, background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', margin: '0 4px' }} />
                            <Button size="small" type={viewMode === 'wireframe' ? 'primary' : 'text'} style={{ color: viewMode === 'wireframe' ? '#fff' : (isDark ? '#aaa' : '#666') }} onClick={() => setViewMode('wireframe')}>Wireframe</Button>
                            <Button size="small" type={viewMode === 'ghost' ? 'primary' : 'text'} style={{ color: viewMode === 'ghost' ? '#fff' : (isDark ? '#aaa' : '#666') }} onClick={() => setViewMode('ghost')}>X-Ray</Button>
                        </GlassPanel>
                    </div>

                    {/* Left Panel */}
                    <div style={{ position: 'absolute', top: 70, left: 16, bottom: 16, width: 340, pointerEvents: 'auto' }}>
                        {LeftPanel}
                    </div>

                    {/* Right Panel */}
                    <div style={{ position: 'absolute', top: 70, right: 16, bottom: 16, width: 340, pointerEvents: 'auto' }}>
                        {RightPanel}
                    </div>

                </div>
            </div>
        </CMSLayout>
    );
}
`;

fs.writeFileSync(mockBuildingPath, mockBuildingContent);
fs.writeFileSync(bimViewerPath, bimViewerContent);
console.log('Massive BIM Model and advanced features injected successfully!');
