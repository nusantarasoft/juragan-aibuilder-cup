import { describe, expect, it } from 'vitest';
import { resolveSourceStorage } from './studio-source-storage.util';

describe('resolveSourceStorage', () => {
    const defaultBucket = 'cms-media';

    it('uses media bucket for library-linked sources', () => {
        const ref = resolveSourceStorage(
            { media_id: 'm1', s3_key: 'docs/file.docx' },
            { s3_key: 'docs/file.docx', bucket_name: 'percontohan', filename: 'file.docx' },
            defaultBucket,
        );
        expect(ref).toEqual({ fileKey: 'docs/file.docx', bucket: 'percontohan' });
    });

    it('prefers persisted source.bucket_name over media row', () => {
        const ref = resolveSourceStorage(
            { s3_key: 'docs/file.docx', bucket_name: 'archived-bucket' },
            { s3_key: 'docs/file.docx', bucket_name: 'percontohan' },
            defaultBucket,
        );
        expect(ref).toEqual({ fileKey: 'docs/file.docx', bucket: 'archived-bucket' });
    });

    it('falls back to default bucket for direct uploads', () => {
        const ref = resolveSourceStorage(
            { s3_key: 'studio/nb1/report.pdf' },
            null,
            defaultBucket,
        );
        expect(ref).toEqual({ fileKey: 'studio/nb1/report.pdf', bucket: 'cms-media' });
    });

    it('falls back to filename when s3_key is missing on media row', () => {
        const ref = resolveSourceStorage(
            { media_id: 'm1' },
            { filename: 'slides.pptx', bucket_name: 'tenant-a' },
            defaultBucket,
        );
        expect(ref).toEqual({ fileKey: 'slides.pptx', bucket: 'tenant-a' });
    });

    it('uses default bucket when media row has no bucket_name', () => {
        const ref = resolveSourceStorage(
            { media_id: 'm1' },
            { s3_key: 'docs/a.pdf', filename: 'a.pdf' },
            defaultBucket,
        );
        expect(ref?.bucket).toBe('cms-media');
    });

    it('returns null when no storage key is available', () => {
        expect(resolveSourceStorage({ media_id: 'm1' }, { filename: '  ' }, defaultBucket)).toBeNull();
        expect(resolveSourceStorage({}, null, defaultBucket)).toBeNull();
    });
});
