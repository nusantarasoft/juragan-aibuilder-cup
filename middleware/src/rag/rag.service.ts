import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';

@Injectable()
export class RagService {
    private readonly logger = new Logger(RagService.name);
    private pgClient: Client;

    constructor(private configService: ConfigService) {
        // Initialize Postgres Client for Vector Search
        this.pgClient = new Client({
            connectionString: this.configService.get('SUPABASE_DB_URL'),
        });
        this.pgClient.connect().catch(e => this.logger.error('Failed to connect to PG', e));
    }

    async generateMediaEmbeddings(mediaId: string, content: string): Promise<boolean> {
        this.logger.log(`Generating embeddings for media ${mediaId} via REST API`);
        const apiKey = this.configService.get('GOOGLE_API_KEY');
        if (!apiKey) {
            this.logger.error('Google API Key not configured');
            return false;
        }

        let textToEmbed = content;

        // If content is empty, construct it from metadata (filename, alt_text, tags)
        if (!textToEmbed || textToEmbed.trim() === '') {
            try {
                const res = await this.pgClient.query("SELECT * FROM media WHERE id = $1", [mediaId]);
                if (res.rows.length > 0) {
                    const m = res.rows[0];
                    const parts = [];
                    if (m.filename) parts.push(`Filename: ${m.filename}`);
                    if (m.alt_text) parts.push(`Description: ${m.alt_text}`);
                    if (m.metadata?.tags) parts.push(`Tags: ${m.metadata.tags.join(', ')}`);

                    if (parts.length > 0) {
                        textToEmbed = parts.join('\n');
                        this.logger.log(`Using metadata for embedding: ${textToEmbed.substring(0, 50)}...`);
                    }
                }
            } catch (e) {
                this.logger.warn('Failed to fetch media metadata for embedding fallback', e);
            }
        }

        if (!textToEmbed || textToEmbed.trim() === '') {
            this.logger.warn('No content to embed for media ' + mediaId);
            return false;
        }

        try {
            // Use Gemini Embedding REST API
            const url = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "models/embedding-001",
                    content: {
                        parts: [{ text: textToEmbed }]
                    }
                })
            });

            if (!response.ok) {
                const err = await response.text();
                this.logger.error(`Gemini Embedding API failed: ${err}`);
                return false;
            }

            const json = await response.json();
            const vectors = json.embedding?.values;

            if (!vectors) {
                this.logger.error('No embedding returned from Gemini');
                return false;
            }

            // Store in Supabase
            const query = `
                INSERT INTO media_embeddings (id, embedding)
                VALUES ($1, $2)
                ON CONFLICT (id) DO UPDATE SET embedding = $2;
            `;
            const vectorString = JSON.stringify(vectors);

            await this.pgClient.query(query, [mediaId, vectorString]);
            this.logger.log(`Embeddings stored for ${mediaId}`);
            return true;
        } catch (error) {
            this.logger.error('Error generating/storing embeddings', error);
            return false;
        }
    }

    async sendToLabelStudio(mediaId: string, mediaUrl: string): Promise<boolean> {
        this.logger.log(`Sending media ${mediaId} to Label Studio`);
        this.logger.warn('Label Studio integration placeholder executed');
        return true;
    }

    async autoLabelMedia(mediaId: string): Promise<string[]> {
        this.logger.log(`Auto-labeling media ${mediaId} via REST API...`);
        const apiKey = this.configService.get('GOOGLE_API_KEY');
        if (!apiKey) {
            this.logger.error("Google API Key not configured");
            return [];
        }

        try {
            const res = await this.pgClient.query("SELECT * FROM media WHERE id = $1", [mediaId]);
            if (res.rows.length === 0) return [];
            const mediaData = res.rows[0];

            // Hack: Use the public URL if accessible from middleware.
            const s3Endpoint = this.configService.get('NEXT_PUBLIC_S3_ENDPOINT') || 'http://minio:9000';
            const bucket = this.configService.get('NEXT_PUBLIC_S3_BUCKET') || 'cms-media';
            const fileKey = mediaData.filepath || mediaData.filename;

            const fileUrl = `${s3Endpoint}/${bucket}/${fileKey}`;
            this.logger.log(`Fetching file from ${fileUrl}`);

            const fileRes = await fetch(fileUrl);
            if (!fileRes.ok) {
                this.logger.error(`Failed to fetch file: ${fileRes.statusText}`);
                return [];
            }
            const arrayBuffer = await fileRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Data = buffer.toString("base64");
            const mimeType = mediaData.mimetype || "image/jpeg";

            // Use Gemini Vision REST API 
            // UPDATED: Using gemini-2.0-flash-exp as verified
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

            const prompt = "Analyze this file (image or document) and provide a list of 5-10 descriptive tags. Return the tags as a JSON array of strings, for example: [\"tag1\", \"tag2\"]. Do not include markdown formatting.";

            const payload = {
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.text();
                this.logger.error(`Gemini Vision API failed: ${err}`);
                return [];
            }

            const json = await response.json();
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                this.logger.warn('No text returned from Gemini');
                return [];
            }

            this.logger.log(`Gemini response: ${text}`);

            let tags: string[] = [];
            try {
                const cleaned = text.replace(/```json|```/g, '').trim();
                tags = JSON.parse(cleaned);
            } catch (e) {
                // Fallback: split by comma if not valid JSON
                tags = text.split(',').map(s => s.trim());
            }

            const existingMetadata = mediaData.metadata || {};
            const newMetadata = {
                ...existingMetadata,
                tags: tags,
                ai_generated: true
            };

            await this.pgClient.query("UPDATE media SET metadata = $1 WHERE id = $2", [newMetadata, mediaId]);

            return tags;
        } catch (error) {
            this.logger.error("AutoLabel failed", error);
            return [];
        }
    }

    async chatWithSources(query: string, mediaIds: string[]): Promise<string> {
        this.logger.log(`Chatting with sources: ${mediaIds.join(', ')}`);
        const apiKey = this.configService.get('GOOGLE_API_KEY');
        if (!apiKey) return "Error: Google API Key not configured";

        try {
            // 1. Fetch Media Content
            const parts = await this.getMediaContextParts(mediaIds);

            if (parts.length === 0) {
                this.logger.warn("No valid sources found, proceeding with text only.");
            }

            // Add the user query
            parts.push({ text: query });

            // 2. Call Gemini 2.0 Flash Exp
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

            const payload = {
                contents: [{ parts: parts }],
                generationConfig: {
                    temperature: 0.2, // Lower temperature for more factual responses
                    maxOutputTokens: 2048
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.text();
                this.logger.error(`Gemini Chat API failed: ${err}`);
                return `Error from AI: ${err}`;
            }

            const json = await response.json();
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

            return text || "No response generated.";

        } catch (error) {
            this.logger.error("chatWithSources failed", error);
            return "Internal Server Error during AI Chat.";
        }
    }

    private async getMediaContextParts(mediaIds: string[]): Promise<any[]> {
        const parts: any[] = [];
        const s3Endpoint = this.configService.get('NEXT_PUBLIC_S3_ENDPOINT') || 'http://minio:9000';
        const bucket = this.configService.get('NEXT_PUBLIC_S3_BUCKET') || 'cms-media';

        for (const id of mediaIds) {
            try {
                const res = await this.pgClient.query("SELECT * FROM media WHERE id = $1", [id]);
                if (res.rows.length === 0) continue;
                const mediaData = res.rows[0];
                const fileKey = mediaData.filepath || mediaData.filename;
                const fileUrl = `${s3Endpoint}/${bucket}/${fileKey}`;

                const fileRes = await fetch(fileUrl);
                if (fileRes.ok) {
                    const arrayBuffer = await fileRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const base64Data = buffer.toString("base64");
                    const mimeType = mediaData.mimetype || "application/octet-stream";

                    parts.push({
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data
                        }
                    });
                    this.logger.log(`Added content from ${fileKey} (${mimeType})`);
                }
            } catch (e) {
                this.logger.error(`Failed to fetch context for media ${id}`, e);
            }
        }
        return parts;
    }

    async generateReport(query: string, mediaIds: string[]): Promise<string> {
        this.logger.log(`Generating report for: ${mediaIds.join(', ')}`);
        const apiKey = this.configService.get('GOOGLE_API_KEY');
        if (!apiKey) return "Error: Google API Key not configured";

        try {
            const parts = await this.getMediaContextParts(mediaIds);
            const systemPrompt = `
                You are a professional business analyst. 
                Generate a comprehensive report in Markdown format based on the provided context.
                The report should include:
                - Executive Summary
                - Key Findings
                - Detailed Analysis
                - Conclusions
                User Query/Focus: ${query}
            `;
            parts.push({ text: systemPrompt });

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: parts }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
                })
            });

            if (!response.ok) throw new Error(await response.text());
            const json = await response.json();
            return json.candidates?.[0]?.content?.parts?.[0]?.text || "No report generated.";
        } catch (error) {
            this.logger.error("generateReport failed", error);
            return "Failed to generate report.";
        }
    }

    async generatePresentation(query: string, mediaIds: string[]): Promise<string> {
        this.logger.log(`Generating presentation for: ${mediaIds.join(', ')}`);
        const apiKey = this.configService.get('GOOGLE_API_KEY');
        if (!apiKey) return "Error: Google API Key not configured";

        try {
            const parts = await this.getMediaContextParts(mediaIds);
            const systemPrompt = `
                Create a presentation based on the context.
                Focus on: ${query}.
                Return ONLY a JSON array of slides. 
                Format: [{ "title": "Slide Title", "bullets": ["Point 1", "Point 2"], "speakerNotes": "..." }]
                Do not wrap in markdown code blocks. Just valid JSON.
            `;
            parts.push({ text: systemPrompt });

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: parts }],
                    generationConfig: { temperature: 0.3, responseMimeType: "application/json" }
                })
            });

            if (!response.ok) throw new Error(await response.text());
            const json = await response.json();
            return json.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        } catch (error) {
            this.logger.error("generatePresentation failed", error);
            return "[]";
        }
    }

    async generateImage(prompt: string): Promise<string> {
        this.logger.log(`Generating image for: ${prompt}`);
        const apiKey = this.configService.get('GOOGLE_API_KEY');
        if (!apiKey) return "";

        try {
            // Using gemini-2.0-flash-exp as fallback if Imagen isn't available
            // But trying Imagen 3 generate endpoint first
            const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{ prompt: prompt }],
                    parameters: { sampleCount: 1, aspectRatio: "16:9" }
                })
            });

            if (!response.ok) throw new Error(await response.text());
            const json = await response.json();
            const b64 = json.predictions?.[0]?.bytesBase64Encoded;
            return b64 ? `data:image/png;base64,${b64}` : "";
        } catch (error) {
            this.logger.error("generateImage failed", error);
            return "";
        }
    }

    async generatePodcastScript(mediaIds: string[]): Promise<string> {
        this.logger.log(`Generating podcast script for: ${mediaIds.join(', ')}`);
        const apiKey = this.configService.get('GOOGLE_API_KEY');
        if (!apiKey) return "[]";

        try {
            const parts = await this.getMediaContextParts(mediaIds);
            const systemPrompt = `
                You are a scriptwriter for a tech podcast.
                Create a lively dialogue between two hosts (Host A and Host B) discussing the provided content.
                - Host A: Enthusiastic, introduces topics.
                - Host B: Analytical, adds depth and details.
                - Format: ONLY return a JSON array: [{"speaker": "Host A", "text": "..."}, {"speaker": "Host B", "text": "..."}]
                - Length: About 10-15 exchanges.
                - Tone: Conversational, engaging, informative.
                Do not wrap in markdown or code blocks. Just valid JSON.
            `;
            parts.push({ text: systemPrompt });

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: parts }],
                    generationConfig: { temperature: 0.5, responseMimeType: "application/json" }
                })
            });

            if (!response.ok) throw new Error(await response.text());
            const json = await response.json();
            return json.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        } catch (error) {
            this.logger.error("generatePodcastScript failed", error);
            return "[]";
        }
    }
}
