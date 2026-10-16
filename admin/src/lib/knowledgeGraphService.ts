import { graphql } from '@/lib/graphqlClient';
import { DEFAULT_TENANT_ID } from '@/lib/graphql';

export const KNOWLEDGE_GRAPH_DATA_MODE = 'live' as const;

export type KnowledgeGraphNodeType = 'notebook' | 'source' | 'chunk';

export interface KnowledgeGraphNode {
    key: string;
    parentKey?: string;
    nodeType: KnowledgeGraphNodeType;
    label: string;
    entityId?: string;
    meta?: Record<string, unknown>;
}

export interface KnowledgeGraphStats {
    totalNodes: number;
    totalEdges: number;
    orphanedChunks: number;
    embeddedChunks: number;
}

export interface KnowledgeGraphOverview {
    stats: KnowledgeGraphStats;
    tree: KnowledgeGraphNode[];
}

export interface KnowledgeGraphSearchHit {
    chunkId: string;
    sourceId: string;
    notebookId: string;
    filename: string;
    content: string;
    similarity: number;
}

export interface KnowledgeGraphChunkDetail {
    id: string;
    notebookId: string;
    sourceId: string;
    filename: string;
    chunkIndex: number;
    content: string;
    hasEmbedding: boolean;
}

const OVERVIEW_QUERY = `
  query StudioKnowledgeGraphOverview($tenantId: String, $maxChunksPerSource: Int) {
    studioKnowledgeGraphOverview(tenantId: $tenantId, maxChunksPerSource: $maxChunksPerSource) {
      stats { totalNodes totalEdges orphanedChunks embeddedChunks }
      tree { key parentKey nodeType label entityId meta }
    }
  }
`;

const SEARCH_QUERY = `
  query StudioKnowledgeGraphSearch($tenantId: String, $query: String!, $limit: Int) {
    studioKnowledgeGraphSearch(tenantId: $tenantId, query: $query, limit: $limit) {
      chunkId sourceId notebookId filename content similarity
    }
  }
`;

const CHUNK_QUERY = `
  query StudioKnowledgeGraphChunk($tenantId: String, $chunkId: String!) {
    studioKnowledgeGraphChunk(tenantId: $tenantId, chunkId: $chunkId) {
      id notebookId sourceId filename chunkIndex content hasEmbedding
    }
  }
`;

export const knowledgeGraphService = {
    dataMode: KNOWLEDGE_GRAPH_DATA_MODE,

    async getOverview(tenantId: string = DEFAULT_TENANT_ID): Promise<KnowledgeGraphOverview> {
        const data = await graphql<{ studioKnowledgeGraphOverview: KnowledgeGraphOverview }>(OVERVIEW_QUERY, {
            variables: { tenantId, maxChunksPerSource: 40 },
        });
        return data.studioKnowledgeGraphOverview;
    },

    async search(query: string, tenantId: string = DEFAULT_TENANT_ID): Promise<KnowledgeGraphSearchHit[]> {
        const data = await graphql<{ studioKnowledgeGraphSearch: KnowledgeGraphSearchHit[] }>(SEARCH_QUERY, {
            variables: { tenantId, query, limit: 16 },
        });
        return data.studioKnowledgeGraphSearch ?? [];
    },

    async getChunk(chunkId: string, tenantId: string = DEFAULT_TENANT_ID): Promise<KnowledgeGraphChunkDetail> {
        const data = await graphql<{ studioKnowledgeGraphChunk: KnowledgeGraphChunkDetail }>(CHUNK_QUERY, {
            variables: { tenantId, chunkId },
        });
        return data.studioKnowledgeGraphChunk;
    },
};

/** Client-side sample tree when AOS ui_demo_mode is on (F1-4). */
export const DEMO_KNOWLEDGE_GRAPH_OVERVIEW: KnowledgeGraphOverview = {
    stats: { totalNodes: 1428, totalEdges: 5934, orphanedChunks: 12, embeddedChunks: 900 },
    tree: [
        {
            key: 'demo-nb',
            nodeType: 'notebook',
            label: '📓 Sample Documentation (Demo)',
            entityId: 'demo-nb',
        },
        {
            key: 'demo-src',
            parentKey: 'demo-nb',
            nodeType: 'source',
            label: 'Employee Handbook.pdf',
            entityId: 'demo-src',
        },
        {
            key: 'demo-chk-1',
            parentKey: 'demo-src',
            nodeType: 'chunk',
            label: 'Chunk #0 [embedded]',
            entityId: 'demo-chk-1',
            meta: { chunkIndex: 0, hasEmbedding: true },
        },
    ],
};
