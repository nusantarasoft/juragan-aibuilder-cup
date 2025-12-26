import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { BlocksService, Block } from './blocks.service';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
class BlockType {
    @Field(() => ID)
    id: string;

    @Field()
    name: string;

    @Field()
    type: string;

    @Field()
    category: string;

    @Field({ nullable: true })
    icon?: string;

    @Field(() => GraphQLJSON, { nullable: true })
    defaultProps?: Record<string, unknown>;

    @Field(() => GraphQLJSON, { nullable: true })
    schema?: Record<string, unknown>;

    @Field()
    createdAt: string;

    @Field()
    updatedAt: string;
}

@InputType()
class CreateBlockInput {
    @Field()
    name: string;

    @Field()
    type: string;

    @Field()
    category: string;

    @Field({ nullable: true })
    icon?: string;

    @Field(() => GraphQLJSON, { nullable: true })
    defaultProps?: Record<string, unknown>;

    @Field(() => GraphQLJSON, { nullable: true })
    schema?: Record<string, unknown>;
}

@InputType()
class UpdateBlockInput {
    @Field({ nullable: true })
    name?: string;

    @Field({ nullable: true })
    type?: string;

    @Field({ nullable: true })
    category?: string;

    @Field({ nullable: true })
    icon?: string;

    @Field(() => GraphQLJSON, { nullable: true })
    defaultProps?: Record<string, unknown>;

    @Field(() => GraphQLJSON, { nullable: true })
    schema?: Record<string, unknown>;
}

@ObjectType()
class DeleteBlockResponse {
    @Field()
    success: boolean;
}

@Resolver(() => BlockType)
export class BlocksResolver {
    constructor(private readonly blocksService: BlocksService) { }

    @Query(() => [BlockType], { name: 'blocks' })
    async findAll(): Promise<Block[]> {
        return this.blocksService.findAll();
    }

    @Query(() => [BlockType], { name: 'blocksByCategory' })
    async findByCategory(
        @Args('category') category: string,
    ): Promise<Block[]> {
        return this.blocksService.findByCategory(category);
    }

    @Query(() => BlockType, { name: 'block', nullable: true })
    async findOne(@Args('id', { type: () => ID }) id: string): Promise<Block | null> {
        return this.blocksService.findOne(id);
    }

    @Mutation(() => BlockType, { nullable: true })
    async createBlock(
        @Args('createBlockInput') input: CreateBlockInput,
    ): Promise<Block | null> {
        return this.blocksService.create(input);
    }

    @Mutation(() => BlockType, { nullable: true })
    async updateBlock(
        @Args('id', { type: () => ID }) id: string,
        @Args('updateBlockInput') input: UpdateBlockInput,
    ): Promise<Block | null> {
        return this.blocksService.update(id, input);
    }

    @Mutation(() => DeleteBlockResponse)
    async deleteBlock(
        @Args('id', { type: () => ID }) id: string,
    ): Promise<DeleteBlockResponse> {
        const success = await this.blocksService.delete(id);
        return { success };
    }
}
