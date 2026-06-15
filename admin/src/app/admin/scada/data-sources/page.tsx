"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Table, Button, Space, Typography, Tag, Badge, Input, Tooltip } from "antd";
import { ApiOutlined, PlusOutlined, EditOutlined, DeleteOutlined, SyncOutlined, SearchOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Text } = Typography;

export default function ScadaDataSources() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const dataSources = [
        { id: 'DS-001', name: 'PLC-Core-A', protocol: 'OPC-UA', host: 'opc.tcp://10.0.1.10:4840', scanRate: '500ms', tags: 1245, status: 'Connected', lastPing: '12ms' },
        { id: 'DS-002', name: 'PLC-Core-B', protocol: 'OPC-UA', host: 'opc.tcp://10.0.1.11:4840', scanRate: '500ms', tags: 1245, status: 'Connected', lastPing: '14ms' },
        { id: 'DS-003', name: 'BMS-Gateway', protocol: 'BACnet/IP', host: '10.0.2.50', scanRate: '1000ms', tags: 840, status: 'Connected', lastPing: '45ms' },
        { id: 'DS-004', name: 'Power-Mtr-Main', protocol: 'Modbus TCP', host: '10.0.3.15:502', scanRate: '200ms', tags: 150, status: 'Connected', lastPing: '8ms' },
        { id: 'DS-005', name: 'IoT-Env-Hub', protocol: 'MQTT', host: 'mqtt://10.0.5.100:1883', scanRate: 'On Change', tags: 420, status: 'Warning', lastPing: '250ms' },
        { id: 'DS-006', name: 'Legacy-Chiller', protocol: 'Modbus RTU over TCP', host: '10.0.3.22:502', scanRate: '5000ms', tags: 45, status: 'Disconnected', lastPing: 'Timeout' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Data Sources & OPC Configuration</AuroraText>}
            subTitle={<DecryptedText text="Connectivity & Protocol Management" speed={60} />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                        <Input placeholder="Search sources, hosts..." prefix={<SearchOutlined />} style={{ width: 300, borderRadius: 8 }} />
                        <Space>
                            <Button icon={<SyncOutlined />}>Ping All</Button>
                            <Button type="primary" icon={<PlusOutlined />} style={{ background: themeColor }}>Add Source</Button>
                        </Space>
                    </div>
                    <Table 
                        dataSource={dataSources} 
                        pagination={false}
                        rowKey="id"
                        columns={[
                            { title: 'Source Name', dataIndex: 'name', render: (t) => <a style={{ color: themeColor, fontWeight: 500 }}>{t}</a> },
                            { title: 'Protocol', dataIndex: 'protocol', render: (t) => (
                                <Tag color={t.includes('OPC') ? 'blue' : t.includes('Modbus') ? 'green' : t.includes('BACnet') ? 'orange' : 'purple'}>{t}</Tag>
                            )},
                            { title: 'Endpoint / Host', dataIndex: 'host', render: (t) => <Text code>{t}</Text> },
                            { title: 'Scan Rate', dataIndex: 'scanRate' },
                            { title: 'Active Tags', dataIndex: 'tags' },
                            { title: 'Status', dataIndex: 'status', render: (t, r) => (
                                <Space>
                                    <Badge status={t === 'Connected' ? 'success' : t === 'Warning' ? 'warning' : 'error'} />
                                    <span>{t}</span>
                                    <Text type="secondary" style={{ fontSize: 11 }}>({r.lastPing})</Text>
                                </Space>
                            )},
                            { title: 'Actions', render: () => (
                                <Space>
                                    <Tooltip title="Edit Source"><Button size="small" type="text" icon={<EditOutlined />} /></Tooltip>
                                    <Tooltip title="View Tags"><Button size="small" type="text" icon={<ApiOutlined />} /></Tooltip>
                                    <Tooltip title="Delete"><Button size="small" type="text" danger icon={<DeleteOutlined />} /></Tooltip>
                                </Space>
                            )}
                        ]}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
