"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { Card, Table, Tag, Button, Space, Typography, message, Modal, Form, Input, Select, InputNumber, Row, Col, Statistic, Badge, Tooltip } from "antd";
import { SkinOutlined, PlusOutlined, RiseOutlined, TeamOutlined, ApartmentOutlined, DollarOutlined, FileExcelOutlined, FilePdfOutlined  } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const POS_Q = `query($t:String!){hrPositions(tenantId:$t){id title code departmentId departmentName grade minSalary maxSalary currency isActive headcountBudget}}`;
const DEPT_Q = `query($t:String!){hrDepartments(tenantId:$t){id name}}`;
const CREATE_POS = `mutation($t:String!,$i:CreatePositionInput!){createHrPosition(tenantId:$t,input:$i){id}}`;

const gradeConfig: Record<string, { color: string; level: string; order: number }> = {
    D1: { color: '#ef4444', level: 'Director', order: 7 },
    D2: { color: '#f97316', level: 'Sr. Director', order: 6 },
    M1: { color: '#8b5cf6', level: 'Manager', order: 5 },
    M2: { color: '#a855f7', level: 'Sr. Manager', order: 4 },
    L3: { color: '#3b82f6', level: 'Senior', order: 3 },
    L2: { color: '#06b6d4', level: 'Mid-Level', order: 2 },
    L1: { color: '#10b981', level: 'Junior', order: 1 },
};

// Salary Band Chart
function SalaryBandChart({ positions }: { positions: any[] }) {
    const withSalary = positions.filter(p => p.minSalary && p.maxSalary).sort((a, b) => b.maxSalary - a.maxSalary).slice(0, 8);
    if (withSalary.length === 0) return <Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: 20 }}>No salary data</Text>;

    const maxSal = Math.max(...withSalary.map(p => p.maxSalary));
    const barHeight = 28;
    const gap = 6;
    const height = withSalary.length * (barHeight + gap);
    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(v);

    return (
        <svg viewBox={`0 0 320 ${height}`} width="100%" height={height}>
            {withSalary.map((p, i) => {
                const gc = gradeConfig[p.grade] || { color: '#6b7280' };
                const minPct = (p.minSalary / maxSal) * 220;
                const maxPct = (p.maxSalary / maxSal) * 220;
                const y = i * (barHeight + gap);
                return (
                    <g key={p.id}>
                        {/* Label */}
                        <text x="0" y={y + 18} fontSize="9" fill="#6b7280" fontWeight="500">{p.title?.substring(0, 16)}</text>
                        {/* Range bar */}
                        <rect x={90 + minPct} y={y + 2} width={maxPct - minPct} height={barHeight - 4} rx="6" fill={`${gc.color}20`} stroke={gc.color} strokeWidth="1">
                            <animate attributeName="width" from="0" to={maxPct - minPct} dur="0.8s" fill="freeze" />
                        </rect>
                        {/* Min label */}
                        <text x={88 + minPct} y={y + 18} fontSize="8" fill={gc.color} textAnchor="end" fontWeight="600">{fmt(p.minSalary)}</text>
                        {/* Max label */}
                        <text x={92 + maxPct} y={y + 18} fontSize="8" fill={gc.color} fontWeight="600">{fmt(p.maxSalary)}</text>
                    </g>
                );
            })}
        </svg>
    );
}

export default function PositionsPage() {
    const [positions, setPositions] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();

    const load = () => {
        setLoading(true);
        Promise.all([gql(POS_Q, { t: DEFAULT_TENANT_ID }), gql(DEPT_Q, { t: DEFAULT_TENANT_ID })])
            .then(([p, d]) => { setPositions(p.hrPositions || []); setDepartments(d.hrDepartments || []); })
            .catch(console.error).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

    const handleCreate = async (values: any) => {
        try { await gql(CREATE_POS, { t: DEFAULT_TENANT_ID, i: values }); message.success('Position created'); setModalOpen(false); form.resetFields(); load(); }
        catch (e: any) { message.error(e.message); }
    };

    // Stats
    const active = positions.filter(p => p.isActive).length;
    const totalHeadcount = positions.reduce((s, p) => s + (p.headcountBudget || 0), 0);
    const gradeDist = useMemo(() => {
        const dist: Record<string, number> = {};
        positions.forEach(p => { if (p.grade) dist[p.grade] = (dist[p.grade] || 0) + 1; });
        return Object.entries(dist).sort((a, b) => (gradeConfig[b[0]]?.order || 0) - (gradeConfig[a[0]]?.order || 0));
    }, [positions]);

    const columns = [
        { title: 'Position', key: 'title', render: (_: any, r: any) => (
            <Space>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${(gradeConfig[r.grade] || { color: themeColor }).color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SkinOutlined style={{ color: (gradeConfig[r.grade] || { color: themeColor }).color, fontSize: 14 }} />
                </div>
                <div>
                    <Text strong style={{ fontSize: 13 }}>{r.title}</Text>
                    {r.code && <Text type="secondary" style={{ marginLeft: 6, fontSize: 10 }}>({r.code})</Text>}
                </div>
            </Space>
        )},
        { title: 'Department', dataIndex: 'departmentName', key: 'dept', render: (v: string) => v ? <Tag style={{ borderRadius: 10 }}>{v}</Tag> : '—' },
        { title: 'Grade', dataIndex: 'grade', key: 'grade', render: (v: string) => v ? (
            <Tooltip title={gradeConfig[v]?.level}>
                <Tag color={gradeConfig[v]?.color} style={{ borderRadius: 20, fontWeight: 600 }}>{v}</Tag>
            </Tooltip>
        ) : '—', align: 'center' as const },
        { title: 'Salary Range', key: 'salary', render: (_: any, r: any) => r.minSalary && r.maxSalary ? (
            <div>
                <Text style={{ fontSize: 12 }}>{fmt(r.minSalary)} — {fmt(r.maxSalary)}</Text>
                <div style={{ height: 4, borderRadius: 2, background: `${(gradeConfig[r.grade] || { color: '#6b7280' }).color}15`, marginTop: 4 }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.8 }}
                        style={{ height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${(gradeConfig[r.grade] || { color: '#6b7280' }).color}66, ${(gradeConfig[r.grade] || { color: '#6b7280' }).color})` }} />
                </div>
            </div>
        ) : '—' },
        { title: 'Headcount', dataIndex: 'headcountBudget', key: 'hc', align: 'center' as const,
            render: (v: number) => <Badge count={v || 0} style={{ backgroundColor: '#8b5cf6' }} showZero /> },
        { title: 'Status', dataIndex: 'isActive', key: 'status',
            render: (v: boolean) => <Tag color={v ? 'green' : 'default'} style={{ borderRadius: 20 }}>{v ? '● Active' : '○ Inactive'}</Tag> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#f59e0b', '#8b5cf6', themeColor]} className="text-[22px] font-bold tracking-tight">Positions</AuroraText>}
            subTitle={<DecryptedText text="Job titles, grades & salary band catalog" animateOn="view" revealDirection="start" speed={60} sequential />}
            extra={[
                <RbacGuard requiredRole="manager"><Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'hr_positions', title: 'HR Positions', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Department', key: 'departmentName' }, { header: 'Status', key: 'status' }], data: positions })} /></Tooltip> <Tooltip key="pdf" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'hr_positions', title: 'HR Positions', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Title', key: 'title' }, { header: 'Department', key: 'departmentName' }, { header: 'Status', key: 'status' }], data: positions })} /></Tooltip></RbacGuard>,
                <Button key="add" type="primary" icon={<PlusOutlined />} style={{ background: themeColor }} onClick={() => setModalOpen(true)}>Add Position</Button>,
            ]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Stats */}
                <Row gutter={[12, 12]}>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #3b82f6' }}><Statistic title="Total Positions" value={positions.length} prefix={<SkinOutlined />} valueStyle={{ color: '#3b82f6' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #10b981' }}><Statistic title="Active" value={active} valueStyle={{ color: '#10b981' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #8b5cf6' }}><Statistic title="Headcount Budget" value={totalHeadcount} prefix={<TeamOutlined />} valueStyle={{ color: '#8b5cf6' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #f59e0b' }}><Statistic title="Departments" value={departments.length} prefix={<ApartmentOutlined />} valueStyle={{ color: '#f59e0b' }} /></Card></Col>
                </Row>

                {/* Grade Distribution + Salary Band */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={10}>
                        <Card title={<><RiseOutlined /> Grade Distribution</>} size="small" style={{ ...glass, height: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {gradeDist.map(([grade, count], i) => {
                                    const gc = gradeConfig[grade] || { color: '#6b7280', level: grade };
                                    const maxCount = Math.max(...gradeDist.map(g => g[1] as number), 1);
                                    return (
                                        <motion.div key={grade} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                                            style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Tag color={gc.color} style={{ borderRadius: 20, fontWeight: 600, minWidth: 40, textAlign: 'center' }}>{grade}</Tag>
                                            <Text style={{ fontSize: 10, width: 65, color: '#6b7280' }}>{gc.level}</Text>
                                            <div style={{ flex: 1, height: 20, borderRadius: 10, background: `${gc.color}10`, overflow: 'hidden' }}>
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${(count / maxCount) * 100}%` }} transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                                                    style={{ height: '100%', borderRadius: 10, background: `linear-gradient(90deg, ${gc.color}88, ${gc.color})`, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                                                    <Text style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{count}</Text>
                                                </motion.div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={14}>
                        <Card title={<><DollarOutlined /> Salary Band Ranges</>} size="small" style={{ ...glass, height: '100%' }}>
                            <SalaryBandChart positions={positions} />
                        </Card>
                    </Col>
                </Row>

                {/* Table */}
                <Card style={glass}>
                    <Table scroll={{ x: 900 }} dataSource={positions} columns={columns} rowKey="id" loading={loading} pagination={false} size="middle" />
                </Card>
            </motion.div>

            <Modal title="Add Position" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Row gutter={12}>
                        <Col span={16}><Form.Item name="title" label="Title" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={8}><Form.Item name="code" label="Code"><Input /></Form.Item></Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}><Form.Item name="departmentId" label="Department"><Select allowClear options={departments.map(d => ({ label: d.name, value: d.id }))} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="grade" label="Grade"><Select options={Object.entries(gradeConfig).map(([k, v]) => ({ label: `${k} — ${v.level}`, value: k }))} /></Form.Item></Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={8}><Form.Item name="minSalary" label="Min Salary"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="maxSalary" label="Max Salary"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="headcountBudget" label="Headcount" initialValue={1}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>
        </CMSLayout>
    );
}


