"use client";

import React, { useState, useEffect } from 'react';
import { Modal, Input, Form, message } from 'antd';
import { dremioService } from '@/lib/dremioService';

interface RenameSpaceModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    spaceId: string | null;
    spaceTag: string;
    currentName: string;
}

export default function RenameSpaceModal({ open, onClose, onSuccess, spaceId, spaceTag, currentName }: RenameSpaceModalProps) {
    const [newName, setNewName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) setNewName(currentName);
    }, [open, currentName]);

    const handleRename = async () => {
        if (!spaceId || !newName.trim() || newName.trim() === currentName) return;
        setSaving(true);
        try {
            await dremioService.renameSpace(spaceId, spaceTag, newName.trim());
            message.success(`Space renamed to "${newName.trim()}"`);
            onClose();
            onSuccess?.();
        } catch (err: any) {
            message.error('Failed to rename space: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Rename Space"
            open={open}
            onCancel={onClose}
            onOk={handleRename}
            okText="Rename"
            confirmLoading={saving}
            destroyOnClose
        >
            <Form layout="vertical">
                <Form.Item label="Current Name">
                    <Input value={currentName} disabled />
                </Form.Item>
                <Form.Item label="New Name" required>
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter new space name"
                        autoFocus
                        onPressEnter={handleRename}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}
