import { Resolver, Query, Args } from '@nestjs/graphql';
import { AutomationService } from './automation.service';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class AutomationResolver {
    constructor(private svc: AutomationService) {}

    @Query(() => GraphQLJSON) async automationWorkflows(@Args('tenantId') t: string) { return this.svc.getAutomationWorkflows(t); }
    @Query(() => GraphQLJSON) async automationRuns(@Args('tenantId') t: string) { return this.svc.getAutomationRuns(t); }
    @Query(() => GraphQLJSON) async automationSchedules(@Args('tenantId') t: string) { return this.svc.getAutomationSchedules(t); }
}