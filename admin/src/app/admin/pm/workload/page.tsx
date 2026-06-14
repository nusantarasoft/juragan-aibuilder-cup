"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import { Alert, Avatar, Badge, Button, Card, Col, Divider, Empty, Input, Progress, Row, Segmented, Select, Space, Spin, Statistic, Table, Tag, Tooltip, Typography } from "antd";
import {
    TeamOutlined, ClockCircleOutlined, WarningOutlined,
    UnorderedListOutlined, AppstoreOutlined, SearchOutlined,
    ExclamationCircleOutlined, FireOutlined, UserOutlined,
    CheckCircleOutlined, SyncOutlined, PauseCircleOutlined,
    ProjectOutlined, FileExcelOutlined, FilePdfOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, ReferenceLine, Cell, Legend, PieChart, Pie, AreaChart, Area } from "recharts";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import RbacGuard from "@/components/common/RbacGuard";
import { message } from "antd";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const { Text } = Typography;

const GET_TASKS = `
  query($tenantId: String!) {
    pmTasks(tenantId: $tenantId) {
      id projectId title status priority type estimatedHours loggedHours
      assigneeId dueDate startDate
      assignee { id firstName lastName }
    }
  }
`;

const GET_PROJECTS = `
  query($tenantId: String!) {
    pmProjects(tenantId: $tenantId) { id name projectNumber status }
  }
`;

const UPDATE_TASK_ASSIGNEE = `
  mutation($id: ID!, $assigneeId: String) {
    updatePmTask(id: $id, input: { assigneeId: $assigneeId }) { id }
  }
`;

const PROJECT_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#e11d48'];

export default function WorkloadPage() {
    const router = useRouter();
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [messageApi, contextHolder] = message.useMessage();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<string>("heatmap");
    const [filterProject, setFilterProject] = useState<string | null>(null);
    const [filterPeriod, setFilterPeriod] = useState<string>("all");
    const [searchName, setSearchName] = useState("");
    const [expandedRows, setExpandedRows] = useState<string[]>([]);

    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === "dark";

    const glassCard = useMemo(() => ({
        background: isDark ? "rgba(15, 15, 23, 0.7)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        border: isDark ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(0,0,0,0.06)",
        borderRadius: 12,
    }), [isDark]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [tData, pData] = await Promise.all([
                gql(GET_TASKS, { tenantId: DEFAULT_TENANT_ID }),
                gql(GET_PROJECTS, { tenantId: DEFAULT_TENANT_ID }),
            ]);
            setTasks(tData.pmTasks || []);
            setProjects(pData.pmProjects || []);
        } catch (err: any) { 
            messageApi.error("Failed to load workload data: " + err.message);
        } finally { setLoading(false); }
    }, [messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Filter tasks ──
    const filteredTasks = useMemo(() => {
        let result = tasks;
        if (filterProject) result = result.filter(t => t.projectId === filterProject);
        if (filterPeriod === "week") {
            const start = dayjs().startOf("week");
            const end = dayjs().endOf("week");
            result = result.filter(t => {
                const d = t.dueDate ? dayjs(t.dueDate) : t.startDate ? dayjs(t.startDate) : null;
                return d && d.isAfter(start) && d.isBefore(end);
            });
        } else if (filterPeriod === "month") {
            const start = dayjs().startOf("month");
            const end = dayjs().endOf("month");
            result = result.filter(t => {
                const d = t.dueDate ? dayjs(t.dueDate) : t.startDate ? dayjs(t.startDate) : null;
                return d && d.isAfter(start) && d.isBefore(end);
            });
        }
        return result;
    }, [tasks, filterProject, filterPeriod]);

    // ── Build team member data ──
    const teamData = useMemo(() => {
        const map = new Map<string, {
            id: string; name: string; firstName: string; lastName: string;
            tasks: any[]; totalEstimated: number; totalLogged: number;
            byProject: Map<string, number>; byStatus: Record<string, number>;
        }>();
        filteredTasks.forEach(t => {
            if (!t.assigneeId || !t.assignee) return;
            const key = t.assigneeId;
            if (!map.has(key)) {
                map.set(key, {
                    id: key,
                    name: `${t.assignee.firstName} ${t.assignee.lastName}`,
                    firstName: t.assignee.firstName,
                    lastName: t.assignee.lastName,
                    tasks: [], totalEstimated: 0, totalLogged: 0,
                    byProject: new Map(), byStatus: {},
                });
            }
            const m = map.get(key)!;
            m.tasks.push(t);
            m.totalEstimated += t.estimatedHours || 0;
            m.totalLogged += t.loggedHours || 0;
            const projName = projects.find(p => p.id === t.projectId)?.name || "Other";
            m.byProject.set(projName, (m.byProject.get(projName) || 0) + (t.estimatedHours || 0));
            m.byStatus[t.status] = (m.byStatus[t.status] || 0) + 1;
        });
        let result = Array.from(map.values()).sort((a, b) => b.totalEstimated - a.totalEstimated);
        if (searchName) result = result.filter(m => m.name.toLowerCase().includes(searchName.toLowerCase()));
        return result;
    }, [filteredTasks, projects, searchName]);

    const unassignedTasks = useMemo(() => filteredTasks.filter(t => !t.assigneeId), [filteredTasks]);
    const totalMembers = teamData.length;
    const totalEstimated = teamData.reduce((s, m) => s + m.totalEstimated, 0);
    const avgHours = totalMembers > 0 ? Math.round(totalEstimated / totalMembers) : 0;
    const overloaded = teamData.filter(m => m.totalEstimated > 40).length;

    // ── Heatmap chart data ──
    const projectNameList = useMemo(() => {
        const set = new Set<string>();
        teamData.forEach(m => m.byProject.forEach((_, name) => set.add(name)));
        return Array.from(set);
    }, [teamData]);

    const heatmapData = useMemo(() => teamData.map(m => {
        const entry: any = { name: m.name.length > 14 ? m.name.slice(0, 14) + "…" : m.name, total: m.totalEstimated };
        projectNameList.forEach(pn => { entry[pn] = m.byProject.get(pn) || 0; });
        return entry;
    }), [teamData, projectNameList]);

    // ── Workload color ──
    const getLoadColor = (hours: number) => hours > 40 ? "#ef4444" : hours > 30 ? "#f59e0b" : "#10b981";
    const getLoadLabel = (hours: number) => hours > 40 ? "Overloaded" : hours > 30 ? "At Capacity" : "Available";

    // ── Drag Handlers ──
    const handleDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId) return;

        const newAssigneeId = destination.droppableId === "unassigned" ? null : destination.droppableId;
        
        // Optimistic UI update
        setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, assigneeId: newAssigneeId } : t));
        
        try {
            await gql(UPDATE_TASK_ASSIGNEE, { id: draggableId, assigneeId: newAssigneeId });
            messageApi.success("Task reassigned");
        } catch (err: any) {
            console.error(err);
            messageApi.error("Failed to reassign task");
            loadData(); // revert
        }
    };

    // ── Table columns ──
    const tableColumns = [
        {
            title: "Name", dataIndex: "name", key: "name", sorter: (a: any, b: any) => a.name.localeCompare(b.name),
            render: (name: string, r: any) => (
                <Space>
                    <Avatar size={28} style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)`, fontSize: 11 }}>
                        {r.firstName?.[0]}{r.lastName?.[0]}
                    </Avatar>
                    <div>
                        <Text strong style={{ fontSize: 12 }}>{name}</Text>
                        {r.totalEstimated > 40 && <Tag color="red" style={{ fontSize: 9, marginLeft: 4, borderRadius: 8 }}>OVERLOADED</Tag>}
                    </div>
                </Space>
            ),
        },
        {
            title: "Active", key: "active", width: 75, sorter: (a: any, b: any) => (a.byStatus.in_progress || 0) - (b.byStatus.in_progress || 0),
            render: (_: any, r: any) => <Text style={{ fontSize: 12 }}>{(r.byStatus.in_progress || 0) + (r.byStatus.todo || 0)}</Text>,
        },
        {
            title: "Done", key: "done", width: 70, sorter: (a: any, b: any) => (a.byStatus.done || 0) - (b.byStatus.done || 0),
            render: (_: any, r: any) => <Text style={{ fontSize: 12, color: "#10b981" }}>{r.byStatus.done || 0}</Text>,
        },
        {
            title: "Estimated", dataIndex: "totalEstimated", key: "est", width: 100,
            sorter: (a: any, b: any) => a.totalEstimated - b.totalEstimated,
            render: (v: number) => <Text style={{ fontSize: 12, fontWeight: 600, color: getLoadColor(v) }}>{v}h</Text>,
        },
        {
            title: "Logged", dataIndex: "totalLogged", key: "logged", width: 90,
            sorter: (a: any, b: any) => a.totalLogged - b.totalLogged,
            render: (v: number) => <Text style={{ fontSize: 12 }}>{v}h</Text>,
        },
        {
            title: "Utilization", key: "util", width: 120,
            sorter: (a: any, b: any) => {
                const ua = a.totalEstimated > 0 ? a.totalLogged / a.totalEstimated : 0;
                const ub = b.totalEstimated > 0 ? b.totalLogged / b.totalEstimated : 0;
                return ua - ub;
            },
            render: (_: any, r: any) => {
                const pct = r.totalEstimated > 0 ? Math.round((r.totalLogged / r.totalEstimated) * 100) : 0;
                return <Progress percent={Math.min(pct, 100)} size="small" strokeColor={pct > 100 ? "#ef4444" : themeColor}
                    trailColor={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"} format={() => `${pct}%`} />;
            },
        },
        {
            title: "Projects", key: "projects", width: 200,
            render: (_: any, r: any) => (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {(Array.from(r.byProject.keys()) as string[]).slice(0, 3).map((pn: string) => (
                        <Tag key={pn} style={{ fontSize: 9, borderRadius: 8, margin: 0 }}>{pn}</Tag>
                    ))}
                    {r.byProject.size > 3 && <Tag style={{ fontSize: 9, borderRadius: 8, margin: 0 }}>+{r.byProject.size - 3}</Tag>}
                </div>
            ),
        },
    ];

    // ── Expanded row: member's task list ──
    const expandedRowRender = (record: any) => {
        const memberTasks = record.tasks.sort((a: any, b: any) => (b.estimatedHours || 0) - (a.estimatedHours || 0));
        const statusColor: Record<string, string> = { todo: "#64748b", in_progress: "#3b82f6", done: "#10b981", blocked: "#ef4444", review: "#8b5cf6" };
        return (
            <div style={{ padding: "8px 16px" }}>
                {memberTasks.map((t: any) => (
                    <div key={t.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "6px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}`,
                    }}>
                        <Space size={8}>
                            <Tag color={statusColor[t.status] || "#6b7280"} style={{ fontSize: 9, borderRadius: 8 }}>
                                {(t.status || "").replace(/_/g, " ").toUpperCase()}
                            </Tag>
                            <Text style={{ fontSize: 12 }}>{t.title}</Text>
                        </Space>
                        <Space size={12}>
                            <Text type="secondary" style={{ fontSize: 10 }}>{t.estimatedHours || 0}h est</Text>
                            <Text type="secondary" style={{ fontSize: 10 }}>{t.loggedHours || 0}h log</Text>
                            {t.dueDate && <Text type="secondary" style={{ fontSize: 10 }}>{dayjs(t.dueDate).format("MMM D")}</Text>}
                        </Space>
                    </div>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <CMSLayout title={<AuroraText colors={[themeColor, "#3b82f6", "#10b981"]}>Workload</AuroraText>}
                subTitle={<DecryptedText text="Team resource capacity management" animateOn="view" revealDirection="start" speed={40} sequential />}>
                <div style={{ textAlign: "center", padding: 120 }}><Spin size="large" /></div>
            </CMSLayout>
        );
    }

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#3b82f6", "#10b981"]}>Workload</AuroraText>}
            subTitle={<DecryptedText text="Team resource capacity management" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[
                <RbacGuard key="exports" requiredRole="manager">
                    <Space>
                        <Tooltip title="Export to Excel">
                            <Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({
                                fileName: 'pm_workload',
                                title: 'Team Workload Report',
                                columns: [{ header: 'Name', key: 'name' }, { header: 'Active', key: 'active' }, { header: 'Estimated', key: 'totalEstimated' }, { header: 'Logged', key: 'totalLogged' }],
                                data: teamData.map(m => ({ name: m.name, active: (m.byStatus.in_progress || 0) + (m.byStatus.todo || 0), totalEstimated: m.totalEstimated, totalLogged: m.totalLogged }))
                            })} />
                        </Tooltip>
                        <Tooltip title="Export to PDF">
                            <Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({
                                fileName: 'pm_workload',
                                title: 'Team Workload Report',
                                columns: [{ header: 'Name', key: 'name' }, { header: 'Active', key: 'active' }, { header: 'Estimated', key: 'totalEstimated' }, { header: 'Logged', key: 'totalLogged' }],
                                data: teamData.map(m => ({ name: m.name, active: (m.byStatus.in_progress || 0) + (m.byStatus.todo || 0), totalEstimated: m.totalEstimated, totalLogged: m.totalLogged }))
                            })} />
                        </Tooltip>
                    </Space>
                </RbacGuard>
            ]}
        >
            {contextHolder}
            {/* ── Unassigned Alert ── */}
            {unassignedTasks.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                    <Alert
                        type="warning" showIcon icon={<ExclamationCircleOutlined />}
                        message={<Text strong style={{ fontSize: 13 }}>{unassignedTasks.length} task{unassignedTasks.length > 1 ? "s are" : " is"} unassigned</Text>}
                        description={<Text type="secondary" style={{ fontSize: 11 }}>These tasks have no team member assigned and won't appear in workload calculations.</Text>}
                        action={<Button size="small" type="primary" onClick={() => router.push("/admin/pm/backlog")}
                            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: "none", borderRadius: 8 }}>View Backlog</Button>}
                        style={{ ...glassCard, marginBottom: 16, borderLeft: "4px solid #f59e0b" }}
                    />
                </motion.div>
            )}

            {/* ── Summary Stats ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <BentoGrid className="max-w-full mb-5">
                    {[
                        { label: "Team Members", value: totalMembers, color: "#3b82f6", icon: <TeamOutlined /> },
                        { label: "Avg Hours/Person", value: avgHours, suffix: "h", color: themeColor, icon: <ClockCircleOutlined /> },
                        { label: "Overloaded", value: overloaded, color: overloaded > 0 ? "#ef4444" : "#10b981", icon: <FireOutlined /> },
                        { label: "Unassigned Tasks", value: unassignedTasks.length, color: unassignedTasks.length > 0 ? "#f59e0b" : "#10b981", icon: <WarningOutlined /> },
                    ].map((s, i) => (
                        <BentoGridItem
                            key={i}
                            title={s.label}
                            description="Resource metric"
                            icon={React.cloneElement(s.icon as React.ReactElement, { style: { color: s.color } })}
                            header={
                                <div className="flex h-full w-full flex-col items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}15` }}>
                                    <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>
                                        {s.value}
                                        {s.suffix && <span style={{ fontSize: 20 }}>{s.suffix}</span>}
                                    </div>
                                </div>
                            }
                            className="col-span-4 lg:col-span-1"
                        />
                    ))}
                </BentoGrid>
            </motion.div>

            {/* ── Team Utilization Charts ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} md={10}>
                        <Card title={<Space><TeamOutlined style={{ color: themeColor }} /> Capacity Distribution</Space>} size="small" style={glassCard}>
                            {(() => {
                                const capacityDistribution = [
                                    { name: "Available", value: teamData.filter(m => m.totalEstimated <= 30).length, color: "#10b981" },
                                    { name: "At Capacity", value: teamData.filter(m => m.totalEstimated > 30 && m.totalEstimated <= 40).length, color: "#f59e0b" },
                                    { name: "Overloaded", value: teamData.filter(m => m.totalEstimated > 40).length, color: "#ef4444" },
                                ];
                                const total = capacityDistribution.reduce((s, d) => s + d.value, 0);
                                return (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
                                        <div style={{ width: 160, height: 160, position: "relative" }}>
                                            <ResponsiveContainer>
                                                <PieChart>
                                                    <Pie data={capacityDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none" isAnimationActive={true} animationDuration={1000} animationBegin={200} animationEasing="ease-out">
                                                        {capacityDistribution.map((entry, idx) => (
                                                            <Cell key={idx} fill={entry.color} style={{ outline: 'none', transition: 'all 0.3s ease' }} className="hover:opacity-80" />
                                                        ))}
                                                    </Pie>
                                                    <RTooltip contentStyle={{ background: isDark ? "rgba(15,15,23,0.95)" : "#fff", border: isDark ? "1px solid rgba(139,92,246,0.2)" : "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                                                <Text style={{ fontSize: 18, fontWeight: 700, display: "block", lineHeight: 1.1 }}>{total}</Text>
                                                <Text type="secondary" style={{ fontSize: 9 }}>members</Text>
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            {capacityDistribution.map(d => (
                                                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                                                    <Text type="secondary" style={{ fontSize: 11, minWidth: 70 }}>{d.name}</Text>
                                                    <Text style={{ fontSize: 13, fontWeight: 600 }}>{d.value}</Text>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </Card>
                    </Col>
                    <Col xs={24} md={14}>
                        <Card title={<Space><ProjectOutlined style={{ color: themeColor }} /> Hours by Project</Space>} size="small" style={glassCard}>
                            {(() => {
                                const projectHoursData = projectNameList.map(pn => {
                                    let sum = 0;
                                    teamData.forEach(m => {
                                        sum += m.byProject.get(pn) || 0;
                                    });
                                    return { name: pn, hours: sum };
                                }).sort((a,b) => b.hours - a.hours).slice(0, 5); // top 5 projects
                                
                                return (
                                    <div style={{ height: 160 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={projectHoursData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.06)" : "#f0f0f0"} />
                                                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 10 }} unit="h" axisLine={false} tickLine={false} />
                                                <RTooltip contentStyle={{ background: isDark ? "rgba(15,15,23,0.95)" : "#fff", border: isDark ? "1px solid rgba(139,92,246,0.2)" : "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }} />
                                                <Bar dataKey="hours" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000} animationBegin={300} animationEasing="ease-out">
                                                    {projectHoursData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PROJECT_COLORS[index % PROJECT_COLORS.length]} style={{ outline: 'none', transition: 'all 0.3s ease' }} className="hover:opacity-80" />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                );
                            })()}
                        </Card>
                    </Col>
                </Row>
            </motion.div>

            {/* ── Total Hours Summary ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
                <Card size="small" style={{ ...glassCard, marginBottom: 20, borderLeft: `4px solid ${themeColor}` }}>
                    <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", gap: 20 }}>
                        <Statistic title={<Text style={{ fontSize: 11 }}>Total Estimated</Text>} value={totalEstimated} suffix="h" valueStyle={{ fontSize: 20, fontWeight: 700, color: themeColor }} />
                        <div style={{ width: 1, height: 40, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }} />
                        <Statistic title={<Text style={{ fontSize: 11 }}>Total Logged</Text>} value={teamData.reduce((s, m) => s + m.totalLogged, 0)} suffix="h" valueStyle={{ fontSize: 20, fontWeight: 700, color: "#10b981" }} />
                        <div style={{ width: 1, height: 40, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }} />
                        <Statistic title={<Text style={{ fontSize: 11 }}>Capacity Used</Text>} value={totalMembers > 0 ? Math.round((totalEstimated / (totalMembers * 40)) * 100) : 0} suffix="%" valueStyle={{ fontSize: 20, fontWeight: 700 }} />
                    </div>
                </Card>
            </motion.div>

            {/* ── Filters ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card size="small" style={{ ...glassCard, marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <ProjectOutlined style={{ color: themeColor }} />
                        <Select placeholder="All Projects" value={filterProject} onChange={setFilterProject} allowClear showSearch
                            optionFilterProp="label" style={{ minWidth: 200 }}
                            options={projects.map(p => ({ value: p.id, label: `${p.name} (${p.projectNumber})` }))} />
                        <Select value={filterPeriod} onChange={setFilterPeriod} style={{ width: 130 }}
                            options={[{ value: "all", label: "All Time" }, { value: "week", label: "This Week" }, { value: "month", label: "This Month" }]} />
                        <Input prefix={<SearchOutlined />} placeholder="Search member…" value={searchName}
                            onChange={e => setSearchName(e.target.value)} style={{ width: 180 }} allowClear />
                        <div style={{ flex: 1 }} />
                        <Segmented value={viewMode} onChange={(v) => setViewMode(v as string)}
                            options={[
                                { value: "heatmap", icon: <UnorderedListOutlined />, label: "Heatmap" },
                                { value: "cards", icon: <AppstoreOutlined />, label: "Cards" },
                                { value: "board", icon: <AppstoreOutlined />, label: "Interactive Board" },
                            ]} />
                    </div>
                </Card>
            </motion.div>

            {/* ── Heatmap View ── */}
            {viewMode === "heatmap" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card title={<Space><TeamOutlined style={{ color: themeColor }} /> Workload Heatmap</Space>} size="small"
                        style={{ ...glassCard, marginBottom: 20 }}>
                        {heatmapData.length === 0 ? <Empty description="No team members with assigned tasks" /> : (
                            <div style={{ height: Math.max(250, heatmapData.length * 44 + 60) }}>
                                <ResponsiveContainer>
                                    <BarChart data={heatmapData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "rgba(255,255,255,0.06)" : "#f0f0f0"} />
                                        <XAxis type="number" tick={{ fontSize: 10 }} unit="h" />
                                        <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
                                        <RTooltip contentStyle={{
                                            background: isDark ? "rgba(15,15,23,0.95)" : "#fff",
                                            border: isDark ? "1px solid rgba(139,92,246,0.2)" : "1px solid #e5e7eb",
                                            borderRadius: 8, fontSize: 12,
                                        }} />
                                        <Legend wrapperStyle={{ fontSize: 10 }} />
                                        <ReferenceLine x={40} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}
                                            label={{ value: "40h Capacity", position: "top", fontSize: 10, fill: "#ef4444" }} />
                                        {projectNameList.map((pn, i) => (
                                            <Bar key={pn} dataKey={pn} stackId="hours" fill={PROJECT_COLORS[i % PROJECT_COLORS.length]}
                                                radius={i === projectNameList.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]} />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        {/* Color legend */}
                        <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
                            {[{ label: "Available (<30h)", color: "#10b981" }, { label: "At Capacity (30-40h)", color: "#f59e0b" }, { label: "Overloaded (>40h)", color: "#ef4444" }].map(l => (
                                <Space key={l.label} size={4}>
                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                                    <Text type="secondary" style={{ fontSize: 10 }}>{l.label}</Text>
                                </Space>
                            ))}
                        </div>
                    </Card>
                </motion.div>
            )}

            {/* ── Card Grid View ── */}
            {viewMode === "cards" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    {teamData.length === 0 ? (
                        <Card style={glassCard}><Empty description="No team members with assigned tasks" /></Card>
                    ) : (
                        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                            {teamData.map((m, i) => {
                                const utilPct = m.totalEstimated > 0 ? Math.round((m.totalLogged / m.totalEstimated) * 100) : 0;
                                const loadColor = getLoadColor(m.totalEstimated);
                                const statusIcons: Record<string, { icon: React.ReactNode; color: string }> = {
                                    todo: { icon: <PauseCircleOutlined />, color: "#64748b" },
                                    in_progress: { icon: <SyncOutlined />, color: "#3b82f6" },
                                    done: { icon: <CheckCircleOutlined />, color: "#10b981" },
                                    blocked: { icon: <ExclamationCircleOutlined />, color: "#ef4444" },
                                };
                                return (
                                    <Col xs={24} sm={12} lg={8} xl={6} key={m.id}>
                                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -4, scale: 1.02 }} style={{ height: '100%' }}>
                                            <Card hoverable size="small" style={{ ...glassCard, borderTop: `3px solid ${loadColor}`, height: '100%', display: 'flex', flexDirection: 'column' }} bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                                                    <Avatar size={40} style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)`, fontWeight: 700, fontSize: 14 }}>
                                                        {m.firstName?.[0]}{m.lastName?.[0]}
                                                    </Avatar>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <Text strong style={{ fontSize: 13, display: "block" }}>{m.name}</Text>
                                                        <Space size={8}>
                                                            <Text type="secondary" style={{ fontSize: 10 }}>{m.tasks.length} tasks</Text>
                                                            <Text style={{ fontSize: 10, fontWeight: 600, color: loadColor }}>{m.totalEstimated}h</Text>
                                                        </Space>
                                                    </div>
                                                    {m.totalEstimated > 40 && (
                                                        <Tooltip title="Overloaded — above 40h capacity">
                                                            <FireOutlined style={{ color: "#ef4444", fontSize: 16 }} />
                                                        </Tooltip>
                                                    )}
                                                </div>
                                                {/* Capacity bar */}
                                                <div style={{ marginBottom: 10 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                        <Text type="secondary" style={{ fontSize: 10 }}>Capacity</Text>
                                                        <Text style={{ fontSize: 10, fontWeight: 600, color: loadColor }}>{m.totalEstimated}h / 40h</Text>
                                                    </div>
                                                    <div style={{ height: 8, borderRadius: 4, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", overflow: "hidden" }}>
                                                        <div style={{
                                                            width: `${Math.min(100, (m.totalEstimated / 40) * 100)}%`,
                                                            height: "100%", borderRadius: 4,
                                                            background: `linear-gradient(90deg, ${loadColor}cc, ${loadColor})`,
                                                            transition: "width 0.5s ease",
                                                        }} />
                                                    </div>
                                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                                                        <Text type="secondary" style={{ fontSize: 9 }}>Logged: {m.totalLogged}h</Text>
                                                        <Text type="secondary" style={{ fontSize: 9 }}>{getLoadLabel(m.totalEstimated)}</Text>
                                                    </div>
                                                </div>
                                                {/* Status dots */}
                                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                                    {Object.entries(m.byStatus).map(([status, count]) => {
                                                        const cfg = statusIcons[status] || { icon: <UserOutlined />, color: "#6b7280" };
                                                        return (
                                                            <Tooltip key={status} title={`${status.replace(/_/g, " ")}: ${count}`}>
                                                                <Tag icon={cfg.icon} color={cfg.color} style={{ fontSize: 9, borderRadius: 8, margin: 0 }}>
                                                                    {count}
                                                                </Tag>
                                                            </Tooltip>
                                                        );
                                                    })}
                                                </div>
                                                {/* Capacity label */}
                                                <div style={{ marginTop: 8, textAlign: "center" }}>
                                                    <Tag color={loadColor} style={{ fontSize: 9, borderRadius: 10 }}>{getLoadLabel(m.totalEstimated)}</Tag>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    </Col>
                                );
                            })}
                        </Row>
                    )}
                </motion.div>
            )}

            {/* ── Task Distribution Table ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card title={<Space><TeamOutlined style={{ color: "#3b82f6" }} /> Task Distribution</Space>}
                    size="small" style={glassCard} extra={<Tag color="blue">{teamData.length} members</Tag>}>
                    <Table
                        dataSource={teamData} columns={tableColumns} rowKey="id" size="small"
                        pagination={teamData.length > 15 ? { pageSize: 15, showSizeChanger: false } : false}
                        scroll={{ x: 750 }}
                        expandable={{
                            expandedRowRender,
                            expandedRowKeys: expandedRows,
                            onExpand: (expanded, record) => setExpandedRows(expanded ? [...expandedRows, record.id] : expandedRows.filter(k => k !== record.id)),
                            rowExpandable: (record) => record.tasks.length > 0,
                        }}
                        onRow={() => ({ style: { cursor: "pointer" } })}
                    />
                </Card>
            </motion.div>


            {/* ── Interactive Board View ── */}
            {viewMode === "board" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 24, minHeight: "calc(100vh - 280px)" }}>
                        <DragDropContext onDragEnd={handleDragEnd}>
                            {[{ id: "unassigned", name: "Unassigned", tasks: unassignedTasks, totalEstimated: 0, totalLogged: 0 }, ...teamData].map(col => {
                                const isUnassigned = col.id === "unassigned";
                                const loadColor = isUnassigned ? "#6b7280" : getLoadColor(col.totalEstimated);
                                return (
                                    <div key={col.id} style={{ flex: "0 0 340px", display: "flex", flexDirection: "column" }}>
                                        {/* Column Header */}
                                        <div style={{
                                            ...glassCard,
                                            padding: "16px", marginBottom: 12,
                                            borderTop: `4px solid ${loadColor}`,
                                            position: "relative", overflow: "hidden"
                                        }}>
                                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 40, background: `linear-gradient(180deg, ${loadColor}1a, transparent)` }} />
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
                                                <Space>
                                                    {!isUnassigned ? (
                                                        <Avatar size={36} style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}bb)`, fontWeight: 700 }}>
                                                            {col.name.split(" ").map(n => n[0]).join("")}
                                                        </Avatar>
                                                    ) : (
                                                        <Avatar size={36} icon={<UserOutlined />} style={{ background: "#4b5563" }} />
                                                    )}
                                                    <div>
                                                        <Text strong style={{ fontSize: 14 }}>{col.name}</Text>
                                                        {!isUnassigned && (
                                                            <div style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>
                                                                <span style={{ color: loadColor, fontWeight: 600 }}>{col.totalEstimated}h</span> / 40h capacity
                                                            </div>
                                                        )}
                                                    </div>
                                                </Space>
                                                <Badge count={col.tasks.length} style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", color: isDark ? "#fff" : "#000", boxShadow: "none" }} />
                                            </div>
                                            {!isUnassigned && (
                                                <div style={{ marginTop: 12, height: 4, borderRadius: 2, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", overflow: "hidden" }}>
                                                    <div style={{
                                                        width: `${Math.min(100, (col.totalEstimated / 40) * 100)}%`, height: "100%",
                                                        background: `linear-gradient(90deg, ${loadColor}cc, ${loadColor})`,
                                                        transition: "width 0.5s ease"
                                                    }} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Column Body / Droppable Area */}
                                        <Droppable droppableId={col.id}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    style={{
                                                        flex: 1, padding: "12px 8px", borderRadius: 12,
                                                        background: snapshot.isDraggingOver ? (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent",
                                                        border: snapshot.isDraggingOver ? `1px dashed ${themeColor}88` : "1px dashed transparent",
                                                        transition: "all 0.2s ease",
                                                        display: "flex", flexDirection: "column", gap: 12
                                                    }}
                                                >
                                                    {col.tasks.map((t, idx) => {
                                                        const pColor = PROJECT_COLORS[t.projectId?.length % PROJECT_COLORS.length || 0];
                                                        const projName = projects.find(p => p.id === t.projectId)?.name || "Task";
                                                        return (
                                                            <Draggable key={t.id} draggableId={t.id} index={idx}>
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        style={{
                                                                            ...provided.draggableProps.style,
                                                                            ...glassCard,
                                                                            padding: "14px 16px",
                                                                            background: snapshot.isDragging ? (isDark ? "rgba(30,30,44,0.95)" : "#ffffff") : (isDark ? "rgba(20,20,30,0.7)" : "#ffffff"),
                                                                            boxShadow: snapshot.isDragging ? "0 12px 24px rgba(0,0,0,0.2)" : (isDark ? "0 4px 6px rgba(0,0,0,0.1)" : "0 1px 3px rgba(0,0,0,0.05)"),
                                                                            transform: snapshot.isDragging ? "scale(1.02) rotate(1deg)" : "none",
                                                                            borderLeft: `4px solid ${t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#10b981'}`,
                                                                            cursor: "grab",
                                                                        }}
                                                                    >
                                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                                                            <Tag color={pColor} style={{ border: "none", margin: 0, borderRadius: 6, fontSize: 10, padding: "0 6px" }}>{projName}</Tag>
                                                                            <Tag style={{ border: "none", margin: 0, borderRadius: 6, fontSize: 9, background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)" }}>
                                                                                {t.status.replace(/_/g, ' ').toUpperCase()}
                                                                            </Tag>
                                                                        </div>
                                                                        <Text strong style={{ fontSize: 13, lineHeight: 1.4, display: "block", marginBottom: 12 }}>{t.title}</Text>
                                                                        
                                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                                            <Space size={16}>
                                                                                <Tooltip title="Estimated Hours">
                                                                                    <span style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", gap: 4 }}>
                                                                                        <ClockCircleOutlined /> {t.estimatedHours || 0}h
                                                                                    </span>
                                                                                </Tooltip>
                                                                                {t.dueDate && (
                                                                                    <span style={{ fontSize: 11, color: dayjs(t.dueDate).isBefore(dayjs()) ? "#ef4444" : (isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)") }}>
                                                                                        {dayjs(t.dueDate).format("MMM D")}
                                                                                    </span>
                                                                                )}
                                                                            </Space>
                                                                            {t.loggedHours > 0 && (
                                                                                <Tooltip title={`Logged: ${t.loggedHours}h`}>
                                                                                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: isDark ? "rgba(16,185,129,0.15)" : "#d1fae5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>
                                                                                        {t.loggedHours}
                                                                                    </div>
                                                                                </Tooltip>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        );
                                                    })}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </div>
                                );
                            })}
                        </DragDropContext>
                    </div>
                </motion.div>
            )}
        </CMSLayout>
    );
}
