import { describe, expect, it } from 'vitest';
import { GuideFlowService } from './guide-flow.service';
import {
    defaultGuideFlowDefinition,
    defaultUmkmGuideFlowDefinition,
} from './guide-flow.definition';

function makeService(): GuideFlowService {
    return new GuideFlowService({} as any, {} as any, {} as any, {} as any, {} as any);
}

describe('GuideFlowService.validateDefinition', () => {
    const service = makeService();

    it('validates default RAG template', () => {
        const def = defaultGuideFlowDefinition();
        const result = service.validateDefinition(def);
        expect(result.valid).toBe(true);
        expect(result.nodeCount).toBeGreaterThan(5);
        expect(result.flowKind).toBe('rag_qa');
        expect(result.xstateCoverage).toBe(true);
    });

    it('validates UMKM template without rag warnings', () => {
        const def = defaultUmkmGuideFlowDefinition();
        const result = service.validateDefinition(def);
        expect(result.valid).toBe(true);
        expect(result.flowKind).toBe('umkm');
        expect(result.warnings.some((w) => w.includes('action'))).toBe(false);
    });

    it('returns errors for broken graph', () => {
        const result = service.validateDefinition({
            version: 1,
            startNodeId: 'start',
            nodes: [{ id: 'start', type: 'start', next: 'nope' }],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('warns when rag_qa flow has no rag node', () => {
        const result = service.validateDefinition({
            version: 1,
            startNodeId: 'start',
            meta: { flowKind: 'rag_qa' },
            nodes: [
                { id: 'start', type: 'start', next: 'end' },
                { id: 'end', type: 'end' },
            ],
        });
        expect(result.valid).toBe(true);
        expect(result.warnings.some((w) => w.includes('rag'))).toBe(true);
    });
});

describe('GuideFlowService.listTemplates', () => {
    it('returns rag_qa, umkm, blank', () => {
        const service = makeService();
        const templates = service.listTemplates();
        expect(templates.map((t) => t.kind).sort()).toEqual(['blank', 'rag_qa', 'umkm']);
        expect(templates.find((t) => t.kind === 'rag_qa')?.label).toBeTruthy();
    });
});
