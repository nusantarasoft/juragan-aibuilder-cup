import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { StudioService } from './studio.service';
import {
    defaultGuideFlowDefinition,
    parseGuideFlowDefinition,
    safeParseGuideFlowDefinition,
    validateGuideFlowGraph,
    type GuideFlowDefinition,
} from './guide-flow.definition';
import {
    getNode,
    isUmkmSalesListenNode,
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
import { StudioDbContextService } from './studio-db-context.service';
import { StudioUmkmService } from './studio-umkm.service';
import { defaultUmkmGuideFlowDefinition } from './guide-flow.definition';
import { formatUnknownUmkmCommand } from './studio-umkm.util';

@Injectable()
export class GuideFlowService {
    private readonly logger = new Logger(GuideFlowService.name);

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly studioService: StudioService,
        private readonly dremioService: DremioService,
        private readonly dbContextService: StudioDbContextService,
        private readonly umkmService: StudioUmkmService,
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
        if (error) throw error;
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

    async createFlow(notebookId: string, name: string, definition?: unknown): Promise<any> {
        const def = definition
            ? parseGuideFlowDefinition(definition)
            : defaultGuideFlowDefinition();
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
        if (error) throw error;
        return data;
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
        if (error) throw error;
        return data;
    }

    async deleteFlow(flowId: string): Promise<boolean> {
        const row = await this.getFlow(flowId);
        if (row.status === 'published') {
            throw new BadRequestException('Unpublish the flow before deleting');
        }
        const { error } = await this.admin().from('studio_guide_flows').delete().eq('id', flowId);
        if (error) throw error;
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
        if (error) throw error;
        this.logger.log(`Published guide flow ${flowId} v${nextVersion} for notebook ${row.notebook_id}`);
        return data;
    }

    async createAndPublishUmkmFlow(notebookId: string): Promise<any> {
        const def = defaultUmkmGuideFlowDefinition();
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
        if (error) throw error;
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
                        const next = isUmkmSalesListenNode(node)
                            ? resolveUmkmListenTarget(node, userJust)
                            : resolveListenTarget(node, userJust);
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
                    const { answer, references, rawChunks } = await this.studioService.invokeRagQuery(
                        notebookId,
                        conversation.id,
                        qu.rewritten_query?.trim() || raw,
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
                    const tenantId = this.umkmService.resolveTenantId(cfg);
                    const raw =
                        typeof ctx.lastUserMessage === 'string' ? ctx.lastUserMessage : '';
                    let content = '';
                    switch (node.action) {
                        case 'record_sale': {
                            // Fallback when published flow predates list_products transitions.
                            const intent = this.umkmService.detectIntent(raw);
                            if (intent === 'list_products') {
                                content = await this.umkmService.buildProductListMessage(tenantId);
                            } else if (intent === 'sales_report') {
                                content = await this.umkmService.buildDailyReportMessage(tenantId);
                            } else if (intent === 'help') {
                                content =
                                    (await this.umkmService.handleMessage('bantuan', tenantId, undefined, cfg)) ||
                                    '';
                            } else if (intent === 'unknown') {
                                content = formatUnknownUmkmCommand();
                            } else {
                                content = await this.umkmService.recordSaleFromText(raw, tenantId, undefined, cfg);
                            }
                            break;
                        }
                        case 'sales_report':
                            content = await this.umkmService.buildDailyReportMessage(tenantId);
                            break;
                        case 'list_products':
                            content = await this.umkmService.buildProductListMessage(tenantId);
                            break;
                        case 'umkm_help': {
                            const helpIntent = this.umkmService.detectIntent(raw);
                            content =
                                helpIntent === 'unknown'
                                    ? formatUnknownUmkmCommand()
                                    : (await this.umkmService.handleMessage('bantuan', tenantId, undefined, cfg)) ||
                                      '';
                            break;
                        }
                        default:
                            throw new BadRequestException(`Unknown action "${(node as any).action}"`);
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
