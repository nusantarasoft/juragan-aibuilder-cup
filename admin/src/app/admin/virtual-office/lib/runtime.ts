import { createMockAgentSource } from "./mockAgentSource";
import { useOfficeStore } from "./store";

let started = false;

/**
 * Start the agent runtime once per browser tab and keep it alive across
 * client-side navigation, so agents keep working while the user is watching
 * them inside a module page (ITSM, Command Center, …).
 *
 * Swap `createMockAgentSource` for a real backend adapter later.
 */
export function ensureOfficeRuntime() {
    if (started || typeof window === "undefined") return;
    started = true;
    const store = useOfficeStore.getState();
    const source = createMockAgentSource(useOfficeStore.getState);
    store.setSource(source);
    source.connect(store.applyEvent);
}
