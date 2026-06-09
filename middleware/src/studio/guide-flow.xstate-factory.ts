import { setup } from 'xstate';
import type { GuideFlowDefinition } from './guide-flow.definition';
import { getNode } from './guide-flow.interpreter';

/**
 * Maps a guide definition to an XState machine **spec** for documentation/testing.
 * Runtime execution uses GuideFlowService (RAG/async is not modeled as invoke here).
 */
export function createGuideFlowMachineLogic(def: GuideFlowDefinition) {
    const states: Record<string, { meta?: { nodeType: string } }> = {};
    for (const n of def.nodes) {
        states[n.id] = { meta: { nodeType: n.type } };
    }
    return setup({
        types: {
            context: {} as { def: GuideFlowDefinition },
            events: {} as { type: 'STEP' },
        },
    }).createMachine({
        id: 'studioGuideFlow',
        initial: def.startNodeId,
        context: { def },
        states: states as any,
    });
}

/** Returns whether every transition target in the definition exists as a state key. */
export function assertXStateStateCoverage(def: GuideFlowDefinition): boolean {
    const ids = new Set(def.nodes.map((n) => n.id));
    for (const n of def.nodes) {
        if (n.type === 'start' && !ids.has(n.next)) return false;
        if (n.type === 'message' && !ids.has(n.next)) return false;
        if (n.type === 'rag' && !ids.has(n.next)) return false;
        if (n.type === 'sql' && !ids.has(n.next)) return false;
        if (n.type === 'action' && !ids.has(n.next)) return false;
        if (n.type === 'listen') {
            for (const t of n.transitions) {
                if (!ids.has(t.target)) return false;
            }
        }
    }
    return !!getNode(def, def.startNodeId);
}
