import { describe, expect, it } from 'vitest';
import { isEmptyLiveOffice, isUiDemoMode, resolveOfficeRuntimeKind } from './officeRuntimeMode';

describe('officeRuntimeMode', () => {
    it('treats uiDemoMode as explicit demo only', () => {
        expect(isUiDemoMode({ uiDemoMode: true } as never)).toBe(true);
        expect(isUiDemoMode({ uiDemoMode: false } as never)).toBe(false);
        expect(isUiDemoMode(null)).toBe(false);
    });

    it('prefers live after first sync even while polling reloads', () => {
        expect(resolveOfficeRuntimeKind({ uiDemoMode: false } as never, 'loading', true)).toBe('live');
    });

    it('uses demo when ui demo flag is on', () => {
        expect(resolveOfficeRuntimeKind({ uiDemoMode: true } as never, 'ready', true)).toBe('demo');
    });

    it('detects empty live office when no DB-backed agents', () => {
        expect(isEmptyLiveOffice([{ id: 'umkm-kasir' }])).toBe(true);
        expect(isEmptyLiveOffice([{ id: 'arjuna', dbId: 'uuid' }])).toBe(false);
    });
});
