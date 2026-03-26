"use client";

import React, { useState, useEffect } from "react";
import { Table, Tag, Card, Typography, Input, Select, Row, Col, Button, Tooltip } from "antd";
import { ShoppingOutlined, SearchOutlined, ReloadOutlined, InboxOutlined, TagOutlined, DollarOutlined, FilterOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { inventoryService } from "@/lib/inventoryService";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { AuroraText } from "@/components/magicui/aurora-text";

const { Text } = Typography;

const FULFILLMENT_COLORS: Record<string, string> = {
    physical: 'blue', ticket: 'purple', scheduled: 'cyan', rental: 'orange',
};

const STATUS_COLORS: Record<string, string> = {
    active: 'green', draft: 'default', archived: 'red',
};

const fmtCurrency = (v?: number) => v ? `Rp ${v.toLocaleString()}` : '—';

export default function ProductsPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [fulfillmentFilter, setFulfillmentFilter] = useState<string | undefined>();
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [stats, setStats] = useState<any>(null);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [itemsData, statsData] = await Promise.all([
                inventoryService.getItems('default'),
                inventoryService.getStockStats(),
            ]);
            setItems(itemsData);
            setStats(statsData);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const filtered = items.filter(item => {
        if (fulfillmentFilter && item.fulfillmentType !== fulfillmentFilter) return false;
        if (statusFilter && item.status !== statusFilter) return false;
        if (search && !item.name?.toLowerCase().includes(search.toLowerCase()) && !item.sku?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const countByType = (type: string) => items.filter(i => i.fulfillmentType === type).length;

    const kpiCards = [
        { title: 'Total Products', value: items.length, icon: <ShoppingOutlined />, color: '#6366f1' },
        { title: 'Physical', value: countByType('physical'), icon: <InboxOutlined />, color: '#3b82f6' },
        { title: 'Tickets', value: countByType('ticket'), icon: <TagOutlined />, color: '#8b5cf6' },
        { title: 'Scheduled', value: countByType('scheduled'), icon: <FilterOutlined />, color: '#06b6d4' },
        { title: 'Rental', value: countByType('rental'), icon: <DollarOutlined />, color: '#f59e0b' },
        { title: 'Active', value: items.filter(i => i.status === 'active').length, icon: <ShoppingOutlined />, color: '#10b981' },
    ];

    const columns = [
        { title: 'SKU', dataIndex: 'sku', width: 130, render: (v: string) => <Text code className="text-xs">{v || '—'}</Text> },
        { title: 'Product Name', dataIndex: 'name', ellipsis: true, render: (v: string) => <Text strong className="text-sm">{v}</Text> },
        { title: 'Type', dataIndex: 'fulfillmentType', width: 110,
            render: (v: string) => <Tag color={FULFILLMENT_COLORS[v] || 'default'} className="rounded-full text-xs capitalize">{v}</Tag> },
        { title: 'Category', dataIndex: 'categoryId', width: 120, render: (v: string) => v ? <Text className="text-xs">{v.slice(0, 8)}...</Text> : '—' },
        { title: 'Cost Price', dataIndex: 'costPrice', width: 130, render: (v: number) => fmtCurrency(v) },
        { title: 'Selling Price', dataIndex: 'sellingPrice', width: 130,
            render: (v: number) => <Text strong style={{ color: '#6366f1' }}>{fmtCurrency(v)}</Text> },
        { title: 'Tax', dataIndex: 'taxRate', width: 70, render: (v: number) => v ? `${v}%` : '—' },
        { title: 'Status', dataIndex: 'status', width: 100,
            render: (v: string) => <Tag color={STATUS_COLORS[v] || 'default'} className="rounded-full text-xs capitalize">{v}</Tag> },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={["#6366f1", "#8b5cf6", "#a78bfa", "#00ffff", "#ff00ff"]}>Products</AuroraText>}
            subTitle={<DecryptedText text="Catalog from Inventory — all fulfillment types" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                <Row gutter={[12, 12]}>
                    {kpiCards.map((s, i) => (
                        <Col key={i} xs={12} sm={8} md={4}>
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card size="small" className="hover:shadow-md transition-shadow" style={{
                                    background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255,255,255,0.5)', borderRadius: 12,
                                }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{ background: `${s.color}15`, color: s.color, fontSize: 18 }}>{s.icon}</div>
                                        <div>
                                            <Text type="secondary" className="text-xs block">{s.title}</Text>
                                            <Text strong className="text-lg">{s.value.toLocaleString()}</Text>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                <Card size="small" style={{ flex: 1, borderRadius: 12, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.5)' }}>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            <Input prefix={<SearchOutlined className="text-gray-400" />} placeholder="Search products..."
                                value={search} onChange={e => setSearch(e.target.value)} allowClear style={{ maxWidth: 240, borderRadius: 8 }} size="small" />
                            <Select placeholder="Fulfillment" allowClear value={fulfillmentFilter} onChange={setFulfillmentFilter} style={{ width: 130 }} size="small"
                                options={[{ value: 'physical', label: 'Physical' }, { value: 'ticket', label: 'Ticket' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'rental', label: 'Rental' }]} />
                            <Select placeholder="Status" allowClear value={statusFilter} onChange={setStatusFilter} style={{ width: 110 }} size="small"
                                options={[{ value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' }]} />
                        </div>
                        <Tooltip title="Reload"><Button icon={<ReloadOutlined />} onClick={load} /></Tooltip>
                    </div>
                    <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} size="small"
                        pagination={{ pageSize: 15, showSizeChanger: false, showTotal: (t) => `${t} products` }} scroll={{ x: 1000 }} />
                </Card>
            </div>
        </CMSLayout>
    );
}
