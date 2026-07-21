import { describe, expect, it } from 'vitest';
import { defaultGuideFlowDefinition, defaultUmkmGuideFlowDefinition } from './guide-flow.definition';
import {
    getNode,
    isUmkmFlow,
    isUmkmSalesListenNode,
    resolveListenTarget,
    resolveUmkmListenTarget,
    substituteInstruction,
} from './guide-flow.interpreter';
import { assertXStateStateCoverage, createGuideFlowMachineLogic } from './guide-flow.xstate-factory';

const listen = (transitions: any[], id = 'listen_intent'): any => ({ id, type: 'listen', transitions });

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

    it('detects legacy UMKM flow (no flowKind) via a do_list listen branch', () => {
        const withDoList = {
            version: 1,
            startNodeId: 'start',
            nodes: [
                { id: 'start', type: 'start', next: 'l' },
                { id: 'l', type: 'listen', transitions: [{ when: 'default', target: 'do_list' }] },
            ],
        } as any;
        const withoutDoList = {
            version: 1,
            startNodeId: 'start',
            nodes: [
                { id: 'start', type: 'start', next: 'l' },
                { id: 'l', type: 'listen', transitions: [{ when: 'default', target: 'rag' }] },
            ],
        } as any;
        expect(isUmkmFlow(withDoList)).toBe(true);
        expect(isUmkmFlow(withoutDoList)).toBe(false);
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

describe('substituteInstruction — edge cases', () => {
    it('treats missing lastUserMessage as empty', () => {
        expect(substituteInstruction('O={{originalUserMessage}} L={{lastUserMessage}}', {})).toBe(
            'O= L=',
        );
    });

    it('falls back to original when rewrittenQuery is an empty string', () => {
        const ctx = { lastUserMessage: 'raw', rewrittenQuery: '' };
        expect(substituteInstruction('L={{lastUserMessage}} R={{rewrittenQuery}}', ctx)).toBe(
            'L=raw R=',
        );
    });
});

describe('resolveListenTarget — regex + fallback', () => {
    it('matches a regex transition', () => {
        const node = listen([
            { when: 'regex', pattern: '^hello$', target: 'greet' },
            { when: 'default', target: 'fallback' },
        ]);
        expect(resolveListenTarget(node, 'hello')).toBe('greet');
    });

    it('skips invalid regex and uses default', () => {
        const node = listen([
            { when: 'regex', pattern: '[', target: 'bad' },
            { when: 'default', target: 'fallback' },
        ]);
        expect(resolveListenTarget(node, 'anything')).toBe('fallback');
    });

    it('throws when no default transition exists and nothing matches', () => {
        const node = listen([{ when: 'keyword', value: 'never', target: 'x' }]);
        expect(() => resolveListenTarget(node, 'nomatch')).toThrow(/no default transition/);
    });
});

describe('isUmkmSalesListenNode', () => {
    it('detects the do_list branch', () => {
        expect(isUmkmSalesListenNode(listen([{ when: 'default', target: 'do_list' }]))).toBe(true);
        expect(isUmkmSalesListenNode(listen([{ when: 'default', target: 'do_ask' }]))).toBe(false);
    });
});

describe('resolveUmkmListenTarget — pending sale + full routing', () => {
    const full = listen([
        { when: 'keyword', value: 'kwmatch', target: 'kw_target' },
        { when: 'regex', pattern: '^rgx$', target: 'rgx_target' },
        { when: 'default', target: 'do_ask' },
        { when: 'keyword', value: 'zzconfirm', target: 'do_confirm' },
        { when: 'keyword', value: 'zzcancel', target: 'do_cancel' },
        { when: 'keyword', value: 'zzaddstock', target: 'do_add_stock' },
        { when: 'keyword', value: 'zzstock', target: 'do_stock' },
    ]);
    // Minimal node: default points somewhere other than do_ask/do_stock/etc.
    const minimal = listen([{ when: 'default', target: 'fallback_x' }]);

    it('routes pending-sale confirm/cancel to explicit targets', () => {
        expect(resolveUmkmListenTarget(full, 'ya', { hasPendingSale: true })).toBe('do_confirm');
        expect(resolveUmkmListenTarget(full, 'batal', { hasPendingSale: true })).toBe('do_cancel');
    });

    it('falls back to do_record / help when explicit confirm/cancel targets are absent', () => {
        expect(resolveUmkmListenTarget(minimal, 'ya', { hasPendingSale: true })).toBe('do_record');
        expect(resolveUmkmListenTarget(minimal, 'batal', { hasPendingSale: true })).toBe('help');
    });

    it('routes open questions to do_ask (or help when absent)', () => {
        expect(resolveUmkmListenTarget(full, 'bagaimana menaikkan omset')).toBe('do_ask');
        expect(resolveUmkmListenTarget(minimal, 'bagaimana menaikkan omset')).toBe('help');
    });

    it('matches keyword and regex transitions before intent detection', () => {
        expect(resolveUmkmListenTarget(full, 'ada kwmatch di sini')).toBe('kw_target');
        expect(resolveUmkmListenTarget(full, 'rgx')).toBe('rgx_target');
    });

    it('skips invalid regex transitions', () => {
        const node = listen([
            { when: 'regex', pattern: '[', target: 'bad' },
            { when: 'default', target: 'do_ask' },
        ]);
        expect(resolveUmkmListenTarget(node, 'tanya')).toBe('do_ask');
    });

    it('maps detected intents to targets (unconditional)', () => {
        expect(resolveUmkmListenTarget(minimal, 'menu toko')).toBe('do_menu_hub');
        // Bare menu digits are unambiguous (3 -> purchase_hub, 6 -> report_hub in the default menu),
        // avoiding keyword overlap with record_purchase ("belanja") / sales_report ("laporan").
        expect(resolveUmkmListenTarget(minimal, '3')).toBe('do_purchase_hub');
        expect(resolveUmkmListenTarget(minimal, '6')).toBe('do_report_hub');
        expect(resolveUmkmListenTarget(minimal, 'tambah menu')).toBe('do_add_product');
        expect(resolveUmkmListenTarget(minimal, 'daftar belanja')).toBe('do_list_purchases');
        expect(resolveUmkmListenTarget(minimal, 'catat belanja')).toBe('do_record_purchase');
        expect(resolveUmkmListenTarget(minimal, 'daftar penjualan')).toBe('do_list_sales');
        expect(resolveUmkmListenTarget(minimal, 'daftar barang')).toBe('do_list');
        expect(resolveUmkmListenTarget(minimal, 'laporan')).toBe('do_report');
        expect(resolveUmkmListenTarget(minimal, 'bantuan')).toBe('help');
        expect(resolveUmkmListenTarget(minimal, 'jual 2 mie 5000')).toBe('do_record');
    });

    it('maps add_stock/check_stock/ask with present vs absent explicit targets', () => {
        expect(resolveUmkmListenTarget(full, 'tambah stok')).toBe('do_add_stock');
        expect(resolveUmkmListenTarget(minimal, 'tambah stok')).toBe('do_stock');
        expect(resolveUmkmListenTarget(full, 'cek stok')).toBe('do_stock');
        expect(resolveUmkmListenTarget(minimal, 'cek stok')).toBe('do_list');
        expect(resolveUmkmListenTarget(full, 'tanya')).toBe('do_ask');
        expect(resolveUmkmListenTarget(minimal, 'tanya')).toBe('help');
    });

    it('uses the default branch for unrecognized input', () => {
        expect(resolveUmkmListenTarget(full, 'zxcvbnm qwerty')).toBe('do_ask');
        expect(resolveUmkmListenTarget(minimal, 'zxcvbnm qwerty')).toBe('help');
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
