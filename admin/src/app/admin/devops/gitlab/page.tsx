'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { CodeOutlined, BranchesOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, LinkOutlined, CloudServerOutlined, RocketOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const REPOS = [
    { name: 'nusantarasoft/admin', stars: 3, branches: 5, pipeline: 'passed', coverage: 78, lastCommit: '2h ago', lang: 'TypeScript' },
    { name: 'nusantarasoft/middleware', stars: 2, branches: 3, pipeline: 'passed', coverage: 82, lastCommit: '5h ago', lang: 'TypeScript' },
    { name: 'nusantarasoft/landing-page', stars: 1, branches: 2, pipeline: 'passed', coverage: 65, lastCommit: '1d ago', lang: 'TypeScript' },
    { name: 'nusantarasoft/infra', stars: 1, branches: 4, pipeline: 'failed', coverage: 0, lastCommit: '3d ago', lang: 'YAML' },
    { name: 'nusantarasoft/docs', stars: 0, branches: 1, pipeline: 'passed', coverage: 0, lastCommit: '7d ago', lang: 'Markdown' },
];
const PIPELINES = [
    { id: '#1234', repo: 'admin', branch: 'main', status: 'passed', stages: '4/4', duration: '8m 32s', triggered: '2h ago' },
    { id: '#1233', repo: 'middleware', branch: 'main', status: 'passed', stages: '3/3', duration: '5m 12s', triggered: '5h ago' },
    { id: '#1232', repo: 'infra', branch: 'feature/k8s', status: 'failed', stages: '2/4', duration: '3m 45s', triggered: '3d ago' },
    { id: '#1231', repo: 'admin', branch: 'develop', status: 'passed', stages: '4/4', duration: '9m 01s', triggered: '1d ago' },
];
const IMAGES = [
    { name: 'admin', tag: 'latest', size: '245 MB', pushed: '2h ago' },
    { name: 'middleware', tag: 'latest', size: '189 MB', pushed: '5h ago' },
    { name: 'landing-page', tag: 'latest', size: '98 MB', pushed: '1d ago' },
];

export default function GitLabPage() {
    const { themeColor } = usePreferencesStore();
    const passedPipelines = PIPELINES.filter(p => p.status === 'passed').length;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#fc6d26', '#e24329']}>GitLab</AuroraText>} subTitle={<DecryptedText text="Repository management, CI/CD pipelines & container registry" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:8929', '_blank')}>Open GitLab</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Repositories', v: REPOS.length, c: '#3b82f6', i: <CodeOutlined /> }, { t: 'Pipelines Passed', v: `${passedPipelines}/${PIPELINES.length}`, c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Registry Images', v: IMAGES.length, c: '#8b5cf6', i: <CloudServerOutlined /> }, { t: 'Total Branches', v: REPOS.reduce((s, r) => s + r.branches, 0), c: '#f59e0b', i: <BranchesOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><CodeOutlined style={{ color: '#3b82f6' }} /><Text strong>Repositories</Text><Badge count={REPOS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={REPOS} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'Repository', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Language', dataIndex: 'lang', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'Pipeline', dataIndex: 'pipeline', width: 80, render: (v: string) => <Tag color={v === 'passed' ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Coverage', dataIndex: 'coverage', width: 120, render: (v: number) => v > 0 ? <Progress percent={v} size="small" strokeColor={v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : '#ef4444'} /> : <Text type="secondary" style={{ fontSize: 10 }}>N/A</Text> },
                        { title: 'Branches', dataIndex: 'branches', width: 70 },
                        { title: 'Last Commit', dataIndex: 'lastCommit', render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
                    ]} />
                </Card>

                <Row gutter={[14, 14]}>
                    <Col xs={24} md={14}>
                        <Card size="small" style={glass} title={<Space><RocketOutlined style={{ color: '#10b981' }} /><Text strong>CI/CD Pipelines</Text></Space>}>
                            <Table dataSource={PIPELINES} rowKey="id" size="small" pagination={false} columns={[
                                { title: 'ID', dataIndex: 'id', width: 60, render: (v: string) => <Text strong style={{ fontSize: 11, color: '#3b82f6' }}>{v}</Text> },
                                { title: 'Repo', dataIndex: 'repo', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                                { title: 'Branch', dataIndex: 'branch', render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                                { title: 'Status', dataIndex: 'status', width: 70, render: (v: string) => <Tag color={v === 'passed' ? 'green' : 'red'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                                { title: 'Stages', dataIndex: 'stages', width: 60 },
                                { title: 'Duration', dataIndex: 'duration' },
                            ]} />
                        </Card>
                    </Col>
                    <Col xs={24} md={10}>
                        <Card size="small" style={{ ...glass, height: '100%' }} title={<Space><CloudServerOutlined style={{ color: '#8b5cf6' }} /><Text strong>Container Registry</Text></Space>}>
                            {IMAGES.map((img, i) => (
                                <motion.div key={img.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', marginBottom: 8, borderLeft: `3px solid ${['#3b82f6', '#8b5cf6', '#10b981'][i]}` }}>
                                    <div><Text strong style={{ fontSize: 12 }}>{img.name}</Text><br /><Text type="secondary" style={{ fontSize: 10 }}>{img.tag} · {img.size}</Text></div>
                                    <Text type="secondary" style={{ fontSize: 10 }}>{img.pushed}</Text>
                                </motion.div>
                            ))}
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
