"use client";

import React, { useState, useRef } from "react";
import { Image, Button, Tooltip, Upload, Progress, Modal, Typography, message } from "antd";
import {
    PlusOutlined, DeleteOutlined, StarOutlined, StarFilled,
    EyeOutlined, PlayCircleOutlined, CloudUploadOutlined,
    ArrowLeftOutlined, ArrowRightOutlined, LoadingOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";

const { Text } = Typography;

export interface MediaInfo {
    id: string;
    url: string;
    filename: string;
    mimeType?: string;
    thumbnailUrl?: string;
}

interface ItemMediaGalleryProps {
    /** Ordered array of media IDs (first = primary/cover) */
    mediaIds: string[];
    /** Map of media ID -> MediaInfo for resolved media data */
    mediaMap: Record<string, MediaInfo>;
    /** Called when mediaIds changes (add, remove, reorder, set-primary) */
    onChange: (ids: string[]) => void;
    /** Called to upload a file, should return the new media ID + info */
    onUpload: (file: File) => Promise<MediaInfo | null>;
    /** Called when a media is deleted */
    onDelete?: (id: string) => Promise<void>;
    /** Read-only gallery mode (no upload/edit) */
    readOnly?: boolean;
    /** Maximum number of files allowed */
    maxFiles?: number;
}

/**
 * E-Commerce style media gallery with upload, reorder, set-primary, delete, preview
 */
export default function ItemMediaGallery({
    mediaIds,
    mediaMap,
    onChange,
    onUpload,
    onDelete,
    readOnly = false,
    maxFiles = 20,
}: ItemMediaGalleryProps) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const resolvedMedia = mediaIds
        .map(id => mediaMap[id])
        .filter(Boolean) as MediaInfo[];

    const isVideo = (m: MediaInfo) => m.mimeType?.startsWith("video/");
    const isImage = (m: MediaInfo) => !isVideo(m);

    // ─── Handlers ───────────────────────────────────────
    const handleUpload = async (file: File) => {
        if (mediaIds.length >= maxFiles) {
            message.warning(`Maximum ${maxFiles} files allowed`);
            return false;
        }
        setUploading(true);
        setUploadProgress(0);
        // Simulate progress
        const interval = setInterval(() => {
            setUploadProgress(prev => Math.min(prev + 15, 90));
        }, 200);
        try {
            const result = await onUpload(file);
            if (result) {
                onChange([...mediaIds, result.id]);
                message.success(`${file.name} uploaded`);
            }
        } catch {
            message.error("Upload failed");
        } finally {
            clearInterval(interval);
            setUploadProgress(100);
            setTimeout(() => { setUploading(false); setUploadProgress(0); }, 300);
        }
        return false; // prevent Ant default upload
    };

    const handleDelete = async (id: string) => {
        try {
            if (onDelete) await onDelete(id);
            onChange(mediaIds.filter(mid => mid !== id));
            message.success("Media removed");
        } catch {
            message.error("Failed to remove");
        }
    };

    const handleSetPrimary = (id: string) => {
        const newIds = [id, ...mediaIds.filter(mid => mid !== id)];
        onChange(newIds);
        message.success("Set as primary image");
    };

    const handleMoveLeft = (index: number) => {
        if (index <= 0) return;
        const newIds = [...mediaIds];
        [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
        onChange(newIds);
    };

    const handleMoveRight = (index: number) => {
        if (index >= mediaIds.length - 1) return;
        const newIds = [...mediaIds];
        [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
        onChange(newIds);
    };

    // ─── Render ─────────────────────────────────────────
    return (
        <div>
            {/* Upload Drop Zone */}
            {!readOnly && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <Upload.Dragger
                        accept="image/*,video/*"
                        showUploadList={false}
                        beforeUpload={handleUpload}
                        multiple
                        disabled={uploading}
                        style={{
                            borderRadius: 16,
                            border: '2px dashed #d9d9d9',
                            background: 'linear-gradient(135deg, #faf5ff 0%, #f0f9ff 100%)',
                            padding: '16px 24px',
                            marginBottom: 20,
                        }}
                    >
                        {uploading ? (
                            <div style={{ padding: '12px 0' }}>
                                <LoadingOutlined style={{ fontSize: 28, color: 'var(--theme-color, #7c3aed)', marginBottom: 8 }} />
                                <p style={{ margin: '8px 0 4px', fontWeight: 600, color: '#374151' }}>Uploading...</p>
                                <Progress
                                    percent={uploadProgress}
                                    strokeColor={{ from: 'var(--theme-color, #7c3aed)', to: '#6366f1' }}
                                    size="small"
                                    style={{ maxWidth: 240, margin: '0 auto' }}
                                />
                            </div>
                        ) : (
                            <div style={{ padding: '12px 0' }}>
                                <CloudUploadOutlined style={{ fontSize: 32, color: 'var(--theme-color, #7c3aed)', marginBottom: 8 }} />
                                <p style={{ margin: '8px 0 4px', fontWeight: 600, color: '#374151', fontSize: 14 }}>
                                    Drop photos & videos here
                                </p>
                                <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>
                                    or click to browse • JPG, PNG, WebP, MP4 • Max {maxFiles} files
                                </p>
                            </div>
                        )}
                    </Upload.Dragger>
                </motion.div>
            )}

            {/* Media Grid */}
            {resolvedMedia.length > 0 ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 12,
                }}>
                    <AnimatePresence>
                        {resolvedMedia.map((media, index) => {
                            const isPrimary = index === 0;
                            return (
                                <motion.div
                                    key={media.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        position: 'relative',
                                        aspectRatio: '1',
                                        borderRadius: 12,
                                        overflow: 'hidden',
                                        border: isPrimary ? '3px solid var(--theme-color, #7c3aed)' : '2px solid #f0f0f0',
                                        boxShadow: isPrimary ? '0 4px 16px rgba(124,58,237,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {/* Primary Badge */}
                                    {isPrimary && (
                                        <div style={{
                                            position: 'absolute', top: 6, left: 6, zIndex: 10,
                                            background: 'var(--theme-color, #7c3aed)', color: '#fff', borderRadius: 6,
                                            padding: '2px 8px', fontSize: 10, fontWeight: 700,
                                            letterSpacing: '0.5px',
                                        }}>
                                            COVER
                                        </div>
                                    )}

                                    {/* Media */}
                                    {isVideo(media) ? (
                                        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
                                            <video src={media.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                                            <div style={{
                                                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: 'rgba(0,0,0,0.25)',
                                            }}>
                                                <PlayCircleOutlined style={{ fontSize: 36, color: '#fff' }} />
                                            </div>
                                        </div>
                                    ) : (
                                        <img
                                            src={media.url}
                                            alt={media.filename}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    )}

                                    {/* Hover Overlay */}
                                    <div
                                        style={{
                                            position: 'absolute', inset: 0, display: 'flex', gap: 4,
                                            alignItems: 'center', justifyContent: 'center',
                                            background: 'rgba(0,0,0,0.55)', opacity: 0, transition: 'opacity 0.2s',
                                        }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
                                    >
                                        <Tooltip title="Preview">
                                            <Button type="primary" shape="circle" size="small"
                                                icon={<EyeOutlined />}
                                                onClick={() => { setPreviewIndex(index); setPreviewOpen(true); }}
                                            />
                                        </Tooltip>

                                        {!readOnly && (
                                            <>
                                                {!isPrimary && (
                                                    <Tooltip title="Set as cover">
                                                        <Button shape="circle" size="small"
                                                            icon={<StarOutlined />}
                                                            style={{ background: 'rgba(255,255,255,0.9)', border: 'none' }}
                                                            onClick={() => handleSetPrimary(media.id)}
                                                        />
                                                    </Tooltip>
                                                )}
                                                {index > 0 && (
                                                    <Tooltip title="Move left">
                                                        <Button shape="circle" size="small"
                                                            icon={<ArrowLeftOutlined />}
                                                            style={{ background: 'rgba(255,255,255,0.9)', border: 'none' }}
                                                            onClick={() => handleMoveLeft(index)}
                                                        />
                                                    </Tooltip>
                                                )}
                                                {index < mediaIds.length - 1 && (
                                                    <Tooltip title="Move right">
                                                        <Button shape="circle" size="small"
                                                            icon={<ArrowRightOutlined />}
                                                            style={{ background: 'rgba(255,255,255,0.9)', border: 'none' }}
                                                            onClick={() => handleMoveRight(index)}
                                                        />
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Delete">
                                                    <Button danger shape="circle" size="small"
                                                        icon={<DeleteOutlined />}
                                                        onClick={() => handleDelete(media.id)}
                                                    />
                                                </Tooltip>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Add more button (in grid) */}
                    {!readOnly && mediaIds.length < maxFiles && !uploading && (
                        <Upload
                            accept="image/*,video/*"
                            showUploadList={false}
                            beforeUpload={handleUpload}
                            multiple
                        >
                            <motion.div
                                whileHover={{ scale: 1.02, borderColor: 'var(--theme-color, #7c3aed)' }}
                                style={{
                                    aspectRatio: '1', borderRadius: 12, border: '2px dashed #d9d9d9',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', background: '#fafafa', transition: 'all 0.2s',
                                }}
                            >
                                <PlusOutlined style={{ fontSize: 20, color: '#999', marginBottom: 4 }} />
                                <Text type="secondary" style={{ fontSize: 11 }}>Add more</Text>
                            </motion.div>
                        </Upload>
                    )}
                </div>
            ) : readOnly ? (
                <div style={{
                    textAlign: 'center', padding: '40px 20px', color: '#999',
                    background: '#fafafa', borderRadius: 12,
                }}>
                    <CloudUploadOutlined style={{ fontSize: 40, marginBottom: 8 }} />
                    <p style={{ margin: 0 }}>No media attached</p>
                </div>
            ) : null}

            {/* Lightbox Preview */}
            <Image.PreviewGroup
                preview={{
                    visible: previewOpen,
                    current: previewIndex,
                    onVisibleChange: v => setPreviewOpen(v),
                    onChange: i => setPreviewIndex(i),
                }}
            >
                {resolvedMedia.filter(isImage).map(m => (
                    <Image key={m.id} src={m.url} style={{ display: 'none' }} />
                ))}
            </Image.PreviewGroup>
        </div>
    );
}

/**
 * E-Commerce Product Gallery — for detail drawer / product page
 * Shows main image + thumbnail strip
 */
export function ProductGallery({
    mediaIds,
    mediaMap,
}: {
    mediaIds: string[];
    mediaMap: Record<string, MediaInfo>;
}) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [previewOpen, setPreviewOpen] = useState(false);

    const resolvedMedia = mediaIds
        .map(id => mediaMap[id])
        .filter(Boolean) as MediaInfo[];

    if (resolvedMedia.length === 0) return null;

    const activeMedia = resolvedMedia[activeIndex] || resolvedMedia[0];
    const isActiveVideo = activeMedia?.mimeType?.startsWith("video/");

    return (
        <div style={{ marginBottom: 16 }}>
            {/* Main Image */}
            <div
                style={{
                    borderRadius: 14, overflow: 'hidden', position: 'relative',
                    background: '#f5f5f5', cursor: 'pointer',
                }}
                onClick={() => !isActiveVideo && setPreviewOpen(true)}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeMedia.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isActiveVideo ? (
                            <video
                                src={activeMedia.url}
                                controls
                                style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }}
                            />
                        ) : (
                            <img
                                src={activeMedia.url}
                                alt={activeMedia.filename}
                                style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Image counter badge */}
                {resolvedMedia.length > 1 && (
                    <div style={{
                        position: 'absolute', bottom: 10, right: 10,
                        background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 8,
                        padding: '3px 10px', fontSize: 11, fontWeight: 600,
                    }}>
                        {activeIndex + 1} / {resolvedMedia.length}
                    </div>
                )}
            </div>

            {/* Thumbnail Strip */}
            {resolvedMedia.length > 1 && (
                <div style={{
                    display: 'flex', gap: 8, marginTop: 10,
                    overflowX: 'auto', paddingBottom: 4,
                }}>
                    {resolvedMedia.map((media, i) => {
                        const isActive = i === activeIndex;
                        const isVid = media.mimeType?.startsWith("video/");
                        return (
                            <motion.div
                                key={media.id}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => setActiveIndex(i)}
                                style={{
                                    width: 56, height: 56, flexShrink: 0, borderRadius: 8,
                                    overflow: 'hidden', cursor: 'pointer', position: 'relative',
                                    border: isActive ? '2px solid var(--theme-color, #7c3aed)' : '2px solid transparent',
                                    opacity: isActive ? 1 : 0.7,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {isVid ? (
                                    <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <PlayCircleOutlined style={{ color: '#fff', fontSize: 18 }} />
                                    </div>
                                ) : (
                                    <img src={media.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Lightbox */}
            <Image.PreviewGroup
                preview={{
                    visible: previewOpen,
                    current: activeIndex,
                    onVisibleChange: v => setPreviewOpen(v),
                    onChange: i => setActiveIndex(i),
                }}
            >
                {resolvedMedia.filter(m => !m.mimeType?.startsWith("video/")).map(m => (
                    <Image key={m.id} src={m.url} style={{ display: 'none' }} />
                ))}
            </Image.PreviewGroup>
        </div>
    );
}
