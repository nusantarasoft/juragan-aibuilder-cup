"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Card, Row, Col, Statistic, Tag, Space, Typography, Spin, List, Progress, Empty,
} from "antd";
import { motion } from "framer-motion";
import {
    BookOutlined, RocketOutlined, CheckCircleOutlined, ClockCircleOutlined,
    WarningOutlined, ThunderboltOutlined, ScheduleOutlined, BarChartOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
    pending: { color: '#94a3b8', icon: <ClockCircleOutlined /> },
    in_progress: { color: '#3b82f6', icon: <ThunderboltOutlined /> },
    completed: { color: '#22c55e', icon: <CheckCircleOutlined /> },
    cancelled: { color: '#ef4444', icon: <WarningOutlined /> },
    failed: { color: '#ef4444', icon: <WarningOutlined /> },
};

const PRIORITY_COLORS: Record<string, string> = {
    critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#94a3b8',
};

export default function OpsDashboardPage() {
    const { themeColor } = usePreferencesStore();
    const [playbooks, setPlaybooks] = useState<any[]>([]);
    const [runs, setRuns] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [pbData, runData, schData] = await Promise.all([
                gql(`query($t: String!) { opsPlaybooks(tenantId: $t) { id name category priority isActive estimatedMinutes createdAt } }`, { t: DEFAULT_TENANT_ID }),
                gql(`query($t: String!) { opsRuns(tenantId: $t) { id name status playbookName playbookPriority startedAt completedAt dueAt createdAt } }`, { t: DEFAULT_TENANT_ID }),
                gql(`query($t: String!) { opsSchedules(tenantId: $t) { id name cronExpression isActive playbookName nextRunAt lastRunAt } }`, { t: DEFAULT_TENANT_ID }),
            ]);
            setPlaybooks(pbData.opsPlaybooks || []);
            setRuns(runData.opsRuns || []);
            setSchedules(schData.opsSchedules || []);
        } catch { /* ignore */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const activeRuns = runs.filter(r => r.status === 'in_progress');
    const completedRuns = runs.filter(r => r.status === 'completed');
    const pendingRuns = runs.filter(r => r.status === 'pending');
    const overdueRuns = runs.filter(r => r.dueAt && dayjs(r.dueAt).isBefore(dayjs()) && r.status !== 'completed');
    const completionRate = runs.length > 0 ? Math.round((completedRuns.length / runs.length) * 100) : 0;
    const activeSchedules = schedules.filter(s => s.isActive);

    const stats = [
        { title: 'Playbooks', value: playbooks.length, icon: <BookOutlined />, color: '#8b5cf6' },
        { title: 'Active Runs', value: activeRuns.length, icon: <RocketOutlined />, color: '#3b82f6' },
        { title: 'Pending', value: pendingRuns.length, icon: <ClockCircleOutlined />, color: '#f59e0b' },
        { title: 'Completed', value: completedRuns.length, icon: <CheckCircleOutlined />, color: '#22c55e' },
        { title: 'Overdue', value: overdueRuns.length, icon: <WarningOutlined />, color: '#ef4444' },
        { title: 'Schedules', value: activeSchedules.length, icon: <ScheduleOutlined />, color: '#06b6d4' },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Operations</AuroraText>}
            subTitle={<DecryptedText text="Manage recurring operational workflows and task execution" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            <Spin spinning={loading}>
                {/* Stats */}
                <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                    {stats.map((s, i) => (
                        <Col key={i} xs={12} sm={8} md={4}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                    <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 22 }} />
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                <Row gutter={[16, 16]}>
                    {/* Completion Rate */}
                    <Col xs={24} md={8}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                            <Card title={<Space><BarChartOutlined /> Completion Rate</Space>} size="small" style={glass}>
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <Progress type="dashboard" percent={completionRate} strokeColor={{ '0%': '#3b82f6', '100%': '#22c55e' }} size={140} />
                                    <br />
                                    <Text type="secondary">{completedRuns.length} of {runs.length} runs completed</Text>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>

                    {/* Active Runs */}
                    <Col xs={24} md={8}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                            <Card title={<Space><RocketOutlined style={{ color: '#3b82f6' }} /> Active Runs</Space>} size="small" style={glass}>
                                {activeRuns.length === 0 ? (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No active runs" />
                                ) : (
                                    <List
                                        size="small"
                                        dataSource={activeRuns.slice(0, 5)}
                                        renderItem={(run: any) => (
                                            <List.Item>
                                                <List.Item.Meta
                                                    avatar={<ThunderboltOutlined style={{ color: '#3b82f6', fontSize: 18 }} />}
                                                    title={<Text strong style={{ fontSize: 13 }}>{run.name}</Text>}
                                                    description={
                                                        <Space size={4}>
                                                            <Tag color={PRIORITY_COLORS[run.playbookPriority] || '#94a3b8'} style={{ fontSize: 10 }}>{run.playbookPriority}</Tag>
                                                            <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(run.createdAt).fromNow()}</Text>
                                                        </Space>
                                                    }
                                                />
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Card>
                        </motion.div>
                    </Col>

                    {/* Overdue */}
                    <Col xs={24} md={8}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                            <Card title={<Space><WarningOutlined style={{ color: '#ef4444' }} /> Overdue Tasks</Space>} size="small" style={{ ...glass, borderTop: overdueRuns.length > 0 ? '3px solid #ef4444' : undefined }}>
                                {overdueRuns.length === 0 ? (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="All on track!" />
                                ) : (
                                    <List
                                        size="small"
                                        dataSource={overdueRuns.slice(0, 5)}
                                        renderItem={(run: any) => (
                                            <List.Item>
                                                <List.Item.Meta
                                                    avatar={<WarningOutlined style={{ color: '#ef4444' }} />}
                                                    title={<Text strong style={{ fontSize: 13 }}>{run.name}</Text>}
                                                    description={<Text type="danger" style={{ fontSize: 11 }}>Due {dayjs(run.dueAt).fromNow()}</Text>}
                                                />
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Card>
                        </motion.div>
                    </Col>
                </Row>
            </Spin>
        </CMSLayout>
    );
}
