"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Card,
    Button,
    Space,
    Upload,
    Modal,
    Input,
    message,
    Image,
    Spin,
    Tag,
    Empty,
    Progress,
    Tooltip,
    Dropdown,
    Row,
    Col,
} from "antd";
import {
    UploadOutlined,
    PlusOutlined,
    DeleteOutlined,
    EyeOutlined,
    SearchOutlined,
    FileImageOutlined,
    VideoCameraOutlined,
    FileOutlined,
    CopyOutlined,
    CheckOutlined,
    LoadingOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    MoreOutlined,
} from "@ant-design/icons";
import type { UploadFile, RcFile } from "antd/es/upload/interface";
import mediaService, { MediaFile } from "@/lib/mediaService";

// Sample media data for development
const sampleMedia: MediaFile[] = [
    {
        id: "1",
        filename: "hero-background.jpg",
        url: "https://images.unsplash.com/photo-1557683316-973673baf926?w=800",
        mime_type: "image/jpeg",
        size_bytes: 245000,
        alt_text: "Hero background image",
        created_at: "2024-12-01T10:00:00Z",
    },
    {
        id: "2",
        filename: "team-photo.jpg",
        url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800",
        mime_type: "image/jpeg",
        size_bytes: 185000,
        alt_text: "Team photo",
        created_at: "2024-12-05T14:30:00Z",
    },
    {
        id: "3",
        filename: "product-demo.png",
        url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
        mime_type: "image/png",
        size_bytes: 320000,
        alt_text: "Product demonstration",
        created_at: "2024-12-10T09:00:00Z",
    },
    {
        id: "4",
        filename: "logo.svg",
        url: "/logo.svg",
        mime_type: "image/svg+xml",
        size_bytes: 5000,
        alt_text: "Company logo",
        created_at: "2024-12-15T16:00:00Z",
    },
];

export default function MediaLibraryPage() {
    const [media, setMedia] = useState<MediaFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadMedia();
    }, []);

    const loadMedia = async () => {
        setLoading(true);
        try {
            // Load via GraphQL mediaService
            const data = await mediaService.getMedia();

            if (!data || data.length === 0) {
                setMedia(sampleMedia);
            } else {
                setMedia(data);
            }
        } catch (error) {
            console.warn("Using sample media:", error);
            setMedia(sampleMedia);
        }
        setLoading(false);
    };

    const handleUpload = async (file: File) => {
        setUploading(true);
        setUploadProgress(0);

        // Progress simulation
        const progressInterval = setInterval(() => {
            setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        try {
            // Upload via API route (server-side S3)
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", "uploads");

            const response = await fetch("/api/media", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();
            clearInterval(progressInterval);
            setUploadProgress(100);

            if (result.success && result.media) {
                setMedia([result.media, ...media]);
                message.success(`${file.name} uploaded to S3!`);
            } else {
                throw new Error(result.error || "Upload failed");
            }
        } catch (error: any) {
            clearInterval(progressInterval);
            setUploadProgress(100);
            console.warn("S3 upload failed, using local preview:", error);

            // Fallback to local blob preview
            const newMedia: MediaFile = {
                id: `local-${Date.now()}`,
                filename: file.name,
                url: URL.createObjectURL(file),
                mime_type: file.type,
                size_bytes: file.size,
                alt_text: file.name,
                created_at: new Date().toISOString(),
            };
            setMedia([newMedia, ...media]);
            message.warning(`${file.name} saved locally (S3 error: ${error.message})`);
        }

        setTimeout(() => {
            setUploading(false);
            setUploadProgress(0);
        }, 500);
    };

    const handleDelete = async (id: string) => {
        Modal.confirm({
            title: "Delete Media?",
            content: "This action cannot be undone.",
            okText: "Delete",
            okType: "danger",
            onOk: async () => {
                setMedia(media.filter((m) => m.id !== id));
                message.success("Media deleted");
            },
        });
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        message.success("URL copied to clipboard");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return "Unknown";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (mimeType?: string) => {
        if (!mimeType) return <FileOutlined />;
        if (mimeType.startsWith("image/")) return <FileImageOutlined />;
        if (mimeType.startsWith("video/")) return <VideoCameraOutlined />;
        return <FileOutlined />;
    };

    const filteredMedia = media.filter(
        (m) =>
            m.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.alt_text?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderGridItem = (item: MediaFile) => (
        <Col key={item.id} xs={12} sm={8} md={6} lg={4}>
            <Card
                hoverable
                size="small"
                cover={
                    item.mime_type?.startsWith("image/") ? (
                        <div
                            style={{
                                height: 150,
                                overflow: "hidden",
                                background: "#f5f5f5",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Image
                                src={item.url}
                                alt={item.alt_text || item.filename}
                                style={{ objectFit: "cover", width: "100%", height: 150 }}
                                preview={false}
                                onClick={() => {
                                    setSelectedMedia(item);
                                    setPreviewVisible(true);
                                }}
                            />
                        </div>
                    ) : (
                        <div
                            style={{
                                height: 150,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "#f5f5f5",
                                fontSize: 48,
                                color: "#999",
                            }}
                        >
                            {getFileIcon(item.mime_type)}
                        </div>
                    )
                }
                actions={[
                    <Tooltip key="preview" title="Preview">
                        <EyeOutlined
                            onClick={() => {
                                setSelectedMedia(item);
                                setPreviewVisible(true);
                            }}
                        />
                    </Tooltip>,
                    <Tooltip key="copy" title="Copy URL">
                        {copiedId === item.id ? (
                            <CheckOutlined style={{ color: "#52c41a" }} />
                        ) : (
                            <CopyOutlined onClick={() => copyToClipboard(item.url, item.id)} />
                        )}
                    </Tooltip>,
                    <Tooltip key="delete" title="Delete">
                        <DeleteOutlined onClick={() => handleDelete(item.id)} />
                    </Tooltip>,
                ]}
            >
                <Card.Meta
                    title={
                        <Tooltip title={item.filename}>
                            <span style={{ fontSize: 12 }}>
                                {item.filename.length > 20
                                    ? `${item.filename.substring(0, 20)}...`
                                    : item.filename}
                            </span>
                        </Tooltip>
                    }
                    description={
                        <Space size={4}>
                            <Tag style={{ fontSize: 10 }}>{formatFileSize(item.size_bytes)}</Tag>
                            {item.embedding && (
                                <Tag color="purple" style={{ fontSize: 10 }}>
                                    AI
                                </Tag>
                            )}
                        </Space>
                    }
                />
            </Card>
        </Col>
    );

    return (
        <CMSLayout
            title="Media Library"
            subTitle="Upload and manage your media files"
            extra={[
                <Space key="actions">
                    <Input
                        placeholder="Search media..."
                        prefix={<SearchOutlined />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: 200 }}
                        allowClear
                    />
                    <Button
                        icon={viewMode === "grid" ? <UnorderedListOutlined /> : <AppstoreOutlined />}
                        onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                    />
                    <Upload
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        showUploadList={false}
                        beforeUpload={(file) => {
                            handleUpload(file);
                            return false;
                        }}
                        multiple
                    >
                        <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
                            Upload
                        </Button>
                    </Upload>
                </Space>,
            ]}
        >
            {/* Upload Progress */}
            {uploading && (
                <Card size="small" style={{ marginBottom: 16 }}>
                    <Progress percent={uploadProgress} status="active" />
                </Card>
            )}

            {/* Media Grid */}
            {loading ? (
                <div style={{ textAlign: "center", padding: 60 }}>
                    <Spin size="large" />
                </div>
            ) : filteredMedia.length === 0 ? (
                <Empty
                    description={searchQuery ? "No matching media found" : "No media uploaded yet"}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                    {!searchQuery && (
                        <Upload
                            accept="image/*,video/*,.pdf,.doc,.docx"
                            showUploadList={false}
                            beforeUpload={(file) => {
                                handleUpload(file);
                                return false;
                            }}
                        >
                            <Button type="primary" icon={<UploadOutlined />}>
                                Upload Your First File
                            </Button>
                        </Upload>
                    )}
                </Empty>
            ) : (
                <Row gutter={[16, 16]}>{filteredMedia.map(renderGridItem)}</Row>
            )}

            {/* Preview Modal */}
            <Modal
                open={previewVisible}
                title={selectedMedia?.filename}
                footer={null}
                onCancel={() => setPreviewVisible(false)}
                width={800}
            >
                {selectedMedia?.mime_type?.startsWith("image/") ? (
                    <Image
                        src={selectedMedia.url}
                        alt={selectedMedia.alt_text || selectedMedia.filename}
                        style={{ width: "100%" }}
                        preview={false}
                    />
                ) : (
                    <div style={{ textAlign: "center", padding: 40 }}>
                        <div style={{ fontSize: 72, color: "#999", marginBottom: 16 }}>
                            {getFileIcon(selectedMedia?.mime_type)}
                        </div>
                        <p>{selectedMedia?.filename}</p>
                    </div>
                )}
                <div style={{ marginTop: 16 }}>
                    <Space>
                        <Tag>{selectedMedia?.mime_type}</Tag>
                        <Tag>{formatFileSize(selectedMedia?.size_bytes)}</Tag>
                        {selectedMedia?.embedding && <Tag color="purple">Has Embedding</Tag>}
                    </Space>
                </div>
                <div style={{ marginTop: 16 }}>
                    <Input
                        value={selectedMedia?.url}
                        addonAfter={
                            <CopyOutlined
                                style={{ cursor: "pointer" }}
                                onClick={() =>
                                    selectedMedia && copyToClipboard(selectedMedia.url, selectedMedia.id)
                                }
                            />
                        }
                        readOnly
                    />
                </div>
            </Modal>
        </CMSLayout>
    );
}
