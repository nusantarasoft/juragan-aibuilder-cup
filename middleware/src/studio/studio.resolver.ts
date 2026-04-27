import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { StudioService } from './studio.service';
import { GraphQLJSONObject } from 'graphql-type-json';

@Resolver()
export class StudioResolver {
    constructor(private readonly studioService: StudioService) { }

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
}
