"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, ShieldCheck, Users, Zap } from "lucide-react";
import {
    activateWaKasirChannel,
    addWaStaff,
    disconnectDedicatedWaInbox,
    fetchDedicatedWaAuthQr,
    fetchMyTenantStore,
    fetchWaConnectionStatus,
    fetchWaWhitelist,
    optInDedicatedWaInbox,
    requestOwnerWaOtp,
    startDedicatedWaPair,
    syncDedicatedWaPair,
    verifyOwnerWaOtp,
    type WaConnectionStatus,
} from "@/lib/connectWaApi";
import { StudioDemoBanner, StudioLiveBanner } from "@/components/ai-studio/StudioDemoBanner";

export default function ConnectWaPage() {
    const [storeId, setStoreId] = useState<string | null>(null);
    const [status, setStatus] = useState<WaConnectionStatus | null>(null);
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [mockHint, setMockHint] = useState<string | null>(null);
    const [staffPhone, setStaffPhone] = useState("");
    const [whitelist, setWhitelist] = useState<{ phone: string; isOwner: boolean; label?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [dedicatedQr, setDedicatedQr] = useState<string | null>(null);

    const reload = useCallback(async (sid: string) => {
        const [st, wl] = await Promise.all([fetchWaConnectionStatus(sid), fetchWaWhitelist(sid)]);
        setStatus(st);
        setWhitelist(wl);
        if (st.ownerPhone && !phone) setPhone(st.ownerPhone);
    }, [phone]);

    useEffect(() => {
        void (async () => {
            setLoading(true);
            setError(null);
            try {
                const store = await fetchMyTenantStore();
                if (!store?.id) {
                    setError("Toko tidak ditemukan untuk akun ini.");
                    return;
                }
                setStoreId(store.id);
                await reload(store.id);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Gagal memuat");
            } finally {
                setLoading(false);
            }
        })();
    }, [reload]);

    const onRequestOtp = async () => {
        if (!storeId) return;
        setBusy(true);
        setError(null);
        setMessage(null);
        setMockHint(null);
        try {
            const res = await requestOwnerWaOtp(storeId, phone);
            setMessage(res.message);
            if (res.mockCode) setMockHint(res.mockCode);
        } catch (e) {
            setError(e instanceof Error ? e.message : "OTP gagal");
        } finally {
            setBusy(false);
        }
    };

    const onVerifyOtp = async () => {
        if (!storeId) return;
        setBusy(true);
        setError(null);
        try {
            await verifyOwnerWaOtp(storeId, phone, otp);
            setMessage("Nomor pemilik terverifikasi.");
            setMockHint(null);
            await reload(storeId);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Verifikasi gagal");
        } finally {
            setBusy(false);
        }
    };

    const onActivate = async () => {
        if (!storeId) return;
        setBusy(true);
        setError(null);
        try {
            await activateWaKasirChannel(storeId);
            setMessage("Kasir WhatsApp aktif — outbound ke pelanggan terbuka.");
            await reload(storeId);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Aktifkan gagal");
        } finally {
            setBusy(false);
        }
    };

    const onOptInDedicated = async () => {
        if (!storeId) return;
        setBusy(true);
        setError(null);
        try {
            await optInDedicatedWaInbox(storeId);
            setMessage("Mode nomor bisnis dedicated diaktifkan — lanjut pair QR.");
            await reload(storeId);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Gagal opt-in dedicated");
        } finally {
            setBusy(false);
        }
    };

    const onStartDedicatedPair = async () => {
        if (!storeId) return;
        setBusy(true);
        setError(null);
        setDedicatedQr(null);
        try {
            await startDedicatedWaPair(storeId);
            if (status?.dedicatedPairMock) {
                setMessage("Pairing simulasi (Demo) — nomor bisnis mock tersimpan.");
            } else {
                const qr = await fetchDedicatedWaAuthQr(storeId);
                if (qr.qr) setDedicatedQr(qr.qr);
                setMessage(qr.error || "Scan QR WhatsApp bisnis Anda.");
            }
            await syncDedicatedWaPair(storeId);
            await reload(storeId);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Pair dedicated gagal");
        } finally {
            setBusy(false);
        }
    };

    const onDisconnectDedicated = async () => {
        if (!storeId) return;
        setBusy(true);
        setError(null);
        try {
            await disconnectDedicatedWaInbox(storeId);
            setDedicatedQr(null);
            setMessage("Kembali ke inbox bersama NS.");
            await reload(storeId);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Putus dedicated gagal");
        } finally {
            setBusy(false);
        }
    };

    const onAddStaff = async () => {
        if (!storeId || !staffPhone.trim()) return;
        setBusy(true);
        setError(null);
        try {
            await addWaStaff(storeId, staffPhone.trim(), "staff");
            setStaffPhone("");
            setMessage("Staff ditambahkan ke whitelist.");
            await reload(storeId);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Tambah staff gagal");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl px-4 py-8">
            <header className="mb-8">
                <p className="text-sm font-medium text-emerald-400">Fase 2 · Hubungkan WhatsApp</p>
                <h1 className="mt-1 text-2xl font-bold text-white">WhatsApp Kasir (inbox bersama NS)</h1>
                <p className="mt-2 text-sm text-slate-400">
                    Verifikasi nomor pemilik via OTP WhatsApp, kelola staff (maks {status?.maxStaff ?? 5}), lalu tap{" "}
                    <strong className="text-slate-200">Aktifkan</strong>. Pairing QR hanya untuk admin platform.
                </p>
            </header>

            {loading && <p className="text-sm text-slate-500">Memuat…</p>}
            {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
            )}
            {message && (
                <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</div>
            )}

            {status && (
                <div className="mb-6 flex flex-wrap gap-2 text-xs">
                    <span className={`rounded-full px-2 py-1 ${status.ownerPhoneVerified ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
                        <ShieldCheck className="mr-1 inline h-3 w-3" />
                        Pemilik {status.ownerPhoneVerified ? "terverifikasi" : "belum verify"}
                    </span>
                    <span className={`rounded-full px-2 py-1 ${status.kasirWaActivated ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
                        <Zap className="mr-1 inline h-3 w-3" />
                        {status.kasirWaActivated ? "Kasir WA aktif" : "Belum Aktifkan"}
                    </span>
                    <span className={`rounded-full px-2 py-1 ${status.waConnected ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-200"}`}>
                        <MessageCircle className="mr-1 inline h-3 w-3" />
                        {status.waConnected ? "WA terhubung" : "Outbound masih terkunci"}
                    </span>
                </div>
            )}

            {!loading && storeId && status && !status.ownerPhoneVerified && (
                <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <h2 className="text-sm font-semibold text-white">1 · Verifikasi nomor pemilik</h2>
                    <p className="mt-1 text-xs text-slate-500">Nomor ini dipakai untuk mengenali toko Anda di inbox WhatsApp NS.</p>
                    <input
                        className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        placeholder="628xxxxxxxxxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onRequestOtp()}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                            Kirim OTP
                        </button>
                        <input
                            className="min-w-[8rem] flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                            placeholder="Kode 6 digit"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                        />
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onVerifyOtp()}
                            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white disabled:opacity-60"
                        >
                            Verifikasi
                        </button>
                    </div>
                    {mockHint && (
                        <p className="mt-2 text-xs text-amber-300/90">QA mock OTP: {mockHint}</p>
                    )}
                </section>
            )}

            {status?.ownerPhoneVerified && !status.kasirWaActivated && (
                <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <h2 className="text-sm font-semibold text-white">2 · Aktifkan Kasir WhatsApp</h2>
                    <p className="mt-1 text-xs text-slate-500">
                        Setelah Aktifkan, Kasir bisa kirim ke pelanggan (laporan harian, dll.).
                    </p>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onActivate()}
                        className="mt-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                    >
                        Aktifkan
                    </button>
                </section>
            )}

            {status?.ownerPhoneVerified && (
                <section className="mb-8 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                    <h2 className="text-sm font-semibold text-white">Opsional · Nomor bisnis sendiri (P2-5)</h2>
                    <p className="mt-1 text-xs text-slate-500">
                        Default tetap inbox bersama NS. Dedicated = session Hermes terpisah untuk nomor toko Anda.
                    </p>
                    {status.dedicatedPairMock ? (
                        <StudioDemoBanner
                            title="Pairing dedicated — Demo"
                            detail="WA_DEDICATED_PAIR_MOCK; tidak ada QR live ke Hermes."
                        />
                    ) : (
                        <StudioLiveBanner
                            title="Pairing dedicated — Live"
                            detail="Membutuhkan WA_TENANT_DEDICATED_PAIR=1 dan Hermes bridge."
                        />
                    )}
                    {status.inboxMode === "shared" ? (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onOptInDedicated()}
                            className="mt-3 rounded-lg border border-indigo-400/40 px-4 py-2 text-sm text-indigo-200 disabled:opacity-60"
                        >
                            Upgrade ke nomor bisnis dedicated
                        </button>
                    ) : (
                        <div className="mt-3 space-y-2 text-xs text-slate-400">
                            <p>
                                Session: <code className="text-slate-300">{status.dedicatedSessionName}</code>
                                {status.dedicatedBusinessPhone
                                    ? ` · ${status.dedicatedBusinessPhone}`
                                    : " · belum pair"}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {!status.dedicatedPaired && (
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => void onStartDedicatedPair()}
                                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-60"
                                    >
                                        Mulai pair
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void onDisconnectDedicated()}
                                    className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white disabled:opacity-60"
                                >
                                    Kembali ke inbox bersama
                                </button>
                            </div>
                            {dedicatedQr && (
                                <pre className="mt-2 max-h-24 overflow-auto rounded bg-black/40 p-2 text-[10px] text-emerald-300">
                                    {dedicatedQr}
                                </pre>
                            )}
                        </div>
                    )}
                </section>
            )}

            {status?.ownerPhoneVerified && (
                <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Users className="h-4 w-4" /> Staff whitelist ({status.staffCount}/{status.maxStaff})
                    </h2>
                    <ul className="mt-2 space-y-1 text-xs text-slate-400">
                        {whitelist.map((w) => (
                            <li key={w.phone}>
                                {w.phone} {w.isOwner ? "· pemilik" : w.label ? `· ${w.label}` : ""}
                            </li>
                        ))}
                    </ul>
                    {status.staffCount < status.maxStaff && (
                        <div className="mt-3 flex gap-2">
                            <input
                                className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                                placeholder="628 staff"
                                value={staffPhone}
                                onChange={(e) => setStaffPhone(e.target.value)}
                            />
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void onAddStaff()}
                                className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white disabled:opacity-60"
                            >
                                Tambah
                            </button>
                        </div>
                    )}
                </section>
            )}

            <p className="mt-8 text-xs text-slate-600">
                Kelola lanjutan di{" "}
                <Link href="/admin/onboarding/wa-whitelist" className="text-indigo-400 underline">
                    whitelist lanjutan
                </Link>
                . Admin platform: pairing Hermes di AI Studio Gateway.
            </p>
        </div>
    );
}
