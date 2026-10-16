import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class StudioKnowledgeGraphStats {
    @Field(() => Int) totalNodes!: number;
    @Field(() => Int) totalEdges!: number;
    @Field(() => Int) orphanedChunks!: number;
    @Field(() => Int) embeddedChunks!: number;
}

@ObjectType()
export class StudioKnowledgeGraphNode {
    @Field() key!: string;
    @Field({ nullable: true }) parentKey?: string;
    @Field() nodeType!: string;
    @Field() label!: string;
    @Field({ nullable: true }) entityId?: string;
    @Field(() => GraphQLJSON, { nullable: true }) meta?: Record<string, unknown>;
}

@ObjectType()
export class StudioKnowledgeGraphSearchHit {
    @Field() chunkId!: string;
    @Field() sourceId!: string;
    @Field() notebookId!: string;
    @Field() filename!: string;
    @Field() content!: string;
    @Field(() => Float) similarity!: number;
}

@ObjectType()
export class StudioKnowledgeGraphOverview {
    @Field(() => StudioKnowledgeGraphStats) stats!: StudioKnowledgeGraphStats;
    @Field(() => [StudioKnowledgeGraphNode]) tree!: StudioKnowledgeGraphNode[];
}

@ObjectType()
export class StudioKnowledgeGraphChunkDetail {
    @Field() id!: string;
    @Field() notebookId!: string;
    @Field() sourceId!: string;
    @Field() filename!: string;
    @Field(() => Int) chunkIndex!: number;
    @Field() content!: string;
    @Field() hasEmbedding!: boolean;
}
