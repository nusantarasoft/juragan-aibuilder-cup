"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Row, Col, Card, Statistic, Progress, Button, Table, Typography, Space, Select } from "antd";
import { DatabaseOutlined, ThunderboltOutlined, CompressOutlined, RocketOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

const { Text } = Typography;

export default function DcimCapacity() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const capacityData = [
        { name: 'Row A', space: 85, power: 72, cooling: 60 },
        { name: 'Row B', space: 60, power: 88, cooling: 75 },
        { name: 'Row C', space: 45, power: 40, cooling: 35 },
        { name: 'Row D', space: 90, power: 95, cooling: 85 },
        { name: 'Row E', space: 20, power: 15, cooling: 10 },
    ];

    const upcomingDeployments = [
        { key: '1', project: 'AI Cluster Expansion', reqSpace: '80 U', reqPower: '60 kW', date: '2026-07-15', status: 'Approved' },
        { key: '2', project: 'Storage Refresh (SAN)', reqSpace: '12 U', reqPower: '8 kW', date: '2026-08-01', status: 'Planning' },
        { key: '3', project: 'Network Core Upgrade', reqSpace: '8 U', reqPower: '4 kW', date: '2026-08-10', status: 'Pending Review' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Capacity Planning</AuroraText>}
            subTitle={<DecryptedText text="Resource Forecasting & What-If Analysis" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Space Capacity Remaining" value={22} suffix="%" valueStyle={{ color: '#1890ff', fontSize: 32 }} prefix={<DatabaseOutlined />} />
                            <Progress percent={78} strokeColor="#1890ff" showInfo={false} style={{ marginTop: 8 }} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Power Capacity Remaining" value={35} suffix="%" valueStyle={{ color: '#ff4d4f', fontSize: 32 }} prefix={<ThunderboltOutlined />} />
                            <Progress percent={65} strokeColor="#ff4d4f" showInfo={false} style={{ marginTop: 8 }} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Cooling Capacity Remaining" value={43} suffix="%" valueStyle={{ color: '#52c41a', fontSize: 32 }} prefix={<CompressOutlined />} />
                            <Progress percent={57} strokeColor="#52c41a" showInfo={false} style={{ marginTop: 8 }} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} style={{ height: '100%' }}>
                        <Card title="Resource Utilization by Row" style={{...glassStyle, height: '100%'}} bordered={false} extra={<Select defaultValue="hall_a" options={[{label: 'Server Hall A', value: 'hall_a'}]} />}>
                            <div style={{ height: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={capacityData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#eee'} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 8, border: 'none' }} />
                                        <Legend />
                                        <Bar dataKey="space" name="Space %" fill="#1890ff" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="power" name="Power %" fill="#ff4d4f" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="cooling" name="Cooling %" fill="#52c41a" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>
                </Col>

                <Col xs={24} lg={8}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} style={{ height: '100%' }}>
                        <Card title="Upcoming Deployments" style={{...glassStyle, height: '100%'}} bordered={false} extra={<Button type="primary" size="small" style={{ background: themeColor }}>+ New Project</Button>}>
                            <Table 
                                dataSource={upcomingDeployments} 
                                pagination={false} 
                                columns={[
                                    { title: 'Project', dataIndex: 'project', render: (t) => <Text strong>{t}</Text> },
                                    { title: 'Target Date', dataIndex: 'date' },
                                    { title: 'Requirements', key: 'reqs', render: (_, r) => (
                                        <Space direction="vertical" size={0}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{r.reqSpace}</Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{r.reqPower}</Text>
                                        </Space>
                                    )}
                                ]}
                            />
                            <Button block type="dashed" style={{ marginTop: 16 }} icon={<RocketOutlined />}>Run What-If Analysis</Button>
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </CMSLayout>
    );
}
