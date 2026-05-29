import { Resolver, Query, Args } from '@nestjs/graphql';
import { DatasetsService } from './datasets.service';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class DatasetsResolver {
    constructor(private svc: DatasetsService) {}

    @Query(() => GraphQLJSON) async allDatasets(@Args('tenantId') t: string) { return this.svc.getAllDatasets(t); }
    @Query(() => GraphQLJSON) async datasetSources(@Args('tenantId') t: string) { return this.svc.getDatasetSources(t); }
    @Query(() => GraphQLJSON) async datasetColumns(@Args('tenantId') t: string) { return this.svc.getDatasetColumns(t); }
}