"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Statistic, Row, Col, Tag, Drawer, Select, Tooltip, Segmented, Typography, Badge, Space, theme } from "antd";
import { CalendarOutlined, CheckCircleOutlined, ToolOutlined, ExclamationCircleOutlined, LeftOutlined, RightOutlined, SwapOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { gql } from "@/lib/graphql";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import dayjs from "dayjs";

const { Text } = Typography;

const GET_CHANGES = `query { itsmChanges { id changeNumber title status changeType priority riskLevel scheduledStart scheduledEnd implementor approvalStatus impactAssessment rollbackPlan createdAt } }`;

const riskGradients: Record<string, string> = {
    low: "linear-gradient(135deg, #52c41a, #73d13d)",
    medium: "linear-gradient(135deg, #1890ff, #40a9ff)",
    high: "linear-gradient(135deg, #fa8c16, #ffa940)",
    critical: "linear-gradient(135deg, #f5222d, #ff4d4f)",
};
const riskColors: Record<string, string> = { low: "#52c41a", medium: "#1890ff", high: "#fa8c16", critical: "#f5222d" };
const statusColors: Record<string, string> = {
    draft: "default", submitted: "blue", under_review: "cyan", approved: "green",
    scheduled: "geekblue", implementing: "orange", completed: "green", failed: "red", cancelled: "default",
};
const typeColors: Record<string, string> = { standard: "green", normal: "blue", emergency: "red" };
const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* helpers */
const isFreezeDay = (d: dayjs.Dayjs) => {
    const q = Math.floor((d.month()) / 3);
    const qEnd = dayjs().year(d.year()).month(q * 3 + 2).endOf("month");
    const freezeStart = qEnd.subtract(6, "day").startOf("day");
    return d.isSame(freezeStart, "day") || (d.isAfter(freezeStart) && (d.isBefore(qEnd.add(1, "day"))));
};

export default function ChangeCalendarPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === "#141414" || antToken.colorBgBase?.includes("14");
    const glass = {
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.65)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.45)"}`,
        borderRadius: 14,
    };

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [current, setCurrent] = useState(dayjs());
    const [viewMode, setViewMode] = useState<"Month" | "Week">("Month");
    const [selected, setSelected] = useState<any | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
    const [filterRisk, setFilterRisk] = useState<string | undefined>(undefined);
    const [filterType, setFilterType] = useState<string | undefined>(undefined);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const d = await gql(GET_CHANGES);
            setData((d as any).itsmChanges || []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    /* filtered data */
    const filtered = useMemo(() => {
        let list = data;
        if (filterStatus) list = list.filter(c => c.status === filterStatus);
        if (filterRisk) list = list.filter(c => c.riskLevel === filterRisk);
        if (filterType) list = list.filter(c => c.changeType === filterType);
        return list;
    }, [data, filterStatus, filterRisk, filterType]);

    /* month stats */
    const monthStart = current.startOf("month");
    const monthEnd = current.endOf("month");
    const monthChanges = useMemo(() => filtered.filter(c => {
        if (!c.scheduledStart) return false;
        const s = dayjs(c.scheduledStart);
        return s.isSame(monthStart, "month") || (s.isAfter(monthStart) && s.isBefore(monthEnd));
    }), [filtered, monthStart, monthEnd]);

    const stats = [
        { title: "Changes This Month", value: monthChanges.length, icon: <CalendarOutlined />, color: "#3b82f6" },
        { title: "Approved", value: monthChanges.filter(c => c.approvalStatus === "approved" || c.status === "approved").length, icon: <CheckCircleOutlined />, color: "#10b981" },
        { title: "Implementing", value: monthChanges.filter(c => c.status === "implementing").length, icon: <ToolOutlined />, color: "#f59e0b" },
        { title: "High Risk", value: monthChanges.filter(c => c.riskLevel === "high" || c.riskLevel === "critical").length, icon: <ExclamationCircleOutlined />, color: "#ef4444" },
    ];

    /* build calendar grid */
    const calendarDays = useMemo(() => {
        if (viewMode === "Week") {
            const weekStart = current.startOf("week").add(current.startOf("week").day() === 0 ? 1 : 0, "day");
            const adjustedStart = current.day() === 0 ? current.subtract(6, "day") : current.startOf("week").add(1, "day");
            return Array.from({ length: 7 }, (_, i) => adjustedStart.add(i, "day"));
        }
        const firstDay = monthStart.startOf("week").add(monthStart.startOf("week").day() === 0 ? 1 : 0, "day");
        const adjustedFirst = monthStart.day() === 0 ? monthStart.subtract(6, "day") : monthStart.startOf("week").add(1, "day");
        const totalCells = Math.ceil((monthStart.day() === 0 ? 6 : monthStart.day() - 1 + monthEnd.date()) / 7) * 7;
        const cells = Math.max(totalCells, 35);
        return Array.from({ length: cells }, (_, i) => adjustedFirst.add(i, "day"));
    }, [current, viewMode, monthStart, monthEnd]);

    /* changes for a specific day */
    const changesForDay = useCallback((day: dayjs.Dayjs) => {
        return filtered.filter(c => {
            if (!c.scheduledStart) return false;
            const s = dayjs(c.scheduledStart).startOf("day");
            const e = c.scheduledEnd ? dayjs(c.scheduledEnd).startOf("day") : s;
            return day.isSame(s, "day") || day.isSame(e, "day") || (day.isAfter(s) && day.isBefore(e));
        });
    }, [filtered]);

    const today = dayjs();

    const openChange = (change: any) => { setSelected(change); setDrawerOpen(true); };
    const nav = (dir: number) => setCurrent(prev => viewMode === "Month" ? prev.add(dir, "month") : prev.add(dir * 7, "day"));

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Change Calendar</AuroraText>}
            subTitle={<DecryptedText text="Visual change schedule for CAB oversight" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                {/* Stats */}
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    {stats.map((s, i) => (
                        <Col key={i} xs={12} md={6}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                    <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Toolbar */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
                    <Space>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => nav(-1)}
                            style={{ background: "none", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "#d9d9d9"}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: isDark ? "#fff" : "#333" }}>
                            <LeftOutlined />
                        </motion.button>
                        <Text strong style={{ fontSize: 16, minWidth: 160, textAlign: "center", display: "inline-block" }}>
                            {viewMode === "Month" ? current.format("MMMM YYYY") : `${calendarDays[0]?.format("MMM D")} — ${calendarDays[6]?.format("MMM D, YYYY")}`}
                        </Text>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => nav(1)}
                            style={{ background: "none", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "#d9d9d9"}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: isDark ? "#fff" : "#333" }}>
                            <RightOutlined />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setCurrent(dayjs())}
                            style={{ background: themeColor, color: "#fff", border: "none", borderRadius: 8, padding: "4px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                            Today
                        </motion.button>
                    </Space>
                    <div style={{ flex: 1 }} />
                    <Select placeholder="Status" allowClear style={{ width: 130 }} value={filterStatus} onChange={setFilterStatus}
                        options={[{ value: "submitted", label: "Submitted" }, { value: "approved", label: "Approved" }, { value: "implementing", label: "Implementing" }, { value: "completed", label: "Completed" }]} />
                    <Select placeholder="Risk" allowClear style={{ width: 120 }} value={filterRisk} onChange={setFilterRisk}
                        options={[{ value: "low", label: "🟢 Low" }, { value: "medium", label: "🔵 Medium" }, { value: "high", label: "🟠 High" }, { value: "critical", label: "🔴 Critical" }]} />
                    <Select placeholder="Type" allowClear style={{ width: 120 }} value={filterType} onChange={setFilterType}
                        options={[{ value: "normal", label: "Normal" }, { value: "standard", label: "Standard" }, { value: "emergency", label: "Emergency" }]} />
                    <Segmented options={["Month", "Week"]} value={viewMode} onChange={v => setViewMode(v as any)} />
                </div>

                {/* Calendar Grid */}
                <div style={{ overflowX: "auto" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(120px, 1fr))", gap: 1, minWidth: 840 }}>
                        {/* Day headers */}
                        {DAY_HEADERS.map(d => (
                            <div key={d} style={{
                                textAlign: "center", padding: "8px 0", fontWeight: 700, fontSize: 12,
                                color: isDark ? "rgba(255,255,255,0.55)" : "#8c8c8c",
                                textTransform: "uppercase", letterSpacing: 1,
                            }}>{d}</div>
                        ))}

                        {/* Day cells */}
                        {calendarDays.map((day, idx) => {
                            const isCurrentMonth = day.month() === current.month();
                            const isToday = day.isSame(today, "day");
                            const freeze = isFreezeDay(day);
                            const dayChanges = changesForDay(day);

                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.008 }}
                                    style={{
                                        minHeight: viewMode === "Week" ? 220 : 110,
                                        padding: 6,
                                        borderRadius: 10,
                                        background: freeze
                                            ? isDark ? "rgba(245,34,45,0.10)" : "rgba(245,34,45,0.06)"
                                            : isToday
                                                ? isDark ? `${themeColor}18` : `${themeColor}08`
                                                : isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.55)",
                                        border: isToday
                                            ? `2px solid ${themeColor}`
                                            : `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                                        backdropFilter: "blur(8px)",
                                        position: "relative",
                                        opacity: isCurrentMonth || viewMode === "Week" ? 1 : 0.4,
                                        cursor: "pointer",
                                        transition: "box-shadow 0.2s",
                                    }}
                                    whileHover={{ boxShadow: `0 4px 16px ${isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.08)"}` }}
                                >
                                    {/* Day number */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                        <Text style={{
                                            fontSize: 13, fontWeight: isToday ? 800 : 500,
                                            color: isToday ? themeColor : isCurrentMonth || viewMode === "Week" ? (isDark ? "#fff" : "#333") : (isDark ? "rgba(255,255,255,0.3)" : "#bbb"),
                                            background: isToday ? `${themeColor}15` : "none",
                                            borderRadius: 6, padding: "0 5px",
                                        }}>
                                            {day.date()}
                                        </Text>
                                        {dayChanges.length > 0 && (
                                            <Badge count={dayChanges.length} size="small" style={{ backgroundColor: themeColor }} />
                                        )}
                                    </div>

                                    {/* Freeze overlay tooltip */}
                                    {freeze && (
                                        <Tooltip title="Change Freeze — No deployments allowed">
                                            <div style={{
                                                fontSize: 9, color: "#f5222d", fontWeight: 700,
                                                textAlign: "center", padding: "1px 0", letterSpacing: 0.5,
                                            }}>🧊 FREEZE</div>
                                        </Tooltip>
                                    )}

                                    {/* Change bars */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
                                        {dayChanges.slice(0, viewMode === "Week" ? 8 : 3).map(c => (
                                            <motion.div
                                                key={c.id}
                                                whileHover={{ scale: 1.04, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                                                onClick={(e) => { e.stopPropagation(); openChange(c); }}
                                                style={{
                                                    background: riskGradients[c.riskLevel] || riskGradients.medium,
                                                    borderRadius: 5,
                                                    padding: "2px 6px",
                                                    cursor: "pointer",
                                                    overflow: "hidden",
                                                    whiteSpace: "nowrap",
                                                    textOverflow: "ellipsis",
                                                }}
                                            >
                                                <Text style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{c.changeNumber || c.title}</Text>
                                            </motion.div>
                                        ))}
                                        {dayChanges.length > (viewMode === "Week" ? 8 : 3) && (
                                            <Text style={{ fontSize: 9, color: isDark ? "rgba(255,255,255,0.45)" : "#999", textAlign: "center" }}>
                                                +{dayChanges.length - (viewMode === "Week" ? 8 : 3)} more
                                            </Text>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Legend */}
                <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
                    <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.45)" : "#999" }}>Risk:</Text>
                    {Object.entries(riskColors).map(([k, c]) => (
                        <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ width: 14, height: 8, borderRadius: 4, background: riskGradients[k] }} />
                            <Text style={{ fontSize: 11, textTransform: "capitalize", color: isDark ? "rgba(255,255,255,0.6)" : "#666" }}>{k}</Text>
                        </div>
                    ))}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 12 }}>
                        <div style={{ width: 14, height: 8, borderRadius: 4, background: "rgba(245,34,45,0.2)", border: "1px solid rgba(245,34,45,0.4)" }} />
                        <Text style={{ fontSize: 11, color: isDark ? "rgba(255,255,255,0.6)" : "#666" }}>Freeze Window</Text>
                    </div>
                </div>
            </motion.div>

            {/* Change Details Drawer */}
            <Drawer
                title={selected ? <Space><SwapOutlined /> {selected.changeNumber}</Space> : "Change Details"}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                size={420}
            >
                {selected && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <div style={{ marginBottom: 16 }}>
                            <Text strong style={{ fontSize: 18, display: "block", marginBottom: 8 }}>{selected.title}</Text>
                            <Space wrap>
                                <Tag color={statusColors[selected.status]}>{(selected.status || "").replace(/_/g, " ").toUpperCase()}</Tag>
                                <Tag color={typeColors[selected.changeType]}>{(selected.changeType || "").toUpperCase()}</Tag>
                            </Space>
                        </div>

                        <Card size="small" style={{ ...glass, marginBottom: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.5)" : "#999" }}>Risk Level</Text>
                                <Tag color={riskColors[selected.riskLevel]} style={{ fontWeight: 700 }}>
                                    {(selected.riskLevel || "").toUpperCase()}
                                </Tag>
                            </div>
                            {selected.approvalStatus && (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.5)" : "#999" }}>Approval</Text>
                                    <Tag color={selected.approvalStatus === "approved" ? "green" : selected.approvalStatus === "rejected" ? "red" : "orange"}>
                                        {(selected.approvalStatus || "").toUpperCase()}
                                    </Tag>
                                </div>
                            )}
                        </Card>

                        {[
                            { label: "Scheduled Start", value: selected.scheduledStart ? dayjs(selected.scheduledStart).format("ddd, MMM D YYYY HH:mm") : "—" },
                            { label: "Scheduled End", value: selected.scheduledEnd ? dayjs(selected.scheduledEnd).format("ddd, MMM D YYYY HH:mm") : "—" },
                            { label: "Implementor", value: selected.implementor || "—" },
                        ].map((item, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "#f0f0f0"}` }}>
                                <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.5)" : "#999" }}>{item.label}</Text>
                                <Text strong style={{ fontSize: 13 }}>{item.value}</Text>
                            </div>
                        ))}

                        {selected.impactAssessment && (
                            <div style={{ marginTop: 16 }}>
                                <Text strong style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Impact Assessment</Text>
                                <div style={{ padding: 12, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.04)" : "#f9fafb", fontSize: 13 }}>
                                    {selected.impactAssessment}
                                </div>
                            </div>
                        )}

                        {selected.rollbackPlan && (
                            <div style={{ marginTop: 16 }}>
                                <Text strong style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Rollback Plan</Text>
                                <div style={{ padding: 12, borderRadius: 8, background: isDark ? "rgba(255,255,255,0.04)" : "#f9fafb", fontSize: 13 }}>
                                    {selected.rollbackPlan}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </Drawer>
        </CMSLayout>
    );
}
