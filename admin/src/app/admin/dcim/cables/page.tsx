"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Table, Button, Space, Typography, Tag, Row, Col, Statistic, Select, Input } from "antd";
import { ApiOutlined, LinkOutlined, DisconnectOutlined, SearchOutlined, SwapOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Text } = Typography;

export default function DcimCables() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const cableData = [
        { id: 'CBL-001042', type: 'Cat6A (UTP)', color: 'Blue', source: 'SW-CORE-01 (Port 12)', dest: 'SRV-DB-04 (eth0)', length: '4.5m', status: 'Connected' },
        { id: 'CBL-001043', type: 'Cat6A (UTP)', color: 'Blue', source: 'SW-CORE-01 (Port 13)', dest: 'SRV-APP-12 (eth0)', length: '6.0m', status: 'Connected' },
        { id: 'CBL-001044', type: 'OS2 Single-Mode Fiber', color: 'Yellow', source: 'RTR-EDGE-A (eth1/1)', dest: 'SW-CORE-01 (uplink1)', length: '12.0m', status: 'Connected' },
        { id: 'CBL-001045', type: 'C13 to C14 Power', color: 'Black', source: 'PDU-A-14 (Outlet 4)', dest: 'SRV-DB-04 (PSU1)', length: '1.5m', status: 'Connected' },
        { id: 'CBL-001046', type: 'C13 to C14 Power', color: 'Black', source: 'PDU-B-14 (Outlet 4)', dest: 'SRV-DB-04 (PSU2)', length: '2.0m', status: 'Connected' },
        { id: 'CBL-001047', type: 'Cat6A (UTP)', color: 'Red', source: 'SW-OOB-01 (Port 5)', dest: 'SRV-DB-04 (iLO)', length: '5.0m', status: 'Disconnected' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Cable Management</AuroraText>}
            subTitle={<DecryptedText text="Network & Power Connectivity Tracing" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Total Cables Logged" value={14240} valueStyle={{ color: themeColor }} prefix={<ApiOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Active Connections" value={13850} valueStyle={{ color: '#52c41a' }} prefix={<LinkOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Disconnected / Orphaned" value={390} valueStyle={{ color: '#faad14' }} prefix={<DisconnectOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <Space>
                            <Input placeholder="Search Cable ID, Device..." prefix={<SearchOutlined />} style={{ width: 300 }} />
                            <Select defaultValue="all" options={[{label: 'All Types', value: 'all'}, {label: 'Network', value: 'net'}, {label: 'Power', value: 'pwr'}]} style={{ width: 150 }} />
                        </Space>
                        <Space>
                            <Button icon={<SwapOutlined />}>Trace Connection</Button>
                            <Button type="primary" style={{ background: themeColor }}>Log New Cable</Button>
                        </Space>
                    </div>
                    <Table 
                        dataSource={cableData} 
                        pagination={{ pageSize: 15 }}
                        rowKey="id"
                        columns={[
                            { title: 'Cable ID', dataIndex: 'id', render: (t) => <Text code>{t}</Text> },
                            { title: 'Type', dataIndex: 'type' },
                            { title: 'Color', dataIndex: 'color', render: (t) => (
                                <Space><div style={{ width: 12, height: 12, borderRadius: '50%', background: t.toLowerCase() === 'black' ? (isDark ? '#fff' : '#000') : t.toLowerCase() }} />{t}</Space>
                            )},
                            { title: 'Source (A-End)', dataIndex: 'source', render: (t) => <strong>{t}</strong> },
                            { title: 'Destination (Z-End)', dataIndex: 'dest', render: (t) => <strong>{t}</strong> },
                            { title: 'Length', dataIndex: 'length' },
                            { title: 'Status', dataIndex: 'status', render: (t) => (
                                <Tag color={t === 'Connected' ? 'green' : 'orange'} icon={t === 'Connected' ? <LinkOutlined /> : <DisconnectOutlined />}>{t}</Tag>
                            )},
                            { title: 'Actions', render: () => <Button size="small" type="link">Details</Button> }
                        ]}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
