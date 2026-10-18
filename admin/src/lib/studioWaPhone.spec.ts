import { describe, expect, it } from 'vitest';
import { normalizeSingleStoreWaPhone, validateSingleStoreWaPhone } from './studioWaPhone';

describe('studioWaPhone (D-40)', () => {
    it('normalizes digits-only owner phone', () => {
        expect(normalizeSingleStoreWaPhone(' 62812-345-6789 ')).toBe('628123456789');
    });

    it('rejects short numbers', () => {
        expect(() => validateSingleStoreWaPhone('123')).toThrow(/wajib/i);
    });
});
