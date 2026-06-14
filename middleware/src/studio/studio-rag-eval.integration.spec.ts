import { describe, it, expect } from 'vitest';
import { runStudioRagEval } from './studio-rag-eval.runner';
import { formatRagEvalReport } from './studio-rag-eval.util';

const RUN = process.env.RUN_RAG_EVAL === '1' || process.env.RUN_RAG_EVAL === 'true';
const NOTEBOOK_ID = process.env.STUDIO_RAG_EVAL_NOTEBOOK_ID?.trim();

describe.skipIf(!RUN || !NOTEBOOK_ID)('Studio RAG eval (live)', () => {
    it(
        'runs katalog dataset against notebook',
        async () => {
            const report = await runStudioRagEval({
                notebookId: NOTEBOOK_ID!,
                minHitRate: parseFloat(process.env.STUDIO_RAG_EVAL_MIN_HIT_RATE || '0'),
            });
            console.log('\n' + formatRagEvalReport(report));
            expect(report.summary.total).toBeGreaterThan(0);
            const minHit = parseFloat(process.env.STUDIO_RAG_EVAL_MIN_HIT_RATE || '0');
            if (minHit > 0) {
                expect(report.summary.hitAtKRate).toBeGreaterThanOrEqual(minHit);
            }
        },
        120_000,
    );
});
