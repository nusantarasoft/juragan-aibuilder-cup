"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Tag, Typography, Row, Col, Statistic, Select, Space, Avatar, Tooltip, Input, theme } from "antd";
import { CalendarOutlined, TeamOutlined, ClockCircleOutlined, FieldTimeOutlined, LeftOutlined, RightOutlined, SearchOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const glassDark = { background: 'rgba(30,30,40,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 };

const LEAVE_COLORS: Record<string, string> = { Annual: '#10b981', Sick: '#ef4444', Personal: '#3b82f6', WFH: '#8b5cf6', Maternity: '#ec4899', Paternity: '#06b6d4', Unpaid: '#6b7280' };
const LEAVE_TYPES_LIST = Object.entries(LEAVE_COLORS);

const HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': 'New Year', '2026-02-17': 'Chinese New Year', '2026-03-19': 'Nyepi',
  '2026-03-20': 'Hari Raya Idul Fitri', '2026-03-21': 'Hari Raya Idul Fitri',
  '2026-05-01': 'Labor Day', '2026-05-16': 'Vesak Day', '2026-06-01': 'Pancasila Day',
  '2026-05-27': 'Idul Adha', '2026-06-17': 'Islamic New Year', '2026-08-17': 'Independence Day',
  '2026-08-27': 'Mawlid Nabi', '2026-12-25': 'Christmas',
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonday(d: dayjs.Dayjs) { const day = d.day(); return d.subtract(day === 0 ? 6 : day - 1, 'day'); }
function initials(f: string, l: string) { return `${(f || '')[0] || ''}${(l || '')[0] || ''}`.toUpperCase(); }
function leaveColor(name?: string) { if (!name) return '#6b7280'; const key = Object.keys(LEAVE_COLORS).find(k => (name || '').toLowerCase().includes(k.toLowerCase())); return key ? LEAVE_COLORS[key] : '#6b7280'; }

function isInRange(date: string, start: string, end: string) { return date >= start && date <= end; }

export default function TeamCalendarPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(dayjs().startOf('month'));
  const [deptFilter, setDeptFilter] = useState<string | undefined>();
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const { themeColor } = usePreferencesStore();
  const { token: antToken } = theme.useToken();
  const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
  const g = isDark ? glassDark : glass;

  useEffect(() => {
    setLoading(true);
    const mo = month.format('YYYY-MM');
    Promise.all([
      gql(`query($t:String!){hrEmployees(tenantId:$t){id firstName lastName position departmentId status profilePicture}}`, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrEmployees: [] })),
      gql(`query($t:String!){hrLeaveRequests(tenantId:$t){id employeeId leaveTypeId startDate endDate totalDays status reason employee{firstName lastName} leaveType{name color}}}`, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrLeaveRequests: [] })),
      gql(`query($t:String!,$m:String){hrAttendance(tenantId:$t,month:$m){id employeeId date clockIn clockOut status workHours overtimeHours}}`, { t: DEFAULT_TENANT_ID, m: mo }).catch(() => ({ hrAttendance: [] })),
      gql(`query($t:String!){hrDepartments(tenantId:$t){id name}}`, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrDepartments: [] })),
    ]).then(([e, l, a, d]) => {
      setEmployees(e.hrEmployees || []); setLeaveRequests(l.hrLeaveRequests || []);
      setAttendance(a.hrAttendance || []); setDepartments(d.hrDepartments || []);
    }).finally(() => setLoading(false));
  }, [month]);

  // Filtered employees
  const filteredEmps = useMemo(() => employees.filter(e => {
    if (e.status && e.status !== 'active') return false;
    if (deptFilter && e.departmentId !== deptFilter) return false;
    if (search && !`${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [employees, deptFilter, search]);

  const approvedLeaves = useMemo(() => leaveRequests.filter(l => l.status === 'approved'), [leaveRequests]);

  // Build calendar grid
  const daysInMonth = month.daysInMonth();
  const firstDay = month.day(); // 0=Sun
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon-based offset
  const totalCells = Math.ceil((daysInMonth + startOffset) / 7) * 7;
  const today = dayjs().format('YYYY-MM-DD');

  // Leave map: date -> leaves[]
  const leaveMap = useMemo(() => {
    const m = new Map<string, any[]>();
    approvedLeaves.forEach(l => {
      const sd = dayjs(l.startDate), ed = dayjs(l.endDate);
      let cur = sd;
      while (cur.isBefore(ed) || cur.isSame(ed, 'day')) {
        const key = cur.format('YYYY-MM-DD');
        if (!m.has(key)) m.set(key, []);
        const emp = filteredEmps.find(e => e.id === l.employeeId);
        if (emp && !hiddenTypes.has(l.leaveType?.name || '')) {
          m.get(key)!.push({ ...l, empName: `${emp.firstName} ${emp.lastName}`, empInitials: initials(emp.firstName, emp.lastName) });
        }
        cur = cur.add(1, 'day');
      }
    });
    return m;
  }, [approvedLeaves, filteredEmps, hiddenTypes]);

  // Attendance map: date -> { present, absent, late }
  const attMap = useMemo(() => {
    const m = new Map<string, { present: number; absent: number; late: number }>();
    attendance.forEach(a => {
      if (!m.has(a.date)) m.set(a.date, { present: 0, absent: 0, late: 0 });
      const entry = m.get(a.date)!;
      if (a.status === 'present') entry.present++;
      else if (a.status === 'absent') entry.absent++;
      else if (a.status === 'late') { entry.present++; entry.late++; }
    });
    return m;
  }, [attendance]);

  // Who's Out computation
  const whosOut = useMemo(() => {
    const todayD = dayjs();
    const tmrw = todayD.add(1, 'day').format('YYYY-MM-DD');
    const weekEnd = todayD.endOf('week').format('YYYY-MM-DD');
    const nextWeekEnd = todayD.add(1, 'week').endOf('week').format('YYYY-MM-DD');
    const groups: Record<string, any[]> = { Today: [], Tomorrow: [], 'This Week': [], 'Next Week': [] };
    approvedLeaves.forEach(l => {
      const emp = employees.find(e => e.id === l.employeeId);
      if (!emp) return;
      const entry = { ...l, empName: `${emp.firstName} ${emp.lastName}`, empInitials: initials(emp.firstName, emp.lastName) };
      if (isInRange(today, l.startDate, l.endDate)) groups.Today.push(entry);
      else if (isInRange(tmrw, l.startDate, l.endDate)) groups.Tomorrow.push(entry);
      else if (l.startDate <= weekEnd && l.endDate >= todayD.format('YYYY-MM-DD') && !isInRange(today, l.startDate, l.endDate)) groups['This Week'].push(entry);
      else if (l.startDate <= nextWeekEnd && l.startDate > weekEnd) groups['Next Week'].push(entry);
    });
    return groups;
  }, [approvedLeaves, employees]);

  // Stats
  const teamSize = filteredEmps.length;
  const onLeaveToday = (leaveMap.get(today) || []).length;
  const totalAttDays = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const totalRecords = attendance.length || 1;
  const attRate = Math.round((totalAttDays / totalRecords) * 100);
  const avgHours = attendance.length > 0 ? (attendance.reduce((s, a) => s + (a.workHours || 0), 0) / attendance.filter(a => a.workHours > 0).length || 0).toFixed(1) : '—';

  // Heatmap data: top 15 employees
  const heatmapEmps = useMemo(() => {
    const empIds = [...new Set(attendance.map(a => a.employeeId))].slice(0, 15);
    return empIds.map(id => {
      const emp = employees.find(e => e.id === id);
      const name = emp ? `${emp.firstName} ${emp.lastName}` : id.slice(0, 8);
      const days: Record<number, any> = {};
      attendance.filter(a => a.employeeId === id).forEach(a => {
        const d = dayjs(a.date).date();
        days[d] = a;
      });
      return { id, name, days };
    });
  }, [attendance, employees]);

  const heatCellColor = (status?: string, isWeekend?: boolean) => {
    if (!status) return isWeekend ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)') : 'transparent';
    if (status === 'present') return 'rgba(16,185,129,0.55)';
    if (status === 'absent') return 'rgba(239,68,68,0.55)';
    if (status === 'late') return 'rgba(245,158,11,0.55)';
    if (status === 'remote' || status === 'wfh') return 'rgba(59,130,246,0.55)';
    return isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  };

  const statsCards = [
    { title: 'Team Size', value: teamSize, icon: <TeamOutlined />, color: '#3b82f6' },
    { title: 'On Leave Today', value: onLeaveToday, icon: <CalendarOutlined />, color: '#ef4444' },
    { title: 'Attendance Rate', value: `${attRate}%`, icon: <ClockCircleOutlined />, color: '#10b981' },
    { title: 'Avg Work Hours', value: avgHours, icon: <FieldTimeOutlined />, color: '#8b5cf6', suffix: 'h' },
  ];

  return (
    <CMSLayout
      title={<AuroraText colors={[themeColor, '#3b82f6', '#10b981', themeColor]} className="text-[22px] font-bold tracking-tight">Team Calendar</AuroraText>}
      subTitle={<DecryptedText text="Who's in, who's out — team leave & attendance at a glance" animateOn="view" revealDirection="start" speed={60} sequential />}
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Stats */}
        <Row gutter={[12, 12]}>
          {statsCards.map((s, i) => (
            <Col key={i} xs={12} sm={6}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card size="small" style={{ ...g, borderTop: `3px solid ${s.color}` }}>
                  <Statistic title={s.title} value={s.value} prefix={s.icon} suffix={s.suffix} valueStyle={{ color: s.color, fontSize: 20 }} />
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>

        {/* Filters */}
        <Card size="small" style={g} bodyStyle={{ padding: '10px 16px' }}>
          <Space wrap>
            <Select placeholder="All Departments" allowClear style={{ width: 180 }} value={deptFilter} onChange={setDeptFilter}
              options={departments.map(d => ({ label: d.name, value: d.id }))} />
            <Select placeholder="All Leave Types" allowClear style={{ width: 160 }} value={leaveTypeFilter} onChange={setLeaveTypeFilter}
              options={LEAVE_TYPES_LIST.map(([k]) => ({ label: k, value: k }))} />
            <Input prefix={<SearchOutlined />} placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} allowClear />
          </Space>
        </Card>

        {/* Calendar + Who's Out */}
        <Row gutter={[16, 16]}>
          {/* Monthly Calendar Grid */}
          <Col xs={24} lg={17}>
            <Card size="small" style={g}
              title={<Space><CalendarOutlined /> <Text strong>{month.format('MMMM YYYY')}</Text></Space>}
              extra={
                <Space>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setMonth(m => m.subtract(1, 'month'))}
                    style={{ background: 'none', border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: isDark ? '#ccc' : '#333' }}><LeftOutlined /></motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setMonth(dayjs().startOf('month'))}
                    style={{ background: themeColor, border: 'none', borderRadius: 8, padding: '4px 14px', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600 }}>Today</motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setMonth(m => m.add(1, 'month'))}
                    style={{ background: 'none', border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: isDark ? '#ccc' : '#333' }}><RightOutlined /></motion.button>
                </Space>
              }>
              {/* Weekday headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
                {WEEKDAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: isDark ? '#9ca3af' : '#6b7280', padding: 4 }}>{d}</div>)}
              </div>
              {/* Day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {Array.from({ length: totalCells }, (_, i) => {
                  const dayNum = i - startOffset + 1;
                  const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                  if (!isValid) return <div key={i} style={{ minHeight: 72 }} />;
                  const dateStr = month.date(dayNum).format('YYYY-MM-DD');
                  const dayOfWeek = month.date(dayNum).day();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const isToday = dateStr === today;
                  const holiday = HOLIDAYS_2026[dateStr];
                  const dayLeaves = leaveMap.get(dateStr) || [];
                  const dayAtt = attMap.get(dateStr);

                  return (
                    <Tooltip key={i} title={holiday ? `🇮🇩 ${holiday}` : dayLeaves.length > 0 ? dayLeaves.map(l => `${l.empName} — ${l.leaveType?.name || 'Leave'}`).join('\n') : undefined}>
                      <div style={{
                        minHeight: 72, borderRadius: 10, padding: '4px 6px', position: 'relative', cursor: 'default',
                        background: holiday ? (isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)') : isWeekend ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)'),
                        border: isToday ? `2px solid ${themeColor}` : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                        opacity: isWeekend && !holiday ? 0.7 : 1,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? themeColor : holiday ? '#ef4444' : isDark ? '#d1d5db' : '#374151' }}>{dayNum}</Text>
                          {holiday && <Text style={{ fontSize: 8, color: '#ef4444', fontWeight: 600, maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🇮🇩</Text>}
                        </div>
                        {/* Leave bars */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                          {dayLeaves.slice(0, 3).map((l, j) => (
                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 3, background: `${leaveColor(l.leaveType?.name)}22`, borderRadius: 4, padding: '1px 4px' }}>
                              <div style={{ width: 4, height: 4, borderRadius: '50%', background: leaveColor(l.leaveType?.name), flexShrink: 0 }} />
                              <Text style={{ fontSize: 8, fontWeight: 600, color: leaveColor(l.leaveType?.name), lineHeight: 1.2 }}>{l.empInitials}</Text>
                            </div>
                          ))}
                          {dayLeaves.length > 3 && <Text style={{ fontSize: 8, color: '#9ca3af' }}>+{dayLeaves.length - 3} more</Text>}
                        </div>
                        {/* Attendance summary */}
                        {dayAtt && !isWeekend && (
                          <div style={{ position: 'absolute', bottom: 3, right: 5, display: 'flex', gap: 3 }}>
                            <Text style={{ fontSize: 7, color: '#10b981' }}>{dayAtt.present}✓</Text>
                            {dayAtt.absent > 0 && <Text style={{ fontSize: 7, color: '#ef4444' }}>{dayAtt.absent}✗</Text>}
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            </Card>
          </Col>

          {/* Who's Out Panel */}
          <Col xs={24} lg={7}>
            <Card size="small" style={{ ...g, height: '100%' }} title={<Space>🏖️ <Text strong style={{ fontSize: 13 }}>Who's Out</Text></Space>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 480, overflowY: 'auto' }}>
                {Object.entries(whosOut).map(([group, items]) => items.length > 0 && (
                  <div key={group}>
                    <Text strong style={{ fontSize: 11, color: isDark ? '#9ca3af' : '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>{group}</Text>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                      {items.map((item, j) => (
                        <motion.div key={j} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: j * 0.05 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                          <Avatar size={28} style={{ backgroundColor: leaveColor(item.leaveType?.name), fontSize: 10, flexShrink: 0 }}>{item.empInitials}</Avatar>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Text strong style={{ fontSize: 12, display: 'block' }}>{item.empName}</Text>
                            <Text style={{ fontSize: 9, color: '#9ca3af' }}>{dayjs(item.startDate).format('MMM D')} — {dayjs(item.endDate).format('MMM D')}</Text>
                          </div>
                          <Tag style={{ borderRadius: 10, fontSize: 9, margin: 0, border: 'none', background: `${leaveColor(item.leaveType?.name)}22`, color: leaveColor(item.leaveType?.name) }}>
                            {item.leaveType?.name || 'Leave'}
                          </Tag>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.values(whosOut).every(v => v.length === 0) && (
                  <Text type="secondary" style={{ textAlign: 'center', padding: 30, fontSize: 12 }}>🎉 Everyone's in! No upcoming leaves.</Text>
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Leave Type Legend */}
        <Card size="small" style={g} bodyStyle={{ padding: '8px 16px' }}>
          <Space wrap size={[12, 6]}>
            <Text strong style={{ fontSize: 11, marginRight: 4 }}>Leave Types:</Text>
            {LEAVE_TYPES_LIST.map(([name, color]) => (
              <motion.div key={name} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setHiddenTypes(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; })}
                style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', opacity: hiddenTypes.has(name) ? 0.35 : 1, padding: '2px 8px', borderRadius: 8, background: `${color}11`, transition: 'opacity 0.2s' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                <Text style={{ fontSize: 11, fontWeight: 500, color }}>{name}</Text>
              </motion.div>
            ))}
          </Space>
        </Card>

        {/* Attendance Heatmap */}
        {heatmapEmps.length > 0 && (
          <Card size="small" style={g} title={<Space><ClockCircleOutlined /> <Text strong style={{ fontSize: 13 }}>Attendance Heatmap — {month.format('MMMM YYYY')}</Text></Space>}>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `100px repeat(${daysInMonth}, 1fr)`, gap: 2, minWidth: daysInMonth * 22 + 100 }}>
                {/* Header row */}
                <div />
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const d = month.date(i + 1);
                  const isW = d.day() === 0 || d.day() === 6;
                  return <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, color: isW ? '#9ca3af' : (isDark ? '#d1d5db' : '#374151'), padding: 2 }}>{i + 1}</div>;
                })}
                {/* Employee rows */}
                {heatmapEmps.map((emp, ei) => (
                  <React.Fragment key={emp.id}>
                    <div style={{ fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', paddingRight: 6, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: isDark ? '#d1d5db' : '#374151' }}>
                      {emp.name.length > 14 ? emp.name.slice(0, 14) + '…' : emp.name}
                    </div>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const d = month.date(i + 1);
                      const isW = d.day() === 0 || d.day() === 6;
                      const isH = !!HOLIDAYS_2026[d.format('YYYY-MM-DD')];
                      const rec = emp.days[i + 1];
                      const bg = isH ? 'rgba(239,68,68,0.15)' : heatCellColor(rec?.status, isW);
                      const clockIn = rec?.clockIn ? dayjs(rec.clockIn).format('HH:mm') : '—';
                      const clockOut = rec?.clockOut ? dayjs(rec.clockOut).format('HH:mm') : '—';
                      return (
                        <Tooltip key={i} title={`${emp.name} — ${d.format('MMM D')}: ${isH ? '🇮🇩 Holiday' : rec ? `In ${clockIn}, Out ${clockOut}, ${rec.workHours || 0}h` : isW ? 'Weekend' : 'No data'}`}>
                          <motion.div whileHover={{ scale: 1.3 }} style={{ aspectRatio: '1', borderRadius: 3, background: bg, border: d.format('YYYY-MM-DD') === today ? `1.5px solid ${themeColor}` : 'none', cursor: 'default', transition: 'background 0.2s' }} />
                        </Tooltip>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
              {/* Heatmap legend */}
              <div style={{ display: 'flex', gap: 14, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {[['Present', 'rgba(16,185,129,0.55)'], ['Absent', 'rgba(239,68,68,0.55)'], ['Late', 'rgba(245,158,11,0.55)'], ['WFH', 'rgba(59,130,246,0.55)'], ['Weekend/Holiday', isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)']].map(([label, c]) => (
                  <Space key={label as string} size={4}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: c as string }} />
                    <Text style={{ fontSize: 10 }}>{label}</Text>
                  </Space>
                ))}
              </div>
            </div>
          </Card>
        )}
      </motion.div>
    </CMSLayout>
  );
}
