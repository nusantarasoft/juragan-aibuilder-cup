import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    CreateBucketCommand,
    HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3/MinIO configuration
const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT || "http://127.0.0.1:9000";
const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET || "cms-media";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "minioadmin";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "minioadmin";
const S3_REGION = process.env.S3_REGION || "us-east-1";

// Create S3 client for MinIO
export const s3Client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
    },
    forcePathStyle: true, // Required for MinIO
});

// Ensure bucket exists
export async function ensureBucketExists(): Promise<boolean> {
    try {
        await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
        return true;
    } catch (error: any) {
        if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
            try {
                await s3Client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
                console.log(`Bucket ${S3_BUCKET} created successfully`);
                return true;
            } catch (createError) {
                console.error("Error creating bucket:", createError);
                return false;
            }
        }
        console.error("Error checking bucket:", error);
        return false;
    }
}

// Upload file to S3
export async function uploadToS3(
    file: Buffer | Uint8Array,
    key: string,
    contentType: string
): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: file,
        ContentType: contentType,
    });

    await s3Client.send(command);

    // Return the public URL
    return `${S3_ENDPOINT}/${S3_BUCKET}/${key}`;
}

// Get presigned URL for download
export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
}

// Delete file from S3
export async function deleteFromS3(key: string): Promise<boolean> {
    try {
        const command = new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
        });
        await s3Client.send(command);
        return true;
    } catch (error) {
        console.error("Error deleting from S3:", error);
        return false;
    }
}

// List files in bucket
export async function listFiles(prefix?: string): Promise<string[]> {
    try {
        const command = new ListObjectsV2Command({
            Bucket: S3_BUCKET,
            Prefix: prefix,
        });
        const response = await s3Client.send(command);
        return response.Contents?.map(obj => obj.Key || "") || [];
    } catch (error) {
        console.error("Error listing files:", error);
        return [];
    }
}

// Generate unique file key
export function generateFileKey(filename: string, folder = "uploads"): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = filename.split(".").pop() || "";
    const baseName = filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "-");
    return `${folder}/${timestamp}-${randomId}-${baseName}.${extension}`;
}

export default s3Client;
