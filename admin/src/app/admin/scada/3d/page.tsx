"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Badge, Typography, Space, Switch, Row, Col } from "antd";
import { motion } from "framer-motion";
import dynamic from 'next/dynamic';

const Scada3DScene = dynamic(() => import('./Scada3DScene'), { ssr: false });

const { Text, Title } = Typography;

export default function Scada3D() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const [selectedEquip, setSelectedEquip] = useState<any>(null);
    const [animateFlow, setAnimateFlow] = useState(true);
    const [thermalMode, setThermalMode] = useState(false);
    const [alarmActive, setAlarmActive] = useState(false);

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    return (
        <CMSLayout 
            title={<AuroraText>3D SCADA Digital Twin</AuroraText>}
            subTitle={<DecryptedText text="Real-time Chiller Plant Visualization" speed={60} />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ height: 'calc(100vh - 160px)', display: 'flex', gap: 16 }}>
                
                {/* 3D Scene Viewport */}
                <Card 
                    style={{...glassStyle, flex: 1, overflow: 'hidden'}} 
                    bodyStyle={{ padding: 0, height: '100%', position: 'relative' }}
                    bordered={false}
                >
                    <Scada3DScene 
                        onSelect={setSelectedEquip} 
                        animateFlow={animateFlow} 
                        thermalMode={thermalMode}
                        alarmActive={alarmActive}
                    />
                    
                    {/* Floating Controls inside the 3D viewport */}
                    <div style={{ position: 'absolute', top: 16, right: 16, background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)', padding: '8px 16px', borderRadius: 8, backdropFilter: 'blur(8px)' }}>
                        <Space direction="vertical">
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

                {/* Right Properties Panel */}
                <Card 
                    title="Equipment Telemetry" 
                    style={{...glassStyle, width: 320, display: 'flex', flexDirection: 'column' }} 
                    bodyStyle={{ flex: 1, overflowY: 'auto' }}
                    bordered={false}
                >
                    {selectedEquip ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={selectedEquip.id}>
                            <Title level={4} style={{ color: themeColor, marginTop: 0 }}>{selectedEquip.name}</Title>
                            <Space direction="vertical" style={{ width: '100%' }} size="large">
                                
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
                        </motion.div>
                    ) : (
                        <div style={{ textAlign: 'center', opacity: 0.5, marginTop: 100 }}>
                            <Text>Click on any 3D equipment to view live telemetry data.</Text>
                        </div>
                    )}
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
