import { Injectable, Logger } from '@nestjs/common';
import { AiSettingsService } from './ai-settings.service';
import { resolveOllamaBaseUrl } from './ollama-url.util';
import type { AiInlineData } from './ai-settings.types';
import type { PlaygroundResult } from './openai-ai.service';

@Injectable()
export class OllamaAiService {
    private readonly logger = new Logger(OllamaAiService.name);

    constructor(private readonly aiSettings: AiSettingsService) {}

    private async chatRequest(
        messages: { role: string; content: string; images?: string[] }[],
        model: string,
        baseUrl: string,
        options?: { temperature?: number; num_predict?: number },
    ): Promise<{ content: string; error?: string }> {
        try {
            const response = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages,
                    stream: false,
                    options: {
                        temperature: options?.temperature ?? 0.7,
                        num_predict: options?.num_predict ?? 2048,
                    },
                }),
            });

            if (!response.ok) {
                const err = await response.text();
                return { content: '', error: `Ollama error (${response.status}): ${err.slice(0, 150)}` };
            }

            const data = (await response.json()) as { message?: { content?: string } };
            return { content: data.message?.content?.trim() || '' };
        } catch (e: unknown) {
            return { content: '', error: e instanceof Error ? e.message : 'Ollama request failed' };
        }
    }

    async generateText(prompt: string, tenantId?: string, inlineData?: AiInlineData): Promise<string> {
        const config = await this.aiSettings.getOllamaConfig(tenantId);
        const userMessage: { role: string; content: string; images?: string[] } = {
            role: 'user',
            content: prompt,
        };
        if (inlineData?.mimeType.startsWith('image/')) {
            userMessage.images = [inlineData.data];
        }
        const result = await this.chatRequest(
            [userMessage],
            config.model,
            config.baseUrl,
        );
        if (result.error) {
            this.logger.warn(result.error);
            return `Ollama is not reachable at ${config.baseUrl}. Check endpoint in AI Studio Settings.`;
        }
        return result.content;
    }

    async generateStructuredJSON(prompt: string, tenantId?: string): Promise<any> {
        const fullPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.`;
        const text = await this.generateText(fullPrompt, tenantId);
        try {
            const cleaned = text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned);
        } catch {
            throw new Error('AI returned invalid JSON');
        }
    }

    async playgroundGenerate(params: {
        systemPrompt?: string;
        userPrompt: string;
        temperature?: number;
        maxOutputTokens?: number;
    }, tenantId?: string): Promise<PlaygroundResult> {
        const config = await this.aiSettings.getOllamaConfig(tenantId);
        const systemPrompt = params.systemPrompt?.trim() || '';
        const userPrompt = params.userPrompt.trim();
        const inputChars = systemPrompt.length + userPrompt.length;
        const started = Date.now();

        const messages: { role: string; content: string }[] = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: userPrompt });

        const result = await this.chatRequest(messages, config.model, config.baseUrl, {
            temperature: params.temperature,
            num_predict: params.maxOutputTokens,
        });

        const output = result.error || result.content || 'Empty response from Ollama';
        return {
            output,
            latencyMs: Date.now() - started,
            provider: 'ollama',
            model: config.model,
            inputChars,
            outputChars: output.length,
        };
    }

    async embedText(text: string, tenantId?: string): Promise<number[] | null> {
        const config = await this.aiSettings.getOllamaConfig(tenantId);
        if (!text?.trim()) return null;

        try {
            const response = await fetch(`${config.baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.embeddingModel,
                    prompt: text.trim(),
                }),
            });

            if (!response.ok) {
                this.logger.error(`Ollama embedding error (${response.status})`);
                return null;
            }

            const data = (await response.json()) as { embedding?: number[] };
            return data.embedding ?? null;
        } catch (e: unknown) {
            this.logger.error(`Ollama embedding failed: ${e instanceof Error ? e.message : e}`);
            return null;
        }
    }

    async testConnection(
        tenantId?: string,
        overrides?: { baseUrl?: string; model?: string },
    ): Promise<{ success: boolean; message: string; latencyMs: number; model: string }> {
        const config = await this.aiSettings.getOllamaConfig(tenantId);
        const baseUrl = overrides?.baseUrl?.trim()
            ? resolveOllamaBaseUrl(overrides.baseUrl)
            : config.baseUrl;
        const model = overrides?.model?.trim() || config.model;
        const started = Date.now();
        try {
            const response = await fetch(`${baseUrl}/api/tags`);
            if (!response.ok) {
                return {
                    success: false,
                    message: `Cannot reach Ollama at ${baseUrl} (${response.status})`,
                    latencyMs: Date.now() - started,
                    model,
                };
            }
            const data = (await response.json()) as { models?: { name?: string }[] };
            const count = data.models?.length ?? 0;
            const modelHint = count === 0 ? ' — pull a model: ollama pull llama3.2' : '';
            return {
                success: true,
                message: `Connected to Ollama at ${baseUrl} (${count} model${count === 1 ? '' : 's'} available)${modelHint}`,
                latencyMs: Date.now() - started,
                model,
            };
        } catch (e: unknown) {
            return {
                success: false,
                message: `Cannot reach Ollama at ${baseUrl}: ${e instanceof Error ? e.message : e}`,
                latencyMs: Date.now() - started,
                model,
            };
        }
    }
}
