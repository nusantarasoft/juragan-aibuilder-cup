"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Descriptions, Tag, Avatar, Typography, Spin, Tabs, Row, Col, Statistic, Timeline, Button, Space, Progress, Badge, Tooltip, Divider } from "antd";
import { UserOutlined, MailOutlined, PhoneOutlined, BankOutlined, CalendarOutlined, ArrowLeftOutlined, TrophyOutlined, ManOutlined, WomanOutlined, HomeOutlined, SafetyCertificateOutlined, HeartOutlined, DollarOutlined, TeamOutlined, EditOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const EMP_DETAIL = `query($id:String!){hrEmployee(id:$id){id employeeNumber firstName lastName email phone dateOfBirth gender maritalStatus nationality nationalId taxId avatarUrl departmentName positionTitle positionGrade employmentType employmentStatus hireDate probationEndDate baseSalary salaryCurrency bankName bankAccount address emergencyContact tags createdAt}}`;
const REVIEWS_Q = `query($t:String!,$e:String){hrPerformanceReviews(tenantId:$t,employeeId:$e){id reviewPeriod reviewType overallRating strengths areasForImprovement status completedAt}}`;
const ATTENDANCE_Q = `query($t:String!,$e:String){hrAttendance(tenantId:$t,employeeId:$e){id date checkIn checkOut status}}`;
const LEAVE_Q = `query($t:String!,$s:String){hrLeaveRequests(tenantId:$t,status:$s){id employeeId employeeName leaveTypeName startDate endDate days status}}`;

const statusColors: Record<string, { color: string; bg: string }> = {
    active: { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    on_leave: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    suspended: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    terminated: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    resigned: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};
const gradeConfig: Record<string, { color: string; level: string }> = {
    D1: { color: '#ef4444', level: 'Director' }, D2: { color: '#f97316', level: 'Sr. Director' },
    M1: { color: '#8b5cf6', level: 'Manager' }, M2: { color: '#a855f7', level: 'Sr. Manager' },
    L3: { color: '#3b82f6', level: 'Senior' }, L2: { color: '#06b6d4', level: 'Mid-Level' },
    L1: { color: '#10b981', level: 'Junior' },
};

function RatingStars({ rating }: { rating: number }) {
    return (
        <Space size={2}>{Array.from({ length: 5 }, (_, i) => (
            <div key={i} style={{ width: 20, height: 20, borderRadius: 4, background: i < rating ? ['', '#ef4444', '#f59e0b', '#eab308', '#3b82f6', '#10b981'][rating] + '20' : 'rgba(0,0,0,0.04)', border: `1px solid ${i < rating ? ['', '#ef4444', '#f59e0b', '#eab308', '#3b82f6', '#10b981'][rating] : '#e5e7eb'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                {i < rating ? '★' : '☆'}
            </div>
        ))}</Space>
    );
}

export default function EmployeeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const [emp, setEmp] = useState<any>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();

    useEffect(() => {
        if (!id) return;
        Promise.allSettled([
            gql(EMP_DETAIL, { id }),
            gql(REVIEWS_Q, { t: DEFAULT_TENANT_ID, e: id }),
            gql(ATTENDANCE_Q, { t: DEFAULT_TENANT_ID, e: id }),
            gql(LEAVE_Q, { t: DEFAULT_TENANT_ID, s: undefined }),
        ]).then(([e, r, a, l]) => {
            if (e.status === 'fulfilled') setEmp(e.value.hrEmployee);
            if (r.status === 'fulfilled') setReviews(r.value.hrPerformanceReviews || []);
            if (a.status === 'fulfilled') setAttendance(a.value.hrAttendance || []);
            if (l.status === 'fulfilled') {
                const all = l.value.hrLeaveRequests || [];
                setLeaves(all.filter((lr: any) => lr.employeeId === id));
            }
        }).finally(() => setLoading(false));
    }, [id]);

    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

    if (loading) return <CMSLayout title="Employee Profile"><div style={{ display: 'flex', justifyContent: 'center', padding: 120 }}><Spin size="large" /></div></CMSLayout>;
    if (!emp) return <CMSLayout title="Employee Profile"><div style={{ textAlign: 'center', padding: 80 }}><Text>Employee not found</Text></div></CMSLayout>;

    const tenure = dayjs().diff(dayjs(emp.hireDate), 'year', true);
    const tenureLabel = tenure < 1 ? `${Math.round(tenure * 12)} months` : `${tenure.toFixed(1)} years`;
    const sc = statusColors[emp.employmentStatus] || statusColors.active;
    const gc = gradeConfig[emp.positionGrade] || { color: '#6b7280', level: emp.positionGrade || '—' };
    const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.overallRating || 0), 0) / reviews.length).toFixed(1) : '—';
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const lateDays = attendance.filter(a => a.status === 'late').length;
    const approvedLeaves = leaves.filter(l => l.status === 'approved').reduce((s, l) => s + (l.days || 0), 0);

    const tabItems = [
        { key: 'overview', label: '📋 Overview', children: (
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Card size="small" title={<><UserOutlined /> Personal Information</>} style={glass}>
                        <Descriptions column={1} size="small" labelStyle={{ fontWeight: 600, fontSize: 12, width: 130 }} contentStyle={{ fontSize: 12 }}>
                            <Descriptions.Item label="Date of Birth">{emp.dateOfBirth ? dayjs(emp.dateOfBirth).format('MMM D, YYYY') : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Gender">{emp.gender ? <Space><span>{emp.gender === 'male' ? '♂' : '♀'}</span>{emp.gender}</Space> : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Marital Status">{emp.maritalStatus || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Nationality">{emp.nationality || '—'}</Descriptions.Item>
                            <Descriptions.Item label="National ID">{emp.nationalId || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Tax ID (NPWP)">{emp.taxId || '—'}</Descriptions.Item>
                            {emp.address && <Descriptions.Item label="Address">{typeof emp.address === 'string' ? emp.address : (emp.address.street ? `${emp.address.street}, ${emp.address.city || ''}` : JSON.stringify(emp.address))}</Descriptions.Item>}
                            {emp.emergencyContact && <Descriptions.Item label="Emergency">{typeof emp.emergencyContact === 'string' ? emp.emergencyContact : (emp.emergencyContact.name ? `${emp.emergencyContact.name} — ${emp.emergencyContact.phone || ''}` : JSON.stringify(emp.emergencyContact))}</Descriptions.Item>}
                        </Descriptions>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card size="small" title={<><BankOutlined /> Employment & Compensation</>} style={glass}>
                        <Descriptions column={1} size="small" labelStyle={{ fontWeight: 600, fontSize: 12, width: 130 }} contentStyle={{ fontSize: 12 }}>
                            <Descriptions.Item label="Department"><Tag color={themeColor}>{emp.departmentName || '—'}</Tag></Descriptions.Item>
                            <Descriptions.Item label="Position">{emp.positionTitle || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Grade"><Tag color={gc.color} style={{ borderRadius: 20 }}>{emp.positionGrade || '—'} — {gc.level}</Tag></Descriptions.Item>
                            <Descriptions.Item label="Type"><Tag>{emp.employmentType?.replace('_', ' ')}</Tag></Descriptions.Item>
                            <Descriptions.Item label="Hire Date">{emp.hireDate}</Descriptions.Item>
                            <Descriptions.Item label="Probation End">{emp.probationEndDate || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Base Salary"><Text strong style={{ color: '#10b981', fontSize: 14 }}>{emp.baseSalary ? fmt(emp.baseSalary) : '—'}</Text></Descriptions.Item>
                            <Descriptions.Item label="Bank">{emp.bankName ? `${emp.bankName} — ${emp.bankAccount}` : '—'}</Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>
            </Row>
        )},
        { key: 'perf', label: `🏆 Performance (${reviews.length})`, children: reviews.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reviews.map((r, i) => {
                    const rColor = ['', '#ef4444', '#f59e0b', '#eab308', '#3b82f6', '#10b981'][r.overallRating] || '#6b7280';
                    return (
                        <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                            style={{ ...glass, padding: 16, borderRadius: 12, borderLeft: `4px solid ${rColor}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Space><Text strong>{r.reviewPeriod}</Text><Tag>{r.reviewType}</Tag></Space>
                                <Space>{r.overallRating && <RatingStars rating={r.overallRating} />}<Tag color={r.status === 'completed' ? 'green' : 'blue'} style={{ borderRadius: 20 }}>{r.status}</Tag></Space>
                            </div>
                            {r.strengths && <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.06)', marginBottom: 6 }}><Text style={{ fontSize: 11 }}>💪 {r.strengths}</Text></div>}
                            {r.areasForImprovement && <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.06)' }}><Text style={{ fontSize: 11 }}>📈 {r.areasForImprovement}</Text></div>}
                        </motion.div>
                    );
                })}
            </div>
        ) : <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">No performance reviews yet</Text></div> },
        { key: 'attendance', label: `📅 Attendance (${attendance.length})`, children: attendance.length > 0 ? (
            <Card size="small" style={glass}>
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    <Col span={8}><div style={{ padding: 10, borderRadius: 10, background: 'rgba(16,185,129,0.06)', textAlign: 'center' }}><Text style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>{presentDays}</Text><br/><Text style={{ fontSize: 10 }}>Present</Text></div></Col>
                    <Col span={8}><div style={{ padding: 10, borderRadius: 10, background: 'rgba(245,158,11,0.06)', textAlign: 'center' }}><Text style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{lateDays}</Text><br/><Text style={{ fontSize: 10 }}>Late</Text></div></Col>
                    <Col span={8}><div style={{ padding: 10, borderRadius: 10, background: 'rgba(59,130,246,0.06)', textAlign: 'center' }}><Text style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>{attendance.length}</Text><br/><Text style={{ fontSize: 10 }}>Total Records</Text></div></Col>
                </Row>
                {attendance.slice(0, 10).map((a, i) => (
                    <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, marginBottom: 4, background: a.status === 'present' ? 'rgba(16,185,129,0.04)' : a.status === 'late' ? 'rgba(245,158,11,0.04)' : 'rgba(239,68,68,0.04)' }}>
                        <Text style={{ fontSize: 12 }}>{dayjs(a.date).format('ddd, MMM D')}</Text>
                        <Space size={12}>
                            <Text style={{ fontSize: 11, color: '#6b7280' }}>{a.checkIn} — {a.checkOut || '...'}</Text>
                            <Tag color={a.status === 'present' ? 'green' : a.status === 'late' ? 'orange' : 'red'} style={{ borderRadius: 10, fontSize: 10 }}>{a.status}</Tag>
                        </Space>
                    </motion.div>
                ))}
            </Card>
        ) : <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">No attendance records</Text></div> },
        { key: 'leave', label: `🏖️ Leave (${leaves.length})`, children: leaves.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {leaves.map((l, i) => (
                    <motion.div key={l.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        style={{ ...glass, padding: 12, borderRadius: 10, borderLeft: `3px solid ${l.status === 'approved' ? '#10b981' : l.status === 'pending' ? '#f59e0b' : '#ef4444'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Space><Text strong style={{ fontSize: 12 }}>{l.leaveTypeName}</Text><Badge count={`${l.days}d`} style={{ backgroundColor: '#3b82f6' }} /></Space>
                            <Tag color={l.status === 'approved' ? 'green' : l.status === 'pending' ? 'orange' : 'red'} style={{ borderRadius: 20 }}>{l.status}</Tag>
                        </div>
                        <Text style={{ fontSize: 11, color: '#6b7280' }}>{l.startDate} → {l.endDate}</Text>
                    </motion.div>
                ))}
            </div>
        ) : <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">No leave records</Text></div> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#3b82f6', '#8b5cf6', themeColor]} className="text-[22px] font-bold tracking-tight">{emp.firstName} {emp.lastName}</AuroraText>}
            subTitle={<DecryptedText text={`${emp.employeeNumber} · ${emp.positionTitle || 'Employee'}`} animateOn="view" revealDirection="start" speed={60} sequential />}
            extra={[<Button key="back" icon={<ArrowLeftOutlined />} onClick={() => router.push('/admin/hr/employees')}>Back to Directory</Button>]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Profile Header */}
                <Card style={{ ...glass, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: `linear-gradient(135deg, ${gc.color}22, ${themeColor}22)` }} />
                    <Row gutter={24} align="middle" style={{ position: 'relative' }}>
                        <Col>
                            <Badge dot color={sc.color} offset={[-4, 60]}>
                                <Avatar size={72} style={{ backgroundColor: gc.color, fontSize: 26, border: `3px solid ${gc.color}33` }} src={emp.avatarUrl}>
                                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                                </Avatar>
                            </Badge>
                        </Col>
                        <Col flex="auto">
                            <Title level={4} style={{ margin: 0 }}>{emp.firstName} {emp.lastName}</Title>
                            <Space size={6} style={{ marginTop: 4, flexWrap: 'wrap' }}>
                                <Tag color={sc.color} style={{ borderRadius: 20 }}>● {emp.employmentStatus?.replace('_', ' ')}</Tag>
                                <Tag color={themeColor} style={{ borderRadius: 20 }}>{emp.departmentName}</Tag>
                                <Tag style={{ borderRadius: 20 }}>{emp.positionTitle}</Tag>
                                {emp.positionGrade && <Tag color={gc.color} style={{ borderRadius: 20, fontWeight: 600 }}>{emp.positionGrade}</Tag>}
                                {emp.employmentType && <Tag style={{ borderRadius: 20, background: 'rgba(0,0,0,0.04)', border: 'none' }}>{emp.employmentType.replace('_', ' ')}</Tag>}
                            </Space>
                            <div style={{ marginTop: 8 }}>
                                {emp.email && <Text style={{ marginRight: 16, fontSize: 12 }}><MailOutlined /> {emp.email}</Text>}
                                {emp.phone && <Text style={{ marginRight: 16, fontSize: 12 }}><PhoneOutlined /> {emp.phone}</Text>}
                                <Text style={{ fontSize: 12 }}><CalendarOutlined /> Joined {emp.hireDate} · {tenureLabel}</Text>
                            </div>
                        </Col>
                        <Col>
                            <Statistic title="Monthly Salary" value={emp.baseSalary ? fmt(emp.baseSalary) : '—'} valueStyle={{ color: '#10b981', fontSize: 18 }} />
                        </Col>
                    </Row>
                </Card>

                {/* Quick Stats */}
                <Row gutter={[12, 12]}>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: `3px solid ${gc.color}` }}><Statistic title="Tenure" value={tenureLabel} valueStyle={{ fontSize: 16, color: gc.color }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #f59e0b' }}><Statistic title="Avg Rating" value={avgRating} suffix="/5" prefix={<TrophyOutlined />} valueStyle={{ fontSize: 16, color: '#f59e0b' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #10b981' }}><Statistic title="Present Days" value={presentDays} valueStyle={{ fontSize: 16, color: '#10b981' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #3b82f6' }}><Statistic title="Leave Used" value={`${approvedLeaves}d`} valueStyle={{ fontSize: 16, color: '#3b82f6' }} /></Card></Col>
                </Row>

                {/* Tabs */}
                <Card style={glass}><Tabs items={tabItems} /></Card>
            </motion.div>
        </CMSLayout>
    );
}
