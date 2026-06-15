"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Table, Button, Space, Typography, Tag, Row, Col, Statistic, Progress } from "antd";
import { ExperimentOutlined, WarningOutlined, FilterOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Text } = Typography;

export default function BmsWater() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const waterSystems = [
        { id: 'WT-01', name: 'Roof Main Tank', level: 85, pumpStatus: 'Auto (Off)', quality: 'Good' },
        { id: 'WT-02', name: 'Basement Storage Tank', level: 92, pumpStatus: 'Auto (On)', quality: 'Good' },
        { id: 'WT-03', name: 'Greywater Recycling', level: 45, pumpStatus: 'Manual (Off)', quality: 'Fair' },
        { id: 'WT-04', name: 'Fire Suppression Tank', level: 100, pumpStatus: 'Standby', quality: 'Good' },
    ];

    const leakSensors = [
        { id: 'LS-01', loc: 'Server Room Underfloor', status: 'Dry' },
        { id: 'LS-02', loc: 'Basement Pump Room', status: 'Dry' },
        { id: 'LS-03', loc: 'Pantry L12', status: 'Wet - Alarm', time: '10 mins ago' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Water & Plumbing Systems</AuroraText>}
            subTitle={<DecryptedText text="Tank Levels, Pumps, and Leak Detection" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Total Daily Consumption" value={14520} suffix="L" valueStyle={{ color: '#1890ff' }} prefix={<FilterOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Avg Tank Level" value={80} suffix="%" valueStyle={{ color: themeColor }} prefix={<ExperimentOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={{...glassStyle, borderColor: '#f5222d'}} bordered={true}>
                            <Statistic title="Active Leak Alarms" value={1} valueStyle={{ color: '#f5222d', fontWeight: 'bold' }} prefix={<WarningOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={16}>
                        <Card title="Tanks & Pumps" style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                            <Table 
                                dataSource={waterSystems} 
                                pagination={false}
                                rowKey="id"
                                columns={[
                                    { title: 'System Name', dataIndex: 'name', render: (t) => <strong>{t}</strong> },
                                    { title: 'Level', dataIndex: 'level', render: (t) => <Progress percent={t} size="small" status={t < 30 ? 'exception' : 'normal'} /> },
                                    { title: 'Pump Status', dataIndex: 'pumpStatus' },
                                    { title: 'Water Quality', dataIndex: 'quality', render: (t) => <Tag color={t === 'Good' ? 'green' : 'orange'}>{t}</Tag> },
                                ]}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card title="Leak Detection" style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                            <Table 
                                dataSource={leakSensors} 
                                pagination={false}
                                rowKey="id"
                                columns={[
                                    { title: 'Location', dataIndex: 'loc' },
                                    { title: 'Status', dataIndex: 'status', render: (t, r) => (
                                        <Tag color={t.includes('Wet') ? 'red' : 'green'}>{t}</Tag>
                                    )},
                                ]}
                            />
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
