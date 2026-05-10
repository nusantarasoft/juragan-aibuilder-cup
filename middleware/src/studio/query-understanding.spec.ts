import { describe, expect, it } from 'vitest';
import { normalizeQueryUnderstanding } from './query-understanding';

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
