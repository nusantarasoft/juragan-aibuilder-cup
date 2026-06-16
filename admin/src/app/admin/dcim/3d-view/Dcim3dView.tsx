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
    
    const { viewMode, setViewMode, editMode, setEditMode, racks, selectedRackId, setSelectedRackId, selectedServerId, setSelectedServerId } = useDcimStore();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [serverModalVisible, setServerModalVisible] = useState(false);

    const selectedRack = React.useMemo(() => racks.find(r => r.id === selectedRackId) || null, [racks, selectedRackId]);
    const selectedServer = React.useMemo(() => selectedRack?.servers.find(s => s.id === selectedServerId) || null, [selectedRack, selectedServerId]);

    React.useEffect(() => {
        if (selectedRackId) setDrawerVisible(true);
    }, [selectedRackId]);

    React.useEffect(() => {
        if (selectedServerId) setServerModalVisible(true);
        else setServerModalVisible(false);
    }, [selectedServerId]);

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
                                    <Button type="dashed" style={{ height: 60 }} onClick={() => {
                                        const store = useDcimStore.getState();
                                        store.addRack({
                                            id: `RACK-NEW-${Date.now()}`,
                                            name: `New Rack`,
                                            x: 0,
                                            z: 0,
                                            totalU: 42,
                                            usedU: 0,
                                            temp: 24,
                                            power: 0,
                                            status: 'normal',
                                            servers: []
                                        });
                                        message.success('Rack added to scene!');
                                    }}>
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
                width={450}
                styles={{ body: { paddingBottom: 80 } }}
                extra={
                    selectedRack?.status !== 'normal' && 
                    <Badge status={selectedRack?.status === 'critical' ? 'error' : 'warning'} text={selectedRack?.status?.toUpperCase()} />
                }
            >
                {selectedRack && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="ID">{selectedRack.id}</Descriptions.Item>
                            <Descriptions.Item label="Size">{selectedRack.totalU}U</Descriptions.Item>
                            <Descriptions.Item label="Power Feed A">PDU-A-01</Descriptions.Item>
                            <Descriptions.Item label="Power Feed B">PDU-B-01</Descriptions.Item>
                        </Descriptions>

                        <Card size="small" title="Live Telemetry" bordered={false} style={{ background: isDark ? '#1f1f1f' : '#fafafa' }}>
                            <Descriptions column={2} size="small">
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
                                <strong>Server List (U-Slot Diagram)</strong>
                                <span>{selectedRack.usedU} U / {selectedRack.totalU} U</span>
                            </div>
                            <Progress 
                                percent={Math.round((selectedRack.usedU / selectedRack.totalU) * 100)} 
                                strokeColor={themeColor} 
                                status={selectedRack.usedU / selectedRack.totalU > 0.8 ? 'exception' : 'normal'}
                                style={{ marginBottom: 16 }}
                            />
                            
                            <div style={{ 
                                display: 'flex', flexDirection: 'column-reverse', 
                                border: `1px solid ${isDark ? '#333' : '#d9d9d9'}`, 
                                borderRadius: 8, overflow: 'hidden',
                                background: isDark ? '#141414' : '#fff'
                            }}>
                                {Array.from({ length: selectedRack.totalU }).map((_, i) => {
                                    const uSlot = i + 1;
                                    // Find if a server occupies this slot
                                    const server = selectedRack.servers.find(s => uSlot >= s.uSlot && uSlot < s.uSlot + s.uHeight);
                                    const isServerBase = server?.uSlot === uSlot;

                                    if (server && !isServerBase) return null; // Rendered by the base slot

                                    return (
                                        <div 
                                            key={uSlot}
                                            style={{
                                                height: server ? server.uHeight * 30 : 30,
                                                borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`,
                                                display: 'flex',
                                                alignItems: 'stretch',
                                                cursor: server ? 'pointer' : 'default',
                                                background: server ? (selectedServerId === server.id ? (isDark ? '#177ddc' : '#e6f7ff') : (isDark ? '#1f1f1f' : '#fafafa')) : 'transparent'
                                            }}
                                            onClick={() => server && setSelectedServerId(server.id)}
                                        >
                                            <div style={{ width: 40, borderRight: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#888' }}>
                                                U{uSlot}
                                            </div>
                                            <div style={{ flex: 1, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                {server ? (
                                                    <>
                                                        <span style={{ fontWeight: 600 }}>{server.name}</span>
                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                            <span style={{ fontSize: 11, color: '#888' }}>{server.ip}</span>
                                                            <Badge status={server.status === 'critical' ? 'error' : server.status === 'warning' ? 'warning' : 'success'} />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span style={{ color: '#aaa', fontSize: 12 }}>Empty Slot</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>

            {/* Server Remote Console Modal / Drawer */}
            <Drawer
                title={selectedServer ? `Remote Console: ${selectedServer.name}` : 'Remote Console'}
                placement="right"
                onClose={() => setSelectedServerId(null)}
                open={serverModalVisible}
                width={600}
                zIndex={2000}
            >
                {selectedServer && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <Card size="small" style={{ background: isDark ? '#1f1f1f' : '#fafafa' }}>
                                <div style={{ fontSize: 12, color: '#888' }}>CPU Usage</div>
                                <div style={{ fontSize: 24, fontWeight: 'bold', color: selectedServer.cpu > 85 ? '#ff4d4f' : 'inherit' }}>{selectedServer.cpu}%</div>
                                <Progress percent={selectedServer.cpu} showInfo={false} size="small" status={selectedServer.cpu > 85 ? 'exception' : 'active'} />
                            </Card>
                            <Card size="small" style={{ background: isDark ? '#1f1f1f' : '#fafafa' }}>
                                <div style={{ fontSize: 12, color: '#888' }}>Memory (RAM)</div>
                                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{selectedServer.ram}%</div>
                                <Progress percent={selectedServer.ram} showInfo={false} size="small" />
                            </Card>
                        </div>
                        
                        <Descriptions column={2} size="small" bordered>
                            <Descriptions.Item label="IP Address">{selectedServer.ip}</Descriptions.Item>
                            <Descriptions.Item label="Power">{selectedServer.power} W</Descriptions.Item>
                            <Descriptions.Item label="Temp">
                                <span style={{ color: selectedServer.temp > 35 ? '#ff4d4f' : 'inherit' }}>{selectedServer.temp}°C</span>
                            </Descriptions.Item>
                            <Descriptions.Item label="U-Slot">U{selectedServer.uSlot} ({selectedServer.uHeight}U)</Descriptions.Item>
                        </Descriptions>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontWeight: 600, marginBottom: 8 }}>SSH Terminal</div>
                            <div style={{ 
                                flex: 1, 
                                background: '#000', 
                                color: '#0f0', 
                                padding: 16, 
                                borderRadius: 8, 
                                fontFamily: 'monospace',
                                overflowY: 'auto'
                            }}>
                                <div>Connecting to {selectedServer.ip}...</div>
                                <div>Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-89-generic x86_64)</div>
                                <br/>
                                <div> * Documentation:  https://help.ubuntu.com</div>
                                <div> * Management:     https://landscape.canonical.com</div>
                                <div> * Support:        https://ubuntu.com/advantage</div>
                                <br/>
                                <div>System information as of {new Date().toUTCString()}</div>
                                <br/>
                                <div>System load:  {((selectedServer.cpu / 100) * 4).toFixed(2)}               Processes:             142</div>
                                <div>Usage of /:   42.1% of 100GB   Users logged in:       1</div>
                                <div>Memory usage: {selectedServer.ram}%              IPv4 address for eth0: {selectedServer.ip}</div>
                                <br/>
                                <div>root@{selectedServer.name.toLowerCase()}:~# <span style={{ animation: 'blink 1s step-end infinite' }}>_</span></div>
                                <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>
        </CMSLayout>
    );
}
