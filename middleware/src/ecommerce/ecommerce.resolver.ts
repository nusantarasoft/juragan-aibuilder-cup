import { Resolver, Query, Args } from '@nestjs/graphql';
import { EcommerceService } from './ecommerce.service';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class EcommerceResolver {
    constructor(private svc: EcommerceService) {}

    @Query(() => GraphQLJSON) async ecommerceProducts(@Args('tenantId') t: string) { return this.svc.getEcommerceProducts(t); }
    @Query(() => GraphQLJSON) async ecommerceOrders(@Args('tenantId') t: string) { return this.svc.getEcommerceOrders(t); }
    @Query(() => GraphQLJSON) async ecommerceCustomers(@Args('tenantId') t: string) { return this.svc.getEcommerceCustomers(t); }
    @Query(() => GraphQLJSON) async ecommerceOrderItems(@Args('tenantId') t: string) { return this.svc.getEcommerceOrderItems(t); }
    @Query(() => GraphQLJSON) async ecommerceCategories(@Args('tenantId') t: string) { return this.svc.getEcommerceCategories(t); }
    @Query(() => GraphQLJSON) async ecommerceReviews(@Args('tenantId') t: string) { return this.svc.getEcommerceReviews(t); }
    @Query(() => GraphQLJSON) async ecommerceDiscounts(@Args('tenantId') t: string) { return this.svc.getEcommerceDiscounts(t); }
    @Query(() => GraphQLJSON) async ecommercePayments(@Args('tenantId') t: string) { return this.svc.getEcommercePayments(t); }
}