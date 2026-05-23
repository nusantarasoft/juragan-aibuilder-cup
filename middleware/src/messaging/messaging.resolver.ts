import { Resolver, Query, Args } from '@nestjs/graphql';
import { MessagingService } from './messaging.service';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class MessagingResolver {
    constructor(private svc: MessagingService) {}

    @Query(() => GraphQLJSON) async messagingTopics(@Args('tenantId') t: string) { return this.svc.getMessagingTopics(t); }
    @Query(() => GraphQLJSON) async messagingQueues(@Args('tenantId') t: string) { return this.svc.getMessagingQueues(t); }
    @Query(() => GraphQLJSON) async messagingEvents(@Args('tenantId') t: string) { return this.svc.getMessagingEvents(t); }
}