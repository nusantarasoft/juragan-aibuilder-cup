"use client";

import React, { Suspense, useState, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Edges, ContactShadows, useCursor, SoftShadows } from "@react-three/drei";
import { EffectComposer, Bloom, SSAO, ToneMapping, SMAA, DepthOfField } from "@react-three/postprocessing";
import * as THREE from "three";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useTheme } from "next-themes";
import { theme, Select, Button, Space, Card, Typography, Spin, Divider, Row, Col } from "antd";
import { motion, AnimatePresence } from "framer-motion";
import { EyeOutlined, BuildOutlined, EyeInvisibleOutlined, AppstoreOutlined } from "@ant-design/icons";
import { GlassPanel } from "@/components/ui/GlassPanel";

const { Text } = Typography;

// Mock IFC Element Component
function MockIfcWall({ position, scale, color, onClick }: any) {
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
                transparent 
                opacity={0.9} 
                roughness={0.2}
                metalness={0.1}
                clearcoat={0.3}
            />
            <Edges scale={1} threshold={15} color={hovered ? "#fff" : "#333"} />
        </mesh>
    );
}

function DemoBuildingModel({ onElementClick }: { onElementClick: (type: string) => void }) {
    return (
        <group position={[0, 0, 0]}>
            {/* Foundation */}
            <mesh position={[0, -0.25, 0]} receiveShadow>
                <boxGeometry args={[12, 0.5, 8]} />
                <meshStandardMaterial color="#8c8c8c" roughness={0.9} />
            </mesh>
            
            {/* Floor */}
            <mesh position={[0, 0.05, 0]} receiveShadow>
                <boxGeometry args={[11.8, 0.1, 7.8]} />
                <meshPhysicalMaterial color="#d9d9d9" roughness={0.1} metalness={0.5} clearcoat={1.0} />
            </mesh>

            {/* Walls */}
            <MockIfcWall position={[0, 2, -3.9]} scale={[11.8, 4, 0.2]} color="#f0f0f0" onClick={() => onElementClick('IfcWallStandardCase - North')} />
            <MockIfcWall position={[0, 2, 3.9]} scale={[11.8, 4, 0.2]} color="#f0f0f0" onClick={() => onElementClick('IfcWallStandardCase - South')} />
            <MockIfcWall position={[-5.9, 2, 0]} scale={[0.2, 4, 8]} color="#f0f0f0" onClick={() => onElementClick('IfcWallStandardCase - West')} />
            
            {/* Interior Column */}
            <MockIfcWall position={[0, 2, 0]} scale={[0.5, 4, 0.5]} color="#bfbfbf" onClick={() => onElementClick('IfcColumn - Center')} />
            
            {/* MEP Duct (Mock) */}
            <MockIfcWall position={[0, 3.5, 2]} scale={[10, 0.4, 0.6]} color="#1890ff" onClick={() => onElementClick('IfcDuctSegment - HVAC Supply')} />
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

    return (
        <CMSLayout 
            title={<AuroraText>Web IFC Viewer</AuroraText>}
            subTitle={<DecryptedText text="3D Model Exploration & Properties" speed={60} />}
        >
            <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 180px)', minHeight: 600 }}>
                
                {/* Left Panel: Model Tree */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{ width: 300, zIndex: 10 }}>
                    <GlassPanel isDark={isDark} intensity="high" style={{ height: '100%', borderRadius: 16, overflow: 'hidden' }}>
                        <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
                            <div style={{ marginBottom: 16 }}>
                                <Select defaultValue="mod1" style={{ width: '100%' }} options={[{label: 'HQ_Architecture_v3.ifc', value: 'mod1'}]} />
                            </div>
                            <Divider style={{ margin: '0 0 16px 0', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                            <div>
                                <div style={{ fontWeight: 600, marginBottom: 8, color: isDark ? '#fff' : '#000' }}><AppstoreOutlined /> IFC Spatial Structure</div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, color: isDark ? '#ddd' : '#333' }}>
                                    <li style={{ padding: '4px 0', cursor: 'pointer', color: themeColor }}>[-] IfcProject</li>
                                    <ul style={{ listStyle: 'none', paddingLeft: 16, margin: 0 }}>
                                        <li style={{ padding: '4px 0', cursor: 'pointer' }}>[-] IfcSite</li>
                                        <ul style={{ listStyle: 'none', paddingLeft: 16, margin: 0 }}>
                                            <li style={{ padding: '4px 0', cursor: 'pointer' }}>[-] IfcBuilding</li>
                                            <ul style={{ listStyle: 'none', paddingLeft: 16, margin: 0 }}>
                                                <li style={{ padding: '4px 0', cursor: 'pointer' }}>[+] IfcBuildingStorey (L1)</li>
                                                <li style={{ padding: '4px 0', cursor: 'pointer' }}>[+] IfcBuildingStorey (L2)</li>
                                            </ul>
                                        </ul>
                                    </ul>
                                </ul>
                            </div>
                        </div>
                    </GlassPanel>
                </motion.div>

                {/* Main 3D Canvas */}
                <div style={{ flex: 1, position: 'relative', borderRadius: 16, overflow: 'hidden', background: isDark ? '#050505' : '#e5e5e5' }}>
                    <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>}>
                        <Canvas 
                            camera={{ position: [15, 10, 15], fov: 45 }} 
                            shadows
                            gl={{ antialias: false, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
                        >
                            {/* Cinematic Soft Shadows */}
                            <SoftShadows size={15} samples={16} focus={0.5} />
                            <color attach="background" args={[isDark ? '#050505' : '#e5e5e5']} />
                            <ambientLight intensity={isDark ? 0.3 : 0.6} />
                            <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
                            <directionalLight position={[-10, 10, -10]} intensity={0.5} />
                            
                            <Grid args={[40, 40]} sectionSize={1} sectionColor={isDark ? '#444' : '#ccc'} cellColor={isDark ? '#222' : '#eee'} position={[0, -0.3, 0]} fadeDistance={30} />
                            
                            <DemoBuildingModel onElementClick={(type) => setSelectedElement(type)} />
                            
                            <EffectComposer multisampling={0}>
                                <SMAA />
                                <SSAO samples={21} radius={0.15} intensity={15} luminanceInfluence={0.6} />
                                <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={1.2} />
                                <DepthOfField focusDistance={0.05} focalLength={0.15} bokehScale={4} />
                                <ToneMapping />
                            </EffectComposer>

                            <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} autoRotate autoRotateSpeed={0.5} />
                            <Environment preset={isDark ? "night" : "sunset"} blur={0.8} />
                            <ContactShadows position={[0, -0.29, 0]} opacity={0.85} scale={80} blur={2.5} far={15} resolution={1024} color={isDark ? "#000000" : "#0f172a"} />
                        </Canvas>
                    </Suspense>

                    {/* Toolbar */}
                    <GlassPanel isDark={isDark} intensity="high" style={{ position: 'absolute', top: 16, right: 16, padding: '8px', display: 'flex', gap: 8, borderRadius: 12 }}>
                        <Button icon={<EyeOutlined />} type="text" style={{ color: isDark ? '#fff' : '#000' }} />
                        <Button icon={<EyeInvisibleOutlined />} type="text" style={{ color: isDark ? '#fff' : '#000' }} />
                        <Button icon={<BuildOutlined />} type="text" style={{ color: isDark ? '#fff' : '#000' }} />
                    </GlassPanel>
                </div>

                {/* Right Panel: Properties */}
                <AnimatePresence>
                    {selectedElement && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} style={{ width: 300, zIndex: 10 }}>
                            <GlassPanel isDark={isDark} intensity="high" style={{ height: '100%', borderRadius: 16, overflow: 'hidden' }}>
                                <div style={{ padding: '16px', height: '100%', overflowY: 'auto', color: isDark ? '#ddd' : '#333' }}>
                                    <h3 style={{ margin: '0 0 16px 0', color: isDark ? '#fff' : '#000' }}>Properties</h3>
                                    <Text strong style={{ display: 'block', marginBottom: 16, color: themeColor }}>{selectedElement}</Text>
                                    
                                    <div style={{ fontWeight: 600, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', padding: '4px 8px', marginBottom: 8, borderRadius: 4 }}>Identity Data</div>
                                    <Row style={{ marginBottom: 8, fontSize: 12 }}><Col span={10}><Text type="secondary" style={{ color: isDark ? '#aaa' : undefined }}>GlobalId:</Text></Col><Col span={14}>1c$MkV...</Col></Row>
                                    <Row style={{ marginBottom: 8, fontSize: 12 }}><Col span={10}><Text type="secondary" style={{ color: isDark ? '#aaa' : undefined }}>Name:</Text></Col><Col span={14}>Basic Wall</Col></Row>
                                    
                                    <div style={{ fontWeight: 600, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', padding: '4px 8px', margin: '16px 0 8px 0', borderRadius: 4 }}>Dimensions</div>
                                    <Row style={{ marginBottom: 8, fontSize: 12 }}><Col span={10}><Text type="secondary" style={{ color: isDark ? '#aaa' : undefined }}>Length:</Text></Col><Col span={14}>11800 mm</Col></Row>
                                    <Row style={{ marginBottom: 8, fontSize: 12 }}><Col span={10}><Text type="secondary" style={{ color: isDark ? '#aaa' : undefined }}>Volume:</Text></Col><Col span={14}>9.44 m³</Col></Row>
                                    <Row style={{ marginBottom: 8, fontSize: 12 }}><Col span={10}><Text type="secondary" style={{ color: isDark ? '#aaa' : undefined }}>Area:</Text></Col><Col span={14}>47.2 m²</Col></Row>

                                    <div style={{ fontWeight: 600, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', padding: '4px 8px', margin: '16px 0 8px 0', borderRadius: 4 }}>Materials</div>
                                    <Row style={{ marginBottom: 8, fontSize: 12 }}><Col span={10}><Text type="secondary" style={{ color: isDark ? '#aaa' : undefined }}>Material:</Text></Col><Col span={14}>Concrete - Cast in Situ</Col></Row>
                                </div>
                            </GlassPanel>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </CMSLayout>
    );
}
