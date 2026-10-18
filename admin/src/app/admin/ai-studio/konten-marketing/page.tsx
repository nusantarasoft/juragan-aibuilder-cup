'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import CMSLayout from '@/components/layout/CMSLayout';
import RbacGuard from '@/components/common/RbacGuard';
import {
    Alert,
    Button,
    Card,
    Descriptions,
    Drawer,
    Form,
    Input,
    InputNumber,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    CheckOutlined,
    CloseOutlined,
    PictureOutlined,
    ReloadOutlined,
    StopOutlined,
} from '@ant-design/icons';
import {
    studioService,
    StudioMarketingContent,
    StudioMarketingContentStatus,
    StudioMarketingStore,
} from '@/lib/studioService';

const { Text, Paragraph, Title } = Typography;

const STATUS_OPTIONS: { value: StudioMarketingContentStatus | 'all'; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'unpublished', label: 'Unpublished' },
    { value: 'all', label: 'All' },
];

const STATUS_COLOR: Record<string, string> = {
    pending: 'gold',
    approved: 'green',
    rejected: 'red',
    unpublished: 'default',
    draft: 'blue',
};

const SHOWCASE_GALLERY_URL =
    process.env.NEXT_PUBLIC_GALLERY_URL || 'http://localhost:3004';

export default function KontenMarketingPage() {
    const [rows, setRows] = useState<StudioMarketingContent[]>([]);
    const [stores, setStores] = useState<StudioMarketingStore[]>([]);
    const [status, setStatus] = useState<StudioMarketingContentStatus | 'all'>('pending');
    const [tenantFilter, setTenantFilter] = useState<string | undefined>();
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [selected, setSelected] = useState<StudioMarketingContent | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [genStore, setGenStore] = useState<string | undefined>();
    const [genLimit, setGenLimit] = useState(5);
    const [form] = Form.useForm();

    const storeOptions = useMemo(() => {
        const set = new Set(rows.map((r) => r.tenant_id));
        for (const s of stores) set.add(s.tenant_id);
        return [...set].sort();
    }, [rows, stores]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [list, storeList] = await Promise.all([
                studioService.listMarketingContents(status, tenantFilter),
                studioService.listMarketingStores(),
            ]);
            setRows(list);
            setStores(storeList);
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to load marketing content');
        } finally {
            setLoading(false);
        }
    }, [status, tenantFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const openDetail = async (id: string) => {
        try {
            const item = await studioService.getMarketingContent(id);
            setSelected(item);
            form.setFieldsValue({ caption: item.caption, headline: item.headline });
            setDrawerOpen(true);
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to load detail');
        }
    };

    const saveCaption = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            const values = await form.validateFields();
            const updated = await studioService.updateMarketingCaption(
                selected.id,
                values.caption,
                values.headline,
            );
            setSelected(updated);
            message.success('Caption saved');
            load();
        } catch (e) {
            if (e instanceof Error) message.error(e.message);
        } finally {
            setBusy(false);
        }
    };

    const approve = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            await studioService.approveMarketingContent(selected.id);
            message.success('Content approved — now visible in brochure-gallery showcase');
            setDrawerOpen(false);
            load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to approve');
        } finally {
            setBusy(false);
        }
    };

    const reject = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            await studioService.rejectMarketingContent(selected.id);
            message.success('Content rejected');
            setDrawerOpen(false);
            load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to reject');
        } finally {
            setBusy(false);
        }
    };

    const unpublish = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            await studioService.unpublishMarketingContent(selected.id);
            message.success('Content unpublished');
            setDrawerOpen(false);
            load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to unpublish');
        } finally {
            setBusy(false);
        }
    };

    const generateNow = async () => {
        setBusy(true);
        try {
            const res = await studioService.generateMarketingNow({
                store: genStore,
                limit: genLimit,
            });
            message.success(
                `Generation complete — ${res.created} new, ${res.skipped} skipped, ${res.errors} errors`,
            );
            load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Generation failed');
        } finally {
            setBusy(false);
        }
    };

    const toggleConsent = async (tenantId: string, consent: boolean) => {
        try {
            await studioService.setMarketingStoreConsent(tenantId, consent);
            message.success(consent ? 'Marketing consent enabled' : 'Marketing consent disabled');
            load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to update consent');
        }
    };

    const columns = [
        {
            title: 'Product',
            key: 'product',
            render: (_: unknown, row: StudioMarketingContent) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{row.product_name_snapshot}</Text>
                    <Text type="secondary">{row.store_label_snapshot}</Text>
                </Space>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (s: string) => <Tag color={STATUS_COLOR[s] ?? 'default'}>{s}</Tag>,
        },
        {
            title: 'Tenant',
            dataIndex: 'tenant_id',
            key: 'tenant_id',
            width: 140,
        },
        {
            title: 'Created',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
            render: (v: string) => new Date(v).toLocaleString('en-US'),
        },
        {
            title: '',
            key: 'action',
            width: 100,
            render: (_: unknown, row: StudioMarketingContent) => (
                <Button type="link" onClick={() => openDetail(row.id)}>
                    Review
                </Button>
            ),
        },
    ];

    return (
        <RbacGuard
            requiredRole="super_admin"
            fallback={
                <Alert
                    type="warning"
                    message="Marketing Content is restricted to Nusantarasoft super admins."
                    showIcon
                />
            }
        >
            <CMSLayout
                title="SME Marketing Content"
                subTitle="Generate promo cards → review → public gallery (without Instagram)"
                extra={[
                    <Button key="reload" icon={<ReloadOutlined />} onClick={load} loading={loading} style={{ borderRadius: 0 }}>
                        Reload
                    </Button>,
                    <Button
                        key="gen"
                        type="primary"
                        icon={<PictureOutlined />}
                        onClick={generateNow}
                        loading={busy}
                        style={{ borderRadius: 0 }}
                    >
                        Generate now
                    </Button>,
                ]}
            >
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16, borderRadius: 0 }}
                    message="Approved content appears on the public showcase (brochure-gallery) — grid, WA share, permalink /b/m-{id}."
                    action={
                        <Button size="small" type="link" href={SHOWCASE_GALLERY_URL} target="_blank">
                            Open showcase
                        </Button>
                    }
                />
                <Card
                    size="small"
                    title={<span className="font-mono text-xs uppercase tracking-[0.06em]">Generate batch</span>}
                    style={{ marginBottom: 16, borderRadius: 0, borderTop: '2px solid #fb923c' }}
                >
                    <Space wrap>
                        <Select
                            allowClear
                            placeholder="Filter tenant (optional)"
                            style={{ minWidth: 200 }}
                            options={storeOptions.map((t) => ({ value: t, label: t }))}
                            value={genStore}
                            onChange={setGenStore}
                        />
                        <InputNumber min={1} max={50} value={genLimit} onChange={(v) => setGenLimit(v ?? 5)} />
                        <Text type="secondary">Max products per run</Text>
                    </Space>
                </Card>

                <Card
                    size="small"
                    title={<span className="font-mono text-xs uppercase tracking-[0.06em]">Marketing consent per store</span>}
                    style={{ marginBottom: 16, borderRadius: 0, borderTop: '2px solid #fb923c' }}
                >
                    <Table
                        size="small"
                        rowKey="tenant_id"
                        pagination={false}
                        dataSource={stores}
                        columns={[
                            { title: 'Tenant', dataIndex: 'tenant_id', key: 'tenant_id' },
                            { title: 'Label', dataIndex: 'label', key: 'label' },
                            {
                                title: 'Gallery consent',
                                key: 'consent',
                                render: (_: unknown, row: StudioMarketingStore) => (
                                    <Switch
                                        checked={row.marketing_consent}
                                        onChange={(checked) => toggleConsent(row.tenant_id, checked)}
                                    />
                                ),
                            },
                        ]}
                    />
                </Card>

                <Space style={{ marginBottom: 16 }} wrap>
                    <Select
                        value={status}
                        onChange={setStatus}
                        options={STATUS_OPTIONS}
                        style={{ width: 160 }}
                    />
                    <Select
                        allowClear
                        placeholder="Filter tenant"
                        style={{ minWidth: 180 }}
                        options={storeOptions.map((t) => ({ value: t, label: t }))}
                        value={tenantFilter}
                        onChange={setTenantFilter}
                    />
                </Space>

                <Table
                    rowKey="id"
                    loading={loading}
                    dataSource={rows}
                    columns={columns}
                    pagination={{ pageSize: 20 }}
                />

                <Drawer
                    width={560}
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    title="Review marketing content"
                    extra={
                        selected && (
                            <Space>
                                {selected.status === 'pending' && (
                                    <>
                                        <Button icon={<CloseOutlined />} onClick={reject} loading={busy} style={{ borderRadius: 0 }}>
                                            Reject
                                        </Button>
                                        <Button
                                            type="primary"
                                            icon={<CheckOutlined />}
                                            onClick={approve}
                                            loading={busy}
                                            style={{ borderRadius: 0 }}
                                        >
                                            Approve
                                        </Button>
                                    </>
                                )}
                                {selected.status === 'approved' && (
                                    <Button icon={<StopOutlined />} onClick={unpublish} loading={busy} style={{ borderRadius: 0 }}>
                                        Unpublish
                                    </Button>
                                )}
                            </Space>
                        )
                    }
                >
                    {selected && (
                        <>
                            <img
                                src={selected.image_public_url}
                                alt={selected.product_name_snapshot}
                                style={{ width: '100%', borderRadius: 0, marginBottom: 16 }}
                            />
                            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
                                <Descriptions.Item label="Status">
                                    <Tag color={STATUS_COLOR[selected.status]} style={{ borderRadius: 0 }}>{selected.status}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Product">
                                    {selected.product_name_snapshot}
                                </Descriptions.Item>
                                <Descriptions.Item label="Store">
                                    {selected.store_label_snapshot}
                                </Descriptions.Item>
                                {selected.reviewer_id && (
                                    <Descriptions.Item label="Reviewer">
                                        {selected.reviewer_id}
                                        {selected.decided_at
                                            ? ` · ${new Date(selected.decided_at).toLocaleString('en-US')}`
                                            : ''}
                                    </Descriptions.Item>
                                )}
                            </Descriptions>
                            <Form form={form} layout="vertical">
                                <Form.Item name="headline" label="Headline" rules={[{ required: true }]}>
                                    <Input maxLength={200} />
                                </Form.Item>
                                <Form.Item name="caption" label="Caption" rules={[{ required: true }]}>
                                    <Input.TextArea rows={5} maxLength={2200} />
                                </Form.Item>
                                <Button onClick={saveCaption} loading={busy} style={{ borderRadius: 0 }}>
                                    Save caption
                                </Button>
                            </Form>
                            <Paragraph type="secondary" style={{ marginTop: 16 }}>
                                Public image URL: <Text code>{selected.image_public_url}</Text>
                            </Paragraph>
                        </>
                    )}
                </Drawer>
            </CMSLayout>
        </RbacGuard>
    );
}
