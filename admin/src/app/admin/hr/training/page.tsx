"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Table, Tag, Typography, Row, Col, Statistic, Progress, Space, Segmented, Badge, Tooltip, Button } from "antd";
import { ReadOutlined, BookOutlined, SafetyCertificateOutlined, AppstoreOutlined, UnorderedListOutlined, ClockCircleOutlined, DollarOutlined, CalendarOutlined, PlusOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const TR_Q = `query($t:String!){hrTrainingPrograms(tenantId:$t){id name description category durationHours provider cost startDate endDate status isMandatory certificationName createdAt}}`;

const statusConfig: Record<string, { color: string; label: string; icon: string }> = {
    upcoming: { color: '#3b82f6', label: 'Upcoming', icon: '📅' },
    ongoing: { color: '#f59e0b', label: 'In Progress', icon: '🔄' },
    completed: { color: '#10b981', label: 'Completed', icon: '✅' },
    cancelled: { color: '#6b7280', label: 'Cancelled', icon: '❌' },
};
const catConfig: Record<string, { color: string; icon: string; gradient: string }> = {
    technical: { color: '#3b82f6', icon: '💻', gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)' },
    leadership: { color: '#8b5cf6', icon: '👑', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
    compliance: { color: '#ef4444', icon: '📋', gradient: 'linear-gradient(135deg, #ef4444, #f87171)' },
    soft_skills: { color: '#06b6d4', icon: '🤝', gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)' },
};

// Program Card
function ProgramCard({ program }: { program: any }) {
    const cat = catConfig[program.category] || catConfig.technical;
    const status = statusConfig[program.status] || statusConfig.upcoming;
    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(v);

    // Calculate progress for ongoing programs
    let progress = 0;
    if (program.status === 'completed') progress = 100;
    else if (program.status === 'ongoing' && program.startDate && program.endDate) {
        const start = dayjs(program.startDate);
        const end = dayjs(program.endDate);
        const now = dayjs();
        const total = end.diff(start, 'day');
        const elapsed = now.diff(start, 'day');
        progress = Math.min(Math.round((elapsed / (total || 1)) * 100), 99);
    }

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
            style={{ ...glass, padding: 16, borderRadius: 14, borderTop: `3px solid ${cat.color}`, height: '100%', cursor: 'default' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    {cat.icon}
                </div>
                <Space size={4}>
                    {program.isMandatory && <Tag color="red" style={{ borderRadius: 10, fontSize: 9, margin: 0 }}>Required</Tag>}
                    <Tag color={status.color} style={{ borderRadius: 10, fontSize: 9, margin: 0 }}>{status.icon} {status.label}</Tag>
                </Space>
            </div>

            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>{program.name}</Text>
            {program.description && <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 8 }} ellipsis>{program.description}</Text>}

            {/* Category + Certification */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                <Tag color={cat.color} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{program.category?.replace('_', ' ')}</Tag>
                {program.certificationName && <Tag color="gold" style={{ borderRadius: 10, fontSize: 10, margin: 0 }}><SafetyCertificateOutlined /> {program.certificationName}</Tag>}
            </div>

            {/* Progress for ongoing */}
            {(program.status === 'ongoing' || program.status === 'completed') && (
                <Progress percent={progress} size="small" strokeColor={cat.color} style={{ marginBottom: 8 }} />
            )}

            {/* Footer details */}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <Space size={8}>
                    <Tooltip title="Duration"><Space size={3}><ClockCircleOutlined style={{ color: '#6b7280' }} /><Text style={{ fontSize: 10 }}>{program.durationHours}h</Text></Space></Tooltip>
                    {program.provider && <Tooltip title="Provider"><Text style={{ fontSize: 10, color: '#6b7280' }}>{program.provider}</Text></Tooltip>}
                </Space>
                {program.cost > 0 && <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>Rp {fmt(program.cost)}</Text>}
                {program.cost === 0 && <Tag color="green" style={{ fontSize: 9, borderRadius: 10, margin: 0 }}>Free</Tag>}
            </div>

            {program.startDate && (
                <div style={{ marginTop: 6, fontSize: 10 }}>
                    <CalendarOutlined style={{ color: '#9ca3af', marginRight: 4 }} />
                    <Text style={{ fontSize: 10, color: '#9ca3af' }}>{dayjs(program.startDate).format('MMM D')} → {dayjs(program.endDate).format('MMM D, YYYY')}</Text>
                </div>
            )}
        </motion.div>
    );
}

export default function TrainingPage() {
    const [programs, setPrograms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<string>('grid');
    const { themeColor } = usePreferencesStore();

    useEffect(() => { gql(TR_Q, { t: DEFAULT_TENANT_ID }).then(d => setPrograms(d.hrTrainingPrograms || [])).catch(console.error).finally(() => setLoading(false)); }, []);

    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
    const completed = programs.filter(p => p.status === 'completed').length;
    const ongoing = programs.filter(p => p.status === 'ongoing').length;
    const mandatory = programs.filter(p => p.isMandatory).length;
    const totalCost = programs.reduce((s, p) => s + (p.cost || 0), 0);
    const totalHours = programs.reduce((s, p) => s + (p.durationHours || 0), 0);

    // Category distribution
    const catDist = useMemo(() => {
        const cats = Object.keys(catConfig);
        return cats.map(c => ({
            name: c.replace('_', ' '),
            count: programs.filter(p => p.category === c).length,
            ...catConfig[c],
        })).filter(c => c.count > 0);
    }, [programs]);
    const maxCat = Math.max(...catDist.map(c => c.count), 1);

    const columns = [
        { title: 'Program', key: 'name', render: (_: any, r: any) => <Space>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${(catConfig[r.category] || catConfig.technical).color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{(catConfig[r.category] || catConfig.technical).icon}</div>
            <div><Text strong style={{ fontSize: 13 }}>{r.name}</Text>{r.certificationName && <><br/><Tag color="gold" style={{ borderRadius: 10, fontSize: 9 }}><SafetyCertificateOutlined /> {r.certificationName}</Tag></>}</div>
        </Space> },
        { title: 'Category', dataIndex: 'category', key: 'cat', render: (v: string) => <Tag color={(catConfig[v] || catConfig.technical).color} style={{ borderRadius: 10 }}>{v?.replace('_', ' ')}</Tag> },
        { title: 'Provider', dataIndex: 'provider', key: 'prov', render: (v: string) => v || '—' },
        { title: 'Duration', dataIndex: 'durationHours', key: 'dur', render: (v: number) => <Space size={4}><ClockCircleOutlined style={{ color: '#6b7280' }} /><Text>{v}h</Text></Space>, align: 'center' as const },
        { title: 'Cost', dataIndex: 'cost', key: 'cost', render: (v: number) => v > 0 ? <Text style={{ color: '#f59e0b' }}>{fmt(v)}</Text> : <Tag color="green" style={{ borderRadius: 10 }}>Free</Tag>, align: 'right' as const },
        { title: 'Period', key: 'period', render: (_: any, r: any) => r.startDate ? <Text style={{ fontSize: 11 }}>{dayjs(r.startDate).format('MMM D')} → {dayjs(r.endDate).format('MMM D')}</Text> : '—' },
        { title: 'Mandatory', dataIndex: 'isMandatory', key: 'mand', render: (v: boolean) => v ? <Tag color="red" style={{ borderRadius: 10 }}>Required</Tag> : '—', align: 'center' as const },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={(statusConfig[v] || statusConfig.upcoming).color} style={{ borderRadius: 20 }}>{(statusConfig[v] || statusConfig.upcoming).icon} {(statusConfig[v] || statusConfig.upcoming).label}</Tag> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#06b6d4', '#8b5cf6', themeColor]} className="text-[22px] font-bold tracking-tight">Training & Development</AuroraText>}
            subTitle={<DecryptedText text="Training programs, certifications & skill development" animateOn="view" revealDirection="start" speed={60} sequential />}
            extra={[
                <Space key="actions">
                    <Segmented value={viewMode} onChange={(v: any) => setViewMode(v)} options={[{ label: <><AppstoreOutlined /> Cards</>, value: 'grid' }, { label: <><UnorderedListOutlined /> Table</>, value: 'table' }]} />
                    <Button type="primary" icon={<PlusOutlined />} style={{ background: themeColor }}>Add Program</Button>
                </Space>
            ]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Stats Row */}
                <Row gutter={[12, 12]}>
                    <Col xs={12} md={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #06b6d4' }}><Statistic title="Programs" value={programs.length} prefix={<ReadOutlined />} valueStyle={{ color: '#06b6d4' }} /></Card></Col>
                    <Col xs={12} md={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #f59e0b' }}><Statistic title="In Progress" value={ongoing} prefix={<ThunderboltOutlined />} valueStyle={{ color: '#f59e0b' }} /></Card></Col>
                    <Col xs={12} md={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #10b981' }}><Statistic title="Completed" value={completed} prefix={<BookOutlined />} valueStyle={{ color: '#10b981' }} /></Card></Col>
                    <Col xs={12} md={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #ef4444' }}><Statistic title="Mandatory" value={mandatory} prefix={<SafetyCertificateOutlined />} valueStyle={{ color: '#ef4444' }} /></Card></Col>
                    <Col xs={12} md={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #8b5cf6' }}><Statistic title="Total Hours" value={totalHours} suffix="h" prefix={<ClockCircleOutlined />} valueStyle={{ color: '#8b5cf6' }} /></Card></Col>
                    <Col xs={12} md={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #f59e0b' }}><Statistic title="Budget" value={fmt(totalCost)} valueStyle={{ color: '#f59e0b', fontSize: 14 }} /></Card></Col>
                </Row>

                {/* Category Distribution */}
                {catDist.length > 0 && (
                    <Card size="small" style={glass}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <Text strong style={{ fontSize: 12, minWidth: 100 }}>Categories:</Text>
                            {catDist.map((c, i) => (
                                <motion.div key={c.name} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: `${c.color}10`, border: `1px solid ${c.color}33` }}>
                                    <span>{c.icon}</span>
                                    <Text style={{ fontSize: 11 }}>{c.name}</Text>
                                    <Badge count={c.count} style={{ backgroundColor: c.color }} size="small" />
                                </motion.div>
                            ))}
                        </div>
                    </Card>
                )}

                {viewMode === 'grid' ? (
                    <Row gutter={[12, 12]}>
                        {programs.map((p, i) => (
                            <Col xs={24} sm={12} md={8} lg={6} key={p.id}>
                                <ProgramCard program={p} />
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <Card style={glass}>
                        <Table dataSource={programs} columns={columns} rowKey="id" loading={loading} pagination={false} size="middle" />
                    </Card>
                )}
            </motion.div>
        </CMSLayout>
    );
}
