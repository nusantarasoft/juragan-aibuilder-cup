/** Minimal media row fields needed to resolve object storage location. */
export type MediaStorageRecord = {
    s3_key?: string | null;
    filename?: string | null;
    bucket_name?: string | null;
};

export type SourceStorageInput = {
    media_id?: string | null;
    s3_key?: string | null;
    filename?: string | null;
    bucket_name?: string | null;
};

export type SourceStorageRef = {
    fileKey: string;
    bucket: string;
};

/**
 * Resolve MinIO/S3 location for a notebook source.
 * Prefers persisted source.bucket_name, then media row, then default bucket.
 */
export function resolveSourceStorage(
    source: SourceStorageInput,
    media: MediaStorageRecord | null | undefined,
    defaultBucket: string,
): SourceStorageRef | null {
    const fileKey = source.s3_key?.trim() || source.filename?.trim();
    if (!fileKey) {
        if (source.media_id && media) {
            const mediaKey = media.s3_key?.trim() || media.filename?.trim();
            if (!mediaKey) return null;
            return {
                fileKey: mediaKey,
                bucket: media.bucket_name?.trim() || defaultBucket,
            };
        }
        return null;
    }

    const bucket =
        source.bucket_name?.trim() ||
        (source.media_id && media?.bucket_name?.trim()) ||
        defaultBucket;

    return { fileKey, bucket };
}
