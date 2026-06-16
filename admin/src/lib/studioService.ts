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
};

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
