import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { SupabaseService } from '../supabase/supabase.service';
import { RagflowService } from './ragflow.service';

/**
 * Studio AI business logic — orchestrates notebooks, sources, and conversations.
 * Bridges Supabase (metadata), MinIO (storage), and RAGFlow (RAG pipeline).
 */
@Injectable()
export class StudioService {
    private readonly logger = new Logger(StudioService.name);
    private minioClient: Minio.Client;
    private readonly bucket: string;

    constructor(
        private configService: ConfigService,
        private supabaseService: SupabaseService,
        private ragflowService: RagflowService,
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

    // ── Notebooks ────────────────────────────────────────────────────

    async createNotebook(name: string, description: string, userId: string): Promise<any> {
        // 1. Create RAGFlow dataset
        const dataset = await this.ragflowService.createDataset(name, description);

        // 2. Save to Supabase (chat assistant will be created lazily when first chat is initiated,
        //    because RAGFlow requires at least one parsed document in the dataset)
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notebooks')
            .insert({
                name,
                description,
                user_id: userId,
                ragflow_dataset_id: dataset.id,
                ragflow_chat_id: null,
            })
            .select()
            .single();

        if (error) throw error;
        this.logger.log(`Created notebook "${name}" → dataset=${dataset.id} (chat assistant deferred)`);
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
        const notebook = await this.getNotebook(notebookId);

        // Delete RAGFlow dataset
        if (notebook.ragflow_dataset_id) {
            try {
                await this.ragflowService.deleteDataset(notebook.ragflow_dataset_id);
            } catch (e) {
                this.logger.warn(`Failed to delete RAGFlow dataset: ${e.message}`);
            }
        }

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

        // 2. Upload to RAGFlow dataset
        const ragflowDocs = await this.ragflowService.uploadDocument(
            notebook.ragflow_dataset_id,
            file.buffer,
            file.originalname,
        );
        const ragflowDocId = ragflowDocs?.[0]?.id;

        // 3. Save source record
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notebook_sources')
            .insert({
                notebook_id: notebookId,
                ragflow_doc_id: ragflowDocId,
                filename: file.originalname,
                file_type: file.mimetype,
                file_size: file.size,
                s3_key: s3Key,
                parse_status: 'pending',
            })
            .select()
            .single();

        if (error) throw error;

        // 4. Trigger parsing
        if (ragflowDocId) {
            await this.ragflowService.parseDocuments(notebook.ragflow_dataset_id, [ragflowDocId]);
            await this.supabaseService.getAdminClient()
                .from('studio_notebook_sources')
                .update({ parse_status: 'parsing' })
                .eq('id', data.id);
        }

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

        // 3. Upload to RAGFlow dataset
        const ragflowDocs = await this.ragflowService.uploadDocument(
            notebook.ragflow_dataset_id,
            buffer,
            mediaRecord.filename,
        );
        const ragflowDocId = ragflowDocs?.[0]?.id;

        // 4. Save source linked to media
        const { data, error } = await this.supabaseService.getAdminClient()
            .from('studio_notebook_sources')
            .insert({
                notebook_id: notebookId,
                media_id: mediaId,
                ragflow_doc_id: ragflowDocId,
                filename: mediaRecord.filename,
                file_type: mediaRecord.mime_type,
                file_size: mediaRecord.size || 0,
                s3_key: fileKey,
                parse_status: 'pending',
            })
            .select()
            .single();

        if (error) throw error;

        // 5. Trigger parsing
        if (ragflowDocId) {
            await this.ragflowService.parseDocuments(notebook.ragflow_dataset_id, [ragflowDocId]);
            await this.supabaseService.getAdminClient()
                .from('studio_notebook_sources')
                .update({ parse_status: 'parsing' })
                .eq('id', data.id);
        }

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
        const sources = notebook.studio_notebook_sources || [];

        // Check RAGFlow parse status for each
        for (const source of sources) {
            if (source.parse_status === 'parsing' && source.ragflow_doc_id) {
                try {
                    const doc = await this.ragflowService.getDocumentParseStatus(
                        notebook.ragflow_dataset_id,
                        source.ragflow_doc_id,
                    );
                    if (doc) {
                        const newStatus = doc.progress_msg?.includes('Done') ? 'done' :
                            doc.progress_msg?.includes('Error') ? 'error' : 'parsing';
                        const progress = doc.progress || 0;
                        const chunkCount = doc.chunk_count || 0;

                        if (newStatus !== source.parse_status || progress !== source.parse_progress) {
                            await this.supabaseService.getAdminClient()
                                .from('studio_notebook_sources')
                                .update({
                                    parse_status: newStatus,
                                    parse_progress: progress,
                                    chunk_count: chunkCount,
                                    updated_at: new Date(),
                                })
                                .eq('id', source.id);
                            source.parse_status = newStatus;
                            source.parse_progress = progress;
                            source.chunk_count = chunkCount;
                        }
                    }
                } catch (e) {
                    this.logger.warn(`Failed to check parse status: ${e.message}`);
                }
            }
        }

        return sources;
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

    async chat(notebookId: string, question: string, conversationId?: string, userId?: string): Promise<any> {
        const notebook = await this.getNotebook(notebookId);

        // Lazily create the RAGFlow chat assistant if it doesn't exist yet.
        // RAGFlow requires the dataset to have parsed documents before creating an assistant.
        if (!notebook.ragflow_chat_id) {
            this.logger.log(`Creating RAGFlow chat assistant for notebook ${notebookId}...`);
            try {
                const assistant = await this.ragflowService.createChatAssistant(
                    notebook.name,
                    [notebook.ragflow_dataset_id],
                );
                await this.supabaseService.getAdminClient()
                    .from('studio_notebooks')
                    .update({ ragflow_chat_id: assistant.id })
                    .eq('id', notebookId);
                notebook.ragflow_chat_id = assistant.id;
                this.logger.log(`Created RAGFlow chat assistant: ${assistant.id}`);
            } catch (e) {
                this.logger.error(`Failed to create chat assistant: ${e.message}`);
                throw new Error('Cannot start chat yet — ensure at least one source has been parsed successfully.');
            }
        }

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
            // Create new RAGFlow session
            const session = await this.ragflowService.createChatSession(
                notebook.ragflow_chat_id,
                `Chat ${new Date().toLocaleString()}`,
            );

            const { data, error } = await this.supabaseService.getAdminClient()
                .from('studio_conversations')
                .insert({
                    notebook_id: notebookId,
                    user_id: userId,
                    ragflow_session_id: session.id,
                    title: question.substring(0, 100),
                })
                .select()
                .single();

            if (error) throw error;
            conversation = data;
        }

        // Save user message
        await this.supabaseService.getAdminClient()
            .from('studio_messages')
            .insert({
                conversation_id: conversation.id,
                role: 'user',
                content: question,
            });

        // Call RAGFlow chat
        const result = await this.ragflowService.chat(
            notebook.ragflow_chat_id,
            question,
            conversation.ragflow_session_id,
        );

        const answer = result?.answer || 'Sorry, I could not generate a response.';
        const sourceRefs = result?.reference?.chunks || [];

        // Save assistant message
        await this.supabaseService.getAdminClient()
            .from('studio_messages')
            .insert({
                conversation_id: conversation.id,
                role: 'assistant',
                content: answer,
                source_refs: sourceRefs,
            });

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
            references: sourceRefs.map((ref: any) => ({
                content: ref.content_with_weight || ref.content,
                docName: ref.doc_name || ref.document_name,
                score: ref.similarity || ref.score,
            })),
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

        // Lazily create the RAGFlow chat assistant if it doesn't exist yet
        if (!notebook.ragflow_chat_id) {
            this.logger.log(`Creating RAGFlow chat assistant for report generation...`);
            try {
                const assistant = await this.ragflowService.createChatAssistant(
                    notebook.name,
                    [notebook.ragflow_dataset_id],
                );
                await this.supabaseService.getAdminClient()
                    .from('studio_notebooks')
                    .update({ ragflow_chat_id: assistant.id })
                    .eq('id', notebookId);
                notebook.ragflow_chat_id = assistant.id;
                this.logger.log(`Created RAGFlow chat assistant: ${assistant.id}`);
            } catch (e) {
                this.logger.error(`Failed to create chat assistant: ${e.message}`);
                return 'Cannot generate report — ensure at least one source has been parsed successfully.';
            }
        }

        // Retrieve relevant chunks from RAGFlow
        const chunks = await this.ragflowService.retrieve(
            [notebook.ragflow_dataset_id],
            query,
            10,
        );

        if (chunks.length === 0) {
            return 'No relevant information found in the notebook sources.';
        }

        // Use RAGFlow chat with a report-oriented prompt
        const reportPrompt = `Based on the following knowledge base, write a comprehensive executive report about: "${query}".

Include:
- Executive Summary
- Key Findings
- Detailed Analysis
- Recommendations
- Conclusion

Use markdown formatting. Cite sources where applicable.`;

        // Step 1: Create a new chat session (returns prologue greeting)
        const sessionResult = await this.ragflowService.chat(
            notebook.ragflow_chat_id,
            '',
        );
        const sessionId = sessionResult?.session_id;

        if (!sessionId) {
            this.logger.error('Failed to create chat session for report generation');
            return 'Failed to initialize report generation session.';
        }

        // Step 2: Send actual report prompt with the session_id
        const result = await this.ragflowService.chat(
            notebook.ragflow_chat_id,
            reportPrompt,
            sessionId,
        );

        return result?.answer || 'Failed to generate report.';
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
}
