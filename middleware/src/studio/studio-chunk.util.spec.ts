import { describe, expect, it } from 'vitest';
import { chunkText } from './studio-chunk.util';

describe('chunkText', () => {
    it('returns empty for blank input', () => {
        expect(chunkText('   ')).toEqual([]);
    });

    it('returns single chunk for short text', () => {
        expect(chunkText('hello world')).toEqual(['hello world']);
    });

    it('splits long text into multiple chunks', () => {
        const long = 'word '.repeat(400);
        const chunks = chunkText(long, 200, 20);
        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks.every((c) => c.length <= 250)).toBe(true);
    });
});
