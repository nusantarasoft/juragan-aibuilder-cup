"use client";

import React, { Suspense, useState, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Html, ContactShadows, RoundedBox, useCursor, SoftShadows } from "@react-three/drei";
import { EffectComposer, Bloom, SSAO, SMAA, DepthOfField } from "@react-three/postprocessing";
import * as THREE from "three";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Badge, Button, Card, Descriptions, Drawer, Progress, Segmented, Spin, Typography, Switch, message } from 'antd';
import { motion } from "framer-motion";
import { EditOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useTheme } from "next-themes";
import { useDcimStore } from "@/store/useDcimStore";
import { DataCenterScene } from "@/components/dcim/DataCenterScene";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { AnimatePresence } from "framer-motion";

// --- Main Page Component ---

export default function Dcim3DView() {
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    
    React.useEffect(() => { setMounted(true); }, []);
    const isDark = mounted && resolvedTheme === "dark";

    const { token: antToken } = theme.useToken();
    
    const { viewMode, setViewMode, editMode, setEditMode, racks, selectedRackId, setSelectedRackId } = useDcimStore();
    const [drawerVisible, setDrawerVisible] = useState(false);

    const selectedRack = React.useMemo(() => racks.find(r => r.id === selectedRackId) || null, [racks, selectedRackId]);

    React.useEffect(() => {
        if (selectedRackId) setDrawerVisible(true);
    }, [selectedRackId]);

    return (
        <CMSLayout 
            title={<AuroraText>3D Digital Twin</AuroraText>}
            subTitle={<DecryptedText text="Data Center Interactive Visualization" speed={60} />}
        >
            {/* Toolbar overlay */}
            <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 180px)', minHeight: 600, borderRadius: 16, overflow: 'hidden', background: isDark ? '#050505' : '#e5e5e5' }}>
                
                {/* 3D Canvas */}
                <Suspense fallback={<div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>}>
                    <Canvas 
                        camera={{ position: [8, 8, 8], fov: 45 }} 
                        shadows
                        gl={{ antialias: false, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
                    >
                        <SoftShadows size={15} samples={16} focus={0.5} />
                        <color attach="background" args={[isDark ? '#050505' : '#e5e5e5']} />
                        <fog attach="fog" args={[isDark ? '#050505' : '#e5e5e5', 10, 40]} />
                        
                        <ambientLight intensity={viewMode === 'Normal' ? (isDark ? 0.6 : 1.0) : 1.2} />
                        <directionalLight position={[10, 15, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
                        <directionalLight position={[-10, 10, -10]} intensity={0.5} />
                        
                        <DataCenterScene />
                        
                        <EffectComposer multisampling={0}>
                            <SMAA />
                            <SSAO
                                samples={21}
                                radius={0.15}
                                intensity={15}
                                luminanceInfluence={0.6}
                            />
                            <Bloom
                                luminanceThreshold={0.5}
                                luminanceSmoothing={0.9}
                                intensity={1.2}
                            />
                            <DepthOfField focusDistance={0.05} focalLength={0.15} bokehScale={4} />
                        </EffectComposer>

                        <OrbitControls 
                            makeDefault 
                            minPolarAngle={0} 
                            maxPolarAngle={Math.PI / 2 - 0.05} // Prevent going below floor
                            maxDistance={30}
                            target={[0, 0, 0]}
                        />
                        <Environment preset={isDark ? "night" : "sunset"} blur={0.8} />
                    </Canvas>
                </Suspense>

                {/* Floating UI Controls */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
                >
                    <GlassPanel isDark={isDark} intensity="high" style={{ padding: '8px 16px', display: 'flex', gap: 16, alignItems: 'center', borderRadius: 14 }}>
                        <span style={{ color: isDark ? '#fff' : '#000', fontWeight: 600 }}>Visualization Overlay:</span>
                        <Segmented 
                            options={['Normal', 'Thermal', 'Power', 'Utilization']} 
                            value={viewMode}
                            onChange={(val) => setViewMode(val as any)}
                        />
                        <div style={{ width: 1, height: 24, background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', margin: '0 8px' }} />
                        <Switch 
                            checkedChildren={<EditOutlined />} 
                            unCheckedChildren="Build Mode" 
                            checked={editMode} 
                            onChange={setEditMode} 
                        />
                    </GlassPanel>
                </motion.div>

                {/* Build Catalog Overlay */}
                <AnimatePresence>
                    {editMode && (
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }} 
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            style={{ position: 'absolute', top: 24, left: 24, zIndex: 10, width: 250 }}
                        >
                            <GlassPanel isDark={isDark} intensity="high" style={{ padding: '16px', color: isDark ? '#fff' : '#000', borderRadius: 14 }}>
                                <div style={{ fontWeight: 600, marginBottom: 12 }}>Build Catalog</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <Button type="dashed" style={{ height: 60 }} onClick={() => message.info('Drag and drop coming soon')}>
                                        <div><AppstoreOutlined style={{ fontSize: 20 }} /></div>
                                        <div style={{ fontSize: 11 }}>Server Rack</div>
                                    </Button>
                                    <Button type="dashed" style={{ height: 60 }} onClick={() => message.info('Drag and drop coming soon')}>
                                        <div><AppstoreOutlined style={{ fontSize: 20 }} /></div>
                                        <div style={{ fontSize: 11 }}>CRAC Unit</div>
                                    </Button>
                                    <Button type="dashed" style={{ height: 60 }} onClick={() => message.info('Drag and drop coming soon')}>
                                        <div><AppstoreOutlined style={{ fontSize: 20 }} /></div>
                                        <div style={{ fontSize: 11 }}>PDU</div>
                                    </Button>
                                    <Button type="dashed" style={{ height: 60 }} onClick={() => message.info('Drag and drop coming soon')}>
                                        <div><AppstoreOutlined style={{ fontSize: 20 }} /></div>
                                        <div style={{ fontSize: 11 }}>Cabling</div>
                                    </Button>
                                </div>
                            </GlassPanel>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Legend */}
                <AnimatePresence>
                    {viewMode !== 'Normal' && (
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }} 
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 10 }}
                        >
                            <GlassPanel isDark={isDark} intensity="high" style={{ padding: '16px', minWidth: 200, color: isDark ? '#fff' : '#000', borderRadius: 14 }}>
                                <div style={{ fontWeight: 600, marginBottom: 12 }}>{viewMode} Legend</div>
                                
                                {viewMode === 'Thermal' && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><div style={{ width: 16, height: 16, background: '#ff4d4f', borderRadius: 4 }}/> &gt; 29°C (Critical)</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><div style={{ width: 16, height: 16, background: '#faad14', borderRadius: 4 }}/> 25-29°C (Warning)</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 16, height: 16, background: '#52c41a', borderRadius: 4 }}/> &lt; 25°C (Normal)</div>
                                    </>
                                )}
                                {viewMode === 'Utilization' && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><div style={{ width: 16, height: 16, background: '#ff4d4f', borderRadius: 4 }}/> &gt; 80% Used</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><div style={{ width: 16, height: 16, background: '#52c41a', borderRadius: 4 }}/> 50-80% Used</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 16, height: 16, background: '#d9d9d9', borderRadius: 4 }}/> &lt; 50% Used</div>
                                    </>
                                )}
                                {viewMode === 'Power' && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><div style={{ width: 16, height: 16, background: '#722ed1', borderRadius: 4 }}/> &gt; 7 kW</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><div style={{ width: 16, height: 16, background: '#108ee9', borderRadius: 4 }}/> 4-7 kW</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 16, height: 16, background: '#87d068', borderRadius: 4 }}/> &lt; 4 kW</div>
                                    </>
                                )}
                            </GlassPanel>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Right Drawer for Rack Details */}
            <Drawer
                title={selectedRack ? `Rack Details: ${selectedRack.name}` : 'Details'}
                placement="right"
                onClose={() => { setDrawerVisible(false); setSelectedRackId(null); }}
                open={drawerVisible}
                width={400}
                styles={{ body: { paddingBottom: 80 } }}
                extra={
                    selectedRack?.status !== 'normal' && 
                    <Badge status={selectedRack?.status === 'critical' ? 'error' : 'warning'} text={selectedRack?.status.toUpperCase()} />
                }
            >
                {selectedRack && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="ID">{selectedRack.id}</Descriptions.Item>
                            <Descriptions.Item label="Location">Row {selectedRack.name.charAt(0)}</Descriptions.Item>
                            <Descriptions.Item label="Max Weight">1,200 kg</Descriptions.Item>
                            <Descriptions.Item label="Power Feed A">PDU-A-01</Descriptions.Item>
                            <Descriptions.Item label="Power Feed B">PDU-B-01</Descriptions.Item>
                        </Descriptions>

                        <Card size="small" title="Live Telemetry" bordered={false} style={{ background: isDark ? '#1f1f1f' : '#fafafa' }}>
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="Temperature">
                                    <span style={{ color: selectedRack.temp > 29 ? '#ff4d4f' : 'inherit', fontWeight: 'bold' }}>{selectedRack.temp}°C</span>
                                </Descriptions.Item>
                                <Descriptions.Item label="Power Draw">
                                    <span style={{ fontWeight: 'bold' }}>{selectedRack.power} kW</span>
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <strong>Space Utilization</strong>
                                <span>{selectedRack.usedU} U / {selectedRack.totalU} U</span>
                            </div>
                            <Progress 
                                percent={Math.round((selectedRack.usedU / selectedRack.totalU) * 100)} 
                                strokeColor={themeColor} 
                                status={selectedRack.usedU / selectedRack.totalU > 0.8 ? 'exception' : 'normal'}
                            />
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                            <Button type="primary" block>View Equipment List</Button>
                        </div>
                    </div>
                )}
            </Drawer>
        </CMSLayout>
    );
}
