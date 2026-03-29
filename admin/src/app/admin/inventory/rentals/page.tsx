'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Button, Space, message, Tabs, Progress, Drawer, Descriptions, Badge, Tooltip, Modal, Form, Input, InputNumber, Select, DatePicker, Row, Col } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined, ToolOutlined, CheckCircleOutlined, WarningOutlined, DollarOutlined, SwapOutlined, ClockCircleOutlined, CarOutlined, EyeOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { inventoryService, RentalAsset, RentalContract, RentalStatsType } from '@/lib/inventoryService';
import dayjs from 'dayjs';
import DecryptedText from "@/components/react-bits/DecryptedText";
import { AuroraText } from "@/components/magicui/aurora-text";

const CONDITION_COLORS: Record<string, string> = { excellent: 'green', good: 'blue', fair: 'orange', poor: 'red' };
const STATUS_COLORS: Record<string, string> = { available: 'green', rented: 'blue', maintenance: 'orange', retired: 'default', active: 'blue', returned: 'green', overdue: 'red', lost: 'volcano' };

export default function RentalsPage() {
    const [assets, setAssets] = useState<RentalAsset[]>([]);
    const [contracts, setContracts] = useState<RentalContract[]>([]);
    const [stats, setStats] = useState<RentalStatsType | null>(null);
    const [detailContract, setDetailContract] = useState<RentalContract | null>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('assets');
    const [search, setSearch] = useState('');
    const { Card } = require('antd');

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

    const handleCreateContract = async () => {
        try {
            const values = await contractForm.validateFields();
            const input: Record<string, any> = {
                contractCode: values.contractCode,
                assetId: values.assetId,
                assetName: values.assetName,
                customerName: values.customerName,
                customerEmail: values.customerEmail,
                customerPhone: values.customerPhone,
                customerIdNumber: values.customerIdNumber,
                checkoutDate: values.checkoutDate?.format('YYYY-MM-DD'),
                expectedReturnDate: values.expectedReturnDate?.format('YYYY-MM-DD'),
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
        } catch (e: any) {
            if (e.errorFields) return;
            message.error(e.message || 'Failed to create contract');
        }
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
        { label: 'Total Assets', value: stats?.totalAssets || 0, icon: <CarOutlined />, color: '#7c3aed' },
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
        { title: 'Serial No.', dataIndex: 'serialNumber', render: (v: string) => v ? <Tag style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</Tag> : '—' },
        { title: 'Condition', dataIndex: 'condition', render: (v: string) => <Tag color={CONDITION_COLORS[v] || 'default'}>{v}</Tag> },
        { title: 'Location', dataIndex: 'currentLocation', ellipsis: true },
        { title: 'Daily Rate', dataIndex: 'dailyRate', render: fmt },
        { title: 'Deposit', dataIndex: 'depositAmount', render: fmt },
        { title: 'Rentals', dataIndex: 'totalRentals', render: (v: number) => <strong>{v}</strong> },
        { title: 'Revenue', dataIndex: 'totalRevenue', render: fmt },
        { title: 'Next Maint.', dataIndex: 'nextMaintenanceDate', render: (v: string) => {
            if (!v) return '—';
            const d = new Date(v);
            const now = new Date();
            const isOverdue = d < now;
            return <span style={{ color: isOverdue ? '#f5222d' : undefined }}>{d.toLocaleDateString('id-ID')}{isOverdue ? ' ⚠️' : ''}</span>;
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
        { title: 'Late Fee', dataIndex: 'lateFee', render: (v: number) => v > 0 ? <span style={{ color: '#f5222d', fontWeight: 600 }}>{fmt(v)}</span> : '—' },
        { title: 'Damage Fee', dataIndex: 'damageFee', render: (v: number) => v > 0 ? <span style={{ color: '#fa8c16', fontWeight: 600 }}>{fmt(v)}</span> : '—' },
        { title: 'Total', dataIndex: 'totalCharge', render: (v: number) => <strong>{fmt(v)}</strong> },
        { title: 'Status', dataIndex: 'status', render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag> },
        { title: 'Actions', render: (_: any, r: RentalContract) => (
            <Space>
                <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailContract(r)}>Detail</Button>
                {r.status === 'active' && (
                    <Button size="small" type="primary" onClick={() => handleReturn(r.id)}>Return</Button>
                )}
            </Space>
        )},
    ];

    const filteredAssets = assets.filter(a => !search || a.assetName.toLowerCase().includes(search.toLowerCase()) || a.assetCode.toLowerCase().includes(search.toLowerCase()));
    const filteredContracts = contracts.filter(c => !search || c.customerName.toLowerCase().includes(search.toLowerCase()) || c.contractCode.toLowerCase().includes(search.toLowerCase()));

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
                            style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.5)' }}>
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
                        <Button type="primary" icon={<PlusOutlined />}
                            onClick={() => { contractForm.resetFields(); setContractModalOpen(true); setTab('contracts'); }}
                            style={{ background: 'linear-gradient(135deg, #d97706, #dc2626)', border: 'none', borderRadius: 8 }}>
                            New Contract
                        </Button>
                    </Space>
                </div>

                <Card size="small" style={{ flex: 1, borderRadius: 12, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.5)' }}>
                    {/* Tabs */}
                    <Tabs activeKey={tab} onChange={setTab} items={[
                        { key: 'assets', label: `🏷️ Assets (${assets.length})`, children: (
                            <Table dataSource={filteredAssets} columns={assetColumns} rowKey="id" size="middle" loading={loading}
                                pagination={{ pageSize: 10 }} scroll={{ x: 1400 }} />
                        )},
                        { key: 'contracts', label: `📋 Contracts (${contracts.length})`, children: (
                            <Table dataSource={filteredContracts} columns={contractColumns} rowKey="id" size="middle" loading={loading}
                                pagination={{ pageSize: 10 }} scroll={{ x: 1500 }} />
                        )},
                    ]} />
                </Card>

                {/* Contract Detail Drawer */}
                <Drawer title={`Contract Detail — ${detailContract?.contractCode}`} open={!!detailContract} onClose={() => setDetailContract(null)} width={560}>
                    {detailContract && (
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="Contract Code"><Tag style={{ fontFamily: 'monospace' }}>{detailContract.contractCode}</Tag></Descriptions.Item>
                            <Descriptions.Item label="Asset">{detailContract.assetName}</Descriptions.Item>
                            <Descriptions.Item label="Customer">{detailContract.customerName}</Descriptions.Item>
                            <Descriptions.Item label="Email">{detailContract.customerEmail || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Phone">{detailContract.customerPhone || '—'}</Descriptions.Item>
                            <Descriptions.Item label="ID Number">{detailContract.customerIdNumber || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Checkout Date">{new Date(detailContract.checkoutDate).toLocaleDateString('id-ID')}</Descriptions.Item>
                            <Descriptions.Item label="Expected Return">{new Date(detailContract.expectedReturnDate).toLocaleDateString('id-ID')}</Descriptions.Item>
                            <Descriptions.Item label="Actual Return">{detailContract.actualReturnDate ? new Date(detailContract.actualReturnDate).toLocaleDateString('id-ID') : <Tag color="blue">Ongoing</Tag>}</Descriptions.Item>
                            <Descriptions.Item label="Rental Days"><strong>{detailContract.rentalDays}</strong></Descriptions.Item>
                            <Descriptions.Item label="Daily Rate">{fmt(detailContract.dailyRate || 0)}</Descriptions.Item>
                            <Descriptions.Item label="Deposit">{fmt(detailContract.depositAmount || 0)}</Descriptions.Item>
                            <Descriptions.Item label="Deposit Returned">{fmt(detailContract.depositReturned || 0)}</Descriptions.Item>
                            <Descriptions.Item label="Subtotal">{fmt(detailContract.subtotal || 0)}</Descriptions.Item>
                            <Descriptions.Item label="Late Fee">{detailContract.lateFee ? <span style={{ color: '#f5222d' }}>{fmt(detailContract.lateFee)}</span> : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Damage Fee">{detailContract.damageFee ? <span style={{ color: '#fa8c16' }}>{fmt(detailContract.damageFee)}</span> : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Total Charge"><strong style={{ fontSize: 16 }}>{fmt(detailContract.totalCharge || 0)}</strong></Descriptions.Item>
                            <Descriptions.Item label="Checkout Condition"><Tag color={CONDITION_COLORS[detailContract.checkoutCondition || ''] || 'default'}>{detailContract.checkoutCondition || '—'}</Tag></Descriptions.Item>
                            <Descriptions.Item label="Return Condition">{detailContract.returnCondition ? <Tag color={CONDITION_COLORS[detailContract.returnCondition] || 'default'}>{detailContract.returnCondition}</Tag> : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Checkout Notes">{detailContract.checkoutNotes || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Return Notes">{detailContract.returnNotes || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Status"><Tag color={STATUS_COLORS[detailContract.status || ''] || 'default'}>{detailContract.status}</Tag></Descriptions.Item>
                        </Descriptions>
                    )}
                </Drawer>

                {/* ─── New Rental Contract Modal ──────────────────────── */}
                <Modal title="New Rental Contract" open={contractModalOpen} onCancel={() => setContractModalOpen(false)}
                    onOk={handleCreateContract} okText="Create Contract" width={660}>
                    <Form form={contractForm} layout="vertical" initialValues={{ checkoutCondition: 'good' }}>
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
                                            value: a.id, label: `${a.assetCode} — ${a.assetName} (${a.category || '—'})`
                                        }))} />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="assetName" hidden><Input /></Form.Item>
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
                            <Col span={8}>
                                <Form.Item name="customerIdNumber" label="ID Number">
                                    <Input placeholder="KTP / Passport" />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="checkoutDate" label="Checkout Date" rules={[{ required: true }]}>
                                    <DatePicker style={{ width: '100%' }} onChange={() => recalcRental()} />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
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
                                <Form.Item name="checkoutCondition" label="Checkout Condition">
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
                    </Form>
                </Modal>
            </div>
        </CMSLayout>
    );
}

