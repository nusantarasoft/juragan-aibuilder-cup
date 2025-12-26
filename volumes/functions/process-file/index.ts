// Process File Edge Function
// Handles: Text extraction, transcription, embedding generation

import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OpenAI API for embeddings
async function generateEmbedding(text: string): Promise<number[]> {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
        throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "text-embedding-ada-002",
            input: text.substring(0, 8000), // Limit to ~8000 chars
        }),
    });

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message);
    }

    return data.data[0].embedding;
}

// Extract text from PDF (basic)
async function extractTextFromPdf(fileBuffer: ArrayBuffer): Promise<string> {
    // For production, use pdf-parse or call an external service
    // This is a placeholder that returns empty for now
    return ""; // TODO: Implement PDF parsing
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { file_id, task_type } = await req.json();

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Get file info
        const { data: file, error: fileError } = await supabase
            .from("files")
            .select("*")
            .eq("id", file_id)
            .single();

        if (fileError || !file) {
            return new Response(JSON.stringify({ error: "File not found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Update queue status
        await supabase
            .from("file_processing_queue")
            .update({ status: "processing", started_at: new Date().toISOString() })
            .eq("file_id", file_id)
            .eq("task_type", task_type);

        let result: Record<string, unknown> = {};

        switch (task_type) {
            case "extract_text": {
                // Download file from storage
                const { data: fileData } = await supabase.storage
                    .from(file.bucket_id)
                    .download(file.s3_key);

                if (fileData) {
                    const text = await extractTextFromPdf(await fileData.arrayBuffer());

                    // Update file with extracted text
                    await supabase
                        .from("files")
                        .update({ extracted_text: text })
                        .eq("id", file_id);

                    result = { extracted_text_length: text.length };
                }
                break;
            }

            case "generate_embedding": {
                // Get text to embed
                let textToEmbed = file.extracted_text || file.description || file.name;

                if (file.transcription) {
                    textToEmbed = file.transcription;
                }

                if (textToEmbed) {
                    const embedding = await generateEmbedding(textToEmbed);

                    // Update file with embedding
                    await supabase
                        .from("files")
                        .update({
                            embedding: `[${embedding.join(",")}]`,
                            embedding_model: "text-embedding-ada-002"
                        })
                        .eq("id", file_id);

                    result = { embedding_dimensions: embedding.length };
                }
                break;
            }

            case "transcribe": {
                // For audio/video transcription
                // Would integrate with Whisper API or similar
                result = { status: "transcription_not_implemented" };
                break;
            }

            case "thumbnail": {
                // For image/video thumbnails
                // Would use imgproxy or similar
                result = { status: "thumbnail_not_implemented" };
                break;
            }

            default:
                return new Response(JSON.stringify({ error: "Unknown task type" }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
        }

        // Mark task as completed
        await supabase
            .from("file_processing_queue")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("file_id", file_id)
            .eq("task_type", task_type);

        // Check if all tasks completed, update file status
        const { data: pendingTasks } = await supabase
            .from("file_processing_queue")
            .select("id")
            .eq("file_id", file_id)
            .neq("status", "completed");

        if (!pendingTasks || pendingTasks.length === 0) {
            await supabase
                .from("files")
                .update({ status: "ready", processed_at: new Date().toISOString() })
                .eq("id", file_id);
        }

        return new Response(
            JSON.stringify({ success: true, task_type, result }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
