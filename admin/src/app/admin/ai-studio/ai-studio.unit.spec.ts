import { describe, expect, it } from 'vitest';
import type { StudioSource } from '@/lib/studioService';
import { buildSuggestedPrompts } from './useStudioChat';
import { parseGuideFlowDefinition } from './GuideFlowFormEditor';

describe('useStudioChat.buildSuggestedPrompts', () => {
    const sources: StudioSource[] = [
        {
            id: 's1',
            notebook_id: 'nb',
            filename: 'katalog.pdf',
            file_type: 'pdf',
            file_size: 1,
            parse_status: 'done',
            parse_progress: 1,
            chunk_count: 4,
            created_at: '',
        },
    ];

    it('includes notebook name and first indexed file', () => {
        const prompts = buildSuggestedPrompts('Toko Mie Ayam', sources);
        expect(prompts.length).toBe(3);
        expect(prompts[0]).toContain('Toko Mie Ayam');
        expect(prompts[1]).toContain('katalog.pdf');
    });
});

describe('GuideFlowFormEditor.parseGuideFlowDefinition', () => {
    it('parses sql and action nodes with meta', () => {
        const result = parseGuideFlowDefinition({
            version: 1,
            startNodeId: 'start',
            meta: { flowKind: 'umkm', description: 'test' },
            nodes: [
                { id: 'start', type: 'start', next: 'act' },
                { id: 'act', type: 'action', action: 'sales_report', next: 'end' },
                { id: 'end', type: 'end' },
            ],
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.meta?.flowKind).toBe('umkm');
        expect(result.data.nodes.some((n) => n.type === 'action')).toBe(true);
    });

    it('rejects duplicate node ids', () => {
        const result = parseGuideFlowDefinition({
            version: 1,
            startNodeId: 'start',
            nodes: [
                { id: 'start', type: 'start', next: 'end' },
                { id: 'start', type: 'end' },
            ],
        });
        expect(result.ok).toBe(false);
    });

    it('requires default transition on listen', () => {
        const result = parseGuideFlowDefinition({
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
        });
        expect(result.ok).toBe(false);
    });
});
