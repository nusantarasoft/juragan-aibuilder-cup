import { UseGuards } from '@nestjs/common';
import {
    Resolver,
    Query,
    Mutation,
    Args,
    ObjectType,
    Field,
    InputType,
    ID,
    Context,
} from '@nestjs/graphql';
import { UsersService } from './users.service';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ObjectType()
export class UserType {
    @Field(() => ID)
    id: string;

    @Field(() => String)
    email: string;

    @Field(() => String, { nullable: true })
    fullName?: string;

    @Field(() => String)
    role: string;

    @Field(() => String)
    status: string;

    @Field(() => String, { nullable: true })
    createdAt?: string;

    @Field(() => String, { nullable: true })
    updatedAt?: string;
}

@InputType()
export class CreateUserInput {
    @Field(() => String)
    email: string;

    @Field(() => String)
    password: string;

    @Field(() => String, { nullable: true })
    fullName?: string;

    @Field(() => String, { nullable: true })
    role?: string;
}

@InputType()
export class UpdateUserInput {
    @Field(() => String, { nullable: true })
    fullName?: string;

    @Field(() => String, { nullable: true })
    role?: string;

    @Field(() => String, { nullable: true })
    status?: string;

    @Field(() => String, { nullable: true })
    password?: string;
}

@Resolver(() => UserType)
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles('admin')
export class UsersResolver {
    constructor(private usersService: UsersService) {}

    @Query(() => [UserType])
    async users(): Promise<UserType[]> {
        return this.usersService.findAll();
    }

    @Query(() => UserType, { nullable: true })
    async user(@Args('id', { type: () => ID }) id: string): Promise<UserType | null> {
        return this.usersService.findById(id);
    }

    @Mutation(() => UserType)
    async createUser(
        @Args('input') input: CreateUserInput,
        @Context() context: { req: { user?: { id: string; role: string } } },
    ): Promise<UserType> {
        const actor = context.req.user!;
        return this.usersService.create(input, actor.role);
    }

    @Mutation(() => UserType)
    async updateUser(
        @Args('id', { type: () => ID }) id: string,
        @Args('input') input: UpdateUserInput,
        @Context() context: { req: { user?: { id: string; role: string } } },
    ): Promise<UserType> {
        const actor = context.req.user!;
        return this.usersService.update(id, input, actor.role, actor.id);
    }

    @Mutation(() => UserType)
    async setUserStatus(
        @Args('id', { type: () => ID }) id: string,
        @Args('status', { type: () => String }) status: string,
        @Context() context: { req: { user?: { id: string; role: string } } },
    ): Promise<UserType> {
        const actor = context.req.user!;
        return this.usersService.setStatus(
            id,
            status === 'inactive' ? 'inactive' : 'active',
            actor.role,
            actor.id,
        );
    }

    @Mutation(() => Boolean)
    async deleteUser(
        @Args('id', { type: () => ID }) id: string,
        @Context() context: { req: { user?: { id: string; role: string } } },
    ): Promise<boolean> {
        const actor = context.req.user!;
        return this.usersService.delete(id, actor.id);
    }
}
