'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress, Switch } from 'antd';
import { TeamOutlined, SettingOutlined, BarChartOutlined, ReloadOutlined, CheckCircleOutlined, CloudServerOutlined, ThunderboltOutlined, SafetyOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const TENANTS = [
    { id: 'tn-001', name: 'PT Nusantara Digital', plan: 'Enterprise', users: 45, storage: 12.5, storageLimit: 50, modules: 12, status: 'active', created: '2024-01-15', color: '#3b82f6' },
    { id: 'tn-002', name: 'CV Maju Bersama', plan: 'Professional', users: 12, storage: 3.2, storageLimit: 20, modules: 8, status: 'active', created: '2024-03-22', color: '#8b5cf6' },
    { id: 'tn-003', name: 'Koperasi Sejahtera', plan: 'Starter', users: 5, storage: 0.8, storageLimit: 5, modules: 4, status: 'active', created: '2024-06-10', color: '#10b981' },
    { id: 'tn-004', name: 'Demo Tenant', plan: 'Trial', users: 2, storage: 0.1, storageLimit: 1, modules: 12, status: 'trial', created: '2024-11-01', color: '#f59e0b' },
];
const FEATURES = ['CRM', 'ITSM', 'HR', 'Accounting', 'Inventory', 'E-Commerce', 'PM', 'News Intel', 'AI Studio', 'Big Data', 'Audit', 'Notifications'];

export default function TenantsDashboardPage() {
    const { themeColor } = usePreferencesStore();
    const totalUsers = TENANTS.reduce((s, t) => s + t.users, 0);
    const totalStorage = TENANTS.reduce((s, t) => s + t.storage, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#8b5cf6', '#10b981']}>Multi-Tenancy</AuroraText>} subTitle={<DecryptedText text="Tenant management, quotas, feature flags & usage analytics" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <BentoGrid className="max-w-full">
                    <BentoGridItem
                        title="Active Tenants"
                        description="Currently running"
                        icon={<CloudServerOutlined style={{ color: '#10b981' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-emerald-500/10">
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981' }}>{TENANTS.filter(t => t.status === 'active').length}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                    <BentoGridItem
                        title="Total Users"
                        description="Across all tenants"
                        icon={<TeamOutlined style={{ color: '#3b82f6' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-blue-500/10">
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6' }}>{totalUsers}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                    <BentoGridItem
                        title="Storage Used"
                        description="Total allocated storage"
                        icon={<ThunderboltOutlined style={{ color: '#8b5cf6' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-purple-500/10">
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#8b5cf6' }}>{totalStorage.toFixed(1)} GB</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                    <BentoGridItem
                        title="Modules Available"
                        description="Total platform modules"
                        icon={<SettingOutlined style={{ color: '#f59e0b' }} />}
                        header={
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-amber-500/10">
                                <div style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b' }}>{FEATURES.length}</div>
                            </div>
                        }
                        className="col-span-3 lg:col-span-1"
                    />
                </BentoGrid>

                <Card size="small" style={glass} title={<Space><CloudServerOutlined style={{ color: themeColor }} /><Text strong>Tenants</Text><Badge count={TENANTS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Row gutter={[12, 12]}>
                        {TENANTS.map((t, i) => (
                            <Col key={t.id} xs={24} sm={12} md={6}>
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
                                    <Card size="small" hoverable style={{ borderTop: `3px solid ${t.color}`, borderRadius: 10 }}>
                                        <Text strong style={{ fontSize: 12 }}>{t.name}</Text><br />
                                        <Space size={4} style={{ marginTop: 4, marginBottom: 8 }}>
                                            <Tag color={t.plan === 'Enterprise' ? 'blue' : t.plan === 'Professional' ? 'purple' : t.plan === 'Starter' ? 'green' : 'orange'} style={{ borderRadius: 10, fontSize: 9 }}>{t.plan}</Tag>
                                            <Tag color={t.status === 'active' ? 'green' : 'orange'} style={{ borderRadius: 10, fontSize: 9 }}>{t.status}</Tag>
                                        </Space>
                                        <Row gutter={4}><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Users</Text><br /><Text strong style={{ fontSize: 14, color: t.color }}>{t.users}</Text></Col><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Modules</Text><br /><Text strong style={{ fontSize: 14 }}>{t.modules}</Text></Col><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Storage</Text><br /><Text strong style={{ fontSize: 11 }}>{t.storage}GB</Text></Col></Row>
                                        <Progress percent={Math.round((t.storage / t.storageLimit) * 100)} size="small" strokeColor={t.storage / t.storageLimit > 0.8 ? '#ef4444' : '#10b981'} style={{ marginTop: 4 }} />
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>

                <Card size="small" style={glass} title={<Space><SettingOutlined style={{ color: '#f59e0b' }} /><Text strong>Module Feature Flags</Text></Space>}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {FEATURES.map((f, i) => (
                            <motion.div key={f} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.03 }}>
                                <Tag style={{ padding: '4px 12px', fontSize: 12, borderRadius: 10, background: `${['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'][i % 6]}15`, border: `1px solid ${['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'][i % 6]}40` }}>{f}</Tag>
                            </motion.div>
                        ))}
                    </div>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
