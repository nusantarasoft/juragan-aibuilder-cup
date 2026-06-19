/** Minimal PostgREST / Supabase error shape. */
export type PostgrestLikeError = {
    message: string;
    code?: string;
    details?: string | null;
    hint?: string | null;
};

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
