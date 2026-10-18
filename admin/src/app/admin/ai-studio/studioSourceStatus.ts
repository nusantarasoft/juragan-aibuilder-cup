import type { StudioSource } from '@/lib/studioService';

export type IngestStage = 'queued' | 'extracting' | 'chunking' | 'embedding' | 'done' | 'error';

const STAGE_LABELS: Record<string, string> = {
    queued: 'Queued',
    extracting: 'Extracting text',
    chunking: 'Chunking',
    embedding: 'Vectorizing',
    done: 'Done',
    error: 'Failed',
};

export function resolveIngestStage(source: StudioSource): IngestStage {
    const stage = source.parse_stage;
    if (stage && stage in STAGE_LABELS) return stage as IngestStage;
    if (source.parse_status === 'pending') return 'queued';
    if (source.parse_status === 'parsing') return 'embedding';
    if (source.parse_status === 'error') return 'error';
    if (source.parse_status === 'done') return 'done';
    return 'queued';
}

export function isSourceIndexed(source: StudioSource): boolean {
    return source.parse_status === 'done' && (source.chunk_count ?? 0) > 0;
}

export function isSourceInProgress(source: StudioSource): boolean {
    return source.parse_status === 'parsing' || source.parse_status === 'pending';
}

export function summarizeSources(sources: StudioSource[]) {
    const indexed = sources.filter(isSourceIndexed).length;
    const inProgress = sources.filter(isSourceInProgress).length;
    const errors = sources.filter((s) => s.parse_status === 'error').length;
    const embedding = sources.filter((s) => resolveIngestStage(s) === 'embedding').length;
    const empty = sources.filter(
        (s) => s.parse_status === 'done' && (s.chunk_count ?? 0) === 0,
    ).length;
    return {
        total: sources.length,
        indexed,
        inProgress,
        errors,
        empty,
        embedding,
        allIndexed: sources.length > 0 && indexed === sources.length,
        anyIndexed: indexed > 0,
    };
}

export type SourceStats = ReturnType<typeof summarizeSources>;

export function getSourceProgressPercent(source: StudioSource): number {
    if (source.parse_status === 'pending') return 5;
    if (source.parse_status === 'parsing') {
        return Math.max(8, Math.round((source.parse_progress ?? 0) * 100));
    }
    if (isSourceIndexed(source)) return 100;
    return 0;
}

export function getSourceStageLabel(source: StudioSource): string {
    const stage = resolveIngestStage(source);
    const base = STAGE_LABELS[stage] ?? stage;
    if (stage === 'embedding') {
        const total = source.embed_total ?? 0;
        const done = source.embed_done ?? 0;
        if (total > 0) return `${base} ${done}/${total}`;
    }
    return base;
}

export function getSourceStatusTag(source: StudioSource): { color: string; label: string } {
    if (isSourceIndexed(source)) {
        return { color: 'success', label: `Vectorized (${source.chunk_count})` };
    }
    const stage = resolveIngestStage(source);
    if (stage === 'embedding') {
        return { color: 'processing', label: getSourceStageLabel(source) };
    }
    if (stage === 'extracting' || stage === 'chunking') {
        return { color: 'processing', label: getSourceStageLabel(source) };
    }
    switch (source.parse_status) {
        case 'done':
            return { color: 'warning', label: 'No vectors' };
        case 'error':
            return { color: 'error', label: 'Failed' };
        default:
            return { color: 'default', label: 'Queued' };
    }
}

export function getSourceStatusDetail(source: StudioSource): string | null {
    if (source.parse_error?.trim()) return source.parse_error.trim();
    if (isSourceIndexed(source)) {
        return `${source.chunk_count} chunks vectorized — ready for RAG semantic search.`;
    }
    const stage = resolveIngestStage(source);
    if (stage === 'embedding' && (source.embed_total ?? 0) > 0) {
        return `Generating chunk embeddings (${source.embed_done ?? 0}/${source.embed_total}).`;
    }
    if (stage === 'extracting') return 'Reading and extracting text from file.';
    if (stage === 'chunking') return 'Splitting text into chunks for vectorization.';
    if (stage === 'queued') return 'Waiting for indexing pipeline to start.';
    return null;
}

export type SourceNotify = (type: 'success' | 'error' | 'warning', text: string) => void;

/** Notify when a source transitions from in-progress to done/error. */
export function trackSourceStatusChanges(
    prev: Map<string, string>,
    sources: StudioSource[],
    notify: SourceNotify,
): Map<string, string> {
    const next = new Map<string, string>();
    for (const source of sources) {
        const status = source.parse_status;
        const previous = prev.get(source.id);
        next.set(source.id, status);

        const wasInProgress = previous === 'pending' || previous === 'parsing';
        if (!wasInProgress) continue;
        if (status === 'done' && (source.chunk_count ?? 0) > 0) {
            notify(
                'success',
                `"${source.filename}" vectorized (${source.chunk_count} chunks ready for RAG)`,
            );
        } else if (status === 'error') {
            const detail = source.parse_error?.trim();
            notify(
                'error',
                detail
                    ? `Indexing failed: "${source.filename}" — ${detail}`
                    : `Indexing failed: "${source.filename}". Try Reindex.`,
            );
        } else if (status === 'done' && (source.chunk_count ?? 0) === 0) {
            notify(
                'warning',
                `"${source.filename}" finished without vectors. Check file format or embedding config.`,
            );
        }
    }
    return next;
}

export function seedSourceStatusMap(sources: StudioSource[]): Map<string, string> {
    return new Map(sources.map((s) => [s.id, s.parse_status]));
}
