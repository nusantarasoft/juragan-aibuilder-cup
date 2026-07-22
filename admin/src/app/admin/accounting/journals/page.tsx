'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import RbacGuard from '@/components/common/RbacGuard';
import { Table, Button, Space, Tag, Input, Select, Drawer, Form, InputNumber, message, Typography, Card, Tooltip, Divider, DatePicker, Empty, Spin, Popconfirm, Row, Col, Alert, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined, CheckCircleOutlined, UndoOutlined, EyeOutlined, MinusCircleOutlined, FileExcelOutlined, FilePdfOutlined  } from '@ant-design/icons';
import { accountingService, AcctJournal, AcctJournalLine, AcctAccount } from '@/lib/accountingService';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import { useDateRangeStore } from "@/store/useDateRangeStore";
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const formatCurrency = (v: number | string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(v) || 0);
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const statusColor: Record<string, string> = { draft: 'gold', posted: 'green', reversed: 'volcano', void: 'default' };
const typeColor: Record<string, string> = { general: 'blue', adjusting: 'purple', closing: 'orange', opening: 'cyan', reversal: 'red' };

export default function JournalEntriesPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [journals, setJournals] = useState<AcctJournal[]>([]);
    const [accounts, setAccounts] = useState<AcctAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string | undefined>();
    const [filterType, setFilterType] = useState<string | undefined>();
    const [dateRange, setDateRange] = useState<[string, string] | null>(null);

    // Create drawer
    const [createOpen, setCreateOpen] = useState(false);
    const [form] = Form.useForm();

    // Detail drawer
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedJournal, setSelectedJournal] = useState<AcctJournal | null>(null);
    const [journalLines, setJournalLines] = useState<AcctJournalLine[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [j, a] = await Promise.all([
                accountingService.getJournals(undefined, { status: filterStatus, journalType: filterType, dateFrom: dateRange?.[0], dateTo: dateRange?.[1], search: search || undefined }),
                accounts.length ? Promise.resolve(accounts) : accountingService.getAccounts(),
            ]);
            setJournals(j);
            if (!accounts.length) setAccounts(a);
        } catch (e: any) { message.error(e.message); }
        finally { setLoading(false); }
    }, [filterStatus, filterType, dateRange, search]);

    useEffect(() => { load(); }, [load]);

    const accountMap = React.useMemo(() => {
        const m = new Map<string, AcctAccount>();
        accounts.forEach(a => m.set(a.id, a));
        return m;
    }, [accounts]);

    const openCreate = async () => {
        if (!accounts.length) setAccounts(await accountingService.getAccounts());
        form.resetFields();
        form.setFieldsValue({
            journalType: 'general', journalDate: dayjs().format('YYYY-MM-DD'), currencyCode: 'IDR', exchangeRate: 1,
            lines: [{ accountId: undefined, description: '', debit: 0, credit: 0 }, { accountId: undefined, description: '', debit: 0, credit: 0 }],
        });
        setCreateOpen(true);
    };

    const viewDetail = async (journal: AcctJournal) => {
        setSelectedJournal(journal);
        setDetailOpen(true);
        setDetailLoading(true);
        try { setJournalLines(await accountingService.getJournalLines(journal.id)); }
        catch (e: any) { message.error(e.message); }
        finally { setDetailLoading(false); }
    };

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            // Validate lines
            const lines = values.lines.filter((l: any) => l.accountId && (l.debit > 0 || l.credit > 0));
            if (lines.length < 2) { message.error('At least 2 lines required'); return; }
            const totalDebit = lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
            const totalCredit = lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
            if (Math.abs(totalDebit - totalCredit) > 0.01) { message.error(`Unbalanced: Debit ${formatCurrency(totalDebit)} â‰  Credit ${formatCurrency(totalCredit)}`); return; }

            await accountingService.createJournal(undefined, { ...values, lines });
            message.success('Journal created');
            setCreateOpen(false); load();
        } catch (e: any) { if (e.message) message.error(e.message); }
    };

    const handlePost = async (id: string) => {
        try { await accountingService.postJournal(id); message.success('Journal posted'); load(); }
        catch (e: any) { message.error(e.message); }
    };

    const handleReverse = async (id: string) => {
        try { await accountingService.reverseJournal(id); message.success('Journal reversed'); load(); }
        catch (e: any) { message.error(e.message); }
    };

    const handleDelete = async (id: string) => {
        try { await accountingService.deleteJournal(id); message.success('Deleted'); load(); }
        catch (e: any) { message.error(e.message); }
    };

    // Live balance check in form
    const formLines = Form.useWatch('lines', form) || [];
    const liveDebit = formLines.reduce((s: number, l: any) => s + (l?.debit || 0), 0);
    const liveCredit = formLines.reduce((s: number, l: any) => s + (l?.credit || 0), 0);
    const isBalanced = Math.abs(liveDebit - liveCredit) < 0.01;

    const postableAccounts = accounts.filter(a => !a.isHeader && a.status === 'active');
    const accountOptions = postableAccounts.map(a => ({ value: a.id, label: `${a.accountCode} - ${a.name}`, searchText: `${a.accountCode} ${a.name}` }));

    const columns: any[] = [
        { title: 'Number', dataIndex: 'journalNumber', key: 'journalNumber', width: 140, render: (v: string, r: AcctJournal) => <Button type="link" onClick={() => viewDetail(r)} style={{ fontFamily: 'monospace', padding: 0 }}>{v}</Button> },
        { title: 'Date', dataIndex: 'journalDate', key: 'journalDate', width: 110, sorter: (a: any, b: any) => a.journalDate.localeCompare(b.journalDate) },
        { title: 'Type', dataIndex: 'journalType', key: 'journalType', width: 100, render: (v: string) => <Tag color={typeColor[v] || 'default'}>{v}</Tag> },
        { title: 'Reference', dataIndex: 'reference', key: 'reference', width: 130, ellipsis: true },
        { title: 'Memo', dataIndex: 'memo', key: 'memo', ellipsis: true },
        { title: 'Debit', dataIndex: 'totalDebit', key: 'totalDebit', width: 140, align: 'right' as const, render: (v: number) => <Text style={{ fontFamily: 'monospace' }}>{formatCurrency(v)}</Text> },
        { title: 'Credit', dataIndex: 'totalCredit', key: 'totalCredit', width: 140, align: 'right' as const, render: (v: number) => <Text style={{ fontFamily: 'monospace' }}>{formatCurrency(v)}</Text> },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v: string) => <Tag color={statusColor[v]}>{v}</Tag> },
        { title: '', key: 'actions', width: 140, render: (_: any, r: AcctJournal) => (
            <Space size="small">
                <Tooltip title="View"><Button icon={<EyeOutlined />} size="small" type="text" onClick={() => viewDetail(r)} /></Tooltip>
                {r.status === 'draft' && <Popconfirm title="Post this journal? This action is irreversible." onConfirm={() => handlePost(r.id)}><Tooltip title="Post"><Button icon={<CheckCircleOutlined />} size="small" type="text" style={{ color: '#52c41a' }} /></Tooltip></Popconfirm>}
                {r.status === 'posted' && <Popconfirm title="Reverse this journal?" onConfirm={() => handleReverse(r.id)}><Tooltip title="Reverse"><Button icon={<UndoOutlined />} size="small" type="text" style={{ color: '#fa8c16' }} /></Tooltip></Popconfirm>}
                {r.status === 'draft' && <Popconfirm title="Delete this journal?" onConfirm={() => handleDelete(r.id)}><Tooltip title="Delete"><Button icon={<DeleteOutlined />} size="small" type="text" danger /></Tooltip></Popconfirm>}
            </Space>
        )},
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Journal Entries</AuroraText>}
            subTitle={<DecryptedText text={`${journals.length} entries recorded`} animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
                    style={{ background: `linear-gradient(135deg, ${themeColor}, var(--theme-secondary, #6366f1))`, border: 'none', borderRadius: 10 }}>New Journal Entry</Button>
            </div>

            <Card size="small" style={{ ...glass }}>
                <Space wrap>
                    <Input.Search placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} onSearch={() => load()} style={{ width: 240 }} allowClear />
                    <Select placeholder="Status" value={filterStatus} onChange={setFilterStatus} allowClear style={{ width: 130 }}
                        options={[{ value: 'draft', label: 'Draft' }, { value: 'posted', label: 'Posted' }, { value: 'reversed', label: 'Reversed' }]} />
                    <Select placeholder="Type" value={filterType} onChange={setFilterType} allowClear style={{ width: 130 }}
                        options={[{ value: 'general', label: 'General' }, { value: 'adjusting', label: 'Adjusting' }, { value: 'closing', label: 'Closing' }, { value: 'reversal', label: 'Reversal' }]} />
                    <RangePicker onChange={(dates) => setDateRange(dates ? [dates[0]!.format('YYYY-MM-DD'), dates[1]!.format('YYYY-MM-DD')] : null)} />
                    <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
                    <RbacGuard requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'acct_journals', title: 'Journal Entries', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Number', key: 'journalNumber' }, { header: 'Date', key: 'journalDate' }, { header: 'Memo', key: 'memo' }, { header: 'Debit', key: 'totalDebit' }, { header: 'Credit', key: 'totalCredit' }, { header: 'Status', key: 'status' }], data: journals })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'acct_journals', title: 'Journal Entries', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Number', key: 'journalNumber' }, { header: 'Date', key: 'journalDate' }, { header: 'Memo', key: 'memo' }, { header: 'Debit', key: 'totalDebit' }, { header: 'Credit', key: 'totalCredit' }, { header: 'Status', key: 'status' }], data: journals })} /></Tooltip></RbacGuard>
                </Space>
            </Card>

            <Card style={{ ...glass }} styles={{ body: { padding: 0 } }}>
                <Table dataSource={journals.map(j => ({ ...j, key: j.id }))} columns={columns} loading={loading} size="small"
                    pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} entries` }}
                    scroll={{ x: 1100 }} locale={{ emptyText: <Empty description="No journal entries" /> }} />
            </Card>

            {/* â”€â”€â”€ Create Journal Drawer â”€â”€â”€ */}
            <Drawer title="New Journal Entry" open={createOpen} onClose={() => setCreateOpen(false)} size={800}
                extra={<Space><Button onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="primary" onClick={handleCreate} disabled={!isBalanced}>Save</Button></Space>}>

                <Form form={form} layout="vertical" autoComplete="off">
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="journalType" label="Type"><Select options={[{ value: 'general', label: 'General' }, { value: 'adjusting', label: 'Adjusting' }]} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="journalDate" label="Date" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
                        <Col span={8}><Form.Item name="reference" label="Reference"><Input placeholder="e.g. INV-001" /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="currencyCode" label="Currency"><Select options={[{ value: 'IDR', label: 'IDR' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }]} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="exchangeRate" label="Exchange Rate"><InputNumber style={{ width: '100%' }} min={0} precision={4} /></Form.Item></Col>
                        <Col span={8} />
                    </Row>
                    <Form.Item name="memo" label="Memo"><Input.TextArea rows={2} placeholder="Journal description..." /></Form.Item>

                    <Divider>Journal Lines</Divider>

                    {/* Balance indicator */}
                    <Alert type={isBalanced ? 'success' : 'error'} showIcon style={{ marginBottom: 16 }}
                        message={isBalanced
                            ? `Balanced â€” Debit: ${formatCurrency(liveDebit)} = Credit: ${formatCurrency(liveCredit)}`
                            : `Unbalanced â€” Debit: ${formatCurrency(liveDebit)} â‰  Credit: ${formatCurrency(liveCredit)} (Diff: ${formatCurrency(Math.abs(liveDebit - liveCredit))})`} />

                    <Form.List name="lines">
                        {(fields, { add, remove }) => (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 40px', gap: 8, marginBottom: 8, padding: '0 4px' }}>
                                    <Text strong style={{ fontSize: 12 }}>Account</Text>
                                    <Text strong style={{ fontSize: 12 }}>Description</Text>
                                    <Text strong style={{ fontSize: 12, textAlign: 'right' }}>Debit</Text>
                                    <Text strong style={{ fontSize: 12, textAlign: 'right' }}>Credit</Text>
                                    <div />
                                </div>
                                {fields.map(({ key, name, ...rest }) => (
                                    <div key={key} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 40px', gap: 8, marginBottom: 4, alignItems: 'start' }}>
                                        <Form.Item {...rest} name={[name, 'accountId']} rules={[{ required: true, message: '' }]} style={{ marginBottom: 0 }}>
                                            <Select showSearch placeholder="Select account" options={accountOptions} optionFilterProp="label"
                                                filterOption={(input, option) => (option?.label as string || '').toLowerCase().includes(input.toLowerCase())} />
                                        </Form.Item>
                                        <Form.Item {...rest} name={[name, 'description']} style={{ marginBottom: 0 }}><Input placeholder="Line description" /></Form.Item>
                                        <Form.Item {...rest} name={[name, 'debit']} style={{ marginBottom: 0 }}><InputNumber style={{ width: '100%' }} min={0} precision={0} placeholder="0" /></Form.Item>
                                        <Form.Item {...rest} name={[name, 'credit']} style={{ marginBottom: 0 }}><InputNumber style={{ width: '100%' }} min={0} precision={0} placeholder="0" /></Form.Item>
                                        <Button icon={<MinusCircleOutlined />} type="text" danger onClick={() => remove(name)} disabled={fields.length <= 2} />
                                    </div>
                                ))}
                                <Button type="dashed" onClick={() => add({ accountId: undefined, description: '', debit: 0, credit: 0 })} icon={<PlusOutlined />} style={{ width: '100%', marginTop: 8 }}>Add Line</Button>
                            </>
                        )}
                    </Form.List>
                </Form>
            </Drawer>

            {/* â”€â”€â”€ Detail Drawer â”€â”€â”€ */}
            <Drawer title={selectedJournal ? `Journal: ${selectedJournal.journalNumber}` : 'Journal Detail'} open={detailOpen} onClose={() => setDetailOpen(false)} size={700}>
                {selectedJournal && (
                    <>
                        <Row gutter={[16, 12]}>
                            <Col span={8}><Text type="secondary">Number</Text><br /><Text strong style={{ fontFamily: 'monospace' }}>{selectedJournal.journalNumber}</Text></Col>
                            <Col span={8}><Text type="secondary">Date</Text><br /><Text>{selectedJournal.journalDate}</Text></Col>
                            <Col span={8}><Text type="secondary">Status</Text><br /><Tag color={statusColor[selectedJournal.status]}>{selectedJournal.status}</Tag></Col>
                            <Col span={8}><Text type="secondary">Type</Text><br /><Tag color={typeColor[selectedJournal.journalType]}>{selectedJournal.journalType}</Tag></Col>
                            <Col span={8}><Text type="secondary">Reference</Text><br /><Text>{selectedJournal.reference || '-'}</Text></Col>
                            <Col span={8}><Text type="secondary">Currency</Text><br /><Text>{selectedJournal.currencyCode} (rate: {selectedJournal.exchangeRate})</Text></Col>
                            <Col span={24}><Text type="secondary">Memo</Text><br /><Text>{selectedJournal.memo || '-'}</Text></Col>
                        </Row>
                        <Divider>Lines</Divider>
                        {detailLoading ? <Spin /> : (
                            <Table dataSource={journalLines.map(l => ({ ...l, key: l.id }))} size="small" pagination={false}
                                columns={[
                                    { title: '#', dataIndex: 'lineNumber', width: 40 },
                                    { title: 'Account', dataIndex: 'accountId', render: (id: string) => { const a = accountMap.get(id); return a ? `${a.accountCode} - ${a.name}` : id; } },
                                    { title: 'Description', dataIndex: 'description', ellipsis: true },
                                    { title: 'Debit', dataIndex: 'debit', width: 130, align: 'right' as const, render: (v: number) => v > 0 ? <Text style={{ fontFamily: 'monospace' }}>{formatCurrency(v)}</Text> : '' },
                                    { title: 'Credit', dataIndex: 'credit', width: 130, align: 'right' as const, render: (v: number) => v > 0 ? <Text style={{ fontFamily: 'monospace' }}>{formatCurrency(v)}</Text> : '' },
                                ]}
                                summary={() => (
                                    <Table.Summary.Row>
                                        <Table.Summary.Cell index={0} colSpan={3}><Text strong>Total</Text></Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="right"><Text strong style={{ fontFamily: 'monospace' }}>{formatCurrency(selectedJournal.totalDebit)}</Text></Table.Summary.Cell>
                                        <Table.Summary.Cell index={2} align="right"><Text strong style={{ fontFamily: 'monospace' }}>{formatCurrency(selectedJournal.totalCredit)}</Text></Table.Summary.Cell>
                                    </Table.Summary.Row>
                                )} />
                        )}
                        {selectedJournal.status === 'draft' && (
                            <Space style={{ marginTop: 16 }}>
                                <Popconfirm title="Post this journal?" onConfirm={async () => { await handlePost(selectedJournal.id); setDetailOpen(false); }}>
                                    <Button type="primary" icon={<CheckCircleOutlined />}>Post Journal</Button>
                                </Popconfirm>
                                <Popconfirm title="Delete?" onConfirm={async () => { await handleDelete(selectedJournal.id); setDetailOpen(false); }}>
                                    <Button danger icon={<DeleteOutlined />}>Delete</Button>
                                </Popconfirm>
                            </Space>
                        )}
                        {selectedJournal.status === 'posted' && (
                            <Popconfirm title="Reverse this journal?" onConfirm={async () => { await handleReverse(selectedJournal.id); setDetailOpen(false); }}>
                                <Button icon={<UndoOutlined />} style={{ marginTop: 16 }}>Reverse Journal</Button>
                            </Popconfirm>
                        )}
                    </>
                )}
            </Drawer>
        </div>
        </motion.div>
        </CMSLayout>
    );
}

