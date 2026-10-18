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
    Select,
    Space,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    CheckOutlined,
    CloseOutlined,
    ExperimentOutlined,
    LinkOutlined,
    ReloadOutlined,
    RollbackOutlined,
} from '@ant-design/icons';
import {
    studioService,
    StudioResearchItem,
    StudioResearchItemStatus,
    StudioResearchLastRun,
} from '@/lib/studioService';

const { Text, Paragraph, Title } = Typography;

const STATUS_OPTIONS: { value: StudioResearchItemStatus | 'all'; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'merged', label: 'Merged' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' },
    { value: 'all', label: 'All' },
];

const STATUS_COLOR: Record<string, string> = {
    pending: 'gold',
    approved: 'blue',
    merged: 'green',
    rejected: 'red',
    expired: 'default',
};

const RUN_STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'processing' | 'default'> =
    {
        completed: 'success',
        partial: 'warning',
        failed: 'error',
        running: 'processing',
    };

export default function RisetKnowledgePage() {
    const [rows, setRows] = useState<StudioResearchItem[]>([]);
    const [lastRun, setLastRun] = useState<StudioResearchLastRun | null>(null);
    const [status, setStatus] = useState<StudioResearchItemStatus | 'all'>('pending');
    const [category, setCategory] = useState<string | undefined>();
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [selected, setSelected] = useState<StudioResearchItem | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [form] = Form.useForm();

    const categories = useMemo(() => {
        const set = new Set(rows.map((r) => r.category));
        return [...set].sort();
    }, [rows]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [list, run] = await Promise.all([
                studioService.listResearchItems(status, category),
                studioService.getResearchLastRun(),
            ]);
            setRows(list);
            setLastRun(run);
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to load research');
        } finally {
            setLoading(false);
        }
    }, [status, category]);

    useEffect(() => {
        load();
    }, [load]);

    const openDetail = async (id: string) => {
        try {
            const item = await studioService.getResearchItem(id);
            setSelected(item);
            form.setFieldsValue({ title: item.title, summary: item.summary });
            setDrawerOpen(true);
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to load detail');
        }
    };

    const runNow = async () => {
        setBusy(true);
        try {
            const res = await studioService.runResearchNow();
            message.success(`Run complete — ${res.itemsCreated} new items (run ${res.runId})`);
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Run failed');
        } finally {
            setBusy(false);
        }
    };

    const saveEdit = async () => {
        if (!selected) return;
        const values = await form.validateFields();
        setBusy(true);
        try {
            const updated = await studioService.updateResearchItem(selected.id, values);
            setSelected(updated);
            message.success('Summary saved');
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Save failed');
        } finally {
            setBusy(false);
        }
    };

    const approve = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            await studioService.approveResearchItem(selected.id);
            message.success('Approved and merged into curriculum notebook');
            setDrawerOpen(false);
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Approve failed');
        } finally {
            setBusy(false);
        }
    };

    const reject = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            await studioService.rejectResearchItem(selected.id, 'Rejected by admin');
            message.info('Item rejected');
            setDrawerOpen(false);
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Reject failed');
        } finally {
            setBusy(false);
        }
    };

    const unmerge = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            await studioService.unmergeResearchItem(selected.id);
            message.success('Unmerged — source removed, status reverted to approved');
            const item = await studioService.getResearchItem(selected.id);
            setSelected(item);
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Unmerge failed');
        } finally {
            setBusy(false);
        }
    };

    const columns = [
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            render: (t: string, row: StudioResearchItem) => (
                <Button type="link" onClick={() => openDetail(row.id)} style={{ padding: 0 }}>
                    {t}
                </Button>
            ),
        },
        { title: 'Category', dataIndex: 'category', key: 'category', width: 120 },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (s: string) => <Tag color={STATUS_COLOR[s] || 'default'}>{s}</Tag>,
        },
        {
            title: 'Flags',
            key: 'flags',
            render: (_: unknown, row: StudioResearchItem) => (
                <Space wrap size={4}>
                    {row.validation_flags?.quote_validation_failed && (
                        <Tag color="red">invalid quote</Tag>
                    )}
                    {row.validation_flags?.dedupe_unchecked && (
                        <Tag color="purple">dedupe unchecked</Tag>
                    )}
                    {(row.dedupe_hits?.flags || []).map((f) => (
                        <Tag key={f} color="orange">
                            {f}
                        </Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: 'Created',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
            render: (v: string) => new Date(v).toLocaleString('en-US'),
        },
    ];

    return (
        <RbacGuard
            requiredRole="super_admin"
            fallback={
                <Alert
                    type="warning"
                    message="Knowledge Research is restricted to Nusantarasoft super admins."
                    showIcon
                />
            }
        >
            <CMSLayout
                title="SME Knowledge Research"
                subTitle="Fetch official regulations → review → merge into curriculum notebook (KASIR_CONSULT_NOTEBOOK_ID)"
                extra={[
                    <Button key="reload" icon={<ReloadOutlined />} onClick={load} loading={loading} style={{ borderRadius: 0 }}>
                        Reload
                    </Button>,
                    <Button
                        key="run"
                        type="primary"
                        icon={<ExperimentOutlined />}
                        onClick={runNow}
                        loading={busy}
                        style={{ borderRadius: 0 }}
                    >
                        Run research now
                    </Button>,
                ]}
            >
                {lastRun && (
                    <Alert
                        style={{ marginBottom: 16, borderRadius: 0 }}
                        type={
                            lastRun.status === 'completed'
                                ? 'success'
                                : lastRun.status === 'partial'
                                  ? 'warning'
                                  : lastRun.status === 'failed'
                                    ? 'error'
                                    : 'info'
                        }
                        showIcon
                        message={
                            <Space wrap>
                                <span>Last run</span>
                                <Tag color={RUN_STATUS_COLOR[lastRun.status] || 'default'} style={{ borderRadius: 0 }}>
                                    {lastRun.status}
                                </Tag>
                                {typeof lastRun.stats?.itemsCreated === 'number' && (
                                    <Text type="secondary">
                                        {lastRun.stats.itemsCreated} new items
                                    </Text>
                                )}
                                {typeof lastRun.stats?.errors === 'number' &&
                                    lastRun.stats.errors > 0 && (
                                        <Text type="danger">
                                            {lastRun.stats.errors} URLs failed
                                        </Text>
                                    )}
                            </Space>
                        }
                        description={
                            <>
                                <div>
                                    {new Date(lastRun.started_at).toLocaleString('en-US')}
                                    {lastRun.finished_at
                                        ? ` → ${new Date(lastRun.finished_at).toLocaleString('en-US')}`
                                        : ''}
                                    {lastRun.trigger_type === 'manual' ? ' · manual' : ' · cron'}
                                </div>
                                {lastRun.error_message && (
                                    <Paragraph
                                        type="danger"
                                        style={{ marginBottom: 0, marginTop: 8 }}
                                        copyable
                                    >
                                        {lastRun.error_message}
                                    </Paragraph>
                                )}
                            </>
                        }
                    />
                )}

                <Card style={{ marginBottom: 16, borderRadius: 0, borderTop: '2px solid #fb923c' }}>
                    <Space wrap>
                        <Select
                            style={{ width: 160 }}
                            value={status}
                            onChange={setStatus}
                            options={STATUS_OPTIONS}
                        />
                        <Select
                            allowClear
                            placeholder="Filter category"
                            style={{ width: 180 }}
                            value={category}
                            onChange={setCategory}
                            options={categories.map((c) => ({ value: c, label: c }))}
                        />
                    </Space>
                </Card>

                <Table
                    rowKey="id"
                    loading={loading}
                    dataSource={rows}
                    columns={columns}
                    pagination={{ pageSize: 20 }}
                />

                <Drawer
                    width={720}
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    title={selected?.title || 'Research detail'}
                    extra={
                        selected && (
                            <Space>
                                {selected.status === 'pending' && (
                                    <>
                                        <Button icon={<CloseOutlined />} onClick={reject} loading={busy}>
                                            Reject
                                        </Button>
                                        <Button
                                            type="primary"
                                            icon={<CheckOutlined />}
                                            onClick={approve}
                                            loading={busy}
                                            disabled={selected.validation_flags?.quote_validation_failed}
                                        >
                                            Approve (merge)
                                        </Button>
                                    </>
                                )}
                                {selected.status === 'merged' && (
                                    <Button icon={<RollbackOutlined />} onClick={unmerge} loading={busy}>
                                        Unmerge
                                    </Button>
                                )}
                            </Space>
                        )
                    }
                >
                    {selected && (
                        <>
                            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
                                <Descriptions.Item label="Status">
                                    <Tag color={STATUS_COLOR[selected.status]}>{selected.status}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Topic">{selected.topic_key}</Descriptions.Item>
                                <Descriptions.Item label="Target notebook">
                                    <Text code>{selected.target_notebook_id}</Text>
                                </Descriptions.Item>
                                {selected.effective_date && (
                                    <Descriptions.Item label="Effective date">
                                        {selected.effective_date}
                                    </Descriptions.Item>
                                )}
                                {selected.merged_source_id && (
                                    <Descriptions.Item label="Source merged">
                                        <Text code>{selected.merged_source_id}</Text>
                                    </Descriptions.Item>
                                )}
                                {selected.reviewer_id && (
                                    <Descriptions.Item label="Reviewer">
                                        {selected.reviewer_id}
                                        {selected.decided_at
                                            ? ` · ${new Date(selected.decided_at).toLocaleString('en-US')}`
                                            : ''}
                                    </Descriptions.Item>
                                )}
                            </Descriptions>

                            {(selected.dedupe_hits?.hits || []).length > 0 && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    style={{ marginBottom: 16 }}
                                    message="Similarity vs notebook chunks"
                                    description={
                                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                                            {(selected.dedupe_hits?.hits || []).map((h) => (
                                                <li key={h.chunk_id}>
                                                    <Tag>{h.flag}</Tag> score {h.score.toFixed(3)} —{' '}
                                                    {h.filename}: {h.content_preview}
                                                </li>
                                            ))}
                                        </ul>
                                    }
                                />
                            )}

                            <Title level={5}>Sources</Title>
                            {(selected.sources || []).map((s) => (
                                <Card key={s.url} size="small" style={{ marginBottom: 8 }}>
                                    <a href={s.url} target="_blank" rel="noreferrer">
                                        <LinkOutlined /> {s.url}
                                    </a>
                                    <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 4 }}>
                                        Fetched: {s.fetched_at}
                                    </Paragraph>
                                    <Text italic>&ldquo;{s.quoted_snippet}&rdquo;</Text>
                                </Card>
                            ))}

                            <Title level={5} style={{ marginTop: 16 }}>
                                Summary
                            </Title>
                            <Form form={form} layout="vertical">
                                <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                                    <Input disabled={!['pending', 'approved'].includes(selected.status)} />
                                </Form.Item>
                                <Form.Item name="summary" label="Summary" rules={[{ required: true }]}>
                                    <Input.TextArea
                                        rows={8}
                                        disabled={!['pending', 'approved'].includes(selected.status)}
                                    />
                                </Form.Item>
                                {['pending', 'approved'].includes(selected.status) && (
                                    <Button onClick={saveEdit} loading={busy}>
                                        Save changes
                                    </Button>
                                )}
                            </Form>
                        </>
                    )}
                </Drawer>
            </CMSLayout>
        </RbacGuard>
    );
}
