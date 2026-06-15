"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Table, Button, Space, Typography, Badge, Row, Col, Statistic, DatePicker, Select } from "antd";
import { FilePdfOutlined, FileExcelOutlined, PrinterOutlined, CalendarOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Text } = Typography;
const { RangePicker } = DatePicker;

export default function ScadaReports() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const reportsData = [
        { id: 'RPT-842', name: 'Shift End Production Summary', type: 'Daily', generatedAt: '2026-06-13 18:00:00', status: 'Generated' },
        { id: 'RPT-841', name: 'Weekly Alarm Audit', type: 'Weekly', generatedAt: '2026-06-12 23:59:00', status: 'Generated' },
        { id: 'RPT-840', name: 'Chiller Energy Efficiency', type: 'Custom', generatedAt: '2026-06-12 14:30:00', status: 'Generated' },
        { id: 'RPT-839', name: 'Monthly KPI Export', type: 'Monthly', generatedAt: '2026-05-31 23:59:00', status: 'Archived' },
        { id: 'RPT-838', name: 'Equipment Uptime Log', type: 'Weekly', generatedAt: '2026-06-05 23:59:00', status: 'Generated' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Automated Reports</AuroraText>}
            subTitle={<DecryptedText text="SCADA Telemetry & Alarm Logs Export" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Reports Generated (This Month)" value={142} valueStyle={{ color: themeColor }} prefix={<FilePdfOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Scheduled Reports" value={14} valueStyle={{ color: '#faad14' }} prefix={<CalendarOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Compliance Audit Status" value="Passed" valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <Space>
                            <RangePicker />
                            <Select defaultValue="all" options={[{label: 'All Reports', value: 'all'}, {label: 'Daily', value: 'daily'}, {label: 'Monthly', value: 'monthly'}]} style={{ width: 150 }} />
                        </Space>
                        <Space>
                            <Button icon={<PrinterOutlined />}>Print Log</Button>
                            <Button type="primary" style={{ background: themeColor }}>Generate New Report</Button>
                        </Space>
                    </div>
                    <Table 
                        dataSource={reportsData} 
                        pagination={{ pageSize: 10 }}
                        rowKey="id"
                        columns={[
                            { title: 'Report ID', dataIndex: 'id', render: (t) => <Text code>{t}</Text> },
                            { title: 'Report Name', dataIndex: 'name', render: (t) => <strong>{t}</strong> },
                            { title: 'Type', dataIndex: 'type' },
                            { title: 'Generated Timestamp', dataIndex: 'generatedAt' },
                            { title: 'Status', dataIndex: 'status', render: (t) => (
                                <Badge status={t === 'Generated' ? 'success' : 'default'} text={t} />
                            )},
                            { title: 'Download', render: () => (
                                <Space>
                                    <Button size="small" type="primary" ghost icon={<FilePdfOutlined />}>PDF</Button>
                                    <Button size="small" icon={<FileExcelOutlined />}>CSV</Button>
                                </Space>
                            )}
                        ]}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
