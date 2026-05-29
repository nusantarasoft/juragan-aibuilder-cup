import { Resolver, Query, Args } from '@nestjs/graphql';
import { ReportsService } from './reports.service';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class ReportsResolver {
    constructor(private svc: ReportsService) {}

    @Query(() => GraphQLJSON) async allReports(@Args('tenantId') t: string) { return this.svc.getAllReports(t); }
    @Query(() => GraphQLJSON) async reportSchedules(@Args('tenantId') t: string) { return this.svc.getReportSchedules(t); }
    @Query(() => GraphQLJSON) async reportTemplates(@Args('tenantId') t: string) { return this.svc.getReportTemplates(t); }
}