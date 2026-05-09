import { describe, expect, it } from 'vitest';
import { defaultGuideFlowDefinition, validateGuideFlowGraph } from './guide-flow.definition';
import { getNode, resolveListenTarget, substituteInstruction } from './guide-flow.interpreter';
import { assertXStateStateCoverage, createGuideFlowMachineLogic } from './guide-flow.xstate-factory';

describe('guide-flow.interpreter', () => {
    it('resolves keyword before default', () => {
        const def = defaultGuideFlowDefinition();
        validateGuideFlowGraph(def);
        const listen = getNode(def, 'listen_main');
        expect(listen?.type).toBe('listen');
        if (listen?.type !== 'listen') return;
        expect(resolveListenTarget(listen, 'I want a refund on my order')).toBe('rag_answer');
        expect(resolveListenTarget(listen, 'bye now')).toBe('goodbye');
    });

    it('substitutes lastUserMessage placeholder', () => {
        const ctx = { lastUserMessage: 'Hello?' };
        expect(substituteInstruction('Q: {{lastUserMessage}}', ctx)).toBe('Q: Hello?');
    });
});

describe('guide-flow.xstate-factory', () => {
    it('covers all node ids as machine states', () => {
        const def = defaultGuideFlowDefinition();
        validateGuideFlowGraph(def);
        expect(assertXStateStateCoverage(def)).toBe(true);
        const machine = createGuideFlowMachineLogic(def);
        expect(machine.config.initial).toBe(def.startNodeId);
    });
});
