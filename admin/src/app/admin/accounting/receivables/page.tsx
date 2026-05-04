'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Table, Card, Typography, Space, Tag, Button, Input, Select, Row, Col, Empty, Modal, Descriptions, Progress, message, Popconfirm, InputNumber, DatePicker, Form, Divider, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined, DollarOutlined, DeleteOutlined, WarningOutlined, CheckCircleOutlined, PlusOutlined, MinusCircleOutlined, SendOutlined } from '@ant-design/icons';
import { accountingService, AcctInvoice, AcctInvoiceSummary, AcctInvoiceLine, AcctContact, AcctAccount } from '@/lib/accountingService';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import dayjs from 'dayjs';

const { Text } = Typography;
const formatCurrency = (v: number | string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(v) || 0);
const fmtShort = (v: number) => { if (Math.abs(v) >= 1e9) return `${(v/1e9).toFixed(1)}B`; if (Math.abs(v) >= 1e6) return `${(v/1e6).toFixed(0)}M`; if (Math.abs(v) >= 1e3) return `${(v/1e3).toFixed(0)}K`; return String(Math.round(v)); };

const statusColor: Record<string, string> = { draft: 'default', sent: 'blue', partial: 'orange', paid: 'green', overdue: 'red', cancelled: 'default' };
const statusIcon: Record<string, React.ReactNode> = { paid: <CheckCircleOutlined />, overdue: <WarningOutlined /> };
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

function AgingBar({ summary }: { summary: AcctInvoiceSummary }) {
    const buckets = [
        { value: summary.current || 0, color: '#10b981', label: 'Current' },
        { value: summary.aging30 || 0, color: '#f59e0b', label: '1-30d' },
        { value: summary.aging60 || 0, color: '#f97316', label: '31-60d' },
        { value: summary.aging90 || 0, color: '#ef4444', label: '61-90d' },
        { value: summary.aging90plus || 0, color: '#991b1b', label: '90+d' },
    ].filter(b => b.value > 0);
    const total = buckets.reduce((s, b) => s + b.value, 0);
    if (total === 0) return null;
    return (
        <div>
            <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 10, marginBottom: 10 }}>
                {buckets.map((b, i) => (
                    <Tooltip key={i} title={`${b.label}: ${formatCurrency(b.value)}`}>
                        <div style={{ width: `${(b.value / total) * 100}%`, background: b.color, transition: 'width 0.6s ease' }} />
                    </Tooltip>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {buckets.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{b.label}</Text>
                        <Text strong style={{ fontSize: 11, fontFamily: 'monospace' }}>{fmtShort(b.value)}</Text>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AccountsReceivablePage() {
    const { themeColor } = usePreferencesStore();
    const [invoices, setInvoices] = useState<AcctInvoice[]>([]);
    const [summary, setSummary] = useState<AcctInvoiceSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [detailModal, setDetailModal] = useState<AcctInvoice | null>(null);
    const [detailLines, setDetailLines] = useState<AcctInvoiceLine[]>([]);
    const [paymentModal, setPaymentModal] = useState<AcctInvoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [createOpen, setCreateOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [contacts, setContacts] = useState<AcctContact[]>([]);
    const [accounts, setAccounts] = useState<AcctAccount[]>([]);
    const [form] = Form.useForm();
    const [lines, setLines] = useState<{ description: string; quantity: number; unitPrice: number }[]>([{ description: '', quantity: 1, unitPrice: 0 }]);

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

    const openCreate = async () => {
        setCreateOpen(true);
        try {
            const [c, a] = await Promise.all([
                accountingService.getContacts(undefined, { contactType: 'customer' }),
                accountingService.getAccounts(),
            ]);
            setContacts(c); setAccounts(a.filter(acc => !acc.isHeader));
        } catch (e) { console.error(e); }
    };

    const handleCreate = async () => {
        try {
            const vals = await form.validateFields();
            setCreateLoading(true);
            const contact = contacts.find(c => c.id === vals.contactId);
            const invoiceLines = lines.filter(l => l.description).map(l => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, amount: l.quantity * l.unitPrice }));
            const arAccount = accounts.find(a => a.accountCode === '1210');
            await accountingService.createInvoice(undefined, {
                invoiceType: 'receivable', contactId: vals.contactId, contactName: contact?.name || '',
                invoiceDate: vals.invoiceDate?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
                dueDate: vals.dueDate.format('YYYY-MM-DD'), reference: vals.reference || undefined,
                notes: vals.notes || undefined, accountId: arAccount?.id, status: 'draft', lines: invoiceLines,
            } as any);
            message.success('Invoice created');
            setCreateOpen(false); form.resetFields(); setLines([{ description: '', quantity: 1, unitPrice: 0 }]); load();
        } catch (e: any) { if (e.message) message.error(e.message); }
        finally { setCreateLoading(false); }
    };

    const lineTotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

    const columns: any[] = [
        { title: 'Invoice #', dataIndex: 'invoiceNumber', width: 150, render: (v: string) => <Text strong style={{ fontFamily: 'monospace' }}>{v}</Text> },
        { title: 'Customer', dataIndex: 'contactName', ellipsis: true },
        { title: 'Date', dataIndex: 'invoiceDate', width: 110 },
        { title: 'Due Date', dataIndex: 'dueDate', width: 110, render: (v: string, r: AcctInvoice) => { const isOverdue = new Date(v) < new Date() && Number(r.amountDue) > 0; return <Text type={isOverdue ? 'danger' : undefined}>{v}</Text>; } },
        { title: 'Total', dataIndex: 'totalAmount', width: 160, align: 'right' as const, render: (v: number) => <Text style={{ fontFamily: 'monospace' }}>{formatCurrency(v)}</Text> },
        { title: 'Received', dataIndex: 'amountPaid', width: 160, align: 'right' as const, render: (v: number) => Number(v) > 0 ? <Text style={{ fontFamily: 'monospace', color: '#10b981' }}>{formatCurrency(v)}</Text> : '' },
        { title: 'Outstanding', dataIndex: 'amountDue', width: 160, align: 'right' as const, render: (v: number) => Number(v) > 0 ? <Text strong style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{formatCurrency(v)}</Text> : <Tag color="green">Paid</Tag> },
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

    const summaryCards = summary ? [
        { title: 'Total Invoices', value: summary.totalInvoices, color: '#3b82f6', isCount: true },
        { title: 'Outstanding', value: summary.totalOutstanding, color: '#8b5cf6', isCount: false },
        { title: 'Overdue', value: summary.overdue, color: '#ef4444', isCount: false },
        { title: 'Current', value: summary.current, color: '#10b981', isCount: false },
    ] : [];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Accounts Receivable</AuroraText>}
            subTitle={<DecryptedText text="Manage customer invoices and track collections" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
                    style={{ background: `linear-gradient(135deg, ${themeColor}, var(--theme-secondary, #6366f1))`, border: 'none', borderRadius: 10 }}>Create Invoice</Button>
            </div>

            {summary && (
                <Row gutter={[12, 12]}>
                    {summaryCards.map((card, i) => (
                        <Col xs={12} sm={6} key={i}>
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                                <Card size="small" style={{ ...glass }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${card.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Text strong style={{ color: card.color, fontSize: card.isCount ? 20 : 14, fontFamily: 'monospace' }}>
                                                {card.isCount ? card.value : fmtShort(Number(card.value))}
                                            </Text>
                                        </div>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{card.title}</Text>
                                            <Text strong style={{ fontSize: card.isCount ? 22 : 15, color: card.color, fontFamily: 'monospace' }}>
                                                {card.isCount ? card.value : formatCurrency(Number(card.value))}
                                            </Text>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>
            )}

            {summary && summary.totalOutstanding > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card size="small" style={{ ...glass }}>
                        <Text strong style={{ marginBottom: 10, display: 'block', fontSize: 13 }}>Aging Report</Text>
                        <AgingBar summary={summary} />
                    </Card>
                </motion.div>
            )}

            <Card size="small" style={{ ...glass }}>
                <Space wrap>
                    <Input placeholder="Search invoices..." prefix={<SearchOutlined style={{ opacity: 0.4 }} />} value={search} onChange={e => setSearch(e.target.value)} onPressEnter={load} style={{ width: 260, borderRadius: 8 }} allowClear />
                    <Select placeholder="Status" value={statusFilter} onChange={setStatusFilter} allowClear style={{ width: 140 }} options={[{ value: 'draft', label: 'Draft' }, { value: 'sent', label: 'Sent' }, { value: 'partial', label: 'Partial' }, { value: 'paid', label: 'Paid' }]} />
                    <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
                </Space>
            </Card>

            <Card style={{ ...glass }} styles={{ body: { padding: 0 } }}>
                <Table dataSource={invoices.map(i => ({ ...i, key: i.id }))} columns={columns} loading={loading} size="small"
                    pagination={{ pageSize: 20, showTotal: t => `${t} invoices` }}
                    locale={{ emptyText: <Empty description="No customer invoices found" /> }}
                />
            </Card>

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
                            <Descriptions.Item label="Outstanding" span={2}><Text strong style={{ color: Number(detailModal.amountDue) > 0 ? '#3b82f6' : '#10b981', fontSize: 16 }}>{formatCurrency(detailModal.amountDue)}</Text></Descriptions.Item>
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

            <Modal title={`Record Payment — ${paymentModal?.invoiceNumber}`} open={!!paymentModal} onOk={handlePayment} onCancel={() => setPaymentModal(null)} okText="Record Payment">
                {paymentModal && (
                    <div style={{ padding: '16px 0' }}>
                        <Text type="secondary">Outstanding: </Text><Text strong style={{ color: '#3b82f6' }}>{formatCurrency(paymentModal.amountDue)}</Text>
                        <br /><br />
                        <Text>Payment Amount:</Text>
                        <InputNumber value={paymentAmount} onChange={v => setPaymentAmount(v || 0)} style={{ width: '100%', marginTop: 8 }}
                            formatter={v => `Rp ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={v => Number((v || '').replace(/Rp\s?|(\.)/g, ''))}
                            min={0} max={Number(paymentModal.amountDue)}
                        />
                    </div>
                )}
            </Modal>

            <Modal title="Create New Invoice" open={createOpen} onOk={handleCreate} onCancel={() => setCreateOpen(false)} okText="Create Invoice" width={720} confirmLoading={createLoading} destroyOnClose>
                <Form form={form} layout="vertical" size="small" initialValues={{ invoiceDate: dayjs(), dueDate: dayjs().add(30, 'day') }}>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="contactId" label="Customer" rules={[{ required: true }]}><Select showSearch placeholder="Select customer" optionFilterProp="label" options={contacts.map(c => ({ value: c.id, label: `${c.code ? c.code+' — ' : ''}${c.name}` }))} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="reference" label="Reference / SO #"><Input placeholder="SO-2026-XXX" /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="invoiceDate" label="Invoice Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="dueDate" label="Due Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} placeholder="Additional notes..." /></Form.Item>
                </Form>
                <Divider style={{ margin: '8px 0 12px' }}>Line Items</Divider>
                <div style={{ marginBottom: 8 }}>
                    <Row gutter={8} style={{ marginBottom: 4 }}>
                        <Col span={10}><Text type="secondary" style={{ fontSize: 11 }}>Description</Text></Col>
                        <Col span={4}><Text type="secondary" style={{ fontSize: 11 }}>Qty</Text></Col>
                        <Col span={5}><Text type="secondary" style={{ fontSize: 11 }}>Unit Price</Text></Col>
                        <Col span={4}><Text type="secondary" style={{ fontSize: 11 }}>Amount</Text></Col>
                        <Col span={1} /></Row>
                    {lines.map((line, i) => (
                        <Row gutter={8} key={i} style={{ marginBottom: 6 }}>
                            <Col span={10}><Input value={line.description} onChange={e => { const n = [...lines]; n[i].description = e.target.value; setLines(n); }} placeholder="Description" size="small" /></Col>
                            <Col span={4}><InputNumber value={line.quantity} onChange={v => { const n = [...lines]; n[i].quantity = v || 1; setLines(n); }} min={1} style={{ width: '100%' }} size="small" /></Col>
                            <Col span={5}><InputNumber value={line.unitPrice} onChange={v => { const n = [...lines]; n[i].unitPrice = v || 0; setLines(n); }} min={0} style={{ width: '100%' }} size="small" formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={v => Number((v || '').replace(/\./g, ''))} /></Col>
                            <Col span={4}><Text strong style={{ lineHeight: '30px', fontFamily: 'monospace', fontSize: 12 }}>{formatCurrency(line.quantity * line.unitPrice)}</Text></Col>
                            <Col span={1}>{lines.length > 1 && <Button type="text" size="small" danger icon={<MinusCircleOutlined />} onClick={() => setLines(lines.filter((_, j) => j !== i))} />}</Col>
                        </Row>
                    ))}
                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => setLines([...lines, { description: '', quantity: 1, unitPrice: 0 }])} style={{ width: '100%', marginTop: 4 }}>Add Line</Button>
                </div>
                <div style={{ textAlign: 'right', marginTop: 12, padding: '10px 14px', background: `${themeColor}08`, borderRadius: 10 }}>
                    <Text type="secondary">Total: </Text><Text strong style={{ fontSize: 18, fontFamily: 'monospace' }}>{formatCurrency(lineTotal)}</Text>
                </div>
            </Modal>
        </div>
        </CMSLayout>
    );
}
