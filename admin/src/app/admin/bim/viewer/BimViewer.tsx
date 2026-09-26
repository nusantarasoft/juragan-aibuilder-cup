"use client";

import React, { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, SoftShadows, ContactShadows, Line, Html, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, Bloom, SSAO, ToneMapping, SMAA, DepthOfField } from "@react-three/postprocessing";
import * as THREE from "three";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useTheme } from "next-themes";
import { Select, Button, Typography, Spin, Divider, Row, Col, Progress, Slider, Switch, Badge, Tag, Space, Tree, Collapse, Menu, Dropdown } from "antd";
import { 
    AppstoreOutlined, FireOutlined, ExperimentOutlined, NodeIndexOutlined, 
    ApiOutlined, EnvironmentOutlined, BarChartOutlined, ThunderboltOutlined,
    CloudOutlined, ControlOutlined, SunOutlined, ProjectOutlined,
    ScissorOutlined, CompressOutlined, ExpandOutlined,
    FolderOpenOutlined, BorderOutlined, BuildOutlined, SettingOutlined,
    ToolOutlined, EditOutlined, FontSizeOutlined, EyeOutlined, SearchOutlined,
    MenuOutlined, FormatPainterOutlined, GatewayOutlined, CompassOutlined,
    UserOutlined, CloseOutlined, LineChartOutlined
} from "@ant-design/icons";

// Import massive building model
import CMSLayout from "@/components/layout/CMSLayout";
import { MockBuildingModel } from "./MockBuildingModel";

const { Text, Title } = Typography;

const GET_PROJECTS = `
  query GetProjects($tenantId: String!) {
    pmProjects(tenantId: $tenantId) { id name projectNumber status }
  }
`;

export default function BimViewer() {
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => { setMounted(true); }, []);
    
    // State
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<string>('shaded'); // shaded, monochrome, color-coded, wireframe, ghost, performance, flat, hidden-line
    const [activeSystems, setActiveSystems] = useState({ arch: true, mech: true, elec: true, plumb: true });
    
    const [activeAnalysis, setActiveAnalysis] = useState<string>('none'); 
    
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [is2DMode, setIs2DMode] = useState<boolean>(false);
    const [activeTool, setActiveTool] = useState<string>('select');
    const [userElements, setUserElements] = useState<any[]>([]);

    useEffect(() => { 
        setMounted(true); 
        (async () => {
            try {
                const data = await gql<{ pmProjects: any[] }>(GET_PROJECTS, { tenantId: DEFAULT_TENANT_ID });
                if (data && data.pmProjects) {
                    setProjects(data.pmProjects);
                    if (data.pmProjects.length > 0) setSelectedProjectId(data.pmProjects[0].id);
                }
            } catch (e) {
                console.error("Failed to load PM Projects", e);
            }
        })();
    }, []);
    
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

    if (!mounted) return null;
    const isDark = resolvedTheme === "dark";

    // Colors for the CAD IDE Theme
    const bgColor = isDark ? "#141414" : "#f0f2f5";
    const panelBg = isDark ? "#1e1e1e" : "#ffffff";
    const headerBg = isDark ? "#1f1f1f" : "#fafafa";
    const borderColor = isDark ? "#333" : "#d9d9d9";
    const textColor = isDark ? "#e2e8f0" : "#333";
    const textMuted = isDark ? "#8b949e" : "#888";

    // Ribbon Data
    const ribbonGroups = [
        {
            title: "Creation",
            items: [
                { icon: <BorderOutlined />, label: "Wall", active: activeTool === 'wall', onClick: () => setActiveTool('wall') },
                { icon: <GatewayOutlined />, label: "Door", active: activeTool === 'door', onClick: () => setActiveTool('door') },
                { icon: <BuildOutlined />, label: "Window", active: activeTool === 'window', onClick: () => setActiveTool('window') },
                { icon: <ControlOutlined />, label: "Equipment", active: activeTool === 'equipment', onClick: () => setActiveTool('equipment') },
            ]
        },
        {
            title: "Tools",
            items: [
                { icon: <FormatPainterOutlined />, label: "Material" },
                { icon: <ScissorOutlined />, label: "Section" },
                { icon: <ExperimentOutlined />, label: "Measure", active: measureMode, onClick: () => { setMeasureMode(!measureMode); setActiveTool('select'); } },
            ]
        },
        {
            title: "View",
            items: [
                { icon: <BorderOutlined />, label: "2D Plan", active: is2DMode, onClick: () => { setIs2DMode(true); setClipY(3.5); } },
                { icon: <BuildOutlined />, label: "3D Mode", active: !is2DMode, onClick: () => { setIs2DMode(false); setClipY(30); } },
            ]
        },
        {
            title: "Analysis",
            items: [
                { icon: <ThunderboltOutlined />, label: "Energy" },
                { icon: <LineChartOutlined />, label: "Structure" },
            ]
        }
    ];

    // Tree Data for Project Browser
    const treeData = [
        {
            title: 'Views',
            key: 'views',
            children: [
                { title: 'Floor Plans', key: 'views-floor' },
                { title: '3D Views', key: 'views-3d', children: [{ title: 'Main 3D View', key: 'views-3d-main' }] },
                { title: 'Elevations', key: 'views-elevations' },
            ],
        },
        {
            title: 'Families',
            key: 'families',
            children: [
                { title: 'Architectural', key: 'fam-arch' },
                { title: 'Mechanical', key: 'fam-mech' },
                { title: 'Electrical', key: 'fam-elec' },
                { title: 'Plumbing', key: 'fam-plumb' },
            ],
        },
        {
            title: 'Schedules',
            key: 'schedules',
        },
    ];

    // Main App Container (Takes over the entire screen below any global layout, or fills available space)
    return (
        <CMSLayout title="BIM Web IFC Viewer">
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', width: '100%', backgroundColor: bgColor, color: textColor, fontFamily: 'system-ui, sans-serif', margin: '-24px', borderRadius: 'inherit', overflow: 'hidden' }}>
            
            {/* Top Menu Bar */}
            <div style={{ display: 'flex', alignItems: 'center', height: 28, backgroundColor: headerBg, borderBottom: `1px solid ${borderColor}`, padding: '0 12px', fontSize: 12 }}>
                <Space size={16}>
                    <span style={{ cursor: 'pointer', padding: '4px 8px' }}>File</span>
                    <span style={{ cursor: 'pointer', padding: '4px 8px' }}>Edit</span>
                    <span style={{ cursor: 'pointer', padding: '4px 8px' }}>View</span>
                    <span style={{ cursor: 'pointer', padding: '4px 8px' }}>Insert</span>
                    <span style={{ cursor: 'pointer', padding: '4px 8px' }}>Analyze</span>
                    <span style={{ cursor: 'pointer', padding: '4px 8px' }}>Collaborate</span>
                    <span style={{ cursor: 'pointer', padding: '4px 8px' }}>Manage</span>
                </Space>
                <div style={{ flex: 1 }} />
                <Space>
                    <Select
                        size="small"
                        value={selectedProjectId}
                        onChange={setSelectedProjectId}
                        style={{ width: 220 }}
                        options={projects.map(p => ({ label: `${p.name} (${p.projectNumber})`, value: p.id }))}
                        placeholder="Select Project"
                    />
                    <UserOutlined style={{ marginLeft: 16 }} />
                </Space>
            </div>

            {/* Top Ribbon */}
            <div style={{ display: 'flex', height: 80, backgroundColor: panelBg, borderBottom: `1px solid ${borderColor}`, padding: '4px 8px', overflowX: 'auto' }}>
                {ribbonGroups.map((group, gIdx) => (
                    <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', borderRight: `1px solid ${borderColor}`, paddingRight: 8, marginRight: 8 }}>
                        <div style={{ display: 'flex', flex: 1 }}>
                            {group.items.map((item, iIdx) => (
                                <div 
                                    key={iIdx} 
                                    onClick={item.onClick}
                                    style={{ 
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                                        width: 60, height: '100%', cursor: 'pointer', borderRadius: 4,
                                        backgroundColor: item.active ? themeColor : 'transparent',
                                        color: item.active ? '#fff' : textColor
                                    }}
                                    onMouseOver={(e) => { if (!item.active) e.currentTarget.style.backgroundColor = isDark ? '#333' : '#f0f0f0' }}
                                    onMouseOut={(e) => { if (!item.active) e.currentTarget.style.backgroundColor = 'transparent' }}
                                >
                                    <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
                                    <div style={{ fontSize: 10 }}>{item.label}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ fontSize: 10, textAlign: 'center', color: textMuted, marginTop: 4 }}>{group.title}</div>
                    </div>
                ))}
            </div>

            {/* Document Tabs */}
            <div style={{ display: 'flex', height: 32, backgroundColor: bgColor, borderBottom: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', backgroundColor: panelBg, borderRight: `1px solid ${borderColor}`, borderTop: `2px solid ${themeColor}`, fontSize: 12, fontWeight: 500 }}>
                    <EyeOutlined style={{ marginRight: 8 }} /> 3D View <CloseOutlined style={{ marginLeft: 16, fontSize: 10 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderRight: `1px solid ${borderColor}`, fontSize: 12, color: textMuted }}>
                    Level 1 <CloseOutlined style={{ marginLeft: 16, fontSize: 10 }} />
                </div>
            </div>

            {/* Main Workspace */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                
                {/* Left Panel: Project Browser */}
                <div style={{ width: 280, minWidth: 280, backgroundColor: panelBg, borderRight: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '8px 12px', borderBottom: `1px solid ${borderColor}`, fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Project Browser</span>
                        <MenuOutlined style={{ color: textMuted }} />
                    </div>
                    <div style={{ padding: '8px', borderBottom: `1px solid ${borderColor}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: isDark ? '#141414' : '#f0f0f0', padding: '4px 8px', borderRadius: 4 }}>
                            <SearchOutlined style={{ color: textMuted, marginRight: 8 }} />
                            <input type="text" placeholder="Search..." style={{ background: 'transparent', border: 'none', color: textColor, outline: 'none', fontSize: 12, width: '100%' }} />
                        </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                        <Tree
                            treeData={treeData}
                            defaultExpandAll
                            style={{ background: 'transparent', color: textColor }}
                        />

                        <Divider style={{ borderColor: borderColor, margin: '16px 0' }} />
                        <div style={{ fontSize: 12, fontWeight: 600, padding: '0 8px', marginBottom: 8, color: textMuted }}>Visibility / Graphics</div>
                        <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <Row align="middle" justify="space-between">
                                <Col><Badge color="#cbd5e1" text={<span style={{color: textColor, fontSize: 12}}>Architectural</span>} /></Col>
                                <Col><Switch size="small" checked={activeSystems.arch} onChange={c => setActiveSystems({...activeSystems, arch: c})} /></Col>
                            </Row>
                            <Row align="middle" justify="space-between">
                                <Col><Badge color="#3b82f6" text={<span style={{color: textColor, fontSize: 12}}>Mechanical</span>} /></Col>
                                <Col><Switch size="small" checked={activeSystems.mech} onChange={c => setActiveSystems({...activeSystems, mech: c})} /></Col>
                            </Row>
                            <Row align="middle" justify="space-between">
                                <Col><Badge color="#eab308" text={<span style={{color: textColor, fontSize: 12}}>Electrical</span>} /></Col>
                                <Col><Switch size="small" checked={activeSystems.elec} onChange={c => setActiveSystems({...activeSystems, elec: c})} /></Col>
                            </Row>
                            <Row align="middle" justify="space-between">
                                <Col><Badge color="#22c55e" text={<span style={{color: textColor, fontSize: 12}}>Plumbing</span>} /></Col>
                                <Col><Switch size="small" checked={activeSystems.plumb} onChange={c => setActiveSystems({...activeSystems, plumb: c})} /></Col>
                            </Row>
                        </div>
                    </div>
                </div>

                {/* Center Canvas */}
                <div style={{ flex: 1, position: 'relative', backgroundColor: isDark ? '#000' : '#e5e5e5' }}>
                    <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>}>
                        <Canvas 
                            camera={{ position: [35, 30, 35], fov: 45 }} 
                            shadows={viewMode !== 'performance'}
                            gl={{ antialias: viewMode !== 'performance', alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2, localClippingEnabled: true }}
                        >
                            {is2DMode ? (
                                <OrthographicCamera makeDefault position={[0, 40, 0]} zoom={15} near={0.1} far={1000} rotation={[-Math.PI / 2, 0, 0]} />
                            ) : (
                                <PerspectiveCamera makeDefault position={[35, 30, 35]} fov={45} />
                            )}
                            
                            {viewMode !== 'performance' && <SoftShadows size={15} samples={16} focus={0.5} />}
                            
                            {/* Dynamic Lighting */}
                            {activeAnalysis === 'sun' ? (
                                <>
                                    <ambientLight intensity={0.2} />
                                    <directionalLight position={[20, 40, -10]} intensity={2.5} castShadow={viewMode !== 'performance'} shadow-mapSize={[4096, 4096]} shadow-bias={-0.0001}>
                                        <orthographicCamera attach="shadow-camera" args={[-40, 40, 40, -40, 0.1, 100]} />
                                    </directionalLight>
                                </>
                            ) : (
                                <>
                                    <ambientLight intensity={isDark ? 0.4 : 0.7} />
                                    <directionalLight position={[15, 30, 15]} intensity={isDark ? 1.5 : 1.0} castShadow={viewMode !== 'performance'} shadow-mapSize={[2048, 2048]} />
                                    <directionalLight position={[-15, 15, -15]} intensity={0.5} />
                                </>
                            )}
                            
                            <Grid args={[200, 200]} sectionSize={1} sectionColor={isDark ? '#444' : '#ccc'} cellColor={isDark ? '#222' : '#eee'} position={[0, -0.56, 0]} fadeDistance={80} />
                            
                            {/* Interactive Ground Plane for Creation Tools */}
                            <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.55, 0]} visible={false} onClick={(e) => {
                                if (activeTool === 'select' || measureMode) return;
                                e.stopPropagation();
                                const pt = e.point;
                                setUserElements(prev => [...prev, { id: Math.random().toString(), type: activeTool, x: pt.x, z: pt.z, rot: 0 }]);
                            }}>
                                <planeGeometry args={[200, 200]} />
                                <meshBasicMaterial transparent opacity={0} />
                            </mesh>

                            {/* User created elements */}
                            {userElements.map((el, i) => (
                                <group key={el.id} position={[el.x, 0, el.z]} rotation={[0, el.rot, 0]}>
                                    <mesh position={[0, 1.5, 0]}>
                                        <boxGeometry args={el.type === 'wall' ? [4, 3, 0.2] : [1, 2, 1]} />
                                        <meshStandardMaterial color={themeColor} />
                                    </mesh>
                                </group>
                            ))}
                            
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
                            
                            {viewMode !== 'performance' && (
                                <EffectComposer multisampling={0}>
                                    <SMAA />
                                    <SSAO samples={21} radius={0.15} intensity={15} luminanceInfluence={0.6} />
                                    <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={1.2} />
                                    <DepthOfField focusDistance={0.05} focalLength={0.15} bokehScale={4} />
                                    <ToneMapping />
                                </EffectComposer>
                            )}

                            <OrbitControls makeDefault={false} enableRotate={!is2DMode} maxPolarAngle={is2DMode ? 0 : Math.PI / 2 - 0.05} autoRotate={false} />
                            <Environment preset={isDark ? "night" : "sunset"} blur={0.8} />
                            {viewMode !== 'performance' && <ContactShadows position={[0, -0.55, 0]} opacity={0.85} scale={100} blur={2.5} far={20} resolution={1024} color={isDark ? "#000000" : "#0f172a"} />}
                        </Canvas>
                    </Suspense>

                    {/* Canvas Floating Tools (Bottom Right) */}
                    <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', gap: 8 }}>
                        <div style={{ background: panelBg, borderRadius: 8, padding: 4, display: 'flex', gap: 4, border: `1px solid ${borderColor}`, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                            <Button size="small" type={viewMode === 'wireframe' ? 'primary' : 'text'} style={{ color: viewMode === 'wireframe' ? '#fff' : textColor }} onClick={() => setViewMode('wireframe')}>Wireframe</Button>
                            <Button size="small" type={viewMode === 'hidden-line' ? 'primary' : 'text'} style={{ color: viewMode === 'hidden-line' ? '#fff' : textColor }} onClick={() => setViewMode('hidden-line')}>Hidden Line</Button>
                            <Button size="small" type={viewMode === 'shaded' ? 'primary' : 'text'} style={{ color: viewMode === 'shaded' ? '#fff' : textColor }} onClick={() => setViewMode('shaded')}>Shaded</Button>
                            <Button size="small" type={viewMode === 'performance' ? 'primary' : 'text'} style={{ color: viewMode === 'performance' ? '#fff' : textColor }} onClick={() => setViewMode('performance')}>Performance</Button>
                        </div>
                    </div>

                    {/* Navigation Floating Toolbar (Middle Right) */}
                    <div style={{ position: 'absolute', top: '50%', right: 16, transform: 'translateY(-50%)', background: panelBg, borderRadius: 8, padding: 4, display: 'flex', flexDirection: 'column', gap: 4, border: `1px solid ${borderColor}`, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        <Button type="text" icon={<CompassOutlined />} style={{ color: textColor }} />
                        <Button type="text" icon={<SearchOutlined />} style={{ color: textColor }} />
                        <Button type="text" icon={<ExpandOutlined />} style={{ color: textColor }} />
                    </div>

                    {/* Sectioning/Explode Controls (Bottom Center) */}
                    <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: panelBg, borderRadius: 8, padding: '8px 16px', display: 'flex', gap: 24, border: `1px solid ${borderColor}`, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ScissorOutlined style={{ color: textMuted }} />
                            <Slider min={-2} max={30} step={0.1} value={clipY} onChange={setClipY} style={{ width: 100, margin: 0 }} />
                        </div>
                        <div style={{ width: 1, background: borderColor }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ExpandOutlined style={{ color: textMuted }} />
                            <Slider min={0} max={10} step={0.1} value={explodeFactor} onChange={setExplodeFactor} style={{ width: 100, margin: 0 }} />
                        </div>
                    </div>
                </div>

                {/* Right Panel: Properties */}
                <div style={{ width: 320, minWidth: 320, backgroundColor: panelBg, borderLeft: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '8px 12px', borderBottom: `1px solid ${borderColor}`, fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Properties</span>
                        <SettingOutlined style={{ color: textMuted }} />
                    </div>
                    
                    <div style={{ padding: 12, borderBottom: `1px solid ${borderColor}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, background: isDark ? '#333' : '#eee', borderRadius: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <BorderOutlined style={{ fontSize: 20, color: themeColor }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedElement ? selectedElement.split(' / ')[1] : 'No Selection'}</div>
                                <div style={{ fontSize: 11, color: textMuted }}>{selectedElement ? selectedElement.split(' / ')[0] : 'Click an element'}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {selectedElement ? (
                            <Collapse 
                                defaultActiveKey={['constraints', 'dimensions', 'identity']} 
                                ghost 
                                style={{ color: textColor }}
                                expandIconPosition="end"
                            >
                                <Collapse.Panel header={<span style={{ fontSize: 12, fontWeight: 600 }}>Constraints</span>} key="constraints">
                                    <Row style={{ marginBottom: 8, fontSize: 11 }}><Col span={10} style={{ color: textMuted }}>Base Constraint</Col><Col span={14}>Level 1</Col></Row>
                                    <Row style={{ marginBottom: 8, fontSize: 11 }}><Col span={10} style={{ color: textMuted }}>Top Constraint</Col><Col span={14}>Up to Level: Level 2</Col></Row>
                                    <Row style={{ marginBottom: 8, fontSize: 11 }}><Col span={10} style={{ color: textMuted }}>Room Bounding</Col><Col span={14}><Switch size="small" defaultChecked /></Col></Row>
                                </Collapse.Panel>
                                
                                <Collapse.Panel header={<span style={{ fontSize: 12, fontWeight: 600 }}>Dimensions</span>} key="dimensions">
                                    <Row style={{ marginBottom: 8, fontSize: 11 }}><Col span={10} style={{ color: textMuted }}>Length</Col><Col span={14}>15.40 m</Col></Row>
                                    <Row style={{ marginBottom: 8, fontSize: 11 }}><Col span={10} style={{ color: textMuted }}>Area</Col><Col span={14}>61.60 m²</Col></Row>
                                    <Row style={{ marginBottom: 8, fontSize: 11 }}><Col span={10} style={{ color: textMuted }}>Volume</Col><Col span={14}>12.32 m³</Col></Row>
                                </Collapse.Panel>
                                
                                <Collapse.Panel header={<span style={{ fontSize: 12, fontWeight: 600 }}>Identity Data</span>} key="identity">
                                    <Row style={{ marginBottom: 8, fontSize: 11 }}><Col span={10} style={{ color: textMuted }}>System</Col><Col span={14}>{selectedElement.split(' / ')[0]}</Col></Row>
                                    <Row style={{ marginBottom: 8, fontSize: 11 }}><Col span={10} style={{ color: textMuted }}>Workset</Col><Col span={14}>Architecture</Col></Row>
                                    <Row style={{ marginBottom: 8, fontSize: 11 }}><Col span={10} style={{ color: textMuted }}>Phasing</Col><Col span={14}>New Construction</Col></Row>
                                </Collapse.Panel>

                                <Collapse.Panel header={<span style={{ fontSize: 12, fontWeight: 600 }}>Performance Metrics</span>} key="perf">
                                    <Row style={{ marginBottom: 8, fontSize: 11 }}><Col span={10} style={{ color: textMuted }}>Est. Cost</Col><Col span={14} style={{ color: '#52c41a', fontWeight: 600 }}>$14,500</Col></Row>
                                    <Row style={{ marginBottom: 8, fontSize: 11 }}><Col span={10} style={{ color: textMuted }}>U-Value</Col><Col span={14}>0.24 W/m²K</Col></Row>
                                    <Row style={{ marginBottom: 8, fontSize: 11 }}><Col span={10} style={{ color: textMuted }}>Thermal Mass</Col><Col span={14}>High</Col></Row>
                                </Collapse.Panel>
                            </Collapse>
                        ) : (
                            <div style={{ padding: 24, textAlign: 'center', color: textMuted, fontSize: 12 }}>
                                Select an element in the 3D view to see its properties.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Status Bar */}
            <div style={{ display: 'flex', alignItems: 'center', height: 28, backgroundColor: headerBg, borderTop: `1px solid ${borderColor}`, padding: '0 16px', fontSize: 11, color: textMuted }}>
                <div style={{ flex: 1 }}>
                    {selectedElement ? `Selected: ${selectedElement} (1)` : 'Ready'}
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                    <span>X: 14.2, Y: 4.0, Z: -2.1</span>
                    <span>Rendering Details: 24.5 FPS</span>
                    <span>Active Tool: {measureMode ? 'Measure' : 'Select'}</span>
                    <span>Model: Skyline Tower</span>
                </div>
            </div>

        </div>
        </CMSLayout>
    );
}
