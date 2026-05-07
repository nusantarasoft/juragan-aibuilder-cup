'use client';
import React, { useEffect, useState } from 'react';
import CMSLayout from '@/components/layout/CMSLayout';
import { motion } from "framer-motion";
import { Table, Card, Typography, Tabs, Button, Space, Tag, Modal, Form, Input, InputNumber, Select, Switch, DatePicker, message, Empty, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined, CalendarOutlined, PercentageOutlined, ApartmentOutlined, ReloadOutlined } from '@ant-design/icons';
import { accountingService, AcctCurrency, AcctFiscalPeriod, AcctTax, AcctCostCenter } from '@/lib/accountingService';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import dayjs from 'dayjs';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

// ═══════════════════════════════════════════════════════════
// CURRENCIES TAB
// ═══════════════════════════════════════════════════════════
function CurrenciesTab() {
    const [data, setData] = useState<AcctCurrency[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState<AcctCurrency | null>(null);
    const [form] = Form.useForm();

    const load = async () => { setLoading(true); try { setData(await accountingService.getCurrencies()); } catch (e) { console.error(e); } finally { setLoading(false); } };
    useEffect(() => { load(); }, []);

    const openAdd = () => { setEditing(null); form.resetFields(); setModal(true); };
    const openEdit = (r: AcctCurrency) => { setEditing(r); form.setFieldsValue({ code: r.code, name: r.name, symbol: r.symbol, decimalPlaces: r.decimalPlaces, exchangeRate: r.exchangeRate, isDefault: r.isDefault }); setModal(true); };

    const save = async () => {
        try {
            const vals = await form.validateFields();
            await accountingService.upsertCurrency(undefined, vals);
            message.success(editing ? 'Currency updated' : 'Currency added');
            setModal(false); load();
        } catch (e: any) { if (e.message) message.error(e.message); }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text type="secondary">{data.length} currencies configured</Text>
                <Space><Button icon={<ReloadOutlined />} onClick={load} /><Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Currency</Button></Space>
            </div>
            <Card style={{ ...glass }} styles={{ body: { padding: 0 } }}>
                <Table scroll={{ x: 900 }} dataSource={data.map(r => ({ ...r, key: r.id }))} loading={loading} size="small" pagination={false}
                    columns={[
                        { title: 'Code', dataIndex: 'code', width: 80, render: (v: string) => <Tag color="blue">{v}</Tag> },
                        { title: 'Name', dataIndex: 'name' },
                        { title: 'Symbol', dataIndex: 'symbol', width: 80 },
                        { title: 'Decimals', dataIndex: 'decimalPlaces', width: 90, align: 'center' as const },
                        { title: 'Exchange Rate', dataIndex: 'exchangeRate', width: 150, align: 'right' as const, render: (v: number) => <Text style={{ fontFamily: 'monospace' }}>{new Intl.NumberFormat('id-ID').format(Number(v))}</Text> },
                        { title: 'Default', dataIndex: 'isDefault', width: 80, align: 'center' as const, render: (v: boolean) => v ? <Tag color="green">✓</Tag> : '' },
                        { title: 'Status', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag> },
                        { title: '', width: 80, render: (_: any, r: AcctCurrency) => <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /> },
                    ]}
                />
            </Card>
            <Modal title={editing ? 'Edit Currency' : 'Add Currency'} open={modal} onOk={save} onCancel={() => setModal(false)} okText="Save">
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="code" label="Code (ISO 4217)" rules={[{ required: true, max: 3 }]}><Input maxLength={3} placeholder="IDR" style={{ textTransform: 'uppercase' }} /></Form.Item>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input placeholder="Indonesian Rupiah" /></Form.Item>
                    <Form.Item name="symbol" label="Symbol"><Input placeholder="Rp" /></Form.Item>
                    <Form.Item name="decimalPlaces" label="Decimal Places"><InputNumber min={0} max={4} style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="exchangeRate" label="Exchange Rate (to IDR)"><InputNumber min={0} step={0.01} style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="isDefault" label="Default Currency" valuePropName="checked"><Switch /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// FISCAL PERIODS TAB
// ═══════════════════════════════════════════════════════════
function FiscalPeriodsTab() {
    const [data, setData] = useState<AcctFiscalPeriod[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [form] = Form.useForm();

    const load = async () => { setLoading(true); try { setData(await accountingService.getFiscalPeriods()); } catch (e) { console.error(e); } finally { setLoading(false); } };
    useEffect(() => { load(); }, []);

    const save = async () => {
        try {
            const vals = await form.validateFields();
            const input = { name: vals.name, periodType: vals.periodType, startDate: vals.dates[0].format('YYYY-MM-DD'), endDate: vals.dates[1].format('YYYY-MM-DD') };
            await accountingService.createFiscalPeriod(undefined, input);
            message.success('Fiscal period created');
            setModal(false); form.resetFields(); load();
        } catch (e: any) { if (e.message) message.error(e.message); }
    };

    const closePeriod = async (id: string) => {
        try { await accountingService.closeFiscalPeriod(id, 'admin'); message.success('Period closed'); load(); }
        catch (e: any) { message.error(e.message); }
    };

    const statusColor: Record<string, string> = { open: 'green', closed: 'red', locked: 'default' };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text type="secondary">{data.length} fiscal periods</Text>
                <Space><Button icon={<ReloadOutlined />} onClick={load} /><Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal(true); }}>Add Period</Button></Space>
            </div>
            <Card style={{ ...glass }} styles={{ body: { padding: 0 } }}>
                <Table scroll={{ x: 900 }} dataSource={data.map(r => ({ ...r, key: r.id }))} loading={loading} size="small" pagination={false}
                    locale={{ emptyText: <Empty description="No fiscal periods yet. Create one to track accounting periods." /> }}
                    columns={[
                        { title: 'Name', dataIndex: 'name' },
                        { title: 'Type', dataIndex: 'periodType', width: 100, render: (v: string) => <Tag>{v || 'month'}</Tag> },
                        { title: 'Start', dataIndex: 'startDate', width: 120 },
                        { title: 'End', dataIndex: 'endDate', width: 120 },
                        { title: 'Status', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={statusColor[v]}>{v}</Tag> },
                        { title: '', width: 120, render: (_: any, r: AcctFiscalPeriod) => r.status === 'open' ? (
                            <Popconfirm title="Close this period? This cannot be undone." onConfirm={() => closePeriod(r.id)}><Button size="small" danger>Close Period</Button></Popconfirm>
                        ) : null },
                    ]}
                />
            </Card>
            <Modal title="Add Fiscal Period" open={modal} onOk={save} onCancel={() => setModal(false)} okText="Create">
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Period Name" rules={[{ required: true }]}><Input placeholder="FY 2026" /></Form.Item>
                    <Form.Item name="periodType" label="Period Type" initialValue="month"><Select options={[{ value: 'year', label: 'Year' }, { value: 'quarter', label: 'Quarter' }, { value: 'month', label: 'Month' }]} /></Form.Item>
                    <Form.Item name="dates" label="Date Range" rules={[{ required: true }]}><DatePicker.RangePicker style={{ width: '100%' }} /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// TAX RATES TAB
// ═══════════════════════════════════════════════════════════
function TaxRatesTab() {
    const [data, setData] = useState<AcctTax[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [form] = Form.useForm();

    const load = async () => { setLoading(true); try { setData(await accountingService.getTaxes()); } catch (e) { console.error(e); } finally { setLoading(false); } };
    useEffect(() => { load(); }, []);

    const save = async () => {
        try {
            const vals = await form.validateFields();
            await accountingService.createTax(undefined, vals);
            message.success('Tax rate added');
            setModal(false); form.resetFields(); load();
        } catch (e: any) { if (e.message) message.error(e.message); }
    };

    const typeColor: Record<string, string> = { vat: 'blue', income_tax: 'orange', withholding: 'purple' };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text type="secondary">{data.length} tax rates configured</Text>
                <Space><Button icon={<ReloadOutlined />} onClick={load} /><Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal(true); }}>Add Tax Rate</Button></Space>
            </div>
            <Card style={{ ...glass }} styles={{ body: { padding: 0 } }}>
                <Table scroll={{ x: 900 }} dataSource={data.map(r => ({ ...r, key: r.id }))} loading={loading} size="small" pagination={false}
                    columns={[
                        { title: 'Code', dataIndex: 'code', width: 100, render: (v: string) => <Tag color="blue">{v}</Tag> },
                        { title: 'Name', dataIndex: 'name' },
                        { title: 'Type', dataIndex: 'taxType', width: 120, render: (v: string) => <Tag color={typeColor[v] || 'default'}>{v?.replace(/_/g, ' ')}</Tag> },
                        { title: 'Rate', dataIndex: 'rate', width: 100, align: 'right' as const, render: (v: number) => <Text strong style={{ fontFamily: 'monospace' }}>{Number(v)}%</Text> },
                        { title: 'Inclusive', dataIndex: 'isInclusive', width: 90, align: 'center' as const, render: (v: boolean) => v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag> },
                        { title: 'Default', dataIndex: 'isDefault', width: 80, align: 'center' as const, render: (v: boolean) => v ? <Tag color="green">✓</Tag> : '' },
                        { title: 'Status', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag> },
                    ]}
                />
            </Card>
            <Modal title="Add Tax Rate" open={modal} onOk={save} onCancel={() => setModal(false)} okText="Create">
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="code" label="Code" rules={[{ required: true }]}><Input placeholder="PPN" /></Form.Item>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input placeholder="PPN 11%" /></Form.Item>
                    <Form.Item name="taxType" label="Tax Type" rules={[{ required: true }]}><Select options={[{ value: 'vat', label: 'VAT (PPN)' }, { value: 'income_tax', label: 'Income Tax (PPh)' }, { value: 'withholding', label: 'Withholding Tax' }]} /></Form.Item>
                    <Form.Item name="rate" label="Rate (%)" rules={[{ required: true }]}><InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} placeholder="11" /></Form.Item>
                    <Form.Item name="isInclusive" label="Tax Inclusive" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item name="isDefault" label="Default Tax" valuePropName="checked"><Switch /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// COST CENTERS TAB
// ═══════════════════════════════════════════════════════════
function CostCentersTab() {
    const [data, setData] = useState<AcctCostCenter[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [form] = Form.useForm();

    const load = async () => { setLoading(true); try { setData(await accountingService.getCostCenters()); } catch (e) { console.error(e); } finally { setLoading(false); } };
    useEffect(() => { load(); }, []);

    const save = async () => {
        try {
            const vals = await form.validateFields();
            await accountingService.createCostCenter(undefined, vals);
            message.success('Cost center created');
            setModal(false); form.resetFields(); load();
        } catch (e: any) { if (e.message) message.error(e.message); }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text type="secondary">{data.length} cost centers</Text>
                <Space><Button icon={<ReloadOutlined />} onClick={load} /><Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModal(true); }}>Add Cost Center</Button></Space>
            </div>
            <Card style={{ ...glass }} styles={{ body: { padding: 0 } }}>
                <Table scroll={{ x: 900 }} dataSource={data.map(r => ({ ...r, key: r.id }))} loading={loading} size="small" pagination={false}
                    locale={{ emptyText: <Empty description="No cost centers yet. Create departments or projects to track expenses." /> }}
                    columns={[
                        { title: 'Code', dataIndex: 'code', width: 100, render: (v: string) => <Text style={{ fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Name', dataIndex: 'name' },
                        { title: 'Manager', dataIndex: 'manager', width: 150 },
                        { title: 'Description', dataIndex: 'description', ellipsis: true },
                        { title: 'Status', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={v === 'active' ? 'green' : 'default'}>{v}</Tag> },
                    ]}
                />
            </Card>
            <Modal title="Add Cost Center" open={modal} onOk={save} onCancel={() => setModal(false)} okText="Create">
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="code" label="Code" rules={[{ required: true }]}><Input placeholder="DEPT-IT" /></Form.Item>
                    <Form.Item name="name" label="Name" rules={[{ required: true }]}><Input placeholder="IT Department" /></Form.Item>
                    <Form.Item name="manager" label="Manager"><Input placeholder="John Doe" /></Form.Item>
                    <Form.Item name="description" label="Description"><Input.TextArea rows={2} placeholder="Description..." /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// MAIN SETTINGS PAGE
// ═══════════════════════════════════════════════════════════
export default function AccountingSettingsPage() {
    const { themeColor } = usePreferencesStore();
    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Accounting Settings</AuroraText>}
            subTitle={<DecryptedText text="Currencies, Fiscal Periods, Tax Rates & Cost Centers" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Tabs defaultActiveKey="currencies" items={[
                { key: 'currencies', label: <span><DollarOutlined /> Currencies</span>, children: <CurrenciesTab /> },
                { key: 'fiscal', label: <span><CalendarOutlined /> Fiscal Periods</span>, children: <FiscalPeriodsTab /> },
                { key: 'taxes', label: <span><PercentageOutlined /> Tax Rates</span>, children: <TaxRatesTab /> },
                { key: 'costcenters', label: <span><ApartmentOutlined /> Cost Centers</span>, children: <CostCentersTab /> },
            ]} />
        </div>
        </CMSLayout>
    );
}
