'use client';
import React, { useEffect, useState } from 'react';
import CMSLayout from '@/components/layout/CMSLayout';
import { Table, Card, Typography, Space, Tag, Button, Input, Select, Row, Col, Statistic, Empty, Modal, Descriptions, Progress, message, Popconfirm, InputNumber } from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined, DollarOutlined, DeleteOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { accountingService, AcctInvoice, AcctInvoiceSummary, AcctInvoiceLine } from '@/lib/accountingService';

const { Title, Text } = Typography;
const formatCurrency = (v: number | string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(v) || 0);

const statusColor: Record<string, string> = { draft: 'default', sent: 'blue', partial: 'orange', paid: 'green', overdue: 'red', cancelled: 'default' };
const statusIcon: Record<string, React.ReactNode> = { paid: <CheckCircleOutlined />, overdue: <WarningOutlined /> };

export default function AccountsReceivablePage() {
    const [invoices, setInvoices] = useState<AcctInvoice[]>([]);
    const [summary, setSummary] = useState<AcctInvoiceSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [detailModal, setDetailModal] = useState<AcctInvoice | null>(null);
    const [detailLines, setDetailLines] = useState<AcctInvoiceLine[]>([]);
    const [paymentModal, setPaymentModal] = useState<AcctInvoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);

    const load = async () => {
        setLoading(true);
        try {
            const [inv, sum] = await Promise.all([
                accountingService.getInvoices(undefined, { invoiceType: 'receivable', status: statusFilter, search: search || undefined }),
                accountingService.getInvoiceSummary(undefined, 'receivable'),
            ]);
            setInvoices(inv); setSummary(sum);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [statusFilter]);

    const openDetail = async (inv: AcctInvoice) => {
        setDetailModal(inv);
        try { setDetailLines(await accountingService.getInvoiceLines(inv.id)); } catch { setDetailLines([]); }
    };

    const handlePayment = async () => {
        if (!paymentModal || paymentAmount <= 0) return;
        try {
            await accountingService.recordPayment(paymentModal.id, paymentAmount);
            message.success('Payment received');
            setPaymentModal(null); setPaymentAmount(0); load();
        } catch (e: any) { message.error(e.message); }
    };

    const handleSend = async (id: string) => {
        try { await accountingService.updateInvoiceStatus(id, 'sent'); message.success('Invoice sent'); load(); }
        catch (e: any) { message.error(e.message); }
    };

    const handleDelete = async (id: string) => {
        try { await accountingService.deleteInvoice(id); message.success('Invoice deleted'); load(); }
        catch (e: any) { message.error(e.message); }
    };

    const columns: any[] = [
        { title: 'Invoice #', dataIndex: 'invoiceNumber', width: 150, render: (v: string) => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text> },
        { title: 'Customer', dataIndex: 'contactName', ellipsis: true },
        { title: 'Date', dataIndex: 'invoiceDate', width: 110 },
        { title: 'Due Date', dataIndex: 'dueDate', width: 110, render: (v: string, r: AcctInvoice) => { const isOverdue = new Date(v) < new Date() && Number(r.amountDue) > 0; return <Text type={isOverdue ? 'danger' : undefined}>{v}</Text>; } },
        { title: 'Total', dataIndex: 'totalAmount', width: 160, align: 'right' as const, render: (v: number) => <Text style={{ fontFamily: 'monospace' }}>{formatCurrency(v)}</Text> },
        { title: 'Received', dataIndex: 'amountPaid', width: 160, align: 'right' as const, render: (v: number) => Number(v) > 0 ? <Text style={{ fontFamily: 'monospace', color: '#52c41a' }}>{formatCurrency(v)}</Text> : '' },
        { title: 'Outstanding', dataIndex: 'amountDue', width: 160, align: 'right' as const, render: (v: number) => Number(v) > 0 ? <Text strong style={{ fontFamily: 'monospace', color: '#1890ff' }}>{formatCurrency(v)}</Text> : <Tag color="green">Paid</Tag> },
        { title: 'Status', dataIndex: 'status', width: 100, render: (v: string) => <Tag color={statusColor[v]} icon={statusIcon[v]}>{v}</Tag> },
        { title: '', width: 160, render: (_: any, r: AcctInvoice) => (
            <Space size="small">
                <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)} />
                {r.status === 'draft' && <Button type="text" size="small" onClick={() => handleSend(r.id)}>Send</Button>}
                {Number(r.amountDue) > 0 && r.status !== 'draft' && <Button type="text" size="small" icon={<DollarOutlined />} onClick={() => { setPaymentModal(r); setPaymentAmount(Number(r.amountDue)); }} />}
                {r.status === 'draft' && <Popconfirm title="Delete?" onConfirm={() => handleDelete(r.id)}><Button type="text" size="small" danger icon={<DeleteOutlined />} /></Popconfirm>}
            </Space>
        ) },
    ];

    return (
        <CMSLayout title="Accounts Receivable" subTitle="Manage customer invoices and collections">
        <div style={{ padding: '0 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div><Title level={3} style={{ margin: 0 }}>Accounts Receivable</Title><Text type="secondary">Manage customer invoices and track collections</Text></div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={6}><Card size="small" style={{ borderRadius: 10, background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)' }}><Statistic title="Total Invoices" value={summary.totalInvoices} valueStyle={{ fontWeight: 700 }} /></Card></Col>
                    <Col xs={24} sm={6}><Card size="small" style={{ borderRadius: 10, background: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)' }}><Statistic title="Outstanding" value={summary.totalOutstanding} formatter={v => formatCurrency(Number(v))} valueStyle={{ color: '#722ed1', fontWeight: 700 }} /></Card></Col>
                    <Col xs={24} sm={6}><Card size="small" style={{ borderRadius: 10, background: 'linear-gradient(135deg, #fff2f0 0%, #ffccc7 100%)' }}><Statistic title="Overdue" value={summary.overdue} formatter={v => formatCurrency(Number(v))} valueStyle={{ color: '#ff4d4f', fontWeight: 700 }} /></Card></Col>
                    <Col xs={24} sm={6}><Card size="small" style={{ borderRadius: 10, background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)' }}><Statistic title="Current" value={summary.current} formatter={v => formatCurrency(Number(v))} valueStyle={{ color: '#52c41a', fontWeight: 700 }} /></Card></Col>
                </Row>
            )}

            {/* Aging */}
            {summary && summary.totalOutstanding > 0 && (
                <Card size="small" style={{ marginBottom: 16, borderRadius: 10 }}>
                    <Text strong style={{ marginBottom: 8, display: 'block' }}>Aging Report</Text>
                    <Row gutter={16}>
                        <Col span={6}><Text type="secondary">Current</Text><br /><Text strong>{formatCurrency(summary.current)}</Text></Col>
                        <Col span={6}><Text type="secondary">1-30 days</Text><br /><Text strong style={{ color: '#faad14' }}>{formatCurrency(summary.aging30)}</Text></Col>
                        <Col span={6}><Text type="secondary">31-60 days</Text><br /><Text strong style={{ color: '#fa8c16' }}>{formatCurrency(summary.aging60)}</Text></Col>
                        <Col span={3}><Text type="secondary">61-90 days</Text><br /><Text strong style={{ color: '#ff4d4f' }}>{formatCurrency(summary.aging90)}</Text></Col>
                        <Col span={3}><Text type="secondary">90+ days</Text><br /><Text strong style={{ color: '#cf1322' }}>{formatCurrency(summary.aging90plus)}</Text></Col>
                    </Row>
                </Card>
            )}

            {/* Filters */}
            <Card size="small" style={{ marginBottom: 16, borderRadius: 10 }}>
                <Space wrap>
                    <Input placeholder="Search invoices..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} onPressEnter={load} style={{ width: 260 }} allowClear />
                    <Select placeholder="Status" value={statusFilter} onChange={setStatusFilter} allowClear style={{ width: 140 }} options={[{ value: 'draft', label: 'Draft' }, { value: 'sent', label: 'Sent' }, { value: 'partial', label: 'Partial' }, { value: 'paid', label: 'Paid' }]} />
                    <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
                </Space>
            </Card>

            {/* Table */}
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
                <Table dataSource={invoices.map(i => ({ ...i, key: i.id }))} columns={columns} loading={loading} size="small"
                    pagination={{ pageSize: 20, showTotal: t => `${t} invoices` }}
                    locale={{ emptyText: <Empty description="No customer invoices found" /> }}
                />
            </Card>

            {/* Detail Modal */}
            <Modal title={`Invoice: ${detailModal?.invoiceNumber}`} open={!!detailModal} onCancel={() => setDetailModal(null)} footer={null} width={700}>
                {detailModal && (
                    <>
                        <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="Customer">{detailModal.contactName}</Descriptions.Item>
                            <Descriptions.Item label="Status"><Tag color={statusColor[detailModal.status]}>{detailModal.status}</Tag></Descriptions.Item>
                            <Descriptions.Item label="Invoice Date">{detailModal.invoiceDate}</Descriptions.Item>
                            <Descriptions.Item label="Due Date">{detailModal.dueDate}</Descriptions.Item>
                            <Descriptions.Item label="Reference">{detailModal.reference || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Currency">{detailModal.currencyCode}</Descriptions.Item>
                            <Descriptions.Item label="Subtotal">{formatCurrency(detailModal.subtotal)}</Descriptions.Item>
                            <Descriptions.Item label="Tax">{formatCurrency(detailModal.taxAmount)}</Descriptions.Item>
                            <Descriptions.Item label="Total">{formatCurrency(detailModal.totalAmount)}</Descriptions.Item>
                            <Descriptions.Item label="Received">{formatCurrency(detailModal.amountPaid)}</Descriptions.Item>
                            <Descriptions.Item label="Outstanding" span={2}><Text strong style={{ color: Number(detailModal.amountDue) > 0 ? '#1890ff' : '#52c41a', fontSize: 16 }}>{formatCurrency(detailModal.amountDue)}</Text></Descriptions.Item>
                        </Descriptions>
                        {detailModal.notes && <Card size="small" style={{ marginBottom: 16 }}><Text type="secondary">Notes: </Text>{detailModal.notes}</Card>}
                        <Text strong>Line Items</Text>
                        <Table dataSource={detailLines.map(l => ({ ...l, key: l.id }))} size="small" pagination={false} style={{ marginTop: 8 }}
                            columns={[
                                { title: '#', dataIndex: 'lineNumber', width: 40 },
                                { title: 'Description', dataIndex: 'description' },
                                { title: 'Qty', dataIndex: 'quantity', width: 60, align: 'right' as const, render: (v: number) => Number(v) },
                                { title: 'Price', dataIndex: 'unitPrice', width: 140, align: 'right' as const, render: (v: number) => formatCurrency(v) },
                                { title: 'Amount', dataIndex: 'amount', width: 160, align: 'right' as const, render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
                            ]}
                        />
                        {Number(detailModal.totalAmount) > 0 && (
                            <Progress percent={Math.round((Number(detailModal.amountPaid) / Number(detailModal.totalAmount)) * 100)} status={detailModal.status === 'paid' ? 'success' : 'active'} style={{ marginTop: 12 }} />
                        )}
                    </>
                )}
            </Modal>

            {/* Payment Modal */}
            <Modal title={`Record Payment — ${paymentModal?.invoiceNumber}`} open={!!paymentModal} onOk={handlePayment} onCancel={() => setPaymentModal(null)} okText="Record Payment">
                {paymentModal && (
                    <div style={{ padding: '16px 0' }}>
                        <Text type="secondary">Outstanding: </Text><Text strong style={{ color: '#1890ff' }}>{formatCurrency(paymentModal.amountDue)}</Text>
                        <br /><br />
                        <Text>Payment Amount:</Text>
                        <InputNumber value={paymentAmount} onChange={v => setPaymentAmount(v || 0)} style={{ width: '100%', marginTop: 8 }}
                            formatter={v => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={v => Number((v || '').replace(/Rp\s?|(\.)/g, ''))}
                            min={0} max={Number(paymentModal.amountDue)}
                        />
                    </div>
                )}
            </Modal>
        </div>
        </CMSLayout>
    );
}
