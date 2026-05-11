import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { Cron, CronExpression } from '@nestjs/schedule';

// ── Built-in Sentiment Engine ────────────────────────────
const POS_WORDS = new Set(['good','great','excellent','amazing','positive','growth','profit','success','innovative','strong','increase','improve','win','best','top','leading','surge','boom','gain','rise','upgrade','breakthrough','milestone','record','outperform']);
const NEG_WORDS = new Set(['bad','poor','terrible','negative','loss','fail','decline','weak','decrease','crash','worst','drop','risk','threat','lawsuit','scandal','bankruptcy','layoff','downturn','plunge','slump','crisis','fraud','violation','penalty']);

function analyzeSentiment(text: string): { score: number; label: string; magnitude: number; keywords: string[] } {
    if (!text) return { score: 0, label: 'neutral', magnitude: 0, keywords: [] };
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    let pos = 0, neg = 0; const kw: string[] = [];
    for (const w of words) {
        if (POS_WORDS.has(w)) { pos++; if (!kw.includes(w)) kw.push(w); }
        if (NEG_WORDS.has(w)) { neg++; if (!kw.includes(w)) kw.push(w); }
    }
    const total = pos + neg || 1;
    const score = Math.round(((pos - neg) / total) * 100) / 100;
    const magnitude = Math.round(Math.min(total / Math.max(words.length, 1) * 5, 1) * 100) / 100;
    const label = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral';
    return { score, label, magnitude, keywords: kw.slice(0, 10) };
}

// ── Simple RSS Parser ────────────────────────────────────
function parseRssItems(xml: string): Array<{title:string;link:string;description:string;pubDate:string;author:string}> {
    const items: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];
        const get = (tag: string) => { const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')); return m ? (m[1] || m[2] || '').trim() : ''; };
        items.push({ title: get('title'), link: get('link'), description: get('description') || get('content:encoded'), pubDate: get('pubDate') || get('dc:date'), author: get('author') || get('dc:creator') });
    }
    return items;
}

@Injectable()
export class NewsService {
    private readonly logger = new Logger(NewsService.name);
    constructor(private supabaseService: SupabaseService) {}
    private get db() { return this.supabaseService.getAdminClient(); }

    // ─── SOURCES ─────────────────────────────────────────
    async getSources(tenantId: string) { const { data, error } = await this.db.from('news_sources').select('*').eq('tenant_id', tenantId).order('name'); if (error) throw error; return data; }
    async createSource(tenantId: string, input: any) { const { data, error } = await this.db.from('news_sources').insert({ tenant_id: tenantId, name: input.name, source_type: input.sourceType || 'rss', url: input.url, config: input.config || {}, category: input.category || 'general', language: input.language || 'en', crawl_schedule: input.crawlSchedule || '0 */6 * * *', is_active: input.isActive ?? true, created_by: input.createdBy }).select().single(); if (error) throw error; return data; }
    async updateSource(id: string, input: any) { const u: any = { updated_at: new Date().toISOString() }; for (const [k, c] of Object.entries({ name:'name', sourceType:'source_type', url:'url', config:'config', category:'category', crawlSchedule:'crawl_schedule', isActive:'is_active' })) { if (input[k] !== undefined) u[c] = input[k]; } const { data, error } = await this.db.from('news_sources').update(u).eq('id', id).select().single(); if (error) throw error; return data; }
    async deleteSource(id: string) { const { error } = await this.db.from('news_sources').delete().eq('id', id); if (error) throw error; return true; }

    // ─── ARTICLES ────────────────────────────────────────
    async getArticles(tenantId: string, filters?: { sourceId?: string; category?: string; sentiment?: string; search?: string; status?: string }) {
        let q = this.db.from('news_articles').select('*').eq('tenant_id', tenantId);
        if (filters?.sourceId) q = q.eq('source_id', filters.sourceId);
        if (filters?.category) q = q.eq('category', filters.category);
        if (filters?.sentiment) q = q.eq('sentiment_label', filters.sentiment);
        if (filters?.status) q = q.eq('status', filters.status);
        if (filters?.search) q = q.or(`title.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`);
        const { data, error } = await q.order('published_at', { ascending: false }).limit(200);
        if (error) throw error; return data;
    }
    async createArticle(tenantId: string, input: any) {
        const sentiment = analyzeSentiment(`${input.title || ''} ${input.summary || ''} ${input.content || ''}`);
        const { data, error } = await this.db.from('news_articles').insert({ tenant_id: tenantId, source_id: input.sourceId, title: input.title, slug: input.slug, summary: input.summary, content: input.content, url: input.url, image_url: input.imageUrl, author: input.author, published_at: input.publishedAt || new Date().toISOString(), category: input.category || 'general', language: input.language || 'en', sentiment_score: sentiment.score, sentiment_label: sentiment.label, sentiment_magnitude: sentiment.magnitude, keywords: sentiment.keywords, status: 'active' }).select().single();
        if (error) throw error;
        // Also create sentiment entry
        await this.db.from('news_sentiment_entries').insert({ tenant_id: tenantId, source_type: 'article', source_id: data.id, text_snippet: (input.title || '').slice(0, 500), score: sentiment.score, label: sentiment.label, magnitude: sentiment.magnitude, keywords: sentiment.keywords });
        return data;
    }
    async updateArticle(id: string, input: any) { const u: any = { updated_at: new Date().toISOString() }; for (const [k, c] of Object.entries({ title:'title', summary:'summary', content:'content', category:'category', isRead:'is_read', isFeatured:'is_featured', status:'status' })) { if (input[k] !== undefined) u[c] = input[k]; } const { data, error } = await this.db.from('news_articles').update(u).eq('id', id).select().single(); if (error) throw error; return data; }
    async deleteArticle(id: string) { const { error } = await this.db.from('news_articles').delete().eq('id', id); if (error) throw error; return true; }

    // ─── BOOKMARKS ──────────────────────────────────────
    async getBookmarks(tenantId: string, userId: string) { const { data, error } = await this.db.from('news_bookmarks').select('*, news_articles(*)').eq('tenant_id', tenantId).eq('user_id', userId); if (error) throw error; return data; }
    async toggleBookmark(tenantId: string, articleId: string, userId: string) { const { data: existing } = await this.db.from('news_bookmarks').select('id').eq('article_id', articleId).eq('user_id', userId).maybeSingle(); if (existing) { await this.db.from('news_bookmarks').delete().eq('id', existing.id); return false; } await this.db.from('news_bookmarks').insert({ tenant_id: tenantId, article_id: articleId, user_id: userId }); return true; }

    // ─── TAGS ────────────────────────────────────────────
    async getArticleTags(articleId: string) { const { data } = await this.db.from('news_tags').select('*').eq('article_id', articleId); return data || []; }
    async addTag(tenantId: string, articleId: string, tag: string) { await this.db.from('news_tags').insert({ tenant_id: tenantId, article_id: articleId, tag }); return true; }
    async removeTag(id: string) { await this.db.from('news_tags').delete().eq('id', id); return true; }

    // ─── CRAWL JOBS ─────────────────────────────────────
    async getCrawlJobs(tenantId: string) { const { data, error } = await this.db.from('news_crawl_jobs').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }); if (error) throw error; return data; }
    async createCrawlJob(tenantId: string, input: any) { const { data, error } = await this.db.from('news_crawl_jobs').insert({ tenant_id: tenantId, name: input.name, job_type: input.jobType || 'web', target_url: input.targetUrl, schedule: input.schedule || '0 */6 * * *', selectors: input.selectors || {}, pagination: input.pagination || {}, filters: input.filters || {}, max_depth: input.maxDepth || 1, status: 'active', created_by: input.createdBy }).select().single(); if (error) throw error; return data; }
    async updateCrawlJob(id: string, input: any) { const u: any = { updated_at: new Date().toISOString() }; for (const [k, c] of Object.entries({ name:'name', targetUrl:'target_url', schedule:'schedule', selectors:'selectors', pagination:'pagination', maxDepth:'max_depth', status:'status' })) { if (input[k] !== undefined) u[c] = input[k]; } const { data, error } = await this.db.from('news_crawl_jobs').update(u).eq('id', id).select().single(); if (error) throw error; return data; }
    async deleteCrawlJob(id: string) { const { error } = await this.db.from('news_crawl_jobs').delete().eq('id', id); if (error) throw error; return true; }

    async getCrawlHistory(jobId: string) { const { data } = await this.db.from('news_crawl_history').select('*').eq('job_id', jobId).order('started_at', { ascending: false }).limit(50); return data || []; }

    // ── Execute Crawl (RSS) ──
    async executeCrawl(jobId: string, tenantId: string) {
        const { data: job } = await this.db.from('news_crawl_jobs').select('*').eq('id', jobId).single();
        if (!job) throw new Error('Job not found');
        const historyEntry = { job_id: jobId, tenant_id: tenantId, status: 'running', pages_crawled: 0, articles_found: 0, articles_new: 0, errors: 0, error_log: [] as string[] };
        const { data: history } = await this.db.from('news_crawl_history').insert(historyEntry).select().single();
        const startTime = Date.now();
        try {
            const response = await fetch(job.target_url, { headers: { 'User-Agent': 'NusantasoftCrawler/1.0' } });
            const text = await response.text();
            let articles: any[] = [];
            if (job.job_type === 'rss' || text.includes('<rss') || text.includes('<feed')) {
                articles = parseRssItems(text);
            }
            historyEntry.pages_crawled = 1;
            historyEntry.articles_found = articles.length;
            for (const art of articles.slice(0, 50)) {
                const { data: existing } = await this.db.from('news_articles').select('id').eq('tenant_id', tenantId).eq('url', art.link).maybeSingle();
                if (!existing && art.title) {
                    await this.createArticle(tenantId, { sourceId: null, title: art.title, summary: art.description?.replace(/<[^>]*>/g, '').slice(0, 500), url: art.link, author: art.author, publishedAt: art.pubDate ? new Date(art.pubDate).toISOString() : undefined, category: 'crawled' });
                    historyEntry.articles_new++;
                }
            }
            historyEntry.status = 'completed';
        } catch (err: any) {
            historyEntry.status = 'failed'; historyEntry.errors = 1;
            historyEntry.error_log = [err.message];
            this.logger.error(`Crawl failed for job ${jobId}: ${err.message}`);
        }
        const duration = Date.now() - startTime;
        if (history) await this.db.from('news_crawl_history').update({ ...historyEntry, completed_at: new Date().toISOString(), duration_ms: duration }).eq('id', history.id);
        await this.db.from('news_crawl_jobs').update({ last_run_at: new Date().toISOString(), total_pages_crawled: (job.total_pages_crawled || 0) + historyEntry.pages_crawled, total_articles_extracted: (job.total_articles_extracted || 0) + historyEntry.articles_new, error_message: historyEntry.status === 'failed' ? historyEntry.error_log[0] : null, updated_at: new Date().toISOString() }).eq('id', jobId);
        return historyEntry;
    }

    // ─── SOCIAL ACCOUNTS ────────────────────────────────
    async getSocialAccounts(tenantId: string) { const { data } = await this.db.from('news_social_accounts').select('*').eq('tenant_id', tenantId).order('platform'); return data || []; }
    async createSocialAccount(tenantId: string, input: any) { const { data, error } = await this.db.from('news_social_accounts').insert({ tenant_id: tenantId, platform: input.platform, account_name: input.accountName, display_name: input.displayName, profile_url: input.profileUrl, avatar_url: input.avatarUrl, status: 'connected', metadata: input.metadata || {} }).select().single(); if (error) throw error; return data; }
    async updateSocialAccount(id: string, input: any) { const u: any = { updated_at: new Date().toISOString() }; for (const [k,c] of Object.entries({displayName:'display_name',status:'status',followersCount:'followers_count'})) { if(input[k]!==undefined) u[c]=input[k]; } const { data, error } = await this.db.from('news_social_accounts').update(u).eq('id', id).select().single(); if (error) throw error; return data; }
    async deleteSocialAccount(id: string) { await this.db.from('news_social_accounts').delete().eq('id', id); return true; }

    // ─── SOCIAL POSTS ───────────────────────────────────
    async getSocialPosts(tenantId: string, filters?: { status?: string; platform?: string }) { let q = this.db.from('news_social_posts').select('*').eq('tenant_id', tenantId); if (filters?.status) q = q.eq('status', filters.status); if (filters?.platform) q = q.eq('platform', filters.platform); const { data } = await q.order('created_at', { ascending: false }).limit(100); return data || []; }
    async createSocialPost(tenantId: string, input: any) { const { data, error } = await this.db.from('news_social_posts').insert({ tenant_id: tenantId, account_id: input.accountId, platform: input.platform, content: input.content, media_urls: input.mediaUrls || [], hashtags: input.hashtags || [], scheduled_at: input.scheduledAt, status: input.scheduledAt ? 'scheduled' : 'draft', created_by: input.createdBy }).select().single(); if (error) throw error; return data; }
    async updateSocialPost(id: string, input: any) { const u: any = { updated_at: new Date().toISOString() }; for (const [k,c] of Object.entries({content:'content',status:'status',scheduledAt:'scheduled_at'})) { if(input[k]!==undefined) u[c]=input[k]; } const { data, error } = await this.db.from('news_social_posts').update(u).eq('id', id).select().single(); if (error) throw error; return data; }
    async deleteSocialPost(id: string) { await this.db.from('news_social_posts').delete().eq('id', id); return true; }
    async getSocialMetrics(postId: string) { const { data } = await this.db.from('news_social_metrics').select('*').eq('post_id', postId).order('recorded_at', { ascending: false }); return data || []; }

    // ─── SENTIMENT ───────────────────────────────────────
    async getSentimentEntries(tenantId: string, filters?: { label?: string; sourceType?: string; dateFrom?: string; dateTo?: string }) { let q = this.db.from('news_sentiment_entries').select('*').eq('tenant_id', tenantId); if (filters?.label) q = q.eq('label', filters.label); if (filters?.sourceType) q = q.eq('source_type', filters.sourceType); if (filters?.dateFrom) q = q.gte('analyzed_at', filters.dateFrom); if (filters?.dateTo) q = q.lte('analyzed_at', filters.dateTo); const { data } = await q.order('analyzed_at', { ascending: false }).limit(500); return data || []; }
    async analyzeSentimentText(tenantId: string, text: string, sourceType = 'manual', sourceId?: string) {
        const result = analyzeSentiment(text);
        const { data } = await this.db.from('news_sentiment_entries').insert({ tenant_id: tenantId, source_type: sourceType, source_id: sourceId, text_snippet: text.slice(0, 500), score: result.score, label: result.label, magnitude: result.magnitude, keywords: result.keywords }).select().single();
        return data;
    }
    async getSentimentSummary(tenantId: string) {
        const { data: entries } = await this.db.from('news_sentiment_entries').select('label, score, analyzed_at').eq('tenant_id', tenantId).order('analyzed_at', { ascending: false }).limit(1000);
        const items = entries || [];
        const positive = items.filter(e => e.label === 'positive').length;
        const negative = items.filter(e => e.label === 'negative').length;
        const neutral = items.filter(e => e.label === 'neutral').length;
        const avgScore = items.length ? Math.round(items.reduce((s, e) => s + (e.score || 0), 0) / items.length * 100) / 100 : 0;
        return { total: items.length, positive, negative, neutral, avgScore };
    }

    // ─── MARKET COMPETITORS ─────────────────────────────
    async getCompetitors(tenantId: string) { const { data } = await this.db.from('news_market_competitors').select('*').eq('tenant_id', tenantId).order('name'); return data || []; }
    async createCompetitor(tenantId: string, input: any) { const { data, error } = await this.db.from('news_market_competitors').insert({ tenant_id: tenantId, name: input.name, website: input.website, industry: input.industry, description: input.description, logo_url: input.logoUrl, social_profiles: input.socialProfiles || {}, keywords: input.keywords || [], status: 'tracking' }).select().single(); if (error) throw error; return data; }
    async updateCompetitor(id: string, input: any) { const u: any = { updated_at: new Date().toISOString() }; for (const [k,c] of Object.entries({name:'name',website:'website',industry:'industry',description:'description',keywords:'keywords',status:'status'})) { if(input[k]!==undefined) u[c]=input[k]; } const { data, error } = await this.db.from('news_market_competitors').update(u).eq('id', id).select().single(); if (error) throw error; return data; }
    async deleteCompetitor(id: string) { await this.db.from('news_market_competitors').delete().eq('id', id); return true; }

    // ─── MARKET SIGNALS ─────────────────────────────────
    async getMarketSignals(tenantId: string, competitorId?: string) { let q = this.db.from('news_market_signals').select('*').eq('tenant_id', tenantId); if (competitorId) q = q.eq('competitor_id', competitorId); const { data } = await q.order('detected_at', { ascending: false }).limit(200); return data || []; }
    async createMarketSignal(tenantId: string, input: any) { const { data, error } = await this.db.from('news_market_signals').insert({ tenant_id: tenantId, competitor_id: input.competitorId, signal_type: input.signalType, title: input.title, description: input.description, source_url: input.sourceUrl, impact: input.impact || 'neutral', confidence: input.confidence || 0.5, data: input.data || {} }).select().single(); if (error) throw error; return data; }

    // ─── CONTENT DRAFTS ─────────────────────────────────
    async getContentDrafts(tenantId: string, status?: string) { let q = this.db.from('news_content_drafts').select('*').eq('tenant_id', tenantId); if (status) q = q.eq('status', status); const { data } = await q.order('created_at', { ascending: false }); return data || []; }
    async createContentDraft(tenantId: string, input: any) { const { data, error } = await this.db.from('news_content_drafts').insert({ tenant_id: tenantId, title: input.title, body: input.body, content_type: input.contentType || 'article', target_channels: input.targetChannels || [], media_urls: input.mediaUrls || [], tags: input.tags || [], scheduled_at: input.scheduledAt, status: 'draft', created_by: input.createdBy }).select().single(); if (error) throw error; return data; }
    async updateContentDraft(id: string, input: any) { const u: any = { updated_at: new Date().toISOString() }; for (const [k,c] of Object.entries({title:'title',body:'body',contentType:'content_type',targetChannels:'target_channels',scheduledAt:'scheduled_at',status:'status',approvedBy:'approved_by',rejectionReason:'rejection_reason'})) { if(input[k]!==undefined) u[c]=input[k]; } if(input.status==='approved') u.approved_at=new Date().toISOString(); if(input.status==='published') u.published_at=new Date().toISOString(); const { data, error } = await this.db.from('news_content_drafts').update(u).eq('id', id).select().single(); if (error) throw error; return data; }
    async deleteContentDraft(id: string) { await this.db.from('news_content_drafts').delete().eq('id', id); return true; }

    // ─── CONTENT CALENDAR ───────────────────────────────
    async getContentCalendar(tenantId: string, month?: string) { let q = this.db.from('news_content_calendar').select('*').eq('tenant_id', tenantId); if (month) { q = q.gte('scheduled_date', `${month}-01`).lte('scheduled_date', `${month}-31`); } const { data } = await q.order('scheduled_date'); return data || []; }
    async createCalendarEntry(tenantId: string, input: any) { const { data, error } = await this.db.from('news_content_calendar').insert({ tenant_id: tenantId, draft_id: input.draftId, title: input.title, description: input.description, scheduled_date: input.scheduledDate, scheduled_time: input.scheduledTime, channel: input.channel, color: input.color || '#3b82f6', created_by: input.createdBy }).select().single(); if (error) throw error; return data; }

    // ─── ALERTS ──────────────────────────────────────────
    async getAlerts(tenantId: string) { const { data } = await this.db.from('news_alerts').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }); return data || []; }
    async createAlert(tenantId: string, input: any) { const { data, error } = await this.db.from('news_alerts').insert({ tenant_id: tenantId, name: input.name, alert_type: input.alertType, conditions: input.conditions || {}, channels: input.channels || ['inbox'], is_active: input.isActive ?? true, created_by: input.createdBy }).select().single(); if (error) throw error; return data; }
    async updateAlert(id: string, input: any) { const u: any = { updated_at: new Date().toISOString() }; if (input.name !== undefined) u.name = input.name; if (input.conditions !== undefined) u.conditions = input.conditions; if (input.isActive !== undefined) u.is_active = input.isActive; const { data, error } = await this.db.from('news_alerts').update(u).eq('id', id).select().single(); if (error) throw error; return data; }
    async deleteAlert(id: string) { await this.db.from('news_alerts').delete().eq('id', id); return true; }

    // ─── SETTINGS ────────────────────────────────────────
    async getSettings(tenantId: string) { const { data } = await this.db.from('news_settings').select('*').eq('tenant_id', tenantId); return data || []; }
    async updateSetting(tenantId: string, key: string, value: string) { await this.db.from('news_settings').upsert({ tenant_id: tenantId, key, value, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id,key' }); return true; }

    // ─── DASHBOARD ──────────────────────────────────────
    async getDashboard(tenantId: string) {
        const [articles, sources, crawlJobs, socialAccounts, alerts, sentimentSummary] = await Promise.all([
            this.db.from('news_articles').select('id, sentiment_label, published_at', { count: 'exact' }).eq('tenant_id', tenantId),
            this.db.from('news_sources').select('id', { count: 'exact' }).eq('tenant_id', tenantId).eq('is_active', true),
            this.db.from('news_crawl_jobs').select('id', { count: 'exact' }).eq('tenant_id', tenantId).eq('status', 'active'),
            this.db.from('news_social_accounts').select('id, followers_count').eq('tenant_id', tenantId).eq('status', 'connected'),
            this.db.from('news_alerts').select('id', { count: 'exact' }).eq('tenant_id', tenantId).eq('is_active', true),
            this.getSentimentSummary(tenantId),
        ]);
        const totalReach = (socialAccounts.data || []).reduce((s, a: any) => s + (a.followers_count || 0), 0);
        return { totalArticles: articles.count || 0, activeSources: sources.count || 0, activeCrawlers: crawlJobs.count || 0, connectedAccounts: (socialAccounts.data || []).length, totalReach, activeAlerts: alerts.count || 0, sentiment: sentimentSummary };
    }

    // ─── Scheduled: Auto-crawl active RSS jobs ──────────
    @Cron(CronExpression.EVERY_6_HOURS)
    async scheduledCrawl() {
        this.logger.log('Running scheduled crawl...');
        const { data: jobs } = await this.db.from('news_crawl_jobs').select('id, tenant_id').eq('status', 'active');
        for (const job of (jobs || []).slice(0, 10)) {
            try { await this.executeCrawl(job.id, job.tenant_id); } catch (e: any) { this.logger.error(`Scheduled crawl failed: ${e.message}`); }
        }
    }
}
