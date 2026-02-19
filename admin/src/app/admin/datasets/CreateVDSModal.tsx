"use client";

import React, { useState } from "react";
import { Modal, Form, Input, Select, Button, message, Space, Tag } from "antd";
import { EyeOutlined, SaveOutlined } from "@ant-design/icons";
import { dremioService, CatalogItem } from "@/lib/dremioService";

interface CreateVDSModalProps {
    open: boolean;
    onClose: () => void;
    onCreated?: () => void;
    defaultSQL?: string;
    spaces?: CatalogItem[];
}

export default function CreateVDSModal({ open, onClose, onCreated, defaultSQL, spaces = [] }: CreateVDSModalProps) {
    const [form] = Form.useForm();
    const [creating, setCreating] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewCount, setPreviewCount] = useState<number | null>(null);

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            setCreating(true);

            const pathParts = values.targetPath.split(".").map((p: string) => p.trim());
            const sqlContext = values.sqlContext ? values.sqlContext.split(".").map((p: string) => p.trim()) : undefined;

            await dremioService.createVDS(pathParts, values.sql, sqlContext);
            message.success(`Virtual dataset "${values.targetPath}" created`);
            form.resetFields();
            onClose();
            onCreated?.();
        } catch (err: any) {
            if (err.errorFields) return;
            message.error("Failed to create VDS: " + err.message);
        } finally {
            setCreating(false);
        }
    };

    const handlePreview = async () => {
        try {
            const sql = form.getFieldValue("sql");
            if (!sql?.trim()) {
                message.warning("Enter a SQL query first");
                return;
            }
            setPreviewLoading(true);
            const result = await dremioService.runSQL(`${sql.trim()} LIMIT 10`);
            setPreviewCount(result.rowCount);
            message.success(`Preview: ${result.rowCount} rows returned`);
        } catch (err: any) {
            message.error("Preview failed: " + err.message);
        } finally {
            setPreviewLoading(false);
        }
    };

    return (
        <Modal
            title="Create Virtual Dataset (View)"
            open={open}
            onCancel={() => { form.resetFields(); setPreviewCount(null); onClose(); }}
            footer={
                <Space>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button icon={<EyeOutlined />} onClick={handlePreview} loading={previewLoading}>
                        Preview
                    </Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleCreate} loading={creating}
                        style={{ background: "linear-gradient(135deg, #1890ff, #096dd9)", border: "none" }}>
                        Create View
                    </Button>
                </Space>
            }
            width={600}
        >
            <Form form={form} layout="vertical" initialValues={{ sql: defaultSQL || "" }}>
                <Form.Item
                    name="targetPath"
                    label="Target Path"
                    rules={[{ required: true, message: "Path is required (e.g. MySpace.my_view)" }]}
                    help="e.g. MySpace.my_view or @admin.my_view"
                >
                    <Input placeholder="Space.view_name" />
                </Form.Item>
                <Form.Item
                    name="sql"
                    label="SQL Query"
                    rules={[{ required: true, message: "SQL is required" }]}
                >
                    <Input.TextArea
                        rows={6}
                        placeholder="SELECT * FROM source.schema.table WHERE ..."
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                    />
                </Form.Item>
                <Form.Item
                    name="sqlContext"
                    label="SQL Context (Optional)"
                    help="Default schema context, e.g. nessie"
                >
                    <Input placeholder="source.schema" />
                </Form.Item>
                {previewCount !== null && (
                    <Tag color="green" style={{ marginTop: 8 }}>
                        Preview returned {previewCount} rows
                    </Tag>
                )}
            </Form>
        </Modal>
    );
}
