import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RagService } from '../rag/rag.service';
import { AiRouterService } from '../ai/ai-router.service';
import { StudioDbContextService, type StudioContextConfig } from './studio-db-context.service';
import type { QueryUnderstandingResult } from './query-understanding';
import { filterChunksBySourceIds, isEmptySourceSelection } from './studio-source-filter.util';

export type StudioChunkHit = {
    chunkId: string;
    sourceId: string;
    filename: string;
    content: string;
    score: number;
};

export type DocumentRetrievalStatus =
    | 'matched'
    | 'no_relevant_chunks'
    | 'not_indexed'
    | 'no_sources_selected';

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
        private readonly supabaseService: SupabaseService,
        private readonly ragService: RagService,
        private readonly aiRouter: AiRouterService,
        private readonly dbContextService: StudioDbContextService,
    ) { }

    private admin() {
        return this.supabaseService.getAdminClient();
    }

    private generateText(prompt: string): Promise<string> {
        return this.aiRouter.generateText(prompt);
    }

    private generateTextStream(prompt: string, onDelta: (text: string) => void): Promise<string> {
        return this.aiRouter.generateTextStream(prompt, onDelta);
    }

    async semanticSearchNotebook(
        notebookId: string,
        query: string,
        limit = 8,
        sourceIds?: string[],
    ): Promise<StudioChunkHit[]> {
        // Explicit empty selection = no retrieval (NotebookLM: unchecked sources).
        if (isEmptySourceSelection(sourceIds)) return [];

        const embedding = await this.ragService.embedText(query);
        if (!embedding) return [];

        const filterBySources = (hits: StudioChunkHit[]) =>
            filterChunksBySourceIds(hits, sourceIds);

        const mapRows = (data: unknown[]) =>
            data.map((row: any) => ({
                chunkId: row.chunk_id,
                sourceId: row.source_id,
                filename: row.filename,
                content: row.content,
                score: row.similarity,
            }));

        const search = async (threshold: number) => {
            const rpcArgs: Record<string, unknown> = {
                query_embedding: embedding,
                p_notebook_id: notebookId,
                match_threshold: threshold,
                match_count: sourceIds?.length ? Math.max(limit, 24) : limit,
            };
            if (sourceIds?.length) {
                rpcArgs.p_source_ids = sourceIds;
            }

            const { data, error } = await this.admin().rpc('match_studio_chunks', rpcArgs);
            if (error) {
                // Older DBs without p_source_ids: retry without it, then post-filter.
                const missingParam =
                    error.message?.includes('p_source_ids') ||
                    error.code === 'PGRST202' ||
                    error.code === '42883';
                if (missingParam && sourceIds?.length) {
                    const retry = await this.admin().rpc('match_studio_chunks', {
                        query_embedding: embedding,
                        p_notebook_id: notebookId,
                        match_threshold: threshold,
                        match_count: Math.max(limit, 24),
                    });
                    if (retry.error) {
                        this.logger.error('match_studio_chunks failed', retry.error);
                        return [] as StudioChunkHit[];
                    }
                    return filterBySources(mapRows(retry.data || [])).slice(0, limit);
                }
                if (error.code === '42883' || error.message?.includes('match_studio_chunks')) {
                    this.logger.warn('match_studio_chunks RPC missing — apply middleware/sql/studio_source_chunks.sql');
                } else {
                    this.logger.error('match_studio_chunks failed', error);
                }
                return [] as StudioChunkHit[];
            }
            return filterBySources(mapRows(data || [])).slice(0, limit);
        };

        let chunks = await search(0.42);
        if (chunks.length === 0) {
            let countQuery = this.admin()
                .from('studio_source_chunks')
                .select('id', { count: 'exact', head: true })
                .eq('notebook_id', notebookId);
            if (sourceIds?.length) {
                countQuery = countQuery.in('source_id', sourceIds);
            }
            const { count } = await countQuery;
            const total = count ?? 0;
            if (total > 0 && total <= Math.max(limit, 12)) {
                chunks = await search(0);
                if (chunks.length > 0) {
                    this.logger.debug(
                        `Semantic search fallback (threshold 0) for notebook ${notebookId}: ${chunks.length} chunk(s)`,
                    );
                }
            }
        }

        return chunks;
    }

    async retrieveContext(
        notebookId: string,
        query: string,
        qu?: QueryUnderstandingResult,
        config?: StudioContextConfig,
        options?: { sourceIds?: string[] },
    ): Promise<RetrievalResult> {
        if (isEmptySourceSelection(options?.sourceIds)) {
            return {
                chunks: [],
                fileContext: '',
                dbContext: '',
                references: [],
                rawChunks: [],
                documentRetrievalStatus: 'no_sources_selected',
            };
        }

        const chunks = await this.semanticSearchNotebook(
            notebookId,
            query,
            8,
            options?.sourceIds,
        );

        let documentRetrievalStatus: DocumentRetrievalStatus = 'matched';
        if (chunks.length === 0) {
            let countQuery = this.admin()
                .from('studio_source_chunks')
                .select('id', { count: 'exact', head: true })
                .eq('notebook_id', notebookId);
            if (options?.sourceIds?.length) {
                countQuery = countQuery.in('source_id', options.sourceIds);
            }
            const { count, error } = await countQuery;
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
            chunkId: c.chunkId,
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
            case 'no_sources_selected':
                return hasDb
                    ? 'Pengguna tidak mencentang sumber dokumen. Jawab dari data database operasional jika tersedia; jangan mengarang dari dokumen yang tidak dipilih.'
                    : 'Pengguna tidak mencentang sumber di panel Sources. Minta mereka mencentang minimal satu sumber sebelum bertanya tentang isi dokumen; jangan mengarang.';
            case 'not_indexed':
                return hasDb
                    ? 'Belum ada dokumen terindeks di notebook ini. Gunakan data database operasional untuk pertanyaan status/order/analitik jika tersedia.'
                    : 'Belum ada dokumen terindeks di notebook ini. Minta pengguna menunggu indexing selesai atau menambahkan sumber; jangan mengarang jawaban faktual.';
        }
    }

    /** Instruction line for the requested answer language (empty = follow the question). */
    languageRule(language?: string): string {
        switch ((language || '').toLowerCase()) {
            case 'id':
                return 'Jawab dalam Bahasa Indonesia.';
            case 'en':
                return 'Answer in English.';
            case 'jv':
                return 'Wangsulana nganggo Basa Jawa.';
            case 'ms':
                return 'Jawab dalam Bahasa Melayu.';
            case 'ar':
                return 'أجب باللغة العربية.';
            case 'zh':
                return '用中文回答。';
            default:
                return '';
        }
    }

    private buildGroundedPrompt(params: {
        notebookName: string;
        audience: 'admin' | 'customer';
        question: string;
        instruction?: string;
        chatInstruction?: string;
        conversationLines: string[];
        retrieval: RetrievalResult;
        language?: string;
    }): string {
        const { notebookName, audience, question, instruction, chatInstruction, conversationLines, retrieval, language } =
            params;
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
            chatInstruction?.trim() ? `Instruksi notebook: ${chatInstruction.trim()}` : '',
            this.fileContextRule(docStatus, hasDb),
            hasDb
                ? 'Gunakan juga data database operasional di bawah untuk pertanyaan status/order/analitik.'
                : '',
            hasFile
                ? 'Bila memakai informasi dari sumber, sertakan sitasi inline dalam format [n] sesuai nomor [Sumber n].'
                : '',
            this.languageRule(language),
            'Gunakan markdown. Kutip nama file bila relevan.',
        ].filter(Boolean);

        return [
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
    }

    async generateGroundedAnswer(params: {
        notebookName: string;
        audience: 'admin' | 'customer';
        question: string;
        instruction?: string;
        chatInstruction?: string;
        conversationLines: string[];
        retrieval: RetrievalResult;
        language?: string;
    }): Promise<string> {
        const answer = await this.generateText(this.buildGroundedPrompt(params));
        return answer || 'Maaf, saya tidak dapat menghasilkan jawaban saat ini.';
    }

    /**
     * Streaming variant of {@link generateGroundedAnswer}. Emits answer fragments
     * via `onDelta` as they are produced and resolves with the full answer.
     */
    async generateGroundedAnswerStream(
        params: {
            notebookName: string;
            audience: 'admin' | 'customer';
            question: string;
            instruction?: string;
            chatInstruction?: string;
            conversationLines: string[];
            retrieval: RetrievalResult;
            language?: string;
        },
        onDelta: (text: string) => void,
    ): Promise<string> {
        const answer = await this.generateTextStream(this.buildGroundedPrompt(params), onDelta);
        return answer || 'Maaf, saya tidak dapat menghasilkan jawaban saat ini.';
    }

    async getChunkById(chunkId: string): Promise<{
        id: string;
        content: string;
        chunk_index: number;
        source_id: string;
        filename: string;
        notebook_id: string;
    } | null> {
        const { data: chunk, error } = await this.admin()
            .from('studio_source_chunks')
            .select('id, content, chunk_index, source_id, notebook_id')
            .eq('id', chunkId)
            .single();
        if (error || !chunk) return null;

        const { data: source } = await this.admin()
            .from('studio_notebook_sources')
            .select('filename')
            .eq('id', chunk.source_id)
            .single();

        return {
            id: chunk.id,
            content: chunk.content,
            chunk_index: chunk.chunk_index,
            source_id: chunk.source_id,
            filename: source?.filename ?? 'Dokumen',
            notebook_id: chunk.notebook_id,
        };
    }

    /**
     * Source detail for the Sources panel (NotebookLM-style browse).
     * Returns source metadata + ordered chunk previews (content truncated).
     */
    async getSourceDetail(
        notebookId: string,
        sourceId: string,
        options?: { limit?: number; offset?: number },
    ): Promise<{
        source: Record<string, unknown>;
        chunks: { id: string; chunk_index: number; content: string }[];
        totalChunks: number;
    } | null> {
        const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
        const offset = Math.max(options?.offset ?? 0, 0);

        const { data: source, error } = await this.admin()
            .from('studio_notebook_sources')
            .select('*')
            .eq('id', sourceId)
            .eq('notebook_id', notebookId)
            .single();
        if (error || !source) return null;

        const { count } = await this.admin()
            .from('studio_source_chunks')
            .select('id', { count: 'exact', head: true })
            .eq('source_id', sourceId)
            .eq('notebook_id', notebookId);

        const { data: rows } = await this.admin()
            .from('studio_source_chunks')
            .select('id, chunk_index, content')
            .eq('source_id', sourceId)
            .eq('notebook_id', notebookId)
            .order('chunk_index', { ascending: true })
            .range(offset, offset + limit - 1);

        const chunks = (rows ?? []).map((r: any) => ({
            id: r.id as string,
            chunk_index: r.chunk_index as number,
            content: String(r.content ?? '').slice(0, 800),
        }));

        return {
            source,
            chunks,
            totalChunks: count ?? chunks.length,
        };
    }
}
