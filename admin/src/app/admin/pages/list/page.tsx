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
} from "antd";
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
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import pageService, { CMSPage } from "@/lib/pageService";

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
    const router = useRouter();
    const [pages, setPages] = useState<CMSPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);
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
            <Table
                columns={columns}
                dataSource={pages}
                rowKey="id"
                loading={loading}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `${total} pages`,
                }}
                locale={{
                    emptyText: (
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
                    ),
                }}
            />

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
