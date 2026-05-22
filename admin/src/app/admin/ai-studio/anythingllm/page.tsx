'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { RobotOutlined, FileTextOutlined, DatabaseOutlined, MessageOutlined, ReloadOutlined, LinkOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const WORKSPACES = [
    { name: 'Customer Support', model: 'gemini-2.0-flash', documents: 24, lastChat: '10m ago', color: '#3b82f6' },
    { name: 'Knowledge Base', model: 'gemini-2.5-pro', documents: 89, lastChat: '1h ago', color: '#8b5cf6' },
    { name: 'Product Docs', model: 'gemini-2.0-flash', documents: 45, lastChat: '3h ago', color: '#10b981' },
];
const DOCUMENTS = [
    { name: 'onboarding-guide.pdf', workspace: 'Customer Support', type: 'PDF', tokens: 12450, embedded: true },
    { name: 'api-reference.md', workspace: 'Product Docs', type: 'Markdown', tokens: 8920, embedded: true },
    { name: 'faq-2024.docx', workspace: 'Knowledge Base', type: 'DOCX', tokens: 5640, embedded: true },
    { name: 'release-notes-v3.md', workspace: 'Product Docs', type: 'Markdown', tokens: 3210, embedded: false },
    { name: 'troubleshooting.pdf', workspace: 'Customer Support', type: 'PDF', tokens: 7890, embedded: true },
    { name: 'company-policies.pdf', workspace: 'Knowledge Base', type: 'PDF', tokens: 15320, embedded: false },
];

export default function AnythingLLMPage() {
    const { themeColor } = usePreferencesStore();
    const totalDocs = WORKSPACES.reduce((s, w) => s + w.documents, 0);
    const embeddedCount = DOCUMENTS.filter(d => d.embedded).length;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#3b82f6', '#8b5cf6']}>AnythingLLM</AuroraText>} subTitle={<DecryptedText text="AI workspaces, documents & embedding management" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:3001', '_blank')}>Open AnythingLLM</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Workspaces', v: WORKSPACES.length, c: '#3b82f6', i: <RobotOutlined /> }, { t: 'Documents', v: totalDocs, c: '#10b981', i: <FileTextOutlined /> }, { t: 'Embeddings', v: embeddedCount, c: '#8b5cf6', i: <DatabaseOutlined /> }, { t: 'Chat Sessions', v: 342, c: '#f59e0b', i: <MessageOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><RobotOutlined style={{ color: '#3b82f6' }} /><Text strong>Workspaces</Text><Badge count={WORKSPACES.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Row gutter={[10, 10]}>
                        {WORKSPACES.map((w, i) => (
                            <Col key={w.name} xs={24} md={8}>
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                                    <Card size="small" hoverable style={{ borderTop: `3px solid ${w.color}`, borderRadius: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><Text strong style={{ fontSize: 13 }}>{w.name}</Text><Tag color="green" style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>active</Tag></div>
                                        <Tag style={{ fontSize: 9, borderRadius: 8 }}>{w.model}</Tag>
                                        <Row gutter={4} style={{ marginTop: 8 }}><Col span={12}><Text type="secondary" style={{ fontSize: 9 }}>Documents</Text><br /><Text strong style={{ color: w.color, fontSize: 14 }}>{w.documents}</Text></Col><Col span={12}><Text type="secondary" style={{ fontSize: 9 }}>Last Chat</Text><br /><Text strong style={{ fontSize: 14 }}>{w.lastChat}</Text></Col></Row>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>

                <Card size="small" style={glass} title={<Space><FileTextOutlined style={{ color: '#10b981' }} /><Text strong>Recent Documents</Text><Badge count={DOCUMENTS.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={DOCUMENTS} rowKey="name" size="small" pagination={false} columns={[
                        { title: 'Name', dataIndex: 'name', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Workspace', dataIndex: 'workspace', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'Type', dataIndex: 'type', width: 80, render: (v: string) => <Tag color="blue" style={{ borderRadius: 8, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Tokens', dataIndex: 'tokens', width: 80, render: (v: number) => <Text style={{ fontSize: 11 }}>{v.toLocaleString()}</Text> },
                        { title: 'Embedded', dataIndex: 'embedded', width: 90, render: (v: boolean) => <Tag color={v ? 'green' : 'orange'} icon={v ? <CheckCircleOutlined /> : <SyncOutlined spin />} style={{ borderRadius: 10, fontSize: 10 }}>{v ? 'Yes' : 'Pending'}</Tag> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
