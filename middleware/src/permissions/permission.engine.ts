import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface ResolvedPermissions {
    canCreate: boolean;
    canRead: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canViewAll: boolean;
    canModifyAll: boolean;
    visibleFields: string[];
    editableFields: string[];
}

export interface RecordAccess {
    hasAccess: boolean;
    accessLevel: 'none' | 'read' | 'read_write';
    reason: string;
}

@Injectable()
export class PermissionEngine {
    constructor(private supabaseService: SupabaseService) { }

    private get db() {
        return this.supabaseService.getAdminClient();
    }

    /**
     * Resolve effective object-level permissions for a user.
     * Profile + Permission Sets (OR logic)
     */
    async resolveObjectPermissions(tenantUserId: string, objectName: string): Promise<ResolvedPermissions> {
        const { data: user } = await this.db.from('tenant_users')
            .select('profile_id').eq('id', tenantUserId).single();
        if (!user) return this.emptyPermissions();

        let result = this.emptyPermissions();

        // Layer 1: Profile
        if (user.profile_id) {
            const { data: perm } = await this.db.from('profile_object_permissions')
                .select('*').eq('profile_id', user.profile_id).eq('object_name', objectName).single();
            if (perm) {
                result.canCreate = perm.can_create;
                result.canRead = perm.can_read;
                result.canEdit = perm.can_edit;
                result.canDelete = perm.can_delete;
                result.canViewAll = perm.can_view_all;
                result.canModifyAll = perm.can_modify_all;
            }
        }

        // Layer 2: Permission Sets (additive OR)
        const { data: userPSets } = await this.db.from('user_permission_sets')
            .select('permission_set_id').eq('tenant_user_id', tenantUserId);

        if (userPSets && userPSets.length > 0) {
            const psIds = userPSets.map((ps: any) => ps.permission_set_id);
            const { data: psPerms } = await this.db.from('permission_set_object_permissions')
                .select('*').in('permission_set_id', psIds).eq('object_name', objectName);

            if (psPerms) {
                for (const p of psPerms) {
                    result.canCreate = result.canCreate || p.can_create;
                    result.canRead = result.canRead || p.can_read;
                    result.canEdit = result.canEdit || p.can_edit;
                    result.canDelete = result.canDelete || p.can_delete;
                    result.canViewAll = result.canViewAll || p.can_view_all;
                    result.canModifyAll = result.canModifyAll || p.can_modify_all;
                }
            }
        }

        return result;
    }

    /**
     * Check record-level access: OWD → Ownership → Role Hierarchy → Sharing Rules → Manual Shares
     */
    async checkRecordAccess(
        tenantUserId: string, tenantId: string,
        objectName: string, recordId: string, recordOwnerId: string,
    ): Promise<RecordAccess> {
        const { data: owd } = await this.db.from('org_wide_defaults')
            .select('internal_access').eq('tenant_id', tenantId).eq('object_name', objectName).single();
        const access = owd?.internal_access || 'private';

        if (access === 'public_rw') {
            return { hasAccess: true, accessLevel: 'read_write', reason: 'org_wide_default' };
        }

        if (tenantUserId === recordOwnerId) {
            return { hasAccess: true, accessLevel: 'read_write', reason: 'owner' };
        }

        if (access === 'public_read') {
            const ext = await this.checkExtendedAccess(tenantUserId, tenantId, objectName, recordId, recordOwnerId);
            if (ext.hasAccess && ext.accessLevel === 'read_write') return ext;
            return { hasAccess: true, accessLevel: 'read', reason: 'org_wide_default' };
        }

        return this.checkExtendedAccess(tenantUserId, tenantId, objectName, recordId, recordOwnerId);
    }

    private async checkExtendedAccess(
        tenantUserId: string, tenantId: string,
        objectName: string, recordId: string, recordOwnerId: string,
    ): Promise<RecordAccess> {
        // Role Hierarchy
        const { data: user } = await this.db.from('tenant_users').select('role_id').eq('id', tenantUserId).single();
        const { data: owner } = await this.db.from('tenant_users').select('role_id').eq('id', recordOwnerId).single();

        if (user?.role_id && owner?.role_id) {
            const { data: path } = await this.db.from('role_hierarchy_paths')
                .select('depth').eq('ancestor_id', user.role_id).eq('descendant_id', owner.role_id).single();
            if (path && path.depth > 0) {
                return { hasAccess: true, accessLevel: 'read_write', reason: 'role_hierarchy' };
            }
        }

        // Manual Shares
        const { data: shares } = await this.db.from('record_shares')
            .select('access_level').eq('object_name', objectName).eq('record_id', recordId)
            .eq('shared_with_type', 'user').eq('shared_with_id', tenantUserId);

        if (shares && shares.length > 0) {
            const best = shares.some((s: any) => s.access_level === 'read_write') ? 'read_write' : 'read';
            return { hasAccess: true, accessLevel: best as 'read' | 'read_write', reason: 'manual_share' };
        }

        // Sharing Rules
        if (user?.role_id && owner?.role_id) {
            const { data: rules } = await this.db.from('sharing_rules')
                .select('*').eq('tenant_id', tenantId).eq('object_name', objectName).eq('is_active', true)
                .eq('share_to_type', 'role').eq('share_to_id', user.role_id);

            if (rules) {
                const match = rules.find((r: any) =>
                    r.share_from_type === 'role' && r.share_from_id === owner.role_id);
                if (match) {
                    return { hasAccess: true, accessLevel: match.access_level, reason: 'sharing_rule' };
                }
            }
        }

        return { hasAccess: false, accessLevel: 'none', reason: 'no_access' };
    }

    /**
     * Resolve field-level security: Profile FLS + Permission Set FLS (OR)
     */
    async resolveFieldPermissions(tenantUserId: string, objectName: string) {
        const { data: user } = await this.db.from('tenant_users')
            .select('profile_id').eq('id', tenantUserId).single();
        const fieldMap = new Map<string, { visible: boolean; editable: boolean }>();

        if (user?.profile_id) {
            const { data: fps } = await this.db.from('field_permissions')
                .select('field_name, is_visible, is_editable')
                .eq('profile_id', user.profile_id).eq('object_name', objectName);
            if (fps) {
                for (const fp of fps) {
                    fieldMap.set(fp.field_name, { visible: fp.is_visible, editable: fp.is_editable });
                }
            }
        }

        const { data: userPSets } = await this.db.from('user_permission_sets')
            .select('permission_set_id').eq('tenant_user_id', tenantUserId);

        if (userPSets && userPSets.length > 0) {
            const psIds = userPSets.map((ps: any) => ps.permission_set_id);
            const { data: psFps } = await this.db.from('permission_set_field_permissions')
                .select('field_name, is_visible, is_editable')
                .in('permission_set_id', psIds).eq('object_name', objectName);
            if (psFps) {
                for (const fp of psFps) {
                    const existing = fieldMap.get(fp.field_name);
                    if (existing) {
                        existing.visible = existing.visible || fp.is_visible;
                        existing.editable = existing.editable || fp.is_editable;
                    } else {
                        fieldMap.set(fp.field_name, { visible: fp.is_visible, editable: fp.is_editable });
                    }
                }
            }
        }

        const visibleFields: string[] = [];
        const editableFields: string[] = [];
        for (const [field, perms] of fieldMap) {
            if (perms.visible) visibleFields.push(field);
            if (perms.editable) editableFields.push(field);
        }
        return { visibleFields, editableFields };
    }

    /**
     * Check system permission: Profile + Permission Sets (OR)
     */
    async hasSystemPermission(tenantUserId: string, permissionKey: string): Promise<boolean> {
        const { data: user } = await this.db.from('tenant_users')
            .select('profile_id').eq('id', tenantUserId).single();

        if (user?.profile_id) {
            const { data: perm } = await this.db.from('profile_system_permissions')
                .select('is_enabled').eq('profile_id', user.profile_id).eq('permission_key', permissionKey).single();
            if (perm?.is_enabled) return true;
        }

        const { data: userPSets } = await this.db.from('user_permission_sets')
            .select('permission_set_id').eq('tenant_user_id', tenantUserId);

        if (userPSets && userPSets.length > 0) {
            const psIds = userPSets.map((ps: any) => ps.permission_set_id);
            const { data: psPerms } = await this.db.from('permission_set_system_permissions')
                .select('is_enabled').in('permission_set_id', psIds).eq('permission_key', permissionKey);
            if (psPerms?.some((p: any) => p.is_enabled)) return true;
        }

        return false;
    }

    private emptyPermissions(): ResolvedPermissions {
        return {
            canCreate: false, canRead: false, canEdit: false, canDelete: false,
            canViewAll: false, canModifyAll: false,
            visibleFields: [], editableFields: [],
        };
    }
}
