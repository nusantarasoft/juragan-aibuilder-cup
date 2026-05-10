import { describe, expect, it, vi, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ClaudeAiService } from './claude-ai.service';

function svc(getImpl: (key: string) => string | undefined) {
    const config = { get: (k: string) => getImpl(k) } as unknown as ConfigService;
    return new ClaudeAiService(config);
}

describe('ClaudeAiService', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns configuration hint when ANTHROPIC_API_KEY is missing', async () => {
        const s = svc(() => undefined);
        const text = await s.generateText('hello');
        expect(text).toContain('ANTHROPIC_API_KEY');
    });

    it('POSTs Messages API with expected headers and body', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                content: [{ type: 'text', text: '{"a":1}' }],
            }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const s = svc((key) => {
            if (key === 'ANTHROPIC_API_KEY') return 'sk-test';
            if (key === 'ANTHROPIC_MODEL') return 'claude-test-model';
            if (key === 'ANTHROPIC_MAX_TOKENS') return '1024';
            return undefined;
        });

        const out = await s.generateStructuredJSON('Return {"x":1}');
        expect(out).toEqual({ a: 1 });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://api.anthropic.com/v1/messages');
        const headers = init.headers as Record<string, string>;
        expect(headers['x-api-key']).toBe('sk-test');
        expect(headers['anthropic-version']).toBe('2023-06-01');

        const body = JSON.parse(init.body as string);
        expect(body.model).toBe('claude-test-model');
        expect(body.max_tokens).toBe(1024);
        expect(body.messages).toEqual([{ role: 'user', content: expect.stringContaining('Return') }]);
    });

    it('throws on invalid JSON from model', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ content: [{ type: 'text', text: 'not json' }] }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const s = svc((key) => (key === 'ANTHROPIC_API_KEY' ? 'k' : undefined));
        await expect(s.generateStructuredJSON('x')).rejects.toThrow('AI returned invalid JSON');
    });
});
