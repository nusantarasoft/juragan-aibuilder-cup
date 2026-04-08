"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ProTable, ProColumns, ModalForm, ProFormText, ProFormTextArea, ProFormSelect } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Typography } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, AppstoreOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

const { Text } = Typography;

const GET_CATEGORIES = `query { itsmCategories { id name description parentId icon status createdAt } }`;
const CREATE_CATEGORY = `mutation($tenantId: String!, $input: CreateItsmCategoryInput!) { createItsmCategory(tenantId: $tenantId, input: $input) { id } }`;
const UPDATE_CATEGORY = `mutation($id: ID!, $input: UpdateItsmCategoryInput!) { updateItsmCategory(id: $id, input: $input) { id } }`;
const DELETE_CATEGORY = `mutation($id: ID!) { deleteItsmCategory(id: $id) }`;

export default function ItsmCategoriesPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);

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
            loadData();
            return true;
        } catch (err: any) { messageApi.error(err.message); return false; }
    };

    const handleDelete = async (id: string) => {
        try { await gql(DELETE_CATEGORY, { id }); messageApi.success("Category deleted."); loadData(); }
        catch (err: any) { messageApi.error(err.message); }
    };

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
            render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'}>{(v || '').toUpperCase()}</Tag>
        },
        {
            title: 'Actions', valueType: 'option', width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditing(record); setModalOpen(true); }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ]
        }
    ];

    return (
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
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true); }}>
                        New Category
                    </Button>,
                ]}
            />

            <ModalForm
                title={editing ? "Edit Category" : "New Category"}
                open={modalOpen}
                onOpenChange={setModalOpen}
                onFinish={handleSave}
                initialValues={editing || { status: 'active' }}
                modalProps={{ destroyOnClose: true, width: 520 }}
            >
                <ProFormText name="name" label="Category Name" rules={[{ required: true }]} placeholder="e.g., Hardware, Software, Network" />
                <ProFormTextArea name="description" label="Description" placeholder="What types of issues fall under this category?" />
                <ProFormSelect name="parentId" label="Parent Category" allowClear
                    options={categories.filter(c => c.id !== editing?.id).map(c => ({ value: c.id, label: c.name }))}
                />
                <ProFormSelect name="icon" label="Icon" options={iconOptions} />
                <ProFormSelect name="status" label="Status"
                    options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                />
            </ModalForm>
        </div>
    );
}
