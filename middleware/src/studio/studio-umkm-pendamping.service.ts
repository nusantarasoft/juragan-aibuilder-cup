/**
 * UMKM Pendamping Bisnis — on-demand coach ritual (exact aliases only).
 *
 * Flow: report(week) → list_products if empty → low-stock top 3 → curriculum → synthesize.
 */
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { forwardRef, Inject, Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { AiRouterService } from '../ai/ai-router.service';
import type { StudioContextConfig } from './studio-db-context.service';
import { StudioContextService } from './studio-context.service';
import { StudioUmkmService } from './studio-umkm.service';
import type { AgenticAskToolCall } from './studio-umkm-agentic-ask.types';
import {
    buildConsultFromNotebookPrompt,
    buildPendampingSynthesizePrompt,
    CONSULT_BUSY_COPY,
    CONSULT_MISS_COPY,
    formatPendampingEmptyShop,
    formatPendampingNumbersOnlyFallback,
} from './studio-umkm-pendamping.prompts';
import { executeUmkmReadTool, stripDisallowedKetikActions } from './studio-umkm-read-tools';

const MAX_REPLY_CHARS = 800;
const CURRICULUM_MAX_CHARS = 3000;
const LOW_STOCK_MAX = 3;
const CONSULT_TOP_K = 5;
const CONSULT_QUESTION_MAX = 500;
const CONSULT_CONTEXT_MAX = 3500;

export type ConsultFromNotebookResult = {
    status: 'hit' | 'miss' | 'error';
    text: string;
    latencyMs: number;
};

export type PendampingMetricsSnapshot = {
    pendamping_requests_total: number;
    pendamping_success_total: number;
    pendamping_fallback_total: number;
    pendamping_action_stripped_total: number;
    latency_samples_ms: number[];
};

@Injectable()
export class StudioUmkmPendampingService implements OnModuleInit {
    private readonly logger = new Logger(StudioUmkmPendampingService.name);
    private curriculum = '';
    private curriculumMiss = true;
    private curriculumPath = '';

    private metrics: PendampingMetricsSnapshot = {
        pendamping_requests_total: 0,
        pendamping_success_total: 0,
        pendamping_fallback_total: 0,
        pendamping_action_stripped_total: 0,
        latency_samples_ms: [],
    };

    constructor(
        @Inject(forwardRef(() => StudioUmkmService))
        private readonly umkm: StudioUmkmService,
        private readonly aiRouter: AiRouterService,
        @Optional() private readonly context?: StudioContextService,
    ) {}

    onModuleInit() {
        this.loadCurriculum();
    }

    getMetrics(): PendampingMetricsSnapshot {
        return {
            ...this.metrics,
            latency_samples_ms: [...this.metrics.latency_samples_ms],
        };
    }

    /** Test/helper: override cached playbook (empty = curriculum miss). */
    setCurriculumForTests(content: string) {
        this.curriculum = content.slice(0, CURRICULUM_MAX_CHARS);
        this.curriculumMiss = !this.curriculum.trim();
    }

    /** Resolve playbook path — src next to this file, or dist sibling curriculum/. */
    private resolveCurriculumPath(): string {
        const candidates = [
            join(__dirname, 'curriculum', 'warung-pendamping.md'),
            join(__dirname, '..', 'curriculum', 'warung-pendamping.md'),
            join(process.cwd(), 'src', 'studio', 'curriculum', 'warung-pendamping.md'),
            join(process.cwd(), 'middleware', 'src', 'studio', 'curriculum', 'warung-pendamping.md'),
        ];
        for (const p of candidates) {
            if (existsSync(p)) return p;
        }
        return candidates[0];
    }

    private loadCurriculum() {
        this.curriculumPath = this.resolveCurriculumPath();
        try {
            if (!existsSync(this.curriculumPath)) {
                this.curriculum = '';
                this.curriculumMiss = true;
                this.logger.warn(
                    `pendamping curriculum_miss=true path=${this.curriculumPath} (file missing; numbers-only coach)`,
                );
                return;
            }
            const st = statSync(this.curriculumPath);
            const raw = readFileSync(this.curriculumPath, 'utf-8');
            this.curriculum = raw.slice(0, CURRICULUM_MAX_CHARS);
            this.curriculumMiss = !this.curriculum.trim();
            this.logger.log(
                `pendamping curriculum loaded path=${this.curriculumPath} mtime=${st.mtime.toISOString()} chars=${this.curriculum.length} miss=${this.curriculumMiss}`,
            );
        } catch (e: any) {
            this.curriculum = '';
            this.curriculumMiss = true;
            this.logger.warn(`pendamping curriculum load failed: ${e?.message}`);
        }
    }

    async coach(
        text: string,
        tenantId: string,
        _config?: StudioContextConfig,
        notebookId?: string,
    ): Promise<string> {
        const started = Date.now();
        this.metrics.pendamping_requests_total += 1;
        let fallback = false;
        let stripped = 0;
        const toolOk: string[] = [];
        const toolFail: string[] = [];

        try {
            const reportCall: AgenticAskToolCall = {
                name: 'get_combined_report',
                period: 'week',
            };
            const reportRun = await executeUmkmReadTool(this.umkm, reportCall, {
                question: text,
                tenantId,
                logger: this.logger,
            });
            const reportResult = reportRun?.result;
            if (reportResult?.ok) toolOk.push('get_combined_report');
            else toolFail.push('get_combined_report');

            const reportContent = reportResult?.ok ? reportResult.content : '';

            const stockRows = await this.lowStockRows(tenantId);
            const catalogEmpty = stockRows.all.length === 0;
            const stockLines = stockRows.lowSnippet;
            if (stockRows.all.length > 0) toolOk.push('fetchStockRows');

            let productsContent = '';
            if (catalogEmpty) {
                const listRun = await executeUmkmReadTool(
                    this.umkm,
                    { name: 'list_products' },
                    { question: text, tenantId, logger: this.logger },
                );
                if (listRun?.result.ok) {
                    toolOk.push('list_products');
                    productsContent = listRun.result.content;
                } else {
                    toolFail.push('list_products');
                }
            }

            if (catalogEmpty) {
                const empty = formatPendampingEmptyShop();
                this.metrics.pendamping_success_total += 1;
                this.logTurn({
                    plan: 'empty_shop',
                    toolOk,
                    toolFail,
                    fallback: false,
                    stripped: 0,
                    latencyMs: Date.now() - started,
                });
                return empty.slice(0, MAX_REPLY_CHARS);
            }

            const notebookContext = await this.retrieveNotebookContext(
                notebookId,
                text,
                stockLines,
                toolOk,
                toolFail,
            );

            const toolPayloads = [
                reportContent && `## Laporan minggu\n${reportContent}`,
                productsContent && `## Katalog\n${productsContent}`,
                stockLines && `## Stok tipis (on_hand≤2, max ${LOW_STOCK_MAX})\n${stockLines}`,
                toolFail.length && `## Tools gagal\n${toolFail.join(', ')}`,
            ]
                .filter(Boolean)
                .join('\n\n');

            const prompt = buildPendampingSynthesizePrompt({
                toolPayloads: toolPayloads || '(tidak ada payload tool)',
                curriculum: this.curriculum,
                userAlias: text.trim(),
                notebookContext,
            });

            let answer = '';
            try {
                answer = await this.aiRouter.generateText(prompt);
            } catch (e: any) {
                this.logger.warn(`pendamping synthesize failed: ${e?.message}`);
            }

            if (
                !answer?.trim() ||
                answer.includes('not configured') ||
                answer.includes('request failed')
            ) {
                fallback = true;
                answer = formatPendampingNumbersOnlyFallback({
                    report: reportContent,
                    products: productsContent,
                    stock: stockLines || undefined,
                    curriculumMiss: this.curriculumMiss,
                });
                this.metrics.pendamping_fallback_total += 1;
            }

            const strippedResult = stripDisallowedKetikActions(answer);
            stripped = strippedResult.stripped;
            if (stripped > 0) {
                this.metrics.pendamping_action_stripped_total += stripped;
                this.logger.log(`pendamping_action_stripped count=${stripped}`);
            }
            answer = strippedResult.text.slice(0, MAX_REPLY_CHARS);

            if (!fallback) this.metrics.pendamping_success_total += 1;

            this.logTurn({
                plan: fallback ? 'numbers_only' : 'synthesize',
                toolOk,
                toolFail,
                fallback,
                stripped,
                latencyMs: Date.now() - started,
            });
            return answer;
        } catch (e: any) {
            fallback = true;
            this.metrics.pendamping_fallback_total += 1;
            this.logger.warn(`pendamping coach error: ${e?.message}`);
            const msg = formatPendampingNumbersOnlyFallback({
                curriculumMiss: this.curriculumMiss,
            });
            this.logTurn({
                plan: 'error',
                toolOk,
                toolFail,
                fallback: true,
                stripped: 0,
                latencyMs: Date.now() - started,
            });
            return msg;
        }
    }


    /**
     * WA kasir_consult path — chunk-only RAG from kurikulum notebook.
     * Never calls coach() / store report / stock tools (L8).
     */
    async consultFromNotebook(
        question: string,
        notebookId?: string,
    ): Promise<ConsultFromNotebookResult> {
        const started = Date.now();
        const q = (question || '').trim().slice(0, CONSULT_QUESTION_MAX);
        const nb =
            (notebookId || '').trim() ||
            (process.env.KASIR_CONSULT_NOTEBOOK_ID || '').trim();

        const done = (
            status: ConsultFromNotebookResult['status'],
            text: string,
        ): ConsultFromNotebookResult => {
            const latencyMs = Date.now() - started;
            this.logger.log(
                `path=kasir_consult status=${status === 'hit' ? 'consult_hit' : status === 'miss' ? 'consult_miss' : 'consult_error'} latency_ms=${latencyMs}`,
            );
            return { status, text: text.slice(0, MAX_REPLY_CHARS), latencyMs };
        };

        if (!q || !nb || !this.context) {
            return done('miss', CONSULT_MISS_COPY);
        }

        let chunkContext = '';
        try {
            const chunks = await this.context.semanticSearchNotebook(nb, q, CONSULT_TOP_K);
            if (!chunks?.length) {
                return done('miss', CONSULT_MISS_COPY);
            }
            chunkContext = chunks
                .map(
                    (c, i) =>
                        `[Sumber ${i + 1}: ${c.filename} (relevansi ${(c.score * 100).toFixed(0)}%)]\n${c.content}`,
                )
                .join('\n\n---\n\n')
                .slice(0, CONSULT_CONTEXT_MAX);
            if (!chunkContext.trim()) {
                return done('miss', CONSULT_MISS_COPY);
            }
        } catch (e: any) {
            this.logger.warn(`kasir_consult retrieve: ${e?.message}`);
            return done('error', CONSULT_BUSY_COPY);
        }

        const prompt = buildConsultFromNotebookPrompt({
            question: q,
            chunkContext,
        });

        let answer = '';
        try {
            answer = await this.aiRouter.generateText(prompt);
        } catch (e: any) {
            this.logger.warn(`kasir_consult synthesize: ${e?.message}`);
            return done('error', CONSULT_BUSY_COPY);
        }

        if (
            !answer?.trim() ||
            answer.includes('not configured') ||
            answer.includes('request failed')
        ) {
            return done('error', CONSULT_BUSY_COPY);
        }

        return done('hit', answer.trim());
    }

    /** Notebook chunks via existing retrieveContext. Ask still owns search_docs. */
    private async retrieveNotebookContext(
        notebookId: string | undefined,
        alias: string,
        stockLines: string,
        toolOk: string[],
        toolFail: string[],
    ): Promise<string> {
        if (!notebookId || !this.context) return '';
        const query = [alias.trim(), 'saran bisnis warung', stockLines.replace(/\n/g, ' ')]
            .filter(Boolean)
            .join(' ')
            .slice(0, 500);
        try {
            const retrieval = await this.context.retrieveContext(notebookId, query);
            if (retrieval.fileContext?.trim()) {
                toolOk.push('retrieveContext');
                return retrieval.fileContext.slice(0, 2000);
            }
            if (retrieval.documentRetrievalStatus === 'not_indexed') {
                this.logger.debug(`pendamping retrieve not_indexed notebook=${notebookId}`);
            }
            return '';
        } catch (e: any) {
            toolFail.push('retrieveContext');
            this.logger.warn(`pendamping retrieveContext: ${e?.message}`);
            return '';
        }
    }

    private async lowStockRows(tenantId: string): Promise<{
        all: { name: string; onHand: number }[];
        lowSnippet: string;
    }> {
        try {
            const rows = await this.umkm.fetchStockRows(tenantId);
            const all = rows.map((r) => ({ name: r.name, onHand: r.onHand }));
            const low = rows
                .filter((r) => r.onHand <= 2)
                .sort((a, b) => a.onHand - b.onHand)
                .slice(0, LOW_STOCK_MAX);
            const lowSnippet = low.length
                ? low.map((r) => `• ${r.name}: on_hand=${r.onHand}`).join('\n')
                : '';
            return { all, lowSnippet };
        } catch (e: any) {
            this.logger.warn(`pendamping lowStock: ${e?.message}`);
            return { all: [], lowSnippet: '' };
        }
    }

    private logTurn(info: {
        plan: string;
        toolOk: string[];
        toolFail: string[];
        fallback: boolean;
        stripped: number;
        latencyMs: number;
    }) {
        this.metrics.latency_samples_ms.push(info.latencyMs);
        if (this.metrics.latency_samples_ms.length > 200) {
            this.metrics.latency_samples_ms.shift();
        }
        this.logger.log(
            `path=umkm_pendamping plan=${info.plan} tools_ok=${info.toolOk.join(',') || '-'} tools_fail=${info.toolFail.join(',') || '-'} fallback=${info.fallback} stripped=${info.stripped} latency_ms=${info.latencyMs}`,
        );
    }
}
