'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Select, Input, Checkbox, Divider } from 'antd';
import { BuildOutlined, DatabaseOutlined, FilterOutlined, BarChartOutlined, TableOutlined, PlayCircleOutlined, SaveOutlined, EyeOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const PREVIEW = [
    { id: 1, name: 'Andi Wijaya', dept: 'Engineering', revenue: 125000, deals: 8, status: 'Active' },
    { id: 2, name: 'Sari Dewi', dept: 'Sales', revenue: 245000, deals: 15, status: 'Active' },
    { id: 3, name: 'Budi Santoso', dept: 'Marketing', revenue: 89000, deals: 5, status: 'Active' },
    { id: 4, name: 'Maya Putri', dept: 'Support', revenue: 67000, deals: 3, status: 'Inactive' },
];

const CHARTS = ['📊 Bar', '📈 Line', '🥧 Pie', '📋 Table', '📉 Area', '🔢 Metric'];

export default function ReportBuilderPage() {
    const { themeColor } = usePreferencesStore();
    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#8b5cf6', '#06b6d4']}>Report Builder</AuroraText>} subTitle={<DecryptedText text="Visual report designer — select data, configure & export" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="s" icon={<SaveOutlined />} type="primary">Save Report</Button>]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Row gutter={[14, 14]}>
                    <Col xs={24} md={8}>
                        <Card size="small" style={glass} title={<Space><DatabaseOutlined style={{ color: '#3b82f6' }} /><Text strong>Data Source</Text></Space>}>
                            <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                <div><Text type="secondary" style={{ fontSize: 11 }}>Source</Text><Select defaultValue="supabase" style={{ width: '100%', marginTop: 4 }} size="small" options={[{ label: 'Supabase — nusantarasoft', value: 'supabase' }, { label: 'Dremio — Lakehouse', value: 'dremio' }]} /></div>
                                <div><Text type="secondary" style={{ fontSize: 11 }}>Table</Text><Select defaultValue="crm_contacts" style={{ width: '100%', marginTop: 4 }} size="small" options={['users', 'crm_contacts', 'invoices', 'employees', 'tickets'].map(t => ({ label: t, value: t }))} /></div>
                                <Divider style={{ margin: '6px 0' }} />
                                <div><Text type="secondary" style={{ fontSize: 11 }}>Columns</Text>
                                    {['name', 'dept', 'revenue', 'deals', 'status'].map(c => <div key={c} style={{ padding: '2px 0' }}><Checkbox defaultChecked><Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{c}</Text></Checkbox></div>)}
                                </div>
                            </Space>
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card size="small" style={glass} title={<Space><FilterOutlined style={{ color: '#f59e0b' }} /><Text strong>Filters</Text></Space>}>
                            <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                <div><Text type="secondary" style={{ fontSize: 11 }}>Filter</Text><Select mode="multiple" style={{ width: '100%', marginTop: 4 }} size="small" defaultValue={['active']} options={[{ label: 'status = Active', value: 'active' }, { label: 'revenue > 100k', value: 'rev' }]} /></div>
                                <div><Text type="secondary" style={{ fontSize: 11 }}>Group By</Text><Select style={{ width: '100%', marginTop: 4 }} size="small" defaultValue="dept" options={[{ label: 'dept', value: 'dept' }, { label: 'status', value: 'status' }]} /></div>
                                <div><Text type="secondary" style={{ fontSize: 11 }}>Sort</Text><Select style={{ width: '100%', marginTop: 4 }} size="small" defaultValue="rev_desc" options={[{ label: 'revenue DESC', value: 'rev_desc' }, { label: 'name ASC', value: 'name_asc' }]} /></div>
                                <div><Text type="secondary" style={{ fontSize: 11 }}>Limit</Text><Input size="small" defaultValue="100" style={{ marginTop: 4 }} /></div>
                            </Space>
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card size="small" style={glass} title={<Space><BarChartOutlined style={{ color: '#8b5cf6' }} /><Text strong>Visualization</Text></Space>}>
                            <Row gutter={[6, 6]}>{CHARTS.map((c, i) => <Col key={i} span={8}><Button size="small" block type={i === 3 ? 'primary' : 'default'} style={{ fontSize: 10, height: 32 }}>{c}</Button></Col>)}</Row>
                            <Divider style={{ margin: '10px 0' }} />
                            <div><Text type="secondary" style={{ fontSize: 11 }}>Export</Text><Select style={{ width: '100%', marginTop: 4 }} size="small" defaultValue="pdf" options={[{ label: 'PDF', value: 'pdf' }, { label: 'Excel', value: 'xlsx' }, { label: 'CSV', value: 'csv' }]} /></div>
                        </Card>
                    </Col>
                </Row>
                <Card size="small" style={glass} title={<Space><TableOutlined style={{ color: '#10b981' }} /><Text strong>Preview</Text><Tag color="green" style={{ fontSize: 10, borderRadius: 8 }}>4 rows</Tag></Space>} extra={<Button size="small" icon={<PlayCircleOutlined />} type="primary">Run</Button>}>
                    <Table dataSource={PREVIEW} rowKey="id" size="small" pagination={false} columns={[
                        { title: 'Name', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Dept', dataIndex: 'dept', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'Revenue', dataIndex: 'revenue', render: (v: number) => <Text style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Rp {v.toLocaleString()}</Text> },
                        { title: 'Deals', dataIndex: 'deals' },
                        { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={v === 'Active' ? 'green' : 'red'} style={{ fontSize: 10, borderRadius: 10 }}>{v}</Tag> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
