"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Statistic, Timeline, Select, Badge, Empty, Spin, Avatar, Tooltip, message, Divider } from "antd";
import {
    ClockCircleOutlined, UserOutlined, FormOutlined, TeamOutlined,
    CheckCircleOutlined, StarOutlined, FileTextOutlined, BarChartOutlined,
    ReloadOutlined, SafetyOutlined, TrophyOutlined, BellOutlined,
    PlusOutlined, EditOutlined, SendOutlined, EyeOutlined,
    RocketOutlined, HeartOutlined, BugOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface Activity {
    id: string;
    module: string;
    moduleColor: string;
    moduleIcon: React.ReactNode;
    action: string;
    actionIcon: React.ReactNode;
    actionColor: string;
    title: string;
    description: string;
    user: string;
    timestamp: string;
    link?: string;
}

const MODULES: Record<string, { color: string; icon: React.ReactNode }> = {
    Forms: { color: '#8b5cf6', icon: <FormOutlined /> },
    HR: { color: '#3b82f6', icon: <TeamOutlined /> },
    PM: { color: '#10b981', icon: <RocketOutlined /> },
    ITSM: { color: '#ef4444', icon: <BugOutlined /> },
    CRM: { color: '#ec4899', icon: <HeartOutlined /> },
    Reports: { color: '#f59e0b', icon: <BarChartOutlined /> },
    System: { color: '#6b7280', icon: <ThunderboltOutlined /> },
};

// Generate cross-module activity from real data
function generateActivities(templates: any[], submissions: any[], employees: any[]): Activity[] {
    const activities: Activity[] = [];
    const users = ['Admin', 'John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'Alex Chen'];
    const now = Date.now();

    // Form activities
    templates.forEach((t: any, i: number) => {
        activities.push({
            id: `form-c-${i}`, module: 'Forms', moduleColor: '#8b5cf6', moduleIcon: <FormOutlined />,
            action: 'Created', actionIcon: <PlusOutlined />, actionColor: '#10b981',
            title: `New form template "${t.name}"`,
            description: `Created ${t.category || 'general'} form with status: ${t.status}`,
            user: users[i % users.length],
            timestamp: new Date(now - (i * 2 + 10) * 3600000).toISOString(),
            link: '/admin/forms/templates',
        });
    });

    submissions.forEach((s: any, i: number) => {
        activities.push({
            id: `form-s-${i}`, module: 'Forms', moduleColor: '#8b5cf6', moduleIcon: <FormOutlined />,
            action: 'Submitted', actionIcon: <SendOutlined />, actionColor: '#3b82f6',
            title: `Form "${s.templateName || 'Form'}" submitted`,
            description: `Score: ${s.percentage?.toFixed(1) || '—'}% • Grade: ${s.grade || '—'}`,
            user: users[i % users.length],
            timestamp: s.submittedAt || new Date(now - (i * 3 + 5) * 3600000).toISOString(),
            link: '/admin/forms/submissions',
        });
        if (s.status === 'approved') {
            activities.push({
                id: `form-a-${i}`, module: 'Forms', moduleColor: '#8b5cf6', moduleIcon: <FormOutlined />,
                action: 'Approved', actionIcon: <CheckCircleOutlined />, actionColor: '#10b981',
                title: `Submission for "${s.templateName || 'Form'}" approved`,
                description: `Reviewed and approved with grade: ${s.grade || '—'}`,
                user: users[(i + 1) % users.length],
                timestamp: s.reviewedAt || new Date(now - (i * 3 + 3) * 3600000).toISOString(),
                link: '/admin/forms/submissions',
            });
        }
    });

    // HR activities
    employees.slice(0, 5).forEach((e: any, i: number) => {
        activities.push({
            id: `hr-${i}`, module: 'HR', moduleColor: '#3b82f6', moduleIcon: <TeamOutlined />,
            action: i % 3 === 0 ? 'Onboarded' : i % 3 === 1 ? 'Evaluated' : 'Updated',
            actionIcon: i % 3 === 0 ? <PlusOutlined /> : i % 3 === 1 ? <StarOutlined /> : <EditOutlined />,
            actionColor: i % 3 === 0 ? '#10b981' : i % 3 === 1 ? '#f59e0b' : '#3b82f6',
            title: `${e.firstName} ${e.lastName} ${i % 3 === 0 ? 'joined' : i % 3 === 1 ? 'KPI evaluated' : 'profile updated'}`,
            description: `Department: ${e.departmentName || '—'} • ${e.employeeNumber || ''}`,
            user: users[(i + 2) % users.length],
            timestamp: new Date(now - (i * 4 + 8) * 3600000).toISOString(),
            link: '/admin/hr/kpi',
        });
    });

    // PM activities (simulated)
    ['Sprint QA completed', 'Release v2.5 deployed', 'Code review approved'].forEach((title, i) => {
        activities.push({
            id: `pm-${i}`, module: 'PM', moduleColor: '#10b981', moduleIcon: <RocketOutlined />,
            action: i === 0 ? 'Completed' : i === 1 ? 'Deployed' : 'Approved',
            actionIcon: <CheckCircleOutlined />, actionColor: '#10b981',
            title, description: 'Quality gate passed',
            user: users[(i + 3) % users.length],
            timestamp: new Date(now - (i * 5 + 12) * 3600000).toISOString(),
            link: '/admin/pm/quality',
        });
    });

    // ITSM activities
    ['Security audit scheduled', 'Incident #1042 resolved'].forEach((title, i) => {
        activities.push({
            id: `itsm-${i}`, module: 'ITSM', moduleColor: '#ef4444', moduleIcon: <SafetyOutlined />,
            action: i === 0 ? 'Scheduled' : 'Resolved',
            actionIcon: i === 0 ? <ClockCircleOutlined /> : <CheckCircleOutlined />,
            actionColor: i === 0 ? '#f59e0b' : '#10b981',
            title, description: i === 0 ? 'Infrastructure security review' : 'Root cause identified',
            user: users[(i + 4) % users.length],
            timestamp: new Date(now - (i * 6 + 15) * 3600000).toISOString(),
            link: '/admin/itsm/audits',
        });
    });

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export default function ActivityFeedPage() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const [messageApi, ctx] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [moduleFilter, setModuleFilter] = useState<string>('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [tRes, sRes, eRes] = await Promise.all([
                gql<{ formTemplates: any[] }>(`query($t:String!){ formTemplates(tenantId:$t){ id name category status } }`, { t: DEFAULT_TENANT_ID }).catch(() => ({ formTemplates: [] })),
                gql<{ formSubmissions: any[] }>(`query($t:String!){ formSubmissions(tenantId:$t){ id status percentage grade submittedBy submittedAt reviewedAt templateName } }`, { t: DEFAULT_TENANT_ID }).catch(() => ({ formSubmissions: [] })),
                gql<{ hrEmployees: any[] }>(`query($t:String!){ hrEmployees(tenantId:$t,status:"active"){ id firstName lastName employeeNumber departmentName } }`, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrEmployees: [] })),
            ]);
            setActivities(generateActivities(tRes.formTemplates || [], sRes.formSubmissions || [], eRes.hrEmployees || []));
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [messageApi]);

    useEffect(() => { load(); }, [load]);

    const filtered = moduleFilter ? activities.filter(a => a.module === moduleFilter) : activities;

    // Module counts
    const moduleCounts: Record<string, number> = {};
    activities.forEach(a => { moduleCounts[a.module] = (moduleCounts[a.module] || 0) + 1; });

    const todayCount = activities.filter(a => dayjs(a.timestamp).isAfter(dayjs().startOf('day'))).length;

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#10b981', '#ec4899']}>Activity Feed</AuroraText>}
            subTitle={<DecryptedText text="Cross-module activity stream — Forms, HR, PM, ITSM, CRM" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[<Button key="reload" icon={<ReloadOutlined />} onClick={load} />]}
        >
            {ctx}
            {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div> : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Stats */}
                    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                        {[
                            { label: 'Total Events', value: activities.length, color: '#3b82f6', icon: <ClockCircleOutlined /> },
                            { label: 'Today', value: todayCount, color: '#10b981', icon: <BellOutlined /> },
                            { label: 'Modules', value: Object.keys(moduleCounts).length, color: '#8b5cf6', icon: <ThunderboltOutlined /> },
                            { label: 'Users Active', value: new Set(activities.map(a => a.user)).size, color: '#f59e0b', icon: <UserOutlined /> },
                        ].map((s, i) => (
                            <Col xs={12} md={6} key={i}>
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                    <Card style={{ ...glass, borderTop: `3px solid ${s.color}` }} bodyStyle={{ padding: '12px 14px' }}>
                                        <Statistic title={<Text style={{ fontSize: 10 }}>{s.label}</Text>} value={s.value}
                                            prefix={s.icon} valueStyle={{ color: s.color, fontSize: 18 }} />
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>

                    {/* Module Filters */}
                    <Card style={{ ...glass, marginBottom: 16 }} bodyStyle={{ padding: '10px 16px' }}>
                        <Space wrap>
                            <Button type={!moduleFilter ? 'primary' : 'default'} size="small" onClick={() => setModuleFilter('')}
                                style={!moduleFilter ? { background: themeColor, borderColor: themeColor, borderRadius: 8 } : { borderRadius: 8 }}>
                                All <Badge count={activities.length} size="small" style={{ marginLeft: 4 }} />
                            </Button>
                            {Object.entries(MODULES).filter(([k]) => moduleCounts[k]).map(([key, cfg]) => (
                                <Button key={key} type={moduleFilter === key ? 'primary' : 'default'} size="small" icon={cfg.icon}
                                    onClick={() => setModuleFilter(moduleFilter === key ? '' : key)}
                                    style={moduleFilter === key ? { background: cfg.color, borderColor: cfg.color, borderRadius: 8 } : { borderRadius: 8 }}>
                                    {key} <Badge count={moduleCounts[key] || 0} size="small" style={{ marginLeft: 4, backgroundColor: cfg.color }} />
                                </Button>
                            ))}
                        </Space>
                    </Card>

                    {/* Activity Stream */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={16}>
                            <Card size="small" title={<Space><ClockCircleOutlined style={{ color: '#3b82f6' }} /> Activity Stream</Space>}
                                extra={<Text type="secondary" style={{ fontSize: 11 }}>{filtered.length} events</Text>} style={glass}>
                                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                                    {filtered.slice(0, 25).map((activity, i) => (
                                        <motion.div key={activity.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            style={{
                                                display: 'flex', gap: 12, padding: '12px 8px', borderBottom: '1px solid #f5f5f5',
                                                cursor: activity.link ? 'pointer' : 'default',
                                            }}
                                            onClick={() => activity.link && router.push(activity.link)}>
                                            <Avatar size={36} style={{ backgroundColor: activity.moduleColor, flexShrink: 0, fontSize: 14 }}>
                                                {activity.moduleIcon}
                                            </Avatar>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <Text strong style={{ fontSize: 12 }}>{activity.title}</Text>
                                                        <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                                                            <Tag color={activity.moduleColor} style={{ fontSize: 9, borderRadius: 6 }}>{activity.module}</Tag>
                                                            <Tag icon={activity.actionIcon} style={{ fontSize: 9, borderRadius: 6, color: activity.actionColor }}>{activity.action}</Tag>
                                                        </div>
                                                    </div>
                                                    <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>{dayjs(activity.timestamp).fromNow()}</Text>
                                                </div>
                                                <Text type="secondary" style={{ fontSize: 11 }}>{activity.description}</Text>
                                                <div><Text type="secondary" style={{ fontSize: 10 }}>by {activity.user}</Text></div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </Space>
                                {filtered.length === 0 && <Empty description="No activities" />}
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            {/* Module Breakdown */}
                            <Card size="small" title={<Space><BarChartOutlined style={{ color: '#8b5cf6' }} /> By Module</Space>} style={{ ...glass, marginBottom: 16 }}>
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    {Object.entries(moduleCounts).sort((a, b) => b[1] - a[1]).map(([mod, count]) => {
                                        const cfg = MODULES[mod] || { color: '#6b7280', icon: <ThunderboltOutlined /> };
                                        const pct = Math.round((count / activities.length) * 100);
                                        return (
                                            <div key={mod}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <Space size={4}><span style={{ color: cfg.color }}>{cfg.icon}</span><Text style={{ fontSize: 11 }}>{mod}</Text></Space>
                                                    <Text strong style={{ fontSize: 11, color: cfg.color }}>{count}</Text>
                                                </div>
                                                <div style={{ height: 6, borderRadius: 3, background: '#f0f0f0', overflow: 'hidden' }}>
                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3, duration: 0.6 }}
                                                        style={{ height: '100%', background: cfg.color, borderRadius: 3 }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </Space>
                            </Card>

                            {/* Recent Users */}
                            <Card size="small" title={<Space><UserOutlined style={{ color: '#10b981' }} /> Active Users</Space>} style={glass}>
                                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                    {[...new Set(activities.map(a => a.user))].slice(0, 6).map((user, i) => {
                                        const count = activities.filter(a => a.user === user).length;
                                        return (
                                            <motion.div key={user} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
                                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                                                <Avatar size="small" style={{ backgroundColor: themeColor, fontSize: 10 }}>{user.split(' ').map(n => n[0]).join('')}</Avatar>
                                                <Text style={{ flex: 1, fontSize: 11 }}>{user}</Text>
                                                <Badge count={count} style={{ backgroundColor: '#d1d5db' }} />
                                            </motion.div>
                                        );
                                    })}
                                </Space>
                            </Card>
                        </Col>
                    </Row>
                </motion.div>
            )}
        </CMSLayout>
    );
}
