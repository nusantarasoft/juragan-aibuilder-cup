import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { AiRouterService } from '../ai/ai-router.service';
import { RagService } from '../rag/rag.service';
import { StudioService } from './studio.service';
import { StudioContextService } from './studio-context.service';
import { assertNoSupabaseError } from './studio-supabase.util';
import { STUDIO_RESEARCH_TOPICS } from './studio-research-topics';
import {
    buildMergeProvenanceBody,
    classifyDedupeHits,
    finalizeResearchLlmResponse,
    htmlOrPlainToText,
    isAllowedResearchUrl,
    quotedSnippetInSource,
    sha256Hex,
    type ResearchDedupeResult,
    type ResearchLlmPayload,
    type ResearchSourceRecord,
    validateResearchSources,
} from './studio-research.util';
import type { GenerateTextOpts } from '../ai/ai-router.service';
import { normalizeAppRole } from '../auth/app-roles';

export type StudioResearchItemStatus =
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'merged'
    | 'expired';

export type StudioResearchRunStatus = 'running' | 'completed' | 'failed' | 'partial';

export interface StudioResearchRunRow {
    id: string;
    trigger_type: 'cron' | 'manual';
    triggered_by: string | null;
    status: StudioResearchRunStatus;
    stats: Record<string, unknown>;
    error_message: string | null;
    started_at: string;
    finished_at: string | null;
}

export interface StudioResearchItemRow {
    id: string;
    status: StudioResearchItemStatus;
    category: string;
    topic_key: string;
    target_notebook_id: string;
    title: string;
    summary: string;
    effective_date: string | null;
    supersedes_url: string | null;
    sources: ResearchSourceRecord[];
    dedupe_hits: ResearchDedupeResult | null;
    validation_flags: Record<string, unknown> | null;
    research_run_id: string | null;
    reject_reason: string | null;
    reviewer_id: string | null;
    decided_at: string | null;
    merged_source_id: string | null;
    created_at: string;
    updated_at: string;
}

@Injectable()
export class StudioResearchService {
    private readonly logger = new Logger(StudioResearchService.name);
    private runInProgress = false;

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly config: ConfigService,
        private readonly aiRouter: AiRouterService,
        private readonly ragService: RagService,
        private readonly studioService: StudioService,
        private readonly contextService: StudioContextService,
    ) {}

    private admin() {
        return this.supabaseService.getAdminClient();
    }

    assertSuperAdmin(role?: string | null): void {
        if (normalizeAppRole(role) !== 'super_admin') {
            throw new ForbiddenException(
                'Hanya super admin Nusantarasoft yang dapat mengakses Riset Knowledge',
            );
        }
    }

    defaultTargetNotebookId(): string {
        const fromEnv = (this.config.get('KASIR_CONSULT_NOTEBOOK_ID') ?? '').toString().trim();
        if (!fromEnv) {
            throw new BadRequestException(
                'KASIR_CONSULT_NOTEBOOK_ID belum diset — tidak ada notebook kurikulum target.',
            );
        }
        return fromEnv;
    }

    async getLastRun(): Promise<StudioResearchRunRow | null> {
        const { data, error } = await this.admin()
            .from('studio_research_runs')
            .select('*')
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        assertNoSupabaseError(error, 'Failed to load last research run');
        return (data as StudioResearchRunRow | null) ?? null;
    }

    async listItems(
        status: StudioResearchItemStatus | 'all' = 'pending',
        category?: string | null,
    ): Promise<StudioResearchItemRow[]> {
        let q = this.admin()
            .from('studio_research_items')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
        if (status && status !== 'all') q = q.eq('status', status);
        if (category?.trim()) q = q.eq('category', category.trim());
        const { data, error } = await q;
        assertNoSupabaseError(error, 'Failed to list research items');
        return (data || []) as StudioResearchItemRow[];
    }

    async getById(id: string): Promise<StudioResearchItemRow> {
        const { data, error } = await this.admin()
            .from('studio_research_items')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        assertNoSupabaseError(error, 'Failed to load research item');
        if (!data) throw new NotFoundException('Research item not found');
        return data as StudioResearchItemRow;
    }

    async updateItem(
        id: string,
        patch: { title?: string; summary?: string },
        actorId: string,
    ): Promise<StudioResearchItemRow> {
        this.logger.log(`Research item ${id} edited by ${actorId}`);
        const row = await this.getById(id);
        if (!['pending', 'approved'].includes(row.status)) {
            throw new BadRequestException('Hanya item pending/approved yang bisa diedit.');
        }
        const title = patch.title?.trim() || row.title;
        const summary = patch.summary?.trim() || row.summary;
        if (summary.length < 20) {
            throw new BadRequestException('Ringkasan terlalu pendek.');
        }
        const { data, error } = await this.admin()
            .from('studio_research_items')
            .update({ title, summary, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('*')
            .single();
        assertNoSupabaseError(error, 'Failed to update research item');
        return data as StudioResearchItemRow;
    }

    async reject(id: string, reviewerId: string, reason?: string): Promise<StudioResearchItemRow> {
        const row = await this.getById(id);
        if (row.status !== 'pending') {
            throw new BadRequestException('Hanya item pending yang bisa ditolak.');
        }
        const now = new Date().toISOString();
        const { data, error } = await this.admin()
            .from('studio_research_items')
            .update({
                status: 'rejected',
                reject_reason: reason?.trim() || null,
                reviewer_id: reviewerId,
                decided_at: now,
                updated_at: now,
            })
            .eq('id', id)
            .select('*')
            .single();
        assertNoSupabaseError(error, 'Failed to reject research item');
        this.logger.log(`Research item ${id} rejected by ${reviewerId}`);
        return data as StudioResearchItemRow;
    }

    async approveAndMerge(id: string, reviewerId: string): Promise<StudioResearchItemRow> {
        const row = await this.getById(id);
        if (row.status !== 'pending') {
            throw new BadRequestException('Hanya item pending yang bisa disetujui.');
        }
        const flags = row.validation_flags as { quote_validation_failed?: boolean } | null;
        if (flags?.quote_validation_failed) {
            throw new BadRequestException(
                'Item gagal validasi kutipan — perbaiki kutipan/summary sebelum merge.',
            );
        }

        const body = buildMergeProvenanceBody({
            title: row.title,
            summary: row.summary,
            sources: row.sources || [],
            researchItemId: row.id,
            approver: reviewerId,
            effectiveDate: row.effective_date,
        });

        const source = await this.studioService.addTextSource(
            row.target_notebook_id,
            `[Riset] ${row.title}`,
            body,
        );

        const now = new Date().toISOString();
        const { data, error } = await this.admin()
            .from('studio_research_items')
            .update({
                status: 'merged',
                merged_source_id: source.id,
                reviewer_id: reviewerId,
                decided_at: now,
                updated_at: now,
            })
            .eq('id', id)
            .select('*')
            .single();
        assertNoSupabaseError(error, 'Failed to mark research item merged');
        this.logger.log(`Research item ${id} merged → source ${source.id} by ${reviewerId}`);
        return data as StudioResearchItemRow;
    }

    async unmerge(id: string, reviewerId: string): Promise<StudioResearchItemRow> {
        const row = await this.getById(id);
        if (row.status !== 'merged' || !row.merged_source_id) {
            throw new BadRequestException('Item belum di-merge atau source tidak ada.');
        }
        await this.studioService.removeSource(row.target_notebook_id, row.merged_source_id);
        const now = new Date().toISOString();
        const { data, error } = await this.admin()
            .from('studio_research_items')
            .update({
                status: 'approved',
                merged_source_id: null,
                reviewer_id: reviewerId,
                decided_at: now,
                updated_at: now,
            })
            .eq('id', id)
            .select('*')
            .single();
        assertNoSupabaseError(error, 'Failed to unmerge research item');
        this.logger.log(`Research item ${id} unmerged by ${reviewerId}`);
        return data as StudioResearchItemRow;
    }

    async expirePendingOlderThanDays(days = 30): Promise<number> {
        const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
        const { data, error } = await this.admin()
            .from('studio_research_items')
            .update({ status: 'expired', updated_at: new Date().toISOString() })
            .eq('status', 'pending')
            .lt('created_at', cutoff)
            .select('id');
        if (error) {
            this.logger.warn(`expirePending research: ${error.message}`);
            return 0;
        }
        const n = data?.length ?? 0;
        if (n > 0) this.logger.log(`Expired ${n} pending research item(s)`);
        return n;
    }

    async runResearchNow(triggeredBy?: string | null): Promise<{ runId: string; itemsCreated: number }> {
        if (this.runInProgress) {
            throw new BadRequestException('Run riset masih berjalan.');
        }
        this.runInProgress = true;
        try {
            return await this.executeResearchRun('manual', triggeredBy ?? null);
        } finally {
            this.runInProgress = false;
        }
    }

    async runResearchCron(): Promise<void> {
        if (this.runInProgress) {
            this.logger.warn('Skipping research cron — manual run in progress');
            return;
        }
        this.runInProgress = true;
        try {
            await this.executeResearchRun('cron', null);
        } catch (e: any) {
            this.logger.error(`Research cron failed: ${e?.message}`, e?.stack);
        } finally {
            this.runInProgress = false;
        }
    }

    private async executeResearchRun(
        triggerType: 'cron' | 'manual',
        triggeredBy: string | null,
    ): Promise<{ runId: string; itemsCreated: number }> {
        let targetNotebook: string;
        try {
            targetNotebook = this.defaultTargetNotebookId();
        } catch (e) {
            this.logger.warn(String((e as Error).message));
            throw e;
        }

        const { data: runRow, error: runErr } = await this.admin()
            .from('studio_research_runs')
            .insert({
                trigger_type: triggerType,
                triggered_by: triggeredBy,
                status: 'running',
            })
            .select('id')
            .single();
        assertNoSupabaseError(runErr, 'Failed to create research run');
        const runId = runRow.id as string;

        let itemsCreated = 0;
        const stats: Record<string, number> = {
            topics: STUDIO_RESEARCH_TOPICS.length,
            fetched: 0,
            skipped: 0,
            errors: 0,
        };
        const topicErrors: Record<string, number> = {};
        const errorSamples: string[] = [];

        try {
            for (const topic of STUDIO_RESEARCH_TOPICS) {
                for (const url of topic.seedUrls) {
                    try {
                        const created = await this.processTopicUrl(
                            runId,
                            topic.topic_key,
                            topic.category,
                            topic.title,
                            url,
                            targetNotebook,
                        );
                        if (created) itemsCreated += 1;
                        else stats.skipped += 1;
                        stats.fetched += 1;
                    } catch (e: any) {
                        stats.errors += 1;
                        topicErrors[topic.topic_key] = (topicErrors[topic.topic_key] ?? 0) + 1;
                        const msg = (e?.message || String(e)).slice(0, 160);
                        if (errorSamples.length < 8) {
                            errorSamples.push(`${topic.topic_key}: ${msg}`);
                        }
                        this.logger.warn(`Research fetch ${url}: ${e?.message || e}`);
                    }
                }
            }
            let runStatus: StudioResearchRunStatus = 'completed';
            if (stats.errors > 0) {
                runStatus = itemsCreated > 0 ? 'partial' : 'failed';
            }
            await this.admin()
                .from('studio_research_runs')
                .update({
                    status: runStatus,
                    error_message:
                        stats.errors > 0 ? errorSamples.join(' | ').slice(0, 500) : null,
                    stats: { ...stats, itemsCreated, topic_errors: topicErrors },
                    finished_at: new Date().toISOString(),
                })
                .eq('id', runId);
        } catch (e: any) {
            await this.admin()
                .from('studio_research_runs')
                .update({
                    status: 'failed',
                    error_message: e?.message?.slice(0, 500),
                    stats,
                    finished_at: new Date().toISOString(),
                })
                .eq('id', runId);
            throw e;
        }

        return { runId, itemsCreated };
    }

    private async processTopicUrl(
        runId: string,
        topicKey: string,
        category: string,
        topicTitle: string,
        url: string,
        targetNotebookId: string,
    ): Promise<boolean> {
        if (!isAllowedResearchUrl(url)) {
            throw new BadRequestException(`URL tidak di allowlist: ${url}`);
        }

        const { text, fetchedAt } = await this.fetchResearchUrl(url);
        if (text.length < 80) {
            throw new BadRequestException('Teks sumber terlalu pendek');
        }

        const contentHash = sha256Hex(text);
        const { data: existingRows } = await this.admin()
            .from('studio_research_items')
            .select('sources, status')
            .eq('topic_key', topicKey)
            .in('status', ['pending', 'merged']);
        for (const row of existingRows ?? []) {
            const srcs = (row.sources || []) as ResearchSourceRecord[];
            if (
                srcs.some((s) => s.url === url && s.content_sha256 === contentHash)
            ) {
                return false;
            }
        }

        const excerpt = text.slice(0, 12_000);
        const llm = await this.summarizeWithLlm(url, topicTitle, excerpt);
        const sources: ResearchSourceRecord[] = (llm.sources || []).map((s) => ({
            url: s.url || url,
            fetched_at: fetchedAt,
            content_sha256: contentHash,
            quoted_snippet: s.quoted_snippet,
        }));

        if (sources.length === 0 || !sources[0].quoted_snippet) {
            sources.length = 0;
            sources.push({
                url,
                fetched_at: fetchedAt,
                content_sha256: contentHash,
                quoted_snippet: excerpt.slice(0, 200).trim(),
            });
        }

        const bodyMap = new Map<string, string>([[url, text]]);
        const validation = validateResearchSources(sources, bodyMap);
        const validation_flags: Record<string, unknown> = {
            quote_validation_failed: !validation.ok,
            invalid_quotes: validation.invalid,
        };

        if (!validation.ok) {
            const firstValid = excerpt.match(/[^\n]{40,200}/)?.[0]?.trim();
            if (firstValid && quotedSnippetInSource(firstValid, text)) {
                sources[0].quoted_snippet = firstValid;
                validation_flags.quote_validation_failed = false;
                validation_flags.invalid_quotes = [];
            }
        }

        const { dedupe, dedupeUnchecked } = await this.computeDedupe(
            targetNotebookId,
            llm.summary,
        );
        if (dedupeUnchecked) {
            validation_flags.dedupe_unchecked = true;
        }

        const title = (llm.title || topicTitle).slice(0, 500);
        const summary = llm.summary.slice(0, 8000);

        const { error } = await this.admin().from('studio_research_items').insert({
            status: 'pending',
            category,
            topic_key: topicKey,
            target_notebook_id: targetNotebookId,
            title,
            summary,
            effective_date: llm.effective_date || null,
            sources,
            dedupe_hits: dedupe,
            validation_flags,
            research_run_id: runId,
        });
        assertNoSupabaseError(error, 'Failed to insert research item');
        return true;
    }

    private async fetchResearchUrl(url: string): Promise<{ text: string; fetchedAt: string }> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25_000);
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': 'Nusantarasoft-AI-Studio-Research/1.0' },
                signal: controller.signal,
                redirect: 'follow',
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const fetchedAt = new Date().toISOString();
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('pdf') || url.toLowerCase().includes('.pdf')) {
                const buf = Buffer.from(await res.arrayBuffer());
                const text = await this.ragService.extractDocumentText(
                    buf,
                    'application/pdf',
                    'research.pdf',
                );
                return { text, fetchedAt };
            }
            const raw = await res.text();
            return { text: htmlOrPlainToText(raw, ct), fetchedAt };
        } finally {
            clearTimeout(timeout);
        }
    }

    private researchLlmGenerateOpts(): GenerateTextOpts | undefined {
        const provider = (this.config.get('STUDIO_RESEARCH_PROVIDER') ?? '').toString().trim();
        const model = (this.config.get('STUDIO_RESEARCH_MODEL') ?? '').toString().trim();
        if (!provider && !model) return undefined;
        return {
            ...(provider ? { provider } : {}),
            ...(model ? { model } : {}),
        };
    }

    private static researchLlmBackoffMs = 1500;

    private async summarizeWithLlm(
        url: string,
        topicTitle: string,
        excerpt: string,
    ): Promise<ResearchLlmPayload> {
        const prompt = `Anda analis regulasi UMKM Indonesia. Ringkas teks resmi berikut untuk admin (bahasa Indonesia).
Aturan KETAT:
- Setiap klaim di field summary harus bisa dibuktikan dengan quoted_snippet yang disalin VERBATIM (substring persis) dari TEKS SUMBER di bawah.
- quoted_snippet minimal 30 karakter, maksimal 400 karakter.
- Jangan menambah fakta di luar teks.
- Output HANYA JSON valid (tanpa markdown):

{
  "title": "judul singkat",
  "summary": "2-4 kalimat operasional untuk UMKM",
  "effective_date": "YYYY-MM-DD atau null",
  "sources": [{ "url": "${url}", "quoted_snippet": "..." }]
}

Topik: ${topicTitle}
URL: ${url}

TEKS SUMBER (potongan):
${excerpt.slice(0, 10_000)}`;

        const opts = this.researchLlmGenerateOpts();
        const callLlm = async () => {
            const raw = await this.aiRouter.generateText(prompt, opts);
            return finalizeResearchLlmResponse(raw);
        };
        try {
            return await callLlm();
        } catch (first) {
            await new Promise((r) => setTimeout(r, StudioResearchService.researchLlmBackoffMs));
            try {
                return await callLlm();
            } catch (second) {
                const a = first instanceof Error ? first.message : String(first);
                const b = second instanceof Error ? second.message : String(second);
                throw new Error(`LLM ringkasan gagal (2x): ${b || a}`);
            }
        }
    }

    private async computeDedupe(
        notebookId: string,
        summary: string,
    ): Promise<{ dedupe: ResearchDedupeResult; dedupeUnchecked: boolean }> {
        const dupTh = Number(this.config.get('STUDIO_RESEARCH_DUPLICATE_THRESHOLD') ?? 0.88);
        const confTh = Number(this.config.get('STUDIO_RESEARCH_CONFLICT_THRESHOLD') ?? 0.78);
        const embedding = await this.ragService.embedText(summary);
        if (!embedding) {
            this.logger.warn(
                `Research dedupe skipped — embedding unavailable for notebook ${notebookId}`,
            );
            return {
                dedupeUnchecked: true,
                dedupe: { flags: [], hits: [] },
            };
        }
        const hits = await this.contextService.semanticSearchNotebook(notebookId, summary, 6);
        return {
            dedupeUnchecked: false,
            dedupe: classifyDedupeHits(hits, dupTh, confTh),
        };
    }
}
