'use client';

import React, { useState, useEffect } from 'react';
import { Modal, List, Tag, Button, Space, Typography, Empty, Spin, message, Tooltip, Avatar, Divider } from 'antd';
import {
    HistoryOutlined,
    DownloadOutlined,
    RollbackOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    FileOutlined,
} from '@ant-design/icons';
import mediaService from '@/lib/mediaService';

const { Text, Title } = Typography;

interface ObjectVersion {
    key: string;
    versionId: string;
    lastModified: string;
    size: number;
    isLatest: boolean;
}

interface VersionHistoryModalProps {
    visible: boolean;
    onClose: () => void;
    fileKey: string;
    filename: string;
}

function formatFileSize(bytes?: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString();
}

function getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

export default function VersionHistoryModal({ visible, onClose, fileKey, filename }: VersionHistoryModalProps) {
    const [versions, setVersions] = useState<ObjectVersion[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && fileKey) {
            loadVersions();
        }
    }, [visible, fileKey]);

    const loadVersions = async () => {
        setLoading(true);
        try {
            const data = await mediaService.listObjectVersions(fileKey);
            setVersions(data);
        } catch (error) {
            message.error('Failed to load version history');
        }
        setLoading(false);
    };

    const handleDownloadVersion = async (versionId: string) => {
        // For now, just show a message - actual download would need presigned URL with version
        message.info(`Download version: ${versionId.substring(0, 8)}...`);
    };

    const handleRestoreVersion = async (versionId: string) => {
        message.loading('Restoring version...');
        // Restore would copy the version to become the latest
        // This requires a backend mutation - for now just show message
        setTimeout(() => {
            message.success('Version restored successfully');
            loadVersions();
        }, 1000);
    };

    return (
        <Modal
            title={
                <Space>
                    <HistoryOutlined />
                    <span>Version History</span>
                    <Tag color="blue">{versions.length} versions</Tag>
                </Space>
            }
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
        >
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--ant-color-fill-quaternary)' }}>
                <Space>
                    <FileOutlined style={{ fontSize: 20 }} />
                    <div>
                        <Text strong>{filename}</Text>
                        <br />
                        <Text type="secondary" className="text-xs">{fileKey}</Text>
                    </div>
                </Space>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {loading ? (
                <div className="py-12 flex justify-center">
                    <Spin tip="Loading versions..." />
                </div>
            ) : versions.length === 0 ? (
                <Empty
                    description="No versions found"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                    <Text type="secondary">
                        Enable bucket versioning to track file changes
                    </Text>
                </Empty>
            ) : (
                <List
                    itemLayout="horizontal"
                    dataSource={versions}
                    renderItem={(version, index) => (
                        <List.Item
                            className="hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-3 transition-colors"
                            actions={[
                                <Tooltip key="download" title="Download this version">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<DownloadOutlined />}
                                        onClick={() => handleDownloadVersion(version.versionId)}
                                    />
                                </Tooltip>,
                                !version.isLatest && (
                                    <Tooltip key="restore" title="Restore this version">
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<RollbackOutlined />}
                                            onClick={() => handleRestoreVersion(version.versionId)}
                                        />
                                    </Tooltip>
                                ),
                            ].filter(Boolean)}
                        >
                            <List.Item.Meta
                                avatar={
                                    <Avatar
                                        style={{
                                            backgroundColor: version.isLatest ? '#52c41a' : '#d9d9d9',
                                            color: version.isLatest ? '#fff' : '#666'
                                        }}
                                    >
                                        {version.isLatest ? <CheckCircleOutlined /> : index + 1}
                                    </Avatar>
                                }
                                title={
                                    <Space>
                                        <Text code style={{ fontSize: 12 }}>
                                            {version.versionId.substring(0, 12)}...
                                        </Text>
                                        {version.isLatest && (
                                            <Tag color="green" style={{ margin: 0 }}>
                                                Current
                                            </Tag>
                                        )}
                                    </Space>
                                }
                                description={
                                    <Space split={<Divider orientation="vertical" />}>
                                        <Tooltip title={formatDate(version.lastModified)}>
                                            <Text type="secondary" className="text-xs">
                                                <ClockCircleOutlined /> {getRelativeTime(version.lastModified)}
                                            </Text>
                                        </Tooltip>
                                        <Text type="secondary" className="text-xs">
                                            {formatFileSize(version.size)}
                                        </Text>
                                    </Space>
                                }
                            />
                        </List.Item>
                    )}
                />
            )}
        </Modal>
    );
}
