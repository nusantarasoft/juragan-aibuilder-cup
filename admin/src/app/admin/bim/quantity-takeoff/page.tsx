"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Table, Button, Space, Typography, Row, Col, Statistic, Select } from "antd";
import { CalculatorOutlined, ExportOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Text } = Typography;

export default function BimQuantityTakeoff() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const takeoffData = [
        { id: '1', category: 'Concrete - Cast In Situ', elementCount: 420, qty: '4,520.5', unit: 'm³', cost: '$ 542,460' },
        { id: '2', category: 'Steel Framing (Columns/Beams)', elementCount: 185, qty: '850.2', unit: 'Tonnes', cost: '$ 1,275,300' },
        { id: '3', category: 'HVAC Ductwork (Galvanized)', elementCount: 1240, qty: '12,400', unit: 'kg', cost: '$ 186,000' },
        { id: '4', category: 'Raised Floor Tiles (600x600)', elementCount: 8400, qty: '3,024', unit: 'm²', cost: '$ 241,920' },
        { id: '5', category: 'Data Cables (Cat6A)', elementCount: 3500, qty: '145,000', unit: 'm', cost: '$ 174,000' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Quantity Takeoff</AuroraText>}
            subTitle={<DecryptedText text="Material Extraction & Cost Estimation" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Total Extracted Elements" value="14,245" prefix={<CalculatorOutlined />} valueStyle={{ color: themeColor }} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Estimated Material Cost" value="$ 4,845,200" valueStyle={{ color: '#52c41a' }} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'space-between' }}>
                        <Space>
                            <Select defaultValue="all" options={[{label: 'All Disciplines', value: 'all'}, {label: 'Architecture', value: 'arch'}, {label: 'MEP', value: 'mep'}]} style={{ width: 200 }} />
                        </Space>
                        <Space>
                            <Button icon={<CalculatorOutlined />} style={{ color: themeColor, borderColor: themeColor }}>Re-Calculate</Button>
                            <Button type="primary" icon={<ExportOutlined />} style={{ background: '#52c41a' }}>Export to Excel / ERP</Button>
                        </Space>
                    </div>
                    <Table 
                        dataSource={takeoffData} 
                        pagination={false}
                        rowKey="id"
                        columns={[
                            { title: 'Material / Assembly Category', dataIndex: 'category', render: (t) => <strong>{t}</strong> },
                            { title: 'Element Count', dataIndex: 'elementCount' },
                            { title: 'Total Quantity', dataIndex: 'qty', align: 'right', render: (t) => <span style={{ fontWeight: 600 }}>{t}</span> },
                            { title: 'Unit', dataIndex: 'unit' },
                            { title: 'Est. Cost', dataIndex: 'cost', align: 'right' },
                        ]}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
