import { Resolver, Query, Args } from '@nestjs/graphql';
import { DocumentsService } from './documents.service';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class DocumentsResolver {
    constructor(private svc: DocumentsService) {}

    @Query(() => GraphQLJSON) async allDocuments(@Args('tenantId') t: string) { return this.svc.getAllDocuments(t); }
    @Query(() => GraphQLJSON) async documentVersions(@Args('tenantId') t: string) { return this.svc.getDocumentVersions(t); }
    @Query(() => GraphQLJSON) async documentShares(@Args('tenantId') t: string) { return this.svc.getDocumentShares(t); }
    @Query(() => GraphQLJSON) async documentWorkflows(@Args('tenantId') t: string) { return this.svc.getDocumentWorkflows(t); }
}