'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { BranchesOutlined, TableOutlined, HistoryOutlined, TagOutlined, ReloadOutlined, LinkOutlined, DatabaseOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const BRANCHES = [
    { name: 'main', commits: 248, protected: true, color: '#10b981' },
    { name: 'develop', commits: 312, protected: true, color: '#3b82f6' },
    { name: 'feature/sales-report', commits: 15, protected: false, color: '#f59e0b' },
];
const COMMITS = [
    { hash: 'a3f7c12', branch: 'develop', message: 'Add sales_q2 table schema', author: 'adityo', time: '25m ago' },
    { hash: 'b8e1d45', branch: 'main', message: 'Merge develop into main', author: 'admin', time: '2h ago' },
    { hash: 'c4a9f67', branch: 'feature/sales-report', message: 'Create revenue_summary view', author: 'adityo', time: '4h ago' },
    { hash: 'd2b8e31', branch: 'develop', message: 'Update customer dimension table', author: 'data-eng', time: '1d ago' },
];
const CATALOG = [
    { key: 'warehouse.sales.orders', type: 'ICEBERG_TABLE', contentId: 'cid-a1b2c3', committed: '2025-05-22' },
    { key: 'warehouse.sales.customers', type: 'ICEBERG_TABLE', contentId: 'cid-d4e5f6', committed: '2025-05-21' },
    { key: 'warehouse.sales.revenue_summary', type: 'ICEBERG_VIEW', contentId: 'cid-g7h8i9', committed: '2025-05-22' },
    { key: 'warehouse.inventory.products', type: 'ICEBERG_TABLE', contentId: 'cid-j0k1l2', committed: '2025-05-20' },
    { key: 'warehouse.hr.employees', type: 'ICEBERG_TABLE', contentId: 'cid-m3n4o5', committed: '2025-05-19' },
];

export default function NessieCatalogPage() {
    const { themeColor } = usePreferencesStore();

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#10b981', '#3b82f6']}>Nessie Catalog</AuroraText>} subTitle={<DecryptedText text="Transactional data catalog — branches, tables & versioning" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Branches', v: BRANCHES.length, c: '#3b82f6', i: <BranchesOutlined /> }, { t: 'Tables', v: CATALOG.filter(c => c.type === 'ICEBERG_TABLE').length, c: '#10b981', i: <TableOutlined /> }, { t: 'Commits', v: BRANCHES.reduce((s, b) => s + b.commits, 0), c: '#8b5cf6', i: <HistoryOutlined /> }, { t: 'Active Tags', v: 5, c: '#f59e0b', i: <TagOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={10}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><BranchesOutlined style={{ color: '#3b82f6' }} /><Text strong>Branches</Text></Space>}>
                            {BRANCHES.map((b, i) => (
                                <motion.div key={b.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', marginBottom: 6, borderLeft: `3px solid ${b.color}` }}>
                                    <div><Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{b.name}</Text><br /><Text type="secondary" style={{ fontSize: 10 }}>{b.commits} commits</Text></div>
                                    {b.protected && <Tag color="blue" style={{ fontSize: 9, borderRadius: 8 }}>protected</Tag>}
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                    <Col xs={24} md={14}>
                        <Card size="small" style={glass} title={<Space><HistoryOutlined style={{ color: '#8b5cf6' }} /><Text strong>Recent Commits</Text></Space>}>
                            {COMMITS.map((c, i) => (
                                <motion.div key={c.hash} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.04 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                    <div><Text strong style={{ fontSize: 11, fontFamily: 'monospace', color: '#3b82f6' }}>{c.hash}</Text> <Text style={{ fontSize: 11 }}>{c.message}</Text><br /><Text type="secondary" style={{ fontSize: 9 }}>{c.author} · {c.branch}</Text></div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>{c.time}</Text>
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                </Row>

                <Card size="small" style={glass} title={<Space><DatabaseOutlined style={{ color: '#10b981' }} /><Text strong>Catalog Entries</Text><Badge count={CATALOG.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={CATALOG} rowKey="key" size="small" pagination={false} columns={[
                        { title: 'Key / Path', dataIndex: 'key', render: (v: string) => <Text strong style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Type', dataIndex: 'type', render: (v: string) => <Tag color={v.includes('TABLE') ? 'blue' : 'purple'} style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Content ID', dataIndex: 'contentId', render: (v: string) => <Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Committed', dataIndex: 'committed', render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
