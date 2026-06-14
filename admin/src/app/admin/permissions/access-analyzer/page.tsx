"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Card, Table, Button, Select, Tag, Space, Typography, Spin, Statistic,
    Row, Col, Switch, Collapse, Tooltip, Empty, theme, Badge, Divider,
} from "antd";
import { motion } from "framer-motion";
import {
    SearchOutlined, UserOutlined, AppstoreOutlined, ThunderboltOutlined,
    SafetyOutlined, ApartmentOutlined, ShareAltOutlined, LockOutlined,
    CheckCircleFilled, CloseCircleFilled, SwapOutlined, CrownOutlined,
    RightOutlined, TeamOutlined, IdcardOutlined, DownOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface User { id: string; name: string; email: string; role: string; profileId: string; }
interface Profile { id: string; name: string; description: string; objectPermissions: string; systemPermissions: string; }
interface Role { id: string; name: string; parentId: string | null; description: string; }
interface PermissionSet { id: string; name: string; description: string; objectPermissions: string; systemPermissions: string; assignedUsers: string; }
interface SharingRule { id: string; name: string; objectName: string; type: string; sharedFrom: string; sharedTo: string; accessLevel: string; }
interface OWD { id: string; objectName: string; defaultAccess: string; }
interface CRUD { create: boolean; read: boolean; edit: boolean; delete: boolean; viewAll: boolean; modifyAll: boolean; }

const CRUD_KEYS: (keyof CRUD)[] = ["create", "read", "edit", "delete", "viewAll", "modifyAll"];
const CRUD_LABELS: Record<keyof CRUD, string> = { create: "Create", read: "Read", edit: "Edit", delete: "Delete", viewAll: "View All", modifyAll: "Modify All" };
const EMPTY_CRUD: CRUD = { create: false, read: false, edit: false, delete: false, viewAll: false, modifyAll: false };

const SYS_PERM_CATEGORIES: Record<string, string[]> = {
    Setup: ["ManageUsers", "ManageProfiles", "ManageRoles", "ManageSharing", "CustomizeApplication"],
    Data: ["ExportData", "ImportData", "BulkDelete", "MassTransfer", "DataExport"],
    Reports: ["CreateReports", "ManageDashboards", "ViewAllReports", "ScheduleReports"],
    Users: ["ResetPasswords", "ManageLoginAccess", "AssignPermSets", "DelegateAdmin"],
    API: ["ApiAccess", "ManageConnectedApps", "ManageWebhooks", "OAuthAccess"],
};

function parseCrud(json: string | undefined, objectName: string): CRUD {
    if (!json) return { ...EMPTY_CRUD };
    try {
        const perms = JSON.parse(json);
        const obj = Array.isArray(perms) ? perms.find((p: any) => p.object === objectName) : perms[objectName];
        if (!obj) return { ...EMPTY_CRUD };
        return { create: !!obj.create, read: !!obj.read, edit: !!obj.edit, delete: !!obj.delete, viewAll: !!obj.viewAll, modifyAll: !!obj.modifyAll };
    } catch { return { ...EMPTY_CRUD }; }
}

function parseSysPerms(json: string | undefined): string[] {
    if (!json) return [];
    try { const p = JSON.parse(json); return Array.isArray(p) ? p : Object.keys(p).filter(k => p[k]); } catch { return []; }
}

function mergeCrud(a: CRUD, b: CRUD): CRUD {
    return { create: a.create || b.create, read: a.read || b.read, edit: a.edit || b.edit, delete: a.delete || b.delete, viewAll: a.viewAll || b.viewAll, modifyAll: a.modifyAll || b.modifyAll };
}

function crudHasAny(c: CRUD) { return CRUD_KEYS.some(k => c[k]); }

function accessLevel(c: CRUD): { label: string; color: string } {
    if (c.modifyAll) return { label: "Full Access", color: "green" };
    if (c.create && c.read && c.edit && c.delete) return { label: "Read-Write", color: "blue" };
    if (c.read) return { label: "Read-Only", color: "orange" };
    return { label: "No Access", color: "red" };
}

const CrudBadge = ({ val }: { val: boolean }) => val
    ? <CheckCircleFilled style={{ color: "#22c55e", fontSize: 18 }} />
    : <CloseCircleFilled style={{ color: "#ef4444", fontSize: 18 }} />;

export default function AccessAnalyzerPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const glassCard = isDark ? { background: 'rgba(30,30,30,0.78)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 } : glass;

    const [users, setUsers] = useState<User[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [permSets, setPermSets] = useState<PermissionSet[]>([]);
    const [sharingRules, setSharingRules] = useState<SharingRule[]>([]);
    const [owds, setOwds] = useState<OWD[]>([]);
    const [loading, setLoading] = useState(true);

    const [userId, setUserId] = useState<string | null>(null);
    const [objectName, setObjectName] = useState<string | null>(null);
    const [compareUserId, setCompareUserId] = useState<string | null>(null);
    const [showCompare, setShowCompare] = useState(false);
    const [showAllSys, setShowAllSys] = useState(false);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [uData, pData, rData, psData, srData, oData] = await Promise.all([
                gql(`query($tenantId:String!){users(tenantId:$tenantId){id name email role profileId}}`, { tenantId: DEFAULT_TENANT_ID }),
                gql(`query($tenantId:String!){rbacProfiles(tenantId:$tenantId){id name description objectPermissions systemPermissions}}`, { tenantId: DEFAULT_TENANT_ID }),
                gql(`query($tenantId:String!){rbacRoles(tenantId:$tenantId){id name parentId description}}`, { tenantId: DEFAULT_TENANT_ID }),
                gql(`query($tenantId:String!){rbacPermissionSets(tenantId:$tenantId){id name description objectPermissions systemPermissions assignedUsers}}`, { tenantId: DEFAULT_TENANT_ID }),
                gql(`query($tenantId:String!){rbacSharingRules(tenantId:$tenantId){id name objectName type sharedFrom sharedTo accessLevel}}`, { tenantId: DEFAULT_TENANT_ID }),
                gql(`query($tenantId:String!){rbacOrgWideDefaults(tenantId:$tenantId){id objectName defaultAccess}}`, { tenantId: DEFAULT_TENANT_ID }),
            ]);
            setUsers(uData.users || []);
            setProfiles(pData.rbacProfiles || []);
            setRoles(rData.rbacRoles || []);
            setPermSets(psData.rbacPermissionSets || []);
            setSharingRules(srData.rbacSharingRules || []);
            setOwds(oData.rbacOrgWideDefaults || []);
        } catch { /* silent */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    const user = useMemo(() => users.find(u => u.id === userId), [users, userId]);
    const compareUser = useMemo(() => users.find(u => u.id === compareUserId), [users, compareUserId]);
    const objectList = useMemo(() => owds.map(o => o.objectName).sort(), [owds]);

    // --- resolve for a user ---
    const resolveAccess = useCallback((u: User | undefined, obj: string) => {
        if (!u) return { profile: null as Profile | null, profileCrud: EMPTY_CRUD, psList: [] as { ps: PermissionSet; crud: CRUD }[], psCrud: EMPTY_CRUD, owd: null as OWD | null, role: null as Role | null, rolePath: [] as Role[], matchingRules: [] as SharingRule[], effective: EMPTY_CRUD, sysPerms: [] as string[] };
        const prof = profiles.find(p => p.id === u.profileId) || null;
        const profileCrud = prof ? parseCrud(prof.objectPermissions, obj) : { ...EMPTY_CRUD };
        const userPSes = permSets.filter(ps => { try { const au = JSON.parse(ps.assignedUsers || "[]"); return au.includes(u.id); } catch { return false; } });
        const psList = userPSes.map(ps => ({ ps, crud: parseCrud(ps.objectPermissions, obj) }));
        const psCrud = psList.reduce((acc, p) => mergeCrud(acc, p.crud), { ...EMPTY_CRUD });
        const owd = owds.find(o => o.objectName === obj) || null;
        const userRole = roles.find(r => r.name === u.role) || null;
        const rolePath: Role[] = [];
        let cur = userRole;
        while (cur) { rolePath.push(cur); cur = roles.find(r => r.id === cur!.parentId) || null; }
        const matchingRules = sharingRules.filter(sr => sr.objectName === obj && (sr.sharedTo === u.role || sr.sharedTo === u.id));
        const effective = mergeCrud(profileCrud, psCrud);
        const profSys = prof ? parseSysPerms(prof.systemPermissions) : [];
        const psSys = userPSes.flatMap(ps => parseSysPerms(ps.systemPermissions));
        const sysPerms = [...new Set([...profSys, ...psSys])];
        return { profile: prof, profileCrud, psList, psCrud, owd, role: userRole, rolePath, matchingRules, effective, sysPerms };
    }, [profiles, permSets, owds, roles, sharingRules]);

    const analysis = useMemo(() => userId && objectName ? resolveAccess(user, objectName) : null, [userId, objectName, user, resolveAccess]);
    const compareAnalysis = useMemo(() => compareUserId && objectName ? resolveAccess(compareUser, objectName) : null, [compareUserId, objectName, compareUser, resolveAccess]);

    // --- waterfall steps ---
    const waterfallSteps = useMemo(() => {
        if (!analysis) return [];
        let cumulative = { ...EMPTY_CRUD };
        const steps = [
            { num: 1, name: "Profile", icon: <SafetyOutlined />, source: analysis.profile?.name || "None", crud: analysis.profileCrud, grants: crudHasAny(analysis.profileCrud) },
            { num: 2, name: "Permission Sets", icon: <ThunderboltOutlined />, source: analysis.psList.map(p => p.ps.name).join(", ") || "None", crud: analysis.psCrud, grants: crudHasAny(analysis.psCrud) },
            { num: 3, name: "Org-Wide Default", icon: <LockOutlined />, source: analysis.owd?.defaultAccess || "Not set", crud: { ...EMPTY_CRUD, read: analysis.owd?.defaultAccess !== "private" }, grants: analysis.owd?.defaultAccess !== "private" },
            { num: 4, name: "Role Hierarchy", icon: <ApartmentOutlined />, source: analysis.role?.name || "No role", crud: { ...EMPTY_CRUD, read: analysis.rolePath.length > 1 }, grants: analysis.rolePath.length > 1 },
            { num: 5, name: "Sharing Rules", icon: <ShareAltOutlined />, source: analysis.matchingRules.map(r => r.name).join(", ") || "None", crud: { ...EMPTY_CRUD, read: analysis.matchingRules.length > 0 }, grants: analysis.matchingRules.length > 0 },
        ];
        return steps.map(s => { cumulative = mergeCrud(cumulative, s.crud); return { ...s, cumulative: { ...cumulative } }; });
    }, [analysis]);

    // --- full matrix for user ---
    const fullMatrix = useMemo(() => {
        if (!user) return [];
        return objectList.map(obj => {
            const r = resolveAccess(user, obj);
            return { key: obj, object: obj, ...r.effective };
        }).sort((a, b) => a.object.localeCompare(b.object));
    }, [user, objectList, resolveAccess]);

    const matrixCols: ColumnsType<any> = [
        { title: "Object", dataIndex: "object", key: "object", width: 160, render: (v: string) => <Text strong style={{ textTransform: "capitalize" }}>{v}</Text> },
        ...CRUD_KEYS.map(k => ({
            title: CRUD_LABELS[k], dataIndex: k, key: k, width: 90, align: "center" as const,
            render: (v: boolean) => <CrudBadge val={v} />,
        })),
    ];

    // --- role tree helpers ---
    const buildHierarchyPath = (roleId: string | null): Role[] => {
        const path: Role[] = [];
        let cur = roles.find(r => r.id === roleId);
        while (cur) { path.unshift(cur); cur = roles.find(r => r.id === cur!.parentId) ?? undefined; }
        return path;
    };
    const directReports = (roleId: string) => roles.filter(r => r.parentId === roleId);
    const roleUsers = (roleName: string) => users.filter(u => u.role === roleName);

    // --- comparison matrix ---
    const comparisonMatrix = useMemo(() => {
        if (!user || !compareUser || !showCompare) return [];
        return objectList.map(obj => {
            const a = resolveAccess(user, obj);
            const b = resolveAccess(compareUser, obj);
            const hasDiff = CRUD_KEYS.some(k => a.effective[k] !== b.effective[k]);
            return { key: obj, object: obj, a: a.effective, b: b.effective, hasDiff };
        }).sort((a, b) => a.object.localeCompare(b.object));
    }, [user, compareUser, showCompare, objectList, resolveAccess]);

    const renderEffectiveSummary = (eff: CRUD, label: string, userInfo?: { profile?: string | null; psCount?: number }) => (
        <Card size="small" style={{ ...glassCard, borderTop: `3px solid ${themeColor}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                    <Title level={5} style={{ margin: 0 }}>{label}</Title>
                    {userInfo && (
                        <div style={{ marginTop: 4, display: "flex", gap: 8 }}>
                            {userInfo.profile && <Tag icon={<IdcardOutlined />} color="blue" style={{ fontSize: 11 }}>{userInfo.profile}</Tag>}
                            {(userInfo.psCount || 0) > 0 && <Tag icon={<ThunderboltOutlined />} color="purple" style={{ fontSize: 11 }}>{userInfo.psCount} Permission Sets</Tag>}
                        </div>
                    )}
                </div>
                <Tag color={accessLevel(eff).color} style={{ fontSize: 13, padding: "2px 12px" }}>{accessLevel(eff).label}</Tag>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {CRUD_KEYS.map(k => (
                    <div key={k} style={{ textAlign: "center", minWidth: 64, padding: "6px 0", borderRadius: 8, background: eff[k] ? (isDark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.05)") : "transparent" }}>
                        <CrudBadge val={eff[k]} />
                        <div style={{ fontSize: 11, marginTop: 2, color: isDark ? "#bbb" : "#666" }}>{CRUD_LABELS[k]}</div>
                    </div>
                ))}
            </div>
            {analysis?.owd && <div style={{ marginTop: 10 }}><Tag icon={<LockOutlined />} color="default">Record-Level: {analysis.owd.defaultAccess}</Tag></div>}
        </Card>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Access Analyzer</AuroraText>}
            subTitle={<DecryptedText text="Analyze why a user has or doesn't have access — trace permissions step by step" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            <Spin spinning={loading}>
                {/* ── Stat Cards ── */}
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    {[
                        { title: "Users", value: users.length, icon: <TeamOutlined />, color: "#3b82f6" },
                        { title: "Profiles", value: profiles.length, icon: <IdcardOutlined />, color: "#10b981" },
                        { title: "Permission Sets", value: permSets.length, icon: <ThunderboltOutlined />, color: "#8b5cf6" },
                        { title: "Sharing Rules", value: sharingRules.length, icon: <ShareAltOutlined />, color: "#f59e0b" },
                    ].map((s, i) => (
                        <Col key={i} xs={12} md={6}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                <Card size="small" style={{ ...glassCard, borderTop: `3px solid ${s.color}` }}>
                                    <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>
                {/* ── Selector Bar ── */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <Card size="small" style={{ ...glassCard, marginBottom: 16 }}>
                        <Row gutter={12} align="middle">
                            <Col xs={24} md={8}>
                                <Select placeholder="Select User" showSearch value={userId} onChange={setUserId}
                                    optionFilterProp="label" style={{ width: "100%" }} allowClear
                                    options={users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))}
                                    suffixIcon={<UserOutlined />} />
                            </Col>
                            <Col xs={24} md={8}>
                                <Select placeholder="Select Object" showSearch value={objectName} onChange={setObjectName}
                                    optionFilterProp="label" style={{ width: "100%" }} allowClear
                                    options={objectList.map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))}
                                    suffixIcon={<AppstoreOutlined />} />
                            </Col>
                            <Col xs={24} md={8}>
                                <Space>
                                    <Button type="primary" icon={<SearchOutlined />} disabled={!userId || !objectName}
                                        onClick={() => { /* already reactive */ }}>Analyze Access</Button>
                                    <Tooltip title="Compare with another user">
                                        <Button icon={<SwapOutlined />} onClick={() => setShowCompare(!showCompare)}
                                            type={showCompare ? "primary" : "default"}>Compare</Button>
                                    </Tooltip>
                                </Space>
                            </Col>
                        </Row>
                        {showCompare && (
                            <Row style={{ marginTop: 10 }}>
                                <Col xs={24} md={8}>
                                    <Select placeholder="Compare User" showSearch value={compareUserId} onChange={setCompareUserId}
                                        optionFilterProp="label" style={{ width: "100%" }} allowClear
                                        options={users.filter(u => u.id !== userId).map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))}
                                        suffixIcon={<UserOutlined />} />
                                </Col>
                            </Row>
                        )}
                    </Card>
                </motion.div>

                {analysis && objectName && (
                    <>
                        {/* ── Effective Access Summary ── */}
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                            <Row gutter={12} style={{ marginBottom: 16 }}>
                                <Col xs={24} md={showCompare && compareAnalysis ? 12 : 24}>
                                    {renderEffectiveSummary(analysis.effective, user?.name || "User", { profile: analysis.profile?.name, psCount: analysis.psList.length })}
                                </Col>
                                {showCompare && compareAnalysis && (
                                    <Col xs={24} md={12}>
                                        {renderEffectiveSummary(compareAnalysis.effective, compareUser?.name || "Compare User", { profile: compareAnalysis.profile?.name, psCount: compareAnalysis.psList.length })}
                                    </Col>
                                )}
                            </Row>
                        </motion.div>

                        {/* ── Comparison Diff ── */}
                        {showCompare && compareAnalysis && (
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                                <Card size="small" title={<Space><SwapOutlined /> Access Differences</Space>} style={{ ...glassCard, marginBottom: 16 }}>
                                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                                        {CRUD_KEYS.map(k => {
                                            const a = analysis.effective[k], b = compareAnalysis.effective[k];
                                            const diff = a !== b;
                                            return (
                                                <div key={k} style={{ textAlign: "center", padding: "6px 14px", borderRadius: 8, background: diff ? (isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.06)") : "transparent" }}>
                                                    <Text style={{ fontSize: 11 }}>{CRUD_LABELS[k]}</Text>
                                                    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 4 }}>
                                                        <CrudBadge val={a} /><Text type="secondary">vs</Text><CrudBadge val={b} />
                                                    </div>
                                                    {diff && <Tag color="red" style={{ marginTop: 4, fontSize: 10 }}>DIFF</Tag>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {/* ── Permission Resolution Waterfall ── */}
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <Card size="small" title={<Space><ThunderboltOutlined /> Permission Resolution Waterfall</Space>} style={{ ...glassCard, marginBottom: 16 }}>
                                <div style={{ position: "relative", paddingLeft: 28 }}>
                                    <div style={{ position: "absolute", left: 13, top: 0, bottom: 0, width: 2, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }} />
                                    {waterfallSteps.map((step, i) => (
                                        <motion.div key={step.num} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 + i * 0.06 }}
                                            style={{ position: "relative", marginBottom: i < waterfallSteps.length - 1 ? 16 : 0 }}>
                                            <div style={{ position: "absolute", left: -22, top: 8, width: 20, height: 20, borderRadius: "50%", background: step.grants ? "#22c55e" : (isDark ? "#444" : "#e5e7eb"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: step.grants ? "#fff" : "#999", fontWeight: 700 }}>
                                                {step.num}
                                            </div>
                                            <Card size="small" style={{ ...glassCard, borderLeft: `3px solid ${step.grants ? "#22c55e" : (isDark ? "#555" : "#d1d5db")}` }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                                                    <Space><span style={{ fontSize: 16 }}>{step.icon}</span><Text strong>{step.name}</Text></Space>
                                                    <Tag color={step.grants ? "success" : "default"}>{step.grants ? "Grants access" : "No additional access"}</Tag>
                                                </div>
                                                <div style={{ marginTop: 6, fontSize: 12 }}>
                                                    <Text type="secondary">Source:</Text> <Text>{step.source}</Text>
                                                </div>
                                                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                                                    {CRUD_KEYS.filter(k => step.crud[k]).map(k => <Tag key={k} color="green" style={{ fontSize: 11 }}>{CRUD_LABELS[k]}</Tag>)}
                                                    {!crudHasAny(step.crud) && <Tag style={{ fontSize: 11 }}>None</Tag>}
                                                </div>
                                                <div style={{ marginTop: 6, fontSize: 11, color: isDark ? "#888" : "#999" }}>
                                                    Cumulative: {CRUD_KEYS.filter(k => step.cumulative[k]).map(k => CRUD_LABELS[k]).join(", ") || "None"}
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>

                        {/* ── Permission Matrix ── */}
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                            <Card size="small" title={<Space><AppstoreOutlined /> Full Object Permission Matrix</Space>} style={{ ...glassCard, marginBottom: 16 }}>
                                <Table columns={matrixCols} dataSource={fullMatrix} pagination={false} size="small" bordered scroll={{ x: 700, y: 340 }}
                                    locale={{ emptyText: "No objects available" }} />
                            </Card>
                        </motion.div>

                        {/* ── System Permissions ── */}
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
                            <Card size="small" title={<Space><SafetyOutlined /> System Permissions</Space>}
                                extra={<Switch size="small" checkedChildren="All" unCheckedChildren="Granted" checked={showAllSys} onChange={setShowAllSys} />}
                                style={{ ...glassCard, marginBottom: 16 }}>
                                <Collapse ghost size="small" items={Object.entries(SYS_PERM_CATEGORIES).map(([cat, perms]) => {
                                    const items = perms.map(p => ({ name: p, granted: analysis.sysPerms.includes(p), source: profiles.find(pr => parseSysPerms(pr.systemPermissions).includes(p))?.name || permSets.find(ps => parseSysPerms(ps.systemPermissions).includes(p))?.name || "—" }));
                                    const filtered = showAllSys ? items : items.filter(i => i.granted);
                                    return {
                                        key: cat,
                                        label: <Space><Text strong>{cat}</Text><Badge count={items.filter(i => i.granted).length} style={{ background: themeColor }} /></Space>,
                                        children: filtered.length === 0 ? <Text type="secondary">No permissions</Text> : (
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                                {filtered.map(p => (
                                                    <Tag key={p.name} color={p.granted ? "green" : "default"} style={{ margin: 0 }}>
                                                        {p.granted ? <CheckCircleFilled /> : <CloseCircleFilled />} {p.name}
                                                        <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>({p.source})</Text>
                                                    </Tag>
                                                ))}
                                            </div>
                                        ),
                                    };
                                })} />
                            </Card>
                        </motion.div>

                        {/* ── Comparison Matrix (side-by-side all objects) ── */}
                        {showCompare && compareAnalysis && comparisonMatrix.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }}>
                                <Card size="small" title={<Space><SwapOutlined /> Full Comparison Matrix</Space>}
                                    style={{ ...glassCard, marginBottom: 16 }}>
                                    <Table size="small" bordered pagination={false} scroll={{ x: 900, y: 300 }}
                                        dataSource={comparisonMatrix}
                                        columns={[
                                            { title: "Object", dataIndex: "object", key: "object", width: 130, fixed: "left",
                                                render: (v: string, rec: any) => (
                                                    <Space>
                                                        <Text strong style={{ textTransform: "capitalize" }}>{v}</Text>
                                                        {rec.hasDiff && <Badge dot color="red" />}
                                                    </Space>
                                                ) },
                                            ...CRUD_KEYS.flatMap(k => [
                                                { title: <Tooltip title={`${user?.name} — ${CRUD_LABELS[k]}`}><Text style={{ fontSize: 11 }}>A</Text></Tooltip>,
                                                    key: `a_${k}`, width: 48, align: "center" as const,
                                                    render: (_: any, rec: any) => {
                                                        const diff = rec.a[k] !== rec.b[k];
                                                        return <span style={diff ? { background: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)", borderRadius: 4, padding: 2 } : {}}><CrudBadge val={rec.a[k]} /></span>;
                                                    } },
                                                { title: <Tooltip title={`${compareUser?.name} — ${CRUD_LABELS[k]}`}><Text style={{ fontSize: 11 }}>B</Text></Tooltip>,
                                                    key: `b_${k}`, width: 48, align: "center" as const,
                                                    render: (_: any, rec: any) => {
                                                        const diff = rec.a[k] !== rec.b[k];
                                                        return <span style={diff ? { background: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)", borderRadius: 4, padding: 2 } : {}}><CrudBadge val={rec.b[k]} /></span>;
                                                    } },
                                            ]),
                                        ]} />
                                    <div style={{ marginTop: 8, fontSize: 11, color: isDark ? "#888" : "#999" }}>
                                        <Text type="secondary">A = {user?.name} | B = {compareUser?.name} | </Text>
                                        <Badge dot color="red" /> <Text type="secondary">= differences found</Text>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {/* ── Role Hierarchy Visualization ── */}
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card size="small" title={<Space><ApartmentOutlined /> Role Hierarchy</Space>} style={{ ...glassCard }}>
                                {analysis.role ? (
                                    <Row gutter={16}>
                                        <Col xs={24} md={8}>
                                            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: "block" }}>Path to Top</Text>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                                {buildHierarchyPath(analysis.role.id).map((r, i) => (
                                                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: i * 16 }}>
                                                        {i > 0 && <DownOutlined style={{ fontSize: 9, color: "#999" }} />}
                                                        <Tag color={r.id === analysis.role!.id ? themeColor : "default"}
                                                            style={r.id === analysis.role!.id ? { border: `2px solid ${themeColor}`, fontWeight: 700, boxShadow: `0 0 8px ${themeColor}33` } : { cursor: "pointer" }}
                                                            onClick={() => setSelectedRoleId(r.id)}
                                                            icon={i === 0 ? <CrownOutlined /> : <ApartmentOutlined />}>
                                                            {r.name}
                                                        </Tag>
                                                    </div>
                                                ))}
                                            </div>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: "block" }}>Direct Reports ({directReports(analysis.role.id).length})</Text>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                {directReports(analysis.role.id).length > 0
                                                    ? directReports(analysis.role.id).map(r => (
                                                        <Tag key={r.id} onClick={() => setSelectedRoleId(r.id)}
                                                            style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                                                            icon={<ApartmentOutlined />}>
                                                            {r.name}
                                                            <Badge count={roleUsers(r.name).length} size="small"
                                                                style={{ background: "#8b5cf6", marginLeft: 4 }} />
                                                        </Tag>
                                                    ))
                                                    : <Text type="secondary" style={{ fontSize: 12 }}>No direct reports</Text>}
                                            </div>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: "block" }}>
                                                {selectedRoleId ? `Users in ${roles.find(r => r.id === selectedRoleId)?.name}` : "Click a role to see users"}
                                            </Text>
                                            {selectedRoleId ? (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                    {roleUsers(roles.find(r => r.id === selectedRoleId)?.name || "").map(u => (
                                                        <Tag key={u.id} icon={<UserOutlined />}
                                                            color={u.id === userId ? themeColor : "default"}
                                                            style={u.id === userId ? { fontWeight: 600 } : {}}>
                                                            {u.name} <Text type="secondary" style={{ fontSize: 10 }}>({u.email})</Text>
                                                        </Tag>
                                                    ))}
                                                    {roleUsers(roles.find(r => r.id === selectedRoleId)?.name || "").length === 0 && (
                                                        <Text type="secondary" style={{ fontSize: 12 }}>No users assigned to this role</Text>
                                                    )}
                                                </div>
                                            ) : (
                                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="" style={{ margin: 0 }} />
                                            )}
                                        </Col>
                                    </Row>
                                ) : <Empty description="No role assigned to this user" />}
                            </Card>
                        </motion.div>
                    </>
                )}

                {!analysis && !loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 60 }}>
                        <Empty description="Select a user and object above to analyze access permissions" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    </motion.div>
                )}
            </Spin>
        </CMSLayout>
    );
}
