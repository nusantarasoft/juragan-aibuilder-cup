"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { Card, Table, Tag, Button, Space, Typography, Row, Col, Statistic, Avatar, Tooltip, Segmented, Badge, message } from "antd";
import { SolutionOutlined, PlusOutlined, UserAddOutlined, StarFilled, AppstoreOutlined, UnorderedListOutlined, MailOutlined, PhoneOutlined, ArrowRightOutlined, FileExcelOutlined, FilePdfOutlined  } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const JP_Q = `query($t:String!){hrJobPostings(tenantId:$t){id title departmentName description location employmentType salaryMin salaryMax status postedDate closingDate openings createdAt}}`;
const AP_Q = `query($t:String!,$jp:String){hrApplicants(tenantId:$t,jobPostingId:$jp){id jobPostingId jobTitle firstName lastName email phone source stage rating createdAt}}`;
const UPDATE_STAGE = `mutation($id:String!,$s:String!){updateHrApplicantStage(id:$id,stage:$s){id stage}}`;

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
const stageConfig: Record<string, { color: string; bg: string; label: string; icon: string }> = {
    applied: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: 'Applied', icon: '📥' },
    screening: { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', label: 'Screening', icon: '🔍' },
    interview: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', label: 'Interview', icon: '💬' },
    offer: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Offer', icon: '📋' },
    hired: { color: '#10b981', bg: 'rgba(16,185,129,0.08)', label: 'Hired', icon: '🎉' },
    rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', label: 'Rejected', icon: '❌' },
};

function KanbanColumn({ stage, applicants, onMove }: { stage: string; applicants: any[]; onMove: (id: string, stage: string) => void }) {
    const cfg = stageConfig[stage];
    const nextStage = STAGES[STAGES.indexOf(stage) + 1];
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: STAGES.indexOf(stage) * 0.08 }}
            style={{ flex: 1, minWidth: 200, maxWidth: 240 }}>
            <div style={{ padding: '8px 12px', borderRadius: '10px 10px 0 0', background: cfg.bg, borderBottom: `2px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space size={6}><span>{cfg.icon}</span><Text strong style={{ color: cfg.color, fontSize: 13 }}>{cfg.label}</Text></Space>
                <Badge count={applicants.length} style={{ backgroundColor: cfg.color }} size="small" />
            </div>
            <div style={{ background: cfg.bg, borderRadius: '0 0 10px 10px', minHeight: 300, padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <AnimatePresence>
                    {applicants.map((a, i) => (
                        <motion.div key={a.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: i * 0.04 }} whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            style={{ ...glass, padding: 10, borderRadius: 10, cursor: 'default', borderLeft: `3px solid ${cfg.color}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                <div>
                                    <Text strong style={{ fontSize: 13, display: 'block' }}>{a.firstName} {a.lastName}</Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>{a.jobTitle}</Text>
                                </div>
                                {a.rating > 0 && <Space size={2}>{Array.from({ length: a.rating }, (_, i) => <StarFilled key={i} style={{ color: '#f59e0b', fontSize: 10 }} />)}</Space>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
                                {a.email && <Text style={{ fontSize: 10, color: '#6b7280' }}><MailOutlined /> {a.email}</Text>}
                                <Text style={{ fontSize: 10, color: '#6b7280' }}><SolutionOutlined /> {a.source}</Text>
                            </div>
                            {nextStage && stage !== 'hired' && stage !== 'rejected' && (
                                <Button size="small" block type="text" style={{ fontSize: 11, color: stageConfig[nextStage]?.color, borderColor: stageConfig[nextStage]?.color, border: `1px solid ${stageConfig[nextStage]?.color}22`, borderRadius: 6 }}
                                    onClick={() => onMove(a.id, nextStage)} icon={<ArrowRightOutlined />}>
                                    {stageConfig[nextStage]?.label}
                                </Button>
                            )}
                        </motion.div>
                    ))}
                    {applicants.length === 0 && <div style={{ textAlign: 'center', padding: 20 }}><Text type="secondary" style={{ fontSize: 12 }}>No applicants</Text></div>}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

export default function RecruitmentPage() {
    const [postings, setPostings] = useState<any[]>([]);
    const [applicants, setApplicants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<string | undefined>();
    const [viewMode, setViewMode] = useState<string>('kanban');
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();

    const load = () => {
        setLoading(true);
        Promise.all([gql(JP_Q, { t: DEFAULT_TENANT_ID }), gql(AP_Q, { t: DEFAULT_TENANT_ID, jp: selectedJob })])
            .then(([j, a]) => { setPostings(j.hrJobPostings || []); setApplicants(a.hrApplicants || []); })
            .catch(console.error).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, [selectedJob]);

    const handleMoveStage = async (id: string, stage: string) => {
        try {
            await gql(UPDATE_STAGE, { id, s: stage });
            message.success(`Moved to ${stageConfig[stage]?.label}`);
            load();
        } catch (e: any) { message.error(e.message); }
    };

    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
    const openCount = postings.filter(p => p.status === 'open').length;
    const pipelineApplicants = applicants.filter(a => !['hired', 'rejected'].includes(a.stage));

    // Funnel conversion rates
    const stageData = STAGES.slice(0, -1).map(s => ({ stage: s, count: applicants.filter(a => a.stage === s).length }));
    const totalApplied = applicants.length || 1;

    const jobCols = [
        { title: 'Position', key: 'title', render: (_: any, r: any) => <><Text strong style={{ cursor: 'pointer', color: selectedJob === r.id ? themeColor : undefined }} onClick={() => setSelectedJob(s => s === r.id ? undefined : r.id)}>{r.title}</Text><br/><Text type="secondary" style={{ fontSize: 11 }}>{r.departmentName}</Text></> },
        { title: 'Location', dataIndex: 'location', key: 'loc', render: (v: string) => v || '—' },
        { title: 'Salary Range', key: 'sal', render: (_: any, r: any) => r.salaryMin ? <Text style={{ fontSize: 12 }}>{fmt(r.salaryMin)} — {fmt(r.salaryMax)}</Text> : '—' },
        { title: 'Openings', dataIndex: 'openings', key: 'open', align: 'center' as const },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={v === 'open' ? 'green' : v === 'filled' ? 'blue' : 'default'}>{v}</Tag> },
        { title: 'Closing', dataIndex: 'closingDate', key: 'close' },
    ];

    const appCols = [
        { title: 'Applicant', key: 'name', render: (_: any, r: any) => <Space><Avatar style={{ backgroundColor: stageConfig[r.stage]?.color || themeColor, fontSize: 12 }}>{r.firstName?.[0]}{r.lastName?.[0]}</Avatar><div><Text strong>{r.firstName} {r.lastName}</Text><br/><Text type="secondary" style={{ fontSize: 11 }}>{r.email}</Text></div></Space> },
        { title: 'Position', dataIndex: 'jobTitle', key: 'job' },
        { title: 'Source', dataIndex: 'source', key: 'src', render: (v: string) => <Tag>{v}</Tag> },
        { title: 'Stage', dataIndex: 'stage', key: 'stage', render: (v: string) => <Tag color={stageConfig[v]?.color}>{stageConfig[v]?.icon} {stageConfig[v]?.label}</Tag> },
        { title: 'Rating', dataIndex: 'rating', key: 'rat', render: (v: number) => v ? <Space>{Array.from({ length: v }, (_, i) => <StarFilled key={i} style={{ color: '#f59e0b', fontSize: 12 }} />)}</Space> : '—' },
        { title: 'Applied', dataIndex: 'createdAt', key: 'date', render: (v: string) => new Date(v).toLocaleDateString() },
        { title: 'Actions', key: 'actions', render: (_: any, r: any) => { const next = STAGES[STAGES.indexOf(r.stage) + 1]; return next && r.stage !== 'hired' && r.stage !== 'rejected' ? <Button size="small" type="link" icon={<ArrowRightOutlined />} onClick={() => handleMoveStage(r.id, next)}>{stageConfig[next]?.label}</Button> : null; } },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#f59e0b', '#10b981', themeColor]} className="text-[22px] font-bold tracking-tight">Recruitment</AuroraText>}
            subTitle={<DecryptedText text="Job postings, applicant pipeline & hiring workflow" animateOn="view" revealDirection="start" speed={60} sequential />}
            extra={[
                <RbacGuard requiredRole="manager"><Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'hr_recruitment', title: 'HR Recruitment', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Department', key: 'departmentName' }, { header: 'Status', key: 'status' }], data: postings })} /></Tooltip> <Tooltip key="pdf" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'hr_recruitment', title: 'HR Recruitment', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Department', key: 'departmentName' }, { header: 'Status', key: 'status' }], data: postings })} /></Tooltip></RbacGuard>,
                <Segmented key="view" value={viewMode} onChange={(v: any) => setViewMode(v)} options={[{ label: <><AppstoreOutlined /> Kanban</>, value: 'kanban' }, { label: <><UnorderedListOutlined /> Table</>, value: 'table' }]} />,
            ]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Stats Row */}
                <Row gutter={[16, 16]}>
                    <Col xs={6}><Card size="small" style={glass}><Statistic title="Open Positions" value={openCount} prefix={<SolutionOutlined />} valueStyle={{ color: '#f59e0b' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={glass}><Statistic title="Total Applicants" value={applicants.length} prefix={<UserAddOutlined />} valueStyle={{ color: '#3b82f6' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={glass}><Statistic title="In Pipeline" value={pipelineApplicants.length} prefix={<SolutionOutlined />} valueStyle={{ color: '#8b5cf6' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={glass}><Statistic title="Hired" value={applicants.filter(a => a.stage === 'hired').length} prefix={<span>🎉</span>} valueStyle={{ color: '#10b981' }} /></Card></Col>
                </Row>

                {/* Conversion Funnel */}
                <Card size="small" style={glass} title={<Text strong style={{ fontSize: 13 }}>📊 Hiring Funnel</Text>}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {STAGES.filter(s => s !== 'rejected').map((s, i) => {
                            const cnt = applicants.filter(a => a.stage === s).length;
                            const pct = Math.round((cnt / totalApplied) * 100);
                            const cfg = stageConfig[s];
                            return (
                                <React.Fragment key={s}>
                                    <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.1 }}
                                        style={{ flex: 1, background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}11)`, border: `1px solid ${cfg.color}33`, borderRadius: 8, padding: '8px 12px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${pct}%`, height: 3, background: cfg.color, borderRadius: 3 }} />
                                        <Text style={{ fontSize: 10, color: cfg.color, display: 'block' }}>{cfg.icon} {cfg.label}</Text>
                                        <Text strong style={{ fontSize: 16, color: cfg.color }}>{cnt}</Text>
                                    </motion.div>
                                    {i < STAGES.length - 2 && <ArrowRightOutlined style={{ color: '#d1d5db', fontSize: 12 }} />}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </Card>

                {/* Job Postings */}
                <Card style={glass} title={<><SolutionOutlined /> Job Postings</>} extra={selectedJob && <Tag closable onClose={() => setSelectedJob(undefined)} color={themeColor}>Filtered</Tag>}>
                    <Table scroll={{ x: 900 }} dataSource={postings} columns={jobCols} rowKey="id" loading={loading} pagination={false} size="middle"
                        onRow={r => ({ onClick: () => setSelectedJob(s => s === r.id ? undefined : r.id), style: { cursor: 'pointer', background: selectedJob === r.id ? `${themeColor}08` : undefined } })} />
                </Card>

                {/* Kanban or Table View */}
                {viewMode === 'kanban' ? (
                    <Card style={{ ...glass, overflow: 'auto' }} title={<><UserAddOutlined /> Applicant Pipeline</>}>
                        <div style={{ display: 'flex', gap: 12, minWidth: STAGES.length * 220, paddingBottom: 8 }}>
                            {STAGES.map(stage => (
                                <KanbanColumn key={stage} stage={stage} applicants={applicants.filter(a => a.stage === stage)} onMove={handleMoveStage} />
                            ))}
                        </div>
                    </Card>
                ) : (
                    <Card style={glass} title={<><UserAddOutlined /> Applicants</>}>
                        <Table scroll={{ x: 900 }} dataSource={applicants} columns={appCols} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} size="middle" />
                    </Card>
                )}
            </motion.div>
        </CMSLayout>
    );
}

