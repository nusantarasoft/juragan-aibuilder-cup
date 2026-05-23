import { Resolver, Query, Args } from '@nestjs/graphql';
import { DevopsService } from './devops.service';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class DevopsResolver {
    constructor(private svc: DevopsService) {}

    @Query(() => GraphQLJSON) async devopsPipelines(@Args('tenantId') t: string) { return this.svc.getDevopsPipelines(t); }
    @Query(() => GraphQLJSON) async devopsBuilds(@Args('tenantId') t: string) { return this.svc.getDevopsBuilds(t); }
    @Query(() => GraphQLJSON) async devopsDeployments(@Args('tenantId') t: string) { return this.svc.getDevopsDeployments(t); }
}