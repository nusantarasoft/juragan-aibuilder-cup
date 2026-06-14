'use client';
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Space, Tag, Button, Table, Badge, Select, Input, Divider, message, Spin, Segmented, theme } from 'antd';
import {
    DatabaseOutlined, PlayCircleOutlined, SaveOutlined, DownloadOutlined,
    BarChartOutlined, LineChartOutlined, PieChartOutlined, AreaChartOutlined,
    TableOutlined, CodeOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
    FileExcelOutlined, FilePdfOutlined, ClockCircleOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { dremioService, QueryResult } from '@/lib/dremioService';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const glassDark = { background: 'rgba(12,12,30,0.92)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 };
const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];

const SUPABASE_TABLES = ['users', 'employees', 'invoices', 'tickets', 'contacts', 'projects', 'inventory_items'];

const DEMO_DATA: Record<string, any>[] = [
    { id: 1, name: 'Andi Wijaya', department: 'Engineering', revenue: 125000, deals: 8, status: 'Active', region: 'Jakarta', score: 92 },
    { id: 2, name: 'Sari Dewi', department: 'Sales', revenue: 245000, deals: 15, status: 'Active', region: 'Surabaya', score: 88 },
    { id: 3, name: 'Budi Santoso', department: 'Marketing', revenue: 89000, deals: 5, status: 'Active', region: 'Bandung', score: 76 },
    { id: 4, name: 'Maya Putri', department: 'Support', revenue: 67000, deals: 3, status: 'Inactive', region: 'Medan', score: 81 },
    { id: 5, name: 'Riko Pratama', department: 'Engineering', revenue: 198000, deals: 12, status: 'Active', region: 'Jakarta', score: 95 },
    { id: 6, name: 'Dian Lestari', department: 'Sales', revenue: 312000, deals: 18, status: 'Active', region: 'Yogyakarta', score: 90 },
    { id: 7, name: 'Hendra Gunawan', department: 'Finance', revenue: 156000, deals: 7, status: 'Active', region: 'Semarang', score: 85 },
    { id: 8, name: 'Nina Sari', department: 'Marketing', revenue: 73000, deals: 4, status: 'Inactive', region: 'Bali', score: 72 },
    { id: 9, name: 'Agus Salim', department: 'Support', revenue: 94000, deals: 6, status: 'Active', region: 'Makassar', score: 78 },
    { id: 10, name: 'Lina Marlina', department: 'Finance', revenue: 185000, deals: 10, status: 'Active', region: 'Jakarta', score: 87 },
];
const DEMO_COLUMNS = [
    { name: 'id', type: 'INTEGER' }, { name: 'name', type: 'VARCHAR' }, { name: 'department', type: 'VARCHAR' },
    { name: 'revenue', type: 'BIGINT' }, { name: 'deals', type: 'INTEGER' }, { name: 'status', type: 'VARCHAR' },
    { name: 'region', type: 'VARCHAR' }, { name: 'score', type: 'INTEGER' },
];

type ChartType = 'bar' | 'line' | 'pie' | 'area';
type ViewMode = 'table' | 'chart';

export default function ReportBuilderPage() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const glassCard = isDark ? glassDark : glass;
    const [messageApi, contextHolder] = message.useMessage();

    // Panel state
    const [leftCollapsed, setLeftCollapsed] = useState(false);

    // Data source state
    const [source, setSource] = useState<'supabase' | 'dremio'>('supabase');
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [catalogItems, setCatalogItems] = useState<string[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [dremioManualTable, setDremioManualTable] = useState('');

    // Query state
    const [sql, setSql] = useState('');
    const [running, setRunning] = useState(false);
    const [execTime, setExecTime] = useState(0);

    // Results state
    const [columns, setColumns] = useState<{ name: string; type: string }[]>([]);
    const [rows, setRows] = useState<Record<string, any>[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [chartType, setChartType] = useState<ChartType>('bar');

    // Save state
    const [reportName, setReportName] = useState('');

    // ─── Load Dremio Catalog ──────────────────────────────────────────────
    const loadCatalog = useCallback(async () => {
        setCatalogLoading(true);
        try {
            const items = await dremioService.getCatalog();
            setCatalogItems(items.map(i => i.path.join('.')));
        } catch {
            setCatalogItems([]);
        }
        setCatalogLoading(false);
    }, []);

    // ─── Handle source change ─────────────────────────────────────────────
    const handleSourceChange = (val: 'supabase' | 'dremio') => {
        setSource(val);
        setSelectedTable('');
        setSql('');
        setColumns([]);
        setRows([]);
        if (val === 'dremio') loadCatalog();
    };

    // ─── Handle table select ─────────────────────────────────────────────
    const handleTableSelect = (table: string) => {
        setSelectedTable(table);
        const query = source === 'dremio'
            ? `SELECT * FROM ${table} LIMIT 100`
            : `SELECT * FROM "${table}" LIMIT 100`;
        setSql(query);
    };

    // ─── Run Query ────────────────────────────────────────────────────────
    const handleRunQuery = async () => {
        if (!sql.trim()) { messageApi.warning('Enter a SQL query first'); return; }
        setRunning(true);
        const start = Date.now();

        try {
            if (source === 'dremio') {
                const result: QueryResult = await dremioService.runSQL(sql.trim());
                setColumns(result.columns);
                setRows(result.rows.map((r, i) => ({ ...r, _key: i })));
                setExecTime(Date.now() - start);
                messageApi.success(`Query returned ${result.rowCount} rows`);
                setRunning(false);
                return;
            }
        } catch (err: any) {
            console.warn('Live query failed, using demo data:', err.message);
        }

        // Fallback: demo data
        setColumns(DEMO_COLUMNS);
        setRows(DEMO_DATA.map((r, i) => ({ ...r, _key: i })));
        setExecTime(Date.now() - start);
        messageApi.info('Showing demo data (live connection unavailable)');
        setRunning(false);
    };

    // ─── Chart helpers ────────────────────────────────────────────────────
    const stringCol = columns.find(c => ['VARCHAR', 'TEXT', 'CHAR', 'STRING'].some(t => c.type.toUpperCase().includes(t)));
    const numberCol = columns.find(c => ['INT', 'BIGINT', 'FLOAT', 'DOUBLE', 'DECIMAL', 'NUMBER', 'INTEGER'].some(t => c.type.toUpperCase().includes(t)));
    const xKey = stringCol?.name || columns[0]?.name || 'name';
    const yKey = numberCol?.name || columns[1]?.name || 'value';

    // ─── Export handlers ──────────────────────────────────────────────────
    const handleExportCsv = async () => {
        if (!rows.length) return;
        try {
            const csv = await dremioService.exportCsv(sql);
            dremioService.downloadCsv(csv, `${reportName || 'report'}.csv`);
            messageApi.success('CSV exported');
        } catch {
            const headers = columns.map(c => c.name).join(',');
            const csvRows = rows.map(r => columns.map(c => r[c.name] ?? '').join(','));
            const csv = [headers, ...csvRows].join('\n');
            dremioService.downloadCsv(csv, `${reportName || 'report'}.csv`);
            messageApi.success('CSV exported (local)');
        }
    };

    const handleExportExcel = async () => {
        if (!rows.length) return;
        try {
            await dremioService.downloadExcel({ jobId: '', rowCount: rows.length, columns, rows, status: 'COMPLETED' }, `${reportName || 'report'}.xlsx`);
            messageApi.success('Excel exported');
        } catch {
            messageApi.error('Excel export requires xlsx library');
        }
    };

    const handleExportPdf = () => {
        if (!rows.length) return;
        const printWin = window.open('', '_blank');
        if (!printWin) return;
        const tableHtml = `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:12px">
            <tr>${columns.map(c => `<th style="background:#f0f0f0">${c.name}</th>`).join('')}</tr>
            ${rows.map(r => `<tr>${columns.map(c => `<td>${r[c.name] ?? ''}</td>`).join('')}</tr>`).join('')}
        </table>`;
        printWin.document.write(`<html><head><title>${reportName || 'Report'}</title></head><body><h2>${reportName || 'Report'}</h2>${tableHtml}</body></html>`);
        printWin.document.close();
        printWin.print();
    };

    // ─── Save Report ──────────────────────────────────────────────────────
    const handleSaveReport = () => {
        if (!reportName.trim()) { messageApi.warning('Enter a report name'); return; }
        const saved = JSON.parse(localStorage.getItem('nusantara_saved_reports') || '[]');
        saved.push({ id: Date.now(), name: reportName, sql, source, chartType, table: selectedTable, savedAt: new Date().toISOString() });
        localStorage.setItem('nusantara_saved_reports', JSON.stringify(saved));
        messageApi.success(`Report "${reportName}" saved`);
    };

    // ─── Render Chart ─────────────────────────────────────────────────────
    const renderChart = () => {
        if (!rows.length) return <div style={{ textAlign: 'center', padding: 60 }}><Text type="secondary">Run a query first to visualize data</Text></div>;
        const chartData = rows.slice(0, 50);
        const common = { data: chartData, margin: { top: 10, right: 20, left: 10, bottom: 10 } };
        const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0';

        return (
            <div style={{ height: 320 }}>
                <ResponsiveContainer>
                    {chartType === 'bar' ? (
                        <BarChart {...common}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <RTooltip />
                            <Legend />
                            <Bar dataKey={yKey} fill={themeColor || '#8b5cf6'} radius={[6, 6, 0, 0]} />
                        </BarChart>
                    ) : chartType === 'line' ? (
                        <LineChart {...common}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <RTooltip />
                            <Legend />
                            <Line type="monotone" dataKey={yKey} stroke={themeColor || '#3b82f6'} strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                    ) : chartType === 'area' ? (
                        <AreaChart {...common}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <RTooltip />
                            <Legend />
                            <Area type="monotone" dataKey={yKey} stroke={themeColor || '#10b981'} fill={themeColor || '#10b981'} fillOpacity={0.2} />
                        </AreaChart>
                    ) : (
                        <PieChart>
                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={2}
                                dataKey={yKey} nameKey={xKey} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                labelLine={{ stroke: '#999', strokeWidth: 1 }}>
                                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <RTooltip />
                            <Legend />
                        </PieChart>
                    )}
                </ResponsiveContainer>
            </div>
        );
    };

    // ─── Table columns for Ant Design ─────────────────────────────────────
    const tableColumns = columns.map(c => ({
        title: c.name,
        dataIndex: c.name,
        key: c.name,
        ellipsis: true,
        render: (v: any) => {
            if (v === null || v === undefined) return <Text type="secondary" style={{ fontSize: 11 }}>null</Text>;
            if (typeof v === 'number') return <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#10b981' }}>{v.toLocaleString()}</Text>;
            return <Text style={{ fontSize: 12 }}>{String(v)}</Text>;
        },
    }));

    const sqlEditorStyle: React.CSSProperties = {
        width: '100%', fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: 13, lineHeight: 1.6, background: '#1a1a2e', color: '#e2e8f0',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 14px',
        minHeight: 140, resize: 'vertical',
    };

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#8b5cf6', '#06b6d4']}>Report Builder</AuroraText>}
            subTitle={<DecryptedText text="Query data sources, visualize results & export reports" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Input key="name" placeholder="Report name…" size="small" value={reportName} onChange={e => setReportName(e.target.value)}
                    style={{ width: 180, borderRadius: 8 }} />,
                <Button key="save" icon={<SaveOutlined />} type="primary" onClick={handleSaveReport}>Save</Button>,
            ]}
        >
            {contextHolder}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Row gutter={[14, 14]}>
                    {/* ═══════════ LEFT PANEL: Data Source ═══════════ */}
                    <Col xs={24} md={leftCollapsed ? 1 : 6}>
                        <AnimatePresence mode="wait">
                            {leftCollapsed ? (
                                <motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <Button icon={<MenuUnfoldOutlined />} type="text" onClick={() => setLeftCollapsed(false)}
                                        style={{ ...glassCard, width: '100%', height: 48 }} />
                                </motion.div>
                            ) : (
                                <motion.div key="expanded" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                    <Card size="small" style={glassCard}
                                        title={<Space><DatabaseOutlined style={{ color: '#3b82f6' }} /><Text strong>Data Source</Text></Space>}
                                        extra={<Button type="text" size="small" icon={<MenuFoldOutlined />} onClick={() => setLeftCollapsed(true)} />}>
                                        <Space direction="vertical" style={{ width: '100%' }} size={10}>
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 11 }}>Source</Text>
                                                <Select value={source} onChange={handleSourceChange} style={{ width: '100%', marginTop: 4 }} size="small"
                                                    options={[
                                                        { label: '🐘 Supabase — nusantarasoft', value: 'supabase' },
                                                        { label: '🏔️ Dremio — Lakehouse', value: 'dremio' },
                                                    ]} />
                                            </div>

                                            {source === 'supabase' ? (
                                                <div>
                                                    <Text type="secondary" style={{ fontSize: 11 }}>Table</Text>
                                                    <Select value={selectedTable || undefined} placeholder="Select table…"
                                                        onChange={handleTableSelect} style={{ width: '100%', marginTop: 4 }} size="small"
                                                        options={SUPABASE_TABLES.map(t => ({ label: t, value: t }))} />
                                                </div>
                                            ) : (
                                                <>
                                                    <div>
                                                        <Text type="secondary" style={{ fontSize: 11 }}>Catalog {catalogLoading && <Spin size="small" />}</Text>
                                                        {catalogItems.length > 0 ? (
                                                            <Select value={selectedTable || undefined} placeholder="Select dataset…" showSearch
                                                                onChange={handleTableSelect} style={{ width: '100%', marginTop: 4 }} size="small"
                                                                options={catalogItems.map(t => ({ label: t, value: t }))} />
                                                        ) : (
                                                            <>
                                                                <Input size="small" placeholder="schema.table" value={dremioManualTable}
                                                                    onChange={e => setDremioManualTable(e.target.value)} style={{ marginTop: 4 }} />
                                                                <Button size="small" block type="dashed" style={{ marginTop: 4 }}
                                                                    onClick={() => { if (dremioManualTable) handleTableSelect(dremioManualTable); }}>
                                                                    Use Table
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            <Divider style={{ margin: '4px 0' }} />
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 11 }}>Quick Tables</Text>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                                                    {(source === 'supabase' ? SUPABASE_TABLES : ['Samples.SF_incidents2016.csv', 'sys.options']).map(t => (
                                                        <Tag key={t} style={{ fontSize: 10, cursor: 'pointer', borderRadius: 6 }}
                                                            onClick={() => handleTableSelect(t)}>{t}</Tag>
                                                    ))}
                                                </div>
                                            </div>
                                        </Space>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Col>

                    {/* ═══════════ CENTER PANEL: SQL Editor ═══════════ */}
                    <Col xs={24} md={leftCollapsed ? 11 : 9}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                            <Card size="small" style={glassCard}
                                title={<Space><CodeOutlined style={{ color: '#f59e0b' }} /><Text strong>SQL Editor</Text>
                                    <Tag color={source === 'dremio' ? 'blue' : 'green'} style={{ fontSize: 10, borderRadius: 8 }}>{source}</Tag>
                                </Space>}
                                extra={
                                    <Button icon={<PlayCircleOutlined />} type="primary" size="small" loading={running} onClick={handleRunQuery}
                                        style={{ borderRadius: 8 }}>
                                        Run Query
                                    </Button>
                                }>
                                <textarea value={sql} onChange={e => setSql(e.target.value)} placeholder="-- Write your SQL query here&#10;SELECT * FROM table_name LIMIT 100"
                                    style={sqlEditorStyle} spellCheck={false} />
                                {rows.length > 0 && (
                                    <Space style={{ marginTop: 10 }} size={12}>
                                        <Tag icon={<ThunderboltOutlined />} color="green" style={{ borderRadius: 8 }}>{execTime}ms</Tag>
                                        <Tag icon={<TableOutlined />} color="blue" style={{ borderRadius: 8 }}>{rows.length} rows</Tag>
                                        <Tag icon={<DatabaseOutlined />} color="purple" style={{ borderRadius: 8 }}>{columns.length} columns</Tag>
                                    </Space>
                                )}
                            </Card>
                        </motion.div>
                    </Col>

                    {/* ═══════════ RIGHT PANEL: Controls ═══════════ */}
                    <Col xs={24} md={leftCollapsed ? 12 : 9}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <Card size="small" style={glassCard}
                                title={<Space><BarChartOutlined style={{ color: '#8b5cf6' }} /><Text strong>Visualization</Text></Space>}>
                                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11 }}>View Mode</Text>
                                        <div style={{ marginTop: 6 }}>
                                            <Segmented value={viewMode} onChange={v => setViewMode(v as ViewMode)} block
                                                options={[
                                                    { label: <Space size={4}><TableOutlined />Table</Space>, value: 'table' },
                                                    { label: <Space size={4}><BarChartOutlined />Chart</Space>, value: 'chart' },
                                                ]} />
                                        </div>
                                    </div>
                                    {viewMode === 'chart' && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                            <Text type="secondary" style={{ fontSize: 11 }}>Chart Type</Text>
                                            <Row gutter={[6, 6]} style={{ marginTop: 6 }}>
                                                {([
                                                    { key: 'bar', icon: <BarChartOutlined />, label: 'Bar' },
                                                    { key: 'line', icon: <LineChartOutlined />, label: 'Line' },
                                                    { key: 'pie', icon: <PieChartOutlined />, label: 'Pie' },
                                                    { key: 'area', icon: <AreaChartOutlined />, label: 'Area' },
                                                ] as const).map(ct => (
                                                    <Col key={ct.key} span={6}>
                                                        <Button size="small" block type={chartType === ct.key ? 'primary' : 'default'}
                                                            icon={ct.icon} onClick={() => setChartType(ct.key)}
                                                            style={{ fontSize: 10, borderRadius: 8 }}>{ct.label}</Button>
                                                    </Col>
                                                ))}
                                            </Row>
                                            {columns.length > 0 && (
                                                <div style={{ marginTop: 8 }}>
                                                    <Text type="secondary" style={{ fontSize: 10 }}>X: <Tag style={{ fontSize: 10 }}>{xKey}</Tag> Y: <Tag style={{ fontSize: 10 }}>{yKey}</Tag></Text>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                    <Divider style={{ margin: '4px 0' }} />
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11 }}>Export</Text>
                                        <Row gutter={[6, 6]} style={{ marginTop: 6 }}>
                                            <Col span={8}>
                                                <Button size="small" block icon={<DownloadOutlined />} onClick={handleExportCsv}
                                                    disabled={!rows.length} style={{ fontSize: 10, borderRadius: 8 }}>CSV</Button>
                                            </Col>
                                            <Col span={8}>
                                                <Button size="small" block icon={<FileExcelOutlined />} onClick={handleExportExcel}
                                                    disabled={!rows.length} style={{ fontSize: 10, borderRadius: 8 }}>Excel</Button>
                                            </Col>
                                            <Col span={8}>
                                                <Button size="small" block icon={<FilePdfOutlined />} onClick={handleExportPdf}
                                                    disabled={!rows.length} style={{ fontSize: 10, borderRadius: 8 }}>PDF</Button>
                                            </Col>
                                        </Row>
                                    </div>
                                </Space>
                            </Card>
                        </motion.div>
                    </Col>
                </Row>

                {/* ═══════════ RESULTS PANEL ═══════════ */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <Card size="small" style={glassCard}
                        title={
                            <Space>
                                {viewMode === 'table' ? <TableOutlined style={{ color: '#10b981' }} /> : <BarChartOutlined style={{ color: '#8b5cf6' }} />}
                                <Text strong>{viewMode === 'table' ? 'Results' : 'Chart'}</Text>
                                {rows.length > 0 && (
                                    <>
                                        <Badge count={`${rows.length} rows`} style={{ backgroundColor: '#10b981', fontSize: 10 }} />
                                        <Badge count={`${columns.length} cols`} style={{ backgroundColor: '#3b82f6', fontSize: 10 }} />
                                    </>
                                )}
                            </Space>
                        }
                        extra={
                            rows.length > 0 && (
                                <Space size={4}>
                                    <Tag icon={<ClockCircleOutlined />} style={{ fontSize: 10, borderRadius: 8 }}>{execTime}ms</Tag>
                                    <Button size="small" type="text" icon={<PlayCircleOutlined />} onClick={handleRunQuery} loading={running} />
                                </Space>
                            )
                        }>
                        {running ? (
                            <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" tip="Running query…" /></div>
                        ) : rows.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 60 }}>
                                <CodeOutlined style={{ fontSize: 40, color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />
                                <div style={{ marginTop: 12 }}><Text type="secondary">Select a data source and run a query to see results</Text></div>
                            </div>
                        ) : viewMode === 'table' ? (
                            <Table dataSource={rows} rowKey="_key" size="small" scroll={{ x: 'max-content' }}
                                pagination={{ pageSize: 15, size: 'small', showSizeChanger: true, showTotal: (t) => <Text type="secondary" style={{ fontSize: 11 }}>{t} total rows</Text> }}
                                columns={tableColumns} />
                        ) : (
                            renderChart()
                        )}
                    </Card>
                </motion.div>
            </motion.div>
        </CMSLayout>
    );
}
