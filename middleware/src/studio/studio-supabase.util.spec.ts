import { describe, expect, it } from 'vitest';
import { assertNoSupabaseError } from './studio-supabase.util';

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
