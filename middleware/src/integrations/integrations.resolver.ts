import { Resolver, Query, Args } from '@nestjs/graphql';
import { IntegrationsService } from './integrations.service';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class IntegrationsResolver {
    constructor(private svc: IntegrationsService) {}

    @Query(() => GraphQLJSON) async integrationsInstalled(@Args('tenantId') t: string) { return this.svc.getIntegrationsInstalled(t); }
    @Query(() => GraphQLJSON) async integrationsMarketplace(@Args('tenantId') t: string) { return this.svc.getIntegrationsMarketplace(t); }
    @Query(() => GraphQLJSON) async integrationsWebhookLogs(@Args('tenantId') t: string) { return this.svc.getIntegrationsWebhookLogs(t); }
}