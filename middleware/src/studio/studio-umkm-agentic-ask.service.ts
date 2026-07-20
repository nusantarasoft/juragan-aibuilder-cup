/**
 * UMKM Agentic Ask orchestrator.
 *
 * Flow: plan (pure) → execute read-only tools → synthesize answer.
 * Maintenance: change tools in types + planner; keep this file thin.
 */
import { Injectable, Logger } from '@nestjs/common';
import { AiRouterService } from '../ai/ai-router.service';
import { StudioContextService } from './studio-context.service';
import { StudioDbContextService, type StudioContextConfig } from './studio-db-context.service';
import { StudioService } from './studio.service';
import { StudioUmkmService } from './studio-umkm.service';
import { planAgenticAskTools } from './studio-umkm-agentic-ask.planner';
import {
    buildAgenticAskSynthesizePrompt,
    formatSuggestMenuActionContent,
} from './studio-umkm-agentic-ask.prompts';
import type {
    AgenticAskInput,
    AgenticAskOutput,
    AgenticAskToolCall,
    AgenticAskToolResult,
} from './studio-umkm-agentic-ask.types';
import type { UmkmReportPeriod } from './studio-umkm-ops.util';
import type { QueryUnderstandingResult } from './query-understanding';

@Injectable()
export class StudioUmkmAgenticAskService {
    private readonly logger = new Logger(StudioUmkmAgenticAskService.name);

    constructor(
        private readonly umkm: StudioUmkmService,
        private readonly studio: StudioService,
        private readonly context: StudioContextService,
        private readonly dbContext: StudioDbContextService,
        private readonly aiRouter: AiRouterService,
    ) {}

    async answer(
        input: AgenticAskInput,
        config?: StudioContextConfig,
    ): Promise<AgenticAskOutput> {
        const question = (input.question || '').trim();
        const plan = planAgenticAskTools(question);
        this.logger.debug(
            `agentic-ask plan=${plan.reason} tools=${plan.tools.map((t) => t.name).join(',')}`,
        );

        const toolResults: AgenticAskToolResult[] = [];
        let references: AgenticAskOutput['references'];
        let rawChunks: AgenticAskOutput['rawChunks'];

        // Independent tools can run in parallel
        const settled = await Promise.all(
            plan.tools.map((call) => this.runTool(call, input, config)),
        );
        for (const r of settled) {
            toolResults.push(r.result);
            if (r.references) references = r.references;
            if (r.rawChunks) rawChunks = r.rawChunks;
        }

        const prompt = buildAgenticAskSynthesizePrompt({
            notebookName: input.notebookName || 'UMKM',
            question,
            toolResults,
            conversationLines: input.conversationLines,
            instruction: input.instruction,
        });

        let answer = '';
        try {
            answer = await this.aiRouter.generateText(prompt);
        } catch (e: any) {
            this.logger.warn(`agentic-ask synthesize failed: ${e?.message}`);
        }

        if (!answer?.trim() || answer.includes('not configured') || answer.includes('request failed')) {
            answer = this.fallbackAnswer(toolResults);
        }

        return { answer: answer.trim(), plan, toolResults, references, rawChunks };
    }

    private fallbackAnswer(results: AgenticAskToolResult[]): string {
        const ok = results.filter((r) => r.ok && r.content.trim());
        if (ok.length === 0) {
            return [
                'Maaf, saya belum bisa menjawab dari data toko saat ini.',
                'Coba ketik *0* untuk menu, *6* untuk laporan, atau *2* untuk kelola menu.',
            ].join('\n');
        }
        return ['Berikut data yang berhasil diambil:', '', ...ok.map((r) => r.content)].join('\n');
    }

    private async runTool(
        call: AgenticAskToolCall,
        input: AgenticAskInput,
        config?: StudioContextConfig,
    ): Promise<{
        result: AgenticAskToolResult;
        references?: AgenticAskOutput['references'];
        rawChunks?: AgenticAskOutput['rawChunks'];
    }> {
        try {
            switch (call.name) {
                case 'search_docs':
                    return this.toolSearchDocs(input, config);
                case 'get_stock': {
                    const text = call.productQuery
                        ? `cek stok ${call.productQuery}`
                        : input.question;
                    const content = await this.umkm.buildStockCheckMessage(text, input.tenantId);
                    return { result: { name: call.name, ok: true, content } };
                }
                case 'get_sales_summary': {
                    const period = (call.period || 'today') as UmkmReportPeriod;
                    const content = await this.umkm.buildSalesListMessage(input.tenantId, period);
                    return { result: { name: call.name, ok: true, content } };
                }
                case 'get_purchases_summary': {
                    const period = (call.period || 'month') as UmkmReportPeriod;
                    const content = await this.umkm.buildPurchaseListMessage(input.tenantId, period);
                    return { result: { name: call.name, ok: true, content } };
                }
                case 'get_combined_report': {
                    const period = (call.period || 'today') as UmkmReportPeriod;
                    const content = await this.umkm.buildCombinedReportMessage(
                        input.tenantId,
                        period,
                    );
                    return { result: { name: call.name, ok: true, content } };
                }
                case 'list_products': {
                    const content = await this.umkm.buildProductListMessage(input.tenantId);
                    return { result: { name: call.name, ok: true, content } };
                }
                case 'suggest_menu_action':
                    return {
                        result: {
                            name: call.name,
                            ok: true,
                            content: formatSuggestMenuActionContent(),
                        },
                    };
                default:
                    return {
                        result: {
                            name: call.name,
                            ok: false,
                            content: `Tool tidak dikenali: ${call.name}`,
                        },
                    };
            }
        } catch (e: any) {
            this.logger.warn(`agentic-ask tool ${call.name}: ${e?.message}`);
            return {
                result: {
                    name: call.name,
                    ok: false,
                    content: `Gagal menjalankan ${call.name}: ${e?.message || 'error'}`,
                },
            };
        }
    }

    private async toolSearchDocs(
        input: AgenticAskInput,
        config?: StudioContextConfig,
    ): Promise<{
        result: AgenticAskToolResult;
        references?: AgenticAskOutput['references'];
        rawChunks?: AgenticAskOutput['rawChunks'];
    }> {
        const cfg =
            config ||
            this.dbContext.parseConfig(
                (await this.studio.getNotebook(input.notebookId)).context_config,
            );

        const qu: QueryUnderstandingResult = {
            original_query: input.question,
            detected_language: 'id',
            normalized_text: input.question,
            main_intent: 'tanya',
            rewritten_query: input.question,
            needs_clarification: false,
            clarification_question: '',
            confidence: 0.7,
        };

        const retrieval = await this.context.retrieveContext(
            input.notebookId,
            input.question,
            qu,
            cfg,
        );

        const parts: string[] = [];
        if (retrieval.fileContext) {
            parts.push('## Cuplikan dokumen\n' + retrieval.fileContext.slice(0, 6000));
        } else {
            parts.push(
                retrieval.documentRetrievalStatus === 'not_indexed'
                    ? '(Belum ada dokumen terindeks di notebook.)'
                    : '(Tidak ada cuplikan dokumen yang relevan.)',
            );
        }
        if (retrieval.dbContext) {
            parts.push('## Data view (whitelist)\n' + retrieval.dbContext.slice(0, 4000));
        }

        return {
            result: { name: 'search_docs', ok: true, content: parts.join('\n\n') },
            references: retrieval.references,
            rawChunks: retrieval.rawChunks,
        };
    }
}
