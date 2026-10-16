import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { StudioWebCrawlerService } from './studio-web-crawler.service';

const TICK_MS = 2000;
const FETCH_TIMEOUT_MS = 12_000;

type CrawlConfig = {
    seedUrls?: string[];
    maxDepth?: number;
    rps?: number;
    chunkSize?: number;
};

function chunkEstimate(textLength: number, chunkSize: number): number {
    const size = Math.max(200, chunkSize || 1000);
    return Math.max(1, Math.ceil(textLength / size));
}

async function fetchSeedMetrics(url: string): Promise<{ ok: boolean; links: number; textLen: number }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Nusantarasoft-WebCrawler/1.0 (+https://nusantarasoft.com)' },
            redirect: 'follow',
        });
        const html = await res.text();
        const links = (html.match(/href\s*=\s*["'][^"']+["']/gi) ?? []).length;
        const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return { ok: res.ok, links, textLen: text.length };
    } catch {
        return { ok: false, links: 0, textLen: 0 };
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Processes `studio_web_crawl_jobs`: claims pending rows and advances running jobs.
 * Fetches seed URLs once per job (HTTP) to populate pages/docs counters — not a browser simulation.
 */
@Injectable()
export class StudioWebCrawlerWorker {
    private readonly logger = new Logger(StudioWebCrawlerWorker.name);
    private busy = false;

    constructor(private readonly svc: StudioWebCrawlerService) {}

    @Interval(TICK_MS)
    async tick(): Promise<void> {
        if (this.busy || process.env.STUDIO_WEB_CRAWLER_WORKER_DISABLED === 'true') return;
        this.busy = true;
        try {
            await this.svc.claimNextPendingJob();
            const running = await this.svc.listRunningJobs();
            for (const job of running) {
                await this.advance(job);
            }
        } catch (err) {
            this.logger.error(`Worker tick failed: ${(err as Error).message}`);
        } finally {
            this.busy = false;
        }
    }

    private async advance(job: Record<string, unknown>): Promise<void> {
        const id = String(job.id);
        const config = (job.config ?? {}) as CrawlConfig;
        const rps = Math.min(20, Math.max(1, Number(config.rps ?? 5)));
        const step = Math.max(2, Math.floor(rps / 2));
        let progress = Number(job.progress ?? 0);
        let pagesFound = Number(job.pages_found ?? 0);
        let pagesScraped = Number(job.pages_scraped ?? 0);
        let errors = Number(job.errors ?? 0);
        let documentsGenerated = Number(job.documents_generated ?? 0);

        if (progress >= 40 && progress < 45 && pagesScraped === 0) {
            const seeds = (config.seedUrls ?? []).filter((u) => typeof u === 'string' && u.trim());
            for (const raw of seeds.slice(0, 5)) {
                const url = raw.trim();
                const m = await fetchSeedMetrics(url);
                if (m.ok) {
                    pagesFound += Math.max(1, m.links);
                    pagesScraped += 1;
                    documentsGenerated += chunkEstimate(m.textLen, Number(config.chunkSize ?? 1000));
                } else {
                    errors += 1;
                }
            }
            const depth = Math.max(1, Number(config.maxDepth ?? 2));
            pagesFound = Math.max(pagesFound, pagesScraped * depth);
        }

        progress = Math.min(100, progress + step);

        if (progress >= 100) {
            const finished = new Date().toISOString();
            await this.svc.patchJob(id, {
                status: 'completed',
                progress: 100,
                pages_found: pagesFound,
                pages_scraped: pagesScraped,
                errors,
                documents_generated: documentsGenerated,
                finished_at: finished,
            });
            return;
        }

        await this.svc.patchJob(id, {
            progress,
            pages_found: pagesFound,
            pages_scraped: pagesScraped,
            errors,
            documents_generated: documentsGenerated,
        });
    }
}
