import { describe, expect, it } from 'vitest';
import {
    buildQueryUnderstandingPrompt,
    buildRetrievalQueryFromTurns,
    forceProceedAfterClarificationCap,
    MAX_GUIDED_CLARIFICATIONS_PER_CYCLE,
    normalizeQueryUnderstanding,
    shouldAskClarification,
} from './query-understanding';

describe('normalizeQueryUnderstanding', () => {
    it('forces needs_clarification when confidence is below 0.6', () => {
        const out = normalizeQueryUnderstanding(
            {
                original_query: 'x',
                detected_language: 'Indonesia',
                normalized_text: 'x',
                main_intent: 'tanya',
                rewritten_query: 'Apa itu x?',
                needs_clarification: false,
                clarification_question: '',
                confidence: 0.5,
            },
            'x',
        );
        expect(out.needs_clarification).toBe(true);
        expect(out.clarification_question.length).toBeGreaterThan(0);
    });

    it('returns pass-through base when parse fails', () => {
        const out = normalizeQueryUnderstanding(null, 'hello raw');
        expect(out.rewritten_query).toBe('hello raw');
        expect(out.needs_clarification).toBe(false);
        expect(out.original_query).toBe('hello raw');
    });

    it('fills clarification when model omitted question but needs_clarification', () => {
        const out = normalizeQueryUnderstanding(
            {
                original_query: '???',
                detected_language: 'unknown',
                normalized_text: '???',
                main_intent: '',
                rewritten_query: '???',
                needs_clarification: true,
                clarification_question: '',
                confidence: 0.7,
            },
            '???',
        );
        expect(out.needs_clarification).toBe(true);
        expect(out.clarification_question.length).toBeGreaterThan(0);
    });

    it('coerces stringy/numeric booleans (needs_clarification: 0)', () => {
        const out = normalizeQueryUnderstanding(
            {
                original_query: 'x',
                detected_language: 'id',
                normalized_text: 'x',
                main_intent: 'i',
                rewritten_query: 'rw',
                needs_clarification: 0,
                clarification_question: '',
                confidence: 0.9,
            },
            'x',
        );
        expect(out.needs_clarification).toBe(false);
    });

    it('falls back to base when needs_clarification is not boolean-like', () => {
        const out = normalizeQueryUnderstanding(
            {
                original_query: 'x',
                detected_language: 'id',
                normalized_text: 'x',
                main_intent: 'i',
                rewritten_query: 'rw',
                needs_clarification: 'maybe',
                clarification_question: '',
                confidence: 0.9,
            },
            'raw text',
        );
        expect(out.rewritten_query).toBe('raw text');
        expect(out.confidence).toBe(0.35);
    });

    it('defaults blank fields and clamps out-of-range confidence', () => {
        const out = normalizeQueryUnderstanding(
            {
                original_query: '   ',
                detected_language: '  ',
                normalized_text: '  ',
                main_intent: '  ',
                rewritten_query: '  ',
                needs_clarification: false,
                clarification_question: '  ',
                confidence: 5,
            },
            'fallback',
        );
        expect(out.original_query).toBe('fallback');
        expect(out.detected_language).toBe('unknown');
        expect(out.rewritten_query).toBe('fallback');
        expect(out.confidence).toBe(1);
    });
});

describe('guided clarification cap', () => {
    const ambiguous = normalizeQueryUnderstanding(
        {
            original_query: 'product x',
            detected_language: 'Indonesia',
            normalized_text: 'product x',
            main_intent: 'tanya',
            rewritten_query: 'product x',
            needs_clarification: true,
            clarification_question: 'Apa yang ingin Anda ketahui?',
            confidence: 0.5,
        },
        'product x',
    );

    it('allows clarification while under cap', () => {
        expect(shouldAskClarification(ambiguous, 0)).toBe(true);
        expect(shouldAskClarification(ambiguous, MAX_GUIDED_CLARIFICATIONS_PER_CYCLE - 1)).toBe(true);
    });

    it('blocks clarification at cap and can force RAG', () => {
        expect(shouldAskClarification(ambiguous, MAX_GUIDED_CLARIFICATIONS_PER_CYCLE)).toBe(false);
        const forced = forceProceedAfterClarificationCap(ambiguous, 'product x', [
            'saya mau belanja',
            'product x',
            'saya cuma butuh harganya',
        ]);
        expect(forced.needs_clarification).toBe(false);
        expect(forced.rewritten_query.length).toBeGreaterThan('product x'.length);
    });
});

describe('buildQueryUnderstandingPrompt', () => {
    it('includes conversation history when provided', () => {
        const prompt = buildQueryUnderstandingPrompt('harganya', [
            { role: 'user', content: 'saya mau belanja' },
            { role: 'assistant', content: 'Apa yang ingin Anda beli?' },
            { role: 'user', content: 'product x' },
        ]);
        expect(prompt).toContain('saya mau belanja');
        expect(prompt).toContain('product x');
        expect(prompt).toContain('Pesan terbaru');
    });

    it('omits the history block when there are no conversation lines', () => {
        const prompt = buildQueryUnderstandingPrompt('halo\\dunia """test"""');
        expect(prompt).not.toContain('Riwayat percakapan');
        expect(prompt).toContain('Pesan terbaru');
    });
});

describe('buildRetrievalQueryFromTurns', () => {
    const qu = (rewritten: string) =>
        ({
            original_query: 'x', detected_language: 'id', normalized_text: 'x',
            main_intent: 'i', rewritten_query: rewritten, needs_clarification: false,
            clarification_question: '', confidence: 0.9,
        }) as any;

    it('prefers the rewritten query when not merging turns', () => {
        expect(buildRetrievalQueryFromTurns('latest', ['a', 'b'], qu('RW'))).toBe('RW');
    });

    it('falls back to merged turns when rewritten is blank', () => {
        expect(buildRetrievalQueryFromTurns('latest', ['a', 'b'], qu('   '))).toBe('a — b — latest');
    });

    it('returns merged turns when preferMergedTurns is set', () => {
        expect(
            buildRetrievalQueryFromTurns('latest', ['a'], qu('RW'), { preferMergedTurns: true }),
        ).toBe('a — latest');
    });

    it('returns empty latest message when nothing else is available', () => {
        expect(buildRetrievalQueryFromTurns('', [], qu(''))).toBe('');
    });
});

describe('normalizeQueryUnderstanding — confidence edge cases', () => {
    it('rejects non-numeric confidence (schema fail) and returns base', () => {
        const out = normalizeQueryUnderstanding(
            {
                original_query: 'x', detected_language: 'id', normalized_text: 'x',
                main_intent: 'i', rewritten_query: 'rw', needs_clarification: false,
                clarification_question: '', confidence: 'not-a-number',
            },
            'raw',
        );
        expect(out.confidence).toBe(0.35);
        expect(out.rewritten_query).toBe('raw');
    });

    it('coerces numeric-string confidence', () => {
        const out = normalizeQueryUnderstanding(
            {
                original_query: 'x', detected_language: 'id', normalized_text: 'x',
                main_intent: 'i', rewritten_query: 'rw', needs_clarification: false,
                clarification_question: '', confidence: '0.9',
            },
            'x',
        );
        expect(out.confidence).toBe(0.9);
    });

    it('falls back to original text when every field is blank', () => {
        const out = normalizeQueryUnderstanding(
            {
                original_query: '', detected_language: '', normalized_text: '',
                main_intent: '', rewritten_query: '', needs_clarification: true,
                clarification_question: '', confidence: 0.9,
            },
            '',
        );
        expect(out.rewritten_query).toBe('');
        expect(out.original_query).toBe('');
    });
});
