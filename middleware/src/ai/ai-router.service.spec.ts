import { describe, expect, it, vi } from 'vitest';
import { AiRouterService } from './ai-router.service';
import { AiSettingsService } from './ai-settings.service';
import { ClaudeAiService } from './claude-ai.service';
import { VertexAiService } from './vertex-ai.service';
import { OpenAiService } from './openai-ai.service';
import { OllamaAiService } from './ollama-ai.service';
import { GroqAiService } from './groq-ai.service';
import { OpenRouterAiService } from './openrouter-ai.service';

function makeRouter(partial: {
    aiSettings?: Partial<AiSettingsService>;
    claudeAi?: Partial<ClaudeAiService>;
    vertexAi?: Partial<VertexAiService>;
    openAi?: Partial<OpenAiService>;
    ollamaAi?: Partial<OllamaAiService>;
    groqAi?: Partial<GroqAiService>;
    openRouterAi?: Partial<OpenRouterAiService>;
}) {
    return new AiRouterService(
        (partial.aiSettings || {}) as AiSettingsService,
        (partial.claudeAi || {}) as ClaudeAiService,
        (partial.vertexAi || {}) as VertexAiService,
        (partial.openAi || {}) as OpenAiService,
        (partial.ollamaAi || {}) as OllamaAiService,
        (partial.groqAi || {}) as GroqAiService,
        (partial.openRouterAi || {}) as OpenRouterAiService,
    );
}

describe('AiRouterService', () => {
    it('routes generateText to anthropic when configured', async () => {
        const aiSettings = {
            getLlmProvider: vi.fn().mockResolvedValue('anthropic'),
            getAiStatus: vi.fn(),
        };
        const claudeAi = {
            generateText: vi.fn().mockResolvedValue('claude reply'),
        };
        const router = makeRouter({ aiSettings, claudeAi });

        const out = await router.generateText('hello');
        expect(out).toBe('claude reply');
        expect(claudeAi.generateText).toHaveBeenCalledWith('hello', undefined, undefined);
    });

    it('routes generateText to openai when configured', async () => {
        const aiSettings = {
            getLlmProvider: vi.fn().mockResolvedValue('openai'),
        };
        const openAi = {
            generateText: vi.fn().mockResolvedValue('openai reply'),
        };
        const router = makeRouter({ aiSettings, openAi });

        const out = await router.generateText('hi');
        expect(out).toBe('openai reply');
    });

    it('routes generateText to groq when configured', async () => {
        const aiSettings = {
            getLlmProvider: vi.fn().mockResolvedValue('groq'),
        };
        const groqAi = {
            generateText: vi.fn().mockResolvedValue('groq reply'),
        };
        const router = makeRouter({ aiSettings, groqAi });

        const out = await router.generateText('hi groq');
        expect(out).toBe('groq reply');
        expect(groqAi.generateText).toHaveBeenCalledWith('hi groq', undefined, undefined);
    });

    it('routes generateText to openrouter with model override', async () => {
        const openRouterAi = {
            generateText: vi.fn().mockResolvedValue('qwen reply'),
        };
        const router = makeRouter({ openRouterAi });

        const out = await router.generateText('tanya modal', {
            provider: 'openrouter',
            model: 'qwen/qwen3.7-flash',
        });
        expect(out).toBe('qwen reply');
        expect(openRouterAi.generateText).toHaveBeenCalledWith(
            'tanya modal',
            undefined,
            undefined,
            'qwen/qwen3.7-flash',
        );
    });
});
