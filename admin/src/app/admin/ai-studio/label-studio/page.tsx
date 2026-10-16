'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Statistic, Space, Tag, Button, Table, Badge, Progress, Spin, Alert } from 'antd';
import { EditOutlined, FileSearchOutlined, CheckCircleOutlined, ClockCircleOutlined, ReloadOutlined, LinkOutlined, DatabaseOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    StudioDemoBanner, StudioDemoModeTag, StudioLiveBanner, StudioLiveModeTag,
} from '@/components/ai-studio/StudioDemoBanner';
import {
    DEMO_LABEL_STUDIO_DASHBOARD,
    labelStudioService,
    type LabelStudioDashboard,
    type LabelStudioProject,
} from '@/lib/labelStudioService';
import { aosGql } from '@/components/agentic-os/lib/api';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

export default function LabelStudioPage() {
    const { themeColor } = usePreferencesStore();
    const [uiDemoMode, setUiDemoMode] = useState<boolean | null>(null);
    const [dashboard, setDashboard] = useState<LabelStudioDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isDemo = uiDemoMode === true;

    const loadLive = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await labelStudioService.getDashboard();
            setDashboard(data);
            if (!data.configured && data.message) {
                setError(data.message);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load Label Studio dashboard');
            setDashboard({ configured: false, projects: [], recentAnnotations: [] });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const d = await aosGql<{ aosSettings: { uiDemoMode: boolean } }>(
                    `query { aosSettings { uiDemoMode } }`,
                );
                if (cancelled) return;
                const demo = d.aosSettings?.uiDemoMode === true;
                setUiDemoMode(demo);
                if (demo) {
                    setDashboard(DEMO_LABEL_STUDIO_DASHBOARD);
                    setLoading(false);
                } else {
                    await loadLive();
                }
            } catch {
                if (!cancelled) {
                    setUiDemoMode(false);
                    await loadLive();
                }
            }
        })();
        return () => { cancelled = true; };
    }, [loadLive]);

    const projects: LabelStudioProject[] = dashboard?.projects ?? [];
    const recent = dashboard?.recentAnnotations ?? [];
    const totalTasks = projects.reduce((s, p) => s + p.tasks, 0);
    const totalCompleted = projects.reduce((s, p) => s + p.completed, 0);
    const completionPct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    const openUrl = dashboard?.openUrl || 'http://localhost:8080';

    const modeTag = isDemo ? <StudioDemoModeTag key="mode" /> : <StudioLiveModeTag key="mode" />;

    const tableRows = useMemo(
        () =>
            recent.map((r) => ({
                id: r.id,
                task: r.taskLabel,
                project: r.projectName,
                label: r.label,
                annotator: r.annotator,
                time: labelStudioService.formatRelativeTime(r.updatedAt),
            })),
        [recent],
    );

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#ff6b35', '#10b981']}>Label Studio</AuroraText>}
            subTitle={<DecryptedText text="Data annotation projects, task progress & labeling analytics" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                modeTag,
                <Button key="o" icon={<LinkOutlined />} type="primary" onClick={() => window.open(openUrl, '_blank')}>Open Label Studio</Button>,
                <Button key="r" icon={<ReloadOutlined />} onClick={() => (isDemo ? undefined : loadLive())} loading={loading && !isDemo} disabled={isDemo} />,
            ]}
        >
            {isDemo ? (
                <StudioDemoBanner
                    title="Label Studio dashboard"
                    detail="Sample project stats — turn off Agentic OS UI demo mode to load live Label Studio API data (P2-4)."
                />
            ) : (
                <StudioLiveBanner
                    title="Label Studio dashboard"
                    detail="Project stats and recent annotations are loaded via middleware from the Label Studio API (tokens stay server-side)."
                />
            )}
            {error && !isDemo ? (
                <Alert type="warning" showIcon message={error} style={{ marginBottom: 16 }} closable />
            ) : null}
            <Spin spinning={loading && !isDemo}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Row gutter={[12, 12]}>
                        {[{ t: 'Projects', v: projects.length, c: '#3b82f6', i: <DatabaseOutlined /> }, { t: 'Total Tasks', v: totalTasks, c: '#8b5cf6', i: <FileSearchOutlined /> }, { t: 'Completed', v: totalCompleted, c: '#10b981', i: <CheckCircleOutlined /> }, { t: 'Completion Rate', v: `${completionPct}%`, c: '#f59e0b', i: <ClockCircleOutlined /> }].map((s, i) => (
                            <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                        ))}
                    </Row>

                    <Row gutter={[12, 12]}>
                        {projects.length === 0 && !loading ? (
                            <Col span={24}>
                                <Alert type="info" showIcon message="No Label Studio projects yet — create a project in Label Studio or send media from the Media library." />
                            </Col>
                        ) : null}
                        {projects.map((p, i) => (
                            <Col key={p.id} xs={24} md={8}>
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
                                    <Card size="small" hoverable style={{ ...glass, borderTop: `3px solid ${p.color}` }}>
                                        <Text strong style={{ fontSize: 13 }}>{p.name}</Text><br />
                                        <Tag style={{ fontSize: 9, borderRadius: 8, marginTop: 4 }}>{p.projectType}</Tag>
                                        <Progress percent={p.tasks > 0 ? Math.round((p.completed / p.tasks) * 100) : 0} size="small" strokeColor={p.color} style={{ marginTop: 8 }} />
                                        <Row gutter={4} style={{ marginTop: 4 }}><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Tasks</Text><br /><Text strong style={{ fontSize: 14 }}>{p.tasks}</Text></Col><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Done</Text><br /><Text strong style={{ fontSize: 14, color: '#10b981' }}>{p.completed}</Text></Col><Col span={8}><Text type="secondary" style={{ fontSize: 9 }}>Annotators</Text><br /><Text strong style={{ fontSize: 14 }}>{p.annotators}</Text></Col></Row>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>

                    <Card size="small" style={glass} title={<Space><EditOutlined style={{ color: themeColor }} /><Text strong>Recent Annotations</Text><Badge count={tableRows.length} style={{ backgroundColor: themeColor }} /></Space>}>
                        <Table
                            dataSource={tableRows}
                            rowKey="id"
                            size="small"
                            pagination={false}
                            locale={{ emptyText: isDemo ? 'No sample rows' : 'No synced annotations yet — complete tasks in Label Studio or send media to annotate.' }}
                            columns={[
                                { title: 'Task', dataIndex: 'task', render: (v: string) => <Text strong style={{ fontSize: 12 }}>{v}</Text> },
                                { title: 'Project', dataIndex: 'project', render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
                                { title: 'Label', dataIndex: 'label', render: (v: string) => <Tag color="blue" style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                                { title: 'Annotator', dataIndex: 'annotator', render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
                                { title: 'Time', dataIndex: 'time', render: (v: string) => <Text type="secondary" style={{ fontSize: 10 }}>{v}</Text> },
                            ]}
                        />
                    </Card>
                </motion.div>
            </Spin>
        </CMSLayout>
    );
}
