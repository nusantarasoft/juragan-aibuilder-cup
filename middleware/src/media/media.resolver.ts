import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { MediaService, MediaFile } from './media.service';
import { RagService } from '../rag/rag.service';
import GraphQLJSON from 'graphql-type-json';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs';
import type { FileUpload } from 'graphql-upload/processRequest.mjs';


@ObjectType()
export class S3Bucket {
    @Field()
    name: string;
    @Field({ nullable: true })
    creationDate?: string;
    @Field({ nullable: true })
    isPublic?: boolean;
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
    @Field({ nullable: true })
    _debug_version_: string; // Force schema update

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

    @Field({ nullable: true })
    bucketName?: string;

    @Field({ nullable: true })
    checksum?: string;

    @Field({ nullable: true })
    thumbnailPath?: string;

    @Field({ nullable: true })
    thumbnailUrl?: string;

    @Field(() => [String], { nullable: true })
    previewPages?: string[];
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

    @Field({ nullable: true })
    description?: string;

    @Field({ nullable: true })
    bucketName?: string;

    @Field({ nullable: true })
    checksum?: string;

    @Field({ nullable: true })
    thumbnailPath?: string;

    @Field({ nullable: true })
    thumbnailUrl?: string;
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


@ObjectType()
export class ObjectVersion {
    @Field()
    key: string;
    @Field()
    versionId: string;
    @Field()
    lastModified: string;
    @Field(() => Int)
    size: number;
    @Field()
    isLatest: boolean;
}

@Resolver(() => MediaType)
export class MediaResolver {
    constructor(
        private readonly mediaService: MediaService,
        private readonly ragService: RagService
    ) {
        console.log("MediaResolver Initialized - SCHEMA CHECK 123");
    }

    // ... (existing code) ...

    @Mutation(() => Boolean, { name: 'removeMediaEmbeddings' })
    async removeMediaEmbeddings(@Args('id') id: string): Promise<boolean> {
        return this.mediaService.removeEmbedding(id);
    }

    // ---------------------------------------------------------
    // VERSIONING
    // ---------------------------------------------------------

    // ... existing versioning methods ...

    @Query(() => [ObjectVersion], { name: 'listObjectVersions', nullable: true })
    async listObjectVersions(
        @Args('key') key: string,
        @Args('bucket', { nullable: true }) bucket?: string
    ): Promise<ObjectVersion[]> {
        return this.mediaService.listObjectVersions(key, bucket);
    }

    @Mutation(() => Boolean, { name: 'setDefaultVersion' })
    async setDefaultVersion(
        @Args('key') key: string,
        @Args('versionId') versionId: string,
        @Args('bucket', { nullable: true }) bucket?: string
    ): Promise<boolean> {
        return this.mediaService.restoreVersion(key, versionId, bucket);
    }

    @Query(() => String, { name: 'getVersionPresignedUrl', nullable: true })
    async getVersionPresignedUrl(
        @Args('key') key: string,
        @Args('versionId') versionId: string,
        @Args('bucket', { nullable: true }) bucket?: string
    ): Promise<string> {
        return this.mediaService.getVersionPresignedUrl(key, versionId, bucket);
    }


    // ---------------------------------------------------------
    // DB CRUD
    // ---------------------------------------------------------

    @Query(() => [MediaType], { name: 'media' })
    async findAll(
        @Args('limit', { type: () => Int, nullable: true }) limit?: number,
        @Args('offset', { type: () => Int, nullable: true }) offset?: number,
        @Args('mimeType', { nullable: true }) mimeType?: string,
        @Args('bucket', { nullable: true }) bucket?: string,
        @Args('folder', { nullable: true }) folder?: string,
    ): Promise<MediaType[]> {
        const results = await this.mediaService.findAll({ limit, offset, mimeType, bucket, folder });
        // The service returns MediaFile[], but the resolver expects MediaType[]
        // MediaType is a class with _debug_version_, MediaFile is an interface.
        // We cast here to satisfy the compiler, assuming runtime shape is compatible.
        return results as unknown as MediaType[];
    }

    @Mutation(() => MediaType, { nullable: true })
    async uploadMedia(
        @Args({ name: 'file', type: () => GraphQLUpload }) file: FileUpload,
        @Args('folder', { nullable: true }) folder?: string,
        @Args('bucket', { nullable: true }) bucket?: string,
        @Args('altText', { nullable: true }) altText?: string,
        @Args('autoLabel', { nullable: true }) autoLabel?: boolean,
        @Args('generateEmbedding', { nullable: true }) generateEmbedding?: boolean,
        @Args('onConflict', { nullable: true, type: () => String, description: 'Strategy for name collisions: RENAME | OVERWRITE | ERROR' }) onConflict?: 'RENAME' | 'OVERWRITE' | 'ERROR',
    ): Promise<MediaType | null> {
        const result = await this.mediaService.uploadMedia(file, { folder, bucket, altText, autoLabel, generateEmbedding, onConflict });
        return result as unknown as MediaType;
    }

    @Query(() => Boolean)
    async checkDuplicateMedia(
        @Args('filename') filename: string,
        @Args('folder') folder: string,
    ): Promise<boolean> {
        const { exists } = await this.mediaService.checkDuplicateMedia(filename, folder);
        return exists;
    }

    @Query(() => MediaType, { name: 'mediaById', nullable: true })
    async findOne(@Args('id', { type: () => ID }) id: string): Promise<MediaFile | null> {
        return this.mediaService.findOne(id);
    }

    @Query(() => MediaType, { name: 'mediaByS3Key', nullable: true })
    async findByS3Key(@Args('key') key: string): Promise<MediaFile | null> {
        return this.mediaService.findByS3Key(key);
    }

    @Mutation(() => MediaType, { nullable: true })
    async createMedia(
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



    @Mutation(() => Boolean, { name: 'deleteFolder' })
    async deleteFolder(
        @Args('path') path: string,
        @Args('bucket', { nullable: true }) bucket?: string
    ): Promise<boolean> {
        return this.mediaService.deleteFolder(path, bucket);
    }

    @Mutation(() => Boolean, { name: 'deleteFileByKey' })
    async deleteFileByKey(
        @Args('key') key: string,
        @Args('bucket', { nullable: true }) bucket?: string
    ): Promise<boolean> {
        return this.mediaService.deleteFileByKey(key, bucket);
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
        return this.mediaService.getBucketPolicy(bucket);
    }

    @Mutation(() => Boolean, { name: 'setBucketPolicy' })
    async setBucketPolicy(
        @Args('policy', { type: () => GraphQLJSON }) policy: any,
        @Args('bucket', { nullable: true }) bucket?: string
    ): Promise<boolean> {
        return this.mediaService.setBucketPolicy(policy, bucket);
    }

    @Mutation(() => Boolean, { name: 'deleteBucketPolicy' })
    async deleteBucketPolicy(@Args('bucket', { nullable: true }) bucket?: string): Promise<boolean> {
        return this.mediaService.deleteBucketPolicy(bucket);
    }

    // ---------------------------------------------------------
    // AI Operations
    // ---------------------------------------------------------

    @Mutation(() => [String], { name: 'autoLabelMedia', nullable: true })
    async autoLabelMedia(@Args('id') id: string): Promise<string[]> {
        return this.ragService.autoLabelMedia(id);
    }

    @Mutation(() => Boolean, { name: 'generateMediaEmbeddings' })
    async generateMediaEmbeddings(
        @Args('id') id: string,
        @Args('content', { nullable: true }) content?: string
    ): Promise<boolean> {
        return this.ragService.generateMediaEmbeddings(id, content || '');
    }

    @Mutation(() => Boolean, { name: 'regenerateThumbnails' })
    async regenerateThumbnails(): Promise<boolean> {
        console.log("Triggering manual thumbnail regeneration via GraphQL");
        await this.mediaService.regenerateMissingThumbnails();
        return true;
    }

    // ---------------------------------------------------------
    // Bucket & Folder Operations
    // ---------------------------------------------------------

    @Mutation(() => Boolean, { name: 'createBucket' })
    async createBucket(@Args('name') name: string): Promise<boolean> {
        return this.mediaService.createBucket(name);
    }

    @Mutation(() => Boolean, { name: 'deleteBucket' })
    async deleteBucket(@Args('bucket') bucket: string): Promise<boolean> {
        return this.mediaService.deleteBucket(bucket);
    }

    @Mutation(() => Boolean, { name: 'createFolder' })
    async createFolder(
        @Args('path') path: string,
        @Args('bucket', { nullable: true }) bucket?: string
    ): Promise<boolean> {
        return this.mediaService.createFolder(path, bucket);
    }
}
