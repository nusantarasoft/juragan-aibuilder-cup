import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class StudioWebCrawlJob {
    @Field() id!: string;
    @Field() tenantId!: string;
    @Field() name!: string;
    @Field() status!: string;
    @Field(() => GraphQLJSON) config!: Record<string, unknown>;
    @Field(() => Int) progress!: number;
    @Field(() => Int) pagesFound!: number;
    @Field(() => Int) pagesScraped!: number;
    @Field(() => Int) errors!: number;
    @Field(() => Int) documentsGenerated!: number;
    @Field({ nullable: true }) errorMessage?: string;
    @Field({ nullable: true }) startTime?: string;
    @Field({ nullable: true }) endTime?: string;
    @Field({ nullable: true }) createdAt?: string;
}

@InputType()
export class StudioWebCrawlJobInput {
    @Field() name!: string;
    @Field(() => GraphQLJSON) config!: Record<string, unknown>;
}
