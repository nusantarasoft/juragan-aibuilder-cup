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
    references: { content: string; docName: string; score: number; chunkId?: string }[];
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

        // Floor tuned so weak local embeddings (e.g. Ollama nomic) do not treat
        // off-topic Indonesian questions as matches (~0.48–0.52) while in-domain
        // hits typically stay ≥0.65.
        let chunks = await search(0.58);
        if (chunks.length === 0) {
            chunks = await search(0.55);
            if (chunks.length > 0) {
                this.logger.debug(
                    `Semantic search soft-fallback (threshold 0.55) for notebook ${notebookId}: ${chunks.length} chunk(s)`,
                );
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

    private resolveDocumentStatus(retrieval: RetrievalResult): DocumentRetrievalStatus {
        const hasFile = retrieval.fileContext.length > 0;
        return retrieval.documentRetrievalStatus ?? (hasFile ? 'matched' : 'not_indexed');
    }

    /**
     * Deterministic NotebookLM-style replies when there is nothing to ground on
     * (avoids LLM hallucination for empty selection / no match / not indexed).
     * Returns null when the LLM should still run (matched sources, or DB context available).
     */
    private cannedGroundedAnswer(
        retrieval: RetrievalResult,
        language?: string,
    ): string | null {
        const hasFile = retrieval.fileContext.length > 0;
        const hasDb = retrieval.dbContext.length > 0;
        if (hasFile || hasDb) return null;

        const status = this.resolveDocumentStatus(retrieval);
        const en = (language || '').toLowerCase() === 'en';

        switch (status) {
            case 'no_sources_selected':
                return en
                    ? 'Select at least one source in the Sources panel before asking about document content. I only answer from the sources you select.'
                    : 'Centang minimal satu sumber di panel Sources sebelum bertanya tentang isi dokumen. Saya hanya menjawab berdasarkan sumber yang dipilih.';
            case 'no_relevant_chunks':
                return en
                    ? 'I could not find relevant passages in the selected sources for this question. Try rephrasing, or pick different sources.'
                    : 'Saya tidak menemukan cuplikan yang relevan di sumber yang dipilih untuk pertanyaan ini. Coba ubah pertanyaan, atau pilih sumber lain.';
            case 'not_indexed':
                return en
                    ? 'Sources in this notebook are not ready yet (still indexing). Wait for indexing to finish or use Reindex, then ask again.'
                    : 'Sumber di notebook ini belum siap (masih mengindeks). Tunggu indexing selesai atau gunakan Reindex, lalu tanya lagi.';
            default:
                return null;
        }
    }

    private fileContextRule(
        status: DocumentRetrievalStatus,
        hasDb: boolean,
    ): string {
        switch (status) {
            case 'matched':
                return [
                    'Jawab HANYA dari cuplikan dokumen sumber di bawah.',
                    'Jika fakta tidak ada di cuplikan, katakan dengan jelas bahwa itu tidak ditemukan di sumber — jangan mengarang dan jangan mengisi dari pengetahuan umum.',
                    'Jika pertanyaan di luar topik cuplikan: TOLAK singkat (1–2 kalimat), jangan merangkum isi sumber, dan tawarkan bertanya tentang topik yang ada di sumber.',
                ].join(' ');
            case 'no_relevant_chunks':
                return hasDb
                    ? 'Tidak ada cuplikan dokumen yang relevan. Jawab HANYA dari data database operasional di bawah bila cocok; jangan mengarang dari dokumen atau pengetahuan umum.'
                    : 'Tidak ada cuplikan dokumen yang relevan. Katakan jujur bahwa informasi tidak ada di sumber; jangan mengarang.';
            case 'no_sources_selected':
                return hasDb
                    ? 'Tidak ada sumber dokumen yang dicentang. Jawab HANYA dari data database operasional bila cocok; jangan mengarang isi dokumen.'
                    : 'Tidak ada sumber yang dicentang di panel Sources. Minta pengguna mencentang minimal satu sumber; jangan mengarang.';
            case 'not_indexed':
                return hasDb
                    ? 'Belum ada dokumen terindeks. Gunakan data database operasional untuk pertanyaan status/order/analitik jika tersedia; jangan mengarang fakta dokumen.'
                    : 'Belum ada dokumen terindeks. Minta menunggu indexing atau Reindex; jangan mengarang jawaban faktual.';
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
        const docStatus = this.resolveDocumentStatus(retrieval);

        const roleLine =
            audience === 'customer'
                ? 'Anda adalah asisten riset notebook (gaya NotebookLM) untuk pelanggan: ramah, ringkas, dan hanya mengandalkan sumber yang diberikan.'
                : 'Anda adalah asisten riset notebook (gaya NotebookLM) untuk admin: tepat, ringkas, dan hanya mengandalkan sumber yang diberikan.';

        const styleRules = [
            'Gaya jawaban: langsung ke inti, paragraf pendek atau bullet; jangan pembuka basah ("Baik, saya akan menjawab…").',
            'Susun jawaban seperti NotebookLM: ringkas → poin kunci → detail singkat bila perlu.',
            hasFile
                ? 'Setiap klaim faktual dari dokumen wajib ada sitasi inline [n] yang cocok dengan nomor [Sumber n]. Contoh: …pencatatan kas [1].'
                : '',
            hasFile ? 'Boleh menyebut nama file sekali di awal bila membantu, lalu andalkan [n].' : '',
            'Jangan mengarang angka, nama, atau fakta yang tidak ada di cuplikan/data.',
            'Gunakan markdown sederhana (heading/bullet) bila memperjelas.',
        ].filter(Boolean);

        const rules = [
            roleLine,
            `Notebook: "${notebookName}".`,
            chatInstruction?.trim() ? `Instruksi notebook: ${chatInstruction.trim()}` : '',
            this.fileContextRule(docStatus, hasDb),
            hasDb
                ? 'Jika ada data database operasional di bawah, gunakan hanya untuk pertanyaan status/order/analitik operasional.'
                : '',
            ...styleRules,
            this.languageRule(language),
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

    /**
     * Ensure NotebookLM-style inline citations when the model forgot [n]
     * but we do have retrieved references.
     */
    private ensureInlineCitations(answer: string, retrieval: RetrievalResult): string {
        const refs = retrieval.references ?? [];
        if (!answer?.trim() || refs.length === 0) return answer;
        if (/\[\d+\]/.test(answer)) return answer;
        const markers = refs.map((_, i) => `[${i + 1}]`).join('');
        return `${answer.trim()} ${markers}`;
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
        const canned = this.cannedGroundedAnswer(params.retrieval, params.language);
        if (canned) return canned;
        const answer = await this.generateText(this.buildGroundedPrompt(params));
        const finalAnswer = answer || 'Maaf, saya tidak dapat menghasilkan jawaban saat ini.';
        return this.ensureInlineCitations(finalAnswer, params.retrieval);
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
        const canned = this.cannedGroundedAnswer(params.retrieval, params.language);
        if (canned) {
            onDelta(canned);
            return canned;
        }
        const answer = await this.generateTextStream(this.buildGroundedPrompt(params), onDelta);
        const finalAnswer = answer || 'Maaf, saya tidak dapat menghasilkan jawaban saat ini.';
        const withCite = this.ensureInlineCitations(finalAnswer, params.retrieval);
        // If we had to append citations after the stream, emit the suffix once.
        if (withCite !== finalAnswer) {
            onDelta(withCite.slice(finalAnswer.length));
        }
        return withCite;
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
