import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { SupabaseService } from '../supabase/supabase.service';
import { RagService } from '../rag/rag.service';
import { chunkText } from './studio-chunk.util';

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

        await this.admin()
            .from('studio_notebook_sources')
            .update({ parse_status: 'parsing', parse_progress: 0.1, updated_at: new Date() })
            .eq('id', sourceId);

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
                const buffer = await this.getFileBuffer(source.s3_key, this.bucket);
                if (!buffer) {
                    throw new Error('Could not read file from storage');
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

            const chunks = chunkText(text);
            if (chunks.length === 0) {
                throw new Error('Chunking produced no segments');
            }

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
                if (insErr) throw insErr;
                embedded++;
                await this.admin()
                    .from('studio_notebook_sources')
                    .update({
                        parse_progress: Math.min(0.95, 0.2 + (0.75 * (i + 1)) / chunks.length),
                        updated_at: new Date(),
                    })
                    .eq('id', sourceId);
            }

            if (embedded === 0) {
                throw new Error('Failed to embed any chunks (check GOOGLE_CLOUD_PROJECT)');
            }

            await this.admin()
                .from('studio_notebook_sources')
                .update({
                    parse_status: 'done',
                    parse_progress: 1,
                    chunk_count: embedded,
                    updated_at: new Date(),
                })
                .eq('id', sourceId);

            this.logger.log(`Ingested source ${sourceId}: ${embedded} chunks`);
        } catch (e: any) {
            this.logger.error(`ingestSource failed for ${sourceId}: ${e?.message ?? e}`);
            await this.admin()
                .from('studio_notebook_sources')
                .update({
                    parse_status: 'error',
                    parse_progress: 0,
                    updated_at: new Date(),
                })
                .eq('id', sourceId);
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
