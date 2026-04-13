"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Select, Form, Input, Row, Col, InputNumber, Descriptions, Modal, Typography } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, SafetyOutlined, FieldTimeOutlined, FileProtectOutlined, ExperimentOutlined } from "@ant-design/icons";
import { supaRest, supaInsert, supaUpdate, supaDelete } from "@/lib/supaRest";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;
const statusColors: Record<string, string> = { draft: 'default', active: 'green', under_review: 'blue', approved: 'green', expired: 'red', archived: 'gray' };
const typeColors: Record<string, string> = { bcp: 'blue', drp: 'red', crisis: 'volcano', itrp: 'purple' };
const priorityColors: Record<string, string> = { critical: 'red', high: 'orange', medium: 'blue', low: 'green' };

const FIELDS: FieldDef[] = [
    { name: "title", label: "Title", required: true },
    { name: "plan_type", label: "Plan Type" },
    { name: "status", label: "Status" },
];

export default function ContinuityPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [data, setData] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailItem, setDetailItem] = useState<any>(null);
    const [form] = Form.useForm();
    const [filterType, setFilterType] = useState<string | undefined>(undefined);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const filters: Record<string, string> = {};
            if (filterType) filters['plan_type'] = `eq.${filterType}`;
            const rows = await supaRest('itsm_continuity_plans', { order: 'created_at.desc', filters });
            setData(rows);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [filterType, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            const body: any = { title: values.title, plan_type: values.plan_type || 'bcp', description: values.description, scope: values.scope, rto_hours: values.rto_hours, rpo_hours: values.rpo_hours, mtpd_hours: values.mtpd_hours, recovery_priority: values.recovery_priority || 'medium', risk_assessment: values.risk_assessment, recovery_strategy: values.recovery_strategy, recovery_procedures: values.recovery_procedures, communication_plan: values.communication_plan, escalation_contacts: values.escalation_contacts, test_frequency: values.test_frequency || 'annually', plan_owner: values.plan_owner };
            if (editing) {
                body.status = values.status;
                await supaUpdate('itsm_continuity_plans', editing.id, body);
                messageApi.success("Plan updated.");
            } else {
                const seq = data.length > 0 ? Math.max(...data.map(d => parseInt(d.plan_number?.replace('BCP-', '') || '0'))) + 1 : 1;
                body.plan_number = `BCP-${String(seq).padStart(4, '0')}`;
                body.tenant_id = 'default';
                await supaInsert('itsm_continuity_plans', body);
                messageApi.success(`Plan ${body.plan_number} created.`);
            }
            setModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); }
    };

    const handleDelete = async (id: string) => {
        try { await supaDelete('itsm_continuity_plans', id); messageApi.success("Deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    const columns: ProColumns<any>[] = [
        { title: '#', dataIndex: 'plan_number', width: 100, render: (_, r) => <Tag color="red" style={{ fontFamily: 'monospace' }}>{r.plan_number}</Tag> },
        { title: 'Title', dataIndex: 'title', ellipsis: true, render: (_, r) => <a onClick={() => { setDetailItem(r); setDetailOpen(true); }}>{r.title}</a> },
        { title: 'Type', dataIndex: 'plan_type', width: 90, render: (_, r) => <Tag color={typeColors[r.plan_type]}>{(r.plan_type || '').toUpperCase()}</Tag> },
        { title: 'Status', dataIndex: 'status', width: 110, render: (_, r) => <Tag color={statusColors[r.status]}>{(r.status || '').replace(/_/g, ' ').toUpperCase()}</Tag> },
        { title: 'Priority', dataIndex: 'recovery_priority', width: 100, render: (_, r) => <Tag color={priorityColors[r.recovery_priority]}>{(r.recovery_priority || '').toUpperCase()}</Tag> },
        { title: 'RTO', dataIndex: 'rto_hours', width: 80, render: (_, r) => r.rto_hours ? <Tag><FieldTimeOutlined /> {r.rto_hours}h</Tag> : '-' },
        { title: 'RPO', dataIndex: 'rpo_hours', width: 80, render: (_, r) => r.rpo_hours ? <Tag>{r.rpo_hours}h</Tag> : '-' },
        { title: 'Owner', dataIndex: 'plan_owner', width: 130, ellipsis: true },
        { title: 'Last Test', dataIndex: 'last_test_date', width: 100, render: (_, r) => r.last_test_date ? <Tag color={r.last_test_result === 'passed' ? 'green' : 'red'}>{new Date(r.last_test_date).toLocaleDateString('id-ID')}</Tag> : <Tag color="warning">Never</Tag> },
        {
            title: 'Actions', valueType: 'option', width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete plan?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ],
        },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Service Continuity</AuroraText>}
            subTitle={<DecryptedText text="Business continuity and disaster recovery plans" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            <ProTable
                headerTitle={<Space><SafetyOutlined /> Continuity Plans</Space>}
                rowKey="id" dataSource={data} loading={loading} columns={columns} search={false}
                toolBarRender={() => [
                    <Select key="ft" placeholder="Type" allowClear style={{ width: 120 }} value={filterType} onChange={setFilterType}
                        options={[{ value: 'bcp', label: '📋 BCP' }, { value: 'drp', label: '🔥 DRP' }, { value: 'crisis', label: '🚨 Crisis' }, { value: 'itrp', label: '🔧 ITRP' }]} />,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>New Plan</Button>,
                ]}
            />

            <Modal title={detailItem?.plan_number + ' — ' + detailItem?.title} open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={800}>
                {detailItem && (
                    <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label="Type"><Tag color={typeColors[detailItem.plan_type]}>{detailItem.plan_type?.toUpperCase()}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={statusColors[detailItem.status]}>{detailItem.status}</Tag></Descriptions.Item>
                        <Descriptions.Item label="RTO"><strong>{detailItem.rto_hours}h</strong></Descriptions.Item>
                        <Descriptions.Item label="RPO"><strong>{detailItem.rpo_hours}h</strong></Descriptions.Item>
                        <Descriptions.Item label="MTPD">{detailItem.mtpd_hours}h</Descriptions.Item>
                        <Descriptions.Item label="Priority"><Tag color={priorityColors[detailItem.recovery_priority]}>{detailItem.recovery_priority}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Owner">{detailItem.plan_owner}</Descriptions.Item>
                        <Descriptions.Item label="Test Frequency">{detailItem.test_frequency}</Descriptions.Item>
                        <Descriptions.Item label="Scope" span={2}><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{detailItem.scope || '-'}</pre></Descriptions.Item>
                        <Descriptions.Item label="Risk Assessment" span={2}><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{detailItem.risk_assessment || '-'}</pre></Descriptions.Item>
                        <Descriptions.Item label="Recovery Strategy" span={2}><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{detailItem.recovery_strategy || '-'}</pre></Descriptions.Item>
                        <Descriptions.Item label="Recovery Procedures" span={2}><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{detailItem.recovery_procedures || '-'}</pre></Descriptions.Item>
                        <Descriptions.Item label="Communication Plan" span={2}><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{detailItem.communication_plan || '-'}</pre></Descriptions.Item>
                        <Descriptions.Item label="Escalation Contacts" span={2}><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{detailItem.escalation_contacts || '-'}</pre></Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>

            <SteppedFormModal open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }} onSubmit={handleSave} form={form} title={editing ? `Edit ${editing.plan_number}` : "New Continuity Plan"} entityName="plan" steps={[
                { title: "Plan Details", icon: <SafetyOutlined />, fields: ["title", "plan_type", "description", "scope", "recovery_priority"],
                    content: (<>
                        <Form.Item name="title" label="Plan Title" rules={[{ required: true }]}><Input placeholder="Core Database Disaster Recovery Plan" /></Form.Item>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="plan_type" label="Plan Type"><Select options={[{ value: 'bcp', label: '📋 Business Continuity Plan' }, { value: 'drp', label: '🔥 Disaster Recovery Plan' }, { value: 'crisis', label: '🚨 Crisis Management' }, { value: 'itrp', label: '🔧 IT Recovery Plan' }]} /></Form.Item></Col>
                            <Col span={12}><Form.Item name="recovery_priority" label="Recovery Priority"><Select options={[{ value: 'critical', label: '🔴 Critical' }, { value: 'high', label: '🟠 High' }, { value: 'medium', label: '🔵 Medium' }, { value: 'low', label: '🟢 Low' }]} /></Form.Item></Col>
                        </Row>
                        <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
                        <Form.Item name="scope" label="Scope"><Input.TextArea rows={2} placeholder="Which systems/services does this plan cover?" /></Form.Item>
                        {editing && <Form.Item name="status" label="Status"><Select options={[{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'under_review', label: 'Under Review' }, { value: 'approved', label: 'Approved' }, { value: 'expired', label: 'Expired' }]} /></Form.Item>}
                    </>),
                },
                { title: "Recovery Targets", icon: <FieldTimeOutlined />, fields: ["rto_hours", "rpo_hours", "mtpd_hours", "risk_assessment", "recovery_strategy"],
                    content: (<>
                        <Row gutter={16}>
                            <Col span={8}><Form.Item name="rto_hours" label="RTO (hours)"><InputNumber style={{ width: '100%' }} min={0} step={0.5} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="rpo_hours" label="RPO (hours)"><InputNumber style={{ width: '100%' }} min={0} step={0.5} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="mtpd_hours" label="MTPD (hours)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                        </Row>
                        <Form.Item name="risk_assessment" label="Risk Assessment"><Input.TextArea rows={3} placeholder="Identify risks, likelihood, and impact" /></Form.Item>
                        <Form.Item name="recovery_strategy" label="Recovery Strategy"><Input.TextArea rows={3} placeholder="How will the service be recovered?" /></Form.Item>
                    </>),
                },
                { title: "Procedures", icon: <FileProtectOutlined />, fields: ["recovery_procedures", "communication_plan", "escalation_contacts", "plan_owner", "test_frequency"],
                    content: (<>
                        <Form.Item name="recovery_procedures" label="Recovery Procedures"><Input.TextArea rows={4} placeholder="Step-by-step recovery instructions" /></Form.Item>
                        <Form.Item name="communication_plan" label="Communication Plan"><Input.TextArea rows={2} /></Form.Item>
                        <Form.Item name="escalation_contacts" label="Escalation Contacts"><Input.TextArea rows={2} placeholder="Name, phone, role" /></Form.Item>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="plan_owner" label="Plan Owner"><Input /></Form.Item></Col>
                            <Col span={12}><Form.Item name="test_frequency" label="Test Frequency"><Select options={[{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'semi_annually', label: 'Semi-Annually' }, { value: 'annually', label: 'Annually' }]} /></Form.Item></Col>
                        </Row>
                    </>),
                },
            ]} fields={FIELDS} width={800} gradient={["#f5222d", "#a8071a"]} editMode={!!editing} initialValues={{ plan_type: 'bcp', recovery_priority: 'medium', test_frequency: 'annually' }} />
        </div>
        </CMSLayout>
    );
}
