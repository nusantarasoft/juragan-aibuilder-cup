import { describe, expect, it, vi } from 'vitest';
import { AiRouterService } from './ai-router.service';
import { AiSettingsService } from './ai-settings.service';
import { ClaudeAiService } from './claude-ai.service';
import { VertexAiService } from './vertex-ai.service';
import { OpenAiService } from './openai-ai.service';
import { OllamaAiService } from './ollama-ai.service';

describe('AiRouterService', () => {
    it('routes generateText to anthropic when configured', async () => {
        const aiSettings = {
            getLlmProvider: vi.fn().mockResolvedValue('anthropic'),
            getAiStatus: vi.fn(),
        } as unknown as AiSettingsService;
        const claudeAi = {
            generateText: vi.fn().mockResolvedValue('claude reply'),
        } as unknown as ClaudeAiService;
        const router = new AiRouterService(
            aiSettings,
            claudeAi,
            {} as VertexAiService,
            {} as OpenAiService,
            {} as OllamaAiService,
        );

        const out = await router.generateText('hello');
        expect(out).toBe('claude reply');
        expect(claudeAi.generateText).toHaveBeenCalledWith('hello', undefined);
    });

    it('routes generateText to openai when configured', async () => {
        const aiSettings = {
            getLlmProvider: vi.fn().mockResolvedValue('openai'),
        } as unknown as AiSettingsService;
        const openAi = {
            generateText: vi.fn().mockResolvedValue('openai reply'),
        } as unknown as OpenAiService;
        const router = new AiRouterService(
            aiSettings,
            {} as ClaudeAiService,
            {} as VertexAiService,
            openAi,
            {} as OllamaAiService,
        );

        const out = await router.generateText('hi');
        expect(out).toBe('openai reply');
    });
});
