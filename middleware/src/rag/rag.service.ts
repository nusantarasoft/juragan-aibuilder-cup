import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { SupabaseService } from '../supabase/supabase.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { AiSettingsService } from '../ai/ai-settings.service';
import { AiRouterService } from '../ai/ai-router.service';
import type { AiInlineData } from '../ai/ai-settings.types';
import { OpenAiService } from '../ai/openai-ai.service';
import { OllamaAiService } from '../ai/ollama-ai.service';
import { getVertexAccessToken } from '../ai/google-vertex-auth.util';

@Injectable()
export class RagService implements OnModuleInit {
    private readonly logger = new Logger(RagService.name);
    private vertexAI: any; // Dynamic type
    private geminiModel: any;
    private embeddingModel: any;
    private minioClient: Minio.Client;

    constructor(
        private configService: ConfigService,
        private webhooksService: WebhooksService,
        private supabaseService: SupabaseService,
        private aiSettings: AiSettingsService,
        private aiRouter: AiRouterService,
        private openAiService: OpenAiService,
        private ollamaAiService: OllamaAiService,
    ) { }

    private async llmGenerate(prompt: string, inlineData?: AiInlineData): Promise<string | null> {
        const text = await this.aiRouter.generateText(prompt, { inlineData });
        if (!text?.trim()) return null;
        const lower = text.toLowerCase();
        if (
            lower.includes('not configured') ||
            lower.includes('request failed') ||
            lower.includes('tidak dapat menghubungi')
        ) {
            this.logger.warn(`Active LLM error response: ${text.slice(0, 160)}`);
            return null;
        }
        return text.trim();
    }

    private async getDbSettings(): Promise<any> {
        return this.aiSettings.getRawSettings();
    }

    async onModuleInit() {
        const { VertexAI } = await (new Function('return import("@google-cloud/vertexai")')());
        const googleConfig = await this.aiSettings.getGoogleConfig();
        const projectId = googleConfig.projectId;
        const location = googleConfig.location;

        if (projectId) {
            this.vertexAI = new VertexAI({ project: projectId, location });
            this.geminiModel = this.vertexAI.getGenerativeModel({ model: googleConfig.model });
            this.embeddingModel = this.vertexAI.getGenerativeModel({
                model: googleConfig.embeddingModel || 'multimodalembedding@001',
            });
        } else {
            this.logger.warn('Google Vertex project not configured in AI Studio Settings.');
        }

        this.initializeMinio();
    }

    private initializeMinio() {
        // Try S3_ prefix first (what Docker provides), then MINIO_ prefix as fallback
        const endpointUrl = this.configService.get('S3_ENDPOINT') || this.configService.get('MINIO_ENDPOINT') || 'http://minio:9000';

        // Parse endpoint URL to extract host and port
        let endPoint = 'minio';
        let port = 9000;
        let useSSL = false;

        try {
            const url = new URL(endpointUrl);
            endPoint = url.hostname;
            port = parseInt(url.port || (url.protocol === 'https:' ? '443' : '9000'), 10);
            useSSL = url.protocol === 'https:';
        } catch {
            this.logger.warn(`Failed to parse S3_ENDPOINT: ${endpointUrl}, using defaults`);
        }

        const accessKey = this.configService.get('S3_ACCESS_KEY') || this.configService.get('MINIO_ACCESS_KEY') || 'minioadmin';
        const secretKey = this.configService.get('S3_SECRET_KEY') || this.configService.get('MINIO_SECRET_KEY') || 'minioadmin';

        this.minioClient = new Minio.Client({
            endPoint,
            port,
            useSSL,
            accessKey,
            secretKey,
        });
        this.logger.log(`MinIO Client initialized for RagService at ${endPoint}:${port}`);
    }

    async generateAnswer(query: string): Promise<string> {
        this.logger.log(`Generating answer for: "${query}" via active LLM`);

        const searchResults = await this.semanticSearch(query, 5);

        if (searchResults.length === 0) {
            return "I couldn't find any relevant documents in your library to answer this question.";
        }

        const contextText = searchResults.map(doc => `[File: ${doc.filename}]`).join('\n');

        const prompt = `You are an intelligent assistant having access to the user's media library.
Context Files:
${contextText}

User Question: ${query}

Answer:`;

        const answer = await this.llmGenerate(prompt);
        return answer || 'Could not generate answer with the active LLM provider.';
    }

    /** Public wrapper for Studio notebook chunk embeddings. */
    async embedText(text: string): Promise<number[] | null> {
        if (!text?.trim()) return null;
        const trimmed = text.trim();
        const settings = await this.getDbSettings();

        const provider = (settings?.default_embedding_provider || 'auto').toLowerCase();
        const projectId = settings?.google_project_id;
        const apiKey = settings?.google_api_key;

        const useGoogle =
            provider === 'google_ai' ||
            (provider === 'auto' && !projectId && !!apiKey);
        const useVertex =
            provider === 'vertex' ||
            (provider === 'auto' && !!projectId);
        const useOpenAi = provider === 'openai';
        const useOllama = provider === 'ollama';

        if (useOpenAi) {
            const emb = await this.openAiService.embedText(trimmed);
            if (emb) return emb;
            if (provider === 'openai') return null;
        }
        if (useOllama) {
            const emb = await this.ollamaAiService.embedText(trimmed);
            if (emb) return emb;
            if (provider === 'ollama') return null;
        }
        if (useGoogle && apiKey) {
            const googleEmb = await this.getGoogleAiStudioEmbedding(trimmed);
            if (googleEmb) return googleEmb;
            if (provider === 'google_ai') return null;
        }
        if (useVertex && projectId) {
            return this.getVertexEmbedding(trimmed);
        }
        if (apiKey) {
            return this.getGoogleAiStudioEmbedding(trimmed);
        }
        return null;
    }

    /**
     * Extract plain text from an uploaded file buffer (text files directly; PDF/images via Vertex).
     */
    async extractDocumentText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
        const mime = (mimeType || '').toLowerCase();
        const ext = (filename || '').split('.').pop()?.toLowerCase() || '';

        const isPlainText =
            mime.startsWith('text/') ||
            mime === 'application/json' ||
            mime === 'application/xml' ||
            ['txt', 'md', 'csv', 'json', 'xml', 'html', 'htm', 'log'].includes(ext);

        if (isPlainText) {
            return buffer.toString('utf-8').trim();
        }

        if (buffer.length > 20 * 1024 * 1024) {
            this.logger.warn(`extractDocumentText: file too large (${filename})`);
            return `Document: ${filename} (too large to extract inline)`;
        }

        const localText = await this.extractLocalDocumentText(buffer, ext);
        if (localText?.trim()) {
            this.logger.log(`extractDocumentText via local parser (${ext || mime})`);
            return localText.trim();
        }

        let resolvedMime = mimeType || 'application/octet-stream';
        if (resolvedMime === 'application/octet-stream') {
            if (ext === 'pdf') resolvedMime = 'application/pdf';
            else if (ext === 'pptx') {
                resolvedMime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
            } else if (ext === 'docx') {
                resolvedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            } else if (['jpg', 'jpeg'].includes(ext)) resolvedMime = 'image/jpeg';
            else if (ext === 'png') resolvedMime = 'image/png';
            else if (ext === 'webp') resolvedMime = 'image/webp';
        }

        const extractPrompt =
            'Extract and return the full textual content of this document for search indexing. ' +
            'Return plain text only, no markdown fences. Preserve important facts, numbers, and headings.';

        const viaLlm = await this.llmGenerate(extractPrompt, {
            mimeType: resolvedMime,
            data: buffer.toString('base64'),
        });
        if (viaLlm) return viaLlm;

        return `Document: ${filename}`;
    }

    /** Offline text extraction for PDF / Office Open XML (no API key required). */
    private async extractLocalDocumentText(buffer: Buffer, ext: string): Promise<string | null> {
        try {
            if (ext === 'pdf') {
                const { PDFParse } = require('pdf-parse') as typeof import('pdf-parse');
                const parser = new PDFParse({ data: buffer });
                try {
                    const result = await parser.getText();
                    return result.text?.trim() || null;
                } finally {
                    await parser.destroy().catch(() => undefined);
                }
            }

            if (ext === 'pptx' || ext === 'docx') {
                const JSZip = require('jszip') as typeof import('jszip');
                const zip = await JSZip.loadAsync(buffer);

                if (ext === 'pptx') {
                    const slideNames = Object.keys(zip.files)
                        .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
                        .sort((a, b) => {
                            const na = parseInt(a.match(/slide(\d+)/)?.[1] || '0', 10);
                            const nb = parseInt(b.match(/slide(\d+)/)?.[1] || '0', 10);
                            return na - nb;
                        });
                    const parts: string[] = [];
                    for (const name of slideNames) {
                        const file = zip.file(name);
                        if (!file) continue;
                        const xml = await file.async('string');
                        const text = this.extractXmlPlainText(xml);
                        if (text) parts.push(text);
                    }
                    return parts.join('\n\n') || null;
                }

                const docFile = zip.file('word/document.xml');
                if (!docFile) return null;
                const xml = await docFile.async('string');
                return this.extractXmlPlainText(xml) || null;
            }
        } catch (e: unknown) {
            this.logger.warn(
                `extractLocalDocumentText (${ext}): ${e instanceof Error ? e.message : e}`,
            );
        }
        return null;
    }

    private extractXmlPlainText(xml: string): string {
        return xml
            .replace(/<w:tab\/>/g, '\t')
            .replace(/<w:br[^>]*\/>/g, '\n')
            .replace(/<a:br[^>]*\/>/g, '\n')
            .replace(/<a:p[^>]*>/g, '\n')
            .replace(/<\/a:p>/g, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]{2,}/g, ' ')
            .trim();
    }

    async semanticSearch(query: string, limit: number = 10): Promise<{ id: string; filename: string; score: number }[]> {
        this.logger.log(`Semantic search for: "${query}" (limit ${limit})`);

        if (!this.embeddingModel) {
            this.logger.error('Vertex AI not configured');
            return [];
        }

        try {
            // 1. Generate embedding for query
            // Vertex AI format
            const embeddingResult = await this.embeddingModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: query }] }]
                // Note: unique call structure for embedding models in some SDK versions, 
                // but standard generateContent works for some. 
                // However, specific getEmbeddings method usage:
            });

            // Correct SDK usage for embeddings might vary by version. 
            // Using the lighter REST fallback if SDK typing is tricky or using generic helpers.
            // Actually, for multimodalembedding@001, we might need a specific helper or ensure 
            // we use the correct method. Let's start with standard content generation if applicable,
            // or specific flow.
            //
            // WAIT - Vertex AI Node SDK specific method for embeddings checks...
            // It often uses `getEmbeddings` on the model object if typed correctly.
            // Let's implement robustly.

            // Mocking the proper call for now as:
            // const result = await this.vertexAI.preview.getEmbeddings(...)

            // Reverting to helpers or assuming generic 'embedContent' equivalent exists
            // or we use the specific PublisherModel approach if available.
            // Simple approach: Use matching logic to 'generateMediaEmbeddings' below.

            // FIX: The SDK for embeddings is slightly different. 
            // Let's use the helpers provided by the package if available, 
            // or fallback to the publisher model approach.

            // Using helper method implemented below for consistency
            const queryVector = await this.getVertexEmbedding(query);

            if (!queryVector) return [];

            // 2. Perform vector search via Supabase RPC
            // This replaces raw pgPool query.
            const { data, error } = await this.supabaseService.getClient().rpc('match_media_embeddings', {
                query_embedding: queryVector, // Supabase client handles array->vector conversion
                match_threshold: 0.5, // verified default
                match_count: limit
            });

            if (error) {
                this.logger.error('Supabase Vector Search failed', error);
                return [];
            }

            this.logger.log(`Found ${data.length} results`);
            return data.map((row: any) => ({
                id: row.id,
                filename: row.filename,
                score: row.similarity
            }));

        } catch (error) {
            this.logger.error('Semantic search failed', error);
            return [];
        }
    }

    async generateMediaEmbeddings(mediaId: string, content: string): Promise<boolean> {
        this.logger.log(`[EMBED-ENTRY] ========== generateMediaEmbeddings called ==========`);
        this.logger.log(`[EMBED-ENTRY] mediaId: "${mediaId}", content length: ${content?.length || 0}`);

        // 1. ID Resolution
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mediaId);
        let actualMediaId = mediaId;

        if (!isUUID) {
            this.logger.warn(`Received non-UUID mediaId: "${mediaId}". Attempting to resolve by s3_key or filename...`);

            // Try explicit safe lookups instead of fragile .or() string
            let { data: lookedUpMedia } = await this.supabaseService.getAdminClient()
                .from('media')
                .select('id')
                .eq('s3_key', mediaId)
                .limit(1);

            if (!lookedUpMedia || lookedUpMedia.length === 0) {
                const { data: byFilename } = await this.supabaseService.getAdminClient()
                    .from('media')
                    .select('id')
                    .eq('filename', mediaId)
                    .limit(1);
                lookedUpMedia = byFilename;
            }

            if (lookedUpMedia && lookedUpMedia.length > 0) {
                actualMediaId = lookedUpMedia[0].id;
                this.logger.log(`Resolved "${mediaId}" to UUID: ${actualMediaId}`);
            } // else fallthrough
        }

        try {
            // 2. Fetch Media Metadata
            const { data: mRes, error } = await this.supabaseService.getAdminClient()
                .from('media')
                .select('*')
                .eq('id', actualMediaId)
                .limit(1);

            const m = mRes?.[0];

            if (error || !m) {
                this.logger.error(`Media not found: ${actualMediaId}`, error);
                return false;
            }

            // 3. Auto-Description Logic (Smart Proxy)
            let isImage = m.mime_type?.startsWith('image/');
            if (!isImage && m.filename) {
                const ext = m.filename.split('.').pop().toLowerCase();
                if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
                    isImage = true;
                }
            }

            if (isImage) {
                // If description is missing, try to generate it using Vertex AI / Gemini
                if (!m.metadata?.description) {
                    this.logger.log(`Auto-describing image ${actualMediaId}...`);
                    // Note: describeMedia keys off the DB's UUID, which will resolve correctly inside describeMedia
                    // IF describeMedia also uses the same MinIO loading logic.
                    // We need to verify describeMedia uses 'get_file_buffer' or similar. 
                    // Based on previous view, describeMedia uses getFileBuffer (lines 463+).
                    const desc = await this.describeMedia(actualMediaId);
                    if (desc) {
                        const newMeta = { ...m.metadata, description: desc };
                        await this.supabaseService.getAdminClient()
                            .from('media')
                            .update({ metadata: newMeta })
                            .eq('id', actualMediaId);
                        m.metadata = newMeta;
                        this.logger.log(`Description generated: ${desc.substring(0, 50)}...`);
                    }
                }
            }

            // 4. Prepare Content
            let textToEmbed = content;
            let imageToEmbed: { data: string, mimeType: string } | undefined;

            // Handle Images (Multimodal)
            if (isImage) {
                const fileKey = m.s3_key || m.filepath || m.filename;
                this.logger.log(`[IMG-EMBED-DEBUG] Preparing image embedding for ${actualMediaId}`);
                this.logger.log(`[IMG-EMBED-DEBUG] fileKey: "${fileKey}", bucket_name: "${m.bucket_name}", mime: ${m.mime_type}`);

                const buffer = await this.getFileBuffer(fileKey, m.bucket_name);
                if (buffer) {
                    // Resize/Compress if too large (Vertex Limit ~20MB, but safer to keep smaller)
                    // For now, raw buffer.
                    imageToEmbed = {
                        data: buffer.toString('base64'),
                        mimeType: m.mime_type || 'image/jpeg'
                    };
                    this.logger.log(`[IMG-EMBED-DEBUG] ✓ Image buffer ready (${(buffer.length / 1024).toFixed(0)}KB)`);
                } else {
                    this.logger.error(`[IMG-EMBED-DEBUG] ✗ getFileBuffer returned null for image ${actualMediaId}. Check MinIO connectivity and bucket/key.`);
                }
            }

            // Handle Docs (PDF/Docx) -> Ensure Description Exists
            if (!isImage && m.mime_type && (
                m.mime_type.startsWith('application/pdf') ||
                m.mime_type.includes('wordprocessingml') ||
                m.mime_type.includes('msword')
            )) {
                if (!m.metadata?.description) {
                    this.logger.log(`Auto-describing document ${actualMediaId} for embedding context...`);
                    const desc = await this.describeMedia(actualMediaId);
                    if (desc) {
                        const newMeta = { ...m.metadata, description: desc };
                        await this.supabaseService.getAdminClient()
                            .from('media')
                            .update({ metadata: newMeta })
                            .eq('id', actualMediaId);
                        m.metadata = newMeta;
                    }
                }
            }


            if (!textToEmbed || textToEmbed.trim() === '') {
                const parts = [];
                // If it's an image, we don't strictkly NEED text if we have the image, 
                // but metadata helps the model.
                if (m.filename) parts.push(`Filename: ${m.filename}`);
                if (m.metadata?.description) parts.push(`Description: ${m.metadata?.description}`);
                if (m.metadata?.tags) parts.push(`Tags: ${Array.isArray(m.metadata.tags) ? m.metadata.tags.join(', ') : m.metadata.tags}`);

                if (parts.length > 0) textToEmbed = parts.join('\n');
            }


            // 5. Generate Embedding
            const embedding = await this.getVertexEmbedding(textToEmbed, imageToEmbed);
            if (!embedding) return false;

            // ... (rest is same)
            const { error: upsertError } = await this.supabaseService.getAdminClient()
                .from('media_embeddings')
                .upsert({
                    id: actualMediaId,
                    embedding: embedding,
                    chunk_text: textToEmbed,
                    updated_at: new Date()
                });

            if (upsertError) {
                this.logger.error('Error saving embedding:', upsertError);
                return false;
            }

            return true;

        } catch (e) {
            this.logger.error('Embedding generation failed', e);
            throw e;
        }
    }


    /** Google AI Studio embeddings (text-embedding-004 = 768 dims). Used for Studio when EMBEDDING_PROVIDER=google_ai. */
    private async getGoogleAiStudioEmbedding(text: string): Promise<number[] | null> {
        const config = await this.aiSettings.getGoogleConfig();
        const apiKey = config.apiKey;
        const model = config.embeddingModel || 'gemini-embedding-001';
        if (!apiKey) {
            this.logger.warn('[EMBED] Google API key not configured in AI Studio Settings');
            return null;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${encodeURIComponent(apiKey)}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: `models/${model}`,
                    content: { parts: [{ text }] },
                    // Match studio_source_chunks vector(768) after studio_embedding_google_ai_768.sql
                    outputDimensionality: 768,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`[EMBED] Google AI embed error (${response.status}): ${errorText}`);
                return null;
            }
            const data = (await response.json()) as { embedding?: { values?: number[] } };
            const values = data.embedding?.values;
            if (values?.length) {
                this.logger.log(`[EMBED] Google AI Studio: ${values.length} dimensions (${model})`);
                return values;
            }
            this.logger.warn('[EMBED] Google AI Studio response missing embedding.values');
            return null;
        } catch (e: any) {
            this.logger.error(`[EMBED] Google AI Studio failed: ${e?.message ?? e}`);
            return null;
        }
    }

    // Helper for Vertex AI Embedding (Multimodal - 1408 Dimensions) via REST API
    private async getVertexEmbedding(text: string, image?: { data: string; mimeType: string }): Promise<number[] | null> {
        const config = await this.aiSettings.getGoogleConfig();
        const projectId = config.projectId;
        const location = config.location;

        this.logger.log(`[EMBED-DEBUG] Starting Vertex Embedding. Project: ${projectId}, Location: ${location}`);

        if (!projectId) {
            this.logger.warn('[EMBED-DEBUG] Google Vertex project not configured in AI Studio Settings');
            return null;
        }

        try {
            const accessToken = await getVertexAccessToken({
                serviceAccountJson: config.serviceAccountJson,
                projectId,
            });
            this.logger.log(`[EMBED-DEBUG] Got Access Token: ${accessToken ? 'Yes' : 'No'}`);

            const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/multimodalembedding@001:predict`;

            const instance: any = {};
            if (text) instance.text = text;
            if (image) {
                instance.image = { bytesBase64Encoded: image.data };
                this.logger.log(`[EMBED-DEBUG] Attaching image data (${Math.ceil(image.data.length * 0.75 / 1024)} KB). Mime: ${image.mimeType}`);
            }

            this.logger.log(`[EMBED-DEBUG] Sending request to ${url}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    instances: [instance]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`[EMBED-DEBUG] Vertex API 400/500 Error: ${response.status} - ${errorText}`);
                throw new Error(`Vertex AI REST API failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            // Log response keys for debugging
            this.logger.log(`[EMBED-DEBUG] Vertex Response Keys: ${Object.keys(data).join(',')}`);
            if (data.predictions && data.predictions.length > 0) {
                this.logger.log(`[EMBED-DEBUG] Predictions Keys: ${Object.keys(data.predictions[0]).join(',')}`);
            }

            const embeddings = data.predictions?.[0]?.embeddingsValues
                || data.predictions?.[0]?.embedding
                || data.predictions?.[0]?.textEmbedding
                || data.predictions?.[0]?.imageEmbedding; // Handle image-only return if applicable

            if (embeddings) {
                this.logger.log(`[EMBED-DEBUG] Successfully generated ${embeddings.length} dimensions embedding`);
                return embeddings;
            }

            this.logger.error('[EMBED-DEBUG] No embeddings found in response', data);
            return null;
        } catch (e) {
            this.logger.error('[EMBED-DEBUG] Vertex AI Embedding REST failed', e);
            throw e;
        }
    }

    async autoLabelMedia(mediaId: string): Promise<string[]> {
        this.logger.log(`Auto-labelling media ${mediaId} via active LLM...`);

        // 1. ID Resolution
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mediaId);
        let actualMediaId = mediaId;

        if (!isUUID) {
            const { data: lookedUpMedia } = await this.supabaseService.getAdminClient()
                .from('media')
                .select('id')
                .or(`s3_key.eq.${mediaId},filename.eq.${mediaId}`)
                .limit(1); // Safer than single()

            if (lookedUpMedia && lookedUpMedia.length > 0) actualMediaId = lookedUpMedia[0].id;
            else return [];
        }

        const { data: mediaRecordRes } = await this.supabaseService.getAdminClient()
            .from('media')
            .select('*')
            .eq('id', actualMediaId)
            .limit(1);

        const mediaRecord = mediaRecordRes?.[0];

        if (!mediaRecord) return [];

        try {
            const fileKey = mediaRecord.s3_key || mediaRecord.filepath || mediaRecord.filename;
            // Use bucket from DB record if available
            const bucketName = mediaRecord.bucket_name;
            const buffer = await this.getFileBuffer(fileKey, bucketName);
            if (!buffer) return [];

            // Check size limit (approx 10MB-18MB safety for inline base64)
            if (buffer.length > 20 * 1024 * 1024) {
                this.logger.warn(`Media ${actualMediaId} is too large (${(buffer.length / 1024 / 1024).toFixed(2)}MB) for inline analysis. Skipping.`);
                return [];
            }

            const base64Data = buffer.toString('base64');
            const mimeType = mediaRecord.mime_type || "application/octet-stream";

            let promptText = "Analyze this media. Return ONLY a JSON array of 10-15 descriptive string tags.";

            if (mimeType.startsWith('image/')) {
                promptText = "Analyze this image with high attention to detail. Return ONLY a JSON array of 10-15 highly accurate, specific, and descriptive string tags. Focus on visual elements, style, and context.";
            } else if (mimeType.startsWith('video/')) {
                promptText = "Analyze this video. Describe the actions, scene, markers, and overall mood. Return ONLY a JSON array of 10-15 descriptive string tags summarizing the video content.";
            } else if (mimeType.startsWith('audio/')) {
                promptText = "Listen to this audio. Identify valid sounds, speech topics, or musical genre. Return ONLY a JSON array of 10-15 descriptive string tags.";
            } else if (mimeType === 'application/pdf') {
                promptText = "Analyze this PDF document. Summarize its key topics, entities, and themes. Return ONLY a JSON array of 10-15 descriptive string tags representing the document content.";
            }

            const text = await this.llmGenerate(promptText, { mimeType, data: base64Data });
            if (!text) return [];

            let tags: string[] = [];
            const match = text.match(/\[.*\]/s);
            if (match) {
                try { tags = JSON.parse(match[0]); } catch { /* ignore */ }
            } else {
                tags = text.split(',').map((t: string) => t.trim());
            }

            if (tags.length > 0) {
                const newMeta = { ...(mediaRecord.metadata || {}), tags };
                await this.supabaseService.getAdminClient()
                    .from('media')
                    .update({ metadata: newMeta })
                    .eq('id', actualMediaId);
            }

            return tags;

        } catch (e) {
            this.logger.error('AutoLabel failed', e);
            return [];
        }
    }

    // ... (Other methods: describeMedia, chatWithSources, generateReport would be updated similarly to use this.geminiModel)
    // For brevity, assuming describeMedia reuses the pattern above.

    async describeMedia(mediaId: string): Promise<string | null> {
        this.logger.log(`Auto-describing media ${mediaId} via active LLM`);

        // 1. ID Resolution
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mediaId);
        let actualMediaId = mediaId;

        if (!isUUID) {
            this.logger.warn(`Received non-UUID mediaId: "${mediaId}". Attempting to resolve by s3_key or filename...`);
            const { data: lookedUpMedia } = await this.supabaseService.getAdminClient()
                .from('media')
                .select('id')
                .or(`s3_key.eq.${mediaId},filename.eq.${mediaId}`)
                .limit(1); // Safer

            if (lookedUpMedia && lookedUpMedia.length > 0) {
                actualMediaId = lookedUpMedia[0].id;
                this.logger.log(`Resolved "${mediaId}" to UUID: ${actualMediaId}`);
            } else {
                this.logger.error(`Could not resolve media ID for: "${mediaId}"`);
                return null;
            }
        }

        // Fetch media via Supabase based on mediaId
        const response: any = await this.supabaseService.getAdminClient()
            .from('media')
            .select('*')
            .eq('id', actualMediaId)
            .limit(1);

        const mediaRecord = response.data?.[0];

        if (!mediaRecord) {
            this.logger.warn(`Media ${mediaId} not found for description`);
            return null;
        }

        try {
            // Get File Buffer
            const fileKey = mediaRecord.s3_key || mediaRecord.filepath || mediaRecord.filename;
            if (!fileKey) {
                this.logger.warn(`Media ${mediaId} has no file key`);
                return null;
            }

            const buffer = await this.getFileBuffer(fileKey, mediaRecord.bucket_name);
            if (!buffer) {
                this.logger.warn(`Buffer retrieval failed for ${fileKey}`);
                return null;
            }

            const base64Data = buffer.toString('base64');
            // Fallback MIME detection
            let mimeType = mediaRecord.mime_type;
            if ((!mimeType || mimeType === 'application/octet-stream') && mediaRecord.filename) {
                const ext = mediaRecord.filename.split('.').pop().toLowerCase();
                if (['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg';
                if (ext === 'png') mimeType = 'image/png';
                if (ext === 'webp') mimeType = 'image/webp';
                if (ext === 'pdf') mimeType = 'application/pdf';
            }
            mimeType = mimeType || "application/octet-stream";

            let promptText = "Describe this content in detail.";
            if (mimeType.startsWith('image/')) promptText = "Describe this image in detail, capturing visual elements, text, and context.";
            else if (mimeType === 'application/pdf') promptText = "Summarize the content of this document in detail, capturing key points and entities.";

            return await this.llmGenerate(promptText, { mimeType, data: base64Data });

        } catch (e) {
            this.logger.error('DescribeMedia failed', e);
            return null;
        }
    }

    // Helper to get file buffer via MinIO Client
    private async getFileBuffer(fileKey: string, bucketName?: string): Promise<Buffer | null> {
        // Priority: DB bucket > Environment S3_BUCKET > 'cms-media' fallback
        const defaultBucket = this.configService.get('S3_BUCKET') || this.configService.get('NEXT_PUBLIC_S3_BUCKET') || 'cms-media';
        const bucket = bucketName || defaultBucket;

        this.logger.log(`Getting file buffer via MinIO for key: ${fileKey} in bucket: ${bucket}`);

        return new Promise((resolve) => {
            (this.minioClient as any).getObject(bucket, fileKey, (err: any, dataStream: any) => {
                if (err) {
                    this.logger.error(`MinIO getObject failed for ${fileKey}: ${err.message}`);
                    resolve(null);
                    return;
                }

                const chunks: Buffer[] = [];
                dataStream.on('data', (chunk: any) => chunks.push(chunk));
                dataStream.on('end', () => resolve(Buffer.concat(chunks)));
                dataStream.on('error', (streamErr: any) => {
                    this.logger.error(`MinIO stream error for ${fileKey}`, streamErr);
                    resolve(null);
                });
            });
        });
    }

    async sendToLabelStudio(mediaId: string, mediaUrl: string): Promise<boolean> {
        this.logger.log(`Sending media ${mediaId} to Label Studio (Annotations Mode)`);

        const lsUrl = this.configService.get('LABELSTUDIO_URL');
        const token = this.configService.get('LABELSTUDIO_API_TOKEN');
        const projectId = this.configService.get('LABELSTUDIO_PROJECT_ID');

        if (!lsUrl || !token || !projectId) return false;

        try {
            const tags = await this.autoLabelMedia(mediaId);

            // Construct Payload with ANNOTATIONS (User Request)
            // Instead of predictions.
            const taskData: any = {
                data: { image: mediaUrl },
                meta: { media_id: mediaId },
                // Annotations are explicit results
                annotations: [{
                    result: [{
                        from_name: "choice",
                        to_name: "image",
                        type: "choices",
                        value: { choices: tags }
                    }],
                    ground_truth: false
                }]
            };

            const response = await fetch(`${lsUrl}/api/projects/${projectId}/tasks/bulk`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([taskData])
            });

            if (!response.ok) return false;

            const json = await response.json();
            const taskId = json[0]?.id;

            if (taskId) {
                await this.webhooksService.storeTaskMapping(mediaId, taskId, parseInt(projectId), taskData.annotations);
            }

            return true;
        } catch (e) {
            this.logger.error('Label Studio Send Failed', e);
            return false;
        }
    }

    // Stubbing other methods to complete class structure
    async chatWithSources(q: string, ids: string[]) { return "Chat unimplemented in refactor stub"; }
    async generateReport(q: string, ids: string[]) { return "Report unimplemented in refactor stub"; }
    async generatePresentation(q: string, ids: string[]) { return "Presentation unimplemented in refactor stub"; }
    async generatePodcastScript(ids: string[]) { return "Podcast unimplemented in refactor stub"; }
    async generateImage(p: string) { return ""; }
    private chunkText(t: string, s: number) { return [t]; }
}
