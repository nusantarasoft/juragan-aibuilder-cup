"use client";
import React, { useState } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Switch, Divider, Timeline, Select, Steps, Badge, Empty, Tooltip, Input, message } from "antd";
import {
    ThunderboltOutlined, FormOutlined, MailOutlined, BellOutlined,
    TeamOutlined, CheckCircleOutlined, ClockCircleOutlined, RocketOutlined,
    PlusOutlined, SettingOutlined, BranchesOutlined, PlayCircleOutlined,
    EditOutlined, DeleteOutlined, ArrowRightOutlined, SyncOutlined,
    ApartmentOutlined, FlagOutlined, SafetyOutlined, StarOutlined,
    ApiOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text, Title, Paragraph } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface Workflow {
    id: string;
    name: string;
    trigger: string;
    actions: string[];
    enabled: boolean;
    lastRun?: string;
    runCount: number;
}

const SAMPLE_WORKFLOWS: Workflow[] = [
    {
        id: '1', name: 'KPI Auto-Scoring', trigger: 'on_submit',
        actions: ['calculate_score', 'notify_reviewer', 'update_hr_record'],
        enabled: true, lastRun: '2 hours ago', runCount: 47,
    },
    {
        id: '2', name: 'Survey Completion Reminder', trigger: 'on_due_date',
        actions: ['send_reminder', 'escalate_to_manager'],
        enabled: true, lastRun: '1 day ago', runCount: 23,
    },
    {
        id: '3', name: 'Audit Form Approval', trigger: 'on_submit',
        actions: ['assign_reviewer', 'create_itsm_ticket', 'send_notification'],
        enabled: false, lastRun: '3 days ago', runCount: 12,
    },
    {
        id: '4', name: 'Employee Onboarding', trigger: 'on_publish',
        actions: ['assign_to_department', 'set_due_date', 'notify_assignees'],
        enabled: true, lastRun: 'Never', runCount: 0,
    },
    {
        id: '5', name: 'Quality Assessment Flow', trigger: 'on_review',
        actions: ['calculate_score', 'update_pm_metrics', 'create_report'],
        enabled: true, lastRun: '5 hours ago', runCount: 31,
    },
];

const TRIGGERS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    on_submit: { label: 'On Submit', color: '#3b82f6', icon: <FormOutlined /> },
    on_review: { label: 'On Review', color: '#8b5cf6', icon: <CheckCircleOutlined /> },
    on_due_date: { label: 'Before Due Date', color: '#f59e0b', icon: <ClockCircleOutlined /> },
    on_publish: { label: 'On Publish', color: '#10b981', icon: <RocketOutlined /> },
    on_assign: { label: 'On Assignment', color: '#ec4899', icon: <TeamOutlined /> },
    scheduled: { label: 'Scheduled', color: '#06b6d4', icon: <SyncOutlined /> },
};

const ACTIONS: Record<string, { label: string; color: string; icon: React.ReactNode; module?: string }> = {
    calculate_score: { label: 'Calculate Score', color: '#8b5cf6', icon: <StarOutlined />, module: 'Forms' },
    notify_reviewer: { label: 'Notify Reviewer', color: '#3b82f6', icon: <MailOutlined />, module: 'Notifications' },
    send_notification: { label: 'Send Notification', color: '#3b82f6', icon: <BellOutlined />, module: 'Notifications' },
    send_reminder: { label: 'Send Reminder', color: '#f59e0b', icon: <ClockCircleOutlined />, module: 'Notifications' },
    assign_reviewer: { label: 'Auto-Assign Reviewer', color: '#10b981', icon: <TeamOutlined />, module: 'Forms' },
    assign_to_department: { label: 'Assign to Department', color: '#ec4899', icon: <ApartmentOutlined />, module: 'HR' },
    set_due_date: { label: 'Set Due Date', color: '#06b6d4', icon: <FlagOutlined />, module: 'Forms' },
    notify_assignees: { label: 'Notify Assignees', color: '#f59e0b', icon: <MailOutlined />, module: 'Notifications' },
    escalate_to_manager: { label: 'Escalate to Manager', color: '#ef4444', icon: <ArrowRightOutlined />, module: 'HR' },
    update_hr_record: { label: 'Update HR Record', color: '#ef4444', icon: <TeamOutlined />, module: 'HR' },
    update_pm_metrics: { label: 'Update PM Metrics', color: '#13c2c2', icon: <ApiOutlined />, module: 'PM' },
    create_itsm_ticket: { label: 'Create ITSM Ticket', color: '#722ed1', icon: <SafetyOutlined />, module: 'ITSM' },
    create_report: { label: 'Generate Report', color: '#1890ff', icon: <FormOutlined />, module: 'Reports' },
};

export default function FormWorkflowsPage() {
    const { themeColor } = usePreferencesStore();
    const [workflows, setWorkflows] = useState<Workflow[]>(SAMPLE_WORKFLOWS);
    const [messageApi, contextHolder] = message.useMessage();
    const [expandedId, setExpandedId] = useState<string | null>('1');

    const toggleEnabled = (id: string) => {
        setWorkflows(wfs => wfs.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
        const wf = workflows.find(w => w.id === id);
        messageApi.success(`${wf?.name} ${wf?.enabled ? 'disabled' : 'enabled'}`);
    };

    const stats = {
        total: workflows.length,
        active: workflows.filter(w => w.enabled).length,
        totalRuns: workflows.reduce((s, w) => s + w.runCount, 0),
    };

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#f59e0b', '#10b981']}>Form Workflows</AuroraText>}
            subTitle={<DecryptedText text="Automate form lifecycle with triggers & actions" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[
                <Button key="new" type="primary" icon={<PlusOutlined />} style={{ background: themeColor, borderColor: themeColor }}>
                    Create Workflow
                </Button>,
            ]}
        >
            {contextHolder}
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                {/* Stats */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    {[
                        { label: 'Total Workflows', value: stats.total, color: '#3b82f6', icon: <BranchesOutlined /> },
                        { label: 'Active', value: stats.active, color: '#10b981', icon: <PlayCircleOutlined /> },
                        { label: 'Total Runs', value: stats.totalRuns, color: '#8b5cf6', icon: <ThunderboltOutlined /> },
                    ].map((s, i) => (
                        <Col xs={8} key={i}>
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card style={{ ...glass, borderTop: `3px solid ${s.color}` }} bodyStyle={{ padding: '14px 18px' }}>
                                    <Space>
                                        <span style={{ fontSize: 20, color: s.color }}>{s.icon}</span>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 10 }}>{s.label}</Text>
                                            <div><Text strong style={{ fontSize: 20, color: s.color }}>{s.value}</Text></div>
                                        </div>
                                    </Space>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Workflow Cards */}
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <AnimatePresence>
                        {workflows.map((wf, idx) => {
                            const trigger = TRIGGERS[wf.trigger] || TRIGGERS['on_submit'];
                            const isExpanded = expandedId === wf.id;

                            return (
                                <motion.div key={wf.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <Card
                                        style={{
                                            ...glass,
                                            borderLeft: `4px solid ${wf.enabled ? trigger.color : '#d1d5db'}`,
                                            opacity: wf.enabled ? 1 : 0.6,
                                            cursor: 'pointer',
                                        }}
                                        bodyStyle={{ padding: '16px 20px' }}
                                        onClick={() => setExpandedId(isExpanded ? null : wf.id)}
                                    >
                                        {/* Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Space size={12}>
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: 10,
                                                    background: `${trigger.color}15`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 18, color: trigger.color,
                                                }}>
                                                    {trigger.icon}
                                                </div>
                                                <div>
                                                    <Text strong style={{ fontSize: 14 }}>{wf.name}</Text>
                                                    <div>
                                                        <Tag color={trigger.color} style={{ fontSize: 10 }}>{trigger.label}</Tag>
                                                        <Tag style={{ fontSize: 10 }}>{wf.actions.length} actions</Tag>
                                                        {wf.runCount > 0 && <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>{wf.runCount} runs</Text>}
                                                    </div>
                                                </div>
                                            </Space>
                                            <Space onClick={e => e.stopPropagation()}>
                                                <Text type="secondary" style={{ fontSize: 11, marginRight: 8 }}>
                                                    {wf.lastRun || 'Never'}
                                                </Text>
                                                <Switch checked={wf.enabled} onChange={() => toggleEnabled(wf.id)} size="small" />
                                            </Space>
                                        </div>

                                        {/* Expanded Detail */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    style={{ overflow: 'hidden' }}
                                                >
                                                    <Divider style={{ margin: '12px 0' }} />
                                                    <div style={{ padding: '0 4px' }}>
                                                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Action Pipeline</Text>
                                                        <div style={{ marginTop: 10 }}>
                                                            <Steps direction="vertical" size="small" current={wf.actions.length}
                                                                items={wf.actions.map(actionKey => {
                                                                    const action = ACTIONS[actionKey];
                                                                    if (!action) return { title: actionKey };
                                                                    return {
                                                                        title: (
                                                                            <Space>
                                                                                <span style={{ color: action.color }}>{action.icon}</span>
                                                                                <Text style={{ fontSize: 12 }}>{action.label}</Text>
                                                                                {action.module && <Tag style={{ fontSize: 9 }}>{action.module}</Tag>}
                                                                            </Space>
                                                                        ),
                                                                        status: 'finish' as const,
                                                                        icon: <div style={{
                                                                            width: 24, height: 24, borderRadius: 6,
                                                                            background: `${action.color}20`, color: action.color,
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            fontSize: 12,
                                                                        }}>{action.icon}</div>,
                                                                    };
                                                                })}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                                                            <Button size="small" icon={<PlayCircleOutlined />} style={{ borderRadius: 6 }}>Test Run</Button>
                                                            <Button size="small" icon={<EditOutlined />} style={{ borderRadius: 6 }}>Edit</Button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </Space>

                {/* Integration Map */}
                <Card style={{ ...glass, marginTop: 20 }}
                    title={<Space><ApiOutlined style={{ color: '#6366f1' }} /> Cross-Module Integration Map</Space>}>
                    <Row gutter={[16, 16]}>
                        {[
                            { module: 'HR', desc: 'KPI scores → Employee records, Onboarding forms → Auto-assign', color: '#ef4444', icon: <TeamOutlined /> },
                            { module: 'PM', desc: 'Quality metrics → Project dashboard, Checklists → Task completion', color: '#13c2c2', icon: <FlagOutlined /> },
                            { module: 'ITSM', desc: 'Audit forms → Tickets, Security assessments → Compliance', color: '#722ed1', icon: <SafetyOutlined /> },
                            { module: 'CRM', desc: 'Surveys → Customer records, Feedback → Case creation', color: '#1890ff', icon: <FormOutlined /> },
                            { module: 'Notifications', desc: 'Reminders, Escalations, Approval alerts', color: '#f59e0b', icon: <BellOutlined /> },
                            { module: 'Reports', desc: 'Auto-generated KPI reports, Submission analytics', color: '#10b981', icon: <StarOutlined /> },
                        ].map((m, i) => (
                            <Col xs={24} sm={12} md={8} key={i}>
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                                    <Card size="small" hoverable style={{
                                        borderRadius: 12, borderLeft: `3px solid ${m.color}`,
                                        background: `linear-gradient(135deg, ${m.color}05, rgba(255,255,255,0.8))`,
                                        height: '100%',
                                    }}>
                                        <Space align="start">
                                            <span style={{ fontSize: 20, color: m.color }}>{m.icon}</span>
                                            <div>
                                                <Text strong style={{ fontSize: 13 }}>{m.module}</Text>
                                                <div><Text type="secondary" style={{ fontSize: 11 }}>{m.desc}</Text></div>
                                            </div>
                                        </Space>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>
            </div>
        </CMSLayout>
    );
}
