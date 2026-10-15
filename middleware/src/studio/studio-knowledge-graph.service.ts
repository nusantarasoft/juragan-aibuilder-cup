import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RagService } from '../rag/rag.service';
import { SupabaseService } from '../supabase/supabase.service';
import { assertNoSupabaseError } from './studio-supabase.util';
import type {
    StudioKnowledgeGraphChunkDetail,
    StudioKnowledgeGraphNode,
    StudioKnowledgeGraphOverview,
    StudioKnowledgeGraphSearchHit,
    StudioKnowledgeGraphStats,
} from './studio-knowledge-graph.types';

type StatsRow = {
    total_nodes: number;
    total_edges: number;
    orphaned_chunks: number;
    embedded_chunks: number;
};

type TreeRow = {
    node_key: string;
    parent_key: string | null;
    node_type: string;
    label: string;
    entity_id: string | null;
    meta: Record<string, unknown> | null;
};

type SearchRow = {
    chunk_id: string;
    source_id: string;
    notebook_id: string;
    filename: string;
    content: string;
    similarity: number;
};

@Injectable()
export class StudioKnowledgeGraphService {
    constructor(
        private readonly supabase: SupabaseService,
        private readonly rag: RagService,
    ) {}

    private db() {
        return this.supabase.getAdminClient();
    }

    private mapStats(row: StatsRow): StudioKnowledgeGraphStats {
        return {
            totalNodes: Number(row.total_nodes ?? 0),
            totalEdges: Number(row.total_edges ?? 0),
            orphanedChunks: Number(row.orphaned_chunks ?? 0),
            embeddedChunks: Number(row.embedded_chunks ?? 0),
        };
    }

    private mapTree(rows: TreeRow[]): StudioKnowledgeGraphNode[] {
        return rows.map((r) => ({
            key: r.node_key,
            parentKey: r.parent_key ?? undefined,
            nodeType: r.node_type,
            label: r.label,
            entityId: r.entity_id ?? undefined,
            meta: r.meta ?? undefined,
        }));
    }

    async getOverview(tenantId: string, maxChunksPerSource = 40): Promise<StudioKnowledgeGraphOverview> {
        const { data: statsData, error: statsErr } = await this.db().rpc('studio_knowledge_graph_stats', {
            p_tenant_id: tenantId,
        });
        assertNoSupabaseError(statsErr);
        const statsRow = (Array.isArray(statsData) ? statsData[0] : statsData) as StatsRow | undefined;
        if (!statsRow) {
            return {
                stats: { totalNodes: 0, totalEdges: 0, orphanedChunks: 0, embeddedChunks: 0 },
                tree: [],
            };
        }

        const { data: treeData, error: treeErr } = await this.db().rpc('studio_knowledge_graph_tree', {
            p_tenant_id: tenantId,
            p_max_chunks_per_source: maxChunksPerSource,
        });
        assertNoSupabaseError(treeErr);

        return {
            stats: this.mapStats(statsRow),
            tree: this.mapTree((treeData ?? []) as TreeRow[]),
        };
    }

    async search(tenantId: string, query: string, limit = 16): Promise<StudioKnowledgeGraphSearchHit[]> {
        const trimmed = query.trim();
        if (!trimmed) return [];

        const embedding = await this.rag.embedText(trimmed);
        if (!embedding?.length) return [];

        const { data, error } = await this.db().rpc('match_studio_chunks_for_tenant', {
            p_tenant_id: tenantId,
            query_embedding: embedding,
            match_threshold: 0.32,
            match_count: Math.min(Math.max(limit, 1), 32),
        });
        assertNoSupabaseError(error);

        return ((data ?? []) as SearchRow[]).map((r) => ({
            chunkId: String(r.chunk_id),
            sourceId: String(r.source_id),
            notebookId: String(r.notebook_id),
            filename: String(r.filename),
            content: String(r.content),
            similarity: Number(r.similarity),
        }));
    }

    async getChunkDetail(tenantId: string, chunkId: string): Promise<StudioKnowledgeGraphChunkDetail> {
        const { data: chunk, error } = await this.db()
            .from('studio_source_chunks')
            .select('id, notebook_id, source_id, chunk_index, content, embedding')
            .eq('id', chunkId)
            .maybeSingle();
        assertNoSupabaseError(error);
        if (!chunk) throw new NotFoundException('Chunk not found');

        await this.assertChunkInTenant(tenantId, String(chunk.notebook_id));

        const { data: source } = await this.db()
            .from('studio_notebook_sources')
            .select('filename')
            .eq('id', chunk.source_id)
            .maybeSingle();

        return {
            id: String(chunk.id),
            notebookId: String(chunk.notebook_id),
            sourceId: String(chunk.source_id),
            filename: source?.filename ? String(source.filename) : 'Document',
            chunkIndex: Number(chunk.chunk_index ?? 0),
            content: String(chunk.content ?? ''),
            hasEmbedding: chunk.embedding != null,
        };
    }

    private async assertChunkInTenant(tenantId: string, notebookId: string): Promise<void> {
        const { data, error } = await this.db().rpc('studio_resolve_tenant_notebooks', {
            p_tenant_id: tenantId,
        });
        assertNoSupabaseError(error);
        const ids = (data ?? []).map((r: { notebook_id: string }) => String(r.notebook_id));
        if (!ids.includes(notebookId)) {
            throw new ForbiddenException('You do not have access to this knowledge graph node');
        }
    }
}
