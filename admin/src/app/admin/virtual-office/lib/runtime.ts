import { useAosStore } from "@/components/agentic-os/lib/store";
import { createMockAgentSource } from "./mockAgentSource";
import { INITIAL_AGENTS, initialActivity } from "./mockData";
import { createOsAgentSource } from "./osAgentSource";
import { useOfficeStore } from "./store";

let started = false;

/**
 * Start the agent runtime once per browser tab and keep it alive across
 * client-side navigation, so agents keep working while the user is watching
 * them inside a module page (ITSM, Command Center, …).
 *
 * Live mode: agents, tasks and activity come from the Agentic OS database
 * (middleware GraphQL). If the backend is unreachable the office falls back to
 * the local demo simulation and keeps retrying live mode in the background.
 */
export function ensureOfficeRuntime() {
    if (started || typeof window === "undefined") return;
    started = true;

    const office = useOfficeStore.getState();
    let disconnect: (() => void) | null = null;
    let retry: ReturnType<typeof setInterval> | null = null;

    const startLive = () => {
        disconnect?.();
        const source = createOsAgentSource(useOfficeStore.getState);
        office.setSource(source);
        disconnect = source.connect(office.applyEvent);
    };

    const startDemo = () => {
        office.applyEvent({ type: "roster", agents: INITIAL_AGENTS });
        for (const entry of [...initialActivity()].reverse()) office.applyEvent({ type: "activity", entry });
        office.applyEvent({ type: "mode", mode: "demo" });
        const source = createMockAgentSource(useOfficeStore.getState);
        office.setSource(source);
        disconnect = source.connect(office.applyEvent);
        retry = setInterval(async () => {
            const snap = await useAosStore.getState().refresh();
            if (!snap) return;
            if (retry) clearInterval(retry);
            retry = null;
            startLive();
        }, 20000);
    };

    void useAosStore
        .getState()
        .refresh()
        .then((snap) => (snap ? startLive() : startDemo()));
}
