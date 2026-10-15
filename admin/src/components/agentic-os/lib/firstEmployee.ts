/**
 * Agent roster badges — Live for persisted Agentic OS agents; Demo only in explicit UI demo mode.
 */

import type { AgentRosterKind, OsAgent } from "./types";

export const KASIR_EMPLOYEE_SLUG = "umkm-kasir";

export function rosterKindForAgent(
    _agentId: string,
    _slug?: string,
    opts?: { uiDemoMode?: boolean; agent?: Pick<OsAgent, "runner"> | null },
): AgentRosterKind {
    if (opts?.uiDemoMode) return "demo";
    return "live";
}

export function formatKasirMetricLine(snap: {
    available: boolean;
    unavailableReason?: string | null;
    waChatsToday?: number | null;
    transactionsToday?: number | null;
    waOnline?: boolean | null;
}): string {
    if (!snap.available) return snap.unavailableReason ?? "data tidak tersedia";
    const chats = snap.waChatsToday ?? 0;
    const tx = snap.transactionsToday ?? 0;
    const online = snap.waOnline ? "WA online" : "WA offline";
    return `${chats} chat hari ini · ${tx} transaksi · ${online}`;
}
