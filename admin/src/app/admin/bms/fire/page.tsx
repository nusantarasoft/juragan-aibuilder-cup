"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Table, Button, Space, Typography, Tag, Row, Col, Statistic, Badge } from "antd";
import { FireOutlined, WarningOutlined, SafetyCertificateOutlined, SoundOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Text } = Typography;

export default function BmsFireSafety() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const fireZones = [
        { id: 'FZ-01', name: 'Server Room', detectors: 12, suppression: 'FM-200', status: 'Normal', lastTest: '2026-05-15' },
        { id: 'FZ-02', name: 'Electrical Room Main', detectors: 6, suppression: 'Inergen', status: 'Normal', lastTest: '2026-05-15' },
        { id: 'FZ-03', name: 'Open Office North', detectors: 24, suppression: 'Sprinkler (Wet)', status: 'Pre-Alarm', lastTest: '2026-06-01' },
        { id: 'FZ-04', name: 'Cafeteria Kitchen', detectors: 4, suppression: 'Chemical', status: 'Normal', lastTest: '2026-06-01' },
        { id: 'FZ-05', name: 'Lobby', detectors: 8, suppression: 'Sprinkler (Wet)', status: 'Normal', lastTest: '2026-06-01' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Fire & Safety Systems</AuroraText>}
            subTitle={<DecryptedText text="Detection, Alarms, and Suppression" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={{...glassStyle, borderColor: '#f5222d'}} bordered={true}>
                            <Statistic title="Active Fire Alarms" value={0} valueStyle={{ color: '#f5222d', fontWeight: 'bold' }} prefix={<FireOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Pre-Alarms / Faults" value={1} valueStyle={{ color: '#faad14' }} prefix={<WarningOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="System Status" value="Healthy" valueStyle={{ color: '#52c41a' }} prefix={<SafetyCertificateOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                        <Button icon={<SoundOutlined />}>Sound Evacuation</Button>
                        <Button type="primary" danger style={{ background: '#f5222d' }}>System Reset</Button>
                    </div>
                    <Table 
                        dataSource={fireZones} 
                        pagination={false}
                        rowKey="id"
                        columns={[
                            { title: 'Fire Zone', dataIndex: 'name', render: (t) => <strong>{t}</strong> },
                            { title: 'Detectors', dataIndex: 'detectors' },
                            { title: 'Suppression Type', dataIndex: 'suppression' },
                            { title: 'Last Tested', dataIndex: 'lastTest' },
                            { title: 'Status', dataIndex: 'status', render: (t) => (
                                <Badge status={t === 'Normal' ? 'success' : t === 'Pre-Alarm' ? 'warning' : 'error'} text={t} />
                            )},
                            { title: 'Actions', render: () => (
                                <Space>
                                    <Button size="small">Isolate</Button>
                                    <Button size="small" type="primary" ghost>Test Trigger</Button>
                                </Space>
                            )}
                        ]}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
