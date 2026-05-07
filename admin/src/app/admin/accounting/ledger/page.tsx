'use client';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import RbacGuard from '@/components/common/RbacGuard';
import { Table, Select, DatePicker, Card, Typography, Space, Tag, Button, Spin, Empty, Row, Col, Statistic, Divider, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, DownloadOutlined, BookOutlined, FileExcelOutlined, FilePdfOutlined  } from '@ant-design/icons';
import { accountingService, AcctAccount, AcctJournalLine } from '@/lib/accountingService';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import { useDateRangeStore } from "@/store/useDateRangeStore";
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const formatCurrency = (v: number | string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(v) || 0);
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

// snake_case → camelCase
const snakeToCamel = (row: any) => {
    if (!row) return row;
    const out: any = {};
    for (const [k, v] of Object.entries(row)) {
        const camelKey = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
        out[camelKey] = typeof v === 'object' && v !== null && !Array.isArray(v) ? snakeToCamel(v) : v;
    }
    return out;
};

export default function GeneralLedgerPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [accounts, setAccounts] = useState<AcctAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
    const [dateRange, setDateRange] = useState<[string, string] | null>(null);
    const [lines, setLines] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [accountsLoading, setAccountsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const accts = await accountingService.getAccounts();
                setAccounts(accts);
            } catch (e) { console.error(e); }
            finally { setAccountsLoading(false); }
        })();
    }, []);

    const postableAccounts = useMemo(() =>
        accounts.filter(a => !a.isHeader && a.status === 'active')
            .map(a => ({ value: a.id, label: `${a.accountCode} - ${a.name}`, code: a.accountCode, name: a.name, type: a.accountType }))
            .sort((a, b) => a.code.localeCompare(b.code)),
    [accounts]);

    const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId]);

    const loadLedger = useCallback(async () => {
        if (!selectedAccountId) return;
        setLoading(true);
        try {
            const raw = await accountingService.getGeneralLedger(undefined, selectedAccountId, {
                dateFrom: dateRange?.[0], dateTo: dateRange?.[1],
            });
            // Convert and compute running balance
            const converted = raw.map((r: any) => snakeToCamel(r));
            const openingBalance = Number(selectedAccount?.openingBalance || 0);
            let running = openingBalance;
            const withBalance = converted.map((line: any) => {
                const d = Number(line.baseDebit || line.debit || 0);
                const c = Number(line.baseCredit || line.credit || 0);
                running += d - c;
                return { ...line, debitNum: d, creditNum: c, runningBalance: running };
            });
            setLines(withBalance);
        } catch (e: any) { console.error(e); setLines([]); }
        finally { setLoading(false); }
    }, [selectedAccountId, dateRange, selectedAccount]);

    useEffect(() => { if (selectedAccountId) loadLedger(); }, [selectedAccountId, loadLedger]);

    const totalDebit = lines.reduce((s, l) => s + l.debitNum, 0);
    const totalCredit = lines.reduce((s, l) => s + l.creditNum, 0);
    const openingBal = Number(selectedAccount?.openingBalance || 0);
    const closingBal = lines.length > 0 ? lines[lines.length - 1].runningBalance : openingBal;

    const exportCSV = () => {
        if (!lines.length || !selectedAccount) return;
        const header = 'Date,Journal,Description,Debit,Credit,Balance\n';
        const rows = lines.map(l => {
            const j = l.acctJournals || {};
            return `${j.journalDate || ''},${j.journalNumber || ''},"${(l.description || '').replace(/"/g, '""')}",${l.debitNum},${l.creditNum},${l.runningBalance}`;
        }).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `ledger_${selectedAccount.accountCode}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    const columns: any[] = [
        { title: 'Date', key: 'date', width: 110, render: (_: any, r: any) => r.acctJournals?.journalDate || '-' },
        { title: 'Journal #', key: 'journal', width: 140, render: (_: any, r: any) => <Text style={{ fontFamily: 'monospace' }}>{r.acctJournals?.journalNumber || '-'}</Text> },
        { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true, render: (v: string) => v || <Text type="secondary">-</Text> },
        { title: 'Debit', key: 'debit', width: 150, align: 'right' as const, render: (_: any, r: any) => r.debitNum > 0 ? <Text style={{ fontFamily: 'monospace', color: '#52c41a' }}>{formatCurrency(r.debitNum)}</Text> : '' },
        { title: 'Credit', key: 'credit', width: 150, align: 'right' as const, render: (_: any, r: any) => r.creditNum > 0 ? <Text style={{ fontFamily: 'monospace', color: '#ff4d4f' }}>{formatCurrency(r.creditNum)}</Text> : '' },
        { title: 'Balance', key: 'balance', width: 160, align: 'right' as const, render: (_: any, r: any) => <Text strong style={{ fontFamily: 'monospace' }}>{formatCurrency(r.runningBalance)}</Text> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>General Ledger</AuroraText>}
            subTitle={<DecryptedText text="Account transaction history and balances" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {lines.length > 0 && <Button icon={<DownloadOutlined />} onClick={exportCSV}>Export CSV</Button>}
            </div>

            {/* Filters */}
            <Card size="small" style={{ ...glass }}>
                <Space wrap size="middle">
                    <div>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Account</Text>
                        <Select
                            showSearch placeholder="Select an account..." value={selectedAccountId} onChange={setSelectedAccountId}
                            style={{ width: 360 }} loading={accountsLoading} optionFilterProp="label" options={postableAccounts}
                            filterOption={(input, opt) => (opt?.label as string || '').toLowerCase().includes(input.toLowerCase())}
                        />
                    </div>
                    <div>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Date Range</Text>
                        <RangePicker onChange={(dates) => setDateRange(dates ? [dates[0]!.format('YYYY-MM-DD'), dates[1]!.format('YYYY-MM-DD')] : null)}
                            presets={[
                                { label: 'This Month', value: [dayjs().startOf('month'), dayjs()] },
                                { label: 'Last Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                                { label: 'Last 3 Months', value: [dayjs().subtract(3, 'month').startOf('month'), dayjs()] },
                                { label: 'This Year', value: [dayjs().startOf('year'), dayjs()] },
                            ]}
                        />
                    </div>
                    <div style={{ paddingTop: 20 }}>
                        <Button icon={<ReloadOutlined />} onClick={loadLedger} disabled={!selectedAccountId}>Refresh</Button>
                            <RbacGuard requiredRole="manager"><Tooltip title="Export to Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'acct_ledger', title: 'General Ledger', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Code', key: 'code' }, { header: 'Name', key: 'name' }, { header: 'Type', key: 'accountType' }, { header: 'Balance', key: 'balance' }], data: accounts })} /></Tooltip> <Tooltip title="Export to PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'acct_ledger', title: 'General Ledger', dateRange: { start: startDate, end: endDate }, columns: [{ header: 'Code', key: 'code' }, { header: 'Name', key: 'name' }, { header: 'Type', key: 'accountType' }, { header: 'Balance', key: 'balance' }], data: accounts })} /></Tooltip></RbacGuard>
                    </div>
                </Space>
            </Card>

            {!selectedAccountId ? (
                <Card style={{ borderRadius: 12, textAlign: 'center', padding: 40 }}>
                    <BookOutlined style={{ fontSize: 48, color: '#8c8c8c', marginBottom: 16 }} />
                    <br /><Text type="secondary" style={{ fontSize: 16 }}>Select an account above to view its transaction history</Text>
                </Card>
            ) : (
                <>
                    {/* Account info + summary */}
                    {selectedAccount && (
                        <Row gutter={[14, 14]}>
                            {[
                                { t: 'Opening Balance', v: openingBal, c: '#3b82f6' },
                                { t: 'Total Debit', v: totalDebit, c: '#10b981' },
                                { t: 'Total Credit', v: totalCredit, c: '#ef4444' },
                                { t: 'Closing Balance', v: closingBal, c: '#8b5cf6' },
                            ].map((s, i) => (
                                <Col xs={24} sm={6} key={i}>
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                                        <Card size="small" style={{ ...glass }}>
                                            <Statistic title={s.t} value={s.v} formatter={(v) => formatCurrency(Number(v))} valueStyle={{ fontSize: 16, fontWeight: 600, color: s.c, fontFamily: 'monospace' }} />
                                        </Card>
                                    </motion.div>
                                </Col>
                            ))}
                        </Row>
                    )}

                    {/* Transaction table */}
                    <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
                        <Table scroll={{ x: 900 }} dataSource={lines.map((l, i) => ({ ...l, key: l.id || i }))} columns={columns} loading={loading}
                            size="small" pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `${t} transactions` }}
                            locale={{ emptyText: <Empty description="No transactions found for this account" /> }}
                            summary={() => lines.length > 0 ? (
                                <Table.Summary.Row>
                                    <Table.Summary.Cell index={0} colSpan={3}><Text strong>Totals</Text></Table.Summary.Cell>
                                    <Table.Summary.Cell index={1} align="right"><Text strong style={{ fontFamily: 'monospace', color: '#52c41a' }}>{formatCurrency(totalDebit)}</Text></Table.Summary.Cell>
                                    <Table.Summary.Cell index={2} align="right"><Text strong style={{ fontFamily: 'monospace', color: '#ff4d4f' }}>{formatCurrency(totalCredit)}</Text></Table.Summary.Cell>
                                    <Table.Summary.Cell index={3} align="right"><Text strong style={{ fontFamily: 'monospace', color: '#722ed1' }}>{formatCurrency(closingBal)}</Text></Table.Summary.Cell>
                                </Table.Summary.Row>
                            ) : undefined}
                        />
                    </Card>
                </>
            )}
        </div>
        </CMSLayout>
    );
}

