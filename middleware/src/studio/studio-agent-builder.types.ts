import { Field, InputType, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

export type StudioAgentWorkflowGraph = {
    nodes: Array<{ id: string; kind: string; label: string; detail?: string; tag?: string }>;
    edges: Array<{ from: string; to: string }>;
};

@ObjectType()
export class StudioAgentWorkflow {
    @Field() id!: string;
    @Field() tenantId!: string;
    @Field() name!: string;
    @Field() description!: string;
    @Field() status!: string;
    @Field(() => GraphQLJSON) graph!: StudioAgentWorkflowGraph;
    @Field({ nullable: true }) aosPlaybookId?: string;
    @Field({ nullable: true }) lastTestedAt?: string;
    @Field({ nullable: true }) createdAt?: string;
    @Field({ nullable: true }) updatedAt?: string;
}

@InputType()
export class StudioAgentWorkflowInput {
    @Field() name!: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) graph?: StudioAgentWorkflowGraph;
    @Field({ nullable: true }) aosPlaybookId?: string;
}

@InputType()
export class StudioAgentWorkflowUpdateInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) graph?: StudioAgentWorkflowGraph;
    @Field({ nullable: true }) aosPlaybookId?: string;
}
