"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Table,
    Button,
    Space,
    Tag,
    Modal,
    Input,
    Form,
    message,
    Popconfirm,
    Dropdown,
    Empty,
    Card, Row, Col, Statistic, Tooltip, Segmented, Spin,
} from "antd";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    CopyOutlined,
    MoreOutlined,
    GlobalOutlined,
    FileTextOutlined,
    CloudUploadOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import RbacGuard from "@/components/common/RbacGuard";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import pageService, { CMSPage } from "@/lib/pageService";

const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

// Sample data for development (when Supabase is not connected)
const samplePages: CMSPage[] = [
    {
        id: "1",
        title: "Home Page",
        slug: "home",
        content: [],
        status: "published",
        author_id: "1",
        meta_title: "Home - Nusantarasoft",
        meta_description: "Welcome to Nusantarasoft",
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-12-20T14:30:00Z",
        published_at: "2024-01-15T12:00:00Z",
    },
    {
        id: "2",
        title: "About Us",
        slug: "about",
        content: [],
        status: "published",
        author_id: "1",
        created_at: "2024-02-10T09:00:00Z",
        updated_at: "2024-12-18T11:00:00Z",
        published_at: "2024-02-10T10:00:00Z",
    },
    {
        id: "3",
        title: "Contact",
        slug: "contact",
        content: [],
        status: "draft",
        author_id: "1",
        created_at: "2024-03-05T08:00:00Z",
        updated_at: "2024-12-15T16:00:00Z",
    },
    {
        id: "4",
        title: "Services",
        slug: "services",
        content: [],
        status: "draft",
        author_id: "2",
        created_at: "2024-04-20T14:00:00Z",
        updated_at: "2024-12-10T09:30:00Z",
    },
];

export default function PagesListPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const router = useRouter();
    const [pages, setPages] = useState<CMSPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [form] = Form.useForm();

    useEffect(() => {
        loadPages();
    }, []);

    const loadPages = async () => {
        setLoading(true);
        try {
            const data = await pageService.getPages();
            // Use sample data if no data from Supabase (dev mode)
            setPages(data.length > 0 ? data : samplePages);
        } catch (error) {
            // Fallback to sample data
            setPages(samplePages);
        }
        setLoading(false);
    };

    const handleCreatePage = async (values: { title: string; slug: string }) => {
        const newPage = await pageService.createPage({
            title: values.title,
            slug: values.slug || values.title.toLowerCase().replace(/\s+/g, "-"),
        });

        if (newPage) {
            message.success("Page created!");
            setCreateModalOpen(false);
            form.resetFields();
            router.push(`/admin/pages/builder?id=${newPage.id}`);
        } else {
            // Dev mode - create locally
            const localPage: CMSPage = {
                id: `local-${Date.now()}`,
                title: values.title,
                slug: values.slug || values.title.toLowerCase().replace(/\s+/g, "-"),
                content: [],
                status: "draft",
                author_id: "1",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setPages([localPage, ...pages]);
            setCreateModalOpen(false);
            form.resetFields();
            message.success("Page created (local mode)");
            router.push(`/admin/pages/builder?id=${localPage.id}`);
        }
    };

    const handleDeletePage = async (id: string) => {
        const success = await pageService.deletePage(id);
        if (success) {
            message.success("Page deleted");
            loadPages();
        } else {
            // Dev mode - delete locally
            setPages(pages.filter(p => p.id !== id));
            message.success("Page deleted (local mode)");
        }
    };

    const handleDuplicatePage = async (id: string) => {
        const newPage = await pageService.duplicatePage(id);
        if (newPage) {
            message.success("Page duplicated!");
            loadPages();
        } else {
            // Dev mode
            const original = pages.find(p => p.id === id);
            if (original) {
                const copy: CMSPage = {
                    ...original,
                    id: `local-${Date.now()}`,
                    title: `${original.title} (Copy)`,
                    slug: `${original.slug}-copy`,
                    status: "draft",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                setPages([copy, ...pages]);
                message.success("Page duplicated (local mode)");
            }
        }
    };

    const handlePublish = async (id: string, currentStatus: string) => {
        if (currentStatus === "published") {
            await pageService.unpublishPage(id);
            message.info("Page unpublished");
        } else {
            await pageService.publishPage(id);
            message.success("Page published!");
        }
        loadPages();
    };

    const columns: ColumnsType<CMSPage> = [
        {
            title: "Title",
            dataIndex: "title",
            key: "title",
            render: (text, record) => (
                <Space>
                    <FileTextOutlined />
                    <a onClick={() => router.push(`/admin/pages/builder?id=${record.id}`)}>
                        {text}
                    </a>
                </Space>
            ),
        },
        {
            title: "Slug",
            dataIndex: "slug",
            key: "slug",
            render: (slug) => (
                <Tag>/{slug}</Tag>
            ),
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status) => (
                <Tag color={status === "published" ? "green" : "orange"}>
                    {status === "published" ? <><GlobalOutlined /> Published</> : "Draft"}
                </Tag>
            ),
        },
        {
            title: "Last Updated",
            dataIndex: "updated_at",
            key: "updated_at",
            render: (date) => new Date(date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }),
        },
        {
            title: "Actions",
            key: "actions",
            width: 180,
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => router.push(`/admin/pages/builder?id=${record.id}`)}
                    >
                        Edit
                    </Button>
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: "preview",
                                    icon: <EyeOutlined />,
                                    label: "Preview",
                                    onClick: () => window.open(`/${record.slug}`, "_blank"),
                                },
                                {
                                    key: "publish",
                                    icon: <CloudUploadOutlined />,
                                    label: record.status === "published" ? "Unpublish" : "Publish",
                                    onClick: () => handlePublish(record.id, record.status),
                                },
                                {
                                    key: "duplicate",
                                    icon: <CopyOutlined />,
                                    label: "Duplicate",
                                    onClick: () => handleDuplicatePage(record.id),
                                },
                                { type: "divider" },
                                {
                                    key: "delete",
                                    icon: <DeleteOutlined />,
                                    label: "Delete",
                                    danger: true,
                                    onClick: () => {
                                        Modal.confirm({
                                            title: "Delete Page?",
                                            content: `Are you sure you want to delete "${record.title}"?`,
                                            okText: "Delete",
                                            okType: "danger",
                                            onOk: () => handleDeletePage(record.id),
                                        });
                                    },
                                },
                            ],
                        }}
                    >
                        <Button size="small" icon={<MoreOutlined />} />
                    </Dropdown>
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Pages</AuroraText>}
            subTitle={<DecryptedText text="Manage your website pages" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Segmented
                    key="view"
                    options={[
                        { value: 'grid', icon: <AppstoreOutlined /> },
                        { value: 'table', icon: <UnorderedListOutlined /> }
                    ]}
                    value={viewMode}
                    onChange={(val) => setViewMode(val as "grid" | "table")}
                />,
                <Button
                    key="create"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateModalOpen(true)}
                >
                    Create Page
                </Button>,
            ]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total Pages', value: pages.length, icon: <FileTextOutlined />, color: '#3b82f6' },
                    { title: 'Published', value: pages.filter(p => p.status === 'published').length, icon: <GlobalOutlined />, color: '#10b981' },
                    { title: 'Draft', value: pages.filter(p => p.status === 'draft').length, icon: <FileTextOutlined />, color: '#f59e0b' },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={8}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Spin size="large" />
                </div>
            ) : pages.length === 0 ? (
                <Empty
                    description="No pages yet"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setCreateModalOpen(true)}
                    >
                        Create Your First Page
                    </Button>
                </Empty>
            ) : viewMode === 'table' ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Table scroll={{ x: 900 }}
                        columns={columns}
                        dataSource={pages}
                        rowKey="id"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `${total} pages`,
                        }}
                        style={{ ...glass, padding: 12 }}
                    />
                </motion.div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Row gutter={[16, 16]}>
                        <AnimatePresence>
                            {pages.map((page, index) => (
                                <Col xs={24} md={12} lg={8} key={page.id}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card
                                            hoverable
                                            style={{ ...glass, height: '100%', overflow: 'hidden' }}
                                            bodyStyle={{ padding: 20 }}
                                            actions={[
                                                <Tooltip key="preview" title="Preview"><EyeOutlined onClick={() => window.open(`/${page.slug}`, "_blank")} /></Tooltip>,
                                                <Tooltip key="edit" title="Edit"><EditOutlined onClick={() => router.push(`/admin/pages/builder?id=${page.id}`)} /></Tooltip>,
                                                <Tooltip key="duplicate" title="Duplicate"><CopyOutlined onClick={() => handleDuplicatePage(page.id)} /></Tooltip>,
                                                <Dropdown key="more" menu={{
                                                    items: [
                                                        {
                                                            key: "publish",
                                                            icon: <CloudUploadOutlined />,
                                                            label: page.status === "published" ? "Unpublish" : "Publish",
                                                            onClick: () => handlePublish(page.id, page.status),
                                                        },
                                                        { type: 'divider' },
                                                        {
                                                            key: "delete",
                                                            icon: <DeleteOutlined />,
                                                            label: "Delete",
                                                            danger: true,
                                                            onClick: () => {
                                                                Modal.confirm({
                                                                    title: "Delete Page?",
                                                                    content: `Are you sure you want to delete "${page.title}"?`,
                                                                    okText: "Delete",
                                                                    okType: "danger",
                                                                    onOk: () => handleDeletePage(page.id),
                                                                });
                                                            },
                                                        }
                                                    ]
                                                }}>
                                                    <MoreOutlined />
                                                </Dropdown>
                                            ]}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                                <div style={{ fontWeight: 600, fontSize: 16 }}>
                                                    <a onClick={() => router.push(`/admin/pages/builder?id=${page.id}`)} style={{ color: 'inherit' }}>
                                                        {page.title}
                                                    </a>
                                                </div>
                                            </div>
                                            <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <Tag color={page.status === "published" ? "green" : "orange"} style={{ margin: 0, borderRadius: 12, padding: '0 10px' }}>
                                                    {page.status === "published" ? <><GlobalOutlined /> Published</> : "Draft"}
                                                </Tag>
                                                <Tag style={{ margin: 0, borderRadius: 4, background: 'rgba(0,0,0,0.02)' }}>/{page.slug}</Tag>
                                            </div>
                                            <div style={{ color: '#888', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <FileTextOutlined /> Updated: {new Date(page.updated_at || new Date()).toLocaleDateString()}
                                            </div>
                                        </Card>
                                    </motion.div>
                                </Col>
                            ))}
                        </AnimatePresence>
                    </Row>
                </motion.div>
            )}

            {/* Create Page Modal */}
            <Modal
                title="Create New Page"
                open={createModalOpen}
                onCancel={() => setCreateModalOpen(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreatePage}
                >
                    <Form.Item
                        name="title"
                        label="Page Title"
                        rules={[{ required: true, message: "Please enter a page title" }]}
                    >
                        <Input placeholder="e.g., About Us" />
                    </Form.Item>
                    <Form.Item
                        name="slug"
                        label="URL Slug (optional)"
                        extra="Leave empty to auto-generate from title"
                    >
                        <Input
                            prefix="/"
                            placeholder="e.g., about-us"
                        />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button onClick={() => setCreateModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                                Create & Edit
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
