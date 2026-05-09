'use client';
import React, { useEffect, useState, useMemo } from 'react';
import CMSLayout from '@/components/layout/CMSLayout';
import { motion } from "framer-motion";
import RbacGuard from '@/components/common/RbacGuard';
import { Table, Button, Space, Tag, Input, Select, Drawer, Form, InputNumber, Switch, message, Modal, Typography, Card, Tooltip, Divider, TreeSelect, Empty, Spin, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined, FilterOutlined, AccountBookOutlined, DownOutlined, RightOutlined, FileExcelOutlined, FilePdfOutlined  } from '@ant-design/icons';
import { accountingService, AcctAccount } from '@/lib/accountingService';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { useDateRangeStore } from "@/store/useDateRangeStore";

const { Text } = Typography;
const formatCurrency = (v: number | string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(v) || 0);
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const typeColors: Record<string, string> = { asset: 'blue', liability: 'orange', equity: 'purple', revenue: 'green', expense: 'red' };
const typeLabels: Record<string, string> = { asset: 'Asset', liability: 'Liability', equity: 'Equity', revenue: 'Revenue', expense: 'Expense' };
const subtypes = ['cash', 'bank', 'receivable', 'payable', 'inventory', 'fixed_asset', 'depreciation', 'tax_receivable', 'tax_payable', 'accrued', 'deferred', 'loan', 'capital', 'retained', 'drawing', 'sales', 'service', 'cogs', 'operating', 'payroll', 'marketing', 'financial', 'forex', 'other', 'contra', 'interest'];

export default function ChartOfAccountsPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [accounts, setAccounts] = useState<AcctAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<string | undefined>();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editing, setEditing] = useState<AcctAccount | null>(null);
    const [form] = Form.useForm();

    const load = async () => {
        setLoading(true);
        try { setAccounts(await accountingService.getAccounts(undefined, { accountType: filterType, search: search || undefined })); }
        catch (e: any) { message.error(e.message); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [filterType]);

    const handleSearch = () => load();

    const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ accountType: 'asset', normalBalance: 'debit', status: 'active', currencyCode: 'IDR' }); setDrawerOpen(true); };
    const openEdit = (r: AcctAccount) => { setEditing(r); form.setFieldsValue(r); setDrawerOpen(true); };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (editing) { await accountingService.updateAccount(editing.id, values); message.success('Account updated'); }
            else { await accountingService.createAccount(undefined, values); message.success('Account created'); }
            setDrawerOpen(false); load();
        } catch (e: any) { if (e.message) message.error(e.message); }
    };

    const handleDelete = async (id: string) => {
        try { await accountingService.deleteAccount(id); message.success('Deleted'); load(); }
        catch (e: any) { message.error(e.message); }
    };

    // Build tree structure
    const treeData = useMemo(() => {
        const map = new Map<string, AcctAccount & { children?: AcctAccount[] }>();
        const roots: (AcctAccount & { children?: AcctAccount[] })[] = [];
        // Sort by account code
        const sorted = [...accounts].sort((a, b) => a.accountCode.localeCompare(b.accountCode));
        sorted.forEach(a => map.set(a.id, { ...a }));
        sorted.forEach(a => {
            const node = map.get(a.id)!;
            if (a.parentId && map.has(a.parentId)) {
                const parent = map.get(a.parentId)!;
                if (!parent.children) parent.children = [];
                parent.children.push(node);
            } else { roots.push(node); }
        });
        return roots;
    }, [accounts]);

    // TreeSelect data for parent picker
    const parentTreeData = useMemo(() => {
        const headers = accounts.filter(a => a.isHeader);
        return headers.map(a => ({ title: `${a.accountCode} - ${a.name}`, value: a.id, key: a.id }));
    }, [accounts]);

    const columns: any[] = [
        { title: 'Code', dataIndex: 'accountCode', key: 'accountCode', width: 100,
          render: (v: string, r: AcctAccount) => <Text strong={r.isHeader} style={{ fontFamily: 'monospace', fontSize: r.isHeader ? 14 : 13 }}>{v}</Text> },
        { title: 'Account Name', dataIndex: 'name', key: 'name',
          render: (v: string, r: AcctAccount) => <Text strong={r.isHeader} style={{ fontSize: r.isHeader ? 14 : 13 }}>{v}{r.isSystem && <Tag color="default" style={{ marginLeft: 6, fontSize: 10 }}>System</Tag>}</Text> },
        { title: 'Type', dataIndex: 'accountType', key: 'accountType', width: 110,
          render: (v: string) => <Tag color={typeColors[v]}>{typeLabels[v] || v}</Tag> },
        { title: 'Subtype', dataIndex: 'accountSubtype', key: 'accountSubtype', width: 120,
          render: (v: string) => v ? <Tag>{v}</Tag> : '-' },
        { title: 'Normal', dataIndex: 'normalBalance', key: 'normalBalance', width: 80,
          render: (v: string) => <Tag color={v === 'debit' ? 'blue' : 'orange'}>{v}</Tag> },
        { title: 'Balance', dataIndex: 'currentBalance', key: 'currentBalance', width: 160, align: 'right' as const,
          render: (v: number, r: AcctAccount) => r.isHeader ? '' : <Text style={{ fontFamily: 'monospace' }}>{formatCurrency(v)}</Text> },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 90,
          render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag> },
        { title: '', key: 'actions', width: 100, render: (_: any, r: AcctAccount) => (
            <Space size="small">
                <Tooltip title="Edit"><Button icon={<EditOutlined />} size="small" type="text" onClick={() => openEdit(r)} /></Tooltip>
                {!r.isSystem && <Popconfirm title="Delete this account?" onConfirm={() => handleDelete(r.id)}><Tooltip title="Delete"><Button icon={<DeleteOutlined />} size="small" type="text" danger /></Tooltip></Popconfirm>}
            </Space>
        )},
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Chart of Accounts</AuroraText>}
            subTitle={<DecryptedText text={`${accounts.length} accounts configured`} animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
                    style={{ background: `linear-gradient(135deg, ${themeColor}, var(--theme-secondary, #6366f1))`, border: 'none', borderRadius: 10 }}>Add Account</Button>
            </div>

            {/* Filters */}
            <Card size="small" style={{ ...glass }}>
                <Space wrap>
                    <Input.Search placeholder="Search by code or name..." value={search} onChange={e => setSearch(e.target.value)} onSearch={handleSearch} style={{ width: 280, borderRadius: 8 }} allowClear />
                    <Select placeholder="Filter by type" value={filterType} onChange={setFilterType} allowClear style={{ width: 160 }}
                        options={Object.entries(typeLabels).map(([k, v]) => ({ value: k, label: v }))} />
                    <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
                    <RbacGuard requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'acct_accounts', title: 'Chart of Accounts', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Code', key: 'accountCode' }, { header: 'Name', key: 'name' }, { header: 'Type', key: 'accountType' }, { header: 'Balance', key: 'currentBalance' }], data: accounts })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'acct_accounts', title: 'Chart of Accounts', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Code', key: 'accountCode' }, { header: 'Name', key: 'name' }, { header: 'Type', key: 'accountType' }, { header: 'Balance', key: 'currentBalance' }], data: accounts })} /></Tooltip></RbacGuard>
                </Space>
            </Card>

            <Card style={{ ...glass }} styles={{ body: { padding: 0 } }}>
                <Table
                    dataSource={treeData}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    pagination={false}
                    expandable={{ childrenColumnName: 'children', defaultExpandAllRows: true, indentSize: 24 }}
                    scroll={{ x: 900 }}
                    locale={{ emptyText: <Empty description="No accounts found" /> }}
                />
            </Card>

            {/* Create/Edit Drawer */}
            <Drawer title={editing ? `Edit: ${editing.accountCode} - ${editing.name}` : 'New Account'} open={drawerOpen} onClose={() => setDrawerOpen(false)} width={480}
                extra={<Space><Button onClick={() => setDrawerOpen(false)}>Cancel</Button><Button type="primary" onClick={handleSave}>Save</Button></Space>}>
                <Form form={form} layout="vertical" autoComplete="off">
                    <Form.Item name="accountCode" label="Account Code" rules={[{ required: true }]}>
                        <Input placeholder="e.g. 1110" style={{ fontFamily: 'monospace' }} />
                    </Form.Item>
                    <Form.Item name="name" label="Account Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Cash on Hand" />
                    </Form.Item>
                    <Form.Item name="accountType" label="Account Type" rules={[{ required: true }]}>
                        <Select options={Object.entries(typeLabels).map(([k, v]) => ({ value: k, label: v }))} />
                    </Form.Item>
                    <Form.Item name="accountSubtype" label="Subtype">
                        <Select allowClear placeholder="Optional subtype" options={subtypes.map(s => ({ value: s, label: s }))} />
                    </Form.Item>
                    <Form.Item name="parentId" label="Parent Account">
                        <TreeSelect allowClear placeholder="Select parent..." treeData={parentTreeData} showSearch treeDefaultExpandAll
                            filterTreeNode={(input, node) => (node?.title as string || '').toLowerCase().includes(input.toLowerCase())} />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="currencyCode" label="Currency">
                        <Select options={[{ value: 'IDR', label: 'IDR - Indonesian Rupiah' }, { value: 'USD', label: 'USD - US Dollar' }, { value: 'EUR', label: 'EUR - Euro' }]} />
                    </Form.Item>
                    <Form.Item name="normalBalance" label="Normal Balance">
                        <Select options={[{ value: 'debit', label: 'Debit' }, { value: 'credit', label: 'Credit' }]} />
                    </Form.Item>
                    <Form.Item name="openingBalance" label="Opening Balance">
                        <InputNumber style={{ width: '100%' }} formatter={v => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => Number(v!.replace(/Rp\s?|(,*)/g, ''))} />
                    </Form.Item>
                    <Space>
                        <Form.Item name="isHeader" label="Header/Group" valuePropName="checked"><Switch /></Form.Item>
                    </Space>
                    <Form.Item name="status" label="Status">
                        <Select options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                    </Form.Item>
                </Form>
            </Drawer>
        </div>
        </motion.div>
        </CMSLayout>
    );
}

