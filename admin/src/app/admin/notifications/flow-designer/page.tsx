"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Button, Tag, Space, Input, Select, Card, Tooltip, message, Typography, InputNumber,
    Drawer, Dropdown, Switch, Badge, Statistic, Row, Col, theme,
} from "antd";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusOutlined, DeleteOutlined, ZoomInOutlined, ZoomOutOutlined, ExpandOutlined,
    ThunderboltOutlined, BranchesOutlined, MailOutlined, MessageOutlined, ApiOutlined,
    BellOutlined, ClockCircleOutlined, FileTextOutlined, CaretRightOutlined,
    MenuFoldOutlined, MenuUnfoldOutlined, SettingOutlined, PlayCircleOutlined,
    CheckCircleOutlined, AimOutlined, UndoOutlined, RedoOutlined, AppstoreOutlined,
    BorderOutlined, RocketOutlined, AlertOutlined, ShoppingCartOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

const { Text } = Typography;

/* ── Types ───────────────────────────────────────────── */
interface FlowNode { id: string; type: 'trigger' | 'condition' | 'channel' | 'template' | 'delay'; x: number; y: number; label: string; config: Record<string, any>; }
interface FlowEdge { from: string; to: string; }
interface Flow { id: string; name: string; active: boolean; nodes: FlowNode[]; edges: FlowEdge[]; createdAt: string; }

/* ── Constants ───────────────────────────────────────── */
const NODE_COLORS: Record<string, string> = { trigger: '#22c55e', condition: '#eab308', channel: '#3b82f6', template: '#8b5cf6', delay: '#6b7280' };
const NODE_ICONS: Record<string, React.ReactNode> = {
    trigger: <ThunderboltOutlined />, condition: <BranchesOutlined />, channel: <MailOutlined />,
    template: <FileTextOutlined />, delay: <ClockCircleOutlined />,
};

const PALETTE_ITEMS = [
    { cat: 'Triggers', items: [
        { type: 'trigger' as const, label: 'ITSM · Ticket Created', config: { module: 'itsm', event: 'ticket.created' } },
        { type: 'trigger' as const, label: 'HR · Leave Approved', config: { module: 'hr', event: 'leave.approved' } },
        { type: 'trigger' as const, label: 'Ecommerce · Order Placed', config: { module: 'ecommerce', event: 'order.placed' } },
        { type: 'trigger' as const, label: 'CRM · Deal Closed', config: { module: 'crm', event: 'deal.closed' } },
        { type: 'trigger' as const, label: 'PM · Task Overdue', config: { module: 'pm', event: 'task.overdue' } },
    ]},
    { cat: 'Conditions', items: [
        { type: 'condition' as const, label: 'If Priority == High', config: { field: 'priority', op: '==', value: 'high' } },
        { type: 'condition' as const, label: 'If Amount > 1000', config: { field: 'amount', op: '>', value: '1000' } },
        { type: 'condition' as const, label: 'If Status == Critical', config: { field: 'status', op: '==', value: 'critical' } },
    ]},
    { cat: 'Channels', items: [
        { type: 'channel' as const, label: 'Send Email', config: { channelType: 'email' } },
        { type: 'channel' as const, label: 'Send WhatsApp', config: { channelType: 'whatsapp' } },
        { type: 'channel' as const, label: 'Send Webhook', config: { channelType: 'webhook' } },
        { type: 'channel' as const, label: 'In-App Notification', config: { channelType: 'in_app' } },
    ]},
    { cat: 'Templates', items: [
        { type: 'template' as const, label: 'Select Template', config: { templateId: '' } },
    ]},
    { cat: 'Timing', items: [
        { type: 'delay' as const, label: 'Delay 30 min', config: { minutes: 30 } },
        { type: 'delay' as const, label: 'Delay 1 hour', config: { minutes: 60 } },
        { type: 'delay' as const, label: 'Delay 24 hours', config: { minutes: 1440 } },
    ]},
];

const PRESET_FLOWS: { name: string; icon: React.ReactNode; desc: string; nodes: FlowNode[]; edges: FlowEdge[] }[] = [
    {
        name: 'Critical Incident Alert', icon: <AlertOutlined style={{ color: '#ef4444' }} />,
        desc: 'ITSM ticket created + priority critical → Email + WhatsApp',
        nodes: [
            { id: 'p1', type: 'trigger', x: 80, y: 160, label: 'ITSM · Ticket Created', config: { module: 'itsm', event: 'ticket.created' } },
            { id: 'p2', type: 'condition', x: 320, y: 160, label: 'Priority == Critical', config: { field: 'priority', op: '==', value: 'critical' } },
            { id: 'p3', type: 'channel', x: 560, y: 100, label: 'Send Email', config: { channelType: 'email' } },
            { id: 'p4', type: 'channel', x: 560, y: 240, label: 'Send WhatsApp', config: { channelType: 'whatsapp' } },
        ],
        edges: [{ from: 'p1', to: 'p2' }, { from: 'p2', to: 'p3' }, { from: 'p2', to: 'p4' }],
    },
    {
        name: 'Order Confirmation', icon: <ShoppingCartOutlined style={{ color: '#3b82f6' }} />,
        desc: 'Order placed → Email template → Delay 1hr → Feedback webhook',
        nodes: [
            { id: 'o1', type: 'trigger', x: 60, y: 160, label: 'Order Placed', config: { module: 'ecommerce', event: 'order.placed' } },
            { id: 'o2', type: 'template', x: 280, y: 160, label: 'Confirmation Email', config: { templateId: '' } },
            { id: 'o3', type: 'delay', x: 480, y: 160, label: 'Delay 1 hour', config: { minutes: 60 } },
            { id: 'o4', type: 'channel', x: 680, y: 160, label: 'Feedback Webhook', config: { channelType: 'webhook' } },
        ],
        edges: [{ from: 'o1', to: 'o2' }, { from: 'o2', to: 'o3' }, { from: 'o3', to: 'o4' }],
    },
    {
        name: 'Leave Approval Chain', icon: <RocketOutlined style={{ color: '#8b5cf6' }} />,
        desc: 'Leave requested → Manager email → Delay → Reminder',
        nodes: [
            { id: 'l1', type: 'trigger', x: 60, y: 160, label: 'Leave Requested', config: { module: 'hr', event: 'leave.requested' } },
            { id: 'l2', type: 'channel', x: 280, y: 160, label: 'Manager Email', config: { channelType: 'email' } },
            { id: 'l3', type: 'delay', x: 480, y: 160, label: 'Delay 24 hours', config: { minutes: 1440 } },
            { id: 'l4', type: 'channel', x: 680, y: 160, label: 'Reminder Email', config: { channelType: 'email' } },
        ],
        edges: [{ from: 'l1', to: 'l2' }, { from: 'l2', to: 'l3' }, { from: 'l3', to: 'l4' }],
    },
];

let _nid = 0;
const uid = () => `n_${Date.now()}_${++_nid}`;

export default function FlowDesignerPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const glassCard = isDark
        ? { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14 }
        : { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

    /* ── Remote data ─────────────────────────────────────── */
    const [channels, setChannels] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [rules, setRules] = useState<any[]>([]);

    const loadData = useCallback(async () => {
        try {
            const [chRes, tplRes, rRes] = await Promise.all([
                gql(`query($tenantId: String!) { notificationChannels(tenantId: $tenantId) { id name type config isActive } }`, { tenantId: DEFAULT_TENANT_ID }),
                gql(`query($tenantId: String!) { notificationTemplates(tenantId: $tenantId) { id name subject channel variables } }`, { tenantId: DEFAULT_TENANT_ID }),
                gql(`query($tenantId: String!) { notificationRules(tenantId: $tenantId) { id name module event channelId templateId conditions isActive priority } }`, { tenantId: DEFAULT_TENANT_ID }),
            ]);
            setChannels(chRes.notificationChannels || []);
            setTemplates(tplRes.notificationTemplates || []);
            setRules(rRes.notificationRules || []);
        } catch { /* silent – non-critical */ }
    }, []);
    useEffect(() => { loadData(); }, [loadData]);

    /* ── Flow state ──────────────────────────────────────── */
    const [flows, setFlows] = useState<Flow[]>([{ id: 'default', name: 'Untitled Flow', active: false, nodes: [], edges: [], createdAt: new Date().toISOString() }]);
    const [activeFlowId, setActiveFlowId] = useState('default');
    const flow = flows.find(f => f.id === activeFlowId)!;
    const setFlow = (patch: Partial<Flow>) => setFlows(prev => prev.map(f => f.id === activeFlowId ? { ...f, ...patch } : f));

    const [nodes, setNodes] = useState<FlowNode[]>([]);
    const [edges, setEdges] = useState<FlowEdge[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [paletteOpen, setPaletteOpen] = useState(true);
    const [zoom, setZoom] = useState(1);
    const [snapGrid, setSnapGrid] = useState(true);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [history, setHistory] = useState<{ nodes: FlowNode[]; edges: FlowEdge[] }[]>([]);
    const [historyIdx, setHistoryIdx] = useState(-1);

    // Sync flow <-> local
    useEffect(() => { setNodes(flow.nodes); setEdges(flow.edges); setSelectedId(null); }, [activeFlowId]);

    const pushHistory = (n: FlowNode[], e: FlowEdge[]) => {
        const next = [...history.slice(0, historyIdx + 1), { nodes: n, edges: e }];
        setHistory(next); setHistoryIdx(next.length - 1);
    };
    const undo = () => { if (historyIdx > 0) { const s = history[historyIdx - 1]; setNodes(s.nodes); setEdges(s.edges); setHistoryIdx(historyIdx - 1); } };
    const redo = () => { if (historyIdx < history.length - 1) { const s = history[historyIdx + 1]; setNodes(s.nodes); setEdges(s.edges); setHistoryIdx(historyIdx + 1); } };

    const canvasRef = useRef<HTMLDivElement>(null);
    const selectedNode = nodes.find(n => n.id === selectedId);

    /* ── Node actions ────────────────────────────────────── */
    const addNode = (type: FlowNode['type'], label: string, config: Record<string, any>) => {
        const snap = (v: number) => snapGrid ? Math.round(v / 20) * 20 : v;
        const n: FlowNode = { id: uid(), type, x: snap(140 + nodes.length * 40), y: snap(160), label, config };
        const next = [...nodes, n];
        setNodes(next); pushHistory(next, edges);
    };
    const deleteNode = (id: string) => {
        const nn = nodes.filter(n => n.id !== id);
        const ne = edges.filter(e => e.from !== id && e.to !== id);
        setNodes(nn); setEdges(ne); pushHistory(nn, ne);
        if (selectedId === id) setSelectedId(null);
    };
    const updateNodeConfig = (id: string, config: Record<string, any>) => {
        const nn = nodes.map(n => n.id === id ? { ...n, config: { ...n.config, ...config } } : n);
        setNodes(nn); pushHistory(nn, edges);
    };
    const updateNodeLabel = (id: string, label: string) => {
        const nn = nodes.map(n => n.id === id ? { ...n, label } : n);
        setNodes(nn); pushHistory(nn, edges);
    };

    /* ── Drag node on canvas ─────────────────────────────── */
    const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null);
    const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const node = nodes.find(n => n.id === id)!;
        dragRef.current = { id, ox: e.clientX - node.x * zoom, oy: e.clientY - node.y * zoom };
        setSelectedId(id);
    };
    const onCanvasMouseMove = (e: React.MouseEvent) => {
        if (!dragRef.current) return;
        const snap = (v: number) => snapGrid ? Math.round(v / 20) * 20 : v;
        const nx = snap((e.clientX - dragRef.current.ox) / zoom);
        const ny = snap((e.clientY - dragRef.current.oy) / zoom);
        setNodes(prev => prev.map(n => n.id === dragRef.current!.id ? { ...n, x: nx, y: ny } : n));
    };
    const onCanvasMouseUp = () => { if (dragRef.current) { pushHistory(nodes, edges); dragRef.current = null; } };

    /* ── Connect nodes ───────────────────────────────────── */
    const handlePortClick = (nodeId: string, isOutput: boolean) => {
        if (isOutput) { setConnecting(nodeId); }
        else if (connecting && connecting !== nodeId) {
            if (!edges.find(e => e.from === connecting && e.to === nodeId)) {
                const ne = [...edges, { from: connecting, to: nodeId }];
                setEdges(ne); pushHistory(nodes, ne);
            }
            setConnecting(null);
        }
    };

    /* ── Bezier helper ───────────────────────────────────── */
    const NW = 160, NH = 60;
    const bezierPath = (e: FlowEdge) => {
        const src = nodes.find(n => n.id === e.from);
        const tgt = nodes.find(n => n.id === e.to);
        if (!src || !tgt) return '';
        const x1 = src.x + NW, y1 = src.y + NH / 2;
        const x2 = tgt.x, y2 = tgt.y + NH / 2;
        const cx = Math.abs(x2 - x1) * 0.5;
        return `M${x1},${y1} C${x1 + cx},${y1} ${x2 - cx},${y2} ${x2},${y2}`;
    };

    /* ── Preset load ─────────────────────────────────────── */
    const loadPreset = (p: typeof PRESET_FLOWS[0]) => {
        setNodes(p.nodes); setEdges(p.edges);
        pushHistory(p.nodes, p.edges);
        message.success(`Loaded "${p.name}" preset`);
    };

    /* ── New flow ────────────────────────────────────────── */
    const createFlow = () => {
        const id = uid();
        setFlows(prev => [...prev, { id, name: 'New Flow', active: false, nodes: [], edges: [], createdAt: new Date().toISOString() }]);
        setActiveFlowId(id);
    };

    /* ── Save current flow state ─────────────────────────── */
    const saveFlow = () => { setFlow({ nodes, edges }); message.success('Flow saved'); };

    /* ── Stats ───────────────────────────────────────────── */
    const flowStats = useMemo(() => [
        { title: 'Executions Today', value: Math.floor(Math.random() * 200 + 50), color: '#3b82f6', icon: <PlayCircleOutlined /> },
        { title: 'Success Rate', value: '98.2%', color: '#22c55e', icon: <CheckCircleOutlined /> },
        { title: 'Avg Response', value: '1.4s', color: '#f59e0b', icon: <ClockCircleOutlined /> },
        { title: 'Active Flows', value: flows.filter(f => f.active).length, color: '#8b5cf6', icon: <ThunderboltOutlined /> },
    ], [flows]);

    /* ── Node shape renderer ─────────────────────────────── */
    const renderNode = (n: FlowNode) => {
        const c = NODE_COLORS[n.type];
        const selected = selectedId === n.id;
        const isConn = connecting === n.id;
        const baseStyle: React.CSSProperties = {
            position: 'absolute', left: n.x, top: n.y, width: NW, minHeight: NH,
            borderRadius: n.type === 'trigger' ? 30 : n.type === 'delay' ? 30 : n.type === 'condition' ? 8 : 12,
            background: isDark ? `${c}18` : `${c}12`,
            border: `2px solid ${selected ? themeColor : c}`,
            boxShadow: selected ? `0 0 16px ${themeColor}40` : isConn ? `0 0 10px ${c}60` : 'none',
            backdropFilter: 'blur(8px)', cursor: 'grab', padding: '8px 12px', userSelect: 'none',
            display: 'flex', alignItems: 'center', gap: 8, zIndex: selected ? 10 : 2,
            transform: n.type === 'condition' ? 'rotate(0deg)' : undefined,
        };
        return (
            <motion.div key={n.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
                style={baseStyle} onMouseDown={e => onNodeMouseDown(e, n.id)}>
                {/* Input port */}
                <div onClick={e => { e.stopPropagation(); handlePortClick(n.id, false); }}
                    style={{ position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', background: isDark ? '#1e1e28' : '#fff', border: `2px solid ${c}`, cursor: 'crosshair', zIndex: 20 }} />
                {/* Output port */}
                <div onClick={e => { e.stopPropagation(); handlePortClick(n.id, true); }}
                    style={{ position: 'absolute', right: -7, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', background: connecting === n.id ? c : isDark ? '#1e1e28' : '#fff', border: `2px solid ${c}`, cursor: 'crosshair', zIndex: 20 }} />
                <div style={{ color: c, fontSize: 16 }}>{NODE_ICONS[n.type]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 11, display: 'block', lineHeight: 1.2, color: isDark ? '#e5e7eb' : '#1f2937' }} ellipsis>{n.label}</Text>
                    <Text style={{ fontSize: 9, color: isDark ? '#9ca3af' : '#6b7280' }}>{n.type}</Text>
                </div>
            </motion.div>
        );
    };

    /* ── Property Panel content ───────────────────────────── */
    const renderPropPanel = () => {
        if (!selectedNode) return <div style={{ padding: 20, textAlign: 'center' }}><Text type="secondary">Select a node to configure</Text></div>;
        const n = selectedNode;
        return (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><Text type="secondary" style={{ fontSize: 10 }}>NODE TYPE</Text><Tag color={NODE_COLORS[n.type]} style={{ marginLeft: 8, borderRadius: 8 }}>{n.type}</Tag></div>
                <div><Text style={{ fontSize: 11 }}>Label</Text><Input size="small" value={n.label} onChange={e => updateNodeLabel(n.id, e.target.value)} /></div>
                {n.type === 'trigger' && (<>
                    <div><Text style={{ fontSize: 11 }}>Module</Text><Select size="small" style={{ width: '100%' }} value={n.config.module}
                        onChange={v => updateNodeConfig(n.id, { module: v })} options={['itsm','hr','ecommerce','crm','pm','ops','inventory','accounting'].map(m => ({ label: m.toUpperCase(), value: m }))} /></div>
                    <div><Text style={{ fontSize: 11 }}>Event</Text><Input size="small" value={n.config.event} onChange={e => updateNodeConfig(n.id, { event: e.target.value })} /></div>
                </>)}
                {n.type === 'condition' && (<>
                    <div><Text style={{ fontSize: 11 }}>Field</Text><Input size="small" value={n.config.field} onChange={e => updateNodeConfig(n.id, { field: e.target.value })} /></div>
                    <div><Text style={{ fontSize: 11 }}>Operator</Text><Select size="small" style={{ width: '100%' }} value={n.config.op}
                        onChange={v => updateNodeConfig(n.id, { op: v })} options={['==','!=','>','<','>=','<=','contains'].map(o => ({ label: o, value: o }))} /></div>
                    <div><Text style={{ fontSize: 11 }}>Value</Text><Input size="small" value={n.config.value} onChange={e => updateNodeConfig(n.id, { value: e.target.value })} /></div>
                </>)}
                {n.type === 'channel' && (
                    <div><Text style={{ fontSize: 11 }}>Channel</Text><Select size="small" style={{ width: '100%' }} value={n.config.channelType || n.config.channelId}
                        onChange={v => updateNodeConfig(n.id, { channelType: v })}
                        options={[
                            { label: 'Email', value: 'email' }, { label: 'WhatsApp', value: 'whatsapp' },
                            { label: 'Webhook', value: 'webhook' }, { label: 'In-App', value: 'in_app' },
                            ...channels.map(c => ({ label: `${c.name} (${c.type})`, value: c.id })),
                        ]} /></div>
                )}
                {n.type === 'template' && (
                    <div><Text style={{ fontSize: 11 }}>Template</Text><Select size="small" style={{ width: '100%' }} value={n.config.templateId} placeholder="Select template"
                        onChange={v => updateNodeConfig(n.id, { templateId: v })}
                        options={templates.map(t => ({ label: `${t.name}`, value: t.id }))} /></div>
                )}
                {n.type === 'delay' && (
                    <div><Text style={{ fontSize: 11 }}>Delay (minutes)</Text><InputNumber size="small" style={{ width: '100%' }} min={1} value={n.config.minutes}
                        onChange={v => updateNodeConfig(n.id, { minutes: v })} /></div>
                )}
                <Space style={{ marginTop: 8 }}>
                    <Button size="small" type="primary" onClick={saveFlow}>Save</Button>
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteNode(n.id)}>Delete</Button>
                </Space>
            </div>
        );
    };

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Flow Designer</AuroraText>}
            subTitle={<DecryptedText text="Visual workflow builder for notification routing — drag, connect, automate" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Select key="flow" size="small" style={{ width: 180 }} value={activeFlowId} onChange={setActiveFlowId}
                    options={flows.map(f => ({ label: f.name, value: f.id }))} />,
                <Button key="new" size="small" icon={<PlusOutlined />} onClick={createFlow}>New Flow</Button>,
                <Button key="save" size="small" type="primary" onClick={saveFlow}>Save</Button>,
            ]}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* ── Flow Info Bar ──────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <Card size="small" style={glassCard}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <Space>
                            <Input size="small" style={{ width: 200, fontWeight: 600 }} value={flow.name} onChange={e => setFlow({ name: e.target.value })} />
                            <Switch size="small" checked={flow.active} onChange={v => setFlow({ active: v })} checkedChildren="Active" unCheckedChildren="Inactive" />
                            <Tag color={flow.active ? 'success' : 'default'}>{flow.active ? 'LIVE' : 'DRAFT'}</Tag>
                        </Space>
                        <Space size={4}>
                            <Text type="secondary" style={{ fontSize: 10 }}>Presets:</Text>
                            {PRESET_FLOWS.map(p => (
                                <Tooltip key={p.name} title={p.desc}>
                                    <Button size="small" type="text" icon={p.icon} onClick={() => loadPreset(p)} style={{ fontSize: 11 }}>{p.name}</Button>
                                </Tooltip>
                            ))}
                        </Space>
                    </div>
                </Card>
            </motion.div>

            {/* ── Main Canvas Area ───────────────────────────── */}
            <div style={{ display: 'flex', gap: 12, minHeight: 520 }}>
                {/* Palette */}
                <AnimatePresence>
                    {paletteOpen && (
                        <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 210, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                            style={{ flexShrink: 0, overflow: 'hidden' }}>
                            <Card size="small" style={{ ...glassCard, height: '100%', overflow: 'auto' }}
                                title={<Space><AppstoreOutlined style={{ color: themeColor }} /> <Text strong style={{ fontSize: 12 }}>Palette</Text></Space>}
                                extra={<Button type="text" size="small" icon={<MenuFoldOutlined />} onClick={() => setPaletteOpen(false)} />}>
                                {PALETTE_ITEMS.map(cat => (
                                    <div key={cat.cat} style={{ marginBottom: 12 }}>
                                        <Text type="secondary" style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cat.cat}</Text>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                                            {cat.items.map((item, i) => (
                                                <motion.div key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                                    onClick={() => addNode(item.type, item.label, item.config)}
                                                    style={{
                                                        padding: '6px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                                        background: isDark ? `${NODE_COLORS[item.type]}12` : `${NODE_COLORS[item.type]}08`,
                                                        border: `1px solid ${NODE_COLORS[item.type]}30`,
                                                    }}>
                                                    <div style={{ color: NODE_COLORS[item.type], fontSize: 13 }}>{NODE_ICONS[item.type]}</div>
                                                    <Text style={{ fontSize: 11 }} ellipsis>{item.label}</Text>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Canvas */}
                <div style={{ flex: 1, position: 'relative', borderRadius: 14, overflow: 'hidden',
                    background: isDark ? 'radial-gradient(circle at 20px 20px, rgba(255,255,255,0.03) 1px, transparent 1px)' : 'radial-gradient(circle at 20px 20px, rgba(0,0,0,0.04) 1px, transparent 1px)',
                    backgroundSize: '20px 20px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                }}>
                    {/* Canvas toolbar */}
                    <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 30, display: 'flex', gap: 4 }}>
                        {!paletteOpen && <Button size="small" icon={<MenuUnfoldOutlined />} onClick={() => setPaletteOpen(true)} />}
                        <Button size="small" icon={<ZoomInOutlined />} onClick={() => setZoom(z => Math.min(z + 0.1, 2))} />
                        <Button size="small" icon={<ZoomOutOutlined />} onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))} />
                        <Button size="small" icon={<ExpandOutlined />} onClick={() => setZoom(1)} />
                        <Tooltip title={snapGrid ? 'Grid snap ON' : 'Grid snap OFF'}>
                            <Button size="small" type={snapGrid ? 'primary' : 'default'} icon={<AimOutlined />} onClick={() => setSnapGrid(!snapGrid)} />
                        </Tooltip>
                        <Button size="small" icon={<UndoOutlined />} disabled={historyIdx <= 0} onClick={undo} />
                        <Button size="small" icon={<RedoOutlined />} disabled={historyIdx >= history.length - 1} onClick={redo} />
                        {selectedId && <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteNode(selectedId)}>Delete</Button>}
                    </div>
                    <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 30 }}>
                        <Tag style={{ borderRadius: 8, fontSize: 10 }}>{Math.round(zoom * 100)}%</Tag>
                        <Tag style={{ borderRadius: 8, fontSize: 10 }}>{nodes.length} nodes · {edges.length} edges</Tag>
                    </div>

                    {/* Canvas surface */}
                    <div ref={canvasRef} style={{ width: '100%', height: 520, transform: `scale(${zoom})`, transformOrigin: '0 0', position: 'relative' }}
                        onMouseMove={onCanvasMouseMove} onMouseUp={onCanvasMouseUp} onMouseLeave={onCanvasMouseUp}
                        onClick={() => { setSelectedId(null); setConnecting(null); }}>
                        {/* SVG edges */}
                        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                            <defs>
                                <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={themeColor} stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                </linearGradient>
                                <marker id="arrowHead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                    <polygon points="0 0, 8 3, 0 6" fill={themeColor} opacity={0.7} />
                                </marker>
                            </defs>
                            {edges.map((e, i) => (
                                <path key={i} d={bezierPath(e)} fill="none" stroke="url(#edgeGrad)" strokeWidth={2.5}
                                    strokeDasharray={connecting ? '6 3' : 'none'} markerEnd="url(#arrowHead)" />
                            ))}
                        </svg>
                        {/* Nodes */}
                        <AnimatePresence>{nodes.map(renderNode)}</AnimatePresence>
                        {/* Empty state */}
                        {nodes.length === 0 && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, opacity: 0.5 }}>
                                <AppstoreOutlined style={{ fontSize: 40, color: isDark ? '#555' : '#aaa' }} />
                                <Text type="secondary">Click palette items or load a preset to start building</Text>
                            </div>
                        )}
                    </div>
                </div>

                {/* Property Panel */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: 240, flexShrink: 0 }}>
                    <Card size="small" style={{ ...glassCard, height: '100%' }}
                        title={<Space><SettingOutlined style={{ color: themeColor }} /> <Text strong style={{ fontSize: 12 }}>Properties</Text></Space>}>
                        {renderPropPanel()}
                    </Card>
                </motion.div>
            </div>

            {/* ── Bottom Stats Bar ───────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Row gutter={[12, 12]}>
                    {flowStats.map((s, i) => (
                        <Col key={i} xs={12} sm={6}>
                            <Card size="small" style={{ ...glassCard, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 20, fontFamily: 'monospace' }} />
                                {/* Mini sparkline */}
                                <svg width="100%" height="24" style={{ marginTop: 4 }}>
                                    <polyline fill="none" stroke={s.color} strokeWidth={1.5} opacity={0.5}
                                        points={Array.from({ length: 12 }, (_, j) => `${j * 18},${24 - Math.random() * 20 - 2}`).join(' ')} />
                                </svg>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </motion.div>
        </div>
        </CMSLayout>
    );
}
