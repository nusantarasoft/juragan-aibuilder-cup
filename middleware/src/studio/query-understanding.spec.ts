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
});
