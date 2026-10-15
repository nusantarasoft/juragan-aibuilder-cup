"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Moon, Pause, Play, Sun } from "lucide-react";
import {
    fetchTenantOwnerAgentSettings,
    updateTenantOwnerAgentSettings,
    type TenantOwnerAgentSettings,
} from "@/lib/myAgentsApi";
import { AosError } from "@/components/agentic-os/lib/api";

type Props = {
    agentId: string;
    compact?: boolean;
    onUpdated?: (settings: TenantOwnerAgentSettings) => void;
};

export function AgentSettingsPanel({ agentId, compact, onUpdated }: Props) {
    const [settings, setSettings] = useState<TenantOwnerAgentSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const s = await fetchTenantOwnerAgentSettings(agentId);
            setSettings(s);
        } catch (e) {
            setError(e instanceof AosError ? e.message : "Gagal memuat pengaturan");
        } finally {
            setLoading(false);
        }
    }, [agentId]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const save = async (patch: Parameters<typeof updateTenantOwnerAgentSettings>[1]) => {
        setSaving(true);
        setError(null);
        try {
            const next = await updateTenantOwnerAgentSettings(agentId, patch);
            setSettings(next);
            onUpdated?.(next);
        } catch (e) {
            setError(e instanceof AosError ? e.message : "Gagal menyimpan");
        } finally {
            setSaving(false);
        }
    };

    if (loading && !settings) {
        return <p className="text-xs text-slate-500">Memuat pengaturan…</p>;
    }
    if (!settings) {
        return error ? <p className="text-xs text-red-300">{error}</p> : null;
    }

    const paused = settings.status === "paused";
    const pad = compact ? "p-2.5" : "p-3";

    return (
        <div className={`rounded-xl border border-white/10 bg-white/[0.03] ${pad} space-y-3`}>
            <div className="flex items-center justify-between gap-2">
                <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Status karyawan</div>
                    <div className="text-sm font-semibold text-white">{paused ? "Libur" : "Aktif"}</div>
                </div>
                <button
                    type="button"
                    disabled={saving}
                    onClick={() => save({ status: paused ? "active" : "paused" })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-slate-100 hover:bg-white/10 disabled:opacity-50"
                >
                    {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                    {paused ? "Aktifkan" : "Liburkan"}
                </button>
            </div>

            <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-400">
                    Batas balasan otomatis / hari
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        min={0}
                        max={200}
                        step={5}
                        value={Math.min(settings.dailyRunBudget, 200)}
                        disabled={saving}
                        onChange={(e) => {
                            const v = Number(e.target.value);
                            setSettings({ ...settings, dailyRunBudget: v });
                        }}
                        onMouseUp={(e) => {
                            void save({ dailyRunBudget: Number((e.target as HTMLInputElement).value) });
                        }}
                        onTouchEnd={(e) => {
                            void save({ dailyRunBudget: Number((e.target as HTMLInputElement).value) });
                        }}
                        className="flex-1 accent-indigo-500"
                    />
                    <span className="w-16 text-right text-xs tabular-nums text-slate-200">
                        {settings.dailyRunBudget === 0 ? "∞" : settings.dailyRunBudget}
                    </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">0 = tanpa batas harian (trial)</p>
            </div>

            <div>
                <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">Jam operasional (quiet hours)</span>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                            save({
                                quietHours: {
                                    enabled: !settings.quietHoursEnabled,
                                    timezone: settings.quietHoursTimezone,
                                    start: settings.quietHoursStart,
                                    end: settings.quietHoursEnd,
                                },
                            })
                        }
                        className="text-[10px] font-semibold text-indigo-300 hover:text-indigo-200"
                    >
                        {settings.quietHoursEnabled ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                </div>
                {settings.quietHoursEnabled && (
                    <div className="grid grid-cols-2 gap-2">
                        <label className="text-[10px] text-slate-400">
                            Buka
                            <input
                                type="time"
                                disabled={saving}
                                value={settings.quietHoursStart}
                                onChange={(e) => setSettings({ ...settings, quietHoursStart: e.target.value })}
                                onBlur={() =>
                                    save({
                                        quietHours: {
                                            enabled: true,
                                            timezone: settings.quietHoursTimezone,
                                            start: settings.quietHoursStart,
                                            end: settings.quietHoursEnd,
                                        },
                                    })
                                }
                                className="mt-0.5 w-full rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-white"
                            />
                        </label>
                        <label className="text-[10px] text-slate-400">
                            Tutup
                            <input
                                type="time"
                                disabled={saving}
                                value={settings.quietHoursEnd}
                                onChange={(e) => setSettings({ ...settings, quietHoursEnd: e.target.value })}
                                onBlur={() =>
                                    save({
                                        quietHours: {
                                            enabled: true,
                                            timezone: settings.quietHoursTimezone,
                                            start: settings.quietHoursStart,
                                            end: settings.quietHoursEnd,
                                        },
                                    })
                                }
                                className="mt-0.5 w-full rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-white"
                            />
                        </label>
                    </div>
                )}
                <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                    {settings.quietHoursEnabled ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                    Zona {settings.quietHoursTimezone} · di luar jam ini tidak ada balasan otomatis
                </p>
            </div>

            {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
    );
}
