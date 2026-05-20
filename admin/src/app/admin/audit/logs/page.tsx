'use client';
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Table, Typography, Button, Space, Tag, Input, Select, Row, Col, Statistic, Tooltip, Badge, DatePicker } from 'antd';
import { AuditOutlined, SearchOutlined, ReloadOutlined, FileExcelOutlined, FilePdfOutlined, UserOutlined, FilterOutlined, EyeOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import RbacGuard from '@/components/common/RbacGuard';
import { exportToPdf, exportToExcel } from '@/lib/exportUtils';
import dayjs from 'dayjs';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'LOGIN', 'LOGOUT', 'VIEW', 'IMPORT', 'BULK_UPDATE'];
const MODULES = ['crm', 'hr', 'accounting', 'inventory', 'itsm', 'settings', 'users', 'ops', 'ecommerce', 'documents', 'news'];
const USERS = ['admin@nusantarasoft.com', 'hr.manager@nusantarasoft.com', 'finance@nusantarasoft.com', 'ops@nusantarasoft.com', 'sales@nusantarasoft.com'];

function generateLogs(count: number) {
    return Array.from({ length: count }, (_, i) => ({
        id: `log-${i}`, user: USERS[Math.floor(Math.random() * USERS.length)],
        action: ACTIONS[Math.floor(Math.random() * ACTIONS.length)],
        module: MODULES[Math.floor(Math.random() * MODULES.length)],
        resource: `record-${Math.floor(Math.random() * 1000)}`,
        details: ['Updated field "status"', 'Created new record', 'Deleted record', 'Exported 150 records', 'Logged in from 192.168.1.10'][Math.floor(Math.random() * 5)],
        ip: `192.168.1.${Math.floor(Math.random() * 50 + 1)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        severity: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
    }));
}

const ALL_LOGS = generateLogs(200);
const ACTION_COLORS: Record<string, string> = { CREATE: 'green', UPDATE: 'blue', DELETE: 'red', EXPORT: 'purple', LOGIN: 'cyan', LOGOUT: 'default', VIEW: 'default', IMPORT: 'geekblue', BULK_UPDATE: 'orange' };
const SEVERITY_COLORS: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

export default function AuditLogsPage() {
    const { themeColor } = usePreferencesStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterModule, setFilterModule] = useState<string | undefined>();
    const [filterAction, setFilterAction] = useState<string | undefined>();
    const [filterUser, setFilterUser] = useState<string | undefined>();

    const filtered = useMemo(() => {
        let data = [...ALL_LOGS];
        if (filterModule) data = data.filter(l => l.module === filterModule);
        if (filterAction) data = data.filter(l => l.action === filterAction);
        if (filterUser) data = data.filter(l => l.user === filterUser);
        if (searchTerm) { const t = searchTerm.toLowerCase(); data = data.filter(l => l.details.toLowerCase().includes(t) || l.resource.toLowerCase().includes(t) || l.user.toLowerCase().includes(t)); }
        return data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [searchTerm, filterModule, filterAction, filterUser]);

    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#3b82f6', '#8b5cf6']}>Audit Logs</AuroraText>} subTitle={<DecryptedText text="Searchable audit trail across all modules" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[<Button key="r" icon={<ReloadOutlined />} />,
                <RbacGuard key="exp" requiredRole="manager"><Tooltip title="Excel"><Button icon={<FileExcelOutlined />} size="small" onClick={() => exportToExcel({ fileName: 'audit_logs', title: 'Audit Logs', columns: [{ header: 'User', key: 'user' }, { header: 'Action', key: 'action' }, { header: 'Module', key: 'module' }, { header: 'Details', key: 'details' }, { header: 'IP', key: 'ip' }, { header: 'Severity', key: 'severity' }, { header: 'Time', key: 'createdAt' }], data: filtered })} /></Tooltip>
                    <Tooltip title="PDF"><Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({ fileName: 'audit_logs', title: 'Audit Logs', columns: [{ header: 'User', key: 'user' }, { header: 'Action', key: 'action' }, { header: 'Module', key: 'module' }, { header: 'Details', key: 'details' }, { header: 'Severity', key: 'severity' }, { header: 'Time', key: 'createdAt' }], data: filtered })} /></Tooltip></RbacGuard>]}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Row gutter={[12, 12]}>
                    {[{ t: 'Total Logs', v: ALL_LOGS.length, c: '#3b82f6', i: <AuditOutlined /> }, { t: 'Unique Users', v: new Set(ALL_LOGS.map(l => l.user)).size, c: '#8b5cf6', i: <UserOutlined /> }, { t: 'High Severity', v: ALL_LOGS.filter(l => l.severity === 'high').length, c: '#ef4444', i: <FilterOutlined /> }, { t: 'Filtered', v: filtered.length, c: '#10b981', i: <EyeOutlined /> }].map((s, i) => (
                        <Col key={i} xs={12} md={6}><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><Card size="small" style={{ ...glass, borderTop: `3px solid ${s.c}` }}><Statistic title={s.t} value={s.v} prefix={s.i} valueStyle={{ color: s.c, fontSize: 20 }} /></Card></motion.div></Col>
                    ))}
                </Row>
                <Card size="small" style={{ marginBottom: 0 }}>
                    <Space wrap>
                        <Input.Search placeholder="Search..." size="small" style={{ width: 200 }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} allowClear />
                        <Select placeholder="Module" size="small" style={{ width: 130 }} allowClear value={filterModule} onChange={setFilterModule} options={MODULES.map(m => ({ label: m, value: m }))} />
                        <Select placeholder="Action" size="small" style={{ width: 130 }} allowClear value={filterAction} onChange={setFilterAction} options={ACTIONS.map(a => ({ label: a, value: a }))} />
                        <Select placeholder="User" size="small" style={{ width: 200 }} allowClear value={filterUser} onChange={setFilterUser} options={USERS.map(u => ({ label: u, value: u }))} />
                    </Space>
                </Card>
                <Card style={glass} title={<Space><AuditOutlined style={{ color: themeColor }} /><Text strong>Audit Log Entries</Text><Badge count={filtered.length} style={{ backgroundColor: themeColor }} /></Space>}>
                    <Table dataSource={filtered} rowKey="id" size="small" pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `${t} entries` }} scroll={{ x: 900 }} columns={[
                        { title: 'User', dataIndex: 'user', width: 200, render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'Action', dataIndex: 'action', width: 100, render: (v: string) => <Tag color={ACTION_COLORS[v] || 'default'} style={{ fontSize: 10, borderRadius: 10 }}>{v}</Tag> },
                        { title: 'Module', dataIndex: 'module', width: 100, render: (v: string) => <Tag style={{ fontSize: 10, borderRadius: 10, textTransform: 'capitalize' }}>{v}</Tag> },
                        { title: 'Details', dataIndex: 'details', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                        { title: 'IP', dataIndex: 'ip', width: 120, render: (v: string) => <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</Text> },
                        { title: 'Severity', dataIndex: 'severity', width: 80, render: (v: string) => <Tag color={SEVERITY_COLORS[v]} style={{ borderRadius: 10, fontSize: 10 }}>{v}</Tag> },
                        { title: 'Time', dataIndex: 'createdAt', width: 140, render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(v).format('MMM D, HH:mm')}</Text> },
                    ]} />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
