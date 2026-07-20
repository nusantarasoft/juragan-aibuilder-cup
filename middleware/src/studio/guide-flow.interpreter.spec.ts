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
        expect(resolveUmkmListenTarget(listen, 'cek stok gula')).toBe('do_stock');
        expect(resolveUmkmListenTarget(listen, 'berapa omzet')).toBe('do_report');
        expect(resolveUmkmListenTarget(listen, 'bagaimana menaikkan omset')).toBe('do_ask');
        expect(resolveUmkmListenTarget(listen, 'bagaimana cara meningkatkan omset')).toBe('do_ask');
    });

    it('NEGATIF: stale published regex omzet/omset tidak menelan tips', () => {
        const staleListen = {
            id: 'listen_intent',
            type: 'listen' as const,
            transitions: [
                {
                    when: 'regex' as const,
                    pattern:
                        '(?:\\blaporan\\b|\\blaporkan\\b|\\brekap\\b|\\bringkasan\\b|\\bomzet\\b|\\bomset\\b|\\breport\\b|total\\s+penjualan|penjualan\\s+hari\\s+ini)',
                    target: 'do_report',
                },
                { when: 'regex' as const, pattern: '(?:\\bbagaimana\\b|\\bgimana\\b)', target: 'do_ask' },
                { when: 'default' as const, target: 'do_ask' },
            ],
        };
        // Without open-question guard, omset would win first → do_report
        expect(resolveUmkmListenTarget(staleListen, 'bagaimana menaikkan omset')).toBe('do_ask');
        expect(resolveUmkmListenTarget(staleListen, 'bagaimana cara meningkatkan omset')).toBe(
            'do_ask',
        );
        expect(resolveUmkmListenTarget(staleListen, 'berapa omzet')).toBe('do_report');
        expect(resolveUmkmListenTarget(staleListen, 'omzet hari ini')).toBe('do_report');
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
