"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Table, Button, Space, Typography, Tag, Row, Col, Statistic } from "antd";
import { SwapOutlined, FieldTimeOutlined, ToolOutlined, VerticalAlignMiddleOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Text } = Typography;

export default function BmsElevator() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const elevators = [
        { id: 'ELV-01', type: 'Passenger', floor: '12', direction: 'Up', status: 'Running', door: 'Closed', nextMaint: '14 Days' },
        { id: 'ELV-02', type: 'Passenger', floor: '8', direction: 'Down', status: 'Running', door: 'Closed', nextMaint: '14 Days' },
        { id: 'ELV-03', type: 'Passenger', floor: '1', direction: 'Idle', status: 'Standby', door: 'Open', nextMaint: '12 Days' },
        { id: 'ELV-04', type: 'Service', floor: 'B1', direction: 'Idle', status: 'Maintenance', door: 'Open', nextMaint: 'In Progress' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Vertical Transportation</AuroraText>}
            subTitle={<DecryptedText text="Elevator & Escalator Monitoring" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Cars Online" value={3} suffix="/ 4" valueStyle={{ color: '#52c41a' }} prefix={<SwapOutlined style={{transform: 'rotate(90deg)'}} />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Avg Wait Time" value={24} suffix="sec" valueStyle={{ color: themeColor }} prefix={<FieldTimeOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Cars Under Maintenance" value={1} valueStyle={{ color: '#faad14' }} prefix={<ToolOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                        <Button type="primary" danger style={{ background: '#f5222d' }}>Recall to Lobby (Fire Mode)</Button>
                    </div>
                    <Table 
                        dataSource={elevators} 
                        pagination={false}
                        rowKey="id"
                        columns={[
                            { title: 'Elevator', dataIndex: 'id', render: (t) => <strong>{t}</strong> },
                            { title: 'Type', dataIndex: 'type' },
                            { title: 'Current Floor', dataIndex: 'floor', render: (t) => <Tag color="blue">{t}</Tag> },
                            { title: 'Direction', dataIndex: 'direction' },
                            { title: 'Door State', dataIndex: 'door' },
                            { title: 'Status', dataIndex: 'status', render: (t) => (
                                <Tag color={t === 'Running' ? 'green' : t === 'Standby' ? 'default' : 'orange'}>{t}</Tag>
                            )},
                            { title: 'Actions', render: () => (
                                <Space>
                                    <Button size="small">Call to Floor...</Button>
                                </Space>
                            )}
                        ]}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
