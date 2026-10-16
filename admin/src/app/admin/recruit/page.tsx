"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Sparkles, Lock } from "lucide-react";
import {
    fetchRecruitCatalog,
    fetchRecruitStatus,
    recruitAgent,
    type RecruitCatalogEntry,
} from "@/lib/recruitApi";
import { useAuthStore } from "@/store/useAuthStore";
import { AosError } from "@/components/agentic-os/lib/api";

const KASIR_ID = "umkm-kasir";
const SERVICE_DESK_ID = "service-desk";
const FINANCE_ID = "finance";

function isRecruitedForTemplate(
    itemId: string,
    status: { kasirRecruited: boolean; serviceDeskRecruited: boolean; financeRecruited: boolean } | null,
) {
    if (!status) return false;
    if (itemId === KASIR_ID) return status.kasirRecruited;
    if (itemId === SERVICE_DESK_ID) return status.serviceDeskRecruited;
    if (itemId === FINANCE_ID) return status.financeRecruited;
    return false;
}

export default function RecruitPage() {
    const router = useRouter();
    const role = useAuthStore((s) => s.user?.role);
    const [catalog, setCatalog] = useState<RecruitCatalogEntry[]>([]);
    const [status, setStatus] = useState<{
        recruitedCount: number;
        maxAgents: number;
        kasirRecruited: boolean;
        serviceDeskRecruited: boolean;
        financeRecruited: boolean;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [recruitingId, setRecruitingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [cat, st] = await Promise.all([fetchRecruitCatalog(), fetchRecruitStatus()]);
            setCatalog(cat);
            setStatus(st);
        } catch (e) {
            setError(e instanceof AosError ? e.message : "Gagal memuat katalog");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    const onRecruit = async (templateId: string) => {
        setRecruitingId(templateId);
        setError(null);
        setMessage(null);
        try {
            const res = await recruitAgent(templateId);
            setMessage(res.message);
            await reload();
            if (res.waConnectRequired) {
                router.push("/admin/connect-wa");
            } else {
                router.push("/admin/virtual-office");
            }
        } catch (e) {
            setError(e instanceof AosError ? e.message : "Rekrut gagal");
        } finally {
            setRecruitingId(null);
        }
    };

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <header className="mb-8">
                <p className="text-sm font-medium text-indigo-400">Fase 3 · Rekrut agen</p>
                <h1 className="mt-1 text-2xl font-bold text-white">Rekrut karyawan</h1>
                <p className="mt-2 text-sm text-slate-400">
                    Kasir UMKM untuk WhatsApp (hubungkan WA setelah rekrut pertama). Service Desk untuk tiket ITSM. Finance
                    untuk akuntansi & laporan — data live tenant, bukan demo.
                </p>
                {status && (
                    <p className="mt-2 text-xs text-slate-500">
                        {status.recruitedCount}/{status.maxAgents} karyawan · trial
                    </p>
                )}
            </header>

            {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
            )}
            {message && (
                <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</div>
            )}

            {loading ? (
                <p className="text-sm text-slate-500">Memuat katalog…</p>
            ) : (
                <ul className="space-y-3">
                    {catalog.map((item) => {
                        const recruited = isRecruitedForTemplate(item.id, status);
                        const comingSoon = item.kind === "coming_soon";
                        const busy = recruitingId === item.id;
                        return (
                            <li
                                key={item.id}
                                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center"
                            >
                                <div
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
                                    style={{ backgroundColor: `${item.color}33`, color: item.color }}
                                >
                                    {item.name.slice(0, 1)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-base font-semibold text-white">{item.name}</h2>
                                        {comingSoon && (
                                            <span className="rounded-full bg-slate-700/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                                                Segera hadir
                                            </span>
                                        )}
                                        {recruited && (
                                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                                Sudah direkrut
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500">{item.role}</p>
                                    <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                                </div>
                                <div className="shrink-0">
                                    {item.recruitable && !recruited ? (
                                        <button
                                            type="button"
                                            disabled={recruitingId !== null}
                                            onClick={() => void onRecruit(item.id)}
                                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
                                        >
                                            <UserPlus className="h-4 w-4" />
                                            {busy ? "Merekrut…" : "Rekrut sekarang"}
                                        </button>
                                    ) : comingSoon ? (
                                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                            <Lock className="h-3.5 w-3.5" />
                                            Segera hadir
                                        </span>
                                    ) : recruited ? (
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                                                <Sparkles className="h-3.5 w-3.5" />
                                                Aktif di kantor virtual
                                            </span>
                                            {item.id === KASIR_ID ? (
                                                <button
                                                    type="button"
                                                    onClick={() => router.push("/admin/connect-wa")}
                                                    className="text-xs font-semibold text-indigo-300 underline"
                                                >
                                                    Hubungkan WhatsApp →
                                                </button>
                                            ) : item.id === SERVICE_DESK_ID ? (
                                                <Link href="/admin/itsm/tickets" className="text-xs font-semibold text-indigo-300 underline">
                                                    Buka antrian tiket →
                                                </Link>
                                            ) : item.id === FINANCE_ID ? (
                                                <Link
                                                    href="/admin/accounting/dashboard"
                                                    className="text-xs font-semibold text-indigo-300 underline"
                                                >
                                                    Buka akuntansi →
                                                </Link>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {role === "tenant_owner" && (
                <p className="mt-8 text-xs text-slate-600">
                    Template enterprise di Agent Studio tetap untuk admin platform — halaman ini untuk wedge UMKM, Service Desk,
                    Finance, plus kartu antrian F3-6…F3-9 (Segera hadir).
                </p>
            )}
        </div>
    );
}
