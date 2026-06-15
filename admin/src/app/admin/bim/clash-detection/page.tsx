"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Table, Button, Space, Badge, Select, Typography, Row, Col, Statistic } from "antd";
import { BugOutlined, CheckCircleOutlined, SettingOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Text } = Typography;

export default function BimClashDetection() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const clashData = [
        { id: 'CL-1001', type: 'Hard', elemA: 'HVAC Duct (Supply)', elemB: 'Structural Beam (B-12)', sev: 'High', status: 'Open', dist: '-45mm' },
        { id: 'CL-1002', type: 'Clearance', elemA: 'Chilled Water Pipe', elemB: 'Cable Tray', sev: 'Medium', status: 'Reviewed', dist: '10mm (Req: 50mm)' },
        { id: 'CL-1003', type: 'Hard', elemA: 'Fire Sprinkler Pipe', elemB: 'Ceiling Grid', sev: 'Low', status: 'Resolved', dist: '0mm' },
        { id: 'CL-1004', type: 'Hard', elemA: 'Plumbing (Drain)', elemB: 'Electrical Conduit', sev: 'High', status: 'Open', dist: '-12mm' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Clash Detection</AuroraText>}
            subTitle={<DecryptedText text="Interference Checking & Resolution" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={{...glassStyle, borderColor: '#f5222d'}} bordered={true}>
                            <Statistic title="Open Hard Clashes" value={42} valueStyle={{ color: '#f5222d', fontWeight: 'bold' }} prefix={<BugOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Clearance Issues" value={18} valueStyle={{ color: '#faad14' }} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Resolved This Week" value={105} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'space-between' }}>
                        <Space>
                            <Select defaultValue="all" options={[{label: 'All Models vs All', value: 'all'}, {label: 'Arch vs MEP', value: 'mep'}]} style={{ width: 200 }} />
                            <Select defaultValue="open" options={[{label: 'Open Clashes', value: 'open'}, {label: 'Resolved', value: 'resolved'}]} style={{ width: 150 }} />
                        </Space>
                        <Button type="primary" icon={<SettingOutlined />} style={{ background: themeColor }}>Run Clash Test</Button>
                    </div>
                    <Table 
                        dataSource={clashData} 
                        pagination={false}
                        rowKey="id"
                        columns={[
                            { title: 'Clash ID', dataIndex: 'id', render: (t) => <strong>{t}</strong> },
                            { title: 'Type', dataIndex: 'type' },
                            { title: 'Element A', dataIndex: 'elemA' },
                            { title: 'Element B', dataIndex: 'elemB' },
                            { title: 'Severity', dataIndex: 'sev', render: (t) => <span style={{ color: t === 'High' ? '#f5222d' : t === 'Medium' ? '#faad14' : 'inherit', fontWeight: t === 'High' ? 'bold' : 'normal' }}>{t}</span> },
                            { title: 'Intersection', dataIndex: 'dist' },
                            { title: 'Status', dataIndex: 'status', render: (t) => <Badge status={t === 'Open' ? 'error' : t === 'Resolved' ? 'success' : 'processing'} text={t} /> },
                            { title: 'Actions', render: () => (
                                <Space>
                                    <Button size="small">View in 3D</Button>
                                    <Button size="small">Assign</Button>
                                </Space>
                            )}
                        ]}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
