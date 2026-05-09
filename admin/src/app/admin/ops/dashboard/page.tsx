"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Card, Row, Col, Statistic, Tag, Space, Typography, Spin, List, Progress,
    Empty, Button, Tooltip, Timeline, Divider,
} from "antd";
import { motion } from "framer-motion";
import {
    BookOutlined, RocketOutlined, CheckCircleOutlined, ClockCircleOutlined,
    WarningOutlined, ThunderboltOutlined, ScheduleOutlined, BarChartOutlined,
    SendOutlined, BellOutlined, MailOutlined, ApiOutlined,
    PlusOutlined, InboxOutlined, PlayCircleOutlined, ArrowRightOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import RbacGuard from "@/components/common/RbacGuard";
import { FileExcelOutlined, FilePdfOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
    pending: { color: '#94a3b8', icon: <ClockCircleOutlined /> },
    in_progress: { color: '#3b82f6', icon: <ThunderboltOutlined /> },
    completed: { color: '#22c55e', icon: <CheckCircleOutlined /> },
    cancelled: { color: '#ef4444', icon: <WarningOutlined /> },
    failed: { color: '#ef4444', icon: <WarningOutlined /> },
};

const PRIORITY_COLORS: Record<string, string> = {
    critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#94a3b8',
};

const CATEGORY_COLORS: Record<string, string> = {
    infrastructure: '#3b82f6', security: '#ef4444', monitoring: '#22c55e',
    deployment: '#8b5cf6', maintenance: '#f59e0b', compliance: '#06b6d4',
    other: '#94a3b8',
};

const DELIVERY_ICONS: Record<string, React.ReactNode> = {
    email: <MailOutlined style={{ color: '#3b82f6' }} />,
    whatsapp: <SendOutlined style={{ color: '#22c55e' }} />,
    webhook: <ApiOutlined style={{ color: '#f59e0b' }} />,
    in_app: <BellOutlined style={{ color: '#8b5cf6' }} />,
};

export default function OpsDashboardPage() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const [playbooks, setPlaybooks] = useState<any[]>([]);
    const [runs, setRuns] = useState<any[]>([]);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);
    const [notifStats, setNotifStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [pbData, runData, schData, logData] = await Promise.all([
                gql(`query($t: String!) { opsPlaybooks(tenantId: $t) { id name category priority isActive estimatedMinutes createdAt } }`, { t: DEFAULT_TENANT_ID }),
                gql(`query($t: String!) { opsRuns(tenantId: $t) { id name status playbookName playbookPriority startedAt completedAt dueAt createdAt } }`, { t: DEFAULT_TENANT_ID }),
                gql(`query($t: String!) { opsSchedules(tenantId: $t) { id name cronExpression isActive playbookName nextRunAt lastRunAt timezone } }`, { t: DEFAULT_TENANT_ID }),
                gql(`query($t: String!, $limit: Float) { notificationLogs(tenantId: $t, limit: $limit) { id channelType recipient subject status createdAt } }`, { t: DEFAULT_TENANT_ID, limit: 10 }),
            ]);
            setPlaybooks(pbData.opsPlaybooks || []);
            setRuns(runData.opsRuns || []);
            setSchedules(schData.opsSchedules || []);
            setDeliveryLogs(logData.notificationLogs || []);
        } catch { /* ignore */ }
        try {
            const nsData = await gql(`query($t: String!) { notificationStats(tenantId: $t) {
                totalLogs sentLogs failedLogs totalNotifications unreadNotifications activeChannels
                channelBreakdown { type count }
            } }`, { t: DEFAULT_TENANT_ID });
            setNotifStats(nsData.notificationStats || null);
        } catch { /* ignore */ }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const activeRuns = runs.filter(r => r.status === 'in_progress');
    const completedRuns = runs.filter(r => r.status === 'completed');
    const pendingRuns = runs.filter(r => r.status === 'pending');
    const overdueRuns = runs.filter(r => r.dueAt && dayjs(r.dueAt).isBefore(dayjs()) && r.status !== 'completed');
    const completionRate = runs.length > 0 ? Math.round((completedRuns.length / runs.length) * 100) : 0;
    const activeSchedules = schedules.filter(s => s.isActive);

    // Playbook category distribution
    const categoryMap: Record<string, number> = {};
    playbooks.forEach(p => { const cat = p.category || 'other'; categoryMap[cat] = (categoryMap[cat] || 0) + 1; });
    const totalPb = playbooks.length || 1;

    // Priority distribution
    const priorityMap: Record<string, number> = {};
    playbooks.forEach(p => { const pri = p.priority || 'medium'; priorityMap[pri] = (priorityMap[pri] || 0) + 1; });

    // Build unified activity timeline
    const activityItems = [
        ...runs.slice(0, 5).map(r => ({
            time: r.createdAt,
            color: STATUS_CONFIG[r.status]?.color || '#94a3b8',
            icon: STATUS_CONFIG[r.status]?.icon || <ClockCircleOutlined />,
            title: r.name,
            desc: `${r.status.replace('_', ' ')} - ${r.playbookName || 'Playbook'}`,
            type: 'run' as const,
        })),
        ...deliveryLogs.slice(0, 5).map(d => ({
            time: d.createdAt,
            color: d.status === 'sent' ? '#22c55e' : d.status === 'failed' ? '#ef4444' : '#f59e0b',
            icon: DELIVERY_ICONS[d.channelType] || <BellOutlined />,
            title: d.subject || 'Notification',
            desc: `${d.channelType} > ${d.recipient}`,
            type: 'notification' as const,
        })),
    ].sort((a, b) => dayjs(b.time).unix() - dayjs(a.time).unix()).slice(0, 8);

    const stats = [
        { title: 'Playbooks', value: playbooks.length, icon: <BookOutlined />, color: '#8b5cf6' },
        { title: 'Active Runs', value: activeRuns.length, icon: <RocketOutlined />, color: '#3b82f6' },
        { title: 'Pending', value: pendingRuns.length, icon: <ClockCircleOutlined />, color: '#f59e0b' },
        { title: 'Completed', value: completedRuns.length, icon: <CheckCircleOutlined />, color: '#22c55e' },
        { title: 'Overdue', value: overdueRuns.length, icon: <WarningOutlined />, color: '#ef4444' },
        { title: 'Schedules', value: activeSchedules.length, icon: <ScheduleOutlined />, color: '#06b6d4' },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Operations</AuroraText>}
            subTitle={<DecryptedText text="Manage recurring operational workflows and task execution" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadData} />,
                <RbacGuard key="exp" requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'ops_dashboard', title: 'Operations Dashboard', columns: [{ header: 'Run', key: 'name' }, { header: 'Status', key: 'status' }, { header: 'Playbook', key: 'playbookName' }, { header: 'Priority', key: 'playbookPriority' }, { header: 'Created', key: 'createdAt' }], data: runs })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'ops_dashboard', title: 'Operations Dashboard', columns: [{ header: 'Run', key: 'name' }, { header: 'Status', key: 'status' }, { header: 'Playbook', key: 'playbookName' }, { header: 'Priority', key: 'playbookPriority' }, { header: 'Created', key: 'createdAt' }], data: runs })} /></Tooltip></RbacGuard>,
            ]}
        >
            <Spin spinning={loading}>
                {/* Stats Row */}
                <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                    {stats.map((s, i) => (
                        <Col key={i} xs={12} sm={8} md={4}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                    <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 22 }} />
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Row 1: Completion + Active Runs + Overdue */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} md={8}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                            <Card title={<Space><BarChartOutlined /> Completion Rate</Space>} size="small" style={glass}>
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <Progress type="dashboard" percent={completionRate} strokeColor={{ '0%': '#3b82f6', '100%': '#22c55e' }} size={140} />
                                    <br />
                                    <Text type="secondary">{completedRuns.length} of {runs.length} runs completed</Text>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>

                    <Col xs={24} md={8}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                            <Card title={<Space><RocketOutlined style={{ color: '#3b82f6' }} /> Active Runs</Space>} size="small" style={glass}
                                extra={<Button type="link" size="small" onClick={() => router.push('/admin/ops/runs')}>View All <ArrowRightOutlined /></Button>}>
                                {activeRuns.length === 0 ? (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No active runs" />
                                ) : (
                                    <List
                                        size="small"
                                        dataSource={activeRuns.slice(0, 5)}
                                        renderItem={(run: any) => (
                                            <List.Item style={{ cursor: 'pointer' }} onClick={() => router.push(`/admin/ops/runs/${run.id}`)}>
                                                <List.Item.Meta
                                                    avatar={<ThunderboltOutlined style={{ color: '#3b82f6', fontSize: 18 }} />}
                                                    title={<Text strong style={{ fontSize: 13, color: '#7c3aed' }}>{run.name}</Text>}
                                                    description={
                                                        <Space size={4}>
                                                            <Tag color={PRIORITY_COLORS[run.playbookPriority] || '#94a3b8'} style={{ fontSize: 10 }}>{run.playbookPriority}</Tag>
                                                            <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(run.createdAt).fromNow()}</Text>
                                                        </Space>
                                                    }
                                                />
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Card>
                        </motion.div>
                    </Col>

                    <Col xs={24} md={8}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                            <Card title={<Space><WarningOutlined style={{ color: '#ef4444' }} /> Overdue Tasks</Space>} size="small" style={{ ...glass, borderTop: overdueRuns.length > 0 ? '3px solid #ef4444' : undefined }}>
                                {overdueRuns.length === 0 ? (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="All on track!" />
                                ) : (
                                    <List
                                        size="small"
                                        dataSource={overdueRuns.slice(0, 5)}
                                        renderItem={(run: any) => (
                                            <List.Item style={{ cursor: 'pointer' }} onClick={() => router.push(`/admin/ops/runs/${run.id}`)}>
                                                <List.Item.Meta
                                                    avatar={<WarningOutlined style={{ color: '#ef4444' }} />}
                                                    title={<Text strong style={{ fontSize: 13, color: '#7c3aed' }}>{run.name}</Text>}
                                                    description={<Text type="danger" style={{ fontSize: 11 }}>Due {dayjs(run.dueAt).fromNow()}</Text>}
                                                />
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* Row 2: Category Distribution + Priority + Schedule Health */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} md={8}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                            <Card title={<Space><BookOutlined /> Playbook Categories</Space>} size="small" style={glass}>
                                {Object.entries(categoryMap).length === 0 ? (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No playbooks" />
                                ) : (
                                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                        {Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                                            <div key={cat}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                    <Text style={{ fontSize: 12, textTransform: 'capitalize' }}>{cat}</Text>
                                                    <Text type="secondary" style={{ fontSize: 11 }}>{count}</Text>
                                                </div>
                                                <Progress
                                                    percent={Math.round((count / totalPb) * 100)}
                                                    showInfo={false}
                                                    strokeColor={CATEGORY_COLORS[cat.toLowerCase()] || '#94a3b8'}
                                                    size="small"
                                                />
                                            </div>
                                        ))}
                                    </Space>
                                )}
                            </Card>
                        </motion.div>
                    </Col>

                    <Col xs={24} md={8}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                            <Card title={<Space><ThunderboltOutlined /> Priority Distribution</Space>} size="small" style={glass}>
                                <div style={{ display: 'flex', justifyContent: 'space-around', padding: '16px 0' }}>
                                    {['critical', 'high', 'medium', 'low'].map(pri => (
                                        <div key={pri} style={{ textAlign: 'center' }}>
                                            <Progress
                                                type="circle"
                                                percent={Math.round(((priorityMap[pri] || 0) / totalPb) * 100)}
                                                size={60}
                                                strokeColor={PRIORITY_COLORS[pri]}
                                                format={() => priorityMap[pri] || 0}
                                            />
                                            <div style={{ marginTop: 6 }}>
                                                <Tag color={PRIORITY_COLORS[pri]} style={{ fontSize: 10, textTransform: 'capitalize' }}>{pri}</Tag>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    </Col>

                    <Col xs={24} md={8}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
                            <Card title={<Space><ScheduleOutlined style={{ color: '#06b6d4' }} /> Schedule Health</Space>} size="small" style={glass}>
                                {schedules.length === 0 ? (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No schedules" />
                                ) : (
                                    <List
                                        size="small"
                                        dataSource={schedules.slice(0, 5)}
                                        renderItem={(sch: any) => (
                                            <List.Item>
                                                <List.Item.Meta
                                                    avatar={
                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: sch.isActive ? '#22c55e' : '#94a3b8', marginTop: 6 }} />
                                                    }
                                                    title={<Text strong style={{ fontSize: 12 }}>{sch.name}</Text>}
                                                    description={
                                                        <Space size={4}>
                                                            <Tag style={{ fontSize: 10 }}>{sch.cronExpression}</Tag>
                                                            {sch.nextRunAt && (
                                                                <Text type="secondary" style={{ fontSize: 10 }}>
                                                                    Next: {dayjs(sch.nextRunAt).fromNow()}
                                                                </Text>
                                                            )}
                                                        </Space>
                                                    }
                                                />
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* Row 2.25: Execution Duration Trends */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.56 }}>
                            <Card title={<Space><BarChartOutlined /> Execution Duration Trends</Space>} size="small" style={glass}
                                extra={<Button type="link" size="small" onClick={() => router.push('/admin/ops/history')}>View History <ArrowRightOutlined /></Button>}>
                                {(() => {
                                    // Compute avg duration per playbook from completed runs
                                    const pbDurations: Record<string, { totalMin: number; count: number; max: number }> = {};
                                    runs.filter(r => r.startedAt && r.completedAt && r.status === 'completed').forEach(r => {
                                        const name = r.playbookName || 'Unknown';
                                        const mins = dayjs(r.completedAt).diff(dayjs(r.startedAt), 'minute');
                                        if (!pbDurations[name]) pbDurations[name] = { totalMin: 0, count: 0, max: 0 };
                                        pbDurations[name].totalMin += mins;
                                        pbDurations[name].count++;
                                        pbDurations[name].max = Math.max(pbDurations[name].max, mins);
                                    });
                                    const entries = Object.entries(pbDurations).sort((a, b) => (b[1].totalMin / b[1].count) - (a[1].totalMin / a[1].count));
                                    const maxAvg = entries.length > 0 ? Math.max(...entries.map(([, v]) => v.totalMin / v.count)) : 1;

                                    if (entries.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No completed runs with duration data" />;
                                    return (
                                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                            {entries.map(([name, stats]) => {
                                                const avg = Math.round(stats.totalMin / stats.count);
                                                const pct = Math.round((avg / maxAvg) * 100);
                                                // Find matching playbook for estimated time
                                                const pb = playbooks.find(p => p.name === name);
                                                const est = pb?.estimatedMinutes || 0;
                                                const isOverEstimate = est > 0 && avg > est * 1.2;
                                                return (
                                                    <div key={name}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                                            <Space size={6}>
                                                                <BookOutlined style={{ color: '#8b5cf6', fontSize: 12 }} />
                                                                <Text style={{ fontSize: 12 }}>{name}</Text>
                                                                {isOverEstimate && (
                                                                    <Tooltip title={`Avg ${avg} min exceeds estimate of ${est} min`}>
                                                                        <Tag color="red" style={{ fontSize: 9 }}>Slow</Tag>
                                                                    </Tooltip>
                                                                )}
                                                            </Space>
                                                            <Space size={8}>
                                                                <Text type="secondary" style={{ fontSize: 11 }}>Avg: {avg} min</Text>
                                                                <Text type="secondary" style={{ fontSize: 10 }}>({stats.count} runs)</Text>
                                                                {est > 0 && <Tag style={{ fontSize: 9 }}>Est: {est}m</Tag>}
                                                            </Space>
                                                        </div>
                                                        <Progress
                                                            percent={pct}
                                                            showInfo={false}
                                                            strokeColor={isOverEstimate ? '#ef4444' : avg > 60 ? '#f59e0b' : '#22c55e'}
                                                            size="small"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </Space>
                                    );
                                })()}
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* Row 2.5: Communication Health + Quick Actions */}
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} md={12}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.58 }}>
                            <Card title={<Space><SendOutlined /> Communication Health</Space>} size="small" style={glass}
                                extra={<Button type="link" size="small" onClick={() => router.push('/admin/notifications/analytics')}>Details <ArrowRightOutlined /></Button>}>
                                {notifStats ? (
                                    <Row gutter={[12, 8]}>
                                        <Col span={8} style={{ textAlign: 'center' }}>
                                            <Progress type="circle" percent={notifStats.totalLogs > 0 ? Math.round((notifStats.sentLogs / notifStats.totalLogs) * 100) : 0} size={64}
                                                strokeColor={notifStats.totalLogs > 0 && (notifStats.sentLogs / notifStats.totalLogs) >= 0.8 ? '#22c55e' : '#f59e0b'} />
                                            <div style={{ marginTop: 4 }}><Text type="secondary" style={{ fontSize: 10 }}>Success Rate</Text></div>
                                        </Col>
                                        <Col span={16}>
                                            <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text style={{ fontSize: 11 }}>Dispatched</Text>
                                                    <Text strong style={{ fontSize: 11 }}>{notifStats.totalLogs}</Text>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text style={{ fontSize: 11, color: '#22c55e' }}>Delivered</Text>
                                                    <Text strong style={{ fontSize: 11, color: '#22c55e' }}>{notifStats.sentLogs}</Text>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text style={{ fontSize: 11, color: '#ef4444' }}>Failed</Text>
                                                    <Text strong style={{ fontSize: 11, color: '#ef4444' }}>{notifStats.failedLogs}</Text>
                                                </div>
                                                <Divider style={{ margin: '4px 0' }} />
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text style={{ fontSize: 11 }}>Channels Active</Text>
                                                    <Tag color="blue" style={{ fontSize: 10 }}>{notifStats.activeChannels}</Tag>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text style={{ fontSize: 11 }}>Unread Inbox</Text>
                                                    <Tag color={notifStats.unreadNotifications > 0 ? 'orange' : 'green'} style={{ fontSize: 10 }}>{notifStats.unreadNotifications}</Tag>
                                                </div>
                                            </Space>
                                        </Col>
                                    </Row>
                                ) : (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notification data" />
                                )}
                            </Card>
                        </motion.div>
                    </Col>
                    <Col xs={24} md={12}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.58 }}>
                            <Card title={<Space><PlayCircleOutlined /> Quick Actions</Space>} size="small" style={glass}>
                                <Space wrap>
                                    <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/admin/ops/runs')}>
                                        New Run
                                    </Button>
                                    <Button icon={<BookOutlined />} onClick={() => router.push('/admin/ops/playbooks')}>
                                        Manage Playbooks
                                    </Button>
                                    <Button icon={<ScheduleOutlined />} onClick={() => router.push('/admin/ops/schedules')}>
                                        View Schedules
                                    </Button>
                                    <Button icon={<ClockCircleOutlined />} onClick={() => router.push('/admin/ops/history')}>
                                        Run History
                                    </Button>
                                    <Button icon={<InboxOutlined />} onClick={() => router.push('/admin/notifications/inbox')}>
                                        Notification Inbox
                                    </Button>
                                </Space>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* Row 3: Activity Timeline */}
                <Row gutter={[16, 16]}>
                    <Col xs={24}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                            <Card title={<Space><ClockCircleOutlined /> Recent Activity</Space>} size="small" style={glass}>
                                {activityItems.length === 0 ? (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No recent activity" />
                                ) : (
                                    <Timeline
                                        mode="left"
                                        items={activityItems.map(item => ({
                                            color: item.color,
                                            dot: item.icon,
                                            children: (
                                                <div>
                                                    <Space size={8}>
                                                        <Tag color={item.type === 'run' ? 'blue' : 'purple'} style={{ fontSize: 10 }}>
                                                            {item.type === 'run' ? 'OPS RUN' : 'NOTIFICATION'}
                                                        </Tag>
                                                        <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(item.time).fromNow()}</Text>
                                                    </Space>
                                                    <div><Text strong style={{ fontSize: 13 }}>{item.title}</Text></div>
                                                    <Text type="secondary" style={{ fontSize: 11 }}>{item.desc}</Text>
                                                </div>
                                            ),
                                        }))}
                                    />
                                )}
                            </Card>
                        </motion.div>
                    </Col>
                </Row>
            </Spin>
        </CMSLayout>
    );
}

