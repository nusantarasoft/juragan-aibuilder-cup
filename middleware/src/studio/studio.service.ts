import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { SupabaseService } from '../supabase/supabase.service';
import { ClaudeAiService } from '../ai/claude-ai.service';
import { VertexAiService } from '../ai/vertex-ai.service';
import { StudioIngestionService } from './studio-ingestion.service';
import { StudioContextService } from './studio-context.service';
import { StudioDbContextService, type StudioContextConfig } from './studio-db-context.service';
import {
    buildQueryUnderstandingPrompt,
    normalizeQueryUnderstanding,
    type QueryUnderstandingResult,
} from './query-understanding';

/**
 * Studio AI business logic — orchestrates notebooks, sources, and conversations.
 * Bridges Supabase (metadata), MinIO (storage), and internal LLM (chat/report).
 */
@Injectable()
export class StudioService {
    private readonly logger = new Logger(StudioService.name);
    private minioClient: Minio.Client;
    private readonly bucket: string;

    constructor(
        private configService: ConfigService,
        private supabaseService: SupabaseService,
        private vertexAiService: VertexAiService,
        private claudeAiService: ClaudeAiService,
        private ingestionService: StudioIngestionService,
        private contextService: StudioContextService,
        private dbContextService: StudioDbContextService,
    ) {
        // MinIO client for file storage
        const endpointUrl = this.configService.get('S3_ENDPOINT') || 'http://minio:9000';
        let endPoint = 'minio';
        let port = 9000;
        let useSSL = false;
        try {
            const url = new URL(endpointUrl);
            endPoint = url.hostname;
            port = parseInt(url.port || '9000', 10);
            useSSL = url.protocol === 'https:';
        } catch { /* use defaults */ }

        this.minioClient = new Minio.Client({
            endPoint,
            port,
            useSSL,
            accessKey: this.configService.get('S3_ACCESS_KEY') || 'minioadmin',
            secretKey: this.configService.get('S3_SECRET_KEY') || 'minioadmin',
        });

        this.bucket = this.configService.get('S3_BUCKET') || 'cms-media';
        this.logger.log('StudioService initialized');
    }

    /** AI Studio LLM: Vertex (default) or Anthropic Claude via STUDIO_AI_PROVIDER. */
    private useAnthropicStudio(): boolean {
        const v = (this.configService.get<string>('STUDIO_AI_PROVIDER') || 'vertex').toLowerCase();
        return v === 'anthropic' || v === 'claude';
    }

    private studioGenerateText(prompt: string): Promise<string> {
        return this.useAnthropicStudio()
            ? this.claudeAiService.generateText(prompt)
            : this.vertexAiService.generateText(prompt);
    }

    private studioGenerateStructuredJSON(prompt: string): Promise<any> {
        return this.useAnthropicStudio()
            ? this.claudeAiService.generateStructuredJSON(prompt)
            : this.vertexAiService.generateStructuredJSON(prompt);
    }

    // ── Notebooks ────────────────────────────────────────────────────

    async createNotebook(
        name: string,
        description: string,
        userId: string,
        audience: 'admin' | 'customer' = 'admin',
        contextConfig?: StudioContextConfig,
    ): Promise<any> {
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .insert({
                name,
                description,
                user_id: userId,
                audience,
                context_config: contextConfig ?? {},
            })
            .select()
            .single();

        if (error) throw error;
        this.logger.log(`Created notebook "${name}"`);
        return data;
    }

    async getNotebooks(userId: string): Promise<any[]> {
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .select('*, studio_notebook_sources(count)')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async getNotebook(notebookId: string): Promise<any> {
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .select('*, studio_notebook_sources(*)')
            .eq('id', notebookId)
            .single();

        if (error || !data) throw new NotFoundException('Notebook not found');
        return data;
    }

    async deleteNotebook(notebookId: string): Promise<boolean> {
        // Delete from Supabase (cascades to sources, conversations, messages)
        const { error } = await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .delete()
            .eq('id', notebookId);

        if (error) throw error;
        return true;
    }

    // ── Sources ──────────────────────────────────────────────────────

    async uploadSource(notebookId: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number }): Promise<any> {
        const notebook = await this.getNotebook(notebookId);

        // 1. Upload to MinIO
        const s3Key = `studio/${notebookId}/${Date.now()}_${file.originalname}`;
        await this.minioClient.putObject(this.bucket, s3Key, file.buffer, file.size, {
            'Content-Type': file.mimetype,
        });

        // 2. Save source record — indexing runs asynchronously
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notebook_sources')
            .insert({
                notebook_id: notebookId,
                filename: file.originalname,
                file_type: file.mimetype,
                file_size: file.size,
                s3_key: s3Key,
                parse_status: 'pending',
                parse_progress: 0,
                chunk_count: 0,
            })
            .select()
            .single();

        if (error) throw error;

        void this.ingestionService.ingestSource(data.id);

        // 5. Update source count
        await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .update({
                source_count: (notebook.source_count || 0) + 1,
                updated_at: new Date(),
            })
            .eq('id', notebookId);

        this.logger.log(`Uploaded source "${file.originalname}" to notebook ${notebookId}`);
        return data;
    }

    async addMediaAsSource(notebookId: string, mediaId: string): Promise<any> {
        const notebook = await this.getNotebook(notebookId);

        // 1. Get media record from existing library
        const { data: mediaRecord, error: mediaError } = await this.supabaseService.getAdminClient()
            .from('media')
            .select('*')
            .eq('id', mediaId)
            .single();

        if (mediaError || !mediaRecord) throw new NotFoundException('Media not found');

        // 2. Get file buffer from MinIO
        const fileKey = mediaRecord.s3_key || mediaRecord.filepath || mediaRecord.filename;
        const mediaBucket = mediaRecord.bucket_name || this.bucket;
        const buffer = await this.getFileBuffer(fileKey, mediaBucket);
        if (!buffer) throw new Error('Failed to read media file from storage');

        // 3. Save source linked to media — indexing runs asynchronously
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notebook_sources')
            .insert({
                notebook_id: notebookId,
                media_id: mediaId,
                filename: mediaRecord.filename,
                file_type: mediaRecord.mime_type,
                file_size: mediaRecord.size || 0,
                s3_key: fileKey,
                parse_status: 'pending',
                parse_progress: 0,
                chunk_count: 0,
            })
            .select()
            .single();

        if (error) throw error;

        void this.ingestionService.ingestSource(data.id);

        // 6. Update count
        await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .update({
                source_count: (notebook.source_count || 0) + 1,
                updated_at: new Date(),
            })
            .eq('id', notebookId);

        this.logger.log(`Added media "${mediaRecord.filename}" to notebook ${notebookId}`);
        return data;
    }

    async getSourceStatus(notebookId: string): Promise<any[]> {
        const notebook = await this.getNotebook(notebookId);
        return notebook.studio_notebook_sources || [];
    }

    async removeSource(notebookId: string, sourceId: string): Promise<boolean> {
        const { error } = await this.supabaseService.getAdminClient()
            .from('studio_notebook_sources')
            .delete()
            .eq('id', sourceId)
            .eq('notebook_id', notebookId);

        if (error) throw error;
        return true;
    }

    // ── Chat ─────────────────────────────────────────────────────────

    /** New conversation for chat-only internal engine. */
    async createConversationSession(notebookId: string, userId: string | undefined, title: string): Promise<any> {
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_conversations')
            .insert({
                notebook_id: notebookId,
                user_id: userId,
                title,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    /** Append a message and bump conversation updated_at. */
    async appendStudioMessage(
        conversationId: string,
        role: 'user' | 'assistant' | 'system',
        content: string,
        sourceRefs?: any[] | null,
    ): Promise<void> {
        await this.supabaseService.getAdminClient()
            .from('studio_messages')
            .insert({
                conversation_id: conversationId,
                role,
                content,
                source_refs: sourceRefs ?? null,
            });
        await this.supabaseService.getAdminClient()
            .from('studio_conversations')
            .update({ updated_at: new Date() })
            .eq('id', conversationId);
    }

    /**
     * Query understanding & rewriting for guided RAG (and future intent routing).
     * Never throws: returns a safe pass-through object on model/parse failure.
     */
    async understandUserQuery(raw: string): Promise<QueryUnderstandingResult> {
        const trimmed = typeof raw === 'string' ? raw : '';
        try {
            const prompt = buildQueryUnderstandingPrompt(trimmed);
            const parsed = await this.studioGenerateStructuredJSON(prompt);
            return normalizeQueryUnderstanding(parsed, trimmed);
        } catch (e: any) {
            this.logger.warn(`understandUserQuery failed: ${e?.message ?? e}`);
            return normalizeQueryUnderstanding(null, trimmed);
        }
    }

    /** Chat-only engine hook. Keeps shape for compatibility with guide-flow. */
    async invokeRagQuery(
        notebookId: string,
        conversationId: string,
        question: string,
        options?: {
            instruction?: string;
            queryUnderstanding?: QueryUnderstandingResult;
        },
    ): Promise<{ answer: string; references: { content: string; docName: string; score: number }[]; rawChunks: any[] }> {
        const notebook = await this.getNotebook(notebookId);
        const { data: conversation, error } = await this.supabaseService.getAdminClient()
            .from('studio_conversations')
            .select('*')
            .eq('id', conversationId)
            .single();
        if (error || !conversation) throw new NotFoundException('Conversation not found');

        const qu = options?.queryUnderstanding ?? (await this.understandUserQuery(question));
        const searchQuery = qu.rewritten_query?.trim() || question;
        const config = this.dbContextService.parseConfig(notebook.context_config);
        const audience = (notebook.audience === 'customer' ? 'customer' : 'admin') as 'admin' | 'customer';

        const retrieval = await this.contextService.retrieveContext(
            notebookId,
            searchQuery,
            qu,
            config,
        );

        const { data: messages } = await this.supabaseService.getAdminClient()
            .from('studio_messages')
            .select('role, content')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        const conversationLines = (messages || [])
            .slice(-8)
            .map((m: any) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`);

        const answer = await this.contextService.generateGroundedAnswer({
            notebookName: notebook.name,
            audience,
            question: options?.instruction
                ? `${options.instruction}\n\nPertanyaan: ${searchQuery}`
                : searchQuery,
            instruction: options?.instruction,
            conversationLines,
            retrieval,
        });

        return {
            answer,
            references: retrieval.references,
            rawChunks: retrieval.rawChunks,
        };
    }

    async reindexNotebookSource(notebookId: string, sourceId: string): Promise<boolean> {
        const { data } = await this.supabaseService.getAdminClient()
            .from('studio_notebook_sources')
            .select('id')
            .eq('id', sourceId)
            .eq('notebook_id', notebookId)
            .single();
        if (!data) throw new NotFoundException('Source not found');
        void this.ingestionService.ingestSource(sourceId);
        return true;
    }

    async reindexNotebook(notebookId: string): Promise<boolean> {
        void this.ingestionService.reindexNotebook(notebookId);
        return true;
    }

    async chat(notebookId: string, question: string, conversationId?: string, userId?: string): Promise<any> {
        const notebook = await this.getNotebook(notebookId);

        // Get or create conversation
        let conversation: any;
        if (conversationId) {
            const { data } = await this.supabaseService.getAdminClient()
                .from('studio_conversations')
                .select('*')
                .eq('id', conversationId)
                .single();
            conversation = data;
        }

        if (!conversation) {
            const { data, error } = await this.supabaseService.getAdminClient()
                .from('studio_conversations')
                .insert({
                    notebook_id: notebookId,
                    user_id: userId,
                    title: question.substring(0, 100),
                })
                .select()
                .single();

            if (error) throw error;
            conversation = data;
        }

        await this.appendStudioMessage(conversation.id, 'user', question);

        const { answer, references, rawChunks } = await this.invokeRagQuery(notebookId, conversation.id, question);
        await this.appendStudioMessage(conversation.id, 'assistant', answer, rawChunks);

        // Update conversation title if first message
        if (!conversationId) {
            await this.supabaseService.getAdminClient()
                .from('studio_conversations')
                .update({ title: question.substring(0, 100) })
                .eq('id', conversation.id);
        }

        return {
            conversationId: conversation.id,
            answer,
            references,
        };
    }

    async getConversation(conversationId: string): Promise<any> {
        const { data: conversation, error: convError } = await this.supabaseService.getAdminClient()
            .from('studio_conversations')
            .select('*')
            .eq('id', conversationId)
            .single();

        if (convError) throw convError;

        const { data: messages, error: msgError } = await this.supabaseService.getAdminClient()
            .from('studio_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        return { ...conversation, messages: messages || [] };
    }

    async getConversations(notebookId: string): Promise<any[]> {
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_conversations')
            .select('*')
            .eq('notebook_id', notebookId)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    // ── Generate (Report, etc) ───────────────────────────────────────

    async generateReport(notebookId: string, query: string): Promise<string> {
        const notebook = await this.getNotebook(notebookId);
        const qu = await this.understandUserQuery(query);
        const config = this.dbContextService.parseConfig(notebook.context_config);
        const retrieval = await this.contextService.retrieveContext(
            notebookId,
            qu.rewritten_query || query,
            qu,
            config,
        );

        const reportPrompt = [
            `You are an executive analyst for notebook "${notebook.name}".`,
            'Create a comprehensive executive report using ONLY the evidence below.',
            '',
            retrieval.fileContext ? `## Document evidence\n${retrieval.fileContext}` : '(No indexed documents)',
            retrieval.dbContext ? `## Database evidence\n${retrieval.dbContext}` : '',
            '',
            `## Report topic\n${query}`,
            '',
            'Structure: Executive Summary, Key Findings, Detailed Analysis, Recommendations, Conclusion.',
            'Use markdown. Cite source filenames where applicable. State assumptions if evidence is thin.',
        ].join('\n');

        return this.studioGenerateText(reportPrompt);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private async getFileBuffer(fileKey: string, bucketName?: string): Promise<Buffer | null> {
        const bucket = bucketName || this.bucket;
        return new Promise((resolve) => {
            (this.minioClient as any).getObject(bucket, fileKey, (err: any, stream: any) => {
                if (err) {
                    this.logger.error(`MinIO getObject failed: ${err.message}`);
                    resolve(null);
                    return;
                }
                const chunks: Buffer[] = [];
                stream.on('data', (chunk: any) => chunks.push(chunk));
                stream.on('end', () => resolve(Buffer.concat(chunks)));
                stream.on('error', () => resolve(null));
            });
        });
    }

    /** @deprecated Use invokeRagQuery — kept for any legacy callers */
    private async generateNotebookAnswer(notebook: any, conversationId: string, question: string): Promise<string> {
        const result = await this.invokeRagQuery(notebook.id, conversationId, question);
        return result.answer;
    }
}
