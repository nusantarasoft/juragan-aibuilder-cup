"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Select, Form, Input, Row, Col, Typography, Card, Statistic, Badge, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, ShopOutlined, CheckCircleOutlined, AppstoreOutlined, FileProtectOutlined, FileExcelOutlined, FilePdfOutlined  } from "@ant-design/icons";
import { motion } from "framer-motion";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";

const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const GET_CATALOG = `query($status: String, $search: String) { itsmCatalogItems(status: $status, search: $search) { id catalogCode name shortDescription description portfolioServiceId categoryId icon estimatedDelivery cost approvalRequired approvalType fulfillmentGroup status requestCount createdAt } }`;
const GET_CATEGORIES = `query { itsmCategories { id name } }`;
const CREATE_CATALOG = `mutation($tenantId: String!, $input: CreateItsmCatalogInput!) { createItsmCatalogItem(tenantId: $tenantId, input: $input) { id catalogCode } }`;
const UPDATE_CATALOG = `mutation($id: ID!, $input: UpdateItsmCatalogInput!) { updateItsmCatalogItem(id: $id, input: $input) { id } }`;
const DELETE_CATALOG = `mutation($id: ID!) { deleteItsmCatalogItem(id: $id) }`;

const FIELDS: FieldDef[] = [
    { name: "name", label: "Name", required: true },
    { name: "shortDescription", label: "Short Description" },
    { name: "estimatedDelivery", label: "Delivery Time" },
    { name: "cost", label: "Cost" },
];

export default function ItsmCatalogPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [data, setData] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();
    const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [d, c] = await Promise.all([
                gql(GET_CATALOG, { status: filterStatus }),
                gql(GET_CATEGORIES),
            ]);
            setData(d.itsmCatalogItems || []);
            setCategories(c.itsmCategories || []);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [filterStatus, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            const input = {
                name: values.name, shortDescription: values.shortDescription, description: values.description,
                categoryId: values.categoryId, icon: values.icon, estimatedDelivery: values.estimatedDelivery,
                cost: values.cost, approvalRequired: values.approvalRequired || false,
                approvalType: values.approvalType || 'simple', fulfillmentGroup: values.fulfillmentGroup,
                status: values.status || 'active',
            };
            if (editing) {
                await gql(UPDATE_CATALOG, { id: editing.id, input });
                messageApi.success("Catalog item updated.");
            } else {
                const d = await gql(CREATE_CATALOG, { tenantId: DEFAULT_TENANT_ID, input });
                messageApi.success(`Catalog item ${d.createItsmCatalogItem.catalogCode} created.`);
            }
            setModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); }
    };

    const handleDelete = async (id: string) => {
        try { await gql(DELETE_CATALOG, { id }); messageApi.success("Deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    const columns: ProColumns<any>[] = [
        { title: 'Code', dataIndex: 'catalogCode', width: 110, render: (_, r) => <Tag color="cyan" style={{ fontFamily: 'monospace' }}>{r.catalogCode}</Tag> },
        { title: 'Service Name', dataIndex: 'name', ellipsis: true },
        { title: 'Description', dataIndex: 'shortDescription', ellipsis: true, width: 200 },
        { title: 'Delivery', dataIndex: 'estimatedDelivery', width: 140 },
        { title: 'Cost', dataIndex: 'cost', width: 100 },
        { title: 'Approval', dataIndex: 'approvalRequired', width: 90, render: (_, r) => r.approvalRequired ? <Tag color="orange">Required</Tag> : <Tag color="green">No</Tag> },
        { title: 'Status', dataIndex: 'status', width: 90, render: (_, r) => <Tag color={r.status === 'active' ? 'green' : r.status === 'inactive' ? 'default' : 'red'}>{(r.status || '').toUpperCase()}</Tag> },
        { title: 'Requests', dataIndex: 'requestCount', width: 80 },
        {
            title: 'Actions', valueType: 'option', width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ],
        },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Service Catalog</AuroraText>}
            subTitle={<DecryptedText text="Services available for request" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total Items', value: data.length, icon: <ShopOutlined />, color: '#3b82f6' },
                    { title: 'Active', value: data.filter(d => d.status === 'active').length, icon: <CheckCircleOutlined />, color: '#10b981' },
                    { title: 'Approval Required', value: data.filter(d => d.approvalRequired).length, icon: <FileProtectOutlined />, color: '#f59e0b' },
                    { title: 'Total Requests', value: data.reduce((s, d) => s + (d.requestCount || 0), 0), icon: <AppstoreOutlined />, color: '#8b5cf6' },
                    { title: 'Categories', value: categories.length, icon: <AppstoreOutlined />, color: '#06b6d4' },
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
            <ProTable
                headerTitle={<Space><ShopOutlined /> Service Catalog <Badge count={data.length} style={{ backgroundColor: themeColor }} /></Space>}
                rowKey="id" dataSource={data} loading={loading} columns={columns} search={false}
                toolBarRender={() => [
                    <RbacGuard requiredRole="manager"><Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'itsm_catalog', title: 'Service Catalog', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Category', key: 'category' }, { header: 'Status', key: 'status' }], data: data })} /></Tooltip> <Tooltip key="pdf" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'itsm_catalog', title: 'Service Catalog', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Category', key: 'category' }, { header: 'Status', key: 'status' }], data: data })} /></Tooltip></RbacGuard>,
                    <Select key="fs" placeholder="Status" allowClear style={{ width: 120 }} value={filterStatus} onChange={setFilterStatus}
                        options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'deprecated', label: 'Deprecated' }]} />,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>New Catalog Item</Button>,
                ]}
            />

            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
                onSubmit={handleSave}
                form={form}
                title={editing ? `Edit ${editing.catalogCode}` : "New Catalog Item"}
                entityName="catalog item"
                steps={[
                    {
                        title: "Service Details",
                        icon: <ShopOutlined />,
                        fields: ["name", "shortDescription", "description", "categoryId"],
                        content: (
                            <>
                                <Form.Item name="name" label="Service Name" rules={[{ required: true }]}><Input placeholder="e.g., New Laptop, VPN Access" /></Form.Item>
                                <Form.Item name="shortDescription" label="Short Description"><Input placeholder="Brief user-facing summary" /></Form.Item>
                                <Form.Item name="description" label="Full Description"><Input.TextArea rows={3} placeholder="Detailed service info" /></Form.Item>
                                <Form.Item name="categoryId" label="Category">
                                    <Select placeholder="Select" allowClear options={categories.map(c => ({ value: c.id, label: c.name }))} />
                                </Form.Item>
                            </>
                        ),
                    },
                    {
                        title: "Delivery & Cost",
                        icon: <ShopOutlined />,
                        fields: ["estimatedDelivery", "cost", "icon"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}><Form.Item name="estimatedDelivery" label="Estimated Delivery"><Input placeholder="e.g., 2 business days" /></Form.Item></Col>
                                    <Col span={12}><Form.Item name="cost" label="Cost"><Input placeholder="e.g., Free, $500" /></Form.Item></Col>
                                </Row>
                                <Form.Item name="icon" label="Icon"><Input placeholder="Icon name or emoji" /></Form.Item>
                            </>
                        ),
                    },
                    {
                        title: "Approval & Fulfillment",
                        icon: <ShopOutlined />,
                        fields: ["approvalRequired", "approvalType", "fulfillmentGroup", "status"],
                        content: (
                            <>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="approvalRequired" label="Approval Required?">
                                            <Select options={[{ value: false, label: 'No' }, { value: true, label: 'Yes' }]} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="approvalType" label="Approval Type">
                                            <Select options={[{ value: 'simple', label: 'Simple (1 approver)' }, { value: 'multi_level', label: 'Multi-Level' }]} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item name="fulfillmentGroup" label="Fulfillment Group"><Input placeholder="e.g., IT Service Desk" /></Form.Item>
                                {editing && (
                                    <Form.Item name="status" label="Status">
                                        <Select options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'deprecated', label: 'Deprecated' }]} />
                                    </Form.Item>
                                )}
                            </>
                        ),
                    },
                ]}
                fields={FIELDS}
                width={700}
                gradient={["#13c2c2", "#08979c"]}
                editMode={!!editing}
                initialValues={{ approvalRequired: false, approvalType: 'simple', status: 'active' }}
            />
        </div>
        </CMSLayout>
    );
}

