import React, { useState, useEffect } from 'react';
import { Drawer, List, Checkbox, Input, Spin, Avatar, Typography, Button, Space, message } from 'antd';
import { FileOutlined, SearchOutlined, CheckOutlined } from '@ant-design/icons';
import { mediaService, MediaFile } from '@/lib/mediaService';

const { Text } = Typography;

interface FileSelectorDrawerProps {
    visible: boolean;
    onClose: () => void;
    selectedIds: Set<string>;
    onSelectionChange: (ids: Set<string>, files: MediaFile[]) => void; // Pass files back too for display
}

export default function FileSelectorDrawer({ visible, onClose, selectedIds, onSelectionChange }: FileSelectorDrawerProps) {
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set(selectedIds));

    // Sync props to local state when opening
    useEffect(() => {
        if (visible) {
            setLocalSelectedIds(new Set(selectedIds));
            loadMedia();
        }
    }, [visible]);

    const loadMedia = async () => {
        setLoading(true);
        try {
            // Fetch more files for selection, e.g. 100 recent
            // Ideally we should implement search and pagination here
            const files = await mediaService.getMedia({ limit: 100, mimeType: undefined });
            setMediaFiles(files);
        } catch (error) {
            message.error("Failed to load media files");
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(localSelectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setLocalSelectedIds(newSet);
    };

    const handleConfirm = () => {
        // Find the full file objects for the selected IDs
        const selectedFiles = mediaFiles.filter(f => localSelectedIds.has(f.id));
        onSelectionChange(localSelectedIds, selectedFiles);
        onClose();
    };

    const filteredFiles = mediaFiles.filter(f =>
        f.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Drawer
            title="Select Source Files"
            size={400} // Nested drawer width
            onClose={onClose}
            open={visible}
            extra={
                <Button type="primary" onClick={handleConfirm} icon={<CheckOutlined />}>
                    Confirm ({localSelectedIds.size})
                </Button>
            }
        >
            <Input
                placeholder="Search files..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ marginBottom: 16 }}
            />

            {loading ? <Spin style={{ display: 'block', margin: '20px auto' }} /> : (
                <List
                    dataSource={filteredFiles}
                    renderItem={item => (
                        <List.Item
                            onClick={() => toggleSelection(item.id)}
                            style={{
                                cursor: 'pointer',
                                backgroundColor: localSelectedIds.has(item.id) ? '#e6f7ff' : 'transparent',
                                borderRadius: 4,
                                padding: 8
                            }}
                        >
                            <Space>
                                <Checkbox checked={localSelectedIds.has(item.id)} />
                                <Avatar shape="square" src={item.mime_type?.startsWith('image/') ? item.url : undefined} icon={<FileOutlined />} />
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                                    <Text>{item.filename}</Text>
                                    <div style={{ fontSize: 10, color: '#999' }}>{item.mime_type}</div>
                                </div>
                            </Space>
                        </List.Item>
                    )}
                />
            )}
        </Drawer>
    );
}
