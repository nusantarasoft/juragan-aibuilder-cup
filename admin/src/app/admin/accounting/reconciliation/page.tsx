'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Table, Typography, Button, Space, Tag, Spin, Empty, Row, Col, Select, Modal, Form, Input, InputNumber, DatePicker, Upload, message, Badge, Tooltip, Popconfirm } from 'antd';
import { BankOutlined, PlusOutlined, UploadOutlined, CheckCircleOutlined, CloseCircleOutlined, LinkOutlined, DisconnectOutlined, SwapOutlined, ThunderboltOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { accountingService, AcctBankAccount, AcctBankStatement, AcctBankStatementLine } from '@/lib/accountingService';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import RbacGuard from '@/components/common/RbacGuard';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useDateRangeStore } from '@/store/useDateRangeStore';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import dayjs from 'dayjs';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };
const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

export default function ReconciliationPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [loading, setLoading] = useState(true);
    const [bankAccounts, setBankAccounts] = useState<AcctBankAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [statements, setStatements] = useState<AcctBankStatement[]>([]);
    const [selectedStatement, setSelectedStatement] = useState<string | null>(null);
    const [lines, setLines] = useState<AcctBankStatementLine[]>([]);
    const [linesLoading, setLinesLoading] = useState(false);
    const [accountModal, setAccountModal] = useState(false);
    const [importModal, setImportModal] = useState(false);
    const [form] = Form.useForm();
    const [importForm] = Form.useForm();
    const [msgApi, ctxHolder] = message.useMessage();

    const load = useCallback(async () => { setLoading(true); try { setBankAccounts(await accountingService.getBankAccounts()); } catch {} finally { setLoading(false); } }, []);
    useEffect(() => { load(); }, [load]);

    const loadStmts = useCallback(async (id: string) => { setSelectedAccount(id); setSelectedStatement(null); setLines([]); try { setStatements(await accountingService.getBankStatements(id)); } catch {} }, []);
    const loadLines = useCallback(async (id: string) => { setSelectedStatement(id); setLinesLoading(true); try { setLines(await accountingService.getBankStatementLines(id)); } catch {} finally { setLinesLoading(false); } }, []);

    const addAccount = async () => { try { const v = await form.validateFields(); await accountingService.createBankAccount(undefined, v); msgApi.success('Added'); setAccountModal(false); form.resetFields(); load(); } catch (e: any) { if (e.message) msgApi.error(e.message); } };
    const doImport = async () => { try { const v = await importForm.validateFields(); if (!selectedAccount) return; await accountingService.importBankStatement(selectedAccount, { statementDate: v.statementDate.format('YYYY-MM-DD'), openingBalance: v.openingBalance || 0, closingBalance: v.closingBalance || 0, source: 'csv', lines: v.lines || [] }); msgApi.success('Imported'); setImportModal(false); importForm.resetFields(); loadStmts(selectedAccount); } catch (e: any) { if (e.message) msgApi.error(e.message); } };
    const autoMatch = async () => { if (!selectedStatement) return; try { const c = await accountingService.autoMatchBankStatement(selectedStatement); msgApi.success(`Matched ${c} txns`); loadLines(selectedStatement); } catch { msgApi.error('Failed'); } };

    const matchedCount = lines.filter(l => l.matched).length;
    const unmatchedCount = lines.length - matchedCount;
    const matchPct = lines.length > 0 ? Math.round((matchedCount / lines.length) * 100) : 0;

    const cols = [
        { title: 'Date', dataIndex: 'transactionDate', key: 'd', width: 110, render: (v: string) => dayjs(v).format('DD MMM YYYY') },
        { title: 'Description', dataIndex: 'description', key: 'desc', ellipsis: true },
        { title: 'Reference', dataIndex: 'reference', key: 'ref', width: 120, render: (v: string) => v ? <Text style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</Text> : '—' },
        { title: 'Amount', dataIndex: 'amount', key: 'amt', width: 160, align: 'right' as const, render: (v: number) => <Text strong style={{ fontFamily: 'monospace', color: v >= 0 ? '#10b981' : '#ef4444' }}>{fmt(v)}</Text> },
        { title: 'Status', key: 'st', width: 120, render: (_: any, r: AcctBankStatementLine) => r.matched ? <Tag color="green" icon={<CheckCircleOutlined />}>Matched</Tag> : <Tag color="orange" icon={<CloseCircleOutlined />}>Unmatched</Tag> },
        { title: '', key: 'a', width: 50, render: (_: any, r: AcctBankStatementLine) => r.matched ? <Popconfirm title="Unmatch?" onConfirm={() => accountingService.unmatchBankTransaction(r.id).then(() => loadLines(selectedStatement!))}><Button size="small" type="text" icon={<DisconnectOutlined />} danger /></Popconfirm> : null },
    ];
    const expData = lines.map(l => ({ date: l.transactionDate, description: l.description || '', reference: l.reference || '', amount: l.amount, status: l.matched ? 'Matched' : 'Unmatched' }));

    if (loading) return <CMSLayout title="Bank Reconciliation"><div style={{ display: 'flex', justifyContent: 'center', padding: 120 }}><Spin size="large" /></div></CMSLayout>;

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Bank Reconciliation</AuroraText>}
            subTitle={<DecryptedText text="Match bank statements against journal entries" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<RbacGuard key="e" requiredRole="manager"><Tooltip title="Export Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'bank_recon', title: 'Bank Reconciliation', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Date', key: 'date' }, { header: 'Description', key: 'description' }, { header: 'Amount', key: 'amount' }, { header: 'Status', key: 'status' }], data: expData })} /></Tooltip> <Tooltip title="Export PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'bank_recon', title: 'Bank Reconciliation', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Date', key: 'date' }, { header: 'Description', key: 'description' }, { header: 'Amount', key: 'amount' }, { header: 'Status', key: 'status' }], data: expData })} /></Tooltip></RbacGuard>]}>
            {ctxHolder}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                <Card style={glass} size="small">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <BankOutlined style={{ fontSize: 18, color: themeColor }} />
                        <Text strong>Bank Account:</Text>
                        <Select placeholder="Select bank account" value={selectedAccount} onChange={loadStmts} style={{ minWidth: 280 }} options={bankAccounts.map(a => ({ value: a.id, label: `${a.bankName || ''} — ${a.name}` }))} allowClear showSearch optionFilterProp="label" />
                        <Button icon={<PlusOutlined />} onClick={() => { form.resetFields(); setAccountModal(true); }}>Add Account</Button>
                        {selectedAccount && <Button icon={<UploadOutlined />} type="primary" onClick={() => { importForm.resetFields(); setImportModal(true); }} style={{ borderRadius: 8, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}>Import Statement</Button>}
                    </div>
                </Card>

                {selectedAccount && (
                    <Card title={<Space><SwapOutlined style={{ color: themeColor }} /> Statements</Space>} style={glass} size="small">
                        {statements.length === 0 ? <Empty description="No statements yet." /> : (
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {statements.map(s => (
                                    <Card key={s.id} size="small" hoverable onClick={() => loadLines(s.id)}
                                        style={{ flex: '1 1 200px', maxWidth: 260, cursor: 'pointer', borderLeft: `3px solid ${s.status === 'reconciled' ? '#10b981' : themeColor}`, background: selectedStatement === s.id ? 'rgba(99,102,241,0.06)' : undefined }}>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{dayjs(s.statementDate).format('DD MMM YYYY')}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                            <Text type="secondary" style={{ fontSize: 11 }}>Open: {fmt(s.openingBalance)}</Text>
                                            <Text type="secondary" style={{ fontSize: 11 }}>Close: {fmt(s.closingBalance)}</Text>
                                        </div>
                                        <Tag color={s.status === 'reconciled' ? 'green' : 'blue'} style={{ marginTop: 6, fontSize: 10 }}>{s.status}</Tag>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {selectedStatement && (<>
                    <Row gutter={[14, 14]}>
                        {[{ t: 'Total Lines', v: lines.length, c: themeColor }, { t: 'Matched', v: matchedCount, c: '#10b981' }, { t: 'Unmatched', v: unmatchedCount, c: '#ef4444' }, { t: 'Match Rate', v: `${matchPct}%`, c: matchPct >= 80 ? '#10b981' : '#ef4444' }].map((s, i) => (
                            <Col key={i} xs={12} sm={6}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                                <Card size="small" style={{ ...glass, textAlign: 'center', borderTop: `3px solid ${s.c}` }}>
                                    <Text style={{ fontSize: 22, fontWeight: 700, color: s.c, display: 'block' }}>{s.v}</Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>{s.t}</Text>
                                </Card>
                            </motion.div></Col>
                        ))}
                    </Row>
                    <Card title={<Space><SwapOutlined style={{ color: themeColor }} /><span style={{ fontWeight: 600 }}>Statement Lines</span><Badge count={unmatchedCount} style={{ background: '#ef4444' }} /></Space>} style={glass}
                        extra={<Button type="primary" icon={<ThunderboltOutlined />} onClick={autoMatch} style={{ borderRadius: 8, background: 'linear-gradient(135deg, #10b981, #059669)' }}>Auto-Match</Button>}>
                        {linesLoading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div> : lines.length === 0 ? <Empty description="No lines." /> :
                            <Table scroll={{ x: 900 }} dataSource={lines.map(l => ({ ...l, key: l.id }))} columns={cols} size="small" pagination={{ pageSize: 20, showTotal: t => `${t} lines` }} />}
                    </Card>
                </>)}

                {!selectedAccount && <Card style={{ ...glass, textAlign: 'center', padding: 40 }}><BankOutlined style={{ fontSize: 48, color: themeColor, opacity: 0.3 }} /><div style={{ marginTop: 16 }}><Text type="secondary">Select a bank account to begin reconciliation.</Text></div></Card>}
            </motion.div>

            <Modal title="Add Bank Account" open={accountModal} onOk={addAccount} onCancel={() => setAccountModal(false)} okText="Add">
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Account Name" rules={[{ required: true }]}><Input placeholder="Operating Account" /></Form.Item>
                    <Form.Item name="bankName" label="Bank Name"><Input placeholder="Bank Mandiri" /></Form.Item>
                    <Form.Item name="accountNumber" label="Account Number"><Input placeholder="1234567890" /></Form.Item>
                    <Form.Item name="currency" label="Currency" initialValue="IDR"><Input /></Form.Item>
                </Form>
            </Modal>
            <Modal title="Import Bank Statement" open={importModal} onOk={doImport} onCancel={() => setImportModal(false)} okText="Import" width={500}>
                <Form form={importForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="statementDate" label="Statement Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                    <Row gutter={12}><Col span={12}><Form.Item name="openingBalance" label="Opening"><InputNumber style={{ width: '100%' }} step={1000} /></Form.Item></Col><Col span={12}><Form.Item name="closingBalance" label="Closing"><InputNumber style={{ width: '100%' }} step={1000} /></Form.Item></Col></Row>
                    <Form.Item name="csvFile" label="CSV File"><Upload accept=".csv" maxCount={1} beforeUpload={() => false}><Button icon={<UploadOutlined />}>Select CSV</Button></Upload></Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
