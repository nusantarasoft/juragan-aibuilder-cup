"use client";

import React from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Row, Col, Card, Statistic, Table, Progress, Space, Badge, Typography } from "antd";
import { ThunderboltOutlined, WarningOutlined, SyncOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend } from 'recharts';

const { Text } = Typography;

const animStyle = `
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
.power-flow { stroke-dasharray: 8; animation: flow 2s linear infinite; }
@keyframes flow { to { stroke-dashoffset: -16; } }
`;

export default function DcimPower() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    // Demo Data
    const upsData = [
        { name: 'UPS A', fill: '#52c41a', value: 85 },
        { name: 'UPS B', fill: '#1890ff', value: 72 },
        { name: 'UPS C', fill: '#faad14', value: 45 },
    ];

    const pduData = [
        { id: 'PDU-A1', location: 'Row A', load: 65, status: 'Normal', draw: '4.2 kW', voltage: '230 V' },
        { id: 'PDU-A2', location: 'Row A', load: 88, status: 'Warning', draw: '6.1 kW', voltage: '229 V' },
        { id: 'PDU-B1', location: 'Row B', load: 42, status: 'Normal', draw: '3.1 kW', voltage: '231 V' },
        { id: 'PDU-B2', location: 'Row B', load: 95, status: 'Critical', draw: '7.4 kW', voltage: '228 V' },
    ];

    const powerTrend = Array.from({ length: 24 }).map((_, i) => ({
        time: `${i}:00`,
        pduA: 200 + Math.random() * 50,
        pduB: 180 + Math.random() * 60,
    }));

    return (
        <CMSLayout 
            title={<AuroraText>Power Monitoring</AuroraText>}
            subTitle={<DecryptedText text="Real-time Electrical Infrastructure" speed={60} />}
        >
            <style>{animStyle}</style>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Total Facility Power" value={1240} suffix="kW" valueStyle={{ color: themeColor, fontSize: 36, fontWeight: 'bold' }} prefix={<ThunderboltOutlined />} />
                            <Progress percent={62} strokeColor={themeColor} showInfo={false} style={{ marginTop: 12 }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                <Text type="secondary">Capacity: 2000 kW</Text>
                                <Text type="secondary">62% Utilized</Text>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="IT Load (UPS)" value={840} suffix="kW" valueStyle={{ color: '#1890ff', fontSize: 36, fontWeight: 'bold' }} />
                            <Progress percent={70} strokeColor="#1890ff" showInfo={false} style={{ marginTop: 12 }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                <Text type="secondary">Capacity: 1200 kW</Text>
                                <Text type="secondary">70% Utilized</Text>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Cooling Load" value={350} suffix="kW" valueStyle={{ color: '#52c41a', fontSize: 36, fontWeight: 'bold' }} />
                            <Progress percent={43} strokeColor="#52c41a" showInfo={false} style={{ marginTop: 12 }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                <Text type="secondary">Capacity: 800 kW</Text>
                                <Text type="secondary">43% Utilized</Text>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={8}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <Card title="UPS Battery Status" style={glassStyle} bordered={false}>
                            <div style={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="100%" barSize={20} data={upsData} startAngle={180} endAngle={0}>
                                        <RadialBar background={{ fill: isDark ? '#333' : '#eee' }} dataKey="value" />
                                        <Legend iconSize={10} width={120} height={140} layout="vertical" verticalAlign="middle" align="right" />
                                        <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 8, border: 'none' }} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
                
                <Col xs={24} lg={16}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                        <Card title="Power Feed Draw (Last 24h)" style={glassStyle} bordered={false}>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={powerTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorPduA" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={themeColor} stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorPduB" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#1890ff" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#eee'} />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 8, border: 'none' }} />
                                        <Area type="monotone" dataKey="pduA" stroke={themeColor} fillOpacity={1} fill="url(#colorPduA)" name="Feed A" />
                                        <Area type="monotone" dataKey="pduB" stroke="#1890ff" fillOpacity={1} fill="url(#colorPduB)" name="Feed B" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col span={24}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                        <Card title="Rack PDU Status" style={glassStyle} bordered={false}>
                            <Table 
                                dataSource={pduData} 
                                pagination={false} 
                                rowKey="id"
                                columns={[
                                    { title: 'PDU ID', dataIndex: 'id', render: (t) => <Text strong>{t}</Text> },
                                    { title: 'Location', dataIndex: 'location' },
                                    { title: 'Voltage', dataIndex: 'voltage' },
                                    { title: 'Current Draw', dataIndex: 'draw' },
                                    { title: 'Load Profile', dataIndex: 'load', width: '30%', render: (val) => (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Progress percent={val} strokeColor={val > 90 ? '#ff4d4f' : val > 80 ? '#faad14' : '#52c41a'} style={{ flex: 1, marginBottom: 0 }} />
                                        </div>
                                    )},
                                    { title: 'Status', dataIndex: 'status', render: (t) => <Badge status={t === 'Critical' ? 'error' : t === 'Warning' ? 'warning' : 'success'} text={t} /> },
                                ]}
                            />
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </CMSLayout>
    );
}
