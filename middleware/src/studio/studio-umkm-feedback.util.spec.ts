import { describe, expect, it } from 'vitest';
import { detectUmkmFeedback, formatFeedbackThanks } from './studio-umkm-feedback.util';

describe('studio-umkm-feedback.util', () => {
    it('parses numeric ratings', () => {
        expect(detectUmkmFeedback('5')).toBeNull();
        expect(detectUmkmFeedback('nilai 3')?.score).toBe(3);
        expect(detectUmkmFeedback('rating 5')?.score).toBe(5);
        expect(detectUmkmFeedback('4/5')?.score).toBe(4);
    });

    it('parses keyword ratings', () => {
        expect(detectUmkmFeedback('puas')?.label).toBe('puas');
        expect(detectUmkmFeedback('kurang')?.score).toBe(2);
        expect(detectUmkmFeedback('jual 2 kopi')).toBeNull();
    });

    it('formats thanks', () => {
        const msg = formatFeedbackThanks({ score: 5, label: 'sangat_puas', raw: '5' });
        expect(msg).toContain('5/5');
    });
});
