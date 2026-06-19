/** Minimal media row fields needed to resolve object storage location. */
export type MediaStorageRecord = {
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
 * Media-library sources must use the media row's bucket (not the default cms-media bucket).
 */
export function resolveSourceStorage(
    source: { media_id?: string | null; s3_key?: string | null; filename?: string | null },
    media: MediaStorageRecord | null | undefined,
    defaultBucket: string,
): SourceStorageRef | null {
    if (source.media_id && media) {
        const fileKey = media.s3_key?.trim() || media.filename?.trim();
        if (!fileKey) return null;
        return {
            fileKey,
            bucket: media.bucket_name?.trim() || defaultBucket,
        };
    }

    const fileKey = source.s3_key?.trim() || source.filename?.trim();
    if (!fileKey) return null;

    return {
        fileKey,
        bucket: defaultBucket,
    };
}
