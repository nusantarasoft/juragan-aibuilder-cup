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
import { buildAgenticAskSynthesizePrompt } from './studio-umkm-agentic-ask.prompts';
import type {
    AgenticAskInput,
    AgenticAskOutput,
    AgenticAskToolCall,
    AgenticAskToolResult,
} from './studio-umkm-agentic-ask.types';
import { executeUmkmReadTool } from './studio-umkm-read-tools';
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
            answer = this.fallbackAnswer(toolResults, question);
        }

        return { answer: answer.trim(), plan, toolResults, references, rawChunks };
    }

    private fallbackAnswer(results: AgenticAskToolResult[], question?: string): string {
        const ok = results.filter((r) => r.ok && r.content.trim());
        if (ok.length === 0) {
            return [
                'Maaf, saya belum bisa menjawab dari data toko saat ini.',
                'Coba ketik *0* untuk menu, *6* untuk laporan, atau *2* untuk kelola menu.',
            ].join('\n');
        }

        const q = (question || '').toLowerCase();
        const restockLike = /\b(restock|restok|mending|mau\s+habis)\b/i.test(q);
        if (restockLike) {
            const stock = ok.find((r) => r.name === 'get_stock');
            const lines = [
                'Soal restock, cek sisa dulu:',
                '',
                stock?.content || 'Stok item itu belum ketemu di etalase.',
                '',
                'Kalau mau isi ulang: ketik *tambah stok [nama] [jumlah]* atau *belanja [jumlah] [nama] @harga*.',
                'Mau hitung yang laku? Ketik *daftar penjualan* atau *laporan hari ini*.',
            ];
            return lines.join('\n');
        }

        const adviceLike =
            /\b(bagaimana|gimana|tips|saran|strategi|rekomendasi|menaikkan|meningkatkan|tingkatkan|naikkan)\b/i.test(
                q,
            );
        if (adviceLike) {
            const report = ok.find((r) => r.name === 'get_combined_report' || r.name === 'get_sales_summary');
            const catalog = ok.find((r) => r.name === 'list_products');
            const lines = [
                'Berikut saran singkat berdasarkan data toko saat ini:',
                '',
                '1. Dorong menu terlaris / yang stoknya siap jual; kurangi fokus ke item yang jarang laku.',
                '2. Catat setiap penjualan (*5*) dan belanja (*3*) supaya laporan akurat untuk evaluasi.',
                '3. Cek *6* berkala — naikkan omzet dengan target harian kecil (mis. +10–20% vs rata-rata).',
                '4. Pakai promo bundling atau upsell item pelengkap di jam sepi.',
            ];
            if (report?.content) {
                const snap = report.content
                    .split('\n')
                    .filter((l) => /Penjualan|Total penjualan|Total belanja|Selisih/i.test(l))
                    .slice(0, 4);
                if (snap.length) {
                    lines.push('', '*Ringkasan data (konteks):*', ...snap);
                }
            }
            if (catalog?.content) {
                lines.push('', 'Ketik *2* lalu *1* untuk lihat daftar menu lengkap.');
            }
            lines.push('', 'Ketik *1* untuk tanya lagi, atau *0* untuk menu utama.');
            return lines.join('\n');
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
        if (call.name === 'search_docs') {
            return this.toolSearchDocs(input, config);
        }
        const shared = await executeUmkmReadTool(this.umkm, call, {
            question: input.question,
            tenantId: input.tenantId,
            logger: this.logger,
        });
        if (shared) return shared;
        return {
            result: {
                name: call.name,
                ok: false,
                content: `Tool tidak dikenali: ${call.name}`,
            },
        };
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
