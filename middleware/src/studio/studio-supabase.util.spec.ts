import { describe, expect, it, vi } from 'vitest';
import {
    assertNoSupabaseError,
    isValidUuid,
    normalizeOptionalUuid,
    resolveUserIdForDb,
} from './studio-supabase.util';

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
        expect(isValidUuid('')).toBe(false);
        expect(isValidUuid(null)).toBe(false);
    });
});

describe('resolveUserIdForDb', () => {
    const VALID = 'f1888829-75bf-4602-babe-1863d52f61bb';

    it('returns null when userId is missing/blank', () => {
        expect(resolveUserIdForDb(undefined)).toBeNull();
        expect(resolveUserIdForDb(null)).toBeNull();
        expect(resolveUserIdForDb('   ')).toBeNull();
    });

    it('returns the normalized uuid when valid', () => {
        expect(resolveUserIdForDb(`  ${VALID}  `)).toBe(VALID);
    });

    it('warns and returns null for non-uuid values when logger present', () => {
        const log = { warn: vi.fn() };
        expect(resolveUserIdForDb('admin-user', log, 'studio chat')).toBeNull();
        expect(log.warn).toHaveBeenCalledOnce();
        expect(log.warn.mock.calls[0][0]).toContain('studio chat');
    });

    it('does not throw for non-uuid values when no logger provided', () => {
        expect(resolveUserIdForDb('admin-user')).toBeNull();
    });

    it('truncates very long invalid ids in the warning', () => {
        const log = { warn: vi.fn() };
        resolveUserIdForDb('x'.repeat(200), log);
        const msg = log.warn.mock.calls[0][0] as string;
        expect(msg).toContain('x'.repeat(48));
        expect(msg).not.toContain('x'.repeat(49));
    });
});
