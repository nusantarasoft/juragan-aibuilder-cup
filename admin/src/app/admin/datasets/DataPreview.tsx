"use client";

import React, { useState, useEffect } from "react";
import { Table, Spin, Empty, Tag, Button, Space, message, Tooltip, Statistic, Row, Col, Card, Pagination, theme } from "antd";
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
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const [result, setResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(false);

    const tableContainerRef = React.useRef<HTMLDivElement>(null);
    const [tableScrollHeight, setTableScrollHeight] = useState<number>(400);

    React.useEffect(() => {
        if (!tableContainerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // The absolute-table flex container only holds the Table now.
                // Subtracting 40 explicitly reserves space for the Table Head row, letting the body take the rest.
                const newHeight = entry.contentRect.height - 40;
                setTableScrollHeight(Math.max(newHeight, 100)); // Minimum height ensures it never collapses completely
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

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const paginatedRows = result ? result.rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r, i) => ({ ...r, _key: ((currentPage - 1) * pageSize) + i })) : [];

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
                        <TableOutlined style={{ color: 'var(--theme-color, #7c3aed)' }} />
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
            <div ref={tableContainerRef} className="absolute-table" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <Table
                    columns={buildColumns(result.columns)}
                    dataSource={paginatedRows}
                    rowKey="_key"
                    size="small"
                    scroll={{ x: "max-content", y: tableScrollHeight }}
                    pagination={false}
                    bordered
                />
            </div>

            <div className="custom-pagination-wrapper" style={{ padding: '8px 16px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .custom-pagination-wrapper .ant-pagination-prev .ant-pagination-item-link,
                    .custom-pagination-wrapper .ant-pagination-next .ant-pagination-item-link,
                    .custom-pagination-wrapper .ant-pagination-jump-prev .ant-pagination-item-link,
                    .custom-pagination-wrapper .ant-pagination-jump-next .ant-pagination-item-link,
                    .custom-pagination-wrapper .ant-pagination-jump-prev .ant-pagination-item-container,
                    .custom-pagination-wrapper .ant-pagination-jump-next .ant-pagination-item-container,
                    .custom-pagination-wrapper .ant-pagination-prev button,
                    .custom-pagination-wrapper .ant-pagination-next button {
                        background-color: rgba(var(--theme-color-rgb, 139, 92, 246), 0.1) !important;
                        color: var(--theme-color, #7c3aed) !important;
                        border-radius: 50% !important;
                        border: none !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        min-width: 24px;
                        height: 24px;
                    }
                    .custom-pagination-wrapper .ant-pagination-prev:hover .ant-pagination-item-link,
                    .custom-pagination-wrapper .ant-pagination-next:hover .ant-pagination-item-link,
                    .custom-pagination-wrapper .ant-pagination-jump-prev:hover .ant-pagination-item-link,
                    .custom-pagination-wrapper .ant-pagination-jump-next:hover .ant-pagination-item-link,
                    .custom-pagination-wrapper .ant-pagination-jump-prev:hover .ant-pagination-item-container,
                    .custom-pagination-wrapper .ant-pagination-jump-next:hover .ant-pagination-item-container,
                    .custom-pagination-wrapper .ant-pagination-prev:hover button,
                    .custom-pagination-wrapper .ant-pagination-next:hover button {
                        background-color: rgba(var(--theme-color-rgb, 139, 92, 246), 0.2) !important;
                    }
                    .custom-pagination-wrapper .ant-pagination-disabled .ant-pagination-item-link,
                    .custom-pagination-wrapper .ant-pagination-disabled button {
                        background-color: rgba(0, 0, 0, 0.04) !important;
                        color: rgba(0, 0, 0, 0.25) !important;
                    }
                `}} />
                <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={result.rows.length}
                    size="small"
                    showSizeChanger
                    pageSizeOptions={['25', '50', '100']}
                    showTotal={(total: number) => `${total} rows`}
                    onChange={(page: number, size: number) => { setCurrentPage(page); setPageSize(size); }}
                />
            </div>
        </Card>
    );
}
