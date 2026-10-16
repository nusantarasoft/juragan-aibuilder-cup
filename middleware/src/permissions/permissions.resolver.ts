import {
    Resolver, Query, Mutation, Args,
    ObjectType, Field, ID, InputType, Float,
} from '@nestjs/graphql';
import { PermissionsService } from './permissions.service';
import { PermissionEngine } from './permission.engine';
import GraphQLJSON from 'graphql-type-json';

// ─── GraphQL Types ──────────────────────────────────────

@ObjectType()
export class Profile {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field() isSystem: boolean;
    @Field() isCustom: boolean;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
export class ObjectPermission {
    @Field(() => ID) id: string;
    @Field() objectName: string;
    @Field() canCreate: boolean;
    @Field() canRead: boolean;
    @Field() canEdit: boolean;
    @Field() canDelete: boolean;
    @Field() canViewAll: boolean;
    @Field() canModifyAll: boolean;
}

@ObjectType()
export class SystemPermission {
    @Field(() => ID) id: string;
    @Field() permissionKey: string;
    @Field() isEnabled: boolean;
}

@ObjectType()
export class Role {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) parentRoleId?: string;
    @Field() level: number;
    @Field({ nullable: true }) description?: string;
    @Field() createdAt: string;
}

@ObjectType()
export class PermissionSet {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field() isSystem: boolean;
    @Field() createdAt: string;
}

@ObjectType()
export class OrgWideDefault {
    @Field(() => ID) id: string;
    @Field() objectName: string;
    @Field() internalAccess: string;
    @Field() externalAccess: string;
}

@ObjectType()
export class SharingRule {
    @Field(() => ID) id: string;
    @Field() name: string;
    @Field() objectName: string;
    @Field() ruleType: string;
    @Field({ nullable: true }) shareFromType?: string;
    @Field({ nullable: true }) shareFromId?: string;
    @Field({ nullable: true }) shareToType?: string;
    @Field({ nullable: true }) shareToId?: string;
    @Field(() => GraphQLJSON, { nullable: true }) criteria?: any;
    @Field() accessLevel: string;
    @Field() isActive: boolean;
}

@ObjectType()
export class FieldPermission {
    @Field(() => ID) id: string;
    @Field() objectName: string;
    @Field() fieldName: string;
    @Field() isVisible: boolean;
    @Field() isEditable: boolean;
}

@ObjectType()
export class Team {
    @Field(() => ID) id: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
}

@ObjectType()
export class PublicGroup {
    @Field(() => ID) id: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
}

@ObjectType()
export class TenantUser {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) userId?: string;
    @Field({ nullable: true }) individualId?: string;
    @Field({ nullable: true }) profileId?: string;
    @Field({ nullable: true }) roleId?: string;
    @Field({ nullable: true }) employeeId?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) department?: string;
    @Field({ nullable: true }) managerId?: string;
    @Field() isActive: boolean;
    @Field({ nullable: true }) lastLogin?: string;
    @Field() createdAt: string;
    // Nested
    @Field({ nullable: true }) profileName?: string;
    @Field({ nullable: true }) roleName?: string;
    @Field({ nullable: true }) individualName?: string;
}

@ObjectType()
export class ResolvedObjectPerms {
    @Field() canCreate: boolean;
    @Field() canRead: boolean;
    @Field() canEdit: boolean;
    @Field() canDelete: boolean;
    @Field() canViewAll: boolean;
    @Field() canModifyAll: boolean;
}

@ObjectType()
export class RecordAccessResult {
    @Field() hasAccess: boolean;
    @Field() accessLevel: string;
    @Field() reason: string;
}

// ─── Input Types ────────────────────────────────────────

@InputType()
export class CreateProfileInput {
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
}

@InputType()
export class UpdateProfileInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) description?: string;
}

@InputType()
export class ObjectPermissionInput {
    @Field() objectName: string;
    @Field({ nullable: true }) canCreate?: boolean;
    @Field({ nullable: true }) canRead?: boolean;
    @Field({ nullable: true }) canEdit?: boolean;
    @Field({ nullable: true }) canDelete?: boolean;
    @Field({ nullable: true }) canViewAll?: boolean;
    @Field({ nullable: true }) canModifyAll?: boolean;
}

@InputType()
export class CreateRoleInput {
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) parentRoleId?: string;
}

@InputType()
export class UpdateRoleInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) parentRoleId?: string;
}

@InputType()
export class CreatePermissionSetInput {
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
}

@InputType()
export class CreateSharingRuleInput {
    @Field() name: string;
    @Field() objectName: string;
    @Field() ruleType: string;
    @Field({ nullable: true }) shareFromType?: string;
    @Field({ nullable: true }) shareFromId?: string;
    @Field({ nullable: true }) shareToType?: string;
    @Field({ nullable: true }) shareToId?: string;
    @Field(() => GraphQLJSON, { nullable: true }) criteria?: any;
    @Field({ nullable: true }) accessLevel?: string;
}

@InputType()
export class FieldPermissionInput {
    @Field() objectName: string;
    @Field() fieldName: string;
    @Field({ nullable: true }) isVisible?: boolean;
    @Field({ nullable: true }) isEditable?: boolean;
}

@InputType()
export class CreateTenantUserInput {
    @Field({ nullable: true }) userId?: string;
    @Field({ nullable: true }) individualId?: string;
    @Field({ nullable: true }) profileId?: string;
    @Field({ nullable: true }) roleId?: string;
    @Field({ nullable: true }) employeeId?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) department?: string;
    @Field({ nullable: true }) managerId?: string;
}

@InputType()
export class UpdateTenantUserInput {
    @Field({ nullable: true }) profileId?: string;
    @Field({ nullable: true }) roleId?: string;
    @Field({ nullable: true }) individualId?: string;
    @Field({ nullable: true }) employeeId?: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) department?: string;
    @Field({ nullable: true }) managerId?: string;
    @Field({ nullable: true }) isActive?: boolean;
}

// ─── Mappers ────────────────────────────────────────────

function mapProfile(d: any): Profile {
    return {
        id: d.id, tenantId: d.tenant_id, name: d.name,
        description: d.description, isSystem: d.is_system, isCustom: d.is_custom,
        createdAt: d.created_at, updatedAt: d.updated_at,
    };
}

function mapObjPerm(d: any): ObjectPermission {
    return {
        id: d.id, objectName: d.object_name,
        canCreate: d.can_create, canRead: d.can_read,
        canEdit: d.can_edit, canDelete: d.can_delete,
        canViewAll: d.can_view_all, canModifyAll: d.can_modify_all,
    };
}

function mapSysPerm(d: any): SystemPermission {
    return { id: d.id, permissionKey: d.permission_key, isEnabled: d.is_enabled };
}

function mapRole(d: any): Role {
    return {
        id: d.id, tenantId: d.tenant_id, name: d.name,
        parentRoleId: d.parent_role_id, level: d.level,
        description: d.description, createdAt: d.created_at,
    };
}

function mapPermSet(d: any): PermissionSet {
    return {
        id: d.id, tenantId: d.tenant_id, name: d.name,
        description: d.description, isSystem: d.is_system, createdAt: d.created_at,
    };
}

function mapOWD(d: any): OrgWideDefault {
    return {
        id: d.id, objectName: d.object_name,
        internalAccess: d.internal_access, externalAccess: d.external_access,
    };
}

function mapSharingRule(d: any): SharingRule {
    return {
        id: d.id, name: d.name, objectName: d.object_name,
        ruleType: d.rule_type, shareFromType: d.share_from_type,
        shareFromId: d.share_from_id, shareToType: d.share_to_type,
        shareToId: d.share_to_id, criteria: d.criteria,
        accessLevel: d.access_level, isActive: d.is_active,
    };
}

function mapFieldPerm(d: any): FieldPermission {
    return {
        id: d.id, objectName: d.object_name, fieldName: d.field_name,
        isVisible: d.is_visible, isEditable: d.is_editable,
    };
}

function mapTenantUser(d: any): TenantUser {
    return {
        id: d.id, tenantId: d.tenant_id, userId: d.user_id,
        individualId: d.individual_id, profileId: d.profile_id,
        roleId: d.role_id, employeeId: d.employee_id,
        title: d.title, department: d.department,
        managerId: d.manager_id, isActive: d.is_active,
        lastLogin: d.last_login, createdAt: d.created_at,
        profileName: d.profiles?.name,
        roleName: d.roles?.name,
        individualName: d.individuals
            ? `${d.individuals.first_name} ${d.individuals.last_name}`
            : null,
    };
}

// ─── Export Audit Log Types ─────────────────────────────

@ObjectType()
class DataExportLog {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() userId: string;
    @Field({ nullable: true }) userEmail?: string;
    @Field({ nullable: true }) userName?: string;
    @Field() exportType: string;
    @Field() module: string;
    @Field() fileName: string;
    @Field() recordCount: number;
    @Field({ nullable: true }) dateRangeStart?: string;
    @Field({ nullable: true }) dateRangeEnd?: string;
    @Field({ nullable: true }) ipAddress?: string;
    @Field({ nullable: true }) userAgent?: string;
    @Field() createdAt: string;
}

@ObjectType()
class DataExportLogResult {
    @Field(() => [DataExportLog]) logs: DataExportLog[];
    @Field() total: number;
}

@InputType()
class LogDataExportInput {
    @Field() tenantId: string;
    @Field() userId: string;
    @Field({ nullable: true }) userEmail?: string;
    @Field({ nullable: true }) userName?: string;
    @Field() exportType: string;
    @Field() module: string;
    @Field() fileName: string;
    @Field({ nullable: true }) recordCount?: number;
    @Field({ nullable: true }) dateRangeStart?: string;
    @Field({ nullable: true }) dateRangeEnd?: string;
    @Field({ nullable: true }) ipAddress?: string;
    @Field({ nullable: true }) userAgent?: string;
}

function mapExportLog(d: any): DataExportLog {
    return {
        id: d.id,
        tenantId: d.tenant_id,
        userId: d.user_id,
        userEmail: d.user_email,
        userName: d.user_name,
        exportType: d.export_type,
        module: d.module,
        fileName: d.file_name,
        recordCount: d.record_count || 0,
        dateRangeStart: d.date_range_start,
        dateRangeEnd: d.date_range_end,
        ipAddress: d.ip_address,
        userAgent: d.user_agent,
        createdAt: d.created_at,
    };
}

// ─── Resolver ───────────────────────────────────────────

@Resolver()
export class PermissionsResolver {
    constructor(
        private permissionsService: PermissionsService,
        private permissionEngine: PermissionEngine,
    ) { }

    // ─── Profiles ───

    @Query(() => [Profile])
    async profiles(@Args('tenantId') tenantId: string) {
        return (await this.permissionsService.getProfiles(tenantId)).map(mapProfile);
    }

    @Query(() => Profile, { nullable: true })
    async profile(@Args('id') id: string) {
        const d = await this.permissionsService.getProfile(id);
        return d ? mapProfile(d) : null;
    }

    @Mutation(() => Profile)
    async createProfile(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateProfileInput,
    ) {
        return mapProfile(await this.permissionsService.createProfile(tenantId, input));
    }

    @Mutation(() => Profile)
    async updateProfile(
        @Args('id') id: string,
        @Args('input') input: UpdateProfileInput,
    ) {
        return mapProfile(await this.permissionsService.updateProfile(id, input));
    }

    @Mutation(() => Boolean)
    async deleteProfile(@Args('id') id: string) {
        return this.permissionsService.deleteProfile(id);
    }

    // ─── Profile Object Permissions ───

    @Query(() => [ObjectPermission])
    async profileObjectPermissions(@Args('profileId') profileId: string) {
        return (await this.permissionsService.getProfileObjectPermissions(profileId)).map(mapObjPerm);
    }

    @Mutation(() => ObjectPermission)
    async upsertProfileObjectPermission(
        @Args('profileId') profileId: string,
        @Args('input') input: ObjectPermissionInput,
    ) {
        return mapObjPerm(await this.permissionsService.upsertProfileObjectPermission(profileId, input));
    }

    // ─── Profile System Permissions ───

    @Query(() => [SystemPermission])
    async profileSystemPermissions(@Args('profileId') profileId: string) {
        return (await this.permissionsService.getProfileSystemPermissions(profileId)).map(mapSysPerm);
    }

    @Mutation(() => SystemPermission)
    async upsertProfileSystemPermission(
        @Args('profileId') profileId: string,
        @Args('permissionKey') permissionKey: string,
        @Args('isEnabled') isEnabled: boolean,
    ) {
        return mapSysPerm(await this.permissionsService.upsertProfileSystemPermission(profileId, permissionKey, isEnabled));
    }

    // ─── Roles ───

    @Query(() => [Role])
    async roles(@Args('tenantId') tenantId: string) {
        return (await this.permissionsService.getRoles(tenantId)).map(mapRole);
    }

    @Query(() => Role, { nullable: true })
    async role(@Args('id') id: string) {
        const d = await this.permissionsService.getRole(id);
        return d ? mapRole(d) : null;
    }

    @Mutation(() => Role)
    async createRole(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateRoleInput,
    ) {
        return mapRole(await this.permissionsService.createRole(tenantId, input));
    }

    @Mutation(() => Role)
    async updateRole(
        @Args('id') id: string,
        @Args('input') input: UpdateRoleInput,
    ) {
        return mapRole(await this.permissionsService.updateRole(id, input));
    }

    @Mutation(() => Boolean)
    async deleteRole(@Args('id') id: string) {
        return this.permissionsService.deleteRole(id);
    }

    // ─── Permission Sets ───

    @Query(() => [PermissionSet])
    async permissionSets(@Args('tenantId') tenantId: string) {
        return (await this.permissionsService.getPermissionSets(tenantId)).map(mapPermSet);
    }

    @Query(() => PermissionSet, { nullable: true })
    async permissionSet(@Args('id') id: string) {
        const d = await this.permissionsService.getPermissionSet(id);
        return d ? mapPermSet(d) : null;
    }

    @Mutation(() => PermissionSet)
    async createPermissionSet(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreatePermissionSetInput,
    ) {
        return mapPermSet(await this.permissionsService.createPermissionSet(tenantId, input));
    }

    @Mutation(() => Boolean)
    async deletePermissionSet(@Args('id') id: string) {
        return this.permissionsService.deletePermissionSet(id);
    }

    // ─── Permission Set Object/System Permissions ───

    @Query(() => [ObjectPermission])
    async permissionSetObjectPermissions(@Args('permissionSetId') permissionSetId: string) {
        return (await this.permissionsService.getPermissionSetObjectPermissions(permissionSetId)).map(mapObjPerm);
    }

    @Mutation(() => ObjectPermission)
    async upsertPermissionSetObjectPermission(
        @Args('permissionSetId') permissionSetId: string,
        @Args('input') input: ObjectPermissionInput,
    ) {
        return mapObjPerm(await this.permissionsService.upsertPermissionSetObjectPermission(permissionSetId, input));
    }

    @Query(() => [SystemPermission])
    async permissionSetSystemPermissions(@Args('permissionSetId') permissionSetId: string) {
        return (await this.permissionsService.getPermissionSetSystemPermissions(permissionSetId)).map(mapSysPerm);
    }

    @Mutation(() => SystemPermission)
    async upsertPermissionSetSystemPermission(
        @Args('permissionSetId') permissionSetId: string,
        @Args('permissionKey') permissionKey: string,
        @Args('isEnabled') isEnabled: boolean,
    ) {
        return mapSysPerm(await this.permissionsService.upsertPermissionSetSystemPermission(permissionSetId, permissionKey, isEnabled));
    }

    // ─── User Permission Set Assignments ───

    @Mutation(() => Boolean)
    async assignPermissionSet(
        @Args('tenantUserId') tenantUserId: string,
        @Args('permissionSetId') permissionSetId: string,
    ) {
        await this.permissionsService.assignPermissionSet(tenantUserId, permissionSetId);
        return true;
    }

    @Mutation(() => Boolean)
    async removeUserPermissionSet(
        @Args('tenantUserId') tenantUserId: string,
        @Args('permissionSetId') permissionSetId: string,
    ) {
        return this.permissionsService.removePermissionSet(tenantUserId, permissionSetId);
    }

    // ─── Tenant Users ───

    @Query(() => [TenantUser])
    async tenantUsers(@Args('tenantId') tenantId: string) {
        return (await this.permissionsService.getTenantUsers(tenantId)).map(mapTenantUser);
    }

    @Query(() => TenantUser, { nullable: true })
    async tenantUser(@Args('id') id: string) {
        const d = await this.permissionsService.getTenantUser(id);
        return d ? mapTenantUser(d) : null;
    }

    @Mutation(() => TenantUser)
    async createTenantUser(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateTenantUserInput,
    ) {
        const d = await this.permissionsService.createTenantUser(tenantId, input);
        return mapTenantUser(d);
    }

    @Mutation(() => TenantUser)
    async updateTenantUser(
        @Args('id') id: string,
        @Args('input') input: UpdateTenantUserInput,
    ) {
        const d = await this.permissionsService.updateTenantUser(id, input);
        return mapTenantUser(d);
    }

    // ─── OWD ───

    @Query(() => [OrgWideDefault])
    async orgWideDefaults(@Args('tenantId') tenantId: string) {
        return (await this.permissionsService.getOrgWideDefaults(tenantId)).map(mapOWD);
    }

    @Mutation(() => OrgWideDefault)
    async upsertOrgWideDefault(
        @Args('tenantId') tenantId: string,
        @Args('objectName') objectName: string,
        @Args('internalAccess') internalAccess: string,
        @Args('externalAccess', { nullable: true }) externalAccess?: string,
    ) {
        return mapOWD(await this.permissionsService.upsertOrgWideDefault(tenantId, objectName, internalAccess, externalAccess));
    }

    // ─── Sharing Rules ───

    @Query(() => [SharingRule])
    async sharingRules(
        @Args('tenantId') tenantId: string,
        @Args('objectName', { nullable: true }) objectName?: string,
    ) {
        return (await this.permissionsService.getSharingRules(tenantId, objectName)).map(mapSharingRule);
    }

    @Mutation(() => SharingRule)
    async createSharingRule(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateSharingRuleInput,
    ) {
        return mapSharingRule(await this.permissionsService.createSharingRule(tenantId, input));
    }

    @Mutation(() => Boolean)
    async deleteSharingRule(@Args('id') id: string) {
        return this.permissionsService.deleteSharingRule(id);
    }

    // ─── Field Permissions ───

    @Query(() => [FieldPermission])
    async fieldPermissions(
        @Args('profileId') profileId: string,
        @Args('objectName', { nullable: true }) objectName?: string,
    ) {
        return (await this.permissionsService.getFieldPermissions(profileId, objectName)).map(mapFieldPerm);
    }

    @Mutation(() => FieldPermission)
    async upsertFieldPermission(
        @Args('profileId') profileId: string,
        @Args('input') input: FieldPermissionInput,
    ) {
        return mapFieldPerm(await this.permissionsService.upsertFieldPermission(profileId, input));
    }

    // ─── Teams ───

    @Query(() => [Team])
    async teams(@Args('tenantId') tenantId: string) {
        return (await this.permissionsService.getTeams(tenantId)).map((d: any) => ({
            id: d.id, name: d.name, description: d.description,
        }));
    }

    @Mutation(() => Team)
    async createTeam(
        @Args('tenantId') tenantId: string,
        @Args('name') name: string,
        @Args('description', { nullable: true }) description?: string,
    ) {
        const d = await this.permissionsService.createTeam(tenantId, { name, description });
        return { id: d.id, name: d.name, description: d.description };
    }

    @Mutation(() => Boolean)
    async deleteTeam(@Args('id') id: string) {
        return this.permissionsService.deleteTeam(id);
    }

    @Mutation(() => Boolean)
    async addTeamMember(
        @Args('teamId') teamId: string,
        @Args('tenantUserId') tenantUserId: string,
        @Args('role', { nullable: true }) role?: string,
    ) {
        await this.permissionsService.addTeamMember(teamId, tenantUserId, role);
        return true;
    }

    @Mutation(() => Boolean)
    async removeTeamMember(
        @Args('teamId') teamId: string,
        @Args('tenantUserId') tenantUserId: string,
    ) {
        return this.permissionsService.removeTeamMember(teamId, tenantUserId);
    }

    // ─── Public Groups ───

    @Query(() => [PublicGroup])
    async publicGroups(@Args('tenantId') tenantId: string) {
        return (await this.permissionsService.getPublicGroups(tenantId)).map((d: any) => ({
            id: d.id, name: d.name, description: d.description,
        }));
    }

    @Mutation(() => PublicGroup)
    async createPublicGroup(
        @Args('tenantId') tenantId: string,
        @Args('name') name: string,
        @Args('description', { nullable: true }) description?: string,
    ) {
        const d = await this.permissionsService.createPublicGroup(tenantId, { name, description });
        return { id: d.id, name: d.name, description: d.description };
    }

    @Mutation(() => Boolean)
    async deletePublicGroup(@Args('id') id: string) {
        return this.permissionsService.deletePublicGroup(id);
    }

    // ─── Permission Engine (Resolution) ───

    @Query(() => ResolvedObjectPerms)
    async resolveObjectPermissions(
        @Args('tenantUserId') tenantUserId: string,
        @Args('objectName') objectName: string,
    ) {
        return this.permissionEngine.resolveObjectPermissions(tenantUserId, objectName);
    }

    @Query(() => RecordAccessResult)
    async checkRecordAccess(
        @Args('tenantUserId') tenantUserId: string,
        @Args('tenantId') tenantId: string,
        @Args('objectName') objectName: string,
        @Args('recordId') recordId: string,
        @Args('recordOwnerId') recordOwnerId: string,
    ) {
        return this.permissionEngine.checkRecordAccess(tenantUserId, tenantId, objectName, recordId, recordOwnerId);
    }

    @Query(() => Boolean)
    async hasSystemPermission(
        @Args('tenantUserId') tenantUserId: string,
        @Args('permissionKey') permissionKey: string,
    ) {
        return this.permissionEngine.hasSystemPermission(tenantUserId, permissionKey);
    }

    // ─── Data Export Audit Logs ───

    @Mutation(() => DataExportLog)
    async logDataExport(@Args('input') input: LogDataExportInput) {
        const d = await this.permissionsService.logDataExport(input);
        return mapExportLog(d);
    }

    @Query(() => DataExportLogResult)
    async dataExportLogs(
        @Args('tenantId') tenantId: string,
        @Args('limit', { nullable: true, defaultValue: 50 }) limit?: number,
        @Args('offset', { nullable: true, defaultValue: 0 }) offset?: number,
    ) {
        const result = await this.permissionsService.getDataExportLogs(tenantId, limit, offset);
        return { logs: result.logs.map(mapExportLog), total: result.total };
    }

    // ─── Admin access-analyzer aliases (wave-4) ───

    @Query(() => [RbacProfileSummary])
    async rbacProfiles(@Args('tenantId') tenantId: string) {
        const profiles = await this.permissionsService.getProfiles(tenantId);
        return Promise.all(profiles.map(async (p: any) => {
            const [obj, sys] = await Promise.all([
                this.permissionsService.getProfileObjectPermissions(p.id),
                this.permissionsService.getProfileSystemPermissions(p.id),
            ]);
            const objectPermissions = JSON.stringify((obj || []).map((o: any) => ({
                object: o.object_name,
                create: o.can_create, read: o.can_read, edit: o.can_edit,
                delete: o.can_delete, viewAll: o.can_view_all, modifyAll: o.can_modify_all,
            })));
            const systemPermissions = JSON.stringify((sys || []).filter((s: any) => s.is_enabled).map((s: any) => s.permission_key));
            return { id: p.id, name: p.name, description: p.description || '', objectPermissions, systemPermissions };
        }));
    }

    @Query(() => [RbacRoleSummary])
    async rbacRoles(@Args('tenantId') tenantId: string) {
        return (await this.permissionsService.getRoles(tenantId)).map((r: any) => ({
            id: r.id, name: r.name, parentId: r.parent_id, description: r.description || '',
        }));
    }

    @Query(() => [RbacPermissionSetSummary])
    async rbacPermissionSets(@Args('tenantId') tenantId: string) {
        return Promise.all((await this.permissionsService.getPermissionSets(tenantId)).map(async (ps: any) => {
            const [obj, sys] = await Promise.all([
                this.permissionsService.getPermissionSetObjectPermissions(ps.id),
                this.permissionsService.getPermissionSetSystemPermissions(ps.id),
            ]);
            return {
                id: ps.id, name: ps.name, description: ps.description || '',
                objectPermissions: JSON.stringify(obj || []),
                systemPermissions: JSON.stringify((sys || []).filter((s: any) => s.is_enabled).map((s: any) => s.permission_key)),
                assignedUsers: '[]',
            };
        }));
    }

    @Query(() => [RbacSharingRuleSummary])
    async rbacSharingRules(@Args('tenantId') tenantId: string) {
        return (await this.permissionsService.getSharingRules(tenantId)).map((r: any) => ({
            id: r.id, name: r.name, objectName: r.object_name, type: r.rule_type,
            sharedFrom: r.share_from_id || r.share_from_type || '',
            sharedTo: r.share_to_id || r.share_to_type || '',
            accessLevel: r.access_level,
        }));
    }

    @Query(() => [RbacOwdSummary])
    async rbacOrgWideDefaults(@Args('tenantId') tenantId: string) {
        return (await this.permissionsService.getOrgWideDefaults(tenantId)).map((o: any) => ({
            id: o.id, objectName: o.object_name, defaultAccess: o.internal_access,
        }));
    }
}

@ObjectType()
class RbacProfileSummary {
    @Field(() => ID) id: string;
    @Field() name: string;
    @Field() description: string;
    @Field() objectPermissions: string;
    @Field() systemPermissions: string;
}

@ObjectType()
class RbacRoleSummary {
    @Field(() => ID) id: string;
    @Field() name: string;
    @Field({ nullable: true }) parentId?: string;
    @Field() description: string;
}

@ObjectType()
class RbacPermissionSetSummary {
    @Field(() => ID) id: string;
    @Field() name: string;
    @Field() description: string;
    @Field() objectPermissions: string;
    @Field() systemPermissions: string;
    @Field() assignedUsers: string;
}

@ObjectType()
class RbacSharingRuleSummary {
    @Field(() => ID) id: string;
    @Field() name: string;
    @Field() objectName: string;
    @Field() type: string;
    @Field() sharedFrom: string;
    @Field() sharedTo: string;
    @Field() accessLevel: string;
}

@ObjectType()
class RbacOwdSummary {
    @Field(() => ID) id: string;
    @Field() objectName: string;
    @Field() defaultAccess: string;
}
