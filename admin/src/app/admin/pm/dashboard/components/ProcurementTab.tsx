"use client";

import React, { useState, useEffect } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormTextArea, ProForm, ProCard, ProFormSelect, ProFormDigit, ProFormDatePicker } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Descriptions, Empty, Spin, Badge } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, LinkOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

// ─── GraphQL ───────────────────────────────────────────────
const GET_PROCUREMENT_LINKS = `query($projectId: String!) { pmProcurementLinks(projectId: $projectId) { id linkType referenceId referenceNumber vendorName description amount currency status deliveryDate notes } }`;
const CREATE_LINK = `mutation($tenantId: String!, $input: CreatePmProcurementLinkInput!) { createPmProcurementLink(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_LINK = `mutation($id: ID!, $input: UpdatePmProcurementLinkInput!) { updatePmProcurementLink(id: $id, input: $input) { id } }`;
const DELETE_LINK = `mutation($id: ID!) { deletePmProcurementLink(id: $id) }`;

export default function ProcurementTab({ projectId }: { projectId: string }) {
    const [messageApi, contextHolder] = message.useMessage();
    const [links, setLinks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    const loadData = React.useCallback(async () => {
        setLoading(true);
        try {
            const d = await gql(GET_PROCUREMENT_LINKS, { projectId });
            setLinks(d.pmProcurementLinks || []);
        } catch { messageApi.error("Failed to load procurement links."); }
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
    const totalAmount = links.reduce((sum, l) => sum + (l.amount || 0), 0);
    const poCount = links.filter(l => l.linkType === 'purchase_order').length;
    const supplierCount = links.filter(l => l.linkType === 'supplier').length;
    const grnCount = links.filter(l => l.linkType === 'grn').length;

    const columns: ProColumns<any>[] = [
        {
            title: "Type", dataIndex: "linkType", width: 140,
            render: (_, r) => {
                const colors: Record<string, string> = { purchase_order: 'blue', supplier: 'purple', grn: 'cyan', asset: 'orange', contract: 'geekblue' };
                const labels: Record<string, string> = { purchase_order: 'Purchase Order', supplier: 'Supplier', grn: 'Goods Receipt', asset: 'Fixed Asset', contract: 'Contract' };
                return <Tag color={colors[r.linkType] || 'default'}>{labels[r.linkType] || r.linkType}</Tag>;
            }
        },
        { title: "Ref #", dataIndex: "referenceNumber", width: 140 },
        { title: "Vendor", dataIndex: "vendorName" },
        { title: "Description", dataIndex: "description", ellipsis: true },
        { title: "Amount", dataIndex: "amount", render: (_, r) => r.amount ? `${r.currency || 'IDR'} ${Number(r.amount).toLocaleString()}` : '-' },
        { title: "Delivery", dataIndex: "deliveryDate", valueType: "date" },
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
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <ProCard bordered style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{links.length}</div>
                    <div style={{ color: '#888' }}>Total Links</div>
                </ProCard>
                <ProCard bordered style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>{supplierCount}</div>
                    <div style={{ color: '#888' }}>Suppliers</div>
                </ProCard>
                <ProCard bordered style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#13c2c2' }}>{poCount}</div>
                    <div style={{ color: '#888' }}>Purchase Orders</div>
                </ProCard>
                <ProCard bordered style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{grnCount}</div>
                    <div style={{ color: '#888' }}>Goods Receipts</div>
                </ProCard>
                <ProCard bordered style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fa8c16' }}>IDR {totalAmount.toLocaleString()}</div>
                    <div style={{ color: '#888' }}>Total Amount</div>
                </ProCard>
            </div>

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
                initialValues={editing || { linkType: 'purchase_order', currency: 'IDR', status: 'pending' }}
                modalProps={{ destroyOnClose: true }}
            >
                <ProForm.Group>
                    <ProFormSelect name="linkType" label="Link Type" width="sm" rules={[{ required: true }]} options={[
                        { value: 'purchase_order', label: 'Purchase Order' },
                        { value: 'supplier', label: 'Supplier' },
                        { value: 'grn', label: 'Goods Receipt Note' },
                        { value: 'asset', label: 'Fixed Asset' },
                        { value: 'contract', label: 'Contract' },
                    ]} />
                    <ProFormText name="referenceNumber" label="Reference Number" width="md" placeholder="e.g. PO-2026-001" />
                </ProForm.Group>
                <ProFormText name="vendorName" label="Vendor / Supplier Name" />
                <ProFormTextArea name="description" label="Description" />
                <ProForm.Group>
                    <ProFormDigit name="amount" label="Amount" width="md" />
                    <ProFormSelect name="currency" label="Currency" width="xs" options={[
                        { value: 'IDR', label: 'IDR' }, { value: 'USD', label: 'USD' },
                        { value: 'EUR', label: 'EUR' }, { value: 'SGD', label: 'SGD' },
                    ]} />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormDatePicker name="deliveryDate" label="Expected Delivery" width="sm" />
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
