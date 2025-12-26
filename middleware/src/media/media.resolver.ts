import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { MediaService, MediaFile } from './media.service';

@ObjectType()
class MediaType {
    @Field(() => ID)
    id: string;

    @Field()
    filename: string;

    @Field({ nullable: true })
    originalName?: string;

    @Field()
    url: string;

    @Field({ nullable: true })
    s3Key?: string;

    @Field({ nullable: true })
    mimeType?: string;

    @Field(() => Int, { nullable: true })
    sizeBytes?: number;

    @Field({ nullable: true })
    altText?: string;

    @Field({ nullable: true })
    uploadedBy?: string;

    @Field({ nullable: true })
    embedding?: string;

    @Field()
    createdAt: string;

    @Field({ nullable: true })
    updatedAt?: string;
}

@InputType()
class UploadMediaInput {
    @Field()
    filename: string;

    @Field({ nullable: true })
    originalName?: string;

    @Field()
    url: string;

    @Field({ nullable: true })
    s3Key?: string;

    @Field({ nullable: true })
    mimeType?: string;

    @Field(() => Int, { nullable: true })
    sizeBytes?: number;

    @Field({ nullable: true })
    altText?: string;
}

@InputType()
class UpdateMediaInput {
    @Field({ nullable: true })
    altText?: string;

    @Field({ nullable: true })
    filename?: string;
}

@ObjectType()
class DeleteMediaResponse {
    @Field()
    success: boolean;

    @Field({ nullable: true })
    s3Key?: string;
}

@Resolver(() => MediaType)
export class MediaResolver {
    constructor(private readonly mediaService: MediaService) { }

    @Query(() => [MediaType], { name: 'media' })
    async findAll(
        @Args('limit', { type: () => Int, nullable: true }) limit?: number,
        @Args('offset', { type: () => Int, nullable: true }) offset?: number,
        @Args('mimeType', { nullable: true }) mimeType?: string,
    ): Promise<MediaFile[]> {
        return this.mediaService.findAll({ limit, offset, mimeType });
    }

    @Query(() => MediaType, { name: 'mediaById', nullable: true })
    async findOne(@Args('id', { type: () => ID }) id: string): Promise<MediaFile | null> {
        return this.mediaService.findOne(id);
    }

    @Mutation(() => MediaType, { nullable: true })
    async uploadMedia(
        @Args('uploadMediaInput') input: UploadMediaInput,
    ): Promise<MediaFile | null> {
        return this.mediaService.create(input);
    }

    @Mutation(() => MediaType, { nullable: true })
    async updateMedia(
        @Args('id', { type: () => ID }) id: string,
        @Args('updateMediaInput') input: UpdateMediaInput,
    ): Promise<MediaFile | null> {
        return this.mediaService.update(id, input);
    }

    @Mutation(() => DeleteMediaResponse)
    async deleteMedia(
        @Args('id', { type: () => ID }) id: string,
    ): Promise<DeleteMediaResponse> {
        return this.mediaService.delete(id);
    }
}
