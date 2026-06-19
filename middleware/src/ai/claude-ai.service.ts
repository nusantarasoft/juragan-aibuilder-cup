import { Injectable, Logger } from '@nestjs/common';
import { AiSettingsService } from './ai-settings.service';
import type { AiInlineData } from './ai-settings.types';
import type { PlaygroundResult } from './openai-ai.service';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

@Injectable()
export class ClaudeAiService {
    private readonly logger = new Logger(ClaudeAiService.name);

    constructor(private readonly aiSettings: AiSettingsService) {}

    private extractTextFromMessage(data: { content?: { type?: string; text?: string }[] }): string {
        const parts = data?.content;
        if (!Array.isArray(parts)) return '';
        return parts
            .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
            .map((b) => b.text as string)
            .join('');
    }

    private claudeImageMediaType(mimeType: string): string | null {
        const normalized = mimeType.toLowerCase();
        if (normalized === 'image/jpg') return 'image/jpeg';
        if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(normalized)) {
            return normalized;
        }
        return null;
    }

    async generateText(prompt: string, tenantId?: string, inlineData?: AiInlineData): Promise<string> {
        const config = await this.aiSettings.getAnthropicConfig(tenantId);
        if (!config.apiKey) {
            this.logger.warn('Anthropic API key is not configured.');
            return 'Claude is not configured. Add an API key in AI Studio Settings.';
        }

        const imageMediaType = inlineData ? this.claudeImageMediaType(inlineData.mimeType) : null;
        const messageContent = imageMediaType
            ? [
                  {
                      type: 'image',
                      source: {
                          type: 'base64',
                          media_type: imageMediaType,
                          data: inlineData!.data,
                      },
                  },
                  { type: 'text', text: prompt },
              ]
            : prompt;

        try {
            const response = await fetch(ANTHROPIC_MESSAGES_URL, {
                method: 'POST',
                headers: {
                    'x-api-key': config.apiKey,
                    'anthropic-version': ANTHROPIC_VERSION,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: config.model,
                    max_tokens: config.maxTokens,
                    messages: [{ role: 'user', content: messageContent }],
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Anthropic API error (${response.status}): ${errorText}`);
                return `Claude request failed (${response.status}). Check model and API key in Settings.`;
            }

            const data = (await response.json()) as { content?: { type?: string; text?: string }[] };
            return this.extractTextFromMessage(data) || '';
        } catch (e: unknown) {
            this.logger.error(`Anthropic request failed: ${e instanceof Error ? e.message : e}`);
            return 'Claude request failed. Check network and configuration.';
        }
    }

    async playgroundGenerate(params: {
        systemPrompt?: string;
        userPrompt: string;
        temperature?: number;
        maxOutputTokens?: number;
    }, tenantId?: string): Promise<PlaygroundResult> {
        const config = await this.aiSettings.getAnthropicConfig(tenantId);
        const temperature = Math.min(1, Math.max(0, params.temperature ?? 0.7));
        const maxTokens = Math.min(8192, Math.max(64, params.maxOutputTokens ?? 2048));
        const systemPrompt = params.systemPrompt?.trim() || '';
        const userPrompt = params.userPrompt.trim();
        const inputChars = systemPrompt.length + userPrompt.length;
        const started = Date.now();

        if (!config.apiKey) {
            const output = 'Claude is not configured. Add an API key in AI Studio Settings.';
            return {
                output,
                latencyMs: Date.now() - started,
                provider: 'anthropic',
                model: 'unavailable',
                inputChars,
                outputChars: output.length,
            };
        }

        try {
            const body: Record<string, unknown> = {
                model: config.model,
                max_tokens: maxTokens,
                temperature,
                messages: [{ role: 'user', content: userPrompt }],
            };
            if (systemPrompt) body.system = systemPrompt;

            const response = await fetch(ANTHROPIC_MESSAGES_URL, {
                method: 'POST',
                headers: {
                    'x-api-key': config.apiKey,
                    'anthropic-version': ANTHROPIC_VERSION,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const output = `Claude request failed (${response.status}). Check model and API key.`;
                return {
                    output,
                    latencyMs: Date.now() - started,
                    provider: 'anthropic',
                    model: config.model,
                    inputChars,
                    outputChars: output.length,
                };
            }

            const data = (await response.json()) as {
                content?: { type?: string; text?: string }[];
                usage?: { input_tokens?: number; output_tokens?: number };
            };
            const output = this.extractTextFromMessage(data) || '';
            return {
                output,
                latencyMs: Date.now() - started,
                provider: 'anthropic',
                model: config.model,
                inputChars,
                outputChars: output.length,
                promptTokens: data.usage?.input_tokens,
                completionTokens: data.usage?.output_tokens,
                totalTokens:
                    data.usage?.input_tokens != null && data.usage?.output_tokens != null
                        ? data.usage.input_tokens + data.usage.output_tokens
                        : undefined,
            };
        } catch {
            const output = 'Claude request failed.';
            return {
                output,
                latencyMs: Date.now() - started,
                provider: 'anthropic',
                model: config.model,
                inputChars,
                outputChars: output.length,
            };
        }
    }

    async generateStructuredJSON(prompt: string, tenantId?: string): Promise<any> {
        const fullPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.`;
        const text = await this.generateText(fullPrompt, tenantId);
        try {
            const cleaned = text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned);
        } catch {
            this.logger.error(`Failed to parse Claude JSON. Raw: ${text.substring(0, 80)}`);
            throw new Error('AI returned invalid JSON');
        }
    }

    async testConnection(tenantId?: string): Promise<{ success: boolean; message: string; latencyMs: number; model: string }> {
        const config = await this.aiSettings.getAnthropicConfig(tenantId);
        const started = Date.now();
        if (!config.apiKey) {
            return { success: false, message: 'Anthropic API key not configured', latencyMs: 0, model: config.model };
        }
        const output = await this.generateText('Reply with exactly: OK', tenantId);
        const ok = output.trim().toUpperCase().includes('OK');
        return {
            success: ok,
            message: ok ? 'Anthropic connection successful' : `Unexpected response: ${output.slice(0, 80)}`,
            latencyMs: Date.now() - started,
            model: config.model,
        };
    }
}
