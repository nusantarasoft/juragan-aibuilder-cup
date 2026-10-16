import { Injectable, Logger } from '@nestjs/common';
import { AiSettingsService } from './ai-settings.service';
import type { AiInlineData } from './ai-settings.types';
import type { PlaygroundResult } from './openai-ai.service';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

@Injectable()
export class OpenRouterAiService {
    private readonly logger = new Logger(OpenRouterAiService.name);

    constructor(private readonly aiSettings: AiSettingsService) {}

    async generateText(
        prompt: string,
        tenantId?: string,
        inlineData?: AiInlineData,
        modelOverride?: string,
    ): Promise<string> {
        const config = await this.aiSettings.getOpenRouterConfig(tenantId);
        const model = (modelOverride || config.model).trim();
        if (!config.apiKey) {
            return 'OpenRouter is not configured. Add an API key in AI Studio Settings or set OPENROUTER_API_KEY.';
        }

        if (inlineData?.mimeType.startsWith('image/')) {
            return 'OpenRouter image inline via this path is not wired yet. Send a text-only prompt.';
        }

        try {
            const response = await fetch(OPENROUTER_CHAT_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://nusantarasoft.id',
                    'X-Title': 'Nusantarasoft Kasir Consult',
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });

            if (!response.ok) {
                const err = await response.text();
                this.logger.error(`OpenRouter error (${response.status}): ${err.slice(0, 200)}`);
                return `OpenRouter request failed (${response.status}). Check model and API key.`;
            }

            const data = (await response.json()) as {
                choices?: { message?: { content?: string } }[];
            };
            return data.choices?.[0]?.message?.content?.trim() || '';
        } catch (e: unknown) {
            this.logger.error(`OpenRouter request failed: ${e instanceof Error ? e.message : e}`);
            return 'OpenRouter request failed. Check network and configuration.';
        }
    }

    async generateStructuredJSON(prompt: string, tenantId?: string): Promise<any> {
        const fullPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.`;
        const text = await this.generateText(fullPrompt, tenantId);
        try {
            const cleaned = text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned);
        } catch {
            this.logger.error(`Failed to parse OpenRouter JSON. Raw: ${text.substring(0, 80)}`);
            throw new Error('AI returned invalid JSON');
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
        const config = await this.aiSettings.getOpenRouterConfig(tenantId);
        const systemPrompt = params.systemPrompt?.trim() || '';
        const userPrompt = params.userPrompt.trim();
        const inputChars = systemPrompt.length + userPrompt.length;
        const started = Date.now();

        if (!config.apiKey) {
            const output =
                'OpenRouter is not configured. Add an API key in AI Studio Settings or set OPENROUTER_API_KEY.';
            return {
                output,
                latencyMs: Date.now() - started,
                provider: 'openrouter',
                model: 'unavailable',
                inputChars,
                outputChars: output.length,
            };
        }

        const messages: { role: string; content: string }[] = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: userPrompt });

        try {
            const response = await fetch(OPENROUTER_CHAT_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://nusantarasoft.id',
                    'X-Title': 'Nusantarasoft AI Studio',
                },
                body: JSON.stringify({
                    model: config.model,
                    messages,
                    temperature: Math.min(2, Math.max(0, params.temperature ?? 0.7)),
                    max_tokens: Math.min(8192, Math.max(64, params.maxOutputTokens ?? 2048)),
                }),
            });

            if (!response.ok) {
                const output = `OpenRouter request failed (${response.status}).`;
                return {
                    output,
                    latencyMs: Date.now() - started,
                    provider: 'openrouter',
                    model: config.model,
                    inputChars,
                    outputChars: output.length,
                };
            }

            const data = (await response.json()) as {
                choices?: { message?: { content?: string } }[];
                usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
            };
            const output = data.choices?.[0]?.message?.content?.trim() || '';
            return {
                output,
                latencyMs: Date.now() - started,
                provider: 'openrouter',
                model: config.model,
                inputChars,
                outputChars: output.length,
                promptTokens: data.usage?.prompt_tokens,
                completionTokens: data.usage?.completion_tokens,
                totalTokens: data.usage?.total_tokens,
            };
        } catch {
            const output = 'OpenRouter request failed.';
            return {
                output,
                latencyMs: Date.now() - started,
                provider: 'openrouter',
                model: config.model,
                inputChars,
                outputChars: output.length,
            };
        }
    }

    async testConnection(
        tenantId?: string,
    ): Promise<{ success: boolean; message: string; latencyMs: number; model: string }> {
        const config = await this.aiSettings.getOpenRouterConfig(tenantId);
        const started = Date.now();
        if (!config.apiKey) {
            return {
                success: false,
                message: 'OpenRouter API key not configured',
                latencyMs: 0,
                model: config.model,
            };
        }
        const output = await this.generateText('Reply with exactly: OK', tenantId);
        const ok = output.trim().toUpperCase().includes('OK');
        return {
            success: ok,
            message: ok
                ? 'OpenRouter connection successful'
                : `Unexpected response: ${output.slice(0, 80)}`,
            latencyMs: Date.now() - started,
            model: config.model,
        };
    }
}
