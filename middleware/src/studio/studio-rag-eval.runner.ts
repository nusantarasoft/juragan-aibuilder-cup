import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SupabaseModule } from '../supabase/supabase.module';
import { AiModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';
import { DremioModule } from '../dremio/dremio.module';
import { StudioModule } from './studio.module';
import { StudioContextService } from './studio-context.service';
import {
    defaultKatalogEvalDatasetPath,
    formatRagEvalReport,
    loadRagEvalDataset,
    runRagEval,
    type RagEvalReport,
} from './studio-rag-eval.util';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '../.env.local', '.env', '../.env'],
        }),
        SupabaseModule,
        AiModule,
        RagModule,
        DremioModule,
        StudioModule,
    ],
})
class StudioRagEvalModule {}

export type RunStudioRagEvalOptions = {
    notebookId: string;
    datasetPath?: string;
    topK?: number;
    minHitRate?: number;
};

export async function runStudioRagEval(
    options: RunStudioRagEvalOptions,
): Promise<RagEvalReport> {
    const datasetPath = options.datasetPath ?? defaultKatalogEvalDatasetPath();
    const topK = options.topK ?? 8;
    const dataset = loadRagEvalDataset(datasetPath);

    const app = await NestFactory.createApplicationContext(StudioRagEvalModule, {
        logger: ['error', 'warn'],
    });

    try {
        const contextService = app.get(StudioContextService);
        const report = await runRagEval(
            options.notebookId,
            (notebookId, query, k) =>
                contextService.semanticSearchNotebook(notebookId, query, k ?? topK),
            dataset,
            topK,
        );

        const minHit = options.minHitRate;
        if (minHit != null && report.summary.hitAtKRate < minHit) {
            throw new Error(
                `RAG eval below threshold: hit@${topK}=${(report.summary.hitAtKRate * 100).toFixed(1)}% < ${(minHit * 100).toFixed(1)}%`,
            );
        }

        return report;
    } finally {
        await app.close();
    }
}

/** CLI entry when executed via vitest integration or node. */
export async function mainFromEnv(): Promise<void> {
    const notebookId = process.env.STUDIO_RAG_EVAL_NOTEBOOK_ID?.trim();
    if (!notebookId) {
        console.error(
            'Set STUDIO_RAG_EVAL_NOTEBOOK_ID to the notebook UUID that contains indexed katalog-produk-rag.txt',
        );
        process.exit(1);
    }

    const datasetPath = process.env.STUDIO_RAG_EVAL_DATASET?.trim();
    const topK = parseInt(process.env.STUDIO_RAG_EVAL_TOP_K || '8', 10);
    const minHitRaw = process.env.STUDIO_RAG_EVAL_MIN_HIT_RATE?.trim();
    const minHitRate = minHitRaw ? parseFloat(minHitRaw) : undefined;

    const report = await runStudioRagEval({
        notebookId,
        datasetPath: datasetPath || undefined,
        topK: Number.isFinite(topK) && topK > 0 ? topK : 8,
        minHitRate,
    });

    console.log(formatRagEvalReport(report));
}
