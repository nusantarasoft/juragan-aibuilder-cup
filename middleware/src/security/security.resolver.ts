import { Resolver, Query, Args } from '@nestjs/graphql';
import { SecurityService } from './security.service';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class SecurityResolver {
    constructor(private svc: SecurityService) {}

    @Query(() => GraphQLJSON) async securityPolicies(@Args('tenantId') t: string) { return this.svc.getSecurityPolicies(t); }
    @Query(() => GraphQLJSON) async securityEvents(@Args('tenantId') t: string) { return this.svc.getSecurityEvents(t); }
}