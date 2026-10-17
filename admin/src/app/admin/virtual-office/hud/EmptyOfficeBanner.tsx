"use client";

import React from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { GLASS, cx } from "./shared";

export function EmptyOfficeBanner() {
    return (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
            <div className={cx(GLASS, "pointer-events-auto max-w-md rounded-2xl border border-white/10 p-6 text-center shadow-2xl")}>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                    <UserPlus className="h-6 w-6" />
                </div>
                <h2 className="text-base font-semibold text-white">Belum ada karyawan AI</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Lantai kosong sengaja — rekrut Kasir UMKM dulu, lalu mereka muncul di sini dengan progress tugas live dari antrian.
                </p>
                <Link
                    href="/admin/recruit"
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
                >
                    <UserPlus className="h-4 w-4" />
                    Rekrut karyawan
                </Link>
            </div>
        </div>
    );
}
