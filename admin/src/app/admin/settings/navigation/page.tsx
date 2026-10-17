'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, message } from 'antd';
import { MenuOutlined, ApartmentOutlined, FileTextOutlined, AppstoreOutlined, ReloadOutlined, PlusOutlined, OrderedListOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const NAV_ITEMS = [
    { label: 'Home', path: '/', parent: '—', order: 1, status: 'active', icon: 'HomeOutlined', menu: 'Primary' },
    { label: 'Products', path: '/products', parent: '—', order: 2, status: 'active', icon: 'ShopOutlined', menu: 'Primary' },
    { label: 'Enterprise Suite', path: '/products/enterprise', parent: 'Products', order: 1, status: 'active', icon: 'CloudOutlined', menu: 'Primary' },
    { label: 'Pricing', path: '/pricing', parent: '—', order: 3, status: 'active', icon: 'DollarOutlined', menu: 'Primary' },
    { label: 'Blog', path: '/blog', parent: '—', order: 4, status: 'active', icon: 'ReadOutlined', menu: 'Primary' },
    { label: 'About', path: '/about', parent: '—', order: 5, status: 'draft', icon: 'InfoCircleOutlined', menu: 'Primary' },
    { label: 'Privacy Policy', path: '/privacy', parent: '—', order: 1, status: 'active', icon: 'SafetyOutlined', menu: 'Footer' },
    { label: 'Terms of Service', path: '/terms', parent: '—', order: 2, status: 'active', icon: 'FileProtectOutlined', menu: 'Footer' },
    { label: 'Contact', path: '/contact', parent: '—', order: 3, status: 'active', icon: 'MailOutlined', menu: 'Footer' },
];
const MENUS = [
    { name: 'Primary Navigation', items: 6, depth: 2, color: '#3b82f6' },
    { name: 'Footer Links', items: 3, depth: 1, color: '#10b981' },
    { name: 'Breadcrumbs', items: 'Auto', depth: 3, color: '#8b5cf6' },
];

export default function NavigationSettingsPage() {
    const { themeColor } = usePreferencesStore();
    const activeItems = NAV_ITEMS.filter(n => n.status === 'active').length;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#3b82f6', '#10b981']}>Navigation Manager</AuroraText>} subTitle={<DecryptedText text="Menu structure, breadcrumbs & navigation tree management" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="a" icon={<PlusOutlined />} type="primary" onClick={() => message.info('Navigation editing is managed in CMS — this view is read-only sample data.')}>Add Item</Button>, <Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Menu Items', v: NAV_ITEMS.length, c: '#3b82f6', i: <MenuOutlined /> }, { t: 'Max Depth', v: 3, c: '#8b5cf6', i: <ApartmentOutlined /> }, { t: 'Active Menus', v: MENUS.length, c: '#10b981', i: <AppstoreOutlined /> }, { t: 'Published Pages', v: activeItems, c: '#f59e0b', i: <FileTextOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><AppstoreOutlined style={{ color: '#3b82f6' }} /><Text strong>Menu Groups</Text><Badge count={MENUS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Row gutter={[10, 10]}>
                        {MENUS.map((m, i) => (
                            <Col key={m.name} xs={24} md={8}>
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                                    <Card size="small" hoverable style={{ borderTop: `3px solid ${m.color}`, borderRadius: 10 }}>
                                        <Text strong style={{ fontSize: 13 }}>{m.name}</Text>
                                        <Row gutter={4} style={{ marginTop: 8 }}><Col span={12}><Text type="secondary" style={{ fontSize: 9 }}>Items</Text><br /><Text strong style={{ color: m.color, fontSize: 14 }}>{m.items}</Text></Col><Col span={12}><Text type="secondary" style={{ fontSize: 9 }}>Max Depth</Text><br /><Text strong style={{ fontSize: 14 }}>{m.depth}</Text></Col></Row>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>

                <Card size="small" style={glass} title={<Space><OrderedListOutlined style={{ color: '#8b5cf6' }} /><Text strong>Menu Entries</Text><Badge count={NAV_ITEMS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={NAV_ITEMS} rowKey="path" size="small" pagination={false} columns={[
                        { title: 'Label', dataIndex: 'label', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Path', dataIndex: 'path', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Parent', dataIndex: 'parent' },
                        { title: 'Menu', dataIndex: 'menu', render: (v: string) => <Tag color={v === 'Primary' ? 'blue' : 'cyan'} style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Order', dataIndex: 'order', width: 60 },
                        { title: 'Status', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'active' ? 'green' : 'orange'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Icon', dataIndex: 'icon', render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
