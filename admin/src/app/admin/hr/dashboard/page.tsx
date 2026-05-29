"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Row, Col, Statistic, Typography, Spin, Progress, Tag, Avatar, List, Space, Tooltip, Badge } from "antd";
import {
    TeamOutlined, ApartmentOutlined, UserAddOutlined,
    CoffeeOutlined, ManOutlined, WomanOutlined,
    SolutionOutlined, TrophyOutlined, ReadOutlined,
    FileTextOutlined, WalletOutlined, CalendarOutlined,
    RiseOutlined, ArrowUpOutlined, ArrowDownOutlined,
    MailOutlined, PhoneOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import FormIntegrationWidget from "@/components/forms/FormIntegrationWidget";

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const anim = (i: number) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.06, duration: 0.4 } });

const STATS_QUERY = `query($t:String!){hrDashboardStats(tenantId:$t){totalEmployees activeEmployees totalDepartments totalPositions maleCount femaleCount totalPayroll avgSalary pendingLeaveRequests totalLeaveRequests openJobPostings totalApplicants totalReviews totalTrainings newHiresThisMonth contractCount fullTimeCount}}`;
const RECENT_EMPS = `query($t:String!){hrEmployees(tenantId:$t,status:"active"){id firstName lastName email phone departmentName positionTitle hireDate avatarUrl}}`;
const DEPT_Q = `query($t:String!){hrDepartments(tenantId:$t){id name code status}}`;
const ALL_EMPS = `query($t:String!){hrEmployees(tenantId:$t){id departmentId departmentName employmentStatus baseSalary hireDate}}`;

function GenderDonut({ male, female }: { male: number; female: number }) {
    const total = male + female || 1;
    const mp = Math.round((male / total) * 100);
    const fp = 100 - mp;
    const r = 38, cx = 50, cy = 50, c = 2 * Math.PI * r;
    const d1 = (mp / 100) * c;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'center' }}>
            <svg viewBox="0 0 100 100" width={90} height={90}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3e8ff" strokeWidth={12} />
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3b82f6" strokeWidth={12}
                    strokeDasharray={`${d1} ${c - d1}`} strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}>
                    <animate attributeName="stroke-dasharray" from={`0 ${c}`} to={`${d1} ${c - d1}`} dur="1s" fill="freeze" />
                </circle>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ec4899" strokeWidth={12}
                    strokeDasharray={`${(fp / 100) * c} ${c - (fp / 100) * c}`} strokeLinecap="round"
                    strokeDashoffset={`-${d1}`}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}>
                    <animate attributeName="stroke-dasharray" from={`0 ${c}`} to={`${(fp / 100) * c} ${c - (fp / 100) * c}`} dur="1s" fill="freeze" />
                </circle>
                <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="currentColor">{total}</text>
            </svg>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                    <ManOutlined style={{ color: '#3b82f6' }} /> <Text strong>{male}</Text> <Text type="secondary" style={{ fontSize: 12 }}>({mp}%)</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ec4899' }} />
                    <WomanOutlined style={{ color: '#ec4899' }} /> <Text strong>{female}</Text> <Text type="secondary" style={{ fontSize: 12 }}>({fp}%)</Text>
                </div>
            </div>
        </div>
    );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = Math.round((value / (max || 1)) * 100);
    return (
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6 }}
            style={{ height: 6, width: '100%', borderRadius: 3, background: `${color}15`, overflow: 'hidden', transformOrigin: 'left' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3, duration: 0.8 }}
                style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} />
        </motion.div>
    );
}

export default function HrDashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [allEmps, setAllEmps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();

    useEffect(() => {
        Promise.all([
            gql(STATS_QUERY, { t: DEFAULT_TENANT_ID }),
            gql(RECENT_EMPS, { t: DEFAULT_TENANT_ID }),
            gql(DEPT_Q, { t: DEFAULT_TENANT_ID }),
            gql(ALL_EMPS, { t: DEFAULT_TENANT_ID }),
        ]).then(([st, emp, dept, all]) => {
            setStats(st.hrDashboardStats);
            setEmployees((emp.hrEmployees || []).sort((a: any, b: any) => new Date(b.hireDate).getTime() - new Date(a.hireDate).getTime()).slice(0, 5));
            setDepartments(dept.hrDepartments || []);
            setAllEmps(all.hrEmployees || []);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

    if (loading) return <CMSLayout title="HR Dashboard"><div style={{ display: 'flex', justifyContent: 'center', padding: 120 }}><Spin size="large" /></div></CMSLayout>;

    const s = stats || {};
    const deptColors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#ef4444', '#6366f1'];

    // Department headcount
    const deptHeadcount = departments.map((d, i) => ({
        ...d,
        count: allEmps.filter(e => e.departmentName === d.name && e.employmentStatus === 'active').length,
        color: deptColors[i % deptColors.length],
    })).sort((a, b) => b.count - a.count);
    const maxDeptCount = Math.max(...deptHeadcount.map(d => d.count), 1);

    // Salary distribution by department
    const deptSalary = departments.map((d, i) => {
        const emps = allEmps.filter(e => e.departmentName === d.name && e.employmentStatus === 'active');
        const totalSal = emps.reduce((sum, e) => sum + (Number(e.baseSalary) || 0), 0);
        return { name: d.name, total: totalSal, avg: emps.length > 0 ? Math.round(totalSal / emps.length) : 0, count: emps.length, color: deptColors[i % deptColors.length] };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

    const statCards = [
        { label: 'Total Employees', value: s.totalEmployees || 0, icon: <TeamOutlined />, color: '#3b82f6', suffix: '' },
        { label: 'Active', value: s.activeEmployees || 0, icon: <TeamOutlined />, color: '#10b981', suffix: '' },
        { label: 'Departments', value: s.totalDepartments || 0, icon: <ApartmentOutlined />, color: '#8b5cf6', suffix: '' },
        { label: 'Open Positions', value: s.openJobPostings || 0, icon: <SolutionOutlined />, color: '#f59e0b', suffix: '' },
        { label: 'New Hires', value: s.newHiresThisMonth || 0, icon: <UserAddOutlined />, color: '#06b6d4', suffix: '/mo' },
        { label: 'Pending Leave', value: s.pendingLeaveRequests || 0, icon: <CoffeeOutlined />, color: '#ef4444', suffix: '' },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#8b5cf6', '#ec4899', themeColor]} className="text-[22px] font-bold tracking-tight">HR Dashboard</AuroraText>}
            subTitle={<DecryptedText text="Human capital management overview" animateOn="view" revealDirection="start" speed={60} sequential />}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Top Stats */}
                <Row gutter={[14, 14]}>
                    {statCards.map((c, i) => (
                        <Col xs={12} sm={8} md={4} key={i}>
                            <motion.div {...anim(i)}>
                                <Card size="small" style={{ ...glass, textAlign: 'center', borderTop: `3px solid ${c.color}` }} hoverable>
                                    <div style={{ fontSize: 22, color: c.color, marginBottom: 2 }}>{c.icon}</div>
                                    <Text strong style={{ fontSize: 24, color: c.color }}>{c.value}</Text>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{c.label}</Text>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Main Content */}
                <Row gutter={[16, 16]}>
                    {/* Payroll Summary */}
                    <Col xs={24} md={8}>
                        <motion.div {...anim(6)}>
                            <Card title={<><WalletOutlined /> Payroll Summary</>} size="small" style={{ ...glass, height: '100%' }}>
                                <Statistic title="Monthly Payroll" value={fmt(s.totalPayroll || 0)} valueStyle={{ fontSize: 20, fontWeight: 700, color: '#10b981' }} />
                                <div style={{ marginTop: 16, padding: 12, background: 'rgba(16,185,129,0.06)', borderRadius: 10 }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Average Salary</Text>
                                    <div style={{ fontSize: 18, fontWeight: 600, color: '#3b82f6' }}>{fmt(s.avgSalary || 0)}</div>
                                </div>
                                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text type="secondary" style={{ fontSize: 11 }}>Headcount Cost Ratio</Text>
                                    <Tag color="blue">{s.activeEmployees || 0} employees</Tag>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>

                    {/* Gender Distribution */}
                    <Col xs={24} md={8}>
                        <motion.div {...anim(7)}>
                            <Card title={<><TeamOutlined /> Gender Distribution</>} size="small" style={{ ...glass, height: '100%' }}>
                                <GenderDonut male={s.maleCount || 0} female={s.femaleCount || 0} />
                                <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                                    <div style={{ flex: 1, padding: 8, borderRadius: 8, background: 'rgba(59,130,246,0.06)', textAlign: 'center' }}>
                                        <Text style={{ fontSize: 11, color: '#3b82f6' }}>Full-Time</Text>
                                        <div style={{ fontWeight: 700, color: '#3b82f6' }}>{s.fullTimeCount || 0}</div>
                                    </div>
                                    <div style={{ flex: 1, padding: 8, borderRadius: 8, background: 'rgba(245,158,11,0.06)', textAlign: 'center' }}>
                                        <Text style={{ fontSize: 11, color: '#f59e0b' }}>Contract</Text>
                                        <div style={{ fontWeight: 700, color: '#f59e0b' }}>{s.contractCount || 0}</div>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </Col>

                    {/* Department Distribution */}
                    <Col xs={24} md={8}>
                        <motion.div {...anim(8)}>
                            <Card title={<><ApartmentOutlined /> Department Distribution</>} size="small" style={{ ...glass, height: '100%' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {deptHeadcount.slice(0, 6).map((d, i) => (
                                        <motion.div key={d.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.08 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                <Text style={{ fontSize: 12 }}>{d.name}</Text>
                                                <Badge count={d.count} style={{ backgroundColor: d.color }} size="small" />
                                            </div>
                                            <MiniBar value={d.count} max={maxDeptCount} color={d.color} />
                                        </motion.div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* Bottom Row */}
                <Row gutter={[16, 16]}>
                    {/* Recent Hires */}
                    <Col xs={24} md={12}>
                        <motion.div {...anim(9)}>
                            <Card title={<><UserAddOutlined /> Recent Team Members</>} size="small" style={{ ...glass, height: '100%' }}>
                                <List
                                    dataSource={employees}
                                    renderItem={(emp: any, i: number) => (
                                        <motion.div key={emp.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.1 }}>
                                            <List.Item style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                                <List.Item.Meta
                                                    avatar={<Avatar style={{ backgroundColor: deptColors[i % deptColors.length], fontSize: 12 }}>{emp.firstName?.[0]}{emp.lastName?.[0]}</Avatar>}
                                                    title={<Text strong style={{ fontSize: 13 }}>{emp.firstName} {emp.lastName}</Text>}
                                                    description={<Space size={4} wrap><Tag color="blue" style={{ fontSize: 10, margin: 0 }}>{emp.departmentName}</Tag><Tag style={{ fontSize: 10, margin: 0 }}>{emp.positionTitle}</Tag></Space>}
                                                />
                                                <div style={{ textAlign: 'right' }}>
                                                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}><CalendarOutlined /> {emp.hireDate}</Text>
                                                    {emp.email && <Text type="secondary" style={{ fontSize: 10, display: 'block' }}><MailOutlined /> {emp.email?.split('@')[0]}@...</Text>}
                                                </div>
                                            </List.Item>
                                        </motion.div>
                                    )}
                                />
                            </Card>
                        </motion.div>
                    </Col>

                    {/* Quick Metrics */}
                    <Col xs={24} md={12}>
                        <motion.div {...anim(10)}>
                            <Card title={<><RiseOutlined /> Quick Metrics</>} size="small" style={{ ...glass, height: '100%' }}>
                                <Row gutter={[12, 12]}>
                                    <Col span={12}>
                                        <div style={{ padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.06)', borderLeft: '3px solid #f59e0b' }}>
                                            <SolutionOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
                                            <div style={{ fontWeight: 700, fontSize: 20, color: '#f59e0b', marginTop: 4 }}>{s.openJobPostings || 0}</div>
                                            <Text type="secondary" style={{ fontSize: 11 }}>Open Postings</Text>
                                            <div><Text style={{ fontSize: 10, color: '#6b7280' }}>{s.totalApplicants || 0} applicants</Text></div>
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ padding: 14, borderRadius: 10, background: 'rgba(139,92,246,0.06)', borderLeft: '3px solid #8b5cf6' }}>
                                            <TrophyOutlined style={{ color: '#8b5cf6', fontSize: 18 }} />
                                            <div style={{ fontWeight: 700, fontSize: 20, color: '#8b5cf6', marginTop: 4 }}>{s.totalReviews || 0}</div>
                                            <Text type="secondary" style={{ fontSize: 11 }}>Performance Reviews</Text>
                                            <div><Text style={{ fontSize: 10, color: '#6b7280' }}>completed</Text></div>
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ padding: 14, borderRadius: 10, background: 'rgba(6,182,212,0.06)', borderLeft: '3px solid #06b6d4' }}>
                                            <ReadOutlined style={{ color: '#06b6d4', fontSize: 18 }} />
                                            <div style={{ fontWeight: 700, fontSize: 20, color: '#06b6d4', marginTop: 4 }}>{s.totalTrainings || 0}</div>
                                            <Text type="secondary" style={{ fontSize: 11 }}>Training Programs</Text>
                                            <div><Text style={{ fontSize: 10, color: '#6b7280' }}>active</Text></div>
                                        </div>
                                    </Col>
                                    <Col span={12}>
                                        <div style={{ padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.06)', borderLeft: '3px solid #ef4444' }}>
                                            <CoffeeOutlined style={{ color: '#ef4444', fontSize: 18 }} />
                                            <div style={{ fontWeight: 700, fontSize: 20, color: '#ef4444', marginTop: 4 }}>{s.pendingLeaveRequests || 0}</div>
                                            <Text type="secondary" style={{ fontSize: 11 }}>Pending Leaves</Text>
                                            <div><Text style={{ fontSize: 10, color: '#6b7280' }}>{s.totalLeaveRequests || 0} total requests</Text></div>
                                        </div>
                                    </Col>
                                </Row>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* Salary by Department */}
                {deptSalary.length > 0 && (
                    <motion.div {...anim(11)}>
                        <Card title={<><WalletOutlined /> Salary Distribution by Department</>} size="small" style={glass}>
                            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                                {deptSalary.map((d, i) => (
                                    <motion.div key={d.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.08 }}
                                        style={{ minWidth: 160, flex: 1, padding: 14, borderRadius: 12, background: `${d.color}08`, border: `1px solid ${d.color}22`, textAlign: 'center' }}>
                                        <Text style={{ fontSize: 11, color: d.color, display: 'block', fontWeight: 600, marginBottom: 4 }}>{d.name}</Text>
                                        <div style={{ fontWeight: 700, fontSize: 15, color: d.color }}>{fmt(d.total)}</div>
                                        <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Avg: {fmt(d.avg)}</Text>
                                        <Tag color={d.color} style={{ marginTop: 4, fontSize: 10 }}>{d.count} employees</Tag>
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Form Builder Integration */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <FormIntegrationWidget
                            categories={['kpi', 'assessment']}
                            title="KPI & Evaluations"
                            maxItems={3}
                            animIndex={12}
                        />
                    </Col>
                    <Col xs={24} md={12}>
                        <FormIntegrationWidget
                            categories={['survey', 'feedback']}
                            title="Employee Surveys"
                            maxItems={3}
                            animIndex={13}
                        />
                    </Col>
                </Row>
            </div>
        </CMSLayout>
    );
}
