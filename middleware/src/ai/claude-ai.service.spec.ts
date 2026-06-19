import { describe, expect, it, vi, afterEach } from 'vitest';
import { ClaudeAiService } from './claude-ai.service';
import { AiSettingsService } from './ai-settings.service';

function svc(settings: Partial<ReturnType<AiSettingsService['getAnthropicConfig'] extends (...args: any) => Promise<infer R> ? () => R : never>>) {
    const aiSettings = {
        getAnthropicConfig: vi.fn().mockResolvedValue({
            apiKey: undefined,
            model: 'claude-test-model',
            maxTokens: 1024,
            ...settings,
        }),
    } as unknown as AiSettingsService;
    return new ClaudeAiService(aiSettings);
}

describe('ClaudeAiService', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns configuration hint when API key is missing', async () => {
        const s = svc({ apiKey: undefined });
        const text = await s.generateText('hello');
        expect(text).toContain('AI Studio Settings');
    });

    it('POSTs Messages API with expected headers and body', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                content: [{ type: 'text', text: '{"a":1}' }],
            }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const s = svc({ apiKey: 'sk-test', model: 'claude-test-model', maxTokens: 1024 });

        const out = await s.generateStructuredJSON('Return {"x":1}');
        expect(out).toEqual({ a: 1 });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://api.anthropic.com/v1/messages');
        const headers = init.headers as Record<string, string>;
        expect(headers['x-api-key']).toBe('sk-test');

        const body = JSON.parse(init.body as string);
        expect(body.model).toBe('claude-test-model');
        expect(body.max_tokens).toBe(1024);
    });

    it('throws on invalid JSON from model', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ content: [{ type: 'text', text: 'not json' }] }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const s = svc({ apiKey: 'k' });
        await expect(s.generateStructuredJSON('x')).rejects.toThrow('AI returned invalid JSON');
    });
});
