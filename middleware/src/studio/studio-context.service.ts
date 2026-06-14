import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { RagService } from '../rag/rag.service';
import { ClaudeAiService } from '../ai/claude-ai.service';
import { VertexAiService } from '../ai/vertex-ai.service';
import { StudioDbContextService, type StudioContextConfig } from './studio-db-context.service';
import type { QueryUnderstandingResult } from './query-understanding';

export type StudioChunkHit = {
    chunkId: string;
    sourceId: string;
    filename: string;
    content: string;
    score: number;
};

export type DocumentRetrievalStatus = 'matched' | 'no_relevant_chunks' | 'not_indexed';

export type RetrievalResult = {
    chunks: StudioChunkHit[];
    fileContext: string;
    dbContext: string;
    references: { content: string; docName: string; score: number }[];
    rawChunks: { chunkId: string; sourceId: string; filename: string; score: number }[];
    documentRetrievalStatus: DocumentRetrievalStatus;
};

@Injectable()
export class StudioContextService {
    private readonly logger = new Logger(StudioContextService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly supabaseService: SupabaseService,
        private readonly ragService: RagService,
        private readonly vertexAiService: VertexAiService,
        private readonly claudeAiService: ClaudeAiService,
        private readonly dbContextService: StudioDbContextService,
    ) { }

    private admin() {
        return this.supabaseService.getAdminClient();
    }

    private useAnthropicStudio(): boolean {
        const v = (this.configService.get<string>('STUDIO_AI_PROVIDER') || 'vertex').toLowerCase();
        return v === 'anthropic' || v === 'claude';
    }

    private generateText(prompt: string): Promise<string> {
        return this.useAnthropicStudio()
            ? this.claudeAiService.generateText(prompt)
            : this.vertexAiService.generateText(prompt);
    }

    async semanticSearchNotebook(
        notebookId: string,
        query: string,
        limit = 8,
    ): Promise<StudioChunkHit[]> {
        const embedding = await this.ragService.embedText(query);
        if (!embedding) return [];

        const { data, error } = await this.admin().rpc('match_studio_chunks', {
            query_embedding: embedding,
            p_notebook_id: notebookId,
            match_threshold: 0.42,
            match_count: limit,
        });

        if (error) {
            if (error.code === '42883' || error.message?.includes('match_studio_chunks')) {
                this.logger.warn('match_studio_chunks RPC missing — apply middleware/sql/studio_source_chunks.sql');
            } else {
                this.logger.error('match_studio_chunks failed', error);
            }
            return [];
        }

        return (data || []).map((row: any) => ({
            chunkId: row.chunk_id,
            sourceId: row.source_id,
            filename: row.filename,
            content: row.content,
            score: row.similarity,
        }));
    }

    async retrieveContext(
        notebookId: string,
        query: string,
        qu?: QueryUnderstandingResult,
        config?: StudioContextConfig,
    ): Promise<RetrievalResult> {
        const chunks = await this.semanticSearchNotebook(notebookId, query);

        let documentRetrievalStatus: DocumentRetrievalStatus = 'matched';
        if (chunks.length === 0) {
            const { count, error } = await this.admin()
                .from('studio_source_chunks')
                .select('id', { count: 'exact', head: true })
                .eq('notebook_id', notebookId);
            if (error) {
                this.logger.warn(`chunk count check failed for notebook ${notebookId}: ${error.message}`);
                documentRetrievalStatus = 'not_indexed';
            } else {
                documentRetrievalStatus = (count ?? 0) > 0 ? 'no_relevant_chunks' : 'not_indexed';
            }
            if (documentRetrievalStatus === 'no_relevant_chunks') {
                this.logger.debug(
                    `Vector search returned no chunks above threshold for notebook ${notebookId}`,
                );
            }
        }

        const fileContext = chunks
            .map((c, i) => `[Sumber ${i + 1}: ${c.filename} (relevansi ${(c.score * 100).toFixed(0)}%)]\n${c.content}`)
            .join('\n\n---\n\n');

        let dbContext = '';
        if (qu && config) {
            const supa = await this.dbContextService.fetchSupabaseContext(config, qu);
            const drem = await this.dbContextService.fetchDremioContext(config, qu);
            dbContext = [supa, drem].filter(Boolean).join('\n\n');
        }

        const references = chunks.map((c) => ({
            content: c.content.slice(0, 500),
            docName: c.filename,
            score: c.score,
        }));

        const rawChunks = chunks.map((c) => ({
            chunkId: c.chunkId,
            sourceId: c.sourceId,
            filename: c.filename,
            score: c.score,
        }));

        return { chunks, fileContext, dbContext, references, rawChunks, documentRetrievalStatus };
    }

    private fileContextRule(
        status: DocumentRetrievalStatus,
        hasDb: boolean,
    ): string {
        switch (status) {
            case 'matched':
                return 'Jawab pertanyaan HANYA berdasarkan cuplikan dokumen sumber di bawah. Jika tidak ada di sumber, katakan dengan jujur.';
            case 'no_relevant_chunks':
                return hasDb
                    ? 'Tidak ditemukan cuplikan dokumen yang relevan untuk pertanyaan ini. Jawab dari data database operasional jika tersedia; jangan mengarang dari dokumen.'
                    : 'Tidak ditemukan cuplikan dokumen yang relevan untuk pertanyaan ini. Katakan dengan jujur bahwa informasi tidak ada di sumber notebook; jangan mengarang.';
            case 'not_indexed':
                return hasDb
                    ? 'Belum ada dokumen terindeks di notebook ini. Gunakan data database operasional untuk pertanyaan status/order/analitik jika tersedia.'
                    : 'Belum ada dokumen terindeks di notebook ini. Minta pengguna menunggu indexing selesai atau menambahkan sumber; jangan mengarang jawaban faktual.';
        }
    }

    async generateGroundedAnswer(params: {
        notebookName: string;
        audience: 'admin' | 'customer';
        question: string;
        instruction?: string;
        conversationLines: string[];
        retrieval: RetrievalResult;
    }): Promise<string> {
        const { notebookName, audience, question, instruction, conversationLines, retrieval } = params;
        const hasFile = retrieval.fileContext.length > 0;
        const hasDb = retrieval.dbContext.length > 0;
        const docStatus =
            retrieval.documentRetrievalStatus ?? (hasFile ? 'matched' : 'not_indexed');

        const roleLine =
            audience === 'customer'
                ? 'Anda adalah asisten layanan pelanggan yang ramah dan profesional.'
                : 'Anda adalah asisten admin internal yang tepat dan faktual.';

        const rules = [
            roleLine,
            `Basis pengetahuan notebook: "${notebookName}".`,
            this.fileContextRule(docStatus, hasDb),
            hasDb
                ? 'Gunakan juga data database operasional di bawah untuk pertanyaan status/order/analitik.'
                : '',
            'Gunakan markdown. Kutip nama file bila relevan.',
        ].filter(Boolean);

        const prompt = [
            rules.join('\n'),
            instruction ? `\nInstruksi tambahan:\n${instruction}` : '',
            '',
            retrieval.fileContext ? `## Dokumen sumber\n${retrieval.fileContext}` : '',
            retrieval.dbContext ? `## Data database\n${retrieval.dbContext}` : '',
            '',
            '## Percakapan terbaru',
            conversationLines.length ? conversationLines.join('\n') : '(belum ada)',
            '',
            `## Pertanyaan pengguna\n${question}`,
            '',
            '## Jawaban',
        ].join('\n');

        const answer = await this.generateText(prompt);
        return answer || 'Maaf, saya tidak dapat menghasilkan jawaban saat ini.';
    }
}
