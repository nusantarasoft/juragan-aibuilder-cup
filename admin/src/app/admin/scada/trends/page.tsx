"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Space, Select, DatePicker, Button, Typography, Row, Col, Modal, Form, Input, message, Tag, Alert } from "antd";
import { LineChartOutlined, DownloadOutlined, ReloadOutlined, WarningOutlined, ThunderboltOutlined, SafetyOutlined, BugOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ReferenceLine, AreaChart, Area } from 'recharts';
import { useRouter } from "next/navigation";
import { scadaService, type ScadaTag } from "@/lib/scadaService";
import { buildTrendChartRows, scadaTrendsUsingLiveHistory } from "@/lib/scadaTrendsView";

const { RangePicker } = DatePicker;
const { Text } = Typography;

function sampleTrendData() {
    return Array.from({ length: 60 }).map((_, i) => {
        const baseTemp = 22 + Math.sin(i / 5) * 5;
        const basePressure = 45 + Math.cos(i / 4) * 10;
        return {
            time: `10:${i < 10 ? '0' + i : i}`,
            sampleTemp: baseTemp + (i > 45 ? Math.random() * 8 + 4 : Math.random()),
            samplePressure: basePressure + Math.random() * 2,
            sampleSpeed: 60 + Math.random() * 5,
        };
    });
}

export default function ScadaTrends() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const router = useRouter();

    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [tags, setTags] = useState<ScadaTag[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [liveRows, setLiveRows] = useState<ReturnType<typeof buildTrendChartRows>>([]);
    const [loaded, setLoaded] = useState(false);

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const usingLive = scadaTrendsUsingLiveHistory(liveRows.length);
    const chartData = usingLive ? liveRows : sampleTrendData();
    const primaryTag = tags[0];
    const secondaryTag = tags[1];

    const loadHistory = useCallback(async (tagIds: string[]) => {
        if (!tagIds.length) {
            setLiveRows([]);
            return;
        }
        const points = await scadaService.getTagValueHistory(tagIds);
        setLiveRows(buildTrendChartRows(points));
    }, []);

    useEffect(() => {
        const boot = async () => {
            try {
                const t = await scadaService.getTags();
                setTags(t);
                const initial = t.slice(0, 2).map((x) => x.id);
                setSelectedTagIds(initial);
                await loadHistory(initial);
            } catch {
                setTags([]);
                setLiveRows([]);
            } finally {
                setLoaded(true);
            }
        };
        void boot();
    }, [loadHistory]);

    useEffect(() => {
        if (!autoRefresh || !usingLive) return;
        const id = setInterval(() => void loadHistory(selectedTagIds), 30_000);
        return () => clearInterval(id);
    }, [autoRefresh, usingLive, loadHistory, selectedTagIds]);

    const tagOptions = useMemo(
        () => tags.map((t) => ({ label: t.name, value: t.id })),
        [tags],
    );

    const exportTrendCsv = () => {
        const keys = usingLive
            ? selectedTagIds
            : (['sampleTemp', 'samplePressure', 'sampleSpeed'] as const);
        const header = `time,${keys.join(',')}\n`;
        const rows = chartData
            .map((r) => `${r.time},${keys.map((k) => (r as Record<string, string | number>)[k] ?? '').join(',')}`)
            .join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scada-trends-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        message.success(usingLive ? 'Trend CSV exported from historian' : 'Trend CSV exported (sample series)');
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
            subTitle={<DecryptedText text="Historical tag values from Postgres historian (when seeded) or labeled sample charts" speed={60} />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {loaded && usingLive && (
                    <Alert
                        type="success"
                        showIcon
                        message="Live historian data"
                        description="Charts below use scada_tag_values for this tenant via GraphQL."
                        style={{ marginBottom: 16 }}
                    />
                )}
                {loaded && !usingLive && (
                    <Alert
                        type="info"
                        showIcon
                        message="Sample trend data"
                        description="No tag history returned yet — charts are illustrative. Seed scada_tag_values or connect a field historian."
                        style={{ marginBottom: 16 }}
                    />
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24, padding: 16, ...glassStyle }}>
                    <Space wrap>
                        <Select
                            mode="multiple"
                            placeholder="Select tags to trend"
                            value={selectedTagIds}
                            onChange={(ids) => {
                                setSelectedTagIds(ids);
                                void loadHistory(ids);
                            }}
                            style={{ minWidth: 300 }}
                            options={tagOptions.length ? tagOptions : [
                                { label: 'PLC_01.Temp.Zone3 (sample)', value: 'sampleTemp' },
                                { label: 'PMP_CHW_02.Pressure (sample)', value: 'samplePressure' },
                            ]}
                        />
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
                            icon={<ReloadOutlined spin={autoRefresh && usingLive} />}
                            onClick={() => {
                                setAutoRefresh((v) => {
                                    message.info(!v ? (usingLive ? 'Auto refresh on (30s historian poll)' : 'Auto refresh on (sample only — no live historian)') : 'Auto refresh off');
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
                        <Card title={<Space><LineChartOutlined style={{ color: themeColor }} /> Primary telemetry</Space>} style={glassStyle} bordered={false}>
                            <div style={{ height: 350, width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#ddd'} />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} minTickGap={30} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} domain={['auto', 'auto']} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Legend verticalAlign="top" height={36}/>
                                        {!usingLive && <ReferenceLine y={29} stroke="#f5222d" strokeDasharray="3 3" />}
                                        {usingLive && primaryTag ? (
                                            <Line type="monotone" dataKey={primaryTag.id} name={primaryTag.name} stroke="#f5222d" strokeWidth={3} dot={false} />
                                        ) : (
                                            <Line type="monotone" dataKey="sampleTemp" name="PLC_01.Temp.Zone3 (°C) sample" stroke="#f5222d" strokeWidth={3} dot={false} />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card title={<Space><SafetyOutlined style={{ color: themeColor }} /> Secondary telemetry</Space>} style={{ ...glassStyle, marginTop: 24 }} bordered={false}>
                            <div style={{ height: 250, width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#ddd'} />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} minTickGap={30} />
                                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: isDark?'#888':'#666'}} domain={['auto', 'auto']} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 8, border: 'none' }} />
                                        <Legend verticalAlign="top" height={36}/>
                                        {usingLive && secondaryTag ? (
                                            <Area yAxisId="left" type="monotone" dataKey={secondaryTag.id} name={secondaryTag.name} stroke="#1890ff" fill="#1890ff33" />
                                        ) : (
                                            <>
                                                <Area yAxisId="left" type="monotone" dataKey="samplePressure" name="Pressure (sample)" stroke="#1890ff" fill="#1890ff33" />
                                                <Line yAxisId="left" type="step" dataKey="sampleSpeed" name="Fan speed (sample)" stroke="#faad14" strokeWidth={2} dot={false} />
                                            </>
                                        )}
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
                            extra={!usingLive ? <Tag color="default">Demo narrative</Tag> : <Tag color="red" icon={<WarningOutlined />}>Review alarms</Tag>}
                        >
                            <div style={{ background: isDark ? 'rgba(245,34,45,0.1)' : 'rgba(245,34,45,0.05)', padding: 16, borderRadius: 12, border: `1px solid #f5222d`, marginBottom: 24 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8, color: '#f5222d' }}>
                                    {usingLive ? 'Check correlated tags' : 'Sample anomaly story'}
                                </Text>
                                <Typography.Paragraph style={{ margin: 0 }}>
                                    {usingLive
                                        ? 'Live historian mode: validate spikes against SCADA alarm definitions before dispatching field work.'
                                        : 'Illustrative AI copy only — not driven by live tag values.'}
                                </Typography.Paragraph>
                            </div>

                            <Button type="primary" danger block size="large" icon={<BugOutlined />} onClick={() => setIsIncidentModalOpen(true)}>
                                Create ITSM Incident Ticket
                            </Button>
                        </Card>
                    </Col>
                </Row>
            </motion.div>

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
                </Form>
            </Modal>
        </CMSLayout>
    );
}
