import { describe, expect, it } from 'vitest';
import { defaultGuideFlowDefinition, defaultUmkmGuideFlowDefinition } from './guide-flow.definition';
import { getNode, isUmkmFlow, resolveListenTarget, resolveUmkmListenTarget, substituteInstruction } from './guide-flow.interpreter';
import { assertXStateStateCoverage, createGuideFlowMachineLogic } from './guide-flow.xstate-factory';

describe('guide-flow.interpreter', () => {
    it('resolves keyword before default', () => {
        const def = defaultGuideFlowDefinition();
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

    it('prefers rewrittenQuery for {{lastUserMessage}} when set', () => {
        const ctx = { lastUserMessage: 'gk mau', rewrittenQuery: 'Saya tidak mau' };
        expect(substituteInstruction('Q: {{lastUserMessage}}', ctx)).toBe('Q: Saya tidak mau');
    });

    it('exposes original and rewritten placeholders', () => {
        const ctx = { lastUserMessage: 'raw', rewrittenQuery: 'formal' };
        expect(
            substituteInstruction('O={{originalUserMessage}} R={{rewrittenQuery}} L={{lastUserMessage}}', ctx),
        ).toBe('O=raw R=formal L=formal');
    });

    it('detects UMKM flow via meta.flowKind', () => {
        expect(isUmkmFlow(defaultUmkmGuideFlowDefinition())).toBe(true);
        expect(isUmkmFlow(defaultGuideFlowDefinition())).toBe(false);
    });

    it('routes UMKM listen via intent keywords', () => {
        const def = defaultUmkmGuideFlowDefinition();
        const listen = getNode(def, 'listen_intent');
        expect(listen?.type).toBe('listen');
        if (listen?.type !== 'listen') return;
        expect(resolveUmkmListenTarget(listen, 'daftar barang')).toBe('do_list');
        expect(resolveUmkmListenTarget(listen, 'laporan hari ini')).toBe('do_report');
    });
});

describe('guide-flow.xstate-factory', () => {
    it('covers all node ids as machine states', () => {
        const def = defaultGuideFlowDefinition();
        expect(assertXStateStateCoverage(def)).toBe(true);
        const machine = createGuideFlowMachineLogic(def);
        expect(machine.config.initial).toBe(def.startNodeId);
    });
});
