import { Resolver, Query, Mutation, Args, ObjectType, Field, InputType, ID } from '@nestjs/graphql';
import { StarsService } from './stars.service';

// ============ Object Types ============

@ObjectType()
export class UserStarType {
    @Field(() => ID)
    id: string;

    @Field(() => String)
    userId: string;

    @Field(() => String)
    path: string;

    @Field(() => String)
    name: string;

    @Field(() => String, { nullable: true })
    icon?: string;

    @Field(() => String, { nullable: true })
    createdAt?: string;
}

// ============ Input Types ============

@InputType()
class ToggleStarInput {
    @Field(() => String)
    path: string;

    @Field(() => String)
    name: string;

    @Field(() => String, { nullable: true })
    icon?: string;
}

// ============ Resolver ============

@Resolver(() => UserStarType)
export class StarsResolver {
    constructor(private starsService: StarsService) { }

    @Query(() => [UserStarType])
    async userStars(@Args('userId', { type: () => String }) userId: string): Promise<UserStarType[]> {
        return this.starsService.findAll(userId);
    }

    @Mutation(() => UserStarType, { nullable: true })
    async toggleStar(
        @Args('userId', { type: () => String }) userId: string,
        @Args('input') input: ToggleStarInput,
    ): Promise<UserStarType | null> {
        return this.starsService.toggle(userId, input);
    }
}
