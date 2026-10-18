export type LlmProvider = 'anthropic' | 'google' | 'openai' | 'ollama' | 'groq' | 'openrouter';
export type EmbeddingProvider = 'auto' | 'google_ai' | 'vertex' | 'openai' | 'ollama';

export interface StudioSettings {
    default_llm_provider: LlmProvider;
    default_embedding_provider: EmbeddingProvider;
    anthropic_model: string;
    anthropic_max_tokens?: number;
    anthropic_api_key_configured: boolean;
    google_api_key_configured: boolean;
    google_service_account_configured?: boolean;
    google_project_id?: string;
    google_location: string;
    google_model: string;
    google_embedding_model?: string;
    openai_model: string;
    openai_embedding_model?: string;
    openai_api_key_configured: boolean;
    groq_model: string;
    groq_api_key_configured: boolean;
    openrouter_model: string;
    openrouter_api_key_configured: boolean;
    ollama_base_url: string;
    ollama_model: string;
    ollama_embedding_model?: string;
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
    google_service_account_json?: string;
    openai_api_key?: string;
    groq_api_key?: string;
    openrouter_api_key?: string;
    clear_anthropic_api_key?: boolean;
    clear_google_api_key?: boolean;
    clear_google_service_account_json?: boolean;
    clear_openai_api_key?: boolean;
    clear_groq_api_key?: boolean;
    clear_openrouter_api_key?: boolean;
};

export const PROVIDER_LABELS: Record<LlmProvider, string> = {
    anthropic: 'Anthropic (Claude)',
    google: 'Google (Gemini / Vertex)',
    openai: 'OpenAI',
    groq: 'Groq',
    openrouter: 'OpenRouter',
    ollama: 'Ollama (Local)',
};

export const AFFECTED_MODULES = [
    'AI Studio Chat & RAG',
    'Guide Flows & Reports',
    'SME WhatsApp',
    'CRM AI',
    'ITSM AI',
    'Project Management AI',
    'Media Library RAG',
];
