"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProTable, ProColumns } from "@ant-design/pro-components";
import { Button, message, Tag, Popconfirm, Space, Select, Form, Input, Row, Col, Typography } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, BookOutlined, FileTextOutlined, TagOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;

const GET_ARTICLES = `query($status: String, $articleType: String, $search: String) { itsmKnowledgeArticles(status: $status, articleType: $articleType, search: $search) { id articleNumber title content categoryId articleType status relatedProblemId author tags views helpfulCount publishedAt createdAt } }`;
const GET_CATEGORIES = `query { itsmCategories { id name } }`;
const CREATE_ARTICLE = `mutation($tenantId: String!, $input: CreateItsmKnowledgeInput!) { createItsmKnowledgeArticle(tenantId: $tenantId, input: $input) { id articleNumber } }`;
const UPDATE_ARTICLE = `mutation($id: ID!, $input: UpdateItsmKnowledgeInput!) { updateItsmKnowledgeArticle(id: $id, input: $input) { id } }`;
const DELETE_ARTICLE = `mutation($id: ID!) { deleteItsmKnowledgeArticle(id: $id) }`;

const statusColors: Record<string, string> = { draft: 'default', review: 'blue', published: 'green', archived: 'red' };
const typeColors: Record<string, string> = { solution: 'green', workaround: 'orange', faq: 'blue', how_to: 'cyan', reference: 'purple' };

const FIELDS: FieldDef[] = [
    { name: "title", label: "Title", required: true },
    { name: "content", label: "Content" },
    { name: "articleType", label: "Article Type" },
    { name: "author", label: "Author" },
];

export default function ItsmKnowledgePage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [data, setData] = useState<any[]>([]);
    const { themeColor } = usePreferencesStore();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();
    const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
    const [filterType, setFilterType] = useState<string | undefined>(undefined);
    const [searchText, setSearchText] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [d, c] = await Promise.all([
                gql(GET_ARTICLES, { status: filterStatus, articleType: filterType, search: searchText || undefined }),
                gql(GET_CATEGORIES),
            ]);
            setData(d.itsmKnowledgeArticles || []);
            setCategories(c.itsmCategories || []);
        } catch (err: any) { messageApi.error(err.message); }
        finally { setLoading(false); }
    }, [filterStatus, filterType, searchText, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (values: any) => {
        try {
            const input: any = {
                title: values.title, content: values.content, categoryId: values.categoryId,
                articleType: values.articleType || 'solution', author: values.author,
                tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
            };
            if (editing) {
                input.status = values.status;
                await gql(UPDATE_ARTICLE, { id: editing.id, input });
                messageApi.success("Article updated.");
            } else {
                const d = await gql(CREATE_ARTICLE, { tenantId: DEFAULT_TENANT_ID, input });
                messageApi.success(`Article ${d.createItsmKnowledgeArticle.articleNumber} created.`);
            }
            setModalOpen(false); form.resetFields(); setEditing(null); loadData();
        } catch (err: any) { messageApi.error(`Failed: ${err.message}`); }
    };

    const handleDelete = async (id: string) => {
        try { await gql(DELETE_ARTICLE, { id }); messageApi.success("Deleted."); loadData(); }
        catch (err: any) { messageApi.error(`Delete failed: ${err.message}`); }
    };

    const columns: ProColumns<any>[] = [
        { title: '#', dataIndex: 'articleNumber', width: 100, render: (_, r) => <Tag color="purple" style={{ fontFamily: 'monospace' }}>{r.articleNumber}</Tag> },
        { title: 'Title', dataIndex: 'title', ellipsis: true },
        { title: 'Type', dataIndex: 'articleType', width: 110, render: (_, r) => <Tag color={typeColors[r.articleType]}>{(r.articleType || '').replace(/_/g, ' ').toUpperCase()}</Tag> },
        { title: 'Status', dataIndex: 'status', width: 100, render: (_, r) => <Tag color={statusColors[r.status]}>{(r.status || '').toUpperCase()}</Tag> },
        { title: 'Author', dataIndex: 'author', width: 120, ellipsis: true },
        { title: '👁', dataIndex: 'views', width: 60, render: (_, r) => r.views || 0 },
        { title: '👍', dataIndex: 'helpfulCount', width: 60, render: (_, r) => r.helpfulCount || 0 },
        { title: 'Tags', dataIndex: 'tags', width: 150, ellipsis: true, render: (_, r) => (r.tags || []).slice(0, 3).map((t: string) => <Tag key={t} style={{ fontSize: 11 }}>{t}</Tag>) },
        {
            title: 'Actions', valueType: 'option', width: 100,
            render: (_, record) => [
                <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => {
                    setEditing(record);
                    form.setFieldsValue({ ...record, tags: (record.tags || []).join(', ') });
                    setModalOpen(true);
                }} />,
                <Popconfirm key="del" title="Delete?" onConfirm={() => handleDelete(record.id)}><Button type="text" danger icon={<DeleteOutlined />} /></Popconfirm>,
            ],
        },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Knowledge Base</AuroraText>}
            subTitle={<DecryptedText text="Solutions, FAQs, and how-to guides" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div>
            {contextHolder}
            <ProTable
                headerTitle={<Space><BookOutlined /> Knowledge Base</Space>}
                rowKey="id" dataSource={data} loading={loading} columns={columns} search={false}
                toolbar={{
                    search: { placeholder: 'Search articles...', onSearch: (v) => setSearchText(v), allowClear: true, style: { width: 250 } },
                }}
                toolBarRender={() => [
                    <Select key="fs" placeholder="Status" allowClear style={{ width: 120 }} value={filterStatus} onChange={setFilterStatus}
                        options={[{ value: 'draft', label: 'Draft' }, { value: 'review', label: 'Review' }, { value: 'published', label: 'Published' }, { value: 'archived', label: 'Archived' }]} />,
                    <Select key="ft" placeholder="Type" allowClear style={{ width: 130 }} value={filterType} onChange={setFilterType}
                        options={[{ value: 'solution', label: 'Solution' }, { value: 'workaround', label: 'Workaround' }, { value: 'faq', label: 'FAQ' }, { value: 'how_to', label: 'How-To' }, { value: 'reference', label: 'Reference' }]} />,
                    <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>New Article</Button>,
                ]}
            />

            <SteppedFormModal
                open={modalOpen}
                onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
                onSubmit={handleSave}
                form={form}
                title={editing ? `Edit ${editing.articleNumber}` : "New Knowledge Article"}
                entityName="article"
                steps={[
                    {
                        title: "Article Info",
                        icon: <FileTextOutlined />,
                        fields: ["title", "articleType", "categoryId", "author"],
                        content: (
                            <>
                                <Form.Item name="title" label="Article Title" rules={[{ required: true }]}><Input placeholder="How to..., Solution for..., FAQ:..." /></Form.Item>
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item name="articleType" label="Article Type">
                                            <Select options={[{ value: 'solution', label: '✅ Solution' }, { value: 'workaround', label: '🔧 Workaround' }, { value: 'faq', label: '❓ FAQ' }, { value: 'how_to', label: '📖 How-To' }, { value: 'reference', label: '📎 Reference' }]} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="categoryId" label="Category">
                                            <Select placeholder="Select" allowClear options={categories.map(c => ({ value: c.id, label: c.name }))} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}><Form.Item name="author" label="Author"><Input placeholder="Your name" /></Form.Item></Col>
                                </Row>
                                {editing && (
                                    <Form.Item name="status" label="Status">
                                        <Select options={[{ value: 'draft', label: 'Draft' }, { value: 'review', label: 'In Review' }, { value: 'published', label: 'Published' }, { value: 'archived', label: 'Archived' }]} />
                                    </Form.Item>
                                )}
                            </>
                        ),
                    },
                    {
                        title: "Content",
                        icon: <BookOutlined />,
                        fields: ["content"],
                        content: (
                            <Form.Item name="content" label="Article Content">
                                <Input.TextArea rows={12} placeholder="Write the knowledge article content here. You can use markdown formatting." />
                            </Form.Item>
                        ),
                    },
                    {
                        title: "Tags & Metadata",
                        icon: <TagOutlined />,
                        fields: ["tags"],
                        content: (
                            <Form.Item name="tags" label="Tags (comma-separated)">
                                <Input placeholder="e.g., network, vpn, troubleshooting, windows" />
                            </Form.Item>
                        ),
                    },
                ]}
                fields={FIELDS}
                width={800}
                gradient={["#722ed1", "#531dab"]}
                editMode={!!editing}
                initialValues={{ articleType: 'solution' }}
            />
        </div>
        </CMSLayout>
    );
}
