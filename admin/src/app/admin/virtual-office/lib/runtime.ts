import { useAosStore } from "@/components/agentic-os/lib/store";
import { createMockAgentSource } from "./mockAgentSource";
import { createOsAgentSource } from "./osAgentSource";
import { INITIAL_AGENTS, initialActivity } from "./mockData";
import { startKasirLivePolling } from "./kasirLivePoll";
import { isUiDemoMode, resolveOfficeRuntimeKind } from "./officeRuntimeMode";
import { useOfficeStore } from "./store";

let started = false;

/**
 * Start the agent runtime once per browser tab.
 *
 * Live (default): Agentic OS agents + task queue via `osAgentSource` (GraphQL snapshot,
 * subscription + polling). Demo: only when `aos_settings.ui_demo_mode` / server flag is on.
 */
export function ensureOfficeRuntime() {
    if (started || typeof window === "undefined") return;
    started = true;

    const office = useOfficeStore.getState();
    let disconnect: (() => void) | null = null;
    let stopKasir: (() => void) | null = null;
    let unsubAos: (() => void) | null = null;

    const teardown = () => {
        disconnect?.();
        disconnect = null;
        stopKasir?.();
        stopKasir = null;
        office.setSource(null);
    };

    const startDemo = () => {
        teardown();
        useOfficeStore.setState({ activity: [] });
        const demoAgents = INITIAL_AGENTS.map((a) => ({ ...a, rosterKind: "demo" as const }));
        office.applyEvent({ type: "roster", agents: demoAgents });
        for (const entry of [...initialActivity()].reverse()) office.applyEvent({ type: "activity", entry });
        office.applyEvent({ type: "mode", mode: "demo" });

        const source = createMockAgentSource(useOfficeStore.getState);
        office.setSource(source);
        disconnect = source.connect(office.applyEvent);

        stopKasir = startKasirLivePolling(office.applyEvent, () => useOfficeStore.getState().agents, { tagNonKasirAsDemo: true });
    };

    const startLive = () => {
        teardown();
        useOfficeStore.setState({ activity: [] });
        office.applyEvent({ type: "roster", agents: [] });
        office.applyEvent({ type: "mode", mode: "live" });

        const source = createOsAgentSource(useOfficeStore.getState);
        office.setSource(source);
        disconnect = source.connect(office.applyEvent);

        stopKasir = startKasirLivePolling(office.applyEvent, () => useOfficeStore.getState().agents, { tagNonKasirAsDemo: false });
    };

    let activeKind: ReturnType<typeof resolveOfficeRuntimeKind> | null = null;

    const applyRuntimeKind = () => {
        const { settings, status, lastSync } = useAosStore.getState();
        const kind = resolveOfficeRuntimeKind(settings, status, lastSync != null);
        if (kind === activeKind) {
            if (kind === "connecting") office.applyEvent({ type: "mode", mode: "connecting" });
            return;
        }
        activeKind = kind;
        if (kind === "connecting") {
            office.applyEvent({ type: "mode", mode: "connecting" });
            return;
        }
        if (kind === "demo" || isUiDemoMode(settings)) startDemo();
        else startLive();
    };

    void useAosStore.getState().refresh().finally(applyRuntimeKind);

    unsubAos = useAosStore.subscribe((s, prev) => {
        if (s.settings?.uiDemoMode !== prev.settings?.uiDemoMode || s.status !== prev.status) applyRuntimeKind();
    });

    return () => {
        unsubAos?.();
        teardown();
        started = false;
    };
}
