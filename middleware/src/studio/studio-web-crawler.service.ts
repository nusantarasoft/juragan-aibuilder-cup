import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { assertNoSupabaseError } from './studio-supabase.util';
import type { StudioWebCrawlJob } from './studio-web-crawler.types';

type Row = Record<string, unknown>;

function rowToJob(row: Row): StudioWebCrawlJob {
    return {
        id: String(row.id),
        tenantId: String(row.tenant_id),
        name: String(row.name),
        status: String(row.status),
        config: (row.config as Record<string, unknown>) ?? {},
        progress: Number(row.progress ?? 0),
        pagesFound: Number(row.pages_found ?? 0),
        pagesScraped: Number(row.pages_scraped ?? 0),
        errors: Number(row.errors ?? 0),
        documentsGenerated: Number(row.documents_generated ?? 0),
        errorMessage: row.error_message ? String(row.error_message) : undefined,
        startTime: row.started_at ? String(row.started_at) : undefined,
        endTime: row.finished_at ? String(row.finished_at) : undefined,
        createdAt: row.created_at ? String(row.created_at) : undefined,
    };
}

@Injectable()
export class StudioWebCrawlerService {
    constructor(private readonly supabase: SupabaseService) {}

    private db() {
        return this.supabase.getAdminClient();
    }

    async listJobs(tenantId: string): Promise<StudioWebCrawlJob[]> {
        const { data, error } = await this.db()
            .from('studio_web_crawl_jobs')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });
        assertNoSupabaseError(error);
        return (data ?? []).map((r) => rowToJob(r as Row));
    }

    async createJob(tenantId: string, name: string, config: Record<string, unknown>, createdBy?: string | null): Promise<StudioWebCrawlJob> {
        const { data, error } = await this.db()
            .from('studio_web_crawl_jobs')
            .insert({
                tenant_id: tenantId,
                name,
                config,
                status: 'pending',
                progress: 0,
                created_by: createdBy ?? null,
            })
            .select('*')
            .single();
        assertNoSupabaseError(error);
        return rowToJob(data as Row);
    }

    async deleteJob(tenantId: string, jobId: string): Promise<boolean> {
        const existing = await this.getJobRow(jobId);
        if (String(existing.tenant_id) !== tenantId) {
            throw new ForbiddenException('You do not have access to this crawl job');
        }
        const { error } = await this.db().from('studio_web_crawl_jobs').delete().eq('id', jobId);
        assertNoSupabaseError(error);
        return true;
    }

    /** Stop a pending or running job (worker ignores non-running rows). */
    async stopJob(tenantId: string, jobId: string): Promise<StudioWebCrawlJob> {
        const existing = await this.getJobRow(jobId);
        if (String(existing.tenant_id) !== tenantId) {
            throw new ForbiddenException('You do not have access to this crawl job');
        }
        const status = String(existing.status);
        if (status !== 'pending' && status !== 'running') {
            throw new BadRequestException('Only pending or running crawl jobs can be stopped');
        }
        const finished = new Date().toISOString();
        await this.patchJob(jobId, {
            status: 'paused',
            finished_at: finished,
            error_message: status === 'running' ? 'Stopped by user' : null,
        });
        return rowToJob(await this.getJobRow(jobId));
    }

    async getJobRow(jobId: string): Promise<Row> {
        const { data, error } = await this.db().from('studio_web_crawl_jobs').select('*').eq('id', jobId).maybeSingle();
        assertNoSupabaseError(error);
        if (!data) throw new NotFoundException('Crawl job not found');
        return data as Row;
    }

    /** Claim the oldest pending job for processing (worker). */
    async claimNextPendingJob(): Promise<Row | null> {
        const { data: pending, error } = await this.db()
            .from('studio_web_crawl_jobs')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
        assertNoSupabaseError(error);
        if (!pending) return null;

        const now = new Date().toISOString();
        const { data: claimed, error: updErr } = await this.db()
            .from('studio_web_crawl_jobs')
            .update({ status: 'running', started_at: now, updated_at: now })
            .eq('id', pending.id)
            .eq('status', 'pending')
            .select('*')
            .maybeSingle();
        assertNoSupabaseError(updErr);
        return (claimed as Row) ?? null;
    }

    async listRunningJobs(limit = 8): Promise<Row[]> {
        const { data, error } = await this.db()
            .from('studio_web_crawl_jobs')
            .select('*')
            .eq('status', 'running')
            .order('updated_at', { ascending: true })
            .limit(limit);
        assertNoSupabaseError(error);
        return (data ?? []) as Row[];
    }

    async patchJob(jobId: string, patch: Record<string, unknown>): Promise<void> {
        const { error } = await this.db()
            .from('studio_web_crawl_jobs')
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq('id', jobId);
        assertNoSupabaseError(error);
    }
}
