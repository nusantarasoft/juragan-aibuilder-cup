import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    messagesChanged,
    shouldPollStudioWaInbox,
    STUDIO_WA_INBOX_POLL_MS,
} from './studioWaInboxPoll';

describe('studioWaInboxPoll', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('polls only when tab is visible', () => {
        expect(shouldPollStudioWaInbox(false)).toBe(true);
        expect(shouldPollStudioWaInbox(true)).toBe(false);
    });

    it('detects new owner message during takeover polling window', async () => {
        let pollCount = 0;
        const fetchMessages = vi.fn(async () => {
            pollCount += 1;
            if (pollCount === 1) {
                return [{ id: 'm1', authorKind: 'owner', bodyText: 'Awal' }];
            }
            return [
                { id: 'm1', authorKind: 'owner', bodyText: 'Awal' },
                { id: 'm2', authorKind: 'owner', bodyText: 'Pesan baru saat ambil alih' },
            ];
        });

        let messages: { id: string; authorKind?: string; bodyText?: string }[] = [];
        const tick = async () => {
            if (!shouldPollStudioWaInbox(false)) return;
            const next = await fetchMessages();
            if (messagesChanged(messages, next)) messages = next;
        };

        await tick();
        expect(messages).toHaveLength(1);

        vi.advanceTimersByTime(STUDIO_WA_INBOX_POLL_MS);
        await tick();
        expect(messages).toHaveLength(2);
        expect(messages[1]?.bodyText).toContain('Pesan baru');
    });

    it('messagesChanged compares ids', () => {
        const prev = [{ id: 'a' }, { id: 'b' }];
        expect(messagesChanged(prev, [{ id: 'a' }, { id: 'b' }])).toBe(false);
        expect(messagesChanged(prev, [{ id: 'a' }, { id: 'c' }])).toBe(true);
    });
});
