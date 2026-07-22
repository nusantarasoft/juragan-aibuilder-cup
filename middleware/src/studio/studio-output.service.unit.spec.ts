import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { StudioOutputService } from './studio-output.service';

// A chainable + thenable Supabase query stub. Every builder method returns the
// same chain; terminal `.order()`/`.single()` resolve to `result`, and the chain
// itself is awaitable (for `.delete().eq()`).
function makeChain(result: any) {
    const chain: any = {
        from: () => chain,
        select: () => chain,
        insert: () => chain,
        delete: () => chain,
        eq: () => chain,
        order: () => Promise.resolve(result),
        single: () => Promise.resolve(result),
        then: (res: any, rej: any) => Promise.resolve(result).then(res, rej),
    };
    return chain;
}

function buildService(opts: {
    result?: any;
    retrieval?: any;
    generate?: (p: string) => Promise<string>;
} = {}) {
    const chain = makeChain(opts.result ?? { data: null, error: null });
    const supabaseService = { getAdminClient: () => chain };
    const contextService = {
        retrieveContext: vi.fn(async () => ({
            fileContext: 'FCTX',
            dbContext: 'DBCTX',
            ...(opts.retrieval ?? {}),
        })),
    };
    const dbContextService = {};
    const svc = new StudioOutputService(
        supabaseService as any,
        contextService as any,
        dbContextService as any,
    );
    const generate =
        opts.generate ?? vi.fn(async (p: string) => `GEN:${p.slice(0, 5)}`);
    return { svc, contextService, generate };
}

describe('StudioOutputService', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('listOutputs', () => {
        it('mengembalikan data', async () => {
            const { svc } = buildService({ result: { data: [{ id: 'o1' }], error: null } });
            expect(await svc.listOutputs('nb1')).toEqual([{ id: 'o1' }]);
        });

        it('tabel hilang (42P01) → array kosong', async () => {
            const { svc } = buildService({
                result: { data: null, error: { code: '42P01' } },
            });
            expect(await svc.listOutputs('nb1')).toEqual([]);
        });

        it('error lain → throw', async () => {
            const { svc } = buildService({
                result: { data: null, error: { code: 'XX', message: 'boom' } },
            });
            await expect(svc.listOutputs('nb1')).rejects.toBeTruthy();
        });

        it('data null → array kosong', async () => {
            const { svc } = buildService({ result: { data: null, error: null } });
            expect(await svc.listOutputs('nb1')).toEqual([]);
        });
    });

    describe('getOutput', () => {
        it('mengembalikan data', async () => {
            const { svc } = buildService({ result: { data: { id: 'o1' }, error: null } });
            expect(await svc.getOutput('o1')).toEqual({ id: 'o1' });
        });

        it('tidak ada → NotFound', async () => {
            const { svc } = buildService({ result: { data: null, error: null } });
            await expect(svc.getOutput('o1')).rejects.toBeInstanceOf(NotFoundException);
        });

        it('error → NotFound', async () => {
            const { svc } = buildService({
                result: { data: null, error: { message: 'x' } },
            });
            await expect(svc.getOutput('o1')).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('deleteOutput', () => {
        it('sukses → true', async () => {
            const { svc } = buildService({ result: { error: null } });
            expect(await svc.deleteOutput('o1')).toBe(true);
        });

        it('error → throw', async () => {
            const { svc } = buildService({ result: { error: { message: 'x' } } });
            await expect(svc.deleteOutput('o1')).rejects.toBeTruthy();
        });
    });

    describe('saveOutput', () => {
        it('sukses dengan metadata', async () => {
            const { svc } = buildService({ result: { data: { id: 'o1' }, error: null } });
            expect(
                await svc.saveOutput('nb1', 'report', 'T', 'C', { a: 1 }),
            ).toEqual({ id: 'o1' });
        });

        it('sukses tanpa metadata (default {})', async () => {
            const { svc } = buildService({ result: { data: { id: 'o2' }, error: null } });
            expect(await svc.saveOutput('nb1', 'quiz', 'T', 'C')).toEqual({ id: 'o2' });
        });

        it('error → throw', async () => {
            const { svc } = buildService({ result: { error: { message: 'x' } } });
            await expect(svc.saveOutput('nb1', 'faq', 'T', 'C')).rejects.toBeTruthy();
        });
    });

    describe('buildRetrievalContext', () => {
        it('meneruskan sourceIds & mengembalikan context', async () => {
            const { svc, contextService } = buildService();
            const r = await svc.buildRetrievalContext('nb1', 'q', ['s1']);
            expect(r).toEqual({ fileContext: 'FCTX', dbContext: 'DBCTX' });
            expect(contextService.retrieveContext).toHaveBeenCalledWith(
                'nb1',
                'q',
                undefined,
                undefined,
                { sourceIds: ['s1'] },
            );
        });
    });

    describe('generator dengan fileContext ADA', () => {
        it('mind map: konten dari generateText', async () => {
            const { svc } = buildService();
            const r = await svc.generateMindMap('nb1', 'Toko', async () => '# Peta');
            expect(r.title).toBe('Mind Map — Toko');
            expect(r.content).toBe('# Peta');
        });

        it('quiz', async () => {
            const { svc } = buildService();
            const r = await svc.generateQuiz('nb1', 'Toko', async () => 'Q');
            expect(r.title).toBe('Quiz — Toko');
            expect(r.content).toBe('Q');
        });

        it('faq', async () => {
            const { svc } = buildService();
            const r = await svc.generateFaq('nb1', 'Toko', async () => 'F');
            expect(r.title).toBe('FAQ — Toko');
        });

        it('flashcards: judul & prompt minta JSON cards', async () => {
            const { svc } = buildService();
            let seen = '';
            const r = await svc.generateFlashcards('nb1', 'Toko', async (p) => {
                seen = p;
                return '{"cards":[]}';
            });
            expect(r.title).toBe('Flashcards — Toko');
            expect(seen).toContain('"cards"');
        });

        it('audio script', async () => {
            const { svc } = buildService();
            const r = await svc.generateAudioScript('nb1', 'Toko', async () => 'A');
            expect(r.title).toBe('Audio Script — Toko');
        });

        it('audio script: durasi long & fokus masuk ke prompt', async () => {
            const { svc } = buildService();
            let seen = '';
            await svc.generateAudioScript('nb1', 'Toko', async (p) => {
                seen = p;
                return 'A';
            }, undefined, { length: 'long', focus: 'tren penjualan' });
            expect(seen).toContain('~10 menit');
            expect(seen).toContain('tren penjualan');
        });

        it('audio script: durasi short', async () => {
            const { svc } = buildService();
            let seen = '';
            await svc.generateAudioScript('nb1', 'Toko', async (p) => {
                seen = p;
                return 'A';
            }, undefined, { length: 'short' });
            expect(seen).toContain('~3 menit');
        });

        it('data table', async () => {
            const { svc } = buildService();
            const r = await svc.generateDataTable('nb1', 'Toko', 'harga', async () => 'D');
            expect(r.title).toBe('Data Table — Toko');
        });

        it('video overview: judul & prompt minta JSON slides', async () => {
            const { svc } = buildService();
            let seen = '';
            const r = await svc.generateVideoOverview('nb1', 'Toko', async (p) => {
                seen = p;
                return '{"title":"T","slides":[]}';
            });
            expect(r.title).toBe('Video Overview — Toko');
            expect(seen).toContain('VIDEO OVERVIEW');
            expect(seen).toContain('"slides"');
            expect(seen).toContain('narration');
        });

        it('video overview: meneruskan sourceIds', async () => {
            const { svc, contextService } = buildService();
            await svc.generateVideoOverview('nb1', 'Toko', async () => '{}', ['s1']);
            expect(contextService.retrieveContext).toHaveBeenCalledWith(
                'nb1',
                expect.stringContaining('Toko'),
                undefined,
                undefined,
                { sourceIds: ['s1'] },
            );
        });
    });

    describe('generateReportPreset', () => {
        it('study guide: judul berlabel & prompt memuat instruksi study guide', async () => {
            const { svc } = buildService();
            let seenPrompt = '';
            const r = await svc.generateReportPreset('nb1', 'Toko', 'study_guide', async (p) => {
                seenPrompt = p;
                return '# SG';
            });
            expect(r.title).toBe('Study Guide — Toko');
            expect(r.content).toBe('# SG');
            expect(seenPrompt).toContain('PANDUAN BELAJAR');
            expect(seenPrompt).toContain('## Sumber');
        });

        it('briefing/timeline/blog: label judul benar', async () => {
            const { svc } = buildService();
            expect((await svc.generateReportPreset('nb1', 'T', 'briefing_doc', async () => 'x')).title)
                .toBe('Briefing Doc — T');
            expect((await svc.generateReportPreset('nb1', 'T', 'timeline', async () => 'x')).title)
                .toBe('Timeline — T');
            expect((await svc.generateReportPreset('nb1', 'T', 'blog_post', async () => 'x')).title)
                .toBe('Blog Post — T');
        });

        it('konten kosong → fallback berlabel', async () => {
            const { svc } = buildService({ retrieval: { fileContext: '', dbContext: '' } });
            const r = await svc.generateReportPreset('nb1', 'Toko', 'timeline', async () => '');
            expect(r.content).toBe('# Timeline\n\n(Tidak ada konten)');
        });

        it('meneruskan sourceIds ke retrieval', async () => {
            const { svc, contextService } = buildService();
            await svc.generateReportPreset('nb1', 'Toko', 'blog_post', async () => 'x', ['s1', 's2']);
            expect(contextService.retrieveContext).toHaveBeenCalledWith(
                'nb1',
                expect.stringContaining('Toko'),
                undefined,
                undefined,
                { sourceIds: ['s1', 's2'] },
            );
        });
    });

    describe('generator dengan fileContext KOSONG', () => {
        const empty = { retrieval: { fileContext: '', dbContext: '' } };

        it('mind map kosong → fallback konten', async () => {
            const { svc } = buildService(empty);
            const r = await svc.generateMindMap('nb1', 'Toko', async () => '');
            expect(r.content).toBe('# Mind Map\n\n(Tidak ada konten)');
        });

        it('quiz/faq/audio/data-table jalan tanpa sumber', async () => {
            const { svc } = buildService(empty);
            expect((await svc.generateQuiz('nb1', 'T', async () => 'q')).content).toBe('q');
            expect((await svc.generateFaq('nb1', 'T', async () => 'f')).content).toBe('f');
            expect(
                (await svc.generateAudioScript('nb1', 'T', async () => 'a')).content,
            ).toBe('a');
            expect(
                (await svc.generateDataTable('nb1', 'T', 'x', async () => 'd')).content,
            ).toBe('d');
        });
    });
});
