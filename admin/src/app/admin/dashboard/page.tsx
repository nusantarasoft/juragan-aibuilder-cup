"use client";

import React, { useState, useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { ProCard } from "@ant-design/pro-components";
import { Row, Col, Statistic, Tag, Space, Progress, message, Typography, Card, Badge, Button, Divider } from "antd";
import {
    DashboardOutlined, FileTextOutlined, PictureOutlined,
    TeamOutlined, CustomerServiceOutlined, SolutionOutlined,
    ShoppingCartOutlined, ProjectOutlined, AlertOutlined,
    BugOutlined, SyncOutlined, BookOutlined,
    ClusterOutlined, ThunderboltOutlined, RocketOutlined,
    SafetyOutlined, FieldTimeOutlined, CloudUploadOutlined,
    WarningOutlined, CheckCircleOutlined,
    ArrowRightOutlined, BarChartOutlined,
    BuildOutlined, DatabaseOutlined,
    ShopOutlined, AppstoreOutlined,
} from "@ant-design/icons";
import { gql } from "@/lib/graphql";
import { supaRest } from "@/lib/supaRest";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Title, Text, Paragraph } = Typography;
const DEFAULT_TENANT = 'default';

const GET_ITSM_STATS = `query { itsmDashboardStats { totalOpen totalUnassigned totalSlaBreach avgResolutionHours slaCompliance totalTickets byCritical byHigh byMedium byLow } }`;
const GET_ITSM_MODULES = `query { itsmModuleCounts { serviceRequests { total open } problems { total open knownErrors } changes { total open } knowledge { total published } } }`;
const GET_CRM_STATS = `query { crmDashboard(tenantId: "${DEFAULT_TENANT}") { totalIndividuals totalAccounts totalContacts totalDeals openDeals pipelineValue wonValue totalActivities openActivities totalCases openCases criticalCases totalCampaigns activeCampaigns campaignBudget totalQuotes quotesValue acceptedQuotes totalProducts } }`;

const fmtCurrency = (n: number) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(0);
};

export default function DashboardPage() {
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [itsm, setItsm] = useState<any>(null);
    const [itsmMod, setItsmMod] = useState<any>(null);
    const [crm, setCrm] = useState<any>(null);
    const { themeColor } = usePreferencesStore();
    // ITIL v4
    const [cmdbCount, setCmdbCount] = useState(0);
    const [eventsOpen, setEventsOpen] = useState(0);
    const [eventsCrit, setEventsCrit] = useState(0);
    const [releasesActive, setReleasesActive] = useState(0);
    const [agentsActive, setAgentsActive] = useState(0);
    const [agentsUtil, setAgentsUtil] = useState(0);
    const [plansActive, setPlansActive] = useState(0);
    const [avgAvail, setAvgAvail] = useState(0);
    const [depsCompleted, setDepsCompleted] = useState(0);
    const [depsTotal, setDepsTotal] = useState(0);

    useEffect(() => {
        (async () => {
            try {
                const [is, im, cs] = await Promise.all([
                    gql(GET_ITSM_STATS), gql(GET_ITSM_MODULES), gql(GET_CRM_STATS),
                ]);
                setItsm(is.itsmDashboardStats);
                setItsmMod(im.itsmModuleCounts);
                setCrm(cs.crmDashboard);
                // ITIL v4 aggregates
                const [cis, events, releases, agents, conts, avails, deps] = await Promise.all([
                    supaRest('itsm_configuration_items', { select: 'id' }),
                    supaRest('itsm_events', { select: 'id,severity,status' }),
                    supaRest('itsm_releases', { select: 'id,status' }),
                    supaRest('itsm_agents', { select: 'id,status,current_ticket_count,max_tickets' }),
                    supaRest('itsm_continuity_plans', { select: 'id,status' }),
                    supaRest('itsm_availability_records', { select: 'id,availability_pct' }),
                    supaRest('itsm_deployments', { select: 'id,status' }),
                ]);
                setCmdbCount(cis.length);
                const openEvts = events.filter((e: any) => e.status !== 'closed');
                setEventsOpen(openEvts.length);
                setEventsCrit(openEvts.filter((e: any) => e.severity === 'critical' || e.severity === 'high').length);
                setReleasesActive(releases.filter((r: any) => !['deployed', 'cancelled', 'rolled_back'].includes(r.status)).length);
                const activeA = agents.filter((a: any) => a.status === 'active');
                setAgentsActive(activeA.length);
                setAgentsUtil(activeA.length > 0 ? Math.round(activeA.reduce((s: number, a: any) => s + ((a.current_ticket_count || 0) / (a.max_tickets || 10) * 100), 0) / activeA.length) : 0);
                setPlansActive(conts.filter((p: any) => p.status === 'active').length);
                setAvgAvail(avails.length > 0 ? +(avails.reduce((s: number, r: any) => s + (r.availability_pct || 0), 0) / avails.length).toFixed(2) : 0);
                setDepsCompleted(deps.filter((d: any) => d.status === 'completed').length);
                setDepsTotal(deps.length);
            } catch (err: any) { messageApi.error(err.message); }
            finally { setLoading(false); }
        })();
    }, [messageApi]);

    const ModuleCard = ({ title, icon, color, href, children }: { title: string, icon: React.ReactNode, color: string, href: string, children: React.ReactNode }) => (
        <ProCard bordered hoverable style={{ borderTop: `3px solid ${color}`, cursor: 'pointer', height: '100%' }} onClick={() => window.location.href = href}>
            <Space style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 18, color }}>{icon}</span>
                <Text strong style={{ fontSize: 13 }}>{title}</Text>
            </Space>
            {children}
        </ProCard>
    );

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Dashboard</AuroraText>}
            subTitle={<DecryptedText text="NusantaraSoft Enterprise Platform" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
        <div style={{ padding: 24 }}>
            {contextHolder}

            {/* ══════ HEADER ══════ */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space align="center">
                    <DashboardOutlined style={{ fontSize: 28, color: themeColor }} />
                    <div>
                        <Title level={3} style={{ margin: 0 }}>Enterprise Command Center</Title>
                        <Text type="secondary">Real-time overview of all platform modules</Text>
                    </div>
                </Space>
                <Space>
                    <Tag color="purple">ITIL v4</Tag>
                    <Tag color="blue">128 Tables</Tag>
                    <Tag color="green">All Systems Operational</Tag>
                </Space>
            </div>

            {/* ══════ ROW 1: Platform Health Indicators ══════ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ borderLeft: `4px solid ${themeColor}`, background: 'linear-gradient(135deg, #f9f0ff 0%, #fff 100%)' }}>
                        <Statistic title={<Space><CustomerServiceOutlined style={{ color: themeColor }} /> Open Incidents</Space>} value={itsm?.totalOpen || 0} suffix={<Text type="secondary" style={{ fontSize: 12 }}>/ {itsm?.totalTickets || 0}</Text>} loading={loading} valueStyle={{ color: (itsm?.totalOpen || 0) > 10 ? '#f5222d' : themeColor }} />
                        {itsm?.totalSlaBreach > 0 && <Tag color="red" icon={<WarningOutlined />} style={{ marginTop: 4 }}>{itsm.totalSlaBreach} SLA Breach</Tag>}
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ borderLeft: '4px solid #1890ff', background: 'linear-gradient(135deg, #e6f7ff 0%, #fff 100%)' }}>
                        <Statistic title={<Space><SolutionOutlined style={{ color: '#1890ff' }} /> CRM Pipeline</Space>} value={fmtCurrency(crm?.pipelineValue || 0)} prefix="Rp" loading={loading} valueStyle={{ color: '#1890ff' }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{crm?.openDeals || 0} open deals · {crm?.totalAccounts || 0} accounts</Text>
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ borderLeft: `4px solid ${avgAvail >= 99.9 ? '#52c41a' : '#fa8c16'}`, background: `linear-gradient(135deg, ${avgAvail >= 99.9 ? '#f6ffed' : '#fffbe6'} 0%, #fff 100%)` }}>
                        <Statistic title={<Space><FieldTimeOutlined style={{ color: avgAvail >= 99.9 ? '#52c41a' : '#fa8c16' }} /> Availability</Space>} value={avgAvail || '-'} suffix="%" loading={loading} valueStyle={{ color: avgAvail >= 99.9 ? '#52c41a' : '#fa8c16' }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{eventsCrit > 0 ? <Text type="danger">{eventsCrit} critical events</Text> : 'All systems nominal'}</Text>
                    </ProCard>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <ProCard bordered style={{ borderLeft: '4px solid #13c2c2', background: 'linear-gradient(135deg, #e6fffb 0%, #fff 100%)' }}>
                        <Statistic title={<Space><TeamOutlined style={{ color: '#13c2c2' }} /> Workforce</Space>} value={agentsActive} suffix="active" loading={loading} valueStyle={{ color: '#13c2c2' }} />
                        <Progress percent={agentsUtil} size="small" status={agentsUtil > 80 ? 'exception' : 'active'} format={() => `${agentsUtil}% utilized`} />
                    </ProCard>
                </Col>
            </Row>

            {/* ══════ ROW 2: SLA Gauge + CRM Pipeline + ITIL Coverage ══════ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><CheckCircleOutlined /> SLA & Quality</Space>} bordered loading={loading} style={{ height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
                            <Progress type="dashboard" percent={itsm?.slaCompliance || 0} size={140} strokeColor={(itsm?.slaCompliance || 100) >= 90 ? '#52c41a' : (itsm?.slaCompliance || 100) >= 70 ? '#fa8c16' : '#f5222d'} format={(p) => <div style={{ textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 700 }}>{p}%</div><div style={{ fontSize: 10, color: '#999' }}>SLA</div></div>} />
                        </div>
                        <Row gutter={8} style={{ textAlign: 'center', marginTop: 12 }}>
                            <Col span={8}><Statistic title={<span style={{ fontSize: 11 }}>Avg Resolution</span>} value={itsm?.avgResolutionHours || 0} suffix="h" valueStyle={{ fontSize: 16 }} /></Col>
                            <Col span={8}><Statistic title={<span style={{ fontSize: 11 }}>Unassigned</span>} value={itsm?.totalUnassigned || 0} valueStyle={{ fontSize: 16, color: (itsm?.totalUnassigned || 0) > 0 ? '#fa8c16' : '#52c41a' }} /></Col>
                            <Col span={8}><Statistic title={<span style={{ fontSize: 11 }}>Knowledge</span>} value={itsmMod?.knowledge?.published || 0} suffix={`/${itsmMod?.knowledge?.total || 0}`} valueStyle={{ fontSize: 16 }} /></Col>
                        </Row>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><SolutionOutlined /> CRM Summary</Space>} bordered loading={loading} style={{ height: '100%' }} extra={<a href="/admin/crm/dashboard"><ArrowRightOutlined /></a>}>
                        <Row gutter={[8, 12]}>
                            <Col span={12}><Statistic title="Leads" value={crm?.totalIndividuals || 0} valueStyle={{ fontSize: 18, color: '#1890ff' }} /></Col>
                            <Col span={12}><Statistic title="Contacts" value={crm?.totalContacts || 0} valueStyle={{ fontSize: 18, color: '#13c2c2' }} /></Col>
                            <Col span={12}><Statistic title="Won Revenue" value={fmtCurrency(crm?.wonValue || 0)} prefix="Rp" valueStyle={{ fontSize: 18, color: '#52c41a' }} /></Col>
                            <Col span={12}><Statistic title="Quotes" value={crm?.totalQuotes || 0} suffix={<Text type="secondary" style={{ fontSize: 11 }}>{crm?.acceptedQuotes || 0} accepted</Text>} valueStyle={{ fontSize: 18 }} /></Col>
                            <Col span={12}><Statistic title="Campaigns" value={crm?.activeCampaigns || 0} suffix={`/ ${crm?.totalCampaigns || 0}`} valueStyle={{ fontSize: 18, color: themeColor }} /></Col>
                            <Col span={12}><Statistic title="Cases" value={crm?.openCases || 0} suffix={`/ ${crm?.totalCases || 0}`} valueStyle={{ fontSize: 18, color: (crm?.criticalCases || 0) > 0 ? '#f5222d' : '#1890ff' }} /></Col>
                        </Row>
                    </ProCard>
                </Col>
                <Col xs={24} md={8}>
                    <ProCard title={<Space><AppstoreOutlined /> ITSM Modules</Space>} bordered loading={loading} style={{ height: '100%' }} extra={<a href="/admin/itsm/dashboard"><ArrowRightOutlined /></a>}>
                        <Space direction="vertical" style={{ width: '100%' }} size={4}>
                            {[
                                { label: 'Incidents', value: itsm?.totalOpen || 0, total: itsm?.totalTickets || 0, color: themeColor, icon: <AlertOutlined /> },
                                { label: 'Requests', value: itsmMod?.serviceRequests?.open || 0, total: itsmMod?.serviceRequests?.total || 0, color: '#1890ff', icon: <FileTextOutlined /> },
                                { label: 'Problems', value: itsmMod?.problems?.open || 0, total: itsmMod?.problems?.total || 0, color: '#fa8c16', icon: <BugOutlined /> },
                                { label: 'Changes', value: itsmMod?.changes?.open || 0, total: itsmMod?.changes?.total || 0, color: '#52c41a', icon: <SyncOutlined /> },
                            ].map(m => (
                                <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                                    <Space size={6}><span style={{ color: m.color }}>{m.icon}</span><Text style={{ fontSize: 12 }}>{m.label}</Text></Space>
                                    <Space size={4}><Tag color={m.value > 0 ? 'orange' : 'green'} style={{ fontSize: 11 }}>{m.value} open</Tag><Text type="secondary" style={{ fontSize: 11 }}>/ {m.total}</Text></Space>
                                </div>
                            ))}
                        </Space>
                        <Divider style={{ margin: '8px 0' }} />
                        <Row gutter={8} style={{ textAlign: 'center' }}>
                            <Col span={6}><Badge color={themeColor} /><div style={{ fontSize: 10 }}>CMDB</div><Text strong style={{ fontSize: 13 }}>{cmdbCount}</Text></Col>
                            <Col span={6}><Badge color={eventsCrit > 0 ? '#f5222d' : '#52c41a'} /><div style={{ fontSize: 10 }}>Events</div><Text strong style={{ fontSize: 13, color: eventsCrit > 0 ? '#f5222d' : undefined }}>{eventsOpen}</Text></Col>
                            <Col span={6}><Badge color="#9254de" /><div style={{ fontSize: 10 }}>Releases</div><Text strong style={{ fontSize: 13 }}>{releasesActive}</Text></Col>
                            <Col span={6}><Badge color="#1890ff" /><div style={{ fontSize: 10 }}>Deploys</div><Text strong style={{ fontSize: 13 }}>{depsCompleted}/{depsTotal}</Text></Col>
                        </Row>
                    </ProCard>
                </Col>
            </Row>

            {/* ══════ ROW 3: ITIL v4 Module Quick Status ══════ */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={8} md={4}>
                    <ModuleCard title="CMDB" icon={<ClusterOutlined />} color={themeColor} href="/admin/itsm/cmdb">
                        <Statistic value={cmdbCount} valueStyle={{ fontSize: 20 }} suffix="CIs" loading={loading} />
                    </ModuleCard>
                </Col>
                <Col xs={12} sm={8} md={4}>
                    <ModuleCard title="Events" icon={<ThunderboltOutlined />} color={eventsCrit > 0 ? '#f5222d' : '#52c41a'} href="/admin/itsm/events">
                        <Statistic value={eventsOpen} valueStyle={{ fontSize: 20, color: eventsCrit > 0 ? '#f5222d' : undefined }} suffix="open" loading={loading} />
                    </ModuleCard>
                </Col>
                <Col xs={12} sm={8} md={4}>
                    <ModuleCard title="Releases" icon={<RocketOutlined />} color="#9254de" href="/admin/itsm/releases">
                        <Statistic value={releasesActive} valueStyle={{ fontSize: 20 }} suffix="active" loading={loading} />
                    </ModuleCard>
                </Col>
                <Col xs={12} sm={8} md={4}>
                    <ModuleCard title="Agents" icon={<TeamOutlined />} color="#13c2c2" href="/admin/itsm/agents">
                        <Statistic value={agentsActive} valueStyle={{ fontSize: 20 }} suffix={`· ${agentsUtil}%`} loading={loading} />
                    </ModuleCard>
                </Col>
                <Col xs={12} sm={8} md={4}>
                    <ModuleCard title="Continuity" icon={<SafetyOutlined />} color="#f5222d" href="/admin/itsm/continuity">
                        <Statistic value={plansActive} valueStyle={{ fontSize: 20 }} suffix="plans" loading={loading} />
                    </ModuleCard>
                </Col>
                <Col xs={12} sm={8} md={4}>
                    <ModuleCard title="Deployments" icon={<CloudUploadOutlined />} color="#1890ff" href="/admin/itsm/deployments">
                        <Statistic value={depsCompleted} valueStyle={{ fontSize: 20 }} suffix={`/ ${depsTotal}`} loading={loading} />
                    </ModuleCard>
                </Col>
            </Row>

            {/* ══════ ROW 4: Quick Actions & Module Links ══════ */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <ProCard title={<Space><RocketOutlined /> Quick Actions</Space>} bordered>
                        <Row gutter={[8, 8]}>
                            {[
                                { label: 'New Incident', href: '/admin/itsm/tickets', color: themeColor, icon: <AlertOutlined /> },
                                { label: 'New Change', href: '/admin/itsm/changes', color: '#52c41a', icon: <SyncOutlined /> },
                                { label: 'Add CI to CMDB', href: '/admin/itsm/cmdb', color: themeColor, icon: <ClusterOutlined /> },
                                { label: 'New Deployment', href: '/admin/itsm/deployments', color: '#1890ff', icon: <CloudUploadOutlined /> },
                                { label: 'CRM Dashboard', href: '/admin/crm/dashboard', color: '#13c2c2', icon: <SolutionOutlined /> },
                                { label: 'Create Page', href: '/admin/pages/builder', color: '#fa8c16', icon: <FileTextOutlined /> },
                                { label: 'Manage Users', href: '/admin/users/list', color: '#eb2f96', icon: <TeamOutlined /> },
                                { label: 'Media Library', href: '/admin/media', color: '#2f54eb', icon: <PictureOutlined /> },
                            ].map(a => (
                                <Col span={12} key={a.label}>
                                    <Button type="text" block style={{ textAlign: 'left', height: 'auto', padding: '8px 12px', borderRadius: 8, border: '1px solid #f0f0f0' }} onClick={() => window.location.href = a.href}>
                                        <Space><span style={{ color: a.color }}>{a.icon}</span><Text style={{ fontSize: 12 }}>{a.label}</Text></Space>
                                    </Button>
                                </Col>
                            ))}
                        </Row>
                    </ProCard>
                </Col>
                <Col xs={24} md={12}>
                    <ProCard title={<Space><BarChartOutlined /> Platform Modules</Space>} bordered>
                        <Row gutter={[8, 8]}>
                            {[
                                { name: 'CMS', count: '89 pages', color: '#fa8c16', href: '/admin/pages' },
                                { name: 'CRM', count: `${crm?.totalIndividuals || 0} leads`, color: '#1890ff', href: '/admin/crm/dashboard' },
                                { name: 'ITSM', count: `${itsm?.totalTickets || 0} tickets`, color: themeColor, href: '/admin/itsm/dashboard' },
                                { name: 'Inventory', count: 'Items & Stock', color: '#52c41a', href: '/admin/inventory/items' },
                                { name: 'E-Commerce', count: 'Orders & Products', color: '#eb2f96', href: '/admin/ecommerce/orders' },
                                { name: 'Projects', count: 'Tasks & Sprints', color: '#13c2c2', href: '/admin/pm/dashboard' },
                                { name: 'AI Studio', count: 'ML Models', color: '#2f54eb', href: '/admin/ai-studio' },
                                { name: 'Infrastructure', count: 'Networking', color: '#fa541c', href: '/admin/infrastructure/traefik' },
                            ].map(m => (
                                <Col span={12} key={m.name}>
                                    <Card size="small" bordered hoverable style={{ cursor: 'pointer', borderLeft: `3px solid ${m.color}` }} onClick={() => window.location.href = m.href}>
                                        <Text strong style={{ color: m.color, fontSize: 13 }}>{m.name}</Text>
                                        <br /><Text type="secondary" style={{ fontSize: 11 }}>{m.count}</Text>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </ProCard>
                </Col>
            </Row>
        </div>
        </CMSLayout>
    );
}
