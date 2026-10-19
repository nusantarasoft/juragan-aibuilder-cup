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
    Select,
    Tooltip,
    message,
} from 'antd';
import {
    CheckOutlined,
    CloseOutlined,
    ExperimentOutlined,
    LinkOutlined,
    ReloadOutlined,
    RollbackOutlined,
    SearchOutlined,
    ExpandAltOutlined,
    SaveOutlined,
    WarningOutlined,
    FileProtectOutlined,
    RadarChartOutlined,
} from '@ant-design/icons';
import {
    studioService,
    StudioResearchItem,
    StudioResearchItemStatus,
    StudioResearchLastRun,
} from '@/lib/studioService';

const STATUS_OPTIONS: { value: StudioResearchItemStatus | 'all'; label: string }[] = [
    { value: 'pending', label: 'PENDING' },
    { value: 'approved', label: 'APPROVED' },
    { value: 'merged', label: 'MERGED' },
    { value: 'rejected', label: 'REJECTED' },
    { value: 'expired', label: 'EXPIRED' },
    { value: 'all', label: 'ALL' },
];

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
    pending: {
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.14)',
        border: 'rgba(245, 158, 11, 0.45)',
    },
    approved: {
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.14)',
        border: 'rgba(56, 189, 248, 0.45)',
    },
    merged: {
        color: '#22c55e',
        bg: 'rgba(34, 197, 94, 0.14)',
        border: 'rgba(34, 197, 94, 0.45)',
    },
    rejected: {
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.14)',
        border: 'rgba(239, 68, 68, 0.45)',
    },
    expired: {
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.35)',
    },
};

function formatDedupeFlag(flag: string): string {
    if (flag === 'mirip/duplikat') return 'SIMILAR / DUPLICATE';
    if (flag === 'mungkin bertentangan') return 'POTENTIAL CONFLICT';
    return flag.toUpperCase();
}

type InspectorTab = 'editor' | 'sources' | 'dedupe';

export default function KnowledgeResearchPage() {
    const { darkMode, themeColor = '#fb923c' } = useAdminLayout();
    const t = getVOTheme(darkMode);

    const [rows, setRows] = useState<StudioResearchItem[]>([]);
    const [lastRun, setLastRun] = useState<StudioResearchLastRun | null>(null);
    const [status, setStatus] = useState<StudioResearchItemStatus | 'all'>('pending');
    const [category, setCategory] = useState<string | undefined>();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    // Split Workspace Layout Controls
    const [showQueuePane, setShowQueuePane] = useState(true);
    const [showInspectorPane, setShowInspectorPane] = useState(true);
    const [showRunErrorBanner, setShowRunErrorBanner] = useState(false);

    // Selected Item & Inspector State
    const [selected, setSelected] = useState<StudioResearchItem | null>(null);
    const [inspectorTab, setInspectorTab] = useState<InspectorTab>('editor');
    const [popoutDrawerOpen, setPopoutDrawerOpen] = useState(false);
    const [form] = Form.useForm();

    const handleResetLayout = useCallback(() => {
        setShowQueuePane(true);
        setShowInspectorPane(true);
        setSearchQuery('');
        setCategory(undefined);
    }, []);

    useEffect(() => {
        const onGlobalReset = () => handleResetLayout();
        window.addEventListener('cms-reset-layout', onGlobalReset);
        return () => window.removeEventListener('cms-reset-layout', onGlobalReset);
    }, [handleResetLayout]);

    const categories = useMemo(() => {
        const set = new Set(rows.map((r) => r.category).filter(Boolean));
        return [...set].sort();
    }, [rows]);

    const selectAndLoadItem = useCallback(
        async (rowOrId: StudioResearchItem | string) => {
            const id = typeof rowOrId === 'string' ? rowOrId : rowOrId.id;
            if (typeof rowOrId !== 'string') {
                setSelected(rowOrId);
                form.setFieldsValue({ title: rowOrId.title, summary: rowOrId.summary });
            }
            setDetailLoading(true);
            try {
                const fullItem = await studioService.getResearchItem(id);
                setSelected(fullItem);
                form.setFieldsValue({ title: fullItem.title, summary: fullItem.summary });
            } catch (e) {
                message.error(e instanceof Error ? e.message : 'Failed to load research detail');
            } finally {
                setDetailLoading(false);
            }
        },
        [form],
    );

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [list, run] = await Promise.all([
                studioService.listResearchItems(status, category),
                studioService.getResearchLastRun(),
            ]);
            setRows(list);
            setLastRun(run);
            if (run?.error_message) {
                setShowRunErrorBanner(true);
            }
            if (list.length > 0) {
                const stillExists = selected && list.some((r) => r.id === selected.id);
                if (!stillExists) {
                    void selectAndLoadItem(list[0]);
                }
            } else {
                setSelected(null);
            }
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Failed to load research items');
        } finally {
            setLoading(false);
        }
    }, [status, category, selected, selectAndLoadItem]);

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, category]);

    const runNow = async () => {
        setBusy(true);
        try {
            const res = await studioService.runResearchNow();
            message.success(`Research run complete — ${res.itemsCreated} new items (run ${res.runId})`);
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Research run failed');
        } finally {
            setBusy(false);
        }
    };

    const saveEdit = async () => {
        if (!selected) return;
        try {
            const values = await form.validateFields();
            setBusy(true);
            const updated = await studioService.updateResearchItem(selected.id, values);
            setSelected(updated);
            message.success('Curriculum summary saved');
            await load();
        } catch (e) {
            if (e instanceof Error) {
                message.error(e.message || 'Save failed');
            }
        } finally {
            setBusy(false);
        }
    };

    const approveItem = async (target?: StudioResearchItem) => {
        const item = target || selected;
        if (!item) return;
        setBusy(true);
        try {
            await studioService.approveResearchItem(item.id);
            message.success(`Approved & merged "${item.title}" into curriculum notebook`);
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Approve failed');
        } finally {
            setBusy(false);
        }
    };

    const rejectItem = async (target?: StudioResearchItem) => {
        const item = target || selected;
        if (!item) return;
        setBusy(true);
        try {
            await studioService.rejectResearchItem(item.id, 'Rejected by admin');
            message.info(`Rejected "${item.title}"`);
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Reject failed');
        } finally {
            setBusy(false);
        }
    };

    const unmergeItem = async (target?: StudioResearchItem) => {
        const item = target || selected;
        if (!item) return;
        setBusy(true);
        try {
            await studioService.unmergeResearchItem(item.id);
            message.success('Unmerged — source removed from notebook and reverted to approved');
            const refreshed = await studioService.getResearchItem(item.id);
            setSelected(refreshed);
            await load();
        } catch (e) {
            message.error(e instanceof Error ? e.message : 'Unmerge failed');
        } finally {
            setBusy(false);
        }
    };

    const filteredRows = useMemo(() => {
        if (!searchQuery.trim()) return rows;
        const q = searchQuery.toLowerCase();
        return rows.filter(
            (r) =>
                r.title.toLowerCase().includes(q) ||
                r.category.toLowerCase().includes(q) ||
                r.topic_key.toLowerCase().includes(q) ||
                (r.summary || '').toLowerCase().includes(q),
        );
    }, [rows, searchQuery]);

    // Live Telemetry Counters
    const totalCount = rows.length;
    const pendingCount = rows.filter((r) => r.status === 'pending').length;
    const mergedCount = rows.filter((r) => r.status === 'merged').length;
    const flaggedCount = rows.filter(
        (r) =>
            r.validation_flags?.quote_validation_failed ||
            r.validation_flags?.dedupe_unchecked ||
            (r.dedupe_hits?.flags?.length ?? 0) > 0,
    ).length;

    const renderDossierContent = (inDrawer = false) => {
        if (!selected) return null;
        const stStyle = STATUS_STYLE[selected.status] || STATUS_STYLE.expired;
        const isEditable = ['pending', 'approved'].includes(selected.status);
        const dedupeHits = selected.dedupe_hits?.hits || [];
        const sourcesList = selected.sources || [];
        const invalidQuotes = selected.validation_flags?.invalid_quotes || [];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Metadata Telemetry Grid */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: 6,
                        padding: '6px 8px',
                        background: darkMode ? '#0f131a' : '#f8fafc',
                        border: `1px solid ${t.border}`,
                    }}
                >
                    <div>
                        <div className="font-mono uppercase" style={{ fontSize: 9, color: t.textMuted }}>
                            TOPIC KEY // CATEGORY
                        </div>
                        <div className="font-mono" style={{ fontSize: 10.5, color: t.textPrimary, fontWeight: 600 }}>
                            {selected.topic_key} · <span style={{ color: themeColor }}>{selected.category}</span>
                        </div>
                    </div>
                    <div>
                        <div className="font-mono uppercase" style={{ fontSize: 9, color: t.textMuted }}>
                            TARGET NOTEBOOK
                        </div>
                        <div className="font-mono" style={{ fontSize: 10.5, color: '#38bdf8' }}>
                            {selected.target_notebook_id || 'KASIR_CONSULT'}
                        </div>
                    </div>
                    <div>
                        <div className="font-mono uppercase" style={{ fontSize: 9, color: t.textMuted }}>
                            EFFECTIVE // CREATED
                        </div>
                        <div className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                            {selected.effective_date || 'Immediate'} ·{' '}
                            {new Date(selected.created_at).toLocaleDateString('en-US')}
                        </div>
                    </div>
                    <div>
                        <div className="font-mono uppercase" style={{ fontSize: 9, color: t.textMuted }}>
                            MERGE // REVIEW STATE
                        </div>
                        <div className="font-mono" style={{ fontSize: 10, color: stStyle.color }}>
                            {selected.merged_source_id
                                ? `SRC: ${selected.merged_source_id.slice(0, 10)}…`
                                : selected.reviewer_id
                                  ? `By ${selected.reviewer_id.slice(0, 8)}`
                                  : 'Awaiting Triage'}
                        </div>
                    </div>
                </div>

                {/* Validation / Quote Alert Strip if Flagged */}
                {(selected.validation_flags?.quote_validation_failed ||
                    selected.validation_flags?.dedupe_unchecked ||
                    invalidQuotes.length > 0) && (
                    <div
                        style={{
                            padding: '6px 8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderLeft: '3px solid #ef4444',
                        }}
                    >
                        <div
                            className="font-mono uppercase"
                            style={{ fontSize: 10, fontWeight: 700, color: '#f87171', marginBottom: 2 }}
                        >
                            <WarningOutlined /> VALIDATION FLAGS DETECTED
                        </div>
                        <div style={{ fontSize: 11, color: t.textSecondary }}>
                            {selected.validation_flags?.quote_validation_failed && (
                                <div>
                                    • <strong>Quote Validation Failed:</strong> Approving/merging is locked until quotes match official source text.
                                </div>
                            )}
                            {selected.validation_flags?.dedupe_unchecked && (
                                <div>• Deduplication check against curriculum chunks was skipped.</div>
                            )}
                            {invalidQuotes.map((iq, idx) => (
                                <div key={idx} className="font-mono" style={{ fontSize: 10 }}>
                                    • [{iq.url}]: {iq.reason}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB 01: CURRICULUM EDITOR */}
                {(inDrawer || inspectorTab === 'editor') && (
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
                                <FileProtectOutlined /> CURRICULUM SYNTHESIS & SUMMARY EDITOR //
                            </span>
                            {isEditable && (
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<SaveOutlined />}
                                    loading={busy}
                                    onClick={saveEdit}
                                    style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                >
                                    Save Summary
                                </Button>
                            )}
                        </div>

                        <Form form={form} layout="vertical">
                            <Form.Item
                                name="title"
                                label="Regulation / Curriculum Entry Title"
                                rules={[{ required: true, message: 'Title is required' }]}
                                style={{ marginBottom: 8 }}
                            >
                                <Input
                                    size="small"
                                    disabled={!isEditable}
                                    style={{ borderRadius: 0 }}
                                />
                            </Form.Item>
                            <Form.Item
                                name="summary"
                                label="Distilled Curriculum Guidance (Merged into RAG Notebook on Approve)"
                                rules={[{ required: true, message: 'Summary is required' }]}
                                style={{ marginBottom: 6 }}
                            >
                                <Input.TextArea
                                    rows={inDrawer ? 10 : 8}
                                    disabled={!isEditable}
                                    style={{
                                        borderRadius: 0,
                                        fontSize: 11.5,
                                        lineHeight: 1.55,
                                    }}
                                />
                            </Form.Item>
                        </Form>
                    </div>
                )}

                {/* TAB 02: CITATION SOURCES & VERIFIED QUOTES */}
                {(inDrawer || inspectorTab === 'sources') && (
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
                            <LinkOutlined /> OFFICIAL CITATION SOURCES & QUOTED EVIDENCE // [{sourcesList.length}]
                        </div>
                        {sourcesList.length === 0 ? (
                            <div className="font-mono" style={{ fontSize: 11, color: t.textMuted }}>
                                No external URL citations recorded for this item.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {sourcesList.map((s, idx) => (
                                    <div
                                        key={`${s.url}-${idx}`}
                                        style={{
                                            padding: '6px 8px',
                                            border: `1px solid ${t.border}`,
                                            borderLeft: `2px solid ${s.fetch_error ? '#ef4444' : '#38bdf8'}`,
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
                                                marginBottom: 4,
                                            }}
                                        >
                                            <a
                                                href={s.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-mono"
                                                style={{
                                                    fontSize: 10.5,
                                                    color: '#38bdf8',
                                                    wordBreak: 'break-all',
                                                }}
                                            >
                                                <LinkOutlined /> {s.url}
                                            </a>
                                            <span className="font-mono" style={{ fontSize: 9.5, color: t.textMuted }}>
                                                FETCHED: {s.fetched_at ? new Date(s.fetched_at).toLocaleString('en-US') : '—'}
                                                {s.content_sha256 ? ` · SHA: ${s.content_sha256.slice(0, 8)}` : ''}
                                            </span>
                                        </div>

                                        {s.fetch_error && (
                                            <div
                                                className="font-mono"
                                                style={{ fontSize: 10, color: '#f87171', marginBottom: 4 }}
                                            >
                                                FETCH ERROR: {s.fetch_error}
                                            </div>
                                        )}

                                        {s.quoted_snippet && (
                                            <div
                                                style={{
                                                    padding: '4px 8px',
                                                    background: darkMode ? 'rgba(255,255,255,0.03)' : '#ffffff',
                                                    borderLeft: `2px solid ${themeColor}`,
                                                    fontSize: 11,
                                                    fontStyle: 'italic',
                                                    color: t.textPrimary,
                                                }}
                                            >
                                                &ldquo;{s.quoted_snippet}&rdquo;
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 03: DEDUPE & SIMILARITY RADAR */}
                {(inDrawer || inspectorTab === 'dedupe') && (
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
                                color: '#a855f7',
                                marginBottom: 6,
                            }}
                        >
                            <RadarChartOutlined /> NOTEBOOK SIMILARITY & DEDUPLICATION RADAR // [{dedupeHits.length}]
                        </div>
                        {dedupeHits.length === 0 ? (
                            <div className="font-mono" style={{ fontSize: 11, color: '#22c55e' }}>
                                ✓ Zero duplicate or conflicting chunks detected in target curriculum notebook.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {dedupeHits.map((h) => {
                                    const isConflict = h.flag === 'mungkin bertentangan';
                                    const badgeColor = isConflict ? '#ef4444' : '#f59e0b';
                                    const pct = Math.min(100, Math.round(h.score * 100));
                                    return (
                                        <div
                                            key={h.chunk_id}
                                            style={{
                                                padding: '6px 8px',
                                                border: `1px solid ${t.border}`,
                                                borderLeft: `3px solid ${badgeColor}`,
                                                background: darkMode ? '#0f131a' : '#f8fafc',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 8,
                                                    marginBottom: 4,
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span
                                                        className="font-mono uppercase"
                                                        style={{
                                                            fontSize: 9.5,
                                                            padding: '1px 5px',
                                                            border: `1px solid ${badgeColor}`,
                                                            color: badgeColor,
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {formatDedupeFlag(h.flag)}
                                                    </span>
                                                    <span
                                                        className="font-mono"
                                                        style={{ fontSize: 10.5, fontWeight: 600, color: t.textPrimary }}
                                                    >
                                                        {h.filename}
                                                    </span>
                                                </div>
                                                <span className="font-mono" style={{ fontSize: 10, color: badgeColor }}>
                                                    SIMILARITY: {(h.score * 100).toFixed(1)}% ({h.score.toFixed(3)})
                                                </span>
                                            </div>
                                            {/* Similarity Meter Bar */}
                                            <div
                                                style={{
                                                    height: 3,
                                                    width: '100%',
                                                    background: darkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                                                    marginBottom: 5,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        width: `${pct}%`,
                                                        background: badgeColor,
                                                    }}
                                                />
                                            </div>
                                            <div style={{ fontSize: 11, color: t.textSecondary }}>
                                                {h.content_preview}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
                    message="Knowledge Research is restricted to Nusantarasoft super admins."
                    showIcon
                    style={{ borderRadius: 0 }}
                />
            }
        >
            <CMSLayout
                title="Knowledge Research"
                subTitle="Official Regulation Harvester · Evidence Verification · Curriculum RAG Merge"
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
                    {/* TOP 36PX TACTICAL TELEMETRY & PIPELINE RIBBON */}
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
                        {/* Left: Telemetry + Last Run Pill + Search + Status Pills + Category Filter */}
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
                                RSK // TRIAGE
                            </span>
                            <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                ITEMS <strong style={{ color: t.textPrimary }}>{totalCount}</strong>
                            </span>
                            <span style={{ color: t.border }}>·</span>
                            <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                PENDING <strong style={{ color: '#f59e0b' }}>{pendingCount}</strong>
                            </span>
                            <span style={{ color: t.border }}>·</span>
                            <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                MERGED <strong style={{ color: '#22c55e' }}>{mergedCount}</strong>
                            </span>
                            <span style={{ color: t.border }}>·</span>
                            <span className="font-mono" style={{ fontSize: 10, color: t.textSecondary }}>
                                FLAGGED <strong style={{ color: '#ef4444' }}>{flaggedCount}</strong>
                            </span>

                            {/* Compact Last Run Telemetry Pill */}
                            {lastRun && (
                                <Tooltip
                                    title={`Last Run (${lastRun.trigger_type}): ${new Date(
                                        lastRun.started_at,
                                    ).toLocaleString('en-US')}${
                                        lastRun.finished_at
                                            ? ` → ${new Date(lastRun.finished_at).toLocaleString('en-US')}`
                                            : ''
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (lastRun.error_message) {
                                                setShowRunErrorBanner((v) => !v);
                                            }
                                        }}
                                        className="font-mono uppercase"
                                        style={{
                                            fontSize: 9.5,
                                            padding: '2px 6px',
                                            border: `1px solid ${
                                                lastRun.status === 'completed'
                                                    ? 'rgba(34,197,94,0.45)'
                                                    : lastRun.status === 'failed'
                                                      ? 'rgba(239,68,68,0.5)'
                                                      : 'rgba(245,158,11,0.45)'
                                            }`,
                                            background:
                                                lastRun.status === 'completed'
                                                    ? 'rgba(34,197,94,0.1)'
                                                    : lastRun.status === 'failed'
                                                      ? 'rgba(239,68,68,0.12)'
                                                      : 'rgba(245,158,11,0.12)',
                                            color:
                                                lastRun.status === 'completed'
                                                    ? '#22c55e'
                                                    : lastRun.status === 'failed'
                                                      ? '#f87171'
                                                      : '#f59e0b',
                                            cursor: lastRun.error_message ? 'pointer' : 'default',
                                        }}
                                    >
                                        RUN: {lastRun.status}
                                        {typeof lastRun.stats?.itemsCreated === 'number'
                                            ? ` (+${lastRun.stats.itemsCreated})`
                                            : ''}
                                        {typeof lastRun.stats?.errors === 'number' && lastRun.stats.errors > 0
                                            ? ` · ${lastRun.stats.errors} ERR`
                                            : ''}
                                    </button>
                                </Tooltip>
                            )}

                            {/* Instant Search Input */}
                            <Input
                                size="small"
                                allowClear
                                prefix={<SearchOutlined style={{ fontSize: 11, color: t.textMuted }} />}
                                placeholder="Search title, topic, summary..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ width: 180, borderRadius: 0, fontSize: 11, height: 24 }}
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

                            {/* Category Selector */}
                            <Select
                                size="small"
                                allowClear
                                placeholder="All Categories"
                                style={{ width: 135 }}
                                value={category}
                                onChange={setCategory}
                                options={categories.map((c) => ({ value: c, label: c }))}
                            />
                        </div>

                        {/* Right: Layout Controls + Run Research Now + Reload */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                data-testid="research-toggle-list"
                                onClick={() => {
                                    if (showQueuePane && !showInspectorPane) {
                                        setShowInspectorPane(true);
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
                                data-testid="research-reset-layout"
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
                                        showQueuePane && showInspectorPane ? 'transparent' : `${themeColor}18`,
                                    color:
                                        showQueuePane && showInspectorPane ? t.textSecondary : themeColor,
                                }}
                            >
                                RESET LAYOUT
                            </button>
                            <button
                                type="button"
                                data-testid="research-focus-inspector"
                                onClick={() => {
                                    setShowQueuePane(false);
                                    setShowInspectorPane(true);
                                }}
                                className="font-mono uppercase"
                                style={{
                                    fontSize: 9.5,
                                    letterSpacing: '0.06em',
                                    padding: '2px 7px',
                                    height: 22,
                                    cursor: 'pointer',
                                    border: `1px solid ${
                                        !showQueuePane && showInspectorPane ? themeColor : t.border
                                    }`,
                                    background:
                                        !showQueuePane && showInspectorPane ? `${themeColor}22` : 'transparent',
                                    color:
                                        !showQueuePane && showInspectorPane ? themeColor : t.textSecondary,
                                }}
                            >
                                FOCUS DOSSIER
                            </button>
                            <button
                                type="button"
                                data-testid="research-toggle-inspector"
                                onClick={() => {
                                    if (showInspectorPane && !showQueuePane) {
                                        setShowQueuePane(true);
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
                                {showInspectorPane ? 'HIDE DOSSIER ▶' : '◀ SHOW DOSSIER'}
                            </button>

                            <Button
                                size="small"
                                type="primary"
                                icon={<ExperimentOutlined />}
                                onClick={runNow}
                                loading={busy}
                                style={{ borderRadius: 0, fontSize: 10.5, height: 24 }}
                            >
                                Run Research Now
                            </Button>
                            <Tooltip title="Reload Research Queue">
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

                    {/* COLLAPSIBLE LAST-RUN ERROR DIAGNOSTIC STRIP */}
                    {showRunErrorBanner && lastRun?.error_message && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                                padding: '5px 10px',
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.4)',
                                borderLeft: '3px solid #ef4444',
                                flexShrink: 0,
                            }}
                        >
                            <span className="font-mono" style={{ fontSize: 10.5, color: '#f87171' }}>
                                <strong>LAST RUN DIAGNOSTIC:</strong> {lastRun.error_message}
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowRunErrorBanner(false)}
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
                                ▲ HIDE
                            </button>
                        </div>
                    )}

                    {/* VIEWPORT-LOCKED 2-PANE SPLIT WORKSPACE */}
                    <div
                        style={{
                            flex: 1,
                            minHeight: 0,
                            display: 'grid',
                            gridTemplateColumns:
                                showQueuePane && showInspectorPane
                                    ? 'minmax(350px, 44%) 1fr'
                                    : '1fr',
                            gap: 6,
                            overflow: 'hidden',
                        }}
                    >
                        {/* LEFT PANE: RESEARCH QUEUE & SIGNAL FEED */}
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
                                        RESEARCH TRIAGE QUEUE // [{filteredRows.length}]
                                    </span>
                                    <span className="font-mono" style={{ fontSize: 9.5, color: t.textMuted }}>
                                        CLICK ITEM TO INSPECT & VERIFY
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
                                            LOADING KNOWLEDGE RESEARCH QUEUE...
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
                                                No research items match the current status or filter.
                                            </span>
                                            <Button
                                                size="small"
                                                type="primary"
                                                icon={<ExperimentOutlined />}
                                                onClick={runNow}
                                                loading={busy}
                                                style={{ borderRadius: 0, fontSize: 10.5 }}
                                            >
                                                Run Research Harvester Now
                                            </Button>
                                        </div>
                                    ) : (
                                        filteredRows.map((row) => {
                                            const isSelected = selected?.id === row.id;
                                            const stStyle = STATUS_STYLE[row.status] || STATUS_STYLE.expired;
                                            const quoteFailed = row.validation_flags?.quote_validation_failed;
                                            const dedupeUnchecked = row.validation_flags?.dedupe_unchecked;
                                            const dedupeFlags = row.dedupe_hits?.flags || [];

                                            return (
                                                <div
                                                    key={row.id}
                                                    onClick={() => {
                                                        void selectAndLoadItem(row);
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
                                                    {/* Row Top: Title + Status Badge */}
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            justifyContent: 'space-between',
                                                            gap: 6,
                                                            marginBottom: 4,
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                fontSize: 12,
                                                                fontWeight: 600,
                                                                color: t.textPrimary,
                                                                lineHeight: 1.35,
                                                            }}
                                                        >
                                                            {row.title}
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

                                                    {/* Row Middle: Category + Topic + Validation Flags */}
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
                                                                className="font-mono uppercase"
                                                                style={{
                                                                    fontSize: 9.5,
                                                                    padding: '0 5px',
                                                                    border: `1px solid ${t.border}`,
                                                                    color: themeColor,
                                                                }}
                                                            >
                                                                {row.category}
                                                            </span>
                                                            <span
                                                                className="font-mono"
                                                                style={{ fontSize: 9.5, color: t.textMuted }}
                                                            >
                                                                [{row.topic_key}]
                                                            </span>
                                                            {quoteFailed && (
                                                                <span
                                                                    className="font-mono uppercase"
                                                                    style={{
                                                                        fontSize: 9,
                                                                        padding: '0 4px',
                                                                        border: '1px solid rgba(239,68,68,0.5)',
                                                                        background: 'rgba(239,68,68,0.14)',
                                                                        color: '#f87171',
                                                                    }}
                                                                >
                                                                    INVALID QUOTE
                                                                </span>
                                                            )}
                                                            {dedupeUnchecked && (
                                                                <span
                                                                    className="font-mono uppercase"
                                                                    style={{
                                                                        fontSize: 9,
                                                                        padding: '0 4px',
                                                                        border: '1px solid rgba(168,85,247,0.45)',
                                                                        background: 'rgba(168,85,247,0.14)',
                                                                        color: '#c084fc',
                                                                    }}
                                                                >
                                                                    DEDUPE UNCHECKED
                                                                </span>
                                                            )}
                                                            {dedupeFlags.map((f) => (
                                                                <span
                                                                    key={f}
                                                                    className="font-mono uppercase"
                                                                    style={{
                                                                        fontSize: 9,
                                                                        padding: '0 4px',
                                                                        border: '1px solid rgba(245,158,11,0.45)',
                                                                        background: 'rgba(245,158,11,0.14)',
                                                                        color: '#f59e0b',
                                                                    }}
                                                                >
                                                                    {formatDedupeFlag(f)}
                                                                </span>
                                                            ))}
                                                        </div>

                                                        {/* Row Right: Timestamp + Quick Triage Actions */}
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
                                                                    <Tooltip
                                                                        title={
                                                                            quoteFailed
                                                                                ? 'Quote validation failed — inspect first'
                                                                                : 'Approve & Merge into Curriculum'
                                                                        }
                                                                    >
                                                                        <Button
                                                                            size="small"
                                                                            type="primary"
                                                                            icon={<CheckOutlined />}
                                                                            disabled={Boolean(quoteFailed)}
                                                                            loading={busy && isSelected}
                                                                            onClick={() => void approveItem(row)}
                                                                            style={{
                                                                                borderRadius: 0,
                                                                                fontSize: 9.5,
                                                                                height: 20,
                                                                                padding: '0 5px',
                                                                            }}
                                                                        >
                                                                            Merge
                                                                        </Button>
                                                                    </Tooltip>
                                                                    <Tooltip title="Reject Item">
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
                                                            {row.status === 'merged' && (
                                                                <Tooltip title="Unmerge from Curriculum Notebook">
                                                                    <Button
                                                                        size="small"
                                                                        icon={<RollbackOutlined />}
                                                                        loading={busy && isSelected}
                                                                        onClick={() => void unmergeItem(row)}
                                                                        style={{
                                                                            borderRadius: 0,
                                                                            fontSize: 9.5,
                                                                            height: 20,
                                                                            padding: '0 5px',
                                                                        }}
                                                                    >
                                                                        Unmerge
                                                                    </Button>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* RIGHT PANE: DOCKED RESEARCH DOSSIER & CURRICULUM EDITOR */}
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
                                {!selected ? (
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
                                        <span
                                            className="font-mono uppercase"
                                            style={{ fontSize: 11, color: t.textMuted }}
                                        >
                                            SELECT A RESEARCH ITEM FROM THE QUEUE TO INSPECT OR MERGE
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        {/* Sticky Dossier Header + Sub-Tabs + Primary Triage Actions */}
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
                                                            key: 'editor',
                                                            label: '[01] SUMMARY & EDITOR',
                                                        },
                                                        {
                                                            key: 'sources',
                                                            label: `[02] CITATIONS (${
                                                                (selected.sources || []).length
                                                            })`,
                                                        },
                                                        {
                                                            key: 'dedupe',
                                                            label: `[03] DEDUPE RADAR (${
                                                                (selected.dedupe_hits?.hits || []).length
                                                            })`,
                                                        },
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
                                            </div>

                                            {/* Direct Dossier Triage Action Bar */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                                {detailLoading && (
                                                    <span className="font-mono" style={{ fontSize: 9.5, color: t.textMuted }}>
                                                        SYNCING…
                                                    </span>
                                                )}
                                                {selected.status === 'pending' && (
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
                                                            disabled={Boolean(
                                                                selected.validation_flags?.quote_validation_failed,
                                                            )}
                                                            style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                                        >
                                                            Approve & Merge
                                                        </Button>
                                                    </>
                                                )}
                                                {selected.status === 'merged' && (
                                                    <Button
                                                        size="small"
                                                        icon={<RollbackOutlined />}
                                                        onClick={() => void unmergeItem()}
                                                        loading={busy}
                                                        style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                                    >
                                                        Unmerge
                                                    </Button>
                                                )}
                                                <Tooltip title="Open Full Dossier in Wide Drawer">
                                                    <Button
                                                        size="small"
                                                        icon={<ExpandAltOutlined />}
                                                        onClick={() => setPopoutDrawerOpen(true)}
                                                        style={{ borderRadius: 0, fontSize: 10, height: 22 }}
                                                    >
                                                        Full View
                                                    </Button>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        {/* Dossier Scrollable Body */}
                                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 10 }}>
                                            {renderDossierContent(false)}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* OPTIONAL POP-OUT FULL DOSSIER DRAWER */}
                <Drawer
                    width={740}
                    open={popoutDrawerOpen}
                    onClose={() => setPopoutDrawerOpen(false)}
                    title={selected?.title || 'Research Dossier'}
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
                                            disabled={Boolean(
                                                selected.validation_flags?.quote_validation_failed,
                                            )}
                                            style={{ borderRadius: 0 }}
                                        >
                                            Approve & Merge
                                        </Button>
                                    </>
                                )}
                                {selected.status === 'merged' && (
                                    <Button
                                        size="small"
                                        icon={<RollbackOutlined />}
                                        onClick={() => void unmergeItem()}
                                        loading={busy}
                                        style={{ borderRadius: 0 }}
                                    >
                                        Unmerge
                                    </Button>
                                )}
                            </div>
                        )
                    }
                >
                    {renderDossierContent(true)}
                </Drawer>
            </CMSLayout>
        </RbacGuard>
    );
}
