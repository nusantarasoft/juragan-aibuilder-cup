/**
 * Notebook icons are emoji stored in Postgres. When the DB/client encoding is
 * wrong, emojis can be persisted as replacement glyphs like "????". Treat those
 * as missing so the UI falls back to the default notebook emoji.
 */

export const DEFAULT_NOTEBOOK_ICON = "📓";

/** True when `value` looks like a usable icon (not empty / not "????" garbage). */
export function isValidNotebookIcon(value: unknown): value is string {
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    // Corrupted UTF-8 often becomes one or more ASCII '?' or the Unicode replacement char.
    if (/^[?\uFFFD]+$/u.test(trimmed)) return false;
    return true;
}

export function normalizeNotebookIcon(value?: string | null): string {
    return isValidNotebookIcon(value) ? value.trim() : DEFAULT_NOTEBOOK_ICON;
}
