import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { MediaService, MediaFile } from './media.service';
import GraphQLJSON from 'graphql-type-json';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs';
import type { FileUpload } from 'graphql-upload/processRequest.mjs';


@ObjectType()
export class S3Bucket {
    @Field()
    name: string;
    @Field({ nullable: true })
    creationDate?: string;
}

@ObjectType()
export class S3Object {
    @Field()
    key: string;
    @Field(() => Int)
    size: number;
    @Field()
    lastModified: string;
    @Field({ nullable: true })
    etag?: string;
    @Field()
    isFolder: boolean;
}

@ObjectType()
export class StorageStats {
    @Field(() => Int)
    totalFiles: number;
    @Field(() => Int)
    totalSizeBytes: number;
    @Field(() => [S3Bucket])
    buckets: S3Bucket[];
}

@ObjectType()
export class MediaType {
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

    @Field(() => GraphQLJSON, { nullable: true })
    metadata?: any;
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

@InputType()
class LifecycleRuleInput {
    @Field({ nullable: true })
    id?: string;
    @Field({ nullable: true })
    prefix?: string;
    @Field()
    enabled: boolean;
    @Field(() => Int, { nullable: true })
    expirationDays?: number;
    @Field(() => Int, { nullable: true })
    transitionDays?: number;
    @Field({ nullable: true })
    transitionStorageClass?: string;
}

@ObjectType()
class LifecycleRule {
    @Field({ nullable: true })
    id?: string;
    @Field({ nullable: true })
    prefix?: string;
    @Field()
    enabled: boolean;
    @Field(() => Int, { nullable: true })
    expirationDays?: number;
    @Field(() => Int, { nullable: true })
    transitionDays?: number;
    @Field({ nullable: true })
    transitionStorageClass?: string;
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

    // ---------------------------------------------------------
    // DB CRUD
    // ---------------------------------------------------------

    @Query(() => [MediaType], { name: 'media' })
    async findAll(
        @Args('limit', { type: () => Int, nullable: true }) limit?: number,
        @Args('offset', { type: () => Int, nullable: true }) offset?: number,
        @Args('mimeType', { nullable: true }) mimeType?: string,
    ): Promise<MediaFile[]> {
        return this.mediaService.findAll({ limit, offset, mimeType });
    }

    @Mutation(() => MediaType, { nullable: true })
    async uploadFile(
        @Args({ name: 'file', type: () => GraphQLUpload }) file: FileUpload,
        @Args('folder', { type: () => String, nullable: true }) folder?: string,
        @Args('bucket', { type: () => String, nullable: true }) bucket?: string,
        @Args('altText', { type: () => String, nullable: true }) altText?: string,
        @Args('autoLabel', { type: () => Boolean, nullable: true }) autoLabel?: boolean,
        @Args('generateEmbedding', { type: () => Boolean, nullable: true }) generateEmbedding?: boolean,
    ): Promise<MediaFile | null> {
        return this.mediaService.uploadMedia(file, { folder, bucket, altText, autoLabel, generateEmbedding });
    }

    @Query(() => Boolean)
    async checkDuplicateMedia(
        @Args('filename') filename: string,
        @Args('folder') folder: string
    ): Promise<boolean> {
        const result = await this.mediaService.checkDuplicateMedia(filename, folder);
        return result.exists;
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

    // ---------------------------------------------------------
    // S3 Operations
    // ---------------------------------------------------------

    @Query(() => [S3Bucket], { name: 'listBuckets' })
    async listBuckets(): Promise<S3Bucket[]> {
        return this.mediaService.listBuckets();
    }

    @Query(() => [S3Object], { name: 'listFilesInFolder', nullable: true })
    async listFilesInFolder(
        @Args('prefix', { nullable: true }) prefix?: string,
        @Args('bucket', { nullable: true }) bucket?: string,
    ): Promise<S3Object[]> {
        const b = bucket || await this.mediaService.getDefaultBucket();
        return this.mediaService.listObjects(b, prefix || '', false);
    }

    @Query(() => [S3Object], { name: 'listFolders', nullable: true })
    async listFolders(
        @Args('prefix', { nullable: true }) prefix?: string,
        @Args('bucket', { nullable: true }) bucket?: string,
    ): Promise<S3Object[]> {
        const b = bucket || await this.mediaService.getDefaultBucket();
        // Since we don't have a separate listFolders method in Service, reused listObjects logic? 
        // Or filter? 
        // Wait, MinIO listObjects returns items.
        // Frontend expects Folders only?
        // Actually Service has logic to mark isFolder.
        // Frontend uses folder list separately?
        // Let's reuse listObjects but maybe filter in Service if needed?
        // Frontend implementation expects listFolders returning folders.
        // let's return all objects and let frontend filter or filter here if possible.
        // Or implement a dedicated listFolders in service that returns only folders?
        // Service `listObjects` sets `isFolder` flag.
        // Let's filter here for safety.
        const objs = await this.mediaService.listObjects(b, prefix || '', false);
        return objs.filter(o => o.isFolder);
    }

    @Query(() => StorageStats, { name: 'getStorageStats', nullable: true })
    async getStorageStats(@Args('bucket', { nullable: true }) bucket?: string): Promise<StorageStats> {
        return this.mediaService.getStorageStats(bucket);
    }

    @Query(() => String, { name: 'getDefaultBucket' })
    async getDefaultBucket(): Promise<string> {
        return this.mediaService.getDefaultBucket();
    }

    @Query(() => String, { name: 'getS3Endpoint' })
    async getS3Endpoint(): Promise<string> {
        return this.mediaService.getS3Endpoint();
    }

    @Mutation(() => Boolean, { name: 'createBucket' })
    async createBucket(@Args('name') name: string): Promise<boolean> {
        return this.mediaService.createBucket(name);
    }

    @Mutation(() => Boolean, { name: 'deleteBucket' })
    async deleteBucket(@Args('name') name: string): Promise<boolean> {
        return this.mediaService.deleteBucket(name);
    }

    @Mutation(() => Boolean, { name: 'createFolder' })
    async createFolder(
        @Args('path') path: string,
        @Args('bucket', { nullable: true }) bucket?: string
    ): Promise<boolean> {
        // Ensure path ends with / for proper folder marker
        const folderPath = path.endsWith('/') ? path : `${path}/`;
        return this.mediaService.createFolder(folderPath, bucket);
    }

    @Mutation(() => Boolean, { name: 'deleteFolder' })
    async deleteFolder(
        @Args('path') path: string
    ): Promise<boolean> {
        return this.mediaService.deleteFolder(path);
    }

    @Mutation(() => Boolean, { name: 'makeBucketPublic' })
    async makeBucketPublic(
        @Args('bucket', { nullable: true }) bucket?: string
    ): Promise<boolean> {
        return this.mediaService.makeBucketPublic(bucket);
    }

    // File Move/Copy Operations
    @Mutation(() => Boolean, { name: 'moveFile' })
    async moveFile(
        @Args('sourceKey') sourceKey: string,
        @Args('destKey') destKey: string,
        @Args('sourceBucket', { nullable: true }) sourceBucket?: string,
        @Args('destBucket', { nullable: true }) destBucket?: string
    ): Promise<boolean> {
        return this.mediaService.moveFile(sourceKey, destKey, sourceBucket, destBucket);
    }

    @Mutation(() => Boolean, { name: 'copyFile' })
    async copyFile(
        @Args('sourceKey') sourceKey: string,
        @Args('destKey') destKey: string,
        @Args('sourceBucket', { nullable: true }) sourceBucket?: string,
        @Args('destBucket', { nullable: true }) destBucket?: string
    ): Promise<boolean> {
        return this.mediaService.copyFile(sourceKey, destKey, sourceBucket, destBucket);
    }

    // Versioning
    @Query(() => String, { name: 'getVersioningStatus' })
    async getVersioningStatus(@Args('bucket', { nullable: true }) bucket?: string): Promise<string> {
        return this.mediaService.getVersioningStatus(bucket);
    }

    @Mutation(() => Boolean, { name: 'enableVersioning' })
    async enableVersioning(@Args('bucket', { nullable: true }) bucket?: string): Promise<boolean> {
        return this.mediaService.enableVersioning(bucket);
    }

    @Mutation(() => Boolean, { name: 'disableVersioning' })
    async disableVersioning(@Args('bucket', { nullable: true }) bucket?: string): Promise<boolean> {
        return this.mediaService.disableVersioning(bucket);
    }

    // Lifecycle
    @Query(() => [LifecycleRule], { name: 'getLifecycleRules', nullable: true })
    async getLifecycleRules(@Args('bucket', { nullable: true }) bucket?: string): Promise<LifecycleRule[]> {
        return this.mediaService.getLifecycleRules(bucket);
    }

    @Mutation(() => Boolean, { name: 'setLifecycleRules' })
    async setLifecycleRules(
        @Args('rules', { type: () => [LifecycleRuleInput] }) rules: any[], // simplified type for input
        @Args('bucket', { nullable: true }) bucket?: string
    ): Promise<boolean> {
        return this.mediaService.setLifecycleRules(rules, bucket);
    }

    @Mutation(() => Boolean, { name: 'deleteLifecycleRules' })
    async deleteLifecycleRules(@Args('bucket', { nullable: true }) bucket?: string): Promise<boolean> {
        return this.mediaService.deleteLifecycleRules(bucket);
    }

    // Placeholders
    @Query(() => GraphQLJSON, { name: 'getBucketPolicy', nullable: true })
    async getBucketPolicy(@Args('bucket', { nullable: true }) bucket?: string): Promise<any> {
        return {};
    }

    @Mutation(() => Boolean, { name: 'setBucketPolicy' })
    async setBucketPolicy(
        @Args('policy', { type: () => GraphQLJSON }) policy: any,
        @Args('bucket', { nullable: true }) bucket?: string
    ): Promise<boolean> {
        return true;
    }

    @Mutation(() => Boolean, { name: 'deleteBucketPolicy' })
    async deleteBucketPolicy(@Args('bucket', { nullable: true }) bucket?: string): Promise<boolean> {
        return true;
    }
}
