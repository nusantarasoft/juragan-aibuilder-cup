'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Table, Card, Typography, Tabs, DatePicker, Button, Space, Spin, Tag, Row, Col, Statistic, Divider, Empty, Alert } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { accountingService, TrialBalanceRow } from '@/lib/accountingService';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useDateRangeStore } from '@/store/useDateRangeStore';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import dayjs from 'dayjs';

const { Text } = Typography;
const formatCurrency = (v: number | string) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(v) || 0);
const formatNum = (v: number) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(v);
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

// ─── Export Helpers ──────────────────────────────────────
function exportCSV(filename: string, headers: string[], rows: string[][]) {
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function exportPDF(title: string, headers: string[], rows: string[][], summary?: string) {
    const style = `<style>body{font-family:Arial,sans-serif;margin:20px}h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}h2{font-size:14px;color:#666;margin-top:0}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:12px}th{background:#1a1a2e;color:#fff;padding:8px 12px;text-align:left}td{padding:6px 12px;border-bottom:1px solid #eee}.right{text-align:right}.bold{font-weight:bold}.total{background:#f5f5f5;font-weight:bold;border-top:2px solid #333}.section{background:#f0f0f0;font-weight:bold}.neg{color:#d32f2f}.pos{color:#2e7d32}.summary{margin-top:20px;padding:12px;background:#f8f8f8;border-radius:6px;font-size:12px}@media print{body{margin:0}}</style>`;
    const tableHtml = `<table><thead><tr>${headers.map(h => `<th class="${['Debit','Credit','Balance','Amount','Total'].some(x => h.includes(x)) ? 'right' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr class="${r[0]?.startsWith('TOTAL') || r[0]?.startsWith('NET') ? 'total' : r[0]?.startsWith('═') ? 'section' : ''}">${r.map((c, i) => `<td class="${i > 0 && headers.length > 2 ? 'right' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const html = `<!DOCTYPE html><html><head><title>${title}</title>${style}</head><body><h1>${title}</h1><h2>NusantaraSoft • Generated: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</h2>${tableHtml}${summary ? `<div class="summary">${summary}</div>` : ''}<script>window.onload=()=>window.print()</script></body></html>`;
    const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); }
}

export default function FinancialReportsPage() {
    const { themeColor } = usePreferencesStore();
    const { startDate, endDate } = useDateRangeStore();
    const [asOfDate, setAsOfDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
    const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try { setTrialBalance(await accountingService.getTrialBalance(undefined, asOfDate)); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };
    useEffect(() => { loadData(); }, [asOfDate]);

    // ─── Computed reports ────────────────────────────────
    const tbTotalDebit = trialBalance.reduce((s, r) => s + Number(r.debit || 0), 0);
    const tbTotalCredit = trialBalance.reduce((s, r) => s + Number(r.credit || 0), 0);
    const isBalanced = Math.abs(tbTotalDebit - tbTotalCredit) < 1;

    const revenueAccounts = trialBalance.filter(r => r.accountType === 'revenue');
    const expenseAccounts = trialBalance.filter(r => r.accountType === 'expense');
    const assetAccounts = trialBalance.filter(r => r.accountType === 'asset');
    const liabilityAccounts = trialBalance.filter(r => r.accountType === 'liability');
    const equityAccounts = trialBalance.filter(r => r.accountType === 'equity');

    const totalRevenue = revenueAccounts.reduce((s, r) => s + Math.abs(Number(r.balance || 0)), 0);
    const totalExpenses = expenseAccounts.reduce((s, r) => s + Math.abs(Number(r.balance || 0)), 0);
    const netIncome = totalRevenue - totalExpenses;

    const totalAssets = assetAccounts.reduce((s, r) => s + Number(r.balance || 0), 0);
    const totalLiabilities = liabilityAccounts.reduce((s, r) => s + Math.abs(Number(r.balance || 0)), 0);
    const totalEquity = equityAccounts.reduce((s, r) => s + Math.abs(Number(r.balance || 0)), 0);

    // ─── Trial Balance Tab ───────────────────────────────
    const trialBalanceTab = (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8 }}>
                <Button icon={<FileExcelOutlined />} onClick={() => exportCSV(`trial_balance_${asOfDate}.csv`, ['Code', 'Account', 'Type', 'Debit', 'Credit', 'Balance'], trialBalance.map(r => [r.accountCode, r.accountName, r.accountType, String(Number(r.debit || 0)), String(Number(r.credit || 0)), String(Number(r.balance || 0))]))}>Excel</Button>
                <Button icon={<FilePdfOutlined />} onClick={() => exportPDF(`Trial Balance — As of ${asOfDate}`, ['Code', 'Account Name', 'Type', 'Debit (Rp)', 'Credit (Rp)', 'Balance (Rp)'], [...trialBalance.map(r => [r.accountCode, r.accountName, r.accountType, formatNum(Number(r.debit || 0)), formatNum(Number(r.credit || 0)), formatNum(Number(r.balance || 0))]), ['TOTAL', '', '', formatNum(tbTotalDebit), formatNum(tbTotalCredit), formatNum(tbTotalDebit - tbTotalCredit)]], isBalanced ? '✅ Trial balance is balanced' : '⚠️ Trial balance is NOT balanced!')}>PDF</Button>
            </div>

            <Alert type={isBalanced ? 'success' : 'error'} showIcon icon={isBalanced ? <CheckCircleOutlined /> : <WarningOutlined />}
                message={isBalanced ? `Trial balance is balanced — Total: ${formatCurrency(tbTotalDebit)}` : `Trial balance is NOT balanced — Debit: ${formatCurrency(tbTotalDebit)} ≠ Credit: ${formatCurrency(tbTotalCredit)}`}
                style={{ marginBottom: 16, borderRadius: 8 }}
            />

            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 0 }}>
                <Table scroll={{ x: 900 }} dataSource={trialBalance.map(r => ({ ...r, key: r.accountId }))} size="small" pagination={false}
                    columns={[
                        { title: 'Code', dataIndex: 'accountCode', width: 90, render: (v: string) => <Text style={{ fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Account Name', dataIndex: 'accountName', ellipsis: true },
                        { title: 'Type', dataIndex: 'accountType', width: 100, render: (v: string) => <Tag color={{ asset: 'blue', liability: 'orange', equity: 'purple', revenue: 'green', expense: 'red' }[v] || 'default'}>{v}</Tag> },
                        { title: 'Debit', dataIndex: 'debit', width: 150, align: 'right' as const, render: (v: number) => Number(v) > 0 ? <Text style={{ fontFamily: 'monospace' }}>{formatCurrency(v)}</Text> : '' },
                        { title: 'Credit', dataIndex: 'credit', width: 150, align: 'right' as const, render: (v: number) => Number(v) > 0 ? <Text style={{ fontFamily: 'monospace' }}>{formatCurrency(v)}</Text> : '' },
                        { title: 'Balance', dataIndex: 'balance', width: 160, align: 'right' as const, render: (v: number) => <Text strong style={{ fontFamily: 'monospace', color: Number(v) >= 0 ? undefined : '#ff4d4f' }}>{formatCurrency(v)}</Text> },
                    ]}
                    summary={() => (
                        <Table.Summary.Row style={{ background: '#f5f5f5' }}>
                            <Table.Summary.Cell index={0} colSpan={3}><Text strong>TOTAL</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right"><Text strong style={{ fontFamily: 'monospace' }}>{formatCurrency(tbTotalDebit)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right"><Text strong style={{ fontFamily: 'monospace' }}>{formatCurrency(tbTotalCredit)}</Text></Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right"><Text strong style={{ fontFamily: 'monospace' }}>{formatCurrency(tbTotalDebit - tbTotalCredit)}</Text></Table.Summary.Cell>
                        </Table.Summary.Row>
                    )}
                />
            </Card>
        </div>
    );

    // ─── Income Statement Tab ────────────────────────────
    const ReportSection = ({ title, accounts, type }: { title: string; accounts: TrialBalanceRow[]; type: string }) => (
        <>
            <tr style={{ background: '#f0f0f0' }}><td colSpan={2} style={{ padding: '8px 12px', fontWeight: 'bold', fontSize: 13 }}>{title}</td></tr>
            {accounts.map(a => (
                <tr key={a.accountId}>
                    <td style={{ padding: '4px 12px 4px 32px', fontSize: 13 }}>{a.accountCode} — {a.accountName}</td>
                    <td style={{ padding: '4px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13 }}>{formatCurrency(Math.abs(Number(a.balance || 0)))}</td>
                </tr>
            ))}
        </>
    );

    const incomeStatementTab = (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8 }}>
                <Button icon={<FileExcelOutlined />} onClick={() => {
                    const rows: string[][] = [['═══ REVENUE ═══', ''], ...revenueAccounts.map(r => [`  ${r.accountCode} - ${r.accountName}`, String(Math.abs(Number(r.balance || 0)))]), ['Total Revenue', String(totalRevenue)], [''], ['═══ EXPENSES ═══', ''], ...expenseAccounts.map(r => [`  ${r.accountCode} - ${r.accountName}`, String(Math.abs(Number(r.balance || 0)))]), ['Total Expenses', String(totalExpenses)], [''], ['NET INCOME', String(netIncome)]];
                    exportCSV(`income_statement_${asOfDate}.csv`, ['Account', 'Amount (Rp)'], rows);
                }}>Excel</Button>
                <Button icon={<FilePdfOutlined />} onClick={() => {
                    const rows: string[][] = [['═══ REVENUE', ''], ...revenueAccounts.map(r => [`    ${r.accountCode} — ${r.accountName}`, formatNum(Math.abs(Number(r.balance || 0)))]), ['TOTAL Revenue', formatNum(totalRevenue)], ['', ''], ['═══ EXPENSES', ''], ...expenseAccounts.map(r => [`    ${r.accountCode} — ${r.accountName}`, formatNum(Math.abs(Number(r.balance || 0)))]), ['TOTAL Expenses', formatNum(totalExpenses)], ['', ''], ['NET INCOME', formatNum(netIncome)]];
                    exportPDF(`Income Statement — Period Ending ${asOfDate}`, ['Account', 'Amount (Rp)'], rows, `Net Income: ${formatCurrency(netIncome)} (Revenue ${formatCurrency(totalRevenue)} - Expenses ${formatCurrency(totalExpenses)})`);
                }}>PDF</Button>
            </div>

            <Card style={{ borderRadius: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <ReportSection title="REVENUE" accounts={revenueAccounts} type="revenue" />
                        <tr style={{ borderTop: '2px solid #52c41a', background: '#f6ffed' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>Total Revenue</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#52c41a' }}>{formatCurrency(totalRevenue)}</td>
                        </tr>
                        <tr><td colSpan={2} style={{ height: 16 }} /></tr>
                        <ReportSection title="EXPENSES" accounts={expenseAccounts} type="expense" />
                        <tr style={{ borderTop: '2px solid #ff4d4f', background: '#fff2f0' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>Total Expenses</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#ff4d4f' }}>{formatCurrency(totalExpenses)}</td>
                        </tr>
                        <tr><td colSpan={2} style={{ height: 16 }} /></tr>
                        <tr style={{ borderTop: '3px double #333', background: netIncome >= 0 ? '#f6ffed' : '#fff2f0' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold', fontSize: 15 }}>NET INCOME</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 16, color: netIncome >= 0 ? '#52c41a' : '#ff4d4f' }}>{formatCurrency(netIncome)}</td>
                        </tr>
                    </tbody>
                </table>
            </Card>
        </div>
    );

    // ─── Balance Sheet Tab ───────────────────────────────
    const balanceSheetTab = (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8 }}>
                <Button icon={<FileExcelOutlined />} onClick={() => {
                    const rows: string[][] = [['═══ ASSETS ═══', ''], ...assetAccounts.map(r => [`  ${r.accountCode} - ${r.accountName}`, String(Number(r.balance || 0))]), ['Total Assets', String(totalAssets)], [''], ['═══ LIABILITIES ═══', ''], ...liabilityAccounts.map(r => [`  ${r.accountCode} - ${r.accountName}`, String(Math.abs(Number(r.balance || 0)))]), ['Total Liabilities', String(totalLiabilities)], [''], ['═══ EQUITY ═══', ''], ...equityAccounts.map(r => [`  ${r.accountCode} - ${r.accountName}`, String(Math.abs(Number(r.balance || 0)))]), ['Total Equity', String(totalEquity)]];
                    exportCSV(`balance_sheet_${asOfDate}.csv`, ['Account', 'Amount (Rp)'], rows);
                }}>Excel</Button>
                <Button icon={<FilePdfOutlined />} onClick={() => {
                    const rows: string[][] = [['═══ ASSETS', ''], ...assetAccounts.map(r => [`    ${r.accountCode} — ${r.accountName}`, formatNum(Number(r.balance || 0))]), ['TOTAL Assets', formatNum(totalAssets)], ['', ''], ['═══ LIABILITIES', ''], ...liabilityAccounts.map(r => [`    ${r.accountCode} — ${r.accountName}`, formatNum(Math.abs(Number(r.balance || 0)))]), ['TOTAL Liabilities', formatNum(totalLiabilities)], ['', ''], ['═══ EQUITY', ''], ...equityAccounts.map(r => [`    ${r.accountCode} — ${r.accountName}`, formatNum(Math.abs(Number(r.balance || 0)))]), ['TOTAL Equity', formatNum(totalEquity)]];
                    exportPDF(`Balance Sheet — As of ${asOfDate}`, ['Account', 'Amount (Rp)'], rows, `Assets (${formatCurrency(totalAssets)}) = Liabilities (${formatCurrency(totalLiabilities)}) + Equity (${formatCurrency(totalEquity)})`);
                }}>PDF</Button>
            </div>

            <Row gutter={[14, 14]} style={{ marginBottom: 16 }}>
                {[{ t: 'Total Assets', v: totalAssets, c: '#3b82f6' }, { t: 'Total Liabilities', v: totalLiabilities, c: '#f59e0b' }, { t: 'Total Equity', v: totalEquity, c: '#8b5cf6' }].map((s, i) => (
                    <Col xs={24} sm={8} key={i}><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                        <Card size="small" style={{ ...glass }}><Statistic title={s.t} value={s.v} formatter={v => formatCurrency(Number(v))} valueStyle={{ color: s.c, fontWeight: 700, fontFamily: 'monospace' }} /></Card>
                    </motion.div></Col>
                ))}
            </Row>

            <Alert type={Math.abs(totalAssets - totalLiabilities - totalEquity) < 1 ? 'success' : 'warning'} showIcon
                message={`A = L + E  →  ${formatCurrency(totalAssets)} = ${formatCurrency(totalLiabilities)} + ${formatCurrency(totalEquity)}`}
                style={{ marginBottom: 16, borderRadius: 8 }}
            />

            <Card style={{ borderRadius: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <ReportSection title="ASSETS" accounts={assetAccounts} type="asset" />
                        <tr style={{ borderTop: '2px solid #1890ff', background: '#e6f7ff' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>Total Assets</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#1890ff' }}>{formatCurrency(totalAssets)}</td>
                        </tr>
                        <tr><td colSpan={2} style={{ height: 16 }} /></tr>
                        <ReportSection title="LIABILITIES" accounts={liabilityAccounts} type="liability" />
                        <tr style={{ borderTop: '2px solid #fa8c16', background: '#fff7e6' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>Total Liabilities</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#fa8c16' }}>{formatCurrency(totalLiabilities)}</td>
                        </tr>
                        <tr><td colSpan={2} style={{ height: 16 }} /></tr>
                        <ReportSection title="EQUITY" accounts={equityAccounts} type="equity" />
                        <tr style={{ borderTop: '2px solid #722ed1', background: '#f9f0ff' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>Total Equity</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#722ed1' }}>{formatCurrency(totalEquity)}</td>
                        </tr>
                        <tr><td colSpan={2} style={{ height: 16 }} /></tr>
                        <tr style={{ borderTop: '3px double #333', background: '#f5f5f5' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold', fontSize: 14 }}>Liabilities + Equity</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 15 }}>{formatCurrency(totalLiabilities + totalEquity)}</td>
                        </tr>
                    </tbody>
                </table>
            </Card>
        </div>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Financial Reports</AuroraText>}
            subTitle={<DecryptedText text="Trial Balance, Income Statement & Balance Sheet" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
                <Text type="secondary">As of:</Text>
                <DatePicker value={dayjs(asOfDate)} onChange={(d) => d && setAsOfDate(d.format('YYYY-MM-DD'))} />
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>
            ) : (
                <Tabs defaultActiveKey="trial" items={[
                    { key: 'trial', label: '📊 Trial Balance', children: trialBalanceTab },
                    { key: 'income', label: '📈 Income Statement', children: incomeStatementTab },
                    { key: 'balance', label: '🏦 Balance Sheet', children: balanceSheetTab },
                ]} />
            )}
        </div>
        </CMSLayout>
    );
}
