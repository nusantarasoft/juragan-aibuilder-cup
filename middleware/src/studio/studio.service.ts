import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
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
import {
    detectImportKind,
    extractYoutubeCaptionUrl,
    googleDocsExportUrl,
    htmlToText,
    importFilename,
    parseYoutubeCaptionXml,
    youtubeVideoId,
} from './studio-import.util';
import { chunkForTts, cleanForTts, stripSpeakerLabels, ttsLanguageCode } from './studio-tts.util';

const DEFAULT_NOTEBOOK_ICON = '📓';

/** Reject corrupted emoji placeholders like "????" that come from bad DB encoding. */
function normalizeNotebookIcon(value?: string | null): string {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) return DEFAULT_NOTEBOOK_ICON;
    if (/^[?\uFFFD]+$/u.test(trimmed)) return DEFAULT_NOTEBOOK_ICON;
    return trimmed;
}

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

    // ── Ownership guards ─────────────────────────────────────────────
    // These enforce that a notebook (and anything derived from it) belongs to
    // the authenticated user. Callers must pass the id taken from the JWT, not
    // a client-supplied value.

    /** Throws ForbiddenException if the notebook is not owned by `userId`. */
    async assertNotebookOwner(notebookId: string, userId: string): Promise<void> {
        const uid = normalizeOptionalUuid(userId);
        if (!uid) throw new ForbiddenException('Authentication required');
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .select('user_id')
            .eq('id', notebookId)
            .single();
        if (error || !data) throw new NotFoundException('Notebook not found');
        if (data.user_id !== uid) {
            throw new ForbiddenException('You do not have access to this notebook');
        }
    }

    /** Throws if the conversation's notebook is not owned by `userId`. */
    async assertConversationOwner(conversationId: string, userId: string): Promise<void> {
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_conversations')
            .select('notebook_id')
            .eq('id', conversationId)
            .single();
        if (error || !data) throw new NotFoundException('Conversation not found');
        await this.assertNotebookOwner(data.notebook_id, userId);
    }

    /** Throws if the output's notebook is not owned by `userId`. */
    async assertOutputOwner(outputId: string, userId: string): Promise<void> {
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_outputs')
            .select('notebook_id')
            .eq('id', outputId)
            .single();
        if (error || !data) throw new NotFoundException('Output not found');
        await this.assertNotebookOwner(data.notebook_id, userId);
    }

    /** Throws if the note's notebook is not owned by `userId`; returns the note row. */
    async assertNoteOwner(noteId: string, userId: string): Promise<any> {
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notes')
            .select('*')
            .eq('id', noteId)
            .single();
        if (error || !data) throw new NotFoundException('Note not found');
        await this.assertNotebookOwner(data.notebook_id, userId);
        return data;
    }

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
                icon: DEFAULT_NOTEBOOK_ICON,
                context_config: contextConfig ?? DEFAULT_STUDIO_SALES_CONTEXT,
            })
            .select()
            .single();

        assertNoSupabaseError(error, 'Failed to create notebook');
        this.logger.log(`Created notebook "${name}"`);
        return data ? { ...data, icon: normalizeNotebookIcon(data.icon) } : data;
    }

    async getNotebooks(userId: string): Promise<any[]> {
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .select('*, studio_notebook_sources(count)')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        assertNoSupabaseError(error, 'Failed to list notebooks');
        return (data || []).map((row: any) => ({
            ...row,
            icon: normalizeNotebookIcon(row.icon),
        }));
    }

    async getNotebook(notebookId: string): Promise<any> {
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .select('*, studio_notebook_sources(*)')
            .eq('id', notebookId)
            .single();

        if (error || !data) throw new NotFoundException('Notebook not found');
        return { ...data, icon: normalizeNotebookIcon(data.icon) };
    }

    async updateNotebook(
        notebookId: string,
        patch: { name?: string; description?: string; chat_instruction?: string; icon?: string },
    ): Promise<any> {
        const notebook = await this.getNotebook(notebookId);
        const config = this.dbContextService.parseConfig(notebook.context_config);
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (patch.name?.trim()) updates.name = patch.name.trim();
        if (patch.description !== undefined) updates.description = patch.description;
        if (patch.icon?.trim()) updates.icon = normalizeNotebookIcon(patch.icon);
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
        return data ? { ...data, icon: normalizeNotebookIcon(data.icon) } : data;
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

    // ── Sharing (public view-only link) ──────────────────────────────

    /**
     * Enable public view-only sharing: assigns an unguessable token (reused if it
     * already exists) and flips is_shared. Returns { token, isShared }.
     */
    async createShareLink(notebookId: string): Promise<{ token: string; isShared: boolean }> {
        const notebook = await this.getNotebook(notebookId);
        const token: string =
            notebook.share_token || randomBytes(24).toString('base64url');
        const { error } = await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .update({ share_token: token, is_shared: true, shared_at: new Date().toISOString() })
            .eq('id', notebookId);
        assertNoSupabaseError(error, 'Failed to create share link');
        return { token, isShared: true };
    }

    /** Disable public sharing (keeps the token cleared so old links stop working). */
    async revokeShareLink(notebookId: string): Promise<boolean> {
        const { error } = await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .update({ share_token: null, is_shared: false, shared_at: null })
            .eq('id', notebookId);
        assertNoSupabaseError(error, 'Failed to revoke share link');
        return true;
    }

    /**
     * Public, unauthenticated read of a shared notebook by token. Returns a
     * read-only projection (notebook meta + sources list + generated outputs).
     * Throws NotFoundException when the token is invalid or sharing is disabled.
     */
    async getSharedNotebook(token: string): Promise<any> {
        const trimmed = (token || '').trim();
        if (!trimmed) throw new NotFoundException('Shared notebook not found');
        const admin = this.supabaseService.getAdminClient();
        const { data: notebook, error } = await admin
            .from('studio_notebooks')
            .select('id, name, description, icon, is_shared, share_token, created_at, updated_at')
            .eq('share_token', trimmed)
            .eq('is_shared', true)
            .single();
        if (error || !notebook) throw new NotFoundException('Shared notebook not found');

        const { data: sources } = await admin
            .from('studio_notebook_sources')
            .select('id, filename, file_type, parse_status')
            .eq('notebook_id', notebook.id)
            .order('created_at', { ascending: true });

        const { data: outputs } = await admin
            .from('studio_outputs')
            .select('id, output_type, title, content, metadata, created_at')
            .eq('notebook_id', notebook.id)
            .order('created_at', { ascending: false });

        return {
            notebook: {
                id: notebook.id,
                name: notebook.name,
                description: notebook.description,
                icon: normalizeNotebookIcon(notebook.icon),
                created_at: notebook.created_at,
                updated_at: notebook.updated_at,
            },
            sources: sources || [],
            outputs: outputs || [],
        };
    }

    // ── Audio synthesis (Audio Overview → MP3) ───────────────────────

    /**
     * Synthesize an audio_script output into a real MP3 using Google Cloud
     * Text-to-Speech (REST, API-key auth — reuses the configured google_api_key).
     * Uploads the file to object storage and records a presigned URL on the
     * output metadata. Throws BadRequestException when TTS is not configured or
     * the API rejects the request.
     */
    async synthesizeAudioForOutput(
        notebookId: string,
        outputId: string,
        language?: string,
    ): Promise<{ url: string; cached: boolean }> {
        const output = await this.outputService.getOutput(outputId);
        if (output.notebook_id !== notebookId) {
            throw new NotFoundException('Output not found');
        }

        // Return the cached URL if we already synthesized and it is still valid.
        const existingKey: string | undefined = output.metadata?.audio_s3_key;
        if (existingKey) {
            try {
                const url = await this.minioClient.presignedGetObject(this.bucket, existingKey, 7 * 24 * 3600);
                return { url, cached: true };
            } catch {
                /* re-synthesize below */
            }
        }

        const settings = await this.aiSettings.getRawSettings();
        const apiKey = settings.google_api_key?.trim();
        if (!apiKey) {
            throw new BadRequestException(
                'Text-to-Speech belum dikonfigurasi. Tambahkan Google API key (dengan Cloud Text-to-Speech API aktif) di pengaturan AI.',
            );
        }

        const scriptSource = stripSpeakerLabels(String(output.content ?? ''));
        const script = cleanForTts(scriptSource);
        const chunks = chunkForTts(script);
        if (chunks.length === 0) {
            throw new BadRequestException('Naskah audio kosong.');
        }

        const languageCode = ttsLanguageCode(language);
        const buffers: Buffer[] = [];
        for (const chunk of chunks) {
            const res = await fetch(
                `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        input: { text: chunk },
                        voice: { languageCode, ssmlGender: 'NEUTRAL' },
                        audioConfig: { audioEncoding: 'MP3' },
                    }),
                },
            );
            if (!res.ok) {
                const detail = await res.text().catch(() => '');
                throw new BadRequestException(
                    `Sintesis suara gagal (${res.status}). ${detail.slice(0, 200)}`,
                );
            }
            const json = (await res.json()) as { audioContent?: string };
            if (!json.audioContent) {
                throw new BadRequestException('Respons TTS tidak berisi audio.');
            }
            buffers.push(Buffer.from(json.audioContent, 'base64'));
        }

        const mp3 = Buffer.concat(buffers);
        const s3Key = `studio/${notebookId}/audio/${outputId}.mp3`;
        await this.minioClient.putObject(this.bucket, s3Key, mp3, mp3.length, {
            'Content-Type': 'audio/mpeg',
        });

        await this.supabaseService.getAdminClient()
            .from('studio_outputs')
            .update({
                metadata: { ...(output.metadata ?? {}), audio_s3_key: s3Key, audio_bytes: mp3.length },
            })
            .eq('id', outputId);

        const url = await this.minioClient.presignedGetObject(this.bucket, s3Key, 7 * 24 * 3600);
        return { url, cached: false };
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
        const notebook = await this.getNotebook(notebookId);
        const { error } = await this.supabaseService.getAdminClient()
            .from('studio_notebook_sources')
            .delete()
            .eq('id', sourceId)
            .eq('notebook_id', notebookId);

        assertNoSupabaseError(error, 'Failed to remove source');

        const nextCount = Math.max(0, (notebook.source_count || 0) - 1);
        await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .update({
                source_count: nextCount,
                updated_at: new Date(),
            })
            .eq('id', notebookId);

        return true;
    }

    /** Fetch a URL as text with a hard timeout. Throws BadRequestException on failure. */
    private async fetchTextWithTimeout(url: string, timeoutMs = 20000): Promise<string> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': 'NusantaraSoft-AI-Studio/1.0' },
                signal: controller.signal,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.text();
        } catch (e: any) {
            throw new BadRequestException(`Failed to fetch URL: ${e?.message ?? e}`);
        } finally {
            clearTimeout(timeout);
        }
    }

    /** Import a YouTube video transcript (captions) as a text source. */
    private async importYoutube(notebookId: string, url: string): Promise<any> {
        const videoId = youtubeVideoId(url);
        if (!videoId) throw new BadRequestException('Invalid YouTube URL');
        const watchHtml = await this.fetchTextWithTimeout(
            `https://www.youtube.com/watch?v=${videoId}`,
        );
        const captionUrl = extractYoutubeCaptionUrl(watchHtml);
        if (!captionUrl) {
            throw new BadRequestException(
                'Video ini tidak memiliki transkrip/caption yang bisa diimpor.',
            );
        }
        const captionXml = await this.fetchTextWithTimeout(captionUrl);
        const transcript = parseYoutubeCaptionXml(captionXml);
        if (transcript.length < 50) {
            throw new BadRequestException('Transkrip video terlalu pendek untuk diimpor.');
        }
        const titleMatch = /<title>([^<]*)<\/title>/i.exec(watchHtml);
        const title = titleMatch ? titleMatch[1].replace(/ - YouTube$/, '').trim() : `youtube_${videoId}`;
        const body = `Sumber: YouTube (${url})\nJudul: ${title}\n\n${transcript}`.slice(0, 500_000);
        return this.saveTextSource(notebookId, importFilename(title), body);
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

        const kind = detectImportKind(trimmed);
        if (kind === 'youtube') {
            return this.importYoutube(notebookId, trimmed);
        }

        // Google Docs/Slides: fetch the plain-text export of the shared document.
        const fetchUrl = (kind === 'google_doc' || kind === 'google_slides')
            ? (googleDocsExportUrl(trimmed) ?? trimmed)
            : trimmed;
        const usesGoogleExport = fetchUrl !== trimmed;

        const raw = await this.fetchTextWithTimeout(fetchUrl);
        const text = (usesGoogleExport ? raw.replace(/\s+\n/g, '\n').trim() : htmlToText(raw)).slice(0, 500_000);

        if (text.length < 50) {
            throw new BadRequestException('Could not extract enough text from URL');
        }

        return this.saveTextSource(notebookId, importFilename(parsed.hostname), text);
    }

    /**
     * Persist arbitrary plain text as a Studio source (used by paste-text and
     * URL/transcript importers). Runs through the same upload + ingest pipeline.
     */
    async addTextSource(notebookId: string, title: string, content: string): Promise<any> {
        const body = (content ?? '').trim();
        if (body.length < 20) {
            throw new BadRequestException('Teks terlalu pendek (minimal 20 karakter).');
        }
        const label = (title ?? '').trim() || 'Catatan teks';
        return this.saveTextSource(notebookId, importFilename(label), body.slice(0, 500_000), label);
    }

    /** Shared helper: turn a string into a text/plain source upload. */
    private saveTextSource(
        notebookId: string,
        filename: string,
        text: string,
        displayName?: string,
    ): Promise<any> {
        const buffer = Buffer.from(text, 'utf8');
        return this.uploadSource(notebookId, {
            buffer,
            originalname: displayName ? `${displayName}.txt` : filename,
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
            language?: string;
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
            language: options?.language,
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
        options?: { sourceIds?: string[]; language?: string },
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
            { queryUnderstanding: qu, sourceIds: options?.sourceIds, language: options?.language },
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

    /**
     * Streaming chat. Runs the same retrieval + persistence pipeline as {@link chat}
     * but emits incremental events so the UI can render tokens as they arrive:
     *  - `meta`  → { conversationId, references } (sent once, before generation)
     *  - `delta` → { text } (repeated for each answer fragment)
     *  - `done`  → { conversationId, answer, references }
     * Persistence (user + assistant messages) mirrors {@link chat} exactly.
     */
    async chatStream(
        notebookId: string,
        question: string,
        conversationId: string | undefined,
        userId: string | undefined,
        options: { sourceIds?: string[]; language?: string } | undefined,
        emit: (event: 'meta' | 'delta' | 'done', data: Record<string, unknown>) => void,
    ): Promise<void> {
        const notebook = await this.getNotebook(notebookId);

        let conversation: any;
        if (conversationId) {
            const { data } = await this.supabaseService.getAdminClient()
                .from('studio_conversations')
                .select('*')
                .eq('id', conversationId)
                .single();
            conversation = data;
        }

        const isNewConversation = !conversation;
        if (!conversation) {
            const { data, error } = await this.supabaseService.getAdminClient()
                .from('studio_conversations')
                .insert({
                    notebook_id: notebookId,
                    user_id: resolveUserIdForDb(userId, this.logger, 'studio chatStream'),
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

        emit('meta', { conversationId: conversation.id, references: retrieval.references });

        const answer = await this.contextService.generateGroundedAnswerStream(
            {
                notebookName: notebook.name,
                audience,
                question: searchQuery,
                chatInstruction: config.chat_instruction,
                conversationLines: conversationLines.map(
                    (l) => `${l.role === 'assistant' ? 'Assistant' : 'User'}: ${l.content}`,
                ),
                retrieval,
                language: options?.language,
            },
            (text) => emit('delta', { text }),
        );

        await this.appendStudioMessage(conversation.id, 'assistant', answer, retrieval.rawChunks);

        if (isNewConversation) {
            await this.supabaseService.getAdminClient()
                .from('studio_conversations')
                .update({ title: question.substring(0, 100) })
                .eq('id', conversation.id);
        }

        emit('done', {
            conversationId: conversation.id,
            answer,
            references: retrieval.references,
        });
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

    // ── Notes ────────────────────────────────────────────────────────

    async listNotes(notebookId: string): Promise<any[]> {
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notes')
            .select('*')
            .eq('notebook_id', notebookId)
            .order('updated_at', { ascending: false });
        assertNoSupabaseError(error, 'Failed to list notes');
        return data || [];
    }

    async createNote(
        notebookId: string,
        userId: string | undefined,
        payload: { title?: string; content?: string; origin?: 'manual' | 'chat' | 'output'; sourceOutputId?: string },
    ): Promise<any> {
        const title = payload.title?.trim() || 'Catatan';
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notes')
            .insert({
                notebook_id: notebookId,
                user_id: normalizeOptionalUuid(userId) ?? null,
                title: title.substring(0, 500),
                content: payload.content ?? '',
                origin: payload.origin ?? 'manual',
                source_output_id: normalizeOptionalUuid(payload.sourceOutputId) ?? null,
            })
            .select()
            .single();
        assertNoSupabaseError(error, 'Failed to create note');
        return data;
    }

    async updateNote(
        noteId: string,
        patch: { title?: string; content?: string },
    ): Promise<any> {
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (patch.title !== undefined) updates.title = (patch.title.trim() || 'Catatan').substring(0, 500);
        if (patch.content !== undefined) updates.content = patch.content;
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notes')
            .update(updates)
            .eq('id', noteId)
            .select()
            .single();
        assertNoSupabaseError(error, 'Failed to update note');
        return data;
    }

    async deleteNote(noteId: string): Promise<boolean> {
        const { error } = await this.supabaseService.getAdminClient()
            .from('studio_notes')
            .delete()
            .eq('id', noteId);
        assertNoSupabaseError(error, 'Failed to delete note');
        return true;
    }

    /** Turn a note into an indexed notebook source (mirrors NotebookLM's "convert to source"). */
    async convertNoteToSource(note: { id: string; notebook_id: string; title: string; content: string }): Promise<any> {
        const text = (note.content ?? '').trim();
        if (text.length < 1) throw new BadRequestException('Note is empty');
        const safeTitle = (note.title?.trim() || 'catatan').replace(/[^\w\-]+/g, '_').slice(0, 60);
        const filename = `note_${safeTitle}_${Date.now()}.txt`;
        const buffer = Buffer.from(text, 'utf8');
        return this.uploadSource(note.notebook_id, {
            buffer,
            originalname: filename,
            mimetype: 'text/plain',
            size: buffer.length,
        });
    }

    async generateStudioOutput(
        notebookId: string,
        outputType: StudioOutputType,
        query?: string,
        sourceIds?: string[],
        options?: { audioLength?: 'short' | 'default' | 'long'; language?: string },
    ): Promise<any> {
        const notebook = await this.getNotebook(notebookId);
        const langRule = this.contextService.languageRule(options?.language);
        const gen = (prompt: string) =>
            this.studioGenerateText(langRule ? `${langRule}\n\n${prompt}` : prompt);

        let result: { title: string; content: string };
        switch (outputType) {
            case 'report': {
                const content = await this.generateReport(
                    notebookId,
                    query || `Analisis lengkap ${notebook.name}`,
                    options?.language,
                );
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
                result = await this.outputService.generateAudioScript(notebookId, notebook.name, gen, sourceIds, {
                    length: options?.audioLength,
                    focus: query,
                });
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
            case 'flashcards':
                result = await this.outputService.generateFlashcards(
                    notebookId,
                    notebook.name,
                    gen,
                    sourceIds,
                );
                break;
            case 'video_overview':
                result = await this.outputService.generateVideoOverview(
                    notebookId,
                    notebook.name,
                    gen,
                    sourceIds,
                );
                break;
            case 'study_guide':
            case 'briefing_doc':
            case 'timeline':
            case 'blog_post':
                result = await this.outputService.generateReportPreset(
                    notebookId,
                    notebook.name,
                    outputType,
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
            audioLength: options?.audioLength ?? null,
        });
    }

    async generateReport(notebookId: string, query: string, language?: string): Promise<string> {
        const notebook = await this.getNotebook(notebookId);
        const qu = await this.understandUserQuery(query);
        const config = this.dbContextService.parseConfig(notebook.context_config);
        const retrieval = await this.contextService.retrieveContext(
            notebookId,
            qu.rewritten_query || query,
            qu,
            config,
        );

        const langRule = this.contextService.languageRule(language);
        const reportPrompt = [
            langRule,
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
