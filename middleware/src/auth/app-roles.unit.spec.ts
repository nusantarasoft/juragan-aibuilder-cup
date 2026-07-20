import { describe, expect, it } from 'vitest';
import {
    APP_ROLES,
    DEFAULT_APP_ROLE,
    hasMinRole,
    isAppRole,
    normalizeAppRole,
    normalizeUserStatus,
} from './app-roles';

describe('app-roles', () => {
    it('exposes only super_admin and admin', () => {
        expect(APP_ROLES).toEqual(['super_admin', 'admin']);
        expect(DEFAULT_APP_ROLE).toBe('admin');
    });

    it('isAppRole validates supported roles', () => {
        expect(isAppRole('super_admin')).toBe(true);
        expect(isAppRole('admin')).toBe(true);
        expect(isAppRole('viewer')).toBe(false);
    });

    it('normalizeAppRole maps known and legacy values', () => {
        expect(normalizeAppRole('super_admin')).toBe('super_admin');
        expect(normalizeAppRole('Admin')).toBe('admin');
        expect(normalizeAppRole('service_role')).toBe('super_admin');
        expect(normalizeAppRole('supabase_admin')).toBe('super_admin');
        expect(normalizeAppRole('viewer')).toBe('admin');
        expect(normalizeAppRole('manager')).toBe('admin');
        expect(normalizeAppRole('authenticated')).toBe('admin');
        expect(normalizeAppRole(null)).toBe('admin');
        expect(normalizeAppRole(undefined)).toBe('admin');
        expect(normalizeAppRole('super-admin')).toBe('super_admin');
    });

    it('hasMinRole respects hierarchy', () => {
        expect(hasMinRole('super_admin', 'admin')).toBe(true);
        expect(hasMinRole('admin', 'admin')).toBe(true);
        expect(hasMinRole('admin', 'super_admin')).toBe(false);
        expect(hasMinRole('admin', ['super_admin', 'admin'])).toBe(true);
    });

    it('normalizeUserStatus defaults to active', () => {
        expect(normalizeUserStatus('inactive')).toBe('inactive');
        expect(normalizeUserStatus('active')).toBe('active');
        expect(normalizeUserStatus(null)).toBe('active');
        expect(normalizeUserStatus('weird')).toBe('active');
    });
});
