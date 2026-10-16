"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Space, Select, DatePicker, Button, Typography, Row, Col, Modal, Form, Input, message, Tag } from "antd";
import { LineChartOutlined, DownloadOutlined, ReloadOutlined, WarningOutlined, ThunderboltOutlined, SafetyOutlined, BugOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ReferenceLine, AreaChart, Area } from 'recharts';
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import { useRouter } from "next/navigation";

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function ScadaTrends() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const router = useRouter();

    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const trendData = Array.from({ length: 60 }).map((_, i) => {
        const baseTemp = 22 + Math.sin(i / 5) * 5;
        const basePressure = 45 + Math.cos(i / 4) * 10;
        return {
            time: `10:${i < 10 ? '0'+i : i}`,
            tag1: baseTemp + (i > 45 ? Math.random() * 8 + 4 : Math.random()), // Introduce anomaly spike
            tag2: basePressure + Math.random() * 2,
            tag3: 60 + Math.random() * 5
        };
    });

    const exportTrendCsv = () => {
        const header = 'time,tag1,tag2,tag3\n';
        const rows = trendData.map((r) => `${r.time},${r.tag1},${r.tag2},${r.tag3}`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scada-trends-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('Trend CSV exported (sample series)');
    };

    const dispatchToITSM = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            setIsIncidentModalOpen(false);
            message.success('ITSM Incident created and dispatched to Service Desk!');
            router.push('/admin/itsm/dashboard');
        }, 1500);
    };

    return (
        <CMSLayout 
            title={<AuroraText>Trend Analysis</AuroraText>}
            subTitle={<DecryptedText text="Historical Data & AI Anomaly Detection" speed={60} />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24, padding: 16, ...glassStyle }}>
                    <Space wrap>
                        <Select mode="multiple" placeholder="Select Tags to Trend" defaultValue={['tag1', 'tag2']} style={{ minWidth: 300 }} options={[
                            { label: 'PLC_01.Temp.Zone3', value: 'tag1' },
                            { label: 'PMP_CHW_02.Pressure', value: 'tag2' },
                            { label: 'AHU_04.Fan.Speed', value: 'tag3' },
                        ]} />
                        <RangePicker showTime />
                        <Select defaultValue="1m" options={[
                            { label: '1 Min Res', value: '1m' },
                            { label: '5 Min Res', value: '5m' },
                            { label: '15 Min Res', value: '15m' },
                        ]} />
                    </Space>
                    <Space>
                        <Button
                            type={autoRefresh ? 'primary' : 'default'}
                            icon={<ReloadOutlined spin={autoRefresh} />}
                            onClick={() => {
                                setAutoRefresh((v) => {
                                    message.info(!v ? 'Auto refresh on (visual sample — wire historian for live tags)' : 'Auto refresh off');
                                    return !v;
                                });
                            }}
                        >
                            Auto Refresh
                        </Button>
                        <Button icon={<DownloadOutlined />} onClick={exportTrendCsv}>Export CSV</Button>
                        <Button type="primary" danger icon={<BugOutlined />} onClick={() => setIsIncidentModalOpen(true)}>Create ITSM Incident</Button>
                    </Space>
                </div>

                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={16}>
                        <Card title={<Space><LineChartOutlined style={{ color: themeColor }} /> Primary Telemetry (Zone 3 Temperature)</Space>} style={glassStyle} bordered={false}>
                            <div style={{ height: 350, width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#ddd'} />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} minTickGap={30} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} domain={['auto', 'auto']} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Legend verticalAlign="top" height={36}/>
                                        
                                        <ReferenceLine y={29} stroke="#f5222d" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'High Temp Limit (29°C)', fill: '#f5222d', fontSize: 12 }} />
                                        
                                        <Line type="monotone" dataKey="tag1" name="PLC_01.Temp.Zone3 (°C)" stroke="#f5222d" strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card title={<Space><SafetyOutlined style={{ color: themeColor }} /> Secondary Telemetry (Pressure & Speed)</Space>} style={{ ...glassStyle, marginTop: 24 }} bordered={false}>
                            <div style={{ height: 250, width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorPressure" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#1890ff" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#ddd'} />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} minTickGap={30} />
                                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} domain={['auto', 'auto']} />
                                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} domain={['auto', 'auto']} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Legend verticalAlign="top" height={36}/>
                                        
                                        <Area yAxisId="left" type="monotone" dataKey="tag2" name="PMP_CHW_02.Pressure (kPa)" stroke="#1890ff" fillOpacity={1} fill="url(#colorPressure)" />
                                        <Line yAxisId="right" type="step" dataKey="tag3" name="AHU_04.Fan.Speed (%)" stroke="#faad14" strokeWidth={2} dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} lg={8}>
                        <Card 
                            title={<Space><ThunderboltOutlined style={{ color: themeColor }} /> <span>AI Anomaly Detection</span></Space>}
                            style={{ ...glassStyle, height: '100%' }} 
                            bordered={false}
                            extra={<Tag color="red" icon={<WarningOutlined />}>Spike Detected</Tag>}
                        >
                            <div style={{ background: isDark ? 'rgba(245,34,45,0.1)' : 'rgba(245,34,45,0.05)', padding: 16, borderRadius: 12, border: `1px solid #f5222d`, marginBottom: 24 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8, color: '#f5222d' }}>Critical Temperature Deviation</Text>
                                <Typography.Paragraph style={{ margin: 0 }}>
                                    The AI engine has detected a rapid +6.5°C spike in <strong>PLC_01.Temp.Zone3</strong> starting at 10:45. 
                                    This deviation exceeds the High Temp Limit (29°C) and correlates with a slight drop in <strong>PMP_CHW_02.Pressure</strong>.
                                    <br /><br />
                                    <strong>Probable Cause:</strong> Chilled water valve actuator failure or pump cavitation.
                                    <br />
                                    <strong>Recommendation:</strong> Dispatch HVAC technician to Zone 3 and check actuator VLV-301.
                                </Typography.Paragraph>
                            </div>

                            <Button type="primary" danger block size="large" icon={<BugOutlined />} onClick={() => setIsIncidentModalOpen(true)}>
                                Create ITSM Incident Ticket
                            </Button>
                        </Card>
                    </Col>
                </Row>
            </motion.div>

            {/* ITSM Dispatch Modal */}
            <Modal
                title={<Space><BugOutlined /> Create ITSM Incident</Space>}
                open={isIncidentModalOpen}
                onOk={dispatchToITSM}
                onCancel={() => setIsIncidentModalOpen(false)}
                okText="Create & Dispatch"
                okButtonProps={{ danger: true }}
                confirmLoading={isGenerating}
            >
                <Form layout="vertical" initialValues={{ 
                    title: 'CRITICAL: High Temp Limit Exceeded in Zone 3 (PLC_01)',
                    priority: 'critical',
                    category: 'hardware'
                }}>
                    <Form.Item label="Incident Title" name="title" required>
                        <Input />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="Priority" name="priority" required>
                                <Select>
                                    <Select.Option value="critical">Critical (P1)</Select.Option>
                                    <Select.Option value="high">High (P2)</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Category" name="category" required>
                                <Select>
                                    <Select.Option value="hardware">Hardware / Infrastructure</Select.Option>
                                    <Select.Option value="network">Network</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item label="AI Diagnostic Summary" required>
                        <Input.TextArea rows={4} defaultValue="AI Diagnostic attached:\n\nRapid +6.5°C spike in PLC_01.Temp.Zone3. Limit (29°C) exceeded. Probable Cause: Chilled water valve actuator failure or pump cavitation.\n\nPlease dispatch HVAC technician to Zone 3." />
                    </Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
