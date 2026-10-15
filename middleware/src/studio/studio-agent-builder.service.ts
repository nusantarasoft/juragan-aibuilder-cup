import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { assertNoSupabaseError } from './studio-supabase.util';
import type { StudioAgentWorkflow, StudioAgentWorkflowGraph } from './studio-agent-builder.types';

type Row = Record<string, unknown>;

const DEFAULT_GRAPH: StudioAgentWorkflowGraph = { nodes: [], edges: [] };

function rowToWorkflow(row: Row): StudioAgentWorkflow {
    const graph = (row.graph as StudioAgentWorkflowGraph) ?? DEFAULT_GRAPH;
    return {
        id: String(row.id),
        tenantId: String(row.tenant_id),
        name: String(row.name),
        description: String(row.description ?? ''),
        status: String(row.status ?? 'draft'),
        graph: {
            nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
            edges: Array.isArray(graph.edges) ? graph.edges : [],
        },
        aosPlaybookId: row.aos_playbook_id ? String(row.aos_playbook_id) : undefined,
        lastTestedAt: row.last_tested_at ? String(row.last_tested_at) : undefined,
        createdAt: row.created_at ? String(row.created_at) : undefined,
        updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    };
}

@Injectable()
export class StudioAgentBuilderService {
    constructor(private readonly supabase: SupabaseService) {}

    private db() {
        return this.supabase.getAdminClient();
    }

    async listWorkflows(tenantId: string): Promise<StudioAgentWorkflow[]> {
        const { data, error } = await this.db()
            .from('studio_agent_workflows')
            .select('*')
            .eq('tenant_id', tenantId)
            .neq('status', 'archived')
            .order('updated_at', { ascending: false });
        assertNoSupabaseError(error);
        return (data ?? []).map((r) => rowToWorkflow(r as Row));
    }

    async getWorkflowRow(id: string): Promise<Row> {
        const { data, error } = await this.db().from('studio_agent_workflows').select('*').eq('id', id).maybeSingle();
        assertNoSupabaseError(error);
        if (!data) throw new NotFoundException('Agent workflow not found');
        return data as Row;
    }

    async createWorkflow(
        tenantId: string,
        input: { name: string; description?: string; status?: string; graph?: StudioAgentWorkflowGraph; aosPlaybookId?: string },
        createdBy?: string | null,
    ): Promise<StudioAgentWorkflow> {
        const { data, error } = await this.db()
            .from('studio_agent_workflows')
            .insert({
                tenant_id: tenantId,
                name: input.name,
                description: input.description ?? '',
                status: input.status ?? 'draft',
                graph: input.graph ?? DEFAULT_GRAPH,
                aos_playbook_id: input.aosPlaybookId ?? null,
                created_by: createdBy ?? null,
            })
            .select('*')
            .single();
        assertNoSupabaseError(error);
        return rowToWorkflow(data as Row);
    }

    async updateWorkflow(
        tenantId: string,
        id: string,
        patch: {
            name?: string;
            description?: string;
            status?: string;
            graph?: StudioAgentWorkflowGraph;
            aosPlaybookId?: string | null;
        },
    ): Promise<StudioAgentWorkflow> {
        const existing = await this.getWorkflowRow(id);
        if (String(existing.tenant_id) !== tenantId) {
            throw new ForbiddenException('You do not have access to this workflow');
        }
        const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (patch.name !== undefined) row.name = patch.name;
        if (patch.description !== undefined) row.description = patch.description;
        if (patch.status !== undefined) row.status = patch.status;
        if (patch.graph !== undefined) row.graph = patch.graph;
        if (patch.aosPlaybookId !== undefined) row.aos_playbook_id = patch.aosPlaybookId;

        const { data, error } = await this.db().from('studio_agent_workflows').update(row).eq('id', id).select('*').single();
        assertNoSupabaseError(error);
        return rowToWorkflow(data as Row);
    }

    async deleteWorkflow(tenantId: string, id: string): Promise<boolean> {
        const existing = await this.getWorkflowRow(id);
        if (String(existing.tenant_id) !== tenantId) {
            throw new ForbiddenException('You do not have access to this workflow');
        }
        const { error } = await this.db().from('studio_agent_workflows').delete().eq('id', id);
        assertNoSupabaseError(error);
        return true;
    }

    async recordTestRun(tenantId: string, id: string): Promise<StudioAgentWorkflow> {
        const existing = await this.getWorkflowRow(id);
        if (String(existing.tenant_id) !== tenantId) {
            throw new ForbiddenException('You do not have access to this workflow');
        }
        const now = new Date().toISOString();
        const { data, error } = await this.db()
            .from('studio_agent_workflows')
            .update({ last_tested_at: now, updated_at: now })
            .eq('id', id)
            .select('*')
            .single();
        assertNoSupabaseError(error);
        return rowToWorkflow(data as Row);
    }
}
