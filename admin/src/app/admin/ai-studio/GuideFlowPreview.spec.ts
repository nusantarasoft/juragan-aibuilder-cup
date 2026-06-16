import { describe, expect, it } from 'vitest';
import type { GuideFlowDefinition } from './GuideFlowFormEditor';
import { buildGuideFlowEdges } from './GuideFlowPreview';

const miniDef: GuideFlowDefinition = {
    version: 1,
    startNodeId: 'start',
    nodes: [
        { id: 'start', type: 'start', next: 'listen_main' },
        {
            id: 'listen_main',
            type: 'listen',
            transitions: [
                { when: 'keyword', value: 'bye', target: 'end' },
                { when: 'default', target: 'rag_answer' },
            ],
        },
        { id: 'rag_answer', type: 'rag', instruction: 'Answer', next: 'end' },
        { id: 'end', type: 'end' },
    ],
};

describe('GuideFlowPreview.buildGuideFlowEdges', () => {
    it('lists node transitions as readable edges', () => {
        const edges = buildGuideFlowEdges(miniDef);
        expect(edges).toContain('start → listen_main');
        expect(edges.some((e) => e.includes('listen_main') && e.includes('rag_answer'))).toBe(true);
        expect(edges.some((e) => e.includes('[default]'))).toBe(true);
    });
});
