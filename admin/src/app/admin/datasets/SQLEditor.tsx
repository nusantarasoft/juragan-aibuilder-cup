"use client";

import React, { useState } from "react";
import { Input, Button, Space, Table, message, Spin, Tag, Tooltip, Card, Typography } from "antd";
import {
    PlayCircleOutlined,
    ClearOutlined,
    DownloadOutlined,
    FileExcelOutlined,
    CopyOutlined,
    CheckOutlined,
    CodeOutlined,
    SaveOutlined,
} from "@ant-design/icons";
import { dremioService, QueryResult, QueryColumn } from "@/lib/dremioService";
import { motion } from "framer-motion";

const { Text } = Typography;

interface SQLEditorProps {
    defaultSQL?: string;
    context?: string[];
}

export default function SQLEditor({ defaultSQL, context }: SQLEditorProps) {
    const [sql, setSQL] = useState(defaultSQL || "");
    const [result, setResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [copiedSQL, setCopiedSQL] = useState(false);

    const runQuery = async () => {
        if (!sql.trim()) {
            message.warning("Enter a SQL query");
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const res = await dremioService.runSQL(sql.trim(), context);
            setResult(res);
            message.success(`Query completed: ${res.rowCount} rows`);
        } catch (err: any) {
            message.error("Query failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCsv = async () => {
        if (!sql.trim()) return;
        try {
            const csv = await dremioService.exportCsv(sql.trim());
            dremioService.downloadCsv(csv);
            message.success("CSV downloaded");
        } catch (err: any) {
            message.error("Export failed: " + err.message);
        }
    };

    const handleExportExcel = async () => {
        if (!result) return;
        try {
            await dremioService.downloadExcel(result);
            message.success("Excel downloaded");
        } catch (err: any) {
            message.error("Export failed: " + err.message);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(sql);
        setCopiedSQL(true);
        setTimeout(() => setCopiedSQL(false), 2000);
    };

    const buildColumns = (cols: QueryColumn[]) =>
        cols.map((col) => ({
            title: (
                <Tooltip title={col.type}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{col.name}</span>
                </Tooltip>
            ),
            dataIndex: col.name,
            key: col.name,
            ellipsis: true,
            width: 160,
            render: (val: any) => {
                if (val === null || val === undefined) return <span style={{ color: "#8c8c8c", fontStyle: "italic" }}>NULL</span>;
                if (typeof val === "object") return <Tag color="blue">{JSON.stringify(val)}</Tag>;
                return <span style={{ fontSize: 12 }}>{String(val)}</span>;
            },
        }));

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 16 }}>
            {/* Editor Card */}
            <Card
                size="small"
                styles={{
                    body: { padding: 0 },
                    header: { minHeight: 40, padding: '0 12px' }
                }}
                title={
                    <Space size={8}>
                        <CodeOutlined style={{ color: 'var(--theme-color, #7c3aed)' }} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Query Editor</span>
                    </Space>
                }
                extra={
                    <Space size={4}>
                        <Tooltip title="Copy SQL">
                            <Button
                                type="text"
                                size="small"
                                icon={copiedSQL ? <CheckOutlined style={{ color: "#52c41a" }} /> : <CopyOutlined />}
                                onClick={handleCopy}
                            />
                        </Tooltip>
                        <Tooltip title="Clear">
                            <Button
                                type="text"
                                size="small"
                                icon={<ClearOutlined />}
                                onClick={() => { setSQL(""); setResult(null); }}
                            />
                        </Tooltip>
                    </Space>
                }
                style={{
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.06)'
                }}
            >
                <div style={{ position: "relative" }}>
                    <Input.TextArea
                        value={sql}
                        onChange={(e) => setSQL(e.target.value)}
                        placeholder="SELECT * FROM source.schema.table LIMIT 100"
                        autoSize={{ minRows: 6, maxRows: 12 }}
                        style={{
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            fontSize: 13,
                            lineHeight: 1.6,
                            border: "none",
                            borderRadius: 0,
                            padding: 16,
                            backgroundColor: "#1e1e1e", // Dark editor background
                            color: "#d4d4d4", // Light text
                            resize: "none"
                        }}
                        onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                                e.preventDefault();
                                runQuery();
                            }
                        }}
                        className="custom-scrollbar"
                    />

                    <div style={{
                        position: 'absolute',
                        bottom: 12,
                        right: 12,
                        zIndex: 10
                    }}>
                        <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            onClick={runQuery}
                            loading={loading}
                            shape="round"
                            style={{
                                background: "linear-gradient(135deg, var(--theme-color, #7c3aed), var(--theme-secondary, #6366f1))", // Violet gradient
                                border: "none",
                                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
                                height: 32,
                                paddingLeft: 16,
                                paddingRight: 16,
                                fontSize: 13,
                                fontWeight: 500
                            }}
                        >
                            Run (Cmd+Enter)
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Results Area */}
            {result && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                >
                    <Card
                        size="small"
                        styles={{
                            body: { padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
                            header: { minHeight: 40, padding: '0 12px' }
                        }}
                        style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            borderRadius: 8,
                            border: '1px solid rgba(0,0,0,0.06)'
                        }}
                        title={
                            <Space>
                                <Tag color="success" style={{ margin: 0 }}>
                                    {result.rowCount} rows
                                </Tag>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Job: {result.jobId?.substring(0, 8)}
                                </Text>
                            </Space>
                        }
                        extra={
                            <Space size={8}>
                                <Button size="small" icon={<DownloadOutlined />} onClick={handleExportCsv}>CSV</Button>
                                <Button size="small" icon={<FileExcelOutlined />} onClick={handleExportExcel}>Excel</Button>
                            </Space>
                        }
                    >
                        <Table
                            columns={buildColumns(result.columns)}
                            dataSource={result.rows.map((r, i) => ({ ...r, _key: i }))}
                            rowKey="_key"
                            size="small"
                            scroll={{ x: "max-content", y: 400 }}
                            pagination={{
                                pageSize: 50,
                                showSizeChanger: true,
                                showTotal: (total) => `${total} rows`,
                                size: "small",
                            }}
                            bordered
                            style={{ fontSize: 12 }}
                        />
                    </Card>
                </motion.div>
            )}

            {!result && !loading && (
                <div style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: 0.5,
                    flexDirection: 'column',
                    gap: 12
                }}>
                    <CodeOutlined style={{ fontSize: 48, color: '#d1d5db' }} />
                    <Text type="secondary">Run a query to see results</Text>
                </div>
            )}

            {loading && !result && (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Spin size="large" tip="Executing query..." />
                </div>
            )}
        </div>
    );
}
