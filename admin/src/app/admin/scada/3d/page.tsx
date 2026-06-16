"use client";

import React, { useState, useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Badge, Typography, Space, Switch, Row, Col, Select, Button, Divider } from "antd";
import { motion } from "framer-motion";
import dynamic from 'next/dynamic';
import { useHmiStore } from "@/store/useHmiStore";
import { useScada3dStore } from "@/store/useScada3dStore";
import ScadaPalette from "../hmi/ScadaPalette";
import ScadaCanvas from "../hmi/ScadaCanvas";
import ScadaProperties from "../hmi/ScadaProperties";

const Scada3DScene = dynamic(() => import('./Scada3DScene'), { ssr: false });

const { Text, Title } = Typography;

export default function ScadaUnified() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    // 3D Scene States
    const [selectedEquip, setSelectedEquip] = useState<any>(null);
    const [animateFlow, setAnimateFlow] = useState(true);
    const [thermalMode, setThermalMode] = useState(false);
    const [alarmActive, setAlarmActive] = useState(false);
    
    // HMI States
    const { isEditMode, setEditMode, clearSelection } = useHmiStore();
    const [sceneEditMode, setSceneEditMode] = useState(false);
    const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
    
    // 3D Store
    const { addElement: add3dElement } = useScada3dStore();

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    // Keyboard shortcuts for delete and deselect
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                clearSelection();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [clearSelection]);

    return (
        <CMSLayout 
            title={<AuroraText>Unified SCADA Center</AuroraText>}
            subTitle={<DecryptedText text="3D Digital Twin & 2D HMI Canvas" speed={60} />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ height: 'calc(100vh - 160px)', display: 'flex', gap: 16 }}>
                
                {/* Left Panel: HMI Palette */}
                <Card 
                    title="Library" 
                    style={{...glassStyle, width: 250, display: 'flex', flexDirection: 'column' }} 
                    bodyStyle={{ flex: 1, overflow: 'hidden', padding: 12 }}
                    bordered={false}
                >
                    <ScadaPalette />
                </Card>

                {/* Center Panel: Split 3D View and HMI Canvas */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
                    {/* Top: 3D Scene Viewport */}
                    <Card 
                        style={{...glassStyle, flex: 1, overflow: 'hidden'}} 
                        bodyStyle={{ padding: 0, height: '100%', position: 'relative' }}
                        bordered={false}
                    >
                        <div 
                            style={{ width: '100%', height: '100%' }}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                            onDrop={(e) => {
                                e.preventDefault();
                                const type = e.dataTransfer.getData('scada-3d-type');
                                if (type) {
                                    // Spawning at center of the 3D viewport for now (0,0,0)
                                    // A more robust solution would project the drop coords onto the 3D plane
                                    add3dElement({
                                        type: type as any,
                                        position: [0, 0, 0],
                                        rotation: [0, 0, 0],
                                        scale: [1, 1, 1],
                                        properties: { name: `New ${type}` }
                                    });
                                }
                            }}
                        >
                            <Scada3DScene 
                                onSelect={setSelectedEquip} 
                                animateFlow={animateFlow} 
                                thermalMode={thermalMode}
                                alarmActive={alarmActive}
                                editMode={sceneEditMode}
                                transformMode={transformMode}
                            />
                        </div>
                        
                        {/* Floating Controls inside the 3D viewport */}
                        <div style={{ position: 'absolute', top: 16, right: 16, background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)', padding: '8px 16px', borderRadius: 8, backdropFilter: 'blur(8px)', zIndex: 10 }}>
                            <Space direction="horizontal" size="large">
                                <Space>
                                    <Text strong>3D Edit Mode</Text>
                                    <Switch checked={sceneEditMode} onChange={setSceneEditMode} />
                                </Space>
                                {sceneEditMode && (
                                    <Select 
                                        value={transformMode} 
                                        onChange={(val) => setTransformMode(val as any)}
                                        options={[
                                            { label: 'Translate', value: 'translate' },
                                            { label: 'Rotate', value: 'rotate' },
                                            { label: 'Scale', value: 'scale' },
                                        ]}
                                        style={{ width: 100 }}
                                    />
                                )}
                                <Space>
                                    <Text strong>Simulate Flow</Text>
                                    <Switch checked={animateFlow} onChange={setAnimateFlow} />
                                </Space>
                                <Space>
                                    <Text strong>Thermal Mode</Text>
                                    <Switch checked={thermalMode} onChange={setThermalMode} />
                                </Space>
                                <Space>
                                    <Text strong style={{ color: alarmActive ? '#f5222d' : 'inherit' }}>Trigger Alarm</Text>
                                    <Switch checked={alarmActive} onChange={setAlarmActive} />
                                </Space>
                            </Space>
                        </div>
                    </Card>

                    {/* Bottom: HMI Canvas */}
                    <Card 
                        title={
                            <Space>
                                <Select defaultValue="chiller" options={[
                                    {label: 'Chiller Plant View', value: 'chiller'},
                                    {label: 'Electrical Single Line', value: 'electrical'},
                                    {label: 'UPS System', value: 'ups'},
                                ]} style={{ width: 200 }} />
                            </Space>
                        }
                        style={{...glassStyle, flex: 1, display: 'flex', flexDirection: 'column' }} 
                        bodyStyle={{ flex: 1, padding: 0, overflow: 'hidden', position: 'relative' }}
                        bordered={false}
                        extra={
                            <Space>
                                <Switch checkedChildren="Edit" unCheckedChildren="View" checked={isEditMode} onChange={setEditMode} />
                                <Button type="primary" style={{ background: themeColor }}>Deploy HMI</Button>
                            </Space>
                        }
                    >
                        <ScadaCanvas />
                    </Card>
                </div>

                {/* Right Properties Panel: Telemetry + HMI Properties */}
                <Card 
                    title="Properties & Telemetry" 
                    style={{...glassStyle, width: 320, display: 'flex', flexDirection: 'column' }} 
                    bodyStyle={{ flex: 1, overflowY: 'auto', padding: 12 }}
                    bordered={false}
                >
                    {selectedEquip ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={selectedEquip.id}>
                            <Title level={4} style={{ color: themeColor, marginTop: 0 }}>{selectedEquip.name}</Title>
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                
                                <div>
                                    <Text type="secondary">Status</Text><br/>
                                    <Badge status={selectedEquip.status === 'Running' ? 'success' : 'default'} text={<Text strong>{selectedEquip.status}</Text>} />
                                </div>
                                
                                {Object.entries(selectedEquip.telemetry).map(([key, value]) => (
                                    <div key={key}>
                                        <Text type="secondary">{key}</Text><br/>
                                        <Text strong style={{ fontSize: 18 }}>{value as React.ReactNode}</Text>
                                    </div>
                                ))}

                                <Card size="small" style={{ background: isDark ? '#1f1f1f' : '#f0f0f0', marginTop: 16 }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>SCADA Node ID: {selectedEquip.id}</Text>
                                    <br/>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Protocol: OPC-UA</Text>
                                </Card>
                            </Space>
                            <Divider />
                        </motion.div>
                    ) : (
                        <div style={{ textAlign: 'center', opacity: 0.5, marginBottom: 16 }}>
                            <Text>Click on any 3D equipment to view live telemetry data.</Text>
                            <Divider />
                        </div>
                    )}
                    
                    <div style={{ flex: 1 }}>
                        <Title level={5}>HMI Object Properties</Title>
                        <ScadaProperties />
                    </div>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
