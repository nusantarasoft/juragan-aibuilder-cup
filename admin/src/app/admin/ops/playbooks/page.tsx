"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Table, Button, Tag, Space, Modal, Form, Input, Select, Card, Empty,
    message, Typography, Row, Col, Statistic, Tooltip, InputNumber, Drawer, List, Checkbox,
} from "antd";
import { motion } from "framer-motion";
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
    BookOutlined, PlayCircleOutlined, OrderedListOutlined,
    ThunderboltOutlined, ClockCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import RbacGuard from "@/components/common/RbacGuard";
import { FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const PRIORITY_COLORS: Record<string, string> = { critical: 'red', high: 'orange', medium: 'blue', low: 'default' };
const STEP_TYPE_COLORS: Record<string, string> = { task: 'blue', approval: 'orange', check: 'green', notification: 'purple' };

const PLAYBOOK_FIELDS: FieldDef[] = [
    { name: "name", label: "Playbook Name", required: true },
    { name: "description", label: "Description" },
    { name: "category", label: "Category" },
];

export default function PlaybooksPage() {
    const { themeColor } = usePreferencesStore();
    const [playbooks, setPlaybooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPb, setEditingPb] = useState<any>(null);
    const [form] = Form.useForm();

    // Steps drawer
    const [stepsDrawerOpen, setStepsDrawerOpen] = useState(false);
    const [selectedPb, setSelectedPb] = useState<any>(null);
    const [steps, setSteps] = useState<any[]>([]);
    const [stepsLoading, setStepsLoading] = useState(false);
    const [stepForm] = Form.useForm();
    const [stepModalOpen, setStepModalOpen] = useState(false);
    const [editingStep, setEditingStep] = useState<any>(null);

    const loadPlaybooks = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`query($t: String!) { opsPlaybooks(tenantId: $t) {
                id name description category priority estimatedMinutes tags isActive createdBy createdAt
            } }`, { t: DEFAULT_TENANT_ID });
            setPlaybooks(data.opsPlaybooks || []);
        } catch (err: any) { message.error(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadPlaybooks(); }, [loadPlaybooks]);

    const loadSteps = async (playbookId: string) => {
        setStepsLoading(true);
        try {
            const data = await gql(`query($pbId: String!) { opsPlaybookSteps(playbookId: $pbId) {
                id playbookId stepOrder title description stepType isRequired defaultAssigneeId estimatedMinutes
            } }`, { pbId: playbookId });
            setSteps(data.opsPlaybookSteps || []);
        } catch (err: any) { message.error(err.message); }
        finally { setStepsLoading(false); }
    };

    const handleSave = async (values: any) => {
        try {
            if (editingPb) {
                await gql(`mutation($id: String!, $name: String, $description: String, $category: String, $priority: String, $estimatedMinutes: Float) {
                    updateOpsPlaybook(id: $id, name: $name, description: $description, category: $category, priority: $priority, estimatedMinutes: $estimatedMinutes) { id }
                }`, { id: editingPb.id, ...values });
                message.success("Playbook updated");
            } else {
                await gql(`mutation($t: String!, $name: String!, $description: String, $category: String, $priority: String, $estimatedMinutes: Float) {
                    createOpsPlaybook(tenantId: $t, name: $name, description: $description, category: $category, priority: $priority, estimatedMinutes: $estimatedMinutes) { id }
                }`, { t: DEFAULT_TENANT_ID, ...values });
                message.success("Playbook created");
            }
            setIsModalOpen(false); form.resetFields(); setEditingPb(null); loadPlaybooks();
        } catch (err: any) { message.error(err.message); }
    };

    const handleBatchCreate = async (records: any[]) => {
        let success = 0, failed = 0; const errors: string[] = [];
        for (const r of records) {
            try {
                await gql(`mutation($t: String!, $name: String!, $description: String, $category: String) {
                    createOpsPlaybook(tenantId: $t, name: $name, description: $description, category: $category) { id }
                }`, { t: DEFAULT_TENANT_ID, name: r.name, description: r.description, category: r.category });
                success++;
            } catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        loadPlaybooks(); return { success, failed, errors };
    };

    const handleDelete = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteOpsPlaybook(id: $id) }`, { id });
            message.success("Deleted"); loadPlaybooks();
        } catch (err: any) { message.error(err.message); }
    };

    const handleStartRun = async (pb: any) => {
        try {
            await gql(`mutation($t: String!, $pbId: String!, $name: String!) {
                createOpsRun(tenantId: $t, playbookId: $pbId, name: $name) { id }
            }`, { t: DEFAULT_TENANT_ID, pbId: pb.id, name: `${pb.name} — ${dayjs().format('MMM D HH:mm')}` });
            message.success("Run started!");
        } catch (err: any) { message.error(err.message); }
    };

    // Steps CRUD
    const handleSaveStep = async (values: any) => {
        try {
            if (editingStep) {
                await gql(`mutation($id: String!, $title: String, $description: String, $stepType: String, $stepOrder: Float, $isRequired: Boolean, $estimatedMinutes: Float) {
                    updateOpsPlaybookStep(id: $id, title: $title, description: $description, stepType: $stepType, stepOrder: $stepOrder, isRequired: $isRequired, estimatedMinutes: $estimatedMinutes) { id }
                }`, { id: editingStep.id, ...values });
                message.success("Step updated");
            } else {
                await gql(`mutation($pbId: String!, $title: String!, $description: String, $stepType: String, $stepOrder: Float, $isRequired: Boolean, $estimatedMinutes: Float) {
                    createOpsPlaybookStep(playbookId: $pbId, title: $title, description: $description, stepType: $stepType, stepOrder: $stepOrder, isRequired: $isRequired, estimatedMinutes: $estimatedMinutes) { id }
                }`, { pbId: selectedPb.id, ...values });
                message.success("Step added");
            }
            setStepModalOpen(false); stepForm.resetFields(); setEditingStep(null);
            loadSteps(selectedPb.id);
        } catch (err: any) { message.error(err.message); }
    };

    const handleDeleteStep = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { deleteOpsPlaybookStep(id: $id) }`, { id });
            message.success("Step deleted"); loadSteps(selectedPb.id);
        } catch (err: any) { message.error(err.message); }
    };

    const columns: ColumnsType<any> = [
        {
            title: "Playbook", key: "name",
            render: (_, r) => (
                <Space>
                    <BookOutlined style={{ fontSize: 20, color: PRIORITY_COLORS[r.priority] === 'red' ? '#ef4444' : '#8b5cf6' }} />
                    <div>
                        <Text strong>{r.name}</Text>
                        {!r.isActive && <Tag color="default" style={{ marginLeft: 6 }}>Inactive</Tag>}
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>{r.description || 'No description'}</Text>
                    </div>
                </Space>
            ),
        },
        { title: "Category", dataIndex: "category", width: 120, render: (v: string) => <Tag style={{ textTransform: 'capitalize' }}>{v}</Tag> },
        { title: "Priority", dataIndex: "priority", width: 100, render: (v: string) => <Tag color={PRIORITY_COLORS[v]}>{v}</Tag> },
        { title: "Est. Time", dataIndex: "estimatedMinutes", width: 90, align: 'right', render: (v: number) => v ? `${v} min` : '—' },
        {
            title: "Actions", key: "actions", width: 200,
            render: (_, r) => (
                <Space>
                    <Tooltip title="View/Edit Steps">
                        <Button type="text" icon={<OrderedListOutlined />} onClick={() => {
                            setSelectedPb(r); setStepsDrawerOpen(true); loadSteps(r.id);
                        }} />
                    </Tooltip>
                    <Tooltip title="Start Run">
                        <Button type="text" icon={<PlayCircleOutlined style={{ color: '#22c55e' }} />}
                            onClick={() => Modal.confirm({ title: `Start "${r.name}"?`, onOk: () => handleStartRun(r) })} />
                    </Tooltip>
                    <Button type="text" icon={<EditOutlined />} onClick={() => {
                        setEditingPb(r); form.setFieldsValue(r); setIsModalOpen(true);
                    }} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({
                        title: `Delete "${r.name}"?`, onOk: () => handleDelete(r.id),
                    })} />
                </Space>
            ),
        },
    ];

    const formSteps = [{
        title: "Playbook Info", icon: <BookOutlined />, fields: ["name", "description", "category", "priority", "estimatedMinutes"],
        content: (
            <>
                <Form.Item name="name" label="Playbook Name" rules={[{ required: true }]}><Input placeholder="e.g., Daily Server Health Check" /></Form.Item>
                <Form.Item name="description" label="Description"><Input.TextArea rows={3} placeholder="Describe the operational workflow" /></Form.Item>
                <Row gutter={12}>
                    <Col span={8}>
                        <Form.Item name="category" label="Category" initialValue="general">
                            <Select options={['general','maintenance','compliance','onboarding','security','reporting'].map(c => ({ label: c, value: c }))} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="priority" label="Priority" initialValue="medium">
                            <Select options={['critical','high','medium','low'].map(p => ({ label: p, value: p }))} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="estimatedMinutes" label="Est. Minutes"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                    </Col>
                </Row>
            </>
        ),
    }];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Playbooks</AuroraText>}
            subTitle={<DecryptedText text="Reusable operational task templates with steps and assignees" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadPlaybooks} />,
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditingPb(null); form.resetFields(); setIsModalOpen(true); }}>Create Playbook</Button>,
                <RbacGuard key="exp" requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'ops_playbooks', title: 'Playbooks', columns: [{ header: 'Name', key: 'name' }, { header: 'Category', key: 'category' }, { header: 'Priority', key: 'priority' }, { header: 'Est. Minutes', key: 'estimatedMinutes' }, { header: 'Active', key: 'isActive' }], data: playbooks })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'ops_playbooks', title: 'Playbooks', columns: [{ header: 'Name', key: 'name' }, { header: 'Category', key: 'category' }, { header: 'Priority', key: 'priority' }, { header: 'Est. Minutes', key: 'estimatedMinutes' }], data: playbooks })} /></Tooltip></RbacGuard>,
            ]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total', value: playbooks.length, icon: <BookOutlined />, color: '#8b5cf6' },
                    { title: 'Active', value: playbooks.filter(p => p.isActive).length, icon: <ThunderboltOutlined />, color: '#22c55e' },
                    { title: 'Avg Duration', value: playbooks.length ? `${Math.round(playbooks.reduce((s, p) => s + (p.estimatedMinutes || 0), 0) / playbooks.length)} min` : '0', icon: <ClockCircleOutlined />, color: '#f59e0b' },
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

            <Card><Table columns={columns} dataSource={playbooks.map(p => ({ ...p, key: p.id }))} loading={loading} pagination={false} size="middle" /></Card>

            <SteppedFormModal
                open={isModalOpen} onCancel={() => { setIsModalOpen(false); setEditingPb(null); form.resetFields(); }}
                onSubmit={handleSave} form={form} title={editingPb ? "Edit Playbook" : "Create Playbook"}
                entityName="playbook" steps={formSteps} fields={PLAYBOOK_FIELDS} width={620}
                onBatchCreate={handleBatchCreate} gradient={["#8b5cf6", themeColor]} editMode={!!editingPb}
            />

            {/* Steps Drawer */}
            <Drawer title={<Space><OrderedListOutlined /> Steps — {selectedPb?.name}</Space>}
                open={stepsDrawerOpen} onClose={() => setStepsDrawerOpen(false)} width={520}
                extra={<Button type="primary" size="small" icon={<PlusOutlined />}
                    onClick={() => { setEditingStep(null); stepForm.resetFields(); stepForm.setFieldsValue({ stepOrder: steps.length + 1 }); setStepModalOpen(true); }}>Add Step</Button>}
            >
                <List
                    loading={stepsLoading}
                    dataSource={steps}
                    locale={{ emptyText: <Empty description="No steps yet. Add your first step above." /> }}
                    renderItem={(step: any, idx: number) => (
                        <List.Item
                            actions={[
                                <Button key="e" type="text" size="small" icon={<EditOutlined />} onClick={() => {
                                    setEditingStep(step); stepForm.setFieldsValue(step); setStepModalOpen(true);
                                }} />,
                                <Button key="d" type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => Modal.confirm({
                                    title: `Delete step "${step.title}"?`, onOk: () => handleDeleteStep(step.id),
                                })} />,
                            ]}
                        >
                            <List.Item.Meta
                                avatar={<Tag color={STEP_TYPE_COLORS[step.stepType] || 'blue'} style={{ minWidth: 26, textAlign: 'center' }}>{idx + 1}</Tag>}
                                title={<Space><Text strong>{step.title}</Text>{step.isRequired && <Tag color="red" style={{ fontSize: 10 }}>Required</Tag>}</Space>}
                                description={<Space size={4}>
                                    <Tag>{step.stepType}</Tag>
                                    {step.estimatedMinutes > 0 && <Text type="secondary" style={{ fontSize: 11 }}>{step.estimatedMinutes} min</Text>}
                                    {step.description && <Text type="secondary" style={{ fontSize: 11 }}>— {step.description}</Text>}
                                </Space>}
                            />
                        </List.Item>
                    )}
                />
            </Drawer>

            {/* Step Modal */}
            <Modal title={editingStep ? "Edit Step" : "Add Step"} open={stepModalOpen}
                onCancel={() => { setStepModalOpen(false); setEditingStep(null); stepForm.resetFields(); }}
                onOk={() => stepForm.validateFields().then(handleSaveStep)} width={480}
            >
                <Form form={stepForm} layout="vertical">
                    <Form.Item name="title" label="Step Title" rules={[{ required: true }]}><Input placeholder="e.g., Verify backup status" /></Form.Item>
                    <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
                    <Row gutter={12}>
                        <Col span={8}><Form.Item name="stepOrder" label="Order"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}>
                            <Form.Item name="stepType" label="Type" initialValue="task">
                                <Select options={['task','approval','check','notification'].map(t => ({ label: t, value: t }))} />
                            </Form.Item>
                        </Col>
                        <Col span={8}><Form.Item name="estimatedMinutes" label="Est. Min"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Form.Item name="isRequired" valuePropName="checked" initialValue={true}><Checkbox>Required step</Checkbox></Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
