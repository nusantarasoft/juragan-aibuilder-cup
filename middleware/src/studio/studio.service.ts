import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { SupabaseService } from '../supabase/supabase.service';
import { AiRouterService } from '../ai/ai-router.service';
import { AiSettingsService } from '../ai/ai-settings.service';
import type { AiConnectionTestResult, LlmProvider } from '../ai/ai-settings.types';
import { StudioIngestionService } from './studio-ingestion.service';
import { StudioContextService } from './studio-context.service';
import { StudioOutputService, type StudioOutputType } from './studio-output.service';
import {
    StudioDbContextService,
    DEFAULT_STUDIO_SALES_CONTEXT,
    type StudioContextConfig,
} from './studio-db-context.service';
import {
    buildQueryUnderstandingPrompt,
    normalizeQueryUnderstanding,
    type ConversationLine,
    type QueryUnderstandingResult,
} from './query-understanding';
import { assertNoSupabaseError, normalizeOptionalUuid, resolveUserIdForDb } from './studio-supabase.util';
import { resolveSourceStorage } from './studio-source-storage.util';

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
        private aiRouter: AiRouterService,
        private aiSettings: AiSettingsService,
        private ingestionService: StudioIngestionService,
        private contextService: StudioContextService,
        private dbContextService: StudioDbContextService,
        private outputService: StudioOutputService,
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

    // ── Settings ─────────────────────────────────────────────────────

    async getSettings(tenantId?: string): Promise<any> {
        return this.aiSettings.getPublicSettings(tenantId);
    }

    async updateSettings(tenantId: string | undefined, payload: any): Promise<any> {
        return this.aiSettings.updateSettings(tenantId, payload);
    }

    async getAiStatus(tenantId?: string) {
        return this.aiSettings.getAiStatus(tenantId);
    }

    async testAiConnection(
        provider: LlmProvider,
        tenantId?: string,
        overrides?: { ollamaBaseUrl?: string; ollamaModel?: string },
    ): Promise<AiConnectionTestResult> {
        return this.aiRouter.testConnection(provider, tenantId, overrides);
    }

    private studioGenerateText(prompt: string): Promise<string> {
        return this.aiRouter.generateText(prompt);
    }

    private studioGenerateStructuredJSON(prompt: string): Promise<any> {
        return this.aiRouter.generateStructuredJSON(prompt);
    }

    // ── Notebooks ────────────────────────────────────────────────────

    async createNotebook(
        name: string,
        description: string,
        userId: string,
        audience: 'admin' | 'customer' = 'admin',
        contextConfig?: StudioContextConfig,
    ): Promise<any> {
        const ownerId = normalizeOptionalUuid(userId);
        if (!ownerId) {
            throw new BadRequestException('Invalid user id');
        }

        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .insert({
                name,
                description,
                user_id: ownerId,
                audience,
                context_config: contextConfig ?? DEFAULT_STUDIO_SALES_CONTEXT,
            })
            .select()
            .single();

        assertNoSupabaseError(error, 'Failed to create notebook');
        this.logger.log(`Created notebook "${name}"`);
        return data;
    }

    async getNotebooks(userId: string): Promise<any[]> {
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .select('*, studio_notebook_sources(count)')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        assertNoSupabaseError(error, 'Failed to list notebooks');
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

    async updateNotebook(
        notebookId: string,
        patch: { name?: string; description?: string; chat_instruction?: string },
    ): Promise<any> {
        const notebook = await this.getNotebook(notebookId);
        const config = this.dbContextService.parseConfig(notebook.context_config);
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (patch.name?.trim()) updates.name = patch.name.trim();
        if (patch.description !== undefined) updates.description = patch.description;
        if (patch.chat_instruction !== undefined) {
            updates.context_config = { ...config, chat_instruction: patch.chat_instruction };
        }
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .update(updates)
            .eq('id', notebookId)
            .select()
            .single();
        assertNoSupabaseError(error, 'Failed to update notebook');
        return data;
    }

    async deleteNotebook(notebookId: string): Promise<boolean> {
        // Delete from Supabase (cascades to sources, conversations, messages)
        const { error } = await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .delete()
            .eq('id', notebookId);

        assertNoSupabaseError(error, 'Failed to delete notebook');
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
                bucket_name: this.bucket,
                parse_status: 'pending',
                parse_stage: 'queued',
                parse_progress: 0,
                parse_error: null,
                embed_total: 0,
                embed_done: 0,
                chunk_count: 0,
            })
            .select()
            .single();

        assertNoSupabaseError(error, 'Failed to upload source');

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

        const storage = resolveSourceStorage(
            { media_id: mediaId, s3_key: mediaRecord.s3_key, filename: mediaRecord.filename },
            mediaRecord,
            this.bucket,
        );
        if (!storage) throw new BadRequestException('Media has no storage key');

        // Save source linked to media — indexing runs asynchronously
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notebook_sources')
            .insert({
                notebook_id: notebookId,
                media_id: mediaId,
                filename: mediaRecord.filename,
                file_type: mediaRecord.mime_type,
                file_size: mediaRecord.size_bytes || 0,
                s3_key: storage.fileKey,
                bucket_name: storage.bucket,
                parse_status: 'pending',
                parse_stage: 'queued',
                parse_progress: 0,
                parse_error: null,
                embed_total: 0,
                embed_done: 0,
                chunk_count: 0,
            })
            .select()
            .single();

        assertNoSupabaseError(error, 'Failed to add media source');

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

        assertNoSupabaseError(error, 'Failed to remove source');
        return true;
    }

    async importUrl(notebookId: string, url: string): Promise<any> {
        const trimmed = url?.trim();
        if (!trimmed) throw new BadRequestException('URL is required');
        let parsed: URL;
        try {
            parsed = new URL(trimmed);
        } catch {
            throw new BadRequestException('Invalid URL');
        }
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new BadRequestException('Only http/https URLs are supported');
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        let html: string;
        try {
            const res = await fetch(trimmed, {
                headers: { 'User-Agent': 'NusantaraSoft-AI-Studio/1.0' },
                signal: controller.signal,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            html = await res.text();
        } catch (e: any) {
            throw new BadRequestException(`Failed to fetch URL: ${e?.message ?? e}`);
        } finally {
            clearTimeout(timeout);
        }

        const text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 500_000);

        if (text.length < 50) {
            throw new BadRequestException('Could not extract enough text from URL');
        }

        const filename = `${parsed.hostname.replace(/\W+/g, '_')}_${Date.now()}.txt`;
        const buffer = Buffer.from(text, 'utf8');
        return this.uploadSource(notebookId, {
            buffer,
            originalname: filename,
            mimetype: 'text/plain',
            size: buffer.length,
        });
    }

    // ── Chat ─────────────────────────────────────────────────────────

    /** New conversation for chat-only internal engine. */
    async createConversationSession(notebookId: string, userId: string | undefined, title: string): Promise<any> {
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_conversations')
            .insert({
                notebook_id: notebookId,
                user_id: resolveUserIdForDb(userId, this.logger, 'createConversationSession'),
                title,
            })
            .select()
            .single();
        assertNoSupabaseError(error, 'Failed to create conversation session');
        return data;
    }

    /** Append a message and bump conversation updated_at. */
    async appendStudioMessage(
        conversationId: string,
        role: 'user' | 'assistant' | 'system',
        content: string,
        sourceRefs?: any[] | null,
    ): Promise<void> {
        const { error: msgErr } = await this.supabaseService.getAdminClient()
            .from('studio_messages')
            .insert({
                conversation_id: conversationId,
                role,
                content,
                source_refs: sourceRefs ?? null,
            });
        assertNoSupabaseError(msgErr, 'Failed to append studio message');

        const { error: convErr } = await this.supabaseService.getAdminClient()
            .from('studio_conversations')
            .update({ updated_at: new Date() })
            .eq('id', conversationId);
        assertNoSupabaseError(convErr, 'Failed to update conversation timestamp');
    }

    /**
     * Query understanding & rewriting for guided RAG (and future intent routing).
     * Never throws: returns a safe pass-through object on model/parse failure.
     */
    async getRecentConversationLines(
        conversationId: string,
        limit = 12,
    ): Promise<ConversationLine[]> {
        const { data: messages } = await this.supabaseService.getAdminClient()
            .from('studio_messages')
            .select('role, content')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        const rows = (messages || []).filter(
            (m: { role?: string; content?: string }) =>
                (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim(),
        );
        return rows.slice(-limit).map((m: { role: string; content: string }) => ({
            role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
            content: m.content.trim(),
        }));
    }

    async understandUserQuery(
        raw: string,
        options?: { conversationLines?: ConversationLine[] },
    ): Promise<QueryUnderstandingResult> {
        const trimmed = typeof raw === 'string' ? raw : '';
        const conversationLines = options?.conversationLines ?? [];
        try {
            const prompt = buildQueryUnderstandingPrompt(trimmed, conversationLines);
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
            sourceIds?: string[];
        },
    ): Promise<{ answer: string; references: { content: string; docName: string; score: number; chunkId?: string }[]; rawChunks: any[] }> {
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
            { sourceIds: options?.sourceIds },
        );

        const { data: messages } = await this.supabaseService.getAdminClient()
            .from('studio_messages')
            .select('role, content')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        const conversationLines = (messages || [])
            .slice(-8)
            .map((m: any) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`);

        const resolvedInstruction = options?.instruction?.trim() || undefined;
        const answer = await this.contextService.generateGroundedAnswer({
            notebookName: notebook.name,
            audience,
            question: resolvedInstruction
                ? `${resolvedInstruction}\n\nPertanyaan: ${searchQuery}`
                : searchQuery,
            instruction: resolvedInstruction,
            chatInstruction: config.chat_instruction,
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

    async chat(
        notebookId: string,
        question: string,
        conversationId?: string,
        userId?: string,
        options?: { sourceIds?: string[] },
    ): Promise<any> {
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
                    user_id: resolveUserIdForDb(userId, this.logger, 'studio chat'),
                    title: question.substring(0, 100),
                })
                .select()
                .single();

            assertNoSupabaseError(error, 'Failed to create conversation');
            conversation = data;
        }

        await this.appendStudioMessage(conversation.id, 'user', question);

        const conversationLines = await this.getRecentConversationLines(conversation.id, 12);
        const qu = await this.understandUserQuery(question, { conversationLines });
        const { answer, references, rawChunks } = await this.invokeRagQuery(
            notebookId,
            conversation.id,
            question,
            { queryUnderstanding: qu, sourceIds: options?.sourceIds },
        );
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

        if (convError) assertNoSupabaseError(convError, 'Failed to load conversation');

        const { data: messages, error: msgError } = await this.supabaseService.getAdminClient()
            .from('studio_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        assertNoSupabaseError(msgError, 'Failed to load messages');

        return { ...conversation, messages: messages || [] };
    }

    async getConversations(notebookId: string): Promise<any[]> {
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_conversations')
            .select('*')
            .eq('notebook_id', notebookId)
            .order('updated_at', { ascending: false });

        assertNoSupabaseError(error, 'Failed to list conversations');
        return data || [];
    }

    // ── Generate (Report, etc) ───────────────────────────────────────

    async getChunk(chunkId: string): Promise<any> {
        const chunk = await this.contextService.getChunkById(chunkId);
        if (!chunk) throw new NotFoundException('Chunk not found');
        return chunk;
    }

    async generateBrief(notebookId: string, force = false): Promise<{ summary: string; cached: boolean; outputId?: string }> {
        const notebook = await this.getNotebook(notebookId);
        const config = this.dbContextService.parseConfig(notebook.context_config);
        if (!force && config.brief_summary?.trim()) {
            return { summary: config.brief_summary, cached: true };
        }

        const retrieval = await this.contextService.retrieveContext(
            notebookId,
            `Ringkasan lengkap dan poin utama dari notebook ${notebook.name}`,
            undefined,
            config,
        );

        const prompt = [
            `Buat notebook brief dalam Bahasa Indonesia (3–5 paragraf) untuk "${notebook.name}".`,
            'Sertakan: topik utama, fakta penting, dan insight yang bisa ditindaklanjuti.',
            'Hanya dari bukti di bawah. Gunakan markdown ringkas.',
            retrieval.fileContext ? `\n## Sumber\n${retrieval.fileContext}` : '(Belum ada sumber terindeks)',
        ].join('\n');

        const summary = await this.studioGenerateText(prompt);
        const newConfig: StudioContextConfig = {
            ...config,
            brief_summary: summary,
            brief_generated_at: new Date().toISOString(),
        };

        await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .update({ context_config: newConfig, updated_at: new Date().toISOString() })
            .eq('id', notebookId);

        let outputId: string | undefined;
        try {
            const saved = await this.outputService.saveOutput(
                notebookId,
                'brief',
                `Brief — ${notebook.name}`,
                summary,
            );
            outputId = saved?.id;
        } catch (e: any) {
            this.logger.warn(`Could not persist brief output: ${e?.message}`);
        }

        return { summary, cached: false, outputId };
    }

    async listOutputs(notebookId: string): Promise<any[]> {
        return this.outputService.listOutputs(notebookId);
    }

    async deleteOutput(outputId: string): Promise<boolean> {
        return this.outputService.deleteOutput(outputId);
    }

    async generateStudioOutput(
        notebookId: string,
        outputType: StudioOutputType,
        query?: string,
        sourceIds?: string[],
    ): Promise<any> {
        const notebook = await this.getNotebook(notebookId);
        const gen = (prompt: string) => this.studioGenerateText(prompt);

        let result: { title: string; content: string };
        switch (outputType) {
            case 'report': {
                const content = await this.generateReport(notebookId, query || `Analisis lengkap ${notebook.name}`);
                result = { title: `Report — ${notebook.name}`, content };
                break;
            }
            case 'mind_map':
                result = await this.outputService.generateMindMap(notebookId, notebook.name, gen, sourceIds);
                break;
            case 'quiz':
                result = await this.outputService.generateQuiz(notebookId, notebook.name, gen, sourceIds);
                break;
            case 'faq':
                result = await this.outputService.generateFaq(notebookId, notebook.name, gen, sourceIds);
                break;
            case 'audio_script':
                result = await this.outputService.generateAudioScript(notebookId, notebook.name, gen, sourceIds);
                break;
            case 'data_table':
                result = await this.outputService.generateDataTable(
                    notebookId,
                    notebook.name,
                    query || 'Data terstruktur dari sumber',
                    gen,
                    sourceIds,
                );
                break;
            case 'brief': {
                const brief = await this.generateBrief(notebookId, true);
                result = { title: `Brief — ${notebook.name}`, content: brief.summary };
                break;
            }
            default:
                throw new BadRequestException(`Unknown output type: ${outputType}`);
        }

        return this.outputService.saveOutput(notebookId, outputType, result.title, result.content, {
            query: query ?? null,
            sourceIds: sourceIds ?? null,
        });
    }

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

    /** UC-18: sandbox prompt test without notebook RAG context. */
    async playgroundTest(params: {
        systemPrompt?: string;
        userPrompt: string;
        temperature?: number;
        maxTokens?: number;
    }) {
        const userPrompt = params.userPrompt?.trim();
        if (!userPrompt) {
            throw new BadRequestException('userPrompt is required');
        }
        return this.aiRouter.playgroundGenerate({
            systemPrompt: params.systemPrompt,
            userPrompt,
            temperature: params.temperature,
            maxOutputTokens: params.maxTokens,
        });
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
