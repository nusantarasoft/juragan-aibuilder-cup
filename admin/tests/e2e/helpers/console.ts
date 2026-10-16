import { expect, type Page } from '@playwright/test';

/** Benign noise on any admin route (not product bugs). */
const GLOBAL_IGNORE = [
    /favicon/i,
    /Failed to load resource.*404/i,
    /NetworkError/i,
    /ChunkLoadError/i,
    /ERR_CONNECTION_REFUSED/i,
    /Warning: \[antd:/i,
    /Warning: \[rc-/i,
    /THREE\.GLTFLoader/i,
    /WebGL/i,
];

/**
 * Narrow, backlog-documented exceptions only — no blanket 400/401/503 or runtime crashes.
 * Each entry must stay tied to an open backlog item or be removed when fixed.
 */
const NARROW_IGNORE: Array<{ id: string; test: (msg: string) => boolean }> = [
    // D-31: QA compose (qa-bootstrap) runs Kong/REST/Auth but not Supabase Realtime — websocket 503 is infra gap, not admin UI.
    {
        id: 'D-31',
        test: (m) =>
            /WebSocket connection to 'ws:\/\/[^']*\/realtime\/v1\/websocket/i.test(m) &&
            /503|Unexpected response code: 503/i.test(m),
    },
    // D-25 (residual): PM PostgREST embed tenant_users↔individuals until FK migration lands — only PGRST200 on that relationship.
    {
        id: 'D-25',
        test: (m) =>
            /PGRST200/i.test(m) &&
            /foreign key relationship between.*tenant_users.*individuals/i.test(m),
    },
    // D-34: Agentic OS dynamic chunk load failure on slow crawl (known flaky chunk name, not a logic error).
    {
        id: 'D-34',
        test: (m) =>
            /Loading chunk \d+ failed/i.test(m) &&
            /agentic-os/i.test(m),
    },
];

export function isIgnoredConsoleError(message: string): boolean {
    if (GLOBAL_IGNORE.some((re) => re.test(message))) return true;
    return NARROW_IGNORE.some((entry) => entry.test(message));
}

export function attachConsoleCollector(page: Page) {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
    });
    return errors;
}

export function assertCleanConsole(errors: string[]) {
    expect(errors.filter((e) => !isIgnoredConsoleError(e))).toEqual([]);
}
