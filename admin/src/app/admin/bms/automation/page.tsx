"use client";

import React from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Row, Col, Typography, Button, Space, Table, Tag, Timeline, Statistic } from "antd";
import { CalendarOutlined, ApiOutlined, CheckCircleOutlined, SyncOutlined, ThunderboltOutlined, EnvironmentOutlined, ClockCircleOutlined, ControlOutlined, LineChartOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Text } = Typography;

export default function BmsAutomation() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const rules = [
        { id: 'R-01', room: 'Executive Boardroom', source: 'Google Calendar', offset: '-10 mins', action: 'Set HVAC 22°C, Lights 80%', status: 'active' },
        { id: 'R-02', room: 'Data Hall 1', source: 'Internal Scheduler', offset: '0 mins', action: 'Dim Corridor Lights', status: 'active' },
        { id: 'R-03', room: 'All Meeting Rooms', source: 'MS Exchange', offset: '+5 mins', action: 'Auto-Off if no occupancy', status: 'active' },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Smart Automation</AuroraText>}
            subTitle={<DecryptedText text="Calendar Sync & Rule-Based Hardware Triggers" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={{ ...glassStyle, borderLeft: `4px solid ${themeColor}` }} bordered={false}>
                            <Statistic title="Active Automation Rules" value={14} prefix={<ApiOutlined />} valueStyle={{ fontWeight: 600 }} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Triggers Executed Today" value={87} prefix={<SyncOutlined spin />} valueStyle={{ color: '#faad14', fontWeight: 600 }} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Est. Energy Saved" value={214} suffix="kWh" prefix={<LineChartOutlined />} valueStyle={{ color: '#52c41a', fontWeight: 600 }} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
                <Space>
                    <Button icon={<SyncOutlined />}>Sync Calendars</Button>
                    <Button type="primary" icon={<ApiOutlined />} style={{ background: themeColor }}>Create New Rule</Button>
                </Space>
            </div>

            <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} title={<span><CalendarOutlined style={{ marginRight: 8 }}/> Active Automation Rules</span>}>
                            <Table 
                                dataSource={rules}
                                rowKey="id"
                                pagination={false}
                                columns={[
                                    { title: 'Target Zone', dataIndex: 'room', render: (t) => <Space><EnvironmentOutlined style={{ color: themeColor }} /> <strong>{t}</strong></Space> },
                                    { title: 'Trigger Source', dataIndex: 'source', render: (t) => <Tag color={isDark ? 'cyan-inverse' : 'cyan'} icon={<CalendarOutlined />}>{t}</Tag> },
                                    { title: 'Time Offset', dataIndex: 'offset', render: (t) => <Space><ClockCircleOutlined /> <Text type="secondary">{t}</Text></Space> },
                                    { title: 'Hardware Action', dataIndex: 'action', render: (t) => <Space><ControlOutlined style={{ color: '#faad14' }} /> {t}</Space> },
                                    { title: 'Status', dataIndex: 'status', render: () => <Tag color="success">Running</Tag> },
                                ]}
                            />
                        </Card>
                    </motion.div>
                </Col>

                <Col xs={24} lg={8}>
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} title={<span><ThunderboltOutlined style={{ marginRight: 8 }}/> Execution Log (Today)</span>}>
                            <Timeline
                                items={[
                                    {
                                        color: 'green',
                                        dot: <CheckCircleOutlined style={{ fontSize: '16px' }} />,
                                        children: (
                                            <>
                                                <div style={{ marginBottom: 4 }}><Text strong>Exec Boardroom Prep</Text></div>
                                                <div style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: 12 }}>09:50 AM — Triggered by "Q2 Planning"</div>
                                                <div style={{ fontSize: 12 }}>HVAC Set: 22°C | Lights Set: 80%</div>
                                            </>
                                        ),
                                    },
                                    {
                                        color: 'green',
                                        dot: <CheckCircleOutlined style={{ fontSize: '16px' }} />,
                                        children: (
                                            <>
                                                <div style={{ marginBottom: 4 }}><Text strong>Meeting Room A Shutdown</Text></div>
                                                <div style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: 12 }}>09:05 AM — Vacancy Timeout</div>
                                                <div style={{ fontSize: 12 }}>HVAC Set: Off | Lights Set: Off</div>
                                            </>
                                        ),
                                    },
                                    {
                                        color: 'blue',
                                        children: (
                                            <>
                                                <div style={{ marginBottom: 4 }}><Text strong>Data Hall Backup Generator Test</Text></div>
                                                <div style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: 12 }}>01:00 AM — Scheduled CRON</div>
                                                <div style={{ fontSize: 12 }}>Test complete. Status: Passed.</div>
                                            </>
                                        ),
                                    }
                                ]}
                            />
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </CMSLayout>
    );
}
