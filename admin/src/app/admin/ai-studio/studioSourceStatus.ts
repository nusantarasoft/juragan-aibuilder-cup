import type { StudioSource } from '@/lib/studioService';

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
    const empty = sources.filter(
        (s) => s.parse_status === 'done' && (s.chunk_count ?? 0) === 0,
    ).length;
    return {
        total: sources.length,
        indexed,
        inProgress,
        errors,
        empty,
        allIndexed: sources.length > 0 && indexed === sources.length,
        anyIndexed: indexed > 0,
    };
}

export function getSourceProgressPercent(source: StudioSource): number {
    if (source.parse_status === 'pending') return 8;
    if (source.parse_status === 'parsing') {
        return Math.max(10, Math.round((source.parse_progress ?? 0) * 100));
    }
    if (isSourceIndexed(source)) return 100;
    return 0;
}

export function getSourceStatusTag(source: StudioSource): { color: string; label: string } {
    if (isSourceIndexed(source)) {
        return { color: 'success', label: `Terindeks (${source.chunk_count})` };
    }
    switch (source.parse_status) {
        case 'done':
            return { color: 'warning', label: 'Tanpa chunk' };
        case 'parsing':
            return { color: 'processing', label: 'Mengindeks...' };
        case 'error':
            return { color: 'error', label: 'Gagal' };
        default:
            return { color: 'default', label: 'Antrian' };
    }
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
                `"${source.filename}" selesai diindeks (${source.chunk_count} chunk siap untuk RAG)`,
            );
        } else if (status === 'error') {
            notify('error', `Indeksasi gagal: "${source.filename}". Coba Reindex.`);
        } else if (status === 'done' && (source.chunk_count ?? 0) === 0) {
            notify('warning', `"${source.filename}" selesai tanpa chunk teks. Periksa format file atau konfigurasi embedding.`);
        }
    }
    return next;
}

export function seedSourceStatusMap(sources: StudioSource[]): Map<string, string> {
    return new Map(sources.map((s) => [s.id, s.parse_status]));
}
