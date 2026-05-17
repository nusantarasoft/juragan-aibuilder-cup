'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { EditOutlined, FileSearchOutlined, CheckCircleOutlined, ClockCircleOutlined, ReloadOutlined, LinkOutlined, UserOutlined, DatabaseOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const PROJECTS = [
    { id: 1, name: 'Document Classification', type: 'Text Classification', tasks: 450, completed: 380, annotators: 3, color: '#3b82f6' },
    { id: 2, name: 'Image Labeling', type: 'Object Detection', tasks: 200, completed: 145, annotators: 2, color: '#8b5cf6' },
    { id: 3, name: 'Sentiment Analysis', type: 'Text Classification', tasks: 1200, completed: 1200, annotators: 4, color: '#10b981' },
];
const RECENT = [
    { id: 1, task: 'Invoice #2024-089', project: 'Document Classification', annotator: 'admin', label: 'invoice', time: '5m ago' },
    { id: 2, task: 'Product Photo #456', project: 'Image Labeling', annotator: 'hr.manager', label: 'electronics', time: '15m ago' },
    { id: 3, task: 'Review #7823', project: 'Sentiment Analysis', annotator: 'dev', label: 'positive', time: '30m ago' },
    { id: 4, task: 'Invoice #2024-090', project: 'Document Classification', annotator: 'admin', label: 'receipt', time: '1h ago' },
];

export default function LabelStudioPage() {
    const { themeColor } = usePreferencesStore();
    const totalTasks = PROJECTS.reduce((s, p) => s + p.tasks, 0);
    const totalCompleted = PROJECTS.reduce((s, p) => s + p.completed, 0);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#ff6b35', '#10b981']}>Label Studio</AuroraText>} subTitle={<DecryptedText text="Data annotation projects, task progress & labeling analytics" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:8080', '_blank')}>Open Label Studio</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Projects', v: PROJECTS.length, c: '#3b82f6', i: <DatabaseOutlined /> }, { t: 'Total Tasks', v: totalTasks, c: '#8b5cf6', i: <FileSearchOutlined /> }, { t: 'Completed', v: totalCompleted, c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Completion Rate', v: `${Math.round((totalCompleted / totalTasks) * 100)}%`, c: '#f59e0b', i: <ClockCircleOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[12, 12]}>
                    {PROJECTS.map((p, i) => (
                        <Col key={p.id} xs={24} md={8}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
                                <Card size="small" hoverable style={{ ...glass, borderTop: `3px solid ${p.color}` }}>
                                    <Text strong style={{ fontSize: 13 }}>{p.name}</Text><br />
                                    <Tag style={{ fontSize: 9, borderRadius: 8, marginTop: 4 }}>{p.type}</Tag>
                                    <Progress percent={Math.round((p.completed / p.tasks) * 100)} size="small" strokeColor={p.color} style={{ marginTop: 8 }} />
                                    <Row gutter={4} style={{ marginTop: 4 }}><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Tasks</Text><br /><Text strong style={{ fontSize: 14 }}>{p.tasks}</Text></Col><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Done</Text><br /><Text strong style={{ fontSize: 14, color: '#10b981' }}>{p.completed}</Text></Col><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Annotators</Text><br /><Text strong style={{ fontSize: 14 }}>{p.annotators}</Text></Col></Row>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><EditOutlined style={{ color: themeColor }} /><Text strong>Recent Annotations</Text><Badge count={RECENT.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={RECENT} rowKey="id" size="small" pagination={false} columns={[
                        { title: 'Task', dataIndex: 'task', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Project', dataIndex: 'project', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                        { title: 'Label', dataIndex: 'label', render: (v: string) => <Tag color="blue" style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Annotator', dataIndex: 'annotator', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                        { title: 'Time', dataIndex: 'time', render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
