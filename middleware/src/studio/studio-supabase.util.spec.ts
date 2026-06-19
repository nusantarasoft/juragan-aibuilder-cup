import { describe, expect, it } from 'vitest';
import { assertNoSupabaseError, isValidUuid, normalizeOptionalUuid } from './studio-supabase.util';

describe('assertNoSupabaseError', () => {
    it('does nothing when error is null or undefined', () => {
        expect(() => assertNoSupabaseError(null)).not.toThrow();
        expect(() => assertNoSupabaseError(undefined)).not.toThrow();
    });

    it('throws Error with message and code for PostgREST failures', () => {
        expect(() =>
            assertNoSupabaseError(
                {
                    message: 'Could not query the database for the schema cache. Retrying.',
                    code: 'PGRST002',
                },
                'create notebook',
            ),
        ).toThrowError(
            'create notebook: Could not query the database for the schema cache. Retrying. [PGRST002]',
        );
    });

    it('throws a real Error instance (GraphQL-safe)', () => {
        try {
            assertNoSupabaseError({ message: 'duplicate key' });
            expect.fail('should throw');
        } catch (e) {
            expect(e).toBeInstanceOf(Error);
            expect((e as Error).message).toBe('duplicate key');
        }
    });
});

describe('normalizeOptionalUuid', () => {
    it('accepts valid UUIDs', () => {
        const id = 'f1888829-75bf-4602-babe-1863d52f61bb';
        expect(normalizeOptionalUuid(id)).toBe(id);
        expect(isValidUuid(id)).toBe(true);
    });

    it('returns null for invalid or empty values', () => {
        expect(normalizeOptionalUuid('not-a-uuid')).toBeNull();
        expect(normalizeOptionalUuid('')).toBeNull();
        expect(normalizeOptionalUuid(undefined)).toBeNull();
        expect(isValidUuid('admin')).toBe(false);
    });
});
