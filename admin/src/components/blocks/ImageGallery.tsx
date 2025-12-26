"use client";

import React, { useState } from "react";
import { Card, Image, Row, Col, Modal, Button, Upload, Empty, Tooltip } from "antd";
import {
    UploadOutlined,
    DeleteOutlined,
    EyeOutlined,
    PlusOutlined,
} from "@ant-design/icons";

interface GalleryImage {
    id: string;
    src: string;
    alt?: string;
    caption?: string;
}

interface ImageGalleryProps {
    images?: GalleryImage[];
    onChange?: (images: GalleryImage[]) => void;
    columns?: 2 | 3 | 4 | 6;
    gap?: number;
    editable?: boolean;
}

/**
 * Image Gallery Block Component
 * Displays images in a responsive grid with lightbox preview
 */
export default function ImageGallery({
    images = [],
    onChange,
    columns = 4,
    gap = 16,
    editable = false,
}: ImageGalleryProps) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);

    const handlePreview = (index: number) => {
        setPreviewIndex(index);
        setPreviewOpen(true);
    };

    const handleDelete = (id: string) => {
        if (onChange) {
            onChange(images.filter((img) => img.id !== id));
        }
    };

    const handleUpload = (file: File) => {
        const newImage: GalleryImage = {
            id: `img-${Date.now()}`,
            src: URL.createObjectURL(file),
            alt: file.name,
        };
        if (onChange) {
            onChange([...images, newImage]);
        }
        return false; // Prevent default upload
    };

    const span = 24 / columns;

    if (images.length === 0 && !editable) {
        return (
            <Card>
                <Empty description="No images in gallery" />
            </Card>
        );
    }

    return (
        <div style={{ padding: 16 }}>
            <Row gutter={[gap, gap]}>
                {images.map((image, index) => (
                    <Col key={image.id} span={span}>
                        <Card
                            bodyStyle={{ padding: 0 }}
                            cover={
                                <div
                                    style={{
                                        position: "relative",
                                        aspectRatio: "1",
                                        overflow: "hidden",
                                    }}
                                >
                                    <img
                                        src={image.src}
                                        alt={image.alt || ""}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                        }}
                                    />
                                    <div
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            background: "rgba(0,0,0,0.5)",
                                            display: "flex",
                                            gap: 8,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            opacity: 0,
                                            transition: "opacity 0.2s",
                                        }}
                                        className="gallery-overlay"
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.opacity = "1";
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.opacity = "0";
                                        }}
                                    >
                                        <Tooltip title="Preview">
                                            <Button
                                                type="primary"
                                                shape="circle"
                                                icon={<EyeOutlined />}
                                                onClick={() => handlePreview(index)}
                                            />
                                        </Tooltip>
                                        {editable && (
                                            <Tooltip title="Delete">
                                                <Button
                                                    danger
                                                    shape="circle"
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => handleDelete(image.id)}
                                                />
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>
                            }
                        >
                            {image.caption && (
                                <Card.Meta
                                    description={image.caption}
                                    style={{ padding: 12 }}
                                />
                            )}
                        </Card>
                    </Col>
                ))}

                {editable && (
                    <Col span={span}>
                        <Upload
                            accept="image/*"
                            showUploadList={false}
                            beforeUpload={handleUpload}
                        >
                            <Card
                                style={{
                                    aspectRatio: "1",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    border: "2px dashed #d9d9d9",
                                }}
                                bodyStyle={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "100%",
                                }}
                            >
                                <PlusOutlined style={{ fontSize: 32, color: "#999" }} />
                                <div style={{ marginTop: 8, color: "#999" }}>Add Image</div>
                            </Card>
                        </Upload>
                    </Col>
                )}
            </Row>

            {/* Lightbox Preview */}
            <Image.PreviewGroup
                preview={{
                    visible: previewOpen,
                    current: previewIndex,
                    onVisibleChange: (visible) => setPreviewOpen(visible),
                }}
            >
                {images.map((image) => (
                    <Image key={image.id} src={image.src} style={{ display: "none" }} />
                ))}
            </Image.PreviewGroup>
        </div>
    );
}
