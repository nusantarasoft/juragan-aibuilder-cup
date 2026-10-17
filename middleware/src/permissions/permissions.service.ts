import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PermissionsService {
    constructor(private supabaseService: SupabaseService) { }

    private get db() {
        return this.supabaseService.getAdminClient();
    }

    // ─── PROFILES ───────────────────────────────────────────

    async getProfiles(tenantId: string) {
        const { data, error } = await this.db.from('profiles').select('*').eq('tenant_id', tenantId).order('name');
        if (error) throw error;
        return data;
    }

    async getProfile(id: string) {
        const { data, error } = await this.db.from('profiles').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createProfile(tenantId: string, input: { name: string; description?: string }) {
        const { data, error } = await this.db.from('profiles').insert({
            tenant_id: tenantId, name: input.name,
            description: input.description || null, is_custom: true,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateProfile(id: string, input: { name?: string; description?: string }) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;
        const { data, error } = await this.db.from('profiles').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteProfile(id: string): Promise<boolean> {
        const { error } = await this.db.from('profiles').delete().eq('id', id).eq('is_system', false);
        if (error) throw error;
        return true;
    }

    // ─── PROFILE OBJECT PERMISSIONS ────────────────────────

    async getProfileObjectPermissions(profileId: string) {
        const { data, error } = await this.db.from('profile_object_permissions')
            .select('*').eq('profile_id', profileId).order('object_name');
        if (error) throw error;
        return data;
    }

    async upsertProfileObjectPermission(profileId: string, input: {
        objectName: string; canCreate?: boolean; canRead?: boolean;
        canEdit?: boolean; canDelete?: boolean; canViewAll?: boolean; canModifyAll?: boolean;
    }) {
        const { data, error } = await this.db.from('profile_object_permissions').upsert({
            profile_id: profileId, object_name: input.objectName,
            can_create: input.canCreate ?? false, can_read: input.canRead ?? false,
            can_edit: input.canEdit ?? false, can_delete: input.canDelete ?? false,
            can_view_all: input.canViewAll ?? false, can_modify_all: input.canModifyAll ?? false,
        }, { onConflict: 'profile_id,object_name' }).select().single();
        if (error) throw error;
        return data;
    }

    // ─── PROFILE SYSTEM PERMISSIONS ────────────────────────

    async getProfileSystemPermissions(profileId: string) {
        const { data, error } = await this.db.from('profile_system_permissions')
            .select('*').eq('profile_id', profileId).order('permission_key');
        if (error) throw error;
        return data;
    }

    async upsertProfileSystemPermission(profileId: string, permissionKey: string, isEnabled: boolean) {
        const { data, error } = await this.db.from('profile_system_permissions').upsert({
            profile_id: profileId, permission_key: permissionKey, is_enabled: isEnabled,
        }, { onConflict: 'profile_id,permission_key' }).select().single();
        if (error) throw error;
        return data;
    }

    // ─── ROLES ──────────────────────────────────────────────

    async getRoles(tenantId: string) {
        const { data, error } = await this.db.from('roles').select('*').eq('tenant_id', tenantId).order('level').order('name');
        if (error) throw error;
        return data;
    }

    async getRole(id: string) {
        const { data, error } = await this.db.from('roles').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createRole(tenantId: string, input: { name: string; description?: string; parentRoleId?: string }) {
        let level = 0;
        if (input.parentRoleId) {
            const parent = await this.getRole(input.parentRoleId);
            level = (parent?.level || 0) + 1;
        }
        const { data, error } = await this.db.from('roles').insert({
            tenant_id: tenantId, name: input.name,
            description: input.description || null,
            parent_role_id: input.parentRoleId || null, level,
        }).select().single();
        if (error) throw error;
        await this.rebuildRoleHierarchyPaths(data.id, input.parentRoleId);
        return data;
    }

    async updateRole(id: string, input: { name?: string; description?: string; parentRoleId?: string }) {
        const updates: any = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.description !== undefined) updates.description = input.description;
        if (input.parentRoleId !== undefined) {
            updates.parent_role_id = input.parentRoleId || null;
            if (input.parentRoleId) {
                const parent = await this.getRole(input.parentRoleId);
                updates.level = (parent?.level || 0) + 1;
            } else {
                updates.level = 0;
            }
        }
        if (Object.keys(updates).length === 0) return this.getRole(id);
        const { data, error } = await this.db.from('roles').update(updates).eq('id', id).select().single();
        if (error) throw error;
        if (input.parentRoleId !== undefined) {
            await this.rebuildRoleHierarchyPaths(id, input.parentRoleId);
        }
        return data;
    }

    async deleteRole(id: string): Promise<boolean> {
        await this.db.from('role_hierarchy_paths').delete().or(`ancestor_id.eq.${id},descendant_id.eq.${id}`);
        const { error } = await this.db.from('roles').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    private async rebuildRoleHierarchyPaths(roleId: string, parentRoleId?: string) {
        await this.db.from('role_hierarchy_paths').delete().eq('descendant_id', roleId);
        await this.db.from('role_hierarchy_paths').insert({ ancestor_id: roleId, descendant_id: roleId, depth: 0 });
        if (parentRoleId) {
            const { data: paths } = await this.db.from('role_hierarchy_paths')
                .select('ancestor_id, depth').eq('descendant_id', parentRoleId);
            if (paths) {
                for (const p of paths) {
                    await this.db.from('role_hierarchy_paths').insert({
                        ancestor_id: p.ancestor_id, descendant_id: roleId, depth: p.depth + 1,
                    });
                }
            }
        }
    }

    // ─── PERMISSION SETS ────────────────────────────────────

    async getPermissionSets(tenantId: string) {
        const { data, error } = await this.db.from('permission_sets').select('*').eq('tenant_id', tenantId).order('name');
        if (error) throw error;
        return data;
    }

    async getPermissionSet(id: string) {
        const { data, error } = await this.db.from('permission_sets').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createPermissionSet(tenantId: string, input: { name: string; description?: string }) {
        const { data, error } = await this.db.from('permission_sets').insert({
            tenant_id: tenantId, name: input.name, description: input.description || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async deletePermissionSet(id: string): Promise<boolean> {
        const { error } = await this.db.from('permission_sets').delete().eq('id', id).eq('is_system', false);
        if (error) throw error;
        return true;
    }

    // ─── PERMISSION SET OBJECT/SYSTEM PERMISSIONS ──────────

    async getPermissionSetObjectPermissions(permissionSetId: string) {
        const { data, error } = await this.db.from('permission_set_object_permissions')
            .select('*').eq('permission_set_id', permissionSetId).order('object_name');
        if (error) throw error;
        return data;
    }

    async upsertPermissionSetObjectPermission(permissionSetId: string, input: {
        objectName: string; canCreate?: boolean; canRead?: boolean;
        canEdit?: boolean; canDelete?: boolean; canViewAll?: boolean; canModifyAll?: boolean;
    }) {
        const { data, error } = await this.db.from('permission_set_object_permissions').upsert({
            permission_set_id: permissionSetId, object_name: input.objectName,
            can_create: input.canCreate ?? false, can_read: input.canRead ?? false,
            can_edit: input.canEdit ?? false, can_delete: input.canDelete ?? false,
            can_view_all: input.canViewAll ?? false, can_modify_all: input.canModifyAll ?? false,
        }, { onConflict: 'permission_set_id,object_name' }).select().single();
        if (error) throw error;
        return data;
    }

    async getPermissionSetSystemPermissions(permissionSetId: string) {
        const { data, error } = await this.db.from('permission_set_system_permissions')
            .select('*').eq('permission_set_id', permissionSetId).order('permission_key');
        if (error) throw error;
        return data;
    }

    async upsertPermissionSetSystemPermission(permissionSetId: string, permissionKey: string, isEnabled: boolean) {
        const { data, error } = await this.db.from('permission_set_system_permissions').upsert({
            permission_set_id: permissionSetId, permission_key: permissionKey, is_enabled: isEnabled,
        }, { onConflict: 'permission_set_id,permission_key' }).select().single();
        if (error) throw error;
        return data;
    }

    // ─── USER PERMISSION SET ASSIGNMENTS ────────────────────

    async assignPermissionSet(tenantUserId: string, permissionSetId: string) {
        const { data, error } = await this.db.from('user_permission_sets').insert({
            tenant_user_id: tenantUserId, permission_set_id: permissionSetId,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async removePermissionSet(tenantUserId: string, permissionSetId: string): Promise<boolean> {
        const { error } = await this.db.from('user_permission_sets').delete()
            .eq('tenant_user_id', tenantUserId).eq('permission_set_id', permissionSetId);
        if (error) throw error;
        return true;
    }

    // ─── TENANT USERS ───────────────────────────────────────

    async getTenantUsers(tenantId: string) {
        const { data, error } = await this.db.from('tenant_users')
            .select('*, profiles(name), roles(name), individuals!tenant_users_individual_id_fkey(first_name, last_name)')
            .eq('tenant_id', tenantId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getTenantUser(id: string) {
        const { data, error } = await this.db.from('tenant_users')
            .select('*, profiles(name), roles(name), individuals!tenant_users_individual_id_fkey(first_name, last_name)')
            .eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createTenantUser(tenantId: string, input: {
        userId?: string; individualId?: string; profileId?: string; roleId?: string;
        employeeId?: string; title?: string; department?: string; managerId?: string;
    }) {
        const { data, error } = await this.db.from('tenant_users').insert({
            tenant_id: tenantId, user_id: input.userId || null,
            individual_id: input.individualId || null,
            profile_id: input.profileId || null, role_id: input.roleId || null,
            employee_id: input.employeeId || null, title: input.title || null,
            department: input.department || null, manager_id: input.managerId || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateTenantUser(id: string, input: {
        profileId?: string; roleId?: string; individualId?: string;
        employeeId?: string; title?: string; department?: string;
        managerId?: string; isActive?: boolean;
    }) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (input.profileId !== undefined) updates.profile_id = input.profileId || null;
        if (input.roleId !== undefined) updates.role_id = input.roleId || null;
        if (input.individualId !== undefined) updates.individual_id = input.individualId || null;
        if (input.employeeId !== undefined) updates.employee_id = input.employeeId;
        if (input.title !== undefined) updates.title = input.title;
        if (input.department !== undefined) updates.department = input.department;
        if (input.managerId !== undefined) updates.manager_id = input.managerId || null;
        if (input.isActive !== undefined) updates.is_active = input.isActive;
        const { data, error } = await this.db.from('tenant_users').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    // ─── ORG-WIDE DEFAULTS ──────────────────────────────────

    async getOrgWideDefaults(tenantId: string) {
        const { data, error } = await this.db.from('org_wide_defaults').select('*').eq('tenant_id', tenantId).order('object_name');
        if (error) throw error;
        return data;
    }

    async upsertOrgWideDefault(tenantId: string, objectName: string, internalAccess: string, externalAccess?: string) {
        const { data, error } = await this.db.from('org_wide_defaults').upsert({
            tenant_id: tenantId, object_name: objectName,
            internal_access: internalAccess, external_access: externalAccess || 'private',
        }, { onConflict: 'tenant_id,object_name' }).select().single();
        if (error) throw error;
        return data;
    }

    // ─── SHARING RULES ──────────────────────────────────────

    async getSharingRules(tenantId: string, objectName?: string) {
        let query = this.db.from('sharing_rules').select('*').eq('tenant_id', tenantId);
        if (objectName) query = query.eq('object_name', objectName);
        const { data, error } = await query.order('created_at');
        if (error) throw error;
        return data;
    }

    async createSharingRule(tenantId: string, input: {
        name: string; objectName: string; ruleType: string;
        shareFromType?: string; shareFromId?: string;
        shareToType?: string; shareToId?: string;
        criteria?: any; accessLevel?: string;
    }) {
        const { data, error } = await this.db.from('sharing_rules').insert({
            tenant_id: tenantId, name: input.name, object_name: input.objectName,
            rule_type: input.ruleType, share_from_type: input.shareFromType || null,
            share_from_id: input.shareFromId || null, share_to_type: input.shareToType || null,
            share_to_id: input.shareToId || null, criteria: input.criteria || null,
            access_level: input.accessLevel || 'read',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async deleteSharingRule(id: string): Promise<boolean> {
        const { error } = await this.db.from('sharing_rules').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── FIELD PERMISSIONS ──────────────────────────────────

    async getFieldPermissions(profileId: string, objectName?: string) {
        let query = this.db.from('field_permissions').select('*').eq('profile_id', profileId);
        if (objectName) query = query.eq('object_name', objectName);
        const { data, error } = await query.order('field_name');
        if (error) throw error;
        return data;
    }

    async upsertFieldPermission(profileId: string, input: {
        objectName: string; fieldName: string; isVisible?: boolean; isEditable?: boolean;
    }) {
        const { data, error } = await this.db.from('field_permissions').upsert({
            profile_id: profileId, object_name: input.objectName, field_name: input.fieldName,
            is_visible: input.isVisible ?? true, is_editable: input.isEditable ?? true,
        }, { onConflict: 'profile_id,object_name,field_name' }).select().single();
        if (error) throw error;
        return data;
    }

    // ─── TEAMS ──────────────────────────────────────────────

    async getTeams(tenantId: string) {
        const { data, error } = await this.db.from('teams').select('*').eq('tenant_id', tenantId).order('name');
        if (error) throw error;
        return data;
    }

    async createTeam(tenantId: string, input: { name: string; description?: string }) {
        const { data, error } = await this.db.from('teams').insert({
            tenant_id: tenantId, name: input.name, description: input.description || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async deleteTeam(id: string): Promise<boolean> {
        const { error } = await this.db.from('teams').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async addTeamMember(teamId: string, tenantUserId: string, role?: string) {
        const { data, error } = await this.db.from('team_members').insert({
            team_id: teamId, tenant_user_id: tenantUserId, role: role || 'member',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async removeTeamMember(teamId: string, tenantUserId: string): Promise<boolean> {
        const { error } = await this.db.from('team_members').delete()
            .eq('team_id', teamId).eq('tenant_user_id', tenantUserId);
        if (error) throw error;
        return true;
    }

    // ─── PUBLIC GROUPS ──────────────────────────────────────

    async getPublicGroups(tenantId: string) {
        const { data, error } = await this.db.from('public_groups').select('*').eq('tenant_id', tenantId).order('name');
        if (error) throw error;
        return data;
    }

    async createPublicGroup(tenantId: string, input: { name: string; description?: string }) {
        const { data, error } = await this.db.from('public_groups').insert({
            tenant_id: tenantId, name: input.name, description: input.description || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async deletePublicGroup(id: string): Promise<boolean> {
        const { error } = await this.db.from('public_groups').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── DATA EXPORT AUDIT LOGS ─────────────────────────────

    async logDataExport(input: {
        tenantId: string; userId: string; userEmail?: string; userName?: string;
        exportType: string; module: string; fileName: string;
        recordCount?: number; dateRangeStart?: string; dateRangeEnd?: string;
        ipAddress?: string; userAgent?: string;
    }) {
        const { data, error } = await this.db.from('data_export_logs').insert({
            tenant_id: input.tenantId,
            user_id: input.userId,
            user_email: input.userEmail || null,
            user_name: input.userName || null,
            export_type: input.exportType,
            module: input.module,
            file_name: input.fileName,
            record_count: input.recordCount || 0,
            date_range_start: input.dateRangeStart || null,
            date_range_end: input.dateRangeEnd || null,
            ip_address: input.ipAddress || null,
            user_agent: input.userAgent || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async getDataExportLogs(tenantId: string, limit = 50, offset = 0) {
        const { data, error, count } = await this.db
            .from('data_export_logs')
            .select('*', { count: 'exact' })
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) throw error;
        return { logs: data || [], total: count || 0 };
    }
}
