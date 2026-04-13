"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Typography, Form, Input, Select, InputNumber, Row, Col } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, FlagOutlined, ClockCircleOutlined, SettingOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;

const GET_POLICIES = `query { itsmSlaPolicies { id name priority responseTimeMinutes resolutionTimeMinutes escalationAfterMinutes status createdAt } }`;
const CREATE_POLICY = `mutation($tenantId: String!, $input: CreateItsmSlaPolicyInput!) { createItsmSlaPolicy(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_POLICY = `mutation($id: ID!, $input: UpdateItsmSlaPolicyInput!) { updateItsmSlaPolicy(id: $id, input: $input) { id } }`;
const DELETE_POLICY = `mutation($id: ID!) { deleteItsmSlaPolicy(id: $id) }`;

const priorityColors: Record<string, string> = { critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a' };

function formatMinutes(m: number): string {
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    if (h < 24) return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

const SLA_FIELDS: FieldDef[] = [
    { name: "name", label: "Policy Name", required: true },
    { name: "priority", label: "Priority", required: true },
    { name: "responseTimeMinutes", label: "Response Time (min)", required: true },
    { name: "resolutionTimeMinutes", label: "Resolution Time (min)", required: true },
    { name: "escalationAfterMinutes", label: "Escalation After (min)" },
    { name: "status", label: "Status" },
];

export default function ItsmSlaPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [policies, setPolicies] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const d = await gql(GET_POLICIES);
            setPolicies(d.itsmSlaPolicies || []);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            if (editing) {
                await gql(UPDATE_POLICY, { id: editing.id, input: values });
                messageApi.success("SLA Policy updated.");
            } else {
                await gql(CREATE_POLICY, { tenantId: DEFAULT_TENANT_ID, input: values });
                messageApi.success("SLA Policy created.");
            }
            setModalOpen(false);
            form.resetFields();
            setEditing(null);
            loadData();
        } catch (err: any) { messageApi.error(err.message); }
    };

    const handleDelete = async (id: string) => {
        try { await gql(DELETE_POLICY, { id }); messageApi.success("Deleted."); loadData(); }
        catch (err: any) { messageApi.error(err.message); }
    };

    const columns: ProColumns<any>[] = [
        { title: 'Policy Name', dataIndex: 'name', render: (_, r) => <Text strong>{r.name}</Text> },
        {
            title: 'Priority', dataIndex: 'priority', width: 120,
            render: (_, r) => <Tag color={priorityColors[r.priority]} style={{ fontWeight: 600 }}>{(r.priority || '').toUpperCase()}</Tag>
        },
        {
            title: 'Response Time', dataIndex: 'responseTimeMinutes', width: 140,
            render: (_, r) => (
                <Space><ClockCircleOutlined style={{ color: '#1890ff' }} /><Text>{formatMinutes(r.responseTimeMinutes)}</Text></Space>
            )
        },
        {
            title: 'Resolution Time', dataIndex: 'resolutionTimeMinutes', width: 140,
            render: (_, r) => (
                <Space><ClockCircleOutlined style={{ color: '#52c41a' }} /><Text>{formatMinutes(r.resolutionTimeMinutes)}</Text></Space>
            )
        },
        {
            title: 'Escalation After', dataIndex: 'escalationAfterMinutes', width: 140,
            render: (_, r) => r.escalationAfterMinutes ? (
                <Space><ClockCircleOutlined style={{ color: '#fa8c16' }} /><Text>{formatMinutes(r.escalationAfterMinutes)}</Text></Space>
            ) : '-'
        },
        {
            title: 'Status', dataIndex: 'status', width: 100,
            render: (_, r) => <Tag color={r.status === 'active' ? 'green' : 'default'}>{(r.status || '').toUpperCase()}</Tag>
        },
        {
            title: 'Actions', valueType: 'option', width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => {
                    setEditing(record);
                    form.setFieldsValue({
                        name: record.name, priority: record.priority,
                        responseTimeMinutes: record.responseTimeMinutes,
                        resolutionTimeMinutes: record.resolutionTimeMinutes,
                        escalationAfterMinutes: record.escalationAfterMinutes,
                        status: record.status,
                    });
                    setModalOpen(true);
                }} />,
                <Popconfirm key="del" title="Delete this SLA policy?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ]
        }
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>SLA Policies</AuroraText>}
            subTitle={<DecryptedText text="Service Level Agreement configuration" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            <ProTable
                headerTitle={<Space><FlagOutlined /> SLA Policies</Space>}
                rowKey="id"
                dataSource={policies}
                loading={loading}
                columns={columns}
                search={false}
                toolBarRender={() => [
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
                        New SLA Policy
                    </Button>,
                ]}
            />

            {/* ─── SLA SteppedFormModal ─────────────── */}
            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
                onSubmit={handleSave}
                form={form}
                title={editing ? "Edit SLA Policy" : "New SLA Policy"}
                entityName="sla_policy"
                steps={[
                    {
                        title: "Policy Info",
                        icon: <FlagOutlined />,
                        fields: ["name", "priority"],
                        content: (
                            <>
                                <Form.Item name="name" label="Policy Name" rules={[{ required: true }]}>
                                    <Input placeholder="e.g., P1 - Critical" />
                                </Form.Item>
                                <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                                    <Select options={[
                                        { value: 'critical', label: '🔴 Critical' },
                                        { value: 'high', label: '🟠 High' },
                                        { value: 'medium', label: '🔵 Medium' },
                                        { value: 'low', label: '🟢 Low' },
                                    ]} />
                                </Form.Item>
                            </>
                        ),
                    },
                    {
                        title: "Time Targets",
                        icon: <ClockCircleOutlined />,
                        fields: ["responseTimeMinutes", "resolutionTimeMinutes", "escalationAfterMinutes", "status"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="responseTimeMinutes" label="Response Time (minutes)" rules={[{ required: true }]}>
                                            <InputNumber min={1} style={{ width: '100%' }} addonAfter="min" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="resolutionTimeMinutes" label="Resolution Time (minutes)" rules={[{ required: true }]}>
                                            <InputNumber min={1} style={{ width: '100%' }} addonAfter="min" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="escalationAfterMinutes" label="Escalation After (minutes)">
                                            <InputNumber min={1} style={{ width: '100%' }} addonAfter="min" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="status" label="Status">
                                            <Select options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </>
                        ),
                    },
                ]}
                fields={SLA_FIELDS}
                width={600}
                gradient={["#fa8c16", "#faad14"]}
                editMode={!!editing}
                initialValues={{ priority: 'medium', responseTimeMinutes: 120, resolutionTimeMinutes: 480, escalationAfterMinutes: 240, status: 'active' }}
            />
        </div>
        </CMSLayout>
    );
}
