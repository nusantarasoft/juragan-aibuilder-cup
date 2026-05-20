import { Resolver, Query, Mutation, Args, ObjectType, Field, InputType, Float, Int } from '@nestjs/graphql';
import { NewsService } from './news.service';
import GraphQLJSON from 'graphql-type-json';

// ─── Object Types ───────────────────────────────────────
@ObjectType() class NewsSource { @Field() id: string; @Field() tenantId: string; @Field() name: string; @Field() sourceType: string; @Field({ nullable: true }) url?: string; @Field(() => GraphQLJSON, { nullable: true }) config?: any; @Field({ nullable: true }) category?: string; @Field({ nullable: true }) language?: string; @Field({ nullable: true }) crawlSchedule?: string; @Field() isActive: boolean; @Field({ nullable: true }) lastCrawledAt?: string; @Field(() => Int) articleCount: number; @Field({ nullable: true }) createdAt?: string; }
@ObjectType() class NewsArticle { @Field() id: string; @Field() tenantId: string; @Field({ nullable: true }) sourceId?: string; @Field() title: string; @Field({ nullable: true }) slug?: string; @Field({ nullable: true }) summary?: string; @Field({ nullable: true }) content?: string; @Field({ nullable: true }) url?: string; @Field({ nullable: true }) imageUrl?: string; @Field({ nullable: true }) author?: string; @Field({ nullable: true }) publishedAt?: string; @Field({ nullable: true }) category?: string; @Field(() => Float) sentimentScore: number; @Field() sentimentLabel: string; @Field(() => Float) sentimentMagnitude: number; @Field(() => GraphQLJSON, { nullable: true }) keywords?: any; @Field() isRead: boolean; @Field() isFeatured: boolean; @Field() status: string; @Field({ nullable: true }) createdAt?: string; }
@ObjectType() class NewsCrawlJob { @Field() id: string; @Field() tenantId: string; @Field() name: string; @Field() jobType: string; @Field() targetUrl: string; @Field({ nullable: true }) schedule?: string; @Field(() => GraphQLJSON, { nullable: true }) selectors?: any; @Field(() => GraphQLJSON, { nullable: true }) pagination?: any; @Field(() => Int) maxDepth: number; @Field() status: string; @Field({ nullable: true }) lastRunAt?: string; @Field(() => Int) totalPagesCrawled: number; @Field(() => Int) totalArticlesExtracted: number; @Field({ nullable: true }) errorMessage?: string; @Field({ nullable: true }) createdAt?: string; }
@ObjectType() class NewsCrawlHistory { @Field() id: string; @Field({ nullable: true }) jobId?: string; @Field({ nullable: true }) startedAt?: string; @Field({ nullable: true }) completedAt?: string; @Field(() => Int) pagesCrawled: number; @Field(() => Int) articlesFound: number; @Field(() => Int) articlesNew: number; @Field(() => Int) errors: number; @Field() status: string; @Field(() => Int) durationMs: number; }
@ObjectType() class NewsSocialAccount { @Field() id: string; @Field() tenantId: string; @Field() platform: string; @Field() accountName: string; @Field({ nullable: true }) displayName?: string; @Field({ nullable: true }) profileUrl?: string; @Field({ nullable: true }) avatarUrl?: string; @Field(() => Int) followersCount: number; @Field(() => Int) followingCount: number; @Field(() => Int) postsCount: number; @Field() status: string; @Field({ nullable: true }) lastSyncedAt?: string; @Field({ nullable: true }) createdAt?: string; }
@ObjectType() class NewsSocialPost { @Field() id: string; @Field() tenantId: string; @Field({ nullable: true }) accountId?: string; @Field() platform: string; @Field() content: string; @Field(() => GraphQLJSON, { nullable: true }) mediaUrls?: any; @Field(() => GraphQLJSON, { nullable: true }) hashtags?: any; @Field({ nullable: true }) scheduledAt?: string; @Field({ nullable: true }) publishedAt?: string; @Field() status: string; @Field({ nullable: true }) createdAt?: string; }
@ObjectType() class NewsSentimentEntry { @Field() id: string; @Field() sourceType: string; @Field({ nullable: true }) sourceId?: string; @Field({ nullable: true }) textSnippet?: string; @Field(() => Float) score: number; @Field() label: string; @Field(() => Float) magnitude: number; @Field(() => GraphQLJSON, { nullable: true }) keywords?: any; @Field({ nullable: true }) analyzedAt?: string; }
@ObjectType() class NewsSentimentSummary { @Field(() => Int) total: number; @Field(() => Int) positive: number; @Field(() => Int) negative: number; @Field(() => Int) neutral: number; @Field(() => Float) avgScore: number; }
@ObjectType() class NewsCompetitor { @Field() id: string; @Field() tenantId: string; @Field() name: string; @Field({ nullable: true }) website?: string; @Field({ nullable: true }) industry?: string; @Field({ nullable: true }) description?: string; @Field({ nullable: true }) logoUrl?: string; @Field(() => GraphQLJSON, { nullable: true }) socialProfiles?: any; @Field(() => GraphQLJSON, { nullable: true }) keywords?: any; @Field() status: string; @Field(() => Int) signalCount: number; @Field({ nullable: true }) createdAt?: string; }
@ObjectType() class NewsMarketSignal { @Field() id: string; @Field({ nullable: true }) competitorId?: string; @Field() signalType: string; @Field() title: string; @Field({ nullable: true }) description?: string; @Field({ nullable: true }) sourceUrl?: string; @Field() impact: string; @Field(() => Float) confidence: number; @Field({ nullable: true }) detectedAt?: string; }
@ObjectType() class NewsContentDraft { @Field() id: string; @Field() tenantId: string; @Field() title: string; @Field({ nullable: true }) body?: string; @Field() contentType: string; @Field(() => GraphQLJSON, { nullable: true }) targetChannels?: any; @Field(() => GraphQLJSON, { nullable: true }) tags?: any; @Field({ nullable: true }) scheduledAt?: string; @Field({ nullable: true }) publishedAt?: string; @Field() status: string; @Field({ nullable: true }) approvedBy?: string; @Field({ nullable: true }) createdBy?: string; @Field({ nullable: true }) createdAt?: string; }
@ObjectType() class NewsCalendarEntry { @Field() id: string; @Field({ nullable: true }) draftId?: string; @Field() title: string; @Field({ nullable: true }) description?: string; @Field() scheduledDate: string; @Field({ nullable: true }) scheduledTime?: string; @Field() channel: string; @Field() status: string; @Field({ nullable: true }) color?: string; }
@ObjectType() class NewsAlert { @Field() id: string; @Field() name: string; @Field() alertType: string; @Field(() => GraphQLJSON) conditions: any; @Field(() => GraphQLJSON) channels: any; @Field() isActive: boolean; @Field(() => Int) triggerCount: number; @Field({ nullable: true }) lastTriggeredAt?: string; @Field({ nullable: true }) createdAt?: string; }
@ObjectType() class NewsSetting { @Field() id: string; @Field() key: string; @Field({ nullable: true }) value?: string; @Field({ nullable: true }) description?: string; }
@ObjectType() class NewsDashboard { @Field(() => Int) totalArticles: number; @Field(() => Int) activeSources: number; @Field(() => Int) activeCrawlers: number; @Field(() => Int) connectedAccounts: number; @Field(() => Int) totalReach: number; @Field(() => Int) activeAlerts: number; @Field(() => NewsSentimentSummary) sentiment: NewsSentimentSummary; }

// ─── Input Types ────────────────────────────────────────
@InputType() class NewsSourceInput { @Field() name: string; @Field({ nullable: true }) sourceType?: string; @Field({ nullable: true }) url?: string; @Field(() => GraphQLJSON, { nullable: true }) config?: any; @Field({ nullable: true }) category?: string; @Field({ nullable: true }) language?: string; @Field({ nullable: true }) crawlSchedule?: string; @Field({ nullable: true }) isActive?: boolean; }
@InputType() class NewsArticleInput { @Field({ nullable: true }) sourceId?: string; @Field() title: string; @Field({ nullable: true }) slug?: string; @Field({ nullable: true }) summary?: string; @Field({ nullable: true }) content?: string; @Field({ nullable: true }) url?: string; @Field({ nullable: true }) imageUrl?: string; @Field({ nullable: true }) author?: string; @Field({ nullable: true }) publishedAt?: string; @Field({ nullable: true }) category?: string; }
@InputType() class NewsArticleUpdateInput { @Field({ nullable: true }) title?: string; @Field({ nullable: true }) summary?: string; @Field({ nullable: true }) content?: string; @Field({ nullable: true }) category?: string; @Field({ nullable: true }) isRead?: boolean; @Field({ nullable: true }) isFeatured?: boolean; @Field({ nullable: true }) status?: string; }
@InputType() class NewsCrawlJobInput { @Field() name: string; @Field({ nullable: true }) jobType?: string; @Field() targetUrl: string; @Field({ nullable: true }) schedule?: string; @Field(() => GraphQLJSON, { nullable: true }) selectors?: any; @Field(() => GraphQLJSON, { nullable: true }) pagination?: any; @Field(() => Int, { nullable: true }) maxDepth?: number; }
@InputType() class NewsCrawlJobUpdateInput { @Field({ nullable: true }) name?: string; @Field({ nullable: true }) targetUrl?: string; @Field({ nullable: true }) schedule?: string; @Field(() => GraphQLJSON, { nullable: true }) selectors?: any; @Field({ nullable: true }) status?: string; }
@InputType() class NewsSocialAccountInput { @Field() platform: string; @Field() accountName: string; @Field({ nullable: true }) displayName?: string; @Field({ nullable: true }) profileUrl?: string; @Field({ nullable: true }) avatarUrl?: string; }
@InputType() class NewsSocialPostInput { @Field({ nullable: true }) accountId?: string; @Field() platform: string; @Field() content: string; @Field(() => GraphQLJSON, { nullable: true }) mediaUrls?: any; @Field(() => GraphQLJSON, { nullable: true }) hashtags?: any; @Field({ nullable: true }) scheduledAt?: string; }
@InputType() class NewsCompetitorInput { @Field() name: string; @Field({ nullable: true }) website?: string; @Field({ nullable: true }) industry?: string; @Field({ nullable: true }) description?: string; @Field({ nullable: true }) logoUrl?: string; @Field(() => GraphQLJSON, { nullable: true }) socialProfiles?: any; @Field(() => GraphQLJSON, { nullable: true }) keywords?: any; }
@InputType() class NewsMarketSignalInput { @Field({ nullable: true }) competitorId?: string; @Field() signalType: string; @Field() title: string; @Field({ nullable: true }) description?: string; @Field({ nullable: true }) sourceUrl?: string; @Field({ nullable: true }) impact?: string; @Field(() => Float, { nullable: true }) confidence?: number; }
@InputType() class NewsContentDraftInput { @Field() title: string; @Field({ nullable: true }) body?: string; @Field({ nullable: true }) contentType?: string; @Field(() => GraphQLJSON, { nullable: true }) targetChannels?: any; @Field(() => GraphQLJSON, { nullable: true }) tags?: any; @Field({ nullable: true }) scheduledAt?: string; }
@InputType() class NewsContentDraftUpdateInput { @Field({ nullable: true }) title?: string; @Field({ nullable: true }) body?: string; @Field({ nullable: true }) contentType?: string; @Field(() => GraphQLJSON, { nullable: true }) targetChannels?: any; @Field({ nullable: true }) scheduledAt?: string; @Field({ nullable: true }) status?: string; @Field({ nullable: true }) approvedBy?: string; @Field({ nullable: true }) rejectionReason?: string; }
@InputType() class NewsCalendarInput { @Field({ nullable: true }) draftId?: string; @Field() title: string; @Field({ nullable: true }) description?: string; @Field() scheduledDate: string; @Field({ nullable: true }) scheduledTime?: string; @Field() channel: string; @Field({ nullable: true }) color?: string; }
@InputType() class NewsAlertInput { @Field() name: string; @Field() alertType: string; @Field(() => GraphQLJSON) conditions: any; @Field(() => GraphQLJSON, { nullable: true }) channels?: any; @Field({ nullable: true }) isActive?: boolean; }

function toCamel(row: any) { if (!row) return row; const o: any = {}; for (const [k, v] of Object.entries(row)) { o[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v; } return o; }
function toCamelArray(rows: any[]) { return (rows || []).map(toCamel); }

@Resolver()
export class NewsResolver {
    constructor(private svc: NewsService) {}

    // Sources
    @Query(() => [NewsSource]) async newsSources(@Args('tenantId') t: string) { return toCamelArray(await this.svc.getSources(t)); }
    @Mutation(() => NewsSource) async createNewsSource(@Args('tenantId') t: string, @Args('input') i: NewsSourceInput) { return toCamel(await this.svc.createSource(t, i)); }
    @Mutation(() => NewsSource) async updateNewsSource(@Args('id') id: string, @Args('input') i: NewsSourceInput) { return toCamel(await this.svc.updateSource(id, i)); }
    @Mutation(() => Boolean) async deleteNewsSource(@Args('id') id: string) { return this.svc.deleteSource(id); }

    // Articles
    @Query(() => [NewsArticle]) async newsArticles(@Args('tenantId') t: string, @Args('sourceId', { nullable: true }) s?: string, @Args('category', { nullable: true }) c?: string, @Args('sentiment', { nullable: true }) se?: string, @Args('search', { nullable: true }) q?: string) { return toCamelArray(await this.svc.getArticles(t, { sourceId: s, category: c, sentiment: se, search: q })); }
    @Mutation(() => NewsArticle) async createNewsArticle(@Args('tenantId') t: string, @Args('input') i: NewsArticleInput) { return toCamel(await this.svc.createArticle(t, i)); }
    @Mutation(() => NewsArticle) async updateNewsArticle(@Args('id') id: string, @Args('input') i: NewsArticleUpdateInput) { return toCamel(await this.svc.updateArticle(id, i)); }
    @Mutation(() => Boolean) async deleteNewsArticle(@Args('id') id: string) { return this.svc.deleteArticle(id); }

    // Bookmarks
    @Mutation(() => Boolean) async toggleNewsBookmark(@Args('tenantId') t: string, @Args('articleId') a: string, @Args('userId') u: string) { return this.svc.toggleBookmark(t, a, u); }

    // Crawl Jobs
    @Query(() => [NewsCrawlJob]) async newsCrawlJobs(@Args('tenantId') t: string) { return toCamelArray(await this.svc.getCrawlJobs(t)); }
    @Query(() => [NewsCrawlHistory]) async newsCrawlHistory(@Args('jobId') j: string) { return toCamelArray(await this.svc.getCrawlHistory(j)); }
    @Mutation(() => NewsCrawlJob) async createNewsCrawlJob(@Args('tenantId') t: string, @Args('input') i: NewsCrawlJobInput) { return toCamel(await this.svc.createCrawlJob(t, i)); }
    @Mutation(() => NewsCrawlJob) async updateNewsCrawlJob(@Args('id') id: string, @Args('input') i: NewsCrawlJobUpdateInput) { return toCamel(await this.svc.updateCrawlJob(id, i)); }
    @Mutation(() => Boolean) async deleteNewsCrawlJob(@Args('id') id: string) { return this.svc.deleteCrawlJob(id); }
    @Mutation(() => GraphQLJSON) async executeNewsCrawl(@Args('jobId') j: string, @Args('tenantId') t: string) { return await this.svc.executeCrawl(j, t); }

    // Social Accounts
    @Query(() => [NewsSocialAccount]) async newsSocialAccounts(@Args('tenantId') t: string) { return toCamelArray(await this.svc.getSocialAccounts(t)); }
    @Mutation(() => NewsSocialAccount) async createNewsSocialAccount(@Args('tenantId') t: string, @Args('input') i: NewsSocialAccountInput) { return toCamel(await this.svc.createSocialAccount(t, i)); }
    @Mutation(() => Boolean) async deleteNewsSocialAccount(@Args('id') id: string) { return this.svc.deleteSocialAccount(id); }

    // Social Posts
    @Query(() => [NewsSocialPost]) async newsSocialPosts(@Args('tenantId') t: string, @Args('status', { nullable: true }) s?: string, @Args('platform', { nullable: true }) p?: string) { return toCamelArray(await this.svc.getSocialPosts(t, { status: s, platform: p })); }
    @Mutation(() => NewsSocialPost) async createNewsSocialPost(@Args('tenantId') t: string, @Args('input') i: NewsSocialPostInput) { return toCamel(await this.svc.createSocialPost(t, i)); }
    @Mutation(() => NewsSocialPost) async updateNewsSocialPost(@Args('id') id: string, @Args('input') i: NewsSocialPostInput) { return toCamel(await this.svc.updateSocialPost(id, i)); }
    @Mutation(() => Boolean) async deleteNewsSocialPost(@Args('id') id: string) { return this.svc.deleteSocialPost(id); }

    // Sentiment
    @Query(() => [NewsSentimentEntry]) async newsSentimentEntries(@Args('tenantId') t: string, @Args('label', { nullable: true }) l?: string, @Args('sourceType', { nullable: true }) st?: string) { return toCamelArray(await this.svc.getSentimentEntries(t, { label: l, sourceType: st })); }
    @Query(() => NewsSentimentSummary) async newsSentimentSummary(@Args('tenantId') t: string) { return await this.svc.getSentimentSummary(t); }
    @Mutation(() => NewsSentimentEntry) async analyzeNewsSentiment(@Args('tenantId') t: string, @Args('text') text: string) { return toCamel(await this.svc.analyzeSentimentText(t, text)); }

    // Competitors
    @Query(() => [NewsCompetitor]) async newsCompetitors(@Args('tenantId') t: string) { return toCamelArray(await this.svc.getCompetitors(t)); }
    @Mutation(() => NewsCompetitor) async createNewsCompetitor(@Args('tenantId') t: string, @Args('input') i: NewsCompetitorInput) { return toCamel(await this.svc.createCompetitor(t, i)); }
    @Mutation(() => NewsCompetitor) async updateNewsCompetitor(@Args('id') id: string, @Args('input') i: NewsCompetitorInput) { return toCamel(await this.svc.updateCompetitor(id, i)); }
    @Mutation(() => Boolean) async deleteNewsCompetitor(@Args('id') id: string) { return this.svc.deleteCompetitor(id); }

    // Market Signals
    @Query(() => [NewsMarketSignal]) async newsMarketSignals(@Args('tenantId') t: string, @Args('competitorId', { nullable: true }) c?: string) { return toCamelArray(await this.svc.getMarketSignals(t, c)); }
    @Mutation(() => NewsMarketSignal) async createNewsMarketSignal(@Args('tenantId') t: string, @Args('input') i: NewsMarketSignalInput) { return toCamel(await this.svc.createMarketSignal(t, i)); }

    // Content Drafts
    @Query(() => [NewsContentDraft]) async newsContentDrafts(@Args('tenantId') t: string, @Args('status', { nullable: true }) s?: string) { return toCamelArray(await this.svc.getContentDrafts(t, s)); }
    @Mutation(() => NewsContentDraft) async createNewsContentDraft(@Args('tenantId') t: string, @Args('input') i: NewsContentDraftInput) { return toCamel(await this.svc.createContentDraft(t, i)); }
    @Mutation(() => NewsContentDraft) async updateNewsContentDraft(@Args('id') id: string, @Args('input') i: NewsContentDraftUpdateInput) { return toCamel(await this.svc.updateContentDraft(id, i)); }
    @Mutation(() => Boolean) async deleteNewsContentDraft(@Args('id') id: string) { return this.svc.deleteContentDraft(id); }

    // Calendar
    @Query(() => [NewsCalendarEntry]) async newsContentCalendar(@Args('tenantId') t: string, @Args('month', { nullable: true }) m?: string) { return toCamelArray(await this.svc.getContentCalendar(t, m)); }
    @Mutation(() => NewsCalendarEntry) async createNewsCalendarEntry(@Args('tenantId') t: string, @Args('input') i: NewsCalendarInput) { return toCamel(await this.svc.createCalendarEntry(t, i)); }

    // Alerts
    @Query(() => [NewsAlert]) async newsAlerts(@Args('tenantId') t: string) { return toCamelArray(await this.svc.getAlerts(t)); }
    @Mutation(() => NewsAlert) async createNewsAlert(@Args('tenantId') t: string, @Args('input') i: NewsAlertInput) { return toCamel(await this.svc.createAlert(t, i)); }
    @Mutation(() => NewsAlert) async updateNewsAlert(@Args('id') id: string, @Args('input') i: NewsAlertInput) { return toCamel(await this.svc.updateAlert(id, i)); }
    @Mutation(() => Boolean) async deleteNewsAlert(@Args('id') id: string) { return this.svc.deleteAlert(id); }

    // Settings
    @Query(() => [NewsSetting]) async newsSettings(@Args('tenantId') t: string) { return toCamelArray(await this.svc.getSettings(t)); }
    @Mutation(() => Boolean) async updateNewsSetting(@Args('tenantId') t: string, @Args('key') k: string, @Args('value') v: string) { return this.svc.updateSetting(t, k, v); }

    // Dashboard
    @Query(() => NewsDashboard) async newsDashboard(@Args('tenantId') t: string) { return await this.svc.getDashboard(t); }
}
