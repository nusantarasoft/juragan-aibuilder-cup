// Search Files Edge Function
// Semantic search using pgVector embeddings

import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate embedding for search query
async function generateQueryEmbedding(query: string): Promise<number[]> {
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
            input: query,
        }),
    });

    const data = await response.json();
    return data.data[0].embedding;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        const { query, search_type = "hybrid", file_types, limit = 10 } = await req.json();

        if (!query) {
            return new Response(JSON.stringify({ error: "Query required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
        );

        let results: unknown[] = [];

        if (search_type === "semantic" || search_type === "hybrid") {
            // Generate embedding for query
            const queryEmbedding = await generateQueryEmbedding(query);

            // Semantic search using pgVector
            const { data: semanticResults, error } = await supabase.rpc(
                "search_files_by_embedding",
                {
                    query_embedding: `[${queryEmbedding.join(",")}]`,
                    match_threshold: 0.7,
                    match_count: limit,
                }
            );

            if (!error) {
                results = semanticResults || [];
            }
        }

        if (search_type === "text" || search_type === "hybrid") {
            // Full-text search
            const { data: textResults, error } = await supabase.rpc(
                "search_files_by_text",
                {
                    search_query: query,
                    file_types: file_types || null,
                }
            );

            if (!error && textResults) {
                // Merge results for hybrid search
                if (search_type === "hybrid") {
                    const existingIds = new Set(results.map((r: any) => r.id));
                    for (const tr of textResults) {
                        if (!existingIds.has(tr.id)) {
                            results.push(tr);
                        }
                    }
                } else {
                    results = textResults;
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                query,
                search_type,
                count: results.length,
                results,
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
