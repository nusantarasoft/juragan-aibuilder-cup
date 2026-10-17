import { describe, expect, it } from 'vitest';
import { agentAutoWorkBlocked, isInsideQuietWindow, parseHm } from './aos-agent-work-gate';

describe('aos-agent-work-gate', () => {
    it('parseHm accepts HH:mm', () => {
        expect(parseHm('08:30')).toEqual({ h: 8, m: 30 });
        expect(parseHm('bad')).toBeNull();
    });

    it('blocks paused agents', () => {
        expect(agentAutoWorkBlocked('paused', null).blocked).toBe(true);
        expect(agentAutoWorkBlocked('active', null).blocked).toBe(false);
    });

    it('respects quiet hours window', () => {
        const quiet = { enabled: true, timezone: 'Asia/Jakarta', start: '09:00', end: '17:00' };
        const inside = new Date('2026-10-15T03:00:00.000Z'); // 10:00 WIB
        const outside = new Date('2026-10-15T14:00:00.000Z'); // 21:00 WIB
        expect(isInsideQuietWindow(inside, quiet)).toBe(true);
        expect(isInsideQuietWindow(outside, quiet)).toBe(false);
        expect(agentAutoWorkBlocked('active', quiet, outside).reason).toBe('quiet_hours');
    });
});
