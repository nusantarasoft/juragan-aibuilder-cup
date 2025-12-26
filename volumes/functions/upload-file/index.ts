// File Upload Edge Function
// Handles: Upload to MinIO S3 + metadata to PostgreSQL + queue AI processing

import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Get auth token
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "No authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );

        // Get user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Parse multipart form data
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const folderId = formData.get("folder_id") as string | null;
        const generateEmbedding = formData.get("generate_embedding") === "true";

        if (!file) {
            return new Response(JSON.stringify({ error: "No file provided" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Determine file type and bucket
        const mimeType = file.type;
        let fileType = "other";
        let bucketId = "attachments";

        if (mimeType.startsWith("image/")) {
            fileType = "image";
            bucketId = "images";
        } else if (mimeType.startsWith("audio/")) {
            fileType = "audio";
            bucketId = "audio";
        } else if (mimeType.startsWith("video/")) {
            fileType = "video";
            bucketId = "video";
        } else if (
            mimeType === "application/pdf" ||
            mimeType.includes("document") ||
            mimeType.includes("text/")
        ) {
            fileType = "document";
            bucketId = "documents";
        }

        // Generate unique filename
        const timestamp = Date.now();
        const ext = file.name.split(".").pop();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const s3Key = `${user.id}/${timestamp}-${safeName}`;

        // Upload to Supabase Storage (MinIO)
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucketId)
            .upload(s3Key, file, {
                contentType: mimeType,
                upsert: false,
            });

        if (uploadError) {
            return new Response(JSON.stringify({ error: uploadError.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get public URL if bucket is public
        let s3Url = null;
        if (bucketId === "images") {
            const { data: urlData } = supabase.storage.from(bucketId).getPublicUrl(s3Key);
            s3Url = urlData.publicUrl;
        }

        // Insert file metadata
        const { data: fileRecord, error: dbError } = await supabase
            .from("files")
            .insert({
                name: safeName,
                original_name: file.name,
                type: fileType,
                mime_type: mimeType,
                size_bytes: file.size,
                bucket_id: bucketId,
                s3_key: s3Key,
                s3_url: s3Url,
                owner_id: user.id,
                folder_id: folderId,
                status: "processing",
            })
            .select()
            .single();

        if (dbError) {
            return new Response(JSON.stringify({ error: dbError.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Queue processing tasks
        const tasks = [];

        // Text extraction for documents
        if (fileType === "document") {
            tasks.push({ file_id: fileRecord.id, task_type: "extract_text" });
        }

        // Transcription for audio/video
        if (fileType === "audio" || fileType === "video") {
            tasks.push({ file_id: fileRecord.id, task_type: "transcribe" });
        }

        // Thumbnail for images/videos
        if (fileType === "image" || fileType === "video") {
            tasks.push({ file_id: fileRecord.id, task_type: "thumbnail" });
        }

        // AI embedding
        if (generateEmbedding) {
            tasks.push({ file_id: fileRecord.id, task_type: "generate_embedding" });
        }

        if (tasks.length > 0) {
            await supabase.from("file_processing_queue").insert(tasks);
        }

        return new Response(
            JSON.stringify({
                success: true,
                file: {
                    id: fileRecord.id,
                    name: fileRecord.name,
                    type: fileType,
                    size: file.size,
                    url: s3Url,
                    status: "processing",
                },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
