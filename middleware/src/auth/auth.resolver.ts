import { Resolver, Mutation, Args, Query, Context, ObjectType, Field, InputType } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

// ============ Object Types ============

@ObjectType()
class AuthUser {
    @Field(() => String)
    id: string;

    @Field(() => String, { nullable: true })
    email?: string;

    @Field(() => String, { nullable: true })
    role?: string;

    @Field(() => String, { nullable: true })
    tenantId?: string;

    @Field(() => String, { nullable: true })
    studioSlug?: string;

    @Field(() => Boolean, { nullable: true })
    emailVerified?: boolean;
}

@ObjectType()
class AuthResponse {
    @Field(() => String, { nullable: true })
    accessToken?: string;

    @Field(() => String, { nullable: true })
    refreshToken?: string;

    @Field(() => AuthUser, { nullable: true })
    user?: AuthUser;
}

@ObjectType()
class TokenResponse {
    @Field(() => String)
    accessToken: string;

    @Field(() => String)
    refreshToken: string;
}

// ============ Input Types ============

@InputType()
class SignInInput {
    @Field()
    email: string;

    @Field()
    password: string;
}

@InputType()
class SignUpInput {
    @Field()
    email: string;

    @Field()
    password: string;

    @Field(() => String, { nullable: true })
    name?: string;
}

// ============ Resolver ============

@Resolver()
export class AuthResolver {
    constructor(private authService: AuthService) { }

    @Public()
    @Mutation(() => AuthResponse)
    async signIn(@Args('input') input: SignInInput): Promise<AuthResponse> {
        const result = await this.authService.signIn(input.email, input.password);
        return {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user ? {
                id: result.user.id,
                email: result.user.email,
                role: result.user.role,
                tenantId: (result.user as { tenantId?: string }).tenantId,
                studioSlug: (result.user as { studioSlug?: string }).studioSlug,
                emailVerified: Boolean((result.user as { emailVerified?: boolean }).emailVerified),
            } : undefined,
        };
    }

    @Public()
    @Mutation(() => AuthResponse)
    async signUp(@Args('input') input: SignUpInput): Promise<AuthResponse> {
        const result = await this.authService.signUp(input.email, input.password, {
            name: input.name,
        });
        return {
            user: result.user ? {
                id: result.user.id,
                email: result.user.email,
                role: result.user.role,
            } : undefined,
        };
    }

    @Mutation(() => Boolean)
    async signOut(@Context() context: any): Promise<boolean> {
        const authHeader = context.req?.headers?.authorization;
        if (!authHeader) {
            throw new Error('No authorization header');
        }
        const token = authHeader.replace('Bearer ', '');
        return this.authService.signOut(token);
    }

    @Public()
    @Query(() => AuthUser, { nullable: true })
    async me(@Context() context: any): Promise<AuthUser | null> {
        const authHeader = context.req?.headers?.authorization;
        if (!authHeader) {
            return null;
        }
        const token = authHeader.replace('Bearer ', '');
        const user = await this.authService.getUser(token);
        return user ? {
            id: user.id,
            email: user.email,
            role: user.role,
            tenantId: (user as { tenantId?: string }).tenantId,
            studioSlug: (user as { studioSlug?: string }).studioSlug,
            emailVerified: Boolean((user as { emailVerified?: boolean }).emailVerified),
        } : null;
    }

    @Public()
    @Mutation(() => TokenResponse)
    async refreshToken(@Args('refreshToken') refreshToken: string): Promise<TokenResponse> {
        const result = await this.authService.refreshSession(refreshToken);
        return {
            accessToken: result.accessToken || '',
            refreshToken: result.refreshToken || '',
        };
    }
}
