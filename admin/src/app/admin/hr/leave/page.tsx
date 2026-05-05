"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Table, Tag, Button, Space, Typography, message, Row, Col, Statistic, Modal, Form, Select, DatePicker, Progress, Tooltip, Badge, Segmented } from "antd";
import { CoffeeOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, PlusOutlined, CalendarOutlined, AppstoreOutlined, UnorderedListOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

// â”€â”€â”€ Export Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function exportCSV(filename: string, headers: string[], rows: string[][]) {
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
function exportPDF(title: string, headers: string[], rows: string[][]) {
    const style = `<style>body{font-family:Arial,sans-serif;margin:20px}h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}h2{font-size:14px;color:#666;margin-top:0}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:12px}th{background:#1a1a2e;color:#fff;padding:8px 12px;text-align:left}td{padding:6px 12px;border-bottom:1px solid #eee}@media print{body{margin:0}}</style>`;
    const tableHtml = `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const html = `<!DOCTYPE html><html><head><title>${title}</title>${style}</head><body><h1>${title}</h1><h2>NusantaraSoft â€¢ Generated: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</h2>${tableHtml}<script>window.onload=()=>window.print()<\/script></body></html>`;
    const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); }
}
const LR_Q = `query($t:String!,$s:String){hrLeaveRequests(tenantId:$t,status:$s){id employeeId employeeName employeeNumber leaveTypeName leaveTypeColor startDate endDate days reason status approvedAt rejectionReason createdAt}}`;
const LT_Q = `query($t:String!){hrLeaveTypes(tenantId:$t){id name code daysPerYear color}}`;
const EMP_Q = `query($t:String!){hrEmployees(tenantId:$t,status:"active"){id firstName lastName employeeNumber departmentName}}`;
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
const typeIcons: Record<string, string> = { 'Annual Leave': 'ðŸ–ï¸', 'Sick Leave': 'ðŸ¤’', 'Personal Leave': 'ðŸ‘¤', 'Maternity Leave': 'ðŸ‘¶' };

// Leave Calendar
function LeaveCalendar({ requests, month }: { requests: any[]; month: string }) {
    const start = dayjs(month + '-01');
    const daysInMonth = start.daysInMonth();
    const startDay = start.day();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const dateMap = useMemo(() => {
        const m = new Map<string, any[]>();
        requests.filter(r => r.status === 'approved' || r.status === 'pending').forEach(r => {
            const sd = dayjs(r.startDate), ed = dayjs(r.endDate);
            let cur = sd;
            while (cur.isBefore(ed) || cur.isSame(ed, 'day')) {
                const key = cur.format('YYYY-MM-DD');
                if (!m.has(key)) m.set(key, []);
                m.get(key)!.push(r);
                cur = cur.add(1, 'day');
            }
        });
        return m;
    }, [requests]);

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
                {weekDays.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#9ca3af', fontWeight: 600, padding: 2 }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = start.date(day).format('YYYY-MM-DD');
                    const dayRecords = dateMap.get(dateStr) || [];
                    const isWeekend = (startDay + i) % 7 === 0 || (startDay + i) % 7 === 6;
                    const isToday = dayjs().format('YYYY-MM-DD') === dateStr;
                    const hasPending = dayRecords.some(r => r.status === 'pending');
                    const hasApproved = dayRecords.some(r => r.status === 'approved');

                    return (
                        <Tooltip key={day} title={dayRecords.length > 0 ? dayRecords.map(r => `${r.employeeName} â€” ${r.leaveTypeName}`).join('\n') : dateStr}>
                            <motion.div whileHover={{ scale: 1.1 }}
                                style={{
                                    aspectRatio: '1', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    background: hasApproved ? 'rgba(16,185,129,0.15)' : hasPending ? 'rgba(245,158,11,0.12)' : isWeekend ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.3)',
                                    border: isToday ? '2px solid #3b82f6' : hasApproved ? '1px solid rgba(16,185,129,0.3)' : hasPending ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(0,0,0,0.04)',
                                    cursor: 'default', position: 'relative',
                                }}>
                                <Text style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isWeekend ? '#9ca3af' : '#374151' }}>{day}</Text>
                                {dayRecords.length > 0 && (
                                    <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                                        {dayRecords.slice(0, 3).map((r, j) => (
                                            <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: r.status === 'approved' ? '#10b981' : '#f59e0b' }} />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}

// Leave Type Usage Chart (horizontal bars)
function LeaveTypeChart({ typeUsage, themeColor }: { typeUsage: any[]; themeColor: string }) {
    const maxDays = Math.max(...typeUsage.map(t => t.daysPerYear), 1);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {typeUsage.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ minWidth: 100, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>{typeIcons[t.name] || 'ðŸ“…'}</span>
                        <Text style={{ fontSize: 11, fontWeight: 600 }}>{t.name}</Text>
                    </div>
                    <div style={{ flex: 1, position: 'relative', height: 22, borderRadius: 11, background: 'rgba(0,0,0,0.03)', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(t.daysPerYear / maxDays) * 100}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                            style={{ height: '100%', borderRadius: 11, background: `${t.color || themeColor}22`, position: 'absolute' }} />
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(t.used / maxDays) * 100}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                            style={{ height: '100%', borderRadius: 11, background: t.color || themeColor, display: 'flex', alignItems: 'center', paddingLeft: 8, minWidth: t.used > 0 ? 30 : 0 }}>
                            {t.used > 0 && <Text style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>{t.used}d</Text>}
                        </motion.div>
                    </div>
                    <Text style={{ fontSize: 10, color: '#9ca3af', minWidth: 50, textAlign: 'right' }}>{t.remaining}/{t.daysPerYear}d</Text>
                </motion.div>
            ))}
        </div>
    );
}

export default function LeavePage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [types, setTypes] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [balances, setBalances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [viewMode, setViewMode] = useState<string>('table');
    const [calMonth, setCalMonth] = useState(dayjs().format('YYYY-MM'));
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();

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
    const handleReject = async (id: string) => {
        Modal.confirm({ title: 'Reject leave request?', content: 'This will reject the leave and notify the employee.',
            onOk: async () => { try { await gql(REJECT, { id, r: 'Insufficient leave balance' }); message.success('Leave rejected'); load(); } catch (e: any) { message.error(e.message); } }
        });
    };
    const handleCreate = async (values: any) => { try { const days = values.endDate.diff(values.startDate, 'day') + 1; await gql(CREATE_LR, { t: DEFAULT_TENANT_ID, i: { ...values, startDate: values.startDate.format('YYYY-MM-DD'), endDate: values.endDate.format('YYYY-MM-DD'), days } }); message.success('Leave request submitted'); setModalOpen(false); form.resetFields(); load(); } catch (e: any) { message.error(e.message); } };

    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const totalDaysUsed = requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.days || 0), 0);

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
            extra={[
                <Button key="csv" icon={<FileExcelOutlined />} size="small" onClick={() => exportCSV('leave_requests.csv', ['Employee', 'Type', 'Start', 'End', 'Days', 'Status', 'Reason'], requests.map(r => [r.employeeName, r.leaveTypeName, r.startDate, r.endDate, String(r.days || 0), r.status, r.reason || '']))}>Excel</Button>,
                <Button key="pdf" icon={<FilePdfOutlined />} size="small" onClick={() => exportPDF('Leave Requests Report', ['Employee', 'Type', 'Start', 'End', 'Days', 'Status'], requests.map(r => [r.employeeName, r.leaveTypeName, r.startDate, r.endDate, String(r.days || 0), r.status]))}>PDF</Button>,
                <Segmented key="view" value={viewMode} onChange={(v: any) => setViewMode(v)} options={[
                    { label: <><UnorderedListOutlined /> List</>, value: 'table' },
                    { label: <><CalendarOutlined /> Calendar</>, value: 'calendar' },
                ]} />,
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: 'none', borderRadius: 8 }}>Request Leave</Button>,
            ]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Stats Row */}
                <Row gutter={[12, 12]}>
                    {[
                        { title: 'Pending Requests', value: pending, icon: <ClockCircleOutlined />, color: '#f59e0b' },
                        { title: 'Approved', value: approved, icon: <CheckCircleOutlined />, color: '#10b981' },
                        { title: 'Rejected', value: rejected, icon: <CloseCircleOutlined />, color: '#ef4444' },
                        { title: 'Total Days Used', value: totalDaysUsed, icon: <CalendarOutlined />, color: '#3b82f6' },
                        { title: 'Total Requests', value: requests.length, icon: <CoffeeOutlined />, color: '#8b5cf6' },
                    ].map((s, i) => (
                        <Col key={i} xs={12} md={Math.floor(24 / 5)}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                    <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Leave Type Allocation + Calendar / Chart */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={viewMode === 'calendar' ? 14 : 24}>
                        {typeUsage.length > 0 && (
                            <Card size="small" style={{ ...glass, height: '100%' }} title={<Text strong style={{ fontSize: 13 }}>ðŸ–ï¸ Leave Type Usage</Text>}>
                                <LeaveTypeChart typeUsage={typeUsage} themeColor={themeColor} />
                            </Card>
                        )}
                    </Col>
                    {viewMode === 'calendar' && (
                        <Col xs={24} md={10}>
                            <Card size="small" style={{ ...glass, height: '100%' }}
                                title={<Space><CalendarOutlined /><Text strong style={{ fontSize: 13 }}>Leave Calendar</Text></Space>}
                                extra={
                                    <Space>
                                        <Button size="small" onClick={() => setCalMonth(dayjs(calMonth).subtract(1, 'month').format('YYYY-MM'))}>â—€</Button>
                                        <Text strong style={{ fontSize: 12, minWidth: 80, textAlign: 'center', display: 'inline-block' }}>{dayjs(calMonth).format('MMM YYYY')}</Text>
                                        <Button size="small" onClick={() => setCalMonth(dayjs(calMonth).add(1, 'month').format('YYYY-MM'))}>â–¶</Button>
                                    </Space>
                                }>
                                <LeaveCalendar requests={requests} month={calMonth} />
                                <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'center' }}>
                                    <Space size={4}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /><Text style={{ fontSize: 10 }}>Approved</Text></Space>
                                    <Space size={4}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /><Text style={{ fontSize: 10 }}>Pending</Text></Space>
                                </div>
                            </Card>
                        </Col>
                    )}
                </Row>

                {/* Requests Table */}
                <Card style={glass}
                    title={<Space><CoffeeOutlined /> <Text strong>Leave Requests</Text><Badge count={requests.length} style={{ backgroundColor: themeColor }} /></Space>}
                    extra={<Select placeholder="Filter status" allowClear style={{ width: 150 }} value={statusFilter} onChange={setStatusFilter}
                        options={[
                            { label: <Space><ClockCircleOutlined style={{ color: '#f59e0b' }} />Pending</Space>, value: 'pending' },
                            { label: <Space><CheckCircleOutlined style={{ color: '#10b981' }} />Approved</Space>, value: 'approved' },
                            { label: <Space><CloseCircleOutlined style={{ color: '#ef4444' }} />Rejected</Space>, value: 'rejected' },
                        ]} />}>
                    <Table dataSource={requests} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} size="middle" />
                </Card>
            </motion.div>

            <Modal title="Request Leave" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="Submit Request" width={500}>
                <Form form={form} layout="vertical" onFinish={handleCreate} style={{ paddingTop: 8 }}>
                    <Form.Item name="employeeId" label="Employee" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" placeholder="Select employee"
                        options={employees.map(e => ({ label: `${e.firstName} ${e.lastName} (${e.employeeNumber})`, value: e.id }))} /></Form.Item>
                    <Form.Item name="leaveTypeId" label="Leave Type" rules={[{ required: true }]}>
                        <Select options={types.map(t => ({ label: `${typeIcons[t.name] || 'ðŸ“…'} ${t.name} (${t.daysPerYear} days/yr)`, value: t.id }))} />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}><Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="endDate" label="End Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Form.Item name="reason" label="Reason"><textarea className="ant-input" rows={2} style={{ width: '100%', borderRadius: 8, border: '1px solid #d9d9d9', padding: 8 }} /></Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
