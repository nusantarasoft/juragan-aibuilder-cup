'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { DatabaseOutlined, CloudServerOutlined, LinkOutlined, ReloadOutlined, CheckCircleOutlined, ThunderboltOutlined, HddOutlined, BarChartOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const DATABASES = [
    { name: 'nusantarasoft', owner: 'supabase_admin', size: '2.4 GB', tables: 42, connections: 12, encoding: 'UTF8', color: '#3b82f6' },
    { name: 'keycloak', owner: 'supabase_admin', size: '156 MB', tables: 28, connections: 3, encoding: 'UTF8', color: '#8b5cf6' },
    { name: 'mattermost', owner: 'supabase_admin', size: '89 MB', tables: 35, connections: 2, encoding: 'UTF8', color: '#10b981' },
    { name: 'sonarqube', owner: 'supabase_admin', size: '234 MB', tables: 52, connections: 1, encoding: 'UTF8', color: '#f59e0b' },
    { name: 'nextcloud', owner: 'supabase_admin', size: '78 MB', tables: 24, connections: 1, encoding: 'UTF8', color: '#06b6d4' },
    { name: 'postgres', owner: 'supabase_admin', size: '45 MB', tables: 8, connections: 2, encoding: 'UTF8', color: '#6b7280' },
    { name: 'npm', owner: 'supabase_admin', size: '12 MB', tables: 6, connections: 1, encoding: 'UTF8', color: '#ec4899' },
    { name: 'awx', owner: 'supabase_admin', size: '67 MB', tables: 18, connections: 1, encoding: 'UTF8', color: '#14b8a6' },
    { name: 'zabbix', owner: 'supabase_admin', size: '345 MB', tables: 64, connections: 2, encoding: 'UTF8', color: '#d40000' },
];

export default function PgAdminPage() {
    const { themeColor } = usePreferencesStore();
    const totalSize = '3.5 GB';
    const totalConns = DATABASES.reduce((s, d) => s + d.connections, 0);
    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#336791', '#10b981']}>pgAdmin</AuroraText>} subTitle={<DecryptedText text="Database management — servers, queries & performance" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:8888', '_blank')}>Open pgAdmin</Button>, <Button key="r" icon={<ReloadOutlined />} onClick={() => window.location.reload()} title="Refresh page" />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Servers', v: 1, c: '#3b82f6', i: <CloudServerOutlined /> }, { t: 'Databases', v: DATABASES.length, c: '#10b981', i: <DatabaseOutlined /> }, { t: 'Connections', v: totalConns, c: '#8b5cf6', i: <ThunderboltOutlined /> }, { t: 'Queries/sec', v: 45, c: '#f59e0b', i: <BarChartOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>
                <Card size="small" style={{ ...glass, borderLeft: '3px solid #336791' }} title={<Space><CloudServerOutlined style={{ color: '#336791' }} /><Text strong>PostgreSQL 15</Text><Tag color="green" style={{ borderRadius: 10, fontSize: 10 }}>online</Tag></Space>}>
                    <Row gutter={12}><Col span={6}><Text type="secondary" style={{ fontSize: 10 }}>Host</Text><br /><Text strong>postgres:5432</Text></Col><Col span={6}><Text type="secondary" style={{ fontSize: 10 }}>Version</Text><br /><Text strong>15.8.1</Text></Col><Col span={6}><Text type="secondary" style={{ fontSize: 10 }}>Uptime</Text><br /><Text strong style={{ color: '#10b981' }}>42d 5h</Text></Col><Col span={6}><Text type="secondary" style={{ fontSize: 10 }}>Total Size</Text><br /><Text strong style={{ color: '#8b5cf6' }}>{totalSize}</Text></Col></Row>
                </Card>
                <Card size="small" style={glass} title={<Space><DatabaseOutlined style={{ color: '#10b981' }} /><Text strong>Databases</Text><Badge count={DATABASES.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={DATABASES} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'Database', dataIndex: 'name', render: (v: string, r: any) => <Space><div style={{ width: 8, height: 8, borderRadius: 4, background: r.color }} /><Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text></Space> },
                        { title: 'Owner', dataIndex: 'owner', render: (v: string) => <Text style={{ fontSize: 10 }}>{v}</Text> },
                        { title: 'Size', dataIndex: 'size', width: 80, render: (v: string) => <Text strong style={{ color: '#8b5cf6' }}>{v}</Text> },
                        { title: 'Tables', dataIndex: 'tables', width: 60 },
                        { title: 'Connections', dataIndex: 'connections', width: 90, render: (v: number) => <Badge count={v} style={{ backgroundColor: v > 5 ? '#3b82f6' : '#6b7280' }} /> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
