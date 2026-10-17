import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { StudioWaConversationsService } from './studio-wa-conversations.service';
import {
    StudioWaConversationRow,
    StudioWaHumanReplyResult,
    StudioWaMessageRow,
} from './studio-wa-conversations.types';

type Ctx = {
    req?: {
        user?: {
            id?: string;
            email?: string;
            fullName?: string;
            role?: string;
        } | null;
    };
};

const sessionUser = (ctx: Ctx) => {
    const user = ctx?.req?.user;
    if (!user?.id) throw new UnauthorizedException('Authentication required');
    return user;
};

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles('super_admin')
export class StudioWaConversationsResolver {
    constructor(private readonly svc: StudioWaConversationsService) {}

    @Query(() => [StudioWaConversationRow], { name: 'studioWaConversations' })
    async studioWaConversations(@Context() ctx: Ctx) {
        this.svc.assertSuperAdmin(sessionUser(ctx).role);
        return this.svc.listConversations();
    }

    @Query(() => [StudioWaMessageRow], { name: 'studioWaConversationMessages' })
    async studioWaConversationMessages(
        @Context() ctx: Ctx,
        @Args('conversationId') conversationId: string,
    ) {
        this.svc.assertSuperAdmin(sessionUser(ctx).role);
        const { messages } = await this.svc.listMessages(conversationId);
        return messages;
    }

    @Mutation(() => Boolean, { name: 'studioWaTakeoverStart' })
    async studioWaTakeoverStart(
        @Context() ctx: Ctx,
        @Args('conversationId') conversationId: string,
    ) {
        const user = sessionUser(ctx);
        this.svc.assertSuperAdmin(user.role);
        await this.svc.startTakeover(conversationId, {
            id: user.id!,
            email: user.email,
            fullName: user.fullName,
        });
        return true;
    }

    @Mutation(() => Boolean, { name: 'studioWaTakeoverRelease' })
    async studioWaTakeoverRelease(
        @Context() ctx: Ctx,
        @Args('conversationId') conversationId: string,
    ) {
        const user = sessionUser(ctx);
        this.svc.assertSuperAdmin(user.role);
        await this.svc.releaseTakeover(conversationId, { id: user.id! }, 'manual');
        return true;
    }

    @Mutation(() => StudioWaHumanReplyResult, { name: 'studioWaHumanReply' })
    async studioWaHumanReply(
        @Context() ctx: Ctx,
        @Args('conversationId') conversationId: string,
        @Args('text') text: string,
    ) {
        const user = sessionUser(ctx);
        this.svc.assertSuperAdmin(user.role);
        if (!text?.trim()) throw new ForbiddenException('Pesan tidak boleh kosong');
        return this.svc.sendHumanReply(conversationId, text, {
            id: user.id!,
            email: user.email,
            fullName: user.fullName,
        });
    }
}
