// Embedding Service using Transformers.js with CLIP
// Note: This runs on the server side (Next.js API routes)

// Model singleton to avoid reloading
let pipelinePromise: Promise<any> | null = null;

// Initialize the CLIP pipeline
async function getEmbeddingPipeline() {
    if (!pipelinePromise) {
        pipelinePromise = (async () => {
            // Dynamic import for server-side only
            const { pipeline } = await import("@xenova/transformers");

            // Use CLIP model for image embeddings
            // Xenova/clip-vit-base-patch32 produces 512-dimensional vectors
            console.log("Loading CLIP model...");
            const pipe = await pipeline(
                "feature-extraction",
                "Xenova/clip-vit-base-patch32"
            );
            console.log("CLIP model loaded successfully");
            return pipe;
        })();
    }
    return pipelinePromise;
}

// Generate embedding for an image
export async function generateImageEmbedding(
    imageData: Buffer | Uint8Array | string
): Promise<number[]> {
    try {
        const pipe = await getEmbeddingPipeline();

        // Convert buffer to base64 if needed
        let imageInput: string;
        if (Buffer.isBuffer(imageData) || imageData instanceof Uint8Array) {
            imageInput = `data:image/jpeg;base64,${Buffer.from(imageData).toString("base64")}`;
        } else {
            imageInput = imageData;
        }

        // Generate embedding
        const output = await pipe(imageInput, {
            pooling: "mean",
            normalize: true,
        });

        // Convert to array
        const embedding = Array.from(output.data as Float32Array);

        return embedding;
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw error;
    }
}

// Generate embedding for text (for text-to-image search)
export async function generateTextEmbedding(text: string): Promise<number[]> {
    try {
        const pipe = await getEmbeddingPipeline();

        const output = await pipe(text, {
            pooling: "mean",
            normalize: true,
        });

        return Array.from(output.data as Float32Array);
    } catch (error) {
        console.error("Error generating text embedding:", error);
        throw error;
    }
}

// Calculate cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Format embedding for PostgreSQL pgvector
export function formatEmbeddingForPg(embedding: number[]): string {
    return `[${embedding.join(",")}]`;
}

// Parse embedding from PostgreSQL pgvector
export function parseEmbeddingFromPg(pgVector: string): number[] {
    return JSON.parse(pgVector.replace(/^\[/, "[").replace(/\]$/, "]"));
}

export default {
    generateImageEmbedding,
    generateTextEmbedding,
    cosineSimilarity,
    formatEmbeddingForPg,
    parseEmbeddingFromPg,
};
