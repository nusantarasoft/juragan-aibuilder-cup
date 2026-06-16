'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import {
    Alert,
    Button,
    Card,
    Col,
    Drawer,
    Form,
    Input,
    message,
    Row,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Typography,
} from 'antd';
import {
    PlusOutlined,
    ReloadOutlined,
    WhatsAppOutlined,
    SettingOutlined,
    UnorderedListOutlined,
} from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    studioService,
    StudioNotebook,
    StudioWhatsAppConfig,
} from '@/lib/studioService';
import { useAuth } from '@/context/AuthContext';
import { useAuthStore } from '@/store/useAuthStore';

const { Text, Paragraph } = Typography;
const glass = {
    background: 'rgba(255,255,255,0.65)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.45)',
    borderRadius: 14,
};

const WAHA_DASHBOARD =
    process.env.NEXT_PUBLIC_WAHA_DASHBOARD_URL || 'http://127.0.0.1:3010/dashboard';

function slugifyTenant(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
}

export default function UmkmStudioPage() {
    const { themeColor } = usePreferencesStore();
    const { user: contextUser, loading: authLoading } = useAuth();
    const authUser = useAuthStore((s) => s.user);
    const userId = authUser?.id ?? contextUser?.id;

    const [loading, setLoading] = useState(true);
    const [configs, setConfigs] = useState<StudioWhatsAppConfig[]>([]);
    const [notebooks, setNotebooks] = useState<StudioNotebook[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editing, setEditing] = useState<StudioWhatsAppConfig | null>(null);
    const [saving, setSaving] = useState(false);
    const [settingUp, setSettingUp] = useState(false);
    const [form] = Form.useForm();

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

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({
            enabled: true,
            useGuidedFlow: true,
            wahaSession: 'default',
            allowlistPhones: [],
            createNewNotebook: true,
        });
        setDrawerOpen(true);
    };

    const openEdit = (row: StudioWhatsAppConfig) => {
        setEditing(row);
        form.setFieldsValue({
            tenantId: row.tenant_id,
            label: row.label ?? '',
            wahaSession: row.waha_session ?? '',
            businessPhone: row.business_phone ?? '',
            notebookId: row.notebook_id ?? undefined,
            enabled: row.enabled,
            useGuidedFlow: row.use_guided_flow,
            allowlistPhones: row.allowlist_phones ?? [],
            createNewNotebook: false,
        });
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

    const handleSave = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
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

            await studioService.updateWhatsAppConfig({
                tenantId: values.tenantId,
                notebookId,
                enabled: values.enabled,
                useGuidedFlow: values.useGuidedFlow,
                allowlistPhones: values.allowlistPhones || [],
                wahaSession: 'default',
                businessPhone: values.businessPhone?.replace(/\D/g, '') || null,
                label: values.label || null,
            });

            message.success(editing ? 'UMKM diperbarui' : 'UMKM baru ditambahkan');
            setDrawerOpen(false);
            await load();
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Gagal menyimpan');
        } finally {
            setSaving(false);
        }
    };

    const handleSetupUmkm = async (row: StudioWhatsAppConfig) => {
        if (!row.notebook_id) {
            message.warning('Set notebook dulu sebelum setup UMKM');
            return;
        }
        setSettingUp(true);
        try {
            await studioService.setupUmkmNotebook(row.notebook_id, row.tenant_id, true);
            message.success(`Mode UMKM aktif untuk ${row.label || row.tenant_id}`);
            await load();
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Gagal setup UMKM');
        } finally {
            setSettingUp(false);
        }
    };

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
            dataIndex: 'business_phone',
            key: 'business_phone',
            render: (v: string) => v || '—',
        },
        {
            title: 'Staff',
            key: 'staff',
            render: (_: unknown, row: StudioWhatsAppConfig) =>
                row.allowlist_phones?.length ? (
                    <Text type="secondary">{row.allowlist_phones.length} nomor</Text>
                ) : (
                    '—'
                ),
        },
        {
            title: 'Status',
            key: 'status',
            render: (_: unknown, row: StudioWhatsAppConfig) => (
                <Space>
                    <Tag color={row.enabled ? 'success' : 'default'}>
                        {row.enabled ? 'WA aktif' : 'WA off'}
                    </Tag>
                    {row.use_guided_flow ? <Tag color="blue">Guided flow</Tag> : null}
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
            title={
                <AuroraText colors={[themeColor, '#25d366', '#f59e0b']}>
                    UMKM Penjualan WA
                </AuroraText>
            }
            subTitle={
                <DecryptedText
                    text="Satu nomor WA admin — setiap UMKM dikenali dari nomor HP pemilik yang mengirim pesan"
                    animateOn="view"
                    revealDirection="center"
                    speed={40}
                    maxIterations={12}
                    sequential
                />
            }
            extra={[
                <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Tambah UMKM
                </Button>,
                <Link key="setup" href="/admin/ai-studio/waha-setup">
                    <Button>Setup WAHA</Button>
                </Link>,
                <Button key="waha" onClick={() => window.open(WAHA_DASHBOARD, '_blank')}>
                    WAHA Dashboard
                </Button>,
                <Button key="r" icon={<ReloadOutlined />} onClick={load} loading={loading} />,
            ]}
        >
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
                <Alert
                    type="info"
                    showIcon
                    title="Model: satu nomor WA admin (WAHA)"
                    description={
                        <ol style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12 }}>
                            <li>
                                Pair <strong>satu</strong> nomor admin di{' '}
                                <Link href="/admin/ai-studio/waha-setup">Setup WAHA</Link> (session{' '}
                                <code>default</code>)
                            </li>
                            <li><strong>Tambah UMKM</strong> — daftarkan <strong>nomor HP pemilik</strong> yang akan chat ke admin</li>
                            <li><strong>Setup UMKM</strong> — aktifkan flow penjualan</li>
                            <li>Pemilik kirim WA ke nomor admin: <em>jual ...</em>, <em>laporan</em>, dll.</li>
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
                size={480}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                extra={
                    <Button type="primary" loading={saving} onClick={handleSave}>
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
                        name="businessPhone"
                        label="Nomor HP pemilik UMKM"
                        rules={[{ required: true, message: 'Nomor pemilik wajib' }]}
                        extra="Nomor ini yang dipakai pemilik mengirim WA ke nomor admin. 628... tanpa +"
                    >
                        <Input placeholder="6288123456789" />
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
                    <Form.Item name="useGuidedFlow" label="Gunakan guided flow UMKM" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <Form.Item
                        name="allowlistPhones"
                        label="Nomor staff tambahan (opsional)"
                        extra="Karyawan yang juga boleh catat penjualan untuk toko ini"
                    >
                        <Select mode="tags" placeholder="628..." tokenSeparators={[',', ' ']} />
                    </Form.Item>
                </Form>
            </Drawer>
        </CMSLayout>
    );
}
