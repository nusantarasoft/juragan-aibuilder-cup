"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    List, Button, Tag, Space, Card, Badge, message, Typography, Row, Col,
    Statistic, Empty, Tooltip, Input, Select, Checkbox, Segmented, Divider,
} from "antd";
import { motion, AnimatePresence } from "framer-motion";
import {
    ReloadOutlined, CheckOutlined, CheckCircleOutlined, MailOutlined,
    BellOutlined, EyeOutlined, InboxOutlined, DeleteOutlined, FilterOutlined,
    SearchOutlined, LinkOutlined, FileExcelOutlined, FilePdfOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { exportToPdf, exportToExcel } from "@/lib/exportUtils";
import RbacGuard from "@/components/common/RbacGuard";
import { useAuthStore } from "@/store/useAuthStore";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const MODULE_ICONS: Record<string, string> = {
    crm: '💼', hr: '👥', ops: '⚙️', itsm: '🎫', inventory: '📦',
    accounting: '💰', system: '🖥️', commerce: '🛒',
};

const MODULE_COLORS: Record<string, string> = {
    crm: 'blue', hr: 'purple', ops: 'orange', itsm: 'cyan',
    inventory: 'green', accounting: 'gold', system: 'geekblue', commerce: 'magenta',
};

export default function InboxPage() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const userId = user?.id || 'system';
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [filterModule, setFilterModule] = useState<string | undefined>();
    const [viewFilter, setViewFilter] = useState<string>('all');

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(`query($t: String!, $uid: String!) {
                notifications(tenantId: $t, userId: $uid) {
                    id title message module link icon isRead readAt createdAt
                }
            }`, { t: DEFAULT_TENANT_ID, uid: userId });
            setNotifications(data.notifications || []);
        } catch (err: any) { message.error(err.message); }
        finally { setLoading(false); }
    }, [userId]);

    useEffect(() => { loadNotifications(); }, [loadNotifications]);

    const handleMarkRead = async (id: string) => {
        try {
            await gql(`mutation($id: String!) { markNotificationRead(id: $id) { id } }`, { id });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
        } catch (err: any) { message.error(err.message); }
    };

    const handleMarkAllRead = async () => {
        try {
            await gql(`mutation($t: String!, $uid: String!) { markAllNotificationsRead(tenantId: $t, userId: $uid) }`, { t: DEFAULT_TENANT_ID, uid: userId });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            message.success("All marked as read");
        } catch (err: any) { message.error(err.message); }
    };

    const handleBulkMarkRead = async () => {
        try {
            await Promise.all([...selectedIds].map(id =>
                gql(`mutation($id: String!) { markNotificationRead(id: $id) { id } }`, { id })
            ));
            setNotifications(prev => prev.map(n => selectedIds.has(n.id) ? { ...n, isRead: true } : n));
            setSelectedIds(new Set());
            message.success(`${selectedIds.size} notifications marked as read`);
        } catch (err: any) { message.error(err.message); }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === filteredNotifications.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
    };

    // Filtering
    const filteredNotifications = useMemo(() => {
        let filtered = [...notifications];
        if (viewFilter === 'unread') filtered = filtered.filter(n => !n.isRead);
        if (viewFilter === 'read') filtered = filtered.filter(n => n.isRead);
        if (filterModule) filtered = filtered.filter(n => n.module === filterModule);
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(n =>
                n.title?.toLowerCase().includes(term) || n.message?.toLowerCase().includes(term)
            );
        }
        return filtered;
    }, [notifications, viewFilter, filterModule, searchTerm]);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const modules = [...new Set(notifications.map(n => n.module).filter(Boolean))];

    // Group by date
    const groupedByDate = useMemo(() => {
        const groups: Record<string, any[]> = {};
        filteredNotifications.forEach(n => {
            const date = dayjs(n.createdAt).format('YYYY-MM-DD');
            const label = dayjs(n.createdAt).isToday?.()
                ? 'Today' : dayjs(n.createdAt).format('ddd, MMM D');
            const key = `${date}|||${label}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(n);
        });
        return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
    }, [filteredNotifications]);

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Inbox</AuroraText>}
            subTitle={<DecryptedText text="Your notifications from across all modules" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="reload" icon={<ReloadOutlined />} onClick={loadNotifications} />,
                <Button key="markAll" icon={<CheckOutlined />} onClick={handleMarkAllRead} disabled={unreadCount === 0}>Mark All Read</Button>,
                <RbacGuard key="exp" requiredRole="manager">
                    <Tooltip title="Export Excel">
                        <Button size="small" icon={<FileExcelOutlined />} onClick={() => exportToExcel({
                            fileName: 'notifications_inbox', title: 'Notification Inbox',
                            columns: [{ header: 'Title', key: 'title' }, { header: 'Message', key: 'message' }, { header: 'Module', key: 'module' }, { header: 'Read', key: 'isRead' }, { header: 'Time', key: 'createdAt' }],
                            data: notifications,
                        })} />
                    </Tooltip>
                    <Tooltip title="Export PDF">
                        <Button size="small" icon={<FilePdfOutlined />} onClick={() => exportToPdf({
                            fileName: 'notifications_inbox', title: 'Notification Inbox',
                            columns: [{ header: 'Title', key: 'title' }, { header: 'Module', key: 'module' }, { header: 'Read', key: 'isRead' }, { header: 'Time', key: 'createdAt' }],
                            data: notifications,
                        })} />
                    </Tooltip>
                </RbacGuard>,
            ]}
        >
            {/* Stats */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Total', value: notifications.length, icon: <InboxOutlined />, color: '#3b82f6' },
                    { title: 'Unread', value: unreadCount, icon: <BellOutlined />, color: '#ef4444' },
                    { title: 'Read', value: notifications.length - unreadCount, icon: <EyeOutlined />, color: '#22c55e' },
                    { title: 'Modules', value: modules.length, icon: <FilterOutlined />, color: '#8b5cf6' },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={6}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* Toolbar */}
            <Card size="small" style={{ marginBottom: 16 }}>
                <Row gutter={12} align="middle">
                    <Col flex="auto">
                        <Space wrap>
                            <Segmented
                                value={viewFilter}
                                onChange={(v) => setViewFilter(v as string)}
                                options={[
                                    { label: `All (${notifications.length})`, value: 'all' },
                                    { label: `Unread (${unreadCount})`, value: 'unread' },
                                    { label: `Read (${notifications.length - unreadCount})`, value: 'read' },
                                ]}
                                size="small"
                            />
                            <Select placeholder="Module" allowClear size="small" style={{ width: 130 }}
                                value={filterModule} onChange={setFilterModule}
                                options={modules.map(m => ({
                                    label: <Space><span>{MODULE_ICONS[m] || '🔔'}</span>{m}</Space>,
                                    value: m,
                                }))}
                            />
                            <Input.Search placeholder="Search..." size="small" style={{ width: 200 }}
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                allowClear />
                        </Space>
                    </Col>
                    <Col>
                        <Space>
                            {selectedIds.size > 0 && (
                                <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                                    onClick={handleBulkMarkRead}>
                                    Mark {selectedIds.size} Read
                                </Button>
                            )}
                            <Checkbox
                                indeterminate={selectedIds.size > 0 && selectedIds.size < filteredNotifications.length}
                                checked={selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0}
                                onChange={selectAll}>
                                <Text style={{ fontSize: 12 }}>Select All</Text>
                            </Checkbox>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Notification List */}
            <Card>
                {filteredNotifications.length === 0 ? (
                    <Empty description={searchTerm || filterModule ? "No matching notifications" : "No notifications yet"} />
                ) : (
                    groupedByDate.map(([key, items]) => {
                        const label = key.split('|||')[1];
                        return (
                            <div key={key}>
                                <Divider titlePlacement="start" style={{ margin: '8px 0', fontSize: 12, color: '#94a3b8' }}>
                                    {label}
                                </Divider>
                                <List
                                    dataSource={items}
                                    renderItem={(n: any) => (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <List.Item
                                                style={{
                                                    background: selectedIds.has(n.id)
                                                        ? 'rgba(99, 102, 241, 0.08)'
                                                        : n.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.04)',
                                                    borderRadius: 8, padding: '10px 16px', marginBottom: 4,
                                                    borderLeft: !n.isRead ? '3px solid #3b82f6' : '3px solid transparent',
                                                    transition: 'all 0.2s',
                                                }}
                                                actions={[
                                                    n.link && (
                                                        <Tooltip key="link" title="Open">
                                                            <Button type="text" size="small" icon={<LinkOutlined />}
                                                                onClick={() => n.link?.startsWith('/') ? router.push(n.link) : (window.location.href = n.link)} />
                                                        </Tooltip>
                                                    ),
                                                    !n.isRead && (
                                                        <Button key="read" type="text" size="small" icon={<CheckCircleOutlined />}
                                                            onClick={() => handleMarkRead(n.id)}>Read</Button>
                                                    ),
                                                ].filter(Boolean)}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%' }}>
                                                    <Checkbox
                                                        checked={selectedIds.has(n.id)}
                                                        onChange={() => toggleSelect(n.id)}
                                                        style={{ marginTop: 4, flexShrink: 0 }}
                                                    />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <List.Item.Meta
                                                            avatar={<span style={{ fontSize: 22 }}>{MODULE_ICONS[n.module] || '🔔'}</span>}
                                                            title={
                                                                <Space>
                                                                    {!n.isRead && <Badge dot color="#3b82f6" />}
                                                                    <Text strong={!n.isRead} style={{ fontSize: 13 }}>{n.title}</Text>
                                                                    {n.module && <Tag color={MODULE_COLORS[n.module] || 'default'} style={{ fontSize: 10 }}>{n.module}</Tag>}
                                                                </Space>
                                                            }
                                                            description={
                                                                <div>
                                                                    {n.message && <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{n.message}</Text>}
                                                                    <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(n.createdAt).fromNow()}</Text>
                                                                </div>
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </List.Item>
                                        </motion.div>
                                    )}
                                />
                            </div>
                        );
                    })
                )}
            </Card>
        </CMSLayout>
    );
}
