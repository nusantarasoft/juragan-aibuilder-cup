"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Typography, Steps, Tag, Empty, Row, Col, Statistic, Avatar, Space, Badge, Tooltip, Progress, Timeline } from "antd";
import { FormOutlined, LogoutOutlined, CheckCircleOutlined, ClockCircleOutlined, LaptopOutlined, KeyOutlined, DollarOutlined, SafetyCertificateOutlined, UserDeleteOutlined, FileTextOutlined, HeartOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const EMP_Q = `query($t:String!){hrEmployees(tenantId:$t){id firstName lastName employeeNumber departmentName positionTitle employmentStatus terminationDate hireDate}}`;

const offboardingSteps = [
    { key: 'exit', title: 'Exit Interview', description: 'Schedule and complete exit interview with HR', icon: <FormOutlined />, color: '#3b82f6', duration: 'Day 1-2' },
    { key: 'kt', title: 'Knowledge Transfer', description: 'Document and handover ongoing projects', icon: <FileTextOutlined />, color: '#8b5cf6', duration: 'Day 1-7' },
    { key: 'asset', title: 'IT Asset Return', description: 'Laptop, badge, keys, peripherals returned', icon: <LaptopOutlined />, color: '#f59e0b', duration: 'Last Day' },
    { key: 'access', title: 'Account Deactivation', description: 'Revoke access to all systems and email', icon: <KeyOutlined />, color: '#ef4444', duration: 'Last Day' },
    { key: 'payroll', title: 'Final Payroll', description: 'Process final salary, unused leave payout', icon: <DollarOutlined />, color: '#10b981', duration: 'Day 1-14' },
    { key: 'benefits', title: 'Benefits Termination', description: 'BPJS and insurance offboarding', icon: <HeartOutlined />, color: '#ec4899', duration: 'Day 1-30' },
    { key: 'cert', title: 'Certificate of Employment', description: 'Generate and provide reference letter', icon: <SafetyCertificateOutlined />, color: '#06b6d4', duration: 'Last Day' },
];

export default function OffboardingPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { themeColor } = usePreferencesStore();

    useEffect(() => {
        gql(EMP_Q, { t: DEFAULT_TENANT_ID }).then(d => {
            const emps = d.hrEmployees || [];
            const departed = emps.filter((e: any) => e.employmentStatus === 'terminated' || e.employmentStatus === 'resigned' || e.terminationDate);
            setEmployees(departed);
        }).catch(() => undefined).finally(() => setLoading(false));
    }, []);

    const terminated = employees.filter(e => e.employmentStatus === 'terminated').length;
    const resigned = employees.filter(e => e.employmentStatus === 'resigned').length;

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#ef4444', '#f59e0b', themeColor]} className="text-[22px] font-bold tracking-tight">Offboarding</AuroraText>}
            subTitle={<DecryptedText text="Exit process, asset return & knowledge transfer" animateOn="view" revealDirection="start" speed={60} sequential />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Stats */}
                <Row gutter={[12, 12]}>
                    <Col xs={8}><Card size="small" style={{ ...glass, borderTop: '3px solid #ef4444' }}><Statistic title="Active Exits" value={employees.length} prefix={<LogoutOutlined />} valueStyle={{ color: '#ef4444' }} /></Card></Col>
                    <Col xs={8}><Card size="small" style={{ ...glass, borderTop: '3px solid #f59e0b' }}><Statistic title="Resigned" value={resigned} prefix={<UserDeleteOutlined />} valueStyle={{ color: '#f59e0b' }} /></Card></Col>
                    <Col xs={8}><Card size="small" style={{ ...glass, borderTop: '3px solid #6b7280' }}><Statistic title="Terminated" value={terminated} valueStyle={{ color: '#6b7280' }} /></Card></Col>
                </Row>

                <Row gutter={[16, 16]}>
                    {/* Offboarding Checklist */}
                    <Col xs={24} md={14}>
                        <Card title={<Space><FormOutlined /> <Text strong>Exit Process Checklist</Text></Space>} style={{ ...glass, height: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {offboardingSteps.map((step, i) => (
                                    <motion.div key={step.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: `${step.color}05`, border: `1px solid ${step.color}22`, position: 'relative' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${step.color}15`, color: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                                            {step.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text strong style={{ fontSize: 13 }}>{step.title}</Text>
                                                <Tag style={{ borderRadius: 10, fontSize: 9, margin: 0, background: `${step.color}10`, border: `1px solid ${step.color}33`, color: step.color }}>{step.duration}</Tag>
                                            </div>
                                            <Text type="secondary" style={{ fontSize: 10 }}>{step.description}</Text>
                                        </div>
                                        <Badge count={i + 1} style={{ backgroundColor: step.color }} size="small" />
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </Col>

                    {/* Departing Employees */}
                    <Col xs={24} md={10}>
                        <Card title={<Space><LogoutOutlined /> <Text strong>Departing Employees</Text></Space>} style={{ ...glass, height: '100%' }}>
                            {employees.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {employees.map((emp, i) => {
                                        const tenure = dayjs(emp.terminationDate || dayjs()).diff(dayjs(emp.hireDate), 'year', true);
                                        return (
                                            <motion.div key={emp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                                style={{ ...glass, padding: 12, borderRadius: 10, borderLeft: `3px solid ${emp.employmentStatus === 'resigned' ? '#f59e0b' : '#ef4444'}` }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Avatar size={32} style={{ backgroundColor: emp.employmentStatus === 'resigned' ? '#f59e0b' : '#ef4444', fontSize: 11 }}>
                                                        {emp.firstName[0]}{emp.lastName[0]}
                                                    </Avatar>
                                                    <div style={{ flex: 1 }}>
                                                        <Text strong style={{ fontSize: 12, display: 'block' }}>{emp.firstName} {emp.lastName}</Text>
                                                        <Text type="secondary" style={{ fontSize: 10 }}>{emp.departmentName} · {emp.positionTitle}</Text>
                                                    </div>
                                                    <Tag color={emp.employmentStatus === 'resigned' ? 'orange' : 'red'} style={{ borderRadius: 10, fontSize: 9 }}>
                                                        {emp.employmentStatus}
                                                    </Tag>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10 }}>
                                                    <Text style={{ fontSize: 10, color: '#9ca3af' }}>Tenure: {tenure.toFixed(1)} years</Text>
                                                    {emp.terminationDate && <Text style={{ fontSize: 10, color: '#9ca3af' }}>Exit: {dayjs(emp.terminationDate).format('MMM D, YYYY')}</Text>}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Empty description={<Text type="secondary">No departing employees — great retention! 🎉</Text>} />
                            )}
                        </Card>
                    </Col>
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
