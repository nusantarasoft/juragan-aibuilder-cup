const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'admin/src/app/admin/bim/viewer/BimViewer.tsx');

const newContent = `"use client";

import React, { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Edges, ContactShadows, useCursor, SoftShadows, Cylinder } from "@react-three/drei";
import { EffectComposer, Bloom, SSAO, ToneMapping, SMAA, DepthOfField } from "@react-three/postprocessing";
import * as THREE from "three";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useTheme } from "next-themes";
import { Select, Button, Typography, Spin, Divider, Row, Col, Tabs, Progress, Slider, Switch, Badge, Tag } from "antd";
import { 
    AppstoreOutlined, FireOutlined, ExperimentOutlined, NodeIndexOutlined, 
    ApiOutlined, EnvironmentOutlined, BarChartOutlined, ThunderboltOutlined,
    CloudOutlined, ControlOutlined, SunOutlined, ProjectOutlined
} from "@ant-design/icons";
import { GlassPanel } from "@/components/ui/GlassPanel";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";

const { Text, Title } = Typography;

// --- MOCK MEP & ARCHITECTURE COMPONENTS ---
function GenericBimElement({ geometry, position, scale, rotation, color, type, onClick, name }: any) {
    const [hovered, setHovered] = useState(false);
    useCursor(hovered, 'pointer', 'auto');
    const isWireframe = type === 'wireframe';
    const isGhost = type === 'ghost';
    
    return (
        <mesh 
            geometry={geometry}
            position={position} 
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
            />
            <Edges scale={1} threshold={15} color={hovered ? "#fff" : (isWireframe ? color : "#222")} />
        </mesh>
    );
}

function ComplexMEPBuilding({ onElementClick, viewMode, activeSystems }: { onElementClick: (name: string) => void, viewMode: string, activeSystems: any }) {
    const renderType = viewMode; // 'shaded', 'wireframe', 'ghost'

    const archColor = "#e2e8f0";
    const hvacColor = "#3b82f6"; // Blue
    const elecColor = "#eab308"; // Yellow
    const plumbColor = "#22c55e"; // Green

    return (
        <group position={[0, 0, 0]}>
            {/* Foundation / Site */}
            {activeSystems.arch && (
                <group>
                    <mesh position={[0, -0.25, 0]} receiveShadow>
                        <boxGeometry args={[20, 0.5, 14]} />
                        <meshStandardMaterial color="#8c8c8c" roughness={0.9} wireframe={viewMode === 'wireframe'} />
                    </mesh>
                    
                    {/* Floors */}
                    <GenericBimElement position={[0, 0.05, 0]} scale={[18, 0.2, 12]} color="#cbd5e1" type={renderType} onClick={onElementClick} name="Architectural / Floor L1" />
                    <GenericBimElement position={[0, 4.05, 0]} scale={[18, 0.2, 12]} color="#cbd5e1" type={renderType} onClick={onElementClick} name="Architectural / Floor L2" />
                    <GenericBimElement position={[0, 8.05, 0]} scale={[18, 0.2, 12]} color="#cbd5e1" type={renderType} onClick={onElementClick} name="Architectural / Roof Level" />

                    {/* Columns */}
                    {[-8, -4, 0, 4, 8].map((x) => 
                        [-5, 0, 5].map((z) => (
                            <React.Fragment key={\`col-\${x}-\${z}\`}>
                                <GenericBimElement position={[x, 2.05, z]} scale={[0.6, 3.8, 0.6]} color="#94a3b8" type={renderType} onClick={onElementClick} name={\`Architectural / Column L1-\${x}-\${z}\`} />
                                <GenericBimElement position={[x, 6.05, z]} scale={[0.5, 3.8, 0.5]} color="#94a3b8" type={renderType} onClick={onElementClick} name={\`Architectural / Column L2-\${x}-\${z}\`} />
                            </React.Fragment>
                        ))
                    )}
                    
                    {/* Walls (Partial exterior) */}
                    <GenericBimElement position={[0, 2.05, -5.9]} scale={[18, 4, 0.2]} color={archColor} type={renderType} onClick={onElementClick} name="Architectural / Ext Wall North L1" />
                    <GenericBimElement position={[0, 6.05, -5.9]} scale={[18, 4, 0.2]} color={archColor} type={renderType} onClick={onElementClick} name="Architectural / Ext Wall North L2" />
                </group>
            )}

            {/* Mechanical (HVAC) */}
            {activeSystems.mech && (
                <group>
                    {/* Main AHU on Roof */}
                    <GenericBimElement position={[4, 9, -2]} scale={[3, 1.8, 2]} color={hvacColor} type={renderType} onClick={onElementClick} name="Mechanical / AHU-Roof-01" />
                    <GenericBimElement position={[-4, 9, 2]} scale={[2.5, 1.5, 2]} color={hvacColor} type={renderType} onClick={onElementClick} name="Mechanical / AHU-Roof-02" />
                    
                    {/* Main Vertical Duct Shaft */}
                    <GenericBimElement position={[8, 4, -4]} scale={[1.2, 10, 1.2]} color={hvacColor} type={renderType} onClick={onElementClick} name="Mechanical / Main Vertical Duct" />
                    
                    {/* L1 Ceiling Ducts */}
                    <GenericBimElement position={[0, 3.6, -4]} scale={[16, 0.6, 0.8]} color={hvacColor} type={renderType} onClick={onElementClick} name="Mechanical / L1 Primary Duct Supply" />
                    <GenericBimElement position={[-3, 3.6, -1]} scale={[0.6, 0.5, 5]} color={hvacColor} type={renderType} onClick={onElementClick} name="Mechanical / L1 Branch Duct A" />
                    <GenericBimElement position={[3, 3.6, -1]} scale={[0.6, 0.5, 5]} color={hvacColor} type={renderType} onClick={onElementClick} name="Mechanical / L1 Branch Duct B" />
                    
                    {/* L2 Ceiling Ducts */}
                    <GenericBimElement position={[0, 7.6, -4]} scale={[16, 0.6, 0.8]} color={hvacColor} type={renderType} onClick={onElementClick} name="Mechanical / L2 Primary Duct Supply" />
                </group>
            )}

            {/* Electrical */}
            {activeSystems.elec && (
                <group>
                    {/* Main Switchboard */}
                    <GenericBimElement position={[-7, 1.5, 4.5]} scale={[2, 2.5, 0.6]} color={elecColor} type={renderType} onClick={onElementClick} name="Electrical / Main Distribution Board" />
                    
                    {/* Cable Trays L1 */}
                    <GenericBimElement position={[0, 3.4, 4.5]} scale={[14, 0.1, 0.6]} color={elecColor} type={renderType} onClick={onElementClick} name="Electrical / L1 Cable Tray Main" />
                    <GenericBimElement position={[0, 3.4, 0]} scale={[14, 0.1, 0.6]} color={elecColor} type={renderType} onClick={onElementClick} name="Electrical / L1 Cable Tray Sec" />
                    
                    {/* Lighting Fixtures (Mocked as small boxes) */}
                    {[-6, -2, 2, 6].map((x) => 
                        [-3, 0, 3].map((z) => (
                            <GenericBimElement key={\`light-\${x}-\${z}\`} position={[x, 3.8, z]} scale={[1.2, 0.1, 0.4]} color="#fff" type={renderType} onClick={onElementClick} name={\`Electrical / Lighting L1-\${x}-\${z}\`} />
                        ))
                    )}
                </group>
            )}

            {/* Plumbing / Piping */}
            {activeSystems.plumb && (
                <group>
                    {/* Water Tank */}
                    <mesh position={[7, 9.5, 4]} onClick={(e) => { e.stopPropagation(); onElementClick("Plumbing / Roof Water Tank"); }} castShadow>
                        <cylinderGeometry args={[1.5, 1.5, 2.5, 32]} />
                        <meshPhysicalMaterial color={plumbColor} transparent={viewMode==='ghost'} opacity={viewMode==='ghost'?0.3:0.9} roughness={0.3} wireframe={viewMode==='wireframe'} />
                    </mesh>
                    
                    {/* Main Vertical Pipes */}
                    <mesh position={[7, 4, 4]} onClick={(e) => { e.stopPropagation(); onElementClick("Plumbing / Main Vertical Pipe"); }} castShadow>
                        <cylinderGeometry args={[0.2, 0.2, 8, 16]} />
                        <meshPhysicalMaterial color={plumbColor} transparent={viewMode==='ghost'} opacity={viewMode==='ghost'?0.3:0.9} roughness={0.3} wireframe={viewMode==='wireframe'} />
                    </mesh>

                    {/* Horizontal Pipes L1 */}
                    <mesh position={[0, 3.2, 4]} rotation={[0, 0, Math.PI/2]} onClick={(e) => { e.stopPropagation(); onElementClick("Plumbing / L1 Distribution Pipe"); }} castShadow>
                        <cylinderGeometry args={[0.15, 0.15, 14, 16]} />
                        <meshPhysicalMaterial color={plumbColor} transparent={viewMode==='ghost'} opacity={viewMode==='ghost'?0.3:0.9} roughness={0.3} wireframe={viewMode==='wireframe'} />
                    </mesh>
                </group>
            )}
        </group>
    );
}

export default function BimViewer() {
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => { setMounted(true); }, []);
    const isDark = mounted && resolvedTheme === "dark";
    
    // State
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<string>('shaded'); // shaded, wireframe, ghost
    const [activeSystems, setActiveSystems] = useState({ arch: true, mech: true, elec: true, plumb: true });
    
    const [activeAnalysis, setActiveAnalysis] = useState<string>('none'); // none, sun, wind, noise

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
                        { label: <span><CloudOutlined /> Wind Flow Simulation</span>, value: 'wind' },
                        { label: <span><ApiOutlined /> Noise / Acoustics</span>, value: 'noise' }
                    ]} 
                />
            </div>
            
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: isDark ? '#aaa' : '#666', marginBottom: 16 }}>MEP Systems Filter</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Row align="middle" justify="space-between">
                        <Col><Badge color="#e2e8f0" text={<span style={{color: isDark?'#e2e8f0':'#333'}}>Architectural</span>} /></Col>
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

                <Divider style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                
                {activeAnalysis === 'sun' && (
                    <div className="fade-in">
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: isDark ? '#aaa' : '#666', marginBottom: 12 }}>Sun Parameters</div>
                        <Text style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Time of Day: 14:00 PM</Text>
                        <Slider defaultValue={60} />
                        <Text style={{ fontSize: 12, display: 'block', marginBottom: 4, marginTop: 12 }}>Time of Year: June 21</Text>
                        <Slider defaultValue={50} />
                    </div>
                )}
            </div>
        </GlassPanel>
    );

    const RightPanel = (
        <GlassPanel isDark={isDark} intensity="high" style={{ height: '100%', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: \`1px solid \${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}\` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: isDark ? '#aaa' : '#666', marginBottom: 8 }}>Performance Metrics</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Tag color="green">LEED Eligible</Tag>
                    <Tag color="blue">Class A Building</Tag>
                </div>
            </div>

            <div style={{ padding: '20px', flex: 1, overflowY: 'auto', color: isDark ? '#e2e8f0' : '#333' }}>
                {!selectedElement ? (
                    <>
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <div style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', padding: 12, borderRadius: 8 }}>
                                    <div style={{ fontSize: 11, color: isDark ? '#aaa' : '#666' }}>Gross Floor Area</div>
                                    <div style={{ fontSize: 18, fontWeight: 600, color: themeColor }}>2,450 <span style={{fontSize: 12}}>m²</span></div>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', padding: 12, borderRadius: 8 }}>
                                    <div style={{ fontSize: 11, color: isDark ? '#aaa' : '#666' }}>Energy Target</div>
                                    <div style={{ fontSize: 18, fontWeight: 600, color: '#52c41a' }}>120 <span style={{fontSize: 12}}>kWh/m²</span></div>
                                </div>
                            </Col>
                        </Row>

                        <div style={{ marginTop: 24 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Daylight Potential (Spatial Autonomy)</div>
                            <Progress percent={76} strokeColor={themeColor} status="active" />
                            <div style={{ fontSize: 11, color: isDark ? '#aaa' : '#666', marginTop: 4 }}>76% of floors receive adequate daylight.</div>
                        </div>

                        <div style={{ marginTop: 24 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Operational Carbon Estimate</div>
                            <Progress percent={45} strokeColor="#faad14" showInfo={false} />
                            <div style={{ fontSize: 11, color: isDark ? '#aaa' : '#666', marginTop: 4 }}>45 kgCO2e/m2/yr</div>
                        </div>
                    </>
                ) : (
                    <div className="fade-in">
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: isDark ? '#aaa' : '#666', marginBottom: 8 }}>Selected Element</div>
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
            title={<AuroraText>Conceptual BIM & Forma Analysis</AuroraText>}
            subTitle={<DecryptedText text="Site Context, MEP Systems, and Performance Metrics" speed={60} />}
        >
            <div style={{ position: 'relative', height: 'calc(100vh - 160px)', minHeight: 600, width: '100%', borderRadius: 16, overflow: 'hidden', background: isDark ? '#050505' : '#e5e5e5' }}>
                
                {/* --- 3D CANVAS --- */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
                    <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>}>
                        <Canvas 
                            camera={{ position: [25, 20, 25], fov: 45 }} 
                            shadows
                            gl={{ antialias: false, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
                        >
                            <SoftShadows size={15} samples={16} focus={0.5} />
                            
                            {/* Dynamic Lighting based on Analysis Mode */}
                            {activeAnalysis === 'sun' ? (
                                <>
                                    <ambientLight intensity={0.2} />
                                    <directionalLight position={[20, 30, -10]} intensity={2.5} castShadow shadow-mapSize={[4096, 4096]} shadow-bias={-0.0001}>
                                        <orthographicCamera attach="shadow-camera" args={[-30, 30, 30, -30, 0.1, 100]} />
                                    </directionalLight>
                                </>
                            ) : (
                                <>
                                    <ambientLight intensity={isDark ? 0.4 : 0.7} />
                                    <directionalLight position={[10, 20, 10]} intensity={isDark ? 1.5 : 1.0} castShadow shadow-mapSize={[2048, 2048]} />
                                    <directionalLight position={[-10, 10, -10]} intensity={0.5} />
                                </>
                            )}
                            
                            <Grid args={[100, 100]} sectionSize={1} sectionColor={isDark ? '#444' : '#ccc'} cellColor={isDark ? '#222' : '#eee'} position={[0, -0.26, 0]} fadeDistance={50} />
                            
                            <ComplexMEPBuilding onElementClick={(type) => setSelectedElement(type)} viewMode={viewMode} activeSystems={activeSystems} />
                            
                            <EffectComposer multisampling={0}>
                                <SMAA />
                                <SSAO samples={21} radius={0.15} intensity={15} luminanceInfluence={0.6} />
                                <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={1.2} />
                                <DepthOfField focusDistance={0.05} focalLength={0.15} bokehScale={4} />
                                <ToneMapping />
                            </EffectComposer>

                            <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} autoRotate={activeAnalysis === 'none'} autoRotateSpeed={0.5} />
                            <Environment preset={isDark ? "night" : "sunset"} blur={0.8} />
                            <ContactShadows position={[0, -0.29, 0]} opacity={0.85} scale={80} blur={2.5} far={15} resolution={1024} color={isDark ? "#000000" : "#0f172a"} />
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
                                style={{ width: 220 }}
                                options={[
                                    { label: 'HQ Commercial Highrise (Active)', value: 'proj1' },
                                    { label: 'Downtown Residential Complex', value: 'proj2' }
                                ]}
                            />
                        </GlassPanel>

                        {/* View Modes Toolbar */}
                        <GlassPanel isDark={isDark} intensity="high" style={{ padding: '6px', borderRadius: 8, display: 'flex', gap: 4 }}>
                            <Button size="small" type={viewMode === 'shaded' ? 'primary' : 'text'} style={{ color: viewMode === 'shaded' ? '#fff' : (isDark ? '#aaa' : '#666') }} onClick={() => setViewMode('shaded')}>Shaded</Button>
                            <Button size="small" type={viewMode === 'wireframe' ? 'primary' : 'text'} style={{ color: viewMode === 'wireframe' ? '#fff' : (isDark ? '#aaa' : '#666') }} onClick={() => setViewMode('wireframe')}>Wireframe</Button>
                            <Button size="small" type={viewMode === 'ghost' ? 'primary' : 'text'} style={{ color: viewMode === 'ghost' ? '#fff' : (isDark ? '#aaa' : '#666') }} onClick={() => setViewMode('ghost')}>X-Ray</Button>
                        </GlassPanel>
                    </div>

                    {/* Left Panel */}
                    <div style={{ position: 'absolute', top: 70, left: 16, bottom: 16, width: 320, pointerEvents: 'auto' }}>
                        {LeftPanel}
                    </div>

                    {/* Right Panel */}
                    <div style={{ position: 'absolute', top: 70, right: 16, bottom: 16, width: 320, pointerEvents: 'auto' }}>
                        {RightPanel}
                    </div>

                </div>
            </div>
        </CMSLayout>
    );
}
`;

fs.writeFileSync(filePath, newContent);
console.log('BimViewer successfully updated for Forma and MEP');
