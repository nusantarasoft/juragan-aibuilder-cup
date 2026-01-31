import React, { useState, useEffect } from 'react';
import { Modal, Upload, Checkbox, message, Alert, Typography, Select, Space } from 'antd';
import { InboxOutlined, DatabaseOutlined, FolderOutlined } from '@ant-design/icons';
import { UploadChangeParam } from 'antd/es/upload';
import { UploadFile } from 'antd/es/upload/interface';
import { mediaService, S3Bucket } from '@/lib/mediaService';

const { Dragger } = Upload;
const { Text } = Typography;

interface FolderOption {
    label: string;
    value: string;
}

interface UploadModalProps {
    visible: boolean;
    onClose: () => void;
    onUploadSuccess: () => void;
    currentFolder: string;
    bucket?: string;
    buckets?: S3Bucket[];
}

export default function UploadModal({ visible, onClose, onUploadSuccess, currentFolder, bucket, buckets = [] }: UploadModalProps) {
    const [autoLabel, setAutoLabel] = useState(false);
    const [generateEmbedding, setGenerateEmbedding] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [uploading, setUploading] = useState(false);

    // State for selected bucket (defaults to current bucket)
    const [selectedBucket, setSelectedBucket] = useState(bucket || '');

    // State for folder selection
    const [selectedFolder, setSelectedFolder] = useState(currentFolder || '');
    const [folderOptions, setFolderOptions] = useState<FolderOption[]>([]);
    const [loadingFolders, setLoadingFolders] = useState(false);

    // Update selectedBucket when prop changes
    useEffect(() => {
        if (bucket) setSelectedBucket(bucket);
    }, [bucket]);

    // Update selectedFolder when prop changes
    useEffect(() => {
        setSelectedFolder(currentFolder || '');
    }, [currentFolder]);

    // Load folders when bucket changes
    useEffect(() => {
        const loadFolders = async () => {
            if (!selectedBucket) {
                setFolderOptions([{ label: '(root)', value: '' }]);
                return;
            }

            setLoadingFolders(true);
            try {
                const folders = await mediaService.listFolders('', selectedBucket);
                const options: FolderOption[] = [
                    { label: '📁 (root)', value: '' },
                    ...folders.map(f => ({
                        label: `📁 ${f.key}`,
                        value: f.key.endsWith('/') ? f.key.slice(0, -1) : f.key
                    }))
                ];
                setFolderOptions(options);
            } catch (error) {
                console.error('Error loading folders:', error);
                setFolderOptions([{ label: '(root)', value: '' }]);
            } finally {
                setLoadingFolders(false);
            }
        };

        loadFolders();
    }, [selectedBucket]);

    // Custom upload implementation
    const customRequest = async (options: any) => {
        const { file, onSuccess, onError } = options;

        try {
            // Check duplicate first
            const exists = await mediaService.checkDuplicateMedia(file.name, selectedFolder);
            if (exists) {
                const proceed = confirm(`File "${file.name}" already exists. Do you want to try uploading as a new version?`);
                if (!proceed) {
                    onError(new Error('Duplicate rejected'));
                    return;
                }
            }

            // Perform upload
            const result = await mediaService.uploadMedia(file, {
                folder: selectedFolder,
                bucket: selectedBucket,
                autoLabel,
                generateEmbedding
            });

            if (result.success) {
                message.success(`${file.name} uploaded to ${selectedBucket}/${selectedFolder || '(root)'}`);
                onSuccess(result.media);
            } else {
                onError(new Error(result.error));
            }
        } catch (error) {
            onError(error);
        }
    };

    const handleChange = (info: UploadChangeParam) => {
        const newFileList = [...info.fileList];
        setFileList(newFileList);
    };

    const handleOk = () => {
        onClose();
        onUploadSuccess();
        setFileList([]);
    };

    // Handle bucket change - reset folder to root
    const handleBucketChange = (value: string) => {
        setSelectedBucket(value);
        setSelectedFolder(''); // Reset to root when bucket changes
    };

    return (
        <Modal
            title={
                <div className="flex items-center gap-2">
                    <InboxOutlined style={{ color: '#8b5cf6' }} />
                    <span style={{ background: 'linear-gradient(to right, #8b5cf6, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 600 }}>
                        Upload Media
                    </span>
                </div>
            }
            open={visible}
            onCancel={onClose}
            onOk={handleOk}
            width={600}
            okText="Done"
            okButtonProps={{
                style: { background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', border: 'none' }
            }}
            styles={{
                header: {
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    padding: '16px 24px',
                    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                    marginBottom: 0
                },
                mask: {
                    backdropFilter: 'blur(4px)',
                    background: 'rgba(0, 0, 0, 0.4)'
                }
            }}
            modalRender={(modal) => (
                <div className="custom-modal-wrapper">
                    <style>{`
                        .custom-modal-wrapper .ant-modal-content {
                            border-radius: 16px !important;
                            background: rgba(255, 255, 255, 0.8) !important;
                            backdrop-filter: blur(20px) !important;
                            -webkit-backdrop-filter: blur(20px) !important;
                            border: 1px solid rgba(255, 255, 255, 0.2) !important;
                            box-shadow: 0 20px 50px rgba(0,0,0,0.1) !important;
                        }
                        :global(.dark) .custom-modal-wrapper .ant-modal-content {
                            background: rgba(15, 23, 42, 0.85) !important;
                            border: 1px solid rgba(139, 92, 246, 0.2) !important;
                        }
                    `}</style>
                    {modal}
                </div>
            )}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* Target Bucket - Searchable */}
                <div>
                    <Text strong><DatabaseOutlined /> Target Bucket:</Text>
                    <Select
                        style={{ width: '100%', marginTop: 4 }}
                        value={selectedBucket}
                        onChange={handleBucketChange}
                        options={buckets.map(b => ({ label: b.name, value: b.name }))}
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        placeholder="Search and select bucket..."
                        notFoundContent="No buckets found"
                    />
                </div>

                {/* Target Folder - Searchable, depends on bucket */}
                <div>
                    <Text strong><FolderOutlined /> Target Folder:</Text>
                    <Select
                        style={{ width: '100%', marginTop: 4 }}
                        value={selectedFolder}
                        onChange={setSelectedFolder}
                        options={folderOptions}
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        placeholder="Search and select folder..."
                        loading={loadingFolders}
                        disabled={!selectedBucket}
                        notFoundContent={loadingFolders ? "Loading folders..." : "No folders found"}
                    />
                </div>

                {/* AI Processing Options */}
                <div>
                    <Text strong>AI Processing Options:</Text>
                    <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
                        <Checkbox checked={autoLabel} onChange={e => setAutoLabel(e.target.checked)}>
                            Auto-Label (Tags)
                        </Checkbox>
                        <Checkbox checked={generateEmbedding} onChange={e => setGenerateEmbedding(e.target.checked)}>
                            Generate Embeddings
                        </Checkbox>
                    </div>
                </div>

                {/* Upload Area */}
                <Dragger
                    customRequest={customRequest}
                    fileList={fileList}
                    onChange={handleChange}
                    multiple={true}
                    showUploadList={true}
                    listType="picture"
                    disabled={!selectedBucket}
                >
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">Click or drag file to this area to upload</p>
                    <p className="ant-upload-hint">
                        Files will be uploaded to: <strong>{selectedBucket || '...'}/{selectedFolder || '(root)'}</strong>
                    </p>
                </Dragger>

                {/* Info Alert */}
                {selectedBucket && (
                    <Alert
                        message={`Target: ${selectedBucket}/${selectedFolder || '(root)'}`}
                        type="info"
                        showIcon
                    />
                )}
            </Space>
        </Modal>
    );
}
