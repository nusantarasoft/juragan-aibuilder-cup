'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import {
    Card, Row, Col, Typography, Statistic, Space, Tag, Button, Badge, Input, Select,
    Table, Drawer, Modal, Form, Segmented, Spin, Empty, message, theme, Divider, Tooltip,
} from 'antd';
import {
    FileTextOutlined, BarChartOutlined, TeamOutlined, ShoppingOutlined, BugOutlined,
    AuditOutlined, DollarOutlined, InboxOutlined, CopyOutlined, PlusOutlined,
    ReloadOutlined, SearchOutlined, AppstoreOutlined, BarsOutlined, DownloadOutlined,
    EyeOutlined, CodeOutlined, FireOutlined, StarOutlined, FilterOutlined, RocketOutlined,
} from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { gql, DEFAULT_TENANT_ID } from '@/lib/graphql';
import { useRouter } from 'next/navigation';

const { Text } = Typography;
const { TextArea } = Input;

const MODULE_COLORS: Record<string, string> = {
    Financial: '#3b82f6', HR: '#10b981', CRM: '#f59e0b', Inventory: '#8b5cf6',
    ITSM: '#ef4444', Compliance: '#06b6d4', Commerce: '#ec4899', PM: '#14b8a6',
};
const MODULE_ICONS: Record<string, React.ReactNode> = {
    Financial: <DollarOutlined />, HR: <TeamOutlined />, CRM: <BarChartOutlined />,
    Inventory: <InboxOutlined />, ITSM: <BugOutlined />, Compliance: <AuditOutlined />,
    Commerce: <ShoppingOutlined />, PM: <FileTextOutlined />,
};
const MODULES = ['Financial', 'HR', 'CRM', 'Inventory', 'ITSM', 'Compliance'];
const CATEGORIES = ['Standard', 'Custom', 'System'];
const CHART_TYPES = ['bar', 'line', 'pie', 'table', 'area', 'radar'];

const DEMO_TEMPLATES = [
    { id: 'tpl-fin-01', name: 'Financial Summary', description: 'Revenue, expenses, P&L, cash flow — monthly or quarterly breakdown', module: 'Financial', fields: 12, downloads: 245, category: 'Standard', chartType: 'bar', sql: 'SELECT period, revenue, expenses, profit\nFROM financial_summary WHERE tenant_id = :tid ORDER BY period DESC' },
    { id: 'tpl-hr-01', name: 'HR Headcount', description: 'Employee distribution by department, role, tenure, and attrition rate', module: 'HR', fields: 8, downloads: 180, category: 'Standard', chartType: 'pie', sql: 'SELECT department, COUNT(*) as headcount, AVG(tenure_months) as avg_tenure\nFROM employees WHERE tenant_id = :tid GROUP BY department' },
    { id: 'tpl-crm-01', name: 'Sales Pipeline', description: 'Deals by stage, conversion rates, projected revenue, win/loss analysis', module: 'CRM', fields: 15, downloads: 312, category: 'Standard', chartType: 'bar', sql: 'SELECT stage, COUNT(*) as deals, SUM(amount) as value\nFROM opportunities WHERE tenant_id = :tid GROUP BY stage' },
    { id: 'tpl-inv-01', name: 'Inventory Valuation', description: 'Stock levels, FIFO/LIFO valuation, reorder alerts, slow-moving items', module: 'Inventory', fields: 10, downloads: 156, category: 'Standard', chartType: 'table', sql: 'SELECT sku, name, qty_on_hand, unit_cost, qty_on_hand * unit_cost as total_value\nFROM inventory WHERE tenant_id = :tid' },
    { id: 'tpl-itsm-01', name: 'SLA Compliance', description: 'Response times, resolution rates, SLA breaches, agent performance', module: 'ITSM', fields: 14, downloads: 98, category: 'System', chartType: 'line', sql: 'SELECT date, sla_met, sla_breached, avg_resolution_hrs\nFROM sla_metrics WHERE tenant_id = :tid ORDER BY date' },
    { id: 'tpl-comp-01', name: 'Audit Trail', description: 'Complete audit log with user actions, timestamps, IP addresses, and changes', module: 'Compliance', fields: 9, downloads: 74, category: 'System', chartType: 'table', sql: 'SELECT timestamp, user_email, action, resource, ip_address\nFROM audit_log WHERE tenant_id = :tid ORDER BY timestamp DESC LIMIT 500' },
    { id: 'tpl-com-01', name: 'E-Commerce Sales', description: 'Orders, payment methods, top products, customer segments, returns', module: 'Commerce', fields: 11, downloads: 203, category: 'Standard', chartType: 'area', sql: 'SELECT date, total_orders, total_revenue, avg_order_value\nFROM ecommerce_daily WHERE tenant_id = :tid ORDER BY date' },
    { id: 'tpl-pm-01', name: 'Project Status', description: 'Task completion, milestones, budget vs actual, risk register', module: 'PM', fields: 13, downloads: 127, category: 'Custom', chartType: 'bar', sql: 'SELECT project_name, tasks_total, tasks_done, budget, actual_spend\nFROM projects WHERE tenant_id = :tid' },
];

/* localStorage helpers for custom templates */
const LS_KEY = 'nusantarasoft_custom_templates';
function loadCustom(): any[] { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function saveCustom(items: any[]) { localStorage.setItem(LS_KEY, JSON.stringify(items)); }

export default function ReportTemplatesPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const glass = isDark
        ? { background: 'rgba(30,30,30,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }
        : { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
    const router = useRouter();
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<any[]>([]);
    const [view, setView] = useState<string>('grid');
    const [search, setSearch] = useState('');
    const [modFilter, setModFilter] = useState<string | undefined>();
    const [catFilter, setCatFilter] = useState<string | undefined>();
    const [detail, setDetail] = useState<any | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [form] = Form.useForm();

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const res = await gql<{ reportTemplates: any }>(
                `query($tid: String!) { reportTemplates(tenantId: $tid) }`,
                { tid: DEFAULT_TENANT_ID },
            );
            const arr = Array.isArray(res.reportTemplates) ? res.reportTemplates : [];
            setTemplates(arr.length > 0 ? [...arr, ...loadCustom()] : [...DEMO_TEMPLATES, ...loadCustom()]);
        } catch {
            setTemplates([...DEMO_TEMPLATES, ...loadCustom()]);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const filtered = templates.filter(t => {
        const q = search.toLowerCase();
        if (q && !t.name?.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false;
        if (modFilter && t.module !== modFilter) return false;
        if (catFilter && t.category !== catFilter) return false;
        return true;
    });

    const mostPopular = templates.length ? [...templates].sort((a, b) => (b.downloads || 0) - (a.downloads || 0))[0] : null;
    const standardCount = templates.filter(t => t.category === 'Standard').length;
    const customCount = templates.filter(t => t.category === 'Custom').length;
    const systemCount = templates.filter(t => t.category === 'System').length;

    const handleCreate = (values: any) => {
        const newTpl = { ...values, id: `custom-${Date.now()}`, fields: 0, downloads: 0 };
        const customs = [...loadCustom(), newTpl];
        saveCustom(customs);
        setTemplates(prev => [...prev, newTpl]);
        setCreateOpen(false);
        form.resetFields();
        messageApi.success('Template created successfully');
    };

    const handleDuplicate = (t: any) => {
        const dup = { ...t, id: `dup-${Date.now()}`, name: `${t.name} (Copy)`, downloads: 0 };
        const customs = [...loadCustom(), dup];
        saveCustom(customs);
        setTemplates(prev => [...prev, dup]);
        messageApi.success('Template duplicated');
    };

    const handleDownload = (t: any) => {
        const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${t.name}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        messageApi.success('Template downloaded');
    };

    const columns = [
        { title: 'Name', dataIndex: 'name', render: (v: string, r: any) => (
            <Button type="link" style={{ padding: 0, fontSize: 12, fontWeight: 600 }} onClick={() => setDetail(r)}>{v}</Button>
        )},
        { title: 'Module', dataIndex: 'module', width: 110, render: (v: string) => (
            <Tag color={MODULE_COLORS[v] || '#666'} style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag>
        )},
        { title: 'Category', dataIndex: 'category', width: 100, render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 8 }}>{v}</Tag> },
        { title: 'Fields', dataIndex: 'fields', width: 70, align: 'center' as const, render: (v: number) => <Badge count={v} style={{ backgroundColor: '#8b5cf6' }} /> },
        { title: 'Downloads', dataIndex: 'downloads', width: 90, align: 'center' as const, render: (v: number) => <Text type="secondary" style={{ fontSize: 11 }}>{v ?? 0}</Text> },
        { title: 'Actions', width: 140, align: 'center' as const, render: (_: any, r: any) => (
            <Space size={4}>
                <Tooltip title="View"><Button size="small" type="link" icon={<EyeOutlined />} onClick={() => setDetail(r)} /></Tooltip>
                <Tooltip title="Duplicate"><Button size="small" type="link" icon={<CopyOutlined />} onClick={() => handleDuplicate(r)} /></Tooltip>
                <Tooltip title="Use in builder"><Button size="small" type="link" icon={<RocketOutlined />} onClick={() => router.push(`/admin/reports/builder?template=${r.id}`)} /></Tooltip>
            </Space>
        )},
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#ec4899', '#f59e0b']}>Report Templates</AuroraText>}
            subTitle={<DecryptedText text="Pre-built report templates — one-click generation across all modules" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="new" icon={<PlusOutlined />} type="primary" onClick={() => setCreateOpen(true)}>New Template</Button>,
                <Button key="r" icon={<ReloadOutlined />} onClick={fetchTemplates} />,
            ]}
        >
            {contextHolder}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Stats Row */}
                <Row gutter={[12, 12]}>
                    {[
                        { t: 'Total Templates', v: templates.length, c: '#3b82f6', i: <FileTextOutlined /> },
                        { t: 'Standard', v: standardCount, c: '#10b981', i: <BarChartOutlined /> },
                        { t: 'Custom / System', v: `${customCount} / ${systemCount}`, c: '#8b5cf6', i: <CodeOutlined /> },
                        { t: 'Most Popular', v: mostPopular?.downloads ?? 0, c: '#f59e0b', i: <FireOutlined />,
                          suffix: mostPopular ? ` — ${mostPopular.name}` : '' },
                    ].map((s, i) => (
                        <Col key={i} xs={12} md={6}>
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}>
                                    <Statistic
                                        title={<Text style={{ fontSize: 10 }}>{s.t}</Text>}
                                        value={s.v} prefix={s.i}
                                        valueStyle={{ color: s.c, fontSize: 20 }}
                                        suffix={s.suffix ? <Text type="secondary" style={{ fontSize: 10 }}>{s.suffix}</Text> : undefined}
                                    />
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Search & Filters */}
                <Card size="small" style={glass} bodyStyle={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <Space wrap size={8}>
                            <Input prefix={<SearchOutlined />} placeholder="Search templates…" allowClear
                                style={{ width: 220, borderRadius: 8 }} value={search} onChange={e => setSearch(e.target.value)} />
                            <Select placeholder="Module" allowClear style={{ width: 140 }} value={modFilter}
                                onChange={setModFilter} options={MODULES.map(m => ({ value: m, label: m }))} suffixIcon={<FilterOutlined />} />
                            <Select placeholder="Category" allowClear style={{ width: 130 }} value={catFilter}
                                onChange={setCatFilter} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
                            {(search || modFilter || catFilter) && (
                                <Tag style={{ fontSize: 10 }}>{filtered.length} result{filtered.length !== 1 && 's'}</Tag>
                            )}
                        </Space>
                        <Segmented value={view} onChange={v => setView(v as string)} options={[
                            { value: 'grid', icon: <AppstoreOutlined /> },
                            { value: 'list', icon: <BarsOutlined /> },
                        ]} />
                    </div>
                </Card>

                {/* Content */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
                ) : filtered.length === 0 ? (
                    <Empty description="No templates match your filters" />
                ) : view === 'grid' ? (
                    <Row gutter={[12, 12]}>
                        {filtered.map((t, i) => (
                            <Col key={t.id} xs={24} sm={12} md={8} lg={6}>
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                                >
                                    <Card
                                        size="small" hoverable onClick={() => setDetail(t)}
                                        style={{ ...glass, borderTop: `3px solid ${MODULE_COLORS[t.module] || '#666'}`, height: '100%', cursor: 'pointer' }}
                                    >
                                        <div style={{ textAlign: 'center', marginBottom: 10 }}>
                                            <div style={{ fontSize: 28, color: MODULE_COLORS[t.module] || '#666', marginBottom: 6 }}>
                                                {MODULE_ICONS[t.module] || <FileTextOutlined />}
                                            </div>
                                            <Text strong style={{ fontSize: 13 }}>{t.name}</Text>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 10, lineHeight: 1.5 }}>
                                            {t.description}
                                        </Text>
                                        <Space size={4} wrap style={{ marginBottom: 10 }}>
                                            <Tag color={MODULE_COLORS[t.module]} style={{ fontSize: 9, borderRadius: 6 }}>{t.module}</Tag>
                                            <Tag style={{ fontSize: 9, borderRadius: 6 }}>{t.fields} fields</Tag>
                                            <Tag style={{ fontSize: 9, borderRadius: 6 }}>{t.downloads ?? 0} uses</Tag>
                                            {t.category && <Tag style={{ fontSize: 9, borderRadius: 6 }}>{t.category}</Tag>}
                                        </Space>
                                        <Button type="primary" block size="small" icon={<CopyOutlined />} style={{ borderRadius: 8 }}
                                            onClick={e => { e.stopPropagation(); router.push(`/admin/reports/builder?template=${t.id}`); }}>
                                            Use Template
                                        </Button>
                                    </Card>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <Card size="small" style={glass}>
                        <Table dataSource={filtered} rowKey="id" size="small"
                            pagination={{ pageSize: 10, showSizeChanger: false }} columns={columns} />
                    </Card>
                )}
            </motion.div>

            {/* Detail Drawer */}
            <Drawer
                title={detail?.name || 'Template Detail'}
                open={!!detail} onClose={() => setDetail(null)} width={500}
                extra={
                    <Space>
                        <Button icon={<CopyOutlined />} onClick={() => { if (detail) handleDuplicate(detail); }}>Duplicate</Button>
                        <Button type="primary" icon={<RocketOutlined />}
                            onClick={() => { if (detail) router.push(`/admin/reports/builder?template=${detail.id}`); }}>
                            Use Template
                        </Button>
                    </Space>
                }
            >
                {detail && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Text type="secondary" style={{ lineHeight: 1.6 }}>{detail.description}</Text>
                        <Space wrap>
                            <Tag color={MODULE_COLORS[detail.module]} style={{ borderRadius: 8 }}>
                                {MODULE_ICONS[detail.module]} {detail.module}
                            </Tag>
                            <Tag style={{ borderRadius: 8 }}>{detail.category}</Tag>
                            {detail.chartType && <Tag icon={<BarChartOutlined />} style={{ borderRadius: 8 }}>{detail.chartType}</Tag>}
                        </Space>
                        <Divider style={{ margin: '4px 0' }} />
                        <Row gutter={[12, 12]}>
                            <Col span={8}>
                                <Statistic title={<Text style={{ fontSize: 10 }}>Fields</Text>} value={detail.fields}
                                    prefix={<StarOutlined />} valueStyle={{ fontSize: 20, color: '#8b5cf6' }} />
                            </Col>
                            <Col span={8}>
                                <Statistic title={<Text style={{ fontSize: 10 }}>Downloads</Text>} value={detail.downloads ?? 0}
                                    prefix={<DownloadOutlined />} valueStyle={{ fontSize: 20, color: '#3b82f6' }} />
                            </Col>
                            <Col span={8}>
                                <Statistic title={<Text style={{ fontSize: 10 }}>Chart</Text>} value={detail.chartType || 'N/A'}
                                    prefix={<BarChartOutlined />} valueStyle={{ fontSize: 16, color: '#10b981' }} />
                            </Col>
                        </Row>
                        {detail.sql && (
                            <>
                                <Divider style={{ margin: '4px 0' }} />
                                <div>
                                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                                        <CodeOutlined /> SQL Template
                                    </Text>
                                    <pre style={{
                                        background: isDark ? '#1a1a2e' : '#f5f5f5', padding: 12, borderRadius: 8,
                                        fontSize: 11, overflowX: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.6,
                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
                                    }}>{detail.sql}</pre>
                                </div>
                            </>
                        )}
                        <Divider style={{ margin: '4px 0' }} />
                        <Button icon={<DownloadOutlined />} block style={{ borderRadius: 8 }}
                            onClick={() => handleDownload(detail)}>
                            Download as JSON
                        </Button>
                    </div>
                )}
            </Drawer>

            {/* Create Template Modal */}
            <Modal
                title="Create New Template" open={createOpen}
                onCancel={() => { setCreateOpen(false); form.resetFields(); }}
                onOk={() => form.submit()} okText="Create" okButtonProps={{ icon: <PlusOutlined /> }}
            >
                <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 12 }}>
                    <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Template name is required' }]}>
                        <Input placeholder="e.g. Monthly Revenue Report" />
                    </Form.Item>
                    <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Description is required' }]}>
                        <Input placeholder="Brief description of the template" />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={8}>
                            <Form.Item name="module" label="Module" rules={[{ required: true }]}>
                                <Select placeholder="Select" options={MODULES.map(m => ({ value: m, label: m }))} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                                <Select placeholder="Select" options={CATEGORIES.map(c => ({ value: c, label: c }))} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="chartType" label="Chart Type">
                                <Select placeholder="Select" allowClear options={CHART_TYPES.map(c => ({ value: c, label: c }))} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="sql" label="SQL Template">
                        <TextArea rows={5} placeholder="SELECT ... FROM ... WHERE tenant_id = :tid"
                            style={{ fontFamily: 'monospace', fontSize: 11 }} />
                    </Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
