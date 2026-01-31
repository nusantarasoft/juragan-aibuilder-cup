import React, { useState } from 'react';
import { Drawer, Button, Image, Tag, Descriptions, Space, Typography, Divider, message, Spin, Empty } from 'antd';
import {
    FileOutlined,
    FileImageOutlined,
    VideoCameraOutlined,
    ThunderboltOutlined,
    ExperimentOutlined,
    RobotOutlined,
    DownloadOutlined
} from '@ant-design/icons';
import { MediaFile, mediaService } from '@/lib/mediaService';

const { Title, Text, Paragraph } = Typography;

interface MediaDetailDrawerProps {
    visible: boolean;
    onClose: () => void;
    media: MediaFile | null;
    onRefresh: () => void;
}

export default function MediaDetailDrawer({ visible, onClose, media, onRefresh }: MediaDetailDrawerProps) {
    const [loadingLabel, setLoadingLabel] = useState(false);
    const [loadingEmbed, setLoadingEmbed] = useState(false);
    const [loadingLabelStudio, setLoadingLabelStudio] = useState(false);

    if (!media) return null;

    const handleAutoLabel = async () => {
        setLoadingLabel(true);
        try {
            const tags = await mediaService.autoLabelMedia(media.id);
            if (tags && tags.length > 0) {
                message.success('Labels generated successfully');
                onRefresh();
            } else {
                message.warning('No labels generated');
            }
        } catch (error) {
            message.error('Failed to auto-label media');
        } finally {
            setLoadingLabel(false);
        }
    };

    const handleGenerateEmbedding = async () => {
        setLoadingEmbed(true);
        try {
            const success = await mediaService.generateMediaEmbeddings(media.id, "");
            if (success) {
                message.success('Embedding generated successfully');
                onRefresh();
            } else {
                message.error('Failed to generate embedding');
            }
        } catch (error) {
            message.error('Error generating embedding');
        } finally {
            setLoadingEmbed(false);
        }
    };

    const handleSendToLabelStudio = async () => {
        setLoadingLabelStudio(true);
        try {
            const success = await mediaService.sendToLabelStudio(media.id, media.url);
            if (success) {
                message.success('Sent to Label Studio');
            } else {
                message.error('Failed to send to Label Studio');
            }
        } catch (error) {
            message.error('Error sending to Label Studio');
        } finally {
            setLoadingLabelStudio(false);
        }
    };

    const getFileIcon = (mimeType?: string) => {
        if (!mimeType) return <FileOutlined style={{ fontSize: 48, color: '#999' }} />;
        if (mimeType.startsWith("image/")) return <FileImageOutlined style={{ fontSize: 48, color: '#1890ff' }} />;
        if (mimeType.startsWith("video/")) return <VideoCameraOutlined style={{ fontSize: 48, color: '#faad14' }} />;
        return <FileOutlined style={{ fontSize: 48, color: '#999' }} />;
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return 'Unknown';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Use type assertion for metadata since we can't easily change the type definition file right now
    // In a real scenario, we should update MediaFile interface
    const metadata = (media as any).metadata || {};
    const tags = (media as any).tags || metadata.tags || [];

    return (
        <Drawer
            title={media.filename}
            placement="right"
            width={500}
            onClose={onClose}
            open={visible}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Preview */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f5f5f5', padding: 20, borderRadius: 8, minHeight: 200 }}>
                    {media.mime_type?.startsWith('image/') ? (
                        <Image src={media.url} alt={media.alt_text} style={{ maxHeight: 300, objectFit: 'contain' }} />
                    ) : media.mime_type?.includes('pdf') ? (
                        <iframe
                            src={media.url}
                            title={media.filename}
                            style={{ width: '100%', height: '500px', border: 'none' }}
                        />
                    ) : (
                        getFileIcon(media.mime_type)
                    )}
                </div>

                {/* Actions */}
                <Space wrap>
                    <Button icon={<DownloadOutlined />} href={media.url} target="_blank">Download</Button>
                    <Button
                        icon={<ThunderboltOutlined />}
                        onClick={handleAutoLabel}
                        loading={loadingLabel}
                    >
                        Auto Label
                    </Button>
                    <Button
                        icon={<ExperimentOutlined />}
                        onClick={handleGenerateEmbedding}
                        loading={loadingEmbed}
                    >
                        Generate Embedding
                    </Button>
                    <Button
                        icon={<RobotOutlined />}
                        onClick={handleSendToLabelStudio}
                        loading={loadingLabelStudio}
                    >
                        Label Studio
                    </Button>
                </Space>

                <Divider />

                {/* Metadata */}
                <Descriptions title="File Information" column={1} bordered size="small">
                    <Descriptions.Item label="Filename">
                        <Paragraph copyable={{ text: media.filename }} style={{ marginBottom: 0 }}>
                            {media.filename}
                        </Paragraph>
                    </Descriptions.Item>
                    <Descriptions.Item label="Size">{formatSize(media.size_bytes)}</Descriptions.Item>
                    <Descriptions.Item label="Type">{media.mime_type}</Descriptions.Item>
                    <Descriptions.Item label="Created">{new Date(media.created_at).toLocaleString()}</Descriptions.Item>
                    <Descriptions.Item label="S3 Key">
                        <Paragraph copyable={{ text: media.s3_key }} style={{ marginBottom: 0 }}>
                            <Text ellipsis style={{ maxWidth: 200 }}>{media.s3_key}</Text>
                        </Paragraph>
                    </Descriptions.Item>
                    <Descriptions.Item label="Embedding">
                        {media.embedding ? (
                            <Tag color="success">Vectorized</Tag>
                        ) : (
                            <Tag color="default">Not generated</Tag>
                        )}
                    </Descriptions.Item>
                </Descriptions>

                {/* Tags */}
                <div>
                    <Title level={5}>Labels / Tags</Title>
                    {tags && tags.length > 0 ? (
                        <Space size={[0, 8]} wrap>
                            {tags.map((tag: string, index: number) => (
                                <Tag key={index} color="blue">{tag}</Tag>
                            ))}
                        </Space>
                    ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No labels generated" />
                    )}
                </div>
            </div>
        </Drawer>
    );
}
