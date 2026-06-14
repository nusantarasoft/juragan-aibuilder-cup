"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Table, Button, Space, Typography, Tag, Row, Col, Statistic, Slider, Switch, Select } from "antd";
import { BulbOutlined, FireOutlined, ThunderboltOutlined, SettingOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Text } = Typography;

export default function BmsLighting() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const lightingZones = [
        { id: 'LZ-01', name: 'Lobby', level: 100, mode: 'Schedule', occupancy: true, power: '1.2 kW' },
        { id: 'LZ-02', name: 'Open Office North', level: 75, mode: 'Daylight Harvest', occupancy: true, power: '2.5 kW' },
        { id: 'LZ-03', name: 'Open Office South', level: 0, mode: 'Auto', occupancy: false, power: '0.0 kW' },
        { id: 'LZ-04', name: 'Executive Boardroom', level: 50, mode: 'Manual', occupancy: true, power: '0.4 kW' },
        { id: 'LZ-05', name: 'Corridor Level 1', level: 30, mode: 'Schedule', occupancy: false, power: '0.3 kW' },
        { id: 'LZ-06', name: 'Parking Garage', level: 100, mode: 'Auto', occupancy: true, power: '4.8 kW' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Lighting Management</AuroraText>}
            subTitle={<DecryptedText text="Illumination & Daylight Harvesting" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Active Lighting Zones" value={4} suffix="/ 6" valueStyle={{ color: '#faad14' }} prefix={<BulbOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Total Lighting Power" value={9.2} suffix="kW" valueStyle={{ color: '#1890ff' }} prefix={<ThunderboltOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Energy Saved Today" value={14.5} suffix="kWh" valueStyle={{ color: '#52c41a' }} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <Space>
                            <Select defaultValue="all" options={[{label: 'All Zones', value: 'all'}, {label: 'Interior', value: 'int'}, {label: 'Exterior', value: 'ext'}]} style={{ width: 150 }} />
                        </Space>
                        <Space>
                            <Button type="default" danger icon={<BulbOutlined />}>All Off</Button>
                            <Button type="primary" style={{ background: themeColor }}>Global Settings</Button>
                        </Space>
                    </div>
                    <Table 
                        dataSource={lightingZones} 
                        pagination={false}
                        rowKey="id"
                        columns={[
                            { title: 'Zone', dataIndex: 'name', render: (t) => <strong>{t}</strong> },
                            { title: 'Dim Level', dataIndex: 'level', render: (t) => <Space><Slider defaultValue={t} style={{ width: 100 }} /> {t}%</Space> },
                            { title: 'Mode', dataIndex: 'mode', render: (t) => <Select defaultValue={t} size="small" options={[{label:'Auto',value:'Auto'},{label:'Schedule',value:'Schedule'},{label:'Manual',value:'Manual'},{label:'Daylight Harvest',value:'Daylight Harvest'}]} /> },
                            { title: 'Occupancy', dataIndex: 'occupancy', render: (t) => <Tag color={t ? 'green' : 'default'}>{t ? 'Occupied' : 'Vacant'}</Tag> },
                            { title: 'Power Draw', dataIndex: 'power' },
                            { title: 'Override', render: () => <Switch checkedChildren="ON" unCheckedChildren="OFF" defaultChecked /> }
                        ]}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
