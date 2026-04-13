"use client";

import React, { useState, useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProCard } from "@ant-design/pro-components";
import { Row, Col, Statistic, Tag, Table, Space, Progress, message, Typography, Badge, Tooltip, Card, Timeline } from "antd";
import {
    AlertOutlined, CheckCircleOutlined, ClockCircleOutlined,
    ExclamationCircleOutlined, TeamOutlined, ThunderboltOutlined,
    WarningOutlined, CustomerServiceOutlined,
    FileTextOutlined, BugOutlined, SyncOutlined, BookOutlined,
    RocketOutlined, AppstoreOutlined, ClusterOutlined,
    SendOutlined, SafetyOutlined, FieldTimeOutlined,
    CloudUploadOutlined, DashboardOutlined,
    ArrowUpOutlined, ArrowDownOutlined,
    NodeIndexOutlined, AimOutlined,
} from "@ant-design/icons";
import { gql } from "@/lib/graphql";
import { supaRest } from "@/lib/supaRest";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Title, Text } = Typography;

const GET_STATS = `query { itsmDashboardStats { totalOpen totalUnassigned totalSlaBreach avgResolutionHours slaCompliance totalTickets byCritical byHigh byMedium byLow statusNew statusOpen statusInProgress statusPending statusResolved statusClosed } }`;
const GET_MODULE_COUNTS = `query { itsmModuleCounts { serviceRequests { total open } problems { total open knownErrors } changes { total open } knowledge { total published } } }`;
const GET_RECENT = `query { itsmTickets { id ticketNumber title priority status reporterName assignedTo createdAt slaResolutionDue } }`;

const priorityColors: Record<string, string> = { critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a' };
const statusColors: Record<string, string> = { new: 'blue', open: 'cyan', in_progress: 'geekblue', pending: 'orange', resolved: 'green', closed: 'default' };

export default function ItsmDashboardPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [stats, setStats] = useState<any>(null);
    const { themeColor } = usePreferencesStore();
    const [modules, setModules] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // ITIL v4 module data
    const [cmdbCount, setCmdbCount] = useState(0);
    const [eventsData, setEventsData] = useState<any[]>([]);
    const [releasesData, setReleasesData] = useState<any[]>([]);
    const [agentsData, setAgentsData] = useState<any[]>([]);
    const [continuityData, setContinuityData] = useState<any[]>([]);
    const [availData, setAvailData] = useState<any[]>([]);
    const [deploymentsData, setDeploymentsData] = useState<any[]>([]);
    const [ciRelCount, setCiRelCount] = useState(0);

    useEffect(() => {
        (async () => {
            try {
                const [s, m, t] = await Promise.all([gql(GET_STATS), gql(GET_MODULE_COUNTS), gql(GET_RECENT)]);
                setStats(s.itsmDashboardStats);
                setModules(m.itsmModuleCounts);
                setTickets((t.itsmTickets || []).slice(0, 8));
                // Load ITIL v4 data
                const [cis, ciRels, events, releases, agents, conts, avails, deps] = await Promise.all([
                    supaRest('itsm_configuration_items', { select: 'id,ci_number,name,ci_class,status,criticality' }),
                    supaRest('itsm_ci_relationships', { select: 'id' }),
                    supaRest('itsm_events', { select: 'id,event_number,title,severity,status,source,occurred_at', order: 'occurred_at.desc' }),
                    supaRest('itsm_releases', { select: 'id,release_number,title,version,status,release_type,planned_start' }),
                    supaRest('itsm_agents', { select: 'id,name,agent_code,status,role,current_ticket_count,max_tickets,customer_satisfaction_score,sla_compliance_pct,total_tickets_resolved' }),
                    supaRest('itsm_continuity_plans', { select: 'id,plan_number,title,plan_type,status,rto_hours,last_test_result' }),
                    supaRest('itsm_availability_records', { select: 'id,availability_pct,sla_target_pct,uptime_minutes,downtime_minutes,incident_count' }),
                    supaRest('itsm_deployments', { select: 'id,deployment_number,title,status,environment,deployment_type,validation_result,actual_start', order: 'created_at.desc' }),
                ]);
                setCmdbCount(cis.length);
                setCiRelCount(ciRels.length);
                setEventsData(events);
                setReleasesData(releases);
                setAgentsData(agents);
                setContinuityData(conts);
                setAvailData(avails);
                setDeploymentsData(deps);
            } catch (err: any) { messageApi.error(err.message); }
            finally { setLoading(false); }
        })();
    }, [messageApi]);

    // Computed stats
    const critEvents = eventsData.filter(e => (e.severity === 'critical' || e.severity === 'high') && e.status !== 'closed').length;
    const openEvents = eventsData.filter(e => e.status !== 'closed').length;
    const activeAgents = agentsData.filter(a => a.status === 'active').length;
    const avgCsat = activeAgents > 0 ? +(agentsData.filter(a => a.status === 'active').reduce((s, a) => s + (a.customer_satisfaction_score || 0), 0) / activeAgents).toFixed(1) : 0;
    const avgSla = activeAgents > 0 ? +(agentsData.filter(a => a.status === 'active').reduce((s, a) => s + (a.sla_compliance_pct || 0), 0) / activeAgents).toFixed(1) : 0;
    const totalResolved = agentsData.reduce((s, a) => s + (a.total_tickets_resolved || 0), 0);
    const avgUtil = activeAgents > 0 ? Math.round(agentsData.filter(a => a.status === 'active').reduce((s, a) => s + ((a.current_ticket_count || 0) / (a.max_tickets || 10) * 100), 0) / activeAgents) : 0;
    const avgAvail = availData.length > 0 ? +(availData.reduce((s, r) => s + (r.availability_pct || 0), 0) / availData.length).toFixed(2) : 0;
    const activeReleases = releasesData.filter(r => !['deployed', 'cancelled', 'rolled_back'].includes(r.status)).length;
    const activePlans = continuityData.filter(p => p.status === 'active').length;
    const completedDeps = deploymentsData.filter(d => d.status === 'completed').length;

    const ticketCols = [
        { title: '#', dataIndex: 'ticketNumber', width: 100, render: (v: any) => <Tag color="purple" style={{ fontFamily: 'monospace' }}>{v}</Tag> },
        { title: 'Title', dataIndex: 'title', ellipsis: true },
        { title: 'Priority', dataIndex: 'priority', width: 90, render: (v: any) => <Tag color={priorityColors[v]}>{(v || '').toUpperCase()}</Tag> },
        { title: 'Status', dataIndex: 'status', width: 110, render: (v: any) => <Tag color={statusColors[v]}>{(v || '').replace('_', ' ').toUpperCase()}</Tag> },
        { title: 'Assigned', dataIndex: 'assignedTo', width: 120, ellipsis: true, render: (v: any) => v || <Text type="secondary">Unassigned</Text> },
        { title: 'SLA', dataIndex: 'slaResolutionDue', width: 90, render: (v: any) => { if (!v) return '-'; return new Date(v) > new Date() ? <Tag color="green">OK</Tag> : <Tag color="red">Breach</Tag>; } },
    ];

    const sevColors: Record<string, string> = { critical: 'red', high: 'orange', medium: 'blue', low: 'green', informational: 'default' };
    const evtStatusColors: Record<string, string> = { new: 'blue', acknowledged: 'cyan', escalated: 'red', closed: 'default' };

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>ITSM Dashboard</AuroraText>}
            subTitle={<DecryptedText text="IT Service Management — Full ITIL v4 Overview" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div style={{ padding: 24 }}>
            {contextHolder}
            <Space align="center" style={{ marginBottom: 24 }}>
                <DashboardOutlined style={{ fontSize: 28, color: themeColor }} />
                <Title level={3} style={{ margin: 0 }}>ITSM Command Center</Title>
                <Tag color="purple">ITIL v4</Tag>
            </Space>

            {/* ══════ ROW 1: Core ITSM Modules (clickable) ══════ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered hoverable style={{ borderLeft: `4px solid ${themeColor}`, cursor: 'pointer' }} onClick={() => window.location.href = '/admin/itsm/tickets'}>
                        <Statistic title={<Space><AlertOutlined style={{ color: themeColor }} /> Incidents</Space>} value={stats?.totalOpen || 0} suffix={<Text type="secondary" style={{ fontSize: 12 }}>/ {stats?.totalTickets || 0}</Text>} loading={loading} />
                        <div style={{ marginTop: 8 }}>
                            {stats?.totalSlaBreach > 0 && <Tag color="red" icon={<WarningOutlined />}>{stats.totalSlaBreach} SLA Breach</Tag>}
                            {stats?.totalUnassigned > 0 && <Tag color="orange">{stats.totalUnassigned} Unassigned</Tag>}
                        </div>
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered hoverable style={{ borderLeft: '4px solid #1890ff', cursor: 'pointer' }} onClick={() => window.location.href = '/admin/itsm/requests'}>
                        <Statistic title={<Space><FileTextOutlined style={{ color: '#1890ff' }} /> Service Requests</Space>} value={modules?.serviceRequests?.open || 0} suffix={<Text type="secondary" style={{ fontSize: 12 }}>/ {modules?.serviceRequests?.total || 0}</Text>} loading={loading} />
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered hoverable style={{ borderLeft: '4px solid #fa8c16', cursor: 'pointer' }} onClick={() => window.location.href = '/admin/itsm/problems'}>
                        <Statistic title={<Space><BugOutlined style={{ color: '#fa8c16' }} /> Problems</Space>} value={modules?.problems?.open || 0} suffix={<Text type="secondary" style={{ fontSize: 12 }}>/ {modules?.problems?.total || 0}</Text>} loading={loading} />
                        {(modules?.problems?.knownErrors || 0) > 0 && <Tag color="volcano" style={{ marginTop: 4 }}>{modules.problems.knownErrors} Known Errors</Tag>}
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered hoverable style={{ borderLeft: '4px solid #52c41a', cursor: 'pointer' }} onClick={() => window.location.href = '/admin/itsm/changes'}>
                        <Statistic title={<Space><SyncOutlined style={{ color: '#52c41a' }} /> Changes</Space>} value={modules?.changes?.open || 0} suffix={<Text type="secondary" style={{ fontSize: 12 }}>/ {modules?.changes?.total || 0}</Text>} loading={loading} />
                    </ProCard>
                </Col>
            </Row>

            {/* ══════ ROW 2: ITIL v4 Modules ══════ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={4}>
                    <ProCard bordered hoverable size="small" style={{ borderTop: `3px solid ${themeColor}`, cursor: 'pointer', textAlign: 'center' }} onClick={() => window.location.href = '/admin/itsm/cmdb'}>
                        <ClusterOutlined style={{ fontSize: 24, color: themeColor }} />
                        <Statistic title="CMDB" value={cmdbCount} valueStyle={{ fontSize: 20 }} loading={loading} />
                        <Text type="secondary" style={{ fontSize: 11 }}>CIs · {ciRelCount} Links</Text>
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={4}>
                    <ProCard bordered hoverable size="small" style={{ borderTop: `3px solid ${critEvents > 0 ? '#f5222d' : '#52c41a'}`, cursor: 'pointer', textAlign: 'center' }} onClick={() => window.location.href = '/admin/itsm/events'}>
                        <ThunderboltOutlined style={{ fontSize: 24, color: critEvents > 0 ? '#f5222d' : '#52c41a' }} />
                        <Statistic title="Events" value={openEvents} valueStyle={{ fontSize: 20, color: critEvents > 0 ? '#f5222d' : undefined }} loading={loading} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{critEvents > 0 ? <Text type="danger">{critEvents} Critical</Text> : 'All Clear'}</Text>
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={4}>
                    <ProCard bordered hoverable size="small" style={{ borderTop: '3px solid #9254de', cursor: 'pointer', textAlign: 'center' }} onClick={() => window.location.href = '/admin/itsm/releases'}>
                        <RocketOutlined style={{ fontSize: 24, color: '#9254de' }} />
                        <Statistic title="Releases" value={activeReleases} valueStyle={{ fontSize: 20 }} loading={loading} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{releasesData.length} Total</Text>
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={4}>
                    <ProCard bordered hoverable size="small" style={{ borderTop: '3px solid #13c2c2', cursor: 'pointer', textAlign: 'center' }} onClick={() => window.location.href = '/admin/itsm/agents'}>
                        <TeamOutlined style={{ fontSize: 24, color: '#13c2c2' }} />
                        <Statistic title="Agents" value={activeAgents} valueStyle={{ fontSize: 20 }} loading={loading} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{avgUtil}% Utilized</Text>
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={4}>
                    <ProCard bordered hoverable size="small" style={{ borderTop: '3px solid #f5222d', cursor: 'pointer', textAlign: 'center' }} onClick={() => window.location.href = '/admin/itsm/continuity'}>
                        <SafetyOutlined style={{ fontSize: 24, color: '#f5222d' }} />
                        <Statistic title="Continuity" value={activePlans} valueStyle={{ fontSize: 20 }} loading={loading} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{continuityData.length} Plans</Text>
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={4}>
                    <ProCard bordered hoverable size="small" style={{ borderTop: `3px solid ${avgAvail >= 99.9 ? '#52c41a' : '#fa8c16'}`, cursor: 'pointer', textAlign: 'center' }} onClick={() => window.location.href = '/admin/itsm/availability'}>
                        <FieldTimeOutlined style={{ fontSize: 24, color: avgAvail >= 99.9 ? '#52c41a' : '#fa8c16' }} />
                        <Statistic title="Availability" value={avgAvail || '-'} suffix="%" valueStyle={{ fontSize: 20, color: avgAvail >= 99.9 ? '#52c41a' : '#fa8c16' }} loading={loading} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{availData.length} Records</Text>
                    </ProCard>
                </Col>
            </Row>

            {/* ══════ ROW 3: Key Performance Indicators ══════ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><AimOutlined /> SLA Compliance</Space>} bordered loading={loading}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 180 }}>
                            <Progress
                                type="dashboard"
                                percent={stats?.slaCompliance || 0}
                                strokeColor={(stats?.slaCompliance || 100) >= 90 ? '#52c41a' : (stats?.slaCompliance || 100) >= 70 ? '#fa8c16' : '#f5222d'}
                                format={(pct) => <div style={{ textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 700 }}>{pct}%</div><div style={{ fontSize: 11, color: '#999' }}>SLA Target</div></div>}
                                size={160}
                            />
                        </div>
                        <Row gutter={16} style={{ textAlign: 'center', marginTop: 8 }}>
                            <Col span={8}><Statistic title="CSAT" value={avgCsat} valueStyle={{ fontSize: 16, color: avgCsat >= 4.5 ? '#52c41a' : '#fa8c16' }} prefix="⭐" /></Col>
                            <Col span={8}><Statistic title="Agent SLA" value={avgSla} suffix="%" valueStyle={{ fontSize: 16, color: avgSla >= 95 ? '#52c41a' : '#fa8c16' }} /></Col>
                            <Col span={8}><Statistic title="Resolved" value={totalResolved} valueStyle={{ fontSize: 16, color: themeColor }} /></Col>
                        </Row>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><ThunderboltOutlined /> Priority Breakdown</Space>} bordered loading={loading}>
                        <Space direction="vertical" style={{ width: '100%' }} size={12}>
                            {[
                                { label: 'Critical', key: 'byCritical', color: '#f5222d', icon: '🔴' },
                                { label: 'High', key: 'byHigh', color: '#fa8c16', icon: '🟠' },
                                { label: 'Medium', key: 'byMedium', color: '#1890ff', icon: '🔵' },
                                { label: 'Low', key: 'byLow', color: '#52c41a', icon: '🟢' },
                            ].map(p => (
                                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>{p.icon}</span>
                                    <Text style={{ width: 55, fontSize: 13 }}>{p.label}</Text>
                                    <Progress percent={stats?.totalOpen ? Math.round((stats[p.key] / stats.totalOpen) * 100) : 0} strokeColor={p.color} format={() => <Text strong>{stats?.[p.key] || 0}</Text>} style={{ flex: 1 }} size="small" />
                                </div>
                            ))}
                        </Space>
                        <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 16, paddingTop: 12 }}>
                            <Row>
                                {[
                                    { label: 'New', key: 'statusNew', color: 'blue' },
                                    { label: 'Open', key: 'statusOpen', color: 'cyan' },
                                    { label: 'Progress', key: 'statusInProgress', color: 'geekblue' },
                                    { label: 'Pending', key: 'statusPending', color: 'orange' },
                                    { label: 'Resolved', key: 'statusResolved', color: 'green' },
                                ].map(s => (
                                    <Col span={4} key={s.key} style={{ textAlign: 'center' }}>
                                        <Tag color={s.color} style={{ fontSize: 10, padding: '0 4px' }}>{stats?.[s.key] || 0}</Tag>
                                        <div style={{ fontSize: 9, color: '#999', marginTop: 2 }}>{s.label}</div>
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><CloudUploadOutlined /> Deployments & Releases</Space>} bordered loading={loading}>
                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                            {deploymentsData.slice(0, 4).map(d => {
                                const sColors: Record<string, string> = { planned: 'blue', in_progress: 'orange', completed: 'green', failed: 'red', rolled_back: 'volcano' };
                                const eColors: Record<string, string> = { production: 'red', staging: 'orange', development: 'blue' };
                                return (
                                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                                        <div>
                                            <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 11 }}>{d.deployment_number}</Tag>
                                            <Text style={{ fontSize: 12 }}>{d.title?.substring(0, 28)}{d.title?.length > 28 ? '...' : ''}</Text>
                                        </div>
                                        <Space size={4}>
                                            <Tag color={eColors[d.environment]} style={{ fontSize: 10 }}>{d.environment?.toUpperCase()}</Tag>
                                            <Tag color={sColors[d.status]} style={{ fontSize: 10 }}>{d.status?.replace(/_/g, ' ').toUpperCase()}</Tag>
                                        </Space>
                                    </div>
                                );
                            })}
                            {deploymentsData.length === 0 && <Text type="secondary">No deployments yet</Text>}
                        </Space>
                        <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 12, paddingTop: 8, textAlign: 'center' }}>
                            <Space size={16}>
                                <Statistic title="Completed" value={completedDeps} valueStyle={{ fontSize: 14, color: '#52c41a' }} />
                                <Statistic title="Active Releases" value={activeReleases} valueStyle={{ fontSize: 14, color: themeColor }} />
                            </Space>
                        </div>
                    </ProCard>
                </Col>
            </Row>

            {/* ══════ ROW 4: Event Monitor + Agent Utilization ══════ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={12}>
                    <ProCard title={<Space><ThunderboltOutlined style={{ color: critEvents > 0 ? '#f5222d' : '#52c41a' }} /> Live Events <Badge count={openEvents} style={{ backgroundColor: critEvents > 0 ? '#f5222d' : '#1890ff' }} /></Space>} bordered extra={<a href="/admin/itsm/events">View All</a>}>
                        <Space direction="vertical" style={{ width: '100%' }} size={4}>
                            {eventsData.slice(0, 6).map(ev => (
                                <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
                                    <Space size={8}>
                                        <Badge color={sevColors[ev.severity] === 'default' ? '#bfbfbf' : sevColors[ev.severity]} />
                                        <Text style={{ fontSize: 12 }}>{ev.title?.substring(0, 40)}{ev.title?.length > 40 ? '...' : ''}</Text>
                                    </Space>
                                    <Space size={4}>
                                        <Tag style={{ fontSize: 10 }}>{ev.source}</Tag>
                                        <Tag color={evtStatusColors[ev.status]} style={{ fontSize: 10 }}>{ev.status}</Tag>
                                    </Space>
                                </div>
                            ))}
                            {eventsData.length === 0 && <Text type="secondary">No events</Text>}
                        </Space>
                    </ProCard>
                </Col>
                <Col xs={24} md={12}>
                    <ProCard title={<Space><TeamOutlined style={{ color: '#13c2c2' }} /> Agent Workload</Space>} bordered extra={<a href="/admin/itsm/agents">Manage</a>}>
                        <Space direction="vertical" style={{ width: '100%' }} size={6}>
                            {agentsData.filter(a => a.status === 'active').map(a => {
                                const pct = a.max_tickets > 0 ? Math.round((a.current_ticket_count / a.max_tickets) * 100) : 0;
                                return (
                                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Text style={{ width: 120, fontSize: 12 }}>{a.name}</Text>
                                        <Progress percent={pct} size="small" style={{ flex: 1 }} status={pct > 80 ? 'exception' : pct > 60 ? 'active' : 'success'} format={() => `${a.current_ticket_count}/${a.max_tickets}`} />
                                        <Tag color={a.customer_satisfaction_score >= 4.5 ? 'green' : a.customer_satisfaction_score >= 4 ? 'blue' : 'orange'} style={{ fontSize: 10 }}>⭐{a.customer_satisfaction_score}</Tag>
                                    </div>
                                );
                            })}
                            {activeAgents === 0 && <Text type="secondary">No active agents</Text>}
                        </Space>
                    </ProCard>
                </Col>
            </Row>

            {/* ══════ ROW 5: Continuity + Knowledge + Availability ══════ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><SafetyOutlined style={{ color: '#f5222d' }} /> Continuity Plans</Space>} bordered extra={<a href="/admin/itsm/continuity">View</a>} size="small">
                        {continuityData.map(p => {
                            const tColors: Record<string, string> = { bcp: 'blue', drp: 'red', crisis: 'volcano', itrp: 'purple' };
                            return (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                                    <Space size={4}>
                                        <Tag color={tColors[p.plan_type]} style={{ fontSize: 10 }}>{p.plan_type?.toUpperCase()}</Tag>
                                        <Text style={{ fontSize: 12 }}>{p.title?.substring(0, 25)}{p.title?.length > 25 ? '...' : ''}</Text>
                                    </Space>
                                    <Space size={4}>
                                        <Tag style={{ fontSize: 10 }}>RTO: {p.rto_hours}h</Tag>
                                        <Tag color={p.last_test_result === 'passed' ? 'green' : p.last_test_result === 'failed' ? 'red' : 'default'} style={{ fontSize: 10 }}>{p.last_test_result || 'Untested'}</Tag>
                                    </Space>
                                </div>
                            );
                        })}
                        {continuityData.length === 0 && <Text type="secondary">No plans</Text>}
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><BookOutlined style={{ color: '#2f54eb' }} /> Knowledge Base</Space>} bordered extra={<a href="/admin/itsm/knowledge">View</a>} size="small">
                        <Row gutter={16} style={{ textAlign: 'center', paddingTop: 12 }}>
                            <Col span={12}><Statistic title="Published" value={modules?.knowledge?.published || 0} valueStyle={{ color: '#52c41a' }} loading={loading} /></Col>
                            <Col span={12}><Statistic title="Total" value={modules?.knowledge?.total || 0} valueStyle={{ color: '#1890ff' }} loading={loading} /></Col>
                        </Row>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><FieldTimeOutlined style={{ color: avgAvail >= 99.9 ? '#52c41a' : '#fa8c16' }} /> Availability Summary</Space>} bordered extra={<a href="/admin/itsm/availability">View</a>} size="small">
                        <div style={{ textAlign: 'center', padding: '8px 0' }}>
                            <Progress type="circle" percent={Math.min(+avgAvail, 100)} size={80} strokeColor={avgAvail >= 99.9 ? '#52c41a' : avgAvail >= 99.0 ? '#fa8c16' : '#f5222d'} format={() => `${avgAvail}%`} />
                        </div>
                        <Row gutter={8} style={{ textAlign: 'center', marginTop: 8 }}>
                            <Col span={8}><Text style={{ fontSize: 11 }}>Records<br /><Text strong>{availData.length}</Text></Text></Col>
                            <Col span={8}><Text style={{ fontSize: 11 }}>Incidents<br /><Text strong type="danger">{availData.reduce((s, r) => s + (r.incident_count || 0), 0)}</Text></Text></Col>
                            <Col span={8}><Text style={{ fontSize: 11 }}>Downtime<br /><Text strong>{availData.reduce((s, r) => s + (r.downtime_minutes || 0), 0)}m</Text></Text></Col>
                        </Row>
                    </ProCard>
                </Col>
            </Row>

            {/* ══════ ROW 6: Recent Tickets ══════ */}
            <ProCard title={<Space><AlertOutlined /> Recent Incidents</Space>} bordered extra={<a href="/admin/itsm/tickets">View All</a>}>
                <Table dataSource={tickets} columns={ticketCols} rowKey="id" pagination={false} size="small" loading={loading} />
            </ProCard>
        </div>
        </CMSLayout>
    );
}
