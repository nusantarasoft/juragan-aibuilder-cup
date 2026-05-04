"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Table, Tag, Button, Space, Typography, message, Row, Col, Statistic, Modal, Form, Select, DatePicker, Progress, Tooltip, Badge } from "antd";
import { CoffeeOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, PlusOutlined, CalendarOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const LR_Q = `query($t:String!,$s:String){hrLeaveRequests(tenantId:$t,status:$s){id employeeId employeeName employeeNumber leaveTypeName leaveTypeColor startDate endDate days reason status approvedAt rejectionReason createdAt}}`;
const LT_Q = `query($t:String!){hrLeaveTypes(tenantId:$t){id name code daysPerYear color}}`;
const EMP_Q = `query($t:String!){hrEmployees(tenantId:$t,status:"active"){id firstName lastName employeeNumber}}`;
const LB_Q = `query($t:String!){hrLeaveBalances(tenantId:$t){id employeeId leaveTypeId balance used remaining year}}`;
const CREATE_LR = `mutation($t:String!,$i:CreateLeaveRequestInput!){createHrLeaveRequest(tenantId:$t,input:$i){id}}`;
const APPROVE = `mutation($id:String!,$a:String!){approveHrLeaveRequest(id:$id,approverId:$a){id status}}`;
const REJECT = `mutation($id:String!,$r:String){rejectHrLeaveRequest(id:$id,reason:$r){id status}}`;

const statusConfig: Record<string, { color: string; icon: any; bg: string }> = {
    pending: { color: '#f59e0b', icon: <ClockCircleOutlined />, bg: 'rgba(245,158,11,0.08)' },
    approved: { color: '#10b981', icon: <CheckCircleOutlined />, bg: 'rgba(16,185,129,0.08)' },
    rejected: { color: '#ef4444', icon: <CloseCircleOutlined />, bg: 'rgba(239,68,68,0.08)' },
    cancelled: { color: '#6b7280', icon: <CloseCircleOutlined />, bg: 'rgba(107,114,128,0.08)' },
};
const typeIcons: Record<string, string> = { 'Annual Leave': '🏖️', 'Sick Leave': '🤒', 'Personal Leave': '👤', 'Maternity Leave': '👶' };

export default function LeavePage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [types, setTypes] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [balances, setBalances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();
    const { themeColor } = usePreferencesStore();

    const load = async () => {
        setLoading(true);
        const [lr, lt, e, lb] = await Promise.all([
            gql(LR_Q, { t: DEFAULT_TENANT_ID, s: statusFilter }).catch(() => ({ hrLeaveRequests: [] })),
            gql(LT_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrLeaveTypes: [] })),
            gql(EMP_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrEmployees: [] })),
            gql(LB_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrLeaveBalances: [] })),
        ]);
        setRequests(lr.hrLeaveRequests || []); setTypes(lt.hrLeaveTypes || []); setEmployees(e.hrEmployees || []); setBalances(lb.hrLeaveBalances || []);
        setLoading(false);
    };
    useEffect(() => { load(); }, [statusFilter]);

    const handleApprove = async (id: string) => { try { await gql(APPROVE, { id, a: 'e1000000-0000-0000-0000-000000000001' }); message.success('Leave approved'); load(); } catch (e: any) { message.error(e.message); } };
    const handleReject = async (id: string) => { try { await gql(REJECT, { id, r: 'Insufficient leave balance' }); message.success('Leave rejected'); load(); } catch (e: any) { message.error(e.message); } };
    const handleCreate = async (values: any) => { try { const days = values.endDate.diff(values.startDate, 'day') + 1; await gql(CREATE_LR, { t: DEFAULT_TENANT_ID, i: { ...values, startDate: values.startDate.format('YYYY-MM-DD'), endDate: values.endDate.format('YYYY-MM-DD'), days } }); message.success('Leave request submitted'); setModalOpen(false); form.resetFields(); load(); } catch (e: any) { message.error(e.message); } };

    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const totalDaysUsed = requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.days || 0), 0);

    // Aggregate leave type usage
    const typeUsage = types.map(t => {
        const used = requests.filter(r => r.leaveTypeName === t.name && r.status === 'approved').reduce((s, r) => s + (r.days || 0), 0);
        return { ...t, used, remaining: t.daysPerYear - used, pct: Math.round((used / (t.daysPerYear || 1)) * 100) };
    });

    const columns = [
        { title: 'Employee', key: 'emp', render: (_: any, r: any) => <Space><div style={{ width: 32, height: 32, borderRadius: '50%', background: statusConfig[r.status]?.bg, border: `2px solid ${statusConfig[r.status]?.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{statusConfig[r.status]?.icon}</div><div><Text strong>{r.employeeName}</Text><br/><Text type="secondary" style={{ fontSize: 11 }}>{r.employeeNumber}</Text></div></Space> },
        { title: 'Type', key: 'type', render: (_: any, r: any) => <Tag color={r.leaveTypeColor}>{typeIcons[r.leaveTypeName] || '📅'} {r.leaveTypeName}</Tag> },
        { title: 'Period', key: 'period', render: (_: any, r: any) => <Tooltip title={`${r.days} day(s)`}><Text><CalendarOutlined /> {r.startDate} → {r.endDate}</Text></Tooltip> },
        { title: 'Days', dataIndex: 'days', key: 'days', align: 'center' as const, render: (v: number) => <Badge count={v} style={{ backgroundColor: '#3b82f6' }} /> },
        { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true, render: (v: string) => v || '—' },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => <Tag icon={statusConfig[v]?.icon} color={statusConfig[v]?.color} style={{ borderRadius: 20, padding: '1px 10px' }}>{v.charAt(0).toUpperCase() + v.slice(1)}</Tag> },
        { title: 'Actions', key: 'actions', width: 180, render: (_: any, r: any) => r.status === 'pending' ? <Space><Button size="small" type="primary" style={{ background: '#10b981', borderRadius: 6 }} icon={<CheckCircleOutlined />} onClick={() => handleApprove(r.id)}>Approve</Button><Button size="small" danger style={{ borderRadius: 6 }} icon={<CloseCircleOutlined />} onClick={() => handleReject(r.id)}>Reject</Button></Space> : '—' },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#3b82f6', '#06b6d4', themeColor]} className="text-[22px] font-bold tracking-tight">Leave Management</AuroraText>}
            subTitle={<DecryptedText text="Leave requests, approvals & balance tracking" animateOn="view" revealDirection="start" speed={60} sequential />}
            extra={[<Button key="add" type="primary" icon={<PlusOutlined />} style={{ background: themeColor }} onClick={() => setModalOpen(true)}>Request Leave</Button>]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Stats Row */}
                <Row gutter={[16, 16]}>
                    <Col xs={6}><Card size="small" style={glass}><Statistic title="Pending Requests" value={pending} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#f59e0b' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={glass}><Statistic title="Approved" value={approved} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#10b981' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={glass}><Statistic title="Total Days Used" value={totalDaysUsed} prefix={<CalendarOutlined />} valueStyle={{ color: '#3b82f6' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={glass}><Statistic title="Total Requests" value={requests.length} prefix={<CoffeeOutlined />} valueStyle={{ color: '#8b5cf6' }} /></Card></Col>
                </Row>

                {/* Leave Type Balance Cards */}
                {typeUsage.length > 0 && (
                    <Card size="small" style={glass} title={<Text strong style={{ fontSize: 13 }}>🏖️ Leave Type Allocation</Text>}>
                        <Row gutter={[12, 12]}>
                            {typeUsage.map((t, i) => (
                                <Col xs={6} key={t.id}>
                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                                        style={{ ...glass, padding: 14, borderRadius: 12, borderTop: `3px solid ${t.color || themeColor}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <Text strong style={{ fontSize: 13 }}>{typeIcons[t.name] || '📅'} {t.name}</Text>
                                            <Text type="secondary" style={{ fontSize: 11 }}>{t.code}</Text>
                                        </div>
                                        <Progress percent={t.pct} strokeColor={t.color || themeColor} size="small" showInfo={false} style={{ marginBottom: 6 }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text style={{ fontSize: 11, color: '#6b7280' }}>Used: <Text strong style={{ color: t.color || themeColor }}>{t.used}</Text></Text>
                                            <Text style={{ fontSize: 11, color: '#6b7280' }}>of {t.daysPerYear} days/year</Text>
                                        </div>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    </Card>
                )}

                {/* Requests Table */}
                <Card style={glass}
                    title={<Space><CoffeeOutlined /> <Text strong>Leave Requests</Text></Space>}
                    extra={<Select placeholder="Filter status" allowClear style={{ width: 150 }} value={statusFilter} onChange={setStatusFilter}
                        options={[
                            { label: <Space><ClockCircleOutlined style={{ color: '#f59e0b' }} />Pending</Space>, value: 'pending' },
                            { label: <Space><CheckCircleOutlined style={{ color: '#10b981' }} />Approved</Space>, value: 'approved' },
                            { label: <Space><CloseCircleOutlined style={{ color: '#ef4444' }} />Rejected</Space>, value: 'rejected' },
                        ]} />}>
                    <Table dataSource={requests} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} size="middle" />
                </Card>
            </motion.div>

            <Modal title="Request Leave" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="employeeId" label="Employee" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={employees.map(e => ({ label: `${e.firstName} ${e.lastName} (${e.employeeNumber})`, value: e.id }))} /></Form.Item>
                    <Form.Item name="leaveTypeId" label="Leave Type" rules={[{ required: true }]}><Select options={types.map(t => ({ label: `${typeIcons[t.name] || '📅'} ${t.name} (${t.daysPerYear} days/yr)`, value: t.id }))} /></Form.Item>
                    <Space size={12}><Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}><DatePicker /></Form.Item><Form.Item name="endDate" label="End Date" rules={[{ required: true }]}><DatePicker /></Form.Item></Space>
                    <Form.Item name="reason" label="Reason"><textarea className="ant-input" rows={2} style={{ width: '100%', borderRadius: 8, border: '1px solid #d9d9d9', padding: 8 }} /></Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
