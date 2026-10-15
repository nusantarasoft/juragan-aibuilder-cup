"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { AgentSettingsPanel } from "@/components/tenant-agents/AgentSettingsPanel";
import { fetchTenantOwnerAgentSettingsList, type TenantOwnerAgentSettings } from "@/lib/myAgentsApi";
import { AosError } from "@/components/agentic-os/lib/api";

export default function MyAgentsPage() {
    const [agents, setAgents] = useState<TenantOwnerAgentSettings[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await fetchTenantOwnerAgentSettingsList();
            setAgents(list);
            setSelectedId((prev) => prev ?? list[0]?.agentId ?? null);
        } catch (e) {
            setError(e instanceof AosError ? e.message : "Gagal memuat karyawan");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    const selected = agents.find((a) => a.agentId === selectedId) ?? agents[0];

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <header className="mb-8">
                <p className="text-sm font-medium text-indigo-400">Fase 2 · Pengaturan karyawan</p>
                <h1 className="mt-1 text-2xl font-bold text-white">Karyawan AI saya</h1>
                <p className="mt-2 text-sm text-slate-400">
                    Atur libur, batas balasan harian, dan jam operasional tanpa Command Deck.
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <Link href="/admin/virtual-office" className="text-indigo-300 hover:text-indigo-200">
                        ← Virtual Office
                    </Link>
                    <Link href="/admin/usage" className="text-indigo-300 hover:text-indigo-200">
                        Ringkasan pemakaian →
                    </Link>
                </div>
            </header>

            {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
            )}

            {loading ? (
                <p className="text-sm text-slate-500">Memuat…</p>
            ) : agents.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
                    <p className="text-sm text-slate-300">Belum ada karyawan AI.</p>
                    <Link
                        href="/admin/recruit"
                        className="mt-3 inline-flex rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
                    >
                        Rekrut karyawan
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                    <ul className="space-y-2">
                        {agents.map((a) => (
                            <li key={a.agentId}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedId(a.agentId)}
                                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                                        selected?.agentId === a.agentId
                                            ? "border-indigo-400/40 bg-indigo-500/10"
                                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                                    }`}
                                >
                                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-sm font-bold text-emerald-200">
                                        {a.name.slice(0, 1)}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-white">{a.name}</span>
                                        <span className="block truncate text-xs text-slate-400">{a.role}</span>
                                        <span className="mt-0.5 inline-block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                            {a.status === "paused" ? "Libur" : "Aktif"}
                                        </span>
                                    </span>
                                    <Settings2 className="h-4 w-4 shrink-0 text-slate-500" />
                                </button>
                            </li>
                        ))}
                    </ul>
                    {selected && (
                        <div>
                            <h2 className="mb-2 text-sm font-semibold text-white">{selected.name}</h2>
                            <AgentSettingsPanel
                                agentId={selected.agentId}
                                onUpdated={(s) => setAgents((prev) => prev.map((a) => (a.agentId === s.agentId ? s : a)))}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
