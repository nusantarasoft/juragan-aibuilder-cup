'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import {
    Alert,
    Button,
    Card,
    Divider,
    Drawer,
    Form,
    Input,
    message,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import { validateSingleStoreWaPhone, normalizeSingleStoreWaPhone } from '@/lib/studioWaPhone';
import {
    PlusOutlined,
    ReloadOutlined,
    WhatsAppOutlined,
    SettingOutlined,
    UnorderedListOutlined,
    MessageOutlined,
    DeleteOutlined,
    CheckOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import {
    studioService,
    StudioNotebook,
    StudioWhatsAppConfig,
    StudioUmkmRegistration,
    UmkmCommandIntent,
    UmkmCommandsConfig,
    UmkmMenuCommand,
} from '@/lib/studioService';
import { useAuth } from '@/context/AuthContext';
import { useStudioUserId } from '../useStudioUserId';
import WhatsAppSimChatDrawer from './WhatsAppSimChatDrawer';

const { Text, Paragraph } = Typography;
const tacticalCard: React.CSSProperties = {
    borderRadius: 0,
    borderTop: '2px solid #fb923c',
};

const INTENT_OPTIONS: { value: UmkmCommandIntent; label: string }[] = [
    { value: 'ask', label: 'Ask' },
    { value: 'menu_hub', label: 'Menu Hub' },
    { value: 'list_products', label: 'Menu List' },
    { value: 'add_product', label: 'Add Menu Item' },
    { value: 'add_stock', label: 'Add Stock' },
    { value: 'check_stock', label: 'Check Stock' },
    { value: 'purchase_hub', label: 'Purchase Hub' },
    { value: 'list_purchases', label: 'Purchase List' },
    { value: 'record_purchase', label: 'Record Purchase' },
    { value: 'list_sales', label: 'Sales List' },
    { value: 'record_sale', label: 'Record Sale' },
    { value: 'report_hub', label: 'Report Hub' },
    { value: 'sales_report', label: 'Sales Report' },
    { value: 'help', label: 'Help' },
];

const KEYWORD_INTENTS: UmkmCommandIntent[] = [
    'ask',
    'menu_hub',
    'list_products',
    'add_product',
    'add_stock',
    'check_stock',
    'purchase_hub',
    'list_purchases',
    'record_purchase',
    'list_sales',
    'record_sale',
    'report_hub',
    'sales_report',
    'help',
];

const INTENT_LABEL: Record<string, string> = Object.fromEntries(
    INTENT_OPTIONS.map((o) => [o.value, o.label]),
);

function slugifyTenant(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
}

/** Normalize to 628... digits; drop short/invalid entries. */
function normalizeOwnerPhones(raw: unknown): string[] {
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const out: string[] = [];
    for (const entry of list) {
        const digits = String(entry || '').replace(/\D/g, '');
        if (digits.length < 8) continue;
        if (!out.includes(digits)) out.push(digits);
    }
    return out;
}

/** All phones that can chat as this UMKM (primary + allowlist). */
function collectConfigOwnerPhones(row: StudioWhatsAppConfig): string[] {
    return normalizeOwnerPhones([row.business_phone, ...(row.allowlist_phones || [])]);
}

function emptyCommands(): UmkmCommandsConfig {
    return {
        menu: [],
        keywords: {
            ask: [],
            menu_hub: [],
            list_products: [],
            add_product: [],
            add_stock: [],
            check_stock: [],
            purchase_hub: [],
            list_purchases: [],
            record_purchase: [],
            list_sales: [],
            record_sale: [],
            report_hub: [],
            sales_report: [],
            help: [],
        },
        confirm: [],
        cancel: [],
    };
}

function commandsFromNotebook(nb: StudioNotebook | undefined): UmkmCommandsConfig | null {
    const cfg = nb?.context_config as { umkm_commands?: UmkmCommandsConfig } | undefined;
    return cfg?.umkm_commands ?? null;
}

function pendampingEnabledFromNotebook(nb: StudioNotebook | undefined): boolean {
    const cfg = nb?.context_config as { umkm_pendamping_enabled?: boolean } | undefined;
    return cfg?.umkm_pendamping_enabled !== false;
}

export default function UmkmStudioPage() {
    const router = useRouter();
    const role = useAuthStore((s) => s.user?.role);
    const { loading: authLoading } = useAuth();
    const userId = useStudioUserId();

    useEffect(() => {
        if (authLoading) return;
        if (role === 'tenant_owner') {
            router.replace('/admin/connect-wa');
        }
    }, [authLoading, role, router]);

    const [loading, setLoading] = useState(true);
    const [configs, setConfigs] = useState<StudioWhatsAppConfig[]>([]);
    const [pendingRegs, setPendingRegs] = useState<StudioUmkmRegistration[]>([]);
    const [actingRegId, setActingRegId] = useState<string | null>(null);
    const [notebooks, setNotebooks] = useState<StudioNotebook[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editing, setEditing] = useState<StudioWhatsAppConfig | null>(null);
    const [simTarget, setSimTarget] = useState<StudioWhatsAppConfig | null>(null);
    const [simInitialMessage, setSimInitialMessage] = useState<string | undefined>(undefined);
    const [saving, setSaving] = useState(false);
    const [settingUp, setSettingUp] = useState(false);
    const [form] = Form.useForm();
    const [commands, setCommands] = useState<UmkmCommandsConfig>(emptyCommands());
    const [defaults, setDefaults] = useState<UmkmCommandsConfig | null>(null);
    const [previewSample, setPreviewSample] = useState('');
    const [previewIntent, setPreviewIntent] = useState<string | null>(null);
    const [previewConfirm, setPreviewConfirm] = useState<'confirm' | 'cancel' | null>(null);
    const [previewing, setPreviewing] = useState(false);
    const [commandsDirty, setCommandsDirty] = useState(false);
    const [pendampingEnabled, setPendampingEnabled] = useState(true);
    const [pendampingDirty, setPendampingDirty] = useState(false);

    useEffect(() => {
        studioService.getUmkmCommandsDefaults().then(setDefaults).catch(() => {});
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [list, nbs, regsResult] = await Promise.all([
                studioService.listWhatsAppConfigs(),
                userId ? studioService.getNotebooks(userId) : Promise.resolve([]),
                studioService
                    .listUmkmRegistrations('pending')
                    .then((regs) => ({ ok: true as const, regs }))
                    .catch((e: unknown) => ({ ok: false as const, error: e })),
            ]);
            setConfigs(list);
            setNotebooks(nbs);
            if (regsResult.ok) {
                setPendingRegs(regsResult.regs);
            } else {
                setPendingRegs([]);
                const err = regsResult.error as { message?: string };
                message.error(err?.message || 'Failed to load pending SME queue');
            }
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Failed to load SME data');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const handleApproveReg = async (row: StudioUmkmRegistration) => {
        setActingRegId(row.id);
        try {
            await studioService.approveUmkmRegistration(row.id);
            message.success(`Approved: ${row.store_name || row.phone}`);
            await load();
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Failed to approve');
        } finally {
            setActingRegId(null);
        }
    };

    const handleRejectReg = async (row: StudioUmkmRegistration) => {
        setActingRegId(row.id);
        try {
            await studioService.rejectUmkmRegistration(row.id);
            message.success(`Rejected: ${row.store_name || row.phone}`);
            await load();
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Failed to reject');
        } finally {
            setActingRegId(null);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        load();
    }, [load, authLoading]);

    const loadCommandsForNotebook = (notebookId?: string | null) => {
        if (!notebookId) {
            setCommands(defaults ? structuredClone(defaults) : emptyCommands());
            setPendampingEnabled(true);
            setPendampingDirty(false);
            return;
        }
        const nb = notebooks.find((n) => n.id === notebookId);
        const fromNb = commandsFromNotebook(nb);
        setPendampingEnabled(pendampingEnabledFromNotebook(nb));
        setPendampingDirty(false);
        if (fromNb) {
            setCommands({
                menu: [...(fromNb.menu || [])],
                keywords: {
                    ask: [...(fromNb.keywords?.ask || [])],
                    menu_hub: [...(fromNb.keywords?.menu_hub || [])],
                    list_products: [...(fromNb.keywords?.list_products || [])],
                    add_product: [...(fromNb.keywords?.add_product || [])],
                    add_stock: [...(fromNb.keywords?.add_stock || [])],
                    check_stock: [...(fromNb.keywords?.check_stock || [])],
                    purchase_hub: [...(fromNb.keywords?.purchase_hub || [])],
                    list_purchases: [...(fromNb.keywords?.list_purchases || [])],
                    record_purchase: [...(fromNb.keywords?.record_purchase || [])],
                    list_sales: [...(fromNb.keywords?.list_sales || [])],
                    record_sale: [...(fromNb.keywords?.record_sale || [])],
                    report_hub: [...(fromNb.keywords?.report_hub || [])],
                    sales_report: [...(fromNb.keywords?.sales_report || [])],
                    help: [...(fromNb.keywords?.help || [])],
                },
                confirm: [...(fromNb.confirm || [])],
                cancel: [...(fromNb.cancel || [])],
            });
        } else {
            setCommands(defaults ? structuredClone(defaults) : emptyCommands());
        }
    };

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({
            enabled: true,
            useGuidedFlow: false,
            sessionName: 'default',
            ownerPhone: '',
            createNewNotebook: true,
        });
        setCommands(defaults ? structuredClone(defaults) : emptyCommands());
        setCommandsDirty(false);
        setPendampingEnabled(true);
        setPendampingDirty(false);
        setPreviewSample('');
        setPreviewIntent(null);
        setPreviewConfirm(null);
        setDrawerOpen(true);
    };

    const openEdit = (row: StudioWhatsAppConfig) => {
        setEditing(row);
        form.setFieldsValue({
            tenantId: row.tenant_id,
            // Match table display: fall back to tenant_id when label is empty
            label: row.label || row.tenant_id || '',
            sessionName: row.session_name ?? '',
            ownerPhone: collectConfigOwnerPhones(row)[0] ?? '',
            notebookId: row.notebook_id ?? undefined,
            enabled: row.enabled,
            useGuidedFlow: row.use_guided_flow,
            createNewNotebook: false,
        });
        loadCommandsForNotebook(row.notebook_id);
        setCommandsDirty(false);
        setPreviewSample('');
        setPreviewIntent(null);
        setPreviewConfirm(null);
        setDrawerOpen(true);
    };

    const handleLabelChange = (label: string) => {
        if (!editing) {
            const slug = slugifyTenant(label);
            if (slug) {
                const current = form.getFieldValue('tenantId');
                if (!current || String(current).startsWith('umkm-')) {
                    form.setFieldsValue({ tenantId: `umkm-${slug}` });
                }
            }
        }
    };

    const handleSave = async (opts?: { openSimWith?: string }): Promise<boolean> => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            let notebookId = values.notebookId as string | undefined;

            if (!editing && values.createNewNotebook) {
                if (!userId) throw new Error('Please sign in first to create a notebook');
                const nb = await studioService.createNotebook(
                    values.label || values.tenantId,
                    'SME sales via WhatsApp',
                    userId,
                    'customer',
                );
                notebookId = nb.id;
            }

            if (!notebookId) {
                throw new Error('Select or create a notebook');
            }

            const ownerPhone = validateSingleStoreWaPhone(values.ownerPhone);

            const tenantId = values.tenantId as string;

            await studioService.setupUmkmNotebook(notebookId, tenantId, false);
            await studioService.updateWhatsAppConfig({
                tenantId,
                notebookId,
                enabled: values.enabled,
                useGuidedFlow: false,
                allowlistPhones: [],
                sessionName: 'default',
                businessPhone: ownerPhone,
                label: values.label || null,
            });

            await studioService.updateUmkmCommands(
                notebookId,
                commands,
                false,
                pendampingDirty ? pendampingEnabled : undefined,
            );

            message.success(editing ? 'SME updated' : 'New SME added');
            setCommandsDirty(false);
            setPendampingDirty(false);
            setDrawerOpen(false);
            await load();

            if (opts?.openSimWith?.trim()) {
                const list = await studioService.listWhatsAppConfigs();
                const row = list.find((c) => c.tenant_id === tenantId) ?? null;
                if (row?.enabled && row.notebook_id) {
                    setSimInitialMessage(opts.openSimWith.trim());
                    setSimTarget(row);
                } else {
                    message.warning('Saved successfully, but Simulator requires active WA + notebook');
                }
            }
            return true;
        } catch (e: unknown) {
            const err = e as {
                message?: string;
                errorFields?: { errors?: string[]; name?: (string | number)[] }[];
            };
            if (err.errorFields?.length) {
                const first = err.errorFields[0]?.errors?.[0] || 'Please complete required fields first';
                message.error(first);
                form.scrollToField(err.errorFields[0]?.name?.[0] as string, {
                    block: 'center',
                });
            } else {
                message.error(err.message || 'Failed to save');
            }
            return false;
        } finally {
            setSaving(false);
        }
    };

    const runPreview = async () => {
        const sample = previewSample.trim();
        if (!sample) {
            setPreviewIntent('unknown');
            setPreviewConfirm(null);
            return;
        }
        setPreviewing(true);
        try {
            const res = await studioService.previewUmkmIntent(sample, commands);
            setPreviewIntent(res.intent);
            setPreviewConfirm(res.confirm);
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Failed to preview intent');
            setPreviewIntent(null);
            setPreviewConfirm(null);
        } finally {
            setPreviewing(false);
        }
    };

    const handleTryInSim = async () => {
        const sample = previewSample.trim();
        if (!sample) {
            message.warning('Enter a sample message first');
            return;
        }
        if (commandsDirty) {
            message.info('Saving first so Simulator uses the latest commands…');
        }
        await handleSave({ openSimWith: sample });
    };

    const handleSetupUmkm = async (row: StudioWhatsAppConfig) => {
        if (!row.notebook_id) {
            message.warning('Set a notebook first before SME setup');
            return;
        }
        setSettingUp(true);
        try {
            await studioService.setupUmkmNotebook(row.notebook_id, row.tenant_id, false);
            message.success(`SME mode enabled for ${row.label || row.tenant_id}`);
            await load();
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Failed to set up SME');
        } finally {
            setSettingUp(false);
        }
    };

    const updateMenuRow = (index: number, patch: Partial<UmkmMenuCommand>) => {
        setCommandsDirty(true);
        setCommands((prev) => {
            const menu = [...prev.menu];
            menu[index] = { ...menu[index], ...patch };
            return { ...prev, menu };
        });
    };

    const previewLabel = (() => {
        if (previewConfirm) {
            return previewConfirm === 'confirm' ? 'Confirm (yes)' : 'Cancel';
        }
        if (!previewIntent) return null;
        if (previewIntent === 'unknown') return 'No match / unknown';
        return INTENT_LABEL[previewIntent] || previewIntent;
    })();

    const columns = [
        {
            title: 'SME',
            key: 'label',
            render: (_: unknown, row: StudioWhatsAppConfig) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{row.label || row.tenant_id}</Text>
                    <Text type="secondary" className="font-mono" style={{ fontSize: 11 }}>
                        {row.tenant_id}
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Owner phone',
            key: 'owner_phones',
            render: (_: unknown, row: StudioWhatsAppConfig) => {
                const phone = collectConfigOwnerPhones(row)[0];
                if (!phone) return '—';
                return <Tag color="green" className="font-mono" style={{ borderRadius: 0 }}>{phone}</Tag>;
            },
        },
        {
            title: 'Status',
            key: 'status',
            render: (_: unknown, row: StudioWhatsAppConfig) => (
                <Space>
                    <Tag color={row.enabled ? 'success' : 'default'} style={{ borderRadius: 0 }}>
                        {row.enabled ? 'WA active' : 'WA off'}
                    </Tag>
                </Space>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, row: StudioWhatsAppConfig) => (
                <Space wrap>
                    <Button size="small" icon={<SettingOutlined />} onClick={() => openEdit(row)} style={{ borderRadius: 0 }}>
                        Edit
                    </Button>
                    <Button
                        size="small"
                        type="primary"
                        loading={settingUp}
                        onClick={() => handleSetupUmkm(row)}
                        style={{ borderRadius: 0 }}
                    >
                        Setup SME
                    </Button>
                    <Tooltip
                        title={
                            !row.enabled || !row.notebook_id
                                ? 'Enable WhatsApp and set a notebook first'
                                : undefined
                        }
                    >
                        <span style={{ display: 'inline-block' }}>
                            <Button
                                size="small"
                                icon={<MessageOutlined />}
                                onClick={() => {
                                    setSimInitialMessage(undefined);
                                    setSimTarget(row);
                                }}
                                disabled={!row.enabled || !row.notebook_id}
                                style={{ borderRadius: 0 }}
                            >
                                Chat simulator
                            </Button>
                        </span>
                    </Tooltip>
                    <Link href={`/admin/ai-studio/ai-gateway?tenant=${encodeURIComponent(row.tenant_id)}`}>
                        <Button size="small" icon={<WhatsAppOutlined />} style={{ borderRadius: 0 }}>
                            WA
                        </Button>
                    </Link>
                    <Link
                        href={`/admin/inventory/items?tenantId=${encodeURIComponent(row.tenant_id)}`}
                    >
                        <Button size="small" icon={<UnorderedListOutlined />} style={{ borderRadius: 0 }}>
                            Catalog
                        </Button>
                    </Link>
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout
            title="SME WhatsApp Sales"
            subTitle="Single admin WA number — each SME can have multiple store owner phone numbers"
            extra={[
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 0 }}>
                    Add SME
                </Button>,
                <Link key="setup" href="/admin/ai-studio/ai-gateway">
                    <Button style={{ borderRadius: 0 }}>Setup WhatsApp</Button>
                </Link>,
                <Button key="r" icon={<ReloadOutlined />} onClick={load} loading={loading} style={{ borderRadius: 0 }} />,
            ].filter(Boolean)}
        >
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
                <Alert
                    type="info"
                    showIcon
                    style={{ borderRadius: 0, padding: '6px 10px' }}
                    message={
                        <span className="text-xs">
                            <strong>SME Flow (1 Hermes Number):</strong>{' '}
                            1) Pair in <Link href="/admin/ai-studio/ai-gateway">WA Gateway</Link> ·{' '}
                            2) Send <strong>DAFTAR</strong> via WA → Approve below (or <strong>Add SME</strong> manually) ·{' '}
                            3) Test in <strong>Chat simulator</strong> · 4) Populate <strong>Catalog</strong>.
                        </span>
                    }
                />

                <Card
                    size="small"
                    style={tacticalCard}
                    title={
                        <Space>
                            <Text strong className="font-mono text-xs uppercase tracking-[0.06em]">Pending approval</Text>
                            {pendingRegs.length > 0 ? (
                                <Tag color="orange" className="font-mono" style={{ borderRadius: 0 }}>{pendingRegs.length}</Tag>
                            ) : null}
                        </Space>
                    }
                >
                    <Table
                        rowKey="id"
                        loading={loading}
                        dataSource={pendingRegs}
                        pagination={false}
                        locale={{ emptyText: 'No pending DAFTAR queue from WhatsApp' }}
                        columns={[
                            {
                                title: 'Time',
                                dataIndex: 'created_at',
                                width: 160,
                                render: (v: string) =>
                                    v ? new Date(v).toLocaleString('en-US') : '—',
                            },
                            {
                                title: 'WA Number',
                                dataIndex: 'phone',
                                render: (p: string) => <Tag color="green" className="font-mono" style={{ borderRadius: 0 }}>{p}</Tag>,
                            },
                            {
                                title: 'Store name',
                                dataIndex: 'store_name',
                                render: (n: string | null) => n || '—',
                            },
                            {
                                title: '',
                                key: 'actions',
                                width: 200,
                                render: (_: unknown, row: StudioUmkmRegistration) => (
                                    <Space>
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<CheckOutlined />}
                                            loading={actingRegId === row.id}
                                            onClick={() => void handleApproveReg(row)}
                                            style={{ borderRadius: 0 }}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            danger
                                            size="small"
                                            icon={<CloseOutlined />}
                                            loading={actingRegId === row.id}
                                            onClick={() => void handleRejectReg(row)}
                                            style={{ borderRadius: 0 }}
                                        >
                                            Reject
                                        </Button>
                                    </Space>
                                ),
                            },
                        ]}
                    />
                </Card>

                <Card size="small" style={tacticalCard} title={<Text strong className="font-mono text-xs uppercase tracking-[0.06em]">SME Directory</Text>}>
                    <Table
                        rowKey="tenant_id"
                        loading={loading}
                        dataSource={configs}
                        columns={columns}
                        pagination={false}
                        locale={{ emptyText: 'No SMEs yet — click Add SME' }}
                    />
                </Card>
            </motion.div>

            <Drawer
                title={editing ? 'Edit SME' : 'Add new SME'}
                size={560}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                extra={
                    <Button type="primary" loading={saving} onClick={() => void handleSave()}>
                        Save
                    </Button>
                }
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="label"
                        label="Store name"
                        rules={[{ required: true, message: 'Store name is required' }]}
                    >
                        <Input
                            placeholder="Warung Bu Ani"
                            onChange={(e) => handleLabelChange(e.target.value)}
                        />
                    </Form.Item>
                    <Form.Item
                        name="tenantId"
                        label="Tenant ID"
                        rules={[{ required: true, message: 'Tenant ID is required' }]}
                        extra="Unique per SME. Used for data isolation in the database."
                    >
                        <Input placeholder="umkm-warung-bu-ani" disabled={!!editing} />
                    </Form.Item>
                    <Form.Item name="sessionName" hidden initialValue="default">
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="ownerPhone"
                        label="Store owner WhatsApp number"
                        rules={[
                            {
                                validator: async (_, value) => {
                                    if (!normalizeSingleStoreWaPhone(value)) {
                                        throw new Error('Owner phone is required (628...)');
                                    }
                                },
                            },
                        ]}
                        extra="One number per store (D-40). Format 628..."
                    >
                        <Input placeholder="6288123456789" />
                    </Form.Item>

                    {!editing ? (
                        <Form.Item name="createNewNotebook" label="Notebook" valuePropName="checked">
                            <Switch checkedChildren="Create new notebook" unCheckedChildren="Select existing" />
                        </Form.Item>
                    ) : null}

                    <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) =>
                            editing || !getFieldValue('createNewNotebook') ? (
                                <Form.Item
                                    name="notebookId"
                                    label="AI Studio Notebook"
                                    rules={[{ required: true }]}
                                >
                                    <Select
                                        placeholder="Select notebook"
                                        options={notebooks.map((n) => ({
                                            value: n.id,
                                            label: n.name,
                                        }))}
                                        onChange={(id) => loadCommandsForNotebook(id)}
                                    />
                                </Form.Item>
                            ) : (
                                <Paragraph type="secondary" style={{ fontSize: 12 }}>
                                    A new notebook will be created automatically upon saving.
                                </Paragraph>
                            )
                        }
                    </Form.Item>

                    <Form.Item name="enabled" label="Enable WhatsApp" valuePropName="checked">
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label="Business Advisor"
                        extra="Digit *7* + advisor aliases. Turn off as a per-store kill-switch."
                    >
                        <Switch
                            checked={pendampingEnabled}
                            checkedChildren="ON"
                            unCheckedChildren="OFF"
                            onChange={(checked) => {
                                setPendampingEnabled(checked);
                                setPendampingDirty(true);
                            }}
                        />
                    </Form.Item>

                    <Divider titlePlacement="start" plain>
                        WhatsApp Commands
                    </Divider>
                    <Paragraph type="secondary" style={{ fontSize: 12, marginTop: -8 }}>
                        Add/remove menu digits and keywords. Action intents remain fixed (record, stock, list, report,
                        help).
                    </Paragraph>

                    <Space style={{ marginBottom: 8 }} wrap>
                        <Button
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => {
                                setCommandsDirty(true);
                                setCommands((prev) => ({
                                    ...prev,
                                    menu: [
                                        ...prev.menu,
                                        { digit: '', intent: 'help', label: 'New' },
                                    ],
                                }));
                            }}
                        >
                            Add menu item
                        </Button>
                        <Button
                            size="small"
                            onClick={() => {
                                if (defaults) {
                                    setCommands(structuredClone(defaults));
                                    setCommandsDirty(true);
                                } else message.warning('Defaults not loaded yet');
                            }}
                        >
                            Reset to default
                        </Button>
                    </Space>

                    {commands.menu.map((row, index) => (
                        <Space key={`menu-${index}`} align="start" style={{ display: 'flex', marginBottom: 8 }} wrap>
                            <Input
                                style={{ width: 56 }}
                                maxLength={1}
                                value={row.digit}
                                placeholder="#"
                                onChange={(e) =>
                                    updateMenuRow(index, {
                                        digit: e.target.value.replace(/\D/g, '').slice(0, 1),
                                    })
                                }
                            />
                            <Select
                                style={{ width: 160 }}
                                value={row.intent}
                                options={INTENT_OPTIONS}
                                onChange={(intent) => updateMenuRow(index, { intent })}
                            />
                            <Input
                                style={{ flex: 1, minWidth: 120 }}
                                value={row.label}
                                placeholder="Label"
                                onChange={(e) => updateMenuRow(index, { label: e.target.value })}
                            />
                            <Button
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                    setCommandsDirty(true);
                                    setCommands((prev) => ({
                                        ...prev,
                                        menu: prev.menu.filter((_, i) => i !== index),
                                    }));
                                }}
                            />
                        </Space>
                    ))}

                    {KEYWORD_INTENTS.map((intent) => (
                        <Form.Item
                            key={intent}
                            label={`Keyword: ${INTENT_OPTIONS.find((o) => o.value === intent)?.label}`}
                            style={{ marginBottom: 10 }}
                        >
                            <Select
                                mode="tags"
                                value={commands.keywords[intent] || []}
                                placeholder="Type then press Enter"
                                tokenSeparators={[',']}
                                open={false}
                                onChange={(tags: string[]) => {
                                    setCommandsDirty(true);
                                    setCommands((prev) => ({
                                        ...prev,
                                        keywords: { ...prev.keywords, [intent]: tags },
                                    }));
                                }}
                            />
                        </Form.Item>
                    ))}

                    <Form.Item label="Confirmation (yes / ya / 1 / …)" style={{ marginBottom: 10 }}>
                        <Select
                            mode="tags"
                            value={commands.confirm}
                            placeholder="ya, oke, 1"
                            tokenSeparators={[',']}
                            open={false}
                            onChange={(tags: string[]) => {
                                setCommandsDirty(true);
                                setCommands((prev) => ({ ...prev, confirm: tags }));
                            }}
                        />
                    </Form.Item>
                    <Form.Item label="Cancel (cancel / batal / 0 / …)" style={{ marginBottom: 10 }}>
                        <Select
                            mode="tags"
                            value={commands.cancel}
                            placeholder="batal, 0"
                            tokenSeparators={[',']}
                            open={false}
                            onChange={(tags: string[]) => {
                                setCommandsDirty(true);
                                setCommands((prev) => ({ ...prev, cancel: tags }));
                            }}
                        />
                    </Form.Item>

                    <Divider titlePlacement="start" plain>
                        Command Preview
                    </Divider>
                    <Paragraph type="secondary" style={{ fontSize: 12, marginTop: -8 }}>
                        Type a sample message (or menu digit) against the commands above — intent prediction
                        uses the same matcher as WhatsApp.
                    </Paragraph>
                    <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
                        <Input
                            value={previewSample}
                            placeholder="e.g., cek stok gula / 5 / jual 2 mie"
                            onChange={(e) => {
                                setPreviewSample(e.target.value);
                                setPreviewIntent(null);
                                setPreviewConfirm(null);
                            }}
                            onPressEnter={() => void runPreview()}
                        />
                        <Button loading={previewing} onClick={() => void runPreview()}>
                            Check intent
                        </Button>
                    </Space.Compact>
                    {previewLabel != null && (
                        <Paragraph style={{ marginBottom: 8 }}>
                            Intent:{' '}
                            <Tag color={previewIntent === 'unknown' && !previewConfirm ? 'default' : 'green'}>
                                {previewLabel}
                            </Tag>
                            {previewIntent && previewIntent !== 'unknown' && !previewConfirm ? (
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    ({previewIntent})
                                </Text>
                            ) : null}
                        </Paragraph>
                    )}
                    <Button
                        icon={<MessageOutlined />}
                        loading={saving}
                        disabled={!previewSample.trim()}
                        onClick={() => void handleTryInSim()}
                    >
                        Try in Simulator
                    </Button>
                    <Paragraph type="secondary" style={{ fontSize: 11, marginTop: 6 }}>
                        Saves first (Simulator uses saved commands), then opens the chat with
                        the message pre-filled — send manually.
                    </Paragraph>
                </Form>
            </Drawer>

            <WhatsAppSimChatDrawer
                open={!!simTarget}
                config={simTarget}
                initialMessage={simInitialMessage}
                onClose={() => {
                    setSimTarget(null);
                    setSimInitialMessage(undefined);
                }}
            />
        </CMSLayout>
    );
}
