import { Resolver, Query, Args } from '@nestjs/graphql';
import { AuditService } from './audit.service';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class AuditResolver {
    constructor(private svc: AuditService) {}

    @Query(() => GraphQLJSON) async auditLogs(@Args('tenantId') t: string) { return this.svc.getAuditLogs(t); }
    @Query(() => GraphQLJSON) async auditRetentionPolicies(@Args('tenantId') t: string) { return this.svc.getAuditRetentionPolicies(t); }
}