import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StudioWebCrawlerWorker } from './studio-web-crawler.worker';
import type { StudioWebCrawlerService } from './studio-web-crawler.service';

describe('StudioWebCrawlerWorker', () => {
    let worker: StudioWebCrawlerWorker;
    let svc: {
        claimNextPendingJob: ReturnType<typeof vi.fn>;
        listRunningJobs: ReturnType<typeof vi.fn>;
        patchJob: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        svc = {
            claimNextPendingJob: vi.fn().mockResolvedValue(null),
            listRunningJobs: vi.fn().mockResolvedValue([]),
            patchJob: vi.fn().mockResolvedValue(undefined),
        };
        worker = new StudioWebCrawlerWorker(svc as unknown as StudioWebCrawlerService);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            text: async () => '<html><a href="/a">x</a><p>hello world content</p></html>',
        }));
    });

    it('advances running job progress', async () => {
        svc.listRunningJobs.mockResolvedValue([
            {
                id: 'j1',
                progress: 10,
                pages_found: 0,
                pages_scraped: 0,
                errors: 0,
                documents_generated: 0,
                config: { seedUrls: ['https://example.com'], rps: 4, chunkSize: 500 },
            },
        ]);
        await worker.tick();
        expect(svc.patchJob).toHaveBeenCalledWith(
            'j1',
            expect.objectContaining({ progress: expect.any(Number) }),
        );
    });

    it('skips tick when worker disabled', async () => {
        process.env.STUDIO_WEB_CRAWLER_WORKER_DISABLED = 'true';
        await worker.tick();
        expect(svc.claimNextPendingJob).not.toHaveBeenCalled();
        delete process.env.STUDIO_WEB_CRAWLER_WORKER_DISABLED;
    });
});
