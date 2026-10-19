'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import CMSLayout from '@/components/layout/CMSLayout';
import { useAdminLayout } from '@/components/layout/CMSLayoutContext';
import { getVOTheme } from '@/components/layout/voTheme';
import RbacGuard from '@/components/common/RbacGuard';
import {
    Alert,
    Button,
    Drawer,
    Form,
    Input,
    InputNumber,
    Select,
    Switch,
    Tooltip,
    message,
} from 'antd';
import {
    CheckOutlined,
    CloseOutlined,
    CopyOutlined,
    ExpandAltOutlined,
    ExportOutlined,
    AppstoreOutlined,
    BarsOutlined,
    PictureOutlined,
    ReloadOutlined,
    SaveOutlined,
    SearchOutlined,
    ShopOutlined,
    StopOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import {
    studioService,
    StudioMarketingContent,
    StudioMarketingContentStatus,
    StudioMarketingStore,
} from '@/lib/studioService';

const STATUS_OPTIONS: { value: StudioMarketingContentStatus | 'all'; label: string }[] = [
    { value: 'pending', label: 'PENDING' },
    { value: 'approved', label: 'APPROVED' },
    { value: 'rejected', label: 'REJECTED' },
    { value: 'unpublished', label: 'UNPUBLISHED' },
    { value: 'all', label: 'ALL' },
];

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
    pending: {
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.14)',
        border: 'rgba(245, 158, 11, 0.45)',
        label: 'PENDING REVIEW',
    },
    approved: {
        color: '#22c55e',
        bg: 'rgba(34, 197, 94, 0.14)',
        border: 'rgba(34, 197, 94, 0.45)',
        label: 'LIVE IN SHOWCASE',
    },
    rejected: {
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.14)',
        border: 'rgba(239, 68, 68, 0.45)',
        label: 'REJECTED',
    },
    unpublished: {
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.35)',
        label: 'UNPUBLISHED',
    },
    draft: {
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.14)',
        border: 'rgba(56, 189, 248, 0.45)',
        label: 'DRAFT',
    },
};

const SHOWCASE_GALLERY_URL =
    process.env.NEXT_PUBLIC_GALLERY_URL || 'http://localhost:3004';

function formatPriceIDR(price?: number | null): string {
    if (typeof price !== 'number' || Number.isNaN(price)) return '—';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(price);
}

type StudioTab = 'studio' | 'telemetry' | 'consent';
type QueueViewMode = 'list' | 'grid';

export default function ShowcasePage() {
    const { darkMode, themeColor = '#fb923c' } = useAdminLayout();
    const t = getVOTheme(darkMode);

    const [rows, setRows] = useState<StudioMarketingContent[]>([]);
    const [stores, setStores] = useState<StudioMarketingStore[]>([]);
    const [status, setStatus] = useState<StudioMarketingContentStatus | 'all'>('pending');
    const [tenantFilter, setTenantFilter] = useState<string | undefined>();
    const [searchQuery, setSearchQuery] = useState('');
    const [storeSearchQuery, setStoreSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    // Split Workspace Layout & View Controls
    const [showQueuePane, setShowQueuePane] = useState(true);
    const [showStudioPane, setShowStudioPane] = useState(true);
    const [queueViewMode, setQueueViewMode] = useState<QueueViewMode>('list');
    const [studioTab, setStudioTab] = useState<StudioTab>('studio');

    // Selected Item & Batch Generator State
    const [selected, setSelected] = useState<StudioMarketingContent | null>(null);
    const [popoutDrawerOpen, setPopoutDrawerOpen] = useState(false);
    const [genStore, setGenStore] = useState<string | undefined>();
    const [genLimit, setGenLimit] = useState<number>(5);
    const [form] = Form.useForm();

    const handleResetLayout = useCallback(() => {
        setShowQueuePane(true);
        setShowStudioPane(true);
        setQueueViewMode('list');
        setStudioTab('studio');
        setSearchQuery('');
        setTenantFilter(undefined);
    }, []);

    useEffect(() => {
        const onGlobalReset = () => handleResetLayout();
        window.addEventListener('cms-reset-layout', onGlobalReset);
        return () => window.removeEventListener('cms-reset-layout', onGlobalReset);
    }, [handleResetLayout]);

    const storeOptions = useMemo(() => {
        const set = new Set(rows.map((r) => r.tenant_id).filter(Boolean));
        for (const s of stores) {
            if (s.tenant_id) set.add(s.tenant_id);
        }
        return [...set].sort();
    }, [rows, stores]);

    const selectAndLoadItem = useCallback(
        async (rowOrId: StudioMarketingContent | string) => {
            const id = typeof rowOrId === 'string' ? rowOrId : rowOrId.id;
            if (typeof rowOrId !== 'string') {
                setSelected(rowOrId);
                form.setFieldsValue({
                    headline: rowOrId.headline || '',
                    caption: rowOrId.caption || '',
                });
            }
            setDetailLoading(true);
            try {
                const item = await studioService.getMarketingContent(id);
                setSelected(item);
                form.setFieldsValue({
                    headline: item.headline || '',
                    caption: item.caption || '',
                });
            } catch (e) {
                message.error(e instanceof Error ? e.message : 'Failed to load showcase material detail');
            } finally {
                setDetailLoading(false);
            }
        },
        [form],
    );

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [list, storeList] = await Promise.all([
                studioService.listMarketingContents(status, tenantFilter),
                studioService.listMarketingStores(),
            ]);
            setRows(list);
            setStores(storeList);
            if (list.length > 0) {
                const stillExists = selected && list.some((r) => r.id === selected.id);
                if (!stillExists) {
                    void selectAndLoadItem(list[0]);
                }
            } else {
                setSelected(null);
            }
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to load showcase materials');
        } finally {
            setLoading(false);
        }
    }, [status, tenantFilter, selected, selectAndLoadItem]);

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, tenantFilter]);

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
            message.success('Showcase headline & caption saved');
            await load();
        } catch (e) {
            if (e instanceof Error) message.error(e.message);
        } finally {
            setBusy(false);
        }
    };

    const approveItem = async (target?: StudioMarketingContent) => {
        const item = target || selected;
        if (!item) return;
        setBusy(true);
        try {
            await studioService.approveMarketingContent(item.id);
            message.success(`Published "${item.product_name_snapshot}" to public brochure-gallery showcase`);
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to approve showcase card');
        } finally {
            setBusy(false);
        }
    };

    const rejectItem = async (target?: StudioMarketingContent) => {
        const item = target || selected;
        if (!item) return;
        setBusy(true);
        try {
            await studioService.rejectMarketingContent(item.id);
            message.info(`Rejected showcase card for "${item.product_name_snapshot}"`);
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to reject showcase card');
        } finally {
            setBusy(false);
        }
    };

    const unpublishItem = async (target?: StudioMarketingContent) => {
        const item = target || selected;
        if (!item) return;
        setBusy(true);
        try {
            await studioService.unpublishMarketingContent(item.id);
            message.success(`Unpublished "${item.product_name_snapshot}" from public gallery`);
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to unpublish showcase card');
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
                `Showcase batch complete — ${res.created} generated, ${res.skipped} skipped, ${res.errors} errors`,
            );
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Showcase generation failed');
        } finally {
            setBusy(false);
        }
    };

    const toggleConsent = async (tenantId: string, consent: boolean) => {
        try {
            await studioService.setMarketingStoreConsent(tenantId, consent);
            message.success(
                consent
                    ? `Showcase gallery consent enabled for ${tenantId}`
                    : `Showcase gallery consent disabled for ${tenantId}`,
            );
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to update store consent');
        }
    };

    const filteredRows = useMemo(() => {
        if (!searchQuery.trim()) return rows;
        const q = searchQuery.toLowerCase();
        return rows.filter(
            (r) =>
                (r.product_name_snapshot || '').toLowerCase().includes(q) ||
                (r.store_label_snapshot || '').toLowerCase().includes(q) ||
                (r.tenant_id || '').toLowerCase().includes(q) ||
                (r.headline || '').toLowerCase().includes(q) ||
                (r.caption || '').toLowerCase().includes(q),
        );
    }, [rows, searchQuery]);

    const filteredStores = useMemo(() => {
        if (!storeSearchQuery.trim()) return stores;
        const q = storeSearchQuery.toLowerCase();
        return stores.filter(
            (s) =>
                (s.tenant_id || '').toLowerCase().includes(q) ||
                (s.label || '').toLowerCase().includes(q),
        );
    }, [stores, storeSearchQuery]);

    // Live Telemetry Counters
    const totalCount = rows.length;
    const pendingCount = rows.filter((r) => r.status === 'pending').length;
    const approvedCount = rows.filter((r) => r.status === 'approved').length;
    const consentedStoresCount = stores.filter((s) => s.marketing_consent).length;

    const copyText = (value: string, label: string) => {
        if (!value) return;
        void navigator.clipboard.writeText(value);
        message.success(`${label} copied to clipboard`);
    };

    const renderStudioContent = (inDrawer = false) => {
        if (!selected && studioTab !== 'consent' && !inDrawer) return null;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* TAB 01: CARD PREVIEW & COPY STUDIO */}
                {selected && (inDrawer || studioTab === 'studio') && (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: inDrawer
                                ? '1fr'
                                : 'minmax(240px, 42%) 1fr',
                            gap: 8,
                            alignItems: 'start',
                        }}
                    >
                        {/* Left Column: Tactical HUD Showcase Card Frame */}
                        <div
                            style={{
                                border: `1px solid ${t.border}`,
                                background: darkMode ? '#080b10' : '#f8fafc',
                                padding: 8,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 6,
                                }}
                            >
                                <span
                                    className="font-mono uppercase"
                                    style={{ fontSize: 9.5, fontWeight: 700, color: themeColor }}
                                >
                                    HUD SHOWCASE CARD // PREVIEW
                                </span>
                                <span
                                    className="font-mono uppercase"
                                    style={{
                                        fontSize: 9,
                                        padding: '1px 5px',
                                        border: `1px solid ${(STATUS_STYLE[selected.status] || STATUS_STYLE.unpublished).border}`,
                                        background: (STATUS_STYLE[selected.status] || STATUS_STYLE.unpublished).bg,
                                        color: (STATUS_STYLE[selected.status] || STATUS_STYLE.unpublished).color,
                                    }}
                                >
                                    {(STATUS_STYLE[selected.status] || STATUS_STYLE.unpublished).label}
                                </span>
                            </div>

                            {/* Artwork Frame */}
                            <div
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    border: `1px solid ${t.border}`,
                                    background: '#05070a',
                                    overflow: 'hidden',
                                    minHeight: 220,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {selected.image_public_url ? (
                                    <img
                                        src={selected.image_public_url}
                                        alt={selected.product_name_snapshot}
                                        style={{
                                            width: '100%',
                                            height: 'auto',
                                            maxHeight: inDrawer ? 520 : 380,
                                            objectFit: 'contain',
                                            display: 'block',
                                        }}
                                    />
                                ) : (
                                    <div
                                        className="font-mono uppercase"
                                        style={{
                                            padding: 24,
                                            fontSize: 10.5,
                                            color: t.textMuted,
                                            textAlign: 'center',
                                        }}
                                    >
                                        <PictureOutlined style={{ fontSize: 22, display: 'block', marginBottom: 6 }} />
                                        NO RENDERED PNG ASSET
                                    </div>
                                )}
                            </div>

                            {/* Quick Asset Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap' }}>
                                <span className="font-mono" style={{ fontSize: 9.5, color: t.textMuted }}>
                                    PRICE: <strong style={{ color: '#22c55e' }}>{formatPriceIDR(selected.price_snapshot)}</strong>
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Button
                                        size="small"
                                        icon={<CopyOutlined />}
                                        onClick={() => copyText(selected.image_public_url, 'Asset URL')}
                                        style={{ borderRadius: 0, fontSize: 9.5, height: 22 }}
                                    >
                                        Copy URL
                                    </Button>
                                    {selected.image_public_url && (
                                        <Button
                                            size="small"
                                            icon={<ExportOutlined />}
                                            href={selected.image_public_url}
                                            target="_blank"
                                            style={{ borderRadius: 0, fontSize: 9.5, height: 22 }}
                                        >
                                            Open PNG
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Metadata Telemetry + Headline & Caption Copy Studio */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {/* Compact Metadata Grid */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                                    gap: 6,
                                    padding: '6px 8px',
                                    background: darkMode ? '#0f131a' : '#f8fafc',
                                    border: `1px solid ${t.border}`,
                                }}
                            >
                                <div>
                                    <div className="font-mono uppercase" style={{ fontSize: 9, color: t.textMuted }}>
                                        PRODUCT SNAPSHOT
                                    </div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: t.textPrimary }}>
                                        {selected.product_name_snapshot}
                                    </div>
                                </div>
                                <div>
                                    <div className="font-mono uppercase" style={{ fontSize: 9, color: t.textMuted }}>
                                        PARTNER STORE // TENANT
                                    </div>
                                    <div className="font-mono" style={{ fontSize: 10.5, color: themeColor }}>
                                        {selected.store_label_snapshot} · <span style={{ color: t.textSecondary }}>{selected.tenant_id}</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="font-mono uppercase" style={{ fontSize: 9, color: t.textMuted }}>
                                        CATEGORY // PRICE
                                    </div>
                                    <div className="font-mono" style={{ fontSize: 10.5, color: '#38bdf8' }}>
                                        {selected.category_name_snapshot || 'General'} · {formatPriceIDR(selected.price_snapshot)}
                                    </div>
                                </div>
                                <div>
                                    <div className="font-mono uppercase" style={{ fontSize: 9, color: t.textMuted }}>
                                        SYNTHESIS // MODEL
                                    </div>
                                    <div className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                        {selected.model || selected.generated_by || 'HUD SVG + LLM'}
                                    </div>
                                </div>
                            </div>

                            {/* Headline & Caption Copy Form */}
                            <div
                                style={{
                                    padding: 8,
                                    border: `1px solid ${t.border}`,
                                    background: darkMode ? '#0b0e13' : '#ffffff',
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
                                        SHOWCASE HEADLINE & PROMO CAPTION EDITOR //
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Button
                                            size="small"
                                            icon={<CopyOutlined />}
                                            onClick={() =>
                                                copyText(
                                                    `${form.getFieldValue('headline') || selected.headline}\n\n${
                                                        form.getFieldValue('caption') || selected.caption
                                                    }`,
                                                    'Headline & Caption',
                                                )
                                            }
                                            style={{ borderRadius: 0, fontSize: 9.5, height: 22 }}
                                        >
                                            Copy Copywriting
                                        </Button>
                                        <Button
                                            size="small"
                                            type="primary"
                                            icon={<SaveOutlined />}
                                            loading={busy}
                                            onClick={saveCaption}
                                            style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                        >
                                            Save Copy
                                        </Button>
                                    </div>
                                </div>

                                <Form form={form} layout="vertical">
                                    <Form.Item
                                        name="headline"
                                        label="Showcase Card Headline (Max 200 chars)"
                                        rules={[{ required: true, message: 'Headline is required' }]}
                                        style={{ marginBottom: 8 }}
                                    >
                                        <Input
                                            size="small"
                                            maxLength={200}
                                            showCount
                                            style={{ borderRadius: 0 }}
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        name="caption"
                                        label="Promotional Caption & Story Copy (Max 2,200 chars)"
                                        rules={[{ required: true, message: 'Caption is required' }]}
                                        style={{ marginBottom: 4 }}
                                    >
                                        <Input.TextArea
                                            rows={inDrawer ? 10 : 8}
                                            maxLength={2200}
                                            showCount
                                            style={{
                                                borderRadius: 0,
                                                fontSize: 11.5,
                                                lineHeight: 1.55,
                                            }}
                                        />
                                    </Form.Item>
                                </Form>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 02: ASSET & PROVENANCE TELEMETRY */}
                {selected && (inDrawer || studioTab === 'telemetry') && (
                    <div
                        style={{
                            padding: 8,
                            border: `1px solid ${t.border}`,
                            background: darkMode ? '#0b0e13' : '#ffffff',
                        }}
                    >
                        <div
                            className="font-mono uppercase"
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#38bdf8',
                                marginBottom: 6,
                            }}
                        >
                            ASSET PROVENANCE & SHOWCASE TELEMETRY //
                        </div>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                                gap: 6,
                            }}
                        >
                            {[
                                { label: 'SHOWCASE CARD ID', value: selected.id },
                                { label: 'TENANT ID', value: selected.tenant_id },
                                { label: 'INVENTORY ITEM ID', value: selected.inv_item_id },
                                { label: 'PRODUCT SNAPSHOT', value: selected.product_name_snapshot },
                                { label: 'STORE SNAPSHOT', value: selected.store_label_snapshot },
                                { label: 'CATEGORY SNAPSHOT', value: selected.category_name_snapshot || '—' },
                                { label: 'PRICE SNAPSHOT', value: formatPriceIDR(selected.price_snapshot) },
                                { label: 'GENERATOR // MODEL', value: `${selected.generated_by || 'studio'} · ${selected.model || 'default'}` },
                                { label: 'CREATED AT', value: new Date(selected.created_at).toLocaleString('en-US') },
                                {
                                    label: 'PUBLISHED AT',
                                    value: selected.published_at
                                        ? new Date(selected.published_at).toLocaleString('en-US')
                                        : '—',
                                },
                                {
                                    label: 'REVIEWER // DECIDED AT',
                                    value: selected.reviewer_id
                                        ? `${selected.reviewer_id}${
                                              selected.decided_at
                                                  ? ` · ${new Date(selected.decided_at).toLocaleString('en-US')}`
                                                  : ''
                                          }`
                                        : 'Awaiting Review',
                                },
                                { label: 'REJECT REASON', value: selected.reject_reason || '—' },
                            ].map((row) => (
                                <div
                                    key={row.label}
                                    style={{
                                        padding: '5px 8px',
                                        border: `1px solid ${t.border}`,
                                        background: darkMode ? '#0f131a' : '#f8fafc',
                                    }}
                                >
                                    <div className="font-mono uppercase" style={{ fontSize: 9, color: t.textMuted }}>
                                        {row.label}
                                    </div>
                                    <div
                                        className="font-mono"
                                        style={{
                                            fontSize: 10.5,
                                            color: t.textPrimary,
                                            wordBreak: 'break-all',
                                        }}
                                    >
                                        {row.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Public Asset URL Strip */}
                        <div
                            style={{
                                marginTop: 6,
                                padding: '6px 8px',
                                border: `1px solid ${t.border}`,
                                background: darkMode ? '#0f131a' : '#f8fafc',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                                flexWrap: 'wrap',
                            }}
                        >
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="font-mono uppercase" style={{ fontSize: 9, color: t.textMuted }}>
                                    PUBLIC ASSET PROXY URL (MINIO // MIDDLEWARE)
                                </div>
                                <div
                                    className="font-mono"
                                    style={{
                                        fontSize: 10.5,
                                        color: '#38bdf8',
                                        wordBreak: 'break-all',
                                    }}
                                >
                                    {selected.image_public_url}
                                </div>
                            </div>
                            <Button
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() => copyText(selected.image_public_url, 'Public image URL')}
                                style={{ borderRadius: 0, fontSize: 9.5, height: 22 }}
                            >
                                Copy URL
                            </Button>
                        </div>
                    </div>
                )}

                {/* TAB 03: STORE CONSENT & BATCH GENERATOR */}
                {(inDrawer || studioTab === 'consent') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {/* Batch Synthesis Configuration Card */}
                        <div
                            style={{
                                padding: 8,
                                border: `1px solid ${t.border}`,
                                borderLeft: `3px solid ${themeColor}`,
                                background: darkMode ? '#0f131a' : '#f8fafc',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 8,
                                    flexWrap: 'wrap',
                                    marginBottom: 6,
                                }}
                            >
                                <div>
                                    <div
                                        className="font-mono uppercase"
                                        style={{ fontSize: 10, fontWeight: 700, color: themeColor }}
                                    >
                                        <ThunderboltOutlined /> HUD SHOWCASE BATCH GENERATOR //
                                    </div>
                                    <div style={{ fontSize: 11, color: t.textSecondary }}>
                                        Synthesizes Sharp/SVG HUD share-cards with inventory photos or stylized AI product icons. Active pending/approved products are automatically skipped with anti-duplicate rotation.
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <Select
                                        size="small"
                                        allowClear
                                        placeholder="All Consented Stores"
                                        style={{ width: 170 }}
                                        options={storeOptions.map((tenant) => ({
                                            value: tenant,
                                            label: tenant,
                                        }))}
                                        value={genStore}
                                        onChange={setGenStore}
                                    />
                                    <InputNumber
                                        size="small"
                                        min={1}
                                        max={50}
                                        value={genLimit}
                                        onChange={(v) => setGenLimit(v ?? 5)}
                                        style={{ width: 70, borderRadius: 0 }}
                                    />
                                    <span className="font-mono" style={{ fontSize: 9.5, color: t.textMuted }}>
                                        MAX ITEMS
                                    </span>
                                    <Button
                                        size="small"
                                        type="primary"
                                        icon={<PictureOutlined />}
                                        loading={busy}
                                        onClick={generateNow}
                                        style={{ borderRadius: 0, fontSize: 10, height: 24 }}
                                    >
                                        Generate Batch Now
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Per-Store Gallery Consent Matrix */}
                        <div
                            style={{
                                padding: 8,
                                border: `1px solid ${t.border}`,
                                background: darkMode ? '#0b0e13' : '#ffffff',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 8,
                                    flexWrap: 'wrap',
                                    marginBottom: 6,
                                }}
                            >
                                <span
                                    className="font-mono uppercase"
                                    style={{ fontSize: 10, fontWeight: 700, color: '#22c55e' }}
                                >
                                    <ShopOutlined /> PARTNER STORE SHOWCASE CONSENT MATRIX // [{consentedStoresCount}/{stores.length} ENABLED]
                                </span>
                                <Input
                                    size="small"
                                    allowClear
                                    prefix={<SearchOutlined style={{ fontSize: 10, color: t.textMuted }} />}
                                    placeholder="Filter store or tenant..."
                                    value={storeSearchQuery}
                                    onChange={(e) => setStoreSearchQuery(e.target.value)}
                                    style={{ width: 190, borderRadius: 0, fontSize: 10.5, height: 22 }}
                                />
                            </div>

                            {filteredStores.length === 0 ? (
                                <div className="font-mono" style={{ fontSize: 11, color: t.textMuted, padding: 12 }}>
                                    No partner stores found.
                                </div>
                            ) : (
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                                        gap: 6,
                                    }}
                                >
                                    {filteredStores.map((st) => (
                                        <div
                                            key={st.tenant_id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 8,
                                                padding: '6px 8px',
                                                border: `1px solid ${t.border}`,
                                                borderLeft: `3px solid ${
                                                    st.marketing_consent ? '#22c55e' : t.border
                                                }`,
                                                background: darkMode ? '#0f131a' : '#f8fafc',
                                            }}
                                        >
                                            <div style={{ minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontSize: 11.5,
                                                        fontWeight: 600,
                                                        color: t.textPrimary,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    {st.label || st.tenant_id}
                                                </div>
                                                <div className="font-mono" style={{ fontSize: 9.5, color: t.textMuted }}>
                                                    {st.tenant_id}
                                                    {st.marketing_consent_at
                                                        ? ` · ${new Date(st.marketing_consent_at).toLocaleDateString('en-US')}`
                                                        : ''}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                <span
                                                    className="font-mono uppercase"
                                                    style={{
                                                        fontSize: 8.5,
                                                        padding: '1px 4px',
                                                        border: `1px solid ${
                                                            st.marketing_consent
                                                                ? 'rgba(34,197,94,0.45)'
                                                                : t.border
                                                        }`,
                                                        color: st.marketing_consent ? '#22c55e' : t.textMuted,
                                                    }}
                                                >
                                                    {st.marketing_consent ? 'CONSENTED' : 'OFF'}
                                                </span>
                                                <Switch
                                                    size="small"
                                                    checked={st.marketing_consent}
                                                    onChange={(checked) =>
                                                        void toggleConsent(st.tenant_id, checked)
                                                    }
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <RbacGuard
            requiredRole="super_admin"
            fallback={
                <Alert
                    type="warning"
                    message="Showcase is restricted to Nusantarasoft super admins."
                    showIcon
                    style={{ borderRadius: 0 }}
                />
            }
        >
            <CMSLayout
                title="Showcase"
                subTitle="HUD Showcase Card Synthesizer · Copy Studio · Public Brochure Gallery Triage"
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
                    {/* TOP 36PX TACTICAL TELEMETRY & BATCH SYNTHESIS RIBBON */}
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
                        {/* Left: Telemetry + Search + Status Filter Pills + Tenant Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
                                SHW // STUDIO
                            </span>
                            <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                CARDS <strong style={{ color: t.textPrimary }}>{totalCount}</strong>
                            </span>
                            <span style={{ color: t.border }}>·</span>
                            <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                PENDING <strong style={{ color: '#f59e0b' }}>{pendingCount}</strong>
                            </span>
                            <span style={{ color: t.border }}>·</span>
                            <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                LIVE <strong style={{ color: '#22c55e' }}>{approvedCount}</strong>
                            </span>
                            <span style={{ color: t.border }}>·</span>
                            <Tooltip title="Click to manage Partner Store Showcase Consent & Batch Settings">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!showStudioPane) setShowStudioPane(true);
                                        setStudioTab('consent');
                                    }}
                                    className="font-mono uppercase"
                                    style={{
                                        fontSize: 9.5,
                                        padding: '2px 6px',
                                        border: `1px solid ${
                                            studioTab === 'consent' ? '#22c55e' : 'rgba(34,197,94,0.4)'
                                        }`,
                                        background:
                                            studioTab === 'consent'
                                                ? 'rgba(34,197,94,0.18)'
                                                : 'rgba(34,197,94,0.08)',
                                        color: '#22c55e',
                                        cursor: 'pointer',
                                    }}
                                >
                                    CONSENT: {consentedStoresCount}/{stores.length}
                                </button>
                            </Tooltip>

                            {/* Instant Search Input */}
                            <Input
                                size="small"
                                allowClear
                                prefix={<SearchOutlined style={{ fontSize: 11, color: t.textMuted }} />}
                                placeholder="Search product, store, headline..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ width: 175, borderRadius: 0, fontSize: 11, height: 24 }}
                            />

                            {/* Status Filter Pills */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {STATUS_OPTIONS.map((opt) => {
                                    const active = status === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setStatus(opt.value)}
                                            className="font-mono uppercase"
                                            style={{
                                                fontSize: 9.5,
                                                letterSpacing: '0.05em',
                                                padding: '2px 6px',
                                                height: 22,
                                                cursor: 'pointer',
                                                border: `1px solid ${active ? themeColor : t.border}`,
                                                background: active ? `${themeColor}1f` : 'transparent',
                                                color: active ? themeColor : t.textSecondary,
                                                fontWeight: active ? 700 : 500,
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Tenant Filter */}
                            <Select
                                size="small"
                                allowClear
                                placeholder="All Tenants"
                                style={{ width: 130 }}
                                options={storeOptions.map((tenant) => ({
                                    value: tenant,
                                    label: tenant,
                                }))}
                                value={tenantFilter}
                                onChange={setTenantFilter}
                            />
                        </div>

                        {/* Right: Inline Batch Generator + Layout Controls + Showcase Link + Reload */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                            {/* Queue View Mode Toggle (List vs Grid) */}
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Tooltip title="Compact Queue List">
                                    <button
                                        type="button"
                                        onClick={() => setQueueViewMode('list')}
                                        className="font-mono uppercase"
                                        style={{
                                            fontSize: 9.5,
                                            padding: '2px 6px',
                                            height: 22,
                                            cursor: 'pointer',
                                            border: `1px solid ${
                                                queueViewMode === 'list' ? themeColor : t.border
                                            }`,
                                            background:
                                                queueViewMode === 'list' ? `${themeColor}1f` : 'transparent',
                                            color: queueViewMode === 'list' ? themeColor : t.textSecondary,
                                        }}
                                    >
                                        <BarsOutlined /> LIST
                                    </button>
                                </Tooltip>
                                <Tooltip title="Visual Thumbnail Grid">
                                    <button
                                        type="button"
                                        onClick={() => setQueueViewMode('grid')}
                                        className="font-mono uppercase"
                                        style={{
                                            fontSize: 9.5,
                                            padding: '2px 6px',
                                            height: 22,
                                            cursor: 'pointer',
                                            border: `1px solid ${
                                                queueViewMode === 'grid' ? themeColor : t.border
                                            }`,
                                            background:
                                                queueViewMode === 'grid' ? `${themeColor}1f` : 'transparent',
                                            color: queueViewMode === 'grid' ? themeColor : t.textSecondary,
                                        }}
                                    >
                                        <AppstoreOutlined /> GRID
                                    </button>
                                </Tooltip>
                            </div>

                            <button
                                type="button"
                                data-testid="showcase-toggle-queue"
                                onClick={() => {
                                    if (showQueuePane && !showStudioPane) {
                                        setShowStudioPane(true);
                                    }
                                    setShowQueuePane((v) => !v);
                                }}
                                className="font-mono uppercase"
                                style={{
                                    fontSize: 9.5,
                                    letterSpacing: '0.06em',
                                    padding: '2px 7px',
                                    height: 22,
                                    cursor: 'pointer',
                                    border: `1px solid ${t.border}`,
                                    background: showQueuePane ? 'transparent' : `${themeColor}1f`,
                                    color: showQueuePane ? t.textSecondary : themeColor,
                                }}
                            >
                                {showQueuePane ? '◀ HIDE QUEUE' : '▶ SHOW QUEUE'}
                            </button>
                            <button
                                type="button"
                                data-testid="showcase-reset-layout"
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
                                        showQueuePane && showStudioPane ? 'transparent' : `${themeColor}18`,
                                    color:
                                        showQueuePane && showStudioPane ? t.textSecondary : themeColor,
                                }}
                            >
                                RESET LAYOUT
                            </button>
                            <button
                                type="button"
                                data-testid="showcase-focus-studio"
                                onClick={() => {
                                    setShowQueuePane(false);
                                    setShowStudioPane(true);
                                }}
                                className="font-mono uppercase"
                                style={{
                                    fontSize: 9.5,
                                    letterSpacing: '0.06em',
                                    padding: '2px 7px',
                                    height: 22,
                                    cursor: 'pointer',
                                    border: `1px solid ${
                                        !showQueuePane && showStudioPane ? themeColor : t.border
                                    }`,
                                    background:
                                        !showQueuePane && showStudioPane ? `${themeColor}22` : 'transparent',
                                    color:
                                        !showQueuePane && showStudioPane ? themeColor : t.textSecondary,
                                }}
                            >
                                FOCUS STUDIO
                            </button>
                            <button
                                type="button"
                                data-testid="showcase-toggle-studio"
                                onClick={() => {
                                    if (showStudioPane && !showQueuePane) {
                                        setShowQueuePane(true);
                                    }
                                    setShowStudioPane((v) => !v);
                                }}
                                className="font-mono uppercase"
                                style={{
                                    fontSize: 9.5,
                                    letterSpacing: '0.06em',
                                    padding: '2px 7px',
                                    height: 22,
                                    cursor: 'pointer',
                                    border: `1px solid ${t.border}`,
                                    background: showStudioPane ? 'transparent' : `${themeColor}1f`,
                                    color: showStudioPane ? t.textSecondary : themeColor,
                                }}
                            >
                                {showStudioPane ? 'HIDE STUDIO ▶' : '◀ SHOW STUDIO'}
                            </button>

                            {/* Inline Batch Limit + Generate Now */}
                            <Tooltip title="Max products to synthesize in this batch">
                                <InputNumber
                                    size="small"
                                    min={1}
                                    max={50}
                                    value={genLimit}
                                    onChange={(v) => setGenLimit(v ?? 5)}
                                    style={{ width: 54, borderRadius: 0, height: 24, fontSize: 11 }}
                                />
                            </Tooltip>
                            <Button
                                size="small"
                                type="primary"
                                icon={<PictureOutlined />}
                                onClick={generateNow}
                                loading={busy}
                                style={{ borderRadius: 0, fontSize: 10.5, height: 24 }}
                            >
                                Generate Showcase
                            </Button>
                            <Tooltip title="Open Public Brochure Showcase Gallery">
                                <Button
                                    size="small"
                                    icon={<ExportOutlined />}
                                    href={SHOWCASE_GALLERY_URL}
                                    target="_blank"
                                    style={{ borderRadius: 0, fontSize: 10, height: 24 }}
                                >
                                    Gallery
                                </Button>
                            </Tooltip>
                            <Tooltip title="Reload Showcase Queue">
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

                    {/* VIEWPORT-LOCKED 2-PANE SPLIT WORKSPACE */}
                    <div
                        style={{
                            flex: 1,
                            minHeight: 0,
                            display: 'grid',
                            gridTemplateColumns:
                                showQueuePane && showStudioPane
                                    ? 'minmax(350px, 44%) 1fr'
                                    : '1fr',
                            gap: 6,
                            overflow: 'hidden',
                        }}
                    >
                        {/* LEFT PANE: SHOWCASE MATERIAL QUEUE (LIST OR VISUAL GRID) */}
                        {showQueuePane && (
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
                                        SHOWCASE QUEUE // [{filteredRows.length}]
                                    </span>
                                    <span className="font-mono" style={{ fontSize: 9.5, color: t.textMuted }}>
                                        SELECT CARD TO INSPECT & EDIT COPY
                                    </span>
                                </div>

                                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                    {loading && rows.length === 0 ? (
                                        <div
                                            className="font-mono"
                                            style={{
                                                padding: 20,
                                                fontSize: 11,
                                                color: t.textMuted,
                                                textAlign: 'center',
                                            }}
                                        >
                                            LOADING SHOWCASE QUEUE...
                                        </div>
                                    ) : filteredRows.length === 0 ? (
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
                                                No showcase cards match the current status or filter.
                                            </span>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    icon={<PictureOutlined />}
                                                    onClick={generateNow}
                                                    loading={busy}
                                                    style={{ borderRadius: 0, fontSize: 10.5 }}
                                                >
                                                    Generate Showcase Batch Now
                                                </Button>
                                                <Button
                                                    size="small"
                                                    icon={<ShopOutlined />}
                                                    onClick={() => {
                                                        if (!showStudioPane) setShowStudioPane(true);
                                                        setStudioTab('consent');
                                                    }}
                                                    style={{ borderRadius: 0, fontSize: 10.5 }}
                                                >
                                                    Check Store Consent ({consentedStoresCount}/{stores.length})
                                                </Button>
                                            </div>
                                        </div>
                                    ) : queueViewMode === 'grid' ? (
                                        /* VISUAL THUMBNAIL GRID VIEW */
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
                                                gap: 6,
                                                padding: 8,
                                            }}
                                        >
                                            {filteredRows.map((row) => {
                                                const isSelected = selected?.id === row.id;
                                                const stStyle = STATUS_STYLE[row.status] || STATUS_STYLE.unpublished;
                                                return (
                                                    <div
                                                        key={row.id}
                                                        onClick={() => {
                                                            void selectAndLoadItem(row);
                                                            if (!showStudioPane) setShowStudioPane(true);
                                                            if (studioTab === 'consent') setStudioTab('studio');
                                                        }}
                                                        style={{
                                                            border: `1px solid ${
                                                                isSelected ? themeColor : t.border
                                                            }`,
                                                            background: isSelected
                                                                ? darkMode
                                                                    ? 'rgba(251,146,60,0.08)'
                                                                    : 'rgba(251,146,60,0.05)'
                                                                : darkMode
                                                                  ? '#0f131a'
                                                                  : '#f8fafc',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            overflow: 'hidden',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                position: 'relative',
                                                                height: 125,
                                                                background: '#05070a',
                                                                borderBottom: `1px solid ${t.border}`,
                                                                overflow: 'hidden',
                                                            }}
                                                        >
                                                            {row.image_public_url ? (
                                                                <img
                                                                    src={row.image_public_url}
                                                                    alt={row.product_name_snapshot}
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '100%',
                                                                        objectFit: 'cover',
                                                                        display: 'block',
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div
                                                                    style={{
                                                                        height: '100%',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        color: t.textMuted,
                                                                    }}
                                                                >
                                                                    <PictureOutlined style={{ fontSize: 20 }} />
                                                                </div>
                                                            )}
                                                            <span
                                                                className="font-mono uppercase"
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: 4,
                                                                    right: 4,
                                                                    fontSize: 8.5,
                                                                    padding: '1px 5px',
                                                                    border: `1px solid ${stStyle.border}`,
                                                                    background: 'rgba(8,11,16,0.88)',
                                                                    color: stStyle.color,
                                                                }}
                                                            >
                                                                {row.status}
                                                            </span>
                                                        </div>
                                                        <div style={{ padding: '6px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                            <div
                                                                style={{
                                                                    fontSize: 11.5,
                                                                    fontWeight: 600,
                                                                    color: t.textPrimary,
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                }}
                                                            >
                                                                {row.product_name_snapshot}
                                                            </div>
                                                            <div
                                                                className="font-mono"
                                                                style={{
                                                                    fontSize: 9.5,
                                                                    color: themeColor,
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                }}
                                                            >
                                                                {row.store_label_snapshot} · {row.tenant_id}
                                                            </div>
                                                            <div
                                                                style={{
                                                                    marginTop: 'auto',
                                                                    paddingTop: 4,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: 4,
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <span className="font-mono" style={{ fontSize: 9.5, color: '#22c55e' }}>
                                                                    {formatPriceIDR(row.price_snapshot)}
                                                                </span>
                                                                <div style={{ display: 'flex', gap: 3 }}>
                                                                    {row.status === 'pending' && (
                                                                        <>
                                                                            <Button
                                                                                size="small"
                                                                                type="primary"
                                                                                icon={<CheckOutlined />}
                                                                                onClick={() => void approveItem(row)}
                                                                                style={{
                                                                                    borderRadius: 0,
                                                                                    fontSize: 9,
                                                                                    height: 19,
                                                                                    padding: '0 4px',
                                                                                }}
                                                                            />
                                                                            <Button
                                                                                size="small"
                                                                                danger
                                                                                icon={<CloseOutlined />}
                                                                                onClick={() => void rejectItem(row)}
                                                                                style={{
                                                                                    borderRadius: 0,
                                                                                    fontSize: 9,
                                                                                    height: 19,
                                                                                    padding: '0 4px',
                                                                                }}
                                                                            />
                                                                        </>
                                                                    )}
                                                                    {row.status === 'approved' && (
                                                                        <Button
                                                                            size="small"
                                                                            icon={<StopOutlined />}
                                                                            onClick={() => void unpublishItem(row)}
                                                                            style={{
                                                                                borderRadius: 0,
                                                                                fontSize: 9,
                                                                                height: 19,
                                                                                padding: '0 4px',
                                                                            }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        /* COMPACT TACTICAL LIST VIEW */
                                        filteredRows.map((row) => {
                                            const isSelected = selected?.id === row.id;
                                            const stStyle = STATUS_STYLE[row.status] || STATUS_STYLE.unpublished;

                                            return (
                                                <div
                                                    key={row.id}
                                                    onClick={() => {
                                                        void selectAndLoadItem(row);
                                                        if (!showStudioPane) setShowStudioPane(true);
                                                        if (studioTab === 'consent') setStudioTab('studio');
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        padding: '7px 10px',
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
                                                    {/* 46x46 HUD Card Thumbnail */}
                                                    <div
                                                        style={{
                                                            width: 46,
                                                            height: 46,
                                                            flexShrink: 0,
                                                            border: `1px solid ${t.border}`,
                                                            background: '#05070a',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            overflow: 'hidden',
                                                        }}
                                                    >
                                                        {row.image_public_url ? (
                                                            <img
                                                                src={row.image_public_url}
                                                                alt={row.product_name_snapshot}
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: 'cover',
                                                                    display: 'block',
                                                                }}
                                                            />
                                                        ) : (
                                                            <PictureOutlined style={{ fontSize: 16, color: t.textMuted }} />
                                                        )}
                                                    </div>

                                                    {/* Middle Info */}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                gap: 6,
                                                                marginBottom: 2,
                                                            }}
                                                        >
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
                                                                {row.product_name_snapshot}
                                                            </span>
                                                            <span
                                                                className="font-mono uppercase"
                                                                style={{
                                                                    fontSize: 9,
                                                                    padding: '1px 5px',
                                                                    border: `1px solid ${stStyle.border}`,
                                                                    background: stStyle.bg,
                                                                    color: stStyle.color,
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                {row.status}
                                                            </span>
                                                        </div>

                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                gap: 6,
                                                                flexWrap: 'wrap',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                    flexWrap: 'wrap',
                                                                }}
                                                            >
                                                                <span
                                                                    className="font-mono"
                                                                    style={{
                                                                        fontSize: 9.5,
                                                                        padding: '0 5px',
                                                                        border: `1px solid ${t.border}`,
                                                                        color: themeColor,
                                                                    }}
                                                                >
                                                                    {row.store_label_snapshot}
                                                                </span>
                                                                <span
                                                                    className="font-mono"
                                                                    style={{ fontSize: 9.5, color: t.textMuted }}
                                                                >
                                                                    [{row.tenant_id}]
                                                                </span>
                                                                {typeof row.price_snapshot === 'number' && (
                                                                    <span
                                                                        className="font-mono"
                                                                        style={{ fontSize: 9.5, color: '#22c55e' }}
                                                                    >
                                                                        {formatPriceIDR(row.price_snapshot)}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Quick Inline Triage Buttons */}
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: 4,
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <span
                                                                    className="font-mono"
                                                                    style={{ fontSize: 9.5, color: t.textMuted }}
                                                                >
                                                                    {new Date(row.created_at).toLocaleDateString('en-US')}
                                                                </span>
                                                                {row.status === 'pending' && (
                                                                    <>
                                                                        <Tooltip title="Approve & Publish to Brochure Showcase">
                                                                            <Button
                                                                                size="small"
                                                                                type="primary"
                                                                                icon={<CheckOutlined />}
                                                                                loading={busy && isSelected}
                                                                                onClick={() => void approveItem(row)}
                                                                                style={{
                                                                                    borderRadius: 0,
                                                                                    fontSize: 9.5,
                                                                                    height: 20,
                                                                                    padding: '0 5px',
                                                                                }}
                                                                            >
                                                                                Publish
                                                                            </Button>
                                                                        </Tooltip>
                                                                        <Tooltip title="Reject Showcase Card">
                                                                            <Button
                                                                                size="small"
                                                                                danger
                                                                                icon={<CloseOutlined />}
                                                                                loading={busy && isSelected}
                                                                                onClick={() => void rejectItem(row)}
                                                                                style={{
                                                                                    borderRadius: 0,
                                                                                    fontSize: 9.5,
                                                                                    height: 20,
                                                                                    padding: '0 5px',
                                                                                }}
                                                                            />
                                                                        </Tooltip>
                                                                    </>
                                                                )}
                                                                {row.status === 'approved' && (
                                                                    <Tooltip title="Unpublish from Public Showcase Gallery">
                                                                        <Button
                                                                            size="small"
                                                                            icon={<StopOutlined />}
                                                                            loading={busy && isSelected}
                                                                            onClick={() => void unpublishItem(row)}
                                                                            style={{
                                                                                borderRadius: 0,
                                                                                fontSize: 9.5,
                                                                                height: 20,
                                                                                padding: '0 5px',
                                                                            }}
                                                                        >
                                                                            Unpublish
                                                                        </Button>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* RIGHT PANE: DOCKED SHOWCASE CARD STUDIO & STORE CONSENT DECK */}
                        {showStudioPane && (
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
                                {/* Sticky Studio Header + Sub-Tabs + Primary Triage Actions */}
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                        {(
                                            [
                                                {
                                                    key: 'studio',
                                                    label: '[01] CARD PREVIEW & COPY STUDIO',
                                                },
                                                {
                                                    key: 'telemetry',
                                                    label: '[02] ASSET PROVENANCE',
                                                },
                                                {
                                                    key: 'consent',
                                                    label: `[03] STORE CONSENT & BATCH (${consentedStoresCount}/${stores.length})`,
                                                },
                                            ] as { key: StudioTab; label: string }[]
                                        ).map((tab) => {
                                            const active = studioTab === tab.key;
                                            return (
                                                <button
                                                    key={tab.key}
                                                    type="button"
                                                    onClick={() => setStudioTab(tab.key)}
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
                                    </div>

                                    {/* Direct Studio Action Bar */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                        {detailLoading && (
                                            <span className="font-mono" style={{ fontSize: 9.5, color: t.textMuted }}>
                                                SYNCING…
                                            </span>
                                        )}
                                        {selected && selected.status === 'pending' && (
                                            <>
                                                <Button
                                                    size="small"
                                                    danger
                                                    icon={<CloseOutlined />}
                                                    onClick={() => void rejectItem()}
                                                    loading={busy}
                                                    style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                                >
                                                    Reject
                                                </Button>
                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    icon={<CheckOutlined />}
                                                    onClick={() => void approveItem()}
                                                    loading={busy}
                                                    style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                                >
                                                    Approve & Publish
                                                </Button>
                                            </>
                                        )}
                                        {selected && selected.status === 'approved' && (
                                            <Button
                                                size="small"
                                                icon={<StopOutlined />}
                                                onClick={() => void unpublishItem()}
                                                loading={busy}
                                                style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                            >
                                                Unpublish
                                            </Button>
                                        )}
                                        {selected && (
                                            <Tooltip title="Open Full Showcase Dossier in Wide Drawer">
                                                <Button
                                                    size="small"
                                                    icon={<ExpandAltOutlined />}
                                                    onClick={() => setPopoutDrawerOpen(true)}
                                                    style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                                >
                                                    Full View
                                                </Button>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>

                                {/* Studio Scrollable Body */}
                                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 10 }}>
                                    {!selected && studioTab !== 'consent' ? (
                                        <div
                                            style={{
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: 24,
                                                gap: 8,
                                            }}
                                        >
                                            <span
                                                className="font-mono uppercase"
                                                style={{ fontSize: 11, color: t.textMuted }}
                                            >
                                                SELECT A SHOWCASE CARD FROM THE QUEUE OR OPEN [03] STORE CONSENT & BATCH
                                            </span>
                                            <Button
                                                size="small"
                                                onClick={() => setStudioTab('consent')}
                                                style={{ borderRadius: 0, fontSize: 10.5 }}
                                            >
                                                Open Store Consent & Batch Generator
                                            </Button>
                                        </div>
                                    ) : (
                                        renderStudioContent(false)
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* OPTIONAL POP-OUT FULL SHOWCASE DRAWER */}
                <Drawer
                    width={760}
                    open={popoutDrawerOpen}
                    onClose={() => setPopoutDrawerOpen(false)}
                    title={
                        selected
                            ? `Showcase — ${selected.product_name_snapshot}`
                            : 'Showcase Studio'
                    }
                    extra={
                        selected && (
                            <div style={{ display: 'flex', gap: 6 }}>
                                {selected.status === 'pending' && (
                                    <>
                                        <Button
                                            size="small"
                                            danger
                                            icon={<CloseOutlined />}
                                            onClick={() => void rejectItem()}
                                            loading={busy}
                                            style={{ borderRadius: 0 }}
                                        >
                                            Reject
                                        </Button>
                                        <Button
                                            size="small"
                                            type="primary"
                                            icon={<CheckOutlined />}
                                            onClick={() => void approveItem()}
                                            loading={busy}
                                            style={{ borderRadius: 0 }}
                                        >
                                            Approve & Publish
                                        </Button>
                                    </>
                                )}
                                {selected.status === 'approved' && (
                                    <Button
                                        size="small"
                                        icon={<StopOutlined />}
                                        onClick={() => void unpublishItem()}
                                        loading={busy}
                                        style={{ borderRadius: 0 }}
                                    >
                                        Unpublish
                                    </Button>
                                )}
                            </div>
                        )
                    }
                >
                    {renderStudioContent(true)}
                </Drawer>
            </CMSLayout>
        </RbacGuard>
    );
}
