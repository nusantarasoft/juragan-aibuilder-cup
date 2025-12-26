import { NextRequest, NextResponse } from "next/server";
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// S3/MinIO configuration
const S3_ENDPOINT = process.env.NEXT_PUBLIC_S3_ENDPOINT || "http://localhost:9000";
const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET || "cms-media";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "minioadmin";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "minioadmin";
const S3_REGION = process.env.S3_REGION || "us-east-1";

// Create S3 client for MinIO
const s3Client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
    },
    forcePathStyle: true, // Required for MinIO
});

// Generate unique file key
function generateFileKey(filename: string, folder = "uploads"): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = filename.split(".").pop() || "";
    const baseName = filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "-");
    return `${folder}/${timestamp}-${randomId}-${baseName}.${extension}`;
}

// POST - Upload file to S3
export async function POST(request: NextRequest) {
    console.log("S3 Upload API called");
    console.log("S3 Config:", { endpoint: S3_ENDPOINT, bucket: S3_BUCKET, region: S3_REGION });

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const folder = (formData.get("folder") as string) || "uploads";

        if (!file) {
            return NextResponse.json(
                { success: false, error: "No file provided" },
                { status: 400 }
            );
        }

        console.log("Uploading file:", file.name, "size:", file.size, "type:", file.type);

        // Read file as buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Generate file key
        const key = generateFileKey(file.name, folder);
        console.log("Generated key:", key);

        // Upload to S3
        const command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        });

        console.log("Sending to S3...");
        await s3Client.send(command);
        console.log("S3 upload successful!");

        // Build URL - use public endpoint for browser access
        const S3_PUBLIC_ENDPOINT = process.env.NEXT_PUBLIC_S3_PUBLIC_ENDPOINT || S3_ENDPOINT.replace("minio:", "localhost:");
        const url = `${S3_PUBLIC_ENDPOINT}/${S3_BUCKET}/${key}`;

        // Save metadata to database via GraphQL
        // Use GRAPHQL_API_URL (server-side) which points to Docker hostname
        const GRAPHQL_URL = process.env.GRAPHQL_API_URL || process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://middleware:4001/graphql';
        console.log("Saving metadata to database via GraphQL:", GRAPHQL_URL);

        const mutation = `
            mutation UploadMedia($input: UploadMediaInput!) {
                uploadMedia(uploadMediaInput: $input) {
                    id
                    filename
                    originalName
                    url
                    s3Key
                    mimeType
                    sizeBytes
                    altText
                    createdAt
                }
            }
        `;

        try {
            const graphqlResponse = await fetch(GRAPHQL_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: mutation,
                    variables: {
                        input: {
                            filename: file.name,
                            originalName: file.name,
                            url,
                            s3Key: key,
                            mimeType: file.type,
                            sizeBytes: file.size,
                            altText: file.name,
                        },
                    },
                }),
            });

            const graphqlResult = await graphqlResponse.json();
            console.log("GraphQL save result:", graphqlResult);

            if (graphqlResult.errors) {
                console.error("GraphQL errors:", graphqlResult.errors);
                // Still return success for S3, but log the DB error
            }

            const savedMedia = graphqlResult.data?.uploadMedia;
            if (savedMedia) {
                return NextResponse.json({
                    success: true,
                    media: {
                        id: savedMedia.id,
                        filename: savedMedia.filename,
                        original_name: savedMedia.originalName,
                        url: savedMedia.url,
                        s3_key: savedMedia.s3Key,
                        mime_type: savedMedia.mimeType,
                        size_bytes: savedMedia.sizeBytes,
                        alt_text: savedMedia.altText,
                        created_at: savedMedia.createdAt,
                    },
                });
            }
        } catch (graphqlError) {
            console.error("GraphQL save failed:", graphqlError);
            // Continue with S3-only response if GraphQL fails
        }

        // Fallback: return S3 metadata if GraphQL save failed
        return NextResponse.json({
            success: true,
            media: {
                id: key,
                filename: file.name,
                original_name: file.name,
                url,
                s3_key: key,
                mime_type: file.type,
                size_bytes: file.size,
                created_at: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        console.error("S3 upload error:", error);
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        return NextResponse.json(
            { success: false, error: error.message || "Upload failed", details: error.name },
            { status: 500 }
        );
    }
}

// DELETE - Delete file from S3
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get("key");

        if (!key) {
            return NextResponse.json(
                { success: false, error: "No key provided" },
                { status: 400 }
            );
        }

        const command = new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
        });

        await s3Client.send(command);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("S3 delete error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Delete failed" },
            { status: 500 }
        );
    }
}
