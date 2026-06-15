'use client';

import React, { useState } from 'react';
import CMSLayout from '@/components/layout/CMSLayout';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { Row, Col, Card, Table, Tag, Progress, Button, Tooltip, theme, Typography, Space } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { WarningOutlined, SyncOutlined, CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Text } = Typography;

import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import { useRouter } from "next/navigation";

// Mock data for predictive maintenance
const mockEquipmentList = [
    { id: 'CH-01', name: 'Chiller Plant 1', type: 'HVAC', pof: 12, rul: '14 months', status: 'Normal' },
    { id: 'CH-02', name: 'Chiller Plant 2', type: 'HVAC', pof: 85, rul: '12 days', status: 'Critical' },
    { id: 'GEN-A', name: 'Backup Generator A', type: 'Power', pof: 45, rul: '3 months', status: 'Warning' },
    { id: 'UPS-01', name: 'Main UPS 1', type: 'Power', pof: 5, rul: '3 years', status: 'Normal' },
    { id: 'PUMP-CW-1', name: 'Condenser Water Pump', type: 'Plumbing', pof: 60, rul: '45 days', status: 'Warning' },
];

const mockTrendData = Array.from({ length: 30 }).map((_, i) => ({
    day: `Day ${i + 1}`,
    vibration: 2.0 + Math.random() * (i < 20 ? 0.5 : 2.5), // Spike after day 20
    temperature: 45 + Math.random() * (i < 20 ? 5 : 15),
}));

export default function PredictiveMaintenance() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const router = useRouter();
    
    const [selectedEquipment, setSelectedEquipment] = useState(mockEquipmentList[1]);

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const handleCreateWorkOrder = () => {
        router.push(`/admin/pm/backlog?autoCreateTask=${encodeURIComponent(`Inspect ${selectedEquipment.name} due to high PoF (${selectedEquipment.pof}%)`)}`);
    };

    const bentoItems = mockEquipmentList.map((item, i) => ({
        name: item.name,
        description: `ID: ${item.id} | Type: ${item.type}`,
        icon: item.status === 'Critical' ? <WarningOutlined style={{ color: '#ff4d4f' }} /> : item.status === 'Warning' ? <SyncOutlined style={{ color: '#faad14' }} /> : <CheckCircleOutlined style={{ color: '#52c41a' }} />,
        background: (
            <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.1, fontSize: 120 }}>
                <ThunderboltOutlined />
            </div>
        ),
        href: '#',
        cta: 'View Analysis',
        className: i === 1 || i === 4 ? "col-span-2" : "col-span-1",
        onClick: () => setSelectedEquipment(item)
    }));

    return (
        <CMSLayout
            title={<AuroraText>Predictive Maintenance</AuroraText>}
            subTitle={<DecryptedText text="AI-Driven Equipment Failure Forecasting" speed={60} />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Row gutter={[24, 24]}>
                    {/* Left: Asset List (Bento Grid) */}
                    <Col xs={24} lg={14}>
                        <Card title="Asset Health Overview" style={glassStyle} bordered={false}>
                            <BentoGrid className="lg:grid-rows-2">
                                {bentoItems.map((feature, idx) => (
                                    <div key={idx} onClick={feature.onClick} style={{ cursor: 'pointer' }}>
                                        <BentoGridItem {...feature} className={feature.className + (selectedEquipment.name === feature.name ? ' ring-2 ring-primary' : '')} />
                                    </div>
                                ))}
                            </BentoGrid>
                        </Card>
                    </Col>

                    {/* Right: AI Analysis Panel */}
                    <Col xs={24} lg={10}>
                        <Card 
                            title={<Space><ThunderboltOutlined style={{ color: themeColor }} /> <span>AI Diagnostics: {selectedEquipment.name}</span></Space>}
                            style={{ ...glassStyle, height: '100%' }} 
                            bordered={false}
                            extra={<Tag color={selectedEquipment.pof > 80 ? 'red' : 'green'}>PoF: {selectedEquipment.pof}%</Tag>}
                        >
                            <div style={{ marginBottom: 24 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Vibration Anomaly Detection (Last 30 Days)</Text>
                                <div style={{ height: 200, width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={mockTrendData}>
                                            <defs>
                                                <linearGradient id="colorVib" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={selectedEquipment.pof > 80 ? '#ff4d4f' : themeColor} stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor={selectedEquipment.pof > 80 ? '#ff4d4f' : themeColor} stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
                                            <XAxis dataKey="day" hide />
                                            <YAxis />
                                            <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', border: 'none', borderRadius: 8 }} />
                                            <Area type="monotone" dataKey="vibration" stroke={selectedEquipment.pof > 80 ? '#ff4d4f' : themeColor} fillOpacity={1} fill="url(#colorVib)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div style={{ background: isDark ? 'rgba(255,77,79,0.1)' : 'rgba(255,77,79,0.05)', padding: 16, borderRadius: 12, border: `1px solid ${selectedEquipment.pof > 80 ? '#ff4d4f' : 'transparent'}` }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>LLM Root Cause Analysis</Text>
                                {selectedEquipment.pof > 80 ? (
                                    <Typography.Paragraph style={{ margin: 0 }}>
                                        <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                                        The ML model detected an abnormal increase in bearing vibration signatures starting on Day 21. 
                                        Historically, this signature correlates with a 85% probability of compressor failure within 14 days. 
                                        <strong>Recommendation:</strong> Schedule immediate bearing inspection and lubrication.
                                    </Typography.Paragraph>
                                ) : (
                                    <Typography.Paragraph style={{ margin: 0 }}>
                                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                                        All telemetry parameters (vibration, temperature, current draw) are operating within the nominal baseline. No immediate maintenance required.
                                    </Typography.Paragraph>
                                )}
                            </div>

                            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                                <Button type="primary" danger={selectedEquipment.pof > 80} onClick={handleCreateWorkOrder}>Generate PM Work Order</Button>
                                <Button>View P&ID Schematic</Button>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
