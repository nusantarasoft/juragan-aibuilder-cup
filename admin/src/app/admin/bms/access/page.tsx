"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Table, Button, Space, Typography, Tag, Row, Col, Statistic, Switch } from "antd";
import { SafetyOutlined, LockOutlined, UnlockOutlined, UserOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Text } = Typography;

export default function BmsAccessControl() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const doors = [
        { id: 'DR-01', name: 'Main Lobby Entrance', readers: 2, state: 'Locked', override: false, lastEvent: 'Alice (10:42 AM)' },
        { id: 'DR-02', name: 'Server Room Door', readers: 1, state: 'Locked', override: false, lastEvent: 'Bob (09:15 AM)' },
        { id: 'DR-03', name: 'Loading Dock', readers: 2, state: 'Unlocked', override: true, lastEvent: 'Guard Override (08:00 AM)' },
        { id: 'DR-04', name: 'Executive Suite', readers: 1, state: 'Locked', override: false, lastEvent: 'Charlie (10:05 AM)' },
        { id: 'DR-05', name: 'Stairwell A (Floor 1)', readers: 1, state: 'Locked', override: false, lastEvent: 'David (09:45 AM)' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Access Control</AuroraText>}
            subTitle={<DecryptedText text="Doors, Readers, and Physical Security" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Total Access Events (Today)" value={1420} valueStyle={{ color: themeColor }} prefix={<UserOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Doors Unlocked" value={1} suffix="/ 5" valueStyle={{ color: '#faad14' }} prefix={<UnlockOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Security Level" value="Normal" valueStyle={{ color: '#52c41a' }} prefix={<SafetyOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                        <Button type="default" icon={<UnlockOutlined />}>Unlock All Doors</Button>
                        <Button type="primary" danger icon={<LockOutlined />} style={{ background: '#f5222d' }}>Global Lockdown</Button>
                    </div>
                    <Table 
                        dataSource={doors} 
                        pagination={false}
                        rowKey="id"
                        columns={[
                            { title: 'Door Location', dataIndex: 'name', render: (t) => <strong>{t}</strong> },
                            { title: 'State', dataIndex: 'state', render: (t) => (
                                <Tag color={t === 'Locked' ? 'green' : 'orange'} icon={t === 'Locked' ? <LockOutlined /> : <UnlockOutlined />}>{t}</Tag>
                            )},
                            { title: 'Last Event', dataIndex: 'lastEvent' },
                            { title: 'Schedule Override', dataIndex: 'override', render: (t) => <Switch checkedChildren="ON" unCheckedChildren="OFF" defaultChecked={t} /> },
                            { title: 'Actions', render: () => (
                                <Space>
                                    <Button size="small">Pulse (Open)</Button>
                                    <Button size="small">View Logs</Button>
                                </Space>
                            )}
                        ]}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
