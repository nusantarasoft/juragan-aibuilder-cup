"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import {
    Card, Row, Col, Tag, Space, Typography, Button, Steps, Progress,
    message, Modal, Input, Divider, Timeline, Tooltip, Avatar, Empty,
    Statistic, Descriptions, Badge, Alert,
} from "antd";
import { motion } from "framer-motion";
import {
    RocketOutlined, CheckCircleOutlined, ClockCircleOutlined,
    PlayCircleOutlined, StopOutlined, ReloadOutlined, ArrowLeftOutlined,
    UserOutlined, EditOutlined, WarningOutlined, ThunderboltOutlined,
    ExclamationCircleOutlined, FileExcelOutlined, FilePdfOutlined,
    CalendarOutlined, FieldTimeOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import RbacGuard from "@/components/common/RbacGuard";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";

dayjs.extend(relativeTime);
dayjs.extend(duration);

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const STATUS_COLORS: Record<string, string> = {
    pending: 'default', in_progress: 'processing', completed: 'success', cancelled: 'warning', failed: 'error',
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
    pending: <ClockCircleOutlined />,
    in_progress: <ThunderboltOutlined style={{ color: '#3b82f6' }} />,
    completed: <CheckCircleOutlined style={{ color: '#22c55e' }} />,
    cancelled: <WarningOutlined style={{ color: '#f59e0b' }} />,
    failed: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
};

export default function RunDetailPage() {
    const params = useParams();
    const router = useRouter();
    const runId = params?.id as string;
    const { themeColor } = usePreferencesStore();

    const [run, setRun] = useState<any>(null);
    const [steps, setSteps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [noteModal, setNoteModal] = useState<{ open: boolean; stepId: string; note: string }>({ open: false, stepId: '', note: '' });

    const loadData = useCallback(async () => {
        if (!runId) return;
        setLoading(true);
        try {
            const [runData, stepsData] = await Promise.all([
                gql(`query($t: String!) { opsRuns(tenantId: $t) {
                    id name status playbookId playbookName playbookCategory playbookPriority
                    startedBy startedAt completedAt dueAt notes scheduleId createdAt
                } }`, { t: DEFAULT_TENANT_ID }),
                gql(`query($runId: String!) { opsRunSteps(runId: $runId) {
                    id runId stepId stepOrder title status assigneeId assigneeName
                    startedAt completedAt notes completedBy createdAt
                } }`, { runId }),
            ]);
            const found = (runData.opsRuns || []).find((r: any) => r.id === runId);
            setRun(found || null);
            setSteps((stepsData.opsRunSteps || []).sort((a: any, b: any) => a.stepOrder - b.stepOrder));
        } catch (err: any) { message.error(err.message); }
        finally { setLoading(false); }
    }, [runId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleStatusChange = async (status: string) => {
        try {
            await gql(`mutation($id: String!, $status: String!) { updateOpsRunStatus(id: $id, status: $status) { id } }`, { id: runId, status });
            message.success(`Run ${status.replace('_', ' ')}`);
            loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const handleStepStatus = async (stepId: string, status: string) => {
        try {
            await gql(`mutation($id: String!, $status: String!) { updateOpsRunStepStatus(id: $id, status: $status) { id } }`, { id: stepId, status });
            message.success(`Step ${status.replace('_', ' ')}`);
            loadData();
        } catch (err: any) { message.error(err.message); }
    };

    const handleStepNote = async () => {
        if (!noteModal.stepId) return;
        try {
            // Use direct Supabase REST for step notes update
            const SUPABASE_URL = 'http://localhost:8000';
            const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc1MjE1MjE4LCJleHAiOjIxNDU5MTY4MDB9.6q7QrCyLzEJ-m2Mw8Y29BNR_tF3fKAfbXhdcc4HKxhE';
            await fetch(`${SUPABASE_URL}/rest/v1/ops_run_steps?id=eq.${noteModal.stepId}`, {
                method: 'PATCH',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: noteModal.note }),
            });
            message.success('Note saved');
            setNoteModal({ open: false, stepId: '', note: '' });
            loadData();
        } catch (err: any) { message.error(err.message); }
    };

    if (loading && !run) {
        return <CMSLayout title="Loading..."><Card loading style={glass} /></CMSLayout>;
    }
    if (!run) {
        return (
            <CMSLayout title="Run Not Found">
                <Empty description="This run does not exist or was deleted">
                    <Button onClick={() => router.push('/admin/ops/runs')}>Back to Runs</Button>
                </Empty>
            </CMSLayout>
        );
    }

    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const failedSteps = steps.filter(s => s.status === 'failed').length;
    const inProgressSteps = steps.filter(s => s.status === 'in_progress').length;
    const progressPercent = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;
    const currentStepIdx = steps.findIndex(s => s.status === 'pending' || s.status === 'in_progress');

    const runDuration = (() => {
        const start = run.startedAt || run.createdAt;
        const end = run.completedAt || new Date().toISOString();
        const mins = dayjs(end).diff(dayjs(start), 'minute');
        if (mins < 60) return `${mins} min`;
        return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    })();

    const isOverdue = run.dueAt && dayjs(run.dueAt).isBefore(dayjs()) && !['completed', 'cancelled'].includes(run.status);

    // Build timeline events from steps
    const timelineEvents = steps
        .filter(s => s.startedAt || s.completedAt)
        .flatMap(s => {
            const events: any[] = [];
            if (s.startedAt) events.push({ time: s.startedAt, label: `Started: ${s.title}`, color: 'blue', user: s.assigneeName });
            if (s.completedAt) events.push({ time: s.completedAt, label: `Completed: ${s.title}`, color: s.status === 'failed' ? 'red' : 'green', user: s.completedBy });
            return events;
        })
        .sort((a, b) => dayjs(b.time).unix() - dayjs(a.time).unix());

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>{run.name}</AuroraText>}
            subTitle={<Space><Tag color={STATUS_COLORS[run.status]}>{run.status?.replace('_', ' ')}</Tag><Text type="secondary">{run.playbookName}</Text></Space>}
            extra={[
                <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => router.push('/admin/ops/runs')}>Back</Button>,
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
                run.status === 'pending' && (
                    <Button key="start" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStatusChange('in_progress')}>
                        Start Run
                    </Button>
                ),
                run.status === 'in_progress' && progressPercent === 100 && (
                    <Button key="complete" type="primary" style={{ background: '#22c55e' }} icon={<CheckCircleOutlined />}
                        onClick={() => handleStatusChange('completed')}>
                        Mark Complete
                    </Button>
                ),
                run.status === 'in_progress' && (
                    <Button key="cancel" danger icon={<StopOutlined />}
                        onClick={() => Modal.confirm({ title: 'Cancel this run?', onOk: () => handleStatusChange('cancelled') })}>
                        Cancel
                    </Button>
                ),
                <RbacGuard key="exp" requiredRole="manager">
                    <Tooltip title="Export PDF">
                        <Button size="small" icon={<FilePdfOutlined />} onClick={() => exportToPdf({
                            fileName: `run_${run.name}`, title: `Run: ${run.name}`,
                            columns: [{ header: 'Step', key: 'title' }, { header: 'Status', key: 'status' }, { header: 'Assignee', key: 'assigneeName' }, { header: 'Notes', key: 'notes' }],
                            data: steps,
                        })} />
                    </Tooltip>
                </RbacGuard>,
            ]}
        >
            {isOverdue && (
                <Alert type="warning" message={<Space><WarningOutlined />This run is <Text strong type="danger">overdue</Text> — due {dayjs(run.dueAt).fromNow()}</Space>}
                    showIcon={false} style={{ marginBottom: 16, borderRadius: 12 }} banner />
            )}

            {/* ─── Run Metadata ─── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={16}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Card size="small" style={glass}>
                            <Descriptions size="small" column={{ xs: 1, md: 3 }} labelStyle={{ fontSize: 12, color: '#94a3b8' }}>
                                <Descriptions.Item label="Playbook">{run.playbookName}</Descriptions.Item>
                                <Descriptions.Item label="Category"><Tag>{run.playbookCategory}</Tag></Descriptions.Item>
                                <Descriptions.Item label="Priority"><Tag color={run.playbookPriority === 'critical' ? 'red' : run.playbookPriority === 'high' ? 'orange' : 'blue'}>{run.playbookPriority}</Tag></Descriptions.Item>
                                <Descriptions.Item label="Started By">{run.startedBy || '—'}</Descriptions.Item>
                                <Descriptions.Item label="Started At">{run.startedAt ? dayjs(run.startedAt).format('MMM D, HH:mm') : '—'}</Descriptions.Item>
                                <Descriptions.Item label="Due">{run.dueAt ? dayjs(run.dueAt).format('MMM D, HH:mm') : '—'}</Descriptions.Item>
                                {run.notes && <Descriptions.Item label="Notes" span={3}><Paragraph style={{ margin: 0, fontSize: 12 }}>{run.notes}</Paragraph></Descriptions.Item>}
                            </Descriptions>
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                        <Card size="small" style={{ ...glass, textAlign: 'center' }}>
                            <Progress type="circle" percent={progressPercent} size={100}
                                strokeColor={progressPercent === 100 ? '#22c55e' : { '0%': '#6366f1', '100%': '#3b82f6' }}
                                format={() => <span style={{ fontSize: 20, fontWeight: 700 }}>{progressPercent}%</span>} />
                            <div style={{ marginTop: 8 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>{completedSteps} of {steps.length} steps</Text>
                            </div>
                            <Row gutter={8} style={{ marginTop: 12 }}>
                                <Col span={8}><Statistic title="Done" value={completedSteps} valueStyle={{ color: '#22c55e', fontSize: 18 }} /></Col>
                                <Col span={8}><Statistic title="Active" value={inProgressSteps} valueStyle={{ color: '#3b82f6', fontSize: 18 }} /></Col>
                                <Col span={8}><Statistic title="Failed" value={failedSteps} valueStyle={{ color: '#ef4444', fontSize: 18 }} /></Col>
                            </Row>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* ─── Step Execution ─── */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                        <Card title={<Space><ThunderboltOutlined /> Step Execution</Space>} size="small" style={glass}>
                            {steps.length === 0 ? (
                                <Empty description="No steps defined for this run" />
                            ) : (
                                <Steps direction="vertical" current={currentStepIdx >= 0 ? currentStepIdx : steps.length} size="small"
                                    items={steps.map((step, idx) => ({
                                        title: (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                <Space>
                                                    <Text strong style={{ fontSize: 13 }}>{step.title}</Text>
                                                    <Tag color={STATUS_COLORS[step.status]} style={{ fontSize: 10 }}>{step.status?.replace('_', ' ')}</Tag>
                                                </Space>
                                                <Space size={4}>
                                                    {step.assigneeName && (
                                                        <Tag icon={<UserOutlined />} color="blue" style={{ fontSize: 10, margin: 0 }}>{step.assigneeName}</Tag>
                                                    )}
                                                </Space>
                                            </div>
                                        ),
                                        description: (
                                            <div style={{ padding: '6px 0' }}>
                                                {step.notes && (
                                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>{step.notes}</Text>
                                                )}
                                                <Space size={4} wrap>
                                                    {step.startedAt && (
                                                        <Text type="secondary" style={{ fontSize: 10 }}>
                                                            <CalendarOutlined /> Started {dayjs(step.startedAt).format('HH:mm')}
                                                        </Text>
                                                    )}
                                                    {step.completedAt && (
                                                        <Text type="secondary" style={{ fontSize: 10, marginLeft: 8 }}>
                                                            <CheckCircleOutlined /> Completed {dayjs(step.completedAt).fromNow()}
                                                        </Text>
                                                    )}
                                                    {step.completedBy && (
                                                        <Text type="secondary" style={{ fontSize: 10, marginLeft: 8 }}>by {step.completedBy}</Text>
                                                    )}
                                                </Space>

                                                {/* Action buttons */}
                                                {run.status === 'in_progress' && (
                                                    <div style={{ marginTop: 6 }}>
                                                        <Space size={4}>
                                                            {step.status === 'pending' && (
                                                                <Button size="small" type="primary" icon={<PlayCircleOutlined />}
                                                                    onClick={() => handleStepStatus(step.id, 'in_progress')}>
                                                                    Start
                                                                </Button>
                                                            )}
                                                            {step.status === 'in_progress' && (
                                                                <>
                                                                    <Button size="small" type="primary" style={{ background: '#22c55e' }}
                                                                        icon={<CheckCircleOutlined />} onClick={() => handleStepStatus(step.id, 'completed')}>
                                                                        Complete
                                                                    </Button>
                                                                    <Button size="small" danger icon={<ExclamationCircleOutlined />}
                                                                        onClick={() => handleStepStatus(step.id, 'failed')}>
                                                                        Fail
                                                                    </Button>
                                                                </>
                                                            )}
                                                            {(step.status === 'pending' || step.status === 'in_progress') && (
                                                                <Button size="small" icon={<EditOutlined />}
                                                                    onClick={() => setNoteModal({ open: true, stepId: step.id, note: step.notes || '' })}>
                                                                    Note
                                                                </Button>
                                                            )}
                                                        </Space>
                                                    </div>
                                                )}
                                            </div>
                                        ),
                                        status: step.status === 'completed' ? 'finish' : step.status === 'in_progress' ? 'process' : step.status === 'failed' ? 'error' : 'wait',
                                    }))}
                                />
                            )}
                        </Card>
                    </motion.div>
                </Col>

                {/* ─── Activity Timeline ─── */}
                <Col xs={24} lg={8}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                        <Card title={<Space><FieldTimeOutlined /> Activity Timeline</Space>} size="small" style={glass}>
                            {timelineEvents.length === 0 ? (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No activity yet" />
                            ) : (
                                <Timeline
                                    items={timelineEvents.slice(0, 20).map(evt => ({
                                        color: evt.color,
                                        children: (
                                            <div>
                                                <Text style={{ fontSize: 12 }}>{evt.label}</Text>
                                                <br />
                                                <Space size={4}>
                                                    {evt.user && <Text type="secondary" style={{ fontSize: 10 }}>{evt.user}</Text>}
                                                    <Text type="secondary" style={{ fontSize: 10 }}>{dayjs(evt.time).format('HH:mm')}</Text>
                                                </Space>
                                            </div>
                                        ),
                                    }))}
                                />
                            )}
                        </Card>

                        {/* Quick Stats */}
                        <Card size="small" style={{ ...glass, marginTop: 16 }}>
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Duration</Text>
                                    <Text strong style={{ fontSize: 12 }}>{runDuration}</Text>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Assignees</Text>
                                    <Text strong style={{ fontSize: 12 }}>{[...new Set(steps.filter(s => s.assigneeName).map(s => s.assigneeName))].length}</Text>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Steps with Notes</Text>
                                    <Text strong style={{ fontSize: 12 }}>{steps.filter(s => s.notes).length}</Text>
                                </div>
                                {run.scheduleId && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Triggered by</Text>
                                        <Tag color="purple" style={{ fontSize: 10 }}>Schedule</Tag>
                                    </div>
                                )}
                            </Space>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* Step Note Modal */}
            <Modal title="Step Notes" open={noteModal.open} onCancel={() => setNoteModal({ open: false, stepId: '', note: '' })}
                onOk={handleStepNote} okText="Save Note">
                <TextArea rows={4} value={noteModal.note} onChange={e => setNoteModal(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="Add execution notes, observations, or issues..." />
            </Modal>
        </CMSLayout>
    );
}
