"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Card, Row, Col, Tag, Space, Typography, Spin, Steps, List, Empty,
    Button, Tooltip, Descriptions, Badge, Timeline, Divider, Modal, message,
} from "antd";
import { motion } from "framer-motion";
import {
    BookOutlined, OrderedListOutlined, ClockCircleOutlined,
    PlayCircleOutlined, CheckCircleOutlined, ArrowLeftOutlined,
    ThunderboltOutlined, ExclamationCircleOutlined, StopOutlined,
    UserOutlined, CalendarOutlined, RocketOutlined,
    EditOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const PRIORITY_COLORS: Record<string, string> = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#94a3b8' };
const STATUS_COLORS: Record<string, string> = {
    pending: '#94a3b8', in_progress: '#3b82f6', completed: '#22c55e', failed: '#ef4444', cancelled: '#6b7280',
};
const STEP_TYPE_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
    task: { color: '#3b82f6', icon: <CheckCircleOutlined /> },
    approval: { color: '#f59e0b', icon: <ExclamationCircleOutlined /> },
    check: { color: '#22c55e', icon: <CheckCircleOutlined /> },
    notification: { color: '#8b5cf6', icon: <ThunderboltOutlined /> },
};

export default function PlaybookDetailPage() {
    const { themeColor } = usePreferencesStore();
    const params = useParams();
    const router = useRouter();
    const playbookId = params.id as string;

    const [playbook, setPlaybook] = useState<any>(null);
    const [steps, setSteps] = useState<any[]>([]);
    const [runs, setRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!playbookId) return;
        setLoading(true);
        try {
            const [pbData, stepsData, runsData] = await Promise.all([
                gql(`query($t: String!) { opsPlaybooks(tenantId: $t) {
                    id name description category priority estimatedMinutes tags isActive createdBy createdAt
                } }`, { t: DEFAULT_TENANT_ID }),
                gql(`query($pbId: String!) { opsPlaybookSteps(playbookId: $pbId) {
                    id playbookId stepOrder title description stepType isRequired defaultAssigneeId estimatedMinutes
                } }`, { pbId: playbookId }),
                gql(`query($t: String!) { opsRuns(tenantId: $t) {
                    id name status playbookId playbookName playbookPriority startedAt completedAt dueAt createdAt
                } }`, { t: DEFAULT_TENANT_ID }),
            ]);
            const pb = (pbData.opsPlaybooks || []).find((p: any) => p.id === playbookId);
            setPlaybook(pb || null);
            setSteps((stepsData.opsPlaybookSteps || []).sort((a: any, b: any) => a.stepOrder - b.stepOrder));
            setRuns((runsData.opsRuns || []).filter((r: any) => r.playbookId === playbookId));
        } catch (e: any) { message.error(e.message); }
        finally { setLoading(false); }
    }, [playbookId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleStartRun = async () => {
        if (!playbook) return;
        try {
            const res = await gql(`mutation($t: String!, $pbId: String!, $name: String!) {
                createOpsRun(tenantId: $t, playbookId: $pbId, name: $name) { id }
            }`, { t: DEFAULT_TENANT_ID, pbId: playbook.id, name: `${playbook.name} - ${dayjs().format('MMM D HH:mm')}` });
            message.success("Run started!");
            router.push(`/admin/ops/runs/${res.createOpsRun.id}`);
        } catch (e: any) { message.error(e.message); }
    };

    const completedRuns = runs.filter(r => r.status === 'completed').length;
    const failedRuns = runs.filter(r => r.status === 'failed').length;
    const activeRuns = runs.filter(r => r.status === 'in_progress').length;
    const totalEstMinutes = steps.reduce((s, st) => s + (st.estimatedMinutes || 0), 0);

    if (loading) return (
        <CMSLayout title="Loading...">
            <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
        </CMSLayout>
    );

    if (!playbook) return (
        <CMSLayout title="Not Found">
            <Empty description="Playbook not found" />
            <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Button onClick={() => router.push('/admin/ops/playbooks')}>Back to Playbooks</Button>
            </div>
        </CMSLayout>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#8b5cf6", "#a78bfa"]}>{playbook.name}</AuroraText>}
            subTitle={<DecryptedText text={playbook.description || 'Operational playbook template'} animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => router.push('/admin/ops/playbooks')}>Back</Button>,
                <Button key="run" type="primary" icon={<PlayCircleOutlined />}
                    onClick={() => Modal.confirm({ title: `Start new run from "${playbook.name}"?`, onOk: handleStartRun })}>
                    Start Run
                </Button>,
            ]}
        >
            {/* Top Meta Row */}
            <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                {[
                    { title: 'Steps', value: steps.length, icon: <OrderedListOutlined />, color: '#8b5cf6' },
                    { title: 'Est. Duration', value: totalEstMinutes ? `${totalEstMinutes} min` : 'N/A', icon: <ClockCircleOutlined />, color: '#f59e0b' },
                    { title: 'Total Runs', value: runs.length, icon: <RocketOutlined />, color: '#3b82f6' },
                    { title: 'Completed', value: completedRuns, icon: <CheckCircleOutlined />, color: '#22c55e' },
                    { title: 'Failed', value: failedRuns, icon: <ExclamationCircleOutlined />, color: '#ef4444' },
                    { title: 'Active', value: activeRuns, icon: <ThunderboltOutlined />, color: '#06b6d4' },
                ].map((s, i) => (
                    <Col key={i} xs={12} sm={8} md={4}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}`, textAlign: 'center' }}>
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{s.title}</div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{React.isValidElement(s.icon) && <span style={{ marginRight: 6 }}>{s.icon}</span>}{s.value}</div>
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                {/* Playbook Info */}
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                        <Card title={<Space><BookOutlined /> Playbook Details</Space>} size="small" style={glass}>
                            <Descriptions column={1} size="small" labelStyle={{ fontWeight: 600, fontSize: 11 }} contentStyle={{ fontSize: 12 }}>
                                <Descriptions.Item label="Category">
                                    <Tag style={{ textTransform: 'capitalize' }}>{playbook.category}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Priority">
                                    <Tag color={PRIORITY_COLORS[playbook.priority]}>{playbook.priority}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Status">
                                    <Badge status={playbook.isActive ? 'success' : 'default'} text={playbook.isActive ? 'Active' : 'Inactive'} />
                                </Descriptions.Item>
                                <Descriptions.Item label="Est. Duration">
                                    {playbook.estimatedMinutes ? `${playbook.estimatedMinutes} min` : 'Not set'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Created By">
                                    <Space size={4}><UserOutlined />{playbook.createdBy || 'system'}</Space>
                                </Descriptions.Item>
                                <Descriptions.Item label="Created">
                                    <Space size={4}><CalendarOutlined />{dayjs(playbook.createdAt).format('MMM D, YYYY')}</Space>
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>
                    </motion.div>
                </Col>

                {/* Step Pipeline */}
                <Col xs={24} md={16}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                        <Card title={<Space><OrderedListOutlined /> Step Pipeline ({steps.length} steps)</Space>} size="small" style={glass}>
                            {steps.length === 0 ? (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No steps defined. Add steps from the Playbooks page." />
                            ) : (
                                <Steps
                                    direction="vertical"
                                    size="small"
                                    current={-1}
                                    items={steps.map((st, idx) => {
                                        const cfg = STEP_TYPE_CONFIG[st.stepType] || STEP_TYPE_CONFIG.task;
                                        return {
                                            title: (
                                                <Space>
                                                    <Text strong style={{ fontSize: 13 }}>{st.title}</Text>
                                                    {st.isRequired && <Tag color="red" style={{ fontSize: 9 }}>Required</Tag>}
                                                </Space>
                                            ),
                                            description: (
                                                <Space size={6} wrap>
                                                    <Tag color={cfg.color} style={{ fontSize: 10 }}>{st.stepType}</Tag>
                                                    {st.estimatedMinutes > 0 && <Text type="secondary" style={{ fontSize: 11 }}>{st.estimatedMinutes} min</Text>}
                                                    {st.description && <Text type="secondary" style={{ fontSize: 11 }}>- {st.description}</Text>}
                                                </Space>
                                            ),
                                            icon: <div style={{
                                                width: 24, height: 24, borderRadius: '50%',
                                                background: cfg.color, color: '#fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 12, fontWeight: 700,
                                            }}>{idx + 1}</div>,
                                        };
                                    })}
                                />
                            )}
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* Run History */}
            <Row gutter={[16, 16]}>
                <Col xs={24}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                        <Card title={<Space><RocketOutlined /> Run History ({runs.length})</Space>} size="small" style={glass}>
                            {runs.length === 0 ? (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No runs yet. Start one above!" />
                            ) : (
                                <List
                                    size="small"
                                    dataSource={runs.sort((a: any, b: any) => dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix())}
                                    renderItem={(run: any) => (
                                        <List.Item
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => router.push(`/admin/ops/runs/${run.id}`)}
                                            actions={[
                                                <Tag key="s" color={STATUS_COLORS[run.status]} style={{ fontSize: 10 }}>
                                                    {run.status.replace('_', ' ')}
                                                </Tag>,
                                            ]}
                                        >
                                            <List.Item.Meta
                                                avatar={
                                                    run.status === 'completed' ? <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 18 }} /> :
                                                    run.status === 'in_progress' ? <ThunderboltOutlined style={{ color: '#3b82f6', fontSize: 18 }} /> :
                                                    run.status === 'failed' ? <ExclamationCircleOutlined style={{ color: '#ef4444', fontSize: 18 }} /> :
                                                    run.status === 'cancelled' ? <StopOutlined style={{ color: '#6b7280', fontSize: 18 }} /> :
                                                    <ClockCircleOutlined style={{ color: '#94a3b8', fontSize: 18 }} />
                                                }
                                                title={<Text strong style={{ fontSize: 13, color: '#7c3aed' }}>{run.name}</Text>}
                                                description={
                                                    <Space size={8}>
                                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                                            {dayjs(run.createdAt).format('MMM D, YYYY HH:mm')}
                                                        </Text>
                                                        {run.completedAt && (
                                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                                Duration: {dayjs(run.completedAt).diff(dayjs(run.startedAt || run.createdAt), 'minute')} min
                                                            </Text>
                                                        )}
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
            </Row>
        </CMSLayout>
    );
}
