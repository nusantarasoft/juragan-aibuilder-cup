'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { ApiOutlined, DatabaseOutlined, TableOutlined, SafetyCertificateOutlined, ReloadOutlined, LinkOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const TABLES = [
    { name: 'users', schema: 'public', rows: 156, columns: 12, tracked: true, permissions: 4 },
    { name: 'profiles', schema: 'public', rows: 156, columns: 8, tracked: true, permissions: 3 },
    { name: 'media_library', schema: 'public', rows: 2340, columns: 15, tracked: true, permissions: 4 },
    { name: 'inventory_items', schema: 'public', rows: 890, columns: 18, tracked: true, permissions: 3 },
    { name: 'crm_contacts', schema: 'public', rows: 1234, columns: 14, tracked: true, permissions: 4 },
    { name: 'audit_logs', schema: 'public', rows: 45600, columns: 10, tracked: false, permissions: 1 },
];
const ACTIONS = [
    { name: 'send_notification', type: 'mutation', handler: 'http://middleware:4001/webhooks/notify', kind: 'synchronous' },
    { name: 'generate_report', type: 'mutation', handler: 'http://middleware:4001/webhooks/report', kind: 'asynchronous' },
];
const EVENTS = [
    { table: 'users', trigger: 'user_created', operation: 'INSERT', webhook: 'http://middleware:4001/events/user-created' },
    { table: 'inventory_items', trigger: 'stock_updated', operation: 'UPDATE', webhook: 'http://middleware:4001/events/stock-changed' },
];

export default function HasuraPage() {
    const { themeColor } = usePreferencesStore();
    const trackedTables = TABLES.filter(t => t.tracked).length;
    const totalRows = TABLES.reduce((s, t) => s + t.rows, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#1eb4d4', '#3b82f6']}>Hasura GraphQL</AuroraText>} subTitle={<DecryptedText text="Table explorer, actions, event triggers & permissions" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:8094', '_blank')}>Open Console</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Tracked Tables', v: trackedTables, c: '#3b82f6', i: <TableOutlined /> }, { t: 'Total Rows', v: totalRows.toLocaleString(), c: '#10b981', i: <DatabaseOutlined /> }, { t: 'Actions', v: ACTIONS.length, c: '#8b5cf6', i: <ThunderboltOutlined /> }, { t: 'Event Triggers', v: EVENTS.length, c: '#f59e0b', i: <ApiOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><TableOutlined style={{ color: '#3b82f6' }} /><Text strong>Tables</Text><Badge count={TABLES.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={TABLES} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'Table', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Schema', dataIndex: 'schema', width: 70, render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'Rows', dataIndex: 'rows', width: 80, render: (v: number) => <Text strong style={{ color: '#10b981' }}>{v.toLocaleString()}</Text> },
                        { title: 'Columns', dataIndex: 'columns', width: 70 },
                        { title: 'Tracked', dataIndex: 'tracked', width: 70, render: (v: boolean) => <Tag color={v ? 'green' : 'default'} style={{ borderRadius: 10, fontSize: 10 }}>{v ? 'Yes' : 'No'}</Tag> },
                        { title: 'Permissions', dataIndex: 'permissions', width: 90, render: (v: number) => <Badge count={v} style={{ backgroundColor: '#8b5cf6' }} /> },
                    ]} />
                </Card>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={12}>
                        <Card size="small" style={glass} title={<Space><ThunderboltOutlined style={{ color: '#8b5cf6' }} /><Text strong>Actions</Text></Space>}>
                            {ACTIONS.map((a, i) => (
                                <motion.div key={a.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', marginBottom: 6, borderLeft: '3px solid #8b5cf6' }}>
                                    <div><Text strong style={{ fontSize: 12 }}>{a.name}</Text><br /><Text type="secondary" style={{ fontSize: 9, fontFamily: 'monospace' }}>{a.handler}</Text></div>
                                    <Space><Tag style={{ fontSize: 9, borderRadius: 8 }}>{a.type}</Tag><Tag color="blue" style={{ fontSize: 9, borderRadius: 8 }}>{a.kind}</Tag></Space>
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card size="small" style={glass} title={<Space><ApiOutlined style={{ color: '#f59e0b' }} /><Text strong>Event Triggers</Text></Space>}>
                            {EVENTS.map((e, i) => (
                                <motion.div key={e.trigger} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.05 }} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', marginBottom: 6, borderLeft: '3px solid #f59e0b' }}>
                                    <div><Text strong style={{ fontSize: 12 }}>{e.trigger}</Text><br /><Text type="secondary" style={{ fontSize: 9 }}>{e.table} → {e.operation}</Text></div>
                                    <Tag color="orange" style={{ fontSize: 9, borderRadius: 8, margin: 0 }}>{e.operation}</Tag>
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
