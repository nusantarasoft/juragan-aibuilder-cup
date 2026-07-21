import { Injectable, Logger } from '@nestjs/common';
import { AiSettingsService } from './ai-settings.service';
import { ClaudeAiService } from './claude-ai.service';
import { VertexAiService } from './vertex-ai.service';
import { OpenAiService } from './openai-ai.service';
import { OllamaAiService } from './ollama-ai.service';
import { GroqAiService } from './groq-ai.service';
import type { PlaygroundResult } from './openai-ai.service';
import type { AiConnectionTestResult, AiInlineData, LlmProvider, StudioAiStatus } from './ai-settings.types';

export type { AiInlineData };

export type AiTestOverrides = {
    ollamaBaseUrl?: string;
    ollamaModel?: string;
};

@Injectable()
export class AiRouterService {
    private readonly logger = new Logger(AiRouterService.name);

    constructor(
        private readonly aiSettings: AiSettingsService,
        private readonly claudeAi: ClaudeAiService,
        private readonly vertexAi: VertexAiService,
        private readonly openAi: OpenAiService,
        private readonly ollamaAi: OllamaAiService,
        private readonly groqAi: GroqAiService,
    ) {}

    async getActiveConfig(tenantId?: string): Promise<StudioAiStatus> {
        return this.aiSettings.getAiStatus(tenantId);
    }

    async generateText(
        prompt: string,
        opts?: { tenantId?: string; inlineData?: AiInlineData },
    ): Promise<string> {
        const provider = await this.aiSettings.getLlmProvider(opts?.tenantId);
        const inlineData = opts?.inlineData;
        switch (provider) {
            case 'anthropic':
                return this.claudeAi.generateText(prompt, opts?.tenantId, inlineData);
            case 'openai':
                return this.openAi.generateText(prompt, opts?.tenantId, inlineData);
            case 'groq':
                return this.groqAi.generateText(prompt, opts?.tenantId, inlineData);
            case 'ollama':
                return this.ollamaAi.generateText(prompt, opts?.tenantId, inlineData);
            default:
                return this.vertexAi.generateText(prompt, inlineData, opts?.tenantId);
        }
    }

    /**
     * Streaming text generation. Emits incremental fragments via `onDelta` and
     * resolves with the full text. Only the Google (Vertex/AI Studio) provider
     * supports true token streaming; other providers generate the full answer and
     * emit it once, so the calling contract stays identical everywhere.
     */
    async generateTextStream(
        prompt: string,
        onDelta: (text: string) => void,
        opts?: { tenantId?: string; inlineData?: AiInlineData },
    ): Promise<string> {
        const provider = await this.aiSettings.getLlmProvider(opts?.tenantId);
        if (provider === 'google') {
            return this.vertexAi.generateTextStream(prompt, onDelta, opts?.inlineData, opts?.tenantId);
        }
        const full = await this.generateText(prompt, opts);
        if (full) onDelta(full);
        return full;
    }

    async generateStructuredJSON(prompt: string, tenantId?: string): Promise<any> {
        const provider = await this.aiSettings.getLlmProvider(tenantId);
        switch (provider) {
            case 'anthropic':
                return this.claudeAi.generateStructuredJSON(prompt, tenantId);
            case 'openai':
                return this.openAi.generateStructuredJSON(prompt, tenantId);
            case 'groq':
                return this.groqAi.generateStructuredJSON(prompt, tenantId);
            case 'ollama':
                return this.ollamaAi.generateStructuredJSON(prompt, tenantId);
            default:
                return this.vertexAi.generateStructuredJSON(prompt, tenantId);
        }
    }

    async playgroundGenerate(
        params: {
            systemPrompt?: string;
            userPrompt: string;
            temperature?: number;
            maxOutputTokens?: number;
        },
        tenantId?: string,
    ): Promise<PlaygroundResult> {
        const provider = await this.aiSettings.getLlmProvider(tenantId);
        switch (provider) {
            case 'anthropic':
                return this.claudeAi.playgroundGenerate(params, tenantId);
            case 'openai':
                return this.openAi.playgroundGenerate(params, tenantId);
            case 'groq':
                return this.groqAi.playgroundGenerate(params, tenantId);
            case 'ollama':
                return this.ollamaAi.playgroundGenerate(params, tenantId);
            default:
                return this.vertexAi.playgroundGenerate(params, tenantId);
        }
    }

    async testConnection(
        provider: LlmProvider,
        tenantId?: string,
        overrides?: AiTestOverrides,
    ): Promise<AiConnectionTestResult> {
        const started = Date.now();
        switch (provider) {
            case 'anthropic': {
                const r = await this.claudeAi.testConnection(tenantId);
                return { ...r, provider: 'anthropic' };
            }
            case 'google': {
                const r = await this.vertexAi.testConnection(tenantId);
                return { ...r, provider: 'google' };
            }
            case 'openai': {
                const r = await this.openAi.testConnection(tenantId);
                return { ...r, provider: 'openai' };
            }
            case 'groq': {
                const r = await this.groqAi.testConnection(tenantId);
                return { ...r, provider: 'groq' };
            }
            case 'ollama': {
                const r = await this.ollamaAi.testConnection(tenantId, {
                    baseUrl: overrides?.ollamaBaseUrl,
                    model: overrides?.ollamaModel,
                });
                return { ...r, provider: 'ollama' };
            }
            default:
                return {
                    success: false,
                    message: `Unknown provider: ${provider}`,
                    latencyMs: Date.now() - started,
                    provider,
                };
        }
    }
}
