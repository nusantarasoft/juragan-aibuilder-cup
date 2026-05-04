"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Descriptions, Tag, Avatar, Typography, Spin, Tabs, Row, Col, Statistic, Timeline, Button, Space } from "antd";
import { UserOutlined, MailOutlined, PhoneOutlined, BankOutlined, CalendarOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { useParams, useRouter } from "next/navigation";

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const EMP_DETAIL = `query($id:String!){hrEmployee(id:$id){id employeeNumber firstName lastName email phone dateOfBirth gender maritalStatus nationality nationalId taxId avatarUrl departmentName positionTitle positionGrade employmentType employmentStatus hireDate probationEndDate baseSalary salaryCurrency bankName bankAccount address emergencyContact tags createdAt}}`;
const REVIEWS_Q = `query($t:String!,$e:String){hrPerformanceReviews(tenantId:$t,employeeId:$e){id reviewPeriod reviewType overallRating strengths status completedAt}}`;

const statusColors: Record<string, string> = { active: 'green', on_leave: 'blue', suspended: 'orange', terminated: 'red', resigned: 'default' };

export default function EmployeeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const [emp, setEmp] = useState<any>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();

    useEffect(() => {
        if (!id) return;
        Promise.all([gql(EMP_DETAIL, { id }), gql(REVIEWS_Q, { t: DEFAULT_TENANT_ID, e: id })])
            .then(([e, r]) => { setEmp(e.hrEmployee); setReviews(r.hrPerformanceReviews || []); })
            .catch(console.error).finally(() => setLoading(false));
    }, [id]);

    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

    if (loading) return <CMSLayout title="Employee Profile"><div style={{ display: 'flex', justifyContent: 'center', padding: 120 }}><Spin size="large" /></div></CMSLayout>;
    if (!emp) return <CMSLayout title="Employee Profile"><div style={{ textAlign: 'center', padding: 80 }}><Text>Employee not found</Text></div></CMSLayout>;

    const tabItems = [
        { key: 'personal', label: 'Personal Info', children: (
            <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Date of Birth">{emp.dateOfBirth || '—'}</Descriptions.Item>
                <Descriptions.Item label="Gender">{emp.gender || '—'}</Descriptions.Item>
                <Descriptions.Item label="Marital Status">{emp.maritalStatus || '—'}</Descriptions.Item>
                <Descriptions.Item label="Nationality">{emp.nationality || '—'}</Descriptions.Item>
                <Descriptions.Item label="National ID (KTP)">{emp.nationalId || '—'}</Descriptions.Item>
                <Descriptions.Item label="Tax ID (NPWP)">{emp.taxId || '—'}</Descriptions.Item>
            </Descriptions>
        )},
        { key: 'job', label: 'Job Details', children: (
            <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Department">{emp.departmentName || '—'}</Descriptions.Item>
                <Descriptions.Item label="Position">{emp.positionTitle || '—'}</Descriptions.Item>
                <Descriptions.Item label="Grade"><Tag color="blue">{emp.positionGrade || '—'}</Tag></Descriptions.Item>
                <Descriptions.Item label="Type"><Tag>{emp.employmentType?.replace('_', ' ')}</Tag></Descriptions.Item>
                <Descriptions.Item label="Hire Date">{emp.hireDate}</Descriptions.Item>
                <Descriptions.Item label="Probation End">{emp.probationEndDate || '—'}</Descriptions.Item>
            </Descriptions>
        )},
        { key: 'comp', label: 'Compensation', children: (
            <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Base Salary" span={2}><Text strong style={{ fontSize: 18, color: '#10b981' }}>{emp.baseSalary ? fmt(emp.baseSalary) : '—'}</Text></Descriptions.Item>
                <Descriptions.Item label="Currency">{emp.salaryCurrency || 'IDR'}</Descriptions.Item>
                <Descriptions.Item label="Bank">{emp.bankName || '—'}</Descriptions.Item>
                <Descriptions.Item label="Account">{emp.bankAccount || '—'}</Descriptions.Item>
            </Descriptions>
        )},
        { key: 'perf', label: 'Performance', children: reviews.length > 0 ? (
            <Timeline items={reviews.map(r => ({
                color: r.status === 'completed' ? 'green' : 'blue',
                children: <Card size="small" style={{ ...glass, marginBottom: 8 }}><Space direction="vertical" size={4}><Text strong>{r.reviewPeriod} — {r.reviewType}</Text>{r.overallRating && <Tag color={['', '#ef4444', '#f59e0b', '#eab308', '#3b82f6', '#10b981'][r.overallRating]}>Rating: {r.overallRating}/5</Tag>}{r.strengths && <Text type="secondary">{r.strengths}</Text>}</Space></Card>,
            }))} />
        ) : <Text type="secondary">No performance reviews yet</Text> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#3b82f6', '#8b5cf6', themeColor]} className="text-[22px] font-bold tracking-tight">{emp.firstName} {emp.lastName}</AuroraText>}
            subTitle={<DecryptedText text={`${emp.employeeNumber} · ${emp.positionTitle || 'Employee'}`} animateOn="view" revealDirection="start" speed={60} sequential />}
            extra={[<Button key="back" icon={<ArrowLeftOutlined />} onClick={() => router.push('/admin/hr/employees')}>Back</Button>]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Header Card */}
                <Card style={glass}>
                    <Row gutter={24} align="middle">
                        <Col><Avatar size={80} style={{ backgroundColor: themeColor, fontSize: 32 }} icon={<UserOutlined />} src={emp.avatarUrl}>{emp.firstName?.[0]}{emp.lastName?.[0]}</Avatar></Col>
                        <Col flex="auto">
                            <Title level={4} style={{ margin: 0 }}>{emp.firstName} {emp.lastName}</Title>
                            <Space size={8} style={{ marginTop: 4 }}>
                                <Tag color={statusColors[emp.employmentStatus]}>{emp.employmentStatus?.replace('_', ' ')}</Tag>
                                <Tag color="blue">{emp.departmentName}</Tag>
                                <Tag>{emp.positionTitle}</Tag>
                            </Space>
                            <div style={{ marginTop: 8 }}>
                                {emp.email && <Text style={{ marginRight: 16 }}><MailOutlined /> {emp.email}</Text>}
                                {emp.phone && <Text style={{ marginRight: 16 }}><PhoneOutlined /> {emp.phone}</Text>}
                                <Text><CalendarOutlined /> Joined {emp.hireDate}</Text>
                            </div>
                        </Col>
                        <Col>
                            <Statistic title="Monthly Salary" value={emp.baseSalary ? fmt(emp.baseSalary) : '—'} valueStyle={{ color: '#10b981', fontSize: 18 }} />
                        </Col>
                    </Row>
                </Card>
                <Card style={glass}><Tabs items={tabItems} /></Card>
            </motion.div>
        </CMSLayout>
    );
}
