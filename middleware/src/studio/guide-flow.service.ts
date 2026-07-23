import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { StudioService } from './studio.service';
import {
    defaultGuideFlowDefinition,
    defaultUmkmGuideFlowDefinition,
    getGuideFlowTemplate,
    GUIDE_FLOW_TEMPLATES,
    parseGuideFlowDefinition,
    safeParseGuideFlowDefinition,
    validateGuideFlowGraph,
    type GuideFlowDefinition,
    type GuideFlowTemplateKind,
} from './guide-flow.definition';
import {
    getNode,
    isUmkmFlow,
    resolveListenTarget,
    resolveUmkmListenTarget,
    substituteInstruction,
    type FlowContext,
} from './guide-flow.interpreter';
import {
    forceProceedAfterClarificationCap,
    shouldAskClarification,
} from './query-understanding';
import { DremioService } from '../dremio/dremio.service';
import { StudioDbContextService, getUmkmCommandsFromConfig } from './studio-db-context.service';
import { StudioUmkmService } from './studio-umkm.service';
import { StudioUmkmAgenticAskService } from './studio-umkm-agentic-ask.service';
import {
    detectUmkmIntent,
    formatSaleCancelled,
    formatUnknownUmkmCommand,
    formatUmkmHelp,
    detectUmkmConfirmReply,
    looksLikeUmkmDirectDataQuery,
    looksLikeUmkmOpenQuestion,
} from './studio-umkm.util';
import { aidlcIntentToListenTarget } from './studio-umkm-qu';
import { assertNoSupabaseError } from './studio-supabase.util';
import { assertXStateStateCoverage } from './guide-flow.xstate-factory';
import { stripWhatsAppMediaAnnotations } from './studio-whatsapp.util';

@Injectable()
export class GuideFlowService {
    private readonly logger = new Logger(GuideFlowService.name);

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly studioService: StudioService,
        private readonly dremioService: DremioService,
        private readonly dbContextService: StudioDbContextService,
        private readonly umkmService: StudioUmkmService,
        private readonly agenticAskService: StudioUmkmAgenticAskService,
    ) { }

    private admin() {
        return this.supabaseService.getAdminClient();
    }

    async listFlows(notebookId: string): Promise<any[]> {
        const { data, error } = await this.admin()
            .from('studio_guide_flows')
            .select('*')
            .eq('notebook_id', notebookId)
            .order('updated_at', { ascending: false });
        assertNoSupabaseError(error, 'Failed to list guide flows');
        return data || [];
    }

    async getFlow(flowId: string): Promise<any> {
        const { data, error } = await this.admin()
            .from('studio_guide_flows')
            .select('*')
            .eq('id', flowId)
            .single();
        if (error || !data) throw new NotFoundException('Guide flow not found');
        return data;
    }

    async createFlow(
        notebookId: string,
        name: string,
        definition?: unknown,
        template?: GuideFlowTemplateKind,
    ): Promise<any> {
        let def: GuideFlowDefinition;
        if (definition) {
            def = parseGuideFlowDefinition(definition);
        } else if (template) {
            def = getGuideFlowTemplate(template);
        } else {
            def = defaultGuideFlowDefinition();
        }
        validateGuideFlowGraph(def);
        const { data, error } = await this.admin()
            .from('studio_guide_flows')
            .insert({
                notebook_id: notebookId,
                name,
                status: 'draft',
                definition: def,
            })
            .select()
            .single();
        assertNoSupabaseError(error, 'Failed to create guide flow');
        return data;
    }

    listTemplates(): { kind: string; label: string; description: string }[] {
        return Object.entries(GUIDE_FLOW_TEMPLATES).map(([kind, t]) => ({
            kind,
            label: t.label,
            description: t.description,
        }));
    }

    validateDefinition(raw: unknown): {
        valid: boolean;
        errors: string[];
        warnings: string[];
        nodeCount: number;
        flowKind?: string;
        xstateCoverage: boolean;
    } {
        const parsed = safeParseGuideFlowDefinition(raw);
        if (!parsed.success) {
            return {
                valid: false,
                errors: parsed.error.issues.map((i) => {
                    const path = i.path.length ? `${i.path.join('.')}: ` : '';
                    return `${path}${i.message}`;
                }),
                warnings: [],
                nodeCount: 0,
                xstateCoverage: false,
            };
        }
        const def = parsed.data;
        const errors: string[] = [];
        try {
            validateGuideFlowGraph(def);
        } catch (e) {
            errors.push(e instanceof Error ? e.message : String(e));
        }
        if (errors.length) {
            return {
                valid: false,
                errors,
                warnings: [],
                nodeCount: def.nodes.length,
                flowKind: def.meta?.flowKind,
                xstateCoverage: false,
            };
        }

        const warnings: string[] = [];
        const xstateCoverage = assertXStateStateCoverage(def);
        if (!xstateCoverage) {
            warnings.push('XState coverage check failed — verify all transition targets exist');
        }

        for (const n of def.nodes) {
            if (n.type === 'listen' && !n.transitions.some((t) => t.when === 'default')) {
                warnings.push(`Listen node "${n.id}" should include a default transition`);
            }
        }

        if (!def.nodes.some((n) => n.type === 'end')) {
            warnings.push('No end node — add one so users can exit the flow gracefully');
        }

        const fk = def.meta?.flowKind;
        if (fk === 'rag_qa' && !def.nodes.some((n) => n.type === 'rag')) {
            warnings.push('RAG Q&A template should include at least one rag node');
        }
        if (fk === 'umkm' && !def.nodes.some((n) => n.type === 'action')) {
            warnings.push('UMKM flow should include action nodes (record_sale, sales_report, …)');
        }

        return {
            valid: true,
            errors: [],
            warnings,
            nodeCount: def.nodes.length,
            flowKind: fk,
            xstateCoverage,
        };
    }

    async updateFlow(
        flowId: string,
        patch: { name?: string; definition?: unknown; status?: 'draft' | 'published' },
    ): Promise<any> {
        const row = await this.getFlow(flowId);
        let definition = row.definition;
        if (patch.definition !== undefined) {
            const parsed = safeParseGuideFlowDefinition(patch.definition);
            if (!parsed.success) {
                throw new BadRequestException(parsed.error.message);
            }
            validateGuideFlowGraph(parsed.data);
            definition = parsed.data;
        }
        const { data, error } = await this.admin()
            .from('studio_guide_flows')
            .update({
                ...(patch.name !== undefined ? { name: patch.name } : {}),
                ...(patch.definition !== undefined ? { definition } : {}),
                ...(patch.status !== undefined ? { status: patch.status } : {}),
                updated_at: new Date(),
            })
            .eq('id', flowId)
            .select()
            .single();
        assertNoSupabaseError(error, 'Failed to update guide flow');
        return data;
    }

    async deleteFlow(flowId: string): Promise<boolean> {
        const row = await this.getFlow(flowId);
        if (row.status === 'published') {
            throw new BadRequestException('Unpublish the flow before deleting');
        }
        const { error } = await this.admin().from('studio_guide_flows').delete().eq('id', flowId);
        assertNoSupabaseError(error, 'Failed to delete guide flow');
        return true;
    }

    async publishFlow(flowId: string): Promise<any> {
        const row = await this.getFlow(flowId);
        const def = parseGuideFlowDefinition(row.definition);
        validateGuideFlowGraph(def);
        await this.admin()
            .from('studio_guide_flows')
            .update({ status: 'draft', updated_at: new Date() })
            .eq('notebook_id', row.notebook_id)
            .eq('status', 'published');
        const nextVersion = (row.version ?? 0) + 1;
        const { data, error } = await this.admin()
            .from('studio_guide_flows')
            .update({ status: 'published', version: nextVersion, updated_at: new Date() })
            .eq('id', flowId)
            .select()
            .single();
        assertNoSupabaseError(error, 'Failed to publish guide flow');
        return data;
    }

    async createAndPublishUmkmFlow(notebookId: string): Promise<any> {
        const notebook = await this.studioService.getNotebook(notebookId);
        const cfg = this.dbContextService.parseConfig(notebook.context_config);
        const commands = getUmkmCommandsFromConfig(cfg);
        const def = defaultUmkmGuideFlowDefinition(commands);
        const existing = await this.getPublishedFlowForNotebook(notebookId);
        if (existing?.name === 'UMKM Penjualan WA') {
            await this.updateFlow(existing.id, { definition: def });
            return this.publishFlow(existing.id);
        }
        const created = await this.createFlow(notebookId, 'UMKM Penjualan WA', def);
        return this.publishFlow(created.id);
    }

    async getPublishedFlowForNotebook(notebookId: string): Promise<any | null> {
        const { data, error } = await this.admin()
            .from('studio_guide_flows')
            .select('*')
            .eq('notebook_id', notebookId)
            .eq('status', 'published')
            .maybeSingle();
        assertNoSupabaseError(error, 'Failed to get published guide flow');
        return data;
    }

    async startGuidedSession(notebookId: string, flowId: string, userId?: string): Promise<any> {
        const flow = await this.getFlow(flowId);
        if (flow.notebook_id !== notebookId) {
            throw new BadRequestException('Flow does not belong to this notebook');
        }
        const def = parseGuideFlowDefinition(flow.definition);
        validateGuideFlowGraph(def);

        let conversation = await this.studioService.createConversationSession(
            notebookId,
            userId,
            `Guide: ${flow.name}`,
        );
        await this.admin()
            .from('studio_conversations')
            .update({
                guide_flow_id: flowId,
                guide_flow_node_id: def.startNodeId,
                guide_flow_context: {},
                updated_at: new Date(),
            })
            .eq('id', conversation.id);
        conversation = {
            ...conversation,
            guide_flow_id: flowId,
            guide_flow_node_id: def.startNodeId,
            guide_flow_context: {},
        };

        const ctx: FlowContext = {};
        const result = await this.runFlowDrain(notebookId, conversation, def, flowId, ctx, def.startNodeId, null);
        return {
            conversationId: conversation.id,
            replies: result.replies,
            waitingForInput: result.waitingForInput,
            currentNodeId: result.finalNodeId,
        };
    }

    async guidedChatTurn(
        notebookId: string,
        flowId: string,
        message: string,
        conversationId: string,
        userId?: string,
    ): Promise<any> {
        const flow = await this.getFlow(flowId);
        if (flow.notebook_id !== notebookId) {
            throw new BadRequestException('Flow does not belong to this notebook');
        }
        const def = parseGuideFlowDefinition(flow.definition);
        validateGuideFlowGraph(def);

        const { data: conversation, error } = await this.admin()
            .from('studio_conversations')
            .select('*')
            .eq('id', conversationId)
            .single();
        if (error || !conversation) throw new NotFoundException('Conversation not found');
        if (conversation.notebook_id !== notebookId) {
            throw new BadRequestException('Conversation notebook mismatch');
        }
        if (conversation.guide_flow_id !== flowId) {
            throw new BadRequestException('Conversation is not bound to this guide flow');
        }
        const currentId = conversation.guide_flow_node_id;
        if (!currentId) {
            throw new BadRequestException('Guide flow has ended for this conversation');
        }
        const currentNode = getNode(def, currentId);
        if (!currentNode || currentNode.type !== 'listen') {
            throw new BadRequestException('Guide flow is not waiting for user input at this step');
        }

        await this.studioService.appendStudioMessage(conversationId, 'user', message);
        if (userId && conversation.user_id && String(conversation.user_id) !== String(userId)) {
            this.logger.warn(`guidedChatTurn userId mismatch for conversation ${conversationId}`);
        }

        const persisted =
            typeof conversation.guide_flow_context === 'object' && conversation.guide_flow_context
                ? ({ ...(conversation.guide_flow_context as object) } as Record<string, unknown>)
                : {};
        delete persisted.rewrittenQuery;
        delete persisted.queryUnderstanding;
        const priorTurns = Array.isArray(persisted.guidedUserTurns)
            ? (persisted.guidedUserTurns as string[])
            : [];
        const baseCtx: FlowContext = {
            ...persisted,
            lastUserMessage: message,
            guidedUserTurns: [...priorTurns, message],
        };

        const result = await this.runFlowDrain(
            notebookId,
            conversation,
            def,
            flowId,
            baseCtx,
            currentId,
            message,
        );

        return {
            conversationId,
            replies: result.replies,
            waitingForInput: result.waitingForInput,
            currentNodeId: result.finalNodeId,
        };
    }

    private async persistFlowState(conversationId: string, nodeId: string | null, ctx: FlowContext): Promise<void> {
        await this.admin()
            .from('studio_conversations')
            .update({
                guide_flow_node_id: nodeId,
                guide_flow_context: ctx as any,
                updated_at: new Date(),
            })
            .eq('id', conversationId);
    }

    private async recordEvent(
        conversationId: string,
        flowId: string,
        from: string,
        to: string | null,
        eventType: string,
        userText?: string,
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        await this.admin().from('studio_guide_flow_events').insert({
            conversation_id: conversationId,
            flow_id: flowId,
            from_node_id: from,
            to_node_id: to,
            event_type: eventType,
            user_text: userText ?? null,
            metadata: metadata ?? {},
        });
    }

    /**
     * Runs automated nodes until `listen` (wait) or `end`. When starting at `listen` with
     * pendingUserText, consumes one user turn to pick a branch.
     */
    private async runFlowDrain(
        notebookId: string,
        conversation: any,
        def: GuideFlowDefinition,
        flowRowId: string,
        initialContext: FlowContext,
        startNodeId: string,
        pendingUserText: string | null,
    ): Promise<{
        replies: { content: string; references?: { content: string; docName: string; score: number }[] }[];
        finalNodeId: string | null;
        finalContext: FlowContext;
        waitingForInput: boolean;
    }> {
        let nodeId = startNodeId;
        const ctx: FlowContext = { ...initialContext };
        let userJust = pendingUserText;
        /** Set when a listen node consumes user text; used to return after query clarification. */
        let lastResolvedListenNodeId: string | null = null;
        const replies: { content: string; references?: { content: string; docName: string; score: number }[] }[] = [];

        for (;;) {
            const node = getNode(def, nodeId);
            if (!node) {
                throw new BadRequestException(`Invalid guide node "${nodeId}"`);
            }

            switch (node.type) {
                case 'start':
                    await this.recordEvent(conversation.id, flowRowId, nodeId, node.next, 'transition');
                    nodeId = node.next;
                    break;
                case 'message':
                    await this.studioService.appendStudioMessage(conversation.id, 'assistant', node.content);
                    replies.push({ content: node.content });
                    await this.recordEvent(conversation.id, flowRowId, nodeId, node.next, 'message');
                    nodeId = node.next;
                    break;
                case 'listen':
                    if (userJust != null) {
                        lastResolvedListenNodeId = nodeId;
                        let next: string;
                        if (isUmkmFlow(def)) {
                            userJust = stripWhatsAppMediaAnnotations(userJust);
                            ctx.lastUserMessage = userJust;
                            const notebook = await this.studioService.getNotebook(notebookId);
                            const cfg = this.dbContextService.parseConfig(notebook.context_config);
                            const commands = getUmkmCommandsFromConfig(cfg);
                            const tenantId = this.umkmService.resolveTenantId(cfg);
                            const hydrated = await this.umkmService.resolvePendingSale({
                                tenantId,
                                conversationId: conversation.id,
                                memoryPending: ctx.pendingUmkmSale as any,
                            });
                            if (hydrated && !ctx.pendingUmkmSale) {
                                ctx.pendingUmkmSale = hydrated;
                            }

                            const pendingBuy = this.umkmService.getPendingPurchase(
                                tenantId,
                                undefined,
                                conversation.id,
                            );
                            const confirmBuy = detectUmkmConfirmReply(userJust, commands);
                            if (pendingBuy && confirmBuy === 'confirm') {
                                this.umkmService.clearPendingPurchasePublic(
                                    tenantId,
                                    undefined,
                                    conversation.id,
                                );
                                const committed = await this.umkmService.commitPendingPurchase(
                                    pendingBuy,
                                    tenantId,
                                );
                                await this.studioService.appendStudioMessage(
                                    conversation.id,
                                    'assistant',
                                    committed,
                                );
                                replies.push({ content: committed });
                                await this.persistFlowState(conversation.id, nodeId, ctx);
                                return {
                                    replies,
                                    finalNodeId: nodeId,
                                    finalContext: ctx,
                                    waitingForInput: true,
                                };
                            }
                            if (pendingBuy && confirmBuy === 'cancel') {
                                this.umkmService.clearPendingPurchasePublic(
                                    tenantId,
                                    undefined,
                                    conversation.id,
                                );
                                const cancelled = '❌ Belanja dibatalkan.';
                                await this.studioService.appendStudioMessage(
                                    conversation.id,
                                    'assistant',
                                    cancelled,
                                );
                                replies.push({ content: cancelled });
                                await this.persistFlowState(conversation.id, nodeId, ctx);
                                return {
                                    replies,
                                    finalNodeId: nodeId,
                                    finalContext: ctx,
                                    waitingForInput: true,
                                };
                            }

                            // Submenu / wizard replies (1/2/3) must win over top-level menu digits
                            const wizardReply = await this.umkmService.continueWizard(
                                userJust,
                                tenantId,
                                undefined,
                                conversation.id,
                                cfg,
                            );
                            if (wizardReply !== undefined) {
                                await this.studioService.appendStudioMessage(
                                    conversation.id,
                                    'assistant',
                                    wizardReply,
                                );
                                replies.push({ content: wizardReply });
                                await this.recordEvent(
                                    conversation.id,
                                    flowRowId,
                                    nodeId,
                                    nodeId,
                                    'umkm_wizard',
                                    userJust,
                                );
                                await this.persistFlowState(conversation.id, nodeId, ctx);
                                return {
                                    replies,
                                    finalNodeId: nodeId,
                                    finalContext: ctx,
                                    waitingForInput: true,
                                };
                            }

                            next = resolveUmkmListenTarget(node, userJust, {
                                hasPendingSale: !!ctx.pendingUmkmSale,
                                commands,
                            });

                            const keywordIntent = detectUmkmIntent(userJust, commands);

                            // AIDLC QU when keyword path is open/ambiguous (not explicit help / confirm)
                            if (
                                (next === 'do_ask' || (next === 'help' && keywordIntent === 'unknown')) &&
                                keywordIntent !== 'help'
                            ) {
                                const conversationLines =
                                    await this.studioService.getRecentConversationLines(conversation.id, 12);
                                const qu = await this.umkmService.understandUmkmQuery(userJust, {
                                    conversationLines,
                                });
                                (ctx as any).umkmQueryUnderstanding = qu;

                                if (qu.needs_clarification && qu.clarification_question) {
                                    const clarify = qu.clarification_question;
                                    await this.studioService.appendStudioMessage(
                                        conversation.id,
                                        'assistant',
                                        clarify,
                                    );
                                    replies.push({ content: clarify });
                                    await this.recordEvent(
                                        conversation.id,
                                        flowRowId,
                                        nodeId,
                                        nodeId,
                                        'umkm_query_clarification',
                                        userJust,
                                        {
                                            intent: qu.intent,
                                            confidence_score: qu.confidence_score,
                                        },
                                    );
                                    await this.persistFlowState(conversation.id, nodeId, ctx);
                                    return {
                                        replies,
                                        finalNodeId: nodeId,
                                        finalContext: ctx,
                                        waitingForInput: true,
                                    };
                                }

                                const quTarget = aidlcIntentToListenTarget(qu.intent);
                                const targetExists = def.nodes.some((n) => n.id === quTarget);
                                // Keyword/heuristic already chose Tanya — don't let QU demote
                                // "cara meningkatkan omset" → laporan/do_report.
                                const lockAsk =
                                    keywordIntent === 'ask' ||
                                    (looksLikeUmkmOpenQuestion(userJust) &&
                                        !looksLikeUmkmDirectDataQuery(userJust));
                                if (targetExists && !(lockAsk && quTarget !== 'do_ask')) {
                                    next = quTarget;
                                } else if (lockAsk) {
                                    next = 'do_ask';
                                }
                            }
                        } else {
                            next = resolveListenTarget(node, userJust);
                        }
                        await this.recordEvent(conversation.id, flowRowId, nodeId, next, 'listen', userJust);
                        nodeId = next;
                        userJust = null;
                        break;
                    }
                    await this.persistFlowState(conversation.id, nodeId, ctx);
                    return {
                        replies,
                        finalNodeId: nodeId,
                        finalContext: ctx,
                        waitingForInput: true,
                    };
                case 'rag': {
                    const raw = typeof ctx.lastUserMessage === 'string' ? ctx.lastUserMessage : '';
                    const userTurns = Array.isArray(ctx.guidedUserTurns)
                        ? (ctx.guidedUserTurns as string[])
                        : raw
                          ? [raw]
                          : [];
                    const clarificationCount =
                        typeof ctx.clarificationCount === 'number' ? ctx.clarificationCount : 0;

                    const conversationLines = await this.studioService.getRecentConversationLines(
                        conversation.id,
                        12,
                    );
                    let qu = await this.studioService.understandUserQuery(raw, { conversationLines });

                    const askClarify =
                        shouldAskClarification(qu, clarificationCount) && !!lastResolvedListenNodeId;

                    if (askClarify) {
                        const clarify = qu.clarification_question.trim() || 'Mohon jelaskan lebih spesifik.';
                        await this.studioService.appendStudioMessage(conversation.id, 'assistant', clarify);
                        replies.push({ content: clarify });
                        ctx.clarificationCount = clarificationCount + 1;
                        ctx.queryUnderstanding = qu;
                        await this.recordEvent(
                            conversation.id,
                            flowRowId,
                            nodeId,
                            lastResolvedListenNodeId,
                            'query_clarification',
                            raw,
                            {
                                main_intent: qu.main_intent,
                                needs_clarification: true,
                                confidence: qu.confidence,
                                clarification_count: ctx.clarificationCount,
                            },
                        );
                        await this.persistFlowState(conversation.id, lastResolvedListenNodeId, ctx);
                        return {
                            replies,
                            finalNodeId: lastResolvedListenNodeId,
                            finalContext: ctx,
                            waitingForInput: true,
                        };
                    }

                    if (qu.needs_clarification && !lastResolvedListenNodeId) {
                        this.logger.warn(
                            `Query needs_clarification but no preceding listen node; continuing to answer for flow ${flowRowId}`,
                        );
                    }

                    if (qu.needs_clarification && clarificationCount > 0) {
                        qu = forceProceedAfterClarificationCap(qu, raw, userTurns);
                        this.logger.log(
                            `Clarification cap reached (${clarificationCount}); proceeding to RAG for conversation ${conversation.id}`,
                        );
                    }

                    ctx.queryUnderstanding = qu;
                    ctx.rewrittenQuery = qu.rewritten_query;
                    ctx.clarificationCount = 0;
                    delete ctx.guidedUserTurns;

                    const instructionResolved = substituteInstruction(node.instruction, ctx);
                    const askQuery = qu.rewritten_query?.trim() || raw;

                    // UMKM Tanya → agentic RAG (tool-limited). Other flows keep classic RAG.
                    if (isUmkmFlow(def) && (node.id === 'do_ask' || node.id.includes('ask'))) {
                        const notebook = await this.studioService.getNotebook(notebookId);
                        const cfg = this.dbContextService.parseConfig(notebook.context_config);
                        const tenantId = this.umkmService.resolveTenantId(cfg);
                        const agentic = await this.agenticAskService.answer(
                            {
                                question: askQuery,
                                notebookId,
                                conversationId: conversation.id,
                                tenantId,
                                notebookName: notebook.name,
                                conversationLines: conversationLines.map(
                                    (l) => `${l.role === 'assistant' ? 'Assistant' : 'User'}: ${l.content}`,
                                ),
                                instruction: instructionResolved,
                            },
                            cfg,
                        );
                        await this.studioService.appendStudioMessage(
                            conversation.id,
                            'assistant',
                            agentic.answer,
                            agentic.rawChunks,
                        );
                        replies.push({
                            content: agentic.answer,
                            references: agentic.references,
                        });
                        await this.recordEvent(
                            conversation.id,
                            flowRowId,
                            nodeId,
                            node.next,
                            'rag_agentic',
                            raw,
                            {
                                main_intent: qu.main_intent,
                                plan_reason: agentic.plan.reason,
                                tools: agentic.plan.tools.map((t) => t.name),
                                confidence: qu.confidence,
                            },
                        );
                        nodeId = node.next;
                        break;
                    }

                    const { answer, references, rawChunks } = await this.studioService.invokeRagQuery(
                        notebookId,
                        conversation.id,
                        askQuery,
                        {
                            instruction: instructionResolved,
                            queryUnderstanding: qu,
                        },
                    );
                    await this.studioService.appendStudioMessage(conversation.id, 'assistant', answer, rawChunks);
                    replies.push({ content: answer, references });
                    await this.recordEvent(conversation.id, flowRowId, nodeId, node.next, 'rag', raw, {
                        main_intent: qu.main_intent,
                        needs_clarification: false,
                        confidence: qu.confidence,
                        forced_rag_after_clarification: clarificationCount > 0,
                    });
                    nodeId = node.next;
                    break;
                }
                case 'sql': {
                    const sql = substituteInstruction(node.sql, ctx);
                    if (!/^\s*select\b/i.test(sql) || /\b(insert|update|delete|drop|alter|create|truncate)\b/i.test(sql)) {
                        throw new BadRequestException(`sql node "${nodeId}" must be a read-only SELECT`);
                    }
                    const notebook = await this.studioService.getNotebook(notebookId);
                    const cfg = this.dbContextService.parseConfig(notebook.context_config);
                    const dremioCtx = node.context?.length
                        ? node.context
                        : cfg.dremio_context_paths?.[0];
                    const result = await this.dremioService.runSQL(sql, dremioCtx);
                    const summary =
                        result.rows?.length > 0
                            ? `Hasil query (${result.rowCount} baris):\n\`\`\`json\n${JSON.stringify(result.rows.slice(0, 15), null, 2)}\n\`\`\``
                            : 'Query selesai tanpa baris data.';
                    ctx.lastSqlResult = result.rows?.slice(0, 25);
                    await this.studioService.appendStudioMessage(conversation.id, 'assistant', summary);
                    replies.push({ content: summary });
                    await this.recordEvent(conversation.id, flowRowId, nodeId, node.next, 'sql');
                    nodeId = node.next;
                    break;
                }
                case 'action': {
                    const notebook = await this.studioService.getNotebook(notebookId);
                    const cfg = this.dbContextService.parseConfig(notebook.context_config);
                    const commands = getUmkmCommandsFromConfig(cfg);
                    const tenantId = this.umkmService.resolveTenantId(cfg);
                    const raw =
                        typeof ctx.lastUserMessage === 'string' ? ctx.lastUserMessage : '';
                    let content = '';
                    switch (node.action) {
                        case 'record_sale': {
                            // Fallback when published flow predates newer transitions.
                            const intent = this.umkmService.detectIntent(raw, commands);
                            if (intent === 'list_products') {
                                content = await this.umkmService.buildProductListMessage(tenantId);
                            } else if (intent === 'check_stock') {
                                content = await this.umkmService.buildStockCheckMessage(raw, tenantId);
                            } else if (intent === 'sales_report') {
                                content = await this.umkmService.buildDailyReportMessage(tenantId);
                            } else if (intent === 'help') {
                                content = formatUmkmHelp(commands);
                            } else if (intent === 'unknown') {
                                content = formatUnknownUmkmCommand(commands);
                            } else {
                                const prepared = await this.umkmService.prepareSaleFromText(
                                    raw,
                                    tenantId,
                                    undefined,
                                    cfg,
                                );
                                if (prepared.kind === 'preview') {
                                    const pendingId = await this.umkmService.persistPendingSaleToDb(
                                        tenantId,
                                        prepared.pending,
                                        { conversationId: conversation.id },
                                    );
                                    if (pendingId) prepared.pending.pendingId = pendingId;
                                    this.umkmService.setPendingSale(
                                        tenantId,
                                        prepared.pending,
                                        undefined,
                                        conversation.id,
                                    );
                                    ctx.pendingUmkmSale = prepared.pending;
                                    content = prepared.message;
                                } else if (prepared.kind === 'need_slots') {
                                    this.umkmService.startSaleSlotFill(
                                        tenantId,
                                        prepared.draft,
                                        undefined,
                                        conversation.id,
                                    );
                                    content = prepared.message;
                                } else {
                                    content = prepared.message;
                                }
                            }
                            break;
                        }
                        case 'confirm_sale': {
                            const pending =
                                (await this.umkmService.resolvePendingSale({
                                    tenantId,
                                    conversationId: conversation.id,
                                    memoryPending: ctx.pendingUmkmSale as any,
                                })) || undefined;
                            if (!pending || !this.umkmService.isPendingSaleFresh(pending)) {
                                delete ctx.pendingUmkmSale;
                                const saleKw = (commands.keywords.record_sale || [])[0] || 'jual';
                                content = `Tidak ada draft penjualan menunggu konfirmasi. Ketik *${saleKw} ...* untuk mulai.`;
                            } else {
                                content = await this.umkmService.commitPendingSale(pending, tenantId);
                                delete ctx.pendingUmkmSale;
                            }
                            break;
                        }
                        case 'cancel_sale': {
                            const pending =
                                (await this.umkmService.resolvePendingSale({
                                    tenantId,
                                    conversationId: conversation.id,
                                    memoryPending: ctx.pendingUmkmSale as any,
                                })) || undefined;
                            if (pending || ctx.pendingUmkmSale) {
                                await this.umkmService.markPendingSaleStatus(
                                    pending?.pendingId ?? (ctx.pendingUmkmSale as any)?.pendingId,
                                    'cancelled',
                                );
                                delete ctx.pendingUmkmSale;
                                content = formatSaleCancelled(commands);
                            } else {
                                const saleKw = (commands.keywords.record_sale || [])[0] || 'jual';
                                const helpKw = (commands.keywords.help || [])[0] || 'bantuan';
                                content = `Tidak ada draft yang dibatalkan. Ketik *${saleKw} ...* atau *${helpKw}*.`;
                            }
                            break;
                        }
                        case 'sales_report':
                            content = await this.umkmService.handleSalesReportIntent(
                                raw,
                                tenantId,
                                undefined,
                                conversation.id,
                            );
                            break;
                        case 'list_products':
                            content = await this.umkmService.buildProductListMessage(tenantId);
                            break;
                        case 'check_stock':
                            content = await this.umkmService.handleCheckStockIntent(
                                raw,
                                tenantId,
                                undefined,
                                conversation.id,
                            );
                            break;
                        case 'menu_hub':
                            content = this.umkmService.openMenuHub(tenantId, undefined, conversation.id);
                            break;
                        case 'purchase_hub':
                            content = this.umkmService.openPurchaseHub(tenantId, undefined, conversation.id);
                            break;
                        case 'report_hub':
                            content = this.umkmService.openReportHub(tenantId, undefined, conversation.id);
                            break;
                        case 'add_product':
                            content = await this.umkmService.beginOrRunAddProduct(
                                raw,
                                tenantId,
                                undefined,
                                conversation.id,
                            );
                            break;
                        case 'add_stock':
                            content = await this.umkmService.beginOrRunAddStock(
                                raw,
                                tenantId,
                                undefined,
                                conversation.id,
                            );
                            break;
                        case 'list_purchases':
                            content = await this.umkmService.buildPurchaseListMessage(tenantId, 'all');
                            break;
                        case 'record_purchase':
                            content = await this.umkmService.beginOrRunPurchase(
                                raw,
                                tenantId,
                                undefined,
                                conversation.id,
                                cfg,
                            );
                            break;
                        case 'list_sales':
                            content = await this.umkmService.buildSalesListMessage(tenantId, 'today');
                            break;
                        case 'umkm_help': {
                            content = formatUmkmHelp(commands);
                            break;
                        }
                        default: {
                            // Wizard continuation / unknown action → full handleMessage
                            const handled = await this.umkmService.handleMessage(
                                raw,
                                tenantId,
                                undefined,
                                cfg,
                                { conversationId: conversation.id },
                            );
                            content = handled || formatUnknownUmkmCommand(commands);
                            break;
                        }
                    }
                    await this.studioService.appendStudioMessage(conversation.id, 'assistant', content);
                    replies.push({ content });
                    await this.recordEvent(conversation.id, flowRowId, nodeId, node.next, 'action', raw, {
                        action: node.action,
                    });
                    nodeId = node.next;
                    break;
                }
                case 'end':
                    await this.recordEvent(conversation.id, flowRowId, nodeId, null, 'end');
                    await this.persistFlowState(conversation.id, null, ctx);
                    return {
                        replies,
                        finalNodeId: null,
                        finalContext: ctx,
                        waitingForInput: false,
                    };
                default:
                    throw new BadRequestException('Unsupported guide node type');
            }
        }
    }
}
