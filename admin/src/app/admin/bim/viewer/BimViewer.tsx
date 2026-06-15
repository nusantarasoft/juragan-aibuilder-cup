"use client";

import React, { Suspense, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Edges, ContactShadows, useCursor } from "@react-three/drei";
import * as THREE from "three";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Select, Button, Space, Card, Typography, Spin, Divider, Row, Col } from "antd";
import { motion } from "framer-motion";
import { EyeOutlined, BuildOutlined, EyeInvisibleOutlined, AppstoreOutlined } from "@ant-design/icons";

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
        >
            <boxGeometry />
            <meshStandardMaterial color={hovered ? '#40a9ff' : color} transparent opacity={0.9} />
            <Edges scale={1} threshold={15} color="#333" />
        </mesh>
    );
}

function DemoBuildingModel({ onElementClick }: { onElementClick: (type: string) => void }) {
    return (
        <group position={[0, 0, 0]}>
            {/* Foundation */}
            <mesh position={[0, -0.25, 0]}>
                <boxGeometry args={[12, 0.5, 8]} />
                <meshStandardMaterial color="#8c8c8c" />
            </mesh>
            
            {/* Floor */}
            <mesh position={[0, 0.05, 0]}>
                <boxGeometry args={[11.8, 0.1, 7.8]} />
                <meshStandardMaterial color="#d9d9d9" />
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
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    
    const [selectedElement, setSelectedElement] = useState<string | null>(null);

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 14,
    };

    return (
        <CMSLayout 
            title={<AuroraText>Web IFC Viewer</AuroraText>}
            subTitle={<DecryptedText text="3D Model Exploration & Properties" speed={60} />}
        >
            <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 180px)', minHeight: 600 }}>
                
                {/* Left Panel: Model Tree */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{ width: 300 }}>
                    <Card style={{ ...glassStyle, height: '100%', overflow: 'auto' }} bordered={false} bodyStyle={{ padding: '16px 0' }}>
                        <div style={{ padding: '0 16px', marginBottom: 16 }}>
                            <Select defaultValue="mod1" style={{ width: '100%' }} options={[{label: 'HQ_Architecture_v3.ifc', value: 'mod1'}]} />
                        </div>
                        <Divider style={{ margin: '0 0 16px 0' }} />
                        <div style={{ padding: '0 16px' }}>
                            <div style={{ fontWeight: 600, marginBottom: 8 }}><AppstoreOutlined /> IFC Spatial Structure</div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
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
                    </Card>
                </motion.div>

                {/* Main 3D Canvas */}
                <div style={{ flex: 1, position: 'relative', borderRadius: 16, overflow: 'hidden', background: isDark ? '#111' : '#f0f0f0' }}>
                    <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>}>
                        <Canvas camera={{ position: [15, 10, 15], fov: 45 }}>
                            <color attach="background" args={[isDark ? '#111' : '#f0f0f0']} />
                            <ambientLight intensity={0.5} />
                            <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
                            
                            <Grid args={[40, 40]} sectionSize={1} sectionColor={isDark ? '#444' : '#ccc'} cellColor={isDark ? '#222' : '#eee'} position={[0, -0.3, 0]} />
                            
                            <DemoBuildingModel onElementClick={(type) => setSelectedElement(type)} />
                            
                            <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.05} />
                            <Environment preset="city" />
                            <ContactShadows position={[0, -0.29, 0]} opacity={0.4} scale={20} blur={2} far={2} />
                        </Canvas>
                    </Suspense>

                    {/* Toolbar */}
                    <div style={{ position: 'absolute', top: 16, right: 16, ...glassStyle, padding: '8px', display: 'flex', gap: 8 }}>
                        <Button icon={<EyeOutlined />} type="text" />
                        <Button icon={<EyeInvisibleOutlined />} type="text" />
                        <Button icon={<BuildOutlined />} type="text" />
                    </div>
                </div>

                {/* Right Panel: Properties */}
                {selectedElement && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ width: 300 }}>
                        <Card title="Properties" style={{ ...glassStyle, height: '100%' }} bordered={false}>
                            <Text strong style={{ display: 'block', marginBottom: 16, color: themeColor }}>{selectedElement}</Text>
                            
                            <div style={{ fontWeight: 600, background: isDark ? '#222' : '#f5f5f5', padding: '4px 8px', marginBottom: 8 }}>Identity Data</div>
                            <Row style={{ marginBottom: 8, fontSize: 12 }}><Col span={10}><Text type="secondary">GlobalId:</Text></Col><Col span={14}>1c$MkV...</Col></Row>
                            <Row style={{ marginBottom: 8, fontSize: 12 }}><Col span={10}><Text type="secondary">Name:</Text></Col><Col span={14}>Basic Wall</Col></Row>
                            
                            <div style={{ fontWeight: 600, background: isDark ? '#222' : '#f5f5f5', padding: '4px 8px', margin: '16px 0 8px 0' }}>Dimensions</div>
                            <Row style={{ marginBottom: 8, fontSize: 12 }}><Col span={10}><Text type="secondary">Length:</Text></Col><Col span={14}>11800 mm</Col></Row>
                            <Row style={{ marginBottom: 8, fontSize: 12 }}><Col span={10}><Text type="secondary">Volume:</Text></Col><Col span={14}>9.44 m³</Col></Row>
                            <Row style={{ marginBottom: 8, fontSize: 12 }}><Col span={10}><Text type="secondary">Area:</Text></Col><Col span={14}>47.2 m²</Col></Row>

                            <div style={{ fontWeight: 600, background: isDark ? '#222' : '#f5f5f5', padding: '4px 8px', margin: '16px 0 8px 0' }}>Materials</div>
                            <Row style={{ marginBottom: 8, fontSize: 12 }}><Col span={10}><Text type="secondary">Material:</Text></Col><Col span={14}>Concrete - Cast in Situ</Col></Row>
                        </Card>
                    </motion.div>
                )}
            </div>
        </CMSLayout>
    );
}
