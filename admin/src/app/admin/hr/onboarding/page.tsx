"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Typography, Row, Col, Statistic, Steps, Tag, Avatar, Progress, Empty, Space, Badge, Tooltip, Checkbox } from "antd";
import { CheckSquareOutlined, UserAddOutlined, CheckCircleOutlined, ClockCircleOutlined, RocketOutlined, TeamOutlined, SafetyCertificateOutlined, LaptopOutlined, MailOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const EMP_Q = `query($t:String!){hrEmployees(tenantId:$t,status:"active"){id firstName lastName employeeNumber departmentName positionTitle hireDate}}`;

const onboardingSteps = [
    { key: 'it', title: 'IT Account Setup', description: 'Create email, Slack, GitHub access', icon: <LaptopOutlined />, color: '#3b82f6' },
    { key: 'ws', title: 'Workstation Setup', description: 'Laptop, monitor, peripherals provisioned', icon: <LaptopOutlined />, color: '#8b5cf6' },
    { key: 'hr', title: 'HR Orientation', description: 'Company policies, benefits overview', icon: <SafetyCertificateOutlined />, color: '#06b6d4' },
    { key: 'team', title: 'Team Introduction', description: 'Meet the team, buddy assignment', icon: <TeamOutlined />, color: '#10b981' },
    { key: 'train', title: 'Role-Specific Training', description: 'Technical onboarding for department', icon: <RocketOutlined />, color: '#f59e0b' },
    { key: 'check', title: '30-Day Check-in', description: 'Initial performance and culture fit review', icon: <CheckCircleOutlined />, color: '#ec4899' },
];

// Simulate per-employee onboarding progress based on hire date
function getEmployeeProgress(hireDate: string) {
    const daysSinceHire = dayjs().diff(dayjs(hireDate), 'day');
    if (daysSinceHire > 60) return 6; // All completed
    if (daysSinceHire > 30) return 5;
    if (daysSinceHire > 14) return 4;
    if (daysSinceHire > 7) return 3;
    if (daysSinceHire > 3) return 2;
    if (daysSinceHire > 1) return 1;
    return 0;
}

// Employee Onboarding Card
function OnboardingCard({ emp }: { emp: any }) {
    const stepsCompleted = getEmployeeProgress(emp.hireDate);
    const progress = Math.round((stepsCompleted / onboardingSteps.length) * 100);
    const daysSinceHire = dayjs().diff(dayjs(emp.hireDate), 'day');
    const isNew = daysSinceHire <= 30;

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
            style={{ ...glass, padding: 16, borderRadius: 14, borderLeft: `4px solid ${progress === 100 ? '#10b981' : progress > 50 ? '#3b82f6' : '#f59e0b'}` }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Badge dot color={progress === 100 ? '#10b981' : '#3b82f6'}>
                    <Avatar size={36} style={{ backgroundColor: progress === 100 ? '#10b981' : '#3b82f6', fontSize: 12 }}>{emp.firstName[0]}{emp.lastName[0]}</Avatar>
                </Badge>
                <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 13, display: 'block' }}>{emp.firstName} {emp.lastName}</Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>{emp.positionTitle || emp.departmentName || 'Unassigned'}</Text>
                </div>
                <div style={{ textAlign: 'right' }}>
                    {isNew && <Tag color="blue" style={{ borderRadius: 10, fontSize: 9, margin: 0 }}>🆕 New</Tag>}
                    <Text style={{ fontSize: 10, color: '#9ca3af', display: 'block', marginTop: 2 }}>Day {daysSinceHire}</Text>
                </div>
            </div>

            {/* Progress */}
            <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 10 }}>Onboarding Progress</Text>
                    <Text strong style={{ fontSize: 11, color: progress === 100 ? '#10b981' : '#3b82f6' }}>{stepsCompleted}/{onboardingSteps.length}</Text>
                </div>
                <Progress percent={progress} showInfo={false} size="small"
                    strokeColor={progress === 100 ? '#10b981' : { from: '#3b82f6', to: '#8b5cf6' }} />
            </div>

            {/* Step checklist mini */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {onboardingSteps.map((step, i) => (
                    <Tooltip key={step.key} title={`${step.title}: ${i < stepsCompleted ? '✅ Done' : '⏳ Pending'}`}>
                        <div style={{
                            width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                            backgroundColor: i < stepsCompleted ? `${step.color}15` : 'rgba(0,0,0,0.03)',
                            border: `1px solid ${i < stepsCompleted ? step.color : 'rgba(0,0,0,0.06)'}`,
                            color: i < stepsCompleted ? step.color : '#d1d5db',
                        }}>
                            {i < stepsCompleted ? '✓' : i + 1}
                        </div>
                    </Tooltip>
                ))}
            </div>
        </motion.div>
    );
}

export default function OnboardingPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();

    useEffect(() => {
        gql(EMP_Q, { t: DEFAULT_TENANT_ID }).then(d => {
            const emps = d.hrEmployees || [];
            const recent = emps.filter((e: any) => {
                const diff = dayjs().diff(dayjs(e.hireDate), 'day');
                return diff <= 180;
            }).sort((a: any, b: any) => dayjs(b.hireDate).diff(dayjs(a.hireDate)));
            setEmployees(recent);
        }).catch(() => undefined).finally(() => setLoading(false));
    }, []);

    const completedCount = employees.filter(e => getEmployeeProgress(e.hireDate) === 6).length;
    const inProgressCount = employees.filter(e => { const p = getEmployeeProgress(e.hireDate); return p > 0 && p < 6; }).length;
    const notStarted = employees.filter(e => getEmployeeProgress(e.hireDate) === 0).length;
    const avgProgress = employees.length > 0 ? Math.round(employees.reduce((s, e) => s + getEmployeeProgress(e.hireDate), 0) / employees.length / 6 * 100) : 0;

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#10b981', '#06b6d4', themeColor]} className="text-[22px] font-bold tracking-tight">Onboarding</AuroraText>}
            subTitle={<DecryptedText text="New hire onboarding checklists & task workflows" animateOn="view" revealDirection="start" speed={60} sequential />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Stats */}
                <Row gutter={[12, 12]}>
                    <Col xs={12} md={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #3b82f6' }}><Statistic title="New Hires (6mo)" value={employees.length} prefix={<UserAddOutlined />} valueStyle={{ color: '#3b82f6' }} /></Card></Col>
                    <Col xs={12} md={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #10b981' }}><Statistic title="Onboarding Done" value={completedCount} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#10b981' }} /></Card></Col>
                    <Col xs={12} md={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #f59e0b' }}><Statistic title="In Progress" value={inProgressCount} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#f59e0b' }} /></Card></Col>
                    <Col xs={12} md={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #8b5cf6' }}><Statistic title="Avg Progress" value={`${avgProgress}%`} valueStyle={{ color: '#8b5cf6' }} /></Card></Col>
                </Row>

                <Row gutter={[16, 16]}>
                    {/* Onboarding Template */}
                    <Col xs={24} md={10}>
                        <Card title={<Space><CheckSquareOutlined /> <Text strong>Onboarding Checklist</Text></Space>} style={{ ...glass, height: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {onboardingSteps.map((step, i) => (
                                    <motion.div key={step.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: `${step.color}06`, borderLeft: `3px solid ${step.color}` }}>
                                        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${step.color}15`, color: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                                            {step.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <Text strong style={{ fontSize: 12, display: 'block' }}>{step.title}</Text>
                                            <Text type="secondary" style={{ fontSize: 10 }}>{step.description}</Text>
                                        </div>
                                        <Badge count={i + 1} style={{ backgroundColor: step.color }} size="small" />
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </Col>

                    {/* Employee Cards */}
                    <Col xs={24} md={14}>
                        <Card title={<Space><UserAddOutlined /> <Text strong>Employee Progress ({employees.length})</Text></Space>} style={{ ...glass, height: '100%' }}>
                            {employees.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 500, overflowY: 'auto' }}>
                                    {employees.map(emp => <OnboardingCard key={emp.id} emp={emp} />)}
                                </div>
                            ) : (
                                <Empty description="No recent hires in the last 6 months" />
                            )}
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
