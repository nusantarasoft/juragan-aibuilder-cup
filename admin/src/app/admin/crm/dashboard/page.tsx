"use client";

import React, { useState, useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Row, Col, Statistic, Typography, Spin, message, Divider, Progress } from "antd";
import {
    TeamOutlined, BankOutlined, ContactsOutlined, DollarOutlined,
    CalendarOutlined, RocketOutlined, BugOutlined, ShoppingOutlined,
    FileTextOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
    RiseOutlined, TrophyOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useRouter } from "next/navigation";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Title, Text } = Typography;

interface DashboardStats {
    totalIndividuals: number; totalAccounts: number; totalContacts: number;
    totalDeals: number; openDeals: number; pipelineValue: number; wonValue: number;
    totalActivities: number; openActivities: number;
    totalCases: number; openCases: number; criticalCases: number;
    totalCampaigns: number; activeCampaigns: number; campaignBudget: number;
    totalQuotes: number; quotesValue: number; acceptedQuotes: number;
    totalProducts: number; activeProducts: number;
}

export default function CrmDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const { themeColor } = usePreferencesStore();
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

    useEffect(() => {
        (async () => {
            try {
                const data = await gql(`
                    query($tenantId: String!) {
                        crmDashboard(tenantId: $tenantId) {
                            totalIndividuals totalAccounts totalContacts
                            totalDeals openDeals pipelineValue wonValue
                            totalActivities openActivities
                            totalCases openCases criticalCases
                            totalCampaigns activeCampaigns campaignBudget
                            totalQuotes quotesValue acceptedQuotes
                            totalProducts activeProducts
                        }
                    }
                `, { tenantId: DEFAULT_TENANT_ID });
                setStats(data.crmDashboard);
            } catch (err: any) { message.error("Failed to load dashboard: " + err.message); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading || !stats) return (
        <CMSLayout title="CRM Dashboard" subTitle="Loading...">
            <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
        </CMSLayout>
    );

    const navCard = (title: string, path: string, icon: React.ReactNode, color: string, children: React.ReactNode) => (
        <Card hoverable onClick={() => router.push(path)} style={{ cursor: 'pointer', borderTop: `3px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>{children}</div>
                <div style={{ fontSize: 28, color, opacity: 0.6 }}>{icon}</div>
            </div>
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>{title} →</Text>
        </Card>
    );

    const winRate = stats.totalDeals > 0
        ? Math.round((stats.totalDeals - stats.openDeals > 0 ? stats.wonValue / (stats.pipelineValue + stats.wonValue) * 100 : 0))
        : 0;

    return (
        <CMSLayout title="CRM Dashboard" subTitle="Overview of your entire CRM at a glance">
            {/* Pipeline & Revenue */}
            <Title level={5} style={{ marginBottom: 12 }}>💰 Pipeline & Revenue</Title>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                    {navCard("View Deals", "/admin/crm/deals", <DollarOutlined />, "#1677ff",
                        <Statistic title="Pipeline Value" value={stats.pipelineValue} formatter={() => fmt(stats.pipelineValue)} valueStyle={{ color: '#1677ff', fontSize: 22 }} />
                    )}
                </Col>
                <Col xs={24} sm={12} md={6}>
                    {navCard("View Deals", "/admin/crm/deals", <TrophyOutlined />, "#52c41a",
                        <Statistic title="Won Value" value={stats.wonValue} formatter={() => fmt(stats.wonValue)} valueStyle={{ color: '#52c41a', fontSize: 22 }} />
                    )}
                </Col>
                <Col xs={24} sm={12} md={6}>
                    {navCard("View Quotes", "/admin/crm/quotes", <FileTextOutlined />, "#722ed1",
                        <Statistic title="Quotes Value" value={stats.quotesValue} formatter={() => fmt(stats.quotesValue)} valueStyle={{ color: themeColor, fontSize: 22 }} />
                    )}
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card style={{ borderTop: '3px solid #faad14' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Win Rate</Text>
                        <Progress percent={winRate} strokeColor="#52c41a" style={{ marginTop: 8 }} />
                        <Text style={{ fontSize: 12 }}>{stats.openDeals} open · {stats.totalDeals} total deals</Text>
                    </Card>
                </Col>
            </Row>

            {/* People & Organizations */}
            <Title level={5} style={{ marginBottom: 12 }}>👥 People & Organizations</Title>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8} md={8}>
                    {navCard("Individuals", "/admin/crm/individuals", <TeamOutlined />, "#1677ff",
                        <Statistic title="Individuals" value={stats.totalIndividuals} prefix={<TeamOutlined />} />
                    )}
                </Col>
                <Col xs={24} sm={8} md={8}>
                    {navCard("Accounts", "/admin/crm/accounts", <BankOutlined />, "#13c2c2",
                        <Statistic title="Accounts" value={stats.totalAccounts} prefix={<BankOutlined />} />
                    )}
                </Col>
                <Col xs={24} sm={8} md={8}>
                    {navCard("Contacts", "/admin/crm/contacts", <ContactsOutlined />, "#eb2f96",
                        <Statistic title="Contacts" value={stats.totalContacts} prefix={<ContactsOutlined />} />
                    )}
                </Col>
            </Row>

            {/* Activity & Engagement */}
            <Title level={5} style={{ marginBottom: 12 }}>⚡ Activity & Engagement</Title>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} md={6}>
                    {navCard("Activities", "/admin/crm/activities", <CalendarOutlined />, "#fa8c16",
                        <Statistic title="Open Activities" value={stats.openActivities} suffix={`/ ${stats.totalActivities}`} valueStyle={{ color: '#fa8c16' }} />
                    )}
                </Col>
                <Col xs={24} sm={12} md={6}>
                    {navCard("Campaigns", "/admin/crm/campaigns", <RocketOutlined />, "#2f54eb",
                        <Statistic title="Active Campaigns" value={stats.activeCampaigns} suffix={`/ ${stats.totalCampaigns}`} valueStyle={{ color: '#2f54eb' }} />
                    )}
                </Col>
                <Col xs={24} sm={12} md={6}>
                    {navCard("Campaign Budget", "/admin/crm/campaigns", <RiseOutlined />, "#52c41a",
                        <Statistic title="Total Budget" value={stats.campaignBudget} formatter={() => fmt(stats.campaignBudget)} valueStyle={{ fontSize: 18 }} />
                    )}
                </Col>
                <Col xs={24} sm={12} md={6}>
                    {navCard("Products", "/admin/crm/products", <ShoppingOutlined />, "#722ed1",
                        <Statistic title="Active Products" value={stats.activeProducts} suffix={`/ ${stats.totalProducts}`} valueStyle={{ color: themeColor }} />
                    )}
                </Col>
            </Row>

            {/* Support */}
            <Title level={5} style={{ marginBottom: 12 }}>🎧 Support</Title>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={8} md={8}>
                    {navCard("Cases", "/admin/crm/cases", <BugOutlined />, "#1677ff",
                        <Statistic title="Open Cases" value={stats.openCases} suffix={`/ ${stats.totalCases}`} valueStyle={{ color: '#1677ff' }} />
                    )}
                </Col>
                <Col xs={24} sm={8} md={8}>
                    {navCard("Critical Cases", "/admin/crm/cases", <ExclamationCircleOutlined />, "#ff4d4f",
                        <Statistic title="Critical" value={stats.criticalCases} valueStyle={{ color: stats.criticalCases > 0 ? '#ff4d4f' : '#52c41a' }} prefix={stats.criticalCases > 0 ? <ThunderboltOutlined /> : <CheckCircleOutlined />} />
                    )}
                </Col>
                <Col xs={24} sm={8} md={8}>
                    {navCard("Accepted Quotes", "/admin/crm/quotes", <CheckCircleOutlined />, "#52c41a",
                        <Statistic title="Accepted Quotes" value={stats.acceptedQuotes} suffix={`/ ${stats.totalQuotes}`} valueStyle={{ color: '#52c41a' }} />
                    )}
                </Col>
            </Row>
        </CMSLayout>
    );
}
