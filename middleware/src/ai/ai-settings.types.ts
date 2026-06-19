export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export type LlmProvider = 'anthropic' | 'google' | 'openai' | 'ollama';
export type EmbeddingProvider = 'auto' | 'google_ai' | 'vertex' | 'openai' | 'ollama';

export interface StudioSettingsRow {
    tenant_id?: string;
    default_llm_provider: LlmProvider;
    default_embedding_provider: EmbeddingProvider;
    anthropic_api_key?: string | null;
    anthropic_model: string;
    anthropic_max_tokens?: number;
    google_api_key?: string | null;
    google_project_id?: string | null;
    google_location: string;
    google_model: string;
    google_embedding_model?: string;
    openai_api_key?: string | null;
    openai_model: string;
    openai_embedding_model?: string;
    ollama_base_url: string;
    ollama_model: string;
    ollama_embedding_model?: string;
    waha_dashboard_url: string;
    created_at?: string;
    updated_at?: string;
}

export interface StudioSettingsPublic extends Omit<
    StudioSettingsRow,
    'anthropic_api_key' | 'google_api_key' | 'openai_api_key'
> {
    anthropic_api_key_configured: boolean;
    google_api_key_configured: boolean;
    openai_api_key_configured: boolean;
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

export const DEFAULT_STUDIO_SETTINGS: StudioSettingsRow = {
    default_llm_provider: 'google',
    default_embedding_provider: 'auto',
    anthropic_model: 'claude-3-5-haiku-20241022',
    anthropic_max_tokens: 4096,
    google_location: 'us-central1',
    google_model: 'gemini-2.5-flash',
    google_embedding_model: 'gemini-embedding-001',
    openai_model: 'gpt-4o',
    openai_embedding_model: 'text-embedding-3-small',
    ollama_base_url: 'http://127.0.0.1:11434',
    ollama_model: 'llama3',
    ollama_embedding_model: 'nomic-embed-text',
    waha_dashboard_url: 'http://127.0.0.1:3010/dashboard',
};

const SECRET_FIELDS = ['anthropic_api_key', 'google_api_key', 'openai_api_key'] as const;

export const STUDIO_SETTINGS_DB_FIELDS = [
    'default_llm_provider',
    'default_embedding_provider',
    'anthropic_api_key',
    'anthropic_model',
    'anthropic_max_tokens',
    'google_api_key',
    'google_project_id',
    'google_location',
    'google_model',
    'google_embedding_model',
    'openai_api_key',
    'openai_model',
    'openai_embedding_model',
    'ollama_base_url',
    'ollama_model',
    'ollama_embedding_model',
    'waha_dashboard_url',
] as const;

export type StudioSettingsUpdatePayload = Partial<
    Pick<StudioSettingsRow, (typeof STUDIO_SETTINGS_DB_FIELDS)[number]>
> & {
    clear_anthropic_api_key?: boolean;
    clear_google_api_key?: boolean;
    clear_openai_api_key?: boolean;
};

export function maskSettingsForClient(row: StudioSettingsRow | null): StudioSettingsPublic {
    const base = { ...DEFAULT_STUDIO_SETTINGS, ...(row || {}) };
    const { anthropic_api_key, google_api_key, openai_api_key, ...rest } = base;
    return {
        ...rest,
        default_llm_provider: normalizeLlmProvider(rest.default_llm_provider),
        default_embedding_provider: normalizeEmbeddingProvider(rest.default_embedding_provider),
        anthropic_api_key_configured: !!anthropic_api_key?.trim(),
        google_api_key_configured: !!google_api_key?.trim(),
        openai_api_key_configured: !!openai_api_key?.trim(),
    };
}

export function normalizeLlmProvider(v: unknown): LlmProvider {
    const s = String(v || 'google').toLowerCase();
    if (s === 'anthropic' || s === 'claude') return 'anthropic';
    if (s === 'openai') return 'openai';
    if (s === 'ollama') return 'ollama';
    return 'google';
}

export function normalizeEmbeddingProvider(v: unknown): EmbeddingProvider {
    const s = String(v || 'auto').toLowerCase();
    if (['google_ai', 'vertex', 'openai', 'ollama'].includes(s)) {
        return s as EmbeddingProvider;
    }
    return 'auto';
}

export function mergeSettingsUpdate(
    existing: StudioSettingsRow | null,
    payload: Record<string, unknown>,
): Partial<StudioSettingsRow> {
    const merged: Record<string, unknown> = {};
    for (const key of STUDIO_SETTINGS_DB_FIELDS) {
        if (payload[key] !== undefined) {
            merged[key] = payload[key];
        }
    }

    if (payload.default_llm_provider !== undefined) {
        merged.default_llm_provider = normalizeLlmProvider(payload.default_llm_provider);
    }
    if (payload.default_embedding_provider !== undefined) {
        merged.default_embedding_provider = normalizeEmbeddingProvider(payload.default_embedding_provider);
    }

    for (const field of SECRET_FIELDS) {
        const val = payload[field];
        if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
            delete merged[field];
        } else if (typeof val === 'string' && val.trim()) {
            merged[field] = val.trim();
        }
    }
    if (payload.clear_anthropic_api_key) {
        merged.anthropic_api_key = null;
    }
    if (payload.clear_google_api_key) {
        merged.google_api_key = null;
    }
    if (payload.clear_openai_api_key) {
        merged.openai_api_key = null;
    }
    return merged as Partial<StudioSettingsRow>;
}
