"use client";

import React, { useState, useEffect } from "react";
import { Card, List, Button, Modal, Form, Input, Select, Space, message, Tag, Popconfirm, Empty, Spin, Descriptions, Typography, Badge } from "antd";
import {
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    CloudServerOutlined,
    DatabaseOutlined,
    ReloadOutlined,
    InfoCircleOutlined,
    GlobalOutlined,
    HddOutlined,
    AmazonOutlined,
    ConsoleSqlOutlined,
} from "@ant-design/icons";
import { dremioService, DremioSource } from "@/lib/dremioService";
import { motion } from "framer-motion";
import EditSourceModal from "./EditSourceModal";

const { Title, Text } = Typography;

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

const getSourceIcon = (type: string) => {
    switch (type) {
        case 'S3': return <AmazonOutlined style={{ fontSize: 28, color: '#f90' }} />;
        case 'POSTGRES':
        case 'MYSQL':
        case 'MSSQL': return <ConsoleSqlOutlined style={{ fontSize: 28, color: '#1890ff' }} />;
        case 'NAS': return <HddOutlined style={{ fontSize: 28, color: '#52c41a' }} />;
        case 'NESSIE': return <GlobalOutlined style={{ fontSize: 28, color: '#722ed1' }} />;
        default: return <CloudServerOutlined style={{ fontSize: 28, color: '#8c8c8c' }} />;
    }
};

export default function SourceManager() {
    const [sources, setSources] = useState<DremioSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [detailSource, setDetailSource] = useState<DremioSource | null>(null);
    const [editSourceId, setEditSourceId] = useState<string | null>(null);
    const [editSourceTag, setEditSourceTag] = useState("");
    const [creating, setCreating] = useState(false);
    const [form] = Form.useForm();
    const [sourceType, setSourceType] = useState("");

    const loadSources = async () => {
        setLoading(true);
        try {
            const list = await dremioService.getSources();
            setSources(list);
        } catch (err: any) {
            message.error("Failed to load sources: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadSources(); }, []);

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
            setAddModalVisible(false);
            form.resetFields();
            loadSources();
        } catch (err: any) {
            if (err.errorFields) return; // Form validation
            message.error("Failed to create source: " + err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (source: DremioSource) => {
        try {
            await dremioService.deleteSource(source.id, source.tag);
            message.success(`Source "${source.name}" deleted`);
            loadSources();
        } catch (err: any) {
            message.error("Failed to delete source: " + err.message);
        }
    };

    const handleDetail = async (source: DremioSource) => {
        try {
            const detail = await dremioService.getSourceDetail(source.id);
            setDetailSource(detail);
        } catch (err: any) {
            message.error("Failed to load source detail: " + err.message);
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
        <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Space direction="vertical" size={2}>
                    <Title level={4} style={{ margin: 0 }}>Data Sources</Title>
                    <Text type="secondary">Manage connections to external databases and file systems</Text>
                </Space>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={loadSources}>Refresh</Button>
                    <Button icon={<PlusOutlined />} type="primary" onClick={() => setAddModalVisible(true)}
                        style={{
                            background: "linear-gradient(135deg, var(--theme-color, #7c3aed), var(--theme-secondary, #6366f1))",
                            border: "none",
                            boxShadow: "0 4px 10px rgba(124, 58, 237, 0.3)"
                        }}>
                        Add Source
                    </Button>
                </Space>
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>
            ) : sources.length === 0 ? (
                <Empty
                    description="No sources configured. Add one to get started."
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                    <Button type="primary" onClick={() => setAddModalVisible(true)}>Connect Source</Button>
                </Empty>
            ) : (
                <List
                    grid={{ gutter: 24, xs: 1, sm: 1, md: 2, lg: 3, xl: 4 }}
                    dataSource={sources}
                    renderItem={(source) => (
                        <List.Item>
                            <motion.div whileHover={{ y: -4 }}>
                                <Card
                                    hoverable
                                    bordered={false}
                                    style={{
                                        borderRadius: 12,
                                        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                                        overflow: 'hidden'
                                    }}
                                    actions={[
                                        <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => { setEditSourceId(source.id); setEditSourceTag(source.tag); }}>Edit</Button>,
                                        <Button key="info" type="text" icon={<InfoCircleOutlined />} onClick={() => handleDetail(source)}>Details</Button>,
                                        <Popconfirm key="del" title={`Delete "${source.name}"?`} onConfirm={() => handleDelete(source)} okText="Delete" okType="danger">
                                            <Button type="text" danger icon={<DeleteOutlined />}>Delete</Button>
                                        </Popconfirm>,
                                    ]}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 0' }}>
                                        <div style={{
                                            width: 64, height: 64,
                                            borderRadius: '50%',
                                            background: '#f9fafb',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginBottom: 16,
                                            border: '1px solid #f3f4f6'
                                        }}>
                                            {getSourceIcon(source.type)}
                                        </div>
                                        <Title level={5} style={{ margin: 0, marginBottom: 4 }}>{source.name}</Title>
                                        <Tag color="geekblue" style={{ borderRadius: 10, padding: '0 10px' }}>{source.type}</Tag>

                                        {/* Datasets count removed due to type mismatch */}
                                    </div>
                                </Card>
                            </motion.div>
                        </List.Item>
                    )}
                />
            )}

            {/* Add Source Modal */}
            <Modal
                title="Add Data Source"
                open={addModalVisible}
                onCancel={() => { setAddModalVisible(false); form.resetFields(); setSourceType(""); }}
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

            <EditSourceModal
                open={!!editSourceId}
                onClose={() => { setEditSourceId(null); setEditSourceTag(""); }}
                onSuccess={loadSources}
                sourceId={editSourceId}
                sourceTag={editSourceTag}
            />

            {/* Source Detail Modal */}
            <Modal
                title={`Source: ${detailSource?.name || ""}`}
                open={!!detailSource}
                onCancel={() => setDetailSource(null)}
                footer={null}
                width={600}
            >
                {detailSource && (
                    <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label="ID">{detailSource.id}</Descriptions.Item>
                        <Descriptions.Item label="Name">{detailSource.name}</Descriptions.Item>
                        <Descriptions.Item label="Type"><Tag color="blue">{detailSource.type}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Tag">{detailSource.tag}</Descriptions.Item>
                        {detailSource.config && (
                            <Descriptions.Item label="Configuration">
                                <pre style={{ fontSize: 11, maxHeight: 300, overflow: "auto", margin: 0, padding: 10, background: '#f5f5f5', borderRadius: 4 }}>
                                    {JSON.stringify(detailSource.config, null, 2)}
                                </pre>
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
}
