import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { resolveOllamaBaseUrl } from './ollama-url.util';
import {
    DEFAULT_STUDIO_SETTINGS,
    DEFAULT_TENANT_ID,
    type EmbeddingProvider,
    type LlmProvider,
    type ProviderReadiness,
    type StudioAiStatus,
    type StudioSettingsRow,
    maskSettingsForClient,
    mergeSettingsUpdate,
    normalizeEmbeddingProvider,
    normalizeLlmProvider,
    type StudioSettingsPublic,
} from './ai-settings.types';
import { parseGoogleServiceAccountJson } from './google-vertex-auth.util';

const CACHE_TTL_MS = 30_000;

@Injectable()
export class AiSettingsService {
    private readonly logger = new Logger(AiSettingsService.name);
    private cache = new Map<string, { row: StudioSettingsRow | null; expiresAt: number }>();

    constructor(private readonly supabaseService: SupabaseService) {}

    private tenantId(tenantId?: string): string {
        return tenantId || DEFAULT_TENANT_ID;
    }

    invalidateCache(tenantId?: string): void {
        if (tenantId) {
            this.cache.delete(tenantId);
        } else {
            this.cache.clear();
        }
    }

    async getRawSettings(tenantId?: string): Promise<StudioSettingsRow> {
        const tid = this.tenantId(tenantId);
        const cached = this.cache.get(tid);
        if (cached && cached.expiresAt > Date.now()) {
            return { ...DEFAULT_STUDIO_SETTINGS, ...(cached.row || {}) };
        }

        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_settings')
            .select('*')
            .eq('tenant_id', tid)
            .single();

        if (error && error.code !== 'PGRST116') {
            this.logger.error(`Error fetching studio_settings: ${error.message}`);
        }

        const row = data as StudioSettingsRow | null;
        this.cache.set(tid, { row, expiresAt: Date.now() + CACHE_TTL_MS });
        return { ...DEFAULT_STUDIO_SETTINGS, ...(row || {}) };
    }

    async getPublicSettings(tenantId?: string): Promise<StudioSettingsPublic> {
        const row = await this.getRawSettings(tenantId);
        return maskSettingsForClient(row);
    }

    async updateSettings(
        tenantId: string | undefined,
        payload: Record<string, unknown>,
    ): Promise<StudioSettingsPublic> {
        const tid = this.tenantId(tenantId);
        const existing = await this.getRawSettings(tid);
        const patch = mergeSettingsUpdate(existing, payload);

        const { data: existingRow } = await this.supabaseService.getAdminClient()
            .from('studio_settings')
            .select('tenant_id')
            .eq('tenant_id', tid)
            .single();

        let res;
        if (existingRow) {
            res = await this.supabaseService.getAdminClient()
                .from('studio_settings')
                .update({ ...patch, updated_at: new Date().toISOString() })
                .eq('tenant_id', tid)
                .select()
                .single();
        } else {
            res = await this.supabaseService.getAdminClient()
                .from('studio_settings')
                .insert({ tenant_id: tid, ...DEFAULT_STUDIO_SETTINGS, ...patch })
                .select()
                .single();
        }

        if (res.error) {
            throw new Error(`Failed to update settings: ${res.error.message}`);
        }

        this.invalidateCache(tid);
        return maskSettingsForClient(res.data as StudioSettingsRow);
    }

    async getLlmProvider(tenantId?: string): Promise<LlmProvider> {
        const settings = await this.getRawSettings(tenantId);
        return normalizeLlmProvider(settings.default_llm_provider);
    }

    async getEmbeddingProvider(tenantId?: string): Promise<EmbeddingProvider> {
        const settings = await this.getRawSettings(tenantId);
        return normalizeEmbeddingProvider(settings.default_embedding_provider);
    }

    async resolveGenerativeModel(provider?: LlmProvider, tenantId?: string): Promise<string> {
        const settings = await this.getRawSettings(tenantId);
        const p = provider || normalizeLlmProvider(settings.default_llm_provider);
        switch (p) {
            case 'anthropic':
                return settings.anthropic_model?.trim() || DEFAULT_STUDIO_SETTINGS.anthropic_model;
            case 'openai':
                return settings.openai_model?.trim() || DEFAULT_STUDIO_SETTINGS.openai_model;
            case 'groq':
                return settings.groq_model?.trim() || DEFAULT_STUDIO_SETTINGS.groq_model;
            case 'ollama':
                return settings.ollama_model?.trim() || DEFAULT_STUDIO_SETTINGS.ollama_model;
            default:
                return settings.google_model?.trim() || DEFAULT_STUDIO_SETTINGS.google_model;
        }
    }

    async resolveEmbeddingModel(tenantId?: string): Promise<{ provider: EmbeddingProvider; model: string }> {
        const settings = await this.getRawSettings(tenantId);
        const provider = normalizeEmbeddingProvider(settings.default_embedding_provider);
        const projectId = settings.google_project_id?.trim();
        const apiKey = settings.google_api_key?.trim();

        let effective = provider;
        if (provider === 'auto') {
            if (projectId) effective = 'vertex';
            else if (apiKey) effective = 'google_ai';
            else if (settings.openai_api_key?.trim()) effective = 'openai';
            else if (settings.ollama_base_url?.trim()) effective = 'ollama';
            else effective = 'google_ai';
        }

        switch (effective) {
            case 'vertex':
                return {
                    provider: effective,
                    model: settings.google_embedding_model?.trim() || 'multimodalembedding@001',
                };
            case 'openai':
                return {
                    provider: effective,
                    model: settings.openai_embedding_model?.trim() || DEFAULT_STUDIO_SETTINGS.openai_embedding_model!,
                };
            case 'ollama':
                return {
                    provider: effective,
                    model: settings.ollama_embedding_model?.trim() || DEFAULT_STUDIO_SETTINGS.ollama_embedding_model!,
                };
            default:
                return {
                    provider: effective === 'auto' ? 'google_ai' : effective,
                    model: settings.google_embedding_model?.trim() || DEFAULT_STUDIO_SETTINGS.google_embedding_model!,
                };
        }
    }

    async getAnthropicConfig(tenantId?: string) {
        const s = await this.getRawSettings(tenantId);
        return {
            apiKey: s.anthropic_api_key?.trim() || undefined,
            model: s.anthropic_model?.trim() || DEFAULT_STUDIO_SETTINGS.anthropic_model,
            maxTokens: Math.min(8192, Math.max(64, s.anthropic_max_tokens ?? 4096)),
        };
    }

    async getGoogleConfig(tenantId?: string) {
        const s = await this.getRawSettings(tenantId);
        const serviceAccountJson = s.google_service_account_json?.trim() || undefined;
        const fromSa = serviceAccountJson
            ? parseGoogleServiceAccountJson(serviceAccountJson)?.project_id?.trim()
            : undefined;
        return {
            apiKey: s.google_api_key?.trim() || undefined,
            serviceAccountJson,
            projectId: s.google_project_id?.trim() || fromSa || undefined,
            location: s.google_location?.trim() || DEFAULT_STUDIO_SETTINGS.google_location,
            model: s.google_model?.trim() || DEFAULT_STUDIO_SETTINGS.google_model,
            embeddingModel: s.google_embedding_model?.trim() || DEFAULT_STUDIO_SETTINGS.google_embedding_model!,
        };
    }

    async getOpenAiConfig(tenantId?: string) {
        const s = await this.getRawSettings(tenantId);
        return {
            apiKey: s.openai_api_key?.trim() || undefined,
            model: s.openai_model?.trim() || DEFAULT_STUDIO_SETTINGS.openai_model,
            embeddingModel: s.openai_embedding_model?.trim() || DEFAULT_STUDIO_SETTINGS.openai_embedding_model!,
        };
    }

    async getGroqConfig(tenantId?: string) {
        const s = await this.getRawSettings(tenantId);
        return {
            apiKey: s.groq_api_key?.trim() || undefined,
            model: s.groq_model?.trim() || DEFAULT_STUDIO_SETTINGS.groq_model,
        };
    }

    async getOllamaConfig(tenantId?: string) {
        const s = await this.getRawSettings(tenantId);
        const rawBase = s.ollama_base_url?.trim() || DEFAULT_STUDIO_SETTINGS.ollama_base_url;
        return {
            baseUrl: resolveOllamaBaseUrl(rawBase),
            model: s.ollama_model?.trim() || DEFAULT_STUDIO_SETTINGS.ollama_model,
            embeddingModel: s.ollama_embedding_model?.trim() || DEFAULT_STUDIO_SETTINGS.ollama_embedding_model!,
        };
    }

    async getAiStatus(tenantId?: string): Promise<StudioAiStatus> {
        const settings = await this.getRawSettings(tenantId);
        const llmProvider = normalizeLlmProvider(settings.default_llm_provider);
        const embedding = await this.resolveEmbeddingModel(tenantId);

        const providers: ProviderReadiness[] = [
            await this.checkProviderReadiness('anthropic', settings),
            await this.checkProviderReadiness('google', settings),
            await this.checkProviderReadiness('openai', settings),
            await this.checkProviderReadiness('groq', settings),
            await this.checkProviderReadiness('ollama', settings),
        ];

        return {
            llmProvider,
            llmModel: await this.resolveGenerativeModel(llmProvider, tenantId),
            embeddingProvider: normalizeEmbeddingProvider(settings.default_embedding_provider),
            embeddingModel: embedding.model,
            providers,
        };
    }

    private async checkProviderReadiness(
        provider: LlmProvider,
        settings: StudioSettingsRow,
    ): Promise<ProviderReadiness> {
        switch (provider) {
            case 'anthropic':
                return {
                    provider,
                    configured: !!settings.anthropic_api_key?.trim(),
                    model: settings.anthropic_model || DEFAULT_STUDIO_SETTINGS.anthropic_model,
                    message: settings.anthropic_api_key?.trim() ? undefined : 'API key required',
                };
            case 'google': {
                const hasKey = !!settings.google_api_key?.trim();
                const hasProject = !!settings.google_project_id?.trim();
                const hasSa = !!settings.google_service_account_json?.trim();
                const saProject = hasSa
                    ? parseGoogleServiceAccountJson(settings.google_service_account_json)?.project_id
                    : undefined;
                const ready = hasKey || hasProject || !!saProject || hasSa;
                return {
                    provider,
                    configured: ready,
                    model: settings.google_model || DEFAULT_STUDIO_SETTINGS.google_model,
                    message: ready
                        ? undefined
                        : 'Google API key, Vertex project ID, or service account JSON required',
                };
            }
            case 'openai':
                return {
                    provider,
                    configured: !!settings.openai_api_key?.trim(),
                    model: settings.openai_model || DEFAULT_STUDIO_SETTINGS.openai_model,
                    message: settings.openai_api_key?.trim() ? undefined : 'API key required',
                };
            case 'groq':
                return {
                    provider,
                    configured: !!settings.groq_api_key?.trim(),
                    model: settings.groq_model || DEFAULT_STUDIO_SETTINGS.groq_model,
                    message: settings.groq_api_key?.trim() ? undefined : 'API key required',
                };
            case 'ollama':
                return {
                    provider,
                    configured: !!settings.ollama_base_url?.trim(),
                    model: settings.ollama_model || DEFAULT_STUDIO_SETTINGS.ollama_model,
                    message: settings.ollama_base_url?.trim() ? undefined : 'Ollama endpoint required',
                };
        }
    }
}
