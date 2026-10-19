import { KASIR_EMPLOYEE_SLUG } from "@/components/agentic-os/lib/firstEmployee";
import type { OsKasirLiveSnapshot } from "@/components/agentic-os/lib/types";
import type { Agent, AgentStatus } from "./types";

function kasirStatus(snap: OsKasirLiveSnapshot): AgentStatus {
    if (!snap.available) return "offline";
    if (!snap.waOnline) return "offline";
    const busy = (snap.waChatsToday ?? 0) > 0 || (snap.transactionsToday ?? 0) > 0;
    return busy ? "working" : "idle";
}

export function buildKasirAgent(snap: OsKasirLiveSnapshot): Agent {
    const status = kasirStatus(snap);
    const unavailable = !snap.available;
    const activityLine = unavailable
        ? snap.unavailableReason ?? "data tidak tersedia"
        : `Live · ${snap.waChatsToday ?? 0} chat · ${snap.transactionsToday ?? 0} transaksi hari ini`;

    return {
        id: KASIR_EMPLOYEE_SLUG,
        name: snap.name || "Kasir UMKM",
        role: snap.role || "UMKM WhatsApp Kasir",
        model: unavailable ? "AI Studio" : snap.waOnline ? "AI Studio · WA online" : "AI Studio · WA offline",
        color: "#22c55e",
        zone: "operations",
        deskId: "ops-1",
        status,
        location: "desk",
        modules: ["wa-conversations", "whatsapp-gateway", "partner"],
        skills: ["Kasir WA", "Catat jual", "Stok", "Laporan"],
        stats: {
            tasksCompleted: snap.transactionsToday ?? 0,
            successRate: snap.available ? 1 : 0,
            avgLatencyMs: 800,
            tokensToday: 0,
        },
        rosterKind: "live",
        liveUnavailable: unavailable ? snap.unavailableReason ?? "data tidak tersedia" : null,
        liveMetrics: snap.available
            ? {
                  waChatsToday: snap.waChatsToday ?? 0,
                  transactionsToday: snap.transactionsToday ?? 0,
                  waOnline: Boolean(snap.waOnline),
                  lastActivityAt: snap.lastActivityAt,
              }
            : undefined,
        task:
            !unavailable && status === "working"
                ? {
                      id: `live-${KASIR_EMPLOYEE_SLUG}`,
                      title: activityLine,
                      progress: 0.35,
                      startedAt: snap.lastActivityAt ? new Date(snap.lastActivityAt).getTime() : Date.now(),
                      moduleId: "wa-conversations",
                      route: "/admin/ai-studio/messages",
                      steps: ["Receive WA chat", "Record transaction", "Update stock"],
                  }
                : undefined,
    };
}

/** Prepend live Kasir and drop any stale Kasir row from the roster. */
export function mergeKasirIntoRoster(
    agents: Agent[],
    snap: OsKasirLiveSnapshot,
    opts?: { tagNonKasirAsDemo?: boolean },
): Agent[] {
    const fromAos = agents.find((a) => a.id === KASIR_EMPLOYEE_SLUG);
    const rest = agents.filter((a) => a.id !== KASIR_EMPLOYEE_SLUG);
    const tagDemo = opts?.tagNonKasirAsDemo ?? true;
    const tagged = tagDemo
        ? rest.map((a) => ({ ...a, rosterKind: "demo" as const }))
        : rest.map((a) => ({ ...a, rosterKind: a.rosterKind ?? ("live" as const) }));
    const kasir = buildKasirAgent(snap);
    if (fromAos?.task) {
        kasir.task = fromAos.task;
        if (fromAos.status === "working" || fromAos.status === "thinking") {
            kasir.status = fromAos.status;
        } else if (fromAos.task) {
            kasir.status = "working";
        }
    }
    return [kasir, ...tagged];
}
