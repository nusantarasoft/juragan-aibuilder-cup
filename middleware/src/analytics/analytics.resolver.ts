import { Resolver, Query, Args } from '@nestjs/graphql';
import { AnalyticsService } from './analytics.service';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class AnalyticsResolver {
    constructor(private svc: AnalyticsService) {}

    @Query(() => GraphQLJSON) async analyticsEvents(@Args('tenantId') t: string) { return this.svc.getAnalyticsEvents(t); }
    @Query(() => GraphQLJSON) async analyticsMetrics(@Args('tenantId') t: string) { return this.svc.getAnalyticsMetrics(t); }
}