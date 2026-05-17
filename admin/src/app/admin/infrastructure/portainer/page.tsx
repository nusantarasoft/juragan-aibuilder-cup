'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { ContainerOutlined, DeploymentUnitOutlined, HddOutlined, ReloadOutlined, LinkOutlined, CheckCircleOutlined, CloudServerOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const ENDPOINTS = [
    { name: 'local', type: 'Docker', url: 'unix:///var/run/docker.sock', status: 'up', containers: 17, stacks: 1, color: '#3b82f6' },
];
const STACKS = [
    { name: 'nusantarasoft', type: 'Compose', status: 'active', services: 17, created: '2024-01-15', updated: '2h ago' },
];
const IMAGES = [
    { name: 'supabase/postgres', tag: '15.8.1.085', size: '1.2 GB', created: '30d ago' },
    { name: 'dremio/dremio-oss', tag: 'latest', size: '1.8 GB', created: '14d ago' },
    { name: 'minio/minio', tag: 'latest', size: '256 MB', created: '7d ago' },
    { name: 'kong', tag: '2.8.1', size: '145 MB', created: '30d ago' },
    { name: 'nusantarasoft/admin', tag: 'latest', size: '245 MB', created: '2h ago' },
    { name: 'nusantarasoft/middleware', tag: 'latest', size: '189 MB', created: '2h ago' },
];
const VOLUMES = [
    { name: 'postgres-data', driver: 'local', size: '4.2 GB', mountpoint: '/var/lib/docker/volumes/...' },
    { name: 'minio-data', driver: 'local', size: '2.1 GB', mountpoint: '/var/lib/docker/volumes/...' },
    { name: 'dremio-data', driver: 'local', size: '1.8 GB', mountpoint: '/var/lib/docker/volumes/...' },
    { name: 'supabase-storage', driver: 'local', size: '890 MB', mountpoint: '/var/lib/docker/volumes/...' },
];

export default function PortainerPage() {
    const { themeColor } = usePreferencesStore();
    const totalImages = IMAGES.length;
    const totalSize = IMAGES.reduce((s, i) => s + parseFloat(i.size), 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#13bee4', '#10b981']}>Portainer</AuroraText>} subTitle={<DecryptedText text="Container management, stacks, images & volumes" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:9090', '_blank')}>Open Portainer</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Endpoints', v: ENDPOINTS.length, c: '#3b82f6', i: <CloudServerOutlined /> }, { t: 'Containers', v: ENDPOINTS[0].containers, c: '#10b981', i: <DeploymentUnitOutlined /> }, { t: 'Images', v: totalImages, c: '#8b5cf6', i: <ContainerOutlined /> }, { t: 'Volumes', v: VOLUMES.length, c: '#f59e0b', i: <HddOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={12}>
                        <Card size="small" style={glass} title={<Space><CloudServerOutlined style={{ color: '#3b82f6' }} /><Text strong>Endpoints</Text></Space>}>
                            {ENDPOINTS.map((e, i) => (
                                <div key={e.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', borderLeft: `3px solid ${e.color}` }}>
                                    <div><Text strong style={{ fontSize: 13 }}>{e.name}</Text><br /><Text type="secondary" style={{ fontSize: 10 }}>{e.type} · {e.url}</Text></div>
                                    <Space><Badge count={e.containers} style={{ backgroundColor: '#10b981' }} /><Tag color="green" style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{e.status}</Tag></Space>
                                </div>
                            ))}
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card size="small" style={glass} title={<Space><ThunderboltOutlined style={{ color: '#10b981' }} /><Text strong>Stacks</Text></Space>}>
                            {STACKS.map(s => (
                                <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', borderLeft: '3px solid #10b981' }}>
                                    <div><Text strong style={{ fontSize: 13 }}>{s.name}</Text><br /><Text type="secondary" style={{ fontSize: 10 }}>{s.type} · {s.services} services</Text></div>
                                    <Space><Tag color="green" style={{ borderRadius: 10, fontSize: 10 }}>{s.status}</Tag><Text type="secondary" style={{ fontSize: 10 }}>{s.updated}</Text></Space>
                                </div>
                            ))}
                        </Card>
                    </Col>
                </Row>

                <Card size="small" style={glass} title={<Space><ContainerOutlined style={{ color: '#8b5cf6' }} /><Text strong>Images</Text><Badge count={IMAGES.length} style={{ backgroundColor: '#8b5cf6' }} /></Space>}>
                    <Table dataSource={IMAGES} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'Image', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Tag', dataIndex: 'tag', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8, fontFamily: 'monospace' }}>{v}</Tag> },
                        { title: 'Size', dataIndex: 'size', width: 80, render: (v: string) => <Text style={{ fontSize: 12, color: '#8b5cf6' }}>{v}</Text> },
                        { title: 'Created', dataIndex: 'created', render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                    ]} />
                </Card>

                <Card size="small" style={glass} title={<Space><HddOutlined style={{ color: '#f59e0b' }} /><Text strong>Volumes</Text></Space>}>
                    <Table dataSource={VOLUMES} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'Volume', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Driver', dataIndex: 'driver', width: 70 },
                        { title: 'Size', dataIndex: 'size', width: 80, render: (v: string) => <Text strong style={{ color: '#f59e0b' }}>{v}</Text> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
