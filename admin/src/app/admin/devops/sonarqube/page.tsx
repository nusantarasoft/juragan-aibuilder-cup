'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress } from 'antd';
import { BugOutlined, SafetyCertificateOutlined, CheckCircleOutlined, WarningOutlined, ReloadOutlined, LinkOutlined, CodeOutlined, PercentageOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const PROJECTS = [
    { name: 'admin', gate: 'OK', bugs: 2, vulns: 0, smells: 15, coverage: 78, duplication: 3.2, lines: 48500, color: '#10b981' },
    { name: 'middleware', gate: 'OK', bugs: 0, vulns: 1, smells: 8, coverage: 82, duplication: 2.1, lines: 12300, color: '#10b981' },
    { name: 'landing-page', gate: 'WARN', bugs: 1, vulns: 0, smells: 5, coverage: 65, duplication: 4.5, lines: 8900, color: '#f59e0b' },
];

const ISSUES = [
    { key: 'BUG-1', type: 'Bug', severity: 'Major', file: 'src/lib/graphqlClient.ts', line: 45, message: 'Possible null dereference', effort: '15min' },
    { key: 'BUG-2', type: 'Bug', severity: 'Minor', file: 'src/app/admin/crm/deals/page.tsx', line: 89, message: 'Unused variable assignment', effort: '5min' },
    { key: 'BUG-3', type: 'Bug', severity: 'Minor', file: 'src/app/page.tsx', line: 12, message: 'Missing alt attribute', effort: '2min' },
    { key: 'VULN-1', type: 'Vulnerability', severity: 'Critical', file: 'src/middleware/auth/auth.service.ts', line: 23, message: 'Hardcoded credential detected', effort: '30min' },
    { key: 'SMELL-1', type: 'Code Smell', severity: 'Minor', file: 'src/config/menuConfig.tsx', line: 156, message: 'Cognitive complexity too high', effort: '1h' },
];

export default function SonarQubePage() {
    const { themeColor } = usePreferencesStore();
    const totalBugs = PROJECTS.reduce((s, p) => s + p.bugs, 0);
    const totalVulns = PROJECTS.reduce((s, p) => s + p.vulns, 0);
    const avgCoverage = Math.round(PROJECTS.reduce((s, p) => s + p.coverage, 0) / PROJECTS.length);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#4e9bcd', '#10b981']}>SonarQube</AuroraText>} subTitle={<DecryptedText text="Code quality gates, coverage metrics & vulnerability scanning" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />} extra={[<Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open('http://localhost:9092', '_blank')}>Open SonarQube</Button>, <Button key="r" icon={<ReloadOutlined />} />]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Projects', v: PROJECTS.length, c: '#3b82f6', i: <CodeOutlined /> }, { t: 'Bugs', v: totalBugs, c: totalBugs > 0 ? '#f59e0b' : '#10b981', i: <BugOutlined /> }, { t: 'Vulnerabilities', v: totalVulns, c: totalVulns > 0 ? '#ef4444' : '#10b981', i: <WarningOutlined /> }, { t: 'Avg Coverage', v: `${avgCoverage}%`, c: avgCoverage >= 80 ? '#10b981' : '#f59e0b', i: <PercentageOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>

                <Row gutter={[14, 14]}>
                    {PROJECTS.map((p, i) => (
                        <Col key={p.name} xs={24} md={8}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
                                <Card size="small" hoverable style={{ ...glass, borderTop: `3px solid ${p.color}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text strong style={{ fontSize: 14 }}>{p.name}</Text>
                                        <Tag color={p.gate === 'OK' ? 'green' : 'orange'} style={{ borderRadius: 10, fontSize: 10 }}>{p.gate === 'OK' ? '✓ Passed' : '⚠ Warning'}</Tag>
                                    </div>
                                    <Row gutter={4}><Col span={6}><Text type="secondary" style={{ fontSize: 9 }}>Bugs</Text><br /><Text strong style={{ color: p.bugs > 0 ? '#f59e0b' : '#10b981' }}>{p.bugs}</Text></Col><Col span={6}><Text type="secondary" style={{ fontSize: 9 }}>Vulns</Text><br /><Text strong style={{ color: p.vulns > 0 ? '#ef4444' : '#10b981' }}>{p.vulns}</Text></Col><Col span={6}><Text type="secondary" style={{ fontSize: 9 }}>Smells</Text><br /><Text strong>{p.smells}</Text></Col><Col span={6}><Text type="secondary" style={{ fontSize: 9 }}>Dup%</Text><br /><Text strong>{p.duplication}%</Text></Col></Row>
                                    <div style={{ marginTop: 8 }}><Text type="secondary" style={{ fontSize: 10 }}>Coverage</Text><Progress percent={p.coverage} size="small" strokeColor={p.coverage >= 80 ? '#10b981' : p.coverage >= 60 ? '#f59e0b' : '#ef4444'} /></div>
                                    <Text type="secondary" style={{ fontSize: 9 }}>{p.lines.toLocaleString()} lines</Text>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                <Card size="small" style={glass} title={<Space><BugOutlined style={{ color: '#ef4444' }} /><Text strong>Open Issues</Text><Badge count={ISSUES.length} style={{ backgroundColor: '#ef4444' }} /></Space>}>
                    <Table dataSource={ISSUES} rowKey="key" size="small" pagination={false} columns={[
                        { title: 'Key', dataIndex: 'key', width: 70, render: (v: string) => <Text strong style={{ fontSize: 11, color: '#3b82f6' }}>{v}</Text> },
                        { title: 'Type', dataIndex: 'type', render: (v: string) => <Tag color={v === 'Bug' ? 'red' : v === 'Vulnerability' ? 'orange' : 'blue'} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Severity', dataIndex: 'severity', width: 80, render: (v: string) => <Tag color={v === 'Critical' ? '#ef4444' : v === 'Major' ? '#f59e0b' : '#6b7280'} style={{ borderRadius: 10, fontSize: 10, color: '#fff' }}>{v}</Tag> },
                        { title: 'File', dataIndex: 'file', render: (v: string, r: any) => <Text style={{ fontSize: 10, fontFamily: 'monospace' }}>{v}:{r.line}</Text> },
                        { title: 'Message', dataIndex: 'message', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                        { title: 'Effort', dataIndex: 'effort', width: 60 },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
