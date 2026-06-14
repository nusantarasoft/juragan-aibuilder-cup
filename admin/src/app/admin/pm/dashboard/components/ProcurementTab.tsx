"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormTextArea, ProForm, ProCard, ProFormSelect, ProFormDigit, ProFormDatePicker } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Card } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from 'next-themes';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';

// ─── GraphQL ───────────────────────────────────────────────
const GET_PROCUREMENT_LINKS = `query($projectId: String!) { pmProcurementLinks(projectId: $projectId) { id entityType contractType budgetAllocated description notes status } }`;
const CREATE_LINK = `mutation($tenantId: String!, $input: CreatePmProcurementLinkInput!) { createPmProcurementLink(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_LINK = `mutation($id: ID!, $input: UpdatePmProcurementLinkInput!) { updatePmProcurementLink(id: $id, input: $input) { id } }`;
const DELETE_LINK = `mutation($id: ID!) { deletePmProcurementLink(id: $id) }`;

export default function ProcurementTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();
    const [links, setLinks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const { resolvedTheme } = useTheme();
    const { themeColor } = usePreferencesStore();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const loadData = React.useCallback(async () => {
        setLoading(true);
        try {
            const d = await gql(GET_PROCUREMENT_LINKS, { projectId });
            setLinks(d.pmProcurementLinks || []);
        } catch (err: any) { console.error("PM Error", err);  messageApi.error("Failed to load procurement links."); }
        finally { setLoading(false); }
    }, [projectId, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            if (editing) {
                await gql(UPDATE_LINK, { id: editing.id, input: values });
                messageApi.success("Link updated.");
            } else {
                await gql(CREATE_LINK, { tenantId: DEFAULT_TENANT_ID, input: { ...values, projectId } });
                messageApi.success("Link created.");
            }
            setModalOpen(false); loadData();
            return true;
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); return false; }
    };

    const handleDelete = async (id: string) => {
        try { await gql(DELETE_LINK, { id }); messageApi.success("Link deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    // ─── Summary Cards ─────────────────────────────────
    const amountByCurrency = useMemo(() => {
        const result: Record<string, number> = {};
        links.forEach((l: any) => {
            const currency = 'IDR';
            result[currency] = (result[currency] || 0) + (l.budgetAllocated || 0);
        });
        return result;
    }, [links]);
    const poCount = links.filter(l => l.entityType === 'purchase_order').length;
    const supplierCount = links.filter(l => l.entityType === 'supplier').length;
    const grnCount = links.filter(l => l.entityType === 'grn').length;

    const statusDist = useMemo(() => {
        const counts: Record<string, number> = {};
        links.forEach((l: any) => {
            const status = l.status || 'pending';
            counts[status] = (counts[status] || 0) + 1;
        });
        const colorMap: Record<string, string> = {
            pending: '#f59e0b', in_progress: '#3b82f6', completed: '#10b981',
            received: '#8b5cf6', cancelled: '#ef4444',
        };
        return Object.entries(counts).map(([status, count]) => ({
            name: status.replace('_', ' '), value: count, color: colorMap[status] || '#6b7280',
        }));
    }, [links]);

    const columns: ProColumns<any>[] = [
        {
            title: "Type", dataIndex: "entityType", width: 140,
            render: (_, r) => {
                const colors: Record<string, string> = { purchase_order: 'blue', supplier: 'purple', grn: 'cyan', asset: 'orange', contract: 'geekblue' };
                const labels: Record<string, string> = { purchase_order: 'Purchase Order', supplier: 'Supplier', grn: 'Goods Receipt', asset: 'Fixed Asset', contract: 'Contract' };
                return <Tag color={colors[r.entityType] || 'default'}>{labels[r.entityType] || r.entityType}</Tag>;
            }
        },
        { title: "Ref #", dataIndex: "contractType", width: 140 },
        { title: "Description", dataIndex: "description", ellipsis: true },
        { title: "Amount", dataIndex: "budgetAllocated", render: (_, r) => r.budgetAllocated ? `IDR ${Number(r.budgetAllocated).toLocaleString()}` : '-' },
        {
            title: "Status", dataIndex: "status",
            render: (_, r) => {
                const c = r.status === 'completed' || r.status === 'received' ? 'green' : r.status === 'cancelled' ? 'red' : r.status === 'in_progress' ? 'blue' : 'default';
                return <Tag color={c}>{r.status?.toUpperCase()}</Tag>;
            }
        },
        {
            title: "Actions", valueType: "option",
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditing(record); setModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={() => handleDelete(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ]
        }
    ];

    return (
        <div>
            {contextHolder}

            {/* Summary Stats */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <ProCard bordered style={{ flex: 1, textAlign: 'center', borderRadius: 10, background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{links.length}</div>
                    <div style={{ color: isDark ? '#94a3b8' : '#888' }}>Total Links</div>
                </ProCard>
                <ProCard bordered style={{ flex: 1, textAlign: 'center', borderRadius: 10, background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>{supplierCount}</div>
                    <div style={{ color: isDark ? '#94a3b8' : '#888' }}>Suppliers</div>
                </ProCard>
                <ProCard bordered style={{ flex: 1, textAlign: 'center', borderRadius: 10, background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#13c2c2' }}>{poCount}</div>
                    <div style={{ color: isDark ? '#94a3b8' : '#888' }}>Purchase Orders</div>
                </ProCard>
                <ProCard bordered style={{ flex: 1, textAlign: 'center', borderRadius: 10, background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{grnCount}</div>
                    <div style={{ color: isDark ? '#94a3b8' : '#888' }}>Goods Receipts</div>
                </ProCard>
                <ProCard bordered style={{ flex: 1, textAlign: 'center', borderRadius: 10, background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {Object.entries(amountByCurrency).length === 0 ? (
                            <div style={{ fontSize: 20, fontWeight: 700 }}>0</div>
                        ) : (
                            Object.entries(amountByCurrency).map(([currency, amount]) => (
                                <div key={currency} style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                    <span style={{ fontSize: 16, fontWeight: 700, color: isDark ? '#f59e0b' : '#fa8c16' }}>{currency} {amount.toLocaleString()}</span>
                                </div>
                            ))
                        )}
                        <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#888' }}>Total Amount</div>
                    </div>
                </ProCard>
            </div>

            {statusDist.length > 0 && links.length > 0 && (
                <Card size="small" style={{ marginBottom: 12, borderRadius: 10, background: isDark ? 'rgba(15,15,23,0.7)' : undefined }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 100, height: 100 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={25} outerRadius={42} paddingAngle={3} strokeWidth={0}>
                                        {statusDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <RTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {statusDist.map(s => (
                                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                                    <span style={{ textTransform: 'capitalize', color: isDark ? '#94a3b8' : '#64748b' }}>{s.name}</span>
                                    <Tag style={{ margin: 0, fontSize: 10, borderRadius: 8 }}>{s.value}</Tag>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            <ProTable
                headerTitle={<Space><ShoppingCartOutlined /> Procurement Links (to Inventory Module)</Space>}
                rowKey="id"
                dataSource={links}
                loading={loading}
                columns={columns}
                search={false}
                toolBarRender={() => [
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true); }}>
                        Link Procurement Item
                    </Button>
                ]}
            />

            <ModalForm
                title={editing ? "Edit Procurement Link" : "Link Procurement Item"}
                open={modalOpen}
                onOpenChange={setModalOpen}
                onFinish={handleSave}
                initialValues={editing || { entityType: 'purchase_order', status: 'pending' }}
                modalProps={{ destroyOnClose: true }}
            >
                <ProForm.Group>
                    <ProFormSelect name="entityType" label="Link Type" width="sm" rules={[{ required: true }]} options={[
                        { value: 'purchase_order', label: 'Purchase Order' },
                        { value: 'supplier', label: 'Supplier' },
                        { value: 'grn', label: 'Goods Receipt Note' },
                        { value: 'asset', label: 'Fixed Asset' },
                        { value: 'contract', label: 'Contract' },
                    ]} />
                    <ProFormText name="contractType" label="Reference Number" width="md" placeholder="e.g. PO-2026-001" />
                </ProForm.Group>
                <ProFormTextArea name="description" label="Description / Vendor" />
                <ProForm.Group>
                    <ProFormDigit name="budgetAllocated" label="Amount (IDR)" width="md" />
                    <ProFormSelect name="status" label="Status" width="sm" options={[
                        { value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'In Progress' },
                        { value: 'completed', label: 'Completed' }, { value: 'received', label: 'Received' },
                        { value: 'cancelled', label: 'Cancelled' },
                    ]} />
                </ProForm.Group>
                <ProFormTextArea name="notes" label="Notes" />
            </ModalForm>
        </div>
    );
}

