import { useAosStore } from "@/components/agentic-os/lib/store";
import { createMockAgentSource } from "./mockAgentSource";
import { INITIAL_AGENTS, initialActivity } from "./mockData";
import { startKasirLivePolling } from "./kasirLivePoll";
import { useOfficeStore } from "./store";

let started = false;

/**
 * Start the agent runtime once per browser tab.
 *
 * Thin slice: simulated demo agents for Agentic OS task/workflow progress,
 * plus one live AI Studio UMKM Kasir employee fed by read-only middleware metrics.
 */
export function ensureOfficeRuntime() {
    if (started || typeof window === "undefined") return;
    started = true;

    const office = useOfficeStore.getState();
    let disconnect: (() => void) | null = null;
    let stopKasir: (() => void) | null = null;

    const startHybrid = () => {
        disconnect?.();
        stopKasir?.();

        const demoAgents = INITIAL_AGENTS.map((a) => ({ ...a, rosterKind: "demo" as const }));
        office.applyEvent({ type: "roster", agents: demoAgents });
        for (const entry of [...initialActivity()].reverse()) office.applyEvent({ type: "activity", entry });
        office.applyEvent({ type: "mode", mode: "demo" });

        const source = createMockAgentSource(useOfficeStore.getState);
        office.setSource(source);
        disconnect = source.connect(office.applyEvent);

        stopKasir = startKasirLivePolling(office.applyEvent, () => useOfficeStore.getState().agents);
    };

    void useAosStore.getState().refresh().finally(startHybrid);
}
