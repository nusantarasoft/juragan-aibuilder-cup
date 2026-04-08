"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormSelect, ProFormDigit, ProForm } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Typography } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, FlagOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

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

export default function ItsmSlaPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);

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
            loadData();
            return true;
        } catch (err: any) { messageApi.error(err.message); return false; }
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
            render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'}>{(v || '').toUpperCase()}</Tag>
        },
        {
            title: 'Actions', valueType: 'option', width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditing(record); setModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete this SLA policy?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ]
        }
    ];

    return (
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
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true); }}>
                        New SLA Policy
                    </Button>,
                ]}
            />

            <ModalForm
                title={editing ? "Edit SLA Policy" : "New SLA Policy"}
                open={modalOpen}
                onOpenChange={setModalOpen}
                onFinish={handleSave}
                initialValues={editing || { priority: 'medium', responseTimeMinutes: 120, resolutionTimeMinutes: 480, escalationAfterMinutes: 240, status: 'active' }}
                modalProps={{ destroyOnClose: true, width: 550 }}
            >
                <ProFormText name="name" label="Policy Name" rules={[{ required: true }]} placeholder="e.g., P1 - Critical" />
                <ProFormSelect name="priority" label="Priority" rules={[{ required: true }]}
                    options={[
                        { value: 'critical', label: '🔴 Critical' },
                        { value: 'high', label: '🟠 High' },
                        { value: 'medium', label: '🔵 Medium' },
                        { value: 'low', label: '🟢 Low' },
                    ]}
                />
                <ProForm.Group>
                    <ProFormDigit name="responseTimeMinutes" label="Response Time (min)" rules={[{ required: true }]} width="sm" min={1} fieldProps={{ addonAfter: 'min' }} />
                    <ProFormDigit name="resolutionTimeMinutes" label="Resolution Time (min)" rules={[{ required: true }]} width="sm" min={1} fieldProps={{ addonAfter: 'min' }} />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormDigit name="escalationAfterMinutes" label="Escalation After (min)" width="sm" min={1} fieldProps={{ addonAfter: 'min' }} />
                    <ProFormSelect name="status" label="Status"
                        options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                    />
                </ProForm.Group>
            </ModalForm>
        </div>
    );
}
