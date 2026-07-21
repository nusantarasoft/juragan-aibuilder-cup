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

    it('breaks on a natural boundary past the 40% mark', () => {
        // First window [0,20) contains a paragraph break at index 10 (> 20*0.4),
        // so the chunk should end at the boundary instead of the hard limit.
        const text = 'a'.repeat(10) + '\n\n' + 'b'.repeat(400);
        const chunks = chunkText(text, 20, 5);
        expect(chunks[0]).toBe('a'.repeat(10));
        expect(chunks.length).toBeGreaterThan(1);
    });

    it('ignores boundaries before the 40% mark and uses the hard limit', () => {
        // The only break is very early (index 1), below 20*0.4, so it is ignored.
        const text = 'a\n' + 'b'.repeat(400);
        const chunks = chunkText(text, 20, 5);
        expect(chunks[0].length).toBe(20);
    });

    it('skips windows that trim to empty (whitespace-only slice)', () => {
        // A large internal whitespace gap yields a whitespace-only window that is dropped.
        const text = 'ab' + ' '.repeat(30) + 'cd';
        const chunks = chunkText(text, 5, 1);
        expect(chunks).not.toContain('');
        expect(chunks[0]).toBe('ab');
    });
});
