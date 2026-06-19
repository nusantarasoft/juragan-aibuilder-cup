import { Injectable, Logger } from '@nestjs/common';
import { AiSettingsService } from './ai-settings.service';
import type { AiInlineData } from './ai-settings.types';

export type PlaygroundResult = {
    output: string;
    latencyMs: number;
    provider: string;
    model: string;
    inputChars: number;
    outputChars: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
};

@Injectable()
export class OpenAiService {
    private readonly logger = new Logger(OpenAiService.name);

    constructor(private readonly aiSettings: AiSettingsService) {}

    async generateText(prompt: string, tenantId?: string, inlineData?: AiInlineData): Promise<string> {
        const config = await this.aiSettings.getOpenAiConfig(tenantId);
        if (!config.apiKey) {
            return 'OpenAI is not configured. Add an API key in AI Studio Settings.';
        }

        const userContent = inlineData?.mimeType.startsWith('image/')
            ? [
                  { type: 'text', text: prompt },
                  {
                      type: 'image_url',
                      image_url: {
                          url: `data:${inlineData.mimeType};base64,${inlineData.data}`,
                      },
                  },
              ]
            : prompt;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [{ role: 'user', content: userContent }],
                }),
            });

            if (!response.ok) {
                const err = await response.text();
                this.logger.error(`OpenAI error (${response.status}): ${err.slice(0, 200)}`);
                return `OpenAI request failed (${response.status}). Check model and API key.`;
            }

            const data = (await response.json()) as {
                choices?: { message?: { content?: string } }[];
            };
            return data.choices?.[0]?.message?.content?.trim() || '';
        } catch (e: unknown) {
            this.logger.error(`OpenAI request failed: ${e instanceof Error ? e.message : e}`);
            return 'OpenAI request failed. Check network and configuration.';
        }
    }

    async generateStructuredJSON(prompt: string, tenantId?: string): Promise<any> {
        const fullPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.`;
        const text = await this.generateText(fullPrompt, tenantId);
        try {
            const cleaned = text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned);
        } catch {
            this.logger.error(`Failed to parse OpenAI JSON. Raw: ${text.substring(0, 80)}`);
            throw new Error('AI returned invalid JSON');
        }
    }

    async playgroundGenerate(params: {
        systemPrompt?: string;
        userPrompt: string;
        temperature?: number;
        maxOutputTokens?: number;
    }, tenantId?: string): Promise<PlaygroundResult> {
        const config = await this.aiSettings.getOpenAiConfig(tenantId);
        const systemPrompt = params.systemPrompt?.trim() || '';
        const userPrompt = params.userPrompt.trim();
        const inputChars = systemPrompt.length + userPrompt.length;
        const started = Date.now();

        if (!config.apiKey) {
            const output = 'OpenAI is not configured. Add an API key in AI Studio Settings.';
            return {
                output,
                latencyMs: Date.now() - started,
                provider: 'openai',
                model: 'unavailable',
                inputChars,
                outputChars: output.length,
            };
        }

        const messages: { role: string; content: string }[] = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: userPrompt });

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: config.model,
                    messages,
                    temperature: Math.min(2, Math.max(0, params.temperature ?? 0.7)),
                    max_tokens: Math.min(8192, Math.max(64, params.maxOutputTokens ?? 2048)),
                }),
            });

            if (!response.ok) {
                const output = `OpenAI request failed (${response.status}).`;
                return {
                    output,
                    latencyMs: Date.now() - started,
                    provider: 'openai',
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
                provider: 'openai',
                model: config.model,
                inputChars,
                outputChars: output.length,
                promptTokens: data.usage?.prompt_tokens,
                completionTokens: data.usage?.completion_tokens,
                totalTokens: data.usage?.total_tokens,
            };
        } catch {
            const output = 'OpenAI request failed.';
            return {
                output,
                latencyMs: Date.now() - started,
                provider: 'openai',
                model: config.model,
                inputChars,
                outputChars: output.length,
            };
        }
    }

    async embedText(text: string, tenantId?: string): Promise<number[] | null> {
        const config = await this.aiSettings.getOpenAiConfig(tenantId);
        if (!config.apiKey || !text?.trim()) return null;

        try {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: config.embeddingModel,
                    input: text.trim(),
                }),
            });

            if (!response.ok) {
                this.logger.error(`OpenAI embedding error (${response.status})`);
                return null;
            }

            const data = (await response.json()) as { data?: { embedding?: number[] }[] };
            return data.data?.[0]?.embedding ?? null;
        } catch (e: unknown) {
            this.logger.error(`OpenAI embedding failed: ${e instanceof Error ? e.message : e}`);
            return null;
        }
    }

    async testConnection(tenantId?: string): Promise<{ success: boolean; message: string; latencyMs: number; model: string }> {
        const config = await this.aiSettings.getOpenAiConfig(tenantId);
        const started = Date.now();
        if (!config.apiKey) {
            return { success: false, message: 'OpenAI API key not configured', latencyMs: 0, model: config.model };
        }
        const output = await this.generateText('Reply with exactly: OK', tenantId);
        const ok = output.trim().toUpperCase().includes('OK');
        return {
            success: ok,
            message: ok ? 'OpenAI connection successful' : `Unexpected response: ${output.slice(0, 80)}`,
            latencyMs: Date.now() - started,
            model: config.model,
        };
    }
}
