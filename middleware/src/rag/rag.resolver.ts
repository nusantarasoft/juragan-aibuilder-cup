import { Resolver, Mutation, Query, Args, ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { RagService } from './rag.service';

@ObjectType()
export class MediaSearchResult {
    @Field()
    id: string;

    @Field()
    filename: string;

    @Field(() => Float)
    score: number;
}

@Resolver()
export class RagResolver {
    constructor(private readonly ragService: RagService) { }

    @Query(() => [MediaSearchResult])
    async semanticSearch(
        @Args('query') query: string,
        @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number
    ): Promise<MediaSearchResult[]> {
        return this.ragService.semanticSearch(query, limit);
    }

    @Query(() => String)
    async chatWithLibrary(@Args('query') query: string): Promise<string> {
        return this.ragService.generateAnswer(query);
    }

    @Mutation(() => String)
    async chatWithSources(
        @Args('query') query: string,
        @Args('mediaIds', { type: () => [String] }) mediaIds: string[]
    ): Promise<string> {
        return this.ragService.chatWithSources(query, mediaIds);
    }

    @Mutation(() => String)
    async generateReport(
        @Args('query') query: string,
        @Args('mediaIds', { type: () => [String] }) mediaIds: string[]
    ): Promise<string> {
        return this.ragService.generateReport(query, mediaIds);
    }

    @Mutation(() => String)
    async generatePresentation(
        @Args('query') query: string,
        @Args('mediaIds', { type: () => [String] }) mediaIds: string[]
    ): Promise<string> {
        return this.ragService.generatePresentation(query, mediaIds);
    }

    @Mutation(() => String)
    async generateImage(@Args('prompt') prompt: string): Promise<string> {
        return this.ragService.generateImage(prompt);
    }

    @Mutation(() => Boolean)
    async sendToLabelStudio(
        @Args('mediaId') mediaId: string,
        @Args('mediaUrl') mediaUrl: string
    ): Promise<boolean> {
        return this.ragService.sendToLabelStudio(mediaId, mediaUrl);
    }

    @Mutation(() => String)
    async generatePodcastScript(
        @Args('mediaIds', { type: () => [String] }) mediaIds: string[]
    ): Promise<string> {
        return this.ragService.generatePodcastScript(mediaIds);
    }
}
