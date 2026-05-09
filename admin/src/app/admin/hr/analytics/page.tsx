"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Typography, Row, Col, Statistic, Progress, Tag, Space, Badge, Tooltip } from "antd";
import { LineChartOutlined, TeamOutlined, RiseOutlined, FallOutlined, ManOutlined, WomanOutlined, ApartmentOutlined, DollarOutlined, ClockCircleOutlined, StarFilled, CalendarOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const anim = (i: number) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.06 } });

const STATS_Q = `query($t:String!){hrDashboardStats(tenantId:$t){totalEmployees activeEmployees totalDepartments maleCount femaleCount totalPayroll avgSalary fullTimeCount contractCount openJobPostings totalApplicants totalReviews totalTrainings pendingLeaveRequests totalLeaveRequests newHiresThisMonth}}`;
const DEPT_Q = `query($t:String!){hrDepartments(tenantId:$t){id name}}`;
const EMP_Q = `query($t:String!){hrEmployees(tenantId:$t){id departmentId departmentName hireDate gender employmentType employmentStatus baseSalary terminationDate}}`;
const AP_Q = `query($t:String!){hrApplicants(tenantId:$t){id stage createdAt}}`;

// SVG Sparkline
function Sparkline({ data, color, width = 200, height = 50 }: { data: number[]; color: string; width?: number; height?: number }) {
    if (data.length < 2) return null;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4)}`).join(' ');
    const areaPoints = `0,${height} ${points} ${width},${height}`;
    return (
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}>
            <defs><linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0.02" /></linearGradient></defs>
            <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`}>
                <animate attributeName="opacity" from="0" to="1" dur="0.8s" fill="freeze" />
            </polygon>
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <animate attributeName="stroke-dasharray" from={`0 ${width * 3}`} to={`${width * 3} 0`} dur="1.2s" fill="freeze" />
            </polyline>
            {/* End dot */}
            <circle cx={(data.length - 1) / (data.length - 1) * width} cy={height - ((data[data.length - 1] - min) / range) * (height - 4)} r="3" fill={color}>
                <animate attributeName="r" from="0" to="3" dur="0.5s" begin="0.8s" fill="freeze" />
            </circle>
        </svg>
    );
}

// Salary Band Distribution
function SalaryBands({ employees }: { employees: any[] }) {
    const active = employees.filter(e => e.employmentStatus === 'active' && e.baseSalary > 0);
    const bands = [
        { label: '< 15M', min: 0, max: 15e6, color: '#3b82f6' },
        { label: '15-25M', min: 15e6, max: 25e6, color: '#8b5cf6' },
        { label: '25-40M', min: 25e6, max: 40e6, color: '#f59e0b' },
        { label: '40-60M', min: 40e6, max: 60e6, color: '#10b981' },
        { label: '60M+', min: 60e6, max: Infinity, color: '#ec4899' },
    ].map(b => ({ ...b, count: active.filter(e => e.baseSalary >= b.min && e.baseSalary < b.max).length }));
    const maxCount = Math.max(...bands.map(b => b.count), 1);

    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140, padding: '0 8px' }}>
            {bands.map((b, i) => (
                <motion.div key={b.label} initial={{ height: 0 }} animate={{ height: `${(b.count / maxCount) * 100}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                    style={{ flex: 1, minHeight: b.count > 0 ? 20 : 4, borderRadius: '8px 8px 0 0', background: `linear-gradient(180deg, ${b.color}, ${b.color}88)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '4px 0', position: 'relative', cursor: 'default' }}>
                    <Tooltip title={`${b.count} employees`}><Text style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{b.count}</Text></Tooltip>
                </motion.div>
            ))}
        </div>
    );
}

export default function AnalyticsPage() {
    const [stats, setStats] = useState<any>({});
    const [depts, setDepts] = useState<any[]>([]);
    const [emps, setEmps] = useState<any[]>([]);
    const [applicants, setApplicants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();

    useEffect(() => {
        Promise.all([
            gql(STATS_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrDashboardStats: {} })),
            gql(DEPT_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrDepartments: [] })),
            gql(EMP_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrEmployees: [] })),
            gql(AP_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrApplicants: [] })),
        ]).then(([s, d, e, a]) => {
            setStats(s.hrDashboardStats || {});
            setDepts(d.hrDepartments || []);
            setEmps(e.hrEmployees || []);
            setApplicants(a.hrApplicants || []);
        }).finally(() => setLoading(false));
    }, []);

    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
    const active = emps.filter(e => e.employmentStatus === 'active');
    const totalActive = active.length || 1;

    // Tenure Distribution
    const tenureGroups = [
        { label: '< 1 year', min: 0, max: 1, color: '#3b82f6', icon: '🆕' },
        { label: '1-3 years', min: 1, max: 3, color: '#8b5cf6', icon: '📈' },
        { label: '3-5 years', min: 3, max: 5, color: '#f59e0b', icon: '⭐' },
        { label: '5+ years', min: 5, max: Infinity, color: '#10b981', icon: '🏆' },
    ].map(g => {
        const count = active.filter(e => { const y = (Date.now() - new Date(e.hireDate).getTime()) / (365.25 * 86400000); return y >= g.min && y < g.max; }).length;
        return { ...g, count, pct: Math.round((count / totalActive) * 100) };
    });

    // Department distribution with salary
    const deptColors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#ef4444', '#6366f1'];
    const deptDist = depts.map((d, i) => {
        const deptEmps = active.filter(e => e.departmentName === d.name);
        const totalSal = deptEmps.reduce((s, e) => s + (Number(e.baseSalary) || 0), 0);
        return { name: d.name, count: deptEmps.length, salary: totalSal, avgSalary: deptEmps.length > 0 ? Math.round(totalSal / deptEmps.length) : 0, color: deptColors[i % deptColors.length] };
    }).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

    // Hiring velocity (hires per month, last 12 months)
    const hiringData = useMemo(() => {
        const months: number[] = [];
        for (let i = 11; i >= 0; i--) {
            const m = dayjs().subtract(i, 'month');
            const count = active.filter(e => dayjs(e.hireDate).format('YYYY-MM') === m.format('YYYY-MM')).length;
            months.push(count);
        }
        return months;
    }, [active]);

    // Attrition data
    const terminated = emps.filter(e => e.employmentStatus === 'terminated' || e.terminationDate);
    const attritionRate = emps.length > 0 ? Math.round((terminated.length / emps.length) * 100) : 0;

    // Gender pay gap analysis
    const maleAvg = (() => { const m = active.filter(e => e.gender === 'male' && e.baseSalary > 0); return m.length > 0 ? m.reduce((s, e) => s + Number(e.baseSalary), 0) / m.length : 0; })();
    const femaleAvg = (() => { const f = active.filter(e => e.gender === 'female' && e.baseSalary > 0); return f.length > 0 ? f.reduce((s, e) => s + Number(e.baseSalary), 0) / f.length : 0; })();
    const payGapPct = maleAvg > 0 ? Math.round(((maleAvg - femaleAvg) / maleAvg) * 100) : 0;

    // Applicant pipeline conversion
    const stages = ['applied', 'screening', 'interview', 'offer', 'hired'];
    const pipelineData = stages.map(s => applicants.filter(a => a.stage === s).length);

    // Salary band labels
    const salaryBandLabels = ['< 15M', '15-25M', '25-40M', '40-60M', '60M+'];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#3b82f6', '#10b981', themeColor]} className="text-[22px] font-bold tracking-tight">Workforce Analytics</AuroraText>}
            subTitle={<DecryptedText text="Data-driven workforce insights & organizational metrics" animateOn="view" revealDirection="start" speed={60} sequential />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Key Metrics */}
                <Row gutter={[12, 12]}>
                    {[
                        { label: 'Headcount', value: stats.totalEmployees || 0, icon: <TeamOutlined />, color: '#3b82f6' },
                        { label: 'Avg Salary', value: fmt(stats.avgSalary || 0), icon: <DollarOutlined />, color: '#10b981', size: 14 },
                        { label: 'Gender Ratio', value: `${stats.maleCount || 0}:${stats.femaleCount || 0}`, icon: <Space size={4}><ManOutlined /><WomanOutlined /></Space>, color: '#8b5cf6' },
                        { label: 'Full-Time %', value: `${Math.round(((stats.fullTimeCount || 0) / totalActive) * 100)}%`, icon: <TeamOutlined />, color: '#f59e0b' },
                        { label: 'Attrition Rate', value: `${attritionRate}%`, icon: <FallOutlined />, color: attritionRate > 15 ? '#ef4444' : '#10b981' },
                        { label: 'New Hires/Mo', value: stats.newHiresThisMonth || 0, icon: <RiseOutlined />, color: '#06b6d4' },
                    ].map((c, i) => (
                        <Col xs={12} md={4} key={i}>
                            <motion.div {...anim(i)}>
                                <Card size="small" style={{ ...glass, borderTop: `3px solid ${c.color}`, textAlign: 'center' }}>
                                    <div style={{ color: c.color, fontSize: 18, marginBottom: 2 }}>{c.icon}</div>
                                    <Text strong style={{ fontSize: (c as any).size || 20, color: c.color, display: 'block' }}>{c.value}</Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>{c.label}</Text>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Charts Row 1 */}
                <Row gutter={[16, 16]}>
                    {/* Hiring Velocity Sparkline */}
                    <Col xs={24} md={12}>
                        <motion.div {...anim(6)}>
                            <Card title={<><RiseOutlined /> Hiring Velocity (12 months)</>} size="small" style={{ ...glass, height: '100%' }}>
                                <Sparkline data={hiringData} color="#3b82f6" height={60} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                    <Text type="secondary" style={{ fontSize: 10 }}>{dayjs().subtract(11, 'month').format('MMM YYYY')}</Text>
                                    <Text type="secondary" style={{ fontSize: 10 }}>{dayjs().format('MMM YYYY')}</Text>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>

                    {/* Salary Band Distribution */}
                    <Col xs={24} md={12}>
                        <motion.div {...anim(7)}>
                            <Card title={<><DollarOutlined /> Salary Distribution (IDR)</>} size="small" style={{ ...glass, height: '100%' }}>
                                <SalaryBands employees={emps} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 8px' }}>
                                    {salaryBandLabels.map((l, i) => <Text key={i} type="secondary" style={{ fontSize: 9, flex: 1, textAlign: 'center' }}>{l}</Text>)}
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* Charts Row 2 */}
                <Row gutter={[16, 16]}>
                    {/* Department Distribution */}
                    <Col xs={24} md={8}>
                        <motion.div {...anim(8)}>
                            <Card title={<><ApartmentOutlined /> Department Headcount</>} size="small" style={{ ...glass, height: '100%' }}>
                                {deptDist.map((d, i) => (
                                    <motion.div key={d.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.06 }} style={{ marginBottom: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <Text style={{ fontSize: 12 }}>{d.name}</Text>
                                            <Space size={6}>
                                                <Badge count={d.count} style={{ backgroundColor: d.color }} size="small" />
                                                <Tooltip title={`Avg: ${fmt(d.avgSalary)}`}><Text style={{ fontSize: 9, color: '#9ca3af' }}>{fmt(d.avgSalary)}</Text></Tooltip>
                                            </Space>
                                        </div>
                                        <Progress percent={Math.round((d.count / totalActive) * 100)} strokeColor={d.color} size="small" showInfo={false} />
                                    </motion.div>
                                ))}
                            </Card>
                        </motion.div>
                    </Col>

                    {/* Tenure Distribution */}
                    <Col xs={24} md={8}>
                        <motion.div {...anim(9)}>
                            <Card title={<><ClockCircleOutlined /> Tenure Distribution</>} size="small" style={{ ...glass, height: '100%' }}>
                                {tenureGroups.map((g, i) => (
                                    <motion.div key={g.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.08 }}
                                        style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 10, background: `${g.color}08`, borderLeft: `3px solid ${g.color}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Space size={6}><span>{g.icon}</span><Text style={{ fontSize: 12 }}>{g.label}</Text></Space>
                                            <Space size={6}><Tag color={g.color} style={{ borderRadius: 10, margin: 0 }}>{g.count} employees</Tag><Text style={{ fontSize: 11, color: g.color, fontWeight: 700 }}>{g.pct}%</Text></Space>
                                        </div>
                                    </motion.div>
                                ))}
                            </Card>
                        </motion.div>
                    </Col>

                    {/* Compensation & Diversity */}
                    <Col xs={24} md={8}>
                        <motion.div {...anim(10)}>
                            <Card title={<><DollarOutlined /> Compensation Insights</>} size="small" style={{ ...glass, height: '100%' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {/* Pay Gap */}
                                    <div style={{ padding: 12, borderRadius: 10, background: 'rgba(139,92,246,0.06)' }}>
                                        <Text style={{ fontSize: 11, color: '#8b5cf6', display: 'block', marginBottom: 4 }}>Gender Pay Gap</Text>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <Text style={{ fontSize: 10, color: '#3b82f6' }}><ManOutlined /> {fmt(maleAvg)}</Text><br />
                                                <Text style={{ fontSize: 10, color: '#ec4899' }}><WomanOutlined /> {fmt(femaleAvg)}</Text>
                                            </div>
                                            <Tag color={payGapPct <= 5 ? 'green' : payGapPct <= 15 ? 'orange' : 'red'} style={{ fontSize: 16, fontWeight: 700, padding: '4px 12px', borderRadius: 10 }}>{payGapPct}%</Tag>
                                        </div>
                                    </div>

                                    {/* Pipeline Conversion */}
                                    <div style={{ padding: 12, borderRadius: 10, background: 'rgba(59,130,246,0.06)' }}>
                                        <Text style={{ fontSize: 11, color: '#3b82f6', display: 'block', marginBottom: 8 }}>Recruitment Pipeline</Text>
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
                                            {stages.map((s, i) => (
                                                <Tooltip key={s} title={`${s}: ${pipelineData[i]}`}>
                                                    <motion.div initial={{ height: 0 }} animate={{ height: `${((pipelineData[i] || 0) / (Math.max(...pipelineData) || 1)) * 50 + 10}px` }}
                                                        transition={{ delay: 0.5 + i * 0.1 }}
                                                        style={{ flex: 1, borderRadius: 4, background: ['#6b7280', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'][i], minHeight: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                                                        <Text style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>{pipelineData[i]}</Text>
                                                    </motion.div>
                                                </Tooltip>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                            {stages.map(s => <Text key={s} style={{ flex: 1, textAlign: 'center', fontSize: 7, color: '#9ca3af' }}>{s.slice(0, 4)}</Text>)}
                                        </div>
                                    </div>

                                    {/* Employment Type */}
                                    <div style={{ padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.06)' }}>
                                        <Text style={{ fontSize: 11, color: '#10b981', display: 'block', marginBottom: 6 }}>Employment Mix</Text>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <div style={{ flex: stats.fullTimeCount || 1, height: 8, borderRadius: 4, background: '#3b82f6' }} />
                                            <div style={{ flex: stats.contractCount || 1, height: 8, borderRadius: 4, background: '#f59e0b' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                            <Text style={{ fontSize: 10 }}>Full-Time: <Text strong style={{ color: '#3b82f6' }}>{stats.fullTimeCount || 0}</Text></Text>
                                            <Text style={{ fontSize: 10 }}>Contract: <Text strong style={{ color: '#f59e0b' }}>{stats.contractCount || 0}</Text></Text>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
