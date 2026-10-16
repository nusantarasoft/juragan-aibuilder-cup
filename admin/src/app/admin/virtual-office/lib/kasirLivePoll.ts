import { fetchKasirLiveSnapshot } from "@/components/agentic-os/lib/api";
import { KASIR_EMPLOYEE_SLUG } from "@/components/agentic-os/lib/firstEmployee";
import type { OsKasirLiveSnapshot } from "@/components/agentic-os/lib/types";
import { mergeKasirIntoRoster } from "./kasirLive";
import type { Agent, OfficeEvent } from "./types";

const POLL_MS = 5000;

/**
 * Poll middleware for live Kasir metrics and merge into the office roster.
 * Demo/sim agents are left untouched except for explicit Demo tagging.
 */
export function startKasirLivePolling(emit: (event: OfficeEvent) => void, getAgents: () => Agent[]) {
    let last: OsKasirLiveSnapshot | null = null;

    const tick = async () => {
        try {
            const snap = await fetchKasirLiveSnapshot();
            last = snap;
            const base = getAgents().filter((a) => a.id !== KASIR_EMPLOYEE_SLUG);
            emit({ type: "roster", agents: mergeKasirIntoRoster(base, snap) });
        } catch {
            const base = getAgents().filter((a) => a.id !== KASIR_EMPLOYEE_SLUG);
            const snap: OsKasirLiveSnapshot = last
                ? { ...last, available: false, unavailableReason: "data tidak tersedia" }
                : {
                      available: false,
                      tenantId: "default",
                      slug: KASIR_EMPLOYEE_SLUG,
                      name: "Kasir UMKM",
                      role: "UMKM WhatsApp Kasir",
                      source: "ai_studio",
                      unavailableReason: "data tidak tersedia",
                      waChatsToday: null,
                      transactionsToday: null,
                      lastActivityAt: null,
                      waOnline: null,
                  };
            emit({ type: "roster", agents: mergeKasirIntoRoster(base, snap) });
        }
    };

    void tick();
    const timer = setInterval(tick, POLL_MS);
    return () => clearInterval(timer);
}
