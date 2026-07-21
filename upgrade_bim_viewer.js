const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'admin/src/app/admin/bim/viewer/BimViewer.tsx');

const newContent = `"use client";

import React, { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Edges, ContactShadows, useCursor, SoftShadows } from "@react-three/drei";
import { EffectComposer, Bloom, SSAO, ToneMapping, SMAA, DepthOfField } from "@react-three/postprocessing";
import * as THREE from "three";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useTheme } from "next-themes";
import { Select, Button, Typography, Spin, Divider, Row, Col, Tabs, Slider, Tooltip, Badge } from "antd";
import { 
    AppstoreOutlined, EyeOutlined, EyeInvisibleOutlined, BuildOutlined, 
    SettingOutlined, FolderOpenOutlined, SelectOutlined, CompressOutlined, 
    ScissorOutlined, ControlOutlined, BlockOutlined, FullscreenExitOutlined,
    FormatPainterOutlined, RightOutlined, VideoCameraOutlined, WarningOutlined
} from "@ant-design/icons";
import { GlassPanel } from "@/components/ui/GlassPanel";
import CADLayout from "@/components/cad/CADLayout";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";

const { Text } = Typography;

// Mock IFC Element Component
function MockIfcWall({ position, scale, color, type, onClick }: any) {
    const [hovered, setHovered] = useState(false);
    useCursor(hovered, 'pointer', 'auto');
    return (
        <mesh 
            position={position} 
            scale={scale} 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
            castShadow
            receiveShadow
        >
            <boxGeometry />
            <meshPhysicalMaterial 
                color={hovered ? '#40a9ff' : color} 
                transparent={type === 'ghost'} 
                opacity={type === 'ghost' ? 0.3 : 0.9} 
                roughness={0.2}
                metalness={0.1}
                clearcoat={0.3}
                wireframe={type === 'wireframe'}
            />
            <Edges scale={1} threshold={15} color={hovered ? "#fff" : (type === 'wireframe' ? '#1890ff' : "#333")} />
        </mesh>
    );
}

function DemoBuildingModel({ onElementClick, viewMode }: { onElementClick: (type: string) => void, viewMode: string }) {
    const isWireframe = viewMode === 'wireframe';
    const isGhost = viewMode === 'ghost';
    const renderType = isWireframe ? 'wireframe' : isGhost ? 'ghost' : 'shaded';

    return (
        <group position={[0, 0, 0]}>
            {/* Foundation */}
            <mesh position={[0, -0.25, 0]} receiveShadow>
                <boxGeometry args={[12, 0.5, 8]} />
                <meshStandardMaterial color="#8c8c8c" roughness={0.9} wireframe={isWireframe} transparent={isGhost} opacity={isGhost ? 0.2 : 1} />
            </mesh>
            
            {/* Floor */}
            <mesh position={[0, 0.05, 0]} receiveShadow>
                <boxGeometry args={[11.8, 0.1, 7.8]} />
                <meshPhysicalMaterial color="#d9d9d9" roughness={0.1} metalness={0.5} clearcoat={1.0} wireframe={isWireframe} transparent={isGhost} opacity={isGhost ? 0.2 : 1} />
            </mesh>

            {/* Walls */}
            <MockIfcWall position={[0, 2, -3.9]} scale={[11.8, 4, 0.2]} color="#f0f0f0" type={renderType} onClick={() => onElementClick('IfcWallStandardCase - North')} />
            <MockIfcWall position={[0, 2, 3.9]} scale={[11.8, 4, 0.2]} color="#f0f0f0" type={renderType} onClick={() => onElementClick('IfcWallStandardCase - South')} />
            <MockIfcWall position={[-5.9, 2, 0]} scale={[0.2, 4, 8]} color="#f0f0f0" type={renderType} onClick={() => onElementClick('IfcWallStandardCase - West')} />
            
            {/* Interior Column */}
            <MockIfcWall position={[0, 2, 0]} scale={[0.5, 4, 0.5]} color="#bfbfbf" type={renderType} onClick={() => onElementClick('IfcColumn - Center')} />
            
            {/* MEP Duct (Mock) */}
            <MockIfcWall position={[0, 3.5, 2]} scale={[10, 0.4, 0.6]} color="#1890ff" type={renderType} onClick={() => onElementClick('IfcDuctSegment - HVAC Supply')} />
        </group>
    );
}

export default function BimViewer() {
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => { setMounted(true); }, []);
    const isDark = mounted && resolvedTheme === "dark";
    
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<string>('shaded'); // shaded, wireframe, ghost

    const leftPanelContent = (
        <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#aaa', marginBottom: 8 }}>Active Model</div>
                <Select defaultValue="mod1" style={{ width: '100%' }} variant="borderless" className="dark-select" options={[{label: 'HQ_Architecture_v3.ifc', value: 'mod1'}]} />
            </div>
            
            <Tabs defaultActiveKey="1" items={[
                {
                    key: '1',
                    label: <span style={{ fontSize: 12, color: '#fff' }}><AppstoreOutlined /> Tree</span>,
                    children: (
                        <div style={{ marginTop: 12 }}>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, color: '#e2e8f0', fontFamily: 'monospace' }}>
                                <li style={{ padding: '6px 8px', cursor: 'pointer', color: themeColor, background: 'rgba(255,255,255,0.05)', borderRadius: 6 }}>[-] IfcProject</li>
                                <ul style={{ listStyle: 'none', paddingLeft: 16, margin: '4px 0' }}>
                                    <li style={{ padding: '6px 8px', cursor: 'pointer', borderRadius: 6, transition: 'background 0.2s' }}>[-] IfcSite</li>
                                    <ul style={{ listStyle: 'none', paddingLeft: 16, margin: '4px 0' }}>
                                        <li style={{ padding: '6px 8px', cursor: 'pointer', borderRadius: 6, transition: 'background 0.2s' }}>[-] IfcBuilding</li>
                                        <ul style={{ listStyle: 'none', paddingLeft: 16, margin: '4px 0' }}>
                                            <li style={{ padding: '6px 8px', cursor: 'pointer', borderRadius: 6, transition: 'background 0.2s' }}>[+] IfcBuildingStorey (L1)</li>
                                            <li style={{ padding: '6px 8px', cursor: 'pointer', borderRadius: 6, transition: 'background 0.2s' }}>[+] IfcBuildingStorey (L2)</li>
                                        </ul>
                                    </ul>
                                </ul>
                            </ul>
                        </div>
                    )
                },
                {
                    key: '2',
                    label: <span style={{ fontSize: 12, color: '#aaa' }}><BlockOutlined /> Layers</span>,
                    children: (
                        <div style={{ marginTop: 12 }}>
                            <Row style={{ marginBottom: 8, color: '#aaa', fontSize: 13, alignItems: 'center' }}><Col span={20}>A-WALL-EXT</Col><Col span={4}><EyeOutlined style={{color: themeColor}}/></Col></Row>
                            <Row style={{ marginBottom: 8, color: '#aaa', fontSize: 13, alignItems: 'center' }}><Col span={20}>A-DOOR-INT</Col><Col span={4}><EyeOutlined style={{color: themeColor}}/></Col></Row>
                            <Row style={{ marginBottom: 8, color: '#aaa', fontSize: 13, alignItems: 'center' }}><Col span={20}>M-HVAC-DUCT</Col><Col span={4}><EyeInvisibleOutlined /></Col></Row>
                            <Row style={{ marginBottom: 8, color: '#aaa', fontSize: 13, alignItems: 'center' }}><Col span={20}>S-COLS-MAIN</Col><Col span={4}><EyeOutlined style={{color: themeColor}}/></Col></Row>
                        </div>
                    )
                },
                {
                    key: '3',
                    label: <span style={{ fontSize: 12, color: '#aaa' }}><WarningOutlined /> Issues</span>,
                    children: (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ background: 'rgba(255,50,50,0.1)', borderLeft: '3px solid #ff4d4f', padding: '8px 12px', borderRadius: 4, marginBottom: 8 }}>
                                <Text strong style={{ color: '#fff', fontSize: 12 }}>Clash: HVAC vs Structural Beam</Text>
                                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Level 2 • Priority: High</div>
                            </div>
                            <div style={{ background: 'rgba(250,173,20,0.1)', borderLeft: '3px solid #faad14', padding: '8px 12px', borderRadius: 4, marginBottom: 8 }}>
                                <Text strong style={{ color: '#fff', fontSize: 12 }}>Warning: Missing Material Info</Text>
                                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Level 1 • Priority: Medium</div>
                            </div>
                        </div>
                    )
                }
            ]} />
        </div>
    );

    const rightPanelContent = selectedElement ? (
        <div style={{ padding: '24px', height: '100%', overflowY: 'auto', color: '#e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#aaa', marginBottom: 8 }}>Selected Element</div>
            <Text strong style={{ display: 'block', fontSize: 16, marginBottom: 16, color: themeColor }}>{selectedElement}</Text>
            
            <Row gutter={8} style={{ marginBottom: 24 }}>
                <Col span={12}><Button block size="small" type="primary" ghost>Focus</Button></Col>
                <Col span={12}><Button block size="small" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}>Isolate</Button></Col>
            </Row>
            
            <div style={{ fontWeight: 600, background: 'rgba(255,255,255,0.05)', padding: '6px 12px', marginBottom: 12, borderRadius: 6, borderLeft: \`3px solid \${themeColor}\` }}>Identity Data</div>
            <Row style={{ marginBottom: 12, fontSize: 13 }}><Col span={10}><Text type="secondary" style={{ color: '#aaa' }}>GlobalId:</Text></Col><Col span={14}>1c$MkV...</Col></Row>
            <Row style={{ marginBottom: 12, fontSize: 13 }}><Col span={10}><Text type="secondary" style={{ color: '#aaa' }}>Name:</Text></Col><Col span={14}>Basic Wall</Col></Row>
            <Row style={{ marginBottom: 12, fontSize: 13 }}><Col span={10}><Text type="secondary" style={{ color: '#aaa' }}>IfcType:</Text></Col><Col span={14}>IfcWallStandardCase</Col></Row>
            
            <div style={{ fontWeight: 600, background: 'rgba(255,255,255,0.05)', padding: '6px 12px', margin: '24px 0 12px 0', borderRadius: 6, borderLeft: \`3px solid \${themeColor}\` }}>Dimensions</div>
            <Row style={{ marginBottom: 12, fontSize: 13 }}><Col span={10}><Text type="secondary" style={{ color: '#aaa' }}>Length:</Text></Col><Col span={14}>11800 mm</Col></Row>
            <Row style={{ marginBottom: 12, fontSize: 13 }}><Col span={10}><Text type="secondary" style={{ color: '#aaa' }}>Volume:</Text></Col><Col span={14}>9.44 m³</Col></Row>
            <Row style={{ marginBottom: 12, fontSize: 13 }}><Col span={10}><Text type="secondary" style={{ color: '#aaa' }}>Area:</Text></Col><Col span={14}>47.2 m²</Col></Row>

            <div style={{ fontWeight: 600, background: 'rgba(255,255,255,0.05)', padding: '6px 12px', margin: '24px 0 12px 0', borderRadius: 6, borderLeft: \`3px solid \${themeColor}\` }}>Materials & Finishes</div>
            <Row style={{ marginBottom: 12, fontSize: 13 }}><Col span={10}><Text type="secondary" style={{ color: '#aaa' }}>Material:</Text></Col><Col span={14}>Concrete - Cast in Situ</Col></Row>
            <Row style={{ marginBottom: 12, fontSize: 13 }}><Col span={10}><Text type="secondary" style={{ color: '#aaa' }}>Paint:</Text></Col><Col span={14}>White Satin Finish</Col></Row>
        </div>
    ) : (
        <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
            <AppstoreOutlined style={{ fontSize: 32, marginBottom: 16 }} />
            <div style={{ textAlign: 'center' }}>Select an element<br/>to view properties</div>
        </div>
    );

    const headerContent = (
        <>
            <Tooltip title="Open IFC Model"><Button icon={<FolderOpenOutlined />} type="text" style={{ color: '#fff' }} /></Tooltip>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
            
            <Tooltip title="Select (S)"><Button icon={<SelectOutlined />} type={viewMode === 'shaded' ? 'primary' : 'text'} style={{ color: viewMode === 'shaded' ? '#fff' : '#aaa' }} onClick={() => setViewMode('shaded')} /></Tooltip>
            <Tooltip title="Measure Distance (M)"><Button icon={<CompressOutlined />} type="text" style={{ color: '#fff' }} /></Tooltip>
            <Tooltip title="Section Box (C)"><Button icon={<ScissorOutlined />} type="text" style={{ color: '#fff' }} /></Tooltip>
            <Tooltip title="Explode View"><Button icon={<FullscreenExitOutlined />} type="text" style={{ color: '#fff' }} /></Tooltip>
            
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
            
            <Tooltip title="Wireframe Mode"><Button icon={<BorderOutlined />} type={viewMode === 'wireframe' ? 'primary' : 'text'} style={{ color: viewMode === 'wireframe' ? '#fff' : '#aaa' }} onClick={() => setViewMode('wireframe')} /></Tooltip>
            <Tooltip title="X-Ray Mode"><Button icon={<FormatPainterOutlined />} type={viewMode === 'ghost' ? 'primary' : 'text'} style={{ color: viewMode === 'ghost' ? '#fff' : '#aaa' }} onClick={() => setViewMode('ghost')} /></Tooltip>
            
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
            <Tooltip title="Settings"><Button icon={<SettingOutlined />} type="text" style={{ color: '#fff' }} /></Tooltip>
        </>
    );

    const bottomContent = (
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 16 }}>
            <Text style={{ color: '#aaa', fontSize: 11, width: 80 }}>4D TIMELINE</Text>
            <Button icon={<RightOutlined />} size="small" type="primary" shape="circle" />
            <Slider defaultValue={100} style={{ flex: 1, margin: '0 16px' }} />
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>Day 142 / 142</Text>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
            <Text style={{ color: '#888', fontSize: 11 }}>X: 12.0 Y: 4.5 Z: -3.2</Text>
        </div>
    );

    return (
        <CMSLayout 
            title={<AuroraText>Web IFC Viewer</AuroraText>}
            subTitle={<DecryptedText text="Advanced BIM Editor & 4D Simulation" speed={60} />}
        >
            <div style={{ position: 'relative', height: 'calc(100vh - 180px)', minHeight: 600, width: '100%', borderRadius: 16, overflow: 'hidden' }}>
                <CADLayout
                    unrealMode={true}
                    header={headerContent}
                    leftPanel={leftPanelContent}
                    rightPanel={rightPanelContent}
                    bottomPanel={bottomContent}
                >
                    <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>}>
                        <Canvas 
                            camera={{ position: [15, 10, 15], fov: 45 }} 
                            shadows
                            gl={{ antialias: false, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
                        >
                            {/* Cinematic Soft Shadows */}
                            <SoftShadows size={15} samples={16} focus={0.5} />
                            <ambientLight intensity={0.4} />
                            <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
                            <directionalLight position={[-10, 10, -10]} intensity={0.5} />
                            
                            <Grid args={[100, 100]} sectionSize={1} sectionColor={'#444'} cellColor={'#222'} position={[0, -0.3, 0]} fadeDistance={50} />
                            
                            <DemoBuildingModel onElementClick={(type) => setSelectedElement(type)} viewMode={viewMode} />
                            
                            <EffectComposer multisampling={0}>
                                <SMAA />
                                <SSAO samples={21} radius={0.15} intensity={15} luminanceInfluence={0.6} />
                                <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={1.2} />
                                <DepthOfField focusDistance={0.05} focalLength={0.15} bokehScale={4} />
                                <ToneMapping />
                            </EffectComposer>

                            <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} autoRotate autoRotateSpeed={0.5} />
                            <Environment preset="night" blur={0.8} />
                            <ContactShadows position={[0, -0.29, 0]} opacity={0.85} scale={80} blur={2.5} far={15} resolution={1024} color="#000000" />
                        </Canvas>
                    </Suspense>
                </CADLayout>
            </div>
        </CMSLayout>
    );
}
`;

fs.writeFileSync(filePath, newContent);
console.log('BimViewer upgraded successfully');
