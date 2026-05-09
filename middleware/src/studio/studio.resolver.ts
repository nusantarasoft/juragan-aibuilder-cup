import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { StudioService } from './studio.service';
import { GuideFlowService } from './guide-flow.service';
import { GraphQLJSONObject } from 'graphql-type-json';

@Resolver()
export class StudioResolver {
    constructor(
        private readonly studioService: StudioService,
        private readonly guideFlowService: GuideFlowService,
    ) { }

    // ── Notebooks ────────────────────────────────────────────────────

    @Query(() => [GraphQLJSONObject], { name: 'studioNotebooks' })
    async getNotebooks(
        @Args('userId', { type: () => String }) userId: string,
    ) {
        return this.studioService.getNotebooks(userId);
    }

    @Query(() => GraphQLJSONObject, { name: 'studioNotebook' })
    async getNotebook(
        @Args('notebookId', { type: () => String }) notebookId: string,
    ) {
        return this.studioService.getNotebook(notebookId);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'createStudioNotebook' })
    async createNotebook(
        @Args('name', { type: () => String }) name: string,
        @Args('description', { type: () => String, nullable: true }) description: string,
        @Args('userId', { type: () => String }) userId: string,
    ) {
        return this.studioService.createNotebook(name, description || '', userId);
    }

    @Mutation(() => Boolean, { name: 'deleteStudioNotebook' })
    async deleteNotebook(
        @Args('notebookId', { type: () => String }) notebookId: string,
    ) {
        return this.studioService.deleteNotebook(notebookId);
    }

    // ── Sources ──────────────────────────────────────────────────────

    @Mutation(() => GraphQLJSONObject, { name: 'addMediaToNotebook' })
    async addMediaToNotebook(
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('mediaId', { type: () => String }) mediaId: string,
    ) {
        return this.studioService.addMediaAsSource(notebookId, mediaId);
    }

    @Query(() => [GraphQLJSONObject], { name: 'studioSourceStatus' })
    async getSourceStatus(
        @Args('notebookId', { type: () => String }) notebookId: string,
    ) {
        return this.studioService.getSourceStatus(notebookId);
    }

    @Mutation(() => Boolean, { name: 'removeStudioSource' })
    async removeSource(
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('sourceId', { type: () => String }) sourceId: string,
    ) {
        return this.studioService.removeSource(notebookId, sourceId);
    }

    // ── Chat ─────────────────────────────────────────────────────────

    @Mutation(() => GraphQLJSONObject, { name: 'studioChat' })
    async chat(
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('question', { type: () => String }) question: string,
        @Args('conversationId', { type: () => String, nullable: true }) conversationId: string,
        @Args('userId', { type: () => String, nullable: true }) userId: string,
    ) {
        return this.studioService.chat(notebookId, question, conversationId, userId);
    }

    @Query(() => GraphQLJSONObject, { name: 'studioConversation' })
    async getConversation(
        @Args('conversationId', { type: () => String }) conversationId: string,
    ) {
        return this.studioService.getConversation(conversationId);
    }

    @Query(() => [GraphQLJSONObject], { name: 'studioConversations' })
    async getConversations(
        @Args('notebookId', { type: () => String }) notebookId: string,
    ) {
        return this.studioService.getConversations(notebookId);
    }

    // ── Generate ─────────────────────────────────────────────────────

    @Mutation(() => String, { name: 'studioGenerateReport' })
    async generateReport(
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('query', { type: () => String }) query: string,
    ) {
        return this.studioService.generateReport(notebookId, query);
    }

    // ── Guide flows ──────────────────────────────────────────────────

    @Query(() => [GraphQLJSONObject], { name: 'studioGuideFlows' })
    async listGuideFlows(
        @Args('notebookId', { type: () => String }) notebookId: string,
    ) {
        return this.guideFlowService.listFlows(notebookId);
    }

    @Query(() => GraphQLJSONObject, { name: 'studioGuideFlow' })
    async getGuideFlow(
        @Args('flowId', { type: () => String }) flowId: string,
    ) {
        return this.guideFlowService.getFlow(flowId);
    }

    @Query(() => GraphQLJSONObject, { name: 'studioPublishedGuideFlow', nullable: true })
    async getPublishedGuideFlow(
        @Args('notebookId', { type: () => String }) notebookId: string,
    ) {
        return this.guideFlowService.getPublishedFlowForNotebook(notebookId);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'createStudioGuideFlow' })
    async createGuideFlow(
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('name', { type: () => String }) name: string,
        @Args('definition', { type: () => GraphQLJSONObject, nullable: true }) definition: any,
    ) {
        return this.guideFlowService.createFlow(notebookId, name, definition ?? undefined);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'updateStudioGuideFlow' })
    async updateGuideFlow(
        @Args('flowId', { type: () => String }) flowId: string,
        @Args('name', { type: () => String, nullable: true }) name: string,
        @Args('definition', { type: () => GraphQLJSONObject, nullable: true }) definition: any,
        @Args('status', { type: () => String, nullable: true }) status: string,
    ) {
        const patch: { name?: string; definition?: unknown; status?: 'draft' | 'published' } = {};
        if (name !== undefined && name !== null) patch.name = name;
        if (definition !== undefined) patch.definition = definition;
        if (status === 'draft' || status === 'published') patch.status = status;
        return this.guideFlowService.updateFlow(flowId, patch);
    }

    @Mutation(() => Boolean, { name: 'deleteStudioGuideFlow' })
    async deleteGuideFlow(
        @Args('flowId', { type: () => String }) flowId: string,
    ) {
        return this.guideFlowService.deleteFlow(flowId);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'publishStudioGuideFlow' })
    async publishGuideFlow(
        @Args('flowId', { type: () => String }) flowId: string,
    ) {
        return this.guideFlowService.publishFlow(flowId);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'startStudioGuidedSession' })
    async startGuidedSession(
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('flowId', { type: () => String }) flowId: string,
        @Args('userId', { type: () => String, nullable: true }) userId: string,
    ) {
        return this.guideFlowService.startGuidedSession(notebookId, flowId, userId);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioGuidedChat' })
    async guidedChat(
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('flowId', { type: () => String }) flowId: string,
        @Args('conversationId', { type: () => String }) conversationId: string,
        @Args('message', { type: () => String }) message: string,
        @Args('userId', { type: () => String, nullable: true }) userId: string,
    ) {
        return this.guideFlowService.guidedChatTurn(notebookId, flowId, message, conversationId, userId);
    }
}
