"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Table, Tag, Avatar, Input, Select, Button, Space, Typography, message, Modal, Form, DatePicker, InputNumber, Row, Col, Statistic, Segmented, Badge, Tooltip, Progress } from "antd";
import { TeamOutlined, SearchOutlined, PlusOutlined, UserOutlined, MailOutlined, PhoneOutlined, AppstoreOutlined, UnorderedListOutlined, ManOutlined, WomanOutlined, CalendarOutlined, DollarOutlined, ApartmentOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const EMP_QUERY = `query($t:String!,$search:String,$dept:String,$status:String){hrEmployees(tenantId:$t,search:$search,departmentId:$dept,status:$status){id employeeNumber firstName lastName email phone departmentName positionTitle employmentType employmentStatus hireDate baseSalary avatarUrl gender}}`;
const DEPT_QUERY = `query($t:String!){hrDepartments(tenantId:$t){id name}}`;
const CREATE_EMP = `mutation($t:String!,$i:CreateEmployeeInput!){createHrEmployee(tenantId:$t,input:$i){id}}`;

const statusConfig: Record<string, { color: string; bg: string }> = {
    active: { color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
    on_leave: { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
    suspended: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    terminated: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
    resigned: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};
const typeLabels: Record<string, { label: string; color: string }> = {
    full_time: { label: 'Full-Time', color: '#3b82f6' },
    part_time: { label: 'Part-Time', color: '#8b5cf6' },
    contract: { label: 'Contract', color: '#f59e0b' },
    intern: { label: 'Intern', color: '#06b6d4' },
};
const deptColors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#ef4444', '#6366f1'];

// Employee Profile Card
function EmployeeCard({ emp, onClick, deptColor }: { emp: any; onClick: () => void; deptColor: string }) {
    const tenure = dayjs().diff(dayjs(emp.hireDate), 'year', true);
    const tenureLabel = tenure < 1 ? `${Math.round(tenure * 12)}mo` : `${tenure.toFixed(1)}yr`;
    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(v);

    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
            onClick={onClick} style={{ ...glass, padding: 16, borderRadius: 14, cursor: 'pointer', borderTop: `3px solid ${deptColor}`, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Badge dot status={emp.employmentStatus === 'active' ? 'success' : emp.employmentStatus === 'on_leave' ? 'processing' : 'default'}>
                    <Avatar size={42} style={{ backgroundColor: deptColor, fontSize: 14 }} src={emp.avatarUrl}>
                        {emp.firstName[0]}{emp.lastName[0]}
                    </Avatar>
                </Badge>
                <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 13, display: 'block' }}>{emp.firstName} {emp.lastName}</Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>{emp.employeeNumber}</Text>
                </div>
                {emp.gender && (emp.gender === 'male' ?
                    <ManOutlined style={{ color: '#3b82f6', fontSize: 12 }} /> :
                    <WomanOutlined style={{ color: '#ec4899', fontSize: 12 }} />
                )}
            </div>

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {emp.departmentName && <Tag color={deptColor} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>{emp.departmentName}</Tag>}
                {emp.positionTitle && <Tag style={{ borderRadius: 10, fontSize: 10, margin: 0, background: 'rgba(0,0,0,0.04)', border: 'none' }}>{emp.positionTitle}</Tag>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Tag color={typeLabels[emp.employmentType]?.color || 'default'} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>
                    {typeLabels[emp.employmentType]?.label || emp.employmentType}
                </Tag>
                <Tag color={statusConfig[emp.employmentStatus]?.color} style={{ borderRadius: 10, fontSize: 10, margin: 0 }}>
                    {emp.employmentStatus?.replace('_', ' ')}
                </Tag>
            </div>

            <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <Tooltip title="Tenure"><Space size={4}><CalendarOutlined style={{ color: '#6b7280' }} /><Text style={{ fontSize: 10 }}>{tenureLabel}</Text></Space></Tooltip>
                {emp.baseSalary > 0 && <Tooltip title="Base Salary"><Text style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Rp {fmt(emp.baseSalary)}</Text></Tooltip>}
            </div>

            {emp.email && (
                <div style={{ marginTop: 6, fontSize: 10 }}>
                    <Text type="secondary" style={{ fontSize: 10 }}><MailOutlined /> {emp.email}</Text>
                </div>
            )}
        </motion.div>
    );
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState<string | undefined>();
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [viewMode, setViewMode] = useState<string>('grid');
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();
    const { themeColor } = usePreferencesStore();
    const router = useRouter();

    const load = () => {
        setLoading(true);
        Promise.all([
            gql(EMP_QUERY, { t: DEFAULT_TENANT_ID, search: search || undefined, dept: deptFilter, status: statusFilter }),
            gql(DEPT_QUERY, { t: DEFAULT_TENANT_ID }),
        ]).then(([e, d]) => { setEmployees(e.hrEmployees || []); setDepartments(d.hrDepartments || []); }).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [search, deptFilter, statusFilter]);

    const handleCreate = async (values: any) => {
        try {
            await gql(CREATE_EMP, { t: DEFAULT_TENANT_ID, i: { ...values, hireDate: values.hireDate?.format('YYYY-MM-DD') } });
            message.success('Employee created'); setModalOpen(false); form.resetFields(); load();
        } catch (e: any) { message.error(e.message); }
    };

    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

    // Stats
    const active = employees.filter(e => e.employmentStatus === 'active').length;
    const maleCount = employees.filter(e => e.gender === 'male').length;
    const femaleCount = employees.filter(e => e.gender === 'female').length;
    const totalSalary = employees.reduce((s, e) => s + (Number(e.baseSalary) || 0), 0);
    const deptMap = useMemo(() => {
        const m = new Map<string, string>();
        departments.forEach((d, i) => m.set(d.name, deptColors[i % deptColors.length]));
        return m;
    }, [departments]);

    const columns = [
        { title: 'Employee', key: 'name', render: (_: any, r: any) => (
            <Space><Badge dot status={r.employmentStatus === 'active' ? 'success' : 'default'}>
                <Avatar style={{ backgroundColor: deptMap.get(r.departmentName) || themeColor, fontSize: 11 }} src={r.avatarUrl}>{r.firstName[0]}{r.lastName[0]}</Avatar>
            </Badge><div><Text strong style={{ cursor: 'pointer', fontSize: 13 }} onClick={() => router.push(`/admin/hr/employees/${r.id}`)}>{r.firstName} {r.lastName}</Text><br /><Text type="secondary" style={{ fontSize: 10 }}>{r.employeeNumber}</Text></div></Space>
        )},
        { title: 'Department', dataIndex: 'departmentName', key: 'dept', render: (v: string) => v ? <Tag color={deptMap.get(v)} style={{ borderRadius: 10 }}>{v}</Tag> : '—' },
        { title: 'Position', dataIndex: 'positionTitle', key: 'pos', render: (v: string) => v || '—' },
        { title: 'Type', dataIndex: 'employmentType', key: 'type', render: (v: string) => <Tag color={typeLabels[v]?.color} style={{ borderRadius: 10 }}>{typeLabels[v]?.label || v}</Tag> },
        { title: 'Status', dataIndex: 'employmentStatus', key: 'status', render: (v: string) => <Tag color={statusConfig[v]?.color} style={{ borderRadius: 10 }}>{v?.replace('_', ' ')}</Tag> },
        { title: 'Salary', dataIndex: 'baseSalary', key: 'salary', render: (v: number) => v ? <Text style={{ fontSize: 12 }}>{fmt(v)}</Text> : '—', align: 'right' as const },
        { title: 'Tenure', key: 'tenure', render: (_: any, r: any) => { const y = dayjs().diff(dayjs(r.hireDate), 'year', true); return <Text style={{ fontSize: 12 }}>{y < 1 ? `${Math.round(y * 12)}mo` : `${y.toFixed(1)}yr`}</Text>; } },
        { title: 'Contact', key: 'contact', render: (_: any, r: any) => (
            <Space direction="vertical" size={0}>{r.email && <Text style={{ fontSize: 11 }}><MailOutlined /> {r.email}</Text>}{r.phone && <Text style={{ fontSize: 11 }}><PhoneOutlined /> {r.phone}</Text>}</Space>
        )},
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#3b82f6', '#8b5cf6', themeColor]} className="text-[22px] font-bold tracking-tight">Employee Directory</AuroraText>}
            subTitle={<DecryptedText text="Manage your workforce — profiles, roles & compensation" animateOn="view" revealDirection="start" speed={60} sequential />}
            extra={[
                <Space key="actions">
                    <Segmented value={viewMode} onChange={(v: any) => setViewMode(v)} options={[{ label: <><AppstoreOutlined /> Grid</>, value: 'grid' }, { label: <><UnorderedListOutlined /> List</>, value: 'list' }]} />
                    <Button type="primary" icon={<PlusOutlined />} style={{ background: themeColor }} onClick={() => setModalOpen(true)}>Add Employee</Button>
                </Space>
            ]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Stats Row */}
                <Row gutter={[12, 12]}>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #3b82f6' }}><Statistic title="Total Employees" value={employees.length} prefix={<TeamOutlined />} valueStyle={{ color: '#3b82f6' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #10b981' }}><Statistic title="Active" value={active} valueStyle={{ color: '#10b981' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #8b5cf6' }}>
                        <Statistic title="Gender" value={`${maleCount}:${femaleCount}`} prefix={<Space size={4}><ManOutlined style={{ color: '#3b82f6' }} /><WomanOutlined style={{ color: '#ec4899' }} /></Space>} />
                    </Card></Col>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #f59e0b' }}><Statistic title="Total Payroll" value={fmt(totalSalary)} valueStyle={{ color: '#f59e0b', fontSize: 14 }} /></Card></Col>
                </Row>

                {/* Filters */}
                <Card size="small" style={glass}>
                    <Space style={{ flexWrap: 'wrap' }} size={12}>
                        <Input placeholder="Search employees..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 260 }} allowClear />
                        <Select placeholder="Department" allowClear style={{ width: 180 }} value={deptFilter} onChange={setDeptFilter}
                            options={departments.map((d: any, i: number) => ({ label: <Space><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: deptColors[i % deptColors.length] }} />{d.name}</Space>, value: d.id }))} />
                        <Select placeholder="Status" allowClear style={{ width: 140 }} value={statusFilter} onChange={setStatusFilter}
                            options={Object.entries(statusConfig).map(([k, v]) => ({ label: <Space><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: v.color }} />{k.replace('_', ' ')}</Space>, value: k }))} />
                    </Space>
                </Card>

                {viewMode === 'grid' ? (
                    <Row gutter={[12, 12]}>
                        {employees.map((emp, i) => (
                            <Col xs={24} sm={12} md={8} lg={6} key={emp.id}>
                                <EmployeeCard emp={emp} onClick={() => router.push(`/admin/hr/employees/${emp.id}`)} deptColor={deptMap.get(emp.departmentName) || themeColor} />
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <Card style={glass}>
                        <Table dataSource={employees} columns={columns} rowKey="id" loading={loading}
                            pagination={{ pageSize: 15, showTotal: t => `${t} employees` }} size="middle"
                            onRow={r => ({ onClick: () => router.push(`/admin/hr/employees/${r.id}`), style: { cursor: 'pointer' } })} />
                    </Card>
                )}
            </motion.div>

            <Modal title="Add Employee" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600}>
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Row gutter={12}>
                        <Col span={8}><Form.Item name="employeeNumber" label="Employee #" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={8}><Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={8}><Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}><Form.Item name="email" label="Email"><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="phone" label="Phone"><Input /></Form.Item></Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}><Form.Item name="departmentId" label="Department"><Select options={departments.map((d: any) => ({ label: d.name, value: d.id }))} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="hireDate" label="Hire Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={8}><Form.Item name="gender" label="Gender"><Select options={[{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }]} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="employmentType" label="Type" initialValue="full_time"><Select options={Object.entries(typeLabels).map(([k, v]) => ({ label: v.label, value: k }))} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="baseSalary" label="Base Salary"><InputNumber style={{ width: '100%' }} formatter={v => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} /></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
