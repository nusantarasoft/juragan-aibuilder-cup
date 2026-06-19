import { describe, expect, it } from 'vitest';
import { isAuthGraphQLError } from '@/lib/graphqlClient';
import { normalizeRole, ROLE_LABELS } from '@/store/useAuthStore';

describe('graphqlClient.isAuthGraphQLError', () => {
    it('detects JWT and session related GraphQL errors', () => {
        expect(isAuthGraphQLError('JWT expired')).toBe(true);
        expect(isAuthGraphQLError('Invalid token')).toBe(true);
        expect(isAuthGraphQLError('Not authenticated')).toBe(true);
        expect(isAuthGraphQLError('Unauthorized access')).toBe(true);
    });

    it('ignores unrelated GraphQL errors', () => {
        expect(isAuthGraphQLError('Network request failed')).toBe(false);
        expect(isAuthGraphQLError('Validation failed for field email')).toBe(false);
    });
});

describe('useAuthStore.normalizeRole', () => {
    it('maps known CMS roles', () => {
        expect(normalizeRole('super_admin')).toBe('super_admin');
        expect(normalizeRole('admin')).toBe('admin');
        expect(normalizeRole('manager')).toBe('manager');
    });

    it('maps Supabase authenticated role to viewer', () => {
        expect(normalizeRole('authenticated')).toBe('viewer');
    });

    it('maps service roles to super_admin', () => {
        expect(normalizeRole('service_role')).toBe('super_admin');
        expect(normalizeRole('supabase_admin')).toBe('super_admin');
    });

    it('defaults empty values to viewer', () => {
        expect(normalizeRole(undefined)).toBe('viewer');
        expect(normalizeRole(null)).toBe('viewer');
        expect(normalizeRole('unknown-role')).toBe('viewer');
    });
});

describe('ROLE_LABELS', () => {
    it('provides human-readable labels for all app roles', () => {
        expect(ROLE_LABELS.super_admin).toBe('Super Admin');
        expect(ROLE_LABELS.admin).toBe('Administrator');
        expect(ROLE_LABELS.viewer).toBe('Viewer');
    });
});
