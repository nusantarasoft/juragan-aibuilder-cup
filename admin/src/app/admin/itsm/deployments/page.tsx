"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Select, Form, Input, Row, Col, Progress, Typography, Timeline, Card, Statistic, Badge } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, CloudUploadOutlined, RocketOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { supaRest, supaInsert, supaUpdate, supaDelete } from "@/lib/supaRest";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const statusColors: Record<string, string> = { planned: 'blue', in_progress: 'orange', completed: 'green', failed: 'red', rolled_back: 'volcano', cancelled: 'default' };
const statusIcons: Record<string, React.ReactNode> = { planned: <ClockCircleOutlined />, in_progress: <LoadingOutlined />, completed: <CheckCircleOutlined />, failed: <CloseCircleOutlined />, rolled_back: <CloseCircleOutlined /> };
const typeColors: Record<string, string> = { standard: 'blue', rolling: 'cyan', blue_green: 'green', canary: 'gold', phased: 'purple', big_bang: 'red' };
const envColors: Record<string, string> = { production: 'red', staging: 'orange', development: 'blue', testing: 'cyan', dr: 'purple' };

const FIELDS: FieldDef[] = [
    { name: "title", label: "Title", required: true },
    { name: "deployment_type", label: "Type" },
    { name: "environment", label: "Environment" },
];

export default function DeploymentsPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [data, setData] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();
    const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
    const [filterEnv, setFilterEnv] = useState<string | undefined>(undefined);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const filters: Record<string, string> = {};
            if (filterStatus) filters['status'] = `eq.${filterStatus}`;
            if (filterEnv) filters['environment'] = `eq.${filterEnv}`;
            const rows = await supaRest('itsm_deployments', { order: 'created_at.desc', filters });
            setData(rows);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [filterStatus, filterEnv, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            const body: any = { title: values.title, description: values.description, deployment_type: values.deployment_type || 'standard', environment: values.environment || 'production', planned_start: values.planned_start, planned_end: values.planned_end, deployed_by: values.deployed_by, deployment_team: values.deployment_team, deployment_steps: values.deployment_steps, validation_steps: values.validation_steps, rollback_steps: values.rollback_steps };
            if (editing) {
                body.status = values.status;
                if (values.status === 'in_progress' && !editing.actual_start) body.actual_start = new Date().toISOString();
                if ((values.status === 'completed' || values.status === 'failed') && !editing.actual_end) body.actual_end = new Date().toISOString();
                body.validation_result = values.validation_result;
                body.deployment_log = values.deployment_log;
                await supaUpdate('itsm_deployments', editing.id, body);
                messageApi.success("Deployment updated.");
            } else {
                const seq = data.length > 0 ? Math.max(...data.map(d => parseInt(d.deployment_number?.replace('DEP-', '') || '0'))) + 1 : 1;
                body.deployment_number = `DEP-${String(seq).padStart(4, '0')}`;
                body.tenant_id = 'default';
                await supaInsert('itsm_deployments', body);
                messageApi.success(`Deployment ${body.deployment_number} created.`);
            }
            setModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); }
    };

    const handleDelete = async (id: string) => {
        try { await supaDelete('itsm_deployments', id); messageApi.success("Deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    const columns: ProColumns<any>[] = [
        { title: '#', dataIndex: 'deployment_number', width: 110, render: (_, r) => <Tag color="blue" style={{ fontFamily: 'monospace' }}>{r.deployment_number}</Tag> },
        { title: 'Title', dataIndex: 'title', ellipsis: true },
        { title: 'Type', dataIndex: 'deployment_type', width: 110, render: (_, r) => <Tag color={typeColors[r.deployment_type]}>{(r.deployment_type || '').replace(/_/g, '-').toUpperCase()}</Tag> },
        { title: 'Environment', dataIndex: 'environment', width: 110, render: (_, r) => <Tag color={envColors[r.environment]}>{(r.environment || '').toUpperCase()}</Tag> },
        { title: 'Status', dataIndex: 'status', width: 120, render: (_, r) => <Tag icon={statusIcons[r.status]} color={statusColors[r.status]}>{(r.status || '').replace(/_/g, ' ').toUpperCase()}</Tag> },
        { title: 'Deployed By', dataIndex: 'deployed_by', width: 120, ellipsis: true },
        { title: 'Planned', dataIndex: 'planned_start', width: 140, render: (_, r) => r.planned_start ? new Date(r.planned_start).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-' },
        { title: 'Actual', dataIndex: 'actual_start', width: 140, render: (_, r) => r.actual_start ? new Date(r.actual_start).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-' },
        { title: 'Validation', dataIndex: 'validation_result', width: 100, render: (_, r) => r.validation_result ? <Tag color={r.validation_result === 'passed' ? 'green' : 'red'}>{r.validation_result}</Tag> : '-' },
        {
            title: 'Actions', valueType: 'option', width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete deployment?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ],
        },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Deployment Management</AuroraText>}
            subTitle={<DecryptedText text="Plan, execute, and track infrastructure deployments" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            {/* KPI Stats */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total Deployments', value: data.length, icon: <CloudUploadOutlined />, color: '#3b82f6' },
                    { title: 'Completed', value: data.filter(d => d.status === 'completed').length, icon: <CheckCircleOutlined />, color: '#10b981' },
                    { title: 'Failed', value: data.filter(d => d.status === 'failed' || d.status === 'rolled_back').length, icon: <CloseCircleOutlined />, color: '#ef4444' },
                    { title: 'In Progress', value: data.filter(d => d.status === 'in_progress').length, icon: <LoadingOutlined />, color: '#f59e0b' },
                    { title: 'Production', value: data.filter(d => d.environment === 'production').length, icon: <ExclamationCircleOutlined />, color: '#8b5cf6' },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={Math.floor(24 / 5)}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* Environment Distribution */}
            {data.length > 0 && (
                <Card size="small" style={{ ...glass, marginBottom: 16 }} title={<Text strong style={{ fontSize: 13 }}>☁️ Environment Distribution</Text>}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        {['production', 'staging', 'development', 'testing'].map((env, i) => {
                            const cnt = data.filter(d => d.environment === env).length;
                            const pct = Math.round((cnt / data.length) * 100);
                            const cfg = envColors[env] || 'gray';
                            return (
                                <motion.div key={env} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                                    style={{ flex: 1, padding: '12px 10px', borderRadius: 10, background: `rgba(0,0,0,0.02)`, border: `1px solid rgba(0,0,0,0.06)`, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, height: 4, background: cfg === 'red' ? '#ef4444' : cfg === 'orange' ? '#f59e0b' : cfg === 'blue' ? '#3b82f6' : '#06b6d4', width: `${pct}%`, borderRadius: 4 }} />
                                    <Text style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>{env}</Text>
                                    <Text strong style={{ fontSize: 20 }}>{cnt}</Text>
                                    <Text style={{ fontSize: 10, color: '#9ca3af', display: 'block' }}>{pct}%</Text>
                                </motion.div>
                            );
                        })}
                    </div>
                </Card>
            )}

            <ProTable
                headerTitle={<Space><CloudUploadOutlined /> Deployments <Badge count={data.length} style={{ backgroundColor: themeColor }} /></Space>}
                rowKey="id" dataSource={data} loading={loading} columns={columns} search={false}
                toolBarRender={() => [
                    <Select key="fs" placeholder="Status" allowClear style={{ width: 140 }} value={filterStatus} onChange={setFilterStatus}
                        options={[{ value: 'planned', label: 'Planned' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'failed', label: 'Failed' }, { value: 'rolled_back', label: 'Rolled Back' }]} />,
                    <Select key="fe" placeholder="Environment" allowClear style={{ width: 140 }} value={filterEnv} onChange={setFilterEnv}
                        options={[{ value: 'production', label: '🔴 Production' }, { value: 'staging', label: '🟠 Staging' }, { value: 'development', label: '🔵 Development' }]} />,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>New Deployment</Button>,
                ]}
            />

            <SteppedFormModal open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }} onSubmit={handleSave} form={form} title={editing ? `Edit ${editing.deployment_number}` : "New Deployment"} entityName="deployment" steps={[
                { title: "Deployment Info", icon: <CloudUploadOutlined />, fields: ["title", "description", "deployment_type", "environment"],
                    content: (<>
                        <Form.Item name="title" label="Deployment Title" rules={[{ required: true }]}><Input placeholder="NusantaraSoft v4.0 Production Deployment" /></Form.Item>
                        <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="deployment_type" label="Type"><Select options={[{ value: 'standard', label: 'Standard' }, { value: 'rolling', label: 'Rolling' }, { value: 'blue_green', label: 'Blue/Green' }, { value: 'canary', label: 'Canary' }, { value: 'phased', label: 'Phased' }, { value: 'big_bang', label: 'Big Bang' }]} /></Form.Item></Col>
                            <Col span={12}><Form.Item name="environment" label="Environment"><Select options={[{ value: 'production', label: '🔴 Production' }, { value: 'staging', label: '🟠 Staging' }, { value: 'development', label: '🔵 Development' }, { value: 'testing', label: 'Testing' }, { value: 'dr', label: 'DR' }]} /></Form.Item></Col>
                        </Row>
                        {editing && <Form.Item name="status" label="Status"><Select options={[{ value: 'planned', label: 'Planned' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'failed', label: 'Failed' }, { value: 'rolled_back', label: 'Rolled Back' }]} /></Form.Item>}
                    </>),
                },
                { title: "Schedule & Team", icon: <RocketOutlined />, fields: ["planned_start", "planned_end", "deployed_by", "deployment_team"],
                    content: (<>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="planned_start" label="Planned Start"><Input type="datetime-local" /></Form.Item></Col>
                            <Col span={12}><Form.Item name="planned_end" label="Planned End"><Input type="datetime-local" /></Form.Item></Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="deployed_by" label="Deployed By"><Input /></Form.Item></Col>
                            <Col span={12}><Form.Item name="deployment_team" label="Deployment Team"><Input /></Form.Item></Col>
                        </Row>
                    </>),
                },
                { title: "Steps & Validation", icon: <CheckCircleOutlined />, fields: ["deployment_steps", "validation_steps", "rollback_steps"],
                    content: (<>
                        <Form.Item name="deployment_steps" label="Deployment Steps"><Input.TextArea rows={4} placeholder="1. Pull images\n2. Run migrations\n3. Rolling restart" /></Form.Item>
                        <Form.Item name="validation_steps" label="Validation Steps"><Input.TextArea rows={3} placeholder="1. Health checks\n2. Smoke tests\n3. Monitor dashboards" /></Form.Item>
                        <Form.Item name="rollback_steps" label="Rollback Steps"><Input.TextArea rows={3} placeholder="How to revert if deployment fails" /></Form.Item>
                        {editing && (<>
                            <Form.Item name="validation_result" label="Validation Result"><Select allowClear options={[{ value: 'passed', label: '✅ Passed' }, { value: 'failed', label: '❌ Failed' }, { value: 'partial', label: '⚠️ Partial' }]} /></Form.Item>
                            <Form.Item name="deployment_log" label="Deployment Log"><Input.TextArea rows={3} placeholder="Deployment execution notes" /></Form.Item>
                        </>)}
                    </>),
                },
            ]} fields={FIELDS} width={800} gradient={["#1890ff", "#096dd9"]} editMode={!!editing} initialValues={{ deployment_type: 'standard', environment: 'production' }} />
        </div>
        </CMSLayout>
    );
}
