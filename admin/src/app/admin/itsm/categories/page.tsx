"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Typography, Form, Input, Select, Row, Col } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, AppstoreOutlined, InfoCircleOutlined, SettingOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;

const GET_CATEGORIES = `query { itsmCategories { id name description parentId icon status createdAt } }`;
const CREATE_CATEGORY = `mutation($tenantId: String!, $input: CreateItsmCategoryInput!) { createItsmCategory(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_CATEGORY = `mutation($id: ID!, $input: UpdateItsmCategoryInput!) { updateItsmCategory(id: $id, input: $input) { id } }`;
const DELETE_CATEGORY = `mutation($id: ID!) { deleteItsmCategory(id: $id) }`;

const iconOptions = [
    { value: 'DesktopOutlined', label: '🖥️ Hardware' },
    { value: 'CodeOutlined', label: '💻 Software' },
    { value: 'WifiOutlined', label: '📶 Network' },
    { value: 'SafetyOutlined', label: '🔐 Security' },
    { value: 'MailOutlined', label: '📧 Email' },
    { value: 'DatabaseOutlined', label: '🗄️ Database' },
    { value: 'CloudServerOutlined', label: '☁️ Cloud' },
    { value: 'QuestionCircleOutlined', label: '❓ General' },
    { value: 'PrinterOutlined', label: '🖨️ Printer' },
    { value: 'MobileOutlined', label: '📱 Mobile' },
];

const CATEGORY_FIELDS: FieldDef[] = [
    { name: "name", label: "Category Name", required: true },
    { name: "description", label: "Description" },
    { name: "parentId", label: "Parent Category" },
    { name: "icon", label: "Icon" },
    { name: "status", label: "Status" },
];

export default function ItsmCategoriesPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [categories, setCategories] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const d = await gql(GET_CATEGORIES);
            setCategories(d.itsmCategories || []);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            if (editing) {
                await gql(UPDATE_CATEGORY, { id: editing.id, input: values });
                messageApi.success("Category updated.");
            } else {
                await gql(CREATE_CATEGORY, { tenantId: DEFAULT_TENANT_ID, input: values });
                messageApi.success("Category created.");
            }
            setModalOpen(false);
            form.resetFields();
            setEditing(null);
            loadData();
        } catch (err: any) { messageApi.error(err.message); }
    };

    const handleDelete = async (id: string) => {
        try { await gql(DELETE_CATEGORY, { id }); messageApi.success("Category deleted."); loadData(); }
        catch (err: any) { messageApi.error(err.message); }
    };

    const columns: ProColumns<any>[] = [
        {
            title: 'Icon', dataIndex: 'icon', width: 60,
            render: (_, r) => {
                const match = iconOptions.find(o => o.value === r.icon);
                return <Text style={{ fontSize: 20 }}>{match?.label?.split(' ')[0] || '📁'}</Text>;
            }
        },
        { title: 'Name', dataIndex: 'name', render: (_, r) => <Text strong>{r.name}</Text> },
        { title: 'Description', dataIndex: 'description', ellipsis: true },
        {
            title: 'Parent', dataIndex: 'parentId', width: 150,
            render: (_, r) => {
                const parent = categories.find(c => c.id === r.parentId);
                return parent ? <Tag>{parent.name}</Tag> : '-';
            }
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
                        name: record.name, description: record.description,
                        parentId: record.parentId, icon: record.icon, status: record.status,
                    });
                    setModalOpen(true);
                }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ]
        }
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Service Categories</AuroraText>}
            subTitle={<DecryptedText text="Manage ITSM ticket categories" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            <ProTable
                headerTitle={<Space><AppstoreOutlined /> Service Categories</Space>}
                rowKey="id"
                dataSource={categories}
                loading={loading}
                columns={columns}
                search={false}
                toolBarRender={() => [
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
                        New Category
                    </Button>,
                ]}
            />

            {/* ─── Category SteppedFormModal ─────────────── */}
            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
                onSubmit={handleSave}
                form={form}
                title={editing ? "Edit Category" : "New Category"}
                entityName="category"
                steps={[
                    {
                        title: "Basic Info",
                        icon: <InfoCircleOutlined />,
                        fields: ["name", "description"],
                        content: (
                            <>
                                <Form.Item name="name" label="Category Name" rules={[{ required: true }]}>
                                    <Input placeholder="e.g., Hardware, Software, Network" />
                                </Form.Item>
                                <Form.Item name="description" label="Description">
                                    <Input.TextArea rows={3} placeholder="What types of issues fall under this category?" />
                                </Form.Item>
                            </>
                        ),
                    },
                    {
                        title: "Settings",
                        icon: <SettingOutlined />,
                        fields: ["parentId", "icon", "status"],
                        content: (
                            <>
                                <Form.Item name="parentId" label="Parent Category">
                                    <Select allowClear placeholder="Select parent (optional)"
                                        options={categories.filter(c => c.id !== editing?.id).map(c => ({ value: c.id, label: c.name }))} />
                                </Form.Item>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="icon" label="Icon">
                                            <Select options={iconOptions} placeholder="Select icon" />
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
                fields={CATEGORY_FIELDS}
                width={600}
                gradient={["#13c2c2", "#36cfc9"]}
                editMode={!!editing}
                initialValues={{ status: 'active' }}
            />
        </div>
        </CMSLayout>
    );
}
