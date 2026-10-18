/** Percakapan WA inbox polling helpers (5s tick, visible tab only). */

export const STUDIO_WA_INBOX_POLL_MS = 5000;

export function shouldPollStudioWaInbox(documentHidden: boolean): boolean {
    return !documentHidden;
}

export function shouldSkipInboxFetch(inFlight: boolean): boolean {
    return inFlight;
}

export function messagesChanged<T extends { id: string }>(prev: T[], next: T[]): boolean {
    if (prev.length !== next.length) return true;
    return prev.some((m, i) => m.id !== next[i]?.id);
}
