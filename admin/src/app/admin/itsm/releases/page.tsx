"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Select, Form, Input, Row, Col, Progress } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, SendOutlined, RocketOutlined, CheckCircleOutlined, TagOutlined } from "@ant-design/icons";
import { supaRest, supaInsert, supaUpdate, supaDelete } from "@/lib/supaRest";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const statusColors: Record<string, string> = { planning: 'blue', building: 'cyan', testing: 'orange', approved: 'green', deploying: 'purple', deployed: 'green', rolled_back: 'red', cancelled: 'default' };
const typeColors: Record<string, string> = { major: 'red', minor: 'blue', patch: 'green', emergency: 'volcano' };
const riskColors: Record<string, string> = { low: 'green', medium: 'blue', high: 'orange', critical: 'red' };
const statusProgress: Record<string, number> = { planning: 15, building: 35, testing: 55, approved: 70, deploying: 85, deployed: 100, rolled_back: 100, cancelled: 0 };

const FIELDS: FieldDef[] = [
    { name: "title", label: "Title", required: true },
    { name: "version", label: "Version" },
    { name: "release_type", label: "Release Type" },
];

export default function ReleasesPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [data, setData] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();
    const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const filters: Record<string, string> = {};
            if (filterStatus) filters['status'] = `eq.${filterStatus}`;
            const rows = await supaRest('itsm_releases', { order: 'created_at.desc', filters });
            setData(rows);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [filterStatus, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            const body: any = { title: values.title, version: values.version, description: values.description, release_type: values.release_type || 'minor', priority: values.priority || 'medium', risk_level: values.risk_level || 'medium', planned_start: values.planned_start, planned_end: values.planned_end, release_manager: values.release_manager, build_team: values.build_team, test_lead: values.test_lead, deployment_plan: values.deployment_plan, rollback_plan: values.rollback_plan };
            if (editing) {
                body.status = values.status;
                await supaUpdate('itsm_releases', editing.id, body);
                messageApi.success("Release updated.");
            } else {
                const seq = data.length > 0 ? Math.max(...data.map(d => parseInt(d.release_number?.replace('REL-', '') || '0'))) + 1 : 1;
                body.release_number = `REL-${String(seq).padStart(4, '0')}`;
                body.tenant_id = 'default';
                await supaInsert('itsm_releases', body);
                messageApi.success(`Release ${body.release_number} created.`);
            }
            setModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); }
    };

    const handleDelete = async (id: string) => {
        try { await supaDelete('itsm_releases', id); messageApi.success("Deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    const columns: ProColumns<any>[] = [
        { title: '#', dataIndex: 'release_number', width: 110, render: (_, r) => <Tag color="purple" style={{ fontFamily: 'monospace' }}>{r.release_number}</Tag> },
        { title: 'Title', dataIndex: 'title', ellipsis: true },
        { title: 'Version', dataIndex: 'version', width: 100, render: (_, r) => <Tag icon={<TagOutlined />}>{r.version}</Tag> },
        { title: 'Type', dataIndex: 'release_type', width: 100, render: (_, r) => <Tag color={typeColors[r.release_type]}>{(r.release_type || '').toUpperCase()}</Tag> },
        { title: 'Risk', dataIndex: 'risk_level', width: 90, render: (_, r) => <Tag color={riskColors[r.risk_level]}>{(r.risk_level || '').toUpperCase()}</Tag> },
        { title: 'Status', dataIndex: 'status', width: 120, render: (_, r) => <Tag color={statusColors[r.status]}>{(r.status || '').replace(/_/g, ' ').toUpperCase()}</Tag> },
        { title: 'Progress', dataIndex: 'status', width: 130, render: (_, r) => <Progress percent={statusProgress[r.status] || 0} size="small" status={r.status === 'rolled_back' ? 'exception' : r.status === 'deployed' ? 'success' : 'active'} /> },
        { title: 'Manager', dataIndex: 'release_manager', width: 130, ellipsis: true },
        { title: 'Planned', dataIndex: 'planned_start', width: 100, render: (_, r) => r.planned_start ? new Date(r.planned_start).toLocaleDateString('id-ID') : '-' },
        {
            title: 'Actions', valueType: 'option', width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete release?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ],
        },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Release Management</AuroraText>}
            subTitle={<DecryptedText text="Plan, build, test, and deploy releases" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            <ProTable
                headerTitle={<Space><RocketOutlined /> Releases</Space>}
                rowKey="id" dataSource={data} loading={loading} columns={columns} search={false}
                toolBarRender={() => [
                    <Select key="fs" placeholder="Status" allowClear style={{ width: 140 }} value={filterStatus} onChange={setFilterStatus}
                        options={[{ value: 'planning', label: 'Planning' }, { value: 'building', label: 'Building' }, { value: 'testing', label: 'Testing' }, { value: 'approved', label: 'Approved' }, { value: 'deploying', label: 'Deploying' }, { value: 'deployed', label: 'Deployed' }]} />,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>New Release</Button>,
                ]}
            />

            <SteppedFormModal open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }} onSubmit={handleSave} form={form} title={editing ? `Edit ${editing.release_number}` : "New Release"} entityName="release" steps={[
                { title: "Release Info", icon: <RocketOutlined />, fields: ["title", "version", "description", "release_type", "priority", "risk_level"],
                    content: (<>
                        <Form.Item name="title" label="Release Title" rules={[{ required: true }]}><Input placeholder="NusantaraSoft Platform v4.0 GA" /></Form.Item>
                        <Row gutter={16}>
                            <Col span={8}><Form.Item name="version" label="Version"><Input placeholder="v4.0.0" /></Form.Item></Col>
                            <Col span={8}><Form.Item name="release_type" label="Type"><Select options={[{ value: 'major', label: '🔴 Major' }, { value: 'minor', label: '🔵 Minor' }, { value: 'patch', label: '🟢 Patch' }, { value: 'emergency', label: '🚨 Emergency' }]} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="risk_level" label="Risk Level"><Select options={[{ value: 'low', label: '🟢 Low' }, { value: 'medium', label: '🔵 Medium' }, { value: 'high', label: '🟠 High' }, { value: 'critical', label: '🔴 Critical' }]} /></Form.Item></Col>
                        </Row>
                        <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
                        {editing && <Form.Item name="status" label="Status"><Select options={[{ value: 'planning', label: 'Planning' }, { value: 'building', label: 'Building' }, { value: 'testing', label: 'Testing' }, { value: 'approved', label: 'Approved' }, { value: 'deploying', label: 'Deploying' }, { value: 'deployed', label: 'Deployed' }, { value: 'rolled_back', label: 'Rolled Back' }]} /></Form.Item>}
                    </>),
                },
                { title: "Team & Schedule", icon: <SendOutlined />, fields: ["release_manager", "build_team", "test_lead", "planned_start", "planned_end"],
                    content: (<>
                        <Row gutter={16}>
                            <Col span={8}><Form.Item name="release_manager" label="Release Manager"><Input /></Form.Item></Col>
                            <Col span={8}><Form.Item name="build_team" label="Build Team"><Input /></Form.Item></Col>
                            <Col span={8}><Form.Item name="test_lead" label="Test Lead"><Input /></Form.Item></Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item name="planned_start" label="Planned Start"><Input type="date" /></Form.Item></Col>
                            <Col span={12}><Form.Item name="planned_end" label="Planned End"><Input type="date" /></Form.Item></Col>
                        </Row>
                    </>),
                },
                { title: "Plans", icon: <CheckCircleOutlined />, fields: ["deployment_plan", "rollback_plan"],
                    content: (<>
                        <Form.Item name="deployment_plan" label="Deployment Plan"><Input.TextArea rows={4} placeholder="Step-by-step deployment procedure" /></Form.Item>
                        <Form.Item name="rollback_plan" label="Rollback Plan"><Input.TextArea rows={3} placeholder="How to revert if deployment fails" /></Form.Item>
                    </>),
                },
            ]} fields={FIELDS} width={800} editMode={!!editing} initialValues={{ release_type: 'minor', priority: 'medium', risk_level: 'medium' }} />
        </div>
        </CMSLayout>
    );
}
