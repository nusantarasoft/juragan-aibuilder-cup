"use client";

import React, { useState, useEffect } from 'react';
import { Modal, Input, Form, message, Spin } from 'antd';
import { dremioService, CatalogDetail } from '@/lib/dremioService';

interface EditVDSModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    vdsId: string | null;
}

export default function EditVDSModal({ open, onClose, onSuccess, vdsId }: EditVDSModalProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sql, setSql] = useState('');
    const [sqlContext, setSqlContext] = useState('');
    const [vdsDetail, setVdsDetail] = useState<CatalogDetail | null>(null);

    useEffect(() => {
        if (open && vdsId) {
            loadVDS();
        }
    }, [open, vdsId]);

    const loadVDS = async () => {
        if (!vdsId) return;
        setLoading(true);
        try {
            const detail = await dremioService.getCatalogById(vdsId);
            setVdsDetail(detail);
            setSql(detail.sql || '');
            setSqlContext(detail.sqlContext?.join('.') || '');
        } catch (err: any) {
            message.error('Failed to load VDS: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!vdsId || !vdsDetail?.tag || !sql.trim()) return;
        setSaving(true);
        try {
            const ctx = sqlContext.trim() ? sqlContext.split('.').map(s => s.trim()) : undefined;
            await dremioService.updateVDS(vdsId, vdsDetail.tag, sql, ctx);
            message.success('VDS updated successfully');
            onClose();
            onSuccess?.();
        } catch (err: any) {
            message.error('Failed to update VDS: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setSql('');
        setSqlContext('');
        setVdsDetail(null);
        onClose();
    };

    const vdsName = vdsDetail?.path?.[vdsDetail.path.length - 1] || 'Virtual Dataset';

    return (
        <Modal
            title={`Edit VDS — ${vdsName}`}
            open={open}
            onCancel={handleClose}
            onOk={handleSave}
            okText="Save Changes"
            confirmLoading={saving}
            width={700}
            destroyOnClose
        >
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin size="large" />
                </div>
            ) : (
                <Form layout="vertical">
                    <Form.Item label="Path">
                        <Input
                            value={vdsDetail?.path?.join(' → ') || ''}
                            disabled
                            style={{ fontFamily: 'monospace', fontSize: 13 }}
                        />
                    </Form.Item>
                    <Form.Item label="SQL Context" extra="Dot-separated schema context (e.g. myspace.subfolder)">
                        <Input
                            value={sqlContext}
                            onChange={(e) => setSqlContext(e.target.value)}
                            placeholder="Optional: myspace.subfolder"
                            style={{ fontFamily: 'monospace', fontSize: 13 }}
                        />
                    </Form.Item>
                    <Form.Item label="SQL Definition" required>
                        <Input.TextArea
                            value={sql}
                            onChange={(e) => setSql(e.target.value)}
                            rows={10}
                            placeholder="SELECT * FROM ..."
                            style={{
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                fontSize: 13,
                                lineHeight: 1.6,
                                background: '#1e1e2e',
                                color: '#cdd6f4',
                                border: '1px solid #45475a',
                                borderRadius: 8,
                            }}
                        />
                    </Form.Item>
                </Form>
            )}
        </Modal>
    );
}
