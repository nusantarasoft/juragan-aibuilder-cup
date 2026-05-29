import { Resolver, Query, Args } from '@nestjs/graphql';
import { EmailService } from './email.service';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class EmailResolver {
    constructor(private svc: EmailService) {}

    @Query(() => GraphQLJSON) async emailAccounts(@Args('tenantId') t: string) { return this.svc.getEmailAccounts(t); }
    @Query(() => GraphQLJSON) async emailDomains(@Args('tenantId') t: string) { return this.svc.getEmailDomains(t); }
    @Query(() => GraphQLJSON) async emailAliases(@Args('tenantId') t: string) { return this.svc.getEmailAliases(t); }
}