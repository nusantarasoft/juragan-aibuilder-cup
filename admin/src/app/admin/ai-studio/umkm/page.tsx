'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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
import {
    PlusOutlined,
    ReloadOutlined,
    WhatsAppOutlined,
    SettingOutlined,
    UnorderedListOutlined,
    MessageOutlined,
    DeleteOutlined,
} from '@ant-design/icons';
import {
    studioService,
    StudioNotebook,
    StudioWhatsAppConfig,
    UmkmCommandIntent,
    UmkmCommandsConfig,
    UmkmMenuCommand,
} from '@/lib/studioService';
import { useAuth } from '@/context/AuthContext';
import { useStudioUserId } from '../useStudioUserId';
import WhatsAppSimChatDrawer from './WhatsAppSimChatDrawer';

const { Text, Paragraph } = Typography;
const glass = {
    background: 'rgba(255,255,255,0.65)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.45)',
    borderRadius: 14,
};

const INTENT_OPTIONS: { value: UmkmCommandIntent; label: string }[] = [
    { value: 'ask', label: 'Tanya' },
    { value: 'menu_hub', label: 'Hub Menu' },
    { value: 'list_products', label: 'Daftar menu' },
    { value: 'add_product', label: 'Tambah menu' },
    { value: 'add_stock', label: 'Tambah stok' },
    { value: 'check_stock', label: 'Cek stok' },
    { value: 'purchase_hub', label: 'Hub Belanja' },
    { value: 'list_purchases', label: 'Daftar belanja' },
    { value: 'record_purchase', label: 'Tambah belanja' },
    { value: 'list_sales', label: 'Daftar penjualan' },
    { value: 'record_sale', label: 'Tambah penjualan' },
    { value: 'report_hub', label: 'Hub Laporan' },
    { value: 'sales_report', label: 'Laporan' },
    { value: 'help', label: 'Bantuan' },
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
    const { loading: authLoading } = useAuth();
    const userId = useStudioUserId();

    const [loading, setLoading] = useState(true);
    const [configs, setConfigs] = useState<StudioWhatsAppConfig[]>([]);
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
            const [list, nbs] = await Promise.all([
                studioService.listWhatsAppConfigs(),
                userId ? studioService.getNotebooks(userId) : Promise.resolve([]),
            ]);
            setConfigs(list);
            setNotebooks(nbs);
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Gagal memuat data UMKM');
        } finally {
            setLoading(false);
        }
    }, [userId]);

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
            wahaSession: 'default',
            ownerPhones: [],
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
            wahaSession: row.waha_session ?? '',
            ownerPhones: collectConfigOwnerPhones(row),
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
                if (!userId) throw new Error('Login dulu untuk membuat notebook');
                const nb = await studioService.createNotebook(
                    values.label || values.tenantId,
                    'UMKM penjualan via WhatsApp',
                    userId,
                    'customer',
                );
                notebookId = nb.id;
            }

            if (!notebookId) {
                throw new Error('Pilih atau buat notebook');
            }

            const ownerPhones = normalizeOwnerPhones(values.ownerPhones);
            if (ownerPhones.length === 0) {
                throw new Error('Minimal satu nomor pemilik toko');
            }

            const tenantId = values.tenantId as string;

            await studioService.setupUmkmNotebook(notebookId, tenantId, false);
            await studioService.updateWhatsAppConfig({
                tenantId,
                notebookId,
                enabled: values.enabled,
                useGuidedFlow: false,
                allowlistPhones: ownerPhones,
                wahaSession: 'default',
                businessPhone: ownerPhones[0],
                label: values.label || null,
            });

            await studioService.updateUmkmCommands(
                notebookId,
                commands,
                false,
                pendampingDirty ? pendampingEnabled : undefined,
            );

            message.success(editing ? 'UMKM diperbarui' : 'UMKM baru ditambahkan');
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
                    message.warning('Simpan OK, tapi Simulasi butuh WA aktif + notebook');
                }
            }
            return true;
        } catch (e: unknown) {
            const err = e as {
                message?: string;
                errorFields?: { errors?: string[]; name?: (string | number)[] }[];
            };
            if (err.errorFields?.length) {
                const first = err.errorFields[0]?.errors?.[0] || 'Lengkapi field wajib dulu';
                message.error(first);
                form.scrollToField(err.errorFields[0]?.name?.[0] as string, {
                    block: 'center',
                });
            } else {
                message.error(err.message || 'Gagal menyimpan');
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
            message.error(err.message || 'Gagal preview intent');
            setPreviewIntent(null);
            setPreviewConfirm(null);
        } finally {
            setPreviewing(false);
        }
    };

    const handleTryInSim = async () => {
        const sample = previewSample.trim();
        if (!sample) {
            message.warning('Isi contoh pesan dulu');
            return;
        }
        if (commandsDirty) {
            message.info('Menyimpan dulu supaya Simulasi memakai perintah terbaru…');
        }
        await handleSave({ openSimWith: sample });
    };

    const handleSetupUmkm = async (row: StudioWhatsAppConfig) => {
        if (!row.notebook_id) {
            message.warning('Set notebook dulu sebelum setup UMKM');
            return;
        }
        setSettingUp(true);
        try {
            await studioService.setupUmkmNotebook(row.notebook_id, row.tenant_id, false);
            message.success(`Mode UMKM aktif untuk ${row.label || row.tenant_id}`);
            await load();
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Gagal setup UMKM');
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
            return previewConfirm === 'confirm' ? 'Konfirmasi (ya)' : 'Batal';
        }
        if (!previewIntent) return null;
        if (previewIntent === 'unknown') return 'Tidak cocok / unknown';
        return INTENT_LABEL[previewIntent] || previewIntent;
    })();

    const columns = [
        {
            title: 'UMKM',
            key: 'label',
            render: (_: unknown, row: StudioWhatsAppConfig) => (
                <Space orientation="vertical" size={0}>
                    <Text strong>{row.label || row.tenant_id}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {row.tenant_id}
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Nomor pemilik',
            key: 'owner_phones',
            render: (_: unknown, row: StudioWhatsAppConfig) => {
                const phones = collectConfigOwnerPhones(row);
                if (!phones.length) return '—';
                return (
                    <Space size={[4, 4]} wrap>
                        {phones.map((p, i) => (
                            <Tag key={p} color={i === 0 ? 'green' : 'default'}>
                                {p}
                            </Tag>
                        ))}
                    </Space>
                );
            },
        },
        {
            title: 'Status',
            key: 'status',
            render: (_: unknown, row: StudioWhatsAppConfig) => (
                <Space>
                    <Tag color={row.enabled ? 'success' : 'default'}>
                        {row.enabled ? 'WA aktif' : 'WA off'}
                    </Tag>
                </Space>
            ),
        },
        {
            title: 'Aksi',
            key: 'actions',
            render: (_: unknown, row: StudioWhatsAppConfig) => (
                <Space wrap>
                    <Button size="small" icon={<SettingOutlined />} onClick={() => openEdit(row)}>
                        Edit
                    </Button>
                    <Button
                        size="small"
                        type="primary"
                        loading={settingUp}
                        onClick={() => handleSetupUmkm(row)}
                    >
                        Setup UMKM
                    </Button>
                    <Tooltip
                        title={
                            !row.enabled || !row.notebook_id
                                ? 'Aktifkan WhatsApp dan set notebook dulu'
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
                            >
                                Simulasi chat
                            </Button>
                        </span>
                    </Tooltip>
                    <Link href={`/admin/ai-studio/ai-gateway?tenant=${encodeURIComponent(row.tenant_id)}`}>
                        <Button size="small" icon={<WhatsAppOutlined />}>
                            WA
                        </Button>
                    </Link>
                    <Link
                        href={`/admin/inventory/items?tenantId=${encodeURIComponent(row.tenant_id)}`}
                    >
                        <Button size="small" icon={<UnorderedListOutlined />}>
                            Katalog
                        </Button>
                    </Link>
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout
            title="UMKM Penjualan WA"
            subTitle="Satu nomor WA admin — tiap UMKM boleh punya beberapa nomor pemilik toko"
            extra={[
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Tambah UMKM
                </Button>,
                <Link key="setup" href="/admin/ai-studio/ai-gateway">
                    <Button>Setup WhatsApp</Button>
                </Link>,
                <Button key="r" icon={<ReloadOutlined />} onClick={load} loading={loading} />,
            ].filter(Boolean)}
        >
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
                <Alert
                    type="info"
                    showIcon
                    title="Model: satu nomor WA admin (Hermes)"
                    description={
                        <ol style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12 }}>
                            <li>
                                Pair <strong>satu</strong> nomor admin di{' '}
                                <Link href="/admin/ai-studio/ai-gateway">
                                    WhatsApp Gateway (Hermes)
                                </Link>
                            </li>
                            <li>
                                <strong>Tambah UMKM</strong> — daftarkan nomor HP pemilik + atur perintah WA
                            </li>
                            <li>
                                <strong>Setup UMKM</strong> — aktifkan mode UMKM
                            </li>
                            <li>
                                Pemilik kirim WA ke nomor admin memakai angka menu atau keyword yang Anda set —
                                atau uji dulu lewat tombol <strong>Simulasi chat</strong> (pipeline inbound,
                                tanpa kirim WA live)
                            </li>
                            <li>Isi <strong>Katalog</strong> per tenant</li>
                        </ol>
                    }
                />

                <Card size="small" style={glass} title={<Text strong>Daftar UMKM</Text>}>
                    <Table
                        rowKey="tenant_id"
                        loading={loading}
                        dataSource={configs}
                        columns={columns}
                        pagination={false}
                        locale={{ emptyText: 'Belum ada UMKM — klik Tambah UMKM' }}
                    />
                </Card>
            </motion.div>

            <Drawer
                title={editing ? 'Edit UMKM' : 'Tambah UMKM baru'}
                size={560}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                extra={
                    <Button type="primary" loading={saving} onClick={() => void handleSave()}>
                        Simpan
                    </Button>
                }
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="label"
                        label="Nama toko"
                        rules={[{ required: true, message: 'Nama toko wajib' }]}
                    >
                        <Input
                            placeholder="Warung Bu Ani"
                            onChange={(e) => handleLabelChange(e.target.value)}
                        />
                    </Form.Item>
                    <Form.Item
                        name="tenantId"
                        label="Tenant ID"
                        rules={[{ required: true, message: 'Tenant ID wajib' }]}
                        extra="Unik per UMKM. Dipakai untuk isolasi data di database."
                    >
                        <Input placeholder="umkm-warung-bu-ani" disabled={!!editing} />
                    </Form.Item>
                    <Form.Item name="wahaSession" hidden initialValue="default">
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="ownerPhones"
                        label="Nomor HP pemilik toko"
                        rules={[
                            {
                                validator: async (_, value) => {
                                    const phones = normalizeOwnerPhones(value);
                                    if (phones.length === 0) {
                                        throw new Error('Minimal satu nomor pemilik');
                                    }
                                },
                            },
                        ]}
                        extra="Boleh lebih dari 1. Ketik 628... lalu Enter."
                    >
                        <Select
                            mode="tags"
                            placeholder="6288123456789 — Enter untuk tambah lagi"
                            tokenSeparators={[',', ' ', ';']}
                            open={false}
                        />
                    </Form.Item>

                    {!editing ? (
                        <Form.Item name="createNewNotebook" label="Notebook" valuePropName="checked">
                            <Switch checkedChildren="Buat notebook baru" unCheckedChildren="Pilih existing" />
                        </Form.Item>
                    ) : null}

                    <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) =>
                            editing || !getFieldValue('createNewNotebook') ? (
                                <Form.Item
                                    name="notebookId"
                                    label="Notebook AI Studio"
                                    rules={[{ required: true }]}
                                >
                                    <Select
                                        placeholder="Pilih notebook"
                                        options={notebooks.map((n) => ({
                                            value: n.id,
                                            label: n.name,
                                        }))}
                                        onChange={(id) => loadCommandsForNotebook(id)}
                                    />
                                </Form.Item>
                            ) : (
                                <Paragraph type="secondary" style={{ fontSize: 12 }}>
                                    Notebook baru akan dibuat otomatis saat simpan.
                                </Paragraph>
                            )
                        }
                    </Form.Item>

                    <Form.Item name="enabled" label="Aktifkan WhatsApp" valuePropName="checked">
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label="Pendamping bisnis"
                        extra="Digit *7* + alias pendamping. Matikan untuk kill-switch per toko."
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
                        Perintah WhatsApp
                    </Divider>
                    <Paragraph type="secondary" style={{ fontSize: 12, marginTop: -8 }}>
                        Tambah/hapus angka menu dan kata kunci. Intent aksi tetap (catat, stok, daftar, laporan,
                        bantuan).
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
                                        { digit: '', intent: 'help', label: 'Baru' },
                                    ],
                                }));
                            }}
                        >
                            Tambah menu
                        </Button>
                        <Button
                            size="small"
                            onClick={() => {
                                if (defaults) {
                                    setCommands(structuredClone(defaults));
                                    setCommandsDirty(true);
                                } else message.warning('Default belum termuat');
                            }}
                        >
                            Reset ke default
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
                                placeholder="Ketik lalu Enter"
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

                    <Form.Item label="Konfirmasi (ya / 1 / …)" style={{ marginBottom: 10 }}>
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
                    <Form.Item label="Batal (batal / 0 / …)" style={{ marginBottom: 10 }}>
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
                        Preview perintah
                    </Divider>
                    <Paragraph type="secondary" style={{ fontSize: 12, marginTop: -8 }}>
                        Ketik contoh pesan (atau digit menu) terhadap perintah di atas — prediksi intent
                        memakai matcher yang sama dengan WhatsApp.
                    </Paragraph>
                    <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
                        <Input
                            value={previewSample}
                            placeholder="contoh: cek stok gula / 5 / jual 2 mie"
                            onChange={(e) => {
                                setPreviewSample(e.target.value);
                                setPreviewIntent(null);
                                setPreviewConfirm(null);
                            }}
                            onPressEnter={() => void runPreview()}
                        />
                        <Button loading={previewing} onClick={() => void runPreview()}>
                            Cek intent
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
                        Coba di Simulasi
                    </Button>
                    <Paragraph type="secondary" style={{ fontSize: 11, marginTop: 6 }}>
                        Menyimpan dulu (Simulasi memakai perintah tersimpan), lalu membuka chat dengan
                        pesan sudah terisi — kirim manual.
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
