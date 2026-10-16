/**
 * First real employee — AI Studio UMKM Kasir (live) vs simulated Agentic OS agents (demo).
 */

import type { AgentRosterKind, OsKasirLiveSnapshot } from "./types";

export const KASIR_EMPLOYEE_SLUG = "umkm-kasir";

export function rosterKindForAgent(agentId: string, slug?: string): AgentRosterKind {
    if (agentId === KASIR_EMPLOYEE_SLUG || slug === KASIR_EMPLOYEE_SLUG) return "live";
    return "demo";
}

export function formatKasirMetricLine(snap: OsKasirLiveSnapshot): string {
    if (!snap.available) return snap.unavailableReason ?? "data tidak tersedia";
    const chats = snap.waChatsToday ?? 0;
    const tx = snap.transactionsToday ?? 0;
    const online = snap.waOnline ? "WA online" : "WA offline";
    return `${chats} chat hari ini · ${tx} transaksi · ${online}`;
}
