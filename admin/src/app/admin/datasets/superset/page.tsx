'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { BarChartOutlined, DashboardOutlined, DatabaseOutlined, PieChartOutlined, ReloadOutlined, LinkOutlined, UserOutlined, TableOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const DASHBOARDS = [
    { id: 1, title: 'Revenue Analytics', charts: 6, owner: 'admin', views: 234, updated: '2h ago', published: true, color: '#3b82f6' },
    { id: 2, title: 'Inventory Overview', charts: 4, owner: 'ops', views: 156, updated: '1d ago', published: true, color: '#8b5cf6' },
    { id: 3, title: 'HR Metrics', charts: 5, owner: 'hr.manager', views: 89, updated: '3d ago', published: false, color: '#10b981' },
    { id: 4, title: 'Marketing KPIs', charts: 8, owner: 'admin', views: 67, updated: '7d ago', published: true, color: '#f59e0b' },
];
const DATABASES_CONN = [
    { name: 'PostgreSQL (Main)', type: 'PostgreSQL', status: 'connected', tables: 42, host: 'postgres:5432' },
    { name: 'Dremio Lakehouse', type: 'Dremio', status: 'connected', tables: 15, host: 'dremio:31010' },
];
const CHARTS = [
    { title: 'Monthly Revenue Trend', type: 'Line', datasource: 'PostgreSQL', dashboard: 'Revenue Analytics' },
    { title: 'Top Products by Sales', type: 'Bar', datasource: 'PostgreSQL', dashboard: 'Revenue Analytics' },
    { title: 'Stock Level Distribution', type: 'Pie', datasource: 'PostgreSQL', dashboard: 'Inventory Overview' },
    { title: 'Employee Distribution', type: 'Donut', datasource: 'PostgreSQL', dashboard: 'HR Metrics' },
    { title: 'Campaign ROI', type: 'Area', datasource: 'Dremio', dashboard: 'Marketing KPIs' },
];

export default function SupersetPage() {
    const { themeColor } = usePreferencesStore();
    const totalCharts = DASHBOARDS.reduce((s, d) => s + d.charts, 0);
    const published = DASHBOARDS.filter(d => d.published).length;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#20a6c9', '#ef4444']}>Apache Superset</AuroraText>} subTitle={<DecryptedText text="Business intelligence dashboards, charts & data exploration" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:8080', '_blank')}>Open Superset</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Dashboards', v: DASHBOARDS.length, c: '#3b82f6', i: <DashboardOutlined /> }, { t: 'Charts', v: totalCharts, c: '#8b5cf6', i: <PieChartOutlined /> }, { t: 'Databases', v: DATABASES_CONN.length, c: '#10b981', i: <DatabaseOutlined /> }, { t: 'Published', v: published, c: '#f59e0b', i: <BarChartOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    {DASHBOARDS.map((d, i) => (
                        <Col key={d.id} xs={24} sm={12} md={6}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
                                <Card size="small" hoverable style={{ borderTop: `3px solid ${d.color}`, borderRadius: 10 }}>
                                    <Text strong style={{ fontSize: 12 }}>{d.title}</Text>
                                    <div style={{ marginTop: 4 }}><Tag color={d.published ? 'green' : 'default'} style={{ fontSize: 9, borderRadius: 8 }}>{d.published ? 'Published' : 'Draft'}</Tag></div>
                                    <Row gutter={4} style={{ marginTop: 6 }}><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Charts</Text><br /><Text strong style={{ fontSize: 14, color: d.color }}>{d.charts}</Text></Col><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Views</Text><br /><Text strong style={{ fontSize: 14 }}>{d.views}</Text></Col><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Updated</Text><br /><Text style={{ fontSize: 10 }}>{d.updated}</Text></Col></Row>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={8}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><DatabaseOutlined style={{ color: '#10b981' }} /><Text strong>Databases</Text></Space>}>
                            {DATABASES_CONN.map((db, i) => (
                                <div key={db.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', marginBottom: 6, borderLeft: '3px solid #10b981' }}>
                                    <div><Text strong style={{ fontSize: 12 }}>{db.name}</Text><br /><Text type="secondary" style={{ fontSize: 9 }}>{db.host} · {db.tables} tables</Text></div>
                                    <Tag color="green" style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{db.status}</Tag>
                                </div>
                            ))}
                        </Card>
                    </Col>
                    <Col xs={24} md={16}>
                        <Card size="small" style={glass} title={<Space><PieChartOutlined style={{ color: '#8b5cf6' }} /><Text strong>Charts</Text><Badge count={CHARTS.length} style={{ backgroundColor: '#8b5cf6' }} /></Space>}>
                            <Table dataSource={CHARTS} rowKey="title" size="small" pagination={false} columns={[
                                { title: 'Chart', dataIndex: 'title', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                                { title: 'Type', dataIndex: 'type', render: (v: string) => <Tag color="blue" style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> },
                                { title: 'Source', dataIndex: 'datasource', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                                { title: 'Dashboard', dataIndex: 'dashboard', render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
                            ]} />
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
