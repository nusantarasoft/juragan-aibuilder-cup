"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Table, Button, Space, Typography, Tag, Row, Col, Statistic, Progress } from "antd";
import { PoweroffOutlined, DollarOutlined, GlobalOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Text } = Typography;

export default function BmsEnergy() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const energyMeters = [
        { id: 'MTR-Main', name: 'Main Incoming Feed', usage: '12,450 kWh', cost: 'Rp 18,675,000', carbon: '8.5 tCO2e', status: 'Online' },
        { id: 'MTR-HVAC', name: 'HVAC Sub-meter', usage: '6,225 kWh', cost: 'Rp 9,337,500', carbon: '4.2 tCO2e', status: 'Online' },
        { id: 'MTR-LGH', name: 'Lighting Sub-meter', usage: '2,100 kWh', cost: 'Rp 3,150,000', carbon: '1.4 tCO2e', status: 'Online' },
        { id: 'MTR-IT', name: 'IT Equipment Sub-meter', usage: '3,500 kWh', cost: 'Rp 5,250,000', carbon: '2.4 tCO2e', status: 'Online' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Energy & Sustainability</AuroraText>}
            subTitle={<DecryptedText text="Sub-metering, Costing, and Carbon Tracking" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Total Usage (MTD)" value="12,450" suffix="kWh" valueStyle={{ color: '#faad14' }} prefix={<PoweroffOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Estimated Cost (MTD)" value="18.6" suffix="M" prefix="Rp" valueStyle={{ color: '#52c41a' }} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Carbon Footprint" value="8.5" suffix="tCO2e" valueStyle={{ color: themeColor }} prefix={<GlobalOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card title="Sub-Meter Breakdown" style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <Table 
                        dataSource={energyMeters} 
                        pagination={false}
                        rowKey="id"
                        columns={[
                            { title: 'Meter Name', dataIndex: 'name', render: (t) => <strong>{t}</strong> },
                            { title: 'Usage (MTD)', dataIndex: 'usage' },
                            { title: 'Cost Allocation', dataIndex: 'cost' },
                            { title: 'Carbon Impact', dataIndex: 'carbon' },
                            { title: 'Status', dataIndex: 'status', render: (t) => <Tag color="green">{t}</Tag> },
                        ]}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
