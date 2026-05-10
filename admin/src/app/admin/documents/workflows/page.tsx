'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Table, Typography, Tag, Spin, Empty, Row, Col, Button, Modal, Form, Input, Space, message, Steps, Badge, Tabs } from 'antd';
import { ApartmentOutlined, PlusOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, SendOutlined, DeleteOutlined } from '@ant-design/icons';
import { documentService, DocWorkflow, DocWorkflowInstance } from '@/lib/documentService';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import dayjs from 'dayjs';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    pending: { color: 'blue', icon: <ClockCircleOutlined /> },
    in_progress: { color: 'orange', icon: <ClockCircleOutlined /> },
    approved: { color: 'green', icon: <CheckCircleOutlined /> },
    rejected: { color: 'red', icon: <CloseCircleOutlined /> },
    cancelled: { color: 'default', icon: <CloseCircleOutlined /> },
};

export default function WorkflowsPage() {
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const [workflows, setWorkflows] = useState<DocWorkflow[]>([]);
    const [instances, setInstances] = useState<DocWorkflowInstance[]>([]);
    const [modal, setModal] = useState(false);
    const [form] = Form.useForm();
    const [msgApi, ctxHolder] = message.useMessage();

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [wf, inst] = await Promise.all([documentService.getWorkflows(), documentService.getWorkflowInstances()]);
                setWorkflows(wf); setInstances(inst);
            } catch {} finally { setLoading(false); }
        })();
    }, []);

    const createWf = async () => {
        try {
            const vals = await form.validateFields();
            const steps = (vals.steps || '').split(',').map((s: string) => s.trim()).filter(Boolean).map((s: string, i: number) => ({ step: i + 1, name: s, approver: '' }));
            await documentService.createWorkflow(undefined, { name: vals.name, description: vals.description, steps });
            msgApi.success('Workflow created');
            setModal(false); form.resetFields();
            setWorkflows(await documentService.getWorkflows());
        } catch (e: any) { if (e.message) msgApi.error(e.message); }
    };

    const approve = async (id: string) => { try { await documentService.approveWorkflowStep(id); msgApi.success('Approved'); setInstances(await documentService.getWorkflowInstances()); } catch { msgApi.error('Failed'); } };
    const reject = async (id: string) => { try { await documentService.rejectWorkflowStep(id); msgApi.success('Rejected'); setInstances(await documentService.getWorkflowInstances()); } catch { msgApi.error('Failed'); } };

    const pendingCount = instances.filter(i => ['pending', 'in_progress'].includes(i.status)).length;
    const approvedCount = instances.filter(i => i.status === 'approved').length;
    const rejectedCount = instances.filter(i => i.status === 'rejected').length;

    const instanceCols = [
        { title: 'Document', dataIndex: 'fileName', key: 'file', ellipsis: true, render: (v: string) => <Text strong>{v || '—'}</Text> },
        { title: 'Workflow', dataIndex: 'workflowName', key: 'wf', width: 160, render: (v: string) => v || '—' },
        { title: 'Step', dataIndex: 'currentStep', key: 'step', width: 60, align: 'center' as const, render: (v: number) => <Tag>{v + 1}</Tag> },
        {
            title: 'Status', key: 'st', width: 110,
            render: (_: any, r: DocWorkflowInstance) => {
                const cfg = statusConfig[r.status] || statusConfig.pending;
                return <Tag color={cfg.color} icon={cfg.icon}>{r.status}</Tag>;
            },
        },
        { title: 'Submitted By', dataIndex: 'submittedBy', key: 'by', width: 110, render: (v: string) => v || '—' },
        { title: 'Date', key: 'date', width: 130, render: (_: any, r: DocWorkflowInstance) => r.createdAt ? dayjs(r.createdAt).format('DD MMM YYYY') : '—' },
        {
            title: '', key: 'actions', width: 120,
            render: (_: any, r: DocWorkflowInstance) => ['pending', 'in_progress'].includes(r.status) ? (
                <Space size={4}>
                    <Button size="small" type="primary" onClick={() => approve(r.id)} style={{ borderRadius: 6, background: '#10b981', borderColor: '#10b981', fontSize: 11 }}>Approve</Button>
                    <Button size="small" danger onClick={() => reject(r.id)} style={{ borderRadius: 6, fontSize: 11 }}>Reject</Button>
                </Space>
            ) : null,
        },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Approval Workflows</AuroraText>}
            subTitle={<DecryptedText text="Document approval chains with multi-step review" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal(true); }} style={{ borderRadius: 8, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}>New Workflow</Button>]}>
            {ctxHolder}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* KPIs */}
                <Row gutter={[14, 14]}>
                    {[
                        { t: 'Workflows', v: workflows.length, c: '#6366f1' },
                        { t: 'Pending', v: pendingCount, c: '#f59e0b' },
                        { t: 'Approved', v: approvedCount, c: '#10b981' },
                        { t: 'Rejected', v: rejectedCount, c: '#ef4444' },
                    ].map((s, i) => (
                        <Col key={i} xs={12} sm={6}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <Card size="small" style={{ ...glass, textAlign: 'center', borderTop: `3px solid ${s.c}` }}>
                                <Text style={{ fontSize: 24, fontWeight: 700, color: s.c, display: 'block' }}>{s.v}</Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>{s.t}</Text>
                            </Card>
                        </motion.div></Col>
                    ))}
                </Row>

                {loading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div> : (
                    <Tabs defaultActiveKey="instances" items={[
                        {
                            key: 'instances', label: <Space>Approval Queue <Badge count={pendingCount} style={{ background: '#f59e0b' }} /></Space>,
                            children: instances.length === 0 ? <Card style={glass}><Empty description="No approval requests." /></Card> :
                                <Card style={glass}><Table scroll={{ x: 900 }} dataSource={instances.map(i => ({ ...i, key: i.id }))} columns={instanceCols} size="small" pagination={{ pageSize: 15 }} /></Card>,
                        },
                        {
                            key: 'workflows', label: `Workflow Definitions (${workflows.length})`,
                            children: workflows.length === 0 ? <Card style={glass}><Empty description="No workflows defined." /></Card> :
                                <Row gutter={[14, 14]}>{workflows.map((wf, i) => (
                                    <Col key={wf.id} xs={24} sm={12} lg={8}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                        <Card style={{ ...glass, borderLeft: `3px solid ${themeColor}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <Text strong style={{ fontSize: 14 }}>{wf.name}</Text>
                                                <Tag color={wf.status === 'active' ? 'green' : 'default'}>{wf.status}</Tag>
                                            </div>
                                            {wf.description && <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>{wf.description}</Text>}
                                            <Steps size="small" items={(wf.steps || []).map((s: any) => ({ title: s.name, status: 'wait' as const }))} />
                                        </Card>
                                    </motion.div></Col>
                                ))}</Row>,
                        },
                    ]} />
                )}
            </motion.div>

            <Modal title="New Workflow" open={modal} onOk={createWf} onCancel={() => setModal(false)} okText="Create">
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Workflow Name" rules={[{ required: true }]}><Input placeholder="Document Approval" /></Form.Item>
                    <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
                    <Form.Item name="steps" label="Steps (comma-separated)" rules={[{ required: true }]}><Input placeholder="Draft Review, Manager Approval, Legal Review, Final Sign-off" /></Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
