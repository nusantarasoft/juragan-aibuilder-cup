'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge } from 'antd';
import { ContainerOutlined, TagsOutlined, HddOutlined, CloudDownloadOutlined, ReloadOutlined, LinkOutlined, DatabaseOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const REPOS = [
    { name: 'nusantarasoft/admin', tags: 8, size: '1.2 GB', pulls: 245, color: '#3b82f6' },
    { name: 'nusantarasoft/middleware', tags: 6, size: '890 MB', pulls: 189, color: '#8b5cf6' },
    { name: 'nusantarasoft/landing-page', tags: 4, size: '420 MB', pulls: 124, color: '#10b981' },
];
const IMAGES = [
    { repo: 'nusantarasoft/admin', tag: 'latest', digest: 'sha256:a1b2c3d4', size: '245 MB', pushed: '2h ago', arch: 'linux/amd64' },
    { repo: 'nusantarasoft/admin', tag: 'v3.2.1', digest: 'sha256:e5f6g7h8', size: '243 MB', pushed: '1d ago', arch: 'linux/amd64' },
    { repo: 'nusantarasoft/middleware', tag: 'latest', digest: 'sha256:i9j0k1l2', size: '189 MB', pushed: '5h ago', arch: 'linux/amd64' },
    { repo: 'nusantarasoft/middleware', tag: 'v2.8.0', digest: 'sha256:m3n4o5p6', size: '187 MB', pushed: '3d ago', arch: 'linux/arm64' },
    { repo: 'nusantarasoft/landing-page', tag: 'latest', digest: 'sha256:q7r8s9t0', size: '98 MB', pushed: '1d ago', arch: 'linux/amd64' },
    { repo: 'nusantarasoft/landing-page', tag: 'v1.5.3', digest: 'sha256:u1v2w3x4', size: '96 MB', pushed: '5d ago', arch: 'linux/amd64' },
];

export default function DockerRegistryPage() {
    const { themeColor } = usePreferencesStore();
    const totalPulls = REPOS.reduce((s, r) => s + r.pulls, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#0db7ed', '#384d54']}>Docker Registry</AuroraText>} subTitle={<DecryptedText text="Container image repository — tags, layers & storage" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:5000', '_blank')}>Open Registry</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Repositories', v: REPOS.length, c: '#3b82f6', i: <DatabaseOutlined /> }, { t: 'Tags', v: IMAGES.length, c: '#10b981', i: <TagsOutlined /> }, { t: 'Total Size', v: '2.5 GB', c: '#8b5cf6', i: <HddOutlined /> }, { t: 'Pulls (24h)', v: totalPulls, c: '#f59e0b', i: <CloudDownloadOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><ContainerOutlined style={{ color: '#3b82f6' }} /><Text strong>Repositories</Text><Badge count={REPOS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Row gutter={[10, 10]}>
                        {REPOS.map((r, i) => (
                            <Col key={r.name} xs={24} md={8}>
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                                    <Card size="small" hoverable style={{ borderTop: `3px solid ${r.color}`, borderRadius: 10 }}>
                                        <Text strong style={{ fontSize: 13, fontFamily: 'monospace' }}>{r.name}</Text>
                                        <Row gutter={4} style={{ marginTop: 8 }}><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Tags</Text><br /><Text strong style={{ color: r.color, fontSize: 14 }}>{r.tags}</Text></Col><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Size</Text><br /><Text strong style={{ fontSize: 14 }}>{r.size}</Text></Col><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Pulls</Text><br /><Text strong style={{ fontSize: 14 }}>{r.pulls}</Text></Col></Row>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>

                <Card size="small" style={glass} title={<Space><TagsOutlined style={{ color: '#10b981' }} /><Text strong>Image Tags</Text><Badge count={IMAGES.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={IMAGES} rowKey={(_, i) => `img${i}`} size="small" pagination={false} columns={[
                        { title: 'Repository', dataIndex: 'repo', render: (v: string) => <Text strong style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Tag', dataIndex: 'tag', render: (v: string) => <Tag color={v === 'latest' ? 'blue' : 'default'} style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Digest', dataIndex: 'digest', render: (v: string) => <Text type="secondary" style={{ fontSize: 10, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Size', dataIndex: 'size', width: 80 },
                        { title: 'Pushed', dataIndex: 'pushed', render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
                        { title: 'Arch', dataIndex: 'arch', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
