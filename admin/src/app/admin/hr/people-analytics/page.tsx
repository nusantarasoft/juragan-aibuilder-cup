"use client";
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Typography, Row, Col, Table, Tag, Spin } from "antd";
import {
  TeamOutlined, UserAddOutlined, FallOutlined, ClockCircleOutlined,
  CalendarOutlined, SolutionOutlined, RiseOutlined, ArrowUpOutlined,
  ArrowDownOutlined, MinusOutlined,
} from "@ant-design/icons";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  Treemap, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import dayjs from "dayjs";

const { Text } = Typography;
const glass = { background: "rgba(255,255,255,0.65)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.45)", borderRadius: 14 };
const glassDark = { background: "rgba(30,30,40,0.55)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 };
const anim = (i: number) => ({ initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.07, duration: 0.45 } });

const EMP_Q = `query($t:String!){hrEmployees(tenantId:$t){id firstName lastName email position departmentId employeeType status joinDate terminationDate salary gender dateOfBirth tags}}`;
const DEPT_Q = `query($t:String!){hrDepartments(tenantId:$t){id name}}`;
const STATS_Q = `query($t:String!){hrDashboardStats(tenantId:$t){totalEmployees activeEmployees avgTenure newHiresThisMonth turnoverRate departmentBreakdown genderDistribution avgAge openPositions upcomingBirthdays totalLeaveToday attendanceRateThisMonth trainingCompletion avgSalary totalPayrollThisMonth probationEnding performanceAvg}}`;

const DEPT_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899", "#06b6d4", "#ef4444", "#6366f1", "#14b8a6", "#a855f7"];
const TENURE_BUCKETS = [
  { key: "<6mo", label: "<6 months", max: 0.5, color: "#93c5fd" },
  { key: "6-12mo", label: "6-12 months", max: 1, color: "#60a5fa" },
  { key: "1-2yr", label: "1-2 years", max: 2, color: "#3b82f6" },
  { key: "2-5yr", label: "2-5 years", max: 5, color: "#2563eb" },
  { key: "5-10yr", label: "5-10 years", max: 10, color: "#1d4ed8" },
  { key: "10yr+", label: "10+ years", max: Infinity, color: "#1e3a8a" },
];
const AGE_BUCKETS = [
  { key: "18-25", min: 18, max: 25, color: "#a5b4fc" },
  { key: "26-30", min: 26, max: 30, color: "#818cf8" },
  { key: "31-35", min: 31, max: 35, color: "#6366f1" },
  { key: "36-40", min: 36, max: 40, color: "#4f46e5" },
  { key: "41-50", min: 41, max: 50, color: "#4338ca" },
  { key: "50+", min: 51, max: 200, color: "#3730a3" },
];
const SALARY_BUCKETS = [
  { key: "<5M", max: 5e6, color: "#86efac" },
  { key: "5-10M", max: 10e6, color: "#4ade80" },
  { key: "10-20M", max: 20e6, color: "#22c55e" },
  { key: "20-40M", max: 40e6, color: "#16a34a" },
  { key: "40-60M", max: 60e6, color: "#15803d" },
  { key: "60M+", max: Infinity, color: "#166534" },
];

const TreemapContent = (props: any) => {
  const { x, y, width, height, name, value, color } = props;
  if (width < 40 || height < 30) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={6} fill={color} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
      <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={width < 80 ? 9 : 11} fontWeight={600}>{name}</text>
      <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={width < 80 ? 8 : 10}>{value}</text>
    </g>
  );
};

export default function PeopleAnalyticsPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const { themeColor } = usePreferencesStore();

  useEffect(() => {
    Promise.all([
      gql(EMP_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrEmployees: [] })),
      gql(DEPT_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrDepartments: [] })),
      gql(STATS_Q, { t: DEFAULT_TENANT_ID }).catch(() => ({ hrDashboardStats: {} })),
    ]).then(([e, d, s]) => {
      setEmployees(e.hrEmployees || []);
      setDepartments(d.hrDepartments || []);
      setStats(s.hrDashboardStats || {});
    }).finally(() => setLoading(false));
  }, []);

  const active = useMemo(() => employees.filter(e => e.status === "active"), [employees]);
  const totalActive = active.length || 1;
  const deptMap = useMemo(() => Object.fromEntries(departments.map(d => [d.id, d.name])), [departments]);

  // ── KPI values ──
  const kpiCards = useMemo(() => {
    const avgTenure = stats.avgTenure ?? (() => {
      if (!active.length) return 0;
      const sum = active.reduce((s: number, e: any) => s + dayjs().diff(dayjs(e.joinDate), "month"), 0);
      return +(sum / active.length / 12).toFixed(1);
    })();
    const avgAge = stats.avgAge ?? (() => {
      const withDob = active.filter((e: any) => e.dateOfBirth);
      if (!withDob.length) return 0;
      return Math.round(withDob.reduce((s: number, e: any) => s + dayjs().diff(dayjs(e.dateOfBirth), "year"), 0) / withDob.length);
    })();
    return [
      { label: "Headcount", value: stats.activeEmployees ?? active.length, icon: <TeamOutlined />, color: "#3b82f6", trend: "up" },
      { label: "New Hires", value: stats.newHiresThisMonth ?? active.filter((e: any) => dayjs(e.joinDate).isSame(dayjs(), "month")).length, icon: <UserAddOutlined />, color: "#10b981", suffix: "/mo", trend: "up" },
      { label: "Turnover Rate", value: `${stats.turnoverRate ?? (() => { const t = employees.filter(e => e.terminationDate && dayjs(e.terminationDate).isAfter(dayjs().subtract(12, "month"))); return employees.length ? +((t.length / employees.length) * 100).toFixed(1) : 0; })()}%`, icon: <FallOutlined />, color: "#ef4444", trend: "down" },
      { label: "Avg Tenure", value: `${avgTenure} yr`, icon: <ClockCircleOutlined />, color: "#8b5cf6", trend: "neutral" },
      { label: "Avg Age", value: avgAge, icon: <CalendarOutlined />, color: "#f59e0b", trend: "neutral" },
      { label: "Open Positions", value: stats.openPositions ?? 0, icon: <SolutionOutlined />, color: "#06b6d4", trend: "neutral" },
    ];
  }, [stats, active, employees]);

  // ── 1. Headcount Trend (12 months) ──
  const headcountTrend = useMemo(() => {
    const data: { month: string; hires: number; departures: number; net: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const m = dayjs().subtract(i, "month");
      const key = m.format("YYYY-MM");
      const label = m.format("MMM");
      const hires = employees.filter(e => dayjs(e.joinDate).format("YYYY-MM") === key).length;
      const departures = employees.filter(e => e.terminationDate && dayjs(e.terminationDate).format("YYYY-MM") === key).length;
      data.push({ month: label, hires, departures, net: hires - departures });
    }
    return data;
  }, [employees]);

  // ── 2. Department Distribution (Treemap) ──
  const deptTreemap = useMemo(() => {
    return departments.map((d, i) => {
      const count = active.filter(e => e.departmentId === d.id).length;
      return { name: d.name, value: count, color: DEPT_COLORS[i % DEPT_COLORS.length] };
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [departments, active]);

  // ── 3. Tenure Distribution ──
  const tenureData = useMemo(() => {
    let prevMax = 0;
    return TENURE_BUCKETS.map(b => {
      const count = active.filter(e => {
        const yrs = dayjs().diff(dayjs(e.joinDate), "month") / 12;
        return yrs >= prevMax && yrs < b.max;
      }).length;
      prevMax = b.max;
      return { name: b.key, label: b.label, count, color: b.color };
    });
  }, [active]);

  // ── 4. Gender Diversity ──
  const genderData = useMemo(() => {
    const m = active.filter(e => e.gender?.toLowerCase() === "male").length;
    const f = active.filter(e => e.gender?.toLowerCase() === "female").length;
    const o = active.length - m - f;
    return [
      { name: "Male", value: m, color: "#3b82f6" },
      { name: "Female", value: f, color: "#ec4899" },
      ...(o > 0 ? [{ name: "Other", value: o, color: "#8b5cf6" }] : []),
    ];
  }, [active]);

  // ── 5. Age Distribution ──
  const ageData = useMemo(() => {
    return AGE_BUCKETS.map(b => ({
      name: b.key,
      count: active.filter(e => {
        if (!e.dateOfBirth) return false;
        const age = dayjs().diff(dayjs(e.dateOfBirth), "year");
        return age >= b.min && age <= b.max;
      }).length,
      color: b.color,
    }));
  }, [active]);

  // ── 6. Employment Type ──
  const empTypeData = useMemo(() => {
    const types: Record<string, number> = {};
    active.forEach(e => { const t = e.employeeType || "Full-time"; types[t] = (types[t] || 0) + 1; });
    const colors: Record<string, string> = { "Full-time": "#3b82f6", "Part-time": "#f59e0b", Contract: "#8b5cf6", Intern: "#10b981" };
    return Object.entries(types).map(([name, value]) => ({ name, value, color: colors[name] || "#6b7280" }));
  }, [active]);

  // ── 7. Monthly Turnover Trend ──
  const turnoverTrend = useMemo(() => {
    const data: { month: string; rate: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const m = dayjs().subtract(i, "month");
      const key = m.format("YYYY-MM");
      const terminated = employees.filter(e => e.terminationDate && dayjs(e.terminationDate).format("YYYY-MM") === key).length;
      const total = employees.filter(e => dayjs(e.joinDate).isBefore(m.endOf("month"))).length || 1;
      data.push({ month: m.format("MMM"), rate: +((terminated / total) * 100).toFixed(1) });
    }
    return data;
  }, [employees]);

  // ── 8. Salary Distribution ──
  const salaryData = useMemo(() => {
    let prevMax = 0;
    return SALARY_BUCKETS.map(b => {
      const count = active.filter(e => {
        const s = Number(e.salary) || 0;
        return s >= prevMax && s < b.max;
      }).length;
      prevMax = b.max;
      return { name: b.key, count, color: b.color };
    });
  }, [active]);

  const avgSalaryLine = useMemo(() => {
    if (!active.length) return 0;
    return Math.round(active.reduce((s, e) => s + (Number(e.salary) || 0), 0) / active.length);
  }, [active]);

  // ── 9. Department Comparison Table ──
  const deptComparison = useMemo(() => {
    return departments.map((d, i) => {
      const deptEmps = active.filter(e => e.departmentId === d.id);
      const count = deptEmps.length;
      if (count === 0) return null;
      const avgTenure = +(deptEmps.reduce((s: number, e: any) => s + dayjs().diff(dayjs(e.joinDate), "month"), 0) / count / 12).toFixed(1);
      const avgSalary = Math.round(deptEmps.reduce((s: number, e: any) => s + (Number(e.salary) || 0), 0) / count);
      const males = deptEmps.filter(e => e.gender?.toLowerCase() === "male").length;
      const terminated = employees.filter(e => e.departmentId === d.id && e.terminationDate && dayjs(e.terminationDate).isAfter(dayjs().subtract(12, "month"))).length;
      const turnover = +((terminated / (count + terminated || 1)) * 100).toFixed(1);
      return { key: d.id, department: d.name, headcount: count, avgTenure, avgSalary, genderRatio: `${males}:${count - males}`, turnover, color: DEPT_COLORS[i % DEPT_COLORS.length] };
    }).filter(Boolean) as any[];
  }, [departments, active, employees]);

  const fmt = (v: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
  const trendIcon = (t: string) => t === "up" ? <ArrowUpOutlined style={{ color: "#10b981", fontSize: 10 }} /> : t === "down" ? <ArrowDownOutlined style={{ color: "#ef4444", fontSize: 10 }} /> : <MinusOutlined style={{ color: "#9ca3af", fontSize: 10 }} />;

  if (loading) return <CMSLayout title="People Analytics"><div style={{ display: "flex", justifyContent: "center", padding: 120 }}><Spin size="large" /></div></CMSLayout>;

  const tableColumns = [
    { title: "Department", dataIndex: "department", sorter: (a: any, b: any) => a.department.localeCompare(b.department),
      render: (v: string, r: any) => <Text strong style={{ color: r.color }}>{v}</Text> },
    { title: "Headcount", dataIndex: "headcount", sorter: (a: any, b: any) => a.headcount - b.headcount,
      render: (v: number, r: any) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text strong>{v}</Text>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#f3f4f6", overflow: "hidden" }}>
            <div style={{ width: `${(v / Math.max(...deptComparison.map((d: any) => d.headcount), 1)) * 100}%`, height: "100%", borderRadius: 2, background: r.color }} />
          </div>
        </div>
      ),
    },
    { title: "Avg Tenure", dataIndex: "avgTenure", sorter: (a: any, b: any) => a.avgTenure - b.avgTenure, render: (v: number) => `${v} yr` },
    { title: "Avg Salary", dataIndex: "avgSalary", sorter: (a: any, b: any) => a.avgSalary - b.avgSalary, render: (v: number) => fmt(v) },
    { title: "M:F Ratio", dataIndex: "genderRatio" },
    { title: "Turnover", dataIndex: "turnover", sorter: (a: any, b: any) => a.turnover - b.turnover,
      render: (v: number) => <Tag color={v > 15 ? "red" : v > 10 ? "orange" : "green"}>{v}%</Tag> },
  ];

  const LABEL = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return percent > 0.04 ? <text x={x} y={y} fill="#888" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11}>{name} {(percent * 100).toFixed(0)}%</text> : null;
  };

  return (
    <CMSLayout
      title={<AuroraText colors={[themeColor, "#3b82f6", "#8b5cf6", themeColor]} className="text-[22px] font-bold tracking-tight">People Analytics</AuroraText>}
      subTitle={<DecryptedText text="Advanced workforce insights & organizational intelligence" animateOn="view" revealDirection="start" speed={60} sequential />}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* ── KPI Cards ── */}
        <Row gutter={[12, 12]}>
          {kpiCards.map((c, i) => (
            <Col xs={12} md={4} key={i}>
              <motion.div {...anim(i)}>
                <Card size="small" style={{ ...glass, textAlign: "center", borderTop: `3px solid ${c.color}` }} hoverable>
                  <div style={{ color: c.color, fontSize: 20, marginBottom: 2 }}>{c.icon}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <Text strong style={{ fontSize: 22, color: c.color }}>{c.value}</Text>
                    {trendIcon(c.trend)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{c.label}</Text>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>

        {/* ── Row 1: Headcount Trend + Department Treemap ── */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <motion.div {...anim(6)}>
              <Card title={<><RiseOutlined /> Headcount Trend (12 months)</>} size="small" style={{ ...glass, height: "100%" }}>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={headcountTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <RTooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="hires" name="Hires" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="departures" name="Departures" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
                    <Area type="monotone" dataKey="net" name="Net Change" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.08} strokeWidth={2} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} md={12}>
            <motion.div {...anim(7)}>
              <Card title={<><TeamOutlined /> Department Distribution</>} size="small" style={{ ...glass, height: "100%" }}>
                <ResponsiveContainer width="100%" height={220}>
                  <Treemap data={deptTreemap} dataKey="value" nameKey="name" content={<TreemapContent />}>
                    {deptTreemap.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Treemap>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* ── Row 2: Tenure + Gender Diversity ── */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <motion.div {...anim(8)}>
              <Card title={<><ClockCircleOutlined /> Tenure Distribution</>} size="small" style={{ ...glass, height: "100%" }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={tenureData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <RTooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: any, n: any, p: any) => [`${v} employees`, p.payload.label]} />
                    <Bar dataKey="count" name="Employees" radius={[6, 6, 0, 0]}>
                      {tenureData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} md={12}>
            <motion.div {...anim(9)}>
              <Card title={<><TeamOutlined /> Gender Diversity</>} size="small" style={{ ...glass, height: "100%" }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" label={LABEL}>
                      {genderData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                    </Pie>
                    <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fontSize={22} fontWeight={700} fill="#6b7280">{active.length}</text>
                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#9ca3af">Total</text>
                    <RTooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* ── Row 3: Age + Employment Type ── */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <motion.div {...anim(10)}>
              <Card title={<><CalendarOutlined /> Age Distribution</>} size="small" style={{ ...glass, height: "100%" }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ageData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <RTooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: any) => [`${v} employees`, "Count"]} />
                    <Bar dataKey="count" name="Employees" radius={[6, 6, 0, 0]}>
                      {ageData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} md={12}>
            <motion.div {...anim(11)}>
              <Card title={<><TeamOutlined /> Employment Type</>} size="small" style={{ ...glass, height: "100%" }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={empTypeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={LABEL}>
                      {empTypeData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                    </Pie>
                    <RTooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* ── Row 4: Turnover Trend + Salary Distribution ── */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <motion.div {...anim(12)}>
              <Card title={<><FallOutlined /> Monthly Turnover Trend</>} size="small" style={{ ...glass, height: "100%" }}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={turnoverTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit="%" />
                    <RTooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Turnover Rate"]} />
                    <ReferenceLine y={15} stroke="#f59e0b" strokeDasharray="6 4" label={{ value: "Industry Avg 15%", position: "insideTopRight", fontSize: 9, fill: "#f59e0b" }} />
                    <Line type="monotone" dataKey="rate" name="Turnover %" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: "#ef4444" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} md={12}>
            <motion.div {...anim(13)}>
              <Card title={<><SolutionOutlined /> Salary Distribution</>} size="small" style={{ ...glass, height: "100%" }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={salaryData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <RTooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: any) => [`${v} employees`, "Count"]} />
                    <Bar dataKey="count" name="Employees" radius={[6, 6, 0, 0]}>
                      {salaryData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                    {avgSalaryLine > 0 && <ReferenceLine y={0} stroke="transparent" label={{ value: `Avg: ${fmt(avgSalaryLine)}`, position: "insideTopRight", fontSize: 9, fill: "#10b981" }} />}
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* ── Department Comparison Table ── */}
        <motion.div {...anim(14)}>
          <Card title={<><TeamOutlined /> Department Comparison</>} size="small" style={glass}>
            <Table
              dataSource={deptComparison}
              columns={tableColumns}
              size="small"
              pagination={false}
              scroll={{ x: 700 }}
              rowClassName={() => "people-analytics-row"}
            />
          </Card>
        </motion.div>
      </motion.div>
    </CMSLayout>
  );
}
