"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Row, Col, Card, Statistic, Badge, Space, Typography, Table, Button, Input, Select } from "antd";
import { AlertOutlined, SearchOutlined, CheckCircleOutlined, AudioMutedOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Text } = Typography;

export default function ScadaAlarms() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const alarmData = [
        { id: '10291', time: '2026-06-13 10:23:45', tag: 'PLC_01.Temp.Zone3', desc: 'High Temperature Limit Exceeded', priority: 'Critical', state: 'UNACK_ALM', val: '34.2 °C', setpoint: '30.0 °C' },
        { id: '10290', time: '2026-06-13 09:45:12', tag: 'PMP_CHW_02.VFD.Speed', desc: 'VFD Speed Deviation > 5%', priority: 'High', state: 'ACK_ALM', val: '45 Hz', setpoint: '50 Hz' },
        { id: '10289', time: '2026-06-13 08:15:00', tag: 'SYS.COM.MODBUS.Node4', desc: 'Communication Timeout (30s)', priority: 'High', state: 'UNACK_RTN', val: 'Timeout', setpoint: 'N/A' },
        { id: '10288', time: '2026-06-13 06:10:22', tag: 'UPS_A.Batt.Charge', desc: 'Battery Charge Low', priority: 'Medium', state: 'ACK_RTN', val: '45 %', setpoint: '50 %' },
        { id: '10287', time: '2026-06-12 23:55:10', tag: 'GEN_01.Fuel.Lvl', desc: 'Fuel Tank Low Warning', priority: 'Medium', state: 'ACK_ALM', val: '18 %', setpoint: '20 %' },
    ];

    const getRowStyle = (state: string, priority: string) => {
        if (state.includes('UNACK')) {
            if (priority === 'Critical') return { background: isDark ? 'rgba(245, 34, 45, 0.2)' : 'rgba(245, 34, 45, 0.1)' };
            if (priority === 'High') return { background: isDark ? 'rgba(250, 173, 20, 0.2)' : 'rgba(250, 173, 20, 0.1)' };
        }
        return {};
    };

    return (
        <CMSLayout 
            title={<AuroraText>Alarm Management</AuroraText>}
            subTitle={<DecryptedText text="SCADA Event & Fault Tracking" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={{...glassStyle, borderColor: '#f5222d'}} bordered={true}>
                            <Statistic title="Unacknowledged Critical" value={1} valueStyle={{ color: '#f5222d', fontWeight: 'bold' }} prefix={<AlertOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Total Active Alarms" value={4} valueStyle={{ color: '#faad14' }} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Alarms (Last 24h)" value={18} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Avg Response Time" value="4.2" suffix="mins" valueStyle={{ color: themeColor }} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <Space>
                            <Input placeholder="Search tags, desc..." prefix={<SearchOutlined />} style={{ width: 250 }} />
                            <Select defaultValue="all" options={[{label: 'All States', value: 'all'}, {label: 'Unacknowledged', value: 'unack'}, {label: 'Active', value: 'active'}]} style={{ width: 150 }} />
                            <Select defaultValue="all" options={[{label: 'All Priorities', value: 'all'}, {label: 'Critical', value: 'crit'}, {label: 'High', value: 'high'}]} style={{ width: 150 }} />
                        </Space>
                        <Space>
                            <Button icon={<AudioMutedOutlined />}>Silence Horn</Button>
                            <Button type="primary" icon={<CheckCircleOutlined />} style={{ background: themeColor }}>Acknowledge All</Button>
                        </Space>
                    </div>
                    <Table 
                        dataSource={alarmData} 
                        pagination={{ pageSize: 15 }}
                        rowKey="id"
                        onRow={(record) => ({ style: getRowStyle(record.state, record.priority) })}
                        columns={[
                            { title: 'ID', dataIndex: 'id', width: 80 },
                            { title: 'Timestamp', dataIndex: 'time', width: 160 },
                            { title: 'State', dataIndex: 'state', width: 120, render: (t) => (
                                <Badge status={t.includes('UNACK') ? 'error' : (t.includes('ALM') ? 'warning' : 'success')} text={t} />
                            )},
                            { title: 'Priority', dataIndex: 'priority', width: 100, render: (t) => (
                                <span style={{ color: t === 'Critical' ? '#f5222d' : t === 'High' ? '#faad14' : 'inherit', fontWeight: t === 'Critical' ? 'bold' : 'normal' }}>{t}</span>
                            )},
                            { title: 'Tag / Source', dataIndex: 'tag', width: 200, render: (t) => <Text code>{t}</Text> },
                            { title: 'Description', dataIndex: 'desc' },
                            { title: 'Value', dataIndex: 'val', width: 100 },
                            { title: 'Limit', dataIndex: 'setpoint', width: 100 },
                            { title: 'Action', width: 100, render: (_, r) => (
                                <Button size="small" type={r.state.includes('UNACK') ? 'primary' : 'default'} disabled={!r.state.includes('UNACK')}>ACK</Button>
                            )}
                        ]}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
