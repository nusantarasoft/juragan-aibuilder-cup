import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { StudioChunkHit } from './studio-context.service';

export type RagEvalCase = {
    id: string;
    question: string;
    expected_source_substrings?: string[];
    expected_content_markers?: string[];
    tags?: string[];
};

export type RagEvalDataset = {
    id: string;
    description?: string;
    source_filename_hint?: string;
    cases: RagEvalCase[];
};

export type RagEvalCaseResult = {
    caseId: string;
    question: string;
    hitAtK: boolean;
    contentMarkerAtK: boolean;
    reciprocalRank: number;
    topFilename: string | null;
    topScore: number | null;
    hitCount: number;
    tags?: string[];
};

export type RagEvalReport = {
    datasetId: string;
    notebookId: string;
    topK: number;
    cases: RagEvalCaseResult[];
    summary: {
        total: number;
        hitAtK: number;
        hitAtKRate: number;
        contentMarkerAtK: number;
        contentMarkerAtKRate: number;
        meanReciprocalRank: number;
    };
};

export function loadRagEvalDataset(filePath: string): RagEvalDataset {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as RagEvalDataset;
    if (!parsed?.cases?.length) {
        throw new Error(`Invalid RAG eval dataset: ${filePath}`);
    }
    return parsed;
}

export function defaultKatalogEvalDatasetPath(): string {
    return resolve(__dirname, 'fixtures', 'studio-rag-eval.katalog.json');
}

function matchesSubstring(haystack: string, needle: string): boolean {
    return haystack.toLowerCase().includes(needle.toLowerCase());
}

function hitMatchesSource(hit: StudioChunkHit, expectedSubstrings: string[]): boolean {
    if (!expectedSubstrings.length) return true;
    const filename = hit.filename || '';
    const content = hit.content || '';
    return expectedSubstrings.some(
        (sub) => matchesSubstring(filename, sub) || matchesSubstring(content, sub),
    );
}

function hitMatchesContentMarkers(hit: StudioChunkHit, markers: string[]): boolean {
    if (!markers.length) return true;
    const content = hit.content || '';
    return markers.every((marker) => matchesSubstring(content, marker));
}

/** Score one question against retrieval hits (pure, no I/O). */
export function scoreRetrievalCase(
    hits: StudioChunkHit[],
    evalCase: RagEvalCase,
    topK = 8,
): RagEvalCaseResult {
    const slice = hits.slice(0, topK);
    const sourceSubs = evalCase.expected_source_substrings ?? [];
    const markers = evalCase.expected_content_markers ?? [];

    let reciprocalRank = 0;
    let hitAtK = false;
    let contentMarkerAtK = false;
    let hitCount = 0;

    for (let i = 0; i < slice.length; i++) {
        const hit = slice[i];
        if (hitMatchesSource(hit, sourceSubs)) {
            hitCount++;
            if (!hitAtK) {
                hitAtK = true;
                reciprocalRank = 1 / (i + 1);
            }
        }
        if (!contentMarkerAtK && hitMatchesContentMarkers(hit, markers)) {
            contentMarkerAtK = true;
        }
    }

    if (sourceSubs.length === 0 && slice.length > 0) {
        hitAtK = true;
        reciprocalRank = 1;
        hitCount = slice.length;
    }

    const top = slice[0];
    return {
        caseId: evalCase.id,
        question: evalCase.question,
        hitAtK,
        contentMarkerAtK,
        reciprocalRank,
        topFilename: top?.filename ?? null,
        topScore: top?.score ?? null,
        hitCount,
        tags: evalCase.tags,
    };
}

export function aggregateRagEvalResults(
    datasetId: string,
    notebookId: string,
    caseResults: RagEvalCaseResult[],
    topK: number,
): RagEvalReport {
    const total = caseResults.length;
    const hitAtK = caseResults.filter((c) => c.hitAtK).length;
    const contentMarkerAtK = caseResults.filter((c) => c.contentMarkerAtK).length;
    const mrr =
        total > 0
            ? caseResults.reduce((sum, c) => sum + c.reciprocalRank, 0) / total
            : 0;

    return {
        datasetId,
        notebookId,
        topK,
        cases: caseResults,
        summary: {
            total,
            hitAtK,
            hitAtKRate: total ? hitAtK / total : 0,
            contentMarkerAtK,
            contentMarkerAtKRate: total ? contentMarkerAtK / total : 0,
            meanReciprocalRank: mrr,
        },
    };
}

export function formatRagEvalReport(report: RagEvalReport): string {
    const lines: string[] = [
        `RAG Eval — dataset=${report.datasetId} notebook=${report.notebookId} topK=${report.topK}`,
        `Hit@${report.topK}: ${report.summary.hitAtK}/${report.summary.total} (${(report.summary.hitAtKRate * 100).toFixed(1)}%)`,
        `Content marker@${report.topK}: ${report.summary.contentMarkerAtK}/${report.summary.total} (${(report.summary.contentMarkerAtKRate * 100).toFixed(1)}%)`,
        `MRR: ${report.summary.meanReciprocalRank.toFixed(3)}`,
        '',
        'Per case:',
    ];

    for (const c of report.cases) {
        const flags = [
            c.hitAtK ? 'HIT' : 'MISS',
            c.contentMarkerAtK ? 'MARKER' : 'no-marker',
        ].join(' ');
        const top = c.topFilename
            ? `${c.topFilename} (${((c.topScore ?? 0) * 100).toFixed(0)}%)`
            : '(no hits)';
        lines.push(`  [${flags}] ${c.caseId}: ${top}`);
        if (!c.hitAtK || !c.contentMarkerAtK) {
            lines.push(`           Q: ${c.question}`);
        }
    }

    return lines.join('\n');
}

export type SemanticSearchFn = (
    notebookId: string,
    query: string,
    topK?: number,
) => Promise<StudioChunkHit[]>;

export async function runRagEval(
    notebookId: string,
    search: SemanticSearchFn,
    dataset: RagEvalDataset,
    topK = 8,
): Promise<RagEvalReport> {
    const caseResults: RagEvalCaseResult[] = [];
    for (const evalCase of dataset.cases) {
        const hits = await search(notebookId, evalCase.question, topK);
        caseResults.push(scoreRetrievalCase(hits, evalCase, topK));
    }
    return aggregateRagEvalResults(dataset.id, notebookId, caseResults, topK);
}
