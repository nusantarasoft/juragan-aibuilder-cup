import { Resolver, Query, Args } from '@nestjs/graphql';
import { CollaborationService } from './collaboration.service';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class CollaborationResolver {
    constructor(private svc: CollaborationService) {}

    @Query(() => GraphQLJSON) async collaborationChannels(@Args('tenantId') t: string) { return this.svc.getCollaborationChannels(t); }
    @Query(() => GraphQLJSON) async collaborationMessages(@Args('tenantId') t: string) { return this.svc.getCollaborationMessages(t); }
}