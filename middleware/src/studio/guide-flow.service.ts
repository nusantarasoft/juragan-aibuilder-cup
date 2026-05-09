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
import { getNode, resolveListenTarget, substituteInstruction, type FlowContext } from './guide-flow.interpreter';

@Injectable()
export class GuideFlowService {
    private readonly logger = new Logger(GuideFlowService.name);

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly studioService: StudioService,
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

        const baseCtx: FlowContext = {
            ...(typeof conversation.guide_flow_context === 'object' && conversation.guide_flow_context
                ? (conversation.guide_flow_context as object)
                : {}),
            lastUserMessage: message,
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
                        const next = resolveListenTarget(node, userJust);
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
                    const q = substituteInstruction(node.instruction, ctx);
                    const { answer, references, rawChunks } = await this.studioService.invokeRagQuery(
                        notebookId,
                        conversation.id,
                        q,
                    );
                    await this.studioService.appendStudioMessage(conversation.id, 'assistant', answer, rawChunks);
                    replies.push({ content: answer, references });
                    await this.recordEvent(conversation.id, flowRowId, nodeId, node.next, 'rag');
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
