'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { GlobalOutlined, FileSearchOutlined, LinkOutlined, ShareAltOutlined, ReloadOutlined, CheckCircleOutlined, StopOutlined, EditOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const META_DEFAULTS = [
    { field: 'Title Template', value: '%s | Nusantarasoft Enterprise' },
    { field: 'Description', value: 'Enterprise-grade digital transformation platform for modern businesses' },
    { field: 'Keywords', value: 'enterprise, saas, erp, crm, analytics, indonesia' },
];
const ROBOTS_RULES = [
    { agent: '*', rule: 'Allow', path: '/' },
    { agent: '*', rule: 'Disallow', path: '/admin/*' },
    { agent: '*', rule: 'Disallow', path: '/api/*' },
    { agent: 'Googlebot', rule: 'Allow', path: '/sitemap.xml' },
];
const SEO_OVERRIDES = [
    { path: '/', title: 'Home — Nusantarasoft', description: 'Digital transformation suite', index: true, ogImage: true },
    { path: '/products', title: 'Products — Nusantarasoft', description: 'Explore our product lineup', index: true, ogImage: true },
    { path: '/blog', title: 'Blog — Nusantarasoft', description: 'Latest insights & updates', index: true, ogImage: false },
    { path: '/pricing', title: 'Pricing — Nusantarasoft', description: 'Flexible enterprise pricing', index: true, ogImage: true },
    { path: '/admin/login', title: 'Admin Login', description: 'Staff only', index: false, ogImage: false },
];

export default function SEOSettingsPage() {
    const { themeColor } = usePreferencesStore();

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#10b981', '#f59e0b']}>SEO Configuration</AuroraText>} subTitle={<DecryptedText text="Meta tags, sitemaps, social sharing & crawl directives" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Indexed Pages', v: 1284, c: '#3b82f6', i: <FileSearchOutlined /> }, { t: 'Meta Coverage', v: '94%', c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Sitemap URLs', v: 387, c: '#8b5cf6', i: <GlobalOutlined /> }, { t: 'Open Graph Score', v: '88/100', c: '#f59e0b', i: <ShareAltOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={12}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><EditOutlined style={{ color: '#3b82f6' }} /><Text strong>Default Meta Tags</Text></Space>}>
                            {META_DEFAULTS.map((m, i) => (
                                <motion.div key={m.field} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', marginBottom: 6 }}>
                                    <div><Text strong style={{ fontSize: 12 }}>{m.field}</Text><br /><Text type="secondary" style={{ fontSize: 10 }}>{m.value}</Text></div>
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card size="small" style={glass} title={<Space><StopOutlined style={{ color: '#ef4444' }} /><Text strong>robots.txt Rules</Text><Badge count={ROBOTS_RULES.length} style={{ backgroundColor: themeColor }} /></Space>}>
                            <Table dataSource={ROBOTS_RULES} rowKey={(_, i) => `r${i}`} size="small" pagination={false} columns={[
                                { title: 'Agent', dataIndex: 'agent', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                                { title: 'Rule', dataIndex: 'rule', width: 80, render: (v: string) => <Tag color={v === 'Allow' ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                                { title: 'Path', dataIndex: 'path', render: (v: string) => <Text strong style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                            ]} />
                        </Card>
                    </Col>
                </Row>

                <Card size="small" style={glass} title={<Space><GlobalOutlined style={{ color: '#8b5cf6' }} /><Text strong>Page-level SEO Overrides</Text><Badge count={SEO_OVERRIDES.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={SEO_OVERRIDES} rowKey="path" size="small" pagination={false} columns={[
                        { title: 'Path', dataIndex: 'path', render: (v: string) => <Text strong style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Title', dataIndex: 'title', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                        { title: 'Description', dataIndex: 'description', ellipsis: true },
                        { title: 'Index', dataIndex: 'index', width: 70, render: (v: boolean) => <Tag color={v ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10 }}>{v ? 'Yes' : 'No'}</Tag> },
                        { title: 'OG Image', dataIndex: 'ogImage', width: 80, render: (v: boolean) => <Tag color={v ? 'blue' : 'default'} style={{ borderRadius: 10, fontSize: 10 }}>{v ? 'Set' : 'None'}</Tag> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
