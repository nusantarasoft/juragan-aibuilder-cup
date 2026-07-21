import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { StudioService } from './studio.service';
import { GuideFlowService } from './guide-flow.service';
import { StudioWhatsAppService } from './studio-whatsapp.service';
import { StudioUmkmService } from './studio-umkm.service';
import { GraphQLJSONObject } from 'graphql-type-json';
import { DEFAULT_UMKM_COMMANDS } from './studio-umkm-commands';
import { GqlAuthGuard } from '../auth/gql-auth.guard';

/** Shape of the GraphQL context after GqlAuthGuard populates req.user. */
type StudioAuthContext = { req: { user?: { id: string; email?: string; role?: string } } };

// Every Studio operation requires a valid Supabase session. The authenticated
// user id is taken from the JWT (via GqlAuthGuard) — never from client-supplied
// arguments. Any legacy `userId` argument still accepted by the schema is
// ignored server-side and overridden with the token identity.
@Resolver()
@UseGuards(GqlAuthGuard)
export class StudioResolver {
    constructor(
        private readonly studioService: StudioService,
        private readonly guideFlowService: GuideFlowService,
        private readonly studioWhatsAppService: StudioWhatsAppService,
        private readonly studioUmkmService: StudioUmkmService,
    ) { }

    /** Authenticated user id from the JWT (guaranteed present by GqlAuthGuard). */
    private requireUserId(context: StudioAuthContext): string {
        const id = context?.req?.user?.id;
        if (!id) throw new UnauthorizedException('Authentication required');
        return id;
    }

    // ── Settings ─────────────────────────────────────────────────────

    @Query(() => GraphQLJSONObject, { name: 'studioSettings' })
    async getStudioSettings(
        @Args('tenantId', { type: () => String, nullable: true }) tenantId?: string,
    ) {
        return this.studioService.getSettings(tenantId);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'updateStudioSettings' })
    async updateStudioSettings(
        @Args('tenantId', { type: () => String, nullable: true }) tenantId: string | undefined,
        @Args('payload', { type: () => GraphQLJSONObject }) payload: any,
    ) {
        return this.studioService.updateSettings(tenantId, payload);
    }

    @Query(() => GraphQLJSONObject, { name: 'studioAiStatus' })
    async getStudioAiStatus(
        @Args('tenantId', { type: () => String, nullable: true }) tenantId?: string,
    ) {
        return this.studioService.getAiStatus(tenantId);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioTestAiConnection' })
    async testStudioAiConnection(
        @Args('provider', { type: () => String }) provider: string,
        @Args('tenantId', { type: () => String, nullable: true }) tenantId?: string,
        @Args('overrides', { type: () => GraphQLJSONObject, nullable: true }) overrides?: Record<string, unknown>,
    ) {
        return this.studioService.testAiConnection(provider as any, tenantId, {
            ollamaBaseUrl: typeof overrides?.ollama_base_url === 'string' ? overrides.ollama_base_url : undefined,
            ollamaModel: typeof overrides?.ollama_model === 'string' ? overrides.ollama_model : undefined,
        });
    }

    // ── Notebooks ────────────────────────────────────────────────────

    @Query(() => [GraphQLJSONObject], { name: 'studioNotebooks' })
    async getNotebooks(
        @Context() context: StudioAuthContext,
        // Accepted for backward-compat but ignored — the owner is the token user.
        @Args('userId', { type: () => String, nullable: true }) _userId?: string,
    ) {
        return this.studioService.getNotebooks(this.requireUserId(context));
    }

    @Query(() => GraphQLJSONObject, { name: 'studioNotebook' })
    async getNotebook(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.studioService.getNotebook(notebookId);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'createStudioNotebook' })
    async createNotebook(
        @Context() context: StudioAuthContext,
        @Args('name', { type: () => String }) name: string,
        @Args('description', { type: () => String, nullable: true }) description: string,
        // Accepted for backward-compat but ignored — the owner is the token user.
        @Args('userId', { type: () => String, nullable: true }) _userId: string,
        @Args('audience', { type: () => String, nullable: true }) audience: string,
    ) {
        const aud = audience === 'customer' ? 'customer' : 'admin';
        return this.studioService.createNotebook(name, description || '', this.requireUserId(context), aud);
    }

    @Mutation(() => Boolean, { name: 'reindexStudioSource' })
    async reindexSource(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('sourceId', { type: () => String }) sourceId: string,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.studioService.reindexNotebookSource(notebookId, sourceId);
    }

    @Mutation(() => Boolean, { name: 'reindexStudioNotebook' })
    async reindexNotebook(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.studioService.reindexNotebook(notebookId);
    }

    @Mutation(() => Boolean, { name: 'deleteStudioNotebook' })
    async deleteNotebook(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.studioService.deleteNotebook(notebookId);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'updateStudioNotebook' })
    async updateNotebook(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('name', { type: () => String, nullable: true }) name: string,
        @Args('description', { type: () => String, nullable: true }) description: string,
        @Args('chatInstruction', { type: () => String, nullable: true }) chatInstruction: string,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.studioService.updateNotebook(notebookId, {
            name: name ?? undefined,
            description: description ?? undefined,
            chat_instruction: chatInstruction ?? undefined,
        });
    }

    // ── Sources ──────────────────────────────────────────────────────

    @Mutation(() => GraphQLJSONObject, { name: 'addMediaToNotebook' })
    async addMediaToNotebook(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('mediaId', { type: () => String }) mediaId: string,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.studioService.addMediaAsSource(notebookId, mediaId);
    }

    @Query(() => [GraphQLJSONObject], { name: 'studioSourceStatus' })
    async getSourceStatus(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.studioService.getSourceStatus(notebookId);
    }

    @Mutation(() => Boolean, { name: 'removeStudioSource' })
    async removeSource(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('sourceId', { type: () => String }) sourceId: string,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.studioService.removeSource(notebookId, sourceId);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'importStudioUrl' })
    async importUrl(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('url', { type: () => String }) url: string,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.studioService.importUrl(notebookId, url);
    }

    // ── Chat ─────────────────────────────────────────────────────────

    @Mutation(() => GraphQLJSONObject, { name: 'studioChat' })
    async chat(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('question', { type: () => String }) question: string,
        @Args('conversationId', { type: () => String, nullable: true }) conversationId: string,
        // Accepted for backward-compat but ignored — the user is the token user.
        @Args('userId', { type: () => String, nullable: true }) _userId: string,
        @Args('sourceIds', { type: () => [String], nullable: true }) sourceIds: string[],
    ) {
        const userId = this.requireUserId(context);
        await this.studioService.assertNotebookOwner(notebookId, userId);
        if (conversationId) {
            await this.studioService.assertConversationOwner(conversationId, userId);
        }
        return this.studioService.chat(notebookId, question, conversationId, userId, {
            sourceIds: sourceIds?.length ? sourceIds : undefined,
        });
    }

    @Query(() => GraphQLJSONObject, { name: 'studioConversation' })
    async getConversation(
        @Context() context: StudioAuthContext,
        @Args('conversationId', { type: () => String }) conversationId: string,
    ) {
        await this.studioService.assertConversationOwner(conversationId, this.requireUserId(context));
        return this.studioService.getConversation(conversationId);
    }

    @Query(() => [GraphQLJSONObject], { name: 'studioConversations' })
    async getConversations(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.studioService.getConversations(notebookId);
    }

    // ── Generate ─────────────────────────────────────────────────────

    @Mutation(() => String, { name: 'studioGenerateReport' })
    async generateReport(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('query', { type: () => String }) query: string,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.studioService.generateReport(notebookId, query);
    }

    @Query(() => GraphQLJSONObject, { name: 'studioChunk', nullable: true })
    async getChunk(@Args('chunkId', { type: () => String }) chunkId: string) {
        return this.studioService.getChunk(chunkId);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioGenerateBrief' })
    async generateBrief(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('force', { type: () => Boolean, nullable: true }) force: boolean,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.studioService.generateBrief(notebookId, force ?? false);
    }

    @Query(() => [GraphQLJSONObject], { name: 'studioOutputs' })
    async listOutputs(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.studioService.listOutputs(notebookId);
    }

    @Mutation(() => Boolean, { name: 'deleteStudioOutput' })
    async deleteOutput(
        @Context() context: StudioAuthContext,
        @Args('outputId', { type: () => String }) outputId: string,
    ) {
        await this.studioService.assertOutputOwner(outputId, this.requireUserId(context));
        return this.studioService.deleteOutput(outputId);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioGenerateOutput' })
    async generateOutput(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('outputType', { type: () => String }) outputType: string,
        @Args('query', { type: () => String, nullable: true }) query: string,
        @Args('sourceIds', { type: () => [String], nullable: true }) sourceIds: string[],
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.studioService.generateStudioOutput(
            notebookId,
            outputType as any,
            query ?? undefined,
            sourceIds?.length ? sourceIds : undefined,
        );
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioPlaygroundTest' })
    async playgroundTest(
        @Args('userPrompt', { type: () => String }) userPrompt: string,
        @Args('systemPrompt', { type: () => String, nullable: true }) systemPrompt: string,
        @Args('temperature', { type: () => Number, nullable: true }) temperature: number,
        @Args('maxTokens', { type: () => Number, nullable: true }) maxTokens: number,
    ) {
        return this.studioService.playgroundTest({
            userPrompt,
            systemPrompt: systemPrompt || undefined,
            temperature: temperature ?? undefined,
            maxTokens: maxTokens ?? undefined,
        });
    }

    // ── Guide flows ──────────────────────────────────────────────────

    @Query(() => [GraphQLJSONObject], { name: 'studioGuideFlows' })
    async listGuideFlows(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.guideFlowService.listFlows(notebookId);
    }

    @Query(() => GraphQLJSONObject, { name: 'studioGuideFlow' })
    async getGuideFlow(
        @Args('flowId', { type: () => String }) flowId: string,
    ) {
        return this.guideFlowService.getFlow(flowId);
    }

    @Query(() => GraphQLJSONObject, { name: 'studioPublishedGuideFlow', nullable: true })
    async getPublishedGuideFlow(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        return this.guideFlowService.getPublishedFlowForNotebook(notebookId);
    }

    @Query(() => [GraphQLJSONObject], { name: 'studioGuideFlowTemplates' })
    async listGuideFlowTemplates() {
        return this.guideFlowService.listTemplates();
    }

    @Query(() => GraphQLJSONObject, { name: 'studioValidateGuideFlow' })
    async validateGuideFlow(
        @Args('definition', { type: () => GraphQLJSONObject }) definition: any,
    ) {
        return this.guideFlowService.validateDefinition(definition);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'createStudioGuideFlow' })
    async createGuideFlow(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('name', { type: () => String }) name: string,
        @Args('definition', { type: () => GraphQLJSONObject, nullable: true }) definition: any,
        @Args('template', { type: () => String, nullable: true }) template: string,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        const kind =
            template === 'rag_qa' || template === 'umkm' || template === 'blank' ? template : undefined;
        return this.guideFlowService.createFlow(notebookId, name, definition ?? undefined, kind);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'updateStudioGuideFlow' })
    async updateGuideFlow(
        @Args('flowId', { type: () => String }) flowId: string,
        @Args('name', { type: () => String, nullable: true }) name: string,
        @Args('definition', { type: () => GraphQLJSONObject, nullable: true }) definition: any,
        @Args('status', { type: () => String, nullable: true }) status: string,
    ) {
        const patch: { name?: string; definition?: unknown; status?: 'draft' | 'published' } = {};
        if (name !== undefined && name !== null) patch.name = name;
        if (definition !== undefined) patch.definition = definition;
        if (status === 'draft' || status === 'published') patch.status = status;
        return this.guideFlowService.updateFlow(flowId, patch);
    }

    @Mutation(() => Boolean, { name: 'deleteStudioGuideFlow' })
    async deleteGuideFlow(
        @Args('flowId', { type: () => String }) flowId: string,
    ) {
        return this.guideFlowService.deleteFlow(flowId);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'publishStudioGuideFlow' })
    async publishGuideFlow(
        @Args('flowId', { type: () => String }) flowId: string,
    ) {
        return this.guideFlowService.publishFlow(flowId);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'startStudioGuidedSession' })
    async startGuidedSession(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('flowId', { type: () => String }) flowId: string,
        // Accepted for backward-compat but ignored — the user is the token user.
        @Args('userId', { type: () => String, nullable: true }) _userId: string,
    ) {
        const userId = this.requireUserId(context);
        await this.studioService.assertNotebookOwner(notebookId, userId);
        return this.guideFlowService.startGuidedSession(notebookId, flowId, userId);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioGuidedChat' })
    async guidedChat(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('flowId', { type: () => String }) flowId: string,
        @Args('conversationId', { type: () => String }) conversationId: string,
        @Args('message', { type: () => String }) message: string,
        // Accepted for backward-compat but ignored — the user is the token user.
        @Args('userId', { type: () => String, nullable: true }) _userId: string,
    ) {
        const userId = this.requireUserId(context);
        await this.studioService.assertNotebookOwner(notebookId, userId);
        return this.guideFlowService.guidedChatTurn(notebookId, flowId, message, conversationId, userId);
    }

    // ── WhatsApp (WAHA) ─────────────────────────────────────────────

    @Query(() => GraphQLJSONObject, { name: 'studioWhatsAppConfig', nullable: true })
    async studioWhatsAppConfig(
        @Args('tenantId', { type: () => String, nullable: true }) tenantId?: string,
    ) {
        return this.studioWhatsAppService.getConfig(tenantId || undefined);
    }

    @Query(() => [GraphQLJSONObject], { name: 'studioWhatsAppConfigs' })
    async studioWhatsAppConfigs() {
        return this.studioWhatsAppService.listConfigs();
    }

    @Query(() => GraphQLJSONObject, { name: 'studioWhatsAppSecurityMeta' })
    async studioWhatsAppSecurityMeta() {
        return this.studioWhatsAppService.getSecurityMeta();
    }

    @Query(() => GraphQLJSONObject, { name: 'studioWhatsAppSessionStatus' })
    async studioWhatsAppSessionStatus() {
        return this.studioWhatsAppService.getWahaSessionStatus();
    }

    @Mutation(() => GraphQLJSONObject, { name: 'restartStudioWahaSession' })
    async restartStudioWahaSession() {
        return this.studioWhatsAppService.restartWahaSession();
    }

    @Mutation(() => GraphQLJSONObject, { name: 'syncStudioWahaSession' })
    async syncStudioWahaSession() {
        return this.studioWhatsAppService.syncWahaSession();
    }

    @Query(() => GraphQLJSONObject, { name: 'studioWahaAuthQr' })
    async studioWahaAuthQr(
        @Args('session', { type: () => String, nullable: true }) session?: string,
    ) {
        return this.studioWhatsAppService.getWahaAuthQr(session || undefined);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'startStudioWahaSession' })
    async startStudioWahaSession(
        @Args('session', { type: () => String, nullable: true }) session?: string,
    ) {
        return this.studioWhatsAppService.startWahaSession(session || undefined);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'logoutStudioWahaSession' })
    async logoutStudioWahaSession(
        @Args('session', { type: () => String, nullable: true }) session?: string,
    ) {
        return this.studioWhatsAppService.logoutWahaSession(session || undefined);
    }

    @Mutation(() => GraphQLJSONObject, { name: 'studioSetupUmkmNotebook' })
    async setupUmkmNotebook(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('tenantId', { type: () => String, nullable: true }) tenantId: string,
        @Args('publishGuideFlow', { type: () => Boolean, nullable: true }) publishGuideFlow: boolean,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        const setup = await this.studioUmkmService.setupUmkmNotebook(notebookId, tenantId);
        let flow = null;
        if (publishGuideFlow !== false) {
            flow = await this.guideFlowService.createAndPublishUmkmFlow(notebookId);
        }
        return { ...setup, flow };
    }

    @Mutation(() => GraphQLJSONObject, { name: 'updateStudioUmkmCommands' })
    async updateStudioUmkmCommands(
        @Context() context: StudioAuthContext,
        @Args('notebookId', { type: () => String }) notebookId: string,
        @Args('commands', { type: () => GraphQLJSONObject }) commands: Record<string, unknown>,
        @Args('republishGuideFlow', { type: () => Boolean, nullable: true }) republishGuideFlow?: boolean,
    ) {
        await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        const result = await this.studioUmkmService.updateUmkmCommands(notebookId, commands);
        let flow = null;
        if (republishGuideFlow !== false) {
            flow = await this.guideFlowService.createAndPublishUmkmFlow(notebookId);
        }
        return { ...result, flow };
    }

    @Query(() => GraphQLJSONObject, { name: 'studioUmkmCommandsDefaults' })
    async studioUmkmCommandsDefaults() {
        return DEFAULT_UMKM_COMMANDS;
    }

    @Mutation(() => GraphQLJSONObject, { name: 'updateStudioWhatsAppConfig' })
    async updateStudioWhatsAppConfig(
        @Context() context: StudioAuthContext,
        @Args('tenantId', { type: () => String, nullable: true }) tenantId: string,
        @Args('notebookId', { type: () => String, nullable: true }) notebookId: string,
        @Args('enabled', { type: () => Boolean }) enabled: boolean,
        @Args('allowlistPhones', { type: () => [String], nullable: true }) allowlistPhones: string[],
        @Args('useGuidedFlow', { type: () => Boolean, nullable: true }) useGuidedFlow: boolean,
        @Args('wahaSession', { type: () => String, nullable: true }) wahaSession: string,
        @Args('businessPhone', { type: () => String, nullable: true }) businessPhone: string,
        @Args('label', { type: () => String, nullable: true }) label: string,
    ) {
        if (notebookId) {
            await this.studioService.assertNotebookOwner(notebookId, this.requireUserId(context));
        }
        const resolvedTenant = tenantId?.trim() || undefined;
        const row = await this.studioWhatsAppService.updateConfig(
            {
                notebookId: notebookId || null,
                enabled,
                allowlistPhones: allowlistPhones ?? [],
                useGuidedFlow: useGuidedFlow ?? false,
                wahaSession: wahaSession ?? undefined,
                businessPhone: businessPhone ?? undefined,
                label: label ?? undefined,
            },
            resolvedTenant,
        );
        if (notebookId && resolvedTenant) {
            await this.studioUmkmService.setupUmkmNotebook(notebookId, resolvedTenant);
            // Ensure AIDLC guide flow exists when UMKM WA config is enabled
            if (enabled && useGuidedFlow !== false) {
                await this.guideFlowService.createAndPublishUmkmFlow(notebookId);
            }
        }
        return row;
    }
}
