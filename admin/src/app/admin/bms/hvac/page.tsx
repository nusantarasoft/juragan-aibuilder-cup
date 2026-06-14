"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Table, Button, Space, Typography, Tag, Row, Col, Statistic, Slider, Switch, Select } from "antd";
import { CloudOutlined, SettingOutlined, WarningOutlined, SyncOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Text } = Typography;

export default function BmsHvac() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const hvacZones = [
        { id: 'Z-01', name: 'Open Office North', temp: 23.5, setpoint: 24.0, humidity: 45, co2: 420, mode: 'Auto', status: 'Cooling' },
        { id: 'Z-02', name: 'Executive Boardroom', temp: 22.0, setpoint: 22.0, humidity: 50, co2: 600, mode: 'Auto', status: 'Standby' },
        { id: 'Z-03', name: 'Server Room', temp: 19.5, setpoint: 20.0, humidity: 40, co2: 380, mode: 'Override', status: 'Cooling' },
        { id: 'Z-04', name: 'Cafeteria', temp: 25.1, setpoint: 23.5, humidity: 55, co2: 800, mode: 'Auto', status: 'Cooling' },
        { id: 'Z-05', name: 'Lobby', temp: 24.5, setpoint: 24.0, humidity: 48, co2: 410, mode: 'Off', status: 'Off' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>HVAC Controls</AuroraText>}
            subTitle={<DecryptedText text="Heating, Ventilation, and Air Conditioning" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Avg Building Temp" value={23.2} suffix="°C" valueStyle={{ color: themeColor }} prefix={<CloudOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Active Cooling Units" value={12} suffix="/ 15" valueStyle={{ color: '#1890ff' }} prefix={<SyncOutlined spin />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="IAQ Alerts" value={1} valueStyle={{ color: '#faad14' }} prefix={<WarningOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <Space>
                            <Select defaultValue="all" options={[{label: 'All Floors', value: 'all'}, {label: 'Floor 1', value: 'f1'}, {label: 'Floor 2', value: 'f2'}]} style={{ width: 150 }} />
                        </Space>
                        <Space>
                            <Button icon={<SettingOutlined />}>Global Schedule</Button>
                            <Button type="primary" style={{ background: themeColor }}>Master Override</Button>
                        </Space>
                    </div>
                    <Table 
                        dataSource={hvacZones} 
                        pagination={false}
                        rowKey="id"
                        columns={[
                            { title: 'Zone', dataIndex: 'name', render: (t) => <strong>{t}</strong> },
                            { title: 'Temp', dataIndex: 'temp', render: (t) => <Text style={{ color: t > 24 ? '#f5222d' : t < 21 ? '#1890ff' : '#52c41a' }}>{t}°C</Text> },
                            { title: 'Setpoint', dataIndex: 'setpoint', render: (t) => <Space><Slider min={16} max={30} step={0.5} defaultValue={t} style={{ width: 100 }} /> {t}</Space> },
                            { title: 'Humidity', dataIndex: 'humidity', render: (t) => `${t}%` },
                            { title: 'CO2', dataIndex: 'co2', render: (t) => <Text style={{ color: t > 600 ? '#faad14' : 'inherit' }}>{t} ppm</Text> },
                            { title: 'Mode', dataIndex: 'mode', render: (t) => <Select defaultValue={t} size="small" options={[{label:'Auto',value:'Auto'},{label:'Override',value:'Override'},{label:'Off',value:'Off'}]} /> },
                            { title: 'Status', dataIndex: 'status', render: (t) => (
                                <Tag color={t === 'Cooling' ? 'blue' : t === 'Heating' ? 'red' : 'default'}>{t}</Tag>
                            )},
                        ]}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
