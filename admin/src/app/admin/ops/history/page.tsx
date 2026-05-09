"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Table, Button, Tag, Space, Card, message, Typography, Row, Col, Statistic,
    Select, Tooltip, Progress, Empty,
} from "antd";
import { motion } from "framer-motion";
import {
    ReloadOutlined, CheckCircleOutlined, ClockCircleOutlined,
    WarningOutlined, FileExcelOutlined, FilePdfOutlined,
    BarChartOutlined, RocketOutlined, ExclamationCircleOutlined,
    StopOutlined, BookOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import RbacGuard from "@/components/common/RbacGuard";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";

dayjs.extend(relativeTime);
dayjs.extend(duration);
const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const STATUS_ICONS: Record<string, React.ReactNode> = {
    completed: <CheckCircleOutlined style={{ color: '#22c55e' }} />,
    failed: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
    cancelled: <StopOutlined style={{ color: '#6b7280' }} />,
};
const STATUS_COLORS: Record<string, string> = {
    completed: 'success', failed: 'error', cancelled: 'warning',
};
const PRIORITY_COLORS: Record<string, string> = {
    critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#94a3b8',
};

export default function HistoryPage() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const [runs, setRuns] = useState<any[]>([]);
    const [allRuns, setAllRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string | undefined>();
    const [filterPlaybook, setFilterPlaybook] = useState<string | undefined>();

    const loadRuns = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`query($t: String!) { opsRuns(tenantId: $t) {
                id name status playbookId playbookName playbookPriority startedBy startedAt completedAt dueAt createdAt
            } }`, { t: DEFAULT_TENANT_ID });
            const completed = (data.opsRuns || []).filter((r: any) => ['completed', 'cancelled', 'failed'].includes(r.status));
            setAllRuns(completed);
        } catch (err: any) { message.error(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadRuns(); }, [loadRuns]);

    // Apply filters
    useEffect(() => {
        let filtered = [...allRuns];
        if (filterStatus) filtered = filtered.filter(r => r.status === filterStatus);
        if (filterPlaybook) filtered = filtered.filter(r => r.playbookName === filterPlaybook);
        setRuns(filtered);
    }, [allRuns, filterStatus, filterPlaybook]);

    const completedCount = allRuns.filter(r => r.status === 'completed').length;
    const cancelledCount = allRuns.filter(r => r.status === 'cancelled').length;
    const failedCount = allRuns.filter(r => r.status === 'failed').length;
    const successRate = allRuns.length > 0 ? Math.round((completedCount / allRuns.length) * 100) : 0;

    const avgDuration = (() => {
        const withDuration = allRuns.filter(r => r.startedAt && r.completedAt);
        if (!withDuration.length) return 'N/A';
        const total = withDuration.reduce((s, r) => s + dayjs(r.completedAt).diff(dayjs(r.startedAt), 'minute'), 0);
        return `${Math.round(total / withDuration.length)} min`;
    })();

    // Playbook breakdown
    const playbookMap: Record<string, { count: number; completed: number; failed: number; totalMin: number }> = {};
    allRuns.forEach(r => {
        const name = r.playbookName || 'Unknown';
        if (!playbookMap[name]) playbookMap[name] = { count: 0, completed: 0, failed: 0, totalMin: 0 };
        playbookMap[name].count++;
        if (r.status === 'completed') playbookMap[name].completed++;
        if (r.status === 'failed') playbookMap[name].failed++;
        if (r.startedAt && r.completedAt) {
            playbookMap[name].totalMin += dayjs(r.completedAt).diff(dayjs(r.startedAt), 'minute');
        }
    });
    const playbookBreakdown = Object.entries(playbookMap).sort((a, b) => b[1].count - a[1].count);
    const maxPbCount = playbookBreakdown.length > 0 ? playbookBreakdown[0][1].count : 1;
    const playbookOptions = playbookBreakdown.map(([name]) => ({ label: name, value: name }));

    const columns: ColumnsType<any> = [
        {
            title: "Run", key: "name", width: 280,
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (_, r) => (
                <div style={{ cursor: 'pointer' }} onClick={() => router.push(`/admin/ops/runs/${r.id}`)}>
                    <Text strong style={{ color: '#7c3aed', fontSize: 13 }}>{r.name}</Text><br />
                    <Space size={4}>
                        <BookOutlined style={{ color: '#94a3b8', fontSize: 11 }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{r.playbookName}</Text>
                        {r.playbookPriority && <Tag color={PRIORITY_COLORS[r.playbookPriority]} style={{ fontSize: 9 }}>{r.playbookPriority}</Tag>}
                    </Space>
                </div>
            ),
        },
        {
            title: "Status", dataIndex: "status", width: 110, align: 'center',
            filters: [
                { text: 'Completed', value: 'completed' },
                { text: 'Failed', value: 'failed' },
                { text: 'Cancelled', value: 'cancelled' },
            ],
            onFilter: (val, r) => r.status === val,
            render: (v: string) => (
                <Tag color={STATUS_COLORS[v] || 'default'} icon={STATUS_ICONS[v]} style={{ textTransform: 'capitalize' }}>
                    {v}
                </Tag>
            ),
        },
        {
            title: "Duration", key: "duration", width: 100, align: 'right',
            sorter: (a, b) => {
                const dA = a.startedAt && a.completedAt ? dayjs(a.completedAt).diff(dayjs(a.startedAt)) : 0;
                const dB = b.startedAt && b.completedAt ? dayjs(b.completedAt).diff(dayjs(b.startedAt)) : 0;
                return dA - dB;
            },
            render: (_, r) => {
                if (!r.startedAt || !r.completedAt) return <Text type="secondary">-</Text>;
                const mins = dayjs(r.completedAt).diff(dayjs(r.startedAt), 'minute');
                return <Text style={{ fontSize: 12 }}>{mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`}</Text>;
            },
        },
        {
            title: "Completed", key: "completedAt", width: 150,
            sorter: (a, b) => dayjs(a.completedAt || 0).unix() - dayjs(b.completedAt || 0).unix(),
            defaultSortOrder: 'descend',
            render: (_, r) => r.completedAt ? (
                <Tooltip title={dayjs(r.completedAt).format('YYYY-MM-DD HH:mm:ss')}>
                    <Text style={{ fontSize: 12 }}>{dayjs(r.completedAt).format('MMM D, HH:mm')}</Text>
                </Tooltip>
            ) : '-',
        },
        { title: "Started By", dataIndex: "startedBy", width: 120, render: (v: string) => v || '-' },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>History</AuroraText>}
            subTitle={<DecryptedText text="Completed operational runs with duration analytics and outcome tracking" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadRuns} />,
                <RbacGuard key="exp" requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'ops_history', title: 'Operations History', columns: [{ header: 'Run', key: 'name' }, { header: 'Status', key: 'status' }, { header: 'Playbook', key: 'playbookName' }, { header: 'Started By', key: 'startedBy' }, { header: 'Completed', key: 'completedAt' }], data: runs })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'ops_history', title: 'Operations History', columns: [{ header: 'Run', key: 'name' }, { header: 'Status', key: 'status' }, { header: 'Playbook', key: 'playbookName' }, { header: 'Started By', key: 'startedBy' }], data: runs })} /></Tooltip></RbacGuard>,
            ]}
        >
            {/* Stats Row */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total Runs', value: allRuns.length, icon: <RocketOutlined />, color: '#8b5cf6' },
                    { title: 'Completed', value: completedCount, icon: <CheckCircleOutlined />, color: '#22c55e' },
                    { title: 'Failed', value: failedCount, icon: <ExclamationCircleOutlined />, color: '#ef4444' },
                    { title: 'Cancelled', value: cancelledCount, icon: <StopOutlined />, color: '#f59e0b' },
                    { title: 'Success Rate', value: successRate, suffix: '%', icon: <BarChartOutlined />, color: '#10b981' },
                    { title: 'Avg Duration', value: avgDuration, icon: <ClockCircleOutlined />, color: '#3b82f6' },
                ].map((s, i) => (
                    <Col key={i} xs={12} sm={8} md={4}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} suffix={(s as any).suffix} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 20 }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* Playbook Breakdown */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                        <Card title={<Space><BarChartOutlined /> Runs by Playbook</Space>} size="small" style={glass}>
                            {playbookBreakdown.length === 0 ? (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No historical runs" />
                            ) : (
                                <Space direction="vertical" style={{ width: '100%' }} size={6}>
                                    {playbookBreakdown.map(([name, stats]) => {
                                        const totalTime = stats.totalMin < 60 ? `${stats.totalMin}m` : `${Math.floor(stats.totalMin / 60)}h ${stats.totalMin % 60}m`;
                                        return (
                                            <div key={name}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                    <Space size={6}>
                                                        <BookOutlined style={{ color: '#8b5cf6' }} />
                                                        <Text style={{ fontSize: 12 }}>{name}</Text>
                                                    </Space>
                                                    <Space size={8}>
                                                        <Tag color="green" style={{ fontSize: 10 }}>{stats.completed} ok</Tag>
                                                        {stats.failed > 0 && <Tag color="red" style={{ fontSize: 10 }}>{stats.failed} fail</Tag>}
                                                        <Text type="secondary" style={{ fontSize: 10 }}>{totalTime}</Text>
                                                    </Space>
                                                </div>
                                                <Progress
                                                    percent={Math.round((stats.count / maxPbCount) * 100)}
                                                    showInfo={false}
                                                    strokeColor={stats.failed > 0 ? '#f59e0b' : '#8b5cf6'}
                                                    size="small"
                                                />
                                            </div>
                                        );
                                    })}
                                </Space>
                            )}
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* Filters */}
            <Card size="small" style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Select placeholder="Filter by status" allowClear style={{ width: 160 }} value={filterStatus} onChange={setFilterStatus}
                        options={[{ label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' }, { label: 'Failed', value: 'failed' }]} />
                    <Select placeholder="Filter by playbook" allowClear style={{ width: 220 }} value={filterPlaybook} onChange={setFilterPlaybook}
                        options={playbookOptions} />
                    {(filterStatus || filterPlaybook) && (
                        <Button type="link" onClick={() => { setFilterStatus(undefined); setFilterPlaybook(undefined); }}>
                            Clear filters
                        </Button>
                    )}
                </Space>
            </Card>

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={runs.map(r => ({ ...r, key: r.id }))}
                    loading={loading}
                    pagination={{ pageSize: 20, showTotal: (t) => `${t} historical runs` }}
                    size="middle"
                    scroll={{ x: 800 }}
                />
            </Card>
        </CMSLayout>
    );
}
