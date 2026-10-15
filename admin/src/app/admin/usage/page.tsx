"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, ListTodo, Bot } from "lucide-react";
import { StudioLiveBanner, StudioLiveModeTag } from "@/components/ai-studio/StudioDemoBanner";
import { fetchTenantUsageMetrics, type TenantUsageMetrics } from "@/lib/usageMetricsApi";
import { AosError } from "@/components/agentic-os/lib/api";

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</p>
            {hint ? <p className="mt-1 text-[10px] text-slate-500">{hint}</p> : null}
        </div>
    );
}

export default function UsageMetricsPage() {
    const [metrics, setMetrics] = useState<TenantUsageMetrics | null>(null);
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const m = await fetchTenantUsageMetrics(days);
            setMetrics(m);
        } catch (e) {
            setError(e instanceof AosError ? e.message : "Gagal memuat pemakaian");
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("id-ID"));

    return (
        <div className="mx-auto max-w-4xl px-4 py-8">
            <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-indigo-400">Fase 3 · Pemakaian</p>
                    <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold text-white">
                        Ringkasan pemakaian toko
                        <StudioLiveModeTag />
                    </h1>
                    <p className="mt-2 max-w-xl text-sm text-slate-400">
                        Agregat dari antrian tugas AOS, aktivitas WhatsApp Kasir, crawler, builder, dan knowledge graph —
                        tanpa penghitung terpisah.
                    </p>
                    <Link href="/admin/my-agents" className="mt-2 inline-block text-xs text-indigo-300 hover:text-indigo-200">
                        ← Karyawan AI saya
                    </Link>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-400">
                    Periode
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
                    >
                        <option value={7}>7 hari</option>
                        <option value={30}>30 hari</option>
                        <option value={90}>90 hari</option>
                    </select>
                </label>
            </header>

            <StudioLiveBanner
                title="Data Live"
                detail="Angka dihitung langsung dari Postgres (tugas, sesi WA, pesan, job crawler, workflow builder, chunk KG)."
            />

            {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
            )}

            {loading ? (
                <p className="text-sm text-slate-500">Memuat…</p>
            ) : metrics && !metrics.available ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    {metrics.unavailableReason ?? "Data tidak tersedia"}
                </div>
            ) : metrics ? (
                <>
                    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard label="Karyawan AI" value={metrics.recruitedAgents} />
                        <MetricCard label="Chat WA hari ini" value={fmt(metrics.waChatsToday)} hint="Sesi dengan pesan hari ini (WIB)" />
                        <MetricCard label="Pesan masuk (periode)" value={fmt(metrics.waInboundMessages)} />
                        <MetricCard label="Balasan AI (periode)" value={fmt(metrics.waOutboundReplies)} />
                    </div>

                    <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard label="Tugas dibuat" value={fmt(metrics.tasksCreated)} />
                        <MetricCard label="Tugas selesai" value={fmt(metrics.tasksCompleted)} />
                        <MetricCard label="Tugas gagal" value={fmt(metrics.tasksFailed)} />
                        <MetricCard label="Job crawler" value={fmt(metrics.crawlJobs)} />
                        <MetricCard label="Workflow builder" value={fmt(metrics.builderWorkflows)} />
                        <MetricCard label="Chunk KG ter-embed" value={fmt(metrics.kgEmbeddedChunks)} />
                    </div>

                    <section>
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                            <Bot className="h-4 w-4 text-indigo-400" />
                            Per karyawan direkrut
                        </h2>
                        {metrics.agents.length === 0 ? (
                            <p className="text-sm text-slate-500">Belum ada karyawan — rekrut dari halaman Rekrut.</p>
                        ) : (
                            <ul className="space-y-2">
                                {metrics.agents.map((a) => (
                                    <li
                                        key={a.agentId}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-white">{a.name}</p>
                                            <p className="text-xs text-slate-400">
                                                {a.role} · {a.status === "paused" ? "Libur" : "Aktif"}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                                            <span>
                                                <ListTodo className="mr-1 inline h-3.5 w-3.5 text-slate-500" />
                                                {a.tasksCreated} tugas · {a.tasksCompleted} selesai
                                            </span>
                                            <span>
                                                <MessageCircle className="mr-1 inline h-3.5 w-3.5 text-slate-500" />
                                                {a.kasirWaTasks} mirror WA
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <p className="mt-6 text-[10px] text-slate-600">
                        Periode {new Date(metrics.periodStart).toLocaleDateString("id-ID")} —{" "}
                        {new Date(metrics.periodEnd).toLocaleDateString("id-ID")} · tenant {metrics.tenantId.slice(0, 8)}…
                    </p>
                </>
            ) : null}
        </div>
    );
}
