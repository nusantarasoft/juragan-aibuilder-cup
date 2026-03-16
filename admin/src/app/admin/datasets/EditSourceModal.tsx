"use client";

import React, { useState, useEffect } from "react";
import { Modal, Form, Input, Select, message, Spin } from "antd";
import { dremioService, DremioSource } from "@/lib/dremioService";

const SOURCE_TYPES = [
    { value: "NAS", label: "NAS (File System)" },
    { value: "S3", label: "Amazon S3 / MinIO" },
    { value: "POSTGRES", label: "PostgreSQL" },
    { value: "MYSQL", label: "MySQL" },
    { value: "MSSQL", label: "SQL Server" },
    { value: "ORACLE", label: "Oracle" },
    { value: "MONGO", label: "MongoDB" },
    { value: "ELASTICSEARCH", label: "Elasticsearch" },
    { value: "HIVE", label: "Hive" },
    { value: "NESSIE", label: "Nessie (Iceberg)" },
];

function configToFormValues(detail: DremioSource): Record<string, any> {
    const c = detail.config || {};
    const base: Record<string, any> = {
        sourceName: detail.name,
        sourceType: detail.type || "",
    };
    const type = (detail.type || "").toUpperCase();

    if (type === "S3") {
        base.accessKey = c.accessKey ?? "";
        base.accessSecret = c.accessSecret ?? "";
        base.buckets = Array.isArray(c.externalBucketList) ? c.externalBucketList.join(", ") : "";
        const pl = c.propertyList || [];
        const endpoint = pl.find((p: any) => p?.name === "fs.s3a.endpoint");
        base.endpoint = endpoint?.value ?? "";
    } else if (["POSTGRES", "MYSQL", "MSSQL"].includes(type)) {
        base.hostname = c.hostname ?? "";
        base.port = c.port ?? "";
        base.databaseName = c.databaseName ?? "";
        base.dbUsername = c.username ?? "";
        base.dbPassword = ""; // Often not returned; leave blank to keep
    } else if (type === "NESSIE") {
        base.nessieEndpoint = c.nessieEndpoint ?? "";
        base.warehouseLocation = c.awsRootPath ?? "";
        base.s3AccessKey = c.awsAccessKey ?? "";
        base.s3SecretKey = c.awsAccessSecret ?? "";
        const pl = c.propertyList || [];
        const ep = pl.find((p: any) => p?.name === "fs.s3a.endpoint");
        base.s3Endpoint = ep?.value ?? "";
    } else {
        base.rawConfig = c && Object.keys(c).length ? JSON.stringify(c, null, 2) : "{}";
    }
    return base;
}

interface EditSourceModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    sourceId: string | null;
    sourceTag?: string; // If not provided, will use tag from loaded detail
}

export default function EditSourceModal({ open, onClose, onSuccess, sourceId, sourceTag = "" }: EditSourceModalProps) {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sourceType, setSourceType] = useState("");
    const [loadedTag, setLoadedTag] = useState("");

    useEffect(() => {
        if (!open || !sourceId) return;
        setLoading(true);
        setSourceType("");
        setLoadedTag("");
        dremioService
            .getSourceDetail(sourceId)
            .then((detail) => {
                setLoadedTag(detail.tag || "");
                const values = configToFormValues(detail);
                form.setFieldsValue(values);
                setSourceType(values.sourceType || "");
            })
            .catch((err: any) => {
                message.error("Failed to load source: " + err.message);
                onClose();
            })
            .finally(() => setLoading(false));
    }, [open, sourceId, form, onClose]);

    const handleSave = async () => {
        if (!sourceId) return;
        try {
            const values = await form.validateFields();
            setSaving(true);

            const config: Record<string, any> = {};
            const type = values.sourceType;

            if (type === "S3") {
                config.accessKey = values.accessKey || "";
                config.accessSecret = values.accessSecret || "";
                config.secure = false;
                config.externalBucketList = values.buckets ? values.buckets.split(",").map((b: string) => b.trim()) : [];
                config.propertyList = values.endpoint
                    ? [
                        { name: "fs.s3a.endpoint", value: values.endpoint },
                        { name: "fs.s3a.path.style.access", value: "true" },
                    ]
                    : [];
            } else if (type === "POSTGRES" || type === "MYSQL" || type === "MSSQL") {
                config.hostname = values.hostname || "";
                config.port = values.port || (type === "POSTGRES" ? "5432" : type === "MYSQL" ? "3306" : "1433");
                config.databaseName = values.databaseName || "";
                config.username = values.dbUsername || "";
                if (values.dbPassword) config.password = values.dbPassword;
            } else if (type === "NESSIE") {
                config.nessieEndpoint = values.nessieEndpoint || "";
                config.nessieAuthType = "NONE";
                if (values.warehouseLocation) config.awsRootPath = values.warehouseLocation;
                config.propertyList = [];
                if (values.s3Endpoint) {
                    config.propertyList.push(
                        { name: "fs.s3a.endpoint", value: values.s3Endpoint },
                        { name: "fs.s3a.path.style.access", value: "true" },
                        { name: "dremio.s3.compat", value: "true" },
                    );
                }
                if (values.s3AccessKey) {
                    config.awsAccessKey = values.s3AccessKey;
                    config.awsAccessSecret = values.s3SecretKey || "";
                }
            } else {
                try {
                    Object.assign(config, JSON.parse(values.rawConfig || "{}"));
                } catch {
                    /* ignore */
                }
            }

            const tag = sourceTag || loadedTag;
            if (!tag) throw new Error("Source tag is required for update");
            await dremioService.updateSource(sourceId, tag, {
                name: values.sourceName,
                type: values.sourceType,
                config,
            });
            message.success(`Source "${values.sourceName}" updated`);
            onSuccess();
            onClose();
            form.resetFields();
            setSourceType("");
        } catch (err: any) {
            if (err.errorFields) return;
            message.error("Failed to update source: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const renderConfigFields = () => {
        switch (sourceType) {
            case "S3":
                return (
                    <>
                        <Form.Item name="accessKey" label="Access Key"><Input /></Form.Item>
                        <Form.Item name="accessSecret" label="Secret Key"><Input.Password /></Form.Item>
                        <Form.Item name="endpoint" label="Endpoint (e.g. minio:9000)"><Input placeholder="minio:9000" /></Form.Item>
                        <Form.Item name="buckets" label="Buckets (comma-separated)"><Input placeholder="bucket1, bucket2" /></Form.Item>
                    </>
                );
            case "POSTGRES":
            case "MYSQL":
            case "MSSQL":
                return (
                    <>
                        <Form.Item name="hostname" label="Hostname" rules={[{ required: true }]}><Input /></Form.Item>
                        <Form.Item name="port" label="Port"><Input placeholder={sourceType === "POSTGRES" ? "5432" : sourceType === "MYSQL" ? "3306" : "1433"} /></Form.Item>
                        <Form.Item name="databaseName" label="Database" rules={[{ required: true }]}><Input /></Form.Item>
                        <Form.Item name="dbUsername" label="Username"><Input /></Form.Item>
                        <Form.Item name="dbPassword" label="Password"><Input.Password placeholder="Leave blank to keep current" /></Form.Item>
                    </>
                );
            case "NESSIE":
                return (
                    <>
                        <Form.Item name="nessieEndpoint" label="Nessie API Endpoint" rules={[{ required: true }]}><Input placeholder="http://nessie:19120/api/v2" /></Form.Item>
                        <Form.Item name="warehouseLocation" label="Warehouse Location"><Input placeholder="s3://bucket/warehouse" /></Form.Item>
                        <Form.Item name="s3Endpoint" label="S3 Endpoint"><Input placeholder="minio:9000" /></Form.Item>
                        <Form.Item name="s3AccessKey" label="S3 Access Key"><Input /></Form.Item>
                        <Form.Item name="s3SecretKey" label="S3 Secret Key"><Input.Password /></Form.Item>
                    </>
                );
            default:
                return (
                    <Form.Item name="rawConfig" label="Configuration (JSON)">
                        <Input.TextArea rows={6} placeholder='{"key": "value"}' style={{ fontFamily: "monospace" }} />
                    </Form.Item>
                );
        }
    };

    return (
        <Modal
            title="Edit Data Source"
            open={open}
            onCancel={() => { onClose(); form.resetFields(); setSourceType(""); }}
            onOk={handleSave}
            confirmLoading={saving}
            width={520}
            okText="Save"
            destroyOnClose
        >
            {loading ? (
                <div style={{ textAlign: "center", padding: 32 }}><Spin size="large" /></div>
            ) : (
                <Form form={form} layout="vertical">
                    <Form.Item name="sourceName" label="Source Name" rules={[{ required: true, message: "Name is required" }]}>
                        <Input placeholder="my-source" />
                    </Form.Item>
                    <Form.Item name="sourceType" label="Source Type" rules={[{ required: true }]}>
                        <Select
                            placeholder="Select type"
                            options={SOURCE_TYPES}
                            onChange={(val) => setSourceType(val)}
                        />
                    </Form.Item>
                    {sourceType && renderConfigFields()}
                </Form>
            )}
        </Modal>
    );
}
