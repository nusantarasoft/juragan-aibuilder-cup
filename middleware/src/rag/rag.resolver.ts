import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { RagService } from './rag.service';

@Resolver()
export class RagResolver {
    constructor(private readonly ragService: RagService) { }

    @Mutation(() => [String], { nullable: true })
    async autoLabelMedia(@Args('mediaId') mediaId: string): Promise<string[]> {
        return this.ragService.autoLabelMedia(mediaId);
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
    async generateMediaEmbeddings(
        @Args('mediaId') mediaId: string,
        @Args('content') content: string
    ): Promise<boolean> {
        // Content might be empty if we want backend to fetch from S3 (which it does)
        return this.ragService.generateMediaEmbeddings(mediaId, content);
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
