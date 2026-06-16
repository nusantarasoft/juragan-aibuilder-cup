import { describe, expect, it } from 'vitest';
import {
    defaultGuideFlowDefinition,
    defaultUmkmGuideFlowDefinition,
    getGuideFlowTemplate,
    GUIDE_FLOW_TEMPLATES,
    parseGuideFlowDefinition,
    safeParseGuideFlowDefinition,
    validateGuideFlowGraph,
} from './guide-flow.definition';
import { assertXStateStateCoverage } from './guide-flow.xstate-factory';

describe('guide-flow.definition', () => {
    it('parses default RAG Q&A template', () => {
        const def = defaultGuideFlowDefinition();
        expect(def.meta?.flowKind).toBe('rag_qa');
        expect(def.nodes.some((n) => n.type === 'rag')).toBe(true);
        validateGuideFlowGraph(def);
        expect(assertXStateStateCoverage(def)).toBe(true);
    });

    it('parses UMKM template with action nodes', () => {
        const def = defaultUmkmGuideFlowDefinition();
        expect(def.meta?.flowKind).toBe('umkm');
        expect(def.nodes.filter((n) => n.type === 'action').length).toBeGreaterThanOrEqual(3);
        validateGuideFlowGraph(def);
    });

    it('exposes all template kinds', () => {
        expect(Object.keys(GUIDE_FLOW_TEMPLATES).sort()).toEqual(['blank', 'rag_qa', 'umkm']);
        const blank = getGuideFlowTemplate('blank');
        expect(blank.meta?.flowKind).toBe('custom');
        validateGuideFlowGraph(blank);
    });

    it('accepts sql and action nodes', () => {
        const raw = {
            version: 1,
            startNodeId: 'start',
            meta: { flowKind: 'custom' },
            nodes: [
                { id: 'start', type: 'start', next: 'sql1' },
                {
                    id: 'sql1',
                    type: 'sql',
                    sql: 'SELECT 1',
                    context: ['tenant.schema'],
                    next: 'act1',
                },
                { id: 'act1', type: 'action', action: 'list_products', next: 'end' },
                { id: 'end', type: 'end' },
            ],
        };
        const def = parseGuideFlowDefinition(raw);
        expect(def.nodes.find((n) => n.id === 'sql1')?.type).toBe('sql');
        validateGuideFlowGraph(def);
    });

    it('rejects invalid transition target', () => {
        const bad = {
            version: 1,
            startNodeId: 'start',
            nodes: [
                { id: 'start', type: 'start', next: 'missing' },
                { id: 'end', type: 'end' },
            ],
        };
        expect(() => validateGuideFlowGraph(parseGuideFlowDefinition(bad))).toThrow(
            /does not match any node id/,
        );
    });

    it('rejects listen without default transition', () => {
        const bad = {
            version: 1,
            startNodeId: 'start',
            nodes: [
                { id: 'start', type: 'start', next: 'listen' },
                {
                    id: 'listen',
                    type: 'listen',
                    transitions: [{ when: 'keyword', value: 'hi', target: 'end' }],
                },
                { id: 'end', type: 'end' },
            ],
        };
        expect(() => validateGuideFlowGraph(parseGuideFlowDefinition(bad))).toThrow(/default transition/);
    });

    it('safeParse returns issues for malformed payload', () => {
        const result = safeParseGuideFlowDefinition({ version: 2 });
        expect(result.success).toBe(false);
    });
});
