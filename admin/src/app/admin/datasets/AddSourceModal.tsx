import React, { useState } from "react";
import { Modal, Form, Input, Select, message } from "antd";
import { dremioService } from "@/lib/dremioService";

interface AddSourceModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

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

export default function AddSourceModal({ open, onClose, onSuccess }: AddSourceModalProps) {
    const [form] = Form.useForm();
    const [creating, setCreating] = useState(false);
    const [sourceType, setSourceType] = useState("");

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            setCreating(true);

            const config: Record<string, any> = {};
            const type = values.sourceType;

            // Build config based on source type
            if (type === "S3") {
                config.accessKey = values.accessKey || "";
                config.accessSecret = values.accessSecret || "";
                config.secure = false;
                config.externalBucketList = values.buckets ? values.buckets.split(",").map((b: string) => b.trim()) : [];
                config.propertyList = values.endpoint ? [
                    { name: "fs.s3a.endpoint", value: values.endpoint },
                    { name: "fs.s3a.path.style.access", value: "true" },
                ] : [];
            } else if (type === "POSTGRES" || type === "MYSQL" || type === "MSSQL") {
                config.hostname = values.hostname || "";
                config.port = values.port || (type === "POSTGRES" ? "5432" : type === "MYSQL" ? "3306" : "1433");
                config.databaseName = values.databaseName || "";
                config.username = values.dbUsername || "";
                config.password = values.dbPassword || "";
            } else if (type === "NESSIE") {
                config.nessieEndpoint = values.nessieEndpoint || "";
                config.nessieAuthType = "NONE";
                if (values.warehouseLocation) {
                    config.awsRootPath = values.warehouseLocation;
                }
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
                // Generic — pass raw JSON config
                try {
                    Object.assign(config, JSON.parse(values.rawConfig || "{}"));
                } catch { /* ignore parse error */ }
            }

            await dremioService.createSource(values.sourceName, type, config);
            message.success(`Source "${values.sourceName}" created`);
            onSuccess();
            onClose();
            form.resetFields();
            setSourceType("");
        } catch (err: any) {
            if (err.errorFields) return; // Form validation
            message.error("Failed to create source: " + err.message);
        } finally {
            setCreating(false);
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
                        <Form.Item name="dbPassword" label="Password"><Input.Password /></Form.Item>
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
            title="Add Data Source"
            open={open}
            onCancel={() => { onClose(); form.resetFields(); setSourceType(""); }}
            onOk={handleCreate}
            confirmLoading={creating}
            width={520}
            okText="Create Source"
        >
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
        </Modal>
    );
}
