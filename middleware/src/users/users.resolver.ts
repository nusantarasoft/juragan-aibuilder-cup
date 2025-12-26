import { Resolver, Query, Mutation, Args, ObjectType, Field, InputType, ID } from '@nestjs/graphql';
import { UsersService } from './users.service';

// ============ Object Types ============

@ObjectType()
export class UserType {
    @Field(() => ID)
    id: string;

    @Field(() => String)
    email: string;

    @Field(() => String, { nullable: true })
    name?: string;

    @Field(() => String, { nullable: true })
    role?: string;

    @Field(() => String, { nullable: true })
    createdAt?: string;

    @Field(() => String, { nullable: true })
    updatedAt?: string;
}

// ============ Input Types ============

@InputType()
class UpdateUserInput {
    @Field(() => String, { nullable: true })
    name?: string;

    @Field(() => String, { nullable: true })
    role?: string;
}

// ============ Resolver ============

@Resolver(() => UserType)
export class UsersResolver {
    constructor(private usersService: UsersService) { }

    @Query(() => [UserType])
    async users(): Promise<UserType[]> {
        return this.usersService.findAll();
    }

    @Query(() => UserType, { nullable: true })
    async user(@Args('id', { type: () => ID }) id: string): Promise<UserType | null> {
        return this.usersService.findById(id);
    }

    @Mutation(() => UserType)
    async updateUser(
        @Args('id', { type: () => ID }) id: string,
        @Args('input') input: UpdateUserInput,
    ): Promise<UserType> {
        return this.usersService.update(id, input);
    }

    @Mutation(() => Boolean)
    async deleteUser(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
        return this.usersService.delete(id);
    }
}
