'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Space, Tag, Button, Badge, Input, Tabs } from 'antd';
import { AppstoreOutlined, SearchOutlined, CheckCircleOutlined, DownloadOutlined, ApiOutlined, CreditCardOutlined, CarOutlined, RobotOutlined, DatabaseOutlined, CloudOutlined, ShoppingOutlined, MailOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const INTEGRATIONS = [
    { name: 'Midtrans', desc: 'Indonesian payment gateway — credit cards, e-wallets, bank transfers', category: 'Payment', icon: <CreditCardOutlined />, color: '#3b82f6', version: 'v3.2', installed: true, rating: 4.8 },
    { name: 'Xendit', desc: 'Southeast Asia payment platform — invoicing, disbursements, QR codes', category: 'Payment', icon: <CreditCardOutlined />, color: '#8b5cf6', version: 'v2.1', installed: true, rating: 4.7 },
    { name: 'Stripe', desc: 'Global payment processing — subscriptions, checkout, connect', category: 'Payment', icon: <CreditCardOutlined />, color: '#6366f1', version: 'v4.0', installed: false, rating: 4.9 },
    { name: 'JNE Logistics', desc: 'Indonesian shipping — tracking, rate calculator, pickup scheduling', category: 'Logistics', icon: <CarOutlined />, color: '#f59e0b', version: 'v1.5', installed: false, rating: 4.3 },
    { name: 'SiCepat', desc: 'Express delivery — real-time tracking, COD, warehouse pickup', category: 'Logistics', icon: <CarOutlined />, color: '#10b981', version: 'v1.2', installed: false, rating: 4.2 },
    { name: 'Google Gemini', desc: 'AI content generation — text, embeddings, classification, summarization', category: 'AI', icon: <RobotOutlined />, color: '#ef4444', version: 'v2.0', installed: true, rating: 4.9 },
    { name: 'OpenAI GPT', desc: 'Large language model — chat completions, function calling, vision', category: 'AI', icon: <RobotOutlined />, color: '#14b8a6', version: 'v1.0', installed: false, rating: 4.8 },
    { name: 'SendGrid', desc: 'Transactional email — templates, analytics, deliverability optimization', category: 'Email', icon: <MailOutlined />, color: '#06b6d4', version: 'v3.0', installed: false, rating: 4.5 },
    { name: 'Twilio', desc: 'Communication APIs — SMS, WhatsApp, voice, video', category: 'Communication', icon: <ApiOutlined />, color: '#ec4899', version: 'v2.8', installed: false, rating: 4.6 },
    { name: 'AWS S3', desc: 'Cloud object storage — scalable, durable, globally distributed', category: 'Storage', icon: <CloudOutlined />, color: '#f97316', version: 'v1.0', installed: false, rating: 4.7 },
    { name: 'Shopify', desc: 'E-commerce platform — product sync, order management, inventory', category: 'Commerce', icon: <ShoppingOutlined />, color: '#84cc16', version: 'v2.0', installed: false, rating: 4.4 },
    { name: 'Dremio', desc: 'Data lakehouse — SQL federation, Iceberg tables, BI acceleration', category: 'Data', icon: <DatabaseOutlined />, color: '#0ea5e9', version: 'v1.3', installed: true, rating: 4.6 },
];

const CATEGORIES = ['All', 'Payment', 'Logistics', 'AI', 'Email', 'Communication', 'Storage', 'Commerce', 'Data'];

export default function MarketplacePage() {
    const { themeColor } = usePreferencesStore();
    const [cat, setCat] = useState('All');
    const [search, setSearch] = useState('');
    const filtered = INTEGRATIONS.filter(i => (cat === 'All' || i.category === cat) && (!search || i.name.toLowerCase().includes(search.toLowerCase())));
    const installed = INTEGRATIONS.filter(i => i.installed).length;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#ec4899', '#3b82f6']}>API Marketplace</AuroraText>} subTitle={<DecryptedText text="Browse, install & configure third-party integrations" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Available', v: INTEGRATIONS.length, c: '#3b82f6', i: <AppstoreOutlined /> }, { t: 'Installed', v: installed, c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Categories', v: CATEGORIES.length - 1, c: '#8b5cf6', i: <ApiOutlined /> }].map((s, i) => (
                        <Col key={i} xs={8}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Space><span style={{ color: s.c, fontSize: 20 }}>{s.i}</span><div><Text type="secondary" style={{ fontSize: 10 }}>{s.t}</Text><br /><Text strong style={{ color: s.c, fontSize: 18 }}>{s.v}</Text></div></Space></Card></Col>
                    ))}
                </Row>
                <Card size="small" style={glass}>
                    <Space style={{ marginBottom: 12 }} wrap>
                        <Input prefix={<SearchOutlined />} placeholder="Search integrations..." size="small" style={{ width: 220 }} value={search} onChange={e => setSearch(e.target.value)} />
                        {CATEGORIES.map(c => <Button key={c} size="small" type={cat === c ? 'primary' : 'default'} onClick={() => setCat(c)} style={{ fontSize: 11, borderRadius: 12 }}>{c}</Button>)}
                    </Space>
                    <Row gutter={[10, 10]}>
                        {filtered.map((ig, i) => (
                            <Col key={ig.name} xs={24} sm={12} md={8} lg={6}>
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                                    <Card size="small" hoverable style={{ borderTop: `3px solid ${ig.color}`, borderRadius: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <div style={{ fontSize: 22, color: ig.color }}>{ig.icon}</div>
                                            <div><Text strong style={{ fontSize: 12 }}>{ig.name}</Text><br /><Text type="secondary" style={{ fontSize: 9 }}>{ig.version} • ★ {ig.rating}</Text></div>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 8, lineHeight: 1.4 }}>{ig.desc}</Text>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Tag style={{ fontSize: 9, borderRadius: 6 }}>{ig.category}</Tag>
                                            <Button size="small" type={ig.installed ? 'default' : 'primary'} style={{ fontSize: 10, borderRadius: 8 }}>{ig.installed ? '✓ Installed' : 'Install'}</Button>
                                        </div>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
