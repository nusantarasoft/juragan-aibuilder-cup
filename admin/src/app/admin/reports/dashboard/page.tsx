'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Input, Select, Timeline, Skeleton, message, theme } from 'antd';
import {
    FileTextOutlined, BarChartOutlined, ClockCircleOutlined, PlusOutlined, DownloadOutlined,
    CalendarOutlined, ReloadOutlined, CheckCircleOutlined, PieChartOutlined, PlayCircleOutlined,
    EditOutlined, DeleteOutlined, SearchOutlined, ThunderboltOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import { gql, DEFAULT_TENANT_ID } from '@/lib/graphql';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const glassDark = { background: 'rgba(12,12,30,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 };

/* ═══ Demo fallback data — shown when backend returns empty arrays ═══ */
const DEMO_REPORTS = [
    { id: 'RPT-001', name: 'Monthly Revenue Summary', module: 'Financial',
      type: 'chart', createdAt: '2025-04-10T08:00:00Z', lastRun: '2025-05-28T08:30:00Z',
      status: 'active', schedule: 'Monthly' },
    { id: 'RPT-002', name: 'Employee Headcount Report', module: 'HR',
      type: 'table', createdAt: '2025-03-15T10:00:00Z', lastRun: '2025-05-27T14:00:00Z',
      status: 'active', schedule: 'Weekly' },
    { id: 'RPT-003', name: 'Inventory Valuation', module: 'Inventory',
      type: 'table', createdAt: '2025-02-20T06:00:00Z', lastRun: '2025-05-29T06:00:00Z',
      status: 'active', schedule: 'Daily' },
    { id: 'RPT-004', name: 'Sales Pipeline Analysis', module: 'CRM',
      type: 'chart', createdAt: '2025-04-01T12:00:00Z', lastRun: '2025-05-25T10:00:00Z',
      status: 'draft', schedule: null },
    { id: 'RPT-005', name: 'SLA Compliance Dashboard', module: 'ITSM',
      type: 'metric', createdAt: '2025-01-18T09:00:00Z', lastRun: '2025-05-28T12:00:00Z',
      status: 'active', schedule: 'Weekly' },
    { id: 'RPT-006', name: 'Audit Trail Export', module: 'Compliance',
      type: 'table', createdAt: '2025-03-05T11:00:00Z', lastRun: '2025-05-26T09:00:00Z',
      status: 'active', schedule: 'Monthly' },
    { id: 'RPT-007', name: 'Quarterly Revenue Forecast', module: 'Financial',
      type: 'chart', createdAt: '2025-05-01T08:00:00Z', lastRun: '2025-05-20T15:00:00Z',
      status: 'active', schedule: 'Quarterly' },
    { id: 'RPT-008', name: 'Customer Churn Analysis', module: 'CRM',
      type: 'metric', createdAt: '2025-04-22T14:00:00Z', lastRun: null,
      status: 'draft', schedule: null },
    { id: 'RPT-009', name: 'Warehouse Stock Levels', module: 'Inventory',
      type: 'table', createdAt: '2025-05-10T07:00:00Z', lastRun: '2025-05-29T07:00:00Z',
      status: 'active', schedule: 'Daily' },
    { id: 'RPT-010', name: 'HR Attrition Trends', module: 'HR',
      type: 'chart', createdAt: '2025-02-14T09:00:00Z', lastRun: null,
      status: 'archived', schedule: null },
];

const DEMO_ACTIVITY = [
    { report: 'Monthly Revenue Summary', time: '2 hours ago', status: 'completed', duration: '4.2s', format: 'PDF' },
    { report: 'Inventory Valuation', time: '5 hours ago', status: 'completed', duration: '8.1s', format: 'Excel' },
    { report: 'SLA Compliance Dashboard', time: '1 day ago', status: 'completed', duration: '2.8s', format: 'PDF' },
    { report: 'Audit Trail Export', time: '2 days ago', status: 'failed', duration: '—', format: 'CSV' },
    { report: 'Employee Headcount Report', time: '3 days ago', status: 'completed', duration: '3.5s', format: 'Excel' },
];

const MODULE_COLORS: Record<string, string> = {
    Financial: '#3b82f6', HR: '#10b981', CRM: '#f59e0b',
    Inventory: '#8b5cf6', ITSM: '#06b6d4', Compliance: '#ef4444',
};
const TYPE_LABELS: Record<string, string> = {
    chart: '📊 Chart', table: '📋 Table', metric: '🔢 Metric',
};

/* ═══ Reports Dashboard Component ═══ */
export default function ReportsDashboardPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const glassCard = isDark ? glassDark : glass;
    const router = useRouter();
    const [messageApi, contextHolder] = message.useMessage();

    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    /* ── Fetch real data with demo fallback ── */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [rptRes, tplRes, schRes] = await Promise.all([
                gql<{ allReports: any[] }>(
                    `query($tenantId: String!) { allReports(tenantId: $tenantId) }`,
                    { tenantId: DEFAULT_TENANT_ID },
                ).catch(() => ({ allReports: [] })),
                gql<{ reportTemplates: any[] }>(
                    `query($tenantId: String!) { reportTemplates(tenantId: $tenantId) }`,
                    { tenantId: DEFAULT_TENANT_ID },
                ).catch(() => ({ reportTemplates: [] })),
                gql<{ reportSchedules: any[] }>(
                    `query($tenantId: String!) { reportSchedules(tenantId: $tenantId) }`,
                    { tenantId: DEFAULT_TENANT_ID },
                ).catch(() => ({ reportSchedules: [] })),
            ]);
            const live = rptRes.allReports;
            setReports(Array.isArray(live) && live.length > 0 ? live : DEMO_REPORTS);
        } catch {
            setReports(DEMO_REPORTS);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    /* ── Computed KPI stats ── */
    const stats = useMemo(() => {
        const total = reports.length;
        const active = reports.filter(r => r.status === 'active').length;
        const drafts = reports.filter(r => r.status === 'draft').length;
        const scheduled = reports.filter(r => r.schedule).length;
        const totalExports = reports.filter(r => r.lastRun).length;
        return { total, active, drafts, scheduled, totalExports, avgGen: '3.8s' };
    }, [reports]);

    /* ── Filtered list for table ── */
    const filteredReports = useMemo(() => {
        let list = reports;
        if (statusFilter) list = list.filter(r => r.status === statusFilter);
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(r => r.name?.toLowerCase().includes(q));
        }
        return list;
    }, [reports, statusFilter, search]);

    /* ── Module distribution for donut chart ── */
    const moduleData = useMemo(() => {
        const counts: Record<string, number> = {};
        reports.forEach(r => {
            const m = r.module || 'Other';
            counts[m] = (counts[m] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({
            name, value, color: MODULE_COLORS[name] || '#6b7280',
        }));
    }, [reports]);

    /* ── KPI card config ── */
    const kpiCards = [
        { t: 'Total Reports', v: stats.total, c: '#3b82f6', i: <FileTextOutlined /> },
        { t: 'Active', v: stats.active, c: '#10b981', i: <CheckCircleOutlined /> },
        { t: 'Drafts', v: stats.drafts, c: '#f59e0b', i: <EditOutlined /> },
        { t: 'Scheduled', v: stats.scheduled, c: '#8b5cf6', i: <CalendarOutlined /> },
        { t: 'Total Exports', v: stats.totalExports, c: '#06b6d4', i: <DownloadOutlined /> },
        { t: 'Avg Generation', v: stats.avgGen, c: '#ec4899', i: <ThunderboltOutlined /> },
    ];

    /* ── Table columns ── */
    const columns = [
        { title: 'Report Name', dataIndex: 'name', key: 'name',
          render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
        { title: 'Module', dataIndex: 'module', key: 'module', width: 105,
          render: (v: string) => (
              <Tag color={MODULE_COLORS[v] || 'default'} style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag>
          ) },
        { title: 'Type', dataIndex: 'type', key: 'type', width: 90,
          render: (v: string) => (
              <Tag style={{ fontSize: 10, borderRadius: 8 }}>{TYPE_LABELS[v] || v}</Tag>
          ) },
        { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 100,
          render: (v: string) => (
              <Text type="secondary" style={{ fontSize: 11 }}>{v ? new Date(v).toLocaleDateString() : '—'}</Text>
          ) },
        { title: 'Last Run', dataIndex: 'lastRun', key: 'lastRun', width: 100,
          render: (v: string) => (
              <Text type="secondary" style={{ fontSize: 11 }}>{v ? new Date(v).toLocaleDateString() : '—'}</Text>
          ) },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 90,
          render: (v: string) => (
              <Tag color={v === 'active' ? 'green' : v === 'draft' ? 'orange' : 'default'}
                  style={{ fontSize: 10, borderRadius: 10 }}>{v}</Tag>
          ) },
        { title: 'Schedule', dataIndex: 'schedule', key: 'schedule', width: 95,
          render: (v: string) => (
              <Text type="secondary" style={{ fontSize: 11 }}>{v || '—'}</Text>
          ) },
        { title: 'Actions', key: 'actions', width: 150,
          render: (_: any, rec: any) => (
              <Space size={2}>
                  <Button type="text" size="small"
                      icon={<PlayCircleOutlined style={{ fontSize: 12, color: '#10b981' }} />}
                      onClick={e => { e.stopPropagation(); messageApi.info(`Running ${rec.name}…`); }} />
                  <Button type="text" size="small"
                      icon={<DownloadOutlined style={{ fontSize: 12, color: '#3b82f6' }} />}
                      onClick={e => { e.stopPropagation(); messageApi.info(`Downloading ${rec.name}…`); }} />
                  <Button type="text" size="small"
                      icon={<EditOutlined style={{ fontSize: 12, color: '#f59e0b' }} />}
                      onClick={e => { e.stopPropagation(); router.push(`/admin/reports/builder?id=${rec.id}`); }} />
                  <Button type="text" size="small"
                      icon={<DeleteOutlined style={{ fontSize: 12, color: '#ef4444' }} />}
                      onClick={e => { e.stopPropagation(); messageApi.warning(`Delete ${rec.name}?`); }} />
              </Space>
          ) },
    ];

    /* ═══ Render ═══ */
    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#3b82f6', '#10b981']}>Reporting Engine</AuroraText>}
            subTitle={
                <DecryptedText text="Build, schedule & export reports across all modules"
                    animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />
            }
            extra={[
                <Button key="t" icon={<AppstoreOutlined />}
                    onClick={() => router.push('/admin/reports/templates')}>Templates</Button>,
                <Button key="n" icon={<PlusOutlined />} type="primary"
                    onClick={() => router.push('/admin/reports/builder')}>New Report</Button>,
                <Button key="r" icon={<ReloadOutlined />} loading={loading} onClick={loadData} />,
            ]}
        >
            {contextHolder}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* ═══ 1. KPI Stats Row (BENTO GRID) ═══ */}
                <BentoGrid className="max-w-full">
                    <BentoGridItem
                        title="Total Reports"
                        description="Across all modules"
                        icon={<FileTextOutlined style={{ color: '#3b82f6' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-blue-500/10">
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6' }}>{stats.total}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                    <BentoGridItem
                        title="Active & Drafts"
                        description={`${stats.active} active, ${stats.drafts} drafts`}
                        icon={<CheckCircleOutlined style={{ color: '#10b981' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-emerald-500/10">
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981' }}>{stats.active + stats.drafts}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                    <BentoGridItem
                        title="Scheduled"
                        description="Automated reports"
                        icon={<CalendarOutlined style={{ color: '#8b5cf6' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-purple-500/10">
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#8b5cf6' }}>{stats.scheduled}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                    <BentoGridItem
                        title="Exports & Speed"
                        description={`${stats.totalExports} exports @ ${stats.avgGen} avg speed`}
                        icon={<ThunderboltOutlined style={{ color: '#06b6d4' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-cyan-500/10">
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#06b6d4' }}>{stats.totalExports}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                </BentoGrid>

                {/* ═══ 2. Reports Table + Sidebar (donut chart & activity feed) ═══ */}
                <Row gutter={[14, 14]}>
                    {/* ── Main Reports Table ── */}
                    <Col xs={24} lg={16}>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}>
                            <Card size="small" style={glassCard}
                                title={
                                    <Space>
                                        <FileTextOutlined style={{ color: '#3b82f6' }} />
                                        <Text strong>Saved Reports</Text>
                                        <Tag color="blue" style={{ borderRadius: 8 }}>{filteredReports.length}</Tag>
                                    </Space>
                                }
                                extra={
                                    <Space size={8}>
                                        <Input size="small" placeholder="Search reports…"
                                            prefix={<SearchOutlined />}
                                            style={{ width: 170, borderRadius: 8 }}
                                            value={search} onChange={e => setSearch(e.target.value)} allowClear />
                                        <Select size="small" placeholder="Status" allowClear
                                            style={{ width: 105 }} value={statusFilter}
                                            onChange={v => setStatusFilter(v)}
                                            options={[
                                                { label: 'Active', value: 'active' },
                                                { label: 'Draft', value: 'draft' },
                                                { label: 'Archived', value: 'archived' },
                                            ]} />
                                    </Space>
                                }
                            >
                                <Table
                                    dataSource={filteredReports}
                                    columns={columns}
                                    rowKey="id"
                                    size="small"
                                    loading={loading}
                                    pagination={{ pageSize: 8, size: 'small', showSizeChanger: false }}
                                    onRow={record => ({
                                        onClick: () => router.push(`/admin/reports/builder?id=${record.id}`),
                                        style: { cursor: 'pointer' },
                                    })}
                                />
                            </Card>
                        </motion.div>
                    </Col>

                    {/* ── Sidebar: Chart + Activity ── */}
                    <Col xs={24} lg={8}>
                        <Space direction="vertical" style={{ width: '100%' }} size={14}>

                            {/* Reports by Module — Donut Chart */}
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}>
                                <Card size="small" style={glassCard}
                                    title={
                                        <Space>
                                            <PieChartOutlined style={{ color: '#8b5cf6' }} />
                                            <Text strong>Reports by Module</Text>
                                        </Space>
                                    }
                                >
                                    {loading ? (
                                        <Skeleton active paragraph={{ rows: 5 }} />
                                    ) : (
                                        <>
                                            <ResponsiveContainer width="100%" height={190}>
                                                <PieChart>
                                                    <Pie data={moduleData} cx="50%" cy="50%"
                                                        innerRadius={42} outerRadius={72}
                                                        paddingAngle={3} dataKey="value" stroke="none">
                                                        {moduleData.map((entry, idx) => (
                                                            <Cell key={idx} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value: number, name: string) => [
                                                        `${value} reports`, name,
                                                    ]} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                                {moduleData.map(m => (
                                                    <Tag key={m.name}
                                                        style={{ fontSize: 10, borderRadius: 6, margin: 0 }}>
                                                        <span style={{
                                                            display: 'inline-block', width: 8, height: 8,
                                                            borderRadius: '50%', background: m.color, marginRight: 4,
                                                        }} />
                                                        {m.name} ({m.value})
                                                    </Tag>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </Card>
                            </motion.div>

                            {/* Recent Activity Feed — Timeline */}
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}>
                                <Card size="small" style={glassCard}
                                    title={
                                        <Space>
                                            <ClockCircleOutlined style={{ color: '#10b981' }} />
                                            <Text strong>Recent Activity</Text>
                                        </Space>
                                    }
                                >
                                    <Timeline
                                        items={DEMO_ACTIVITY.map(a => ({
                                            color: a.status === 'completed' ? 'green' : 'red',
                                            children: (
                                                <div>
                                                    <Text strong style={{ fontSize: 11 }}>{a.report}</Text>
                                                    <br />
                                                    <Text type="secondary" style={{ fontSize: 10 }}>
                                                        {a.format} • {a.duration} • {a.time}
                                                    </Text>{' '}
                                                    <Tag color={a.status === 'completed' ? 'green' : 'red'}
                                                        style={{ fontSize: 9, borderRadius: 8, margin: 0 }}>
                                                        {a.status}
                                                    </Tag>
                                                </div>
                                            ),
                                        }))}
                                    />
                                </Card>
                            </motion.div>

                        </Space>
                    </Col>
                </Row>

                {/* ═══ 3. Quick Actions Bar ═══ */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}>
                    <Card size="small" style={glassCard}>
                        <Row gutter={[12, 12]} justify="center">
                            {[
                                { label: 'New Report', icon: <PlusOutlined />,
                                  color: '#3b82f6', href: '/admin/reports/builder' },
                                { label: 'Browse Templates', icon: <AppstoreOutlined />,
                                  color: '#8b5cf6', href: '/admin/reports/templates' },
                                { label: 'Scheduled Reports', icon: <CalendarOutlined />,
                                  color: '#10b981', href: '/admin/reports/scheduled' },
                                { label: 'KPI Dashboards', icon: <BarChartOutlined />,
                                  color: '#f59e0b', href: '/admin/reports/kpi' },
                            ].map((a, i) => (
                                <Col key={i} xs={12} sm={6}>
                                    <Button block size="large" icon={a.icon}
                                        onClick={() => router.push(a.href)}
                                        style={{
                                            borderRadius: 10, borderColor: `${a.color}44`,
                                            color: a.color, fontWeight: 600,
                                        }}>
                                        {a.label}
                                    </Button>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                </motion.div>

            </motion.div>
        </CMSLayout>
    );
}
