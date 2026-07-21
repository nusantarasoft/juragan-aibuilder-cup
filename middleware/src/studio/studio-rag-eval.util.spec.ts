import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    scoreRetrievalCase,
    aggregateRagEvalResults,
    formatRagEvalReport,
    loadRagEvalDataset,
    defaultKatalogEvalDatasetPath,
    runRagEval,
} from './studio-rag-eval.util';
import type { StudioChunkHit } from './studio-context.service';

const hits: StudioChunkHit[] = [
    {
        chunkId: '1',
        sourceId: 's1',
        filename: 'katalog-produk-rag.txt',
        content: 'Harga eceran: Rp 99.000 per unit\nSKU: NS-X-100',
        score: 0.82,
    },
    {
        chunkId: '2',
        sourceId: 's1',
        filename: 'other.txt',
        content: 'unrelated',
        score: 0.4,
    },
];

describe('scoreRetrievalCase', () => {
    it('marks hit when filename and content markers match', () => {
        const result = scoreRetrievalCase(hits, {
            id: 'x100-price',
            question: 'harga produk x',
            expected_source_substrings: ['katalog-produk'],
            expected_content_markers: ['99.000', 'NS-X-100'],
        });
        expect(result.hitAtK).toBe(true);
        expect(result.contentMarkerAtK).toBe(true);
        expect(result.reciprocalRank).toBe(1);
    });

    it('misses when source substring absent', () => {
        const result = scoreRetrievalCase(hits, {
            id: 'miss',
            question: 'x',
            expected_source_substrings: ['nonexistent-file'],
            expected_content_markers: ['99.000'],
        });
        expect(result.hitAtK).toBe(false);
        expect(result.reciprocalRank).toBe(0);
    });

    it('requires all content markers in a single chunk', () => {
        const partial: StudioChunkHit[] = [
            {
                chunkId: '1',
                sourceId: 's1',
                filename: 'katalog-produk-rag.txt',
                content: 'Harga 99.000',
                score: 0.7,
            },
        ];
        const result = scoreRetrievalCase(partial, {
            id: 'partial',
            question: 'x',
            expected_source_substrings: ['katalog'],
            expected_content_markers: ['99.000', 'NS-X-100'],
        });
        expect(result.hitAtK).toBe(true);
        expect(result.contentMarkerAtK).toBe(false);
    });

    it('counts every hit and MRR=1 when no source substrings are required', () => {
        const result = scoreRetrievalCase(hits, { id: 'nosubs', question: 'x' });
        expect(result.hitAtK).toBe(true);
        expect(result.reciprocalRank).toBe(1);
        expect(result.hitCount).toBe(hits.length);
        expect(result.contentMarkerAtK).toBe(true); // no markers required
    });

    it('returns null top fields when there are no hits', () => {
        const result = scoreRetrievalCase([], {
            id: 'empty',
            question: 'x',
            expected_source_substrings: ['katalog'],
        });
        expect(result.hitAtK).toBe(false);
        expect(result.topFilename).toBeNull();
        expect(result.topScore).toBeNull();
    });

    it('handles hits with missing filename/content fields', () => {
        const bare = [{ chunkId: '1', sourceId: 's', score: 0.5 } as any];
        const result = scoreRetrievalCase(bare, {
            id: 'bare',
            question: 'x',
            expected_source_substrings: ['katalog'],
            expected_content_markers: ['xyz'],
        });
        expect(result.hitAtK).toBe(false);
        expect(result.contentMarkerAtK).toBe(false);
    });
});

describe('aggregateRagEvalResults', () => {
    it('computes summary rates', () => {
        const report = aggregateRagEvalResults('ds', 'nb-1', [
            {
                caseId: 'a',
                question: 'q1',
                hitAtK: true,
                contentMarkerAtK: true,
                reciprocalRank: 1,
                topFilename: 'f.txt',
                topScore: 0.9,
                hitCount: 1,
            },
            {
                caseId: 'b',
                question: 'q2',
                hitAtK: false,
                contentMarkerAtK: false,
                reciprocalRank: 0,
                topFilename: null,
                topScore: null,
                hitCount: 0,
            },
        ], 8);
        expect(report.summary.hitAtKRate).toBe(0.5);
        expect(report.summary.meanReciprocalRank).toBe(0.5);
    });
});

describe('formatRagEvalReport', () => {
    it('includes summary lines', () => {
        const text = formatRagEvalReport(
            aggregateRagEvalResults('katalog', 'nb', [], 8),
        );
        expect(text).toContain('RAG Eval');
        expect(text).toContain('Hit@8');
    });

    it('renders per-case rows for hits and misses', () => {
        const report = aggregateRagEvalResults('ds', 'nb', [
            {
                caseId: 'ok', question: 'q1', hitAtK: true, contentMarkerAtK: true,
                reciprocalRank: 1, topFilename: 'f.txt', topScore: 0.91, hitCount: 1,
            },
            {
                caseId: 'bad', question: 'q2', hitAtK: false, contentMarkerAtK: false,
                reciprocalRank: 0, topFilename: null, topScore: null, hitCount: 0,
            },
            {
                caseId: 'noscore', question: 'q3', hitAtK: true, contentMarkerAtK: false,
                reciprocalRank: 0.5, topFilename: 'g.txt', topScore: null, hitCount: 1,
            },
        ], 8);
        const text = formatRagEvalReport(report);
        expect(text).toContain('[HIT MARKER] ok: f.txt (91%)');
        expect(text).toContain('[MISS no-marker] bad: (no hits)');
        expect(text).toContain('g.txt (0%)'); // topScore null -> 0%
        expect(text).toContain('Q: q2'); // Q line only for failing cases
        expect(text).not.toContain('Q: q1');
    });
});

describe('loadRagEvalDataset', () => {
    it('loads katalog fixture', () => {
        const ds = loadRagEvalDataset(defaultKatalogEvalDatasetPath());
        expect(ds.id).toBe('katalog-produk-rag');
        expect(ds.cases.length).toBeGreaterThanOrEqual(10);
    });

    it('throws for a dataset with no cases', () => {
        const dir = mkdtempSync(join(tmpdir(), 'rageval-'));
        const file = join(dir, 'empty.json');
        writeFileSync(file, JSON.stringify({ id: 'empty', cases: [] }), 'utf-8');
        expect(() => loadRagEvalDataset(file)).toThrow(/Invalid RAG eval dataset/);
    });
});

describe('runRagEval', () => {
    it('scores each case using the provided search function', async () => {
        const search = async (_nb: string, _q: string, _k?: number): Promise<StudioChunkHit[]> => hits;
        const report = await runRagEval(
            'nb-1',
            search,
            {
                id: 'ds',
                cases: [
                    { id: 'c1', question: 'harga', expected_source_substrings: ['katalog'] },
                    { id: 'c2', question: 'lain', expected_source_substrings: ['nope'] },
                ],
            },
            8,
        );
        expect(report.summary.total).toBe(2);
        expect(report.summary.hitAtK).toBe(1);
        expect(report.notebookId).toBe('nb-1');
    });
});
