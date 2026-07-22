import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { SupabaseService } from '../supabase/supabase.service';
import { RagService } from '../rag/rag.service';
import { chunkText } from './studio-chunk.util';
import { resolveSourceStorage } from './studio-source-storage.util';
import { assertNoSupabaseError } from './studio-supabase.util';
import { isWeakExtractedText } from './studio-weak-text.util';

type IngestStage = 'queued' | 'extracting' | 'chunking' | 'embedding' | 'done' | 'error';

@Injectable()
export class StudioIngestionService {
    private readonly logger = new Logger(StudioIngestionService.name);
    private minioClient: Minio.Client;
    private readonly bucket: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly supabaseService: SupabaseService,
        private readonly ragService: RagService,
    ) {
        const endpointUrl = this.configService.get('S3_ENDPOINT') || 'http://minio:9000';
        let endPoint = 'minio';
        let port = 9000;
        let useSSL = false;
        try {
            const url = new URL(endpointUrl);
            endPoint = url.hostname;
            port = parseInt(url.port || '9000', 10);
            useSSL = url.protocol === 'https:';
        } catch { /* defaults */ }

        this.minioClient = new Minio.Client({
            endPoint,
            port,
            useSSL,
            accessKey: this.configService.get('S3_ACCESS_KEY') || 'minioadmin',
            secretKey: this.configService.get('S3_SECRET_KEY') || 'minioadmin',
        });
        this.bucket = this.configService.get('S3_BUCKET') || 'cms-media';
    }

    private admin() {
        return this.supabaseService.getAdminClient();
    }

    private async patchSource(
        sourceId: string,
        patch: {
            parse_status?: string;
            parse_stage?: IngestStage;
            parse_progress?: number;
            parse_error?: string | null;
            embed_total?: number;
            embed_done?: number;
            chunk_count?: number;
        },
    ) {
        await this.admin()
            .from('studio_notebook_sources')
            .update({ ...patch, updated_at: new Date() })
            .eq('id', sourceId);
    }

    /** Parse, chunk, and embed a notebook source (async-safe; logs errors on source row). */
    async ingestSource(sourceId: string): Promise<void> {
        const { data: source, error } = await this.admin()
            .from('studio_notebook_sources')
            .select('*')
            .eq('id', sourceId)
            .single();

        if (error || !source) {
            this.logger.error(`ingestSource: source ${sourceId} not found`);
            return;
        }

        await this.patchSource(sourceId, {
            parse_status: 'parsing',
            parse_stage: 'extracting',
            parse_progress: 0.05,
            parse_error: null,
            embed_total: 0,
            embed_done: 0,
            chunk_count: 0,
        });

        try {
            await this.admin().from('studio_source_chunks').delete().eq('source_id', sourceId);

            let text = '';

            if (source.media_id) {
                const desc = await this.ragService.describeMedia(source.media_id);
                if (desc?.trim()) {
                    text = desc;
                }
            }

            if (!text.trim()) {
                let mediaRecord: { s3_key?: string; filename?: string; bucket_name?: string } | null = null;
                if (source.media_id) {
                    const { data: media } = await this.admin()
                        .from('media')
                        .select('s3_key, filename, bucket_name')
                        .eq('id', source.media_id)
                        .maybeSingle();
                    mediaRecord = media;
                }

                const storage = resolveSourceStorage(source, mediaRecord, this.bucket);
                if (!storage) {
                    throw new Error('Could not resolve file storage for source');
                }

                const buffer = await this.getFileBuffer(storage.fileKey, storage.bucket);
                if (!buffer) {
                    throw new Error(
                        `Could not read file from storage (${storage.bucket}/${storage.fileKey})`,
                    );
                }
                text = await this.ragService.extractDocumentText(
                    buffer,
                    source.file_type || 'application/octet-stream',
                    source.filename,
                );
            }

            if (!text.trim()) {
                throw new Error('No extractable text from source');
            }

            if (isWeakExtractedText(text, source.filename)) {
                throw new Error(
                    'Ekstraksi teks gagal (hanya placeholder). Untuk PPTX/PDF pastikan GOOGLE_API_KEY aktif, lalu Reindex.',
                );
            }

            await this.patchSource(sourceId, {
                parse_stage: 'chunking',
                parse_progress: 0.15,
            });

            const chunks = chunkText(text);
            /* v8 ignore next 3 -- text is already validated non-weak (>=40 chars), so chunkText always yields >=1 segment */
            if (chunks.length === 0) {
                throw new Error('Chunking produced no segments');
            }

            await this.patchSource(sourceId, {
                parse_stage: 'embedding',
                parse_progress: 0.2,
                embed_total: chunks.length,
                embed_done: 0,
            });

            let embedded = 0;
            for (let i = 0; i < chunks.length; i++) {
                const piece = chunks[i];
                const header = `[${source.filename} — bagian ${i + 1}/${chunks.length}]\n`;
                const chunkContent = header + piece;
                const embedding = await this.ragService.embedText(chunkContent);
                if (!embedding) {
                    this.logger.warn(`No embedding for chunk ${i} of source ${sourceId}`);
                    continue;
                }

                const { error: insErr } = await this.admin().from('studio_source_chunks').insert({
                    notebook_id: source.notebook_id,
                    source_id: sourceId,
                    chunk_index: i,
                    content: chunkContent,
                    embedding,
                });
                if (insErr) assertNoSupabaseError(insErr, 'Failed to insert source chunk');
                embedded++;
                await this.patchSource(sourceId, {
                    parse_stage: 'embedding',
                    embed_done: embedded,
                    parse_progress: Math.min(0.95, 0.2 + (0.75 * (i + 1)) / chunks.length),
                });
            }

            if (embedded === 0) {
                throw new Error(
                    'Vektorisasi gagal: tidak ada chunk ter-embed (set GOOGLE_CLOUD_PROJECT atau GOOGLE_API_KEY + EMBEDDING_PROVIDER=google_ai)',
                );
            }

            await this.patchSource(sourceId, {
                parse_status: 'done',
                parse_stage: 'done',
                parse_progress: 1,
                chunk_count: embedded,
                embed_done: embedded,
                parse_error: null,
            });

            this.logger.log(`Ingested source ${sourceId}: ${embedded} chunks`);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.error(`ingestSource failed for ${sourceId}: ${msg}`);
            await this.patchSource(sourceId, {
                parse_status: 'error',
                parse_stage: 'error',
                parse_progress: 0,
                parse_error: msg.slice(0, 2000),
            });
        }
    }

    async reindexNotebook(notebookId: string): Promise<void> {
        const { data: sources } = await this.admin()
            .from('studio_notebook_sources')
            .select('id')
            .eq('notebook_id', notebookId);
        for (const s of sources || []) {
            await this.ingestSource(s.id);
        }
    }

    private getFileBuffer(fileKey: string, bucketName?: string): Promise<Buffer | null> {
        /* v8 ignore next -- resolveSourceStorage always returns a non-empty bucket, so `|| this.bucket` is defensive */
        const bucket = bucketName || this.bucket;
        return new Promise((resolve) => {
            (this.minioClient as any).getObject(bucket, fileKey, (err: any, stream: any) => {
                if (err) {
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
