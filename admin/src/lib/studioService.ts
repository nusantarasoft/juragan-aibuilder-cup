import { gql } from '@apollo/client';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4001/graphql';

async function graphqlRequest(query: string, variables: Record<string, any> = {}) {
    const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
    });
    const result = await response.json();
    if (result.errors) {
        throw new Error(result.errors[0]?.message || 'GraphQL error');
    }
    return result.data;
}

export interface StudioNotebook {
    id: string;
    name: string;
    description: string;
    icon: string;
    source_count: number;
    created_at: string;
    updated_at: string;
    studio_notebook_sources?: StudioSource[];
}

export interface StudioSource {
    id: string;
    notebook_id: string;
    media_id?: string;
    filename: string;
    file_type: string;
    file_size: number;
    parse_status: 'pending' | 'parsing' | 'done' | 'error';
    parse_progress: number;
    chunk_count: number;
    created_at: string;
}

export interface StudioConversation {
    id: string;
    notebook_id: string;
    title: string;
    created_at: string;
    messages?: StudioMessage[];
}

export interface StudioMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    source_refs?: any[];
    created_at: string;
}

export interface ChatResponse {
    conversationId: string;
    answer: string;
    references: { content: string; docName: string; score: number }[];
}

export interface StudioGuideFlow {
    id: string;
    notebook_id: string;
    name: string;
    status: 'draft' | 'published';
    definition: Record<string, unknown>;
    version: number;
    created_at?: string;
    updated_at?: string;
}

export interface GuidedTurnResponse {
    conversationId: string;
    replies: { content: string; references?: { content: string; docName: string; score: number }[] }[];
    waitingForInput: boolean;
    currentNodeId: string | null;
}

export const studioService = {
    // ── Notebooks ────────────────────────────

    async getNotebooks(userId: string): Promise<StudioNotebook[]> {
        const data = await graphqlRequest(`
            query($userId: String!) {
                studioNotebooks(userId: $userId)
            }
        `, { userId });
        return data.studioNotebooks || [];
    },

    async getNotebook(notebookId: string): Promise<StudioNotebook> {
        const data = await graphqlRequest(`
            query($notebookId: String!) {
                studioNotebook(notebookId: $notebookId)
            }
        `, { notebookId });
        return data.studioNotebook;
    },

    async createNotebook(name: string, description: string, userId: string): Promise<StudioNotebook> {
        const data = await graphqlRequest(`
            mutation($name: String!, $description: String, $userId: String!) {
                createStudioNotebook(name: $name, description: $description, userId: $userId)
            }
        `, { name, description, userId });
        return data.createStudioNotebook;
    },

    async deleteNotebook(notebookId: string): Promise<boolean> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!) {
                deleteStudioNotebook(notebookId: $notebookId)
            }
        `, { notebookId });
        return data.deleteStudioNotebook;
    },

    // ── Sources ──────────────────────────────

    async addMediaToNotebook(notebookId: string, mediaId: string): Promise<StudioSource> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $mediaId: String!) {
                addMediaToNotebook(notebookId: $notebookId, mediaId: $mediaId)
            }
        `, { notebookId, mediaId });
        return data.addMediaToNotebook;
    },

    async uploadFileToNotebook(notebookId: string, file: File): Promise<StudioSource> {
        // File upload uses REST endpoint (GraphQL file upload is complex)
        const formData = new FormData();
        formData.append('file', file);
        formData.append('notebookId', notebookId);

        const response = await fetch(`${GRAPHQL_URL.replace('/graphql', '')}/studio/upload`, {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Upload failed');
        return result;
    },

    async getSourceStatus(notebookId: string): Promise<StudioSource[]> {
        const data = await graphqlRequest(`
            query($notebookId: String!) {
                studioSourceStatus(notebookId: $notebookId)
            }
        `, { notebookId });
        return data.studioSourceStatus || [];
    },

    async removeSource(notebookId: string, sourceId: string): Promise<boolean> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $sourceId: String!) {
                removeStudioSource(notebookId: $notebookId, sourceId: $sourceId)
            }
        `, { notebookId, sourceId });
        return data.removeStudioSource;
    },

    // ── Chat ─────────────────────────────────

    async chat(notebookId: string, question: string, conversationId?: string, userId?: string): Promise<ChatResponse> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $question: String!, $conversationId: String, $userId: String) {
                studioChat(notebookId: $notebookId, question: $question, conversationId: $conversationId, userId: $userId)
            }
        `, { notebookId, question, conversationId, userId });
        return data.studioChat;
    },

    async getConversations(notebookId: string): Promise<StudioConversation[]> {
        const data = await graphqlRequest(`
            query($notebookId: String!) {
                studioConversations(notebookId: $notebookId)
            }
        `, { notebookId });
        return data.studioConversations || [];
    },

    async getConversation(conversationId: string): Promise<StudioConversation> {
        const data = await graphqlRequest(`
            query($conversationId: String!) {
                studioConversation(conversationId: $conversationId)
            }
        `, { conversationId });
        return data.studioConversation;
    },

    // ── Generate ─────────────────────────────

    async generateReport(notebookId: string, query: string): Promise<string> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $query: String!) {
                studioGenerateReport(notebookId: $notebookId, query: $query)
            }
        `, { notebookId, query });
        return data.studioGenerateReport;
    },

    // ── Guide flows ───────────────────────────

    async getGuideFlows(notebookId: string): Promise<StudioGuideFlow[]> {
        const data = await graphqlRequest(`
            query($notebookId: String!) {
                studioGuideFlows(notebookId: $notebookId)
            }
        `, { notebookId });
        return data.studioGuideFlows || [];
    },

    async getGuideFlow(flowId: string): Promise<StudioGuideFlow> {
        const data = await graphqlRequest(`
            query($flowId: String!) {
                studioGuideFlow(flowId: $flowId)
            }
        `, { flowId });
        return data.studioGuideFlow;
    },

    async getPublishedGuideFlow(notebookId: string): Promise<StudioGuideFlow | null> {
        const data = await graphqlRequest(`
            query($notebookId: String!) {
                studioPublishedGuideFlow(notebookId: $notebookId)
            }
        `, { notebookId });
        return data.studioPublishedGuideFlow ?? null;
    },

    async createGuideFlow(notebookId: string, name: string, definition?: Record<string, unknown>): Promise<StudioGuideFlow> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $name: String!, $definition: JSONObject) {
                createStudioGuideFlow(notebookId: $notebookId, name: $name, definition: $definition)
            }
        `, { notebookId, name, definition: definition ?? null });
        return data.createStudioGuideFlow;
    },

    async updateGuideFlow(
        flowId: string,
        patch: { name?: string; definition?: Record<string, unknown>; status?: 'draft' | 'published' },
    ): Promise<StudioGuideFlow> {
        const variables: Record<string, unknown> = { flowId };
        if (patch.name !== undefined) variables.name = patch.name;
        if (patch.definition !== undefined) variables.definition = patch.definition;
        if (patch.status !== undefined) variables.status = patch.status;
        const data = await graphqlRequest(`
            mutation($flowId: String!, $name: String, $definition: JSONObject, $status: String) {
                updateStudioGuideFlow(flowId: $flowId, name: $name, definition: $definition, status: $status)
            }
        `, variables);
        return data.updateStudioGuideFlow;
    },

    async deleteGuideFlow(flowId: string): Promise<boolean> {
        const data = await graphqlRequest(`
            mutation($flowId: String!) {
                deleteStudioGuideFlow(flowId: $flowId)
            }
        `, { flowId });
        return data.deleteStudioGuideFlow;
    },

    async publishGuideFlow(flowId: string): Promise<StudioGuideFlow> {
        const data = await graphqlRequest(`
            mutation($flowId: String!) {
                publishStudioGuideFlow(flowId: $flowId)
            }
        `, { flowId });
        return data.publishStudioGuideFlow;
    },

    async startGuidedSession(notebookId: string, flowId: string, userId?: string): Promise<GuidedTurnResponse> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $flowId: String!, $userId: String) {
                startStudioGuidedSession(notebookId: $notebookId, flowId: $flowId, userId: $userId)
            }
        `, { notebookId, flowId, userId: userId ?? null });
        return data.startStudioGuidedSession;
    },

    async guidedChat(
        notebookId: string,
        flowId: string,
        conversationId: string,
        message: string,
        userId?: string,
    ): Promise<GuidedTurnResponse> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $flowId: String!, $conversationId: String!, $message: String!, $userId: String) {
                studioGuidedChat(notebookId: $notebookId, flowId: $flowId, conversationId: $conversationId, message: $message, userId: $userId)
            }
        `, { notebookId, flowId, conversationId, message, userId: userId ?? null });
        return data.studioGuidedChat;
    },
};
