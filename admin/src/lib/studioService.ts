import { gql } from '@apollo/client';
import { getStoredToken } from '@/lib/graphqlClient';

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';

async function graphqlRequest(query: string, variables: Record<string, any> = {}) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getStoredToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers,
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
    audience?: 'admin' | 'customer';
    context_config?: Record<string, unknown>;
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
    bucket_name?: string | null;
    parse_status: 'pending' | 'parsing' | 'done' | 'error';
    parse_stage?: 'queued' | 'extracting' | 'chunking' | 'embedding' | 'done' | 'error' | string;
    parse_error?: string | null;
    embed_total?: number;
    embed_done?: number;
    parse_progress: number;
    chunk_count: number;
    created_at: string;
}

export interface StudioConversation {
    id: string;
    notebook_id: string;
    title: string;
    created_at: string;
    updated_at?: string;
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
    references: { content: string; docName: string; score: number; chunkId?: string }[];
}

export type StudioOutputType =
    | 'report'
    | 'mind_map'
    | 'quiz'
    | 'flashcards'
    | 'faq'
    | 'audio_script'
    | 'video_overview'
    | 'brief'
    | 'data_table'
    | 'study_guide'
    | 'briefing_doc'
    | 'timeline'
    | 'blog_post';

export interface StudioOutput {
    id: string;
    notebook_id: string;
    output_type: StudioOutputType;
    title: string;
    content: string;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at?: string;
}

export interface StudioNote {
    id: string;
    notebook_id: string;
    user_id?: string | null;
    title: string;
    content: string;
    origin: 'manual' | 'chat' | 'output';
    source_output_id?: string | null;
    created_at: string;
    updated_at?: string;
}

export interface StudioChunk {
    id: string;
    content: string;
    chunk_index: number;
    source_id: string;
    filename: string;
    notebook_id: string;
}

export interface StudioSourceDetail {
    source: StudioSource;
    chunks: { id: string; chunk_index: number; content: string }[];
    totalChunks: number;
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

export interface StudioPlaygroundResult {
    output: string;
    latencyMs: number;
    provider: string;
    model: string;
    inputChars: number;
    outputChars: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
}

export type GuideFlowTemplateKind = 'rag_qa' | 'umkm' | 'blank';

export interface GuideFlowTemplateInfo {
    kind: GuideFlowTemplateKind;
    label: string;
    description: string;
}

export interface GuideFlowValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    nodeCount: number;
    flowKind?: string;
    xstateCoverage: boolean;
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

    async createNotebook(
        name: string,
        description: string,
        userId: string,
        audience: 'admin' | 'customer' = 'admin',
    ): Promise<StudioNotebook> {
        const data = await graphqlRequest(`
            mutation($name: String!, $description: String, $userId: String!, $audience: String) {
                createStudioNotebook(name: $name, description: $description, userId: $userId, audience: $audience)
            }
        `, { name, description, userId, audience });
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

    async updateNotebook(
        notebookId: string,
        patch: { name?: string; description?: string; chatInstruction?: string; icon?: string },
    ): Promise<StudioNotebook> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $name: String, $description: String, $chatInstruction: String, $icon: String) {
                updateStudioNotebook(
                    notebookId: $notebookId
                    name: $name
                    description: $description
                    chatInstruction: $chatInstruction
                    icon: $icon
                )
            }
        `, {
            notebookId,
            name: patch.name ?? null,
            description: patch.description ?? null,
            chatInstruction: patch.chatInstruction ?? null,
            icon: patch.icon ?? null,
        });
        return data.updateStudioNotebook;
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

    async importUrl(notebookId: string, url: string): Promise<StudioSource> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $url: String!) {
                importStudioUrl(notebookId: $notebookId, url: $url)
            }
        `, { notebookId, url });
        return data.importStudioUrl;
    },

    async addTextSource(notebookId: string, title: string, content: string): Promise<StudioSource> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $title: String!, $content: String!) {
                studioAddTextSource(notebookId: $notebookId, title: $title, content: $content)
            }
        `, { notebookId, title, content });
        return data.studioAddTextSource;
    },

    async createShareLink(notebookId: string): Promise<{ token: string; isShared: boolean }> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!) {
                studioCreateShareLink(notebookId: $notebookId)
            }
        `, { notebookId });
        return data.studioCreateShareLink;
    },

    async revokeShareLink(notebookId: string): Promise<boolean> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!) {
                studioRevokeShareLink(notebookId: $notebookId)
            }
        `, { notebookId });
        return data.studioRevokeShareLink;
    },

    async synthesizeAudio(
        notebookId: string,
        outputId: string,
        language?: string,
    ): Promise<{ url: string; cached: boolean }> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $outputId: String!, $language: String) {
                studioSynthesizeAudio(notebookId: $notebookId, outputId: $outputId, language: $language)
            }
        `, { notebookId, outputId, language: language ?? null });
        return data.studioSynthesizeAudio;
    },

    /** Public (unauthenticated) fetch of a shared notebook by token. */
    async getSharedNotebook(token: string): Promise<{
        notebook: { id: string; name: string; description?: string; icon?: string; created_at: string; updated_at: string };
        sources: { id: string; filename: string; file_type?: string; parse_status: string }[];
        outputs: StudioOutput[];
    }> {
        const url = `${GRAPHQL_URL.replace("/graphql", "")}/studio/shared/${encodeURIComponent(token)}`;
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(res.status === 404 ? "Notebook tidak ditemukan atau tidak dibagikan" : `Gagal memuat (${res.status})`);
        }
        return res.json();
    },

    // ── Chat ─────────────────────────────────

    async chat(
        notebookId: string,
        question: string,
        conversationId?: string,
        userId?: string,
        options?: { sourceIds?: string[]; language?: string },
    ): Promise<ChatResponse> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $question: String!, $conversationId: String, $userId: String, $sourceIds: [String!], $language: String) {
                studioChat(
                    notebookId: $notebookId
                    question: $question
                    conversationId: $conversationId
                    userId: $userId
                    sourceIds: $sourceIds
                    language: $language
                )
            }
        `, {
            notebookId,
            question,
            conversationId,
            userId,
            sourceIds: options?.sourceIds === undefined ? null : options.sourceIds,
            language: options?.language ?? null,
        });
        return data.studioChat;
    },

    /**
     * Streaming chat over Server-Sent Events. Invokes callbacks as the answer is
     * produced. Falls back callers should use {@link chat} if this throws.
     *  - onMeta  → conversationId + references (once, before tokens)
     *  - onDelta → each answer fragment
     *  - onDone  → final answer + references
     */
    async chatStream(
        notebookId: string,
        question: string,
        callbacks: {
            onMeta?: (data: { conversationId: string; references: ChatResponse['references'] }) => void;
            onDelta?: (text: string) => void;
            onDone?: (data: ChatResponse) => void;
        },
        options?: { conversationId?: string; userId?: string; sourceIds?: string[]; language?: string; signal?: AbortSignal },
    ): Promise<void> {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const token = getStoredToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const url = `${GRAPHQL_URL.replace('/graphql', '')}/studio/chat/stream`;
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                notebookId,
                question,
                conversationId: options?.conversationId,
                sourceIds: options?.sourceIds === undefined ? undefined : options.sourceIds,
                language: options?.language ?? undefined,
            }),
            signal: options?.signal,
        });

        if (!response.ok || !response.body) {
            let msg = `Stream failed (${response.status})`;
            try {
                const j = await response.json();
                msg = j.message || msg;
            } catch { /* non-JSON error body */ }
            throw new Error(msg);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const dispatch = (rawEvent: string) => {
            const lines = rawEvent.split('\n');
            let event = 'message';
            let dataStr = '';
            for (const line of lines) {
                if (line.startsWith('event:')) event = line.slice(6).trim();
                else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
            }
            if (!dataStr) return;
            let data: any;
            try {
                data = JSON.parse(dataStr);
            } catch {
                return;
            }
            if (event === 'meta') callbacks.onMeta?.(data);
            else if (event === 'delta') callbacks.onDelta?.(typeof data.text === 'string' ? data.text : '');
            else if (event === 'done') callbacks.onDone?.(data);
            else if (event === 'error') throw new Error(data.message || 'Streaming error');
        };

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let sep: number;
            while ((sep = buffer.indexOf('\n\n')) !== -1) {
                const rawEvent = buffer.slice(0, sep);
                buffer = buffer.slice(sep + 2);
                dispatch(rawEvent);
            }
        }
        if (buffer.trim()) dispatch(buffer);
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

    // ── Notes ────────────────────────────────

    async listNotes(notebookId: string): Promise<StudioNote[]> {
        const data = await graphqlRequest(`
            query($notebookId: String!) {
                studioNotes(notebookId: $notebookId)
            }
        `, { notebookId });
        return data.studioNotes || [];
    },

    async createNote(
        notebookId: string,
        payload: { title?: string; content?: string; origin?: 'manual' | 'chat' | 'output'; sourceOutputId?: string },
    ): Promise<StudioNote> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $title: String, $content: String, $origin: String, $sourceOutputId: String) {
                createStudioNote(
                    notebookId: $notebookId
                    title: $title
                    content: $content
                    origin: $origin
                    sourceOutputId: $sourceOutputId
                )
            }
        `, {
            notebookId,
            title: payload.title ?? null,
            content: payload.content ?? null,
            origin: payload.origin ?? null,
            sourceOutputId: payload.sourceOutputId ?? null,
        });
        return data.createStudioNote;
    },

    async updateNote(noteId: string, patch: { title?: string; content?: string }): Promise<StudioNote> {
        const data = await graphqlRequest(`
            mutation($noteId: String!, $title: String, $content: String) {
                updateStudioNote(noteId: $noteId, title: $title, content: $content)
            }
        `, { noteId, title: patch.title ?? null, content: patch.content ?? null });
        return data.updateStudioNote;
    },

    async deleteNote(noteId: string): Promise<boolean> {
        const data = await graphqlRequest(`
            mutation($noteId: String!) {
                deleteStudioNote(noteId: $noteId)
            }
        `, { noteId });
        return data.deleteStudioNote;
    },

    async convertNoteToSource(noteId: string): Promise<StudioSource> {
        const data = await graphqlRequest(`
            mutation($noteId: String!) {
                convertStudioNoteToSource(noteId: $noteId)
            }
        `, { noteId });
        return data.convertStudioNoteToSource;
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

    async getChunk(chunkId: string): Promise<StudioChunk> {
        const data = await graphqlRequest(`
            query($chunkId: String!) {
                studioChunk(chunkId: $chunkId)
            }
        `, { chunkId });
        return data.studioChunk;
    },

    async getSourceDetail(notebookId: string, sourceId: string): Promise<StudioSourceDetail | null> {
        const data = await graphqlRequest(`
            query($notebookId: String!, $sourceId: String!) {
                studioSourceDetail(notebookId: $notebookId, sourceId: $sourceId)
            }
        `, { notebookId, sourceId });
        return data.studioSourceDetail ?? null;
    },

    async generateBrief(notebookId: string, force = false): Promise<{ summary: string; cached: boolean; outputId?: string }> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $force: Boolean) {
                studioGenerateBrief(notebookId: $notebookId, force: $force)
            }
        `, { notebookId, force });
        return data.studioGenerateBrief;
    },

    async listOutputs(notebookId: string): Promise<StudioOutput[]> {
        const data = await graphqlRequest(`
            query($notebookId: String!) {
                studioOutputs(notebookId: $notebookId)
            }
        `, { notebookId });
        return data.studioOutputs || [];
    },

    async deleteOutput(outputId: string): Promise<boolean> {
        const data = await graphqlRequest(`
            mutation($outputId: String!) {
                deleteStudioOutput(outputId: $outputId)
            }
        `, { outputId });
        return data.deleteStudioOutput;
    },

    async generateOutput(
        notebookId: string,
        outputType: StudioOutputType,
        options?: { query?: string; sourceIds?: string[]; audioLength?: "short" | "default" | "long"; language?: string },
    ): Promise<StudioOutput> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $outputType: String!, $query: String, $sourceIds: [String!], $audioLength: String, $language: String) {
                studioGenerateOutput(
                    notebookId: $notebookId
                    outputType: $outputType
                    query: $query
                    sourceIds: $sourceIds
                    audioLength: $audioLength
                    language: $language
                )
            }
        `, {
            notebookId,
            outputType,
            query: options?.query ?? null,
            sourceIds: options?.sourceIds === undefined ? null : options.sourceIds,
            audioLength: options?.audioLength ?? null,
            language: options?.language ?? null,
        });
        return data.studioGenerateOutput;
    },

    async playgroundTest(params: {
        systemPrompt?: string;
        userPrompt: string;
        temperature?: number;
        maxTokens?: number;
    }): Promise<StudioPlaygroundResult> {
        const data = await graphqlRequest(`
            mutation($userPrompt: String!, $systemPrompt: String, $temperature: Float, $maxTokens: Float) {
                studioPlaygroundTest(
                    userPrompt: $userPrompt
                    systemPrompt: $systemPrompt
                    temperature: $temperature
                    maxTokens: $maxTokens
                )
            }
        `, params);
        return data.studioPlaygroundTest;
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

    async getGuideFlowTemplates(): Promise<GuideFlowTemplateInfo[]> {
        const data = await graphqlRequest(`
            query {
                studioGuideFlowTemplates
            }
        `);
        return data.studioGuideFlowTemplates || [];
    },

    async validateGuideFlow(definition: Record<string, unknown>): Promise<GuideFlowValidationResult> {
        const data = await graphqlRequest(`
            query($definition: JSONObject!) {
                studioValidateGuideFlow(definition: $definition)
            }
        `, { definition });
        return data.studioValidateGuideFlow;
    },

    async createGuideFlow(
        notebookId: string,
        name: string,
        options?: { definition?: Record<string, unknown>; template?: GuideFlowTemplateKind },
    ): Promise<StudioGuideFlow> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $name: String!, $definition: JSONObject, $template: String) {
                createStudioGuideFlow(
                    notebookId: $notebookId
                    name: $name
                    definition: $definition
                    template: $template
                )
            }
        `, {
            notebookId,
            name,
            definition: options?.definition ?? null,
            template: options?.template ?? null,
        });
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

    async reindexSource(notebookId: string, sourceId: string): Promise<boolean> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $sourceId: String!) {
                reindexStudioSource(notebookId: $notebookId, sourceId: $sourceId)
            }
        `, { notebookId, sourceId });
        return data.reindexStudioSource;
    },

    async reindexNotebook(notebookId: string): Promise<boolean> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!) {
                reindexStudioNotebook(notebookId: $notebookId)
            }
        `, { notebookId });
        return data.reindexStudioNotebook;
    },

    // ── UMKM ────────────────────────────────────────────────

    async setupUmkmNotebook(
        notebookId: string,
        tenantId?: string,
        publishGuideFlow = true,
    ): Promise<StudioUmkmSetupResult> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $tenantId: String, $publishGuideFlow: Boolean) {
                studioSetupUmkmNotebook(
                    notebookId: $notebookId
                    tenantId: $tenantId
                    publishGuideFlow: $publishGuideFlow
                )
            }
        `, { notebookId, tenantId: tenantId ?? null, publishGuideFlow });
        return data.studioSetupUmkmNotebook;
    },

    async getUmkmCommandsDefaults(): Promise<UmkmCommandsConfig> {
        const data = await graphqlRequest(`query { studioUmkmCommandsDefaults }`);
        return data.studioUmkmCommandsDefaults;
    },

    /** Preview intent for draft commands (same matcher as inbound WA). */
    async previewUmkmIntent(
        text: string,
        commands?: UmkmCommandsConfig | null,
    ): Promise<{ intent: string; confirm: 'confirm' | 'cancel' | null }> {
        const data = await graphqlRequest(
            `
            query($text: String!, $commands: JSONObject) {
                studioPreviewUmkmIntent(text: $text, commands: $commands)
            }
        `,
            { text, commands: commands ?? null },
        );
        return data.studioPreviewUmkmIntent;
    },

    async updateUmkmCommands(
        notebookId: string,
        commands: UmkmCommandsConfig,
        republishGuideFlow = true,
    ): Promise<{ notebookId: string; commands: UmkmCommandsConfig }> {
        const data = await graphqlRequest(`
            mutation($notebookId: String!, $commands: JSONObject!, $republishGuideFlow: Boolean) {
                updateStudioUmkmCommands(
                    notebookId: $notebookId
                    commands: $commands
                    republishGuideFlow: $republishGuideFlow
                )
            }
        `, { notebookId, commands, republishGuideFlow });
        return data.updateStudioUmkmCommands;
    },

    // ── WhatsApp (WAHA) ─────────────────────────────────────

    async listWhatsAppConfigs(): Promise<StudioWhatsAppConfig[]> {
        const data = await graphqlRequest(`query { studioWhatsAppConfigs }`);
        return data.studioWhatsAppConfigs || [];
    },

    async getWhatsAppConfig(tenantId?: string): Promise<StudioWhatsAppConfig | null> {
        const data = await graphqlRequest(`
            query($tenantId: String) {
                studioWhatsAppConfig(tenantId: $tenantId)
            }
        `, { tenantId: tenantId ?? null });
        return data.studioWhatsAppConfig;
    },

    async getWhatsAppSecurityMeta(): Promise<StudioWhatsAppSecurityMeta> {
        const data = await graphqlRequest(`query { studioWhatsAppSecurityMeta }`);
        return data.studioWhatsAppSecurityMeta;
    },

    async getWhatsAppSessionStatus(): Promise<StudioWhatsAppSessionStatus> {
        const data = await graphqlRequest(`query { studioWhatsAppSessionStatus }`);
        return data.studioWhatsAppSessionStatus;
    },

    async restartWahaSession(): Promise<{ status: string }> {
        const data = await graphqlRequest(`mutation { restartStudioWahaSession }`);
        return data.restartStudioWahaSession;
    },

    async syncWahaSession(): Promise<{ status: string; connected: boolean }> {
        const data = await graphqlRequest(`mutation { syncStudioWahaSession }`);
        return data.syncStudioWahaSession;
    },

    async getWahaAuthQr(session?: string): Promise<StudioWahaAuthQr> {
        const data = await graphqlRequest(`
            query($session: String) {
                studioWahaAuthQr(session: $session)
            }
        `, { session: session ?? null });
        return data.studioWahaAuthQr;
    },

    async startWahaSession(session?: string): Promise<{ status: string; connected: boolean }> {
        const data = await graphqlRequest(`
            mutation($session: String) {
                startStudioWahaSession(session: $session)
            }
        `, { session: session ?? null });
        return data.startStudioWahaSession;
    },

    async logoutWahaSession(session?: string): Promise<{ status: string }> {
        const data = await graphqlRequest(`
            mutation($session: String) {
                logoutStudioWahaSession(session: $session)
            }
        `, { session: session ?? null });
        return data.logoutStudioWahaSession;
    },

    async updateWhatsAppConfig(params: {
        tenantId?: string;
        notebookId?: string | null;
        enabled: boolean;
        allowlistPhones?: string[];
        useGuidedFlow?: boolean;
        wahaSession?: string | null;
        businessPhone?: string | null;
        label?: string | null;
    }): Promise<StudioWhatsAppConfig> {
        const data = await graphqlRequest(`
            mutation(
                $tenantId: String
                $notebookId: String
                $enabled: Boolean!
                $allowlistPhones: [String!]
                $useGuidedFlow: Boolean
                $wahaSession: String
                $businessPhone: String
                $label: String
            ) {
                updateStudioWhatsAppConfig(
                    tenantId: $tenantId
                    notebookId: $notebookId
                    enabled: $enabled
                    allowlistPhones: $allowlistPhones
                    useGuidedFlow: $useGuidedFlow
                    wahaSession: $wahaSession
                    businessPhone: $businessPhone
                    label: $label
                )
            }
        `, {
            tenantId: params.tenantId ?? null,
            notebookId: params.notebookId ?? null,
            enabled: params.enabled,
            allowlistPhones: params.allowlistPhones ?? [],
            useGuidedFlow: params.useGuidedFlow ?? false,
            wahaSession: params.wahaSession ?? null,
            businessPhone: params.businessPhone ?? null,
            label: params.label ?? null,
        });
        return data.updateStudioWhatsAppConfig;
    },

    /** Simulasi inbound WA tanpa WAHA (pipeline sama webhook). */
    async whatsAppSimChat(params: {
        tenantId: string;
        message: string;
        phone?: string;
    }): Promise<{
        answer: string;
        conversationId: string;
        path: string;
        phone: string;
        chatId: string;
    }> {
        const data = await graphqlRequest(`
            mutation($tenantId: String!, $message: String!, $phone: String) {
                studioWhatsAppSimChat(tenantId: $tenantId, message: $message, phone: $phone)
            }
        `, {
            tenantId: params.tenantId,
            message: params.message,
            phone: params.phone ?? null,
        });
        return data.studioWhatsAppSimChat;
    },

    // ── Settings ──────────────────────────────────────────────

    async getSettings(tenantId?: string): Promise<any> {
        const data = await graphqlRequest(`
            query($tenantId: String) {
                studioSettings(tenantId: $tenantId)
            }
        `, { tenantId: tenantId ?? null });
        return data.studioSettings;
    },

    async getAiStatus(tenantId?: string): Promise<any> {
        const data = await graphqlRequest(`
            query($tenantId: String) {
                studioAiStatus(tenantId: $tenantId)
            }
        `, { tenantId: tenantId ?? null });
        return data.studioAiStatus;
    },

    async testAiConnection(
        provider: string,
        tenantId?: string,
        overrides?: { ollama_base_url?: string; ollama_model?: string },
    ): Promise<any> {
        const data = await graphqlRequest(`
            mutation($provider: String!, $tenantId: String, $overrides: JSONObject) {
                studioTestAiConnection(provider: $provider, tenantId: $tenantId, overrides: $overrides)
            }
        `, { provider, tenantId: tenantId ?? null, overrides: overrides ?? null });
        return data.studioTestAiConnection;
    },

    async updateSettings(payload: any, tenantId?: string): Promise<any> {
        const data = await graphqlRequest(`
            mutation($tenantId: String, $payload: JSONObject!) {
                updateStudioSettings(tenantId: $tenantId, payload: $payload)
            }
        `, { tenantId: tenantId ?? null, payload });
        return data.updateStudioSettings;
    },
};

export type UmkmCommandIntent =
    | 'ask'
    | 'menu_hub'
    | 'list_products'
    | 'add_product'
    | 'add_stock'
    | 'purchase_hub'
    | 'list_purchases'
    | 'record_purchase'
    | 'list_sales'
    | 'record_sale'
    | 'report_hub'
    | 'sales_report'
    | 'check_stock'
    | 'help';

export interface UmkmMenuCommand {
    digit: string;
    intent: UmkmCommandIntent;
    label: string;
}

export interface UmkmCommandsConfig {
    menu: UmkmMenuCommand[];
    keywords: Partial<Record<UmkmCommandIntent, string[]>>;
    confirm: string[];
    cancel: string[];
}

export interface StudioUmkmSetupResult {
    notebookId: string;
    tenantId: string;
    contextConfig: Record<string, unknown>;
    flow?: StudioGuideFlow | null;
}

export interface StudioWhatsAppConfig {
    tenant_id: string;
    notebook_id: string | null;
    waha_session?: string | null;
    business_phone?: string | null;
    label?: string | null;
    enabled: boolean;
    allowlist_phones: string[];
    use_guided_flow: boolean;
    updated_at?: string;
}

export interface StudioWhatsAppSecurityMeta {
    allowlistRequired: boolean;
    rateLimitPerMinute: number;
}

export interface StudioWhatsAppSessionStatus {
    session: {
        name: string;
        status: string;
        connected: boolean;
        meId?: string;
        pairedButStuck?: boolean;
        engineState?: string;
    } | null;
    sessions: { name: string; status: string }[];
    version?: { version: string; engine: string } | null;
}

export interface StudioWahaAuthQr {
    available: boolean;
    imageBase64: string | null;
    mimetype: string | null;
    error?: string | null;
    connected?: boolean;
}
