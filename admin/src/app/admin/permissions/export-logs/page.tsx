"use client";

import React, { useState, useEffect, useCallback } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Table, Button, Space, Tag, Card, Select, DatePicker,
    message, Typography, Spin, Row, Col, Statistic, Tooltip, Empty,
} from "antd";
import { motion } from "framer-motion";
import {
    ReloadOutlined, FileExcelOutlined, FilePdfOutlined, AuditOutlined,
    UserOutlined, AppstoreOutlined, CalendarOutlined, DownloadOutlined,
    ClockCircleOutlined, BarChartOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import RbacGuard from "@/components/common/RbacGuard";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isToday from "dayjs/plugin/isToday";

dayjs.extend(relativeTime);
dayjs.extend(isToday);

const { Text } = Typography;
const { RangePicker } = DatePicker;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface ExportLog {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    exportType: string;
    module: string;
    fileName: string;
    recordCount: number;
    dateRangeStart: string;
    dateRangeEnd: string;
    userAgent: string;
    createdAt: string;
}

interface ExportLogResult {
    logs: ExportLog[];
    total: number;
}

const MODULE_COLORS: Record<string, string> = {
    itsm: '#ef4444', crm: '#3b82f6', hr: '#8b5cf6', pm: '#f59e0b',
    inventory: '#10b981', ecommerce: '#ec4899', accounting: '#6366f1',
    ops: '#0891b2', commerce: '#d946ef', notifications: '#f97316',
};

function getModuleColor(module: string): string {
    const prefix = (module.split('.')[0] || module.split('_')[0])?.toLowerCase();
    return MODULE_COLORS[prefix] || '#64748b';
}

export default function ExportLogsPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [logs, setLogs] = useState<ExportLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(25);

    // Filters
    const [filterModule, setFilterModule] = useState<string | undefined>();
    const [filterType, setFilterType] = useState<string | undefined>();
    const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const offset = (page - 1) * pageSize;
            const data = await gql<{ dataExportLogs: ExportLogResult }>(`
                query($tenantId: String!, $limit: Float, $offset: Float) {
                    dataExportLogs(tenantId: $tenantId, limit: $limit, offset: $offset) {
                        logs {
                            id userId userEmail userName exportType module
                            fileName recordCount dateRangeStart dateRangeEnd
                            userAgent createdAt
                        }
                        total
                    }
                }
            `, { tenantId: DEFAULT_TENANT_ID, limit: 200, offset: 0 });
            const all = data.dataExportLogs?.logs || [];
            setTotal(data.dataExportLogs?.total || 0);

            // Client-side filtering (server returns all for stats)
            let filtered = all;
            if (filterModule) filtered = filtered.filter(l => l.module?.includes(filterModule));
            if (filterType) filtered = filtered.filter(l => l.exportType === filterType);
            if (filterDateRange) {
                const [start, end] = filterDateRange;
                filtered = filtered.filter(l => {
                    const d = dayjs(l.createdAt);
                    return d.isAfter(start.startOf('day')) && d.isBefore(end.endOf('day'));
                });
            }

            setLogs(filtered);
        } catch (err: any) {
            message.error("Failed to load export logs: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, filterModule, filterType, filterDateRange]);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    // Stats
    const todayCount = logs.filter(l => dayjs(l.createdAt).isToday()).length;
    const uniqueUsers = new Set(logs.map(l => l.userEmail)).size;
    const pdfCount = logs.filter(l => l.exportType === 'pdf').length;
    const excelCount = logs.filter(l => l.exportType === 'excel').length;
    const totalRecords = logs.reduce((sum, l) => sum + (l.recordCount || 0), 0);

    // Top module
    const moduleCounts: Record<string, number> = {};
    logs.forEach(l => { moduleCounts[l.module] = (moduleCounts[l.module] || 0) + 1; });
    const topModule = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1])[0];

    // Unique modules for filter
    const allModules = [...new Set(logs.map(l => l.module))].sort();

    const columns: ColumnsType<ExportLog> = [
        {
            title: "Time",
            key: "createdAt",
            width: 160,
            sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
            defaultSortOrder: 'descend',
            render: (_, r) => (
                <Tooltip title={dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss')}>
                    <Space size={4}>
                        <ClockCircleOutlined style={{ color: '#94a3b8' }} />
                        <Text style={{ fontSize: 12 }}>{dayjs(r.createdAt).fromNow()}</Text>
                    </Space>
                </Tooltip>
            ),
        },
        {
            title: "User",
            key: "user",
            width: 200,
            render: (_, r) => (
                <Space size={4}>
                    <UserOutlined style={{ color: '#3b82f6' }} />
                    <div>
                        <Text strong style={{ fontSize: 13 }}>{r.userName || 'Unknown'}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>{r.userEmail}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: "Type",
            key: "exportType",
            width: 90,
            align: 'center',
            filters: [{ text: 'PDF', value: 'pdf' }, { text: 'Excel', value: 'excel' }],
            onFilter: (val, r) => r.exportType === val,
            render: (_, r) => (
                r.exportType === 'pdf'
                    ? <Tag icon={<FilePdfOutlined />} color="red">PDF</Tag>
                    : <Tag icon={<FileExcelOutlined />} color="green">Excel</Tag>
            ),
        },
        {
            title: "Module",
            key: "module",
            width: 180,
            render: (_, r) => (
                <Tag color={getModuleColor(r.module)} style={{ textTransform: 'capitalize' }}>
                    {r.module?.replace(/[._]/g, ' ')}
                </Tag>
            ),
        },
        {
            title: "Records",
            dataIndex: "recordCount",
            key: "recordCount",
            width: 90,
            align: 'right',
            sorter: (a, b) => a.recordCount - b.recordCount,
            render: (v) => <Text strong>{(v || 0).toLocaleString()}</Text>,
        },
        {
            title: "File",
            dataIndex: "fileName",
            key: "fileName",
            ellipsis: true,
            render: (v) => (
                <Tooltip title={v}>
                    <Text code style={{ fontSize: 11 }}>{v}</Text>
                </Tooltip>
            ),
        },
    ];

    const stats = [
        { title: 'Total Exports', value: total, icon: <DownloadOutlined />, color: '#3b82f6' },
        { title: 'Today', value: todayCount, icon: <CalendarOutlined />, color: '#10b981' },
        { title: 'PDF Exports', value: pdfCount, icon: <FilePdfOutlined />, color: '#ef4444' },
        { title: 'Excel Exports', value: excelCount, icon: <FileExcelOutlined />, color: '#22c55e' },
        { title: 'Unique Users', value: uniqueUsers, icon: <UserOutlined />, color: '#8b5cf6' },
        { title: 'Records Exported', value: totalRecords, icon: <BarChartOutlined />, color: '#f59e0b' },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Export Audit Log</AuroraText>}
            subTitle={<DecryptedText text="Compliance audit trail — track all data exports across modules" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <RbacGuard key="exports" requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'export_audit_log', title: 'Export Audit Log', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'User', key: 'userName' }, { header: 'Email', key: 'userEmail' }, { header: 'Type', key: 'exportType' }, { header: 'Module', key: 'module' }, { header: 'File', key: 'fileName' }, { header: 'Records', key: 'recordCount' }, { header: 'Date', key: 'createdAt' }], data: logs })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'export_audit_log', title: 'Export Audit Log', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'User', key: 'userName' }, { header: 'Email', key: 'userEmail' }, { header: 'Type', key: 'exportType' }, { header: 'Module', key: 'module' }, { header: 'File', key: 'fileName' }, { header: 'Records', key: 'recordCount' }, { header: 'Date', key: 'createdAt' }], data: logs })} /></Tooltip></RbacGuard>,
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadLogs} />,
            ]}
        >
            {/* Stats Row */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {stats.map((s, i) => (
                    <Col key={i} xs={12} sm={8} md={4}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 20 }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* Top Module Banner */}
            {topModule && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                    <Card size="small" style={{ ...glass, marginBottom: 16, borderLeft: `4px solid ${getModuleColor(topModule[0])}` }}>
                        <Space>
                            <AppstoreOutlined style={{ fontSize: 18, color: getModuleColor(topModule[0]) }} />
                            <Text>Most exported module: <Text strong style={{ textTransform: 'capitalize' }}>{topModule[0]?.replace(/[._]/g, ' ')}</Text> ({topModule[1]} exports)</Text>
                        </Space>
                    </Card>
                </motion.div>
            )}

            {/* Filters */}
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Select
                        placeholder="Filter by module"
                        allowClear
                        style={{ width: 200 }}
                        value={filterModule}
                        onChange={setFilterModule}
                        options={allModules.map(m => ({ label: m.replace(/[._]/g, ' '), value: m }))}
                    />
                    <Select
                        placeholder="Export type"
                        allowClear
                        style={{ width: 140 }}
                        value={filterType}
                        onChange={setFilterType}
                        options={[{ label: 'PDF', value: 'pdf' }, { label: 'Excel', value: 'excel' }]}
                    />
                    <RangePicker
                        value={filterDateRange}
                        onChange={(dates) => setFilterDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                    />
                    {(filterModule || filterType || filterDateRange) && (
                        <Button type="link" onClick={() => { setFilterModule(undefined); setFilterType(undefined); setFilterDateRange(null); }}>
                            Clear filters
                        </Button>
                    )}
                </Space>
            </Card>

            {/* Table */}
            <Card>
                <Table scroll={{ x: 900 }}
                    columns={columns}
                    dataSource={logs.map(l => ({ ...l, key: l.id }))}
                    loading={loading}
                    pagination={{
                        total: logs.length,
                        pageSize,
                        showSizeChanger: false,
                        showTotal: (t) => `${t} export records`,
                    }}
                    size="middle"
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="No export activity recorded yet. Exports will appear here automatically."
                            />
                        ),
                    }}
                />
            </Card>
        </CMSLayout>
    );
}
