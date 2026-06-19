/** Minimal PostgREST / Supabase error shape. */
export type PostgrestLikeError = {
    message: string;
    code?: string;
    details?: string | null;
    hint?: string | null;
};

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value?: string | null): boolean {
    const v = value?.trim();
    return Boolean(v && UUID_RE.test(v));
}

/** Returns UUID string or null when missing/invalid (safe for nullable uuid columns). */
export function normalizeOptionalUuid(value?: string | null): string | null {
    const v = value?.trim();
    if (!v) return null;
    return UUID_RE.test(v) ? v : null;
}

/**
 * Throws a standard Error when Supabase returns an error object.
 * GraphQL cannot serialize plain PostgrestError objects (NonErrorThrown).
 */
export function assertNoSupabaseError(
    error: PostgrestLikeError | null | undefined,
    context?: string,
): asserts error is null | undefined {
    if (!error) return;
    const prefix = context ? `${context}: ` : '';
    const code = error.code ? ` [${error.code}]` : '';
    throw new Error(`${prefix}${error.message}${code}`);
}
