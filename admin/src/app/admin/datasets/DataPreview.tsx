"use client";

import React, { useState, useEffect } from "react";
import { Table, Spin, Empty, Tag, Button, Space, message, Tooltip, Statistic, Row, Col, Card } from "antd";
import {
    DownloadOutlined,
    FileExcelOutlined,
    ReloadOutlined,
    TableOutlined,
    ColumnWidthOutlined,
} from "@ant-design/icons";
import { dremioService, QueryResult, QueryColumn } from "@/lib/dremioService";

interface DataPreviewProps {
    path: string[];
    limit?: number;
}

export default function DataPreview({ path, limit = 100 }: DataPreviewProps) {
    const [result, setResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(false);

    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const [tableScrollHeight, setTableScrollHeight] = useState<number>(400);

    React.useEffect(() => {
        if (!tableContainerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                // The container includes table header (~40px) and pagination (~50px).
                // Subtracting 100 ensures the table body doesn't push pagination out of the flex container.
                const newHeight = entry.contentRect.height - 100;
                setTableScrollHeight(Math.max(newHeight, 150));
            }
        });

        observer.observe(tableContainerRef.current);
        return () => observer.disconnect();
    }, [result]); // Re-bind observer when result renders the table into DOM

    const loadPreview = async () => {
        if (!path.length) return;
        setLoading(true);
        try {
            const res = await dremioService.getDatasetPreview(path, limit);
            setResult(res);
        } catch (err: any) {
            message.error("Failed to preview: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadPreview(); }, [path.join("."), limit]);

    const handleExportCsv = async () => {
        const sql = `SELECT * FROM ${path.map(p => `"${p}"`).join(".")}`;
        try {
            const csv = await dremioService.exportCsv(sql);
            dremioService.downloadCsv(csv, `${path[path.length - 1]}.csv`);
            message.success("CSV downloaded");
        } catch (err: any) {
            message.error("Export failed: " + err.message);
        }
    };

    const handleExportExcel = async () => {
        if (!result) return;
        try {
            await dremioService.downloadExcel(result, `${path[path.length - 1]}.xlsx`);
            message.success("Excel downloaded");
        } catch (err: any) {
            message.error("Export failed: " + err.message);
        }
    };

    const buildColumns = (cols: QueryColumn[]) =>
        cols.map((col) => ({
            title: (
                <Tooltip title={`Type: ${col.type}`}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <ColumnWidthOutlined style={{ fontSize: 10, color: "#8c8c8c" }} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{col.name}</span>
                        <Tag style={{ fontSize: 9, lineHeight: "14px", marginLeft: 4, padding: "0 4px", border: "none" }} color="default">
                            {col.type}
                        </Tag>
                    </div>
                </Tooltip>
            ),
            dataIndex: col.name,
            key: col.name,
            ellipsis: true,
            width: Math.max(120, col.name.length * 10),
            render: (val: any) => {
                if (val === null || val === undefined) return <span style={{ color: "#bfbfbf", fontStyle: "italic" }}>NULL</span>;
                if (typeof val === "boolean") return <Tag color={val ? "green" : "red"}>{String(val)}</Tag>;
                if (typeof val === "object") return <Tag color="geekblue">{JSON.stringify(val)}</Tag>;
                return <span style={{ fontSize: 13, fontFamily: "'Inter', sans-serif" }}>{String(val)}</span>;
            },
        }));

    if (loading) return <div style={{ textAlign: "center", padding: 60 }}><Spin tip="Loading preview..." size="large" /></div>;

    // Wrapped in Card even for empty state
    if (!result) return (
        <Card
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0,0,0,0.06)'
            }}
        >
            <Empty description="Select a dataset to view data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
    );

    return (
        <Card
            size="small"
            styles={{
                body: { padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
                header: { minHeight: 48, padding: '0 16px' }
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
                <Space size={16}>
                    <Space size={4}>
                        <TableOutlined style={{ color: '#7c3aed' }} />
                        <span style={{ fontWeight: 600 }}>{path[path.length - 1]}</span>
                    </Space>
                    <Space size={12} split={<span style={{ color: '#e5e7eb' }}>|</span>}>
                        <Statistic
                            title={null}
                            value={result.rowCount}
                            prefix={<span style={{ fontSize: 12, color: '#6b7280' }}>Rows:</span>}
                            valueStyle={{ fontSize: 14, fontWeight: 500 }}
                        />
                        <Statistic
                            title={null}
                            value={result.columns.length}
                            prefix={<span style={{ fontSize: 12, color: '#6b7280' }}>Cols:</span>}
                            valueStyle={{ fontSize: 14, fontWeight: 500 }}
                        />
                    </Space>
                </Space>
            }
            extra={
                <Space>
                    <Button type="text" size="small" icon={<ReloadOutlined />} onClick={loadPreview}>Refresh</Button>
                    <Button size="small" icon={<DownloadOutlined />} onClick={handleExportCsv}>CSV</Button>
                    <Button size="small" icon={<FileExcelOutlined />} onClick={handleExportExcel}>Excel</Button>
                </Space>
            }
        >
            <div ref={tableContainerRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .data-preview-table .ant-table-thead > tr > th {
                        border-radius: 0 !important;
                    }
                `}} />
                <Table
                    className="data-preview-table"
                    columns={buildColumns(result.columns)}
                    dataSource={result.rows.map((r, i) => ({ ...r, _key: i }))}
                    rowKey="_key"
                    size="small"
                    scroll={{ x: "max-content", y: tableScrollHeight }}
                    pagination={{
                        pageSize: 50,
                        showSizeChanger: true,
                        pageSizeOptions: ["25", "50", "100"],
                        showTotal: (total) => `${total} rows`,
                        size: "small",
                    }}
                    bordered
                />
            </div>
        </Card>
    );
}
