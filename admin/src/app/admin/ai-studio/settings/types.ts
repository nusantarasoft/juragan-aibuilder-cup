export type LlmProvider = 'anthropic' | 'google' | 'openai' | 'ollama';
export type EmbeddingProvider = 'auto' | 'google_ai' | 'vertex' | 'openai' | 'ollama';

export interface StudioSettings {
    default_llm_provider: LlmProvider;
    default_embedding_provider: EmbeddingProvider;
    anthropic_model: string;
    anthropic_max_tokens?: number;
    anthropic_api_key_configured: boolean;
    google_api_key_configured: boolean;
    google_project_id?: string;
    google_location: string;
    google_model: string;
    google_embedding_model?: string;
    openai_model: string;
    openai_embedding_model?: string;
    openai_api_key_configured: boolean;
    ollama_base_url: string;
    ollama_model: string;
    ollama_embedding_model?: string;
    waha_dashboard_url: string;
}

export interface ProviderReadiness {
    provider: LlmProvider;
    configured: boolean;
    model: string;
    message?: string;
}

export interface StudioAiStatus {
    llmProvider: LlmProvider;
    llmModel: string;
    embeddingProvider: EmbeddingProvider;
    embeddingModel: string;
    providers: ProviderReadiness[];
    wahaDashboardUrl: string;
}

export interface AiConnectionTestResult {
    success: boolean;
    message: string;
    latencyMs: number;
    model?: string;
    provider: string;
}

export type StudioSettingsFormValues = StudioSettings & {
    anthropic_api_key?: string;
    google_api_key?: string;
    openai_api_key?: string;
    clear_anthropic_api_key?: boolean;
    clear_google_api_key?: boolean;
    clear_openai_api_key?: boolean;
};

export const PROVIDER_LABELS: Record<LlmProvider, string> = {
    anthropic: 'Anthropic (Claude)',
    google: 'Google (Gemini / Vertex)',
    openai: 'OpenAI',
    ollama: 'Ollama (Local)',
};

export const AFFECTED_MODULES = [
    'AI Studio Chat & RAG',
    'Guide Flows & Reports',
    'UMKM WhatsApp',
    'CRM AI',
    'ITSM AI',
    'Project Management AI',
    'Media Library RAG',
];
