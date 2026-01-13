import React, { useState } from 'react';
import { Modal, Upload, Checkbox, message, Alert, Typography } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { UploadChangeParam } from 'antd/es/upload';
import { UploadFile } from 'antd/es/upload/interface';
import { mediaService } from '@/lib/mediaService';

const { Dragger } = Upload;
const { Text } = Typography;

interface UploadModalProps {
    visible: boolean;
    onClose: () => void;
    onUploadSuccess: () => void;
    currentFolder: string;
    bucket?: string; // Add bucket prop
}

export default function UploadModal({ visible, onClose, onUploadSuccess, currentFolder, bucket }: UploadModalProps) {
    const [autoLabel, setAutoLabel] = useState(false);
    const [generateEmbedding, setGenerateEmbedding] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [uploading, setUploading] = useState(false);

    // Custom upload implementation to bypass default action
    const customRequest = async (options: any) => {
        const { file, onSuccess, onError } = options;

        try {
            // Check duplicate first
            const exists = await mediaService.checkDuplicateMedia(file.name, currentFolder);
            if (exists) {
                const proceed = confirm(`File "${file.name}" already exists. Do you want to try uploading as a new version?`);
                if (!proceed) {
                    onError(new Error('Duplicate details'));
                    return;
                }
            }

            // Perform upload
            const result = await mediaService.uploadMedia(file, {
                folder: currentFolder,
                bucket: bucket, // Pass bucket
                autoLabel,
                generateEmbedding
            });

            if (result.success) {
                message.success(`${file.name} uploaded successfully.`);
                onSuccess(result.media);
            } else {
                onError(new Error(result.error));
            }
        } catch (error) {
            onError(error);
        }
    };

    const handleChange = (info: UploadChangeParam) => {
        let newFileList = [...info.fileList];
        setFileList(newFileList);

        // Filter valid uploads to determine when complete
        // If all are done/error, we stop loading state if we were tracking it globally
        // But AntD Upload handles mostly file-local state
    };

    const handleOk = () => {
        onClose();
        onUploadSuccess();
        setFileList([]);
    };

    return (
        <Modal
            title="Upload Media"
            open={visible}
            onCancel={onClose}
            onOk={handleOk}
            width={600}
            okText="Done"
        >
            <div style={{ marginBottom: 16 }}>
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

            <Dragger
                customRequest={customRequest}
                fileList={fileList}
                onChange={handleChange}
                multiple={true}
                showUploadList={true}
                listType="picture"
            >
                <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                </p>
                <p className="ant-upload-text">Click or drag file to this area to upload</p>
                <p className="ant-upload-hint">
                    Support for single or bulk upload. Strictly prohibited from uploading company data or other
                    banned files.
                </p>
            </Dragger>

            <div style={{ marginTop: 16 }}>
                <Alert message="Files will be uploaded to the current folder." type="info" showIcon />
            </div>
        </Modal>
    );
}
