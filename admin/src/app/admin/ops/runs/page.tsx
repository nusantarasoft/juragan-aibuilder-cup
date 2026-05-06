"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Table, Button, Tag, Space, Modal, Card, message, Typography,
    Row, Col, Statistic, Tooltip, Drawer, List, Steps, Input,
} from "antd";
import { motion } from "framer-motion";
import {
    RocketOutlined, ReloadOutlined, CheckCircleOutlined, ClockCircleOutlined,
    PlayCircleOutlined, PauseCircleOutlined, StopOutlined, DeleteOutlined,
    UserOutlined, ThunderboltOutlined, WarningOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const STATUS_COLORS: Record<string, string> = {
    pending: 'default', in_progress: 'processing', completed: 'success', cancelled: 'warning', failed: 'error',
};
const PRIORITY_COLORS: Record<string, string> = { critical: 'red', high: 'orange', medium: 'blue', low: 'default' };

export default function RunsPage() {
    const { themeColor } = usePreferencesStore();
    const [runs, setRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRun, setSelectedRun] = useState<any>(null);
    const [runSteps, setRunSteps] = useState<any[]>([]);
    const [stepsLoading, setStepsLoading] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const loadRuns = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`query($t: String!) { opsRuns(tenantId: $t) {
                id name status playbookId playbookName playbookCategory playbookPriority
                startedBy startedAt completedAt dueAt notes createdAt
            } }`, { t: DEFAULT_TENANT_ID });
            setRuns((data.opsRuns || []).filter((r: any) => r.status !== 'completed'));
        } catch (err: any) { message.error(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadRuns(); }, [loadRuns]);

    const loadRunSteps = async (runId: string) => {
        setStepsLoading(true);
        try {
            const data = await gql(`query($runId: String!) { opsRunSteps(runId: $runId) {
                id runId stepId stepOrder title status assigneeId assigneeName startedAt completedAt notes completedBy
            } }`, { runId });
            setRunSteps(data.opsRunSteps || []);
        } catch { /* ignore */ } finally { setStepsLoading(false); }
    };

    const handleStatusChange = async (id: string, status: string) => {
        try {
            await gql(`mutation($id: String!, $status: String!) { updateOpsRunStatus(id: $id, status: $status) { id } }`, { id, status });
            message.success(`Run ${status}`);
            loadRuns();
        } catch (err: any) { message.error(err.message); }
    };

    const handleStepComplete = async (stepId: string) => {
        try {
            await gql(`mutation($id: String!, $status: String!) { updateOpsRunStepStatus(id: $id, status: $status) { id } }`, { id: stepId, status: 'completed' });
            message.success("Step completed");
            loadRunSteps(selectedRun.id);
            loadRuns();
        } catch (err: any) { message.error(err.message); }
    };

    const activeRuns = runs.filter(r => r.status === 'in_progress');
    const pendingRuns = runs.filter(r => r.status === 'pending');

    const columns: ColumnsType<any> = [
        {
            title: "Run", key: "name",
            render: (_, r) => (
                <Space>
                    <RocketOutlined style={{ fontSize: 18, color: r.status === 'in_progress' ? '#3b82f6' : '#94a3b8' }} />
                    <div>
                        <Text strong>{r.name}</Text><br />
                        <Text type="secondary" style={{ fontSize: 11 }}>{r.playbookName}</Text>
                    </div>
                </Space>
            ),
        },
        { title: "Status", dataIndex: "status", width: 120, render: (v: string) => <Tag color={STATUS_COLORS[v]}>{v?.replace('_', ' ')}</Tag> },
        { title: "Priority", key: "priority", width: 90, render: (_, r) => <Tag color={PRIORITY_COLORS[r.playbookPriority]}>{r.playbookPriority}</Tag> },
        {
            title: "Due", key: "due", width: 130,
            render: (_, r) => r.dueAt ? (
                <Text type={dayjs(r.dueAt).isBefore(dayjs()) ? 'danger' : undefined} style={{ fontSize: 12 }}>
                    {dayjs(r.dueAt).fromNow()}
                </Text>
            ) : '—',
        },
        { title: "Started", key: "started", width: 130, render: (_, r) => r.startedAt ? <Text style={{ fontSize: 12 }}>{dayjs(r.startedAt).fromNow()}</Text> : '—' },
        {
            title: "Actions", key: "actions", width: 200,
            render: (_, r) => (
                <Space>
                    <Tooltip title="View Steps">
                        <Button type="text" icon={<CheckCircleOutlined />} onClick={() => {
                            setSelectedRun(r); setDrawerOpen(true); loadRunSteps(r.id);
                        }} />
                    </Tooltip>
                    {r.status === 'pending' && (
                        <Tooltip title="Start"><Button type="text" icon={<PlayCircleOutlined style={{ color: '#22c55e' }} />}
                            onClick={() => handleStatusChange(r.id, 'in_progress')} /></Tooltip>
                    )}
                    {r.status === 'in_progress' && (
                        <Tooltip title="Cancel"><Button type="text" icon={<StopOutlined style={{ color: '#ef4444' }} />}
                            onClick={() => Modal.confirm({ title: 'Cancel this run?', onOk: () => handleStatusChange(r.id, 'cancelled') })} /></Tooltip>
                    )}
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({
                        title: 'Delete run?', onOk: async () => {
                            await gql(`mutation($id: String!) { deleteOpsRun(id: $id) }`, { id: r.id });
                            message.success("Deleted"); loadRuns();
                        },
                    })} />
                </Space>
            ),
        },
    ];

    const completedSteps = runSteps.filter(s => s.status === 'completed').length;
    const currentStep = runSteps.findIndex(s => s.status === 'pending' || s.status === 'in_progress');

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Active Runs</AuroraText>}
            subTitle={<DecryptedText text="Monitor and manage currently executing operational workflows" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<Button key="reload" icon={<ReloadOutlined />} onClick={loadRuns} />]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'In Progress', value: activeRuns.length, icon: <ThunderboltOutlined />, color: '#3b82f6' },
                    { title: 'Pending', value: pendingRuns.length, icon: <ClockCircleOutlined />, color: '#f59e0b' },
                    { title: 'Total Active', value: runs.length, icon: <RocketOutlined />, color: '#8b5cf6' },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={8}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            <Card><Table columns={columns} dataSource={runs.map(r => ({ ...r, key: r.id }))} loading={loading} pagination={false} size="middle" /></Card>

            {/* Steps Execution Drawer */}
            <Drawer title={<Space><RocketOutlined /> Run Steps — {selectedRun?.name}</Space>}
                open={drawerOpen} onClose={() => setDrawerOpen(false)} width={520}
                extra={<Tag color={STATUS_COLORS[selectedRun?.status]}>{selectedRun?.status?.replace('_', ' ')}</Tag>}
            >
                <Card size="small" style={{ marginBottom: 16 }}>
                    <Text type="secondary">Progress: {completedSteps} / {runSteps.length} steps</Text>
                </Card>
                <Steps direction="vertical" current={currentStep >= 0 ? currentStep : runSteps.length} size="small"
                    items={runSteps.map(step => ({
                        title: (
                            <Space>
                                <Text strong>{step.title}</Text>
                                {step.assigneeName && <Tag icon={<UserOutlined />} color="blue" style={{ fontSize: 10 }}>{step.assigneeName}</Tag>}
                            </Space>
                        ),
                        description: (
                            <Space direction="vertical" size={2}>
                                {step.notes && <Text type="secondary" style={{ fontSize: 11 }}>{step.notes}</Text>}
                                {step.status === 'pending' && selectedRun?.status === 'in_progress' && (
                                    <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                                        onClick={() => handleStepComplete(step.id)} style={{ marginTop: 4 }}>
                                        Complete
                                    </Button>
                                )}
                                {step.completedAt && <Text type="secondary" style={{ fontSize: 10 }}>Completed {dayjs(step.completedAt).fromNow()}</Text>}
                            </Space>
                        ),
                        status: step.status === 'completed' ? 'finish' : step.status === 'in_progress' ? 'process' : step.status === 'failed' ? 'error' : 'wait',
                    }))}
                />
            </Drawer>
        </CMSLayout>
    );
}
