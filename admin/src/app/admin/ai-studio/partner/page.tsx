'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import CMSLayout from '@/components/layout/CMSLayout';
import { useAdminLayout } from '@/components/layout/CMSLayoutContext';
import { getVOTheme } from '@/components/layout/voTheme';
import {
    Button,
    Drawer,
    Form,
    Input,
    Modal,
    Select,
    Switch,
    Tooltip,
    message,
} from 'antd';
import { validateSingleStoreWaPhone } from '@/lib/studioWaPhone';
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
    ThunderboltOutlined,
    SearchOutlined,
    ExpandAltOutlined,
    BookOutlined,
    SendOutlined,
    RobotOutlined,
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
import WhatsAppSimChatDrawer, { WhatsAppSimChatPanel } from './WhatsAppSimChatDrawer';

const INTENT_OPTIONS: { value: UmkmCommandIntent; label: string }[] = [
    { value: 'ask', label: 'Ask Knowledge (RAG)' },
    { value: 'menu_hub', label: 'Menu Hub' },
    { value: 'list_products', label: 'Product Catalog List' },
    { value: 'add_product', label: 'Add Catalog Item' },
    { value: 'add_stock', label: 'Add Inventory Stock' },
    { value: 'check_stock', label: 'Check Stock Level' },
    { value: 'purchase_hub', label: 'Purchase Hub' },
    { value: 'list_purchases', label: 'Purchase History' },
    { value: 'record_purchase', label: 'Record Purchase' },
    { value: 'list_sales', label: 'Sales History' },
    { value: 'record_sale', label: 'Record Sale (Cashier)' },
    { value: 'report_hub', label: 'Report Hub' },
    { value: 'sales_report', label: 'Sales Summary Report' },
    { value: 'help', label: 'Help & Commands' },
];

const KEYWORD_INTENTS: UmkmCommandIntent[] = INTENT_OPTIONS.map((o) => o.value);

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

type InspectorTab = 'profile' | 'commands' | 'simulator';
type StatusFilter = 'all' | 'active' | 'unlinked';

export default function PartnerStudioPage() {
    const router = useRouter();
    const role = useAuthStore((s) => s.user?.role);
    const { loading: authLoading } = useAuth();
    const userId = useStudioUserId();
    const { darkMode, themeColor = '#fb923c' } = useAdminLayout();
    const t = getVOTheme(darkMode);

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

    // Layout & Filtering State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [showListPane, setShowListPane] = useState(true);
    const [showInspectorPane, setShowInspectorPane] = useState(true);
    const [showQueueStrip, setShowQueueStrip] = useState(false);

    // Selection & Inspector State
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [inspectorTab, setInspectorTab] = useState<InspectorTab>('profile');
    const [simInitialMessage, setSimInitialMessage] = useState<string | undefined>(undefined);
    const [popoutSimTarget, setPopoutSimTarget] = useState<StudioWhatsAppConfig | null>(null);

    // Create Modal State
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createForm] = Form.useForm();
    const [creating, setCreating] = useState(false);

    // Inspector Edit Form & Commands State
    const [inspectorForm] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [settingUp, setSettingUp] = useState(false);
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

    // Listen to global CMS layout reset event
    const handleResetLayout = useCallback(() => {
        setShowListPane(true);
        setShowInspectorPane(true);
        setSearchQuery('');
        setStatusFilter('all');
    }, []);

    useEffect(() => {
        const onGlobalReset = () => handleResetLayout();
        window.addEventListener('cms-reset-layout', onGlobalReset);
        return () => window.removeEventListener('cms-reset-layout', onGlobalReset);
    }, [handleResetLayout]);

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
                if (regsResult.regs.length > 0) {
                    setShowQueueStrip(true);
                }
            } else {
                setPendingRegs([]);
            }
            if (list.length > 0 && !selectedTenantId) {
                setSelectedTenantId(list[0].tenant_id);
            }
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Failed to load Partner configurations');
        } finally {
            setLoading(false);
        }
    }, [userId, selectedTenantId]);

    useEffect(() => {
        if (authLoading) return;
        load();
    }, [load, authLoading]);

    const selectedPartner = useMemo(
        () => configs.find((c) => c.tenant_id === selectedTenantId) ?? null,
        [configs, selectedTenantId],
    );

    const loadCommandsForNotebook = useCallback(
        (notebookId?: string | null) => {
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
        },
        [defaults, notebooks],
    );

    // Sync inspector form whenever selectedPartner changes
    useEffect(() => {
        if (!selectedPartner) {
            inspectorForm.resetFields();
            return;
        }
        inspectorForm.setFieldsValue({
            tenantId: selectedPartner.tenant_id,
            label: selectedPartner.label || selectedPartner.tenant_id || '',
            sessionName: selectedPartner.session_name ?? 'default',
            ownerPhone: collectConfigOwnerPhones(selectedPartner)[0] ?? '',
            notebookId: selectedPartner.notebook_id ?? undefined,
            enabled: selectedPartner.enabled,
            useGuidedFlow: selectedPartner.use_guided_flow,
        });
        loadCommandsForNotebook(selectedPartner.notebook_id);
        setCommandsDirty(false);
        setPreviewSample('');
        setPreviewIntent(null);
        setPreviewConfirm(null);
    }, [selectedPartner, inspectorForm, loadCommandsForNotebook]);

    const handleApproveReg = async (row: StudioUmkmRegistration) => {
        setActingRegId(row.id);
        try {
            await studioService.approveUmkmRegistration(row.id);
            message.success(`Approved Partner: ${row.store_name || row.phone}`);
            await load();
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Failed to approve registration');
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
            message.error(err.message || 'Failed to reject registration');
        } finally {
            setActingRegId(null);
        }
    };

    const openCreateModal = () => {
        createForm.resetFields();
        createForm.setFieldsValue({
            enabled: true,
            ownerPhone: '',
            createNewNotebook: true,
        });
        setCreateModalOpen(true);
    };

    const handleCreateLabelChange = (label: string) => {
        const slug = slugifyTenant(label);
        if (slug) {
            const current = createForm.getFieldValue('tenantId');
            if (!current || String(current).startsWith('umkm-') || String(current).startsWith('partner-')) {
                createForm.setFieldsValue({ tenantId: `umkm-${slug}` });
            }
        }
    };

    const handleCreatePartner = async () => {
        try {
            const values = await createForm.validateFields();
            setCreating(true);
            let notebookId = values.notebookId as string | undefined;

            if (values.createNewNotebook) {
                if (!userId) throw new Error('Please sign in first to create a notebook');
                const nb = await studioService.createNotebook(
                    values.label || values.tenantId,
                    'Partner sales & catalog via WhatsApp',
                    userId,
                    'customer',
                );
                notebookId = nb.id;
            }

            if (!notebookId) {
                throw new Error('Select an existing notebook or enable automatic notebook creation');
            }

            const ownerPhone = validateSingleStoreWaPhone(values.ownerPhone);
            const tenantId = values.tenantId as string;

            await studioService.setupUmkmNotebook(notebookId, tenantId, false);
            await studioService.updateWhatsAppConfig({
                tenantId,
                notebookId,
                enabled: values.enabled !== false,
                useGuidedFlow: false,
                allowlistPhones: [],
                sessionName: 'default',
                businessPhone: ownerPhone,
                label: values.label || null,
            });

            if (defaults) {
                await studioService.updateUmkmCommands(notebookId, defaults, false, true);
            }

            message.success(`Partner "${values.label || tenantId}" onboarded`);
            setCreateModalOpen(false);
            await load();
            setSelectedTenantId(tenantId);
            setInspectorTab('profile');
        } catch (e: unknown) {
            const err = e as {
                message?: string;
                errorFields?: { errors?: string[] }[];
            };
            if (err.errorFields?.length) {
                message.error(err.errorFields[0]?.errors?.[0] || 'Complete required fields');
            } else {
                message.error(err.message || 'Failed to onboard Partner');
            }
        } finally {
            setCreating(false);
        }
    };

    const handleSaveInspector = async (opts?: { openSimWith?: string }): Promise<boolean> => {
        if (!selectedPartner) return false;
        try {
            const values = await inspectorForm.validateFields();
            setSaving(true);
            const notebookId = values.notebookId as string | undefined;
            if (!notebookId) {
                throw new Error('Select a linked RAG Notebook for this Partner');
            }

            const ownerPhone = validateSingleStoreWaPhone(values.ownerPhone);
            const tenantId = selectedPartner.tenant_id;

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

            message.success(`Saved Partner "${values.label || tenantId}"`);
            setCommandsDirty(false);
            setPendampingDirty(false);
            await load();

            if (opts?.openSimWith?.trim()) {
                setSimInitialMessage(opts.openSimWith.trim());
                setInspectorTab('simulator');
            }
            return true;
        } catch (e: unknown) {
            const err = e as {
                message?: string;
                errorFields?: { errors?: string[] }[];
            };
            if (err.errorFields?.length) {
                message.error(err.errorFields[0]?.errors?.[0] || 'Complete required fields');
            } else {
                message.error(err.message || 'Failed to save Partner configuration');
            }
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleInitializePartner = async (row: StudioWhatsAppConfig) => {
        if (!row.notebook_id) {
            message.warning('Link a RAG notebook first before initializing Partner mode');
            setSelectedTenantId(row.tenant_id);
            setInspectorTab('profile');
            return;
        }
        setSettingUp(true);
        try {
            await studioService.setupUmkmNotebook(row.notebook_id, row.tenant_id, false);
            message.success(`Partner RAG & Cashier mode initialized for ${row.label || row.tenant_id}`);
            await load();
        } catch (e: unknown) {
            const err = e as { message?: string };
            message.error(err.message || 'Failed to initialize Partner');
        } finally {
            setSettingUp(false);
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
            message.warning('Enter a sample WhatsApp message first');
            return;
        }
        await handleSaveInspector({ openSimWith: sample });
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
            return previewConfirm === 'confirm' ? 'Confirm (YES)' : 'Cancel (NO)';
        }
        if (!previewIntent) return null;
        if (previewIntent === 'unknown') return 'No keyword match (fallback to AI RAG)';
        return INTENT_LABEL[previewIntent] || previewIntent;
    })();

    // Filtered Partner list
    const filteredConfigs = useMemo(() => {
        return configs.filter((c) => {
            if (statusFilter === 'active' && !c.enabled) return false;
            if (statusFilter === 'unlinked' && c.notebook_id) return false;
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            const phones = collectConfigOwnerPhones(c).join(' ');
            return (
                (c.label || '').toLowerCase().includes(q) ||
                c.tenant_id.toLowerCase().includes(q) ||
                phones.includes(q)
            );
        });
    }, [configs, statusFilter, searchQuery]);

    // Telemetry counts
    const totalPartners = configs.length;
    const activeWaCount = configs.filter((c) => c.enabled).length;
    const ragLinkedCount = configs.filter((c) => Boolean(c.notebook_id)).length;
    const advisorActiveCount = useMemo(() => {
        return configs.filter((c) => {
            if (!c.notebook_id) return false;
            const nb = notebooks.find((n) => n.id === c.notebook_id);
            return pendampingEnabledFromNotebook(nb);
        }).length;
    }, [configs, notebooks]);

    const notebookMap = useMemo(
        () => Object.fromEntries(notebooks.map((n) => [n.id, n])),
        [notebooks],
    );

    return (
        <CMSLayout
            title="Partner"
            subTitle="Partner Onboarding · RAG Routing · WhatsApp Cashier & Daily Advisor"
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: 'calc(100vh - 134px)',
                    minHeight: 540,
                    gap: 6,
                    overflow: 'hidden',
                }}
            >
                {/* TOP 36PX TACTICAL TELEMETRY & ACTION RIBBON */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '5px 10px',
                        background: darkMode ? '#0b0e13' : '#ffffff',
                        border: `1px solid ${t.border}`,
                        borderTop: `2px solid ${themeColor}`,
                        flexShrink: 0,
                        flexWrap: 'wrap',
                    }}
                >
                    {/* Left: Telemetry Counters + Search + Filter Pills */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                                className="font-mono uppercase"
                                style={{
                                    fontSize: 10,
                                    letterSpacing: '0.08em',
                                    padding: '2px 6px',
                                    background: `${themeColor}18`,
                                    border: `1px solid ${themeColor}55`,
                                    color: themeColor,
                                    fontWeight: 700,
                                }}
                            >
                                PTN // DECK
                            </span>
                            <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                PARTNERS <strong style={{ color: t.textPrimary }}>{totalPartners}</strong>
                            </span>
                            <span style={{ color: t.border }}>·</span>
                            <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                WA ON <strong style={{ color: '#22c55e' }}>{activeWaCount}</strong>
                            </span>
                            <span style={{ color: t.border }}>·</span>
                            <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                RAG <strong style={{ color: '#38bdf8' }}>{ragLinkedCount}</strong>
                            </span>
                            <span style={{ color: t.border }}>·</span>
                            <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                ADVISOR <strong style={{ color: '#a855f7' }}>{advisorActiveCount}</strong>
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowQueueStrip((v) => !v)}
                                className="font-mono uppercase"
                                style={{
                                    fontSize: 9.5,
                                    letterSpacing: '0.06em',
                                    padding: '2px 6px',
                                    cursor: 'pointer',
                                    border: `1px solid ${pendingRegs.length > 0 ? '#f59e0b' : t.border}`,
                                    background: pendingRegs.length > 0 ? 'rgba(245,158,11,0.14)' : 'transparent',
                                    color: pendingRegs.length > 0 ? '#f59e0b' : t.textMuted,
                                }}
                            >
                                QUEUE [{pendingRegs.length}] {showQueueStrip ? '▲' : '▼'}
                            </button>
                        </div>

                        {/* Search Input */}
                        <Input
                            size="small"
                            allowClear
                            prefix={<SearchOutlined style={{ fontSize: 11, color: t.textMuted }} />}
                            placeholder="Filter Partner, tenant, phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: 190,
                                borderRadius: 0,
                                fontSize: 11,
                                height: 24,
                            }}
                        />

                        {/* Filter Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {(
                                [
                                    { key: 'all', label: 'ALL' },
                                    { key: 'active', label: 'WA ON' },
                                    { key: 'unlinked', label: 'UNLINKED' },
                                ] as { key: StatusFilter; label: string }[]
                            ).map((f) => {
                                const active = statusFilter === f.key;
                                return (
                                    <button
                                        key={f.key}
                                        type="button"
                                        onClick={() => setStatusFilter(f.key)}
                                        className="font-mono uppercase"
                                        style={{
                                            fontSize: 9.5,
                                            letterSpacing: '0.06em',
                                            padding: '2px 6px',
                                            height: 22,
                                            cursor: 'pointer',
                                            border: `1px solid ${active ? themeColor : t.border}`,
                                            background: active ? `${themeColor}1f` : 'transparent',
                                            color: active ? themeColor : t.textSecondary,
                                        }}
                                    >
                                        {f.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Layout Controls + Primary Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            data-testid="partner-toggle-list"
                            onClick={() => {
                                if (showListPane && !showInspectorPane) {
                                    setShowInspectorPane(true);
                                }
                                setShowListPane((v) => !v);
                            }}
                            className="font-mono uppercase"
                            style={{
                                fontSize: 9.5,
                                letterSpacing: '0.06em',
                                padding: '2px 7px',
                                height: 22,
                                cursor: 'pointer',
                                border: `1px solid ${t.border}`,
                                background: showListPane ? 'transparent' : `${themeColor}1f`,
                                color: showListPane ? t.textSecondary : themeColor,
                            }}
                        >
                            {showListPane ? '◀ HIDE LIST' : '▶ SHOW LIST'}
                        </button>
                        <button
                            type="button"
                            data-testid="partner-reset-layout"
                            onClick={handleResetLayout}
                            className="font-mono uppercase"
                            style={{
                                fontSize: 9.5,
                                letterSpacing: '0.06em',
                                padding: '2px 7px',
                                height: 22,
                                cursor: 'pointer',
                                border: `1px solid ${t.border}`,
                                background:
                                    showListPane && showInspectorPane ? 'transparent' : `${themeColor}18`,
                                color:
                                    showListPane && showInspectorPane ? t.textSecondary : themeColor,
                            }}
                        >
                            RESET LAYOUT
                        </button>
                        <button
                            type="button"
                            data-testid="partner-focus-inspector"
                            onClick={() => {
                                setShowListPane(false);
                                setShowInspectorPane(true);
                            }}
                            className="font-mono uppercase"
                            style={{
                                fontSize: 9.5,
                                letterSpacing: '0.06em',
                                padding: '2px 7px',
                                height: 22,
                                cursor: 'pointer',
                                border: `1px solid ${!showListPane && showInspectorPane ? themeColor : t.border}`,
                                background:
                                    !showListPane && showInspectorPane ? `${themeColor}22` : 'transparent',
                                color:
                                    !showListPane && showInspectorPane ? themeColor : t.textSecondary,
                            }}
                        >
                            FOCUS INSPECTOR
                        </button>
                        <button
                            type="button"
                            data-testid="partner-toggle-inspector"
                            onClick={() => {
                                if (showInspectorPane && !showListPane) {
                                    setShowListPane(true);
                                }
                                setShowInspectorPane((v) => !v);
                            }}
                            className="font-mono uppercase"
                            style={{
                                fontSize: 9.5,
                                letterSpacing: '0.06em',
                                padding: '2px 7px',
                                height: 22,
                                cursor: 'pointer',
                                border: `1px solid ${t.border}`,
                                background: showInspectorPane ? 'transparent' : `${themeColor}1f`,
                                color: showInspectorPane ? t.textSecondary : themeColor,
                            }}
                        >
                            {showInspectorPane ? 'HIDE INSPECTOR ▶' : '◀ SHOW INSPECTOR'}
                        </button>

                        <Link href="/admin/ai-studio/ai-gateway">
                            <Button
                                size="small"
                                icon={<WhatsAppOutlined />}
                                style={{ borderRadius: 0, fontSize: 10.5, height: 24 }}
                            >
                                WA Gateway
                            </Button>
                        </Link>
                        <Button
                            size="small"
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openCreateModal}
                            style={{ borderRadius: 0, fontSize: 10.5, height: 24 }}
                        >
                            New Partner
                        </Button>
                        <Tooltip title="Reload Partners & Queue">
                            <Button
                                size="small"
                                icon={<ReloadOutlined />}
                                onClick={load}
                                loading={loading}
                                style={{ borderRadius: 0, height: 24, width: 24, padding: 0 }}
                            />
                        </Tooltip>
                    </div>
                </div>

                {/* COLLAPSIBLE INLINE PENDING REGISTRATION QUEUE STRIP */}
                {showQueueStrip && (
                    <div
                        style={{
                            padding: '6px 10px',
                            background: darkMode ? '#11161f' : '#fffbeb',
                            border: `1px solid ${pendingRegs.length > 0 ? 'rgba(245,158,11,0.45)' : t.border}`,
                            borderLeft: `3px solid #f59e0b`,
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: pendingRegs.length > 0 ? 6 : 0,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span
                                    className="font-mono uppercase"
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: '#f59e0b',
                                        letterSpacing: '0.06em',
                                    }}
                                >
                                    WHATSAPP REGISTRATION QUEUE (DAFTAR) // [{pendingRegs.length}]
                                </span>
                                <span style={{ fontSize: 11, color: t.textSecondary }}>
                                    Partners who texted <code>DAFTAR</code> to the central WhatsApp number appear here for 1-click onboarding.
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowQueueStrip(false)}
                                className="font-mono uppercase"
                                style={{
                                    fontSize: 9.5,
                                    padding: '1px 6px',
                                    border: `1px solid ${t.border}`,
                                    background: 'transparent',
                                    color: t.textSecondary,
                                    cursor: 'pointer',
                                }}
                            >
                                ▲ HIDE QUEUE
                            </button>
                        </div>

                        {pendingRegs.length === 0 ? (
                            <div className="font-mono" style={{ fontSize: 10.5, color: t.textMuted, paddingTop: 2 }}>
                                Queue is clear — no pending WhatsApp Partner registrations.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 110, overflowY: 'auto' }}>
                                {pendingRegs.map((reg) => (
                                    <div
                                        key={reg.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                            padding: '4px 8px',
                                            background: darkMode ? '#0b0e13' : '#ffffff',
                                            border: `1px solid ${t.border}`,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                            <span
                                                className="font-mono"
                                                style={{
                                                    fontSize: 10.5,
                                                    padding: '1px 5px',
                                                    background: 'rgba(34,197,94,0.14)',
                                                    border: '1px solid rgba(34,197,94,0.4)',
                                                    color: '#22c55e',
                                                }}
                                            >
                                                {reg.phone}
                                            </span>
                                            <span style={{ fontSize: 11.5, fontWeight: 600, color: t.textPrimary }}>
                                                {reg.store_name || 'Unnamed Partner Store'}
                                            </span>
                                            <span className="font-mono" style={{ fontSize: 10, color: t.textMuted }}>
                                                {reg.owner_name ? `Owner: ${reg.owner_name}` : reg.wizard_step || '—'}
                                            </span>
                                            <span className="font-mono" style={{ fontSize: 9.5, color: t.textMuted }}>
                                                {reg.created_at ? new Date(reg.created_at).toLocaleString('en-US') : ''}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Button
                                                size="small"
                                                type="primary"
                                                icon={<CheckOutlined />}
                                                loading={actingRegId === reg.id}
                                                onClick={() => handleApproveReg(reg)}
                                                style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                size="small"
                                                danger
                                                icon={<CloseOutlined />}
                                                loading={actingRegId === reg.id}
                                                onClick={() => handleRejectReg(reg)}
                                                style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* VIEWPORT-LOCKED 2-PANE SPLIT WORKSPACE */}
                <div
                    style={{
                        flex: 1,
                        minHeight: 0,
                        display: 'grid',
                        gridTemplateColumns:
                            showListPane && showInspectorPane
                                ? 'minmax(340px, 44%) 1fr'
                                : '1fr',
                        gap: 6,
                        overflow: 'hidden',
                    }}
                >
                    {/* LEFT PANE: PARTNER DIRECTORY & LIVE STATUS LIST */}
                    {showListPane && (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: 0,
                                background: darkMode ? '#0b0e13' : '#ffffff',
                                border: `1px solid ${t.border}`,
                                borderTop: `2px solid ${themeColor}`,
                                overflow: 'hidden',
                            }}
                        >
                            {/* Directory Header */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '6px 10px',
                                    borderBottom: `1px solid ${t.border}`,
                                    background: darkMode ? '#0f131a' : '#f8fafc',
                                    flexShrink: 0,
                                }}
                            >
                                <span
                                    className="font-mono uppercase"
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        letterSpacing: '0.07em',
                                        color: t.textSecondary,
                                    }}
                                >
                                    PARTNER DIRECTORY // [{filteredConfigs.length}]
                                </span>
                                <span className="font-mono" style={{ fontSize: 9.5, color: t.textMuted }}>
                                    CLICK ROW TO INSPECT · 1 HERMES WA GATEWAY
                                </span>
                            </div>

                            {/* Partner Rows Scroll Container */}
                            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                {loading && configs.length === 0 ? (
                                    <div
                                        className="font-mono"
                                        style={{ padding: 20, fontSize: 11, color: t.textMuted, textAlign: 'center' }}
                                    >
                                        LOADING PARTNER DIRECTORY...
                                    </div>
                                ) : filteredConfigs.length === 0 ? (
                                    <div
                                        style={{
                                            padding: 24,
                                            textAlign: 'center',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        <span className="font-mono" style={{ fontSize: 11, color: t.textMuted }}>
                                            No Partner configurations match the current filter.
                                        </span>
                                        <Button
                                            size="small"
                                            type="primary"
                                            icon={<PlusOutlined />}
                                            onClick={openCreateModal}
                                            style={{ borderRadius: 0, fontSize: 10.5 }}
                                        >
                                            Onboard First Partner
                                        </Button>
                                    </div>
                                ) : (
                                    filteredConfigs.map((row) => {
                                        const isSelected = row.tenant_id === selectedTenantId;
                                        const ownerPhone = collectConfigOwnerPhones(row)[0];
                                        const linkedNb = row.notebook_id ? notebookMap[row.notebook_id] : undefined;
                                        const advisorOn = pendampingEnabledFromNotebook(linkedNb);

                                        return (
                                            <div
                                                key={row.tenant_id}
                                                onClick={() => {
                                                    setSelectedTenantId(row.tenant_id);
                                                    if (!showInspectorPane) setShowInspectorPane(true);
                                                }}
                                                style={{
                                                    padding: '8px 10px',
                                                    borderBottom: `1px solid ${t.border}`,
                                                    borderLeft: isSelected
                                                        ? `3px solid ${themeColor}`
                                                        : '3px solid transparent',
                                                    background: isSelected
                                                        ? darkMode
                                                            ? 'rgba(251,146,60,0.08)'
                                                            : 'rgba(251,146,60,0.06)'
                                                        : 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.12s ease',
                                                }}
                                            >
                                                {/* Row Top: Partner Name + Status Pills */}
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 6,
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                                        <span
                                                            style={{
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                color: t.textPrimary,
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                            }}
                                                        >
                                                            {row.label || row.tenant_id}
                                                        </span>
                                                        <span
                                                            className="font-mono"
                                                            style={{
                                                                fontSize: 10,
                                                                color: t.textMuted,
                                                            }}
                                                        >
                                                            [{row.tenant_id}]
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                                        <span
                                                            className="font-mono uppercase"
                                                            style={{
                                                                fontSize: 9,
                                                                padding: '1px 5px',
                                                                border: `1px solid ${
                                                                    row.enabled
                                                                        ? 'rgba(34,197,94,0.45)'
                                                                        : 'rgba(148,163,184,0.3)'
                                                                }`,
                                                                background: row.enabled
                                                                    ? 'rgba(34,197,94,0.12)'
                                                                    : 'transparent',
                                                                color: row.enabled ? '#22c55e' : t.textMuted,
                                                            }}
                                                        >
                                                            {row.enabled ? 'WA ON' : 'WA OFF'}
                                                        </span>
                                                        {row.notebook_id && advisorOn && (
                                                            <span
                                                                className="font-mono uppercase"
                                                                style={{
                                                                    fontSize: 9,
                                                                    padding: '1px 5px',
                                                                    border: '1px solid rgba(168,85,247,0.4)',
                                                                    background: 'rgba(168,85,247,0.12)',
                                                                    color: '#c084fc',
                                                                }}
                                                            >
                                                                ADVISOR
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Row Bottom: Phone + Linked Notebook + Quick Action Buttons */}
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: 6,
                                                        flexWrap: 'wrap',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        <span
                                                            className="font-mono"
                                                            style={{
                                                                fontSize: 10,
                                                                padding: '0px 5px',
                                                                background: ownerPhone
                                                                    ? 'rgba(34,197,94,0.1)'
                                                                    : 'rgba(239,68,68,0.1)',
                                                                border: `1px solid ${
                                                                    ownerPhone
                                                                        ? 'rgba(34,197,94,0.35)'
                                                                        : 'rgba(239,68,68,0.35)'
                                                                }`,
                                                                color: ownerPhone ? '#4ade80' : '#f87171',
                                                            }}
                                                        >
                                                            {ownerPhone ? `WA: ${ownerPhone}` : 'NO OWNER PHONE'}
                                                        </span>
                                                        <span
                                                            className="font-mono"
                                                            style={{
                                                                fontSize: 10,
                                                                color: linkedNb ? '#38bdf8' : t.textMuted,
                                                            }}
                                                        >
                                                            <BookOutlined style={{ marginRight: 3 }} />
                                                            {linkedNb ? linkedNb.name : 'Unlinked Notebook'}
                                                        </span>
                                                    </div>

                                                    {/* Inline Row Quick Actions */}
                                                    <div
                                                        style={{ display: 'flex', alignItems: 'center', gap: 3 }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Tooltip title="Configure Profile & Commands">
                                                            <Button
                                                                size="small"
                                                                icon={<SettingOutlined />}
                                                                onClick={() => {
                                                                    setSelectedTenantId(row.tenant_id);
                                                                    setInspectorTab('profile');
                                                                    setShowInspectorPane(true);
                                                                }}
                                                                style={{
                                                                    borderRadius: 0,
                                                                    fontSize: 10,
                                                                    height: 20,
                                                                    padding: '0 6px',
                                                                }}
                                                            >
                                                                Config
                                                            </Button>
                                                        </Tooltip>
                                                        <Tooltip
                                                            title={
                                                                !row.enabled || !row.notebook_id
                                                                    ? 'Enable WA and link a RAG Notebook first'
                                                                    : 'Open Live WhatsApp Simulator'
                                                            }
                                                        >
                                                            <Button
                                                                size="small"
                                                                icon={<MessageOutlined />}
                                                                disabled={!row.enabled || !row.notebook_id}
                                                                onClick={() => {
                                                                    setSelectedTenantId(row.tenant_id);
                                                                    setSimInitialMessage(undefined);
                                                                    setInspectorTab('simulator');
                                                                    setShowInspectorPane(true);
                                                                }}
                                                                style={{
                                                                    borderRadius: 0,
                                                                    fontSize: 10,
                                                                    height: 20,
                                                                    padding: '0 6px',
                                                                }}
                                                            >
                                                                Simulate
                                                            </Button>
                                                        </Tooltip>
                                                        <Tooltip title="Initialize Partner RAG & Cashier Notebook">
                                                            <Button
                                                                size="small"
                                                                icon={<ThunderboltOutlined />}
                                                                loading={settingUp && selectedTenantId === row.tenant_id}
                                                                onClick={() => handleInitializePartner(row)}
                                                                style={{
                                                                    borderRadius: 0,
                                                                    fontSize: 10,
                                                                    height: 20,
                                                                    padding: '0 6px',
                                                                }}
                                                            >
                                                                Init
                                                            </Button>
                                                        </Tooltip>
                                                        <Link
                                                            href={`/admin/inventory/items?tenantId=${encodeURIComponent(
                                                                row.tenant_id,
                                                            )}`}
                                                        >
                                                            <Tooltip title="Open Partner Product Catalog">
                                                                <Button
                                                                    size="small"
                                                                    icon={<UnorderedListOutlined />}
                                                                    style={{
                                                                        borderRadius: 0,
                                                                        fontSize: 10,
                                                                        height: 20,
                                                                        padding: '0 6px',
                                                                    }}
                                                                >
                                                                    Catalog
                                                                </Button>
                                                            </Tooltip>
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* RIGHT PANE: DOCKED PARTNER INSPECTOR & LIVE WA SANDBOX */}
                    {showInspectorPane && (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: 0,
                                background: darkMode ? '#0b0e13' : '#ffffff',
                                border: `1px solid ${t.border}`,
                                borderTop: `2px solid ${themeColor}`,
                                overflow: 'hidden',
                            }}
                        >
                            {!selectedPartner ? (
                                <div
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 24,
                                        gap: 8,
                                    }}
                                >
                                    <span className="font-mono uppercase" style={{ fontSize: 11, color: t.textMuted }}>
                                        SELECT A PARTNER FROM THE DIRECTORY OR ONBOARD A NEW PARTNER
                                    </span>
                                    <Button
                                        size="small"
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={openCreateModal}
                                        style={{ borderRadius: 0, fontSize: 10.5 }}
                                    >
                                        New Partner
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {/* Inspector Header Bar + Tactical Sub-Tabs */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                            padding: '5px 10px',
                                            borderBottom: `1px solid ${t.border}`,
                                            background: darkMode ? '#0f131a' : '#f8fafc',
                                            flexShrink: 0,
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span
                                                className="font-mono uppercase"
                                                style={{
                                                    fontSize: 10.5,
                                                    fontWeight: 700,
                                                    color: themeColor,
                                                }}
                                            >
                                                {selectedPartner.label || selectedPartner.tenant_id}
                                            </span>
                                            <span className="font-mono" style={{ fontSize: 10, color: t.textMuted }}>
                                                //{selectedPartner.tenant_id}
                                            </span>
                                            {(commandsDirty || pendampingDirty) && (
                                                <span
                                                    className="font-mono uppercase"
                                                    style={{
                                                        fontSize: 9,
                                                        padding: '1px 5px',
                                                        background: 'rgba(245,158,11,0.16)',
                                                        border: '1px solid rgba(245,158,11,0.45)',
                                                        color: '#f59e0b',
                                                    }}
                                                >
                                                    UNSAVED
                                                </span>
                                            )}
                                        </div>

                                        {/* Sub-Navigation Tabs */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                            {(
                                                [
                                                    { key: 'profile', label: '[01] PROFILE & RAG' },
                                                    { key: 'commands', label: '[02] WA COMMAND MATRIX' },
                                                    { key: 'simulator', label: '[03] LIVE WA SIMULATOR' },
                                                ] as { key: InspectorTab; label: string }[]
                                            ).map((tab) => {
                                                const active = inspectorTab === tab.key;
                                                return (
                                                    <button
                                                        key={tab.key}
                                                        type="button"
                                                        onClick={() => setInspectorTab(tab.key)}
                                                        className="font-mono uppercase"
                                                        style={{
                                                            fontSize: 9.5,
                                                            letterSpacing: '0.06em',
                                                            padding: '3px 8px',
                                                            cursor: 'pointer',
                                                            border: `1px solid ${active ? themeColor : t.border}`,
                                                            background: active ? `${themeColor}20` : 'transparent',
                                                            color: active ? themeColor : t.textSecondary,
                                                            fontWeight: active ? 700 : 500,
                                                        }}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                );
                                            })}

                                            {inspectorTab !== 'simulator' && (
                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    loading={saving}
                                                    onClick={() => handleSaveInspector()}
                                                    style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                                >
                                                    Save Changes
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Inspector Body */}
                                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: inspectorTab === 'simulator' ? 0 : 10 }}>
                                        {/* Keep inspectorForm mounted so fields persist across tabs */}
                                        <Form
                                            form={inspectorForm}
                                            layout="vertical"
                                            style={{ display: inspectorTab === 'profile' ? 'block' : 'none' }}
                                        >
                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                                    gap: 8,
                                                }}
                                            >
                                                <Form.Item
                                                    name="label"
                                                    label="Partner Store Name"
                                                    rules={[{ required: true, message: 'Enter Partner store name' }]}
                                                    style={{ marginBottom: 6 }}
                                                >
                                                    <Input
                                                        size="small"
                                                        placeholder="e.g. Warung Berkah"
                                                        style={{ borderRadius: 0 }}
                                                    />
                                                </Form.Item>

                                                <Form.Item
                                                    name="tenantId"
                                                    label="Partner Tenant ID"
                                                    style={{ marginBottom: 6 }}
                                                >
                                                    <Input
                                                        size="small"
                                                        disabled
                                                        className="font-mono"
                                                        style={{ borderRadius: 0 }}
                                                    />
                                                </Form.Item>

                                                <Form.Item
                                                    name="ownerPhone"
                                                    label="Store Owner WhatsApp Phone"
                                                    rules={[
                                                        {
                                                            required: true,
                                                            message: 'Owner WhatsApp phone is required',
                                                        },
                                                        {
                                                            validator: async (_, val) => {
                                                                validateSingleStoreWaPhone(val);
                                                            },
                                                        },
                                                    ]}
                                                    extra="Normalized to 628... — messages from this number run in Owner Cashier mode."
                                                    style={{ marginBottom: 6 }}
                                                >
                                                    <Input
                                                        size="small"
                                                        className="font-mono"
                                                        placeholder="08123456789 or 628123456789"
                                                        style={{ borderRadius: 0 }}
                                                    />
                                                </Form.Item>

                                                <Form.Item
                                                    name="notebookId"
                                                    label="Linked RAG Notebook"
                                                    rules={[{ required: true, message: 'Select a RAG Notebook' }]}
                                                    extra="Stores Partner knowledge chunks, command matrix, and advisor settings."
                                                    style={{ marginBottom: 6 }}
                                                >
                                                    <Select
                                                        size="small"
                                                        showSearch
                                                        optionFilterProp="label"
                                                        placeholder="Select RAG Notebook"
                                                        onChange={(val) => loadCommandsForNotebook(val)}
                                                        options={notebooks.map((n) => ({
                                                            value: n.id,
                                                            label: `${n.name} (${n.id.slice(0, 8)}…)`,
                                                        }))}
                                                    />
                                                </Form.Item>
                                            </div>

                                            {/* Tactical Toggle Strip */}
                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                                                    gap: 8,
                                                    marginTop: 6,
                                                    padding: 8,
                                                    border: `1px solid ${t.border}`,
                                                    background: darkMode ? '#0f131a' : '#f8fafc',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                                    <div>
                                                        <div className="font-mono uppercase" style={{ fontSize: 10, fontWeight: 700, color: t.textPrimary }}>
                                                            WHATSAPP ROUTING ACTIVE
                                                        </div>
                                                        <div style={{ fontSize: 10.5, color: t.textSecondary }}>
                                                            Route incoming WhatsApp messages for this Partner to AI RAG & Cashier.
                                                        </div>
                                                    </div>
                                                    <Form.Item name="enabled" valuePropName="checked" noStyle>
                                                        <Switch size="small" />
                                                    </Form.Item>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                                    <div>
                                                        <div className="font-mono uppercase" style={{ fontSize: 10, fontWeight: 700, color: t.textPrimary }}>
                                                            DAILY AI BUSINESS ADVISOR
                                                        </div>
                                                        <div style={{ fontSize: 10.5, color: t.textSecondary }}>
                                                            Append proactive restock & margin tips after sales/stock commands.
                                                        </div>
                                                    </div>
                                                    <Switch
                                                        size="small"
                                                        checked={pendampingEnabled}
                                                        onChange={(v) => {
                                                            setPendampingEnabled(v);
                                                            setPendampingDirty(true);
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Quick Partner Shortcut Bar */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 6,
                                                    marginTop: 10,
                                                    paddingTop: 8,
                                                    borderTop: `1px solid ${t.border}`,
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <Button
                                                        size="small"
                                                        icon={<ThunderboltOutlined />}
                                                        loading={settingUp}
                                                        onClick={() => handleInitializePartner(selectedPartner)}
                                                        style={{ borderRadius: 0, fontSize: 10.5 }}
                                                    >
                                                        Re-Initialize Partner RAG
                                                    </Button>
                                                    <Link
                                                        href={`/admin/inventory/items?tenantId=${encodeURIComponent(
                                                            selectedPartner.tenant_id,
                                                        )}`}
                                                    >
                                                        <Button
                                                            size="small"
                                                            icon={<UnorderedListOutlined />}
                                                            style={{ borderRadius: 0, fontSize: 10.5 }}
                                                        >
                                                            Manage Product Catalog
                                                        </Button>
                                                    </Link>
                                                    <Link
                                                        href={`/admin/ai-studio/ai-gateway?tenant=${encodeURIComponent(
                                                            selectedPartner.tenant_id,
                                                        )}`}
                                                    >
                                                        <Button
                                                            size="small"
                                                            icon={<WhatsAppOutlined />}
                                                            style={{ borderRadius: 0, fontSize: 10.5 }}
                                                        >
                                                            WA Session Gateway
                                                        </Button>
                                                    </Link>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Button
                                                        size="small"
                                                        icon={<MessageOutlined />}
                                                        disabled={!selectedPartner.enabled || !selectedPartner.notebook_id}
                                                        onClick={() => setInspectorTab('simulator')}
                                                        style={{ borderRadius: 0, fontSize: 10.5 }}
                                                    >
                                                        Open Live Simulator
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        type="primary"
                                                        loading={saving}
                                                        onClick={() => handleSaveInspector()}
                                                        style={{ borderRadius: 0, fontSize: 10.5 }}
                                                    >
                                                        Save Partner Profile
                                                    </Button>
                                                </div>
                                            </div>
                                        </Form>

                                        {/* TAB 02: WA COMMAND MATRIX */}
                                        {inspectorTab === 'commands' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {/* Live Intent Tester Bar */}
                                                <div
                                                    style={{
                                                        padding: 8,
                                                        border: `1px solid ${t.border}`,
                                                        background: darkMode ? '#0f131a' : '#f8fafc',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            marginBottom: 6,
                                                        }}
                                                    >
                                                        <span
                                                            className="font-mono uppercase"
                                                            style={{ fontSize: 10, fontWeight: 700, color: themeColor }}
                                                        >
                                                            INTENT CLASSIFIER TESTER //
                                                        </span>
                                                        {previewLabel && (
                                                            <span
                                                                className="font-mono"
                                                                style={{
                                                                    fontSize: 10,
                                                                    padding: '1px 6px',
                                                                    border: `1px solid ${themeColor}`,
                                                                    background: `${themeColor}1a`,
                                                                    color: themeColor,
                                                                }}
                                                            >
                                                                MATCH: {previewLabel}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                        <Input
                                                            size="small"
                                                            value={previewSample}
                                                            onChange={(e) => setPreviewSample(e.target.value)}
                                                            onPressEnter={runPreview}
                                                            placeholder="Type sample WhatsApp message (e.g. '1', 'jual kopi 2', 'cek stok')..."
                                                            style={{ flex: 1, minWidth: 200, borderRadius: 0 }}
                                                        />
                                                        <Button
                                                            size="small"
                                                            loading={previewing}
                                                            onClick={runPreview}
                                                            style={{ borderRadius: 0, fontSize: 10.5 }}
                                                        >
                                                            Test Intent
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            type="primary"
                                                            icon={<SendOutlined />}
                                                            loading={saving}
                                                            onClick={handleTryInSim}
                                                            style={{ borderRadius: 0, fontSize: 10.5 }}
                                                        >
                                                            Save & Run in Simulator
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Numbered Menu Shortcuts */}
                                                <div
                                                    style={{
                                                        padding: 8,
                                                        border: `1px solid ${t.border}`,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            marginBottom: 6,
                                                        }}
                                                    >
                                                        <span
                                                            className="font-mono uppercase"
                                                            style={{ fontSize: 10, fontWeight: 700, color: t.textPrimary }}
                                                        >
                                                            NUMBERED MENU SHORTCUTS ([{commands.menu.length}])
                                                        </span>
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <Button
                                                                size="small"
                                                                onClick={() => {
                                                                    if (defaults) {
                                                                        setCommands(structuredClone(defaults));
                                                                        setCommandsDirty(true);
                                                                    }
                                                                }}
                                                                style={{ borderRadius: 0, fontSize: 10, height: 20 }}
                                                            >
                                                                Reset Defaults
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                type="dashed"
                                                                icon={<PlusOutlined />}
                                                                onClick={() => {
                                                                    setCommandsDirty(true);
                                                                    setCommands((prev) => ({
                                                                        ...prev,
                                                                        menu: [
                                                                            ...prev.menu,
                                                                            {
                                                                                digit: String(prev.menu.length + 1),
                                                                                label: '',
                                                                                intent: 'list_products',
                                                                            },
                                                                        ],
                                                                    }));
                                                                }}
                                                                style={{ borderRadius: 0, fontSize: 10, height: 20 }}
                                                            >
                                                                Add Shortcut
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        {commands.menu.map((row, idx) => (
                                                            <div
                                                                key={idx}
                                                                style={{
                                                                    display: 'grid',
                                                                    gridTemplateColumns: '64px 1fr 180px 26px',
                                                                    gap: 4,
                                                                    alignItems: 'center',
                                                                }}
                                                            >
                                                                <Input
                                                                    size="small"
                                                                    value={row.digit}
                                                                    placeholder="No."
                                                                    className="font-mono"
                                                                    onChange={(e) =>
                                                                        updateMenuRow(idx, { digit: e.target.value })
                                                                    }
                                                                    style={{ borderRadius: 0 }}
                                                                />
                                                                <Input
                                                                    size="small"
                                                                    value={row.label}
                                                                    placeholder="Menu display label"
                                                                    onChange={(e) =>
                                                                        updateMenuRow(idx, { label: e.target.value })
                                                                    }
                                                                    style={{ borderRadius: 0 }}
                                                                />
                                                                <Select
                                                                    size="small"
                                                                    value={row.intent}
                                                                    options={INTENT_OPTIONS}
                                                                    onChange={(intent) => updateMenuRow(idx, { intent })}
                                                                />
                                                                <Button
                                                                    size="small"
                                                                    danger
                                                                    icon={<DeleteOutlined />}
                                                                    onClick={() => {
                                                                        setCommandsDirty(true);
                                                                        setCommands((prev) => ({
                                                                            ...prev,
                                                                            menu: prev.menu.filter((_, i) => i !== idx),
                                                                        }));
                                                                    }}
                                                                    style={{
                                                                        borderRadius: 0,
                                                                        width: 24,
                                                                        height: 22,
                                                                        padding: 0,
                                                                    }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Keyword Triggers Grid */}
                                                <div
                                                    style={{
                                                        padding: 8,
                                                        border: `1px solid ${t.border}`,
                                                    }}
                                                >
                                                    <div
                                                        className="font-mono uppercase"
                                                        style={{
                                                            fontSize: 10,
                                                            fontWeight: 700,
                                                            color: t.textPrimary,
                                                            marginBottom: 6,
                                                        }}
                                                    >
                                                        INTENT KEYWORD TRIGGERS & CONFIRMATION TOKENS
                                                    </div>
                                                    <div
                                                        style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                                                            gap: 6,
                                                        }}
                                                    >
                                                        {KEYWORD_INTENTS.map((intent) => (
                                                            <div key={intent}>
                                                                <div
                                                                    className="font-mono uppercase"
                                                                    style={{
                                                                        fontSize: 9.5,
                                                                        color: t.textSecondary,
                                                                        marginBottom: 2,
                                                                    }}
                                                                >
                                                                    {INTENT_LABEL[intent]}
                                                                </div>
                                                                <Select
                                                                    mode="tags"
                                                                    size="small"
                                                                    style={{ width: '100%' }}
                                                                    placeholder="Type keyword + Enter"
                                                                    value={commands.keywords[intent] || []}
                                                                    onChange={(vals) => {
                                                                        setCommandsDirty(true);
                                                                        setCommands((prev) => ({
                                                                            ...prev,
                                                                            keywords: {
                                                                                ...prev.keywords,
                                                                                [intent]: vals,
                                                                            },
                                                                        }));
                                                                    }}
                                                                    tokenSeparators={[',']}
                                                                />
                                                            </div>
                                                        ))}
                                                        <div>
                                                            <div
                                                                className="font-mono uppercase"
                                                                style={{
                                                                    fontSize: 9.5,
                                                                    color: '#22c55e',
                                                                    marginBottom: 2,
                                                                }}
                                                            >
                                                                Confirm Action Words (YES)
                                                            </div>
                                                            <Select
                                                                mode="tags"
                                                                size="small"
                                                                style={{ width: '100%' }}
                                                                value={commands.confirm}
                                                                onChange={(vals) => {
                                                                    setCommandsDirty(true);
                                                                    setCommands((prev) => ({
                                                                        ...prev,
                                                                        confirm: vals,
                                                                    }));
                                                                }}
                                                                tokenSeparators={[',']}
                                                            />
                                                        </div>
                                                        <div>
                                                            <div
                                                                className="font-mono uppercase"
                                                                style={{
                                                                    fontSize: 9.5,
                                                                    color: '#ef4444',
                                                                    marginBottom: 2,
                                                                }}
                                                            >
                                                                Cancel Action Words (NO)
                                                            </div>
                                                            <Select
                                                                mode="tags"
                                                                size="small"
                                                                style={{ width: '100%' }}
                                                                value={commands.cancel}
                                                                onChange={(vals) => {
                                                                    setCommandsDirty(true);
                                                                    setCommands((prev) => ({
                                                                        ...prev,
                                                                        cancel: vals,
                                                                    }));
                                                                }}
                                                                tokenSeparators={[',']}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB 03: EMBEDDED LIVE WHATSAPP SIMULATOR */}
                                        {inspectorTab === 'simulator' && (
                                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                                {!selectedPartner.enabled || !selectedPartner.notebook_id ? (
                                                    <div
                                                        style={{
                                                            padding: 24,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: 8,
                                                        }}
                                                    >
                                                        <span className="font-mono" style={{ fontSize: 11, color: t.textMuted }}>
                                                            WhatsApp routing and a linked RAG Notebook are required to run the live simulator.
                                                        </span>
                                                        <Button
                                                            size="small"
                                                            type="primary"
                                                            onClick={() => setInspectorTab('profile')}
                                                            style={{ borderRadius: 0, fontSize: 10.5 }}
                                                        >
                                                            Configure Profile & Notebook
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                padding: '4px 10px',
                                                                borderBottom: `1px solid ${t.border}`,
                                                                background: darkMode ? '#11161f' : '#f1f5f9',
                                                            }}
                                                        >
                                                            <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                                                EMBEDDED SANDBOX · TOP-DOCKED INPUT · REAL RAG + CASHIER PIPELINE
                                                            </span>
                                                            <Button
                                                                size="small"
                                                                icon={<ExpandAltOutlined />}
                                                                onClick={() => setPopoutSimTarget(selectedPartner)}
                                                                style={{ borderRadius: 0, fontSize: 9.5, height: 20 }}
                                                            >
                                                                Pop Out Drawer
                                                            </Button>
                                                        </div>
                                                        <div style={{ flex: 1, minHeight: 0 }}>
                                                            <WhatsAppSimChatPanel
                                                                tenantId={selectedPartner.tenant_id}
                                                                umkmLabel={selectedPartner.label || selectedPartner.tenant_id}
                                                                ownerPhones={collectConfigOwnerPhones(selectedPartner)}
                                                                initialMessage={simInitialMessage}
                                                                onInitialMessageConsumed={() => setSimInitialMessage(undefined)}
                                                                embedded
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* QUICK ONBOARD NEW PARTNER MODAL */}
            <Modal
                title="ONBOARD NEW PARTNER // WHATSAPP & RAG"
                open={createModalOpen}
                onCancel={() => setCreateModalOpen(false)}
                onOk={handleCreatePartner}
                confirmLoading={creating}
                okText="Create Partner"
                width={480}
                destroyOnHidden
            >
                <Form form={createForm} layout="vertical" style={{ marginTop: 8 }}>
                    <Form.Item
                        name="label"
                        label="Partner Store Name"
                        rules={[{ required: true, message: 'Enter Partner store name' }]}
                        style={{ marginBottom: 8 }}
                    >
                        <Input
                            size="small"
                            placeholder="e.g. Toko Sembako Jaya"
                            onChange={(e) => handleCreateLabelChange(e.target.value)}
                            style={{ borderRadius: 0 }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="tenantId"
                        label="Partner Tenant Slug"
                        rules={[
                            { required: true, message: 'Tenant ID is required' },
                            {
                                pattern: /^[a-z0-9][a-z0-9-_]{1,62}$/i,
                                message: 'Use letters, numbers, hyphens (-), or underscores (_)',
                            },
                        ]}
                        style={{ marginBottom: 8 }}
                    >
                        <Input
                            size="small"
                            className="font-mono"
                            placeholder="e.g. umkm-toko-jaya"
                            style={{ borderRadius: 0 }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="ownerPhone"
                        label="Store Owner WhatsApp Phone"
                        rules={[
                            { required: true, message: 'Enter Owner WhatsApp phone' },
                            {
                                validator: async (_, val) => {
                                    validateSingleStoreWaPhone(val);
                                },
                            },
                        ]}
                        extra="Normalized to 628... — messages from this phone trigger Owner Cashier & Stock mode."
                        style={{ marginBottom: 8 }}
                    >
                        <Input
                            size="small"
                            className="font-mono"
                            placeholder="08123456789"
                            style={{ borderRadius: 0 }}
                        />
                    </Form.Item>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            border: `1px solid ${t.border}`,
                            marginBottom: 8,
                        }}
                    >
                        <span className="font-mono uppercase" style={{ fontSize: 10 }}>
                            Auto-Create Dedicated RAG Notebook
                        </span>
                        <Form.Item name="createNewNotebook" valuePropName="checked" noStyle>
                            <Switch size="small" />
                        </Form.Item>
                    </div>

                    <Form.Item
                        noStyle
                        shouldUpdate={(prev, cur) => prev.createNewNotebook !== cur.createNewNotebook}
                    >
                        {({ getFieldValue }) =>
                            !getFieldValue('createNewNotebook') ? (
                                <Form.Item
                                    name="notebookId"
                                    label="Link Existing Notebook"
                                    rules={[{ required: true, message: 'Select a notebook' }]}
                                    style={{ marginBottom: 8 }}
                                >
                                    <Select
                                        size="small"
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder="Select existing notebook"
                                        options={notebooks.map((n) => ({
                                            value: n.id,
                                            label: `${n.name} (${n.id.slice(0, 8)}…)`,
                                        }))}
                                    />
                                </Form.Item>
                            ) : null
                        }
                    </Form.Item>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            border: `1px solid ${t.border}`,
                        }}
                    >
                        <span className="font-mono uppercase" style={{ fontSize: 10 }}>
                            Enable WhatsApp Routing Immediately
                        </span>
                        <Form.Item name="enabled" valuePropName="checked" noStyle>
                            <Switch size="small" />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            {/* OPTIONAL FLOATING SIMULATOR DRAWER (POP-OUT) */}
            <WhatsAppSimChatDrawer
                open={Boolean(popoutSimTarget)}
                onClose={() => setPopoutSimTarget(null)}
                tenantId={popoutSimTarget?.tenant_id ?? ''}
                umkmLabel={popoutSimTarget ? popoutSimTarget.label || popoutSimTarget.tenant_id : ''}
                ownerPhones={popoutSimTarget ? collectConfigOwnerPhones(popoutSimTarget) : []}
            />
        </CMSLayout>
    );
}
