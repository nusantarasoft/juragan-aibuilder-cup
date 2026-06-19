import { describe, expect, it } from 'vitest';
import { resolveOllamaBaseUrl } from './ollama-url.util';

describe('resolveOllamaBaseUrl', () => {
    it('maps host.docker.internal to 127.0.0.1 when not in Docker', () => {
        expect(resolveOllamaBaseUrl('http://host.docker.internal:11434')).toBe('http://127.0.0.1:11434');
    });

    it('passes through 127.0.0.1 unchanged', () => {
        expect(resolveOllamaBaseUrl('http://127.0.0.1:11434')).toBe('http://127.0.0.1:11434');
    });

    it('strips trailing slash', () => {
        expect(resolveOllamaBaseUrl('http://127.0.0.1:11434/')).toBe('http://127.0.0.1:11434');
    });
});
