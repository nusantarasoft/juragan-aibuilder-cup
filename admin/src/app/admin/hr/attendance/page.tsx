"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Table, Tag, Typography, Row, Col, Statistic, Select, Space, Segmented, Avatar, Badge, Tooltip, Progress } from "antd";
import { ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined, AppstoreOutlined, UnorderedListOutlined, UserOutlined, FieldTimeOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const ATT_Q = `query($t:String!,$m:String,$e:String){hrAttendance(tenantId:$t,month:$m,employeeId:$e){id employeeId employeeName employeeNumber date clockIn clockOut status workHours overtimeHours notes}}`;
const EMP_Q = `query($t:String!){hrEmployees(tenantId:$t,status:"active"){id firstName lastName employeeNumber departmentName}}`;

const statusConfig: Record<string, { color: string; bg: string; icon: string; label: string }> = {
    present: { color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: '✅', label: 'Present' },
    late: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: '⏰', label: 'Late' },
    absent: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: '❌', label: 'Absent' },
    half_day: { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: '🔵', label: 'Half Day' },
    remote: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', icon: '🏠', label: 'Remote' },
    leave: { color: '#06b6d4', bg: 'rgba(6,182,212,0.08)', icon: '🏖️', label: 'On Leave' },
};

// Calendar Heatmap Component
function CalendarHeatmap({ records, month }: { records: any[]; month: string }) {
    const startOfMonth = dayjs(month + '-01');
    const daysInMonth = startOfMonth.daysInMonth();
    const startDay = startOfMonth.day(); // 0=Sun
    const weeks = Math.ceil((daysInMonth + startDay) / 7);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const dateMap = useMemo(() => {
        const m = new Map<string, any[]>();
        records.forEach(r => {
            const key = r.date;
            if (!m.has(key)) m.set(key, []);
            m.get(key)!.push(r);
        });
        return m;
    }, [records]);

    return (
        <div style={{ overflowX: 'auto' }}>
            {/* Weekday headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                {weekDays.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#9ca3af', fontWeight: 600, padding: 2 }}>{d}</div>)}
            </div>
            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {/* Empty cells before month start */}
                {Array.from({ length: startDay }, (_, i) => <div key={`empty-${i}`} style={{ aspectRatio: '1', borderRadius: 8 }} />)}
                {/* Day cells */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = startOfMonth.date(day).format('YYYY-MM-DD');
                    const dayRecords = dateMap.get(dateStr) || [];
                    const isToday = dayjs().format('YYYY-MM-DD') === dateStr;
                    const isFuture = dayjs(dateStr).isAfter(dayjs());
                    const isWeekend = [0, 6].includes(startOfMonth.date(day).day());

                    // Determine dominant status
                    let bg = 'rgba(0,0,0,0.02)';
                    let borderColor = 'transparent';
                    if (dayRecords.length > 0) {
                        const present = dayRecords.filter(r => r.status === 'present').length;
                        const late = dayRecords.filter(r => r.status === 'late').length;
                        const absent = dayRecords.filter(r => r.status === 'absent').length;
                        if (absent > 0) { bg = statusConfig.absent.bg; borderColor = statusConfig.absent.color + '44'; }
                        else if (late > 0) { bg = statusConfig.late.bg; borderColor = statusConfig.late.color + '44'; }
                        else if (present > 0) { bg = statusConfig.present.bg; borderColor = statusConfig.present.color + '44'; }
                    }
                    if (isWeekend && dayRecords.length === 0) bg = 'rgba(0,0,0,0.03)';

                    return (
                        <Tooltip key={day} title={dayRecords.length > 0 ?
                            <div>{dayRecords.map((r, j) => <div key={j}>{r.employeeName}: {statusConfig[r.status]?.icon} {r.status} {r.workHours ? `(${r.workHours}h)` : ''}</div>)}</div>
                            : isFuture ? 'Future' : isWeekend ? 'Weekend' : 'No data'}>
                            <motion.div whileHover={{ scale: 1.1 }} style={{
                                aspectRatio: '1', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                background: isToday ? `linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))` : bg,
                                border: isToday ? '2px solid #3b82f6' : `1px solid ${borderColor}`,
                                opacity: isFuture ? 0.3 : 1, cursor: 'default', position: 'relative', minWidth: 44, minHeight: 44,
                            }}>
                                <Text style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? '#3b82f6' : isWeekend ? '#9ca3af' : undefined }}>{day}</Text>
                                {dayRecords.length > 0 && (
                                    <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                                        {dayRecords.slice(0, 3).map((r, j) => (
                                            <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: statusConfig[r.status]?.color || '#6b7280' }} />
                                        ))}
                                        {dayRecords.length > 3 && <Text style={{ fontSize: 7, color: '#9ca3af' }}>+{dayRecords.length - 3}</Text>}
                                    </div>
                                )}
                            </motion.div>
                        </Tooltip>
                    );
                })}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {Object.entries(statusConfig).filter(([k]) => ['present', 'late', 'absent'].includes(k)).map(([key, cfg]) => (
                    <Space key={key} size={4}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cfg.color }} /><Text style={{ fontSize: 11 }}>{cfg.label}</Text></Space>
                ))}
            </div>
        </div>
    );
}

// Employee attendance summary card
function EmployeeSummaryCard({ emp, records }: { emp: any; records: any[] }) {
    const empRecords = records.filter(r => r.employeeId === emp.id);
    const present = empRecords.filter(r => r.status === 'present').length;
    const late = empRecords.filter(r => r.status === 'late').length;
    const absent = empRecords.filter(r => r.status === 'absent').length;
    const totalHours = empRecords.reduce((s, r) => s + (r.workHours || 0), 0);
    const totalOT = empRecords.reduce((s, r) => s + (r.overtimeHours || 0), 0);
    const total = present + late + absent || 1;
    const attendancePct = Math.round(((present + late) / total) * 100);

    if (empRecords.length === 0) return null;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
            style={{ ...glass, padding: 14, borderRadius: 12, cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Avatar style={{ backgroundColor: attendancePct >= 90 ? '#10b981' : attendancePct >= 70 ? '#f59e0b' : '#ef4444', fontSize: 11 }}>{emp.firstName[0]}{emp.lastName[0]}</Avatar>
                <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 13, display: 'block' }}>{emp.firstName} {emp.lastName}</Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>{emp.departmentName}</Text>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <Text strong style={{ fontSize: 16, color: attendancePct >= 90 ? '#10b981' : '#f59e0b' }}>{attendancePct}%</Text>
                </div>
            </div>
            <Progress percent={attendancePct} showInfo={false} size="small" strokeColor={attendancePct >= 90 ? '#10b981' : attendancePct >= 70 ? '#f59e0b' : '#ef4444'} style={{ marginBottom: 8 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Space size={12}>
                    <Tooltip title="Present"><Text style={{ fontSize: 11 }}>✅ {present}</Text></Tooltip>
                    <Tooltip title="Late"><Text style={{ fontSize: 11 }}>⏰ {late}</Text></Tooltip>
                    <Tooltip title="Absent"><Text style={{ fontSize: 11 }}>❌ {absent}</Text></Tooltip>
                </Space>
                <Space size={8}>
                    <Tooltip title="Work Hours"><Text style={{ fontSize: 11, color: '#3b82f6' }}><FieldTimeOutlined /> {totalHours.toFixed(1)}h</Text></Tooltip>
                    {totalOT > 0 && <Tooltip title="Overtime"><Text style={{ fontSize: 11, color: '#f59e0b' }}><ThunderboltOutlined /> {totalOT.toFixed(1)}h</Text></Tooltip>}
                </Space>
            </div>
        </motion.div>
    );
}

export default function AttendancePage() {
    const [records, setRecords] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
    const [selectedEmployee, setSelectedEmployee] = useState<string | undefined>();
    const [viewMode, setViewMode] = useState<string>('calendar');
    const { themeColor } = usePreferencesStore();

    useEffect(() => {
        setLoading(true);
        Promise.all([
            gql(ATT_Q, { t: DEFAULT_TENANT_ID, m: month, e: selectedEmployee }).catch(() => ({ hrAttendance: [] })),
            gql(EMP_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrEmployees: [] })),
        ]).then(([a, e]) => { setRecords(a.hrAttendance || []); setEmployees(e.hrEmployees || []); })
            .finally(() => setLoading(false));
    }, [month, selectedEmployee]);

    const present = records.filter(r => r.status === 'present').length;
    const late = records.filter(r => r.status === 'late').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const totalHours = records.reduce((s, r) => s + (r.workHours || 0), 0);
    const totalOT = records.reduce((s, r) => s + (r.overtimeHours || 0), 0);
    const avgHours = records.length > 0 ? (totalHours / records.filter(r => r.workHours > 0).length).toFixed(1) : '—';

    // Unique employees with records
    const uniqueEmps = useMemo(() => {
        const ids = new Set(records.map(r => r.employeeId));
        return employees.filter(e => ids.has(e.id));
    }, [records, employees]);

    const columns = [
        { title: 'Employee', key: 'emp', render: (_: any, r: any) => <Space><Avatar size="small" style={{ backgroundColor: statusConfig[r.status]?.color || themeColor, fontSize: 10 }}>{r.employeeName?.split(' ').map((n: string) => n[0]).join('')}</Avatar><div><Text strong style={{ fontSize: 13 }}>{r.employeeName}</Text><br/><Text type="secondary" style={{ fontSize: 10 }}>{r.employeeNumber}</Text></div></Space> },
        { title: 'Date', dataIndex: 'date', key: 'date', render: (v: string) => <Text>{dayjs(v).format('ddd, MMM D')}</Text> },
        { title: 'Clock In', dataIndex: 'clockIn', key: 'in', render: (v: string) => v ? <Tag color="blue" style={{ borderRadius: 12 }}>{dayjs(v).format('HH:mm')}</Tag> : <Text type="secondary">—</Text> },
        { title: 'Clock Out', dataIndex: 'clockOut', key: 'out', render: (v: string) => v ? <Tag color="purple" style={{ borderRadius: 12 }}>{dayjs(v).format('HH:mm')}</Tag> : <Text type="secondary">—</Text> },
        { title: 'Hours', dataIndex: 'workHours', key: 'hrs', render: (v: number) => v ? <Text strong>{v}h</Text> : '—' },
        { title: 'Overtime', dataIndex: 'overtimeHours', key: 'ot', render: (v: number) => v && v > 0 ? <Tag color="orange" style={{ borderRadius: 12 }}><ThunderboltOutlined /> {v}h</Tag> : '—' },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={statusConfig[v]?.color} style={{ borderRadius: 20 }}>{statusConfig[v]?.icon} {statusConfig[v]?.label || v}</Tag> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#06b6d4', '#3b82f6', themeColor]} className="text-[22px] font-bold tracking-tight">Attendance</AuroraText>}
            subTitle={<DecryptedText text="Daily attendance tracking & work hours log" animateOn="view" revealDirection="start" speed={60} sequential />}
            extra={[<Segmented key="view" value={viewMode} onChange={(v: any) => setViewMode(v)} options={[{ label: <><AppstoreOutlined /> Calendar</>, value: 'calendar' }, { label: <><UnorderedListOutlined /> Table</>, value: 'table' }]} />]}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Stats Row */}
                <Row gutter={[12, 12]}>
                    <Col xs={24} sm={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #10b981' }}><Statistic title="Present" value={present} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#10b981', fontSize: 20 }} /></Card></Col>
                    <Col xs={24} sm={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #f59e0b' }}><Statistic title="Late" value={late} prefix={<ExclamationCircleOutlined />} valueStyle={{ color: '#f59e0b', fontSize: 20 }} /></Card></Col>
                    <Col xs={24} sm={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #ef4444' }}><Statistic title="Absent" value={absent} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#ef4444', fontSize: 20 }} /></Card></Col>
                    <Col xs={24} sm={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #3b82f6' }}><Statistic title="Total Hours" value={totalHours.toFixed(1)} suffix="h" valueStyle={{ color: '#3b82f6', fontSize: 20 }} /></Card></Col>
                    <Col xs={24} sm={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #f59e0b' }}><Statistic title="Overtime" value={totalOT.toFixed(1)} suffix="h" prefix={<ThunderboltOutlined />} valueStyle={{ color: '#f59e0b', fontSize: 20 }} /></Card></Col>
                    <Col xs={24} sm={4}><Card size="small" style={{ ...glass, borderTop: '3px solid #8b5cf6' }}><Statistic title="Avg Hours" value={avgHours} suffix="h" valueStyle={{ color: '#8b5cf6', fontSize: 20 }} /></Card></Col>
                </Row>

                {/* Filters */}
                <Card size="small" style={glass}>
                    <Space wrap>
                        <Select value={month} onChange={setMonth} style={{ width: 180 }}
                            options={Array.from({ length: 6 }, (_, i) => { const m = dayjs().subtract(i, 'month').format('YYYY-MM'); return { label: dayjs(m).format('MMMM YYYY'), value: m }; })} />
                        <Select placeholder="All Employees" allowClear value={selectedEmployee} onChange={setSelectedEmployee} style={{ width: 220 }} showSearch optionFilterProp="label"
                            options={employees.map(e => ({ label: `${e.firstName} ${e.lastName} (${e.employeeNumber})`, value: e.id }))} prefix={<UserOutlined />} />
                    </Space>
                </Card>

                {viewMode === 'calendar' ? (
                    <Row gutter={[16, 16]}>
                        {/* Calendar Heatmap */}
                        <Col xs={24} md={14}>
                            <Card style={glass} title={<Space><AppstoreOutlined /> <Text strong>Attendance Calendar — {dayjs(month).format('MMMM YYYY')}</Text></Space>}>
                                <CalendarHeatmap records={records} month={month} />
                            </Card>
                        </Col>
                        {/* Employee Summary Cards */}
                        <Col xs={24} md={10}>
                            <Card style={glass} title={<Space><UserOutlined /> <Text strong>Employee Summary</Text></Space>}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 450, overflowY: 'auto' }}>
                                    {uniqueEmps.map((emp, i) => <EmployeeSummaryCard key={emp.id} emp={emp} records={records} />)}
                                    {uniqueEmps.length === 0 && <Text type="secondary" style={{ textAlign: 'center', padding: 40 }}>No attendance data for this period</Text>}
                                </div>
                            </Card>
                        </Col>
                    </Row>
                ) : (
                    <Card style={glass}>
                        <Table dataSource={records} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} size="middle" />
                    </Card>
                )}
            </motion.div>
        </CMSLayout>
    );
}
