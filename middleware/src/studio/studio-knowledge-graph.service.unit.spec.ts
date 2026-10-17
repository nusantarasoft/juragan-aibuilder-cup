import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudioKnowledgeGraphService } from './studio-knowledge-graph.service';

describe('StudioKnowledgeGraphService', () => {
    const rpc = vi.fn();
    const from = vi.fn();
    const rag = { embedText: vi.fn() };

    const svc = new StudioKnowledgeGraphService(
        { getAdminClient: () => ({ rpc, from }) } as never,
        rag as never,
    );

    beforeEach(() => {
        rpc.mockReset();
        from.mockReset();
        rag.embedText.mockReset();
    });

    it('maps overview stats and tree from RPC', async () => {
        rpc.mockImplementation((name: string) => {
            if (name === 'studio_knowledge_graph_stats') {
                return Promise.resolve({
                    data: [{ total_nodes: 10, total_edges: 8, orphaned_chunks: 1, embedded_chunks: 7 }],
                    error: null,
                });
            }
            if (name === 'studio_knowledge_graph_tree') {
                return Promise.resolve({
                    data: [
                        {
                            node_key: 'nb:abc',
                            parent_key: null,
                            node_type: 'notebook',
                            label: 'Test NB',
                            entity_id: 'abc',
                            meta: {},
                        },
                    ],
                    error: null,
                });
            }
            return Promise.resolve({ data: null, error: null });
        });

        const out = await svc.getOverview('tenant-1');
        expect(out.stats.totalNodes).toBe(10);
        expect(out.tree[0].key).toBe('nb:abc');
    });

    it('search returns empty for blank query', async () => {
        await expect(svc.search('t', '   ')).resolves.toEqual([]);
        expect(rag.embedText).not.toHaveBeenCalled();
    });

    it('getChunkDetail rejects cross-tenant notebook', async () => {
        const select = vi.fn().mockReturnThis();
        const eq = vi.fn().mockReturnThis();
        const maybeSingle = vi.fn().mockResolvedValue({
            data: {
                id: 'c1',
                notebook_id: 'nb-other',
                source_id: 's1',
                chunk_index: 0,
                content: 'hi',
                embedding: [1],
            },
            error: null,
        });
        from.mockReturnValue({ select, eq, maybeSingle });
        select.mockReturnValue({ eq, maybeSingle });

        rpc.mockResolvedValue({
            data: [{ notebook_id: 'nb-home' }],
            error: null,
        });

        await expect(svc.getChunkDetail('tenant-home', 'c1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('getChunkDetail throws when chunk missing', async () => {
        from.mockReturnValue({
            select: () => ({
                eq: () => ({
                    maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
            }),
        });
        await expect(svc.getChunkDetail('t', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
});
