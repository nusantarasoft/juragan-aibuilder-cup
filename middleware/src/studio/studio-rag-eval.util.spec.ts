import { describe, it, expect } from 'vitest';
import {
    scoreRetrievalCase,
    aggregateRagEvalResults,
    formatRagEvalReport,
    loadRagEvalDataset,
    defaultKatalogEvalDatasetPath,
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
});

describe('loadRagEvalDataset', () => {
    it('loads katalog fixture', () => {
        const ds = loadRagEvalDataset(defaultKatalogEvalDatasetPath());
        expect(ds.id).toBe('katalog-produk-rag');
        expect(ds.cases.length).toBeGreaterThanOrEqual(10);
    });
});
