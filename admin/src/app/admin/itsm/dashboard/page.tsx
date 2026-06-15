"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import { ProCard } from "@ant-design/pro-components";
import { Row, Col, Statistic, Tag, Table, Space, Progress, message, Typography, Badge, Tabs, Descriptions, Modal } from "antd";
import {
    AlertOutlined, CheckCircleOutlined,
    TeamOutlined, ThunderboltOutlined,
    WarningOutlined,
    FileTextOutlined, BugOutlined, SyncOutlined, BookOutlined,
    RocketOutlined, ClusterOutlined,
    SafetyOutlined, FieldTimeOutlined,
    CloudUploadOutlined, DashboardOutlined,
    AimOutlined, LineChartOutlined,
    FundOutlined, PieChartOutlined,
    BarChartOutlined, RadarChartOutlined,
    NodeIndexOutlined, ApartmentOutlined,
} from "@ant-design/icons";
import { gql } from "@/lib/graphql";
import { supaRest } from "@/lib/supaRest";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import FormIntegrationWidget from "@/components/forms/FormIntegrationWidget";
import dynamic from "next/dynamic";
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import { AnimatedCircularProgressBar } from "@/components/magicui/animated-circular-progress-bar";

// ── Dynamic chart imports (SSR-safe) ──────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
const ChartLine: any = dynamic(() => import("@ant-design/charts").then((m: any) => m.Line), { ssr: false, loading: () => <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading chart…</div> });
const ChartPie: any = dynamic(() => import("@ant-design/charts").then((m: any) => m.Pie), { ssr: false, loading: () => <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading chart…</div> });
const ChartColumn: any = dynamic(() => import("@ant-design/charts").then((m: any) => m.Column), { ssr: false, loading: () => <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading chart…</div> });
const ChartArea: any = dynamic(() => import("@ant-design/charts").then((m: any) => m.Area), { ssr: false, loading: () => <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading chart…</div> });
const ChartRadar: any = dynamic(() => import("@ant-design/charts").then((m: any) => m.Radar), { ssr: false, loading: () => <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading chart…</div> });
const ChartGauge: any = dynamic(() => import("@ant-design/charts").then((m: any) => m.Gauge), { ssr: false, loading: () => <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading chart…</div> });
const ChartLiquid: any = dynamic(() => import("@ant-design/charts").then((m: any) => m.Liquid), { ssr: false, loading: () => <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading chart…</div> });
const NetworkGraph: any = dynamic(() => import("@ant-design/charts").then((m: any) => m.NetworkGraph), { ssr: false, loading: () => <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading network…</div> });

const { Title, Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const GET_STATS = `query { itsmDashboardStats { totalOpen totalUnassigned totalSlaBreach avgResolutionHours slaCompliance totalTickets byCritical byHigh byMedium byLow statusNew statusOpen statusInProgress statusPending statusResolved statusClosed } }`;
const GET_MODULE_COUNTS = `query { itsmModuleCounts { serviceRequests { total open } problems { total open knownErrors } changes { total open } knowledge { total published } } }`;
const GET_RECENT = `query { itsmTickets { id ticketNumber title priority status reporterName assignedTo createdAt slaResolutionDue } }`;

const priorityColors: Record<string, string> = { critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a' };
const statusColors: Record<string, string> = { new: 'blue', open: 'cyan', in_progress: 'geekblue', pending: 'orange', resolved: 'green', closed: 'default' };
const sevColors: Record<string, string> = { critical: 'red', high: 'orange', medium: 'blue', low: 'green', informational: 'default' };
const evtStatusColors: Record<string, string> = { new: 'blue', acknowledged: 'cyan', escalated: 'red', closed: 'default' };

export default function ItsmDashboardPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [stats, setStats] = useState<any>(null);
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const [modules, setModules] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [allTickets, setAllTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [cmdbCount, setCmdbCount] = useState(0);
    const [eventsData, setEventsData] = useState<any[]>([]);
    const [releasesData, setReleasesData] = useState<any[]>([]);
    const [agentsData, setAgentsData] = useState<any[]>([]);
    const [continuityData, setContinuityData] = useState<any[]>([]);
    const [availData, setAvailData] = useState<any[]>([]);
    const [deploymentsData, setDeploymentsData] = useState<any[]>([]);
    const [ciRelCount, setCiRelCount] = useState(0);
    const [knowledgeData, setKnowledgeData] = useState<any[]>([]);
    const [ciData, setCiData] = useState<any[]>([]);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [nodeModalOpen, setNodeModalOpen] = useState(false);
    const [stakeholdersData, setStakeholdersData] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const [s, m, t] = await Promise.all([gql(GET_STATS), gql(GET_MODULE_COUNTS), gql(GET_RECENT)]);
                setStats(s.itsmDashboardStats);
                setModules(m.itsmModuleCounts);
                const allTix = t.itsmTickets || [];
                setAllTickets(allTix);
                setTickets(allTix.slice(0, 8));
                const [cis, ciRels, events, releases, agents, conts, avails, deps, kbs, stakeholders] = await Promise.all([
                    supaRest('itsm_configuration_items', { select: 'id,ci_number,name,ci_class,status,criticality' }),
                    supaRest('itsm_ci_relationships', { select: 'id' }),
                    supaRest('itsm_events', { select: 'id,event_number,title,severity,status,source,occurred_at', order: 'occurred_at.desc' }),
                    supaRest('itsm_releases', { select: 'id,release_number,title,version,status,release_type,planned_start' }),
                    supaRest('itsm_agents', { select: 'id,name,agent_code,status,role,current_ticket_count,max_tickets,customer_satisfaction_score,sla_compliance_pct,total_tickets_resolved' }),
                    supaRest('itsm_continuity_plans', { select: 'id,plan_number,title,plan_type,status,rto_hours,rpo_hours,last_test_result,last_test_date' }),
                    supaRest('itsm_availability_records', { select: 'id,availability_pct,sla_target_pct,uptime_minutes,downtime_minutes,incident_count,period_start,period_end' }),
                    supaRest('itsm_deployments', { select: 'id,deployment_number,title,status,environment,deployment_type,validation_result,actual_start,created_at', order: 'created_at.desc' }),
                    supaRest('itsm_knowledge_articles', { select: 'id,title,status,category,view_count,helpful_count,created_at' }).catch(() => []),
                    supaRest('itsm_ticket_stakeholders', { select: 'id,ticket_id,stakeholder_name,stakeholder_email,stakeholder_type,role_description,agent_id' }).catch(() => []),
                ]);
                setCmdbCount(cis.length);
                setCiData(cis);
                setCiRelCount(ciRels.length);
                setEventsData(events);
                setReleasesData(releases);
                setAgentsData(agents);
                setContinuityData(conts);
                setAvailData(avails);
                setDeploymentsData(deps);
                setKnowledgeData(kbs);
                setStakeholdersData(stakeholders);
            } catch (err: any) { messageApi.error(err.message); }
            finally { setLoading(false); }
        })();
    }, [messageApi]);

    // ── Computed stats ──────────────────────────────────────
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

    // ── Table columns ──────────────────────────────────────
    const ticketCols = [
        { title: '#', dataIndex: 'ticketNumber', width: 100, render: (v: any) => <Tag color="purple" style={{ fontFamily: 'monospace' }}>{v}</Tag> },
        { title: 'Title', dataIndex: 'title', ellipsis: true },
        { title: 'Priority', dataIndex: 'priority', width: 90, render: (v: any) => <Tag color={priorityColors[v]}>{(v || '').toUpperCase()}</Tag> },
        { title: 'Status', dataIndex: 'status', width: 110, render: (v: any) => <Tag color={statusColors[v]}>{(v || '').replace('_', ' ').toUpperCase()}</Tag> },
        { title: 'Assigned', dataIndex: 'assignedTo', width: 120, ellipsis: true, render: (v: any) => v || <Text type="secondary">Unassigned</Text> },
        { title: 'SLA', dataIndex: 'slaResolutionDue', width: 90, render: (v: any) => { if (!v) return '-'; return new Date(v) > new Date() ? <Tag color="green">OK</Tag> : <Tag color="red">Breach</Tag>; } },
    ];

    // ═══════════════════════════════════════════════════════
    // TAB 1: OVERVIEW (existing dashboard content)
    // ═══════════════════════════════════════════════════════
    const overviewTab = (
        <>
            {/* ROW 1: Core ITSM Modules (BENTO GRID) */}
            <BentoGrid className="mb-4">
                <BentoGridItem
                    title="Active Incidents"
                    description={`${stats?.totalOpen || 0} open out of ${stats?.totalTickets || 0} total.`}
                    icon={<AlertOutlined />}
                    onClick={() => router.push('/admin/itsm/tickets')}
                    header={
                        <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }}>
                            <AnimatedCircularProgressBar
                                max={100}
                                min={0}
                                value={stats?.slaCompliance || 0}
                                gaugePrimaryColor={themeColor}
                                gaugeSecondaryColor="rgba(255,255,255,0.1)"
                                className="w-[80px] h-[80px]"
                            />
                            <div style={{ textAlign: 'center', fontSize: 10, marginTop: 4 }}>SLA Compliance</div>
                        </div>
                    }
                    className="col-span-3 lg:col-span-1"
                />
                <BentoGridItem
                    title="Service Requests"
                    description={`${modules?.serviceRequests?.open || 0} open requests awaiting action.`}
                    icon={<FileTextOutlined />}
                    onClick={() => router.push('/admin/itsm/requests')}
                    className="col-span-3 lg:col-span-1"
                />
                <BentoGridItem
                    title="Problem Management"
                    description={`${modules?.problems?.open || 0} active problems. ${modules?.problems?.knownErrors || 0} known errors.`}
                    icon={<BugOutlined />}
                    onClick={() => router.push('/admin/itsm/problems')}
                    className="col-span-3 lg:col-span-1"
                />
                <BentoGridItem
                    title="Change Control"
                    description={`${modules?.changes?.open || 0} pending changes requiring approval or scheduling.`}
                    icon={<SyncOutlined />}
                    onClick={() => router.push('/admin/itsm/changes')}
                    className="col-span-3 lg:col-span-1"
                />
            </BentoGrid>

            {/* ROW 2: ITIL v4 Modules */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'CMDB', value: cmdbCount, sub: `CIs · ${ciRelCount} Links`, icon: <ClusterOutlined />, color: themeColor, gradient: `linear-gradient(135deg, rgba(114,46,209,0.07) 0%, rgba(114,46,209,0.02) 100%)`, href: '/admin/itsm/cmdb' },
                    { title: 'Events', value: openEvents, sub: critEvents > 0 ? `${critEvents} Critical` : 'All Clear', icon: <ThunderboltOutlined />, color: critEvents > 0 ? '#f5222d' : '#52c41a', gradient: critEvents > 0 ? 'linear-gradient(135deg, rgba(245,34,45,0.07) 0%, rgba(245,34,45,0.02) 100%)' : 'linear-gradient(135deg, rgba(82,196,26,0.07) 0%, rgba(82,196,26,0.02) 100%)', href: '/admin/itsm/events', danger: critEvents > 0 },
                    { title: 'Releases', value: activeReleases, sub: `${releasesData.length} Total`, icon: <RocketOutlined />, color: '#9254de', gradient: 'linear-gradient(135deg, rgba(146,84,222,0.07) 0%, rgba(146,84,222,0.02) 100%)', href: '/admin/itsm/releases' },
                    { title: 'Agents', value: activeAgents, sub: `${avgUtil}% Utilized`, icon: <TeamOutlined />, color: '#13c2c2', gradient: 'linear-gradient(135deg, rgba(19,194,194,0.07) 0%, rgba(19,194,194,0.02) 100%)', href: '/admin/itsm/agents' },
                    { title: 'Continuity', value: activePlans, sub: `${continuityData.length} Plans`, icon: <SafetyOutlined />, color: '#f5222d', gradient: 'linear-gradient(135deg, rgba(245,34,45,0.07) 0%, rgba(250,140,22,0.02) 100%)', href: '/admin/itsm/continuity' },
                    { title: 'Availability', value: avgAvail || '-', sub: `${availData.length} Records`, icon: <FieldTimeOutlined />, color: avgAvail >= 99.9 ? '#52c41a' : '#fa8c16', gradient: avgAvail >= 99.9 ? 'linear-gradient(135deg, rgba(82,196,26,0.07) 0%, rgba(82,196,26,0.02) 100%)' : 'linear-gradient(135deg, rgba(250,140,22,0.07) 0%, rgba(250,140,22,0.02) 100%)', href: '/admin/itsm/availability', suffix: '%' },
                ].map(card => (
                    <Col xs={24} sm={12} md={4} key={card.title}>
                        <ProCard bordered hoverable size="small" style={{ background: card.gradient, borderTop: `3px solid ${card.color}`, cursor: 'pointer', borderRadius: 12, backdropFilter: 'blur(20px)', padding: 0 }} onClick={() => router.push(card.href)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 10,
                                    background: `${card.color}14`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                    border: `1px solid ${card.color}20`,
                                }}>
                                    <span style={{ fontSize: 22, color: card.color, lineHeight: 1 }}>{card.icon}</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: 1.2 }}>{card.title}</Text>
                                    <Text strong style={{ fontSize: 22, color: card.danger ? '#f5222d' : undefined, lineHeight: 1.2 }}>
                                        {loading ? '...' : card.value}{card.suffix ? <span style={{ fontSize: 13, fontWeight: 400 }}> {card.suffix}</span> : null}
                                    </Text>
                                    <Text type={card.danger ? 'danger' : 'secondary'} style={{ fontSize: 10, display: 'block', lineHeight: 1.3 }}>{card.sub}</Text>
                                </div>
                            </div>
                        </ProCard>
                    </Col>
                ))}
            </Row>

            {/* ROW 3: KPIs */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><AimOutlined style={{ color: themeColor }} /> SLA Compliance</Space>} bordered loading={loading} style={{ background: 'linear-gradient(135deg, rgba(82,196,26,0.05) 0%, rgba(24,144,255,0.03) 100%)', borderRadius: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 180 }}>
                            <Progress type="dashboard" percent={stats?.slaCompliance || 0} strokeColor={(stats?.slaCompliance || 100) >= 90 ? '#52c41a' : (stats?.slaCompliance || 100) >= 70 ? '#fa8c16' : '#f5222d'} format={(pct) => <div style={{ textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 700 }}>{pct}%</div><div style={{ fontSize: 11, color: '#999' }}>SLA Target</div></div>} size={160} />
                        </div>
                        <Row gutter={16} style={{ textAlign: 'center', marginTop: 8 }}>
                            <Col span={8}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="CSAT" value={avgCsat} valueStyle={{ fontSize: 16, color: avgCsat >= 4.5 ? '#52c41a' : '#fa8c16' }} prefix="⭐" /></motion.div></Col>
                            <Col span={8}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Agent SLA" value={avgSla} suffix="%" valueStyle={{ fontSize: 16, color: avgSla >= 95 ? '#52c41a' : '#fa8c16' }} /></motion.div></Col>
                            <Col span={8}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Resolved" value={totalResolved} valueStyle={{ fontSize: 16, color: themeColor }} /></motion.div></Col>
                        </Row>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><ThunderboltOutlined style={{ color: '#fa8c16' }} /> Priority Breakdown</Space>} bordered loading={loading} style={{ background: 'linear-gradient(135deg, rgba(250,140,22,0.05) 0%, rgba(245,34,45,0.03) 100%)', borderRadius: 12 }}>
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
                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 16, paddingTop: 12 }}>
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
                    <ProCard title={<Space><CloudUploadOutlined style={{ color: '#1890ff' }} /> Deployments & Releases</Space>} bordered loading={loading} style={{ background: 'linear-gradient(135deg, rgba(24,144,255,0.05) 0%, rgba(146,84,222,0.03) 100%)', borderRadius: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {deploymentsData.slice(0, 4).map((d, i) => {
                                const sColors: Record<string, string> = { planned: '#1890ff', in_progress: '#fa8c16', completed: '#52c41a', failed: '#f5222d', rolled_back: '#ff4d4f' };
                                const sTagColors: Record<string, string> = { planned: 'blue', in_progress: 'orange', completed: 'green', failed: 'red', rolled_back: 'volcano' };
                                const eColors: Record<string, string> = { production: 'red', staging: 'orange', development: 'blue' };
                                const accentColor = sColors[d.status] || '#1890ff';
                                return (
                                    <div key={d.id} style={{
                                        display: 'flex', alignItems: 'stretch', gap: 0,
                                        borderRadius: 8, overflow: 'hidden',
                                        background: 'rgba(255,255,255,0.35)',
                                        border: '1px solid rgba(0,0,0,0.04)',
                                        transition: 'all 0.2s ease',
                                    }}>
                                        <div style={{ width: 4, background: accentColor, flexShrink: 0 }} />
                                        <div style={{ flex: 1, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                                    <Tag color="geekblue" style={{ fontFamily: 'monospace', fontSize: 10, margin: 0, lineHeight: '18px', padding: '0 5px' }}>{d.deployment_number}</Tag>
                                                    <Text style={{ fontSize: 12, fontWeight: 500 }}>{d.title?.substring(0, 30)}{d.title?.length > 30 ? '…' : ''}</Text>
                                                </div>
                                                <Space size={4}>
                                                    <Tag color={eColors[d.environment]} style={{ fontSize: 9, margin: 0, lineHeight: '16px', padding: '0 4px', borderRadius: 4 }}>{d.environment?.toUpperCase()}</Tag>
                                                    <Tag color={sTagColors[d.status]} style={{ fontSize: 9, margin: 0, lineHeight: '16px', padding: '0 4px', borderRadius: 4 }}>{d.status?.replace(/_/g, ' ').toUpperCase()}</Tag>
                                                </Space>
                                            </div>
                                            <RocketOutlined style={{ color: accentColor, fontSize: 14, opacity: 0.6 }} />
                                        </div>
                                    </div>
                                );
                            })}
                            {deploymentsData.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0' }}><Text type="secondary">No deployments yet</Text></div>}
                        </div>
                        <Row gutter={8} style={{ marginTop: 14 }}>
                            <Col span={12}>
                                <div style={{ background: 'rgba(82,196,26,0.08)', borderRadius: 8, padding: '8px 12px', textAlign: 'center', border: '1px solid rgba(82,196,26,0.12)' }}>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Completed</Text>
                                    <Text strong style={{ fontSize: 18, color: '#52c41a' }}>{completedDeps}</Text>
                                </div>
                            </Col>
                            <Col span={12}>
                                <div style={{ background: `${themeColor}0a`, borderRadius: 8, padding: '8px 12px', textAlign: 'center', border: `1px solid ${themeColor}18` }}>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Active Releases</Text>
                                    <Text strong style={{ fontSize: 18, color: themeColor }}>{activeReleases}</Text>
                                </div>
                            </Col>
                        </Row>
                    </ProCard>
                </Col>
            </Row>

            {/* ROW 4: Events + Agents */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={12}>
                    <ProCard title={<Space><ThunderboltOutlined style={{ color: critEvents > 0 ? '#f5222d' : '#52c41a' }} /> Live Events <Badge count={openEvents} style={{ backgroundColor: critEvents > 0 ? '#f5222d' : '#1890ff' }} /></Space>} bordered extra={<a href="/admin/itsm/events">View All</a>} style={{ background: 'linear-gradient(135deg, rgba(245,34,45,0.03) 0%, rgba(24,144,255,0.02) 100%)', borderRadius: 12 }}>
                        <Space direction="vertical" style={{ width: '100%' }} size={4}>
                            {eventsData.slice(0, 6).map(ev => (
                                <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid rgba(0,0,0,0.04)', borderRadius: 6, background: 'rgba(255,255,255,0.25)', transition: 'background 0.2s' }}>
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
                    <ProCard title={<Space><TeamOutlined style={{ color: '#13c2c2' }} /> Agent Workload</Space>} bordered extra={<a href="/admin/itsm/agents">Manage</a>} style={{ background: 'linear-gradient(135deg, rgba(19,194,194,0.03) 0%, rgba(24,144,255,0.02) 100%)', borderRadius: 12 }}>
                        <Space direction="vertical" style={{ width: '100%' }} size={6}>
                            {agentsData.filter(a => a.status === 'active').map(a => {
                                const pct = a.max_tickets > 0 ? Math.round((a.current_ticket_count / a.max_tickets) * 100) : 0;
                                return (
                                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.25)' }}>
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

            {/* ROW 5: Continuity + Knowledge + Availability */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><SafetyOutlined style={{ color: '#f5222d' }} /> Continuity Plans</Space>} bordered extra={<a href="/admin/itsm/continuity">View</a>} size="small" style={{ background: 'linear-gradient(135deg, rgba(245,34,45,0.03) 0%, rgba(250,140,22,0.02) 100%)', borderRadius: 12 }}>
                        {continuityData.map(p => {
                            const tColors: Record<string, string> = { bcp: 'blue', drp: 'red', crisis: 'volcano', itrp: 'purple' };
                            return (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid rgba(0,0,0,0.04)', borderRadius: 6, background: 'rgba(255,255,255,0.2)', marginBottom: 4 }}>
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
                    <ProCard title={<Space><BookOutlined style={{ color: '#2f54eb' }} /> Knowledge Base</Space>} bordered extra={<a href="/admin/itsm/knowledge">View</a>} size="small" style={{ background: 'linear-gradient(135deg, rgba(47,84,235,0.04) 0%, rgba(82,196,26,0.02) 100%)', borderRadius: 12 }}>
                        <Row gutter={16} style={{ textAlign: 'center', paddingTop: 12 }}>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Published" value={modules?.knowledge?.published || 0} valueStyle={{ color: '#52c41a' }} loading={loading} /></motion.div></Col>
                            <Col span={12}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Total" value={modules?.knowledge?.total || 0} valueStyle={{ color: '#1890ff' }} loading={loading} /></motion.div></Col>
                        </Row>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><FieldTimeOutlined style={{ color: avgAvail >= 99.9 ? '#52c41a' : '#fa8c16' }} /> Availability Summary</Space>} bordered extra={<a href="/admin/itsm/availability">View</a>} size="small" style={{ background: avgAvail >= 99.9 ? 'linear-gradient(135deg, rgba(82,196,26,0.04) 0%, rgba(19,194,194,0.02) 100%)' : 'linear-gradient(135deg, rgba(250,140,22,0.04) 0%, rgba(245,34,45,0.02) 100%)', borderRadius: 12 }}>
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

            {/* ROW 6: Recent Tickets */}
            <ProCard title={<Space><AlertOutlined /> Recent Incidents</Space>} bordered extra={<a href="/admin/itsm/tickets">View All</a>}>
                <Table scroll={{ x: 900 }} dataSource={tickets} columns={ticketCols} rowKey="id" pagination={false} size="small" loading={loading} />
            </ProCard>

            {/* ROW 7: Form Builder Integration */}
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} md={12}>
                    <FormIntegrationWidget
                        categories={['audit', 'checklist']}
                        title="IT Audit & Checklists"
                        maxItems={3}
                        animIndex={14}
                    />
                </Col>
                <Col xs={24} md={12}>
                    <FormIntegrationWidget
                        categories={['assessment']}
                        title="Security Assessments"
                        maxItems={3}
                        animIndex={15}
                    />
                </Col>
            </Row>
        </>
    );

    // ═══════════════════════════════════════════════════════
    // TAB 2: SLA & PERFORMANCE
    // ═══════════════════════════════════════════════════════
    const slaTab = (
        <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ background: (stats?.slaCompliance || 0) >= 90 ? 'linear-gradient(135deg, rgba(82,196,26,0.08) 0%, rgba(82,196,26,0.02) 100%)' : 'linear-gradient(135deg, rgba(245,34,45,0.08) 0%, rgba(245,34,45,0.02) 100%)', borderLeft: `4px solid ${(stats?.slaCompliance || 0) >= 90 ? '#52c41a' : '#f5222d'}`, borderRadius: 12, backdropFilter: 'blur(20px)' }}>
                        <Statistic title="SLA Compliance" value={stats?.slaCompliance || 0} suffix="%" valueStyle={{ color: (stats?.slaCompliance || 0) >= 90 ? '#52c41a' : '#f5222d', fontSize: 28 }} loading={loading} />
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(250,140,22,0.08) 0%, rgba(250,140,22,0.02) 100%)', borderLeft: '4px solid #fa8c16', borderRadius: 12, backdropFilter: 'blur(20px)' }}>
                        <Statistic title="Avg Resolution Time" value={stats?.avgResolutionHours || 0} suffix="hours" valueStyle={{ fontSize: 28 }} loading={loading} />
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(245,34,45,0.08) 0%, rgba(245,34,45,0.02) 100%)', borderLeft: '4px solid #f5222d', borderRadius: 12, backdropFilter: 'blur(20px)' }}>
                        <Statistic title="SLA Breaches" value={stats?.totalSlaBreach || 0} valueStyle={{ color: '#f5222d', fontSize: 28 }} loading={loading} />
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(24,144,255,0.08) 0%, rgba(24,144,255,0.02) 100%)', borderLeft: '4px solid #1890ff', borderRadius: 12, backdropFilter: 'blur(20px)' }}>
                        <Statistic title="Unassigned Tickets" value={stats?.totalUnassigned || 0} valueStyle={{ color: (stats?.totalUnassigned || 0) > 0 ? '#fa8c16' : '#52c41a', fontSize: 28 }} loading={loading} />
                    </ProCard>
                </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={12}>
                    <ProCard title={<Space><AimOutlined style={{ color: themeColor }} /> SLA Compliance Gauge</Space>} bordered style={{ background: 'linear-gradient(135deg, rgba(82,196,26,0.04) 0%, rgba(24,144,255,0.02) 100%)', borderRadius: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                            <Progress type="dashboard" percent={stats?.slaCompliance || 0} size={200} strokeColor={(stats?.slaCompliance || 0) >= 90 ? '#52c41a' : (stats?.slaCompliance || 0) >= 70 ? '#fa8c16' : '#f5222d'} format={p => <div style={{ textAlign: 'center' }}><div style={{ fontSize: 36, fontWeight: 700 }}>{p}%</div><div style={{ fontSize: 12, color: '#999' }}>SLA Target: 95%</div></div>} />
                        </div>
                        <Row gutter={16} style={{ textAlign: 'center' }}>
                            <Col span={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="CSAT" value={avgCsat} prefix="⭐" valueStyle={{ fontSize: 18 }} /></motion.div></Col>
                            <Col span={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Agent SLA" value={avgSla} suffix="%" valueStyle={{ fontSize: 18 }} /></motion.div></Col>
                            <Col span={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Resolved" value={totalResolved} valueStyle={{ fontSize: 18, color: '#52c41a' }} /></motion.div></Col>
                            <Col span={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Avg Time" value={stats?.avgResolutionHours || 0} suffix="h" valueStyle={{ fontSize: 18 }} /></motion.div></Col>
                        </Row>
                    </ProCard>
                </Col>
                <Col xs={24} md={12}>
                    <ProCard title={<Space><ThunderboltOutlined style={{ color: '#fa8c16' }} /> Priority & Status Breakdown</Space>} bordered style={{ background: 'linear-gradient(135deg, rgba(250,140,22,0.04) 0%, rgba(24,144,255,0.02) 100%)', borderRadius: 12 }}>
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <Title level={5}>By Priority</Title>
                                {[
                                    { label: 'Critical', val: stats?.byCritical || 0, color: '#f5222d' },
                                    { label: 'High', val: stats?.byHigh || 0, color: '#fa8c16' },
                                    { label: 'Medium', val: stats?.byMedium || 0, color: '#1890ff' },
                                    { label: 'Low', val: stats?.byLow || 0, color: '#52c41a' },
                                ].map(p => (
                                    <div key={p.label} style={{ marginBottom: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={{ fontSize: 13 }}>{p.label}</Text>
                                            <Text strong>{p.val}</Text>
                                        </div>
                                        <Progress percent={stats?.totalTickets ? Math.round((p.val / stats.totalTickets) * 100) : 0} strokeColor={p.color} showInfo={false} size="small" />
                                    </div>
                                ))}
                            </Col>
                            <Col span={12}>
                                <Title level={5}>By Status</Title>
                                {[
                                    { label: 'New', val: stats?.statusNew || 0, color: 'blue' },
                                    { label: 'Open', val: stats?.statusOpen || 0, color: 'cyan' },
                                    { label: 'In Progress', val: stats?.statusInProgress || 0, color: 'geekblue' },
                                    { label: 'Pending', val: stats?.statusPending || 0, color: 'orange' },
                                    { label: 'Resolved', val: stats?.statusResolved || 0, color: 'green' },
                                    { label: 'Closed', val: stats?.statusClosed || 0, color: 'default' },
                                ].map(s => (
                                    <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', borderBottom: '1px solid rgba(0,0,0,0.04)', borderRadius: 4, background: 'rgba(255,255,255,0.2)' }}>
                                        <Tag color={s.color}>{s.label}</Tag>
                                        <Text strong>{s.val}</Text>
                                    </div>
                                ))}
                            </Col>
                        </Row>
                    </ProCard>
                </Col>
            </Row>
            <ProCard title={<Space><AlertOutlined style={{ color: '#f5222d' }} /> SLA Breach Tickets</Space>} bordered style={{ background: 'linear-gradient(135deg, rgba(245,34,45,0.03) 0%, rgba(250,140,22,0.02) 100%)', borderRadius: 12 }}>
                <Table scroll={{ x: 900 }} dataSource={tickets.filter(t => t.slaResolutionDue && new Date(t.slaResolutionDue) < new Date())} columns={ticketCols} rowKey="id" pagination={false} size="small" loading={loading} locale={{ emptyText: 'No SLA breaches — great job! 🎉' }} />
            </ProCard>
        </>
    );

    // ═══════════════════════════════════════════════════════
    // TAB 3: EVENTS & MONITORING
    // ═══════════════════════════════════════════════════════
    const eventsTab = (
        <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(114,46,209,0.07) 0%, rgba(114,46,209,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="Total Events" value={eventsData.length} valueStyle={{ fontSize: 24 }} /></ProCard></Col>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(24,144,255,0.08) 0%, rgba(24,144,255,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="Open" value={openEvents} valueStyle={{ fontSize: 24, color: '#1890ff' }} /></ProCard></Col>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: critEvents > 0 ? 'linear-gradient(135deg, rgba(245,34,45,0.08) 0%, rgba(245,34,45,0.02) 100%)' : 'linear-gradient(135deg, rgba(82,196,26,0.08) 0%, rgba(82,196,26,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="Critical/High" value={critEvents} valueStyle={{ fontSize: 24, color: critEvents > 0 ? '#f5222d' : '#52c41a' }} /></ProCard></Col>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(250,140,22,0.08) 0%, rgba(250,140,22,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="Sources" value={[...new Set(eventsData.map(e => e.source))].length} valueStyle={{ fontSize: 24 }} /></ProCard></Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={12}>
                    <ProCard title="Severity Distribution" bordered style={{ background: 'linear-gradient(135deg, rgba(245,34,45,0.03) 0%, rgba(250,140,22,0.02) 100%)', borderRadius: 12 }}>
                        {['critical', 'high', 'medium', 'low', 'informational'].map(sev => {
                            const cnt = eventsData.filter(e => e.severity === sev).length;
                            return (
                                <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.2)' }}>
                                    <Tag color={sevColors[sev]} style={{ width: 100, textAlign: 'center' }}>{sev.toUpperCase()}</Tag>
                                    <Progress percent={eventsData.length > 0 ? Math.round((cnt / eventsData.length) * 100) : 0} size="small" style={{ flex: 1 }} strokeColor={sevColors[sev] === 'default' ? '#bfbfbf' : sevColors[sev]} />
                                    <Text strong style={{ width: 30, textAlign: 'right' }}>{cnt}</Text>
                                </div>
                            );
                        })}
                    </ProCard>
                </Col>
                <Col xs={24} md={12}>
                    <ProCard title="Events by Source" bordered style={{ background: 'linear-gradient(135deg, rgba(24,144,255,0.03) 0%, rgba(19,194,194,0.02) 100%)', borderRadius: 12 }}>
                        {[...new Set(eventsData.map(e => e.source))].map(src => {
                            const cnt = eventsData.filter(e => e.source === src).length;
                            return (
                                <div key={src} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.04)', borderRadius: 6, background: 'rgba(255,255,255,0.2)' }}>
                                    <Tag>{src}</Tag>
                                    <Space>
                                        <Badge count={cnt} style={{ backgroundColor: '#1890ff' }} />
                                        <Text type="secondary">{eventsData.length > 0 ? Math.round((cnt / eventsData.length) * 100) : 0}%</Text>
                                    </Space>
                                </div>
                            );
                        })}
                    </ProCard>
                </Col>
            </Row>
            <ProCard title={<Space><ThunderboltOutlined /> All Events</Space>} bordered style={{ background: 'linear-gradient(135deg, rgba(114,46,209,0.03) 0%, rgba(24,144,255,0.02) 100%)', borderRadius: 12 }}>
                <Table scroll={{ x: 900 }} dataSource={eventsData} rowKey="id" size="small" pagination={{ pageSize: 10 }} columns={[
                    { title: '#', dataIndex: 'event_number', width: 110, render: (v: any) => <Tag style={{ fontFamily: 'monospace' }}>{v}</Tag> },
                    { title: 'Title', dataIndex: 'title', ellipsis: true },
                    { title: 'Severity', dataIndex: 'severity', width: 100, render: (v: any) => <Tag color={sevColors[v]}>{(v || '').toUpperCase()}</Tag> },
                    { title: 'Status', dataIndex: 'status', width: 110, render: (v: any) => <Tag color={evtStatusColors[v]}>{v}</Tag> },
                    { title: 'Source', dataIndex: 'source', width: 120 },
                    { title: 'Occurred', dataIndex: 'occurred_at', width: 130, render: (v: any) => v ? new Date(v).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-' },
                ]} />
            </ProCard>
        </>
    );

    // ═══════════════════════════════════════════════════════
    // TAB 4: AGENTS & WORKLOAD
    // ═══════════════════════════════════════════════════════
    const agentsTab = (
        <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(19,194,194,0.08) 0%, rgba(19,194,194,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="Total Agents" value={agentsData.length} valueStyle={{ fontSize: 24 }} /></ProCard></Col>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(82,196,26,0.08) 0%, rgba(82,196,26,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="Active" value={activeAgents} valueStyle={{ fontSize: 24, color: '#52c41a' }} /></ProCard></Col>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(250,140,22,0.08) 0%, rgba(250,173,20,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="Avg CSAT" value={avgCsat} prefix="⭐" valueStyle={{ fontSize: 24, color: avgCsat >= 4.5 ? '#52c41a' : '#fa8c16' }} /></ProCard></Col>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: avgUtil > 80 ? 'linear-gradient(135deg, rgba(245,34,45,0.08) 0%, rgba(245,34,45,0.02) 100%)' : 'linear-gradient(135deg, rgba(82,196,26,0.08) 0%, rgba(82,196,26,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="Avg Utilization" value={avgUtil} suffix="%" valueStyle={{ fontSize: 24, color: avgUtil > 80 ? '#f5222d' : '#52c41a' }} /></ProCard></Col>
            </Row>
            <ProCard title={<Space><TeamOutlined style={{ color: '#13c2c2' }} /> Agent Performance Table</Space>} bordered style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(19,194,194,0.03) 0%, rgba(24,144,255,0.02) 100%)', borderRadius: 12 }}>
                <Table scroll={{ x: 900 }} dataSource={agentsData} rowKey="id" size="small" pagination={false} columns={[
                    { title: 'Agent', dataIndex: 'name', render: (v: any, r: any) => <Space><Badge status={r.status === 'active' ? 'success' : 'default'} /><Text strong>{v}</Text></Space> },
                    { title: 'Code', dataIndex: 'agent_code', width: 90, render: (v: any) => <Tag style={{ fontFamily: 'monospace' }}>{v}</Tag> },
                    { title: 'Role', dataIndex: 'role', width: 100, render: (v: any) => <Tag color="blue">{v}</Tag> },
                    { title: 'Status', dataIndex: 'status', width: 80, render: (v: any) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag> },
                    { title: 'Workload', width: 180, render: (_: any, r: any) => { const pct = r.max_tickets > 0 ? Math.round((r.current_ticket_count / r.max_tickets) * 100) : 0; return <Progress percent={pct} size="small" status={pct > 80 ? 'exception' : 'active'} format={() => `${r.current_ticket_count}/${r.max_tickets}`} />; } },
                    { title: 'Resolved', dataIndex: 'total_tickets_resolved', width: 90, sorter: (a: any, b: any) => (a.total_tickets_resolved || 0) - (b.total_tickets_resolved || 0), render: (v: any) => <Text strong style={{ color: '#52c41a' }}>{v || 0}</Text> },
                    { title: 'CSAT', dataIndex: 'customer_satisfaction_score', width: 80, sorter: (a: any, b: any) => (a.customer_satisfaction_score || 0) - (b.customer_satisfaction_score || 0), render: (v: any) => <Tag color={v >= 4.5 ? 'green' : v >= 4 ? 'blue' : 'orange'}>⭐{v}</Tag> },
                    { title: 'SLA %', dataIndex: 'sla_compliance_pct', width: 80, sorter: (a: any, b: any) => (a.sla_compliance_pct || 0) - (b.sla_compliance_pct || 0), render: (v: any) => <Text style={{ color: v >= 95 ? '#52c41a' : '#fa8c16' }}>{v}%</Text> },
                ]} />
            </ProCard>
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <ProCard title="Workload Distribution" bordered style={{ background: 'linear-gradient(135deg, rgba(24,144,255,0.03) 0%, rgba(82,196,26,0.02) 100%)', borderRadius: 12 }}>
                        {agentsData.filter(a => a.status === 'active').map(a => {
                            const pct = a.max_tickets > 0 ? Math.round((a.current_ticket_count / a.max_tickets) * 100) : 0;
                            return (
                                <div key={a.id} style={{ marginBottom: 12, padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text>{a.name}</Text>
                                        <Text type="secondary">{a.current_ticket_count}/{a.max_tickets} tickets</Text>
                                    </div>
                                    <Progress percent={pct} status={pct > 80 ? 'exception' : pct > 60 ? 'active' : 'success'} />
                                </div>
                            );
                        })}
                    </ProCard>
                </Col>
                <Col xs={24} md={12}>
                    <ProCard title="🏆 Top Performers" bordered style={{ background: 'linear-gradient(135deg, rgba(250,173,20,0.04) 0%, rgba(82,196,26,0.02) 100%)', borderRadius: 12 }}>
                        {[...agentsData].sort((a, b) => (b.total_tickets_resolved || 0) - (a.total_tickets_resolved || 0)).slice(0, 5).map((a, i) => (
                            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.04)', borderRadius: 6, background: 'rgba(255,255,255,0.2)', marginBottom: 4 }}>
                                <Space>
                                    <Text style={{ fontSize: 18, width: 28 }}>{['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]}</Text>
                                    <Text strong>{a.name}</Text>
                                </Space>
                                <Space>
                                    <Tag color="green">{a.total_tickets_resolved || 0} resolved</Tag>
                                    <Tag color="blue">⭐{a.customer_satisfaction_score}</Tag>
                                </Space>
                            </div>
                        ))}
                    </ProCard>
                </Col>
            </Row>
        </>
    );

    // ═══════════════════════════════════════════════════════
    // TAB 5: DEPLOYMENTS & RELEASES
    // ═══════════════════════════════════════════════════════
    const deploymentsTab = (
        <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(24,144,255,0.08) 0%, rgba(24,144,255,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="Total Deployments" value={deploymentsData.length} valueStyle={{ fontSize: 24 }} /></ProCard></Col>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(82,196,26,0.08) 0%, rgba(82,196,26,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="Completed" value={completedDeps} valueStyle={{ fontSize: 24, color: '#52c41a' }} /></ProCard></Col>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(146,84,222,0.08) 0%, rgba(146,84,222,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="Total Releases" value={releasesData.length} valueStyle={{ fontSize: 24, color: '#9254de' }} /></ProCard></Col>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(250,140,22,0.08) 0%, rgba(250,173,20,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="Active Releases" value={activeReleases} valueStyle={{ fontSize: 24, color: themeColor }} /></ProCard></Col>
            </Row>
            <ProCard title={<Space><CloudUploadOutlined style={{ color: '#1890ff' }} /> Deployments</Space>} bordered style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(24,144,255,0.03) 0%, rgba(82,196,26,0.02) 100%)', borderRadius: 12 }}>
                <Table scroll={{ x: 900 }} dataSource={deploymentsData} rowKey="id" size="small" pagination={{ pageSize: 10 }} columns={[
                    { title: '#', dataIndex: 'deployment_number', width: 110, render: (v: any) => <Tag color="blue" style={{ fontFamily: 'monospace' }}>{v}</Tag> },
                    { title: 'Title', dataIndex: 'title', ellipsis: true },
                    { title: 'Environment', dataIndex: 'environment', width: 110, render: (v: any) => { const c: Record<string, string> = { production: 'red', staging: 'orange', development: 'blue' }; return <Tag color={c[v]}>{v?.toUpperCase()}</Tag>; } },
                    { title: 'Type', dataIndex: 'deployment_type', width: 100, render: (v: any) => <Tag>{v}</Tag> },
                    { title: 'Status', dataIndex: 'status', width: 110, render: (v: any) => { const c: Record<string, string> = { planned: 'blue', in_progress: 'orange', completed: 'green', failed: 'red', rolled_back: 'volcano' }; return <Tag color={c[v]}>{v?.replace(/_/g, ' ').toUpperCase()}</Tag>; } },
                    { title: 'Validation', dataIndex: 'validation_result', width: 100, render: (v: any) => <Tag color={v === 'passed' ? 'green' : v === 'failed' ? 'red' : 'default'}>{v || '-'}</Tag> },
                ]} />
            </ProCard>
            <ProCard title={<Space><RocketOutlined style={{ color: '#9254de' }} /> Releases</Space>} bordered style={{ background: 'linear-gradient(135deg, rgba(146,84,222,0.03) 0%, rgba(250,140,22,0.02) 100%)', borderRadius: 12 }}>
                <Table scroll={{ x: 900 }} dataSource={releasesData} rowKey="id" size="small" pagination={{ pageSize: 10 }} columns={[
                    { title: '#', dataIndex: 'release_number', width: 110, render: (v: any) => <Tag color="purple" style={{ fontFamily: 'monospace' }}>{v}</Tag> },
                    { title: 'Title', dataIndex: 'title', ellipsis: true },
                    { title: 'Version', dataIndex: 'version', width: 90, render: (v: any) => <Tag>{v}</Tag> },
                    { title: 'Type', dataIndex: 'release_type', width: 100, render: (v: any) => <Tag color="geekblue">{v}</Tag> },
                    { title: 'Status', dataIndex: 'status', width: 110, render: (v: any) => { const c: Record<string, string> = { planning: 'blue', building: 'cyan', testing: 'orange', deployed: 'green', cancelled: 'default', rolled_back: 'red' }; return <Tag color={c[v]}>{v?.replace(/_/g, ' ').toUpperCase()}</Tag>; } },
                    { title: 'Planned Start', dataIndex: 'planned_start', width: 120, render: (v: any) => v ? new Date(v).toLocaleDateString('id-ID') : '-' },
                ]} />
            </ProCard>
        </>
    );

    // ═══════════════════════════════════════════════════════
    // TAB 6: CONTINUITY & KNOWLEDGE
    // ═══════════════════════════════════════════════════════
    const continuityTab = (
        <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(245,34,45,0.07) 0%, rgba(250,140,22,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="Continuity Plans" value={continuityData.length} valueStyle={{ fontSize: 24 }} /></ProCard></Col>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(82,196,26,0.08) 0%, rgba(82,196,26,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="Active Plans" value={activePlans} valueStyle={{ fontSize: 24, color: '#52c41a' }} /></ProCard></Col>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(47,84,235,0.08) 0%, rgba(47,84,235,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="KB Articles" value={modules?.knowledge?.total || 0} valueStyle={{ fontSize: 24, color: '#2f54eb' }} /></ProCard></Col>
                <Col xs={12} sm={6}><ProCard bordered style={{ background: 'linear-gradient(135deg, rgba(82,196,26,0.08) 0%, rgba(19,194,194,0.02) 100%)', borderRadius: 12, backdropFilter: 'blur(20px)' }}><Statistic title="Published" value={modules?.knowledge?.published || 0} valueStyle={{ fontSize: 24, color: '#52c41a' }} /></ProCard></Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={14}>
                    <ProCard title={<Space><SafetyOutlined style={{ color: '#f5222d' }} /> Continuity Plans</Space>} bordered style={{ background: 'linear-gradient(135deg, rgba(245,34,45,0.03) 0%, rgba(250,140,22,0.02) 100%)', borderRadius: 12 }}>
                        <Table scroll={{ x: 900 }} dataSource={continuityData} rowKey="id" size="small" pagination={false} columns={[
                            { title: '#', dataIndex: 'plan_number', width: 100, render: (v: any) => <Tag style={{ fontFamily: 'monospace' }}>{v}</Tag> },
                            { title: 'Title', dataIndex: 'title', ellipsis: true },
                            { title: 'Type', dataIndex: 'plan_type', width: 80, render: (v: any) => { const c: Record<string, string> = { bcp: 'blue', drp: 'red', crisis: 'volcano', itrp: 'purple' }; return <Tag color={c[v]}>{v?.toUpperCase()}</Tag>; } },
                            { title: 'Status', dataIndex: 'status', width: 80, render: (v: any) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag> },
                            { title: 'RTO', dataIndex: 'rto_hours', width: 60, render: (v: any) => `${v}h` },
                            { title: 'RPO', dataIndex: 'rpo_hours', width: 60, render: (v: any) => v ? `${v}h` : '-' },
                            { title: 'Last Test', dataIndex: 'last_test_result', width: 90, render: (v: any) => <Tag color={v === 'passed' ? 'green' : v === 'failed' ? 'red' : 'default'}>{v || 'Untested'}</Tag> },
                        ]} />
                    </ProCard>
                </Col>
                <Col xs={24} md={10}>
                    <ProCard title={<Space><BookOutlined style={{ color: '#2f54eb' }} /> Knowledge Base Summary</Space>} bordered style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(47,84,235,0.04) 0%, rgba(82,196,26,0.02) 100%)', borderRadius: 12 }}>
                        <Row gutter={16} style={{ textAlign: 'center', padding: '16px 0' }}>
                            <Col span={8}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Total" value={modules?.knowledge?.total || 0} valueStyle={{ color: '#1890ff', fontSize: 22 }} /></motion.div></Col>
                            <Col span={8}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Published" value={modules?.knowledge?.published || 0} valueStyle={{ color: '#52c41a', fontSize: 22 }} /></motion.div></Col>
                            <Col span={8}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Statistic title="Draft" value={(modules?.knowledge?.total || 0) - (modules?.knowledge?.published || 0)} valueStyle={{ color: '#fa8c16', fontSize: 22 }} /></motion.div></Col>
                        </Row>
                    </ProCard>
                    <ProCard title="RTO Analysis" bordered style={{ background: 'linear-gradient(135deg, rgba(250,140,22,0.04) 0%, rgba(245,34,45,0.02) 100%)', borderRadius: 12 }}>
                        {continuityData.map(p => (
                            <div key={p.id} style={{ marginBottom: 8, padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 12 }}>{p.title?.substring(0, 30)}</Text>
                                    <Text strong>{p.rto_hours}h</Text>
                                </div>
                                <Progress percent={Math.min(100, Math.round(((24 - (p.rto_hours || 0)) / 24) * 100))} size="small" strokeColor={p.rto_hours <= 4 ? '#52c41a' : p.rto_hours <= 8 ? '#fa8c16' : '#f5222d'} />
                            </div>
                        ))}
                    </ProCard>
                </Col>
            </Row>
        </>
    );

    // ═══════════════════════════════════════════════════════
    // TAB 7: ANALYTICS (Interactive Charts)
    // ═══════════════════════════════════════════════════════

    // -- Chart data preparation --
    const priorityPieData = [
        { type: 'Critical', value: stats?.byCritical || 0 },
        { type: 'High', value: stats?.byHigh || 0 },
        { type: 'Medium', value: stats?.byMedium || 0 },
        { type: 'Low', value: stats?.byLow || 0 },
    ].filter(d => d.value > 0);

    const severityPieData = ['critical', 'high', 'medium', 'low', 'informational'].map(sev => ({
        type: sev.charAt(0).toUpperCase() + sev.slice(1),
        value: eventsData.filter(e => e.severity === sev).length,
    })).filter(d => d.value > 0);

    const agentPerformanceData = agentsData.map(a => ({
        name: a.name,
        resolved: a.total_tickets_resolved || 0,
    })).sort((a, b) => b.resolved - a.resolved);

    const agentRadarData = agentsData.filter(a => a.status === 'active').flatMap(a => [
        { agent: a.name, metric: 'CSAT', value: ((a.customer_satisfaction_score || 0) / 5) * 100 },
        { agent: a.name, metric: 'SLA %', value: a.sla_compliance_pct || 0 },
        { agent: a.name, metric: 'Utilization', value: a.max_tickets > 0 ? Math.round(((a.current_ticket_count || 0) / a.max_tickets) * 100) : 0 },
        { agent: a.name, metric: 'Resolved', value: Math.min(100, Math.round(((a.total_tickets_resolved || 0) / Math.max(1, totalResolved)) * 100 * agentsData.length)) },
    ]);

    // Incident trend by date (uses ALL tickets, not just recent 8)
    const incidentTrendData = (() => {
        const dateMap: Record<string, number> = {};
        allTickets.forEach(t => {
            if (t.createdAt) {
                const d = new Date(t.createdAt).toLocaleDateString('en-CA');
                dateMap[d] = (dateMap[d] || 0) + 1;
            }
        });
        return Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
    })();

    // Availability trend
    const availTrendData = availData.map((r, i) => ({
        period: r.period_start ? new Date(r.period_start).toLocaleDateString('en-CA') : `Period ${i + 1}`,
        availability: r.availability_pct || 0,
        target: r.sla_target_pct || 99.9,
    }));

    // Network graph: Issue ↔ Stakeholder (uses junction table for many-to-many)
    const networkData = (() => {
        const nodes: any[] = [];
        const edges: any[] = [];
        const stakeholderSet = new Map<string, boolean>();

        // Add all ticket nodes
        allTickets.forEach(t => {
            nodes.push({
                id: t.id,
                data: {
                    label: t.ticketNumber || t.title?.substring(0, 15),
                    type: 'issue',
                    priority: t.priority,
                    ticketNumber: t.ticketNumber,
                    title: t.title,
                    status: t.status,
                    reporterName: t.reporterName,
                    assignedTo: t.assignedTo,
                    createdAt: t.createdAt,
                    slaResolutionDue: t.slaResolutionDue,
                },
            });
        });

        // Build edges from stakeholders junction table (many-to-many)
        const typeColors: Record<string, string> = { assignee: '#f5222d', watcher: '#1890ff', involved: '#fa8c16', reporter: '#52c41a', approver: '#9254de', escalation: '#eb2f96', affected: '#13c2c2' };
        stakeholdersData.forEach(sh => {
            const stakeholderId = `stakeholder-${sh.stakeholder_name.replace(/\s/g, '-')}`;
            // Add stakeholder node if not already added
            if (!stakeholderSet.has(stakeholderId)) {
                stakeholderSet.set(stakeholderId, true);
                const agentRecord = agentsData.find(a => a.name === sh.stakeholder_name);
                const isAgent = !!agentRecord || !!sh.agent_id;
                nodes.push({
                    id: stakeholderId,
                    data: {
                        label: sh.stakeholder_name,
                        type: isAgent ? 'agent' : 'stakeholder',
                        name: sh.stakeholder_name,
                        email: sh.stakeholder_email,
                        agentCode: agentRecord?.agent_code,
                        role: agentRecord?.role,
                        status: agentRecord?.status,
                        currentTickets: agentRecord?.current_ticket_count,
                        maxTickets: agentRecord?.max_tickets,
                        csat: agentRecord?.customer_satisfaction_score,
                        slaCompliance: agentRecord?.sla_compliance_pct,
                        totalResolved: agentRecord?.total_tickets_resolved,
                        // Count stakeholder relationships
                        linkedTickets: stakeholdersData.filter(s => s.stakeholder_name === sh.stakeholder_name).map(s => s.ticket_id).length,
                    },
                });
            }
            // Add edge from stakeholder to ticket
            const ticketExists = allTickets.some(t => t.id === sh.ticket_id);
            if (ticketExists) {
                edges.push({
                    source: stakeholderId,
                    target: sh.ticket_id,
                    data: { type: sh.stakeholder_type, role: sh.role_description },
                });
            }
        });

        // Fallback: also add edges for tickets with assignedTo but no stakeholder records
        allTickets.forEach(t => {
            if (t.assignedTo) {
                const stakeholderId = `stakeholder-${t.assignedTo.replace(/\s/g, '-')}`;
                const hasStakeholderEdge = edges.some(e => e.source === stakeholderId && e.target === t.id);
                if (!hasStakeholderEdge) {
                    if (!stakeholderSet.has(stakeholderId)) {
                        stakeholderSet.set(stakeholderId, true);
                        const agentRecord = agentsData.find(a => a.name === t.assignedTo);
                        nodes.push({
                            id: stakeholderId,
                            data: { label: t.assignedTo, type: 'agent', name: t.assignedTo, agentCode: agentRecord?.agent_code, role: agentRecord?.role, status: agentRecord?.status },
                        });
                    }
                    edges.push({ source: stakeholderId, target: t.id });
                }
            }
        });

        return { nodes, edges };
    })();

    const handleNodeClick = (nodeData: any) => {
        setSelectedNode(nodeData);
        setNodeModalOpen(true);
    };

    const analyticsTab = (
        <>
            {/* Row 1: 3 charts — Incident Trend, Priority Pie, Event Severity */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><LineChartOutlined style={{ color: themeColor }} /> Incident Trend</Space>} bordered style={{ background: 'linear-gradient(135deg, rgba(114,46,209,0.03) 0%, rgba(24,144,255,0.02) 100%)', borderRadius: 12 }}>
                        {incidentTrendData.length > 0 ? (
                            <ChartLine data={incidentTrendData} xField="date" yField="count" smooth point={{ size: 4 }} color={themeColor} height={260} />
                        ) : (
                            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text type="secondary">Not enough data</Text></div>
                        )}
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><PieChartOutlined style={{ color: '#fa8c16' }} /> Priority Distribution</Space>} bordered style={{ background: 'linear-gradient(135deg, rgba(250,140,22,0.03) 0%, rgba(245,34,45,0.02) 100%)', borderRadius: 12 }}>
                        {priorityPieData.length > 0 ? (
                            <ChartPie data={priorityPieData} angleField="value" colorField="type" innerRadius={0.6} height={260} color={['#f5222d', '#fa8c16', '#1890ff', '#52c41a']} label={{ text: (d: any) => `${d.type}: ${d.value}`, style: { fontSize: 11 } }} legend={{ position: 'bottom' }} />
                        ) : (
                            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text type="secondary">No priority data</Text></div>
                        )}
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><PieChartOutlined style={{ color: '#f5222d' }} /> Event Severity</Space>} bordered style={{ background: 'linear-gradient(135deg, rgba(245,34,45,0.03) 0%, rgba(250,140,22,0.02) 100%)', borderRadius: 12 }}>
                        {severityPieData.length > 0 ? (
                            <ChartPie data={severityPieData} angleField="value" colorField="type" height={260} color={['#f5222d', '#fa8c16', '#1890ff', '#52c41a', '#bfbfbf']} label={{ text: (d: any) => `${d.type}`, style: { fontSize: 11 } }} legend={{ position: 'bottom' }} />
                        ) : (
                            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text type="secondary">No event data</Text></div>
                        )}
                    </ProCard>
                </Col>
            </Row>

            {/* Row 2: Network Graph (large) + Summary sidebar */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={16}>
                    <ProCard title={<Space><NodeIndexOutlined style={{ color: themeColor }} /> Issue ↔ Stakeholder Network</Space>} bordered subTitle="Click any node to view details" style={{ background: 'linear-gradient(135deg, rgba(19,194,194,0.03) 0%, rgba(114,46,209,0.02) 100%)', borderRadius: 12 }}>
                        {networkData.nodes.length > 0 ? (
                            <div style={{ height: 420 }}>
                                <NetworkGraph
                                    data={networkData}
                                    autoFit="view"
                                    node={{
                                        style: {
                                            size: (d: any) => (d.data?.type === 'agent' || d.data?.type === 'stakeholder') ? 32 : 22,
                                            fill: (d: any) => {
                                                if (d.data?.type === 'agent') return '#13c2c2';
                                                if (d.data?.type === 'stakeholder') return '#9254de';
                                                const pColors: Record<string, string> = { critical: '#f5222d', high: '#fa8c16', medium: '#1890ff', low: '#52c41a' };
                                                return pColors[d.data?.priority] || '#d9d9d9';
                                            },
                                            labelText: (d: any) => d.data?.label || d.id,
                                            labelFontSize: 10,
                                            labelPlacement: 'bottom',
                                            cursor: 'pointer',
                                        },
                                    }}
                                    edge={{
                                        style: {
                                            stroke: '#91d5ff',
                                            lineWidth: 1.5,
                                        },
                                    }}
                                    layout={{
                                        type: 'd3-force',
                                        collide: { radius: 40, strength: 1 },
                                        manyBody: { strength: -600 },
                                        link: { distance: 180 },
                                    }}
                                    behaviors={['drag-canvas', 'zoom-canvas', 'drag-element']}
                                    onReady={(graph: any) => {
                                        graph?.on('node:click', (evt: any) => {
                                            const nodeModel = evt?.target?.id ? graph.getNodeData(evt.target.id) : null;
                                            if (nodeModel?.data) handleNodeClick(nodeModel.data);
                                        });
                                    }}
                                />
                            </div>
                        ) : (
                            <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text type="secondary">No issue-stakeholder data available. Assign agents to tickets to see the network.</Text></div>
                        )}
                        <div style={{ marginTop: 12, padding: '10px 8px', borderTop: '1px solid rgba(0,0,0,0.06)', borderRadius: 6, background: 'rgba(255,255,255,0.15)' }}>
                            <Space wrap>
                                <Text type="secondary" style={{ fontSize: 12 }}>Legend:</Text>
                                <Badge color="#13c2c2" text={<Text style={{ fontSize: 12 }}>Agent</Text>} />
                                <Badge color="#9254de" text={<Text style={{ fontSize: 12 }}>Stakeholder</Text>} />
                                <Badge color="#f5222d" text={<Text style={{ fontSize: 12 }}>Critical</Text>} />
                                <Badge color="#fa8c16" text={<Text style={{ fontSize: 12 }}>High</Text>} />
                                <Badge color="#1890ff" text={<Text style={{ fontSize: 12 }}>Medium</Text>} />
                                <Badge color="#52c41a" text={<Text style={{ fontSize: 12 }}>Low</Text>} />
                            </Space>
                        </div>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><NodeIndexOutlined style={{ color: themeColor }} /> Network Summary</Space>} bordered style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(114,46,209,0.04) 0%, rgba(19,194,194,0.02) 100%)', borderRadius: 12 }}>
                        <Row gutter={[10, 10]}>
                            {[
                                { title: 'Total Nodes', value: networkData.nodes.length, color: themeColor, icon: <NodeIndexOutlined />, gradient: `linear-gradient(135deg, ${themeColor}12 0%, ${themeColor}04 100%)` },
                                { title: 'Agents', value: networkData.nodes.filter(n => n.data?.type === 'agent').length, color: '#13c2c2', icon: <TeamOutlined />, gradient: 'linear-gradient(135deg, rgba(19,194,194,0.1) 0%, rgba(19,194,194,0.02) 100%)' },
                                { title: 'Issues', value: networkData.nodes.filter(n => n.data?.type === 'issue').length, color: '#1890ff', icon: <AlertOutlined />, gradient: 'linear-gradient(135deg, rgba(24,144,255,0.1) 0%, rgba(24,144,255,0.02) 100%)' },
                                { title: 'Connections', value: networkData.edges.length, color: '#9254de', icon: <ApartmentOutlined />, gradient: 'linear-gradient(135deg, rgba(146,84,222,0.1) 0%, rgba(146,84,222,0.02) 100%)' },
                            ].map(item => (
                                <Col span={12} key={item.title}>
                                    <div style={{
                                        background: item.gradient,
                                        borderRadius: 10,
                                        padding: '14px 12px',
                                        borderLeft: `3px solid ${item.color}`,
                                        transition: 'all 0.25s ease',
                                        cursor: 'default',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                            <span style={{ color: item.color, fontSize: 13 }}>{item.icon}</span>
                                            <Text type="secondary" style={{ fontSize: 11, letterSpacing: 0.3 }}>{item.title}</Text>
                                        </div>
                                        <Text strong style={{ fontSize: 26, color: item.color, lineHeight: 1 }}>{item.value}</Text>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                        <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.3)', borderRadius: 8, border: '1px dashed rgba(0,0,0,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>Node Density</Text>
                                <Text strong style={{ fontSize: 12, color: themeColor }}>{networkData.edges.length > 0 ? (networkData.edges.length / Math.max(1, networkData.nodes.length)).toFixed(1) : '0'} edges/node</Text>
                            </div>
                            <Progress
                                percent={Math.min(100, Math.round((networkData.edges.length / Math.max(1, networkData.nodes.length)) * 25))}
                                showInfo={false}
                                strokeColor={themeColor}
                                size="small"
                                style={{ marginTop: 4 }}
                            />
                        </div>
                    </ProCard>
                    <ProCard title={<Space><BarChartOutlined style={{ color: themeColor }} /> Agent Performance</Space>} bordered style={{ background: 'linear-gradient(135deg, rgba(250,140,22,0.03) 0%, rgba(82,196,26,0.02) 100%)', borderRadius: 12 }}>
                        {agentPerformanceData.length > 0 ? (
                            <ChartColumn data={agentPerformanceData} xField="name" yField="resolved" colorField="name" height={200} label={{ text: (d: any) => `${d.resolved}`, style: { fontSize: 10 } }} legend={false} />
                        ) : (
                            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text type="secondary">No agent data</Text></div>
                        )}
                    </ProCard>
                </Col>
            </Row>

            {/* Row 3: Availability Trend + Agent Radar */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={12}>
                    <ProCard title={<Space><FundOutlined style={{ color: themeColor }} /> Availability Trend</Space>} bordered style={{ background: 'linear-gradient(135deg, rgba(82,196,26,0.03) 0%, rgba(24,144,255,0.02) 100%)', borderRadius: 12 }}>
                        {availTrendData.length > 0 ? (
                            <ChartArea data={availTrendData} xField="period" yField="availability" smooth height={280} color={themeColor} areaStyle={{ fillOpacity: 0.15 }} />
                        ) : (
                            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text type="secondary">No availability data</Text></div>
                        )}
                    </ProCard>
                </Col>
                <Col xs={24} md={12}>
                    <ProCard title={<Space><RadarChartOutlined style={{ color: '#9254de' }} /> Agent Capability Radar</Space>} bordered style={{ background: 'linear-gradient(135deg, rgba(146,84,222,0.03) 0%, rgba(19,194,194,0.02) 100%)', borderRadius: 12 }}>
                        {agentRadarData.length > 0 ? (
                            <ChartRadar data={agentRadarData} xField="metric" yField="value" colorField="agent" height={280} area={{ style: { fillOpacity: 0.15 } }} legend={{ position: 'bottom' }} />
                        ) : (
                            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text type="secondary">No agent data</Text></div>
                        )}
                    </ProCard>
                </Col>
            </Row>

            {/* Node Detail Modal */}
            <Modal
                title={selectedNode?.type === 'agent' ? '👤 Stakeholder Details' : '🎫 Incident Details'}
                open={nodeModalOpen}
                onCancel={() => { setNodeModalOpen(false); setSelectedNode(null); }}
                footer={null}
                width={520}
            >
                {selectedNode?.type === 'issue' ? (
                    <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
                        <Descriptions.Item label="Ticket #">
                            <Tag color="purple" style={{ fontFamily: 'monospace' }}>{selectedNode.ticketNumber}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Title">{selectedNode.title}</Descriptions.Item>
                        <Descriptions.Item label="Priority">
                            <Tag color={priorityColors[selectedNode.priority]}>{(selectedNode.priority || '').toUpperCase()}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Status">
                            <Tag color={statusColors[selectedNode.status]}>{(selectedNode.status || '').replace('_', ' ').toUpperCase()}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Reporter">{selectedNode.reporterName || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Assigned To">{selectedNode.assignedTo || <Text type="secondary">Unassigned</Text>}</Descriptions.Item>
                        <Descriptions.Item label="Created">{selectedNode.createdAt ? new Date(selectedNode.createdAt).toLocaleString('id-ID') : '-'}</Descriptions.Item>
                        <Descriptions.Item label="SLA Due">
                            {selectedNode.slaResolutionDue ? (
                                new Date(selectedNode.slaResolutionDue) > new Date()
                                    ? <Tag color="green">OK — {new Date(selectedNode.slaResolutionDue).toLocaleString('id-ID')}</Tag>
                                    : <Tag color="red">BREACH — {new Date(selectedNode.slaResolutionDue).toLocaleString('id-ID')}</Tag>
                            ) : '-'}
                        </Descriptions.Item>
                    </Descriptions>
                ) : selectedNode?.type === 'agent' ? (
                    <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
                        <Descriptions.Item label="Name"><Text strong>{selectedNode.name}</Text></Descriptions.Item>
                        <Descriptions.Item label="Agent Code"><Tag style={{ fontFamily: 'monospace' }}>{selectedNode.agentCode || 'N/A'}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Role"><Tag color="blue">{selectedNode.role || 'N/A'}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Status">
                            <Tag color={selectedNode.status === 'active' ? 'green' : 'default'}>{selectedNode.status || 'N/A'}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Workload">
                            <Progress percent={selectedNode.maxTickets > 0 ? Math.round((selectedNode.currentTickets / selectedNode.maxTickets) * 100) : 0} size="small" format={() => `${selectedNode.currentTickets || 0}/${selectedNode.maxTickets || 0}`} />
                        </Descriptions.Item>
                        <Descriptions.Item label="CSAT">
                            <Tag color={selectedNode.csat >= 4.5 ? 'green' : selectedNode.csat >= 4 ? 'blue' : 'orange'}>⭐ {selectedNode.csat || 0}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="SLA Compliance">
                            <Text style={{ color: selectedNode.slaCompliance >= 95 ? '#52c41a' : '#fa8c16' }}>{selectedNode.slaCompliance || 0}%</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Total Resolved">
                            <Text strong style={{ color: '#52c41a' }}>{selectedNode.totalResolved || 0}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Assigned Tickets">
                            {selectedNode.assignedTickets ? selectedNode.assignedTickets.split(', ').map((t: string) => <Tag key={t} color="purple" style={{ fontFamily: 'monospace', marginBottom: 2 }}>{t}</Tag>) : <Text type="secondary">None</Text>}
                        </Descriptions.Item>
                    </Descriptions>
                ) : null}
            </Modal>
        </>
    );

    // ═══════════════════════════════════════════════════════
    // MAIN RENDER
    // ═══════════════════════════════════════════════════════
    const tabItems = [
        { key: 'overview', label: <Space><DashboardOutlined />Overview</Space>, children: overviewTab },
        { key: 'sla', label: <Space><AimOutlined />SLA & Performance</Space>, children: slaTab },
        { key: 'events', label: <Space><ThunderboltOutlined />Events & Monitoring</Space>, children: eventsTab },
        { key: 'agents', label: <Space><TeamOutlined />Agents & Workload</Space>, children: agentsTab },
        { key: 'deployments', label: <Space><CloudUploadOutlined />Deployments & Releases</Space>, children: deploymentsTab },
        { key: 'continuity', label: <Space><SafetyOutlined />Continuity & Knowledge</Space>, children: continuityTab },
        { key: 'analytics', label: <Space><LineChartOutlined />Analytics</Space>, children: analyticsTab },
    ];

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>ITSM Dashboard</AuroraText>}
            subTitle={<DecryptedText text="IT Service Management — Full ITIL v4 Overview" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div style={{ padding: 12 }}>
            {contextHolder}
            <Tabs
                defaultActiveKey="overview"
                items={tabItems}
                size="middle"
                tabBarStyle={{ marginBottom: 20, fontWeight: 500, ...glass, padding: '4px 8px', border: '1px solid rgba(var(--theme-color-rgb, 139, 92, 246), 0.08)' }}
                type="card"
            />
        </div>
        </CMSLayout>
    );
}
