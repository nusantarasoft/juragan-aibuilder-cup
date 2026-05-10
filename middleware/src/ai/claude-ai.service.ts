import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/** Default: Haiku tier (lower cost). Override with ANTHROPIC_MODEL. */
const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-haiku-20241022';

@Injectable()
export class ClaudeAiService {
    private readonly logger = new Logger(ClaudeAiService.name);

    constructor(private readonly configService: ConfigService) { }

    private getApiKey(): string | undefined {
        const v = this.configService.get<string>('ANTHROPIC_API_KEY');
        return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
    }

    private getModel(): string {
        const v = this.configService.get<string>('ANTHROPIC_MODEL');
        if (typeof v === 'string' && v.trim().length > 0) {
            return v.trim();
        }
        return DEFAULT_ANTHROPIC_MODEL;
    }

    private getMaxTokens(): number {
        const raw = this.configService.get<string>('ANTHROPIC_MAX_TOKENS');
        const n = parseInt(String(raw ?? '4096'), 10);
        if (!Number.isFinite(n) || n < 1) {
            return 4096;
        }
        return Math.min(n, 8192);
    }

    private extractTextFromMessage(data: { content?: { type?: string; text?: string }[] }): string {
        const parts = data?.content;
        if (!Array.isArray(parts)) {
            return '';
        }
        return parts
            .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
            .map((b) => b.text as string)
            .join('');
    }

    /**
     * Anthropic Messages API — text-only (AI Studio).
     */
    async generateText(prompt: string): Promise<string> {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            this.logger.warn('ANTHROPIC_API_KEY is not set.');
            return 'Claude is not configured. Please set ANTHROPIC_API_KEY environment variable.';
        }

        try {
            const response = await fetch(ANTHROPIC_MESSAGES_URL, {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': ANTHROPIC_VERSION,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.getModel(),
                    max_tokens: this.getMaxTokens(),
                    messages: [{ role: 'user', content: prompt }],
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Anthropic API error (${response.status}): ${errorText}`);
                return `Claude request failed (${response.status}). Check ANTHROPIC_MODEL and API key.`;
            }

            const data = (await response.json()) as { content?: { type?: string; text?: string }[] };
            const text = this.extractTextFromMessage(data);
            if (!text) {
                this.logger.warn('Anthropic returned empty text content.');
                return '';
            }
            return text;
        } catch (e: any) {
            this.logger.error(`Anthropic request failed: ${e?.message ?? e}`);
            return 'Claude request failed. Check network and configuration.';
        }
    }

    /**
     * Force JSON output (same contract as VertexAiService.generateStructuredJSON).
     */
    async generateStructuredJSON(prompt: string): Promise<any> {
        const fullPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. Do not include markdown formatting like \`\`\`json.`;
        const text = await this.generateText(fullPrompt);

        try {
            const cleaned = text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned);
        } catch {
            this.logger.error(`Failed to parse Claude JSON response. Raw text: ${text.substring(0, 80)}...`);
            throw new Error('AI returned invalid JSON');
        }
    }
}
