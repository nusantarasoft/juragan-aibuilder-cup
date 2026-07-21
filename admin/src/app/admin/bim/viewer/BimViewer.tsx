"use client";

import React, { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, SoftShadows, ContactShadows, Line, Html } from "@react-three/drei";
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
    const [measureMode, setMeasureMode] = useState<boolean>(false);
    const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);

    const handleElementClick = (name: string, e: any) => {
        if (measureMode) {
            if (measurePoints.length >= 2) {
                setMeasurePoints([e.point]);
            } else {
                setMeasurePoints([...measurePoints, e.point]);
            }
        } else {
            setSelectedElement(name);
        }
    };

    // Calculate distance
    const distance = measurePoints.length === 2 ? measurePoints[0].distanceTo(measurePoints[1]).toFixed(2) : null;

    // Calculate Costs mock
    const costArch = activeSystems.arch ? 15000000 : 0;
    const costMech = activeSystems.mech ? 4500000 : 0;
    const costElec = activeSystems.elec ? 3200000 : 0;
    const costPlumb = activeSystems.plumb ? 2100000 : 0;
    const totalCost = costArch + costMech + costElec + costPlumb;

    // Mock UI Content
    const LeftPanel = (
        <GlassPanel isDark={isDark} intensity="high" style={{ height: '100%', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
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
                    <Slider min={-2} max={30} step={0.1} value={clipY} onChange={setClipY} tooltip={{ formatter: val => `Height: ${val}m` }} />
                </div>

                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 12 }}><ExpandOutlined /> Explode Assembly</Text>
                        <Text style={{ fontSize: 12, color: themeColor }}>{explodeFactor.toFixed(1)}x</Text>
                    </div>
                    <Slider min={0} max={10} step={0.1} value={explodeFactor} onChange={setExplodeFactor} />
                </div>

                <Divider style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', margin: '16px 0' }} />

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: isDark ? '#aaa' : '#666', marginBottom: 16 }}>BIM Tools</div>
                <div style={{ marginBottom: 16 }}>
                    <Row align="middle" justify="space-between">
                        <Col><Text style={{ fontSize: 12 }}><ExperimentOutlined /> Measurement Mode</Text></Col>
                        <Col><Switch size="small" checked={measureMode} onChange={setMeasureMode} /></Col>
                    </Row>
                    {measureMode && (
                        <div style={{ marginTop: 8, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 8 }}>
                            <div style={{ fontSize: 11, color: isDark ? '#aaa' : '#666', marginBottom: 8 }}>
                                {measurePoints.length === 0 && 'Click first point'}
                                {measurePoints.length === 1 && 'Click second point'}
                                {measurePoints.length === 2 && 'Measurement complete'}
                            </div>
                            {distance && <div style={{ fontSize: 18, fontWeight: 600, color: themeColor }}>{distance} m</div>}
                            <Button size="small" type="primary" ghost block style={{ marginTop: 8 }} onClick={() => setMeasurePoints([])}>Clear Points</Button>
                        </div>
                    )}
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
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
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
                                    <div style={{ fontSize: 17, fontWeight: 600, color: '#52c41a' }}>${(totalCost / 1000000).toFixed(1)}M</div>
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
                        
                        <div style={{ fontWeight: 600, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', padding: '6px 12px', marginBottom: 12, borderRadius: 6, borderLeft: `3px solid ${themeColor}` }}>BIM Metadata</div>
                        <Row style={{ marginBottom: 12, fontSize: 13 }}><Col span={10}><Text type="secondary">System:</Text></Col><Col span={14}>{selectedElement.split(' / ')[0]}</Col></Row>
                        <Row style={{ marginBottom: 12, fontSize: 13 }}><Col span={10}><Text type="secondary">Component:</Text></Col><Col span={14}>{selectedElement.split(' / ')[1]}</Col></Row>
                        
                        <div style={{ fontWeight: 600, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', padding: '6px 12px', margin: '24px 0 12px 0', borderRadius: 6, borderLeft: `3px solid ${themeColor}` }}>Maintenance & Lifecycle</div>
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
                            
                            {/* Measurement Line */}
                            {measurePoints.length > 0 && (
                                <group>
                                    {measurePoints.map((p, i) => (
                                        <mesh key={i} position={p}>
                                            <sphereGeometry args={[0.2, 16, 16]} />
                                            <meshBasicMaterial color={themeColor} />
                                        </mesh>
                                    ))}
                                    {measurePoints.length === 2 && (
                                        <>
                                            <Line points={[measurePoints[0], measurePoints[1]]} color={themeColor} lineWidth={3} dashed dashScale={2} />
                                            <Html position={measurePoints[0].clone().lerp(measurePoints[1], 0.5)}>
                                                <div style={{ background: themeColor, color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 12, fontWeight: 600, transform: 'translate3d(-50%, -50%, 0)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                                                    {distance} m
                                                </div>
                                            </Html>
                                        </>
                                    )}
                                </group>
                            )}

                            {/* Massive Building Model */}
                            <MockBuildingModel 
                                onElementClick={handleElementClick} 
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
                            <Button size="small" type={viewMode === 'performance' ? 'primary' : 'text'} style={{ color: viewMode === 'performance' ? '#fff' : (isDark ? '#aaa' : '#666') }} onClick={() => setViewMode('performance')}>Performance (Heatmap)</Button>
                            <div style={{ width: 1, background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', margin: '0 4px' }} />
                            <Button size="small" type={viewMode === 'monochrome' ? 'primary' : 'text'} style={{ color: viewMode === 'monochrome' ? '#fff' : (isDark ? '#aaa' : '#666') }} onClick={() => setViewMode('monochrome')}>Monochrome</Button>
                            <Button size="small" type={viewMode === 'color-coded' ? 'primary' : 'text'} style={{ color: viewMode === 'color-coded' ? '#fff' : (isDark ? '#aaa' : '#666') }} onClick={() => setViewMode('color-coded')}>Systems</Button>
                            <div style={{ width: 1, background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', margin: '0 4px' }} />
                            <Button size="small" type={viewMode === 'flat' ? 'primary' : 'text'} style={{ color: viewMode === 'flat' ? '#fff' : (isDark ? '#aaa' : '#666') }} onClick={() => setViewMode('flat')}>Flat Color</Button>
                            <Button size="small" type={viewMode === 'hidden-line' ? 'primary' : 'text'} style={{ color: viewMode === 'hidden-line' ? '#fff' : (isDark ? '#aaa' : '#666') }} onClick={() => setViewMode('hidden-line')}>Hidden Line</Button>
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
