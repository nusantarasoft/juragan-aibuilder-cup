'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Button, Space, message, Tabs, Progress, Drawer, Descriptions, Badge, Tooltip, Modal, Form, Input, InputNumber, Select, DatePicker, Row, Col, Card, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined, ToolOutlined, CheckCircleOutlined, WarningOutlined, DollarOutlined, SwapOutlined, ClockCircleOutlined, CarOutlined, EyeOutlined, UserOutlined, CalendarOutlined , FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import RbacGuard from '@/components/common/RbacGuard';
import { inventoryService, RentalAsset, RentalContract, RentalStatsType } from '@/lib/inventoryService';
import dayjs from 'dayjs';
import DecryptedText from "@/components/react-bits/DecryptedText";
import { AuroraText } from "@/components/magicui/aurora-text";
import SteppedFormModal from "@/components/common/SteppedFormModal";
import type { FieldDef } from "@/components/common/DataImportExport";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const CONDITION_COLORS: Record<string, string> = { excellent: 'green', good: 'blue', fair: 'orange', poor: 'red' };
const STATUS_COLORS: Record<string, string> = { available: 'green', rented: 'blue', maintenance: 'orange', retired: 'default', active: 'blue', returned: 'green', overdue: 'red', lost: 'volcano', cancelled: 'default' };

const CONTRACT_FIELDS: FieldDef[] = [
    { name: 'contractCode', label: 'Contract Code', required: true },
    { name: 'assetId', label: 'Asset', required: true },
    { name: 'customerName', label: 'Customer Name', required: true },
    { name: 'customerEmail', label: 'Customer Email' },
    { name: 'customerPhone', label: 'Customer Phone' },
    { name: 'customerIdNumber', label: 'ID Number' },
    { name: 'checkoutDate', label: 'Checkout Date', required: true },
    { name: 'expectedReturnDate', label: 'Expected Return', required: true },
    { name: 'dailyRate', label: 'Daily Rate', type: 'number' },
    { name: 'depositAmount', label: 'Deposit', type: 'number' },
    { name: 'subtotal', label: 'Subtotal', type: 'number' },
    { name: 'totalCharge', label: 'Total Charge', type: 'number' },
    { name: 'checkoutCondition', label: 'Checkout Condition' },
    { name: 'checkoutNotes', label: 'Checkout Notes' },
];

export default function RentalsPage() {
    const [assets, setAssets] = useState<RentalAsset[]>([]);
    const [contracts, setContracts] = useState<RentalContract[]>([]);
    const [stats, setStats] = useState<RentalStatsType | null>(null);
    const [detailContract, setDetailContract] = useState<RentalContract | null>(null);
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('assets');
    const [search, setSearch] = useState('');

    // New Rental Contract modal
    const [contractModalOpen, setContractModalOpen] = useState(false);
    const [contractForm] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [a, c, s] = await Promise.all([
                inventoryService.getRentalAssets(),
                inventoryService.getRentalContracts(),
                inventoryService.getRentalStats(),
            ]);
            setAssets(a); setContracts(c); setStats(s);
        } catch (e: any) { message.error(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleReturn = async (contractId: string) => {
        try {
            await inventoryService.returnRentalAsset(contractId, 'good');
            message.success('Asset returned successfully');
            load();
        } catch (e: any) { message.error(e.message); }
    };

    const handleCancelContract = async (contractId: string) => {
        try {
            await inventoryService.cancelRentalContract(contractId);
            message.success('Contract cancelled â€” asset released');
            load();
        } catch (e: any) { message.error(e.message); }
    };

    const handleCreateContract = async (values: any) => {
        const input: Record<string, any> = {
            contractCode: values.contractCode,
            assetId: values.assetId,
            assetName: values.assetName,
            customerName: values.customerName,
            customerEmail: values.customerEmail,
            customerPhone: values.customerPhone,
            customerIdNumber: values.customerIdNumber,
            checkoutDate: values.checkoutDate?.format ? values.checkoutDate.format('YYYY-MM-DD') : values.checkoutDate,
            expectedReturnDate: values.expectedReturnDate?.format ? values.expectedReturnDate.format('YYYY-MM-DD') : values.expectedReturnDate,
            dailyRate: values.dailyRate,
            depositAmount: values.depositAmount,
            subtotal: values.subtotal,
            totalCharge: values.totalCharge,
            checkoutCondition: values.checkoutCondition,
            checkoutNotes: values.checkoutNotes,
        };
        await inventoryService.createRentalContract('default', input);
        message.success('Rental contract created');
        setContractModalOpen(false);
        contractForm.resetFields();
        load();
    };

    const handleBatchCreateContract = async (records: any[]) => {
        let success = 0, failed = 0;
        const errors: string[] = [];
        for (const r of records) {
            try { await inventoryService.createRentalContract('default', r); success++; }
            catch (e: any) { failed++; errors.push(`${r.contractCode || 'Unknown'}: ${e.message || 'Failed'}`); }
        }
        load();
        return { success, failed, errors };
    };

    const onAssetChange = (assetId: string) => {
        const asset = assets.find(a => a.id === assetId);
        if (asset) {
            contractForm.setFieldsValue({
                assetName: asset.assetName,
                dailyRate: asset.dailyRate || 0,
                depositAmount: asset.depositAmount || 0,
            });
            recalcRental();
        }
    };

    const recalcRental = () => {
        const checkout = contractForm.getFieldValue('checkoutDate');
        const ret = contractForm.getFieldValue('expectedReturnDate');
        const rate = contractForm.getFieldValue('dailyRate') || 0;
        if (checkout && ret) {
            const days = Math.max(1, ret.diff(checkout, 'day'));
            const subtotal = days * rate;
            contractForm.setFieldsValue({ subtotal, totalCharge: subtotal + (contractForm.getFieldValue('depositAmount') || 0) });
        }
    };

    const fmt = (v: number) => `Rp ${(v || 0).toLocaleString('id-ID')}`;

    const kpis = [
        { label: 'Total Assets', value: stats?.totalAssets || 0, icon: <CarOutlined />, color: 'var(--theme-color, #7c3aed)' },
        { label: 'Available', value: stats?.available || 0, icon: <CheckCircleOutlined />, color: '#16a34a' },
        { label: 'Rented', value: stats?.rented || 0, icon: <SwapOutlined />, color: '#2563eb' },
        { label: 'Maintenance', value: stats?.maintenance || 0, icon: <ToolOutlined />, color: '#d97706' },
        { label: 'Active Contracts', value: stats?.activeContracts || 0, icon: <ClockCircleOutlined />, color: '#0891b2' },
        { label: 'Total Revenue', value: fmt(stats?.totalRevenue || 0), icon: <DollarOutlined />, color: '#dc2626' },
    ];

    const assetColumns = [
        { title: 'Code', dataIndex: 'assetCode', render: (v: string) => <Tag style={{ fontFamily: 'monospace' }}>{v}</Tag> },
        { title: 'Asset Name', dataIndex: 'assetName', ellipsis: true, render: (v: string) => <strong>{v}</strong> },
        { title: 'Category', dataIndex: 'category', render: (v: string) => <Tag color="purple">{v}</Tag> },
        { title: 'Serial No.', dataIndex: 'serialNumber', render: (v: string) => v ? <Tag style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</Tag> : 'â€”' },
        { title: 'Condition', dataIndex: 'condition', render: (v: string) => <Tag color={CONDITION_COLORS[v] || 'default'}>{v}</Tag> },
        { title: 'Location', dataIndex: 'currentLocation', ellipsis: true },
        { title: 'Daily Rate', dataIndex: 'dailyRate', render: fmt },
        { title: 'Deposit', dataIndex: 'depositAmount', render: fmt },
        { title: 'Rentals', dataIndex: 'totalRentals', render: (v: number) => <strong>{v}</strong> },
        { title: 'Revenue', dataIndex: 'totalRevenue', render: fmt },
        { title: 'Next Maint.', dataIndex: 'nextMaintenanceDate', render: (v: string) => {
            if (!v) return 'â€”';
            const d = new Date(v);
            const now = new Date();
            const isOverdue = d < now;
            return <span style={{ color: isOverdue ? '#f5222d' : undefined }}>{d.toLocaleDateString('id-ID')}{isOverdue ? ' âš ï¸' : ''}</span>;
        }},
        { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag> },
    ];

    const contractColumns = [
        { title: 'Code', dataIndex: 'contractCode', render: (v: string) => <Tag style={{ fontFamily: 'monospace' }}>{v}</Tag> },
        { title: 'Asset', dataIndex: 'assetName', ellipsis: true },
        { title: 'Customer', dataIndex: 'customerName', render: (v: string) => <strong>{v}</strong> },
        { title: 'Checkout', dataIndex: 'checkoutDate', render: (v: string) => new Date(v).toLocaleDateString('id-ID') },
        { title: 'Expected Return', dataIndex: 'expectedReturnDate', render: (v: string) => new Date(v).toLocaleDateString('id-ID') },
        { title: 'Actual Return', dataIndex: 'actualReturnDate', render: (v: string) => v ? new Date(v).toLocaleDateString('id-ID') : <Tag color="blue">Ongoing</Tag> },
        { title: 'Days', dataIndex: 'rentalDays', render: (v: number) => <strong>{v}</strong> },
        { title: 'Subtotal', dataIndex: 'subtotal', render: fmt },
        { title: 'Late Fee', dataIndex: 'lateFee', render: (v: number) => v > 0 ? <span style={{ color: '#f5222d', fontWeight: 600 }}>{fmt(v)}</span> : 'â€”' },
        { title: 'Damage Fee', dataIndex: 'damageFee', render: (v: number) => v > 0 ? <span style={{ color: '#fa8c16', fontWeight: 600 }}>{fmt(v)}</span> : 'â€”' },
        { title: 'Total', dataIndex: 'totalCharge', render: (v: number) => <strong>{fmt(v)}</strong> },
        { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag> },
        { title: 'Actions', render: (_: any, r: RentalContract) => (
            <Space>
                <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailContract(r)}>Detail</Button>
                {r.status === 'active' && (
                    <>
                        <Button size="small" type="primary" onClick={() => handleReturn(r.id)}>Return</Button>
                        <Button size="small" danger onClick={() => Modal.confirm({
                            title: 'Cancel this rental contract?',
                            content: 'The asset will be released back to available status.',
                            okText: 'Cancel Contract',
                            okButtonProps: { danger: true },
                            onOk: () => handleCancelContract(r.id),
                        })} style={{ fontSize: 11 }}>Cancel</Button>
                    </>
                )}
            </Space>
        )},
    ];

    const filteredAssets = assets.filter(a => !search || a.assetName.toLowerCase().includes(search.toLowerCase()) || a.assetCode.toLowerCase().includes(search.toLowerCase()));
    const filteredContracts = contracts.filter(c => !search || c.customerName.toLowerCase().includes(search.toLowerCase()) || c.contractCode.toLowerCase().includes(search.toLowerCase()));

    const contractSteps = [
        {
            title: "Asset & Contract",
            icon: <CarOutlined />,
            fields: ["contractCode", "assetId"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={10}>
                            <Form.Item name="contractCode" label="Contract Code" rules={[{ required: true }]}>
                                <Input placeholder="RNT-2026-XXX" />
                            </Form.Item>
                        </Col>
                        <Col span={14}>
                            <Form.Item name="assetId" label="Asset" rules={[{ required: true, message: 'Select an asset' }]}>
                                <Select placeholder="Select asset" showSearch
                                    filterOption={(input, option) => (option?.label as string || '').toLowerCase().includes(input.toLowerCase())}
                                    onChange={onAssetChange}
                                    options={assets.filter(a => a.status === 'available').map(a => ({
                                        value: a.id, label: `${a.assetCode} â€” ${a.assetName} (${a.category || 'â€”'})`
                                    }))} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="assetName" hidden><Input /></Form.Item>
                </>
            ),
        },
        {
            title: "Customer",
            icon: <UserOutlined />,
            fields: ["customerName", "customerEmail", "customerPhone", "customerIdNumber"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="customerName" label="Customer Name" rules={[{ required: true }]}>
                                <Input placeholder="Full name" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="customerEmail" label="Email">
                                <Input placeholder="email@example.com" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="customerPhone" label="Phone">
                                <Input placeholder="+62..." />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="customerIdNumber" label="ID Number">
                                <Input placeholder="KTP / Passport" />
                            </Form.Item>
                        </Col>
                    </Row>
                </>
            ),
        },
        {
            title: "Pricing & Schedule",
            icon: <DollarOutlined />,
            fields: ["checkoutDate", "expectedReturnDate", "dailyRate", "depositAmount", "subtotal", "totalCharge", "checkoutCondition", "checkoutNotes"],
            content: (
                <>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="checkoutDate" label="Checkout Date" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} onChange={() => recalcRental()} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="expectedReturnDate" label="Expected Return" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} onChange={() => recalcRental()} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={6}>
                            <Form.Item name="dailyRate" label="Daily Rate">
                                <InputNumber min={0} style={{ width: '100%' }} prefix="Rp" onChange={() => recalcRental()} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="depositAmount" label="Deposit">
                                <InputNumber min={0} style={{ width: '100%' }} prefix="Rp" onChange={() => recalcRental()} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="subtotal" label="Subtotal">
                                <InputNumber min={0} style={{ width: '100%' }} prefix="Rp" disabled />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="totalCharge" label="Total Charge">
                                <InputNumber min={0} style={{ width: '100%' }} prefix="Rp" disabled />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="checkoutCondition" label="Checkout Condition" initialValue="good">
                                <Select options={[
                                    { value: 'excellent', label: 'Excellent' }, { value: 'good', label: 'Good' },
                                    { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' },
                                ]} />
                            </Form.Item>
                        </Col>
                        <Col span={16}>
                            <Form.Item name="checkoutNotes" label="Checkout Notes">
                                <Input.TextArea rows={1} placeholder="Condition notes..." />
                            </Form.Item>
                        </Col>
                    </Row>
                </>
            ),
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={["#d97706", "#dc2626", "#f59e0b", "#ff0000", "#ea580c"]}>Rental Management</AuroraText>}
            subTitle={<DecryptedText text="Asset tracking, rental contracts, and condition monitoring" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }}>
                    {kpis.map((k, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            style={{ ...glass, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.5)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ color: k.color, fontSize: 16 }}>{k.icon}</span>
                                <span style={{ color: '#999', fontSize: 12 }}>{k.label}</span>
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{typeof k.value === 'number' ? k.value : k.value}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Search + Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Input prefix={<SearchOutlined />} placeholder="Search assets, contracts..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 320 }} allowClear />
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
                            <RbacGuard requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'inventory_rentals', title: 'Rental Assets', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Category', key: 'category' }, { header: 'Status', key: 'status' }, { header: 'Daily Rate', key: 'dailyRate' }], data: assets })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'inventory_rentals', title: 'Rental Assets', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Name', key: 'name' }, { header: 'Category', key: 'category' }, { header: 'Status', key: 'status' }, { header: 'Daily Rate', key: 'dailyRate' }], data: assets })} /></Tooltip></RbacGuard>
                        <Button type="primary" icon={<PlusOutlined />}
                            onClick={() => { contractForm.resetFields(); setContractModalOpen(true); setTab('contracts'); }}
                            style={{ background: 'linear-gradient(135deg, #d97706, #dc2626)', border: 'none', borderRadius: 8 }}>
                            New Contract
                        </Button>
                    </Space>
                </div>

                <Card size="small" style={{ flex: 1, ...glass, borderRadius: 12, border: '1px solid rgba(255,255,255,0.5)' }}>
                    {/* Tabs */}
                    <Tabs activeKey={tab} onChange={setTab} items={[
                        { key: 'assets', label: `ðŸ·ï¸ Assets (${assets.length})`, children: (
                            <Table dataSource={filteredAssets} columns={assetColumns} rowKey="id" size="middle" loading={loading}
                                pagination={{ pageSize: 10 }} scroll={{ x: 1400 }} />
                        )},
                        { key: 'contracts', label: `ðŸ“‹ Contracts (${contracts.length})`, children: (
                            <Table dataSource={filteredContracts} columns={contractColumns} rowKey="id" size="middle" loading={loading}
                                pagination={{ pageSize: 10 }} scroll={{ x: 1500 }} />
                        )},
                    ]} />
                </Card>

                {/* Contract Detail Drawer */}
                <Drawer title={`Contract Detail â€” ${detailContract?.contractCode}`} open={!!detailContract} onClose={() => setDetailContract(null)} width={560}>
                    {detailContract && (
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="Contract Code"><Tag style={{ fontFamily: 'monospace' }}>{detailContract.contractCode}</Tag></Descriptions.Item>
                            <Descriptions.Item label="Asset">{detailContract.assetName}</Descriptions.Item>
                            <Descriptions.Item label="Customer">{detailContract.customerName}</Descriptions.Item>
                            <Descriptions.Item label="Email">{detailContract.customerEmail || 'â€”'}</Descriptions.Item>
                            <Descriptions.Item label="Phone">{detailContract.customerPhone || 'â€”'}</Descriptions.Item>
                            <Descriptions.Item label="ID Number">{detailContract.customerIdNumber || 'â€”'}</Descriptions.Item>
                            <Descriptions.Item label="Checkout Date">{new Date(detailContract.checkoutDate).toLocaleDateString('id-ID')}</Descriptions.Item>
                            <Descriptions.Item label="Expected Return">{new Date(detailContract.expectedReturnDate).toLocaleDateString('id-ID')}</Descriptions.Item>
                            <Descriptions.Item label="Actual Return">{detailContract.actualReturnDate ? new Date(detailContract.actualReturnDate).toLocaleDateString('id-ID') : <Tag color="blue">Ongoing</Tag>}</Descriptions.Item>
                            <Descriptions.Item label="Rental Days"><strong>{detailContract.rentalDays}</strong></Descriptions.Item>
                            <Descriptions.Item label="Daily Rate">{fmt(detailContract.dailyRate || 0)}</Descriptions.Item>
                            <Descriptions.Item label="Deposit">{fmt(detailContract.depositAmount || 0)}</Descriptions.Item>
                            <Descriptions.Item label="Deposit Returned">{fmt(detailContract.depositReturned || 0)}</Descriptions.Item>
                            <Descriptions.Item label="Subtotal">{fmt(detailContract.subtotal || 0)}</Descriptions.Item>
                            <Descriptions.Item label="Late Fee">{detailContract.lateFee ? <span style={{ color: '#f5222d' }}>{fmt(detailContract.lateFee)}</span> : 'â€”'}</Descriptions.Item>
                            <Descriptions.Item label="Damage Fee">{detailContract.damageFee ? <span style={{ color: '#fa8c16' }}>{fmt(detailContract.damageFee)}</span> : 'â€”'}</Descriptions.Item>
                            <Descriptions.Item label="Total Charge"><strong style={{ fontSize: 16 }}>{fmt(detailContract.totalCharge || 0)}</strong></Descriptions.Item>
                            <Descriptions.Item label="Checkout Condition"><Tag color={CONDITION_COLORS[detailContract.checkoutCondition || ''] || 'default'}>{detailContract.checkoutCondition || 'â€”'}</Tag></Descriptions.Item>
                            <Descriptions.Item label="Return Condition">{detailContract.returnCondition ? <Tag color={CONDITION_COLORS[detailContract.returnCondition] || 'default'}>{detailContract.returnCondition}</Tag> : 'â€”'}</Descriptions.Item>
                            <Descriptions.Item label="Checkout Notes">{detailContract.checkoutNotes || 'â€”'}</Descriptions.Item>
                            <Descriptions.Item label="Return Notes">{detailContract.returnNotes || 'â€”'}</Descriptions.Item>
                            <Descriptions.Item label="Status"><Tag color={STATUS_COLORS[detailContract.status || ''] || 'default'}>{detailContract.status}</Tag></Descriptions.Item>
                        </Descriptions>
                    )}
                </Drawer>

                {/* â”€â”€â”€ Rental Contract SteppedFormModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <SteppedFormModal
                    open={contractModalOpen}
                    onCancel={() => { setContractModalOpen(false); contractForm.resetFields(); }}
                    onSubmit={handleCreateContract}
                    form={contractForm}
                    title="New Rental Contract"
                    entityName="rental_contract"
                    steps={contractSteps}
                    fields={CONTRACT_FIELDS}
                    width={680}
                    loading={false}
                    onBatchCreate={handleBatchCreateContract}
                    gradient={["#d97706", "#dc2626"]}
                />
            </div>
        </CMSLayout>
    );
}



