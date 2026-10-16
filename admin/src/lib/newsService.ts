/**
 * News & Media Intelligence Service — All operations via GraphQL Middleware
 */
import { DEFAULT_TENANT_ID, gql } from '@/lib/graphql';

// ─── Types ───────────────────────────────────────────────
export interface NewsSource { id: string; tenantId: string; name: string; sourceType: string; url?: string; config?: any; category?: string; language?: string; crawlSchedule?: string; isActive: boolean; lastCrawledAt?: string; articleCount: number; createdAt?: string; }
export interface NewsArticle { id: string; tenantId: string; sourceId?: string; title: string; slug?: string; summary?: string; content?: string; url?: string; imageUrl?: string; author?: string; publishedAt?: string; category?: string; sentimentScore: number; sentimentLabel: string; sentimentMagnitude: number; keywords?: string[]; isRead: boolean; isFeatured: boolean; status: string; createdAt?: string; }
export interface NewsCrawlJob { id: string; tenantId: string; name: string; jobType: string; targetUrl: string; schedule?: string; selectors?: any; pagination?: any; maxDepth: number; status: string; lastRunAt?: string; totalPagesCrawled: number; totalArticlesExtracted: number; errorMessage?: string; createdAt?: string; }
export interface NewsCrawlHistory { id: string; jobId?: string; startedAt?: string; completedAt?: string; pagesCrawled: number; articlesFound: number; articlesNew: number; errors: number; status: string; durationMs: number; }
export interface NewsSocialAccount { id: string; tenantId: string; platform: string; accountName: string; displayName?: string; profileUrl?: string; avatarUrl?: string; followersCount: number; followingCount: number; postsCount: number; status: string; lastSyncedAt?: string; createdAt?: string; }
export interface NewsSocialPost { id: string; tenantId: string; accountId?: string; platform: string; content: string; mediaUrls?: string[]; hashtags?: string[]; scheduledAt?: string; publishedAt?: string; status: string; createdAt?: string; }
export interface NewsSentimentEntry { id: string; sourceType: string; sourceId?: string; textSnippet?: string; score: number; label: string; magnitude: number; keywords?: string[]; analyzedAt?: string; }
export interface NewsSentimentSummary { total: number; positive: number; negative: number; neutral: number; avgScore: number; }
export interface NewsCompetitor { id: string; tenantId: string; name: string; website?: string; industry?: string; description?: string; logoUrl?: string; socialProfiles?: any; keywords?: string[]; status: string; signalCount: number; createdAt?: string; }
export interface NewsMarketSignal { id: string; competitorId?: string; signalType: string; title: string; description?: string; sourceUrl?: string; impact: string; confidence: number; detectedAt?: string; }
export interface NewsContentDraft { id: string; tenantId: string; title: string; body?: string; contentType: string; targetChannels?: string[]; tags?: string[]; scheduledAt?: string; publishedAt?: string; status: string; approvedBy?: string; createdBy?: string; createdAt?: string; }
export interface NewsCalendarEntry { id: string; draftId?: string; title: string; description?: string; scheduledDate: string; scheduledTime?: string; channel: string; status: string; color?: string; }
export interface NewsAlert { id: string; name: string; alertType: string; conditions: any; channels: string[]; isActive: boolean; triggerCount: number; lastTriggeredAt?: string; createdAt?: string; }
export interface NewsDashboard { totalArticles: number; activeSources: number; activeCrawlers: number; connectedAccounts: number; totalReach: number; activeAlerts: number; sentiment: NewsSentimentSummary; }

// ─── Service ─────────────────────────────────────────────
export const newsService = {
    // Sources
    async getSources(t = DEFAULT_TENANT_ID): Promise<NewsSource[]> { const d = await gql<any>(`query($t:String!){newsSources(tenantId:$t){id tenantId name sourceType url config category language crawlSchedule isActive lastCrawledAt articleCount createdAt}}`, { t }); return d.newsSources || []; },
    async createSource(t = DEFAULT_TENANT_ID, input: any) { return (await gql<any>(`mutation($t:String!,$i:NewsSourceInput!){createNewsSource(tenantId:$t,input:$i){id name sourceType createdAt}}`, { t, i: input })).createNewsSource; },
    async updateSource(id: string, input: any) { return (await gql<any>(`mutation($id:String!,$i:NewsSourceInput!){updateNewsSource(id:$id,input:$i){id name}}`, { id, i: input })).updateNewsSource; },
    async deleteSource(id: string) { await gql(`mutation($id:String!){deleteNewsSource(id:$id)}`, { id }); },

    // Articles
    async getArticles(t = DEFAULT_TENANT_ID, filters?: { sourceId?: string; category?: string; sentiment?: string; search?: string }): Promise<NewsArticle[]> { const d = await gql<any>(`query($t:String!,$s:String,$c:String,$se:String,$q:String){newsArticles(tenantId:$t,sourceId:$s,category:$c,sentiment:$se,search:$q){id tenantId sourceId title slug summary content url imageUrl author publishedAt category sentimentScore sentimentLabel sentimentMagnitude keywords isRead isFeatured status createdAt}}`, { t, s: filters?.sourceId, c: filters?.category, se: filters?.sentiment, q: filters?.search }); return d.newsArticles || []; },
    async createArticle(t = DEFAULT_TENANT_ID, input: any) { return (await gql<any>(`mutation($t:String!,$i:NewsArticleInput!){createNewsArticle(tenantId:$t,input:$i){id title sentimentLabel createdAt}}`, { t, i: input })).createNewsArticle; },
    async updateArticle(id: string, input: any) { return (await gql<any>(`mutation($id:String!,$i:NewsArticleUpdateInput!){updateNewsArticle(id:$id,input:$i){id title status}}`, { id, i: input })).updateNewsArticle; },
    async deleteArticle(id: string) { await gql(`mutation($id:String!){deleteNewsArticle(id:$id)}`, { id }); },
    async toggleBookmark(t = DEFAULT_TENANT_ID, articleId: string, userId: string) { return (await gql<any>(`mutation($t:String!,$a:String!,$u:String!){toggleNewsBookmark(tenantId:$t,articleId:$a,userId:$u)}`, { t, a: articleId, u: userId })).toggleNewsBookmark; },

    // Crawl Jobs
    async getCrawlJobs(t = DEFAULT_TENANT_ID): Promise<NewsCrawlJob[]> { const d = await gql<any>(`query($t:String!){newsCrawlJobs(tenantId:$t){id tenantId name jobType targetUrl schedule selectors pagination maxDepth status lastRunAt totalPagesCrawled totalArticlesExtracted errorMessage createdAt}}`, { t }); return d.newsCrawlJobs || []; },
    async createCrawlJob(t = DEFAULT_TENANT_ID, input: any) { return (await gql<any>(`mutation($t:String!,$i:NewsCrawlJobInput!){createNewsCrawlJob(tenantId:$t,input:$i){id name status createdAt}}`, { t, i: input })).createNewsCrawlJob; },
    async updateCrawlJob(id: string, input: any) { return (await gql<any>(`mutation($id:String!,$i:NewsCrawlJobUpdateInput!){updateNewsCrawlJob(id:$id,input:$i){id name status}}`, { id, i: input })).updateNewsCrawlJob; },
    async deleteCrawlJob(id: string) { await gql(`mutation($id:String!){deleteNewsCrawlJob(id:$id)}`, { id }); },
    async executeCrawl(jobId: string, t = DEFAULT_TENANT_ID) { return (await gql<any>(`mutation($j:String!,$t:String!){executeNewsCrawl(jobId:$j,tenantId:$t)}`, { j: jobId, t })).executeNewsCrawl; },
    async getCrawlHistory(jobId: string): Promise<NewsCrawlHistory[]> { const d = await gql<any>(`query($j:String!){newsCrawlHistory(jobId:$j){id jobId startedAt completedAt pagesCrawled articlesFound articlesNew errors status durationMs}}`, { j: jobId }); return d.newsCrawlHistory || []; },

    // Social
    async getSocialAccounts(t = DEFAULT_TENANT_ID): Promise<NewsSocialAccount[]> { const d = await gql<any>(`query($t:String!){newsSocialAccounts(tenantId:$t){id tenantId platform accountName displayName profileUrl avatarUrl followersCount followingCount postsCount status lastSyncedAt createdAt}}`, { t }); return d.newsSocialAccounts || []; },
    async createSocialAccount(t = DEFAULT_TENANT_ID, input: any) { return (await gql<any>(`mutation($t:String!,$i:NewsSocialAccountInput!){createNewsSocialAccount(tenantId:$t,input:$i){id platform accountName status}}`, { t, i: input })).createNewsSocialAccount; },
    async deleteSocialAccount(id: string) { await gql(`mutation($id:String!){deleteNewsSocialAccount(id:$id)}`, { id }); },
    async getSocialPosts(t = DEFAULT_TENANT_ID, filters?: { status?: string; platform?: string }): Promise<NewsSocialPost[]> { const d = await gql<any>(`query($t:String!,$s:String,$p:String){newsSocialPosts(tenantId:$t,status:$s,platform:$p){id tenantId accountId platform content mediaUrls hashtags scheduledAt publishedAt status createdAt}}`, { t, s: filters?.status, p: filters?.platform }); return d.newsSocialPosts || []; },
    async createSocialPost(t = DEFAULT_TENANT_ID, input: any) { return (await gql<any>(`mutation($t:String!,$i:NewsSocialPostInput!){createNewsSocialPost(tenantId:$t,input:$i){id platform content status createdAt}}`, { t, i: input })).createNewsSocialPost; },
    async deleteSocialPost(id: string) { await gql(`mutation($id:String!){deleteNewsSocialPost(id:$id)}`, { id }); },

    // Sentiment
    async getSentimentEntries(t = DEFAULT_TENANT_ID, filters?: { label?: string; sourceType?: string }): Promise<NewsSentimentEntry[]> { const d = await gql<any>(`query($t:String!,$l:String,$st:String){newsSentimentEntries(tenantId:$t,label:$l,sourceType:$st){id sourceType sourceId textSnippet score label magnitude keywords analyzedAt}}`, { t, l: filters?.label, st: filters?.sourceType }); return d.newsSentimentEntries || []; },
    async getSentimentSummary(t = DEFAULT_TENANT_ID): Promise<NewsSentimentSummary> { const d = await gql<any>(`query($t:String!){newsSentimentSummary(tenantId:$t){total positive negative neutral avgScore}}`, { t }); return d.newsSentimentSummary || { total: 0, positive: 0, negative: 0, neutral: 0, avgScore: 0 }; },
    async analyzeSentiment(t = DEFAULT_TENANT_ID, text: string) { return (await gql<any>(`mutation($t:String!,$text:String!){analyzeNewsSentiment(tenantId:$t,text:$text){id score label magnitude keywords}}`, { t, text })).analyzeNewsSentiment; },

    // Competitors & Market
    async getCompetitors(t = DEFAULT_TENANT_ID): Promise<NewsCompetitor[]> { const d = await gql<any>(`query($t:String!){newsCompetitors(tenantId:$t){id tenantId name website industry description logoUrl socialProfiles keywords status signalCount createdAt}}`, { t }); return d.newsCompetitors || []; },
    async createCompetitor(t = DEFAULT_TENANT_ID, input: any) { return (await gql<any>(`mutation($t:String!,$i:NewsCompetitorInput!){createNewsCompetitor(tenantId:$t,input:$i){id name createdAt}}`, { t, i: input })).createNewsCompetitor; },
    async updateCompetitor(id: string, input: any) { return (await gql<any>(`mutation($id:String!,$i:NewsCompetitorInput!){updateNewsCompetitor(id:$id,input:$i){id name}}`, { id, i: input })).updateNewsCompetitor; },
    async deleteCompetitor(id: string) { await gql(`mutation($id:String!){deleteNewsCompetitor(id:$id)}`, { id }); },
    async getMarketSignals(t = DEFAULT_TENANT_ID, competitorId?: string): Promise<NewsMarketSignal[]> { const d = await gql<any>(`query($t:String!,$c:String){newsMarketSignals(tenantId:$t,competitorId:$c){id competitorId signalType title description sourceUrl impact confidence detectedAt}}`, { t, c: competitorId }); return d.newsMarketSignals || []; },
    async createMarketSignal(t = DEFAULT_TENANT_ID, input: any) { return (await gql<any>(`mutation($t:String!,$i:NewsMarketSignalInput!){createNewsMarketSignal(tenantId:$t,input:$i){id title signalType}}`, { t, i: input })).createNewsMarketSignal; },

    // Content
    async getContentDrafts(t = DEFAULT_TENANT_ID, status?: string): Promise<NewsContentDraft[]> { const d = await gql<any>(`query($t:String!,$s:String){newsContentDrafts(tenantId:$t,status:$s){id tenantId title body contentType targetChannels tags scheduledAt publishedAt status approvedBy createdBy createdAt}}`, { t, s: status }); return d.newsContentDrafts || []; },
    async createContentDraft(t = DEFAULT_TENANT_ID, input: any) { return (await gql<any>(`mutation($t:String!,$i:NewsContentDraftInput!){createNewsContentDraft(tenantId:$t,input:$i){id title status createdAt}}`, { t, i: input })).createNewsContentDraft; },
    async updateContentDraft(id: string, input: any) { return (await gql<any>(`mutation($id:String!,$i:NewsContentDraftUpdateInput!){updateNewsContentDraft(id:$id,input:$i){id title status}}`, { id, i: input })).updateNewsContentDraft; },
    async deleteContentDraft(id: string) { await gql(`mutation($id:String!){deleteNewsContentDraft(id:$id)}`, { id }); },
    async getContentCalendar(t = DEFAULT_TENANT_ID, month?: string): Promise<NewsCalendarEntry[]> { const d = await gql<any>(`query($t:String!,$m:String){newsContentCalendar(tenantId:$t,month:$m){id draftId title description scheduledDate scheduledTime channel status color}}`, { t, m: month }); return d.newsContentCalendar || []; },
    async createCalendarEntry(t = DEFAULT_TENANT_ID, input: any) { return (await gql<any>(`mutation($t:String!,$i:NewsCalendarInput!){createNewsCalendarEntry(tenantId:$t,input:$i){id title scheduledDate channel}}`, { t, i: input })).createNewsCalendarEntry; },

    // Alerts
    async getAlerts(t = DEFAULT_TENANT_ID): Promise<NewsAlert[]> { const d = await gql<any>(`query($t:String!){newsAlerts(tenantId:$t){id name alertType conditions channels isActive triggerCount lastTriggeredAt createdAt}}`, { t }); return d.newsAlerts || []; },
    async createAlert(t = DEFAULT_TENANT_ID, input: any) { return (await gql<any>(`mutation($t:String!,$i:NewsAlertInput!){createNewsAlert(tenantId:$t,input:$i){id name alertType isActive}}`, { t, i: input })).createNewsAlert; },
    async updateAlert(id: string, input: any) { return (await gql<any>(`mutation($id:String!,$i:NewsAlertInput!){updateNewsAlert(id:$id,input:$i){id name isActive}}`, { id, i: input })).updateNewsAlert; },
    async deleteAlert(id: string) { await gql(`mutation($id:String!){deleteNewsAlert(id:$id)}`, { id }); },

    // Dashboard
    async getDashboard(t = DEFAULT_TENANT_ID): Promise<NewsDashboard> { const d = await gql<any>(`query($t:String!){newsDashboard(tenantId:$t){totalArticles activeSources activeCrawlers connectedAccounts totalReach activeAlerts sentiment{total positive negative neutral avgScore}}}`, { t }); return d.newsDashboard || { totalArticles: 0, activeSources: 0, activeCrawlers: 0, connectedAccounts: 0, totalReach: 0, activeAlerts: 0, sentiment: { total: 0, positive: 0, negative: 0, neutral: 0, avgScore: 0 } }; },
};
