"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import RbacGuard from "@/components/common/RbacGuard";
import { Card, Table, Tag, Button, Space, Typography, Spin, message, Modal, Form, Input, Select, Segmented, Avatar, Badge, Row, Col, Statistic, Tooltip, Progress } from "antd";
import { ApartmentOutlined, PlusOutlined, TeamOutlined, UnorderedListOutlined, AppstoreOutlined, UserOutlined, DollarOutlined, ArrowDownOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const DEPT_Q = `query($t:String!){hrDepartments(tenantId:$t){id name code description parentId headEmployeeId costCenter status createdAt}}`;
const EMP_Q = `query($t:String!){hrEmployees(tenantId:$t,status:"active"){id firstName lastName departmentId departmentName positionTitle baseSalary}}`;
const CREATE_DEPT = `mutation($t:String!,$i:CreateDepartmentInput!){createHrDepartment(tenantId:$t,input:$i){id}}`;

const deptColors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#ef4444', '#6366f1', '#84cc16', '#14b8a6'];

// Org Chart Node
function OrgNode({ dept, employees, allDepts, level = 0, colorIndex = 0 }: { dept: any; employees: any[]; allDepts: any[]; level?: number; colorIndex?: number }) {
    const deptEmps = employees.filter(e => e.departmentId === dept.id);
    const children = allDepts.filter(d => d.parentId === dept.id);
    const color = deptColors[colorIndex % deptColors.length];
    const totalSalary = deptEmps.reduce((s, e) => s + (Number(e.baseSalary) || 0), 0);
    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { notation: 'compact', compactDisplay: 'short' }).format(v);
    const head = deptEmps.find(e => e.id === dept.headEmployeeId);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: level * 0.1 + colorIndex * 0.05 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Node Card */}
            <motion.div whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                style={{ ...glass, padding: 14, borderRadius: 14, minWidth: 180, maxWidth: 220, borderTop: `3px solid ${color}`, cursor: 'default', position: 'relative', textAlign: 'center' }}>
                {/* Headcount Badge */}
                <Badge count={deptEmps.length} style={{ backgroundColor: color, position: 'absolute', top: -6, right: -6 }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
                    <ApartmentOutlined style={{ color, fontSize: 16 }} />
                    <Text strong style={{ fontSize: 13 }}>{dept.name}</Text>
                </div>
                {dept.code && <Tag color={color} style={{ borderRadius: 10, marginBottom: 6, fontSize: 10 }}>{dept.code}</Tag>}

                {/* Members preview */}
                {deptEmps.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: -4, marginBottom: 6 }}>
                        <Avatar.Group max={{ count: 4, style: { backgroundColor: color, fontSize: 10 } }} size="small">
                            {deptEmps.slice(0, 5).map(e => (
                                <Tooltip key={e.id} title={`${e.firstName} ${e.lastName} — ${e.positionTitle || 'Employee'}`}>
                                    <Avatar size="small" style={{ backgroundColor: color, fontSize: 9 }}>{e.firstName[0]}{e.lastName[0]}</Avatar>
                                </Tooltip>
                            ))}
                        </Avatar.Group>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b7280' }}>
                    <Space size={4}><TeamOutlined />{deptEmps.length} people</Space>
                    {totalSalary > 0 && <Space size={4}><DollarOutlined />{fmt(totalSalary)}</Space>}
                </div>
            </motion.div>

            {/* Connector and Children */}
            {children.length > 0 && (
                <>
                    <div style={{ width: 2, height: 20, background: `${color}33` }} />
                    <div style={{ display: 'flex', gap: 16, position: 'relative' }}>
                        {children.length > 1 && <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 2, background: `${color}33` }} />}
                        {children.map((child, i) => (
                            <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: 2, height: 16, background: `${color}33` }} />
                                <OrgNode dept={child} employees={employees} allDepts={allDepts} level={level + 1} colorIndex={colorIndex + i + 1} />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </motion.div>
    );
}

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<string>('orgchart');
    const [form] = Form.useForm();
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();

    const load = () => {
        setLoading(true);
        Promise.all([gql(DEPT_Q, { t: DEFAULT_TENANT_ID }), gql(EMP_Q, { t: DEFAULT_TENANT_ID })])
            .then(([d, e]) => { setDepartments(d.hrDepartments || []); setEmployees(e.hrEmployees || []); })
            .catch(() => undefined).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const empCount = (deptId: string) => employees.filter(e => e.departmentId === deptId).length;
    const deptSalary = (deptId: string) => employees.filter(e => e.departmentId === deptId).reduce((s, e) => s + (Number(e.baseSalary) || 0), 0);
    const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

    const handleCreate = async (values: any) => {
        try { await gql(CREATE_DEPT, { t: DEFAULT_TENANT_ID, i: values }); message.success('Department created'); setModalOpen(false); form.resetFields(); load(); }
        catch (e: any) { message.error(e.message); }
    };

    // Root departments (no parent)
    const rootDepts = departments.filter(d => !d.parentId || !departments.find(p => p.id === d.parentId));
    const totalDepts = departments.length;
    const activeDepts = departments.filter(d => d.status === 'active').length;
    const avgSize = totalDepts > 0 ? Math.round(employees.length / totalDepts) : 0;

    const columns = [
        { title: 'Department', key: 'name', render: (_: any, r: any) => {
            const count = empCount(r.id);
            const ci = departments.indexOf(r) % deptColors.length;
            return <Space><div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${deptColors[ci]}15`, color: deptColors[ci] }}><ApartmentOutlined /></div><div><Text strong>{r.name}</Text>{r.code && <Tag color={deptColors[ci]} style={{ marginLeft: 6, borderRadius: 10, fontSize: 10 }}>{r.code}</Tag>}</div></Space>;
        }},
        { title: 'Description', dataIndex: 'description', key: 'desc', ellipsis: true, render: (v: string) => v || '—' },
        { title: 'Parent', key: 'parent', render: (_: any, r: any) => { const p = departments.find(d => d.id === r.parentId); return p ? <Tag style={{ borderRadius: 10 }}>{p.name}</Tag> : <Text type="secondary">Root</Text>; } },
        { title: 'Headcount', key: 'count', align: 'center' as const, sorter: (a: any, b: any) => empCount(a.id) - empCount(b.id),
            render: (_: any, r: any) => {
                const count = empCount(r.id);
                return <Badge count={count} style={{ backgroundColor: count > 0 ? '#3b82f6' : '#e5e7eb' }} showZero />;
            }
        },
        { title: 'Payroll', key: 'salary', render: (_: any, r: any) => { const s = deptSalary(r.id); return s > 0 ? <Text style={{ fontSize: 12 }}>{fmt(s)}</Text> : '—'; } },
        { title: 'Avg Salary', key: 'avg', render: (_: any, r: any) => { const c = empCount(r.id); const s = deptSalary(r.id); return c > 0 ? <Text style={{ fontSize: 12, color: '#10b981' }}>{fmt(Math.round(s / c))}</Text> : '—'; } },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'} style={{ borderRadius: 10 }}>{v}</Tag> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#8b5cf6', '#3b82f6', themeColor]} className="text-[22px] font-bold tracking-tight">Departments</AuroraText>}
            subTitle={<DecryptedText text="Organizational structure & department management" animateOn="view" revealDirection="start" speed={60} sequential />}
            extra={[
                <Space key="actions">
                    <Segmented value={viewMode} onChange={(v: any) => setViewMode(v)} options={[{ label: <><AppstoreOutlined /> Org Chart</>, value: 'orgchart' }, { label: <><UnorderedListOutlined /> Table</>, value: 'table' }]} />
                    <Button type="primary" icon={<PlusOutlined />} style={{ background: themeColor }} onClick={() => setModalOpen(true)}>Add</Button>
                <RbacGuard requiredRole="manager"><Tooltip key="xl" title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'hr_departments', title: 'HR Departments', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Code', key: 'code' }, { header: 'Description', key: 'description' }, { header: 'Status', key: 'status' }], data: departments })} /></Tooltip> <Tooltip key="pd" title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'hr_departments', title: 'HR Departments', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Code', key: 'code' }, { header: 'Description', key: 'description' }, { header: 'Status', key: 'status' }], data: departments })} /></Tooltip></RbacGuard>,
                </Space>
            ]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Stats */}
                <Row gutter={[12, 12]}>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #3b82f6' }}><Statistic title="Total Departments" value={totalDepts} prefix={<ApartmentOutlined />} valueStyle={{ color: '#3b82f6' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #10b981' }}><Statistic title="Active" value={activeDepts} valueStyle={{ color: '#10b981' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #8b5cf6' }}><Statistic title="Avg Team Size" value={avgSize} prefix={<TeamOutlined />} valueStyle={{ color: '#8b5cf6' }} /></Card></Col>
                    <Col xs={6}><Card size="small" style={{ ...glass, borderTop: '3px solid #f59e0b' }}><Statistic title="Total Payroll" value={fmt(employees.reduce((s, e) => s + (Number(e.baseSalary) || 0), 0))} valueStyle={{ color: '#f59e0b', fontSize: 14 }} /></Card></Col>
                </Row>

                {viewMode === 'orgchart' ? (
                    <Card style={{ ...glass, overflow: 'auto' }} title={<Space><ApartmentOutlined /> <Text strong>Organization Chart</Text></Space>}>
                        {loading ? <Spin /> : (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, paddingBottom: 16, minWidth: rootDepts.length * 240 }}>
                                {rootDepts.map((dept, i) => (
                                    <OrgNode key={dept.id} dept={dept} employees={employees} allDepts={departments} colorIndex={i} />
                                ))}
                            </div>
                        )}
                    </Card>
                ) : (
                    <Card style={glass}>
                        <Table scroll={{ x: 900 }} dataSource={departments} columns={columns} rowKey="id" loading={loading} pagination={false} size="middle" />
                    </Card>
                )}
            </motion.div>

            <Modal title="Add Department" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="code" label="Code"><Input /></Form.Item>
                    <Form.Item name="description" label="Description"><Input.TextArea rows={2} /></Form.Item>
                    <Form.Item name="parentId" label="Parent Department"><Select allowClear options={departments.map(d => ({ label: d.name, value: d.id }))} /></Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}


