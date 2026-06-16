import { describe, expect, it, vi } from 'vitest';
import type { StudioSource } from '@/lib/studioService';
import {
    getSourceProgressPercent,
    getSourceStatusTag,
    isSourceIndexed,
    isSourceInProgress,
    resolveIngestStage,
    seedSourceStatusMap,
    summarizeSources,
    trackSourceStatusChanges,
} from './studioSourceStatus';

function source(partial: Partial<StudioSource> & Pick<StudioSource, 'id' | 'filename'>): StudioSource {
    return {
        notebook_id: 'nb-1',
        file_type: 'pdf',
        file_size: 1000,
        parse_status: 'pending',
        parse_progress: 0,
        chunk_count: 0,
        created_at: new Date().toISOString(),
        ...partial,
    };
}

describe('studioSourceStatus', () => {
    it('marks done sources with chunks as indexed', () => {
        const s = source({ id: '1', filename: 'a.pdf', parse_status: 'done', chunk_count: 3 });
        expect(isSourceIndexed(s)).toBe(true);
        expect(getSourceStatusTag(s).color).toBe('success');
    });

    it('summarizes mixed source states', () => {
        const stats = summarizeSources([
            source({ id: '1', filename: 'a.pdf', parse_status: 'done', chunk_count: 2 }),
            source({ id: '2', filename: 'b.pdf', parse_status: 'parsing', parse_stage: 'embedding' }),
            source({ id: '3', filename: 'c.pdf', parse_status: 'error' }),
        ]);
        expect(stats.total).toBe(3);
        expect(stats.indexed).toBe(1);
        expect(stats.inProgress).toBe(1);
        expect(stats.errors).toBe(1);
        expect(stats.allIndexed).toBe(false);
        expect(stats.anyIndexed).toBe(true);
    });

    it('resolves ingest stage from parse_stage', () => {
        expect(resolveIngestStage(source({ id: '1', filename: 'x', parse_stage: 'chunking' }))).toBe('chunking');
        expect(resolveIngestStage(source({ id: '2', filename: 'y', parse_status: 'pending' }))).toBe('queued');
    });

    it('computes progress percent for parsing', () => {
        const s = source({ id: '1', filename: 'x', parse_status: 'parsing', parse_progress: 0.42 });
        expect(getSourceProgressPercent(s)).toBe(42);
    });

    it('notifies on transition to indexed', () => {
        const notify = vi.fn();
        const prev = seedSourceStatusMap([
            source({ id: '1', filename: 'doc.pdf', parse_status: 'parsing' }),
        ]);
        const next = trackSourceStatusChanges(
            prev,
            [source({ id: '1', filename: 'doc.pdf', parse_status: 'done', chunk_count: 5 })],
            notify,
        );
        expect(next.get('1')).toBe('done');
        expect(notify).toHaveBeenCalledWith('success', expect.stringContaining('doc.pdf'));
    });

    it('detects in-progress sources', () => {
        expect(isSourceInProgress(source({ id: '1', filename: 'x', parse_status: 'pending' }))).toBe(true);
        expect(isSourceInProgress(source({ id: '2', filename: 'y', parse_status: 'done', chunk_count: 1 }))).toBe(
            false,
        );
    });
});
