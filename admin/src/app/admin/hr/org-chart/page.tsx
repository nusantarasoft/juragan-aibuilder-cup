"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Segmented, Input, Select, Tag, Button, Space, Typography, Spin, Row, Col, Statistic, Drawer, Avatar, Badge, Tooltip, Table, theme } from "antd";
import {
  ApartmentOutlined, TeamOutlined, UserOutlined, SearchOutlined,
  ZoomInOutlined, ZoomOutOutlined, ExpandOutlined, UnorderedListOutlined,
  AppstoreOutlined, MailOutlined, PhoneOutlined, CalendarOutlined,
  DownOutlined, RightOutlined, NodeIndexOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";

const { Text } = Typography;

const GET_DEPARTMENTS = `query($t:String!){hrDepartments(tenantId:$t){id name code description parentId headEmployeeId costCenter status}}`;
const GET_EMPLOYEES = `query($t:String!){hrEmployees(tenantId:$t){id firstName lastName email position departmentId employeeType status joinDate phone profilePicture tags}}`;
const GET_POSITIONS = `query($t:String!){hrPositions(tenantId:$t){id title code departmentId grade}}`;

/* ── helpers ── */
const hashColor = (s: string) => {
  let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  const colors = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ec4899','#06b6d4','#ef4444','#6366f1','#14b8a6','#f97316'];
  return colors[Math.abs(h) % colors.length];
};
const statusDot: Record<string, { color: string; label: string }> = {
  active: { color: '#10b981', label: 'Active' },
  probation: { color: '#f97316', label: 'Probation' },
  on_leave: { color: '#eab308', label: 'On Leave' },
  resigned: { color: '#ef4444', label: 'Resigned' },
};
type Dept = { id: string; name: string; code?: string; description?: string; parentId?: string; headEmployeeId?: string; costCenter?: string; status?: string };
type Emp = { id: string; firstName: string; lastName: string; email?: string; position?: string; departmentId?: string; employeeType?: string; status?: string; joinDate?: string; phone?: string; profilePicture?: string; tags?: string[] };
type Pos = { id: string; title: string; code?: string; departmentId?: string; grade?: string };

interface TreeNode { dept: Dept; head?: Emp; members: Emp[]; children: TreeNode[]; depth: number }

function buildTree(departments: Dept[], employees: Emp[], parentId?: string, depth = 0): TreeNode[] {
  return departments
    .filter(d => (parentId ? d.parentId === parentId : !d.parentId || !departments.find(p => p.id === d.parentId)))
    .map(d => {
      const members = employees.filter(e => e.departmentId === d.id);
      const head = d.headEmployeeId ? members.find(e => e.id === d.headEmployeeId) || members[0] : members[0];
      return { dept: d, head, members, children: buildTree(departments, employees, d.id, depth + 1), depth };
    });
}

function getDepth(nodes: TreeNode[]): number {
  if (!nodes.length) return 0;
  return 1 + Math.max(...nodes.map(n => getDepth(n.children)), 0);
}

/* ── OrgNode (recursive tree card) ── */
function OrgNode({ node, themeColor, glass, search, onSelect, onDetail, selectedId, defaultExpand }: {
  node: TreeNode; themeColor: string; glass: React.CSSProperties; search: string;
  onSelect: (id: string) => void; onDetail: (emp: Emp) => void; selectedId: string; defaultExpand: number;
}) {
  const [expanded, setExpanded] = useState(node.depth < defaultExpand);
  const hasChildren = node.children.length > 0;
  const directReports = node.members.filter(e => e.id !== node.head?.id);
  const isMatch = search && (node.head?.firstName?.toLowerCase().includes(search) || node.head?.lastName?.toLowerCase().includes(search) || node.dept.name.toLowerCase().includes(search));
  const isSelected = selectedId === node.dept.id;
  const emp = node.head;
  const st = statusDot[emp?.status || ''] || statusDot.active;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {/* Node card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: node.depth * 0.08 }}
        whileHover={{ y: -3, boxShadow: `0 8px 24px ${themeColor}22` }}
        onClick={() => { onSelect(node.dept.id); if (hasChildren) setExpanded(!expanded); }}
        onDoubleClick={() => emp && onDetail(emp)}
        style={{
          ...glass, padding: '12px 16px', minWidth: 180, maxWidth: 220, cursor: 'pointer',
          position: 'relative', textAlign: 'center',
          border: isSelected ? `2px solid ${themeColor}` : isMatch ? `2px solid #f59e0b` : glass.border,
          boxShadow: isSelected ? `0 0 16px ${themeColor}33` : undefined,
        }}
      >
        {/* Status dot */}
        <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: st.color }} />
        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          {emp?.profilePicture ? (
            <Avatar size={44} src={emp.profilePicture} />
          ) : (
            <Avatar size={44} style={{ background: hashColor(emp ? `${emp.firstName}${emp.lastName}` : node.dept.name), fontWeight: 700, fontSize: 16 }}>
              {emp ? `${emp.firstName[0]}${emp.lastName[0]}` : node.dept.name[0]}
            </Avatar>
          )}
        </div>
        {/* Name */}
        <Text strong style={{ fontSize: 13, display: 'block', lineHeight: 1.2 }}>
          {emp ? `${emp.firstName} ${emp.lastName}` : node.dept.name}
        </Text>
        {/* Position */}
        <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{emp?.position || '—'}</Text>
        {/* Department tag */}
        <Tag color={themeColor} style={{ borderRadius: 10, fontSize: 9, marginTop: 4 }}>{node.dept.name}</Tag>
        {/* Headcount badge */}
        <Badge count={node.members.length} style={{ backgroundColor: themeColor, position: 'absolute', top: -6, left: -6, fontSize: 10 }} showZero />
        {/* Expand toggle */}
        {hasChildren && (
          <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', zIndex: 2,
            width: 20, height: 20, borderRadius: '50%', background: themeColor, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
            {expanded ? <DownOutlined /> : <RightOutlined />}
          </div>
        )}
      </motion.div>

      {/* Direct reports (non-head employees) */}
      <AnimatePresence>
        {expanded && directReports.length > 0 && !hasChildren && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 20 }}>
            {directReports.slice(0, 5).map(dr => {
              const drs = statusDot[dr.status || ''] || statusDot.active;
              return (
                <motion.div key={dr.id} whileHover={{ x: 2 }} onClick={() => onDetail(dr)}
                  style={{ ...glass, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 160, borderLeft: `3px solid ${themeColor}44` }}>
                  <Avatar size={24} style={{ background: hashColor(`${dr.firstName}${dr.lastName}`), fontSize: 9 }}>{dr.firstName[0]}{dr.lastName[0]}</Avatar>
                  <div>
                    <Text style={{ fontSize: 11, fontWeight: 500 }}>{dr.firstName} {dr.lastName}</Text>
                    <Text type="secondary" style={{ fontSize: 9, display: 'block' }}>{dr.position || '—'}</Text>
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: drs.color, marginLeft: 'auto' }} />
                </motion.div>
              );
            })}
            {directReports.length > 5 && <Text type="secondary" style={{ fontSize: 10 }}>+{directReports.length - 5} more</Text>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Child department branches */}
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            {/* SVG connector */}
            <svg width="100%" height="32" style={{ display: 'block', overflow: 'visible' }}>
              <line x1="50%" y1="0" x2="50%" y2="32" stroke={`${themeColor}44`} strokeWidth="2" />
            </svg>
            <div style={{ display: 'flex', gap: 20, position: 'relative', justifyContent: 'center' }}>
              {/* Horizontal connector */}
              {node.children.length > 1 && (
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 2, overflow: 'visible' }}>
                  <line x1="15%" y1="1" x2="85%" y2="1" stroke={`${themeColor}33`} strokeWidth="2" />
                </svg>
              )}
              {node.children.map(child => (
                <div key={child.dept.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <svg width="2" height="16"><line x1="1" y1="0" x2="1" y2="16" stroke={`${themeColor}33`} strokeWidth="2" /></svg>
                  <OrgNode node={child} themeColor={themeColor} glass={glass} search={search}
                    onSelect={onSelect} onDetail={onDetail} selectedId={selectedId} defaultExpand={defaultExpand} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main Page ── */
export default function OrgChartPage() {
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [positions, setPositions] = useState<Pos[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<string>('tree');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [selectedId, setSelectedId] = useState('');
  const [drawerEmp, setDrawerEmp] = useState<Emp | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { themeColor } = usePreferencesStore();
  const { token: antToken } = theme.useToken();
  const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
  const glass = {
    background: isDark ? 'rgba(30,30,30,0.75)' : 'rgba(255,255,255,0.65)',
    backdropFilter: 'blur(12px)',
    border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.45)',
    borderRadius: 14,
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      gql(GET_DEPARTMENTS, { t: DEFAULT_TENANT_ID }),
      gql(GET_EMPLOYEES, { t: DEFAULT_TENANT_ID }),
      gql(GET_POSITIONS, { t: DEFAULT_TENANT_ID }),
    ]).then(([d, e, p]: any[]) => {
      setDepartments(d.hrDepartments || []);
      setEmployees(e.hrEmployees || []);
      setPositions(p.hrPositions || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  /* filtered employees */
  const filteredEmps = useMemo(() => {
    let list = [...employees];
    if (statusFilter) list = list.filter(e => e.status === statusFilter);
    if (deptFilter) list = list.filter(e => e.departmentId === deptFilter);
    return list;
  }, [employees, statusFilter, deptFilter]);

  const tree = useMemo(() => {
    const depts = deptFilter ? departments.filter(d => d.id === deptFilter || d.parentId === deptFilter) : departments;
    return buildTree(depts, filteredEmps);
  }, [departments, filteredEmps, deptFilter]);

  const maxDepth = useMemo(() => getDepth(tree), [tree]);
  const avgTeam = departments.length > 0 ? Math.round(employees.length / departments.length) : 0;

  /* zoom / pan */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)));
  }, []);
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  }, [pan]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: dragStart.current.px + (e.clientX - dragStart.current.x), y: dragStart.current.py + (e.clientY - dragStart.current.y) });
  }, [dragging]);
  const handleMouseUp = useCallback(() => setDragging(false), []);
  const fitScreen = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  /* drawer helpers */
  const getHead = (deptId?: string) => {
    const dept = departments.find(d => d.id === deptId);
    if (!dept?.headEmployeeId) return null;
    return employees.find(e => e.id === dept.headEmployeeId);
  };
  const directReports = (emp: Emp) => employees.filter(e => e.departmentId === emp.departmentId && e.id !== emp.id);
  const posTitle = (emp: Emp) => positions.find(p => p.departmentId === emp.departmentId)?.title || emp.position || '—';

  /* list view with indentation */
  const flatList = useMemo(() => {
    const rows: { emp: Emp; dept: Dept; level: number }[] = [];
    const walk = (nodes: TreeNode[], lvl: number) => {
      nodes.forEach(n => {
        n.members.forEach(m => rows.push({ emp: m, dept: n.dept, level: lvl }));
        walk(n.children, lvl + 1);
      });
    };
    walk(tree, 0);
    return search ? rows.filter(r => `${r.emp.firstName} ${r.emp.lastName}`.toLowerCase().includes(search.toLowerCase())) : rows;
  }, [tree, search]);

  const listColumns = [
    { title: 'Employee', key: 'name', render: (_: any, r: any) => (
      <Space style={{ paddingLeft: r.level * 24 }}>
        <Avatar size={30} style={{ background: hashColor(`${r.emp.firstName}${r.emp.lastName}`), fontSize: 11 }}>
          {r.emp.firstName[0]}{r.emp.lastName[0]}
        </Avatar>
        <div>
          <Text strong style={{ fontSize: 13 }}>{r.emp.firstName} {r.emp.lastName}</Text>
          <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{r.emp.position || '—'}</Text>
        </div>
      </Space>
    )},
    { title: 'Department', key: 'dept', render: (_: any, r: any) => <Tag style={{ borderRadius: 10 }}>{r.dept.name}</Tag> },
    { title: 'Status', key: 'status', render: (_: any, r: any) => {
      const s = statusDot[r.emp.status || ''] || statusDot.active;
      return <Tag color={s.color} style={{ borderRadius: 10 }}><span style={{ marginRight: 4 }}>●</span>{s.label}</Tag>;
    }},
    { title: 'Type', dataIndex: ['emp', 'employeeType'], key: 'type', render: (v: string) => v || '—' },
    { title: 'Joined', dataIndex: ['emp', 'joinDate'], key: 'join', render: (v: string) => v ? new Date(v).toLocaleDateString() : '—' },
  ];

  const searchLower = search.toLowerCase();

  return (
    <CMSLayout
      title={<AuroraText colors={[themeColor, '#8b5cf6', '#3b82f6', themeColor]} className="text-[22px] font-bold tracking-tight">Organization Chart</AuroraText>}
      subTitle={<DecryptedText text="Interactive org hierarchy & team structure" animateOn="view" revealDirection="start" speed={60} sequential />}
      extra={[
        <Space key="controls" wrap>
          <Input prefix={<SearchOutlined />} placeholder="Search employee…" allowClear size="small" style={{ width: 180 }}
            onChange={e => setSearch(e.target.value)} />
          <Select placeholder="Department" allowClear size="small" style={{ width: 150 }}
            value={deptFilter} onChange={v => setDeptFilter(v)}
            options={departments.map(d => ({ label: d.name, value: d.id }))} />
          <Select placeholder="Status" allowClear size="small" style={{ width: 120 }}
            value={statusFilter} onChange={v => setStatusFilter(v)}
            options={[{ label: 'Active', value: 'active' }, { label: 'Probation', value: 'probation' }, { label: 'On Leave', value: 'on_leave' }, { label: 'Resigned', value: 'resigned' }]} />
          <Segmented size="small" value={viewMode} onChange={(v: any) => setViewMode(v)}
            options={[
              { label: <><ApartmentOutlined /> Tree</>, value: 'tree' },
              { label: <><UnorderedListOutlined /> List</>, value: 'list' },
              { label: <><AppstoreOutlined /> Grid</>, value: 'grid' },
            ]} />
        </Space>,
      ]}
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Stats */}
        <Row gutter={[12, 12]}>
          {[
            { label: 'Total Employees', value: employees.length, color: '#3b82f6', icon: <TeamOutlined /> },
            { label: 'Departments', value: departments.length, color: '#8b5cf6', icon: <ApartmentOutlined /> },
            { label: 'Avg Team Size', value: avgTeam, color: '#10b981', icon: <UserOutlined /> },
            { label: 'Deepest Level', value: maxDepth, color: '#f59e0b', icon: <NodeIndexOutlined /> },
          ].map((s, i) => (
            <Col xs={12} sm={6} key={i}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                  <Statistic title={s.label} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
        ) : viewMode === 'tree' ? (
          /* ── TREE VIEW ── */
          <Card style={{ ...glass, overflow: 'hidden', position: 'relative' }}
            title={<Space><ApartmentOutlined /> <Text strong>Organization Tree</Text></Space>}
            extra={
              <Space size={4}>
                <Tooltip title="Zoom In"><Button size="small" icon={<ZoomInOutlined />} onClick={() => setZoom(z => Math.min(2, z + 0.15))} /></Tooltip>
                <Tooltip title="Zoom Out"><Button size="small" icon={<ZoomOutOutlined />} onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} /></Tooltip>
                <Tooltip title="Fit to Screen"><Button size="small" icon={<ExpandOutlined />} onClick={fitScreen} /></Tooltip>
                <Tag>{Math.round(zoom * 100)}%</Tag>
              </Space>
            }
          >
            <div ref={containerRef}
              onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
              style={{ overflow: 'hidden', minHeight: 400, cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none' }}
            >
              <div style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'top center', transition: dragging ? 'none' : 'transform 0.2s',
                display: 'flex', justifyContent: 'center', gap: 32, padding: '24px 16px',
                minWidth: tree.length * 260,
              }}>
                {tree.map(node => (
                  <OrgNode key={node.dept.id} node={node} themeColor={themeColor} glass={glass}
                    search={searchLower} onSelect={setSelectedId} onDetail={emp => setDrawerEmp(emp)}
                    selectedId={selectedId} defaultExpand={3} />
                ))}
                {tree.length === 0 && <Text type="secondary" style={{ padding: 40 }}>No departments found</Text>}
              </div>
            </div>
          </Card>
        ) : viewMode === 'list' ? (
          /* ── LIST VIEW ── */
          <Card style={glass}>
            <Table dataSource={flatList} columns={listColumns} rowKey={(r: any) => r.emp.id}
              pagination={false} size="middle" scroll={{ x: 700 }}
              onRow={(r: any) => ({ onDoubleClick: () => setDrawerEmp(r.emp) })} />
          </Card>
        ) : (
          /* ── DEPARTMENT GRID VIEW ── */
          <Row gutter={[16, 16]}>
            {departments.map((dept, i) => {
              const deptEmps = employees.filter(e => e.departmentId === dept.id);
              const head = dept.headEmployeeId ? deptEmps.find(e => e.id === dept.headEmployeeId) : deptEmps[0];
              const childDepts = departments.filter(d => d.parentId === dept.id);
              return (
                <Col xs={24} sm={12} md={8} lg={6} key={dept.id}>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card style={{ ...glass, height: '100%', borderTop: `3px solid ${hashColor(dept.name)}` }}
                      hoverable size="small">
                      <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ fontSize: 14 }}>{dept.name}</Text>
                          {dept.code && <Tag color={hashColor(dept.name)} style={{ borderRadius: 10, fontSize: 9 }}>{dept.code}</Tag>}
                        </div>
                        {dept.description && <Text type="secondary" style={{ fontSize: 11 }}>{dept.description}</Text>}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Badge count={deptEmps.length} style={{ backgroundColor: themeColor }} showZero>
                            <Tag icon={<TeamOutlined />} style={{ borderRadius: 10 }}>Members</Tag>
                          </Badge>
                          {childDepts.length > 0 && (
                            <Badge count={childDepts.length} style={{ backgroundColor: '#8b5cf6' }}>
                              <Tag icon={<ApartmentOutlined />} style={{ borderRadius: 10 }}>Sub-depts</Tag>
                            </Badge>
                          )}
                        </div>
                        {dept.costCenter && <Text type="secondary" style={{ fontSize: 10 }}>Cost Center: {dept.costCenter}</Text>}
                        {head && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer' }}
                            onClick={() => setDrawerEmp(head)}>
                            <Avatar size={28} style={{ background: hashColor(`${head.firstName}${head.lastName}`), fontSize: 10 }}>
                              {head.firstName[0]}{head.lastName[0]}
                            </Avatar>
                            <div>
                              <Text style={{ fontSize: 11, fontWeight: 600 }}>{head.firstName} {head.lastName}</Text>
                              <Text type="secondary" style={{ fontSize: 9, display: 'block' }}>Head</Text>
                            </div>
                          </div>
                        )}
                        <Tag color={dept.status === 'active' ? 'green' : 'default'} style={{ borderRadius: 10 }}>
                          {dept.status || 'active'}
                        </Tag>
                      </Space>
                    </Card>
                  </motion.div>
                </Col>
              );
            })}
          </Row>
        )}
      </motion.div>

      {/* ── Employee Detail Drawer ── */}
      <Drawer title="Employee Details" open={!!drawerEmp} onClose={() => setDrawerEmp(null)} width={380}>
        {drawerEmp && (() => {
          const emp = drawerEmp;
          const st = statusDot[emp.status || ''] || statusDot.active;
          const reportsTo = getHead(emp.departmentId);
          const reports = directReports(emp);
          const dept = departments.find(d => d.id === emp.departmentId);
          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header */}
              <div style={{ textAlign: 'center' }}>
                {emp.profilePicture ? (
                  <Avatar size={72} src={emp.profilePicture} />
                ) : (
                  <Avatar size={72} style={{ background: hashColor(`${emp.firstName}${emp.lastName}`), fontSize: 24, fontWeight: 700 }}>
                    {emp.firstName[0]}{emp.lastName[0]}
                  </Avatar>
                )}
                <div style={{ marginTop: 8 }}>
                  <Text strong style={{ fontSize: 18, display: 'block' }}>{emp.firstName} {emp.lastName}</Text>
                  <Text type="secondary">{posTitle(emp)}</Text>
                </div>
                <Tag color={st.color} style={{ borderRadius: 10, marginTop: 6 }}><span style={{ marginRight: 4 }}>●</span>{st.label}</Tag>
              </div>
              {/* Info */}
              <Card size="small" style={{ ...glass, borderRadius: 12 }}>
                <Space direction="vertical" style={{ width: '100%' }} size={6}>
                  {emp.email && <Space><MailOutlined style={{ color: '#3b82f6' }} /><Text copyable style={{ fontSize: 12 }}>{emp.email}</Text></Space>}
                  {emp.phone && <Space><PhoneOutlined style={{ color: '#10b981' }} /><Text style={{ fontSize: 12 }}>{emp.phone}</Text></Space>}
                  {emp.joinDate && <Space><CalendarOutlined style={{ color: '#f59e0b' }} /><Text style={{ fontSize: 12 }}>Joined {new Date(emp.joinDate).toLocaleDateString()}</Text></Space>}
                  {dept && <Space><ApartmentOutlined style={{ color: '#8b5cf6' }} /><Tag style={{ borderRadius: 10 }}>{dept.name}</Tag></Space>}
                  {emp.employeeType && <Space><UserOutlined style={{ color: '#ec4899' }} /><Text style={{ fontSize: 12 }}>{emp.employeeType}</Text></Space>}
                </Space>
              </Card>
              {/* Reports To */}
              {reportsTo && reportsTo.id !== emp.id && (
                <Card size="small" style={{ ...glass, borderRadius: 12 }} title={<Text style={{ fontSize: 12, fontWeight: 600 }}>Reports To</Text>}>
                  <Space style={{ cursor: 'pointer' }} onClick={() => setDrawerEmp(reportsTo)}>
                    <Avatar size={28} style={{ background: hashColor(`${reportsTo.firstName}${reportsTo.lastName}`), fontSize: 10 }}>
                      {reportsTo.firstName[0]}{reportsTo.lastName[0]}
                    </Avatar>
                    <Text style={{ fontSize: 12 }}>{reportsTo.firstName} {reportsTo.lastName}</Text>
                  </Space>
                </Card>
              )}
              {/* Direct Reports */}
              <Card size="small" style={{ ...glass, borderRadius: 12 }}
                title={<Text style={{ fontSize: 12, fontWeight: 600 }}>Direct Reports ({reports.length})</Text>}>
                {reports.length > 0 ? (
                  <Space direction="vertical" style={{ width: '100%' }} size={4}>
                    {reports.slice(0, 8).map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '2px 0' }}
                        onClick={() => setDrawerEmp(r)}>
                        <Avatar size={22} style={{ background: hashColor(`${r.firstName}${r.lastName}`), fontSize: 8 }}>
                          {r.firstName[0]}{r.lastName[0]}
                        </Avatar>
                        <Text style={{ fontSize: 11 }}>{r.firstName} {r.lastName}</Text>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: (statusDot[r.status || ''] || statusDot.active).color, marginLeft: 'auto' }} />
                      </div>
                    ))}
                    {reports.length > 8 && <Text type="secondary" style={{ fontSize: 10 }}>+{reports.length - 8} more</Text>}
                  </Space>
                ) : <Text type="secondary" style={{ fontSize: 11 }}>No direct reports</Text>}
              </Card>
              {/* Tags */}
              {emp.tags && emp.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {emp.tags.map((t: string, i: number) => <Tag key={i} color={themeColor} style={{ borderRadius: 10, fontSize: 10 }}>{t}</Tag>)}
                </div>
              )}
            </motion.div>
          );
        })()}
      </Drawer>
    </CMSLayout>
  );
}
